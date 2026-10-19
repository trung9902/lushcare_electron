/**
 * LushCare Electron - Surfing Newsfeed Action
 * Hành động: Lướt Bảng Tin (Newsfeed)
 * Mô tả: Lướt bảng tin Facebook, mô phỏng thao tác đọc bài, dừng lại xem,
 * ngẫu nhiên thả tim/like và để lại bình luận có spin text.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface SurfingNewsfeedConfig {
  minScrollTimes?: number;
  maxScrollTimes?: number;
  scrollDelayMinSec?: number;
  scrollDelayMaxSec?: number;
  likePercent?: number;       // Tỷ lệ % thả reaction (0 - 100)
  commentPercent?: number;    // Tỷ lệ % để lại bình luận (0 - 100)
  commentTexts?: string[];    // Danh sách mẫu bình luận (hỗ trợ spin text)
  reactionTypes?: Array<'like' | 'love' | 'care' | 'haha' | 'wow'>;
  filterKeywords?: string[];  // Lọc chỉ tương tác bài có từ khóa (nếu có)
}

export class SurfingNewsfeedAction extends BaseAction<SurfingNewsfeedConfig> {
  readonly actionCode = 'HDBaiVietNewsfeed';
  readonly name = 'Lướt Bảng Tin (Newsfeed)';
  readonly category = 'feed';
  readonly description = 'Cuộn bảng tin Facebook, đọc bài tự nhiên, thả cảm xúc ngẫu nhiên và bình luận spin text';

  readonly defaultConfig: SurfingNewsfeedConfig = {
    minScrollTimes: 3,
    maxScrollTimes: 7,
    scrollDelayMinSec: 3,
    scrollDelayMaxSec: 8,
    likePercent: 40,
    commentPercent: 15,
    commentTexts: [
      '{Tuyệt vời|Quá đẹp|Hay quá|Ý nghĩa quá} {bạn ơi|ạ|quá trời|luôn}!',
      '{Chúc {bạn|anh|chị}|Chúc cả nhà} một ngày {tuyệt vời|nhiều may mắn|vui vẻ} {nha|nhé|ạ}!',
      '{Thả tim|Ủng hộ|Tương tác|Like} nhiệt tình luôn nha {bạn hiền|ạ} ❤️'
    ],
    reactionTypes: ['like', 'love', 'care'],
    filterKeywords: [],
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: SurfingNewsfeedConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Lướt bảng tin Newsfeed', 'INFO');

    try {
      // 1. Kiểm tra URL và điều hướng đến Facebook Feed
      const currentUrl = page.url();
      if (!currentUrl.includes('facebook.com')) {
        context.logger('Điều hướng đến trang chủ Facebook...', 'INFO');
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(2, 4);
      }

      // 2. Kiểm tra Checkpoint sớm
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện tài khoản bị Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // 3. Tính toán số lần cuộn ngẫu nhiên
      const minScroll = config.minScrollTimes ?? 3;
      const maxScroll = Math.max(minScroll, config.maxScrollTimes ?? 7);
      const totalScrolls = Math.floor(Math.random() * (maxScroll - minScroll + 1) + minScroll);
      context.logger(`Dự kiến lướt ${totalScrolls} lượt trên bảng tin...`, 'INFO');

      let likedCount = 0;
      let commentedCount = 0;

      for (let scrollIndex = 1; scrollIndex <= totalScrolls; scrollIndex++) {
        await this.checkInterruption(context);

        context.logger(`[Lướt Feed ${scrollIndex}/${totalScrolls}] Đang cuộn bài viết...`, 'INFO');

        // Cuộn trang mô phỏng người thật (khoảng cách 450 - 850px)
        const scrollDistance = Math.floor(Math.random() * 400 + 450);
        await this.smoothScroll(page, scrollDistance, 14);

        // Mô phỏng người dùng dừng lại đọc bài viết (dwell time)
        const dwellTime = Math.floor(
          Math.random() * ((config.scrollDelayMaxSec ?? 8) - (config.scrollDelayMinSec ?? 3) + 1) +
            (config.scrollDelayMinSec ?? 3)
        );
        context.logger(`Dừng đọc bài viết trong ${dwellTime}s...`, 'INFO');
        await this.randomMoveMouse(page);
        await this.randomSleep(dwellTime, dwellTime + 1);

        // 4. Tìm các nút tương tác trên bài viết trong khung nhìn (Viewport)
        const shouldLike = Math.random() * 100 < (config.likePercent ?? 40);
        const shouldComment = Math.random() * 100 < (config.commentPercent ?? 15);

        if (shouldLike) {
          const liked = await this.tryLikeVisiblePost(page, config.reactionTypes);
          if (liked) {
            likedCount++;
            context.logger(`Đã thả cảm xúc bài viết thành công (Tổng: ${likedCount})`, 'SUCCESS');
            await this.randomDelay(1500, 3000);
          }
        }

        if (shouldComment && config.commentTexts && config.commentTexts.length > 0) {
          const commented = await this.tryCommentVisiblePost(page, config.commentTexts, context);
          if (commented) {
            commentedCount++;
            context.logger(`Đã bình luận bài viết thành công (Tổng: ${commentedCount})`, 'SUCCESS');
            await this.randomDelay(2000, 4000);
          }
        }
      }

      context.logger(
        `Hoàn thành lướt feed: ${totalScrolls} lượt cuộn, ${likedCount} lượt thả tim, ${commentedCount} bình luận.`,
        'SUCCESS'
      );

      return {
        success: true,
        message: `Lướt bảng tin thành công (${totalScrolls} lượt cuộn, ${likedCount} tim, ${commentedCount} cmt)`,
        stats: {
          scrolls: totalScrolls,
          likes: likedCount,
          comments: commentedCount,
        },
      };
    } catch (error: any) {
      if (error?.name === 'ActionAbortedError') {
        context.logger('Hành động lướt feed đã bị dừng theo lệnh người dùng.', 'WARN');
        return { success: false, interrupted: true, message: 'Đã hủy tác vụ' };
      }
      context.logger(`Lỗi khi lướt feed: ${error?.message || error}`, 'ERROR');
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Cố gắng like bài viết đang hiển thị trong viewport
   */
  private async tryLikeVisiblePost(
    page: Page,
    _preferredReactions: Array<'like' | 'love' | 'care' | 'haha' | 'wow'> = ['like', 'love']
  ): Promise<boolean> {
    try {
      // Các selector nút Thích của Facebook web desktop & mobile
      const likeButtonSelectors = [
        'div[aria-label="Thích"][role="button"]',
        'div[aria-label="Like"][role="button"]',
        'span:has-text("Thích"):visible',
        'span:has-text("Like"):visible',
        'div[role="feed"] div[role="button"][aria-label*="Thích"]',
        'div[data-ad-preview="message"] ~ div [role="button"]:has-text("Thích")',
      ];

      for (const selector of likeButtonSelectors) {
        const buttons = await page.$$(selector);
        for (const button of buttons) {
          const isVisible = await button.isVisible();
          if (isVisible) {
            const box = await button.boundingBox();
            // Chỉ tương tác nếu phần tử nằm trong khoảng hiển thị của màn hình
            if (box && box.y > 100 && box.y < 800) {
              await button.scrollIntoViewIfNeeded().catch(() => {});
              await this.randomDelay(200, 400);
              await button.click();
              return true;
            }
          }
        }
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Cố gắng bình luận vào bài viết đang hiển thị
   */
  private async tryCommentVisiblePost(
    page: Page,
    commentTemplates: string[],
    context: ActionExecutionContext
  ): Promise<boolean> {
    try {
      // Chọn ngẫu nhiên mẫu bình luận và giải mã Spin Text
      const rawTemplate = commentTemplates[Math.floor(Math.random() * commentTemplates.length)];
      const resolvedComment = spinText(rawTemplate);

      // Tìm ô nhập bình luận
      const commentInputs = [
        'div[aria-label="Viết bình luận..."][role="textbox"]',
        'div[aria-label="Viết câu trả lời..."][role="textbox"]',
        'div[aria-label="Write a comment..."][role="textbox"]',
        'form div[contenteditable="true"][role="textbox"]',
        'div[role="textbox"][data-lexical-editor="true"]',
      ];

      for (const selector of commentInputs) {
        const input = await page.$(selector);
        if (input && (await input.isVisible())) {
          const box = await input.boundingBox();
          if (box && box.y > 100 && box.y < 850) {
            context.logger(`Gõ bình luận: "${resolvedComment}"`, 'INFO');
            await input.click();
            await this.randomDelay(300, 600);
            await this.humanType(page, selector, resolvedComment, { minDelayMs: 40, maxDelayMs: 120 });
            await this.randomDelay(500, 1000);
            await page.keyboard.press('Enter');
            await this.randomSleep(2, 3);
            return true;
          }
        }
      }

      // Nếu ô bình luận chưa mở, tìm nút "Bình luận" để mở ô nhập
      const commentButtons = [
        'div[aria-label="Để lại bình luận"][role="button"]',
        'div[aria-label="Leave a comment"][role="button"]',
        'div[role="button"]:has-text("Bình luận")',
        'div[role="button"]:has-text("Comment")',
      ];

      for (const btnSelector of commentButtons) {
        const button = await page.$(btnSelector);
        if (button && (await button.isVisible())) {
          const box = await button.boundingBox();
          if (box && box.y > 100 && box.y < 800) {
            await button.click();
            await this.randomSleep(1, 2);
            // Thử gõ vào ô nhập mới xuất hiện
            for (const inputSel of commentInputs) {
              const activeInput = await page.$(inputSel);
              if (activeInput && (await activeInput.isVisible())) {
                context.logger(`Gõ bình luận sau khi mở ô nhập: "${resolvedComment}"`, 'INFO');
                await activeInput.click();
                await this.humanType(page, inputSel, resolvedComment);
                await this.randomDelay(500, 800);
                await page.keyboard.press('Enter');
                await this.randomSleep(2, 3);
                return true;
              }
            }
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
