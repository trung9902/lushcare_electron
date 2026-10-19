/**
 * LushCare Electron - Task Pool Orchestrator
 * Bộ điều phối đa luồng (Multi-thread Concurrency Pool) chạy kịch bản Facebook.
 * Quản lý hàng đợi N luồng, phân bổ slot, Pause, Resume, Stop khẩn cấp,
 * phát các sự kiện realtime (ThreadStatus, LiveLog, SummaryUpdate, Completed) về Renderer.
 */

import {
  RunnerConfig,
  RunnerStartResult,
  ThreadStatusEvent,
  LiveLogEvent,
  RunnerSummaryEvent,
  AccountEntity,
  ScenarioEntity,
} from '../shared/types';
import { ScenarioRunner } from './ScenarioRunner';
import { IBrowserManager, IDatabaseAdapter, defaultBrowserManager, defaultDatabaseAdapter } from './adapters';

export type TaskPoolState = 'IDLE' | 'RUNNING' | 'PAUSED' | 'STOPPED' | 'COMPLETED';

export interface TaskItem {
  account: AccountEntity;
  scenario: ScenarioEntity;
}

export class TaskPool {
  private static instance: TaskPool;

  private state: TaskPoolState = 'IDLE';
  private sessionId = '';
  private startedAt = 0;
  private maxThreads = 3;

  private queue: TaskItem[] = [];
  private activeThreadCount = 0;
  private totalAccountsCount = 0;
  private successCount = 0;
  private failedCount = 0;

  private abortController: AbortController | null = null;
  private pauseResolver: (() => void) | null = null;
  private pausePromise: Promise<void> | null = null;

  private summaryTimer: NodeJS.Timeout | null = null;

  // Event Listeners
  private threadStatusListeners = new Set<(event: ThreadStatusEvent) => void>();
  private logListeners = new Set<(event: LiveLogEvent) => void>();
  private summaryListeners = new Set<(event: RunnerSummaryEvent) => void>();
  private completedListeners = new Set<() => void>();

  // Adapters
  private browserManager: IBrowserManager = defaultBrowserManager;
  private dbAdapter: IDatabaseAdapter = defaultDatabaseAdapter;

  private constructor() {}

  public static getInstance(): TaskPool {
    if (!TaskPool.instance) {
      TaskPool.instance = new TaskPool();
    }
    return TaskPool.instance;
  }

  public setBrowserManager(manager: IBrowserManager): void {
    this.browserManager = manager;
  }

  public setDatabaseAdapter(adapter: IDatabaseAdapter): void {
    this.dbAdapter = adapter;
  }

  // ==========================================
  // EVENT REGISTRATION & EMISSION
  // ==========================================

  public onThreadStatus(callback: (event: ThreadStatusEvent) => void): () => void {
    this.threadStatusListeners.add(callback);
    return () => this.threadStatusListeners.delete(callback);
  }

  public onLog(callback: (event: LiveLogEvent) => void): () => void {
    this.logListeners.add(callback);
    return () => this.logListeners.delete(callback);
  }

  public onSummaryUpdate(callback: (event: RunnerSummaryEvent) => void): () => void {
    this.summaryListeners.add(callback);
    return () => this.summaryListeners.delete(callback);
  }

  public onCompleted(callback: () => void): () => void {
    this.completedListeners.add(callback);
    return () => this.completedListeners.delete(callback);
  }

  private emitThreadStatus(event: ThreadStatusEvent): void {
    for (const listener of this.threadStatusListeners) {
      try {
        listener(event);
      } catch {
        // Tránh lỗi subscriber làm sập pool
      }
    }
  }

  private emitLog(event: LiveLogEvent): void {
    for (const listener of this.logListeners) {
      try {
        listener(event);
      } catch {
        // Tránh lỗi subscriber
      }
    }
  }

  private emitSummary(): void {
    const elapsedSeconds = this.startedAt > 0 ? Math.floor((Date.now() - this.startedAt) / 1000) : 0;
    const remaining = this.queue.length + this.activeThreadCount;

    const event: RunnerSummaryEvent = {
      sessionId: this.sessionId,
      total: this.totalAccountsCount,
      running: this.activeThreadCount,
      success: this.successCount,
      failed: this.failedCount,
      remaining,
      elapsedSeconds,
    };

    for (const listener of this.summaryListeners) {
      try {
        listener(event);
      } catch {
        // Tránh lỗi subscriber
      }
    }
  }

  private emitCompleted(): void {
    for (const listener of this.completedListeners) {
      try {
        listener();
      } catch {
        // Tránh lỗi subscriber
      }
    }
  }

