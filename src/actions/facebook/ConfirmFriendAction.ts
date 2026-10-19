/**
 * VMAX Tech - Confirm Friend Action
 * Hành động: Chấp Nhận Lời Mời Kết Bạn
 * Mô tả: Truy cập facebook.com/friends/requests, quét danh sách những người đã gửi lời mời,
 * tự động bấm "Xác nhận" / "Chấp nhận" với số lượng và độ trễ an toàn.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface ConfirmFriendConfig {
  count?: number;
  delayMinSec?: number;
  delayMaxSec?: number;
}

export class ConfirmFriendAction extends BaseAction<ConfirmFriendConfig> {
  readonly actionCode = 'fHDXacNhanKetBan';
  readonly name = 'Chấp Nhận Lời Mời Kết Bạn';
  readonly category = 'friends';
  readonly description = 'Tự động kiểm tra và chấp nhận các lời mời kết bạn gửi đến trang cá nhân';

  readonly defaultConfig: ConfirmFriendConfig = {
    count: 5,
    delayMinSec: 3,
    delayMaxSec: 8,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: ConfirmFriendConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Chấp nhận lời mời kết bạn', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      context.logger('Mở trang lời mời kết bạn (facebook.com/friends/requests)...', 'INFO');
      await page.goto('https://www.facebook.com/friends/requests', { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      const targetCount = config.count || 5;
      let confirmedCount = 0;

      const confirmButtonSelectors = [
        'div[aria-label="Xác nhận"][role="button"]',
        'div[aria-label="Confirm"][role="button"]',
        'div[role="button"]:has-text("Xác nhận")',
        'div[role="button"]:has-text("Confirm")',
      ];

      for (const selector of confirmButtonSelectors) {
        const buttons = await page.$$(selector);
        for (const btn of buttons) {
          if (confirmedCount >= targetCount) break;
          await this.checkInterruption(context);

          try {
            await btn.click();
            confirmedCount++;
            context.logger(`Đã xác nhận kết bạn thành công (${confirmedCount}/${targetCount})`, 'SUCCESS');

            const delay = Math.floor(Math.random() * ((config.delayMaxSec || 8) - (config.delayMinSec || 3) + 1) + (config.delayMinSec || 3));
            await this.randomSleep(delay, delay);
          } catch (btnErr: any) {
            context.logger(`Lỗi click xác nhận: ${btnErr?.message || btnErr}`, 'WARN');
          }
        }
        if (confirmedCount >= targetCount) break;
      }

      context.logger(`Hoàn tất chấp nhận kết bạn: Đã xác nhận ${confirmedCount} người.`, 'SUCCESS');
      return {
        success: confirmedCount > 0,
        message: `Đã xác nhận ${confirmedCount} lời mời kết bạn`,
        stats: { confirmed: confirmedCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi chấp nhận kết bạn: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
