import {
  AccountEntity,
  AccountFilterPayload,
  AccountListResult,
  BatchUpdateResult,
} from '../../shared/types';
import { query, queryOne, run, transaction } from '../db';

export interface AccountStats {
  total: number;
  liveCount: number;
  dieCount: number;
  checkpointCount: number;
  noProfileCount: number;
}

export interface AccountStatusUpdate {
  id?: number;
  uid?: string;
  status?: string;
  info?: string;
  cookie?: string;
  cookie1?: string;
  token?: string;
  interactEnd?: string;
  proxy?: string;
  fa2?: string;
  pass?: string;
  profile?: string;
  status282?: string;
}

export class AccountRepository {
  private allowedSortColumns = new Set([
    'id',
    'uid',
    'name',
    'email',
    'phone',
    'proxy',
    'status',
    'info',
    'friends',
    'groups',
    'pages',
    'pagePro5',
    'follow',
    'profile',
    'interactEnd',
    'dateCreateAcc',
    'dateImport',
    'created_at',
    'updated_at',
    'idfile',
  ]);

  /**
   * Lấy danh sách tài khoản theo bộ lọc, phân trang, tìm kiếm toàn văn và sắp xếp cột
   */
  public getAll(filter: AccountFilterPayload = {}): AccountListResult {
    const whereClauses: string[] = [];
    const params: any[] = [];

    // Lọc theo trạng thái hoạt động (active = 1 mặc định, hoặc 0 nếu lọc thùng rác)
    const active = filter.active !== undefined ? filter.active : 1;
    whereClauses.push('a.active = ?');
    params.push(active);

    // Lọc theo thư mục
    if (filter.folderId !== undefined && filter.folderId !== null && filter.folderId > 0) {
      whereClauses.push('a.idfile = ?');
      params.push(filter.folderId);
    } else if (filter.folderIds && filter.folderIds.length > 0) {
      const placeholders = filter.folderIds.map(() => '?').join(', ');
      whereClauses.push(`a.idfile IN (${placeholders})`);
      params.push(...filter.folderIds);
    }

    // Tìm kiếm toàn văn (UID, Tên, Email, Proxy, Ghi chú, SĐT)
    const searchTerm = filter.search || filter.searchQuery;
    if (searchTerm && searchTerm.trim() !== '') {
      const term = `%${searchTerm.trim()}%`;
      whereClauses.push(
        '(a.uid LIKE ? OR a.name LIKE ? OR a.email LIKE ? OR a.proxy LIKE ? OR a.ghiChu LIKE ? OR a.phone LIKE ?)'
      );
      params.push(term, term, term, term, term, term);
    }

    // Lọc theo tình trạng info (Live, Die, Checkpoint, Chưa tạo)
    if (filter.infoFilter && filter.infoFilter !== 'All' && filter.infoFilter !== 'ALL') {
      if (filter.infoFilter.toLowerCase() === 'live') {
        whereClauses.push("a.info = 'Live'");
      } else if (filter.infoFilter.toLowerCase() === 'die') {
        whereClauses.push("a.info = 'Die'");
      } else if (filter.infoFilter.toLowerCase().includes('checkpoint')) {
        whereClauses.push("a.info LIKE 'Checkpoint%'");
      } else if (filter.infoFilter === 'Chưa tạo') {
        whereClauses.push("(a.profile = 'Chưa tạo' OR a.profile IS NULL)");
      } else {
        whereClauses.push('a.info = ?');
        params.push(filter.infoFilter);
      }
    }

    // Lọc theo trạng thái thực thi status / info (hỗ trợ cả các enum cũ và mới)
    if (filter.statusFilter && filter.statusFilter !== 'All' && filter.statusFilter !== 'ALL') {
      const sf = filter.statusFilter.toUpperCase();
      if (sf === 'LIVE') {
        whereClauses.push("a.info = 'Live'");
      } else if (sf === 'DIE') {
        whereClauses.push("a.info = 'Die'");
      } else if (sf === 'CHECKPOINT') {
        whereClauses.push("a.info LIKE 'Checkpoint%'");
      } else if (sf === 'RUNNING') {
        whereClauses.push("(a.status = 'Đang chạy' OR a.status LIKE '%chạy%')");
      } else {
        whereClauses.push('(a.status = ? OR a.info = ?)');
        params.push(filter.statusFilter, filter.statusFilter);
      }
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    // Truy vấn thống kê counts tổng quan
    const statsSql = `
      SELECT 
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN a.info = 'Live' THEN 1 ELSE 0 END), 0) AS liveCount,
        COALESCE(SUM(CASE WHEN a.info = 'Die' THEN 1 ELSE 0 END), 0) AS dieCount,
        COALESCE(SUM(CASE WHEN a.info LIKE 'Checkpoint%' THEN 1 ELSE 0 END), 0) AS checkpointCount,
        COALESCE(SUM(CASE WHEN a.profile = 'Chưa tạo' OR a.profile IS NULL THEN 1 ELSE 0 END), 0) AS noProfileCount
      FROM accounts a
      ${whereSql}
    `;
    const statsResult = queryOne<any>(statsSql, params) || {
      total: 0,
      liveCount: 0,
      dieCount: 0,
      checkpointCount: 0,
      noProfileCount: 0,
    };

    // Sắp xếp
    let sortBy = filter.sortBy && this.allowedSortColumns.has(filter.sortBy) ? filter.sortBy : 'id';
    let sortOrder =
      filter.sortOrder && filter.sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    // Phân trang
    const page = Math.max(1, filter.page || 1);
    const limit = filter.limit || filter.pageSize || 50000;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const dataSql = `
      SELECT 
        a.*,
        f.name AS folder_name,
        f.name AS folderName
      FROM accounts a
      LEFT JOIN files f ON a.idfile = f.id
      ${whereSql}
      ORDER BY a.${sortBy} ${sortOrder}
      LIMIT ? OFFSET ?
    `;

    const accounts = query<AccountEntity>(dataSql, queryParams);

    return {
      accounts,
      total: Number(statsResult.total || 0),
      liveCount: Number(statsResult.liveCount || 0),
      dieCount: Number(statsResult.dieCount || 0),
      checkpointCount: Number(statsResult.checkpointCount || 0),
      noProfileCount: Number(statsResult.noProfileCount || 0),
    };
  }

  /**
   * Lấy chi tiết tài khoản theo ID
   */
  public getById(id: number): AccountEntity | null {
    const sql = `
      SELECT 
        a.*,
        f.name AS folder_name,
        f.name AS folderName
      FROM accounts a
      LEFT JOIN files f ON a.idfile = f.id
      WHERE a.id = ?
    `;
    return queryOne<AccountEntity>(sql, [id]);
  }

  /**
   * Tìm tài khoản theo Facebook UID
   */
  public getByUid(uid: string): AccountEntity | null {
    const sql = `
      SELECT 
        a.*,
        f.name AS folder_name,
        f.name AS folderName
      FROM accounts a
      LEFT JOIN files f ON a.idfile = f.id
      WHERE a.uid = ?
    `;
    return queryOne<AccountEntity>(sql, [uid]);
  }

  /**
   * Tạo mới một tài khoản Facebook
   */
  public create(account: Partial<AccountEntity>): AccountEntity {
    if (!account.uid || account.uid.trim() === '') {
      throw new Error('UID không được để trống khi thêm tài khoản');
    }

    const uid = account.uid.trim();
    const pass = account.pass ?? null;
    const token = account.token ?? null;
    const cookie = account.cookie ?? null;
    const cookie1 = account.cookie1 ?? null;
    const email = account.email ?? null;
    const email2 = account.email2 ?? null;
    const email_old = account.email_old ?? null;
    const passmail = account.passmail ?? null;
    const passmail_old = account.passmail_old ?? null;
    const mailrecovery = account.mailrecovery ?? null;
    const passmailrecovery = account.passmailrecovery ?? null;
    const phone = account.phone ?? null;
    const name = account.name ?? null;
    const fa2 = account.fa2 ?? null;
    const useragent = account.useragent ?? null;
    const proxy = account.proxy ?? null;
    const idfile = account.idfile ?? 1;
    const friends = account.friends ?? '0';
    const groups = account.groups ?? '0';
    const pages = account.pages ?? '0';
    const pagePro5 = account.pagePro5 ?? '0';
    const follow = account.follow ?? '0';
    const birthday = account.birthday ?? null;
    const gender = account.gender ?? null;
    const location = account.location ?? null;
    const hometown = account.hometown ?? null;
    const currentCity = account.currentCity ?? null;
    const job = account.job ?? null;
    const dating = account.dating ?? null;
    const ads = account.ads ?? null;
    const bm = account.bm ?? null;
    const wallPosts = account.wallPosts ?? '0';
    const fbBlock = account.fbBlock ?? null;
    const avatar = account.avatar ?? null;
    const profile = account.profile ?? 'Chưa tạo';
    const status = account.status ?? 'Sẵn sàng';
    const info = account.info ?? 'Live';
    const status282 = account.status282 ?? null;
    const interactEnd = account.interactEnd ?? null;
    const dateCreateAcc = account.dateCreateAcc ?? null;
    const dateImport = account.dateImport ?? new Date().toISOString().replace('T', ' ').slice(0, 19);
    const kichban = account.kichban ?? null;
    const infoDevice = account.infoDevice ?? null;
    const cookieHotmail = account.cookieHotmail ?? null;
    const ghiChu = account.ghiChu ?? null;
    const active = account.active ?? 1;

    const sql = `
      INSERT INTO accounts (
        uid, pass, token, cookie, cookie1, email, email2, email_old, passmail, passmail_old,
        mailrecovery, passmailrecovery, phone, name, fa2, useragent, proxy, idfile,
        friends, groups, pages, pagePro5, follow, birthday, gender, location, hometown,
        currentCity, job, dating, ads, bm, wallPosts, fbBlock, avatar, profile, status,
        info, status282, interactEnd, dateCreateAcc, dateImport, kichban, infoDevice,
        cookieHotmail, ghiChu, active
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?
      )
    `;

    const res = run(sql, [
      uid, pass, token, cookie, cookie1, email, email2, email_old, passmail, passmail_old,
      mailrecovery, passmailrecovery, phone, name, fa2, useragent, proxy, idfile,
      friends, groups, pages, pagePro5, follow, birthday, gender, location, hometown,
      currentCity, job, dating, ads, bm, wallPosts, fbBlock, avatar, profile, status,
      info, status282, interactEnd, dateCreateAcc, dateImport, kichban, infoDevice,
      cookieHotmail, ghiChu, active,
    ]);

    const created = this.getById(res.lastInsertRowid);
    if (!created) {
      throw new Error(`Lỗi tạo tài khoản mới: không tìm thấy bản ghi ID ${res.lastInsertRowid}`);
    }
    return created;
  }

  /**
   * Cập nhật thông tin 1 tài khoản
   */
  public update(id: number, updates: Partial<AccountEntity>): boolean {
    const ignoredFields = new Set(['id', 'created_at', 'updated_at', 'folder_name', 'folderName']);
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!ignoredFields.has(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value === undefined ? null : value);
      }
    }