  // ==========================================
  // LIFECYCLE CONTROLS (START, PAUSE, RESUME, STOP)
  // ==========================================

  /**
   * Khởi động phiên chạy đa luồng cho danh sách tài khoản đã chọn
   */
  public async start(
    config: RunnerConfig,
    customScenario?: ScenarioEntity,
    customAccounts?: AccountEntity[]
  ): Promise<RunnerStartResult> {
    if (this.state === 'RUNNING' || this.state === 'PAUSED') {
      throw new Error('ERR_RUNNER_ALREADY_BUSY: Đang có một đợt chạy kịch bản chưa kết thúc!');
    }

    this.sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    this.startedAt = Date.now();
    this.state = 'RUNNING';
    this.maxThreads = Math.max(1, config.threads || (config as any).maxThreads || 3);
    this.successCount = 0;
    this.failedCount = 0;
    this.activeThreadCount = 0;
    this.abortController = new AbortController();
    this.pausePromise = null;
    this.pauseResolver = null;

    // 1. Tải kịch bản (Scenario)
    let scenario = customScenario;
    if (!scenario && config.scenarioId) {
      scenario = (await this.dbAdapter.getScenario(config.scenarioId)) || undefined;
    }

    if (!scenario || !scenario.actions || scenario.actions.length === 0) {
      this.state = 'IDLE';
      throw new Error('ERR_SCENARIO_EMPTY: Kịch bản được chỉ định không chứa bất kỳ hành động nào!');
    }

    // 2. Tải danh sách tài khoản
    let accounts: AccountEntity[] = customAccounts || [];
    if (accounts.length === 0 && config.accountIds && config.accountIds.length > 0) {
      accounts = await this.dbAdapter.getAccounts(config.accountIds);
      // Nếu dbAdapter chưa nạp sẵn tài khoản, tạo dummy entity để chạy
      if (accounts.length === 0) {
        accounts = config.accountIds.map((id) => ({
          id,
          uid: String(id),
          pass: '',
          active: 1,
          friends: '0',
          groups: '0',
          pages: '0',
          pagePro5: '0',
          follow: '0',
          wallPosts: '0',
          profile: 'Đã tạo',
          status: 'Sẵn sàng',
          info: 'Live',
        }));
      }
    }

    if (accounts.length === 0) {
      this.state = 'IDLE';
      throw new Error('Không có tài khoản nào được chọn để chạy!');
    }

    // 3. Đưa tài khoản vào hàng đợi (Queue)
    this.totalAccountsCount = accounts.length;
    this.queue = accounts.map((account) => ({
      account,
      scenario: scenario!,
    }));

    this.emitLog({
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: `Bắt đầu phiên chạy đa luồng (${this.maxThreads} luồng song song, tổng ${this.totalAccountsCount} tài khoản).`,
    });

    // Bắt đầu timer định kỳ gửi Summary Update mỗi 1000ms
    if (this.summaryTimer) clearInterval(this.summaryTimer);
    this.summaryTimer = setInterval(() => {
      if (this.state === 'RUNNING' || this.state === 'PAUSED') {
        this.emitSummary();
      }
    }, 1000);

    // 4. Kích hoạt Worker Pool
    this.dispatchWorkers(config);

    return {
      sessionId: this.sessionId,
      totalQueued: this.totalAccountsCount,
      maxThreads: this.maxThreads,
      startedAt: this.startedAt,
    };
  }

  /**
   * Tạm dừng toàn bộ các luồng đang chạy
   */
  public async pause(): Promise<boolean> {
    if (this.state !== 'RUNNING') return false;

    this.state = 'PAUSED';
    this.pausePromise = new Promise<void>((resolve) => {
      this.pauseResolver = resolve;
    });

    this.emitLog({
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'WARN',
      message: 'Hệ thống đã nhận lệnh TẠM DỪNG các luồng kịch bản.',
    });

    this.emitSummary();
    return true;
  }

  /**
   * Tiếp tục chạy các luồng sau khi tạm dừng
   */
  public async resume(): Promise<boolean> {
    if (this.state !== 'PAUSED') return false;

    this.state = 'RUNNING';
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
      this.pausePromise = null;
    }

    this.emitLog({
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'INFO',
      message: 'Hệ thống đã TIẾP TỤC chạy các luồng kịch bản.',
    });

