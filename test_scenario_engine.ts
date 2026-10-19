/**
 * Automated Verification Test Suite for Scenario Engine, Core Actions & Proxy Manager
 */

import { spinText, generateSpinVariations, hasSpinSyntax } from './src/utils/spinText';
import { actionRegistry } from './src/actions/ActionRegistry';
import { SurfingNewsfeedAction } from './src/actions/facebook/SurfingNewsfeedAction';
import { WatchReelsAction } from './src/actions/facebook/WatchReelsAction';
import { AddFriendAction } from './src/actions/facebook/AddFriendAction';
import { PostWallAction } from './src/actions/facebook/PostWallAction';
import { InteractPostAction } from './src/actions/facebook/InteractPostAction';
import { proxyManager } from './src/proxy/ProxyManager';
import { taskPool } from './src/runner/TaskPool';
import { registerRunnerIpc } from './src/main/ipc/runnerIpc';
import { defaultDatabaseAdapter, defaultBrowserManager } from './src/runner/adapters';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, extra?: any): void {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passCount++;
  } else {
    console.error(`[FAIL] ${testName}`, extra ? extra : '');
    failCount++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('BẮT ĐẦU KIỂM THỬ DEV 4: SCENARIO ENGINE & PROXY PIPELINE');
  console.log('====================================================\n');

  // ----------------------------------------------------
  // TEST 1: NESTED SPIN TEXT ENGINE
  // ----------------------------------------------------
  console.log('--- TEST 1: Thuật toán Spin Text lồng nhau ---');
  const simpleTemplate = '{Chào bạn|Xin chào}';
  const simpleResult = spinText(simpleTemplate);
  assert(['Chào bạn', 'Xin chào'].includes(simpleResult), 'Spin Text 1 tầng đơn giản');

  const nestedTemplate = '{Chào {anh|chị}|Hi {bạn|cả nhà}}! Chúc {ngày mới|buổi sáng} {an lành|vui vẻ}.';
  assert(hasSpinSyntax(nestedTemplate), 'hasSpinSyntax nhận diện đúng cú pháp');

  const variations = generateSpinVariations(nestedTemplate, 10);
  assert(variations.length > 0, 'Sinh được các biến thể ngẫu nhiên');
  assert(!variations[0].includes('{') && !variations[0].includes('}'), 'Biến thể đã giải phóng hoàn toàn dấu ngoặc nhọn');
  console.log('  Mẫu sinh thử 1:', variations[0]);
  console.log('  Mẫu sinh thử 2:', variations[1] || variations[0]);

  const deepNested = '{A|{B|{C|D}}}';
  const deepRes = spinText(deepNested);
  assert(['A', 'B', 'C', 'D'].includes(deepRes), 'Bóc tách Spin Text 3 tầng lồng nhau {A|{B|{C|D}}} chính xác');

  // ----------------------------------------------------
  // TEST 2: ACTION REGISTRY & 5 CORE ACTIONS
  // ----------------------------------------------------
  console.log('\n--- TEST 2: Action Registry & Core Actions ---');
  const feedAction = actionRegistry.get('HDBaiVietNewsfeed');
  assert(feedAction !== undefined, 'ActionRegistry tìm thấy HDBaiVietNewsfeed');
  assert(actionRegistry.get('SurfingNewsfeed') !== undefined, 'ActionRegistry tìm thấy theo alias SurfingNewsfeed');
  assert(actionRegistry.get('fHDBaiVietNewsfeed') !== undefined, 'ActionRegistry tìm thấy theo alias fHDBaiVietNewsfeed');

  const reelsAction = actionRegistry.get('HDTuongTacReelNgauNhien');
  assert(reelsAction instanceof WatchReelsAction, 'Action HDTuongTacReelNgauNhien là instance WatchReelsAction');

  const addFriendAction = actionRegistry.get('HDKetBanGoiY');
  assert(addFriendAction instanceof AddFriendAction, 'Action HDKetBanGoiY là instance AddFriendAction');

  const postWallAction = actionRegistry.get('HDDangBai');
  assert(postWallAction instanceof PostWallAction, 'Action HDDangBai là instance PostWallAction');

  const interactPostAction = actionRegistry.get('HDBuffLikeComment');
  assert(interactPostAction instanceof InteractPostAction, 'Action HDBuffLikeComment là instance InteractPostAction');

  const allTypes = actionRegistry.getAllTypes();
  assert(allTypes.length >= 5, `ActionRegistry cung cấp danh mục ${allTypes.length} hành động`);
  assert(allTypes.some((t) => t.code === 'HDBaiVietNewsfeed'), 'Danh mục chứa mã HDBaiVietNewsfeed');
  assert(allTypes.some((t) => t.code === 'HDDangBai'), 'Danh mục chứa mã HDDangBai');

  // ----------------------------------------------------
  // TEST 3: PROXY MANAGER & MUTEX LOCK
  // ----------------------------------------------------
  console.log('\n--- TEST 3: Proxy Manager & Mutex Locking ---');
  const parsed1 = proxyManager.parseProxy('14.225.21.19:8080');
  assert(parsed1 !== null && parsed1.host === '14.225.21.19' && parsed1.port === 8080, 'Parse proxy IP:Port thành công');

  const parsed2 = proxyManager.parseProxy('103.152.164.2:8888:trunguser:passsecret123');
  assert(
    parsed2 !== null &&
      parsed2.host === '103.152.164.2' &&
      parsed2.username === 'trunguser' &&
      parsed2.password === 'passsecret123',
    'Parse proxy IP:Port:User:Pass thành công'
  );

  const parsed3 = proxyManager.parseProxy('socks5://user:pass@127.0.0.1:1080');
  assert(parsed3 !== null && parsed3.protocol === 'socks5', 'Parse proxy SOCKS5 URL thành công');

  // Test static rotate
  const rotateStatic = await proxyManager.rotateProxy({
    proxyType: 'static',
    proxyString: '14.225.21.19:8080',
  });
  assert(rotateStatic.success === true, 'Xoay Static Proxy phản hồi hợp lệ');

  // ----------------------------------------------------
  // TEST 4: TASK POOL & MULTI-THREAD CONCURRENCY
  // ----------------------------------------------------
  console.log('\n--- TEST 4: TaskPool & Event Streaming ---');
  const pool = taskPool;
  const initialStatus = pool.getStatus();
  assert(initialStatus.isRunning === false, 'TaskPool khởi tạo ở trạng thái IDLE');

  // Đăng ký nhận sự kiện
  let receivedLogCount = 0;
  let receivedThreadStatusCount = 0;
  let receivedSummaryCount = 0;

  const unsubLog = pool.onLog((log) => {
    receivedLogCount++;
  });
  const unsubStatus = pool.onThreadStatus((st) => {
    receivedThreadStatusCount++;
  });
  const unsubSummary = pool.onSummaryUpdate((sm) => {
    receivedSummaryCount++;
  });

  // Mock execution test với dummy scenario
  const mockScenario = {
    id: 999,
    name: 'Kịch bản Test Đa Luồng',
    actions: [
      {
        id: 1,
        scenarioId: 999,
        actionCode: 'HDBaiVietNewsfeed',
        name: 'Lướt Newsfeed Test',
        configJson: JSON.stringify({ minScrollTimes: 1, maxScrollTimes: 2 }),
        orderIndex: 1,
      },
    ],
    createdAt: new Date().toISOString(),
  };

  const mockAccounts = [
    {
      id: 101,
      uid: '100089283748291',
      pass: 'TestPass@1',
      active: 1,
      name: 'Nick Test 1',
    },
    {
      id: 102,
      uid: '100089283748292',
      pass: 'TestPass@2',
      active: 1,
      name: 'Nick Test 2',
    },
  ];

  // Khởi động TaskPool
  const startResult = await pool.start(
    {
      accountIds: [101, 102],
      scenarioId: 999,
      threads: 2,
      delayPerThreadSec: 1,
      proxyType: 'NONE',
      headless: true,
      autoSolve2fa: false,
    },
    mockScenario as any,
    mockAccounts as any
  );

  assert(startResult.totalQueued === 2, 'TaskPool đã nhận 2 tài khoản vào hàng đợi');
  assert(pool.getStatus().isRunning === true, 'TaskPool chuyển sang trạng thái RUNNING');

  // Test Pause
  await pool.pause();
  assert(pool.getStatus().isPaused === true, 'TaskPool tạm dừng thành công (PAUSED)');

  // Test Resume
  await pool.resume();
  assert(pool.getStatus().isPaused === false, 'TaskPool tiếp tục chạy thành công (RESUMED)');

  // Test Stop khẩn cấp
  await pool.stop();
  assert(pool.getStatus().isRunning === false, 'TaskPool dừng khẩn cấp thành công (STOPPED)');
  assert(receivedLogCount > 0, `Đã nhận được ${receivedLogCount} log events thời gian thực`);

  unsubLog();
  unsubStatus();
  unsubSummary();

  // ----------------------------------------------------
  // TEST 5: IPC HANDLERS REGISTRATION
  // ----------------------------------------------------
  console.log('\n--- TEST 5: IPC Handlers Envelope & Registration ---');
  const mockIpcHandles = new Map<string, Function>();
  const mockIpcMain: any = {
    handle: (channel: string, handler: Function) => {
      mockIpcHandles.set(channel, handler);
    },
  };

  registerRunnerIpc(mockIpcMain);

  const expectedChannels = [
    'runner:start',
    'runner:pause',
    'runner:resume',
    'runner:stop',
    'runner:getStatus',
    'scenarios:getAll',
    'scenarios:getById',
    'scenarios:create',
    'actions:getAllTypes',
    'proxy:check',
    'proxy:rotate',
    'utilities:testSpin',
  ];

  for (const ch of expectedChannels) {
    assert(mockIpcHandles.has(ch), `IPC Channel '${ch}' đã được đăng ký`);
  }

  // Gọi thử handler utilities:testSpin qua mock IPC
  const testSpinHandler = mockIpcHandles.get('utilities:testSpin');
  const spinIpcRes = await testSpinHandler?.({}, { template: '{Chào|Hi} {bạn|người quen}', count: 3 });
  assert(spinIpcRes.success === true, 'IPC utilities:testSpin trả về success: true');
  assert(Array.isArray(spinIpcRes.data) && spinIpcRes.data.length > 0, 'utilities:testSpin trả về mảng kết quả spin');

  // Gọi thử handler actions:getAllTypes qua mock IPC
  const actionTypesHandler = mockIpcHandles.get('actions:getAllTypes');
  const actionTypesRes = await actionTypesHandler?.({}, {});
  assert(actionTypesRes.success === true, 'IPC actions:getAllTypes trả về success: true');
  assert(Array.isArray(actionTypesRes.data), 'actions:getAllTypes trả về data là mảng');

  // ----------------------------------------------------
  // TỔNG KẾT
  // ----------------------------------------------------
  console.log('\n====================================================');
  console.log(`KẾT QUẢ KIỂM THỬ: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('====================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Lỗi khi chạy kiểm thử:', err);
  process.exit(1);
});