    if (setClauses.length === 0) {
      return true;
    }

    setClauses.push("updated_at = datetime('now', 'localtime')");
    params.push(id);

    const sql = `UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`;
    const res = run(sql, params);
    return res.changes > 0;
  }

  /**
   * Cập nhật hàng loạt nhiều tài khoản cùng lúc (Transaction an toàn)
   */
  public bulkUpdate(ids: number[], updates: Partial<AccountEntity>): BatchUpdateResult {
    if (!ids || ids.length === 0) {
      return { updatedCount: 0 };
    }

    const ignoredFields = new Set(['id', 'created_at', 'updated_at', 'folder_name', 'folderName']);
    const setClauses: string[] = [];
    const params: any[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (!ignoredFields.has(key)) {
        setClauses.push(`${key} = ?`);
        params.push(value === undefined ? null : value);
      }
    }

    if (setClauses.length === 0) {
      return { updatedCount: 0 };
    }

    setClauses.push("updated_at = datetime('now', 'localtime')");

    return transaction(() => {
      let count = 0;
      // SQLite có giới hạn biến tham số (999), nên chia chunk 500 ID
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(', ');
        const sql = `UPDATE accounts SET ${setClauses.join(', ')} WHERE id IN (${placeholders})`;
        const res = run(sql, [...params, ...chunk]);
        count += res.changes;
      }
      return { updatedCount: count };
    });
  }

  /**
   * Cập nhật nhanh trạng thái, cookie, token khi kịch bản automation hoàn thành
   */
  public bulkUpdateStatus(updates: AccountStatusUpdate[]): BatchUpdateResult {
    if (!updates || updates.length === 0) {
      return { updatedCount: 0 };
    }

    return transaction(() => {
      let count = 0;
      for (const item of updates) {
        if (!item.id && !item.uid) continue;

        const setClauses: string[] = [];
        const params: any[] = [];

        if (item.status !== undefined) {
          setClauses.push('status = ?');
          params.push(item.status);
        }
        if (item.info !== undefined) {
          setClauses.push('info = ?');
          params.push(item.info);
        }
        if (item.cookie !== undefined) {
          setClauses.push('cookie = ?');
          params.push(item.cookie);
        }
        if (item.cookie1 !== undefined) {
          setClauses.push('cookie1 = ?');
          params.push(item.cookie1);
        }
        if (item.token !== undefined) {
          setClauses.push('token = ?');
          params.push(item.token);
        }
        if (item.interactEnd !== undefined) {
          setClauses.push('interactEnd = ?');
          params.push(item.interactEnd);
        }
        if (item.proxy !== undefined) {
          setClauses.push('proxy = ?');
          params.push(item.proxy);
        }
        if (item.fa2 !== undefined) {
          setClauses.push('fa2 = ?');
          params.push(item.fa2);
        }
        if (item.pass !== undefined) {
          setClauses.push('pass = ?');
          params.push(item.pass);
        }
        if (item.profile !== undefined) {
          setClauses.push('profile = ?');
          params.push(item.profile);
        }
        if (item.status282 !== undefined) {
          setClauses.push('status282 = ?');
          params.push(item.status282);
        }

        if (setClauses.length === 0) continue;

        setClauses.push("updated_at = datetime('now', 'localtime')");

        let sql = '';
        if (item.id) {
          params.push(item.id);
          sql = `UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`;
        } else {
          params.push(item.uid);
          sql = `UPDATE accounts SET ${setClauses.join(', ')} WHERE uid = ?`;
        }

        const res = run(sql, params);
        count += res.changes;
      }
      return { updatedCount: count };
    });
  }

  /**
   * Xóa tài khoản (mặc định soft delete chuyển vào thùng rác active = 0)
   */
  public delete(ids: number[], softDelete = true): { deletedCount: number } {
    if (!ids || ids.length === 0) {
      return { deletedCount: 0 };
    }

    return transaction(() => {
      let count = 0;
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(', ');
        let sql = '';
        if (softDelete) {
          sql = `UPDATE accounts SET active = 0, dateDelete = datetime('now', 'localtime') WHERE id IN (${placeholders})`;
        } else {
          sql = `DELETE FROM accounts WHERE id IN (${placeholders})`;
        }
        const res = run(sql, chunk);
        count += res.changes;
      }
      return { deletedCount: count };
    });
  }

  /**
   * Chuyển danh sách tài khoản sang thư mục khác
   */
  public moveToFolder(accountIds: number[], targetFolderId: number): boolean {
    if (!accountIds || accountIds.length === 0) return true;

    return transaction(() => {
      const chunkSize = 500;
      for (let i = 0; i < accountIds.length; i += chunkSize) {
        const chunk = accountIds.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(', ');
        const sql = `UPDATE accounts SET idfile = ?, updated_at = datetime('now', 'localtime') WHERE id IN (${placeholders})`;
        run(sql, [targetFolderId, ...chunk]);
      }
      return true;
    });
  }

  /**
   * Lấy thống kê số lượng tài khoản (tổng, Live, Die, Checkpoint, Chưa tạo profile)
   */
  public getStats(folderIds?: number[]): AccountStats {
    let whereClause = 'WHERE a.active = 1';
    const params: any[] = [];

    if (folderIds && folderIds.length > 0) {
      const placeholders = folderIds.map(() => '?').join(', ');
      whereClause += ` AND a.idfile IN (${placeholders})`;
      params.push(...folderIds);
    }

    const sql = `
      SELECT 
        COUNT(*) AS total,
        COALESCE(SUM(CASE WHEN a.info = 'Live' THEN 1 ELSE 0 END), 0) AS liveCount,
        COALESCE(SUM(CASE WHEN a.info = 'Die' THEN 1 ELSE 0 END), 0) AS dieCount,
        COALESCE(SUM(CASE WHEN a.info LIKE 'Checkpoint%' THEN 1 ELSE 0 END), 0) AS checkpointCount,
        COALESCE(SUM(CASE WHEN a.profile = 'Chưa tạo' OR a.profile IS NULL THEN 1 ELSE 0 END), 0) AS noProfileCount
      FROM accounts a
      ${whereClause}
    `;

    const res = queryOne<any>(sql, params) || {};
    return {
      total: Number(res.total || 0),
      liveCount: Number(res.liveCount || 0),
      dieCount: Number(res.dieCount || 0),
      checkpointCount: Number(res.checkpointCount || 0),
      noProfileCount: Number(res.noProfileCount || 0),
    };
  }

  /**
   * Lấy danh sách tài khoản trong thùng rác
   */
  public getTrash(): AccountEntity[] {
    const sql = `
      SELECT 
        a.*,
        f.name AS folder_name,
        f.name AS folderName
      FROM accounts a
      LEFT JOIN files f ON a.idfile = f.id
      WHERE a.active = 0
      ORDER BY a.dateDelete DESC, a.id DESC
    `;
    return query<AccountEntity>(sql);
  }

  /**
   * Khôi phục tài khoản từ thùng rác
   */
  public restoreFromTrash(ids: number[]): { restoredCount: number } {
    if (!ids || ids.length === 0) return { restoredCount: 0 };

    return transaction(() => {
      let count = 0;
      const chunkSize = 500;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const placeholders = chunk.map(() => '?').join(', ');
        const sql = `UPDATE accounts SET active = 1, dateDelete = NULL, updated_at = datetime('now', 'localtime') WHERE id IN (${placeholders}) AND active = 0`;
        const res = run(sql, chunk);
        count += res.changes;
      }
      return { restoredCount: count };
    });
  }

  /**
   * Dọn sạch hoàn toàn thùng rác (xóa vĩnh viễn)
   */
  public emptyTrash(): { purgedCount: number } {
    const sql = 'DELETE FROM accounts WHERE active = 0';
    const res = run(sql);
    return { purgedCount: res.changes };
  }
}

export const accountRepository = new AccountRepository();
