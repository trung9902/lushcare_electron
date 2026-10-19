/**
 * VMAX Tech - Watch Story Action
 * Hành động: Xem Tin Story Bạn Bè
 * Mô tả: Lướt xem Story của bạn bè trên thanh Story Facebook,
 * xem từ 3-8 giây mỗi Story, ngẫu nhiên bấm tim / like và chuyển Story tiếp theo.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface WatchStoryConfig {
  storyCount?: number;
  timePerStorySec?: number;
  likePercent?: number;
}

export class WatchStoryAction extends BaseAction<WatchStoryConfig> {
  readonly actionCode = 'fHDXemStory';
  readonly name = 'Xem Tin Story Bạn Bè';
  readonly category = 'feed';
  readonly description = 'Tự động mở và lướt xem Story bạn bè trên Facebook, thả cảm xúc ngẫu nhiên';

  readonly defaultConfig: WatchStoryConfig = {
    storyCount: 4,
    timePerStorySec: 5,
    likePercent: 40,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: WatchStoryConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Xem Story bạn bè', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // Điều hướng về trang chủ
      if (!page.url().includes('facebook.com')) {
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(2, 4);
      }

      // Tìm thanh story
      context.logger('Tìm thanh Story trên trang chủ...', 'INFO');
      const storyCards = await page.$$('div[aria-label*="tin của"], div[aria-label*="story of"], a[href*="/stories/"]');

      if (storyCards.length === 0) {
        context.logger('Không tìm thấy Story nào của bạn bè. Thử vào trực tiếp facebook.com/stories', 'WARN');
        await page.goto('https://www.facebook.com/stories', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(3, 4);
      } else {
        // Bấm vào story đầu tiên
        await storyCards[0].click();
        await this.randomSleep(2, 4);
      }

      const totalStories = config.storyCount || 4;
      let watched = 0;
      let reacted = 0;

      for (let i = 0; i < totalStories; i++) {
        await this.checkInterruption(context);
        watched++;
        context.logger(`Đang xem Story ${watched}/${totalStories}...`, 'INFO');

        // Thời gian xem story
        const watchSec = config.timePerStorySec || 5;
        await this.randomSleep(watchSec, watchSec + 2);

        // Thả tim ngẫu nhiên
        if (Math.random() * 100 < (config.likePercent || 40)) {
          const reactBtn = await page.$('div[aria-label="Thả tim"][role="button"], div[aria-label="Thích"][role="button"], div[aria-label="Like"][role="button"], div[aria-label="Love"][role="button"]');
          if (reactBtn) {
            try {
              await reactBtn.click();
              reacted++;
              context.logger('Đã thả cảm xúc vào Story!', 'INFO');
              await this.randomSleep(1, 2);
            } catch {}
          }
        }

        // Bấm nút Next Story
        const nextBtn = await page.$('div[aria-label="Thẻ tiếp theo"][role="button"], div[aria-label="Tiếp"][role="button"], div[aria-label="Next"][role="button"], div[aria-label="Tin tiếp theo"][role="button"]');
        if (nextBtn) {
          try {
            await nextBtn.click();
            await this.randomSleep(1, 2);
          } catch {
            await page.keyboard.press('ArrowRight');
          }
        } else {
          await page.keyboard.press('ArrowRight');
        }
      }

      context.logger(`Hoàn tất xem Story: Đã xem ${watched} story, thả tim ${reacted} lần.`, 'SUCCESS');
      return {
        success: true,
        message: `Đã xem ${watched} story, thả tim ${reacted}`,
        stats: { watched, reacted },
      };
    } catch (err: any) {
      context.logger(`Lỗi khi xem story: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
