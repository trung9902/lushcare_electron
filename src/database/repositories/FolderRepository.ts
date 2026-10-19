import { FolderItem, FolderListResult } from '../../shared/types';
import { query, queryOne, run, transaction } from '../db';

export class FolderRepository {
  /**
   * Lấy danh sách toàn bộ thư mục kèm thống kê số lượng tài khoản Live/Die/Checkpoint
   */
  public getAll(): FolderListResult {
    // 1. Thống kê tổng số tài khoản hoạt động và số tài khoản trong thùng rác
    const statsSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN active = 1 THEN 1 ELSE 0 END), 0) AS allCount,
        COALESCE(SUM(CASE WHEN active = 0 THEN 1 ELSE 0 END), 0) AS trashCount
      FROM accounts;
    `;
    const overallStats = queryOne<any>(statsSql) || { allCount: 0, trashCount: 0 };

    // 2. Lấy danh sách thư mục đang hoạt động (active = 1) kèm số lượng nick con
    const folderSql = `
      SELECT 
        f.id,
        f.name,
        f.createddate,
        f.active,
        f.STT,
        COUNT(a.id) AS totalAccounts,
        COALESCE(SUM(CASE WHEN a.info = 'Live' THEN 1 ELSE 0 END), 0) AS liveAccounts,
        COALESCE(SUM(CASE WHEN a.info = 'Die' THEN 1 ELSE 0 END), 0) AS dieAccounts,
        COALESCE(SUM(CASE WHEN a.info LIKE 'Checkpoint%' THEN 1 ELSE 0 END), 0) AS checkpointAccounts
      FROM files f
      LEFT JOIN accounts a ON a.idfile = f.id AND a.active = 1
      WHERE f.active = 1
      GROUP BY f.id, f.name, f.createddate, f.active, f.STT
      ORDER BY f.STT ASC, f.id ASC;
    `;

    const rawFolders = query<any>(folderSql);
    const folders: FolderItem[] = rawFolders.map((f) => ({
      id: Number(f.id),
      name: String(f.name),
      createddate: f.createddate,
      active: Number(f.active),
      STT: Number(f.STT || 0),
      totalAccounts: Number(f.totalAccounts || 0),
      liveAccounts: Number(f.liveAccounts || 0),
      dieAccounts: Number(f.dieAccounts || 0),
      checkpointAccounts: Number(f.checkpointAccounts || 0),
      // Backwards-compatible fields
      accountCount: Number(f.totalAccounts || 0),
      liveCount: Number(f.liveAccounts || 0),
      dieCount: Number(f.dieAccounts || 0),
    }));

    return {
      folders,
      allCount: Number(overallStats.allCount || 0),
      trashCount: Number(overallStats.trashCount || 0),
      totalAccounts: Number(overallStats.allCount || 0),
      totalLive: folders.reduce((sum, f) => sum + (f.liveAccounts || 0), 0),
      totalDie: folders.reduce((sum, f) => sum + (f.dieAccounts || 0), 0),
    };
  }

  /**
   * Lấy chi tiết một thư mục theo ID
   */
  public getById(id: number): FolderItem | null {
    const sql = `
      SELECT 
        f.id,
        f.name,
        f.createddate,
        f.active,
        f.STT,
        COUNT(a.id) AS totalAccounts,
        COALESCE(SUM(CASE WHEN a.info = 'Live' THEN 1 ELSE 0 END), 0) AS liveAccounts,
        COALESCE(SUM(CASE WHEN a.info = 'Die' THEN 1 ELSE 0 END), 0) AS dieAccounts,
        COALESCE(SUM(CASE WHEN a.info LIKE 'Checkpoint%' THEN 1 ELSE 0 END), 0) AS checkpointAccounts
      FROM files f
      LEFT JOIN accounts a ON a.idfile = f.id AND a.active = 1
      WHERE f.id = ?
      GROUP BY f.id, f.name, f.createddate, f.active, f.STT;
    `;

    const f = queryOne<any>(sql, [id]);
    if (!f) return null;

    return {
      id: Number(f.id),
      name: String(f.name),
      createddate: f.createddate,
      active: Number(f.active),
      STT: Number(f.STT || 0),
      totalAccounts: Number(f.totalAccounts || 0),
      liveAccounts: Number(f.liveAccounts || 0),
      dieAccounts: Number(f.dieAccounts || 0),
      checkpointAccounts: Number(f.checkpointAccounts || 0),
      accountCount: Number(f.totalAccounts || 0),
      liveCount: Number(f.liveAccounts || 0),
      dieCount: Number(f.dieAccounts || 0),
    };
  }

  /**
   * Tạo mới thư mục
   */
  public create(name: string, STT?: number): FolderItem {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tên thư mục không được để trống');
    }

    let nextStt = STT;
    if (nextStt === undefined || nextStt === null) {
      const maxSttRes = queryOne<any>('SELECT COALESCE(MAX(STT), 0) AS maxStt FROM files');
      nextStt = (Number(maxSttRes?.maxStt) || 0) + 1;
    }

    const insertSql = `
      INSERT INTO files (name, STT, active, createddate)
      VALUES (?, ?, 1, datetime('now', 'localtime'));
    `;
    const res = run(insertSql, [trimmedName, nextStt]);

    const created = this.getById(res.lastInsertRowid);
    if (!created) {
      throw new Error(`Không thể tạo thư mục '${trimmedName}'`);
    }
    return created;
  }

  /**
   * Đổi tên hoặc cập nhật thứ tự thư mục
   */
  public rename(id: number, name: string): boolean {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tên thư mục không được để trống');
    }
    const res = run('UPDATE files SET name = ? WHERE id = ?;', [trimmedName, id]);
    return res.changes > 0;
  }

  /**
   * Cập nhật thông tin thư mục (tên, STT)
   */
  public update(id: number, name: string, STT?: number): boolean {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tên thư mục không được để trống');
    }

    if (STT !== undefined && STT !== null) {
      const res = run('UPDATE files SET name = ?, STT = ? WHERE id = ?;', [trimmedName, STT, id]);
      return res.changes > 0;
    } else {
      return this.rename(id, trimmedName);
    }
  }

  /**
   * Xóa thư mục:
   * - Nếu deleteAccountsPermanently = true: xóa vĩnh viễn nick thuộc thư mục
   * - Ngược lại: chuyển toàn bộ nick con vào thùng rác (active = 0)
   * - Đánh dấu thư mục active = 0 (soft delete)
   */
  public delete(id: number, deleteAccountsPermanently = false): boolean {
    return transaction(() => {
      if (deleteAccountsPermanently) {
        run('DELETE FROM accounts WHERE idfile = ?;', [id]);
      } else {
        run(
          "UPDATE accounts SET active = 0, dateDelete = datetime('now', 'localtime') WHERE idfile = ?;",
          [id]
        );
      }

      const res = run('UPDATE files SET active = 0 WHERE id = ?;', [id]);
      return res.changes > 0;
    });
  }

  /**
   * Cập nhật lại thứ tự hiển thị STT của các thư mục
   */
  public reorder(folderIds: number[]): boolean {
    if (!folderIds || folderIds.length === 0) return true;

    return transaction(() => {
      for (let i = 0; i < folderIds.length; i++) {
        const id = folderIds[i];
        const newStt = i + 1;
        run('UPDATE files SET STT = ? WHERE id = ?;', [newStt, id]);
      }
      return true;
    });
  }
}

export const folderRepository = new FolderRepository();
