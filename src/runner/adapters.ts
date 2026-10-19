/**
 * LushCare Electron - Runner Adapters
 * Cung cấp giao diện tương thích (Adapter) kết nối Runner với BrowserManager và Database.
 * Đảm bảo hệ thống có thể chạy độc lập với Playwright nhúng và SQLite/Memory fallback
 * ngay cả khi các module khác của Dev 1 hoặc Dev 2 đang được phát triển song song.
 */

import * as path from 'path';
import * as fs from 'fs';
import { chromium, BrowserContext, Page } from 'playwright-core';
import { AccountEntity, ScenarioEntity, BrowserLaunchPayload } from '../shared/types';
import { proxyManager } from '../proxy/ProxyManager';

export interface IBrowserSession {
  page: Page;
  context: BrowserContext;
  accountId: number;
  uid: string;
  pid: number;
}

export interface IBrowserManager {
  launch(payload: BrowserLaunchPayload): Promise<IBrowserSession>;
  close(accountId: number): Promise<boolean>;
  closeAll(): Promise<boolean>;
  login?(accountId: number, credentials: any): Promise<any>;
}

export interface IDatabaseAdapter {
  getAccount(id: number): Promise<AccountEntity | null>;
  getAccounts(ids: number[]): Promise<AccountEntity[]>;
  updateAccountStatus(id: number, status: string, info?: string): Promise<void>;
  getScenario(id: number): Promise<ScenarioEntity | null>;
  getAllScenarios(): ScenarioEntity[];
  registerScenario(scenario: ScenarioEntity): void;
  deleteScenario?(id: number): boolean;
}

/**
 * Default Browser Manager: Khởi chạy Playwright Persistent Context
 * tích hợp Stealth, Profile riêng biệt tại `profiles/{uid}`, chia lưới cửa sổ và Proxy.
 */
export class DefaultBrowserManager implements IBrowserManager {
  private activeSessions = new Map<number, IBrowserSession>();

  async launch(payload: BrowserLaunchPayload): Promise<IBrowserSession> {
    const accountId = payload.accountId;
    const uid = payload.uid || `acc_${accountId}`;

    // Nếu session đang chạy, đóng phiên cũ trước khi mở lại
    if (this.activeSessions.has(accountId)) {
      await this.close(accountId);
    }

    // Đường dẫn thư mục Profile cô lập
    const baseProfilesDir = path.resolve(process.cwd(), 'profiles');
    const profileDir = path.join(baseProfilesDir, uid);
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
    }

    // Chuẩn bị cờ tối ưu hóa và chống phát hiện Bot
    const args = [
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
      '--exclude-switches=enable-automation',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-backgrounding-occluded-windows',
      '--disable-breakpad',
      '--disable-component-extensions-with-background-pages',
      '--disable-ipc-flooding-protection',
      '--disable-renderer-backgrounding',
      '--mute-audio',
    ];

    if (payload.disableImages) {
      args.push('--blink-settings=imagesEnabled=false');
    }

    // Tính toán tọa độ chia lưới cửa sổ (Window Grid) nếu có
    const windowIndex = payload.windowIndex ?? 0;
    const cols = payload.gridConfig?.columns ?? 4;
    const rows = payload.gridConfig?.rows ?? 2;
    const screenWidth = 1920;
    const screenHeight = 1080;
    const winWidth = Math.floor(screenWidth / cols);
    const winHeight = Math.floor(screenHeight / rows);
    const colIdx = windowIndex % cols;
    const rowIdx = Math.floor(windowIndex / cols) % rows;
    const posX = colIdx * winWidth;
    const posY = rowIdx * winHeight;

    args.push(`--window-position=${posX},${posY}`);
    args.push(`--window-size=${winWidth},${winHeight}`);

    // Xử lý Proxy
    let proxyOptions: any = undefined;
    const rawProxy = payload.customProxy || payload.proxy;
    if (rawProxy) {
      try {
        const anonymizedUrl = await proxyManager.getAnonymizedUrl(rawProxy);
        proxyOptions = { server: anonymizedUrl };
      } catch {
        const parsed = proxyManager.parseProxy(rawProxy);
        if (parsed) {
          proxyOptions = {
            server: `${parsed.protocol}://${parsed.host}:${parsed.port}`,
            username: parsed.username,
            password: parsed.password,
          };
        }
      }
    }

    // Khởi chạy trình duyệt Persistent Context
    const context = await chromium.launchPersistentContext(profileDir, {
      headless: payload.headless ?? false,
      args,
      viewport: { width: winWidth, height: winHeight },
      userAgent: payload.useragent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
      locale: 'vi-VN',
      timezoneId: 'Asia/Ho_Chi_Minh',
      proxy: proxyOptions,
      ignoreHTTPSErrors: true,
    });

