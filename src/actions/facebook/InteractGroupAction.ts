/**
 * VMAX Tech - Interact Group Action
 * Hành động: Tương Tác Bài Viết Trong Nhóm
 * Mô tả: Truy cập các nhóm đã tham gia, lướt đọc bài thảo luận trong group,
 * ngẫu nhiên thả Like/Love và bình luận Spin Text.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface InteractGroupConfig {
  groupCount?: number;
  timePerGroupSec?: number;
  likePercent?: number;
  commentPercent?: number;
  commentTexts?: string[];
  groupIds?: string[];
}

export class InteractGroupAction extends BaseAction<InteractGroupConfig> {
  readonly actionCode = 'fHDTuongTacNhom';
  readonly name = 'Tương Tác Bài Viết Trong Nhóm';
  readonly category = 'groups';
  readonly description = 'Lướt bảng tin các hội nhóm Facebook, like bài viết và bình luận theo tỷ lệ cấu hình';

  readonly defaultConfig: InteractGroupConfig = {
    groupCount: 2,
    timePerGroupSec: 60,
    likePercent: 50,
    commentPercent: 20,
    commentTexts: [
      '{Bài viết hay quá|Cảm ơn ad đã chia sẻ|Thông tin rất hữu ích} ạ!',
      '{Chấm hóng|Quan tâm ạ|Follow bài viết}!',
      '{Chúc {cả nhà|mọi người} ngày mới nhiều may mắn|Tương tác cùng anh em trong group} nha!'
    ],
    groupIds: [],
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: InteractGroupConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Tương tác nhóm', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // Điều hướng tới trang Group Feed
      context.logger('Truy cập bảng tin hội nhóm tổng hợp (facebook.com/groups/feed)...', 'INFO');
      await page.goto('https://www.facebook.com/groups/feed', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      const targetDurationSec = config.timePerGroupSec || 60;
      const startTime = Date.now();
      let likesDone = 0;
      let commentsDone = 0;

      while ((Date.now() - startTime) < targetDurationSec * 1000) {
        await this.checkInterruption(context);

        // Cuộn bài
        await this.smoothScroll(page, 450, 12);
        await this.randomSleep(3, 6);

        // Thả like ngẫu nhiên theo tỷ lệ
        if (Math.random() * 100 < (config.likePercent || 50)) {
          const likeButtons = await page.$$('div[aria-label="Thích"][role="button"], div[aria-label="Like"][role="button"]');
          if (likeButtons.length > 0) {
            const randomBtn = likeButtons[Math.floor(Math.random() * Math.min(likeButtons.length, 3))];
            try {
              await randomBtn.click();
              likesDone++;
              context.logger(`Đã thích bài viết trong nhóm (Lượt like thứ ${likesDone})`, 'SUCCESS');
              await this.randomSleep(2, 4);
            } catch {}
          }
        }

        // Bình luận ngẫu nhiên
        if (Math.random() * 100 < (config.commentPercent || 20) && config.commentTexts && config.commentTexts.length > 0) {
          const commentButtons = await page.$$('div[aria-label="Viết bình luận"][role="textbox"], div[aria-label="Write a comment"][role="textbox"]');
          if (commentButtons.length > 0) {
            try {
              const input = commentButtons[0];
              const template = config.commentTexts[Math.floor(Math.random() * config.commentTexts.length)];
              const text = spinText(template);
              await input.click();
              await input.fill(text);
              await page.keyboard.press('Enter');
              commentsDone++;
              context.logger(`Đã bình luận bài viết trong nhóm: "${text.substring(0, 40)}..."`, 'SUCCESS');
              await this.randomSleep(3, 5);
            } catch {}
          }
        }
      }

      context.logger(`Hoàn tất tương tác nhóm: ${likesDone} like, ${commentsDone} bình luận.`, 'SUCCESS');
      return {
        success: true,
        message: `Tương tác nhóm xong (${likesDone} likes, ${commentsDone} comments)`,
        stats: { likes: likesDone, comments: commentsDone },
      };
    } catch (err: any) {
      context.logger(`Lỗi tương tác nhóm: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
