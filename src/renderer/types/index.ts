import { AccountEntity, FolderEntity, ScenarioEntity, ActionEntity, ThreadStatusEvent, LogEntryEvent } from '@shared/types';

export type AccountStatusType = 'LIVE' | 'DIE' | 'CP282' | 'CP956' | 'RUNNING' | 'READY' | 'ERROR';

export interface ColumnItem {
  id: keyof AccountEntity | 'stt' | 'checkbox' | 'actions';
  label: string;
  width: number;
  minWidth?: number;
  fixed?: boolean;
  category: 'system' | 'auth' | 'profile' | 'network' | 'interaction' | 'extended';
  visible: boolean;
}

export interface RunningThreadInfo {
  threadIndex: number;
  accountId: number;
  uid: string;
  name: string;
  proxy: string;
  action: string;
  startTime: number;
  progressPercent: number;
  status: string;
}

export interface SystemStats {
  cpuUsage: number;
  ramUsageMB: number;
  ramTotalMB: number;
  profileSizeGB: number;
  activeProxies: number;
  totalProxies: number;
  proxyProvider: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message: string;
  timestamp: number;
}

export type PresetType = 'DEFAULT' | 'SEEDING' | 'SECURITY' | 'FULL';
