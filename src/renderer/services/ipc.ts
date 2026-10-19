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
import { generate2FaOtp } from '../utils/otp';

// Mock initial data generator for Vite development & standalone testing
function generateMockAccounts(count: number = 300): AccountEntity[] {
  const firstNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Phan', 'Vũ', 'Võ', 'Đặng', 'Bùi', 'Đỗ', 'Hồ', 'Ngô', 'Dương'];
  const midNames = ['Văn', 'Thị', 'Đức', 'Hữu', 'Minh', 'Ngọc', 'Thanh', 'Quang', 'Hồng', 'Gia'];
  const lastNames = ['An', 'Bình', 'Cường', 'Dũng', 'Em', 'Giang', 'Hải', 'Huy', 'Khoa', 'Lâm', 'Nam', 'Phong', 'Quân', 'Sơn', 'Tâm', 'Tuấn', 'Việt'];
  const statuses = [
    { info: 'Live', status: 'Sẵn sàng chạy' },
    { info: 'Live', status: 'Lướt feed thành công' },
    { info: 'Live', status: 'Đã like 5 bài viết' },
    { info: 'Die', status: 'Tài khoản bị vô hiệu hóa' },
    { info: 'Checkpoint 282', status: 'Chờ giải OTP SĐT' },
    { info: 'Checkpoint 956', status: 'Két sắt tạm khóa' },
    { info: 'Live', status: 'Nghỉ giải lao 30s' },
  ];
  const sampleProxies = [
    '14.225.1.8:8080:usr1:pwd1',
    '118.69.2.14:9090:usr2:pwd2',
    '171.244.5.2:8000:usr3:pwd3',
    '27.72.10.55:8888:usr4:pwd4',
    '113.161.4.1:8080:usr5:pwd5',
  ];
  const sampleScenarios = [
    'Nuôi Nick Mới Tạo 7 Ngày',
    'Tương Tác Bạn Bè & Nhóm',
    'Seeding Bài Viết Bán Hàng',
    'Kháng Checkpoint 282 + 956',
    'Đổi Pass & Bật Bảo Mật 2FA',
  ];
  const sample2faSecrets = [
    'JBSWY3DPEHPK3PXP',
    'KZXW4ZDPNU======',
    'MZXW633PNU======',
    'NB2HI4DTHIXS633P',
    'O5XXE33VONSWG4TF',
  ];

  const list: AccountEntity[] = [];
  const baseUid = 100084000000000;

  for (let i = 1; i <= count; i++) {
    const f = firstNames[i % firstNames.length];
    const m = midNames[i % midNames.length];
    const l = lastNames[i % lastNames.length];
    const fullName = `${f} ${m} ${l}`;
    const uidStr = (baseUid + i * 179 + i).toString();
    const st = statuses[i % statuses.length];
    const folderId = (i % 5) + 1;

    list.push({
      id: i,
      uid: uidStr,
      pass: `Password@${1000 + i}`,
      token: `EAAB${uidStr.substring(0, 10)}...mockToken...`,
      cookie: `c_user=${uidStr}; xs=${i}:2${i}aB:2:1699999999; fr=0abc123...`,
      email: `user_${uidStr.substring(8)}@gmail.com`,
      passmail: `MailPass#${i}`,
      fa2: sample2faSecrets[i % sample2faSecrets.length],
      name: fullName,
      friends: (Math.floor((i * 37) % 4500) + 50).toString(),
      groups: ((i * 3) % 45 + 5).toString(),
      follow: ((i * 19) % 1500).toString(),
      birthday: `199${(i % 9) + 1}-${((i % 12) + 1).toString().padStart(2, '0')}-${((i % 28) + 1).toString().padStart(2, '0')}`,
      gender: i % 2 === 0 ? 'Nam' : 'Nữ',
      info: st.info,
      status: st.status,
      idfile: folderId,
      proxy: sampleProxies[i % sampleProxies.length],
      useragent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36',
      dateCreateAcc: '2023-11-15',
      dateImport: '2024-01-20',
      active: 1,
      ghiChu: i % 4 === 0 ? 'Nick chính cày view' : 'Nick phụ seeding',
      interactEnd: new Date(Date.now() - (i * 3600000) % 864000000).toLocaleString('vi-VN'),
      kichban: sampleScenarios[i % sampleScenarios.length],
      location: 'Hà Nội, Việt Nam',
    });
  }

  return list;
}

