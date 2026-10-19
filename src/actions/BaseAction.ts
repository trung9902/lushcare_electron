/**
 * LushCare Electron - Base Action Specification
 * Lớp trừu tượng nền tảng chuẩn hóa cho toàn bộ 70 hành động Facebook.
 */

import type { Page } from 'playwright-core';
import { AccountEntity } from '../shared/types';

export interface ActionResult {
  success: boolean;
  message?: string;
  data?: Record<string, any>;
  error?: string;
  interrupted?: boolean;
  checkpointHit?: '282' | '956' | 'checkpoint' | string | null;
  stats?: Record<string, number>;
}

export interface ActionExecutionContext {
  accountId: number;
  uid: string;
  account?: AccountEntity | null;
  logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS') => void;
  isAborted: () => boolean;
  isPaused: () => boolean;
  waitIfPaused: () => Promise<void>;
  updateProgress?: (currentActionIndex: number, totalActions: number, progressPercent: number, statusText: string) => void;
  proxyString?: string;
  [key: string]: any;
}

export interface ActionMetadata {
  code: string;
  name: string;
  category: 'feed' | 'post' | 'friend' | 'group' | 'page' | 'seeding' | 'security' | string;
  description: string;
  defaultConfig: Record<string, any>;
}

export class ActionAbortedError extends Error {
  constructor(message = 'Action was aborted by user or task runner') {
    super(message);
    this.name = 'ActionAbortedError';
  }
}

/**
 * Abstract Base Action Class
 */
export abstract class BaseAction<TConfig extends Record<string, any> = Record<string, any>> {
  abstract readonly actionCode: string;
  abstract readonly name: string;
  abstract readonly category: string;
  abstract readonly description: string;
  abstract readonly defaultConfig: TConfig;

  /**
   * Phương thức thực thi hành động chính
   * @param page Instance trang web Playwright
   * @param context Ngữ cảnh thực thi (logger, abort/pause token, account data)
   * @param config Cấu hình cụ thể của hành động (đã merge với defaultConfig)
   */
  abstract execute(page: Page, context: ActionExecutionContext, config: TConfig): Promise<ActionResult>;

  /**
   * Trả về thông tin mô tả metadata của hành động
   */
  getMetadata(): ActionMetadata {
    return {
      code: this.actionCode,
      name: this.name,
      category: this.category,
      description: this.description,
      defaultConfig: this.defaultConfig,
    };
  }

  // ==========================================
  // HUMAN EMULATION & HELPER METHODS
  // ==========================================

