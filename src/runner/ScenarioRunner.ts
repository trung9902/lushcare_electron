/**
 * LushCare Electron - Scenario Runner
 * Đơn vị thực thi kịch bản cho một tài khoản Facebook cụ thể.
 * Quy trình: Phân bổ Proxy -> Mở trình duyệt Profile cô lập -> Kiểm tra Login & Vượt 2FA
 * -> Chạy chuỗi hành động Pipeline -> Ghi nhận log & trạng thái realtime -> Đóng và giải phóng tài nguyên.
 */

import { authenticator } from 'otplib';
import {
  AccountEntity,
  ScenarioEntity,
  RunnerConfig,
  ThreadStatusEvent,
  LiveLogEvent,
} from '../shared/types';
import { actionRegistry } from '../actions/ActionRegistry';
import { ActionExecutionContext } from '../actions/BaseAction';
import { proxyManager } from '../proxy/ProxyManager';
import { IBrowserManager, IDatabaseAdapter, defaultBrowserManager, defaultDatabaseAdapter } from './adapters';

export interface ScenarioRunnerOptions {
  account: AccountEntity;
  scenario: ScenarioEntity;
  runnerConfig: RunnerConfig;
  threadIndex: number;
  sessionId: string;
  browserManager?: IBrowserManager;
  dbAdapter?: IDatabaseAdapter;
  isAborted: () => boolean;
  isPaused: () => boolean;
  waitIfPaused: () => Promise<void>;
  onStatus: (event: ThreadStatusEvent) => void;
  onLog: (event: LiveLogEvent) => void;
}

export interface ScenarioRunnerResult {
  success: boolean;
  accountId: number;
  uid: string;
  completedActions: number;
  totalActions: number;
  checkpointHit?: string | null;
  error?: string;
}

