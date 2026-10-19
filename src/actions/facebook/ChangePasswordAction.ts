/**
 * VMAX Tech - Change Password Action
 * Hành động: Đổi Mật Khẩu Tự Động
 * Mô tả: Truy cập Trung tâm tài khoản (Accounts Center) của Meta/Facebook,
 * đổi mật khẩu theo cấu trúc chỉ định, cập nhật ngay vào SQLite database.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface ChangePasswordConfig {
  pattern?: string;        // Mẫu: 'Vmax@{rand8}!' hoặc 'Pass_{rand6}'
  logoutOtherDevices?: boolean;
}

export class ChangePasswordAction extends BaseAction<ChangePasswordConfig> {
  readonly actionCode = 'fHDDoiMatKhau';
  readonly name = 'Đổi Mật Khẩu Tự Động';
  readonly category = 'security';
  readonly description = 'Tự động đổi mật khẩu Facebook trong Accounts Center và đồng bộ ngay vào CSDL SQLite';

  readonly defaultConfig: ChangePasswordConfig = {
    pattern: 'Vmax@{rand8}!',
    logoutOtherDevices: true,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: ChangePasswordConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Đổi mật khẩu tài khoản', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      const currentPass = context.account?.pass || '';
      if (!currentPass) {
        context.logger('Lỗi: Tài khoản chưa có thông tin mật khẩu hiện tại trong CSDL!', 'ERROR');
        return { success: false, error: 'Current password is required in DB' };
      }

      // Sinh mật khẩu mới theo mẫu pattern
      const newPass = this.generateNewPassword(config.pattern || 'Vmax@{rand8}!');
      context.logger(`Đã sinh mật khẩu mới (ẩn vì lý do bảo mật)`, 'INFO');

      // 1. Điều hướng tới trang đổi mật khẩu Meta Accounts Center
      const changePasswordUrl = 'https://accountscenter.facebook.com/password_and_security/password';
      context.logger(`Mở Accounts Center: ${changePasswordUrl}...`, 'INFO');
      await page.goto(changePasswordUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(4, 6);

      // Nếu có danh sách tài khoản, click vào tài khoản Facebook
      const accountCards = await page.$$('div[role="button"][tabindex="0"]');
      if (accountCards.length > 0) {
        await accountCards[0].click();
        await this.randomSleep(2, 4);
      }

      // Tìm 3 ô: Mật khẩu hiện tại, Mật khẩu mới, Nhập lại mật khẩu mới
      const passwordInputs = await page.$$('input[type="password"]');
      if (passwordInputs.length >= 3) {
        context.logger('Tìm thấy biểu mẫu đổi mật khẩu, đang nhập thông tin...', 'INFO');

        // Ô 1: Pass hiện tại
        await passwordInputs[0].click();
        await passwordInputs[0].fill(currentPass);
        await this.randomSleep(1, 2);

        // Ô 2: Pass mới
        await passwordInputs[1].click();
        await passwordInputs[1].fill(newPass);
        await this.randomSleep(1, 2);

        // Ô 3: Xác nhận pass mới
        await passwordInputs[2].click();
        await passwordInputs[2].fill(newPass);
        await this.randomSleep(2, 3);

        // Bấm nút "Đổi mật khẩu"
        const submitBtn = await page.$('div[role="button"]:has-text("Đổi mật khẩu"), div[role="button"]:has-text("Change password"), button[type="submit"]');
        if (submitBtn) {
          await submitBtn.click();
          await this.randomSleep(4, 7);

          // Cập nhật mật khẩu mới vào cơ sở dữ liệu SQLite
          try {
            const { AccountRepository } = require('../../database/repositories/AccountRepository');
            const repo = new AccountRepository();
            repo.update(context.accountId, { pass: newPass });
            context.logger('Đã cập nhật mật khẩu mới vào SQLite Database!', 'SUCCESS');
          } catch (dbErr) {
            context.logger(`Cảnh báo: Không thể lưu pass mới vào DB: ${dbErr}`, 'WARN');
          }

          context.logger('Đổi mật khẩu tài khoản thành công!', 'SUCCESS');
          return {
            success: true,
            message: 'Đổi mật khẩu thành công và đã lưu SQLite',
          };
        }
      }

      context.logger('Không tìm thấy form đổi mật khẩu hoặc giao diện yêu cầu xác minh bảo mật!', 'WARN');
      return { success: false, error: 'Password form not matched' };
    } catch (err: any) {
      context.logger(`Lỗi đổi mật khẩu: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }

  private generateNewPassword(pattern: string): string {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    return pattern.replace(/\{rand(\d+)\}/g, (_match, lenStr) => {
      const len = parseInt(lenStr) || 8;
      let rand = '';
      for (let i = 0; i < len; i++) {
        rand += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return rand;
    });
  }
}
