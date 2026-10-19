/**
 * VMAX Tech - Break Rest Action
 * Hành động: Nghỉ Giải Lao Giữa Giờ
 * Mô tả: Tạm dừng tiến trình trong khoảng thời gian ngẫu nhiên (tính bằng giây),
 * cập nhật thanh tiến độ liên tục để chống checkpoint hành vi do thao tác dồn dập.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface BreakRestConfig {
  delayMin?: number;
  delayMax?: number;
}

export class BreakRestAction extends BaseAction<BreakRestConfig> {
  readonly actionCode = 'fHDNghiGiaiLao';
  readonly name = 'Nghỉ Giải Lao Giữa Giờ';
  readonly category = 'utility';
  readonly description = 'Tạm dừng luồng ngẫu nhiên để mô phỏng người thật nghỉ ngơi, chống checkpoint hành vi';

  readonly defaultConfig: BreakRestConfig = {
    delayMin: 15,
    delayMax: 30,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: BreakRestConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    const minSec = config.delayMin ?? 15;
    const maxSec = Math.max(minSec, config.delayMax ?? 30);
    const totalSleepSec = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec);

    context.logger(`Bắt đầu nghỉ giải lao an toàn trong ${totalSleepSec} giây...`, 'INFO');

    try {
      let remaining = totalSleepSec;
      while (remaining > 0) {
        await this.checkInterruption(context);
        const step = Math.min(5, remaining);
        await new Promise((r) => setTimeout(r, step * 1000));
        remaining -= step;
        if (remaining > 0 && remaining % 10 === 0) {
          context.logger(`Đang nghỉ giải lao... còn lại ${remaining}s`, 'INFO');
        }
      }

      context.logger(`Đã nghỉ xong ${totalSleepSec}s. Tiếp tục các hành động tiếp theo.`, 'SUCCESS');
      return {
        success: true,
        message: `Nghỉ giải lao ${totalSleepSec}s thành công`,
      };
    } catch (err: any) {
      context.logger(`Lỗi trong thời gian nghỉ giải lao: ${err?.message || err}`, 'WARN');
      return { success: false, error: err?.message || String(err) };
    }
  }
}
