import { IpcResponse } from './ipc';

// ==========================================
// 1. ACCOUNTS CONTRACTS
// ==========================================
export interface AccountEntity {
  id: number;
  uid: string;
  pass: string | null;
  token?: string | null;
  cookie?: string | null;
  cookie1?: string | null;
  email?: string | null;
  email2?: string | null;
  email_old?: string | null;
  passmail?: string | null;
  passmail_old?: string | null;
  mailrecovery?: string | null;
  passmailrecovery?: string | null;
  phone?: string | null;
  name?: string | null;
  fa2?: string | null;
  useragent?: string | null;
  proxy?: string | null;
  idfile?: number | null;
  folder_name?: string;
  folderName?: string;
  friends?: string;
  groups?: string;
  pages?: string;
  pagePro5?: string;
  follow?: string;
  birthday?: string | null;
  gender?: string | null;
  location?: string | null;
  hometown?: string | null;
  currentCity?: string | null;
  job?: string | null;
  dating?: string | null;
  ads?: string | null;
  bm?: string | null;
  wallPosts?: string;
  fbBlock?: string | null;
  avatar?: string | null;
  profile?: string; // 'Đã tạo' | 'Chưa tạo'
  status?: string;
  info?: string; // 'Live' | 'Die' | 'Checkpoint 282' | 'Checkpoint 956'
  status282?: string | null;
  interactEnd?: string | null;
  dateCreateAcc?: string | null;
  dateImport?: string | null;
  kichban?: string | null;
  infoDevice?: string | null;
  cookieHotmail?: string | null;
  ghiChu?: string | null;
  active: number;
  created_at?: string;
  updated_at?: string;
  runningStatus?: string;
  lastRunTime?: string;
}

export interface AccountFilterPayload {
  folderId?: number;
  folderIds?: number[];
  search?: string;
  searchQuery?: string;
  infoFilter?: string;
  statusFilter?: string;
  page?: number;
  limit?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC' | 'asc' | 'desc';
  active?: number;
}

export interface AccountListResult {
  accounts: AccountEntity[];
  total: number;
  liveCount: number;
  dieCount: number;
  checkpointCount: number;
  noProfileCount: number;
}

export interface AccountBatchUpdatePayload {
  accountIds: number[];
  updates: Partial<Omit<AccountEntity, 'id' | 'created_at' | 'updated_at'>>;
}

export interface BatchUpdateResult {
  updatedCount: number;
}

export interface AccountImportPayload {
  folderId: number;
  rawText?: string;
  content?: string;
  delimiter?: string;
  format?: string;
  fieldsOrder?: (keyof AccountEntity)[];
  duplicateHandling?: 'skip' | 'overwrite';
  checkDuplicate?: boolean;
  assignedProxyList?: string[];
  assignedUserAgentList?: string[];
}

export interface AccountImportResult {
  totalLines: number;
  importedCount: number;
  overwrittenCount: number;
  skippedDuplicates: number;
  invalidLines: number;
  errors?: string[];
  totalImported?: number;
  duplicatesSkipped?: number;
}

export interface AccountExportPayload {
  accountIds: number[];
  selectedFields?: (keyof AccountEntity)[];
  delimiter?: string;
  format?: string;
  exportType?: 'txt' | 'csv' | 'clipboard';
  filePath?: string;
}

export interface AccountExportResult {
  successCount: number;
  outputFilePath?: string;
  clipboardText?: string;
  content?: string;
  count?: number;
  filePath?: string;
}

// ==========================================
// 2. FOLDERS CONTRACTS
// ==========================================
export interface FolderItem {
  id: number;
  name: string;
  createddate?: string;
  active: number;
  STT?: number;
  totalAccounts?: number;
  liveAccounts?: number;
  dieAccounts?: number;
  checkpointAccounts?: number;
  accountCount?: number;
  liveCount?: number;
  dieCount?: number;
}

export interface FolderListResult {
  folders: FolderItem[];
  allCount: number;
  trashCount: number;
  totalAccounts?: number;
  totalLive?: number;
  totalDie?: number;
}

export interface FolderCreatePayload {
  name: string;
  STT?: number;
}

// ==========================================
// 3. BROWSER & AUTOMATION CONTRACTS
// ==========================================
export interface BrowserLaunchPayload {
  accountId: number;
  uid?: string;
  pass?: string;
  cookie?: string;
  fa2?: string;
  windowIndex?: number;
  customProxy?: string;
  proxy?: string;
  useragent?: string;
  headless?: boolean;
  autoLogin?: boolean;
  loginMode?: 'cookie' | 'uid_pass' | 'cookie_pass';
  gridConfig?: {
    columns?: number;
    rows?: number;
  };
  disableImages?: boolean;
}