const mockFolders: FolderEntity[] = [
  { id: 1, name: 'Via Cổ Ngoại 2018', STT: 1, active: 1, accountCount: 75, liveCount: 65, dieCount: 10 },
  { id: 2, name: 'Clone Nuôi Newfeed', STT: 2, active: 1, accountCount: 85, liveCount: 70, dieCount: 15 },
  { id: 3, name: 'Dàn Seeding Fanpage VIP', STT: 3, active: 1, accountCount: 50, liveCount: 45, dieCount: 5 },
  { id: 4, name: 'Tài Khoản Chờ Giải CP', STT: 4, active: 1, accountCount: 45, liveCount: 20, dieCount: 25 },
  { id: 5, name: 'Tài Khoản Đổi Pass Xong', STT: 5, active: 1, accountCount: 45, liveCount: 40, dieCount: 5 },
];

const mockScenarios: ScenarioEntity[] = [
  {
    id: 1,
    name: 'Nuôi Nick Mới Tạo 7 Ngày',
    description: 'Lướt newsfeed, xem story, like bài ngẫu nhiên nhẹ nhàng',
    actions: [
      { id: 101, scenarioId: 1, actionCode: 'fHDBaiVietNewsfeed', name: 'Lướt Bảng Tin Newsfeed', configJson: '{"timeMin":120,"timeMax":240,"likePercent":40,"commentPercent":20}', orderIndex: 1 },
      { id: 102, scenarioId: 1, actionCode: 'fHDXemStory', name: 'Xem Tin Story Bạn Bè', configJson: '{"storyCount":3,"heartPercent":50}', orderIndex: 2 },
      { id: 103, scenarioId: 1, actionCode: 'fHDNghiGiaiLao', name: 'Nghỉ Giải Lao Giữa Giờ', configJson: '{"delayMin":15,"delayMax":30}', orderIndex: 3 },
      { id: 104, scenarioId: 1, actionCode: 'fHDKetBanGoiY', name: 'Gửi Lời Mời Kết Bạn Gợi Ý', configJson: '{"count":2,"onlyMutual":true}', orderIndex: 4 },
    ],
  },
  {
    id: 2,
    name: 'Tương Tác Bạn Bè & Nhóm',
    description: 'Thả tim bài viết của bạn bè và bình luận nhóm chỉ định',
    actions: [
      { id: 201, scenarioId: 2, actionCode: 'fHDTuongTacBanBe', name: 'Tương Tác Tường Bạn Bè', configJson: '{"postCount":3,"reaction":"LOVE"}', orderIndex: 1 },
      { id: 202, scenarioId: 2, actionCode: 'fHDTuongTacNhom', name: 'Lướt Bài Nhóm Đã Tham Gia', configJson: '{"groupCount":2,"timeSec":60}', orderIndex: 2 },
    ],
  },
  {
    id: 3,
    name: 'Seeding Bài Viết Bán Hàng',
    description: 'Tự động mở link bài viết, thả cảm xúc và comment theo danh sách',
    actions: [
      { id: 301, scenarioId: 3, actionCode: 'fHDMoLinkBaiViet', name: 'Mở Link Bài Viết Bán Hàng', configJson: '{"url":"https://facebook.com/posts/example"}', orderIndex: 1 },
      { id: 302, scenarioId: 3, actionCode: 'fHDCommentNoiDung', name: 'Bình Luận Kèm Spin Text', configJson: '{"spinText":"{Sản phẩm|Mẫu này} đẹp quá shop ơi!|Ib mình giá với ạ"}', orderIndex: 2 },
    ],
  },
  {
    id: 4,
    name: 'Kháng Checkpoint 282 + 956',
    description: 'Giải mã tự động két sắt 956 qua Hotmail và SIM OTP 282',
    actions: [
      { id: 401, scenarioId: 4, actionCode: 'fHDGiai956Hotmail', name: 'Tự Vượt Két Sắt 956 Bằng IMAP Hotmail', configJson: '{"timeoutSec":90}', orderIndex: 1 },
      { id: 402, scenarioId: 4, actionCode: 'fHDGiai282SimOtp', name: 'Thuê SIM FastSim Giải Checkpoint 282', configJson: '{"provider":"fastsim","serviceCode":"facebook"}', orderIndex: 2 },
    ],
  },
  {
    id: 5,
    name: 'Đổi Pass & Bật Bảo Mật 2FA',
    description: 'Đổi mật khẩu bảo vệ tài khoản và thêm Secret Key 2FA',
    actions: [
      { id: 501, scenarioId: 5, actionCode: 'fHDDoiMatKhau', name: 'Đổi Mật Khẩu Ngẫu Nhiên', configJson: '{"pattern":"Vmax@2026!{rand}"}', orderIndex: 1 },
      { id: 502, scenarioId: 5, actionCode: 'fHDBat2FA', name: 'Bật Bảo Mật 2 Lớp (2FA Key)', configJson: '{"saveToDb":true}', orderIndex: 2 },
    ],
  },
];

