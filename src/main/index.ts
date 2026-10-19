import { app, BrowserWindow, shell, ipcMain } from 'electron';
import * as path from 'path';
import { BrowserManager } from './browser/BrowserManager';
import { registerBrowserIpc } from './ipc/browserIpc';
import { registerSystemIpc } from './ipc/systemIpc';
import { registerDatabaseIpc } from './ipc/databaseIpc';
import { registerRunnerIpc } from './ipc/runnerIpc';
import { ErrorCodes } from '../shared/types/ipc';

let mainWindow: BrowserWindow | null = null;
let browserManager: BrowserManager | null = null;

// Determine if running in development mode
const isDev =
  process.env.NODE_ENV === 'development' ||
  !app.isPackaged ||
  process.argv.includes('--dev');

/**
 * Creates the main application window
 */
function createMainWindow(): BrowserWindow {
  const preloadPath = path.join(__dirname, '../preload/index.js');

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 750,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0f172a', // Dark theme background
    show: false, // Wait until ready-to-show to prevent white flash
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true,
    },
  });

  // Show window smoothly once content is loaded
  win.once('ready-to-show', () => {
    win.show();
    win.focus();
    if (process.argv.includes('--devtools')) {
      win.webContents.openDevTools({ mode: 'detach' });
    }
  });

  // Handle external link clicks safely in system browser
  win.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url);
    return { action: 'deny' };
  });

  // Load URL or build artifact
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (isDev && process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(devServerUrl).catch((err) => {
      console.warn('[Main] Could not connect to dev server, falling back to local file:', err);
      loadLocalIndex(win);
    });
  } else {
    loadLocalIndex(win);
  }

  win.on('closed', () => {
    mainWindow = null;
  });

  return win;
}

/**
 * Fallback loader for local HTML artifact
 */
function loadLocalIndex(win: BrowserWindow): void {
  const possiblePaths = [
    path.join(__dirname, '../renderer/index.html'),
    path.join(__dirname, '../../dist/renderer/index.html'),
    path.join(__dirname, '../../index.html'),
  ];

  for (const p of possiblePaths) {
    try {
      const fs = require('fs');
      if (fs.existsSync(p)) {
        win.loadFile(p);
        return;
      }
    } catch {}
  }

  // Fallback to dev server
  win.loadURL('http://localhost:5173').catch(() => {
    win.loadURL(
      `data:text/html;charset=utf-8,${encodeURIComponent(
        '<body style="background:#031410;color:#fff;font-family:sans-serif;padding:40px;"><h2>VMAX Automation Suite</h2><p>Renderer not built yet. Run <code>npm run dev</code> or <code>npm run build:renderer</code>.</p></body>'
      )}`
    );
  });
}

/**
 * Registers safe fallback handlers for channels not yet implemented by other devs,
 * ensuring window.api calls return standard IpcResponse instead of throwing unhandled exceptions.
 */
function registerFallbackChannelStubs(): void {
  const registeredChannels = new Set([
    'browser:launch',
    'browser:open',
    'browser:close',
    'browser:closeAll',
    'browser:getActiveSessions',
    'browser:login',
    'browser:solve2fa',
    'browser:solve2FA',
    'browser:getOtp',
    'browser:cleanProfile',
    'browser:cleanAllProfiles',
    'system:getInfo',
    'system:selectDirectory',
    'system:openPath',
    'window:minimize',
    'window:maximize',
    'window:isMaximized',
    'window:close',
  ]);

  const stubChannels = [
    // Accounts
    'accounts:getAll',
    'accounts:getById',
    'accounts:create',
    'accounts:update',
    'accounts:batchUpdate',
    'accounts:delete',
    'accounts:import',
    'accounts:export',
    'accounts:moveToFolder',
    'accounts:getTrash',
    'accounts:restoreFromTrash',
    'accounts:emptyTrash',
    // Folders
    'folders:getAll',
    'folders:create',
    'folders:update',
    'folders:delete',
    'folders:reorder',
    // Scenarios & Actions
    'scenarios:getAll',
    'scenarios:getById',
    'scenarios:create',
    'scenarios:update',
    'scenarios:delete',
    'scenarios:duplicate',
    'actions:getAllTypes',
    'actions:create',
    'actions:update',
    'actions:delete',
    'actions:reorder',
    // Runner
    'runner:start',
    'runner:pause',
    'runner:resume',
    'runner:stop',
    'runner:getStatus',
    // Proxy
    'proxy:check',
    'proxy:rotate',
    'proxy:getAll',
    'proxy:save',
    'proxy:delete',
    // Checkpoint
    'checkpoint:solve282',
    'checkpoint:solve956',
    'checkpoint:checkImap',
    // Settings
    'settings:get',
    'settings:set',
    'settings:getAll',
    // Utilities
    'utilities:findUid',
    'utilities:checkLiveUid',
    'utilities:testSpin',
    'utilities:aiGenerate',
  ];

  for (const ch of stubChannels) {
    // Only register stub if no handler has been registered yet
    try {
      ipcMain.handle(ch, async () => {
        return {
          success: false,
          error: {
            code: ErrorCodes.ERR_RECORD_NOT_FOUND,
            message: `Channel ${ch} handler is pending service registration.`,
          },
          timestamp: Date.now(),
        };
      });
    } catch {
      // Channel might already have a handler
    }
  }
}

// ==========================================
// APPLICATION LIFECYCLE MANAGEMENT
// ==========================================

// Enforce single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  console.log('[Main] Another instance is already running. Quitting.');
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    console.log('[Main] Electron app is ready. Initializing core modules...');

    // Initialize Browser Manager
    browserManager = BrowserManager.getInstance();

    // Register IPC modules
    registerBrowserIpc(browserManager);
    registerSystemIpc(() => mainWindow);
    registerDatabaseIpc();
    registerRunnerIpc();
    registerFallbackChannelStubs();

    // Create main window
    mainWindow = createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createMainWindow();
      }
    });
  });

  // Quit when all windows are closed, except on macOS
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });

  // Clean up all browser sessions before quitting
  app.on('before-quit', async (event) => {
    if (browserManager) {
      console.log('[Main] Cleaning up all active browser instances before quit...');
      try {
        await browserManager.closeAll();
      } catch (err) {
        console.warn('[Main] Error during browser cleanup:', err);
      }
    }
  });
}