    // Lớp phòng vệ Stealth vá tầng JavaScript runtime
    await context.addInitScript(() => {
      // 1. Xóa cờ navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });

      // 2. Giả lập đối tượng window.chrome chuẩn của Google Chrome thật
      (window as any).chrome = {
        app: { isInstalled: false },
        runtime: {},
        csi: () => {},
        loadTimes: () => {},
      };

      // 3. Giả lập plugin mimetypes
      Object.defineProperty(navigator, 'plugins', {
        get: () => [1, 2, 3, 4, 5],
      });

      // 4. Giả lập hardware concurrency
      Object.defineProperty(navigator, 'hardwareConcurrency', {
        get: () => 8,
      });
    });

    // Nạp Cookie phiên nếu có
    if (payload.cookie) {
      try {
        const cookies = this.parseCookiesString(payload.cookie);
        if (cookies.length > 0) {
          await context.addCookies(cookies);
        }
      } catch {
        // Bỏ qua lỗi nạp cookie
      }
    }

    const pages = context.pages();
    const page = pages.length > 0 ? pages[0] : await context.newPage();

    const session: IBrowserSession = {
      page,
      context,
      accountId,
      uid,
      pid: 0,
    };

    this.activeSessions.set(accountId, session);
    return session;
  }

  async close(accountId: number): Promise<boolean> {
    const session = this.activeSessions.get(accountId);
    if (!session) return false;

    try {
      await session.context.close();
    } catch {
      // Bỏ qua lỗi khi đóng context
    } finally {
      this.activeSessions.delete(accountId);
    }
    return true;
  }

  async closeAll(): Promise<boolean> {
    for (const accountId of Array.from(this.activeSessions.keys())) {
      await this.close(accountId);
    }
    return true;
  }

  private parseCookiesString(cookieStr: string): Array<{ name: string; value: string; domain: string; path: string }> {
    const result: Array<{ name: string; value: string; domain: string; path: string }> = [];
    const items = cookieStr.split(';');
    for (const item of items) {
      const parts = item.trim().split('=');
      if (parts.length >= 2) {
        const name = parts[0].trim();
        const value = parts.slice(1).join('=').trim();
        if (name && value) {
          result.push({
            name,
            value,
            domain: '.facebook.com',
            path: '/',
          });
        }
      }
    }
    return result;
  }
}

/**
 * Default Database Adapter
 * Đảm bảo cập nhật trạng thái nick và tải kịch bản mượt mà
 */
export class DefaultDatabaseAdapter implements IDatabaseAdapter {
  private accountsStore = new Map<number, AccountEntity>();
  private scenariosStore = new Map<number, ScenarioEntity>();

  constructor() {
    this.initDefaultScenarios();
  }

  public registerAccount(account: AccountEntity): void {
    this.accountsStore.set(account.id, account);
  }

  public registerScenario(scenario: ScenarioEntity): void {
    this.scenariosStore.set(scenario.id, scenario);
  }

  async getAccount(id: number): Promise<AccountEntity | null> {
    return this.accountsStore.get(id) || null;
  }

  async getAccounts(ids: number[]): Promise<AccountEntity[]> {
    return ids.map((id) => this.accountsStore.get(id)).filter((a): a is AccountEntity => !!a);
  }

  async updateAccountStatus(id: number, status: string, info?: string): Promise<void> {
    const acc = this.accountsStore.get(id);
    if (acc) {
      acc.status = status;
      if (info) acc.info = info;
      acc.interactEnd = new Date().toISOString();
      this.accountsStore.set(id, acc);
    }
  }

  async getScenario(id: number): Promise<ScenarioEntity | null> {
    return this.scenariosStore.get(id) || null;
  }

  public getAllScenarios(): ScenarioEntity[] {
    return Array.from(this.scenariosStore.values());
  }

  private initDefaultScenarios(): void {
    const defaultScenario: ScenarioEntity = {
      id: 1,
      name: 'Kịch bản Nuôi Nick Cơ Bản (Feed + Reels)',
      description: 'Lướt bảng tin 5 phút, xem reels và tương tác thả tim bài viết',
      actions: [
        {
          id: 1,
          scenarioId: 1,
          actionCode: 'HDBaiVietNewsfeed',
          name: 'Lướt Bảng Tin',
          configJson: JSON.stringify({ minScrollTimes: 3, maxScrollTimes: 6, likePercent: 40 }),
          orderIndex: 1,
        },
        {
          id: 2,
          scenarioId: 1,
          actionCode: 'HDTuongTacReelNgauNhien',
          name: 'Xem Video Reels',
          configJson: JSON.stringify({ reelsCountMin: 2, reelsCountMax: 4, watchTimeMinSec: 8 }),
          orderIndex: 2,
        },
      ],
      createdAt: new Date().toISOString(),
    };
    this.scenariosStore.set(defaultScenario.id, defaultScenario);
  }
}

