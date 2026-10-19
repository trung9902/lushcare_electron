import fs from 'fs';
import path from 'path';
import {
  initDatabase,
  getDatabase,
  flushDatabase,
  closeDatabase,
  query,
} from '../db';
import { accountRepository } from '../repositories/AccountRepository';
import { folderRepository } from '../repositories/FolderRepository';
import { scenarioRepository } from '../repositories/ScenarioRepository';
import { importExportService } from '../services/ImportExportService';

async function runTests() {
  console.log('====================================================');
  console.log('BẮT ĐẦU KIỂM THỬ TOÀN DIỆN DATABASE & REPOSITORIES');
  console.log('====================================================\n');

  const testDbDir = path.resolve(process.cwd(), 'database');
  const testDbPath = path.resolve(testDbDir, 'test_lushcare.sqlite');

  // Xóa DB test cũ nếu có
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // ----------------------------------------------------
  // TEST 1: Khởi tạo CSDL & Schema
  // ----------------------------------------------------
  console.log('[TEST 1] Khởi tạo Database SQLite từ DATABASE_SCHEMA.sql...');
  await initDatabase({ dbPath: testDbPath });

  // Kiểm tra thư mục database/ và interact/
  if (!fs.existsSync(path.resolve(process.cwd(), 'database'))) {
    throw new Error('Thư mục database/ chưa được tạo!');
  }
  if (!fs.existsSync(path.resolve(process.cwd(), 'interact'))) {
    throw new Error('Thư mục interact/ chưa được tạo!');
  }
  console.log(' -> Thư mục database/ và interact/ đã sẵn sàng.');

  // Kiểm tra seed data
  const defaultFolder = folderRepository.getById(1);
  if (!defaultFolder || defaultFolder.name !== 'Mặc định') {
    throw new Error(`Thư mục mặc định không đúng: ${JSON.stringify(defaultFolder)}`);
  }
  console.log(' -> Thư mục mặc định:', defaultFolder.name);

  const actionTypes = scenarioRepository.getAllActionTypes();
  console.log(` -> Đã nạp thành công ${actionTypes.length} loại hành động tương tác (Tuong_Tac).`);
  if (actionTypes.length !== 70) {
    throw new Error(`Kỳ vọng 70 loại hành động, nhận được ${actionTypes.length}`);
  }

  // ----------------------------------------------------
  // TEST 2: Quản lý Thư mục (FolderRepository)
  // ----------------------------------------------------
  console.log('\n[TEST 2] Kiểm tra FolderRepository CRUD & Reorder...');
  const folderA = folderRepository.create('Via Ngoại Cổ', 10);
  const folderB = folderRepository.create('Clone Nuôi Tương Tác', 20);
  console.log(` -> Đã tạo thư mục ID ${folderA.id}: '${folderA.name}' và ID ${folderB.id}: '${folderB.name}'`);

  folderRepository.rename(folderA.id, 'Via Ngoại 2020-2022');
  const renamed = folderRepository.getById(folderA.id);
  if (renamed?.name !== 'Via Ngoại 2020-2022') {
    throw new Error('Rename thư mục thất bại!');
  }
  console.log(' -> Đổi tên thư mục thành công:', renamed.name);

  folderRepository.reorder([folderB.id, folderA.id, 1]);
  const foldersAfterReorder = folderRepository.getAll().folders;
  console.log(' -> Thứ tự sau reorder:', foldersAfterReorder.map((f) => `${f.name} (STT:${f.STT})`).join(' -> '));

  // ----------------------------------------------------
  // TEST 3: Quản lý Tài khoản (AccountRepository CRUD & Filters)
  // ----------------------------------------------------
  console.log('\n[TEST 3] Kiểm tra AccountRepository CRUD & Queries...');
  const acc1 = accountRepository.create({
    uid: '1000800010001',
    pass: 'Pass@123',
    fa2: 'JBSWY3DPEHPK3PXP',
    email: 'user1@outlook.com',
    proxy: '1.2.3.4:8080:user:pass',
    name: 'Nguyễn Văn Một',
    info: 'Live',
    idfile: folderA.id,
  });

  const acc2 = accountRepository.create({
    uid: '1000800010002',
    pass: 'Pass@456',
    email: 'user2@gmail.com',
    name: 'Trần Thị Hai',
    info: 'Checkpoint 282',
    status282: 'Kháng ngày 15/10',
    idfile: folderA.id,
  });

  const acc3 = accountRepository.create({
    uid: '1000800010003',
    pass: 'Pass@789',
    name: 'Lê Văn Ba',
    info: 'Die',
    idfile: folderB.id,
  });

  console.log(` -> Đã tạo 3 tài khoản: acc1(${acc1.id}), acc2(${acc2.id}), acc3(${acc3.id})`);

  // Kiểm tra tìm kiếm toàn văn
  const searchRes = accountRepository.getAll({ search: 'user1@outlook.com' });
  if (searchRes.accounts.length !== 1 || searchRes.accounts[0].uid !== '1000800010001') {
    throw new Error('Tìm kiếm theo Email thất bại!');
  }
  console.log(' -> Tìm kiếm toàn văn (search: user1@outlook.com): OK');

  // Kiểm tra lọc theo thư mục
  const folderARes = accountRepository.getAll({ folderId: folderA.id });
  if (folderARes.accounts.length !== 2) {
    throw new Error(`Lọc theo folderA kỳ vọng 2, nhận được ${folderARes.accounts.length}`);
  }
  console.log(` -> Lọc theo folderA (ID ${folderA.id}): ${folderARes.accounts.length} nick (Live: ${folderARes.liveCount}, Die: ${folderARes.dieCount}, Checkpoint: ${folderARes.checkpointCount})`);

  // Kiểm tra getStats
  const stats = accountRepository.getStats();
  console.log(' -> Thống kê toàn bộ:', stats);
  if (stats.total !== 3 || stats.liveCount !== 1 || stats.dieCount !== 1 || stats.checkpointCount !== 1) {
    throw new Error('Thống kê getStats không chính xác!');
  }

  // Chuyển thư mục
  accountRepository.moveToFolder([acc3.id], folderA.id);
  const acc3Updated = accountRepository.getById(acc3.id);
  if (acc3Updated?.idfile !== folderA.id) {
    throw new Error('Move to folder thất bại!');
  }
  console.log(' -> moveToFolder thành công: acc3 đã chuyển sang folderA.');

  // Bulk update status
  accountRepository.bulkUpdateStatus([
    { id: acc1.id, status: 'Hoàn thành tương tác', cookie: 'c_user=1000800010001; xs=123', interactEnd: '2026-10-17 12:00:00' },
  ]);
  const acc1Reloaded = accountRepository.getById(acc1.id);
  if (acc1Reloaded?.status !== 'Hoàn thành tương tác' || !acc1Reloaded?.cookie?.includes('c_user=')) {
    throw new Error('bulkUpdateStatus thất bại!');
  }
  console.log(' -> bulkUpdateStatus thành công:', acc1Reloaded.status, acc1Reloaded.cookie);

  // ----------------------------------------------------
  // TEST 4: Thùng rác (Trash)
  // ----------------------------------------------------
  console.log('\n[TEST 4] Kiểm tra Thùng rác (Trash Lifecycle)...');
  accountRepository.delete([acc2.id], true); // soft delete
  const trashList = accountRepository.getTrash();
  if (trashList.length !== 1 || trashList[0].id !== acc2.id) {
    throw new Error('Soft delete vào thùng rác thất bại!');
  }
  console.log(' -> Tài khoản đã vào thùng rác:', trashList[0].name);

  // Khôi phục
  accountRepository.restoreFromTrash([acc2.id]);
  const restored = accountRepository.getById(acc2.id);
  if (restored?.active !== 1) {
    throw new Error('Khôi phục từ thùng rác thất bại!');
  }
  console.log(' -> Khôi phục tài khoản từ thùng rác: OK');

  // ----------------------------------------------------
  // TEST 5: Dịch vụ Nhập/Xuất Thông Minh (ImportExportService)
  // ----------------------------------------------------
  console.log('\n[TEST 5] Kiểm tra ImportExportService...');

  const importText = `
1000900010001|PassSecret1|2FASECRET1|c_user=1000900010001; xs=aaa|mail1@test.com
1000900010002|PassSecret2|2FASECRET2|c_user=1000900010002; xs=bbb|mail2@test.com
|PassSecret3|2FASECRET3|c_user=1000900010003; xs=ccc|mail3@test.com
1000900010001|NewPass1|2FASECRET1_UPDATED|c_user=1000900010001; xs=updated|mail1@test.com
`;

  console.log(' -> Thử nghiệm nhập 4 dòng (có dòng thiếu UID nhưng có cookie chứa c_user, có dòng trùng lặp UID)...');
  const importResult = importExportService.importAccounts({
    folderId: folderB.id,
    rawText: importText,
    delimiter: '|',
    format: 'uid|pass|2fa|cookie|email',
    duplicateHandling: 'overwrite',
    assignedProxyList: ['10.0.0.1:8080', '10.0.0.2:8080'],
  });

  console.log(' -> Kết quả Import:', importResult);
  if (importResult.importedCount !== 3 || importResult.overwrittenCount !== 1) {
    throw new Error(`Kết quả import không khớp: imported=${importResult.importedCount}, overwritten=${importResult.overwrittenCount}`);
  }

  // Kiểm tra tài khoản thứ 3 (trích xuất c_user tự động)
  const autoExtracted = accountRepository.getByUid('1000900010003');
  if (!autoExtracted || autoExtracted.pass !== 'PassSecret3') {
    throw new Error('Trích xuất c_user tự động từ cookie thất bại!');
  }
  console.log(' -> Tự động trích xuất c_user từ cookie thành công: UID =', autoExtracted.uid);

  // Thử nghiệm Export
  const exportTxt = importExportService.exportAccounts({
    accountIds: [autoExtracted.id],
    format: 'uid|pass|email|proxy',
    exportType: 'txt',
  });
  console.log(' -> Export dạng TXT:', exportTxt.content);

  const exportCsv = importExportService.exportAccounts({
    accountIds: [autoExtracted.id],
    format: 'uid|pass|email|proxy',
    exportType: 'csv',
  });
  console.log(' -> Export dạng CSV:', exportCsv.content);

  // ----------------------------------------------------
  // TEST 6: Kịch bản & Hành động (ScenarioRepository)
  // ----------------------------------------------------
  console.log('\n[TEST 6] Kiểm tra ScenarioRepository...');
  const newScen = scenarioRepository.create('Kịch bản Nuôi Via Cổ VIP', { delay: 10 });
  console.log(` -> Đã tạo kịch bản ID ${newScen.id}: '${newScen.name}'`);

  const step1 = scenarioRepository.createAction({
    scenarioId: newScen.id,
    actionCode: 'HDBaiVietNewsfeed',
    config: { soLuongBaiMin: 5, soLuongBaiMax: 10 },
  });
  const step2 = scenarioRepository.createAction({
    scenarioId: newScen.id,
    actionCode: 'HDXemWatch',
    config: { soLuongVideoMin: 2, soLuongVideoMax: 5 },
  });
  console.log(` -> Đã thêm 2 bước hành động: '${step1.actionName}' và '${step2.actionName}'`);

  const scenDetails = scenarioRepository.getById(newScen.id);
  if (!scenDetails || scenDetails.actions.length !== 2) {
    throw new Error('Lấy chi tiết kịch bản thất bại!');
  }
  console.log(` -> Lấy kịch bản kèm ${scenDetails.actions.length} bước con thành công.`);

  // Nhân bản kịch bản
  const dupRes = scenarioRepository.duplicate(newScen.id);
  const dupScen = scenarioRepository.getById(dupRes.newScenarioId);
  if (!dupScen || dupScen.actions.length !== 2 || !dupScen.name.includes('(Bản sao)')) {
    throw new Error('Nhân bản kịch bản thất bại!');
  }
  console.log(` -> Nhân bản kịch bản thành công: ID ${dupScen.id} '${dupScen.name}' kèm ${dupScen.actions.length} bước.`);

  // ----------------------------------------------------
  // TEST 7: Kiểm tra Lưu trữ Bền vững (Persistence Check)
  // ----------------------------------------------------
  console.log('\n[TEST 7] Kiểm tra tính lưu trữ bền vững (flush & reload từ đĩa)...');
  flushDatabase();
  const diskFileSizeBeforeClose = fs.statSync(testDbPath).size;
  console.log(` -> Kích thước file CSDL trên ổ đĩa: ${diskFileSizeBeforeClose} bytes`);
  closeDatabase();

  // Mở lại từ file trên đĩa
  await initDatabase({ dbPath: testDbPath });
  const reloadedAcc = accountRepository.getByUid('1000900010003');
  if (!reloadedAcc || reloadedAcc.pass !== 'PassSecret3') {
    throw new Error('Dữ liệu không được nạp lại chính xác từ ổ đĩa!');
  }
  const allFoldersReloaded = folderRepository.getAll();
  console.log(` -> Đọc lại từ đĩa thành công: ${allFoldersReloaded.folders.length} thư mục, ${allFoldersReloaded.allCount} tài khoản.`);
  closeDatabase();

  // Dọn dẹp file test
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  if (fs.existsSync(`${testDbPath}.tmp`)) {
    fs.unlinkSync(`${testDbPath}.tmp`);
  }

  console.log('\n====================================================');
  console.log('TẤT CẢ 7 BỘ TEST ĐỀU HOÀN THÀNH XUẤT SẮC 100%!');
  console.log('====================================================');
}

runTests().catch((err) => {
  console.error('\n❌ BÀI TEST THẤT BẠI:', err);
  process.exit(1);
});
