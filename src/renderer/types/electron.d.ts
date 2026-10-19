import {
  AccountEntity,
  FolderEntity,
  ScenarioEntity,
  ActionEntity,
  RunnerConfig,
  ThreadStatusEvent,
  LogEntryEvent,
  IpcResponse,
  AccountFilterPayload,
  AccountImportPayload,
  AccountExportPayload,
  BrowserOpenOptions
} from '@shared/types';

export interface LushCareApi {
  // Accounts API
  accounts: {
    getAll: (filter: AccountFilterPayload) => Promise<IpcResponse<{ accounts: AccountEntity[]; total: number }>>;
    getById: (id: number) => Promise<IpcResponse<AccountEntity>>;
    create: (account: Partial<AccountEntity>) => Promise<IpcResponse<AccountEntity>>;
    update: (id: number, updates: Partial<AccountEntity>) => Promise<IpcResponse<boolean>>;
    batchUpdate: (payload: { ids: number[]; updates: Partial<AccountEntity> }) => Promise<IpcResponse<{ updatedCount: number }>>;
    delete: (ids: number[]) => Promise<IpcResponse<{ deletedCount: number }>>;
    import: (payload: AccountImportPayload) => Promise<IpcResponse<{ totalImported: number; duplicatesSkipped: number; errors: string[] }>>;
    export: (payload: AccountExportPayload) => Promise<IpcResponse<{ content: string; count: number; filePath?: string }>>;
    moveToFolder: (accountIds: number[], targetFolderId: number) => Promise<IpcResponse<boolean>>;
    getTrash: () => Promise<IpcResponse<AccountEntity[]>>;
    restoreFromTrash: (ids: number[]) => Promise<IpcResponse<{ restoredCount: number }>>;
    emptyTrash: () => Promise<IpcResponse<{ purgedCount: number }>>;
  };

  // Folders API
  folders: {
    getAll: () => Promise<IpcResponse<{ folders: FolderEntity[]; totalAccounts: number; totalLive: number; totalDie: number }>>;
    create: (name: string) => Promise<IpcResponse<FolderEntity>>;
    update: (id: number, name: string) => Promise<IpcResponse<boolean>>;
    delete: (id: number, deleteAccountsPermanently?: boolean) => Promise<IpcResponse<boolean>>;
    reorder: (folderIds: number[]) => Promise<IpcResponse<boolean>>;
  };

  // Browser & Automation API
  browser: {
    launch: (payload: BrowserOpenOptions) => Promise<IpcResponse<{ browserSessionId: string; pid: number }>>;
    close: (accountId: number) => Promise<IpcResponse<boolean>>;
    closeAll: () => Promise<IpcResponse<boolean>>;
    getOtp: (payload: { secret: string }) => Promise<IpcResponse<{ otp: string; timeLeft: number }>>;
    cleanProfile: (payload: { accountIds: number[] }) => Promise<IpcResponse<{ cleanedCount: number; freedBytes: number }>>;
  };

  // Scenarios & Actions API
  scenarios: {
    getAll: () => Promise<IpcResponse<ScenarioEntity[]>>;
    getById: (id: number) => Promise<IpcResponse<ScenarioEntity>>;
    create: (name: string, config?: Record<string, any>) => Promise<IpcResponse<{ id: number; name: string }>>;
    update: (id: number, name: string, config?: Record<string, any>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    duplicate: (id: number) => Promise<IpcResponse<{ newScenarioId: number }>>;
  };

  actions: {
    getAllTypes: () => Promise<IpcResponse<Array<{ id: number; code: string; name: string; category: string; defaultJson: string }>>>;
    create: (payload: { scenarioId: number; actionCode: string; name: string; configJson: string; orderIndex: number }) => Promise<IpcResponse<ActionEntity>>;
    update: (id: number, name: string, config: Record<string, any>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    reorder: (payload: { scenarioId: number; actionIds: number[] }) => Promise<IpcResponse<boolean>>;
  };

  // Runner & Automation Execution Pool
  runner: {
    start: (payload: RunnerConfig) => Promise<IpcResponse<{ runId: string; totalAccounts: number }>>;
    pause: () => Promise<IpcResponse<boolean>>;
    resume: () => Promise<IpcResponse<boolean>>;
    stop: () => Promise<IpcResponse<boolean>>;
    getStatus: () => Promise<IpcResponse<{ isRunning: boolean; isPaused: boolean; activeThreads: number }>>;
    
    // Push Event Listeners
    onThreadStatus: (callback: (event: ThreadStatusEvent) => void) => () => void;
    onLog: (callback: (event: LogEntryEvent) => void) => () => void;
    onSummaryUpdate: (callback: (event: any) => void) => () => void;
    onCompleted: (callback: () => void) => () => void;
  };

  // Proxy API
  proxy: {
    check: (payload: { proxy: string; timeoutMs?: number }) => Promise<IpcResponse<{ live: boolean; ip: string; country: string; latencyMs: number }>>;
    rotate: (payload: { service: string; apiKey?: string; port?: number }) => Promise<IpcResponse<{ newIp: string; cooldownSec: number }>>;
    getAll?: () => Promise<IpcResponse<any[]>>;
    save?: (config: any) => Promise<IpcResponse<boolean>>;
  };

  // Settings & System API
  settings: {
    get: <T = any>(key: string) => Promise<IpcResponse<T>>;
    set: (key: string, value: any) => Promise<IpcResponse<boolean>>;
    getAll: () => Promise<IpcResponse<Record<string, any>>>;
  };

  system: {
    getInfo: () => Promise<IpcResponse<{ platform: string; arch: string; cpus: number; freeMemMB: number; totalMemMB: number }>>;
    selectDirectory: () => Promise<IpcResponse<string | null>>;
    openPath: (path: string) => Promise<IpcResponse<boolean>>;
  };

  // Window Controls
  window?: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };

  // Utilities API
  utilities: {
    findUid: (url: string) => Promise<IpcResponse<{ uid: string }>>;
    checkLiveUid: (uids: string[]) => Promise<IpcResponse<Array<{ uid: string; isLive: boolean }>>>;
    testSpin: (template: string, count?: number) => Promise<IpcResponse<string[]>>;
    aiGenerate: (payload: { prompt: string; provider?: string }) => Promise<IpcResponse<{ generatedText: string }>>;
  };
}

declare global {
  interface Window {
    api?: LushCareApi;
  }
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}
