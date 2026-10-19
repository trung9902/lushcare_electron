import { ipcMain } from 'electron';
import { BrowserManager } from '../browser/BrowserManager';
import {
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
} from '../../shared/types/contracts';
import { IpcResponse, ErrorCodes } from '../../shared/types/ipc';

/**
 * Creates a standard successful IpcResponse envelope
 */
function createSuccessResponse<T>(data: T): IpcResponse<T> {
  return {
    success: true,
    data,
    timestamp: Date.now(),
  };
}

/**
 * Creates a standard error IpcResponse envelope
 */
function createErrorResponse(code: string, message: string, details?: any): IpcResponse<any> {
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
 * Registers all Browser IPC handlers on ipcMain
 */
export function registerBrowserIpc(browserManager: BrowserManager): void {
  // 1. browser:launch (and alias browser:open)
  const handleLaunch = async (
    _event: Electron.IpcMainInvokeEvent,
    payload: BrowserLaunchPayload
  ): Promise<IpcResponse<BrowserLaunchResult>> => {
    try {
      if (!payload || typeof payload.accountId !== 'number') {
        return createErrorResponse(
          ErrorCodes.ERR_INVALID_PAYLOAD,
          'Payload must include a valid numeric accountId'
        );
      }
      const result = await browserManager.launch(payload);
      return createSuccessResponse(result);
    } catch (err: any) {
      console.error('[browserIpc] launch error:', err);
      const code = err?.code || ErrorCodes.ERR_BROWSER_LAUNCH;
      return createErrorResponse(code, err?.message || 'Failed to launch browser', err);
    }
  };

  ipcMain.handle('browser:launch', handleLaunch);
  ipcMain.handle('browser:open', handleLaunch);

  // 2. browser:close
  ipcMain.handle(
    'browser:close',
    async (
      _event: Electron.IpcMainInvokeEvent,
      accountId: number
    ): Promise<IpcResponse<boolean>> => {
      try {
        if (typeof accountId !== 'number') {
          return createErrorResponse(
            ErrorCodes.ERR_INVALID_PAYLOAD,
            'accountId must be a number'
          );
        }
        const success = await browserManager.close(accountId);
        return createSuccessResponse(success);
      } catch (err: any) {
        console.error('[browserIpc] close error:', err);
        return createErrorResponse(
          ErrorCodes.ERR_INTERNAL_EXCEPTION,
          err?.message || 'Failed to close browser',
          err
        );
      }
    }
  );

  // 3. browser:closeAll
  ipcMain.handle(
    'browser:closeAll',
    async (): Promise<IpcResponse<boolean>> => {
      try {
        const success = await browserManager.closeAll();
        return createSuccessResponse(success);
      } catch (err: any) {
        console.error('[browserIpc] closeAll error:', err);
        return createErrorResponse(
          ErrorCodes.ERR_INTERNAL_EXCEPTION,
          err?.message || 'Failed to close all browsers',
          err
        );
      }
    }
  );

  // 4. browser:getActiveSessions
  ipcMain.handle(
    'browser:getActiveSessions',
    async (): Promise<IpcResponse<BrowserSessionInfo[]>> => {
      try {
        const sessions = browserManager.getActiveSessions();
        return createSuccessResponse(sessions);
      } catch (err: any) {
        return createErrorResponse(
          ErrorCodes.ERR_INTERNAL_EXCEPTION,
          err?.message || 'Failed to get active sessions',
          err
        );
      }
    }
  );

  // 5. browser:login
  ipcMain.handle(
    'browser:login',
    async (
      _event: Electron.IpcMainInvokeEvent,
      payload: BrowserLoginPayload
    ): Promise<IpcResponse<BrowserLoginResult>> => {
      try {
        if (!payload || typeof payload.accountId !== 'number') {
          return createErrorResponse(
            ErrorCodes.ERR_INVALID_PAYLOAD,
            'Payload must include a valid numeric accountId'
          );
        }
        const result = await browserManager.login(payload.accountId, payload);
        if (result.success) {
          return createSuccessResponse(result);
        } else {
          const code = result.checkpoint
            ? ErrorCodes.ERR_CHECKPOINT_HIT
            : ErrorCodes.ERR_LOGIN_FAILED;
          return createErrorResponse(code, result.errorMessage || 'Login failed', result);
        }
      } catch (err: any) {
        console.error('[browserIpc] login error:', err);
        const code = err?.code || ErrorCodes.ERR_LOGIN_FAILED;
        return createErrorResponse(code, err?.message || 'Login execution error', err);
      }
    }
  );

  // 6. browser:solve2fa (and alias browser:solve2FA)
  const handleSolve2fa = async (
    _event: Electron.IpcMainInvokeEvent,
    payload: BrowserSolve2faPayload
  ): Promise<IpcResponse<BrowserSolve2faResult>> => {
    try {
      if (!payload || typeof payload.accountId !== 'number') {
        return createErrorResponse(
          ErrorCodes.ERR_INVALID_PAYLOAD,
          'Payload must include a valid numeric accountId'
        );
      }
      const result = await browserManager.solve2fa(payload.accountId, payload.secretKey);
      if (result.success) {
        return createSuccessResponse(result);
      } else {
        return createErrorResponse(
          ErrorCodes.ERR_2FA_INVALID_KEY,
          result.message || '2FA solution failed',
          result
        );
      }
    } catch (err: any) {
      console.error('[browserIpc] solve2fa error:', err);
      const code = err?.code || ErrorCodes.ERR_2FA_INVALID_KEY;
      return createErrorResponse(code, err?.message || 'Failed to solve 2FA', err);
    }
  };

  ipcMain.handle('browser:solve2fa', handleSolve2fa);
  ipcMain.handle('browser:solve2FA', handleSolve2fa);

  // 7. browser:getOtp
  ipcMain.handle(
    'browser:getOtp',
    async (
      _event: Electron.IpcMainInvokeEvent,
      payload: GetOtpPayload
    ): Promise<IpcResponse<GetOtpResult>> => {
      try {
        if (!payload || !payload.secretKey) {
          return createErrorResponse(
            ErrorCodes.ERR_INVALID_PAYLOAD,
            'secretKey is required'
          );
        }
        const result = browserManager.getOtp(payload.secretKey);
        return createSuccessResponse(result);
      } catch (err: any) {
        console.error('[browserIpc] getOtp error:', err);
        const code = err?.code || ErrorCodes.ERR_2FA_INVALID_KEY;
        return createErrorResponse(code, err?.message || 'Failed to compute OTP', err);
      }
    }
  );

  // 8. browser:cleanProfile
  ipcMain.handle(
    'browser:cleanProfile',
    async (
      _event: Electron.IpcMainInvokeEvent,
      payload: CleanProfilePayload
    ): Promise<IpcResponse<CleanProfileResult>> => {
      try {
        if (!payload || !Array.isArray(payload.accountIds)) {
          return createErrorResponse(
            ErrorCodes.ERR_INVALID_PAYLOAD,
            'accountIds must be an array of numbers'
          );
        }
        const result = await browserManager.cleanProfile(payload);
        return createSuccessResponse(result);
      } catch (err: any) {
        console.error('[browserIpc] cleanProfile error:', err);
        return createErrorResponse(
          ErrorCodes.ERR_IO_PERMISSION,
          err?.message || 'Failed to clean profiles',
          err
        );
      }
    }
  );

  // 9. browser:cleanAllProfiles
  ipcMain.handle(
    'browser:cleanAllProfiles',
    async (): Promise<IpcResponse<CleanProfileResult>> => {
      try {
        const result = await browserManager.cleanAllProfiles();
        return createSuccessResponse(result);
      } catch (err: any) {
        console.error('[browserIpc] cleanAllProfiles error:', err);
        return createErrorResponse(
          ErrorCodes.ERR_IO_PERMISSION,
          err?.message || 'Failed to clean all profiles',
          err
        );
      }
    }
  );

  console.log('[browserIpc] Browser IPC channels registered successfully.');
}
