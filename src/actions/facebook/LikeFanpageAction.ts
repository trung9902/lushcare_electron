/**
 * VMAX Tech - Like Fanpage Action
 * Hành động: Thích & Theo Dõi Fanpage
 * Mô tả: Truy cập Fanpage Facebook theo đường link hoặc tìm kiếm từ khóa,
 * bấm Thích/Theo dõi và lướt xem bài viết mới nhất.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface LikeFanpageConfig {
  pageUrls?: string[] | string;
  likePostOnPage?: boolean;
  delayMinSec?: number;
  delayMaxSec?: number;
}

export class LikeFanpageAction extends BaseAction<LikeFanpageConfig> {
  readonly actionCode = 'fHDLikeFanpage';
  readonly name = 'Thích & Theo Dõi Fanpage';
  readonly category = 'fanpage';
  readonly description = 'Tự động truy cập danh sách Fanpage Facebook, bấm Thích/Theo dõi trang và like bài viết ghim';

  readonly defaultConfig: LikeFanpageConfig = {
    pageUrls: ['https://www.facebook.com/vmaxtech.vn'],
    likePostOnPage: true,
    delayMinSec: 5,
    delayMaxSec: 15,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: LikeFanpageConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Thích Fanpage', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      let urls: string[] = [];
      if (typeof config.pageUrls === 'string') {
        urls = config.pageUrls.split(/[\n,;|]+/).map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(config.pageUrls)) {
        urls = config.pageUrls.map(s => String(s).trim()).filter(Boolean);
      }

      if (urls.length === 0) {
        context.logger('Danh sách URL Fanpage trống!', 'WARN');
        return { success: false, error: 'No page URLs provided' };
      }

      let likedCount = 0;

      for (let i = 0; i < urls.length; i++) {
        await this.checkInterruption(context);
        const url = urls[i].startsWith('http') ? urls[i] : `https://www.facebook.com/${urls[i]}`;
        context.logger(`Truy cập Fanpage: ${url}...`, 'INFO');

        try {
          await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
          await this.randomSleep(3, 5);

          // Tìm nút Thích / Theo dõi
          const likePageSelectors = [
            'div[aria-label="Thích"][role="button"]',
            'div[aria-label="Like"][role="button"]',
            'div[aria-label="Theo dõi"][role="button"]',
            'div[aria-label="Follow"][role="button"]',
            'div[role="button"]:has-text("Thích")',
            'div[role="button"]:has-text("Theo dõi")',
            'div[role="button"]:has-text("Follow")',
          ];

          const liked = await this.safeClick(page, likePageSelectors, { timeoutMs: 6000 });
          if (liked) {
            likedCount++;
            context.logger(`Đã bấm Thích/Theo dõi Fanpage: ${url}`, 'SUCCESS');
          } else {
            context.logger(`Trang ${url} có thể đã được thích từ trước.`, 'INFO');
          }

          // Cuộn nhẹ xem bài viết
          await this.smoothScroll(page, 500, 12);
          await this.randomSleep(2, 4);

          // Like bài viết đầu tiên trên page nếu bật
          if (config.likePostOnPage) {
            const likePostBtn = await page.$('div[aria-label="Thích"][role="button"], div[aria-label="Like"][role="button"]');
            if (likePostBtn) {
              await likePostBtn.click();
              context.logger('Đã thích bài viết mới nhất trên Fanpage!', 'INFO');
            }
          }

          if (i < urls.length - 1) {
            const delay = Math.floor(Math.random() * ((config.delayMaxSec || 15) - (config.delayMinSec || 5) + 1) + (config.delayMinSec || 5));
            await this.randomSleep(delay, delay);
          }
        } catch (pageErr: any) {
          context.logger(`Lỗi truy cập page ${url}: ${pageErr?.message || pageErr}`, 'WARN');
        }
      }

      return {
        success: likedCount > 0,
        message: `Đã thích thành công ${likedCount} Fanpage`,
        stats: { likedPages: likedCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi hành động thích Fanpage: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
