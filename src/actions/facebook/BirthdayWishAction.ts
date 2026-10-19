/**
 * VMAX Tech - Birthday Wish Action
 * Hành động: Chúc Mừng Sinh Nhật Bạn Bè
 * Mô tả: Truy cập facebook.com/events/birthdays, tìm bạn bè có sinh nhật hôm nay,
 * tự động viết lời chúc mừng có Spin Text lên tường hoặc gửi tin nhắn riêng.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface BirthdayWishConfig {
  message?: string;
  maxWishes?: number;
  delaySec?: number;
}

export class BirthdayWishAction extends BaseAction<BirthdayWishConfig> {
  readonly actionCode = 'fHDChucMungSinhNhat';
  readonly name = 'Chúc Mừng Sinh Nhật Bạn Bè';
  readonly category = 'friends';
  readonly description = 'Tự động kiểm tra danh sách bạn bè sinh nhật hôm nay và gửi lời chúc mừng ấm áp';

  readonly defaultConfig: BirthdayWishConfig = {
    message: '{Chúc mừng sinh nhật {bạn|bạn hiền|anh|chị}|Happy Birthday to you}! 🎂🎉 {Chúc {bạn|anh|chị} thêm tuổi mới nhiều niềm vui, sức khỏe và luôn thành công trong cuộc sống|Tuổi mới vạn sự như ý, phát tài phát lộc} {nha|nhé|ạ}! 🥂✨',
    maxWishes: 3,
    delaySec: 5,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: BirthdayWishConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Chúc mừng sinh nhật bạn bè', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      context.logger('Mở trang sự kiện sinh nhật (facebook.com/events/birthdays)...', 'INFO');
      await page.goto('https://www.facebook.com/events/birthdays', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      // Tìm các ô nhập tin nhắn chúc mừng sinh nhật
      const wishInputs = await page.$$('div[role="textbox"][aria-label*="sinh nhật"], div[role="textbox"][aria-label*="birthday"], textarea');
      context.logger(`Tìm thấy ${wishInputs.length} bạn bè có ô chúc mừng sinh nhật hôm nay.`, 'INFO');

      let wishedCount = 0;
      const targetCount = config.maxWishes || 3;

      for (const input of wishInputs) {
        if (wishedCount >= targetCount) break;
        await this.checkInterruption(context);

        try {
          const text = spinText(config.message || this.defaultConfig.message!);
          await input.click();
          await this.randomSleep(1, 2);
          await input.fill(text);
          await this.randomSleep(1, 2);
          await page.keyboard.press('Enter');
          wishedCount++;
          context.logger(`Đã gửi lời chúc sinh nhật thành công (${wishedCount}/${targetCount})`, 'SUCCESS');
          await this.randomSleep(config.delaySec || 5, (config.delaySec || 5) + 3);
        } catch (wishErr: any) {
          context.logger(`Lỗi gửi lời chúc: ${wishErr?.message || wishErr}`, 'WARN');
        }
      }

      context.logger(`Hoàn tất chúc mừng sinh nhật: Đã chúc ${wishedCount} bạn bè.`, 'SUCCESS');
      return {
        success: wishedCount > 0,
        message: `Đã gửi lời chúc sinh nhật cho ${wishedCount} bạn bè`,
        stats: { wished: wishedCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi chúc mừng sinh nhật: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
