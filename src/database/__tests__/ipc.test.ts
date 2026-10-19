import { app, ipcMain } from 'electron';
import fs from 'fs';
import path from 'path';
import { closeDatabase, initDatabase } from '../db';
import { registerDatabaseIpc } from '../../main/ipc/databaseIpc';

// Map lưu các handlers được đăng ký
const registeredHandlers = new Map<string, Function>();

// Monkey-patch ipcMain.handle để chúng ta có thể gọi trực tiếp từ test runner
const originalHandle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel: string, listener: any) => {
  registeredHandlers.set(channel, listener);
  return originalHandle(channel, listener);
};

async function invokeIpc(channel: string, ...args: any[]) {
  const handler = registeredHandlers.get(channel);
  if (!handler) {
    throw new Error(`Handler cho kênh '${channel}' chưa được đăng ký!`);
  }
  const fakeEvent = { sender: {} } as any;
  return await handler(fakeEvent, ...args);
}

app.whenReady().then(async () => {
  try {
    console.log('====================================================');
    console.log('BẮT ĐẦU KIỂM THỬ END-TO-END DATABASE IPC HANDLERS');
    console.log('====================================================\n');

    const testDbPath = path.resolve(process.cwd(), 'database', 'test_ipc.sqlite');
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }

    await initDatabase({ dbPath: testDbPath });
    await registerDatabaseIpc();

    console.log(` -> Đã đăng ký ${registeredHandlers.size} IPC handlers trong Electron.`);

    // 1. Kiểm tra folders:*
    console.log('\n[IPC TEST 1] Kiểm tra folders:* IPC channels...');
    const createFolderRes = await invokeIpc('folders:create', 'Folder IPC Test');
    console.log(' -> folders:create:', createFolderRes);
    if (!createFolderRes.success || createFolderRes.data.name !== 'Folder IPC Test') {
      throw new Error('folders:create thất bại');
    }
    const folderId = createFolderRes.data.id;

    const getAllFoldersRes = await invokeIpc('folders:getAll');
    if (!getAllFoldersRes.success || getAllFoldersRes.data.folders.length < 2) {
      throw new Error('folders:getAll thất bại');
    }
    console.log(` -> folders:getAll: Thành công (${getAllFoldersRes.data.folders.length} thư mục)`);

    const updateFolderRes = await invokeIpc('folders:update', folderId, 'Folder IPC Renamed');
    if (!updateFolderRes.success || !updateFolderRes.data) {
      throw new Error('folders:update thất bại');
    }
    console.log(' -> folders:update: Thành công');

    // 2. Kiểm tra accounts:*
    console.log('\n[IPC TEST 2] Kiểm tra accounts:* IPC channels...');
    const createAccRes = await invokeIpc('accounts:create', {
      uid: '100099990001',
      pass: 'TestPass@1',
      name: 'IPC Account 1',
      idfile: folderId,
      proxy: '127.0.0.1:8080',
    });
    console.log(' -> accounts:create:', createAccRes.success, 'ID:', createAccRes.data?.id);
    if (!createAccRes.success) throw new Error('accounts:create thất bại');
    const accId = createAccRes.data.id;

    const getByIdRes = await invokeIpc('accounts:getById', accId);
    if (!getByIdRes.success || getByIdRes.data.uid !== '100099990001') {
      throw new Error('accounts:getById thất bại');
    }
    console.log(' -> accounts:getById: Thành công');

    const updateAccRes = await invokeIpc('accounts:update', accId, {
      name: 'IPC Account Updated',
      status: 'Đang chạy',
    });
    if (!updateAccRes.success || !updateAccRes.data) {
      throw new Error('accounts:update thất bại');
    }
    console.log(' -> accounts:update: Thành công');

    const getAllAccsRes = await invokeIpc('accounts:getAll', { folderId });
    if (!getAllAccsRes.success || getAllAccsRes.data.accounts.length !== 1) {
      throw new Error('accounts:getAll thất bại');
    }
    console.log(` -> accounts:getAll: Thành công (${getAllAccsRes.data.total} tài khoản)`);

    // 3. Kiểm tra accounts:import & export
    console.log('\n[IPC TEST 3] Kiểm tra accounts:import & accounts:export...');
    const importRes = await invokeIpc('accounts:import', {
      folderId,
      rawText: '100099990002|Pass2|2FAKEY2|cookie_2\n100099990003|Pass3|2FAKEY3|cookie_3',
      format: 'uid|pass|2fa|cookie',
    });
    if (!importRes.success || importRes.data.importedCount !== 2) {
      throw new Error('accounts:import thất bại');
    }
    console.log(' -> accounts:import:', importRes.data);

    const exportRes = await invokeIpc('accounts:export', {
      accountIds: [accId],
      format: 'uid|pass',
      exportType: 'txt',
    });
    if (!exportRes.success || !exportRes.data.clipboardText) {
      throw new Error('accounts:export thất bại');
    }
    console.log(' -> accounts:export:', exportRes.data.clipboardText);

    // 4. Kiểm tra scenarios:* & actions:*
    console.log('\n[IPC TEST 4] Kiểm tra scenarios:* & actions:* channels...');
    const createScenRes = await invokeIpc('scenarios:create', 'Kịch bản IPC Test', { loop: 2 });
    if (!createScenRes.success) throw new Error('scenarios:create thất bại');
    const scenId = createScenRes.data.id;
    console.log(' -> scenarios:create: ID', scenId);

    const createActionRes = await invokeIpc('actions:create', {
      scenarioId: scenId,
      actionCode: 'HDBaiVietNewsfeed',
      actionName: 'Lướt newsfeed test IPC',
      config: { soLuongBaiMin: 3, soLuongBaiMax: 7 },
    });
    if (!createActionRes.success) throw new Error('actions:create thất bại');
    console.log(' -> actions:create: ID', createActionRes.data.id);

    const getScenDetailRes = await invokeIpc('scenarios:getById', scenId);
    if (!getScenDetailRes.success || getScenDetailRes.data.actions.length !== 1) {
      throw new Error('scenarios:getById thất bại');
    }
    console.log(` -> scenarios:getById: Thành công (${getScenDetailRes.data.actions.length} bước)`);

    // 5. Kiểm tra settings:*
    console.log('\n[IPC TEST 5] Kiểm tra settings:* channels...');
    const setRes = await invokeIpc('settings:set', 'test_key', { a: 1, b: 'hello' });
    if (!setRes.success) throw new Error('settings:set thất bại');

    const getRes = await invokeIpc('settings:get', 'test_key');
    if (!getRes.success || getRes.data?.b !== 'hello') {
      throw new Error('settings:get thất bại');
    }
    console.log(' -> settings:get & set: Thành công:', getRes.data);

    // Dọn dẹp
    closeDatabase();
    if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    if (fs.existsSync(`${testDbPath}.tmp`)) fs.unlinkSync(`${testDbPath}.tmp`);

    console.log('\n====================================================');
    console.log('TẤT CẢ IPC CHANNELS ĐÃ VƯỢT QUA TEST THÀNH CÔNG 100%!');
    console.log('====================================================');
    app.exit(0);
  } catch (err) {
    console.error('\n❌ IPC TEST THẤT BẠI:', err);
    app.exit(1);
  }
});