/**
 * Unified Browser Manager Adapter: Tự động kết nối với BrowserManager của Dev 1
 */
export class UnifiedBrowserManagerAdapter implements IBrowserManager {
  private fallbackManager = new DefaultBrowserManager();

  async launch(payload: BrowserLaunchPayload): Promise<IBrowserSession> {
    try {
      const { BrowserManager } = require('../main/browser/BrowserManager');
      const bm = BrowserManager.getInstance();
      await bm.launch(payload);
      const session = bm.getSession(payload.accountId);
      if (session && session.page && session.context) {
        return {
          page: session.page,
          context: session.context,
          accountId: session.accountId,
          uid: session.uid,
          pid: session.browserPid,
        };
      }
    } catch {
      // Fallback
    }
    return this.fallbackManager.launch(payload);
  }

  async close(accountId: number): Promise<boolean> {
    try {
      const { BrowserManager } = require('../main/browser/BrowserManager');
      const bm = BrowserManager.getInstance();
      return await bm.close(accountId);
    } catch {
      return this.fallbackManager.close(accountId);
    }
  }

  async closeAll(): Promise<boolean> {
    try {
      const { BrowserManager } = require('../main/browser/BrowserManager');
      const bm = BrowserManager.getInstance();
      return await bm.closeAll();
    } catch {
      return this.fallbackManager.closeAll();
    }
  }

  async login(accountId: number, credentials: any): Promise<any> {
    try {
      const { BrowserManager } = require('../main/browser/BrowserManager');
      const bm = BrowserManager.getInstance();
      return await bm.login(accountId, credentials);
    } catch (e: any) {
      return { success: false, errorMessage: e?.message || String(e) };
    }
  }
}

/**
 * Unified Database Adapter: Tự động kết nối với SQLite DAO của Dev 2
 */
export class UnifiedDatabaseAdapter implements IDatabaseAdapter {
  private fallbackDb = new DefaultDatabaseAdapter();

  async getAccount(id: number): Promise<AccountEntity | null> {
    try {
      const { AccountRepository } = require('../database/repositories/AccountRepository');
      const repo = new AccountRepository();
      const acc = repo.getById(id);
      if (acc) return acc;
    } catch {}
    return this.fallbackDb.getAccount(id);
  }

  async getAccounts(ids: number[]): Promise<AccountEntity[]> {
    const list: AccountEntity[] = [];
    for (const id of ids) {
      const acc = await this.getAccount(id);
      if (acc) list.push(acc);
    }
    return list;
  }

  async updateAccountStatus(id: number, status: string, info?: string): Promise<void> {
    try {
      const { AccountRepository } = require('../database/repositories/AccountRepository');
      const repo = new AccountRepository();
      repo.updateStatus({ id, status, info });
    } catch {}
    await this.fallbackDb.updateAccountStatus(id, status, info);
  }

  async getScenario(id: number): Promise<ScenarioEntity | null> {
    try {
      const { ScenarioRepository } = require('../database/repositories/ScenarioRepository');
      const repo = new ScenarioRepository();
      const detail = repo.getById(id);
      if (detail) {
        return {
          id: detail.id,
          name: detail.name,
          actions: detail.actions.map((a: any) => ({
            id: a.id,
            scenarioId: a.scenarioId,
            actionCode: a.actionTypeCode,
            name: a.actionName,
            configJson: JSON.stringify(a.config),
            orderIndex: a.STT,
          })),
        };
      }
    } catch {}
    return this.fallbackDb.getScenario(id);
  }

  getAllScenarios(): ScenarioEntity[] {
    try {
      const { ScenarioRepository } = require('../database/repositories/ScenarioRepository');
      const repo = new ScenarioRepository();
      const list = repo.getAll();
      if (list && list.length > 0) {
        return list.map((s: any) => ({
          id: s.id,
          name: s.name,
          actions: [],
        }));
      }
    } catch {}
    return this.fallbackDb.getAllScenarios();
  }

  registerScenario(scenario: ScenarioEntity): void {
    this.fallbackDb.registerScenario(scenario);
  }

  registerAccount(account: AccountEntity): void {
    this.fallbackDb.registerAccount(account);
  }
}

export const defaultBrowserManager = new UnifiedBrowserManagerAdapter();
export const defaultDatabaseAdapter = new UnifiedDatabaseAdapter();
