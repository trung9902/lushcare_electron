import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import {
  AccountEntity,
  AccountFilterPayload,
  AccountListResult,
  AccountBatchUpdatePayload,
  AccountImportPayload,
  AccountImportResult,
  AccountExportPayload,
  AccountExportResult,
  FolderItem,
  FolderListResult,
  FolderCreatePayload,
  BrowserLaunchPayload,
  BrowserLaunchResult,
  BrowserSessionInfo,
  BrowserLoginPayload,
  BrowserLoginResult,
  BrowserSolve2faPayload,
  BrowserSolve2faResult,
  GetOtpPayload,
  GetOtpResult,
  CleanProfilePayload,
  CleanProfileResult,
  ScenarioActionDetail,
  ScenarioDetailResult,
  ActionCreatePayload,
  ActionReorderPayload,
  RunnerStartPayload,
  RunnerStartResult,
  ThreadStatusEvent,
  LiveLogEvent,
  RunnerSummaryEvent,
  ProxyCheckPayload,
  ProxyCheckResult,
  ProxyRotatePayload,
  ProxyRotateResult,
  AiGeneratePayload,
  SystemInfoResult,
} from '../shared/types/contracts';
import { IpcResponse } from '../shared/types/ipc';

/**
 * Safe event listener wrapper returning an unsubscribe function
 */
function createEventListener<T>(channel: string) {
  return (callback: (data: T) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, data: T) => callback(data);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  };
}