// In-memory data store for mock mode
let mockAccountList: AccountEntity[] = generateMockAccounts(300);
let mockTrashAccounts: AccountEntity[] = [];

// Event listeners for Runner simulator
const threadListeners: Set<(event: ThreadStatusEvent) => void> = new Set();
const logListeners: Set<(event: LogEntryEvent) => void> = new Set();
const summaryListeners: Set<(event: any) => void> = new Set();
const completedListeners: Set<() => void> = new Set();

let runnerInterval: any = null;
let isRunnerActive = false;
let isRunnerPaused = false;

// IPC Service Client
export const ipcService = {
  // ACCOUNTS
  async getAccounts(filter: AccountFilterPayload): Promise<{ accounts: AccountEntity[]; total: number }> {
    if (window.api?.accounts?.getAll) {
      const res = await window.api.accounts.getAll(filter);
      if (res.success && res.data) {
        return res.data;
      }
    }

    // Mock filtering logic
    let result = [...mockAccountList];

    if (filter.folderId && filter.folderId > 0) {
      result = result.filter(a => a.idfile === filter.folderId);
    } else if (filter.folderIds && filter.folderIds.length > 0) {
      result = result.filter(a => a.idfile != null && filter.folderIds!.includes(a.idfile));
    }

    if (filter.searchQuery && filter.searchQuery.trim() !== '') {
      const q = filter.searchQuery.toLowerCase().trim();
      result = result.filter(a =>
        a.uid.toLowerCase().includes(q) ||
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q)) ||
        (a.proxy && a.proxy.toLowerCase().includes(q)) ||
        (a.ghiChu && a.ghiChu.toLowerCase().includes(q))
      );
    }

    if (filter.statusFilter && filter.statusFilter !== 'ALL') {
      if (filter.statusFilter === 'LIVE') {
        result = result.filter(a => a.info?.toLowerCase().includes('live'));
      } else if (filter.statusFilter === 'DIE') {
        result = result.filter(a => a.info?.toLowerCase().includes('die') || a.info?.toLowerCase().includes('khóa'));
      } else if (filter.statusFilter === 'CHECKPOINT') {
        result = result.filter(a => a.info?.includes('282') || a.info?.includes('956'));
      } else if (filter.statusFilter === 'RUNNING') {
        result = result.filter(a => a.runningStatus && a.runningStatus !== '');
      }
    }

    return {
      accounts: result,
      total: result.length,
    };
  },

  async updateAccount(id: number, updates: Partial<AccountEntity>): Promise<boolean> {
    if (window.api?.accounts?.update) {
      const res = await window.api.accounts.update(id, updates);
      return res.success;
    }
    mockAccountList = mockAccountList.map(a => (a.id === id ? { ...a, ...updates } : a));
    return true;
  },

  async batchUpdateAccounts(ids: number[], updates: Partial<AccountEntity>): Promise<number> {
    if (window.api?.accounts?.batchUpdate) {
      const res = await window.api.accounts.batchUpdate({ ids, updates });
      return res.data?.updatedCount || 0;
    }
    mockAccountList = mockAccountList.map(a => (ids.includes(a.id) ? { ...a, ...updates } : a));
    return ids.length;
  },

  async deleteAccounts(ids: number[]): Promise<number> {
    if (window.api?.accounts?.delete) {
      const res = await window.api.accounts.delete(ids);
      return res.data?.deletedCount || 0;
    }
    const toDelete = mockAccountList.filter(a => ids.includes(a.id));
    mockTrashAccounts.push(...toDelete);
    mockAccountList = mockAccountList.filter(a => !ids.includes(a.id));
    return ids.length;
  },

  async moveToFolder(accountIds: number[], targetFolderId: number): Promise<boolean> {
    if (window.api?.accounts?.moveToFolder) {
      const res = await window.api.accounts.moveToFolder(accountIds, targetFolderId);
      return res.success;
    }
    mockAccountList = mockAccountList.map(a =>
      accountIds.includes(a.id) ? { ...a, idfile: targetFolderId } : a
    );
    return true;
  },

  async importAccounts(payload: AccountImportPayload): Promise<{ totalImported: number; duplicatesSkipped: number }> {
    if (window.api?.accounts?.import) {
      const res = await window.api.accounts.import(payload);
      return {
        totalImported: res.data?.totalImported || 0,
        duplicatesSkipped: res.data?.duplicatesSkipped || 0,
      };
    }

    // Mock parse lines
    const contentStr = payload.content || '';
    const formatStr = payload.format || 'uid|pass';
    const lines = contentStr.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const partsMapping = formatStr.toLowerCase().split('|');
    let imported = 0;
    let skipped = 0;

    for (const line of lines) {
      const values = line.split('|');
      const uidVal = values[partsMapping.indexOf('uid')] || `${100080000000000 + Math.floor(Math.random() * 90000000)}`;

      if (payload.checkDuplicate && mockAccountList.some(a => a.uid === uidVal)) {
        skipped++;
        continue;
      }

      const acc: AccountEntity = {
        id: mockAccountList.length + imported + 1,
        uid: uidVal,
        pass: values[partsMapping.indexOf('pass')] || 'Pass@123',
        fa2: values[partsMapping.indexOf('2fa')] || 'JBSWY3DPEHPK3PXP',
        cookie: values[partsMapping.indexOf('cookie')] || '',
        token: values[partsMapping.indexOf('token')] || '',
        email: values[partsMapping.indexOf('email')] || '',
        passmail: values[partsMapping.indexOf('passmail')] || '',
        proxy: values[partsMapping.indexOf('proxy')] || '',
        name: `User ${uidVal.substring(uidVal.length - 4)}`,
        info: 'Live',
        status: 'Mới nhập',
        idfile: payload.folderId,
        active: 1,
        dateImport: new Date().toISOString().split('T')[0],
      };

      mockAccountList.unshift(acc);
      imported++;
    }

    return { totalImported: imported, duplicatesSkipped: skipped };
  },

  // FOLDERS
  async getFolders(): Promise<FolderEntity[]> {
    if (window.api?.folders?.getAll) {
      const res = await window.api.folders.getAll();
      if (res.success && res.data) {
        return res.data.folders;
      }
    }

    // Recalculate stats for mock folders
    return mockFolders.map(f => {
      const accs = mockAccountList.filter(a => a.idfile === f.id);
      const live = accs.filter(a => a.info?.toLowerCase().includes('live')).length;
      return {
        ...f,
        accountCount: accs.length,
        liveCount: live,
        dieCount: accs.length - live,
      };
    });
  },

  async createFolder(name: string): Promise<FolderEntity> {
    if (window.api?.folders?.create) {
      const res = await window.api.folders.create(name);
      return res.data as FolderEntity;
    }
    const newF: FolderEntity = {
      id: Date.now(),
      name,
      active: 1,
      STT: mockFolders.length + 1,
      accountCount: 0,
      liveCount: 0,
      dieCount: 0,
    };
    mockFolders.push(newF);
    return newF;
  },

  async deleteFolder(id: number): Promise<boolean> {
    if (window.api?.folders?.delete) {
      const res = await window.api.folders.delete(id);
      return res.success;
    }
    const idx = mockFolders.findIndex(f => f.id === id);
    if (idx !== -1) mockFolders.splice(idx, 1);
    return true;
  },

  // SCENARIOS
  async getScenarios(): Promise<ScenarioEntity[]> {
    if (window.api?.scenarios?.getAll) {
      const res = await window.api.scenarios.getAll();
      if (res.success && res.data) {
        return res.data as ScenarioEntity[];
      }
    }
    return mockScenarios;
  },

  async createScenario(name: string): Promise<ScenarioEntity> {
    if (window.api?.scenarios?.create) {
      const res = await window.api.scenarios.create(name);
      return {
        id: res.data?.id || Date.now(),
        name,
        actions: [],
      };
    }
    const newSc: ScenarioEntity = {
      id: Date.now(),
      name,
      description: 'Kịch bản tùy chỉnh mới tạo',
      actions: [],
    };
    mockScenarios.push(newSc);
    return newSc;
  },

  // BROWSER & 2FA
  async launchBrowser(options: BrowserOpenOptions): Promise<{ browserSessionId: string; pid: number }> {
    if (window.api?.browser?.launch) {
      const res = await window.api.browser.launch(options);
      return res.data || { browserSessionId: `mock_${options.accountId}`, pid: 1234 };
    }
    // Simulate open
    return { browserSessionId: `sim_session_${options.accountId}`, pid: 9999 };
  },

  async closeBrowser(accountId: number): Promise<boolean> {
    if (window.api?.browser?.close) {
      const res = await window.api.browser.close(accountId);
      return res.success;
    }
    return true;
  },

  async get2FaOtp(secret: string): Promise<string> {
    if (window.api?.browser?.getOtp) {
      const res = await window.api.browser.getOtp({ secret });
      return res.data?.otp || generate2FaOtp(secret);
    }
    return generate2FaOtp(secret);
  },

  // RUNNER
  async startRunner(config: RunnerConfig): Promise<boolean> {
    if (window.api?.runner?.start) {
      const res = await window.api.runner.start(config);
      return res.success;
    }

    // Mock Runner Simulation
    isRunnerActive = true;
    isRunnerPaused = false;

    // Log startup
    this.emitLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.102',
      level: 'INFO',
      message: `Khởi tạo TaskPool: Cấu hình tối đa ${config.threads} luồng chạy đồng thời. Số tài khoản: ${config.accountIds.length}`,
    });

    const activeAccs = mockAccountList.filter(a => config.accountIds.includes(a.id));
    let progressMap: Record<number, number> = {};

    activeAccs.forEach(a => {
      progressMap[a.id] = 0;
      a.runningStatus = 'Đang khởi động trình duyệt...';
    });

    if (runnerInterval) clearInterval(runnerInterval);

    runnerInterval = setInterval(() => {
      if (isRunnerPaused || !isRunnerActive) return;

      let allDone = true;

      activeAccs.forEach((acc, idx) => {
        if (progressMap[acc.id] < 100) {
          allDone = false;
          progressMap[acc.id] += Math.floor(Math.random() * 15) + 10;
          if (progressMap[acc.id] > 100) progressMap[acc.id] = 100;

          const steps = [
            'Nạp cookie vào phiên làm việc...',
            'Đang mở trang https://m.facebook.com...',
            'Lướt Bảng Tin Newsfeed (Thả 1 Like)...',
            'Xem Tin Story Bạn Bè...',
            'Đang hoàn tất hành động kịch bản...',
            'Đã hoàn thành phiên chạy thành công!',
          ];
          const stepIndex = Math.min(Math.floor((progressMap[acc.id] / 100) * steps.length), steps.length - 1);
          acc.runningStatus = steps[stepIndex];

          const threadEvt: ThreadStatusEvent = {
            threadIndex: (idx % config.threads) + 1,
            accountId: acc.id,
            uid: acc.uid,
            status: steps[stepIndex],
            progressPercent: progressMap[acc.id],
            isFinished: progressMap[acc.id] >= 100,
          };
          threadListeners.forEach(cb => cb(threadEvt));

          if (progressMap[acc.id] >= 100) {
            acc.runningStatus = '';
            acc.info = 'Live';
            acc.status = 'Đã chạy xong kịch bản';
            acc.interactEnd = new Date().toLocaleString('vi-VN');
            this.emitLog({
              timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.880',
              level: 'SUCCESS',
              uid: acc.uid,
              accountId: acc.id,
              message: `Luồng #${(idx % config.threads) + 1}: Tài khoản ${acc.uid} (${acc.name}) đã hoàn thành kịch bản!`,
            });
          }
        }
      });

      if (allDone) {
        clearInterval(runnerInterval);
        isRunnerActive = false;
        this.emitLog({
          timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.999',
          level: 'SUCCESS',
          message: 'Tất cả các luồng chạy kịch bản đã hoàn thành toàn bộ!',
        });
        completedListeners.forEach(cb => cb());
      }
    }, 1200);

    return true;
  },

  async pauseRunner(): Promise<boolean> {
    if (window.api?.runner?.pause) {
      await window.api.runner.pause();
    }
    isRunnerPaused = true;
    this.emitLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.000',
      level: 'WARN',
      message: 'Bộ điều phối đã tạm dừng tất cả các luồng tương tác.',
    });
    return true;
  },

  async resumeRunner(): Promise<boolean> {
    if (window.api?.runner?.resume) {
      await window.api.runner.resume();
    }
    isRunnerPaused = false;
    this.emitLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.000',
      level: 'INFO',
      message: 'Tiếp tục thực thi các luồng đang tạm dừng.',
    });
    return true;
  },

  async stopRunner(): Promise<boolean> {
    if (window.api?.runner?.stop) {
      await window.api.runner.stop();
    }
    if (runnerInterval) clearInterval(runnerInterval);
    isRunnerActive = false;
    isRunnerPaused = false;

    mockAccountList.forEach(a => {
      a.runningStatus = '';
    });

    this.emitLog({
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour12: false }) + '.000',
      level: 'ERROR',
      message: 'Đã dừng khẩn cấp toàn bộ các luồng trình duyệt và giải phóng tài nguyên.',
    });
    return true;
  },

  // Event subscription helpers
  onThreadStatus(callback: (event: ThreadStatusEvent) => void): () => void {
    if (window.api?.runner?.onThreadStatus) {
      return window.api.runner.onThreadStatus(callback);
    }
    threadListeners.add(callback);
    return () => threadListeners.delete(callback);
  },

  onLog(callback: (event: LogEntryEvent) => void): () => void {
    if (window.api?.runner?.onLog) {
      return window.api.runner.onLog(callback);
    }
    logListeners.add(callback);
    return () => logListeners.delete(callback);
  },

  emitLog(log: LogEntryEvent) {
    logListeners.forEach(cb => cb(log));
  },

  onCompleted(callback: () => void): () => void {
    if (window.api?.runner?.onCompleted) {
      return window.api.runner.onCompleted(callback);
    }
    completedListeners.add(callback);
    return () => completedListeners.delete(callback);
  },

  // Window Controls
  minimizeWindow() {
    if (window.api?.window?.minimize) {
      window.api.window.minimize();
    }
  },

  maximizeWindow() {
    if (window.api?.window?.maximize) {
      window.api.window.maximize();
    }
  },

  closeWindow() {
    if (window.api?.window?.close) {
      window.api.window.close();
    }
  },
};
