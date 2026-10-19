/**
 * LushCare Electron - Interact Post Action
 * Hành động: Tương Tác Bài Viết Chỉ Định (Like, Thả Tim, Bình Luận)
 * Mô tả: Truy cập link bài viết bất kỳ (bạn bè, nhóm, page hoặc seeding),
 * thả cảm xúc mong muốn (Like, Love, Care, Haha, Wow) và để lại bình luận spin text.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface InteractPostConfig {
  targetUrl: string;                                                      // Link trực tiếp tới bài viết
  reaction?: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'random' | 'none'; // Loại cảm xúc
  enableComment?: boolean;                                                // Có bình luận hay không
  commentText?: string;                                                   // Mẫu bình luận spin text
  delaySec?: number;                                                      // Nghỉ sau khi tương tác
}

export class InteractPostAction extends BaseAction<InteractPostConfig> {
  readonly actionCode = 'HDBuffLikeComment';
  readonly name = 'Tương Tác Bài Viết Chỉ Định';
  readonly category = 'seeding';
  readonly description = 'Truy cập liên kết bài viết, thả cảm xúc tùy chọn và viết bình luận theo cú pháp spin text';

  readonly defaultConfig: InteractPostConfig = {
    targetUrl: '',
    reaction: 'like',
    enableComment: false,
    commentText: '{Bài viết rất {hay|ý nghĩa|bổ ích}|Cảm ơn bạn đã chia sẻ|Tuyệt vời quá} ạ! ❤️',
    delaySec: 5,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: InteractPostConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger(`Bắt đầu tương tác bài viết: ${config.targetUrl}`, 'INFO');

    if (!config.targetUrl || !config.targetUrl.trim()) {
      context.logger('Lỗi: URL bài viết mục tiêu trống!', 'ERROR');
      return { success: false, error: 'Target URL is required' };
    }

    try {
      // 1. Kiểm tra Checkpoint
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // 2. Điều hướng tới bài viết
      context.logger(`Đang tải bài viết...`, 'INFO');
      await page.goto(config.targetUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      // Kiểm tra xem bài viết có bị xóa hoặc không khả dụng không
      const isUnavailable = await page.$('span:has-text("Nội dung này hiện không khả dụng"), span:has-text("This content isn\'t available right now")');
      if (isUnavailable) {
        context.logger('Bài viết không tồn tại, đã bị xóa hoặc nhóm kín không có quyền xem!', 'ERROR');
        return { success: false, error: 'Content unavailable' };
      }

      await this.checkInterruption(context);

      // Cuộn nhẹ xem nội dung bài viết
      await this.smoothScroll(page, 350, 10);
      await this.randomSleep(2, 4);

      let reactionDone = false;
      let commentDone = false;

      // 3. Thực hiện thả cảm xúc (Reaction)
      const reactionType = config.reaction || 'like';
      if (reactionType !== 'none') {
        context.logger(`Thực hiện thả cảm xúc: ${reactionType.toUpperCase()}...`, 'INFO');
        reactionDone = await this.performReaction(page, reactionType, context);
        if (reactionDone) {
          context.logger(`Đã thả cảm xúc thành công!`, 'SUCCESS');
        } else {
          context.logger(`Không bấm được nút cảm xúc.`, 'WARN');
        }
        await this.randomSleep(2, 3);
      }

      await this.checkInterruption(context);

      // 4. Thực hiện bình luận nếu bật
      if (config.enableComment && config.commentText) {
        const resolvedComment = spinText(config.commentText);
        context.logger(`Thực hiện bình luận: "${resolvedComment}"`, 'INFO');

        commentDone = await this.performComment(page, resolvedComment, context);
        if (commentDone) {
          context.logger(`Đã gửi bình luận thành công!`, 'SUCCESS');
        } else {
          context.logger(`Không tìm thấy ô bình luận hoặc gửi không thành công.`, 'WARN');
        }
        await this.randomSleep(2, 4);
      }

      // 5. Nghỉ sau khi hoàn thành
      const delay = config.delaySec ?? 5;
      context.logger(`Hoàn tất tương tác. Nghỉ ${delay}s...`, 'INFO');
      await this.randomSleep(delay, delay + 1);

      return {
        success: reactionDone || commentDone,
        message: 'Tương tác bài viết hoàn tất',
        data: {
          reactionDone,
          commentDone,
          url: config.targetUrl,
        },
      };
    } catch (error: any) {
      if (error?.name === 'ActionAbortedError') {
        context.logger('Hành động tương tác bài viết đã bị hủy.', 'WARN');
        return { success: false, interrupted: true, message: 'Đã hủy tác vụ' };
      }
      context.logger(`Lỗi tương tác bài viết: ${error?.message || error}`, 'ERROR');
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Thả cảm xúc chỉ định vào bài viết
   */
  private async performReaction(
    page: Page,
    reaction: 'like' | 'love' | 'care' | 'haha' | 'wow' | 'random',
    _context: ActionExecutionContext
  ): Promise<boolean> {
    try {
      const likeButtonSelectors = [
        'div[aria-label="Thích"][role="button"]',
        'div[aria-label="Like"][role="button"]',
        'div[role="article"] div[role="button"]:has-text("Thích")',
        'div[role="article"] div[role="button"]:has-text("Like")',
        'div[data-ad-preview="message"] ~ div [role="button"]:has-text("Thích")',
      ];

      let likeBtn = null;
      for (const sel of likeButtonSelectors) {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          likeBtn = btn;
          break;
        }
      }

      if (!likeBtn) return false;

      // Nếu chỉ là 'like', click trực tiếp
      if (reaction === 'like') {
        await likeBtn.click();
        return true;
      }

      // Nếu muốn cảm xúc khác (Love, Care, Haha, Wow), di chuột lên nút Like để hiện thanh cảm xúc
      await likeBtn.hover();
      await this.randomDelay(800, 1500);

      // Bản đồ tên cảm xúc sang nhãn nút
      const reactionMap: Record<string, string[]> = {
        love: ['Yêu thích', 'Love'],
        care: ['Thương thương', 'Care'],
        haha: ['Haha', 'Ha ha'],
        wow: ['Wow'],
        random: ['Thích', 'Yêu thích', 'Thương thương', 'Haha', 'Wow'],
      };

      let targetLabels = reactionMap[reaction] || ['Yêu thích', 'Love'];
      if (reaction === 'random') {
        const choices = ['Yêu thích', 'Thương thương', 'Haha', 'Thích'];
        const chosen = choices[Math.floor(Math.random() * choices.length)];
        targetLabels = [chosen];
      }

      for (const label of targetLabels) {
        const reactionSelector = `div[role="toolbar"] div[aria-label="${label}"][role="button"]`;
        const rBtn = await page.$(reactionSelector);
        if (rBtn && (await rBtn.isVisible())) {
          await rBtn.click();
          return true;
        }
      }

      // Dự phòng nếu không hover ra được thanh reaction: click nút Thích thường
      await likeBtn.click();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Viết bình luận vào bài viết
   */
  private async performComment(
    page: Page,
    commentText: string,
    _context: ActionExecutionContext
  ): Promise<boolean> {
    try {
      const commentInputs = [
        'div[aria-label="Viết bình luận..."][role="textbox"]',
        'div[aria-label="Write a comment..."][role="textbox"]',
        'div[role="textbox"][contenteditable="true"]',
      ];

      for (const sel of commentInputs) {
        const input = await page.$(sel);
        if (input && (await input.isVisible())) {
          await input.click();
          await this.randomDelay(300, 600);
          await this.humanType(page, sel, commentText);
          await this.randomDelay(500, 1000);
          await page.keyboard.press('Enter');
          await this.randomSleep(2, 3);
          return true;
        }
      }

      // Nếu ô nhập chưa mở, tìm nút "Bình luận" để bấm mở
      const commentBtn = await page.$('div[role="button"]:has-text("Bình luận"), div[role="button"]:has-text("Comment")');
      if (commentBtn && (await commentBtn.isVisible())) {
        await commentBtn.click();
        await this.randomSleep(1, 2);

        for (const sel of commentInputs) {
          const input = await page.$(sel);
          if (input && (await input.isVisible())) {
            await input.click();
            await this.humanType(page, sel, commentText);
            await this.randomDelay(500, 800);
            await page.keyboard.press('Enter');
            await this.randomSleep(2, 3);
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }
}
