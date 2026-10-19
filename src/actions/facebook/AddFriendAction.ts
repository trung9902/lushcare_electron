/**
 * LushCare Electron - Add Friend Action
 * Hành động: Kết Bạn Gợi Ý Hoặc Theo Tệp UID
 * Mô tả: Tự động gửi lời mời kết bạn từ danh sách gợi ý của Facebook hoặc theo tệp UID chỉ định.
 * Có cơ chế bảo vệ phát hiện chặn tính năng (Action Blocked) và dừng khẩn cấp để bảo vệ nick.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface AddFriendConfig {
  mode?: 'suggested' | 'uid_list';
  targetUids?: string[] | string;
  minFriends?: number;
  maxFriends?: number;
  delayMinSec?: number;
  delayMaxSec?: number;
}

export class AddFriendAction extends BaseAction<AddFriendConfig> {
  readonly actionCode = 'HDKetBanGoiY';
  readonly name = 'Kết Bạn Gợi Ý Hoặc Tệp UID';
  readonly category = 'friend';
  readonly description = 'Gửi lời mời kết bạn từ danh sách đề xuất của Facebook hoặc theo danh sách UID với độ trễ an toàn';

  readonly defaultConfig: AddFriendConfig = {
    mode: 'suggested',
    targetUids: [],
    minFriends: 2,
    maxFriends: 5,
    delayMinSec: 6,
    delayMaxSec: 15,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: AddFriendConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    const mode = config.mode || 'suggested';
    context.logger(`Bắt đầu hành động: Kết bạn (${mode === 'suggested' ? 'Gợi ý' : 'Theo tệp UID'})`, 'INFO');

    try {
      // 1. Kiểm tra checkpoint sớm
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      const minCount = config.minFriends ?? 2;
      const maxCount = Math.max(minCount, config.maxFriends ?? 5);
      const targetCount = Math.floor(Math.random() * (maxCount - minCount + 1) + minCount);

      let successCount = 0;

      if (mode === 'suggested') {
        successCount = await this.executeAddSuggestedFriends(page, context, config, targetCount);
      } else {
        successCount = await this.executeAddUidFriends(page, context, config, targetCount);
      }

      context.logger(`Hoàn tất kết bạn: Đã gửi thành công ${successCount}/${targetCount} lời mời.`, 'SUCCESS');

      return {
        success: successCount > 0,
        message: `Đã gửi kết bạn cho ${successCount} người`,
        stats: {
          friendsAdded: successCount,
          targetCount,
        },
      };
    } catch (error: any) {
      if (error?.name === 'ActionAbortedError') {
        context.logger('Tác vụ kết bạn đã bị hủy.', 'WARN');
        return { success: false, interrupted: true, message: 'Đã hủy tác vụ' };
      }
      context.logger(`Lỗi kết bạn: ${error?.message || error}`, 'ERROR');
      return { success: false, error: error?.message || String(error) };
    }
  }

  /**
   * Kết bạn theo danh sách gợi ý của Facebook
   */
  private async executeAddSuggestedFriends(
    page: Page,
    context: ActionExecutionContext,
    config: AddFriendConfig,
    targetCount: number
  ): Promise<number> {
    context.logger(`Điều hướng đến trang gợi ý kết bạn Facebook...`, 'INFO');
    await page.goto('https://www.facebook.com/friends/suggestions', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await this.randomSleep(3, 5);

    let count = 0;
    const addFriendButtonSelectors = [
      'div[aria-label="Thêm bạn bè"][role="button"]',
      'div[aria-label="Add friend"][role="button"]',
      'div[role="button"]:has-text("Thêm bạn bè")',
      'div[role="button"]:has-text("Add friend")',
      'span:has-text("Thêm bạn bè"):visible',
      'span:has-text("Add friend"):visible',
    ];

    while (count < targetCount) {
      await this.checkInterruption(context);

      // Tìm nút "Thêm bạn bè"
      let clickedButton = false;
      for (const sel of addFriendButtonSelectors) {
        const buttons = await page.$$(sel);
        for (const btn of buttons) {
          if (await btn.isVisible()) {
            const box = await btn.boundingBox();
            if (box && box.y > 50 && box.y < 850) {
              await btn.scrollIntoViewIfNeeded().catch(() => {});
              await this.randomDelay(300, 700);

              context.logger(`Bấm gửi lời mời kết bạn (Người thứ ${count + 1}/${targetCount})...`, 'INFO');
              await btn.click();
              clickedButton = true;
              count++;

              // Kiểm tra xem Facebook có hiển thị popup cảnh báo chặn tính năng không
              await this.randomSleep(1, 2);
              const isBlocked = await this.checkActionBlocked(page);
              if (isBlocked) {
                context.logger('CẢNH BÁO: Facebook hiển thị thông báo bị chặn tính năng! Dừng ngay lập tức.', 'ERROR');
                return count;
              }

              // Nghỉ an toàn giữa 2 lần kết bạn
              const delaySec = Math.floor(
                Math.random() * ((config.delayMaxSec ?? 15) - (config.delayMinSec ?? 6) + 1) +
                  (config.delayMinSec ?? 6)
              );
              context.logger(`Nghỉ ${delaySec}s trước khi kết bạn người tiếp theo...`, 'INFO');
              await this.randomSleep(delaySec, delaySec + 1);
              break;
            }
          }
        }
        if (clickedButton) break;
      }

      if (!clickedButton) {
        // Cuộn trang xuống để load thêm gợi ý
        context.logger('Cuộn trang tải thêm danh sách gợi ý...', 'INFO');
        await this.smoothScroll(page, 600, 10);
        await this.randomSleep(2, 4);

        // Nếu cuộn 2 lần vẫn không tìm thấy nút nào thì dừng
        const remainingBtns = await page.$('div[aria-label="Thêm bạn bè"][role="button"]');
        if (!remainingBtns) {
          context.logger('Hết danh sách bạn bè gợi ý khả dụng.', 'WARN');
          break;
        }
      }
    }

    return count;
  }

  /**
   * Kết bạn theo danh sách UID người dùng chỉ định
   */
  private async executeAddUidFriends(
    page: Page,
    context: ActionExecutionContext,
    config: AddFriendConfig,
    targetCount: number
  ): Promise<number> {
    let uids: string[] = [];
    if (Array.isArray(config.targetUids)) {
      uids = config.targetUids;
    } else if (typeof config.targetUids === 'string') {
      uids = config.targetUids.split(/[\r\n,]+/).map((s) => s.trim()).filter((s) => s.length > 0);
    }

    if (uids.length === 0) {
      context.logger('Không có UID nào trong danh sách kết bạn!', 'WARN');
      return 0;
    }

    context.logger(`Có ${uids.length} UID mục tiêu. Sẽ gửi tối đa ${targetCount} lời mời...`, 'INFO');

    let count = 0;
    for (const uid of uids) {
      if (count >= targetCount) break;
      await this.checkInterruption(context);

      context.logger(`Điều hướng tới trang cá nhân UID: ${uid}...`, 'INFO');
      await page.goto(`https://www.facebook.com/${uid}`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await this.randomSleep(3, 5);

      // Kiểm tra trang có tồn tại không (Page not found / Content unavailable)
      const isUnavailable = await page.$('span:has-text("Trang này không khả dụng"), span:has-text("This content isn\'t available right now")');
      if (isUnavailable) {
        context.logger(`UID ${uid} không tồn tại hoặc đã bị khóa. Bỏ qua.`, 'WARN');
        continue;
      }

      // Kiểm tra xem đã là bạn bè chưa hoặc đã gửi lời mời chưa
      const isAlreadyFriend = await page.$('div[aria-label="Bạn bè"][role="button"], div[aria-label="Friends"][role="button"]');
      const isPending = await page.$('div[aria-label="Hủy lời mời"][role="button"], div[aria-label="Cancel request"][role="button"]');

      if (isAlreadyFriend || isPending) {
        context.logger(`UID ${uid} đã là bạn bè hoặc đang chờ đồng ý. Bỏ qua.`, 'INFO');
        continue;
      }

      // Tìm nút "Thêm bạn bè"
      const addSelectors = [
        'div[aria-label="Thêm bạn bè"][role="button"]',
        'div[aria-label="Add friend"][role="button"]',
        'div[role="button"]:has-text("Thêm bạn bè")',
        'div[role="button"]:has-text("Add friend")',
      ];

      let added = false;
      for (const sel of addSelectors) {
        const btn = await page.$(sel);
        if (btn && (await btn.isVisible())) {
          await btn.click();
          added = true;
          count++;
          context.logger(`Đã gửi kết bạn thành công tới UID: ${uid} (${count}/${targetCount})`, 'SUCCESS');
          break;
        }
      }

      if (!added) {
        context.logger(`Không tìm thấy nút kết bạn với UID: ${uid} (Có thể nick chặn kết bạn)`, 'INFO');
      }

      // Kiểm tra cảnh báo chặn tính năng
      if (await this.checkActionBlocked(page)) {
        context.logger('Tài khoản bị Facebook cảnh báo giới hạn tính năng kết bạn! Dừng ngay.', 'ERROR');
        break;
      }

      const delaySec = Math.floor(
        Math.random() * ((config.delayMaxSec ?? 15) - (config.delayMinSec ?? 6) + 1) +
          (config.delayMinSec ?? 6)
      );
      context.logger(`Nghỉ ${delaySec}s trước khi chuyển UID tiếp theo...`, 'INFO');
      await this.randomSleep(delaySec, delaySec + 1);
    }

    return count;
  }

  /**
   * Kiểm tra thông báo Facebook chặn tính năng
   */
  private async checkActionBlocked(page: Page): Promise<boolean> {
    try {
      const blockedTexts = [
        'Bạn tạm thời bị chặn',
        'You’re Temporarily Blocked',
        'Tính năng này tạm thời bị khóa',
        'Hạn chế kết bạn',
      ];
      for (const txt of blockedTexts) {
        const hasWarning = await page.$(`text="${txt}"`);
        if (hasWarning && (await hasWarning.isVisible())) {
          return true;
        }
      }
      return false;
    } catch {
      return false;
    }
  }
}
