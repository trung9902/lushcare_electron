import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import * as os from 'os';
import { IpcResponse, ErrorCodes } from '../../shared/types/ipc';
import { SystemInfoResult } from '../../shared/types/contracts';

export function registerSystemIpc(getMainWindow: () => BrowserWindow | null): void {
  // system:getInfo
  ipcMain.handle(
    'system:getInfo',
    async (): Promise<IpcResponse<SystemInfoResult>> => {
      try {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const data: SystemInfoResult = {
          platform: process.platform,
          arch: process.arch,
          cpus: os.cpus().length,
          freeMemMB: Math.round(freeMem / (1024 * 1024)),
          totalMemMB: Math.round(totalMem / (1024 * 1024)),
        };
        return {
          success: true,
          data,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        return {
          success: false,
          error: {
            code: ErrorCodes.ERR_INTERNAL_EXCEPTION,
            message: err?.message || 'Failed to get system info',
          },
          timestamp: Date.now(),
        };
      }
    }
  );

  // system:selectDirectory
  ipcMain.handle(
    'system:selectDirectory',
    async (): Promise<IpcResponse<string | null>> => {
      try {
        const win = getMainWindow();
        const result = await dialog.showOpenDialog(win || undefined as any, {
          properties: ['openDirectory', 'createDirectory'],
        });
        if (result.canceled || result.filePaths.length === 0) {
          return {
            success: true,
            data: null,
            timestamp: Date.now(),
          };
        }
        return {
          success: true,
          data: result.filePaths[0],
          timestamp: Date.now(),
        };
      } catch (err: any) {
        return {
          success: false,
          error: {
            code: ErrorCodes.ERR_IO_PERMISSION,
            message: err?.message || 'Failed to select directory',
          },
          timestamp: Date.now(),
        };
      }
    }
  );

  // system:openPath
  ipcMain.handle(
    'system:openPath',
    async (
      _event: Electron.IpcMainInvokeEvent,
      targetPath: string
    ): Promise<IpcResponse<boolean>> => {
      try {
        if (!targetPath) {
          return {
            success: false,
            error: {
              code: ErrorCodes.ERR_INVALID_PAYLOAD,
              message: 'targetPath is required',
            },
            timestamp: Date.now(),
          };
        }
        const errorMsg = await shell.openPath(targetPath);
        return {
          success: !errorMsg,
          data: !errorMsg,
          error: errorMsg
            ? {
                code: ErrorCodes.ERR_IO_PERMISSION,
                message: errorMsg,
              }
            : undefined,
          timestamp: Date.now(),
        };
      } catch (err: any) {
        return {
          success: false,
          error: {
            code: ErrorCodes.ERR_IO_PERMISSION,
            message: err?.message || 'Failed to open path',
          },
          timestamp: Date.now(),
        };
      }
    }
  );

  // Window control channels for frameless title bar
  ipcMain.handle('window:minimize', async () => {
    const win = getMainWindow();
    if (win) win.minimize();
    return { success: true, timestamp: Date.now() };
  });

  ipcMain.handle('window:maximize', async () => {
    const win = getMainWindow();
    if (win) {
      if (win.isMaximized()) {
        win.unmaximize();
      } else {
        win.maximize();
      }
    }
    return { success: true, timestamp: Date.now() };
  });

  ipcMain.handle('window:isMaximized', async () => {
    const win = getMainWindow();
    return {
      success: true,
      data: win ? win.isMaximized() : false,
      timestamp: Date.now(),
    };
  });

  ipcMain.handle('window:close', async () => {
    const win = getMainWindow();
    if (win) win.close();
    return { success: true, timestamp: Date.now() };
  });

  console.log('[systemIpc] System IPC channels registered.');
}
