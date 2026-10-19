/**
 * LushCare Electron - Watch Reels Action
 * Hành động: Xem Video Reels Facebook
 * Mô tả: Vào chuyên mục Facebook Reels, xem video ngắn, cuộn chuyển video kế tiếp,
 * dừng lại xem từ X đến Y giây, ngẫu nhiên thả tim và bình luận spin text.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface WatchReelsConfig {
  reelsCountMin?: number;
  reelsCountMax?: number;
  watchTimeMinSec?: number;
  watchTimeMaxSec?: number;
  likePercent?: number;       // Tỷ lệ % thả tim (0 - 100)
  commentPercent?: number;    // Tỷ lệ % bình luận (0 - 100)
  commentTexts?: string[];    // Mẫu bình luận spin text
}

export class WatchReelsAction extends BaseAction<WatchReelsConfig> {
  readonly actionCode = 'HDTuongTacReelNgauNhien';
  readonly name = 'Xem Video Reels Ngẫu Nhiên';
  readonly category = 'page';
  readonly description = 'Tự động xem video ngắn Facebook Reels, cuộn xem nhiều video liên tiếp, like và bình luận ngẫu nhiên';

  readonly defaultConfig: WatchReelsConfig = {
    reelsCountMin: 3,
    reelsCountMax: 6,
    watchTimeMinSec: 7,
    watchTimeMaxSec: 20,
    likePercent: 30,
    commentPercent: 10,
    commentTexts: [
      '{Video {hay|ý nghĩa|cuốn} quá|Thích video này quá|Đỉnh quá} {nha|ạ|bạn ơi}!',
      '{Haha {hài|buồn cười} quá|Cười đau cả ruột} {luôn|ạ|nè} 😂',
      '{10 điểm|Quá tuyệt vời|Xem cuốn thật sự} ❤️🔥'
    ],
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: WatchReelsConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Xem Video Reels Facebook', 'INFO');

    try {
      // 1. Điều hướng tới chuyên mục Reels
      const currentUrl = page.url();
      if (!currentUrl.includes('/reel')) {
        context.logger('Điều hướng đến trang Facebook Reels...', 'INFO');
        await page.goto('https://www.facebook.com/reel/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(3, 5);
      }

      // 2. Kiểm tra Checkpoint
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint} khi xem Reels!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // 3. Tính toán số lượng video Reels sẽ xem
      const minCount = config.reelsCountMin ?? 3;
      const maxCount = Math.max(minCount, config.reelsCountMax ?? 6);
      const totalReels = Math.floor(Math.random() * (maxCount - minCount + 1) + minCount);
      context.logger(`Dự kiến xem ${totalReels} video Reels liên tiếp...`, 'INFO');

      let likedCount = 0;
      let commentedCount = 0;

      for (let i = 1; i <= totalReels; i++) {
        await this.checkInterruption(context);

        // Chờ video xuất hiện và phát
        await this.isElementVisible(page, ['video', 'div[data-pagelet="Reels"]'], 5000);

        // Tính thời gian xem ngẫu nhiên cho video này
        const minWatch = config.watchTimeMinSec ?? 7;
        const maxWatch = Math.max(minWatch, config.watchTimeMaxSec ?? 20);
        const watchDurationSec = Math.floor(Math.random() * (maxWatch - minWatch + 1) + minWatch);

        context.logger(`[Reel ${i}/${totalReels}] Đang xem video trong ${watchDurationSec} giây...`, 'INFO');

        // Mô phỏng người dùng xem video: chia nhỏ thời gian và thỉnh thoảng di chuyển chuột nhẹ
        const segments = Math.ceil(watchDurationSec / 4);
        for (let s = 0; s < segments; s++) {
          await this.checkInterruption(context);
          await this.randomSleep(3, 4);
          if (Math.random() < 0.3) {
            await this.randomMoveMouse(page);
          }
        }

        // 4. Quyết định tương tác (Thả tim)
        const shouldLike = Math.random() * 100 < (config.likePercent ?? 30);
        if (shouldLike) {
          const liked = await this.tryLikeReel(page);
          if (liked) {
            likedCount++;
            context.logger(`Đã thả tim Reel ${i} thành công! (Tổng: ${likedCount})`, 'SUCCESS');
            await this.randomDelay(1000, 2000);
          }
        }

        // 5. Quyết định bình luận
        const shouldComment = Math.random() * 100 < (config.commentPercent ?? 10);
        if (shouldComment && config.commentTexts && config.commentTexts.length > 0) {
          const commented = await this.tryCommentReel(page, config.commentTexts, context);
          if (commented) {
            commentedCount++;
            context.logger(`Đã bình luận Reel ${i} thành công! (Tổng: ${commentedCount})`, 'SUCCESS');
            await this.randomDelay(1500, 3000);
          }
        }

        // 6. Cuộn hoặc bấm phím chuyển sang Reel kế tiếp nếu chưa phải video cuối
        if (i < totalReels) {
          context.logger(`Chuyển sang video Reel kế tiếp...`, 'INFO');
          // Ưu tiên dùng phím ArrowDown vì Facebook Reels hỗ trợ chuyển video tức thì bằng bàn phím
          await page.keyboard.press('ArrowDown');
          await this.randomDelay(800, 1500);

          // Dự phòng: nếu không cuộn được bằng phím thì cuộn bánh xe chuột
          await page.mouse.wheel(0, 600);
          await this.randomSleep(2, 3);
        }
      }

      context.logger(
        `Hoàn thành xem Reels: Đã xem ${totalReels} video, thả tim ${likedCount}, bình luận ${commentedCount}.`,
        'SUCCESS'
      );

      return {
        success: true,
        message: `Đã xem ${totalReels} video Reels thành công (${likedCount} tim, ${commentedCount} cmt)`,
        stats: {
          reelsWatched: totalReels,
          likes: likedCount,
          comments: commentedCount,
        },
      };
    } catch (error: any) {
      if (error?.name === 'ActionAbortedError') {
        context.logger('Hành động xem Reels đã bị dừng.', 'WARN');
        return { success: false, interrupted: true, message: 'Đã dừng xem Reels' };
      }
      context.logger(`Lỗi khi xem Reels: ${error?.message || error}`, 'ERROR');
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Thả tim Reel hiện tại
   */
  private async tryLikeReel(page: Page): Promise<boolean> {
    try {
      // Cột nút tương tác bên phải của Reel
      const likeSelectors = [
        'div[aria-label="Thích"][role="button"]',
        'div[aria-label="Like"][role="button"]',
        'div[data-pagelet="Reels"] div[role="button"][aria-label*="Thích"]',
        'div[data-pagelet="Reels"] div[role="button"][aria-label*="Like"]',
      ];

      for (const sel of likeSelectors) {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Bình luận vào Reel hiện tại
   */
  private async tryCommentReel(
    page: Page,
    templates: string[],
    context: ActionExecutionContext
  ): Promise<boolean> {
    try {
      const template = templates[Math.floor(Math.random() * templates.length)];
      const commentText = spinText(template);

      // Nút mở bình luận Reel
      const commentBtnSelectors = [
        'div[aria-label="Bình luận"][role="button"]',
        'div[aria-label="Comment"][role="button"]',
        'div[aria-label*="bình luận"][role="button"]',
      ];

      let opened = false;
      for (const sel of commentBtnSelectors) {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          opened = true;
          await this.randomSleep(1, 2);
          break;
        }
      }

      if (!opened) return false;

      // Tìm ô nhập comment trong drawer bên phải
      const inputSelectors = [
        'div[aria-label="Viết bình luận..."][role="textbox"]',
        'div[aria-label="Write a comment..."][role="textbox"]',
        'div[role="textbox"][contenteditable="true"]',
      ];

      for (const inputSel of inputSelectors) {
        const input = await page.$(inputSel);
        if (input && (await input.isVisible())) {
          context.logger(`Gõ bình luận Reel: "${commentText}"`, 'INFO');
          await input.click();
          await this.humanType(page, inputSel, commentText);
          await this.randomDelay(500, 1000);
          await page.keyboard.press('Enter');
          await this.randomSleep(2, 3);

          // Bấm phím Escape để đóng drawer bình luận lại giúp video hiển thị thoáng
          await page.keyboard.press('Escape').catch(() => {});
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
