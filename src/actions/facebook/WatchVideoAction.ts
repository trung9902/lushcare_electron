/**
 * VMAX Tech - Watch Video Action
 * Hành động: Xem Video Facebook Watch
 * Mô tả: Truy cập facebook.com/watch, xem video theo thời lượng ngẫu nhiên,
 * tăng độ tin cậy (trust score) cho tài khoản và tương tác like video.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface WatchVideoConfig {
  videoCount?: number;
  timePerVideoSec?: number;
  likePercent?: number;
}

export class WatchVideoAction extends BaseAction<WatchVideoConfig> {
  readonly actionCode = 'fHDXemWatch';
  readonly name = 'Xem Video Facebook Watch';
  readonly category = 'feed';
  readonly description = 'Tự động truy cập Facebook Watch, xem video theo thời lượng ngẫu nhiên để nuôi trust tài khoản';

  readonly defaultConfig: WatchVideoConfig = {
    videoCount: 2,
    timePerVideoSec: 60,
    likePercent: 30,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: WatchVideoConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Xem video Facebook Watch', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      context.logger('Điều hướng tới Facebook Watch...', 'INFO');
      await page.goto('https://www.facebook.com/watch', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      const videoCount = config.videoCount || 2;
      let watched = 0;
      let liked = 0;

      for (let i = 0; i < videoCount; i++) {
        await this.checkInterruption(context);
        watched++;
        const watchSec = config.timePerVideoSec || 60;
        context.logger(`Đang xem video ${watched}/${videoCount} trong ${watchSec}s...`, 'INFO');

        // Xem video
        const interval = 10;
        let elapsed = 0;
        while (elapsed < watchSec) {
          await this.checkInterruption(context);
          await this.randomSleep(interval, interval);
          elapsed += interval;
          // Thỉnh thoảng rê chuột hoặc cuộn nhẹ
          await this.randomMoveMouse(page);
        }

        // Like ngẫu nhiên
        if (Math.random() * 100 < (config.likePercent || 30)) {
          const likeBtn = await page.$('div[aria-label="Thích"][role="button"], div[aria-label="Like"][role="button"]');
          if (likeBtn) {
            try {
              await likeBtn.click();
              liked++;
              context.logger('Đã thích video đang xem!', 'INFO');
              await this.randomSleep(2, 3);
            } catch {}
          }
        }

        // Cuộn xuống video tiếp theo
        await this.smoothScroll(page, 700, 15);
        await this.randomSleep(3, 5);
      }

      context.logger(`Hoàn tất xem video Watch: Đã xem ${watched} video, thích ${liked} video.`, 'SUCCESS');
      return {
        success: true,
        message: `Đã xem ${watched} video Watch`,
        stats: { watched, liked },
      };
    } catch (err: any) {
      context.logger(`Lỗi xem video Watch: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
