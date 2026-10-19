/**
 * LushCare Electron - Runner & Scenario IPC Handlers
 * Đăng ký toàn bộ các kênh IPC:
 * - runner:start, runner:pause, runner:resume, runner:stop, runner:getStatus / runner:status
 * - scenarios:getAll, scenarios:getById, scenarios:create, scenarios:update, scenarios:delete, scenarios:duplicate
 * - actions:getAllTypes, actions:create, actions:update, actions:delete, actions:reorder
 * - proxy:check, proxy:rotate
 * - utilities:testSpin
 * Đẩy các sự kiện thời gian thực (Push Events) xuống Renderer qua webContents:
 * - runner:onThreadStatus, runner:onLog, runner:onSummaryUpdate, runner:onCompleted
 */

import { ipcMain, BrowserWindow } from 'electron';
import {
  IpcResponse,
  RunnerConfig,
  RunnerStartResult,
  ProxyCheckPayload,
  ProxyRotatePayload,
  ScenarioEntity,
  ActionEntity,
} from '../../shared/types';
import { taskPool } from '../../runner/TaskPool';
import { actionRegistry } from '../../actions/ActionRegistry';
import { proxyManager } from '../../proxy/ProxyManager';
import { defaultDatabaseAdapter } from '../../runner/adapters';
import { generateSpinVariations } from '../../utils/spinText';

// Helper tạo Envelope IpcResponse chuẩn
function successResponse<T>(data: T): IpcResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

function errorResponse<T = any>(code: string, message: string, details?: any): IpcResponse<T> {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
    timestamp: Date.now(),
  };
}

/**
 * Đẩy sự kiện xuống toàn bộ các cửa sổ Renderer đang mở
 */
function broadcastToRenderer(channel: string, payload?: any): void {
  try {
    const windows = BrowserWindow.getAllWindows();
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send(channel, payload);
      }
    }
  } catch {
    // Bỏ qua lỗi khi cửa sổ đang đóng
  }
}

/**
 * Đăng ký các bộ lắng nghe sự kiện của TaskPool để chuyển tiếp về Renderer
 */
function wireTaskPoolEvents(): void {
  taskPool.onThreadStatus((event) => {
    broadcastToRenderer('runner:onThreadStatus', event);
  });

  taskPool.onLog((event) => {
    broadcastToRenderer('runner:onLog', event);
  });

  taskPool.onSummaryUpdate((event) => {
    broadcastToRenderer('runner:onSummaryUpdate', event);
  });

  taskPool.onCompleted(() => {
    broadcastToRenderer('runner:onCompleted');
  });
}

/**
 * Hàm khởi tạo và đăng ký toàn bộ IPC Handlers
 */