  /**
   * Tạm dừng luồng ngẫu nhiên trong khoảng mili-giây
   */
  protected async randomDelay(minMs: number, maxMs: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxMs - minMs + 1) + minMs);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  /**
   * Tạm dừng luồng ngẫu nhiên trong khoảng giây
   */
  protected async randomSleep(minSec: number, maxSec: number): Promise<void> {
    await this.randomDelay(minSec * 1000, maxSec * 1000);
  }

  /**
   * Kiểm tra tín hiệu dừng hoặc tạm dừng trước khi tiếp tục thao tác
   */
  protected async checkInterruption(context: ActionExecutionContext): Promise<void> {
    if (context.isAborted()) {
      throw new ActionAbortedError();
    }
    if (context.isPaused()) {
      await context.waitIfPaused();
    }
  }

  /**
   * Mô phỏng thao tác gõ bàn phím người thật với độ trễ ngẫu nhiên 50-150ms mỗi phím
   */
  protected async humanType(
    page: Page,
    selector: string,
    text: string,
    options: { minDelayMs?: number; maxDelayMs?: number; clearFirst?: boolean } = {}
  ): Promise<void> {
    const minDelay = options.minDelayMs ?? 45;
    const maxDelay = options.maxDelayMs ?? 140;

    const element = await page.waitForSelector(selector, { state: 'visible', timeout: 10000 });
    if (!element) {
      throw new Error(`Element not found for typing: ${selector}`);
    }

    await element.click();
    await this.randomDelay(150, 350);

    if (options.clearFirst) {
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+A' : 'Control+A');
      await page.keyboard.press('Backspace');
      await this.randomDelay(100, 200);
    }

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      await page.keyboard.type(char);

      // Thỉnh thoảng mô phỏng người dùng dừng lại suy nghĩ một chút (hesitation)
      if (i > 0 && i % 12 === 0 && Math.random() < 0.25) {
        await this.randomDelay(250, 500);
      } else {
        await this.randomDelay(minDelay, maxDelay);
      }
    }
  }

  /**
   * Cuộn chuột mượt mà mô phỏng thao tác lướt trang của người dùng
   */
  protected async smoothScroll(page: Page, distancePx: number, steps = 12): Promise<void> {
    const stepDistance = distancePx / steps;
    for (let i = 0; i < steps; i++) {
      // Biến thiên nhẹ bước cuộn để không đều chằn chặn như bot
      const jitter = (Math.random() - 0.5) * (stepDistance * 0.3);
      await page.mouse.wheel(0, stepDistance + jitter);
      await this.randomDelay(30, 80);
    }
  }

  /**
   * Di chuyển chuột ngẫu nhiên trên màn hình mô phỏng chuyển động người thật
   */
  protected async randomMoveMouse(page: Page): Promise<void> {
    try {
      const viewport = page.viewportSize() || { width: 1280, height: 720 };
      const targetX = Math.floor(Math.random() * (viewport.width * 0.8) + viewport.width * 0.1);
      const targetY = Math.floor(Math.random() * (viewport.height * 0.8) + viewport.height * 0.1);
      await page.mouse.move(targetX, targetY, { steps: 15 });
    } catch {
      // Bỏ qua nếu trang đang chuyển hướng
    }
  }

  /**
   * Click an toàn với hỗ trợ mảng selector dự phòng (fallback selectors)
   */
  protected async safeClick(
    page: Page,
    selector: string | string[],
    options: { timeoutMs?: number; force?: boolean } = {}
  ): Promise<boolean> {
    const selectors = Array.isArray(selector) ? selector : [selector];
    const timeout = options.timeoutMs ?? 5000;

    for (const sel of selectors) {
      try {
        const el = await page.waitForSelector(sel, { state: 'visible', timeout });
        if (el) {
          // Di chuột tới phần tử trước khi click
          const box = await el.boundingBox();
          if (box) {
            await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 5 });
            await this.randomDelay(80, 200);
          }
          await el.click({ force: options.force });
          return true;
        }
      } catch {
        // Tiếp tục thử selector tiếp theo
      }
    }
    return false;
  }

  /**
   * Kiểm tra sự xuất hiện của selector
   */
  protected async isElementVisible(
    page: Page,
    selector: string | string[],
    timeoutMs = 3000
  ): Promise<boolean> {
    const selectors = Array.isArray(selector) ? selector : [selector];
    for (const sel of selectors) {
      try {
        const el = await page.waitForSelector(sel, { state: 'visible', timeout: timeoutMs });
        if (el) return true;
      } catch {
        // Thử selector kế
      }
    }
    return false;
  }

  /**
   * Phát hiện sớm các màn hình Checkpoint Facebook (282, 956, đổi mật khẩu)
   */
  protected async detectCheckpoint(page: Page): Promise<'282' | '956' | 'checkpoint' | null> {
    try {
      const currentUrl = page.url().toLowerCase();

      // Checkpoint 282 (Xác minh khuôn mặt / số điện thoại)
      if (
        currentUrl.includes('/checkpoint/1501') ||
        currentUrl.includes('checkpoint/82') ||
        currentUrl.includes('checkpoint_282')
      ) {
        return '282';
      }

      // Checkpoint 956 (Két sắt tím / Bị khóa)
      if (
        currentUrl.includes('/checkpoint/') &&
        (currentUrl.includes('intro') || currentUrl.includes('stepper'))
      ) {
        return '956';
      }

      if (currentUrl.includes('/checkpoint/')) {
        // Kiểm tra nội dung trong DOM để phân loại chi tiết
        const pageContent = await page.content().catch(() => '');
        if (
          pageContent.includes('Chúng tôi đã tạm ngừng tài khoản') ||
          pageContent.includes('Tải lên giấy tờ tùy thân') ||
          pageContent.includes('Chụp ảnh khuôn mặt')
        ) {
          return '282';
        }
        if (
          pageContent.includes('Tài khoản của bạn đã bị khóa') ||
          pageContent.includes('Bảo vệ tài khoản') ||
          pageContent.includes('Bắt đầu')
        ) {
          return '956';
        }
        return 'checkpoint';
      }

      return null;
    } catch {
      return null;
    }
  }
}
