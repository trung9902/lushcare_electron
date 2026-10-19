import fs from 'fs';
import path from 'path';
import initSqlJs, { Database as SqlJsDatabase, Statement } from 'sql.js';

export interface DatabaseOptions {
  dbPath?: string;
  schemaPath?: string;
  autoFlush?: boolean;
}

export interface RunResult {
  changes: number;
  lastInsertRowid: number;
}

class DatabaseManager {
  private db: SqlJsDatabase | null = null;
  private dbPath: string;
  private autoFlush: boolean;
  private initialized = false;
  private isTransactionActive = false;

  constructor() {
    this.dbPath = path.resolve(process.cwd(), 'database', 'db_lushcare.sqlite');
    this.autoFlush = true;
  }

  /**
   * Khởi tạo kết nối SQLite với sql.js
   * Tự động tạo thư mục database/ và interact/, nạp hoặc khởi tạo db_lushcare.sqlite từ DATABASE_SCHEMA.sql
   */
  public async init(options?: DatabaseOptions): Promise<SqlJsDatabase> {
    if (this.initialized && this.db) {
      return this.db;
    }

    if (options?.dbPath) {
      this.dbPath = path.resolve(options.dbPath);
    }
    if (options?.autoFlush !== undefined) {
      this.autoFlush = options.autoFlush;
    }

    const rootDir = process.cwd();
    const databaseDir = path.dirname(this.dbPath);
    const interactDir = path.resolve(rootDir, 'interact');

    // Tự động tạo thư mục database/ và interact/
    if (!fs.existsSync(databaseDir)) {
      fs.mkdirSync(databaseDir, { recursive: true });
    }
    if (!fs.existsSync(interactDir)) {
      fs.mkdirSync(interactDir, { recursive: true });
    }

    const SQL = await initSqlJs();

    if (fs.existsSync(this.dbPath)) {
      try {
        const fileBuffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(fileBuffer);
      } catch (err) {
        console.warn(`[Database] Không thể đọc tệp CSDL hiện hữu: ${this.dbPath}, khởi tạo mới...`, err);
        this.db = new SQL.Database();
        this.applySchema(options?.schemaPath);
        this.flush();
      }
    } else {
      this.db = new SQL.Database();
      this.applySchema(options?.schemaPath);
      this.flush();
    }

    // Đảm bảo Foreign Keys được bật
    this.db.run('PRAGMA foreign_keys = ON;');

    this.initialized = true;

    // Flush khi tiến trình dừng an toàn
    const onProcessExit = () => {
      this.flush();
    };
    process.once('beforeExit', onProcessExit);

    return this.db;
  }

