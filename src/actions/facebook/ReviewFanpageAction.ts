/**
 * VMAX Tech - Review Fanpage Action
 * Hành động: Đánh Giá 5 Sao & Nhận Xét Fanpage
 * Mô tả: Truy cập tab Đánh giá (Reviews) của Fanpage, chọn "Có đề xuất",
 * viết nhận xét spin text và gửi đánh giá.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface ReviewFanpageConfig {
  pageUrl?: string;
  rating?: number;
  reviewText?: string;
  delayAfterSec?: number;
}

export class ReviewFanpageAction extends BaseAction<ReviewFanpageConfig> {
  readonly actionCode = 'fHDDanhGiaFanpage';
  readonly name = 'Đánh Giá & Nhận Xét Fanpage';
  readonly category = 'fanpage';
  readonly description = 'Tự động gửi đánh giá 5 sao kèm bình luận khen ngợi uy tín cho Fanpage';

  readonly defaultConfig: ReviewFanpageConfig = {
    pageUrl: '',
    rating: 5,
    reviewText: '{Dịch vụ rất tốt và chuyên nghiệp|Sản phẩm chất lượng cao|Đội ngũ hỗ trợ nhiệt tình, 5 sao chất lượng}! {Rất đáng trải nghiệm|Sẽ tiếp tục ủng hộ shop} ạ!',
    delayAfterSec: 5,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: ReviewFanpageConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger(`Bắt đầu hành động: Đánh giá Fanpage`, 'INFO');

    if (!config.pageUrl || !config.pageUrl.trim()) {
      context.logger('Lỗi: URL Fanpage trống!', 'ERROR');
      return { success: false, error: 'Page URL is required' };
    }

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // Điều hướng tới tab reviews
      const reviewsUrl = config.pageUrl.includes('/reviews') ? config.pageUrl : `${config.pageUrl.replace(/\/+$/, '')}/reviews`;
      context.logger(`Mở trang đánh giá: ${reviewsUrl}...`, 'INFO');
      await page.goto(reviewsUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      // Tìm câu hỏi "Bạn có muốn đề xuất ... không?" -> Chọn "Có"
      const yesButtons = [
        'div[role="button"]:has-text("Có")',
        'div[role="button"]:has-text("Yes")',
        'span:has-text("Có")',
      ];

      const clickedYes = await this.safeClick(page, yesButtons, { timeoutMs: 8000 });
      if (!clickedYes) {
        context.logger('Không tìm thấy nút Có đề xuất Fanpage (có thể đã đánh giá hoặc page tắt tính năng đánh giá)', 'WARN');
        return { success: false, error: 'Review button not found' };
      }

      await this.randomSleep(2, 3);

      // Nhập nội dung nhận xét
      const textBoxSelector = 'div[role="textbox"][contenteditable="true"]';
      if (await this.isElementVisible(page, textBoxSelector, 6000)) {
        const text = spinText(config.reviewText || this.defaultConfig.reviewText!);
        context.logger(`Nhập nhận xét đánh giá: "${text.substring(0, 50)}..."`, 'INFO');
        await this.humanType(page, textBoxSelector, text);
        await this.randomSleep(2, 3);

        // Bấm nút Đăng
        const submitSelectors = [
          'div[aria-label="Đăng"][role="button"]',
          'div[aria-label="Post"][role="button"]',
          'div[role="button"]:has-text("Đăng")',
        ];
        await this.safeClick(page, submitSelectors, { timeoutMs: 6000 });
        context.logger('Đã gửi đánh giá Fanpage thành công!', 'SUCCESS');
        await this.randomSleep(config.delayAfterSec || 5, (config.delayAfterSec || 5) + 3);
        return { success: true, message: 'Đã gửi đánh giá Fanpage thành công' };
      }

      return { success: false, error: 'Review text box not found' };
    } catch (err: any) {
      context.logger(`Lỗi đánh giá Fanpage: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
