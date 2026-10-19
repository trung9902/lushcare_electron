import { ipcMain } from 'electron';
import {
  initDatabase,
  query,
  queryOne,
  run,
} from '../../database/db';
import { accountRepository } from '../../database/repositories/AccountRepository';
import { folderRepository } from '../../database/repositories/FolderRepository';
import { scenarioRepository } from '../../database/repositories/ScenarioRepository';
import { importExportService } from '../../database/services/ImportExportService';
import {
  AccountBatchUpdatePayload,
  AccountEntity,
  AccountExportPayload,
  AccountFilterPayload,
  AccountImportPayload,
  ActionCreatePayload,
  ActionReorderPayload,
  ErrorCodes,
  FolderCreatePayload,
  IpcResponse,
} from '../../shared/types';

function successResponse<T>(data: T): IpcResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

function errorResponse(code: string, message: string, details?: any): IpcResponse {
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
 * Đăng ký toàn bộ các kênh IPC liên quan đến Database (Accounts, Folders, Scenarios, Actions, Settings)
 */
export async function registerDatabaseIpc(): Promise<void> {
  // Đảm bảo CSDL được khởi tạo trước khi lắng nghe IPC
  try {
    await initDatabase();
  } catch (err: any) {
    console.error('[DatabaseIPC] Không thể khởi tạo CSDL:', err);
  }

  const safeHandle = (channel: string, handler: (...args: any[]) => Promise<any> | any) => {
    try {
      ipcMain.removeHandler(channel);
    } catch {}

    ipcMain.handle(channel, async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (err: any) {
        console.error(`[DatabaseIPC] Lỗi xử lý kênh '${channel}':`, err);
        return errorResponse(
          ErrorCodes.ERR_DB_QUERY_FAILED,
          err?.message || `Lỗi thực thi truy vấn cơ sở dữ liệu trên kênh ${channel}`,
          err?.stack
        );
      }
    });
  };

  // ==========================================
  // 1. ACCOUNTS IPC HANDLERS
  // ==========================================

  // accounts:getAll
  safeHandle('accounts:getAll', async (_event, filter: AccountFilterPayload = {}) => {
    const result = accountRepository.getAll(filter);
    return successResponse(result);
  });

  // accounts:getById
  safeHandle('accounts:getById', async (_event, id: number) => {
    if (!id) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp ID tài khoản');
    }
    const acc = accountRepository.getById(id);
    if (!acc) {
      return errorResponse(ErrorCodes.ERR_RECORD_NOT_FOUND, `Không tìm thấy tài khoản ID ${id}`);
    }
    return successResponse(acc);
  });

  // accounts:create
  safeHandle('accounts:create', async (_event, account: Partial<AccountEntity>) => {
    if (!account || !account.uid) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Tài khoản cần có tối thiểu Facebook UID');
    }
    const created = accountRepository.create(account);
    return successResponse(created);
  });

  // accounts:update
  safeHandle('accounts:update', async (_event, arg1: any, arg2?: any) => {
    let id: number;
    let updates: Partial<AccountEntity>;

    if (typeof arg1 === 'number') {
      id = arg1;
      updates = arg2 || {};
    } else if (arg1 && typeof arg1 === 'object' && arg1.id) {
      id = arg1.id;
      updates = arg1.updates || arg1;
    } else {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp ID tài khoản để cập nhật');
    }

    const ok = accountRepository.update(id, updates);
    return successResponse(ok);
  });

  // accounts:batchUpdate
  safeHandle(
    'accounts:batchUpdate',
    async (_event, payload: AccountBatchUpdatePayload & { ids?: number[] }) => {
      const ids = payload.accountIds || payload.ids;
      if (!ids || ids.length === 0) {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Danh sách accountIds không được rỗng');
      }
      const result = accountRepository.bulkUpdate(ids, payload.updates || {});
      return successResponse(result);
    }
  );

  // accounts:delete
  safeHandle('accounts:delete', async (_event, ids: number[], softDelete = true) => {
    if (!ids || ids.length === 0) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Danh sách IDs xóa không được rỗng');
    }
    const result = accountRepository.delete(ids, softDelete);
    return successResponse(result);
  });

  // accounts:import
  safeHandle('accounts:import', async (_event, payload: AccountImportPayload) => {
    if (!payload) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp payload nhập dữ liệu');
    }
    const result = importExportService.importAccounts(payload);
    return successResponse(result);
  });

  // accounts:export
  safeHandle('accounts:export', async (_event, payload: AccountExportPayload) => {
    if (!payload) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp payload xuất dữ liệu');
    }
    const result = importExportService.exportAccounts(payload);
    return successResponse(result);
  });

  // accounts:moveToFolder
  safeHandle(
    'accounts:moveToFolder',
    async (_event, arg1: any, arg2?: any) => {
      let accountIds: number[];
      let targetFolderId: number;

      if (Array.isArray(arg1)) {
        accountIds = arg1;
        targetFolderId = Number(arg2);
      } else if (arg1 && typeof arg1 === 'object') {
        accountIds = arg1.accountIds || [];
        targetFolderId = Number(arg1.targetFolderId);
      } else {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Payload moveToFolder không hợp lệ');
      }

      if (!accountIds || accountIds.length === 0 || !targetFolderId) {
        return errorResponse(
          ErrorCodes.ERR_INVALID_PAYLOAD,
          'accountIds và targetFolderId là bắt buộc'
        );
      }

      const ok = accountRepository.moveToFolder(accountIds, targetFolderId);
      return successResponse(ok);
    }
  );

  // accounts:getTrash
  safeHandle('accounts:getTrash', async () => {
    const list = accountRepository.getTrash();
    return successResponse(list);
  });

  // accounts:restoreFromTrash
  safeHandle('accounts:restoreFromTrash', async (_event, ids: number[]) => {
    if (!ids || ids.length === 0) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Danh sách IDs khôi phục không được rỗng');
    }
    const result = accountRepository.restoreFromTrash(ids);
    return successResponse(result);
  });

  // accounts:emptyTrash
  safeHandle('accounts:emptyTrash', async () => {
    const result = accountRepository.emptyTrash();
    return successResponse(result);
  });

  // ==========================================
  // 2. FOLDERS IPC HANDLERS
  // ==========================================

  // folders:getAll
  safeHandle('folders:getAll', async () => {
    const list = folderRepository.getAll();
    return successResponse(list);
  });

  // folders:create
  safeHandle('folders:create', async (_event, arg: string | FolderCreatePayload, sttArg?: number) => {
    let name: string;
    let stt: number | undefined;

    if (typeof arg === 'string') {
      name = arg;
      stt = sttArg;
    } else if (arg && typeof arg === 'object') {
      name = arg.name;
      stt = arg.STT;
    } else {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Tên thư mục không hợp lệ');
    }

    if (!name || name.trim() === '') {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Tên thư mục không được để trống');
    }

    const created = folderRepository.create(name, stt);
    return successResponse(created);
  });

  // folders:update
  safeHandle('folders:update', async (_event, arg1: any, arg2?: any, arg3?: any) => {
    let id: number;
    let name: string;
    let stt: number | undefined;

    if (typeof arg1 === 'number') {
      id = arg1;
      name = arg2;
      stt = arg3;
    } else if (arg1 && typeof arg1 === 'object') {
      id = arg1.id;
      name = arg1.name;
      stt = arg1.STT;
    } else {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Payload cập nhật thư mục không hợp lệ');
    }

    const ok = folderRepository.update(id, name, stt);
    return successResponse(ok);
  });

  // folders:delete
  safeHandle(
    'folders:delete',
    async (_event, arg1: any, arg2?: boolean) => {
      let id: number;
      let deleteAccountsPermanently = false;

      if (typeof arg1 === 'number') {
        id = arg1;
        deleteAccountsPermanently = Boolean(arg2);
      } else if (arg1 && typeof arg1 === 'object') {
        id = arg1.id;
        deleteAccountsPermanently = Boolean(arg1.deleteAccountsPermanently);
      } else {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'ID thư mục không hợp lệ');
      }

      const ok = folderRepository.delete(id, deleteAccountsPermanently);
      return successResponse(ok);
    }
  );

  // folders:reorder
  safeHandle('folders:reorder', async (_event, folderIds: number[]) => {
    if (!folderIds || !Array.isArray(folderIds)) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'folderIds phải là một mảng số');
    }
    const ok = folderRepository.reorder(folderIds);
    return successResponse(ok);
  });

  // ==========================================
  // 3. SCENARIOS & ACTIONS IPC HANDLERS
  // ==========================================

  // scenarios:getAll
  safeHandle('scenarios:getAll', async () => {
    const list = scenarioRepository.getAll();
    return successResponse(list);
  });

  // scenarios:getById
  safeHandle('scenarios:getById', async (_event, arg: number | { scenarioId: number }) => {
    const id = typeof arg === 'number' ? arg : arg?.scenarioId;
    if (!id) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp ID kịch bản');
    }
    const scenario = scenarioRepository.getById(id);
    if (!scenario) {
      return errorResponse(ErrorCodes.ERR_RECORD_NOT_FOUND, `Không tìm thấy kịch bản ID ${id}`);
    }
    return successResponse(scenario);
  });

  // scenarios:create
  safeHandle(
    'scenarios:create',
    async (_event, nameOrPayload: string | { name: string; config?: Record<string, any> }, config?: Record<string, any>) => {
      let name: string;
      let cfg: Record<string, any> | undefined;

      if (typeof nameOrPayload === 'string') {
        name = nameOrPayload;
        cfg = config;
      } else if (nameOrPayload && typeof nameOrPayload === 'object') {
        name = nameOrPayload.name;
        cfg = nameOrPayload.config;
      } else {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Tên kịch bản không hợp lệ');
      }

      const created = scenarioRepository.create(name, cfg || {});
      return successResponse(created);
    }
  );

  // scenarios:update
  safeHandle(
    'scenarios:update',
    async (_event, id: number, name: string, config?: Record<string, any>) => {
      if (!id || !name) {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'id và name là bắt buộc');
      }
      const ok = scenarioRepository.update(id, name, config);
      return successResponse(ok);
    }
  );

  // scenarios:delete
  safeHandle('scenarios:delete', async (_event, id: number) => {
    if (!id) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp ID kịch bản để xóa');
    }
    const ok = scenarioRepository.delete(id);
    return successResponse(ok);
  });

  // scenarios:duplicate
  safeHandle('scenarios:duplicate', async (_event, id: number) => {
    if (!id) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Cần cung cấp ID kịch bản để nhân bản');
    }
    const result = scenarioRepository.duplicate(id);
    return successResponse(result);
  });

  // actions:getAllTypes
  safeHandle('actions:getAllTypes', async () => {
    const list = scenarioRepository.getAllActionTypes();
    return successResponse(list);
  });

  // actions:create
  safeHandle('actions:create', async (_event, payload: ActionCreatePayload) => {
    if (!payload || !payload.scenarioId) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'scenarioId là bắt buộc');
    }
    const created = scenarioRepository.createAction(payload);
    return successResponse(created);
  });

  // actions:update
  safeHandle(
    'actions:update',
    async (_event, id: number, name: string, config: Record<string, any>) => {
      if (!id) {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'ID hành động là bắt buộc');
      }
      const ok = scenarioRepository.updateAction(id, name, config);
      return successResponse(ok);
    }
  );

  // actions:delete
  safeHandle('actions:delete', async (_event, id: number) => {
    if (!id) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'ID hành động là bắt buộc');
    }
    const ok = scenarioRepository.deleteAction(id);
    return successResponse(ok);
  });

  // actions:reorder
  safeHandle(
    'actions:reorder',
    async (_event, arg1: any, arg2?: number[]) => {
      let scenarioId: number;
      let orderedActionIds: number[];

      if (typeof arg1 === 'number') {
        scenarioId = arg1;
        orderedActionIds = arg2 || [];
      } else if (arg1 && typeof arg1 === 'object') {
        scenarioId = arg1.scenarioId;
        orderedActionIds = arg1.orderedActionIds || arg1.actionIds || [];
      } else {
        return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Payload reorder actions không hợp lệ');
      }

      const ok = scenarioRepository.reorderActions(scenarioId, orderedActionIds);
      return successResponse(ok);
    }
  );

  // ==========================================
  // 4. SYSTEM SETTINGS IPC HANDLERS
  // ==========================================

  // settings:get
  safeHandle('settings:get', async (_event, key: string) => {
    if (!key) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Key cấu hình không được rỗng');
    }
    const row = queryOne<any>('SELECT value FROM system_settings WHERE key = ?;', [key]);
    if (!row) {
      return successResponse(null);
    }
    try {
      const parsed = JSON.parse(row.value);
      return successResponse(parsed);
    } catch {
      return successResponse(row.value);
    }
  });

  // settings:set
  safeHandle('settings:set', async (_event, key: string, value: any) => {
    if (!key) {
      return errorResponse(ErrorCodes.ERR_INVALID_PAYLOAD, 'Key cấu hình không được rỗng');
    }
    const valueStr = typeof value === 'string' ? value : JSON.stringify(value);
    run(
      `
      INSERT INTO system_settings (key, value, updated_at)
      VALUES (?, ?, datetime('now', 'localtime'))
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at;
    `,
      [key, valueStr]
    );
    return successResponse(true);
  });

  // settings:getAll
  safeHandle('settings:getAll', async () => {
    const rows = query<any>('SELECT key, value FROM system_settings;');
    const result: Record<string, any> = {};
    for (const r of rows) {
      try {
        result[r.key] = JSON.parse(r.value);
      } catch {
        result[r.key] = r.value;
      }
    }
    return successResponse(result);
  });

  console.log('[DatabaseIPC] Đã đăng ký thành công toàn bộ kênh accounts:*, folders:*, scenarios:*, actions:*, settings:*');
}