    this.emitSummary();
    return true;
  }

  /**
   * Dừng khẩn cấp toàn bộ các luồng và giải phóng trình duyệt
   */
  public async stop(): Promise<boolean> {
    if (this.state === 'IDLE' || this.state === 'STOPPED' || this.state === 'COMPLETED') {
      return true;
    }

    this.state = 'STOPPED';

    // Kích hoạt hủy token
    if (this.abortController) {
      this.abortController.abort();
    }

    // Nếu đang bị pause thì giải phóng để các luồng thoát ngay
    if (this.pauseResolver) {
      this.pauseResolver();
      this.pauseResolver = null;
      this.pausePromise = null;
    }

    // Dọn sạch hàng đợi
    this.queue = [];

    this.emitLog({
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'WARN',
      message: 'ĐÃ DỪNG KHẨN CẤP toàn bộ các luồng kịch bản.',
    });

    // Đóng toàn bộ trình duyệt
    await this.browserManager.closeAll().catch(() => {});

    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }

    this.emitSummary();
    this.emitCompleted();
    return true;
  }

  /**
   * Lấy trạng thái tổng quan hiện tại của Task Pool
   */
  public getStatus() {
    return {
      isRunning: this.state === 'RUNNING',
      isPaused: this.state === 'PAUSED',
      state: this.state,
      activeThreads: this.activeThreadCount,
      queuedCount: this.queue.length,
      totalCount: this.totalAccountsCount,
      successCount: this.successCount,
      failedCount: this.failedCount,
      sessionId: this.sessionId,
    };
  }

  // ==========================================
  // DISPATCHER & WORKER LOOPS
  // ==========================================

  private async dispatchWorkers(config: RunnerConfig): Promise<void> {
    const threadCount = Math.min(this.maxThreads, this.queue.length);
    const workerPromises: Promise<void>[] = [];

    for (let threadIndex = 0; threadIndex < threadCount; threadIndex++) {
      // Độ trễ mở giữa các luồng để tránh nghẽn CPU và RAM máy tính
      const delayOpenRange = config.delayOpenRange || [1, 3];
      const openDelayMs = threadIndex * Math.floor((Math.random() * (delayOpenRange[1] - delayOpenRange[0]) + delayOpenRange[0]) * 1000);

      const workerPromise = (async () => {
        if (openDelayMs > 0) {
          await new Promise((r) => setTimeout(r, openDelayMs));
        }
        await this.runWorkerLoop(threadIndex, config);
      })();

      workerPromises.push(workerPromise);
    }

    // Chờ toàn bộ các slot worker hoàn thành
    await Promise.all(workerPromises);

    if (this.state !== 'STOPPED') {
      this.state = 'COMPLETED';
    }

    if (this.summaryTimer) {
      clearInterval(this.summaryTimer);
      this.summaryTimer = null;
    }

    this.emitSummary();
    this.emitCompleted();

    this.emitLog({
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleTimeString(),
      level: 'SUCCESS',
      message: `Đợt chạy hoàn tất! Thành công: ${this.successCount}, Thất bại: ${this.failedCount}.`,
    });
  }

  /**
   * Vòng lặp lấy việc của từng slot luồng (Thread Slot)
   */
  private async runWorkerLoop(threadIndex: number, config: RunnerConfig): Promise<void> {
    while (this.queue.length > 0 && this.state !== 'STOPPED') {
      // Chờ nếu đang bị tạm dừng
      if (this.state === 'PAUSED' && this.pausePromise) {
        await this.pausePromise;
      }

      if ((this.state as TaskPoolState) === 'STOPPED') break;

      const item = this.queue.shift();
      if (!item) break;

      this.activeThreadCount++;
      this.emitSummary();

      try {
        const result = await ScenarioRunner.run({
          account: item.account,
          scenario: item.scenario,
          runnerConfig: config,
          threadIndex,
          sessionId: this.sessionId,
          browserManager: this.browserManager,
          dbAdapter: this.dbAdapter,
          isAborted: () => this.state === 'STOPPED' || (this.abortController?.signal.aborted ?? false),
          isPaused: () => this.state === 'PAUSED',
          waitIfPaused: async () => {
            if (this.pausePromise) await this.pausePromise;
          },
          onStatus: (event) => this.emitThreadStatus(event),
          onLog: (event) => this.emitLog(event),
        });

        if (result.success) {
          this.successCount++;
        } else {
          this.failedCount++;
        }
      } catch (err: any) {
        this.failedCount++;
        this.emitLog({
          id: `${Date.now()}`,
          timestamp: new Date().toLocaleTimeString(),
          level: 'ERROR',
          message: `Lỗi bất ngờ tại luồng ${threadIndex + 1}: ${err?.message || err}`,
        });
      } finally {
        this.activeThreadCount--;
        this.emitSummary();
      }
    }
  }
}

export const taskPool = TaskPool.getInstance();
