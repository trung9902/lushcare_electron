/**
 * VMAX Tech - Join Group Action
 * Hành động: Tham Gia Nhóm Theo Từ Khóa Hoặc Danh Sách ID
 * Mô tả: Tìm kiếm nhóm theo từ khóa hoặc vào link nhóm trực tiếp,
 * gửi yêu cầu tham gia và tự động trả lời câu hỏi xét duyệt nếu có.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';

export interface JoinGroupConfig {
  mode?: 'keyword' | 'group_ids';
  keyword?: string;
  groupIds?: string[] | string;
  maxGroups?: number;
  answerQuestions?: boolean;
  defaultAnswer?: string;
  delayMinSec?: number;
  delayMaxSec?: number;
}

export class JoinGroupAction extends BaseAction<JoinGroupConfig> {
  readonly actionCode = 'fHDThamGiaNhomTuKhoa';
  readonly name = 'Tham Gia Nhóm (Từ Khóa / Danh Sách ID)';
  readonly category = 'groups';
  readonly description = 'Tự động tìm kiếm và gửi yêu cầu tham gia nhóm Facebook, tự động tick đồng ý quy tắc và trả lời câu hỏi';

  readonly defaultConfig: JoinGroupConfig = {
    mode: 'keyword',
    keyword: 'kinh doanh online',
    groupIds: [],
    maxGroups: 2,
    answerQuestions: true,
    defaultAnswer: 'Đồng ý với mọi quy tắc của nhóm, mong admin duyệt bài ạ!',
    delayMinSec: 8,
    delayMaxSec: 20,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: JoinGroupConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger(`Bắt đầu hành động: Tham gia nhóm (${config.mode === 'keyword' ? `Từ khóa: "${config.keyword}"` : 'Theo ID nhóm'})`, 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      const maxCount = config.maxGroups || 2;
      let joinedCount = 0;

      if (config.mode === 'keyword' && config.keyword) {
        // Tìm kiếm nhóm theo từ khóa
        const searchUrl = `https://www.facebook.com/search/groups/?q=${encodeURIComponent(config.keyword)}`;
        context.logger(`Điều hướng tới trang tìm kiếm nhóm: ${searchUrl}`, 'INFO');
        await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
        await this.randomSleep(3, 5);

        await this.smoothScroll(page, 400, 10);
        await this.randomSleep(2, 3);

        // Tìm các nút "Tham gia nhóm"
        const joinButtonSelectors = [
          'div[aria-label="Tham gia nhóm"][role="button"]',
          'div[aria-label="Join group"][role="button"]',
          'div[role="button"]:has-text("Tham gia nhóm")',
          'div[role="button"]:has-text("Tham gia")',
          'div[role="button"]:has-text("Join")',
        ];

        for (const selector of joinButtonSelectors) {
          const buttons = await page.$$(selector);
          for (const btn of buttons) {
            if (joinedCount >= maxCount) break;
            await this.checkInterruption(context);

            try {
              const text = (await btn.innerText()).trim();
              if (text.includes('Đã tham gia') || text.includes('Joined') || text.includes('Đã gửi yêu cầu')) {
                continue;
              }

              context.logger('Bấm gửi yêu cầu tham gia nhóm...', 'INFO');
              await btn.click();
              await this.randomSleep(2, 4);

              // Xử lý câu hỏi xét duyệt nếu xuất hiện modal
              await this.handleApprovalQuestions(page, context, config);

              joinedCount++;
              context.logger(`Đã xin vào nhóm thành công (${joinedCount}/${maxCount})`, 'SUCCESS');

              const delay = Math.floor(Math.random() * ((config.delayMaxSec || 20) - (config.delayMinSec || 8) + 1) + (config.delayMinSec || 8));
              await this.randomSleep(delay, delay);
            } catch (clickErr: any) {
              context.logger(`Lỗi khi click tham gia nhóm: ${clickErr?.message || clickErr}`, 'WARN');
            }
          }
          if (joinedCount >= maxCount) break;
        }
      } else {
        // Tham gia nhóm theo ID
        let groups: string[] = [];
        if (typeof config.groupIds === 'string') {
          groups = config.groupIds.split(/[\n,;|]+/).map(s => s.trim()).filter(Boolean);
        } else if (Array.isArray(config.groupIds)) {
          groups = config.groupIds.map(s => String(s).trim()).filter(Boolean);
        }

        for (let i = 0; i < Math.min(groups.length, maxCount); i++) {
          await this.checkInterruption(context);
          const g = groups[i];
          const groupUrl = g.startsWith('http') ? g : `https://www.facebook.com/groups/${g}`;
          context.logger(`Mở nhóm ${groupUrl}...`, 'INFO');

          await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
          await this.randomSleep(3, 5);

          const joinBtn = await page.$('div[aria-label="Tham gia nhóm"][role="button"], div[role="button"]:has-text("Tham gia nhóm")');
          if (joinBtn) {
            await joinBtn.click();
            await this.randomSleep(2, 4);
            await this.handleApprovalQuestions(page, context, config);
            joinedCount++;
            context.logger(`Đã tham gia nhóm ${g} thành công!`, 'SUCCESS');
          } else {
            context.logger(`Không thấy nút tham gia nhóm ${g} (có thể đã tham gia rồi)`, 'INFO');
          }

          if (i < maxCount - 1) {
            const delay = Math.floor(Math.random() * ((config.delayMaxSec || 20) - (config.delayMinSec || 8) + 1) + (config.delayMinSec || 8));
            await this.randomSleep(delay, delay);
          }
        }
      }

      return {
        success: joinedCount > 0,
        message: `Đã gửi yêu cầu tham gia ${joinedCount} nhóm`,
        stats: { joinedGroups: joinedCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi tham gia nhóm: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async handleApprovalQuestions(page: Page, context: ActionExecutionContext, config: JoinGroupConfig): Promise<void> {
    try {
      // 1. Kiểm tra có ô nhập câu hỏi không
      const questionInputs = await page.$$('textarea, input[type="text"]');
      if (questionInputs.length > 0) {
        context.logger(`Phát hiện ${questionInputs.length} câu hỏi xét duyệt, tự động điền câu trả lời...`, 'INFO');
        for (const input of questionInputs) {
          try {
            await input.fill(config.defaultAnswer || 'Đồng ý với mọi quy tắc của nhóm ạ!');
            await this.randomSleep(1, 2);
          } catch {}
        }
      }

      // 2. Tự động tích vào ô checkbox "Tôi đồng ý với quy tắc của nhóm"
      const checkboxes = await page.$$('input[type="checkbox"]');
      for (const cb of checkboxes) {
        try {
          const isChecked = await cb.isChecked();
          if (!isChecked) await cb.check();
        } catch {}
      }

      // 3. Bấm nút "Gửi" / "Submit"
      const submitSelectors = [
        'div[aria-label="Gửi"][role="button"]',
        'div[aria-label="Submit"][role="button"]',
        'div[role="button"]:has-text("Gửi")',
        'div[role="button"]:has-text("Submit")',
      ];
      await this.safeClick(page, submitSelectors, { timeoutMs: 5000 });
      await this.randomSleep(1, 2);
    } catch {
      // Không có câu hỏi xét duyệt thì bỏ qua
    }
  }
}
