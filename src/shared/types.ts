export * from './types/ipc';
export * from './types/contracts';

// Backwards-compatible aliases and definitions
import {
  AccountEntity,
  FolderItem,
  ThreadStatusEvent,
  LiveLogEvent,
} from './types/contracts';

export type FolderEntity = FolderItem;
export type LogEntryEvent = LiveLogEvent;

export interface BrowserOpenOptions {
  accountId: number;
  uid?: string;
  pass?: string;
  cookie?: string;
  fa2?: string;
  headless?: boolean;
  proxy?: string;
  useragent?: string;
  windowPosition?: { x: number; y: number; width: number; height: number };
  autoLogin?: boolean;
  loginMode?: 'cookie' | 'pass_2fa' | 'cookie_pass';
}

export interface ScenarioEntity {
  id: number;
  name: string;
  description?: string;
  actions: ActionEntity[];
  createdAt?: string;
}

export interface ActionEntity {
  id: number;
  scenarioId: number;
  actionCode: string; // e.g. "fHDDangBai", "fHDBaiVietNewsfeed"
  name: string;
  configJson: string; // serialized JSON of params
  orderIndex: number;
}

export interface RunnerConfig {
  accountIds: number[];
  scenarioId?: number;
  threads: number;
  maxThreads?: number;
  delayPerThreadSec?: number;
  proxyType?: 'NONE' | 'STATIC' | 'MINPROXY' | 'XPROXY' | 'SHOPLIKE' | 'OBC' | string;
  proxyApiKeys?: string[];
  headless?: boolean;
  autoSolve2fa?: boolean;
  delayOpenRange?: [number, number];
  delayCloseRange?: [number, number];
  useAssignedScenario?: boolean;
  proxyRotationConfig?: {
    enabled: boolean;
    proxyType: 'static' | 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'dcom' | string;
    threadsPerProxy: number;
  };
}
