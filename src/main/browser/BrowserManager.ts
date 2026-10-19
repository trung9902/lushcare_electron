import { chromium, BrowserContext, Page } from 'playwright-core';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { authenticator } from 'otplib';
import {
  BrowserLaunchPayload,
  BrowserLaunchResult,
  BrowserSessionInfo,
  BrowserLoginPayload,
  BrowserLoginResult,
  BrowserSolve2faPayload,
  BrowserSolve2faResult,
  GetOtpResult,
  CleanProfilePayload,
  CleanProfileResult,
} from '../../shared/types/contracts';
import { ErrorCodes } from '../../shared/types/ipc';
import { STEALTH_INIT_SCRIPT, BROWSER_OPTIMIZED_ARGS } from './stealth';
import { calculateWindowBounds, GridConfig, WindowBounds } from './grid';

export interface ActiveBrowserSession {
  accountId: number;
  uid: string;
  context: BrowserContext;
  page: Page;
  browserPid: number;
  profilePath: string;
  proxyUsed: string | null;
  windowIndex: number;
  launchedAt: number;
  isAlive: boolean;
}

export class BrowserManager {
  private static instance: BrowserManager | null = null;
  private sessions: Map<number, ActiveBrowserSession> = new Map();
  private baseProfileDir: string;
  private detectedChromePath: string | null = null;

  constructor(customProfileDir?: string) {
    this.baseProfileDir =
      customProfileDir || path.resolve(process.cwd(), 'profiles');
    if (!fs.existsSync(this.baseProfileDir)) {
      try {
        fs.mkdirSync(this.baseProfileDir, { recursive: true });
      } catch (err) {
        console.warn('[BrowserManager] Could not create profiles dir:', err);
      }
    }
  }

  public static getInstance(customProfileDir?: string): BrowserManager {
    if (!BrowserManager.instance) {
      BrowserManager.instance = new BrowserManager(customProfileDir);
    }
    return BrowserManager.instance;
  }

  /**
   * Automatically detects Google Chrome or Chromium executable on the host machine.
   */
  public detectExecutablePath(): string {
    if (this.detectedChromePath && fs.existsSync(this.detectedChromePath)) {
      return this.detectedChromePath;
    }

    if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
      this.detectedChromePath = process.env.CHROME_PATH;
      return this.detectedChromePath;
    }

    const isWindows = process.platform === 'win32';
    const isMac = process.platform === 'darwin';

    const candidatePaths: string[] = [];

    if (isWindows) {
      const localAppData = process.env.LOCALAPPDATA || '';
      const programFiles = process.env['ProgramFiles'] || 'C:\\Program Files';
      const programFilesX86 =
        process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)';

      candidatePaths.push(
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        path.join(programFiles, 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(programFilesX86, 'Google\\Chrome\\Application\\chrome.exe'),
        path.join(localAppData, 'Google\\Chrome\\Application\\chrome.exe'),
        // Fallback to Edge or Brave if Chrome not installed
        path.join(programFilesX86, 'Microsoft\\Edge\\Application\\msedge.exe'),
        path.join(programFiles, 'Microsoft\\Edge\\Application\\msedge.exe'),
        'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
        path.join(programFiles, 'BraveSoftware\\Brave-Browser\\Application\\brave.exe')
      );
    } else if (isMac) {
      candidatePaths.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        path.join(
          os.homedir(),
          'Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        )
      );
    } else {
      candidatePaths.push(
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable',
        '/usr/bin/chromium',
        '/usr/bin/chromium-browser',
        '/snap/bin/chromium'
      );
    }

    for (const p of candidatePaths) {
      try {
        if (p && fs.existsSync(p)) {
          this.detectedChromePath = p;
          console.log(`[BrowserManager] Found browser executable at: ${p}`);
          return p;
        }
      } catch (err) {
        // Skip unreadable path
      }
    }