  /**
   * Nạp và thực thi DATABASE_SCHEMA.sql
   */
  private applySchema(customSchemaPath?: string): void {
    if (!this.db) return;

    const candidatePaths = [
      customSchemaPath,
      path.resolve(process.cwd(), 'docs', 'DATABASE_SCHEMA.sql'),
      path.resolve(__dirname, '../../docs/DATABASE_SCHEMA.sql'),
      path.resolve(__dirname, '../../../docs/DATABASE_SCHEMA.sql'),
    ].filter(Boolean) as string[];

    let schemaContent: string | null = null;
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          schemaContent = fs.readFileSync(p, 'utf8');
          break;
        } catch {}
      }
    }

    if (schemaContent) {
      try {
        this.db.run(schemaContent);
        return;
      } catch (err) {
        console.error('[Database] Lỗi thực thi DATABASE_SCHEMA.sql:', err);
      }
    }

    // Fallback DDL nếu không đọc được file
    this.applyFallbackSchema();
  }

  /**
   * Schema dự phòng tối thiểu đảm bảo hệ thống không bao giờ crash
   */
  private applyFallbackSchema(): void {
    if (!this.db) return;
    const fallbackSql = `
      CREATE TABLE IF NOT EXISTS files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        createddate TEXT DEFAULT (datetime('now', 'localtime')),
        active INTEGER NOT NULL DEFAULT 1,
        STT INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS accounts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        uid TEXT NOT NULL,
        pass TEXT,
        token TEXT,
        cookie TEXT,
        cookie1 TEXT,
        email TEXT,
        email2 TEXT,
        email_old TEXT,
        passmail TEXT,
        passmail_old TEXT,
        mailrecovery TEXT,
        passmailrecovery TEXT,
        phone TEXT,
        name TEXT,
        fa2 TEXT,
        useragent TEXT,
        proxy TEXT,
        idfile INTEGER,
        friends TEXT DEFAULT '0',
        groups TEXT DEFAULT '0',
        pages TEXT DEFAULT '0',
        pagePro5 TEXT DEFAULT '0',
        follow TEXT DEFAULT '0',
        birthday TEXT,
        gender TEXT,
        location TEXT,
        hometown TEXT,
        currentCity TEXT,
        job TEXT,
        dating TEXT,
        ads TEXT,
        bm TEXT,
        wallPosts TEXT DEFAULT '0',
        fbBlock TEXT,
        avatar TEXT,
        profile TEXT DEFAULT 'Chưa tạo',
        status TEXT DEFAULT 'Sẵn sàng',
        info TEXT DEFAULT 'Live',
        status282 TEXT,
        interactEnd TEXT,
        dateCreateAcc TEXT,
        dateImport TEXT DEFAULT (datetime('now', 'localtime')),
        kichban TEXT,
        infoDevice TEXT,
        cookieHotmail TEXT,
        ghiChu TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        dateDelete TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (idfile) REFERENCES files(id) ON DELETE SET NULL ON UPDATE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_accounts_uid ON accounts(uid);
      CREATE INDEX IF NOT EXISTS idx_accounts_idfile_active ON accounts(idfile, active);

      CREATE TABLE IF NOT EXISTS Kich_Ban (
        Id_KichBan INTEGER PRIMARY KEY AUTOINCREMENT,
        TenKichBan TEXT NOT NULL,
        CauHinh TEXT,
        STT INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      CREATE TABLE IF NOT EXISTS Tuong_Tac (
        Id_TuongTac INTEGER PRIMARY KEY AUTOINCREMENT,
        TenTuongTac TEXT UNIQUE NOT NULL,
        MoTa TEXT NOT NULL,
        NhomTuongTac TEXT NOT NULL,
        Icon TEXT,
        DefaultCauHinh TEXT NOT NULL DEFAULT '{}'
      );

      CREATE TABLE IF NOT EXISTS Hanh_Dong (
        Id_HanhDong INTEGER PRIMARY KEY AUTOINCREMENT,
        Id_KichBan INTEGER NOT NULL,
        Id_TuongTac INTEGER NOT NULL,
        TenHanhDong TEXT NOT NULL,
        CauHinh TEXT NOT NULL DEFAULT '{}',
        STT INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
        FOREIGN KEY (Id_KichBan) REFERENCES Kich_Ban(Id_KichBan) ON DELETE CASCADE,
        FOREIGN KEY (Id_TuongTac) REFERENCES Tuong_Tac(Id_TuongTac) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        description TEXT,
        updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
      );

      INSERT OR IGNORE INTO files (id, name, createddate, active, STT) VALUES (1, 'Mặc định', datetime('now', 'localtime'), 1, 1);
    `;
    this.db.run(fallbackSql);
  }

  /**
   * Lấy instance Database hiện tại
   */
  public getDb(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('[Database] CSDL chưa được khởi tạo. Hãy gọi initDatabase() trước.');
    }
    return this.db;
  }

  /**
   * Lưu trữ bền vững (flush binary buffer xuống ổ đĩa an toàn, atomic write)
   */
  public flush(): void {
    if (!this.db) return;
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      const tempPath = `${this.dbPath}.tmp`;

      // Ghi ra file tạm trước
      fs.writeFileSync(tempPath, buffer);

      // Thay thế file chính an toàn (atomic rename)
      try {
        fs.renameSync(tempPath, this.dbPath);
      } catch {
        fs.copyFileSync(tempPath, this.dbPath);
        try {
          fs.unlinkSync(tempPath);
        } catch {}
      }
    } catch (err) {
      console.error('[Database] Lỗi khi flush dữ liệu xuống đĩa:', err);
    }
  }

  /**
   * Thực hiện truy vấn SELECT trả về danh sách đối tượng
   */
  public query<T = any>(sql: string, params: any[] = []): T[] {
    const db = this.getDb();
    let stmt: Statement | null = null;
    try {
      stmt = db.prepare(sql);
      stmt.bind(params);
      const rows: T[] = [];
      while (stmt.step()) {
        rows.push(stmt.getAsObject() as unknown as T);
      }
      return rows;
    } finally {
      if (stmt) {
        stmt.free();
      }
    }
  }

  /**
   * Thực hiện truy vấn SELECT trả về một đối tượng đầu tiên hoặc null
   */
  public queryOne<T = any>(sql: string, params: any[] = []): T | null {
    const rows = this.query<T>(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Thực hiện câu lệnh INSERT, UPDATE, DELETE
   */
  public run(sql: string, params: any[] = []): RunResult {
    const db = this.getDb();
    let stmt: Statement | null = null;
    try {
      stmt = db.prepare(sql);
      stmt.bind(params);
      stmt.step();
    } finally {
      if (stmt) {
        stmt.free();
      }
    }

    const changes = db.getRowsModified();
    const lastRowIdQuery = db.exec('SELECT last_insert_rowid() AS id;');
    const lastInsertRowid =
      lastRowIdQuery[0]?.values?.[0]?.[0] !== undefined
        ? Number(lastRowIdQuery[0].values[0][0])
        : 0;

    if (this.autoFlush && !this.isTransactionActive) {
      this.flush();
    }

    return { changes, lastInsertRowid };
  }

  /**
   * Thực thi câu lệnh SQL thô (hỗ trợ nhiều statements)
   */
  public exec(sql: string): void {
    const db = this.getDb();
    db.run(sql);
    if (this.autoFlush && !this.isTransactionActive) {
      this.flush();
    }
  }

  /**
   * Thực thi Transaction đảm bảo tính nguyên tử (Atomicity)
   */
  public transaction<T>(callback: () => T): T {
    const db = this.getDb();
    const wasInTransaction = this.isTransactionActive;

    if (!wasInTransaction) {
      db.run('BEGIN TRANSACTION;');
      this.isTransactionActive = true;
    }

    try {
      const result = callback();
      if (!wasInTransaction) {
        db.run('COMMIT;');
        this.isTransactionActive = false;
        if (this.autoFlush) {
          this.flush();
        }
      }
      return result;
    } catch (error) {
      if (!wasInTransaction) {
        try {
          db.run('ROLLBACK;');
        } catch {}
        this.isTransactionActive = false;
      }
      throw error;
    }
  }

  /**
   * Đóng CSDL và flush an toàn
   */
  public close(): void {
    if (this.db) {
      this.flush();
      this.db.close();
      this.db = null;
      this.initialized = false;
    }
  }
}

// Singleton database instance
export const dbManager = new DatabaseManager();

export const initDatabase = (options?: DatabaseOptions): Promise<SqlJsDatabase> => {
  return dbManager.init(options);
};

export const getDatabase = (): SqlJsDatabase => {
  return dbManager.getDb();
};

export const flushDatabase = (): void => {
  dbManager.flush();
};

export const closeDatabase = (): void => {
  dbManager.close();
};

export const query = <T = any>(sql: string, params: any[] = []): T[] => {
  return dbManager.query<T>(sql, params);
};

export const queryOne = <T = any>(sql: string, params: any[] = []): T | null => {
  return dbManager.queryOne<T>(sql, params);
};

export const run = (sql: string, params: any[] = []): RunResult => {
  return dbManager.run(sql, params);
};

export const transaction = <T>(callback: () => T): T => {
  return dbManager.transaction<T>(callback);
};

export const exec = (sql: string): void => {
  dbManager.exec(sql);
};
