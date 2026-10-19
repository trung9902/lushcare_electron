/**
 * VMAX Tech - Enable 2FA Action
 * Hành động: Bật Bảo Mật 2 Lớp (2FA Secret Key)
 * Mô tả: Truy cập cài đặt xác thực 2 yếu tố của Meta Accounts Center,
 * chọn "Ứng dụng xác thực", lấy Secret Key (khóa bí mật), sinh mã TOTP xác nhận,
 * kích hoạt thành công và lưu ngay Secret Key vào cột `fa2` trong CSDL SQLite.
 */

import type { Page } from 'playwright-core';
import { authenticator } from 'otplib';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface Enable2FAConfig {
  saveToDb?: boolean;
}

export class Enable2FAAction extends BaseAction<Enable2FAConfig> {
  readonly actionCode = 'fHDBat2FA';
  readonly name = 'Bật Bảo Mật 2 Lớp (2FA Key)';
  readonly category = 'security';
  readonly description = 'Tự động bật xác thực 2 yếu tố qua Authenticator App, verify mã OTP và lưu Secret Key vào SQLite';

  readonly defaultConfig: Enable2FAConfig = {
    saveToDb: true,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: Enable2FAConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Bật bảo mật 2 lớp 2FA', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      // Điều hướng tới mục 2FA trong Accounts Center
      const url2Fa = 'https://accountscenter.facebook.com/password_and_security/two_factor';
      context.logger(`Mở Accounts Center 2FA: ${url2Fa}...`, 'INFO');
      await page.goto(url2Fa, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      // Nếu có danh sách tài khoản, click vào tài khoản Facebook đầu tiên
      const accountCards = await page.$$('div[role="button"][tabindex="0"]');
      if (accountCards.length > 0) {
        await accountCards[0].click();
        await this.randomSleep(2, 4);
      }

      // Kiểm tra xem 2FA đã được bật chưa
      const isAlreadyOn = await page.$('span:has-text("Xác thực 2 yếu tố đang bật"), span:has-text("Two-factor authentication is on")');
      if (isAlreadyOn) {
        context.logger('Tài khoản đã được bật 2FA từ trước!', 'INFO');
        return { success: true, message: '2FA is already enabled' };
      }

      // Chọn phương thức: Ứng dụng xác thực (Authentication App)
      const appOption = await page.$('input[type="radio"][value*="app"], div[role="button"]:has-text("Ứng dụng xác thực"), div[role="button"]:has-text("Authentication app")');
      if (appOption) {
        await appOption.click();
        await this.randomSleep(1, 2);
        // Bấm Tiếp tục
        await this.safeClick(page, ['div[role="button"]:has-text("Tiếp"), div[role="button"]:has-text("Next")']);
        await this.randomSleep(3, 5);
      }

      // Tìm chuỗi Secret Key trên màn hình quét mã QR
      // Thường có nút "Không thể quét mã QR?" hoặc một chuỗi chữ hoa 32 ký tự
      const cantScanBtn = await page.$('span:has-text("Không thể quét mã"), span:has-text("Can\'t scan code"), div[role="button"]:has-text("Sao chép khóa"), div[role="button"]:has-text("Copy key")');
      if (cantScanBtn) {
        await cantScanBtn.click();
        await this.randomSleep(1, 2);
      }

      // Quét tìm chuỗi base32 secret key từ trang
      const extractedKey = await page.evaluate(() => {
        const text = document.body.innerText;
        // Chuỗi secret key Base32 gồm 16 hoặc 32 ký tự [A-Z2-7] cách nhau bởi khoảng trắng
        const match = text.match(/\b([A-Z2-7]{4}\s?[A-Z2-7]{4}\s?[A-Z2-7]{4}\s?[A-Z2-7]{4}(?:\s?[A-Z2-7]{4}\s?[A-Z2-7]{4}\s?[A-Z2-7]{4}\s?[A-Z2-7]{4})?)\b/);
        if (match) {
          return match[1].replace(/\s+/g, '');
        }
        return null;
      });

      if (!extractedKey) {
        context.logger('Không trích xuất được Secret Key 2FA từ giao diện!', 'WARN');
        return { success: false, error: 'Could not extract 2FA secret key' };
      }

      context.logger(`Đã trích xuất Secret Key 2FA thành công! Đang sinh mã OTP xác minh...`, 'INFO');

      // Sinh mã OTP 6 số từ extractedKey
      const otpCode = authenticator.generate(extractedKey);
      context.logger(`Mã OTP sinh ra: ${otpCode}. Đang nhập xác minh...`, 'INFO');

      // Bấm Tiếp để sang bước nhập mã
      await this.safeClick(page, ['div[role="button"]:has-text("Tiếp"), div[role="button"]:has-text("Next")']);
      await this.randomSleep(2, 3);

      // Điền mã OTP vào ô xác minh
      const otpInput = await page.$('input[type="text"][maxlength="6"], input[type="number"], input[inputmode="numeric"]');
      if (otpInput) {
        await otpInput.fill(otpCode);
        await this.randomSleep(1, 2);

        // Bấm Xác nhận / Hoàn tất
        await this.safeClick(page, ['div[role="button"]:has-text("Tiếp"), div[role="button"]:has-text("Xong"), div[role="button"]:has-text("Done")']);
        await this.randomSleep(4, 6);

        // Lưu Secret Key mới vào CSDL SQLite
        if (config.saveToDb !== false) {
          try {
            const { AccountRepository } = require('../../database/repositories/AccountRepository');
            const repo = new AccountRepository();
            repo.update(context.accountId, { fa2: extractedKey });
            context.logger('Đã lưu Secret Key 2FA vào CSDL SQLite!', 'SUCCESS');
          } catch (dbErr) {
            context.logger(`Cảnh báo: Không thể lưu 2FA vào DB: ${dbErr}`, 'WARN');
          }
        }

        context.logger('Bật xác thực 2 lớp 2FA thành công!', 'SUCCESS');
        return {
          success: true,
          message: 'Bật 2FA thành công',
          data: { secretKey: extractedKey },
        };
      }

      return { success: false, error: 'OTP confirmation input not found' };
    } catch (err: any) {
      context.logger(`Lỗi bật 2FA: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