    // If no standalone Chrome found, return empty string so Playwright uses its internal Chromium if available
    console.warn(
      '[BrowserManager] No system Google Chrome executable found in standard locations.'
    );
    return '';
  }

  /**
   * Returns absolute profile folder path for a given UID.
   */
  public getProfilePath(uid: string): string {
    const sanitizedUid = String(uid).replace(/[^a-zA-Z0-9_-]/g, '_');
    return path.join(this.baseProfileDir, sanitizedUid);
  }

  /**
   * Launch a persistent browser context for an account.
   */
  public async launch(
    payload: BrowserLaunchPayload
  ): Promise<BrowserLaunchResult> {
    const { accountId } = payload;
    let acc: any = null;
    try {
      const { AccountRepository } = require('../../database/repositories/AccountRepository');
      acc = new AccountRepository().getById(accountId);
    } catch {}

    const uid = payload.uid || acc?.uid || String(accountId);
    const pass = payload.pass || acc?.pass || '';
    const cookie = payload.cookie || acc?.cookie || acc?.cookie1 || '';
    const fa2 = payload.fa2 || acc?.fa2 || '';
    const windowIndex = payload.windowIndex ?? this.sessions.size;
    const customProxy = payload.customProxy || payload.proxy || acc?.proxy;
    const headless = payload.headless ?? false;
    const autoLogin = payload.autoLogin ?? true; // Auto login enabled by default
    const loginMode = payload.loginMode || 'cookie_pass';
    const gridConfig = payload.gridConfig;
    const disableImages = payload.disableImages ?? false;
    const useragent = payload.useragent || acc?.useragent || undefined;

    // Check if session is already running
    const existing = this.sessions.get(accountId);
    if (existing && existing.isAlive) {
      try {
        if (existing.page && !existing.page.isClosed()) {
          await existing.page.bringToFront();
        }
        return {
          accountId,
          uid: existing.uid,
          browserPid: existing.browserPid,
          profilePath: existing.profilePath,
          proxyUsed: existing.proxyUsed,
          status: 'already_running',
        };
      } catch (e) {
        // Session might be dead, remove it
        this.sessions.delete(accountId);
      }
    }

    const profilePath = this.getProfilePath(uid);
    if (!fs.existsSync(profilePath)) {
      fs.mkdirSync(profilePath, { recursive: true });
    }

    // Grid layout calculation
    const bounds = calculateWindowBounds(windowIndex, gridConfig);

    // Launch arguments
    const args: string[] = [
      ...BROWSER_OPTIMIZED_ARGS,
      `--window-position=${bounds.x},${bounds.y}`,
      `--window-size=${bounds.width},${bounds.height}`,
    ];

    if (disableImages) {
      args.push('--blink-settings=imagesEnabled=false');
    }

    // Proxy setup
    const proxyConfigRaw = customProxy;
    const parsedProxy = this.parseProxy(proxyConfigRaw);

    // Executable path
    const executablePath = this.detectExecutablePath();
    const launchOptions: any = {
      headless: Boolean(headless),
      args,
      viewport: null, // Let window size dictate viewport
      ignoreDefaultArgs: ['--enable-automation'],
    };

    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    if (parsedProxy) {
      launchOptions.proxy = parsedProxy;
    }

    let context: BrowserContext;
    try {
      context = await chromium.launchPersistentContext(
        profilePath,
        launchOptions
      );
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('EBUSY') || msg.includes('locked')) {
        const error = new Error('Chrome profile is currently locked or in use');
        (error as any).code = ErrorCodes.ERR_PROFILE_IN_USE;
        throw error;
      }
      if (
        msg.includes('Executable doesn\'t exist') ||
        msg.includes('Failed to launch')
      ) {
        const error = new Error(`Chromium launch failed: ${msg}`);
        (error as any).code = ErrorCodes.ERR_BROWSER_LAUNCH;
        throw error;
      }
      throw err;
    }

    // Apply Stealth Anti-Fingerprinting Script
    try {
      await context.addInitScript(STEALTH_INIT_SCRIPT);
    } catch (err) {
      console.warn('[BrowserManager] Failed to inject stealth script:', err);
    }

    // Get primary page
    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    // Also evaluate stealth on initial page immediately
    try {
      await page.evaluate(STEALTH_INIT_SCRIPT);
    } catch (err) {
      // Ignore if about:blank or empty page
    }

    // Emulate standard user-agent if provided
    if (useragent) {
      await context.setExtraHTTPHeaders({
        'User-Agent': useragent,
      });
    }

    // Approximate PID
    const browserPid = Math.floor(10000 + Math.random() * 89999);

    const session: ActiveBrowserSession = {
      accountId,
      uid,
      context,
      page,
      browserPid,
      profilePath,
      proxyUsed: proxyConfigRaw || null,
      windowIndex,
      launchedAt: Date.now(),
      isAlive: true,
    };

    // Watch for close
    context.on('close', () => {
      session.isAlive = false;
      this.sessions.delete(accountId);
      console.log(`[BrowserManager] Context closed for account ${accountId}`);
    });

    this.sessions.set(accountId, session);

    // Initial navigation to Facebook
    try {
      if (page.url() === 'about:blank' || page.url() === '') {
        if (cookie) {
          const cookies = this.parseCookieString(cookie);
          if (cookies.length > 0) {
            await context.addCookies(cookies);
          }
        }
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 35000 });
      }
    } catch (e) {
      console.warn('[BrowserManager] Initial navigation warning:', e);
    }

    // Auto login if requested
    if (autoLogin) {
      this.login(accountId, {
        accountId,
        uid,
        pass,
        cookie,
        fa2,
        mode: loginMode,
      }).then((res) => {
        if (res.success && res.cookies && acc) {
          try {
            const { AccountRepository } = require('../../database/repositories/AccountRepository');
            new AccountRepository().update(accountId, { cookie: res.cookies, status: 'Live' });
          } catch {}
        }
      }).catch((loginErr) => {
        console.warn(`[BrowserManager] Auto-login warning for ${uid}:`, loginErr);
      });
    }

    // Always start continuous login & 2FA watcher for the session
    this.startBackgroundLoginWatcher(session, uid, pass, fa2);

    return {
      accountId,
      uid,
      browserPid,
      profilePath,
      proxyUsed: proxyConfigRaw || null,
      status: 'launched',
    };
  }

  /**
   * Alias for launch to conform with browser:open requests.
   */
  public async open(
    payload: BrowserLaunchPayload
  ): Promise<BrowserLaunchResult> {
    return this.launch(payload);
  }

  /**
   * Close browser context for a single account.
   */
  public async close(accountId: number): Promise<boolean> {
    const session = this.sessions.get(accountId);
    if (!session) {
      return true;
    }

    session.isAlive = false;
    this.sessions.delete(accountId);

    try {
      await session.context.close();
      return true;
    } catch (err) {
      console.warn(`[BrowserManager] Error closing context for ${accountId}:`, err);
      return false;
    }
  }

  /**
   * Close all running browser contexts safely.
   */
  public async closeAll(): Promise<boolean> {
    const activeList = Array.from(this.sessions.values());
    this.sessions.clear();

    const closePromises = activeList.map(async (s) => {
      try {
        s.isAlive = false;
        await s.context.close();
      } catch (err) {
        // Ignore single close failure
      }
    });

    await Promise.allSettled(closePromises);
    return true;
  }

  /**
   * Returns metadata of all currently active browser sessions.
   */
  public getActiveSessions(): BrowserSessionInfo[] {
    const results: BrowserSessionInfo[] = [];
    for (const s of this.sessions.values()) {
      results.push({
        accountId: s.accountId,
        uid: s.uid,
        browserPid: s.browserPid,
        profilePath: s.profilePath,
        proxyUsed: s.proxyUsed,
        windowIndex: s.windowIndex,
        launchedAt: s.launchedAt,
        isAlive: s.isAlive,
      });
    }
    return results;
  }

  /**
   * Retrieve active session reference.
   */
  public getSession(accountId: number): ActiveBrowserSession | undefined {
    return this.sessions.get(accountId);
  }

  /**
   * Smart Login Flow:
   * 1. Try Cookie injection if available.
   * 2. Verify login state on Facebook.
   * 3. Fallback to human UID/Pass typing if needed.
   * 4. Solve 2FA TOTP automatically.
   * 5. Detect checkpoints (282, 956).
   * 6. Extract and return refreshed session cookies.
   */
  public async login(
    accountId: number,
    credentials: BrowserLoginPayload
  ): Promise<BrowserLoginResult> {
    const session = this.sessions.get(accountId);
    if (!session || !session.isAlive) {
      const err = new Error(`Browser for account ${accountId} is not running`);
      (err as any).code = ErrorCodes.ERR_BROWSER_NOT_RUNNING;
      throw err;
    }

    const { uid = session.uid, pass, cookie, fa2, mode = 'cookie_pass' } = credentials;
    const page = session.page;

    try {
      // 1. COOKIE INJECTION (if mode allows cookie)
      if (cookie && (mode === 'cookie' || mode === 'cookie_pass')) {
        const cookies = this.parseCookieString(cookie);
        if (cookies.length > 0) {
          await session.context.addCookies(cookies);
        }
      }

      // Navigate to Facebook
      await page.goto('https://www.facebook.com/', {
        waitUntil: 'domcontentloaded',
        timeout: 30000,
      });

      // Brief wait for redirect / dynamic hydration
      await page.waitForTimeout(2500);

      // Check Checkpoints immediately
      let checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return {
          success: false,
          accountId,
          uid,
          checkpoint,
          errorMessage: `Hit Checkpoint ${checkpoint}`,
        };
      }

      // Verify if login succeeded via cookie
      const isAlreadyLoggedIn = await this.isLoggedIn(page);
      if (isAlreadyLoggedIn) {
        const freshCookies = await this.extractCookies(session.context);
        return {
          success: true,
          accountId,
          uid,
          cookies: freshCookies,
          checkpoint: null,
        };
      }

      // If mode was cookie-only and not logged in, stop here
      if (mode === 'cookie') {
        return {
          success: false,
          accountId,
          uid,
          errorMessage: 'Cookie is invalid or expired',
        };
      }

      // 2. UID / PASS HUMAN-LIKE LOGIN
      if (pass) {
        // Dismiss cookie banner if present
        try {
          const cookieConsent = page.locator(
            '[data-cookiebanner="accept_button"], button:has-text("Allow all cookies"), button:has-text("Cho phép tất cả cookie"), button:has-text("Cho phép các cookie"), button[data-testid="cookie-policy-manage-dialog-accept-button"]'
          ).first();
          if (await cookieConsent.isVisible({ timeout: 1500 })) {
            await cookieConsent.click({ force: true }).catch(() => {});
          }
        } catch {}

        const emailInput = page.locator(
          'input#email, input[name="email"], input[id="m_login_email"], input[type="email"], input[autocomplete="username"]'
        ).first();

        const passInput = page.locator(
          'input#pass, input[name="pass"], input[id="m_login_password"], input[type="password"]'
        ).first();

        const isEmailVisible = await emailInput.isVisible({ timeout: 8000 }).catch(() => false);
        if (isEmailVisible) {
          // Human-like typing for UID
          await emailInput.click({ force: true }).catch(() => {});
          await emailInput.fill(uid);
          await page.waitForTimeout(300);

          // Human-like typing for Password
          await passInput.click({ force: true }).catch(() => {});
          await passInput.fill(pass);
          await page.waitForTimeout(500);

          // Click login button
          const loginBtn = page.locator(
            'button[name="login"], button[type="submit"], input[type="submit"], button#loginbutton, [role="button"][name="login"], button:has-text("Đăng nhập"), button:has-text("Log in"), button:has-text("Log In")'
          ).first();

          console.log('[BrowserManager] Submitting login form for', uid);
          let clicked = false;
          if (await loginBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
            await loginBtn.click({ force: true, timeout: 5000 }).then(() => { clicked = true; }).catch(() => {});
          }
          if (!clicked) {
            await passInput.press('Enter').catch(() => {});
          }

          // Fallback JavaScript click directly inside DOM
          await page.evaluate(() => {
            const btn = document.querySelector('button[name="login"], button[type="submit"], input[type="submit"], #loginbutton, [role="button"][name="login"]') as HTMLElement;
            if (btn) btn.click();
          }).catch(() => {});

          await page.waitForTimeout(4000);
        }

        // Re-check Checkpoint
        checkpoint = await this.detectCheckpoint(page);
        if (checkpoint) {
          return {
            success: false,
            accountId,
            uid,
            checkpoint,
            errorMessage: `Hit Checkpoint ${checkpoint}`,
          };
        }

        // 3. 2FA SCREEN DETECTION & AUTOMATIC SOLVING
        const is2faScreen = await this.is2faPage(page);
        if (is2faScreen) {
          if (!fa2) {
            return {
              success: false,
              accountId,
              uid,
              errorMessage: '2FA required but secret key (fa2) is missing',
            };
          }

          const solveResult = await this.solve2fa(accountId, fa2);
          if (!solveResult.success) {
            return {
              success: false,
              accountId,
              uid,
              errorMessage: solveResult.message || '2FA verification failed',
            };
          }

          await page.waitForTimeout(3000);

          // Handle "Remember Browser" / "Save Browser" prompt
          await this.handleRememberBrowserPrompt(page);
        }

        // Final Checkpoint Check
        checkpoint = await this.detectCheckpoint(page);
        if (checkpoint) {
          return {
            success: false,
            accountId,
            uid,
            checkpoint,
            errorMessage: `Hit Checkpoint ${checkpoint}`,
          };
        }

        // Check if successfully logged in
        const loggedIn = await this.isLoggedIn(page);
        const freshCookies = await this.extractCookies(session.context);

        if (loggedIn) {
          return {
            success: true,
            accountId,
            uid,
            cookies: freshCookies,
            checkpoint: null,
          };
        }

        // Check for wrong password message
        const pageText = await page.evaluate(() =>
          document.body ? document.body.innerText : ''
        );
        if (
          pageText.includes('không chính xác') ||
          pageText.includes('Wrong Credentials') ||
          pageText.includes('Incorrect password')
        ) {
          return {
            success: false,
            accountId,
            uid,
            errorMessage: 'Incorrect password',
          };
        }

        return {
          success: freshCookies.includes('c_user'),
          accountId,
          uid,
          cookies: freshCookies,
          checkpoint: null,
        };
      }

      return {
        success: false,
        accountId,
        uid,
        errorMessage: 'Login failed: no credentials provided',
      };
    } catch (err: any) {
      return {
        success: false,
        accountId,
        uid,
        errorMessage: err?.message || String(err),
      };
    }
  }

  /**
   * Solves 2FA by generating a 6-digit TOTP code and filling the approval input.
   */
  public async solve2fa(
    accountId: number,
    secretKey?: string
  ): Promise<BrowserSolve2faResult> {
    const session = this.sessions.get(accountId);
    if (!session || !session.isAlive) {
      throw new Error(`Browser for account ${accountId} is not running`);
    }

    if (!secretKey) {
      throw new Error('2FA Secret Key is required');
    }

    const { otp } = this.getOtp(secretKey);
    const page = session.page;

    const codeInput = page.locator(
      'input[name="approvals_code"], input#approvals_code, input[autocomplete="one-time-code"], input[type="tel"]'
    ).first();

    const isInputVisible = await codeInput.isVisible({ timeout: 5000 }).catch(() => false);
    if (!isInputVisible) {
      return {
        success: false,
        otp,
        message: '2FA approval input field not found on page',
      };
    }

    await codeInput.click();
    await codeInput.fill('');
    await this.typeHumanLike(codeInput, otp, 50, 100);

    // Click submit button
    const submitBtn = page.locator(
      'button#checkpointSubmitButton, button[type="submit"], input[type="submit"], button:has-text("Tiếp tục"), button:has-text("Submit Code"), button:has-text("Gửi mã")'
    ).first();

    let submitted = false;
    if (await submitBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await submitBtn.click({ force: true, timeout: 5000 }).then(() => { submitted = true; }).catch(() => {});
    }
    if (!submitted) {
      await codeInput.press('Enter').catch(() => {});
    }
    await page.evaluate(() => {
      const btn = document.querySelector('button#checkpointSubmitButton, button[type="submit"], input[type="submit"]') as HTMLElement;
      if (btn) btn.click();
    }).catch(() => {});

    await page.waitForTimeout(3000);

    return {
      success: true,
      otp,
      message: '2FA code submitted successfully',
    };
  }

  /**
   * Calculates 6-digit TOTP code from secret key using RFC 6238 standard.
   */
  public getOtp(secretKey: string): GetOtpResult {
    const cleanKey = String(secretKey).replace(/[\s-]+/g, '').toUpperCase();
    if (!cleanKey) {
      const err = new Error('Invalid empty 2FA secret key');
      (err as any).code = ErrorCodes.ERR_2FA_INVALID_KEY;
      throw err;
    }

    try {
      const otp = authenticator.generate(cleanKey);
      const remainingSeconds = authenticator.timeRemaining();
      return {
        otp,
        remainingSeconds,
      };
    } catch (err: any) {
      const error = new Error(`Failed to generate TOTP: ${err?.message || err}`);
      (error as any).code = ErrorCodes.ERR_2FA_INVALID_KEY;
      throw error;
    }
  }

  /**
   * Clean profile directories from disk.
   */
  public async cleanProfile(
    payload: CleanProfilePayload
  ): Promise<CleanProfileResult> {
    const { accountIds, deleteCacheOnly = false } = payload;
    let cleanedCount = 0;
    let freedBytes = 0;

    for (const accId of accountIds) {
      // First, ensure running session is closed
      if (this.sessions.has(accId)) {
        await this.close(accId);
      }

      const profileDir = this.getProfilePath(String(accId));
      if (!fs.existsSync(profileDir)) continue;

      try {
        if (deleteCacheOnly) {
          const cacheDirs = [
            path.join(profileDir, 'Default', 'Cache'),
            path.join(profileDir, 'Default', 'Code Cache'),
            path.join(profileDir, 'Default', 'GPUCache'),
            path.join(profileDir, 'Default', 'Service Worker', 'CacheStorage'),
            path.join(profileDir, 'Default', 'Service Worker', 'ScriptCache'),
            path.join(profileDir, 'ShaderCache'),
            path.join(profileDir, 'GrShaderCache'),
          ];

          for (const cDir of cacheDirs) {
            if (fs.existsSync(cDir)) {
              const sz = this.getDirectorySizeBytes(cDir);
              freedBytes += sz;
              fs.rmSync(cDir, { recursive: true, force: true });
            }
          }
          cleanedCount++;
        } else {
          const totalSize = this.getDirectorySizeBytes(profileDir);
          freedBytes += totalSize;
          fs.rmSync(profileDir, { recursive: true, force: true });
          cleanedCount++;
        }
      } catch (err) {
        console.warn(`[BrowserManager] Failed to clean profile for ${accId}:`, err);
      }
    }

    return {
      cleanedCount,
      freedBytes,
      freedFormatted: this.formatBytes(freedBytes),
    };
  }

  /**
   * Cleans all profiles in the profiles folder.
   */
  public async cleanAllProfiles(): Promise<CleanProfileResult> {
    await this.closeAll();
    let cleanedCount = 0;
    let freedBytes = 0;

    if (fs.existsSync(this.baseProfileDir)) {
      try {
        const entries = fs.readdirSync(this.baseProfileDir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.isDirectory()) {
            const fullPath = path.join(this.baseProfileDir, entry.name);
            const size = this.getDirectorySizeBytes(fullPath);
            freedBytes += size;
            fs.rmSync(fullPath, { recursive: true, force: true });
            cleanedCount++;
          }
        }
      } catch (err) {
        console.warn('[BrowserManager] Failed to clean all profiles:', err);
      }
    }

    return {
      cleanedCount,
      freedBytes,
      freedFormatted: this.formatBytes(freedBytes),
    };
  }

  // ========================================================
  // INTERNAL HELPERS
  // ========================================================

  /**
   * Checkpoint detection for 282, 956, and generic blocks.
   */
  public async detectCheckpoint(
    page: Page
  ): Promise<'282' | '956' | 'unknown' | null> {
    try {
      const url = page.url().toLowerCase();

      // Checkpoint 282 (ID / Selfie upload, suspended account)
      if (
        url.includes('150109282352528') ||
        (url.includes('checkpoint') && (url.includes('upload') || url.includes('id')))
      ) {
        return '282';
      }

      // Checkpoint 956 (Account locked, get started safe)
      if (
        url.includes('828281030928956') ||
        (url.includes('checkpoint') && url.includes('locked'))
      ) {
        return '956';
      }

      // Deep DOM inspection
      const pageText = await page.evaluate(() => {
        return document.body ? document.body.innerText.toLowerCase() : '';
      });

      if (
        pageText.includes('tải lên ảnh') ||
        pageText.includes('chúng tôi đã tạm ngưng tài khoản') ||
        pageText.includes('upload a photo of yourself') ||
        pageText.includes('help us confirm that it\'s you') ||
        pageText.includes('disagree with decision') ||
        pageText.includes('bạn phản đối quyết định')
      ) {
        return '282';
      }

      if (
        pageText.includes('tài khoản của bạn đã bị khóa') ||
        pageText.includes('your account has been locked') ||
        pageText.includes('chúng tôi phát hiện hoạt động bất thường') ||
        (pageText.includes('bắt đầu') && pageText.includes('khóa')) ||
        (pageText.includes('get started') && pageText.includes('locked'))
      ) {
        return '956';
      }

      if (url.includes('checkpoint')) {
        return 'unknown';
      }

      return null;
    } catch (err) {
      return null;
    }
  }

  /**
   * Check whether the page is currently logged in to Facebook.
   */
  private async isLoggedIn(page: Page): Promise<boolean> {
    try {
      const url = page.url();
      if (url.includes('login') || url.includes('checkpoint')) {
        return false;
      }

      // Check cookie c_user first (most reliable indicator on Facebook)
      const cookies = await page.context().cookies('https://www.facebook.com').catch(() => []);
      const cUser = cookies.find(c => c.name === 'c_user');
      if (cUser && cUser.value && cUser.value.length >= 4) {
        return true;
      }

      // Check presence of feed, avatar, or navigation elements
      const loggedInIndicator = await page.locator(
        '[aria-label="Facebook"][role="navigation"], div[role="feed"], div[role="navigation"], a[href*="/me/"], a[aria-label="Trang cá nhân của bạn"], div[aria-label="Tài khoản"]'
      ).first().isVisible({ timeout: 1500 }).catch(() => false);

      return Boolean(loggedInIndicator);
    } catch {
      return false;
    }
  }

  /**
   * Check if current page is asking for 2FA one-time code.
   */
  private async is2faPage(page: Page): Promise<boolean> {
    try {
      const has2faInput = await page.locator(
        'input[name="approvals_code"], input#approvals_code, input[autocomplete="one-time-code"]'
      ).first().isVisible({ timeout: 3000 }).catch(() => false);

      if (has2faInput) return true;

      const pageText = await page.evaluate(() =>
        document.body ? document.body.innerText.toLowerCase() : ''
      );

      return (
        pageText.includes('xác thực 2 yếu tố') ||
        pageText.includes('two-factor') ||
        pageText.includes('mã đăng nhập') ||
        pageText.includes('login code')
      );
    } catch {
      return false;
    }
  }

  /**
   * Handle post-login "Save Browser" / "Remember Browser" dialogues.
   */
  private async handleRememberBrowserPrompt(page: Page): Promise<void> {
    try {
      const saveBtn = page.locator(
        'button:has-text("Lưu trình duyệt"), button:has-text("Đây là tôi"), button:has-text("Save browser"), button:has-text("Tiếp tục"), button:has-text("Continue")'
      ).first();

      const isVisible = await saveBtn.isVisible({ timeout: 3000 }).catch(() => false);
      if (isVisible) {
        await saveBtn.click();
        await page.waitForTimeout(2000);
      }
    } catch {
      // Ignore prompt skip
    }
  }

  /**
   * Human-like typing with random delay.
   */
  private async typeHumanLike(
    locator: any,
    text: string,
    minDelay = 40,
    maxDelay = 100
  ): Promise<void> {
    for (const char of text) {
      const delay = Math.floor(Math.random() * (maxDelay - minDelay + 1)) + minDelay;
      await locator.pressSequentially(char, { delay });
    }
  }

  /**
   * Extract session cookies into string format (c_user=...; xs=...).
   */
  public async extractCookies(context: BrowserContext): Promise<string> {
    try {
      const cookies = await context.cookies([
        'https://www.facebook.com',
        'https://m.facebook.com',
      ]);

      const priority = ['c_user', 'xs', 'datr', 'sb', 'fr'];
      const sorted = [...cookies].sort((a, b) => {
        const aIdx = priority.indexOf(a.name.toLowerCase());
        const bIdx = priority.indexOf(b.name.toLowerCase());
        if (aIdx !== -1 && bIdx !== -1) return aIdx - bIdx;
        if (aIdx !== -1) return -1;
        if (bIdx !== -1) return 1;
        return a.name.localeCompare(b.name);
      });

      return sorted.map((c) => `${c.name}=${c.value}`).join('; ');
    } catch (err) {
      console.warn('[BrowserManager] Error extracting cookies:', err);
      return '';
    }
  }

  /**
   * Parse cookie string into Playwright cookie objects.
   */
  public parseCookieString(
    cookieStr: string,
    defaultDomain = '.facebook.com'
  ): Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: 'Lax' | 'None' | 'Strict';
  }> {
    if (!cookieStr || typeof cookieStr !== 'string') return [];
    const pairs = cookieStr.split(';');
    const result = [];

    for (const pair of pairs) {
      const trimmed = pair.trim();
      if (!trimmed) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx <= 0) continue;
      const name = trimmed.substring(0, eqIdx).trim();
      const value = trimmed.substring(eqIdx + 1).trim();
      if (!name) continue;

      result.push({
        name,
        value,
        domain: defaultDomain,
        path: '/',
        secure: true,
        httpOnly: name.toLowerCase() === 'xs' || name.toLowerCase() === 'datr',
        sameSite: 'Lax' as const,
      });
    }

    return result;
  }

  /**
   * Parse proxy string into Playwright proxy object.
   */
  public parseProxy(
    proxyStr?: string
  ): { server: string; username?: string; password?: string } | undefined {
    if (!proxyStr || typeof proxyStr !== 'string') return undefined;
    const trimmed = proxyStr.trim();
    if (!trimmed) return undefined;

    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('socks5://') ||
      trimmed.startsWith('socks4://')
    ) {
      try {
        const url = new URL(trimmed);
        return {
          server: `${url.protocol}//${url.hostname}:${url.port}`,
          username: url.username ? decodeURIComponent(url.username) : undefined,
          password: url.password ? decodeURIComponent(url.password) : undefined,
        };
      } catch {
        // Fall through
      }
    }

    if (trimmed.includes('@')) {
      const [auth, hostPort] = trimmed.split('@');
      const [user, pass] = auth.split(':');
      return {
        server: `http://${hostPort}`,
        username: user,
        password: pass,
      };
    }

    const parts = trimmed.split(':');
    if (parts.length === 2) {
      return {
        server: `http://${parts[0]}:${parts[1]}`,
      };
    } else if (parts.length === 4) {
      return {
        server: `http://${parts[0]}:${parts[1]}`,
        username: parts[2],
        password: parts[3],
      };
    }

    return {
      server: `http://${trimmed}`,
    };
  }

  private getDirectorySizeBytes(dirPath: string): number {
    if (!fs.existsSync(dirPath)) return 0;
    let total = 0;
    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          total += this.getDirectorySizeBytes(fullPath);
        } else if (entry.isFile()) {
          try {
            total += fs.statSync(fullPath).size;
          } catch {}
        }
      }
    } catch {}
    return total;
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Background login watcher: Continuously watches page for up to 45 seconds.
   * If login form or 2FA prompt appears, automatically fills credentials and submits.
   */
  private startBackgroundLoginWatcher(
    session: ActiveBrowserSession,
    uid: string,
    pass: string,
    fa2: string
  ): void {
    if (!pass && !fa2) return;

    let attempts = 0;
    const maxAttempts = 30; // Check for ~45s
    let hasSubmittedLogin = false;
    let hasSubmitted2Fa = false;

    const interval = setInterval(async () => {
      attempts++;
      if (!session.isAlive || attempts > maxAttempts) {
        clearInterval(interval);
        return;
      }

      try {
        const page = session.page;
        if (!page || page.isClosed()) {
          clearInterval(interval);
          return;
        }

        const url = page.url();
        if (!url.includes('facebook.com')) return;

        // 1. Dismiss cookie banners if any
        const cookieBanner = page.locator(
          '[data-cookiebanner="accept_button"], button:has-text("Allow all cookies"), button:has-text("Cho phép tất cả cookie"), button:has-text("Cho phép các cookie")'
        ).first();
        if (await cookieBanner.isVisible({ timeout: 400 }).catch(() => false)) {
          await cookieBanner.click({ force: true }).catch(() => {});
        }

        // 2. Check if logged in
        const isLogged = await this.isLoggedIn(page);
        if (isLogged) {
          clearInterval(interval);
          return;
        }

        // 3. Fill Login form if visible and not submitted yet
        if (!hasSubmittedLogin && pass) {
          const emailInput = page.locator('input#email, input[name="email"], input[id="m_login_email"], input[type="email"]').first();
          const passInput = page.locator('input#pass, input[name="pass"], input[id="m_login_password"], input[type="password"]').first();

          const emailVis = await emailInput.isVisible({ timeout: 500 }).catch(() => false);
          const passVis = await passInput.isVisible({ timeout: 500 }).catch(() => false);

          if (emailVis && passVis) {
            hasSubmittedLogin = true;
            console.log(`[Watcher] Auto-submitting login for UID ${uid}...`);
            await emailInput.click({ force: true }).catch(() => {});
            await emailInput.fill(uid);
            await page.waitForTimeout(200);

            await passInput.click({ force: true }).catch(() => {});
            await passInput.fill(pass);
            await page.waitForTimeout(300);

            const loginBtn = page.locator(
              'button[name="login"], button[type="submit"], input[type="submit"], button#loginbutton, [role="button"][name="login"], button:has-text("Đăng nhập"), button:has-text("Log in"), button:has-text("Log In")'
            ).first();

            let clicked = false;
            if (await loginBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
              await loginBtn.click({ force: true, timeout: 3000 }).then(() => { clicked = true; }).catch(() => {});
            }
            if (!clicked) {
              await passInput.press('Enter').catch(() => {});
            }
            await page.evaluate(() => {
              const btn = document.querySelector('button[name="login"], button[type="submit"], input[type="submit"], #loginbutton, [role="button"][name="login"]') as HTMLElement;
              if (btn) btn.click();
            }).catch(() => {});
          }
        }

        // 4. Fill 2FA if 2FA input is visible
        if (!hasSubmitted2Fa && fa2) {
          const otpInput = page.locator('input[name="approvals_code"], input#approvals_code, input[autocomplete="one-time-code"]').first();
          if (await otpInput.isVisible({ timeout: 500 }).catch(() => false)) {
            hasSubmitted2Fa = true;
            console.log(`[Watcher] Auto-filling 2FA OTP for UID ${uid}...`);
            await this.solve2fa(session.accountId, fa2);
            await page.waitForTimeout(2000);
            await this.handleRememberBrowserPrompt(page);
          }
        }

        // 5. Check Remember Browser prompt
        await this.handleRememberBrowserPrompt(page);
      } catch (e) {
        // Ignore background watcher errors
      }
    }, 1500);
  }
}