export const api = {
  // ==========================================
  // 1. ACCOUNTS API
  // ==========================================
  accounts: {
    getAll: (filter?: AccountFilterPayload): Promise<IpcResponse<AccountListResult>> =>
      ipcRenderer.invoke('accounts:getAll', filter),
    getById: (id: number): Promise<IpcResponse<AccountEntity>> =>
      ipcRenderer.invoke('accounts:getById', id),
    create: (account: Partial<AccountEntity>): Promise<IpcResponse<AccountEntity>> =>
      ipcRenderer.invoke('accounts:create', account),
    update: (id: number, updates: Partial<AccountEntity>): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('accounts:update', id, updates),
    batchUpdate: (
      payload: AccountBatchUpdatePayload
    ): Promise<IpcResponse<{ updatedCount: number }>> =>
      ipcRenderer.invoke('accounts:batchUpdate', payload),
    delete: (ids: number[]): Promise<IpcResponse<{ deletedCount: number }>> =>
      ipcRenderer.invoke('accounts:delete', ids),
    import: (payload: AccountImportPayload): Promise<IpcResponse<AccountImportResult>> =>
      ipcRenderer.invoke('accounts:import', payload),
    export: (payload: AccountExportPayload): Promise<IpcResponse<AccountExportResult>> =>
      ipcRenderer.invoke('accounts:export', payload),
    moveToFolder: (
      accountIds: number[],
      targetFolderId: number
    ): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('accounts:moveToFolder', accountIds, targetFolderId),
    getTrash: (): Promise<IpcResponse<AccountEntity[]>> =>
      ipcRenderer.invoke('accounts:getTrash'),
    restoreFromTrash: (ids: number[]): Promise<IpcResponse<{ restoredCount: number }>> =>
      ipcRenderer.invoke('accounts:restoreFromTrash', ids),
    emptyTrash: (): Promise<IpcResponse<{ purgedCount: number }>> =>
      ipcRenderer.invoke('accounts:emptyTrash'),
  },

  // ==========================================
  // 2. FOLDERS API
  // ==========================================
  folders: {
    getAll: (): Promise<IpcResponse<FolderListResult>> =>
      ipcRenderer.invoke('folders:getAll'),
    create: (name: string, STT?: number): Promise<IpcResponse<FolderItem>> =>
      ipcRenderer.invoke('folders:create', name, STT),
    update: (id: number, name: string): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('folders:update', id, name),
    delete: (
      id: number,
      deleteAccountsPermanently?: boolean
    ): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('folders:delete', id, deleteAccountsPermanently),
    reorder: (folderIds: number[]): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('folders:reorder', folderIds),
  },

  // ==========================================
  // 3. BROWSER & AUTOMATION API
  // ==========================================
  browser: {
    launch: (payload: BrowserLaunchPayload): Promise<IpcResponse<BrowserLaunchResult>> =>
      ipcRenderer.invoke('browser:launch', payload),
    open: (payload: BrowserLaunchPayload): Promise<IpcResponse<BrowserLaunchResult>> =>
      ipcRenderer.invoke('browser:open', payload),
    close: (accountId: number): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('browser:close', accountId),
    closeAll: (): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('browser:closeAll'),
    getActiveSessions: (): Promise<IpcResponse<BrowserSessionInfo[]>> =>
      ipcRenderer.invoke('browser:getActiveSessions'),
    login: (payload: BrowserLoginPayload): Promise<IpcResponse<BrowserLoginResult>> =>
      ipcRenderer.invoke('browser:login', payload),
    solve2fa: (payload: BrowserSolve2faPayload): Promise<IpcResponse<BrowserSolve2faResult>> =>
      ipcRenderer.invoke('browser:solve2fa', payload),
    solve2FA: (payload: BrowserSolve2faPayload): Promise<IpcResponse<BrowserSolve2faResult>> =>
      ipcRenderer.invoke('browser:solve2FA', payload),
    getOtp: (payload: GetOtpPayload): Promise<IpcResponse<GetOtpResult>> =>
      ipcRenderer.invoke('browser:getOtp', payload),
    cleanProfile: (
      payload: CleanProfilePayload
    ): Promise<IpcResponse<CleanProfileResult>> =>
      ipcRenderer.invoke('browser:cleanProfile', payload),
    cleanAllProfiles: (): Promise<IpcResponse<CleanProfileResult>> =>
      ipcRenderer.invoke('browser:cleanAllProfiles'),
  },

  // ==========================================
  // 4. SCENARIOS & ACTIONS API
  // ==========================================
  scenarios: {
    getAll: (): Promise<
      IpcResponse<Array<{ id: number; name: string; actionCount: number; STT: number }>>
    > => ipcRenderer.invoke('scenarios:getAll'),
    getById: (id: number): Promise<IpcResponse<ScenarioDetailResult>> =>
      ipcRenderer.invoke('scenarios:getById', id),
    create: (
      name: string,
      config?: Record<string, any>
    ): Promise<IpcResponse<{ id: number; name: string }>> =>
      ipcRenderer.invoke('scenarios:create', name, config),
    update: (
      id: number,
      name: string,
      config?: Record<string, any>
    ): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('scenarios:update', id, name, config),
    delete: (id: number): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('scenarios:delete', id),
    duplicate: (id: number): Promise<IpcResponse<{ newScenarioId: number }>> =>
      ipcRenderer.invoke('scenarios:duplicate', id),
  },

  actions: {
    getAllTypes: (): Promise<
      IpcResponse<
        Array<{
          id: number;
          code: string;
          name: string;
          category: string;
          defaultJson: string;
        }>
      >
    > => ipcRenderer.invoke('actions:getAllTypes'),
    create: (payload: ActionCreatePayload): Promise<IpcResponse<ScenarioActionDetail>> =>
      ipcRenderer.invoke('actions:create', payload),
    update: (
      id: number,
      name: string,
      config: Record<string, any>
    ): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('actions:update', id, name, config),
    delete: (id: number): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('actions:delete', id),
    reorder: (payload: ActionReorderPayload): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('actions:reorder', payload),
  },

  // ==========================================
  // 5. RUNNER & AUTOMATION EXECUTION POOL
  // ==========================================
  runner: {
    start: (payload: RunnerStartPayload): Promise<IpcResponse<RunnerStartResult>> =>
      ipcRenderer.invoke('runner:start', payload),
    pause: (): Promise<IpcResponse<boolean>> => ipcRenderer.invoke('runner:pause'),
    resume: (): Promise<IpcResponse<boolean>> => ipcRenderer.invoke('runner:resume'),
    stop: (): Promise<IpcResponse<boolean>> => ipcRenderer.invoke('runner:stop'),
    getStatus: (): Promise<
      IpcResponse<{ isRunning: boolean; isPaused: boolean; activeThreads: number }>
    > => ipcRenderer.invoke('runner:getStatus'),

    // Stream Event Listeners
    onThreadStatus: createEventListener<ThreadStatusEvent>('runner:onThreadStatus'),
    onLog: createEventListener<LiveLogEvent>('runner:onLog'),
    onSummaryUpdate: createEventListener<RunnerSummaryEvent>('runner:onSummaryUpdate'),
    onCompleted: (callback: () => void): (() => void) => {
      const handler = () => callback();
      ipcRenderer.on('runner:onCompleted', handler);
      return () => {
        ipcRenderer.removeListener('runner:onCompleted', handler);
      };
    },
  },

  // ==========================================
  // 6. PROXY API
  // ==========================================
  proxy: {
    check: (payload: ProxyCheckPayload): Promise<IpcResponse<ProxyCheckResult>> =>
      ipcRenderer.invoke('proxy:check', payload),
    rotate: (payload: ProxyRotatePayload): Promise<IpcResponse<ProxyRotateResult>> =>
      ipcRenderer.invoke('proxy:rotate', payload),
    getAll: (): Promise<IpcResponse<any[]>> => ipcRenderer.invoke('proxy:getAll'),
    save: (payload: any): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('proxy:save', payload),
    delete: (id: number): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('proxy:delete', id),
  },

  // ==========================================
  // 7. CHECKPOINT RESOLVERS
  // ==========================================
  checkpoint: {
    solve282: (payload: any): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('checkpoint:solve282', payload),
    solve956: (payload: any): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('checkpoint:solve956', payload),
    checkImap: (payload: any): Promise<IpcResponse<any>> =>
      ipcRenderer.invoke('checkpoint:checkImap', payload),
  },

  // ==========================================
  // 8. SETTINGS & SYSTEM API
  // ==========================================
  settings: {
    get: <T = any>(key: string): Promise<IpcResponse<T>> =>
      ipcRenderer.invoke('settings:get', key),
    set: (key: string, value: any): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('settings:set', key, value),
    getAll: (): Promise<IpcResponse<Record<string, any>>> =>
      ipcRenderer.invoke('settings:getAll'),
  },

  system: {
    getInfo: (): Promise<IpcResponse<SystemInfoResult>> =>
      ipcRenderer.invoke('system:getInfo'),
    selectDirectory: (): Promise<IpcResponse<string | null>> =>
      ipcRenderer.invoke('system:selectDirectory'),
    openPath: (path: string): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('system:openPath', path),
    windowMinimize: (): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('window:minimize'),
    windowMaximize: (): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('window:maximize'),
    windowClose: (): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('window:close'),
    isMaximized: (): Promise<IpcResponse<boolean>> =>
      ipcRenderer.invoke('window:isMaximized'),
  },

  // ==========================================
  // 9. UTILITIES API
  // ==========================================
  utilities: {
    findUid: (url: string): Promise<IpcResponse<{ uid: string }>> =>
      ipcRenderer.invoke('utilities:findUid', url),
    checkLiveUid: (
      uids: string[]
    ): Promise<IpcResponse<Array<{ uid: string; isLive: boolean }>>> =>
      ipcRenderer.invoke('utilities:checkLiveUid', uids),
    testSpin: (template: string, count?: number): Promise<IpcResponse<string[]>> =>
      ipcRenderer.invoke('utilities:testSpin', template, count),
    aiGenerate: (payload: AiGeneratePayload): Promise<IpcResponse<{ generatedText: string }>> =>
      ipcRenderer.invoke('utilities:aiGenerate', payload),
  },

  // ==========================================
  // 10. GENERIC HELPERS
  // ==========================================
  invoke: <T = any>(channel: string, ...args: any[]): Promise<IpcResponse<T>> =>
    ipcRenderer.invoke(channel, ...args),
  on: (channel: string, callback: (...args: any[]) => void): (() => void) => {
    const handler = (_event: IpcRendererEvent, ...args: any[]) => callback(...args);
    ipcRenderer.on(channel, handler);
    return () => {
      ipcRenderer.removeListener(channel, handler);
    };
  },
  removeListener: (channel: string, callback: (...args: any[]) => void): void => {
    ipcRenderer.removeListener(channel, callback as any);
  },
};

// Safely expose the API object in the renderer's main world
contextBridge.exposeInMainWorld('api', api);

export type LushCareApi = typeof api;
