import fs from 'fs';
import path from 'path';
import {
  AccountEntity,
  AccountExportPayload,
  AccountExportResult,
  AccountImportPayload,
  AccountImportResult,
} from '../../shared/types';
import { transaction } from '../db';
import { accountRepository } from '../repositories/AccountRepository';

export class ImportExportService {
  private tokenAliasMap: Record<string, keyof AccountEntity> = {
    uid: 'uid',
    id: 'uid',
    c_user: 'uid',
    cuser: 'uid',
    pass: 'pass',
    password: 'pass',
    pwd: 'pass',
    matkhau: 'pass',
    fa2: 'fa2',
    '2fa': 'fa2',
    secret: 'fa2',
    totp: 'fa2',
    twofactor: 'fa2',
    cookie: 'cookie',
    cookies: 'cookie',
    cookie1: 'cookie1',
    token: 'token',
    email: 'email',
    mail: 'email',
    email2: 'email2',
    mail2: 'email2',
    email_old: 'email_old',
    passmail: 'passmail',
    pass_mail: 'passmail',
    mailrecovery: 'mailrecovery',
    mail_recovery: 'mailrecovery',
    passmailrecovery: 'passmailrecovery',
    pass_mail_recovery: 'passmailrecovery',
    phone: 'phone',
    sdt: 'phone',
    name: 'name',
    ten: 'name',
    proxy: 'proxy',
    useragent: 'useragent',
    ua: 'useragent',
    birthday: 'birthday',
    ngaysinh: 'birthday',
    gender: 'gender',
    gioitinh: 'gender',
    ghichu: 'ghiChu',
    note: 'ghiChu',
    status: 'status',
    info: 'info',
    kichban: 'kichban',
    friends: 'friends',
    groups: 'groups',
  };

  /**
   * Tự động phát hiện ký tự phân cách (delimiter) nếu người dùng không chọn
   */
  private detectDelimiter(line: string, formatStr?: string): string {
    if (formatStr) {
      if (formatStr.includes('|')) return '|';
      if (formatStr.includes('\t')) return '\t';
      if (formatStr.includes(';')) return ';';
      if (formatStr.includes(':')) return ':';
      if (formatStr.includes(',')) return ',';
    }

    if (line.includes('|')) return '|';
    if (line.includes('\t')) return '\t';
    if (line.includes(';')) return ';';
    if (line.includes(':')) return ':';
    if (line.includes(',')) return ',';

    return '|';
  }

  /**
   * Phân giải danh sách trường từ chuỗi format (VD: "uid|pass|2fa|cookie") hoặc mảng fieldsOrder
   */
  private resolveFieldsOrder(
    formatStr?: string,
    fieldsOrder?: (keyof AccountEntity)[]
  ): (keyof AccountEntity)[] {
    if (fieldsOrder && fieldsOrder.length > 0) {
      return fieldsOrder;
    }

    if (formatStr && formatStr.trim() !== '') {
      const delimiter = this.detectDelimiter(formatStr, formatStr);
      const rawTokens = formatStr.split(delimiter).map((t) => t.trim().toLowerCase());
      const resolved: (keyof AccountEntity)[] = [];

      for (const token of rawTokens) {
        if (!token) continue;
        const normalized = this.tokenAliasMap[token] || (token as keyof AccountEntity);
        resolved.push(normalized);
      }

      if (resolved.length > 0) {
        return resolved;
      }
    }

    // Thứ tự mặc định nếu không khai báo
    return ['uid', 'pass', 'fa2', 'cookie', 'proxy', 'email', 'passmail'];
  }

  /**
   * Trích xuất c_user từ chuỗi Cookie Facebook
   */
  public extractCUserFromCookie(cookie: string): string | null {
    if (!cookie) return null;
    const match = /(?:^|;\s*)c_user=([0-9]+)/.exec(cookie);
    return match ? match[1] : null;
  }

