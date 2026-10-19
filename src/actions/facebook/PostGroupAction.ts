/**
 * VMAX Tech - Post Group Action
 * Hành động: Đăng Bài Vào Hội Nhóm Facebook
 * Mô tả: Truy cập các nhóm Facebook (theo danh sách ID hoặc nhóm đã tham gia),
 * mở khung đăng bài, bóc tách Spin Text, đính kèm ảnh và đăng bài.
 */

import type { Page } from 'playwright-core';
import { BaseAction, ActionResult, ActionExecutionContext } from '../BaseAction';
import { spinText } from '../../utils/spinText';

export interface PostGroupConfig {
  mode?: 'joined_groups' | 'group_ids';
  groupIds?: string[] | string;
  content?: string;
  groupCountMin?: number;
  groupCountMax?: number;
  delayMinSec?: number;
  delayMaxSec?: number;
  postAsAnonymous?: boolean;
}

export class PostGroupAction extends BaseAction<PostGroupConfig> {
  readonly actionCode = 'fHDDangBaiNhom';
  readonly name = 'Đăng Bài Vào Hội Nhóm Facebook';
  readonly category = 'groups';
  readonly description = 'Tự động đăng bài viết vào các nhóm đã tham gia hoặc theo danh sách ID nhóm chỉ định kèm Spin Text';

  readonly defaultConfig: PostGroupConfig = {
    mode: 'joined_groups',
    groupIds: [],
    content: '{Chào anh chị em trong nhóm|Xin chào mọi người|Hello cả nhà}! {Chúc {cả nhóm|mọi người} ngày mới nhiều niềm vui|Bài viết chia sẻ thông tin hữu ích} {nha|nhé|ạ}!',
    groupCountMin: 1,
    groupCountMax: 3,
    delayMinSec: 10,
    delayMaxSec: 25,
    postAsAnonymous: false,
  };

  async execute(page: Page, context: ActionExecutionContext, rawConfig: PostGroupConfig): Promise<ActionResult> {
    const config = { ...this.defaultConfig, ...rawConfig };
    context.logger('Bắt đầu hành động: Đăng bài vào hội nhóm', 'INFO');

    try {
      const checkpoint = await this.detectCheckpoint(page);
      if (checkpoint) {
        context.logger(`Phát hiện Checkpoint ${checkpoint}!`, 'WARN');
        return { success: false, checkpointHit: checkpoint, message: `Bị Checkpoint ${checkpoint}` };
      }

      let targetGroups: string[] = [];
      if (typeof config.groupIds === 'string') {
        targetGroups = config.groupIds.split(/[\n,;|]+/).map(s => s.trim()).filter(Boolean);
      } else if (Array.isArray(config.groupIds)) {
        targetGroups = config.groupIds.map(s => String(s).trim()).filter(Boolean);
      }

      const countMin = config.groupCountMin ?? 1;
      const countMax = Math.max(countMin, config.groupCountMax ?? 3);
      const targetCount = Math.floor(Math.random() * (countMax - countMin + 1) + countMin);

      let successCount = 0;

      if (targetGroups.length > 0) {
        // Đăng theo danh sách Group ID
        for (let i = 0; i < Math.min(targetGroups.length, targetCount); i++) {
          await this.checkInterruption(context);
          const gId = targetGroups[i];
          const groupUrl = gId.startsWith('http') ? gId : `https://www.facebook.com/groups/${gId}`;
          context.logger(`Truy cập nhóm ${gId}...`, 'INFO');

          const posted = await this.postToOneGroup(page, context, groupUrl, config);
          if (posted) successCount++;

          if (i < targetCount - 1) {
            const delay = Math.floor(Math.random() * ((config.delayMaxSec || 25) - (config.delayMinSec || 10) + 1) + (config.delayMinSec || 10));
            context.logger(`Nghỉ ${delay}s trước khi đăng nhóm tiếp theo...`, 'INFO');
            await this.randomSleep(delay, delay);
          }
        }
      } else {
        // Đăng vào nhóm từ trang https://www.facebook.com/groups/joins
        context.logger('Mở danh sách các nhóm đã tham gia...', 'INFO');
        await page.goto('https://www.facebook.com/groups/joins', { waitUntil: 'domcontentloaded', timeout: 30000 });
        await this.randomSleep(3, 5);

        const groupLinks = await page.$$eval('a[href*="/groups/"]', (anchors) => {
          const links: string[] = [];
          for (const a of anchors) {
            const href = (a as HTMLAnchorElement).href;
            if (href && href.includes('/groups/') && !href.includes('/joins') && !href.includes('/feed')) {
              const clean = href.split('?')[0];
              if (!links.includes(clean)) links.push(clean);
            }
          }
          return links;
        });

        context.logger(`Tìm thấy ${groupLinks.length} nhóm đã tham gia.`, 'INFO');

        for (let i = 0; i < Math.min(groupLinks.length, targetCount); i++) {
          await this.checkInterruption(context);
          const url = groupLinks[i];
          context.logger(`Đang đăng bài vào nhóm: ${url}...`, 'INFO');

          const posted = await this.postToOneGroup(page, context, url, config);
          if (posted) successCount++;

          if (i < targetCount - 1) {
            const delay = Math.floor(Math.random() * ((config.delayMaxSec || 25) - (config.delayMinSec || 10) + 1) + (config.delayMinSec || 10));
            await this.randomSleep(delay, delay);
          }
        }
      }

      return {
        success: successCount > 0,
        message: `Đã đăng thành công vào ${successCount} nhóm`,
        stats: { postedGroups: successCount },
      };
    } catch (err: any) {
      context.logger(`Lỗi khi đăng bài vào nhóm: ${err?.message || err}`, 'ERROR');
      return { success: false, error: err?.message || String(err) };
    }
  }

