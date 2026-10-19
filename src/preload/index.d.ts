import { LushCareApi } from './index';

declare global {
  interface Window {
    api: LushCareApi;
  }
}

export {};