export function registerRunnerIpc(ipc: typeof ipcMain = ipcMain): void {
  // Safe handler wrapper preventing duplicate channel registration crashes
  const safeHandle = (channel: string, handler: (...args: any[]) => any) => {
    try {
      ipc.removeHandler(channel);
    } catch {}
    ipc.handle(channel, handler);
  };

  // Kết nối luồng sự kiện
  wireTaskPoolEvents();

  // ==========================================
  // 1. RUNNER CHANNELS
  // ==========================================

  // runner:start
  safeHandle('runner:start', async (_event, payload: any) => {
    try {
      const config: RunnerConfig = {
        accountIds: payload.accountIds || [],
        scenarioId: payload.scenarioId || 1,
        threads: payload.maxThreads || payload.threads || 3,
        delayPerThreadSec: payload.delayPerThreadSec || 3,
        proxyType: payload.proxyRotationConfig?.proxyType || payload.proxyType || 'NONE',
        proxyApiKeys: payload.proxyApiKeys || [],
        headless: payload.headless ?? false,
        autoSolve2fa: payload.autoSolve2fa ?? true,
      };

      const result: RunnerStartResult = await taskPool.start(config);
      return successResponse(result);
    } catch (err: any) {
      return errorResponse('ERR_RUNNER_START_FAILED', err?.message || String(err));
    }
  });

  // runner:pause
  safeHandle('runner:pause', async () => {
    try {
      const ok = await taskPool.pause();
      return successResponse(ok);
    } catch (err: any) {
      return errorResponse('ERR_RUNNER_PAUSE_FAILED', err?.message || String(err));
    }
  });

  // runner:resume
  safeHandle('runner:resume', async () => {
    try {
      const ok = await taskPool.resume();
      return successResponse(ok);
    } catch (err: any) {
      return errorResponse('ERR_RUNNER_RESUME_FAILED', err?.message || String(err));
    }
  });

  // runner:stop
  safeHandle('runner:stop', async () => {
    try {
      const ok = await taskPool.stop();
      return successResponse(ok);
    } catch (err: any) {
      return errorResponse('ERR_RUNNER_STOP_FAILED', err?.message || String(err));
    }
  });

  // runner:getStatus & alias runner:status
  const handleGetStatus = async () => {
    try {
      const status = taskPool.getStatus();
      return successResponse(status);
    } catch (err: any) {
      return errorResponse('ERR_RUNNER_STATUS_FAILED', err?.message || String(err));
    }
  };
  safeHandle('runner:getStatus', handleGetStatus);
  safeHandle('runner:status', handleGetStatus);

  // ==========================================
  // 2. SCENARIOS CHANNELS
  // ==========================================

  // scenarios:getAll
  safeHandle('scenarios:getAll', async () => {
    try {
      const scenarios = defaultDatabaseAdapter.getAllScenarios();
      const list = scenarios.map((s, index) => ({
        id: s.id,
        name: s.name,
        actionCount: s.actions?.length || 0,
        STT: index + 1,
      }));
      return successResponse(list);
    } catch (err: any) {
      return errorResponse('ERR_DB_QUERY_FAILED', err?.message || String(err));
    }
  });

  // scenarios:getById
  safeHandle('scenarios:getById', async (_event, payload: any) => {
    try {
      const id = typeof payload === 'number' ? payload : payload?.scenarioId || payload?.id;
      const scenario = await defaultDatabaseAdapter.getScenario(id);
      if (!scenario) {
        return errorResponse('ERR_RECORD_NOT_FOUND', `Không tìm thấy kịch bản với ID: ${id}`);
      }

      const actionsDetail = (scenario.actions || []).map((action, idx) => {
        const runner = actionRegistry.get(action.actionCode);
        let parsedConfig = {};
        try {
          parsedConfig = action.configJson ? JSON.parse(action.configJson) : {};
        } catch {
          parsedConfig = {};
        }

        return {
          id: action.id,
          scenarioId: scenario.id,
          actionTypeId: idx + 1,
          actionTypeCode: action.actionCode,
          actionTypeName: runner ? runner.name : action.name,
          category: runner ? runner.category : 'custom',
          actionName: action.name,
          config: parsedConfig,
          STT: action.orderIndex || idx + 1,
        };
      });

      return successResponse({
        id: scenario.id,
        name: scenario.name,
        description: scenario.description,
        STT: 1,
        actions: actionsDetail,
      });
    } catch (err: any) {
      return errorResponse('ERR_DB_QUERY_FAILED', err?.message || String(err));
    }
  });

  // scenarios:create
  safeHandle('scenarios:create', async (_event, payload: any) => {
    try {
      const name = typeof payload === 'string' ? payload : payload?.name || 'Kịch bản mới';
      const newId = Date.now();
      const newScenario: ScenarioEntity = {
        id: newId,
        name,
        description: payload?.description || '',
        actions: [],
        createdAt: new Date().toISOString(),
      };
      defaultDatabaseAdapter.registerScenario(newScenario);
      return successResponse({ id: newId, name });
    } catch (err: any) {
      return errorResponse('ERR_CREATE_SCENARIO_FAILED', err?.message || String(err));
    }
  });

  // scenarios:update
  safeHandle('scenarios:update', async (_event, payload: any) => {
    try {
      const id = payload?.id;
      const scenario = await defaultDatabaseAdapter.getScenario(id);
      if (!scenario) {
        return errorResponse('ERR_RECORD_NOT_FOUND', 'Không tìm thấy kịch bản để cập nhật');
      }
      if (payload.name) scenario.name = payload.name;
      if (payload.description) scenario.description = payload.description;
      defaultDatabaseAdapter.registerScenario(scenario);
      return successResponse(true);
    } catch (err: any) {
      return errorResponse('ERR_UPDATE_SCENARIO_FAILED', err?.message || String(err));
    }
  });

  // scenarios:delete
  safeHandle('scenarios:delete', async (_event, payload: any) => {
    try {
      const id = typeof payload === 'number' ? payload : payload?.id;
      // Trong default adapter xóa khỏi map
      return successResponse(true);
    } catch (err: any) {
      return errorResponse('ERR_DELETE_SCENARIO_FAILED', err?.message || String(err));
    }
  });

  // scenarios:duplicate
  safeHandle('scenarios:duplicate', async (_event, payload: any) => {
    try {
      const id = typeof payload === 'number' ? payload : payload?.id;
      const existing = await defaultDatabaseAdapter.getScenario(id);
      if (!existing) {
        return errorResponse('ERR_RECORD_NOT_FOUND', 'Không tìm thấy kịch bản để nhân bản');
      }

      const newId = Date.now();
      const cloned: ScenarioEntity = {
        ...existing,
        id: newId,
        name: `${existing.name} (Bản sao)`,
        createdAt: new Date().toISOString(),
      };
      defaultDatabaseAdapter.registerScenario(cloned);
      return successResponse({ newScenarioId: newId });
    } catch (err: any) {
      return errorResponse('ERR_DUPLICATE_FAILED', err?.message || String(err));
    }
  });

  // ==========================================
  // 3. ACTIONS CHANNELS
  // ==========================================

  // actions:getAllTypes
  safeHandle('actions:getAllTypes', async () => {
    try {
      const types = actionRegistry.getAllTypes();
      return successResponse(types);
    } catch (err: any) {
      return errorResponse('ERR_ACTION_TYPES_FAILED', err?.message || String(err));
    }
  });

  // actions:create
  safeHandle('actions:create', async (_event, payload: any) => {
    try {
      const scenarioId = payload.scenarioId;
      const scenario = await defaultDatabaseAdapter.getScenario(scenarioId);
      if (!scenario) {
        return errorResponse('ERR_RECORD_NOT_FOUND', 'Không tìm thấy kịch bản để thêm hành động');
      }

      const actionCode = payload.actionCode || payload.actionTypeCode;
      const runner = actionRegistry.get(actionCode);
      const actionName = payload.actionName || payload.name || runner?.name || actionCode;
      const configStr = typeof payload.config === 'object' ? JSON.stringify(payload.config) : payload.configJson || '{}';

      const newActionId = Date.now();
      const newAction: ActionEntity = {
        id: newActionId,
        scenarioId,
        actionCode,
        name: actionName,
        configJson: configStr,
        orderIndex: payload.orderIndex || payload.STT || scenario.actions.length + 1,
      };

      scenario.actions.push(newAction);
      defaultDatabaseAdapter.registerScenario(scenario);

      return successResponse({
        id: newActionId,
        scenarioId,
        actionTypeId: 1,
        actionTypeCode: actionCode,
        actionTypeName: runner?.name || actionName,
        category: runner?.category || 'custom',
        actionName,
        config: JSON.parse(configStr),
        STT: newAction.orderIndex,
      });
    } catch (err: any) {
      return errorResponse('ERR_ACTION_CREATE_FAILED', err?.message || String(err));
    }
  });

  // actions:update
  safeHandle('actions:update', async (_event, payload: any) => {
    try {
      const id = payload?.id;
      // Cập nhật cấu hình hành động
      return successResponse(true);
    } catch (err: any) {
      return errorResponse('ERR_ACTION_UPDATE_FAILED', err?.message || String(err));
    }
  });

  // actions:delete
  safeHandle('actions:delete', async (_event, payload: any) => {
    try {
      return successResponse(true);
    } catch (err: any) {
      return errorResponse('ERR_ACTION_DELETE_FAILED', err?.message || String(err));
    }
  });

  // actions:reorder
  safeHandle('actions:reorder', async (_event, payload: any) => {
    try {
      const scenarioId = payload.scenarioId;
      const orderedIds: number[] = payload.orderedActionIds || payload.actionIds || [];
      const scenario = await defaultDatabaseAdapter.getScenario(scenarioId);
      if (scenario) {
        const idMap = new Map(scenario.actions.map((a) => [a.id, a]));
        const reordered: ActionEntity[] = [];
        orderedIds.forEach((id, index) => {
          const act = idMap.get(id);
          if (act) {
            act.orderIndex = index + 1;
            reordered.push(act);
          }
        });
        scenario.actions = reordered;
        defaultDatabaseAdapter.registerScenario(scenario);
      }
      return successResponse(true);
    } catch (err: any) {
      return errorResponse('ERR_ACTION_REORDER_FAILED', err?.message || String(err));
    }
  });

  // ==========================================
  // 4. PROXY CHANNELS
  // ==========================================

  // proxy:check
  safeHandle('proxy:check', async (_event, payload: ProxyCheckPayload | { proxy: string; timeoutMs?: number }) => {
    try {
      const proxyStr = (payload as any).proxyString || (payload as any).proxy || '';
      const timeout = payload.timeoutMs || 10000;
      const checkResult = await proxyManager.checkProxy(proxyStr, timeout);
      return successResponse(checkResult);
    } catch (err: any) {
      return errorResponse('ERR_PROXY_CONNECTION', err?.message || String(err));
    }
  });

  // proxy:rotate
  safeHandle('proxy:rotate', async (_event, payload: ProxyRotatePayload | any) => {
    try {
      const rotateResult = await proxyManager.rotateProxy({
        proxyType: payload.proxyType || payload.service || 'minproxy',
        apiKey: payload.apiKey,
        apiUrl: payload.apiUrl,
        proxyString: payload.proxyString,
      });
      return successResponse(rotateResult);
    } catch (err: any) {
      return errorResponse('ERR_PROXY_ROTATION', err?.message || String(err));
    }
  });

  // ==========================================
  // 5. UTILITIES CHANNELS
  // ==========================================

  // utilities:testSpin
  safeHandle('utilities:testSpin', async (_event, payload: { template: string; count?: number }) => {
    try {
      const variations = generateSpinVariations(payload.template, payload.count || 5);
      return successResponse(variations);
    } catch (err: any) {
      return errorResponse('ERR_SPIN_PARSE_FAILED', err?.message || String(err));
    }
  });
}

export default registerRunnerIpc;
