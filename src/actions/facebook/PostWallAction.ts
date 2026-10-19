/**
 * LushCare Electron - Post Wall Action
 * Hành động: Đăng Bài Lên Tường Cá Nhân
 * Mô tả: Mở khung tạo bài viết, bóc tách spin text đa tầng, gõ nội dung mô phỏng người thật,
 * hỗ trợ tải kèm danh sách hình ảnh từ ổ đĩa và bấm đăng bài.
 */

import type { Page } from 'playwright-core';
import * as fs from 'fs';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface PostWallConfig {
  content?: string;             // Nội dung bài đăng (hỗ trợ spin text đa tầng {A|{B|C}})
  imagePaths?: string[];        // Danh sách đường dẫn file ảnh đính kèm trên máy
  privacy?: 'public' | 'friends' | 'only_me';
  delayBeforePostSec?: number;
}

export class PostWallAction extends BaseAction<PostWallConfig> {
  readonly actionCode = 'HDDangBai';
  readonly name = 'Đăng Bài Lên Tường Cá Nhân';
  readonly category = 'post';
  readonly description = 'Tự động đăng bài viết lên trang cá nhân kèm spin text và đính kèm nhiều ảnh';

  readonly defaultConfig: PostWallConfig = {
    content: '{Chào buổi sáng|Xin chào|Hello} cả nhà! {Chúc mọi người một ngày mới tràn đầy năng lượng|Chúc ngày mới nhiều may mắn và thành công} {nhé|nha|ạ}! ❤️✨',
    imagePaths: [],
    privacy: 'public',
    delayBeforePostSec: 3,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: PostWallConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Đăng bài viết lên tường cá nhân', 'INFO');

    try {
      // 1. Kiểm tra Checkpoint sớm
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // 2. Điều hướng về trang chủ hoặc trang cá nhân
      const currentUrl = page.url();
      if (!currentUrl.includes('facebook.com')) {
        await page.goto('https://www.facebook.com/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(2, 4);
      }

      await this.checkInterruption(context);

      // 3. Giải mã nội dung bài viết qua thuật toán Spin Text
      const rawContent = config.content || this.defaultConfig.content || '';
      const resolvedContent = spinText(rawContent);
      context.logger(`Nội dung đã giải mã Spin Text: "${resolvedContent.substring(0, 80)}..."`, 'INFO');

      // 4. Tìm và bấm vào khung "Bạn đang nghĩ gì thế?"
      const openDialogSelectors = [
        'div[role="button"]:has-text("Bạn đang nghĩ gì thế?")',
        'div[role="button"]:has-text("What\'s on your mind?")',
        'span:has-text("Bạn đang nghĩ gì thế?"):visible',
        'span:has-text("What\'s on your mind?"):visible',
        'div[aria-label*="Tạo bài viết"][role="button"]',
        'div[aria-label*="Create a post"][role="button"]',
      ];

      let opened = false;
      for (const sel of openDialogSelectors) {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          opened = true;
          context.logger('Đã bấm mở hộp thoại Tạo bài viết...', 'INFO');
          await this.randomSleep(2, 3);
          break;
        }
      }

      if (!opened) {
        // Thử điều hướng trực tiếp sang profile cá nhân để tìm khung đăng bài
        context.logger('Thử tìm khung đăng bài tại trang cá nhân...', 'INFO');
        await page.goto('https://www.facebook.com/me', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(3, 5);

        for (const sel of openDialogSelectors) {
          const btn = await page.$(sel);
          if (btn && (await btn.isVisible())) {
            await btn.click();
            opened = true;
            await this.randomSleep(2, 3);
            break;
          }
        }
      }

      if (!opened) {
        context.logger('Không tìm thấy nút mở hộp thoại Tạo bài viết trên giao diện!', 'ERROR');
        return { success: false, error: 'Không thể mở khung tạo bài viết' };
      }

      // 5. Chờ hộp thoại soạn thảo bài viết xuất hiện
      await page.waitForSelector('div[role="dialog"]', { timeout: 10000 });

      // 6. Nhập nội dung bài viết
      const inputSelectors = [
        'div[role="dialog"] div[role="textbox"][contenteditable="true"]',
        'div[role="dialog"] div[aria-label*="Bạn đang nghĩ gì thế?"]',
        'div[role="dialog"] div[aria-label*="What\'s on your mind?"]',
        'div[role="dialog"] div[data-lexical-editor="true"]',
      ];

      let typed = false;
      for (const inputSel of inputSelectors) {
        const input = await page.$(inputSel);
        if (input && (await input.isVisible())) {
          await input.click();
          await this.randomDelay(300, 600);
          context.logger('Đang gõ nội dung bài viết...', 'INFO');
          await this.humanType(page, inputSel, resolvedContent, { minDelayMs: 35, maxDelayMs: 110 });
          typed = true;
          break;
        }
      }

      if (!typed) {
        context.logger('Không tìm thấy ô nhập nội dung bài viết trong modal!', 'ERROR');
        return { success: false, error: 'Không tìm thấy ô soạn thảo' };
      }

      await this.randomSleep(1, 2);

      // 7. Đính kèm hình ảnh (nếu có và tệp tồn tại)
      let uploadedImageCount = 0;
      if (config.imagePaths && config.imagePaths.length > 0) {
        const validImages = config.imagePaths.filter((p) => {
          try {
            return fs.existsSync(p);
          } catch {
            return false;
          }
        });

        if (validImages.length > 0) {
          context.logger(`Đang tải lên ${validImages.length} ảnh đính kèm...`, 'INFO');
          // Tìm input file ẩn
          const fileInput = await page.$('div[role="dialog"] input[type="file"][accept*="image"]');
          if (fileInput) {
            await fileInput.setInputFiles(validImages);
            uploadedImageCount = validImages.length;
            context.logger(`Đã chọn ${uploadedImageCount} ảnh. Chờ Facebook tải ảnh lên xem trước...`, 'INFO');
            await this.randomSleep(4, 7);
          } else {
            // Thử bấm icon Thêm ảnh để kích hoạt input file
            const addPhotoBtn = await page.$('div[role="dialog"] div[aria-label*="Ảnh/video"], div[role="dialog"] div[aria-label*="Photo/video"]');
            if (addPhotoBtn) {
              await addPhotoBtn.click();
              await this.randomSleep(1, 2);
              const retryFileInput = await page.$('input[type="file"][accept*="image"]');
              if (retryFileInput) {
                await retryFileInput.setInputFiles(validImages);
                uploadedImageCount = validImages.length;
                await this.randomSleep(4, 7);
              }
            }
          }
        }
      }

      await this.checkInterruption(context);

      // 8. Tạm dừng nghỉ tự nhiên trước khi bấm Đăng
      const delayBeforePost = config.delayBeforePostSec ?? 3;
      context.logger(`Nghỉ ${delayBeforePost}s trước khi xuất bản bài viết...`, 'INFO');
      await this.randomSleep(delayBeforePost, delayBeforePost + 1);

      // 9. Tìm và bấm nút "Đăng" (Post)
      const submitPostSelectors = [
        'div[role="dialog"] div[aria-label="Đăng"][role="button"]',
        'div[role="dialog"] div[aria-label="Post"][role="button"]',
        'div[role="dialog"] div[role="button"]:has-text("Đăng")',
        'div[role="dialog"] div[role="button"]:has-text("Post")',
      ];

      let submitted = false;
      for (const submitSel of submitPostSelectors) {
        const submitBtn = await page.$(submitSel);
        if (submitBtn && (await submitBtn.isVisible())) {
          // Kiểm tra xem nút có bị disable không
          const isDisabled = await submitBtn.getAttribute('aria-disabled');
          if (isDisabled !== 'true') {
            await submitBtn.click();
            submitted = true;
            context.logger('Đã bấm nút Đăng bài viết!', 'INFO');
            break;
          }
        }
      }

      if (!submitted) {
        context.logger('Nút Đăng bài bị mờ hoặc không click được!', 'ERROR');
        return { success: false, error: 'Nút đăng bài bị vô hiệu hóa' };
      }

      // 10. Chờ hộp thoại đóng lại xác nhận đăng thành công
      context.logger('Chờ xác nhận xuất bản bài viết...', 'INFO');
      try {
        await page.waitForSelector('div[role="dialog"]', { state: 'detached', timeout: 20000 });
        context.logger('Hộp thoại đăng bài đã đóng. Bài viết xuất bản thành công!', 'SUCCESS');
      } catch {
        // Nếu modal chưa đóng, đợi thêm một chút rồi kiểm tra lại
        await this.randomSleep(3, 5);
      }

      return {
        success: true,
        message: 'Đăng bài viết lên tường cá nhân thành công',
        data: {
          contentLength: resolvedContent.length,
          imagesAttached: uploadedImageCount,
        },
      };
    } catch (error: any) {
      if (error?.name === 'ActionAbortedError') {
        context.logger('Tác vụ đăng bài đã bị hủy.', 'WARN');
        return { success: false, interrupted: true, message: 'Đã hủy tác vụ' };
      }
      context.logger(`Lỗi khi đăng bài: ${error?.message || error}`, 'ERROR');
      return { success: false, error: error?.message || String(error) };
    }
  }
}