  /**
   * Nhập hàng loạt tài khoản linh hoạt kèm xử lý trùng lặp và gán proxy
   */
  public importAccounts(payload: AccountImportPayload): AccountImportResult {
    const rawContent = payload.rawText || payload.content || '';
    if (!rawContent.trim()) {
      return {
        totalLines: 0,
        importedCount: 0,
        overwrittenCount: 0,
        skippedDuplicates: 0,
        invalidLines: 0,
        errors: [],
        totalImported: 0,
        duplicatesSkipped: 0,
      };
    }

    const lines = rawContent.split(/\r?\n/).filter((l) => {
      const trimmed = l.trim();
      return trimmed.length > 0 && !trimmed.startsWith('#') && !trimmed.startsWith('//');
    });

    const fieldsOrder = this.resolveFieldsOrder(payload.format, payload.fieldsOrder);
    const delimiter = payload.delimiter || this.detectDelimiter(lines[0] || '', payload.format);
    const duplicateHandling = payload.duplicateHandling || (payload.checkDuplicate ? 'skip' : 'overwrite');

    const assignedProxies = (payload.assignedProxyList || []).filter((p) => p && p.trim() !== '');
    const assignedUas = (payload.assignedUserAgentList || []).filter((u) => u && u.trim() !== '');

    let importedCount = 0;
    let overwrittenCount = 0;
    let skippedDuplicates = 0;
    let invalidLines = 0;
    const errors: string[] = [];

    // Thực thi trong SQLite Transaction để đạt tốc độ cao nhất
    transaction(() => {
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const parts = line.split(delimiter).map((p) => p.trim());
        const accountData: Partial<AccountEntity> = {
          idfile: payload.folderId || 1,
          status: 'Sẵn sàng',
          info: 'Live',
          profile: 'Chưa tạo',
          active: 1,
        };

        // Gán các trường theo thứ tự
        for (let f = 0; f < fieldsOrder.length; f++) {
          const field = fieldsOrder[f];
          if (f < parts.length) {
            const val = parts[f];
            if (val !== undefined && val !== '') {
              (accountData as any)[field] = val;
            }
          }
        }

        // Tự động trích xuất c_user từ cookie nếu UID còn trống
        if (!accountData.uid && accountData.cookie) {
          const cUser = this.extractCUserFromCookie(accountData.cookie);
          if (cUser) {
            accountData.uid = cUser;
          }
        }

        // Kiểm tra tính hợp lệ của UID
        if (!accountData.uid || accountData.uid.trim() === '') {
          invalidLines++;
          errors.push(`Dòng ${i + 1}: Thiếu UID hoặc không trích xuất được UID từ cookie.`);
          continue;
        }

        accountData.uid = accountData.uid.trim();

        // Gán Proxy xoay vòng nếu có danh sách
        if (assignedProxies.length > 0 && !accountData.proxy) {
          accountData.proxy = assignedProxies[importedCount % assignedProxies.length];
        }

        // Gán User-Agent xoay vòng nếu có danh sách
        if (assignedUas.length > 0 && !accountData.useragent) {
          accountData.useragent = assignedUas[importedCount % assignedUas.length];
        }

        // Kiểm tra trùng lặp UID
        const existing = accountRepository.getByUid(accountData.uid);
        if (existing) {
          if (duplicateHandling === 'skip') {
            skippedDuplicates++;
            continue;
          } else {
            // Overwrite thông tin mới vào nick đã tồn tại
            const updates: Partial<AccountEntity> = { ...accountData };
            delete updates.id;
            delete updates.created_at;
            accountRepository.update(existing.id, updates);
            overwrittenCount++;
          }
        } else {
          // Thêm mới
          accountRepository.create(accountData);
          importedCount++;
        }
      }
    });

    return {
      totalLines: lines.length,
      importedCount,
      overwrittenCount,
      skippedDuplicates,
      invalidLines,
      errors: errors.slice(0, 50), // Giới hạn 50 lỗi đầu tiên
      totalImported: importedCount,
      duplicatesSkipped: skippedDuplicates,
    };
  }

  /**
   * Xuất danh sách tài khoản ra định dạng tùy chọn (TXT, CSV, Clipboard)
   */
  public exportAccounts(payload: AccountExportPayload): AccountExportResult {
    const { accountIds, exportType = 'txt', filePath } = payload;
    const delimiter = payload.delimiter || (exportType === 'csv' ? ',' : '|');

    let fields: (keyof AccountEntity)[] = [];
    if (payload.selectedFields && payload.selectedFields.length > 0) {
      fields = payload.selectedFields;
    } else if (payload.format) {
      fields = this.resolveFieldsOrder(payload.format);
    } else {
      fields = ['uid', 'pass', 'fa2', 'cookie', 'proxy'];
    }

    // Lấy dữ liệu tài khoản
    let accounts: AccountEntity[] = [];
    if (accountIds && accountIds.length > 0) {
      // Lấy từng tài khoản theo ID
      for (const id of accountIds) {
        const acc = accountRepository.getById(id);
        if (acc) accounts.push(acc);
      }
    } else {
      const res = accountRepository.getAll({ limit: 100000 });
      accounts = res.accounts;
    }

    const exportedLines: string[] = [];

    // Header cho CSV
    if (exportType === 'csv') {
      const headerLine = fields
        .map((f) => `"${String(f).replace(/"/g, '""')}"`)
        .join(delimiter);
      exportedLines.push(headerLine);
    }

    for (const acc of accounts) {
      const rowValues = fields.map((f) => {
        const val = (acc as any)[f];
        const strVal = val === null || val === undefined ? '' : String(val);

        if (exportType === 'csv') {
          // CWE-1236: CSV Formula Injection Prevention
          // Nếu ô bắt đầu bằng =, +, -, @, \t, \r thì chèn thêm dấu ' phía trước để vô hiệu hóa thực thi công thức
          let safeVal = strVal;
          if (/^[=+\-@\t\r]/.test(safeVal)) {
            safeVal = `'${safeVal}`;
          }
          // Format CSV: bọc ngoặc kép nếu có ký tự đặc biệt
          if (safeVal.includes('"') || safeVal.includes(delimiter) || safeVal.includes('\n') || safeVal.includes('\r')) {
            return `"${safeVal.replace(/"/g, '""')}"`;
          }
          return `"${safeVal}"`;
        }

        return strVal;
      });

      exportedLines.push(rowValues.join(delimiter));
    }

    const outputText = exportedLines.join('\n');

    // Lưu ra file nếu có đường dẫn
    if (filePath && (exportType === 'txt' || exportType === 'csv')) {
      const fullPath = path.resolve(filePath);
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(fullPath, outputText, 'utf8');
    }

    return {
      successCount: accounts.length,
      outputFilePath: filePath,
      clipboardText: outputText,
      content: outputText,
      count: accounts.length,
    };
  }
}

export const importExportService = new ImportExportService();