export class ScenarioRunner {
  /**
   * Thực thi toàn bộ quy trình kịch bản cho một tài khoản
   */
  public static async run(options: ScenarioRunnerOptions): Promise<ScenarioRunnerResult> {
    const {
      account,
      scenario,
      runnerConfig,
      threadIndex,
      sessionId,
      isAborted,
      isPaused,
      waitIfPaused,
      onStatus,
      onLog,
    } = options;

    const browserManager = options.browserManager || defaultBrowserManager;
    const dbAdapter = options.dbAdapter || defaultDatabaseAdapter;

    const accountId = account.id;
    const uid = account.uid || String(accountId);

    const log = (message: string, level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS' = 'INFO', actionName?: string) => {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      onLog({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        timestamp: timeStr,
        accountId,
        uid,
        level,
        actionName,
        message,
      });
    };

    const updateStatus = (
      statusText: string,
      currentActionIndex = 0,
      totalActions = 0,
      progressPercent = 0,
      isFinished = false,
      info?: string,
      errorMessage?: string
    ) => {
      onStatus({
        sessionId,
        threadIndex,
        accountId,
        uid,
        status: statusText,
        info,
        currentActionIndex,
        totalActions,
        progressPercent,
        isFinished,
        errorMessage,
        updatedAt: Date.now(),
      });
    };

    log(`Khởi tạo tiến trình chạy kịch bản: "${scenario.name}"`, 'INFO');
    updateStatus('Chuẩn bị khởi chạy...', 0, scenario.actions.length, 5);

    let activeProxy = account.proxy || undefined;

    try {
      if (isAborted()) {
        updateStatus('Đã hủy', 0, scenario.actions.length, 0, true);
        return { success: false, accountId, uid, completedActions: 0, totalActions: scenario.actions.length, error: 'Aborted' };
      }

      // ==========================================
      // 1. PHÂN BỔ & KIỂM TRA PROXY
      // ==========================================
      const proxyType = (runnerConfig.proxyType || 'NONE').toUpperCase();
      if (proxyType !== 'NONE') {
        log(`Đang cấu hình Proxy dạng ${proxyType}...`, 'INFO');

        if (proxyType === 'MINPROXY' && runnerConfig.proxyApiKeys && runnerConfig.proxyApiKeys.length > 0) {
          const apiKey = runnerConfig.proxyApiKeys[threadIndex % runnerConfig.proxyApiKeys.length];
          const rotateRes = await proxyManager.rotateProxy({ proxyType: 'minproxy', apiKey });
          if (rotateRes.success && rotateRes.newProxyString) {
            activeProxy = rotateRes.newProxyString;
            log(`Lấy IP mới từ MinProxy thành công: ${rotateRes.newProxyString}`, 'SUCCESS');
          } else {
            log(`Không xoay được IP MinProxy: ${rotateRes.message}. Thử dùng proxy hiện tại.`, 'WARN');
          }
        } else if (proxyType === 'XPROXY') {
          const rotateRes = await proxyManager.rotateProxy({ proxyType: 'xproxy', proxyString: activeProxy });
          log(`Gửi lệnh xoay XProxy: ${rotateRes.message}`, rotateRes.success ? 'INFO' : 'WARN');
        } else if (proxyType === 'SHOPLIKE' && runnerConfig.proxyApiKeys && runnerConfig.proxyApiKeys.length > 0) {
          const apiKey = runnerConfig.proxyApiKeys[threadIndex % runnerConfig.proxyApiKeys.length];
          const rotateRes = await proxyManager.rotateProxy({ proxyType: 'shoplike', apiKey });
          if (rotateRes.success && rotateRes.newProxyString) {
            activeProxy = rotateRes.newProxyString;
          }
        }

        // Kiểm tra kết nối proxy nếu có proxy
        if (activeProxy) {
          updateStatus('Kiểm tra Proxy...', 0, scenario.actions.length, 10);
          const checkRes = await proxyManager.checkProxy(activeProxy, 8000);
          if (!checkRes.isAlive) {
            log(`Proxy ${activeProxy} không phản hồi: ${checkRes.errorMessage}`, 'WARN');
          } else {
            log(`Proxy hoạt động tốt: IP ngoại mạng ${checkRes.publicIp || 'N/A'}, ping ${checkRes.responseTimeMs}ms`, 'SUCCESS');
          }
        }
      }

      if (isAborted()) {
        updateStatus('Đã hủy', 0, scenario.actions.length, 0, true);
        return { success: false, accountId, uid, completedActions: 0, totalActions: scenario.actions.length, error: 'Aborted' };
      }

      // ==========================================
      // 2. KHỞI CHẠY TRÌNH DUYỆT PLAYWRIGHT
      // ==========================================
      log(`Mở trình duyệt Profile cô lập cho UID ${uid}...`, 'INFO');
      updateStatus('Đang mở trình duyệt...', 0, scenario.actions.length, 15);

      const session = await browserManager.launch({
        accountId,
        uid,
        pass: account.pass || undefined,
        cookie: (account.cookie || account.cookie1) || undefined,
        fa2: account.fa2 || undefined,
        customProxy: activeProxy,
        headless: runnerConfig.headless ?? false,
        windowIndex: threadIndex,
        useragent: account.useragent || undefined,
        autoLogin: true,
      });

      const page = session.page;

      // ==========================================
      // 3. KIỂM TRA PHIÊN ĐĂNG NHẬP & VƯỢT 2FA
      // ==========================================
      updateStatus('Đang đăng nhập Facebook...', 0, scenario.actions.length, 20);
      try {
        if (browserManager.login) {
          const loginRes = await browserManager.login(accountId, {
            accountId,
            uid,
            pass: account.pass || '',
            cookie: account.cookie || account.cookie1 || '',
            fa2: account.fa2 || '',
            mode: 'cookie_pass',
          });
          if (loginRes.success) {
            log(`Đăng nhập Facebook thành công cho UID ${uid}!`, 'SUCCESS');
          } else {
            log(`Đang tiếp tục với trạng thái: ${loginRes.errorMessage || 'Sẵn sàng'}`, 'INFO');
          }
        }
      } catch (loginErr: any) {
        log(`Cảnh báo tiến trình đăng nhập: ${loginErr?.message || loginErr}`, 'WARN');
      }

      // Kiểm tra Checkpoint
      const currentUrl = page.url();
      if (currentUrl.includes('/checkpoint/')) {
        let checkpointType = 'Checkpoint';
        if (currentUrl.includes('/checkpoint/1501') || currentUrl.includes('82')) {
          checkpointType = 'Checkpoint 282';
        } else {
          checkpointType = 'Checkpoint 956';
        }

        log(`Tài khoản bị ${checkpointType}! Dừng kịch bản để tránh bị vô hiệu hóa nặng hơn.`, 'WARN');
        await dbAdapter.updateAccountStatus(accountId, checkpointType, checkpointType);
        updateStatus(checkpointType, 0, scenario.actions.length, 100, true, checkpointType);

        await browserManager.close(accountId);
        return {
          success: false,
          accountId,
          uid,
          completedActions: 0,
          totalActions: scenario.actions.length,
          checkpointHit: checkpointType,
          error: checkpointType,
        };
      }

      // ==========================================
      // 4. THỰC THI CHUỖI HÀNH ĐỘNG (PIPELINE)
      // ==========================================
      const sortedActions = [...scenario.actions].sort((a, b) => a.orderIndex - b.orderIndex);
      const totalActions = sortedActions.length;
      let completedCount = 0;

      for (let i = 0; i < sortedActions.length; i++) {
        if (isAborted()) {
          log('Nhận tín hiệu dừng khẩn cấp từ người dùng.', 'WARN');
          break;
        }

        if (isPaused()) {
          log('Luồng đang tạm dừng theo yêu cầu...', 'WARN');
          updateStatus('Tạm dừng', i + 1, totalActions, Math.round((i / totalActions) * 100));
          await waitIfPaused();
          log('Tiếp tục chạy kịch bản sau khi tạm dừng.', 'INFO');
        }

        const actionEntity = sortedActions[i];
        const actionRunner = actionRegistry.get(actionEntity.actionCode);

        if (!actionRunner) {
          log(`Bỏ qua hành động không nhận diện được: "${actionEntity.actionCode}"`, 'WARN');
          continue;
        }

        const progressPercent = Math.round(((i + 1) / totalActions) * 100);
        const actionDisplay = `${actionRunner.name} (${i + 1}/${totalActions})`;
        updateStatus(`Đang chạy: ${actionDisplay}`, i + 1, totalActions, progressPercent);
        log(`Bước ${i + 1}/${totalActions}: Bắt đầu "${actionRunner.name}"`, 'INFO', actionRunner.name);

        // Parse cấu hình JSON của hành động
        let actionConfig: Record<string, any> = {};
        try {
          if (actionEntity.configJson) {
            actionConfig = JSON.parse(actionEntity.configJson);
          }
        } catch {
          actionConfig = {};
        }

        // Tạo Execution Context cho hành động
        const executionContext: ActionExecutionContext = {
          accountId,
          uid,
          account,
          logger: (msg, lvl) => log(msg, lvl || 'INFO', actionRunner.name),
          isAborted,
          isPaused,
          waitIfPaused,
          proxyString: activeProxy,
        };

        const actionResult = await actionRunner.execute(page, executionContext, actionConfig);

        if (actionResult.checkpointHit) {
          log(`Phát hiện tài khoản bị dính ${actionResult.checkpointHit}!`, 'WARN');
          await dbAdapter.updateAccountStatus(accountId, `Checkpoint ${actionResult.checkpointHit}`, `Checkpoint ${actionResult.checkpointHit}`);
          updateStatus(`Bị Checkpoint ${actionResult.checkpointHit}`, i + 1, totalActions, progressPercent, true);
          await browserManager.close(accountId);
          return {
            success: false,
            accountId,
            uid,
            completedActions: completedCount,
            totalActions,
            checkpointHit: actionResult.checkpointHit,
            error: `Checkpoint ${actionResult.checkpointHit}`,
          };
        }

        if (actionResult.interrupted) {
          log(`Hành động "${actionRunner.name}" bị hủy.`, 'WARN');
          break;
        }

        if (actionResult.success) {
          completedCount++;
          log(`Bước ${i + 1}/${totalActions}: Hoàn thành "${actionRunner.name}"`, 'SUCCESS', actionRunner.name);
        } else {
          log(`Bước ${i + 1}/${totalActions}: "${actionRunner.name}" thất bại (${actionResult.error || 'Lỗi không rõ'})`, 'WARN', actionRunner.name);
        }

        // Nghỉ an toàn giữa các bước hành động
        if (i < sortedActions.length - 1 && !isAborted()) {
          const delaySec = runnerConfig.delayPerThreadSec || Math.floor(Math.random() * 3 + 2);
          log(`Nghỉ ${delaySec}s trước khi chuyển sang bước tiếp theo...`, 'INFO');
          await new Promise((r) => setTimeout(r, delaySec * 1000));
        }
      }

      // ==========================================
      // 5. HOÀN THÀNH & DỌN DẸP
      // ==========================================
      log('Đang đóng trình duyệt và hoàn tất phiên làm việc...', 'INFO');
      await browserManager.close(accountId);

      const finalStatus = completedCount === totalActions ? 'Hoàn thành' : `Xong (${completedCount}/${totalActions})`;
      await dbAdapter.updateAccountStatus(accountId, finalStatus, 'Live');
      updateStatus(finalStatus, totalActions, totalActions, 100, true, 'Live');

      log(`Kịch bản hoàn tất thành công: ${completedCount}/${totalActions} bước.`, 'SUCCESS');

      return {
        success: completedCount > 0,
        accountId,
        uid,
        completedActions: completedCount,
        totalActions,
      };
    } catch (err: any) {
      log(`Lỗi nghiêm trọng khi thực thi kịch bản: ${err?.message || err}`, 'ERROR');
      await browserManager.close(accountId).catch(() => {});
      await dbAdapter.updateAccountStatus(accountId, 'Lỗi', 'Lỗi');
      updateStatus('Lỗi thực thi', 0, scenario.actions.length, 100, true, 'Lỗi', err?.message || String(err));

      return {
        success: false,
        accountId,
        uid,
        completedActions: 0,
        totalActions: scenario.actions.length,
        error: err?.message || String(err),
      };
    }
  }
}