export interface BrowserLaunchResult {
  accountId: number;
  uid: string;
  browserPid: number;
  profilePath: string;
  proxyUsed: string | null;
  status: 'launched' | 'already_running';
}

export interface BrowserSessionInfo {
  accountId: number;
  uid: string;
  browserPid: number;
  profilePath: string;
  proxyUsed: string | null;
  windowIndex: number;
  launchedAt: number;
  isAlive: boolean;
}

export interface BrowserLoginPayload {
  accountId: number;
  uid?: string;
  pass?: string;
  cookie?: string;
  fa2?: string;
  mode?: 'cookie' | 'uid_pass' | 'cookie_pass';
}

export interface BrowserLoginResult {
  success: boolean;
  accountId: number;
  uid: string;
  cookies?: string;
  checkpoint?: '282' | '956' | 'unknown' | null;
  errorMessage?: string;
}

export interface BrowserSolve2faPayload {
  accountId: number;
  secretKey?: string;
}

export interface BrowserSolve2faResult {
  success: boolean;
  otp: string;
  message?: string;
}

export interface GetOtpPayload {
  secretKey: string;
}

export interface GetOtpResult {
  otp: string;
  remainingSeconds: number;
}

export interface CleanProfilePayload {
  accountIds: number[];
  deleteCookies?: boolean;
  deleteCacheOnly?: boolean;
}

export interface CleanProfileResult {
  cleanedCount: number;
  freedBytes: number;
  freedFormatted: string;
}

// ==========================================
// 4. SCENARIOS & ACTIONS CONTRACTS
// ==========================================
export interface ScenarioActionDetail {
  id: number;
  scenarioId: number;
  actionTypeId: number;
  actionTypeCode: string;
  actionTypeName: string;
  category: string;
  actionName: string;
  config: Record<string, any>;
  STT: number;
}

export interface ScenarioDetailResult {
  id: number;
  name: string;
  config?: Record<string, any>;
  STT?: number;
  actions: ScenarioActionDetail[];
}

export interface ActionCreatePayload {
  scenarioId: number;
  actionTypeId: number;
  actionName: string;
  config: Record<string, any>;
  STT?: number;
}

export interface ActionReorderPayload {
  scenarioId: number;
  orderedActionIds: number[];
}

// ==========================================
// 5. RUNNER & EVENT STREAM CONTRACTS
// ==========================================
export interface RunnerStartPayload {
  accountIds: number[];
  scenarioId?: number;
  useAssignedScenario?: boolean;
  maxThreads: number;
  delayOpenRange: [number, number];
  delayCloseRange: [number, number];
  proxyRotationConfig?: {
    enabled: boolean;
    proxyType: 'static' | 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'dcom';
    threadsPerProxy: number;
  };
}

export interface RunnerStartResult {
  sessionId: string;
  totalQueued: number;
  maxThreads: number;
  startedAt: number;
}

export interface ThreadStatusEvent {
  sessionId?: string;
  threadIndex?: number;
  accountId: number;
  uid: string;
  status: string;
  info?: string;
  currentActionIndex?: number;
  totalActions?: number;
  progressPercent?: number;
  isFinished?: boolean;
  error?: string;
  errorMessage?: string;
  updatedAt?: number;
}

export interface LiveLogEvent {
  id?: string;
  timestamp: string;
  accountId?: number;
  uid?: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  actionName?: string;
  message: string;
}

export interface RunnerSummaryEvent {
  sessionId: string;
  total: number;
  running: number;
  success: number;
  failed: number;
  remaining: number;
  elapsedSeconds: number;
}

// ==========================================
// 6. PROXY & ROTATION CONTRACTS
// ==========================================
export interface ProxyCheckPayload {
  proxyString: string;
  timeoutMs?: number;
}

export interface ProxyCheckResult {
  isAlive: boolean;
  publicIp: string | null;
  responseTimeMs: number;
  country: string | null;
  city: string | null;
  errorMessage?: string;
}

export interface ProxyRotatePayload {
  proxyConfigId?: number;
  proxyType: 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'dcom';
  apiKey?: string;
  apiUrl?: string;
  proxyString?: string;
}

export interface ProxyRotateResult {
  success: boolean;
  newIp: string | null;
  newProxyString: string | null;
  cooldownSeconds: number;
  message: string;
}

// ==========================================
// 7. UTILITIES & SYSTEM CONTRACTS
// ==========================================
export interface AiGeneratePayload {
  provider: 'gemini' | 'openai';
  promptTemplate: string;
  contentInput: string;
  apiKey?: string;
}

export interface SystemInfoResult {
  platform: string;
  arch: string;
  cpus: number;
  freeMemMB: number;
  totalMemMB: number;
}
