/**
 * VMAX Tech - Send Message Action
 * Hành động: Gửi Tin Nhắn Messenger Theo UID Hoặc Bạn Bè
 * Mô tả: Truy cập hộp thoại tin nhắn Messenger, gửi nội dung văn bản kèm Spin Text đa tầng.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface SendMessageConfig {
  mode?: 'uid_list' | 'friends';
  targetUids?: string[] | string;
  messageText?: string;
  countMin?: number;
  countMax?: number;
  delayMinSec?: number;
  delayMaxSec?: number;
  sendSticker?: boolean;
}

export class SendMessageAction extends BaseAction<SendMessageConfig> {
  readonly actionCode = 'fHDNhanTinUid';
  readonly name = 'Gửi Tin Nhắn Messenger (UID / Bạn Bè)';
  readonly category = 'message';
  readonly description = 'Tự động gửi tin nhắn Messenger theo danh sách UID hoặc danh sách bạn bè kèm Spin Text';

  readonly defaultConfig: SendMessageConfig = {
    mode: 'uid_list',
    targetUids: [],
    messageText: '{Xin chào|Chào {anh|chị|bạn}}|Hello {anh|chị}}! {Chúc bạn một ngày {vui vẻ|tuyệt vời|nhiều may mắn}|Mình thấy profile bạn rất ấn tượng} ạ!',
    countMin: 2,
    countMax: 5,
    delayMinSec: 5,
    delayMaxSec: 15,
    sendSticker: false,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: SendMessageConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Gửi tin nhắn Messenger', 'INFO');

    try {
      // 1. Kiểm tra checkpoint
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // 2. Chuẩn bị danh sách UID
      let uids: string[] = [];
      if (typeof config.targetUids === 'string') {
        uids = config.targetUids.split(/[\n,;|]+/).map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(config.targetUids)) {
        uids = config.targetUids.map(s => String(s).trim()).filter(Boolean);
      }

      if (config.mode === 'uid_list' && uids.length === 0) {
        context.logger('Danh sách UID mục tiêu trống, chuyển sang chế độ nhắn tin bạn bè gần đây...', 'WARN');
      }

      const countMin = config.countMin ?? 2;
      const countMax = Math.max(countMin, config.countMax ?? 5);
      const targetCount = Math.floor(Math.random() * (countMax - countMin + 1) + countMin);

      let successCount = 0;

      if (uids.length > 0) {
        // Nhắn tin theo danh sách UID
        for (let i = 0; i < Math.min(uids.length, targetCount); i++) {
          await this.checkInterruption(context);
          const targetUid = uids[i];
          context.logger(`Đang mở hộp thoại chat với UID: ${targetUid}...`, 'INFO');

          try {
            await page.goto(`https://www.facebook.com/messages/t/${targetUid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.randomSleep(3, 5);

            // Kiểm tra bị chặn chat hoặc không tìm thấy người dùng
            const notFound = await this.isElementVisible(page, 'span:has-text("Người này hiện không có mặt trên Messenger"), span:has-text("This person isn\'t available on Messenger")');
            if (notFound) {
              context.logger(`UID ${targetUid} không thể nhận tin nhắn Messenger. Bỏ qua.`, 'WARN');
              continue;
            }

            // Tìm ô nhập tin nhắn
            const chatInputSelectors = [
              'div[role="textbox"][aria-label*="Tin nhắn"]',
              'div[role="textbox"][aria-label*="Message"]',
              'div[role="textbox"][aria-label*="Soạn tin nhắn"]',
              'div[contenteditable="true"][role="textbox"]',
            ];

            const foundInput = await this.isElementVisible(page, chatInputSelectors, 8000);
            if (!foundInput) {
              context.logger(`Không tìm thấy ô nhập tin nhắn với UID ${targetUid}`, 'WARN');
              continue;
            }

            // Bóc tách Spin Text
            const content = spinText(config.messageText || this.defaultConfig.messageText!);
            context.logger(`Gõ nội dung tin nhắn: "${content.substring(0, 50)}..."`, 'INFO');

            await this.humanType(page, chatInputSelectors[0], content);
            await this.randomSleep(1, 2);

            // Nhấn Enter để gửi
            await page.keyboard.press('Enter');
            await this.randomSleep(2, 4);

            successCount++;
            context.logger(`Gửi tin nhắn thành công tới ${targetUid} (${successCount}/${targetCount})`, 'SUCCESS');

            // Delay ngẫu nhiên giữa các lần gửi
            if (i < targetCount - 1) {
              const delay = Math.floor(Math.random() * ((config.delayMaxSec || 15) - (config.delayMinSec || 5) + 1) + (config.delayMinSec || 5));
              context.logger(`Chờ ${delay}s trước khi gửi người tiếp theo...`, 'INFO');
              await this.randomSleep(delay, delay);
            }
          } catch (itemErr: any) {
            context.logger(`Lỗi khi nhắn tin cho ${targetUid}: ${itemErr?.message || itemErr}`, 'WARN');
          }
        }
      } else {
        // Nhắn tin bạn bè trong danh sách Messenger
        context.logger('Mở trang Messenger để tương tác bạn bè...', 'INFO');
        await page.goto('https://www.facebook.com/messages/t/', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(3, 5);

        // Click cuộc trò chuyện đầu tiên
        const conversationSelector = 'div[role="navigation"] a[href*="/messages/t/"], div[role="grid"] div[role="row"]';
        const clicked = await this.safeClick(page, conversationSelector, { timeoutMs: 7000 });
        if (clicked) {
          await this.randomSleep(2, 3);
          const content = spinText(config.messageText || this.defaultConfig.messageText!);
          const chatInput = 'div[contenteditable="true"][role="textbox"]';
          if (await this.isElementVisible(page, chatInput, 5000)) {
            await this.humanType(page, chatInput, content);
            await page.keyboard.press('Enter');
            successCount++;
            context.logger('Đã gửi tin nhắn cho bạn bè trên Messenger!', 'SUCCESS');
          }
        }
      }

      return {
        success: successCount > 0,
        message: `Đã gửi thành công ${successCount} tin nhắn`,
        stats: { sent: successCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi trong hành động gửi tin nhắn: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