  private async postToOneGroup(page: Page, context: ActionExecutionContext, groupUrl: string, config: PostGroupConfig): Promise<boolean> {
    try {
      await page.goto(groupUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await this.randomSleep(3, 5);

      // Tìm nút "Bạn viết gì đi..." trong nhóm
      const postBoxSelectors = [
        'div[role="button"]:has-text("Bạn viết gì đi...")',
        'div[role="button"]:has-text("Tạo bài viết công khai...")',
        'div[role="button"]:has-text("Viết gì đó...")',
        'div[role="button"]:has-text("Write something...")',
        'div[role="button"]:has-text("Create a public post...")',
        'span:has-text("Bạn viết gì đi...")',
      ];

      const opened = await this.safeClick(page, postBoxSelectors, { timeoutMs: 8000 });
      if (!opened) {
        context.logger(`Không tìm thấy ô đăng bài trong nhóm ${groupUrl} (có thể bị chặn đăng hoặc chưa được duyệt vào nhóm)`, 'WARN');
        return false;
      }

      await this.randomSleep(2, 4);

      // Tìm khung soạn thảo
      const editorSelector = 'div[role="textbox"][contenteditable="true"]';
      await page.waitForSelector(editorSelector, { state: 'visible', timeout: 10000 });

      // Bóc tách Spin Text
      const text = spinText(config.content || this.defaultConfig.content!);
      context.logger(`Nhập nội dung bài đăng: "${text.substring(0, 60)}..."`, 'INFO');

      await this.humanType(page, editorSelector, text);
      await this.randomSleep(2, 3);

      // Bấm nút Đăng
      const submitSelectors = [
        'div[aria-label="Đăng"][role="button"]',
        'div[aria-label="Post"][role="button"]',
        'div[role="button"]:has-text("Đăng")',
        'div[role="button"]:has-text("Post")',
      ];

      const posted = await this.safeClick(page, submitSelectors, { timeoutMs: 8000 });
      if (posted) {
        context.logger('Đã bấm nút Đăng bài nhóm thành công!', 'SUCCESS');
        await this.randomSleep(3, 5);
        return true;
      }
      return false;
    } catch (e: any) {
      context.logger(`Lỗi tại nhóm ${groupUrl}: ${e?.message || e}`, 'WARN');
      return false;
    }
  }
}
