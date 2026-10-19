import {
  ActionCreatePayload,
  ActionEntity,
  ActionReorderPayload,
  ScenarioActionDetail,
  ScenarioDetailResult,
  ScenarioEntity,
} from '../../shared/types';
import { query, queryOne, run, transaction } from '../db';

export interface ActionTypeItem {
  id: number;
  code: string;
  name: string;
  category: string;
  icon?: string;
  defaultJson: string;
}

export class ScenarioRepository {
  /**
   * Lấy danh sách toàn bộ kịch bản kèm số lượng hành động con
   */
  public getAll(): Array<{ id: number; name: string; actionCount: number; STT: number }> {
    const sql = `
      SELECT 
        k.Id_KichBan AS id,
        k.TenKichBan AS name,
        k.STT AS STT,
        COUNT(h.Id_HanhDong) AS actionCount
      FROM Kich_Ban k
      LEFT JOIN Hanh_Dong h ON h.Id_KichBan = k.Id_KichBan
      GROUP BY k.Id_KichBan, k.TenKichBan, k.STT
      ORDER BY k.STT ASC, k.Id_KichBan ASC;
    `;

    const rows = query<any>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      name: String(r.name),
      actionCount: Number(r.actionCount || 0),
      STT: Number(r.STT || 0),
    }));
  }

  /**
   * Lấy chi tiết kịch bản và danh sách các bước hành động đã sắp xếp theo STT
   */
  public getById(id: number): ScenarioDetailResult | null {
    const scenarioSql = `
      SELECT Id_KichBan AS id, TenKichBan AS name, CauHinh AS config, STT
      FROM Kich_Ban
      WHERE Id_KichBan = ?;
    `;
    const s = queryOne<any>(scenarioSql, [id]);
    if (!s) return null;

    let parsedConfig: Record<string, any> = {};
    if (s.config) {
      try {
        parsedConfig = typeof s.config === 'string' ? JSON.parse(s.config) : s.config;
      } catch {
        parsedConfig = {};
      }
    }

    const actionsSql = `
      SELECT 
        h.Id_HanhDong AS id,
        h.Id_KichBan AS scenarioId,
        h.Id_TuongTac AS actionTypeId,
        t.TenTuongTac AS actionTypeCode,
        t.MoTa AS actionTypeName,
        t.NhomTuongTac AS category,
        h.TenHanhDong AS actionName,
        h.CauHinh AS config,
        h.STT AS STT
      FROM Hanh_Dong h
      LEFT JOIN Tuong_Tac t ON h.Id_TuongTac = t.Id_TuongTac
      WHERE h.Id_KichBan = ?
      ORDER BY h.STT ASC, h.Id_HanhDong ASC;
    `;

    const rawActions = query<any>(actionsSql, [id]);
    const actions: ScenarioActionDetail[] = rawActions.map((a) => {
      let cfg: Record<string, any> = {};
      if (a.config) {
        try {
          cfg = typeof a.config === 'string' ? JSON.parse(a.config) : a.config;
        } catch {
          cfg = {};
        }
      }
      return {
        id: Number(a.id),
        scenarioId: Number(a.scenarioId),
        actionTypeId: Number(a.actionTypeId),
        actionTypeCode: String(a.actionTypeCode || ''),
        actionTypeName: String(a.actionTypeName || ''),
        category: String(a.category || ''),
        actionName: String(a.actionName || ''),
        config: cfg,
        STT: Number(a.STT || 0),
      };
    });

    return {
      id: Number(s.id),
      name: String(s.name),
      config: parsedConfig,
      STT: Number(s.STT || 0),
      actions,
    };
  }

  /**
   * Tạo mới một kịch bản
   */
  public create(name: string, config: Record<string, any> = {}): { id: number; name: string } {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tên kịch bản không được để trống');
    }

    const maxSttRes = queryOne<any>('SELECT COALESCE(MAX(STT), 0) AS maxStt FROM Kich_Ban');
    const nextStt = (Number(maxSttRes?.maxStt) || 0) + 1;
    const configJson = JSON.stringify(config);

    const sql = `
      INSERT INTO Kich_Ban (TenKichBan, CauHinh, STT, created_at, updated_at)
      VALUES (?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'));
    `;
    const res = run(sql, [trimmedName, configJson, nextStt]);

    return {
      id: res.lastInsertRowid,
      name: trimmedName,
    };
  }

  /**
   * Cập nhật thông tin kịch bản
   */
  public update(id: number, name: string, config?: Record<string, any>): boolean {
    const trimmedName = name.trim();
    if (!trimmedName) {
      throw new Error('Tên kịch bản không được để trống');
    }

    if (config !== undefined) {
      const configJson = JSON.stringify(config);
      const sql = `
        UPDATE Kich_Ban 
        SET TenKichBan = ?, CauHinh = ?, updated_at = datetime('now', 'localtime')
        WHERE Id_KichBan = ?;
      `;
      const res = run(sql, [trimmedName, configJson, id]);
      return res.changes > 0;
    } else {
      const sql = `
        UPDATE Kich_Ban 
        SET TenKichBan = ?, updated_at = datetime('now', 'localtime')
        WHERE Id_KichBan = ?;
      `;
      const res = run(sql, [trimmedName, id]);
      return res.changes > 0;
    }
  }

  /**
   * Xóa kịch bản (cascade xóa toàn bộ hành động con)
   */
  public delete(id: number): boolean {
    return transaction(() => {
      run('DELETE FROM Hanh_Dong WHERE Id_KichBan = ?;', [id]);
      const res = run('DELETE FROM Kich_Ban WHERE Id_KichBan = ?;', [id]);
      return res.changes > 0;
    });
  }

  /**
   * Nhân bản kịch bản kèm toàn bộ hành động con
   */
  public duplicate(id: number): { newScenarioId: number } {
    return transaction(() => {
      const original = this.getById(id);
      if (!original) {
        throw new Error(`Không tìm thấy kịch bản ID ${id} để nhân bản`);
      }

      const newName = `${original.name} (Bản sao)`;
      const newScenario = this.create(newName, original.config);

      for (const action of original.actions) {
        this.createAction({
          scenarioId: newScenario.id,
          actionTypeId: action.actionTypeId,
          actionName: action.actionName,
          config: action.config,
          STT: action.STT,
        });
      }

      return { newScenarioId: newScenario.id };
    });
  }

  // ==========================================
  // ACTIONS REPOSITORY METHODS
  // ==========================================

  /**
   * Lấy danh mục toàn bộ 70 loại hành động tương tác hệ thống
   */
  public getAllActionTypes(): ActionTypeItem[] {
    const sql = `
      SELECT 
        Id_TuongTac AS id,
        TenTuongTac AS code,
        MoTa AS name,
        NhomTuongTac AS category,
        Icon AS icon,
        DefaultCauHinh AS defaultJson
      FROM Tuong_Tac
      ORDER BY Id_TuongTac ASC;
    `;
    const rows = query<any>(sql);
    return rows.map((r) => ({
      id: Number(r.id),
      code: String(r.code),
      name: String(r.name),
      category: String(r.category),
      icon: r.icon ? String(r.icon) : undefined,
      defaultJson: String(r.defaultJson || '{}'),
    }));
  }

  /**
   * Thêm một bước hành động vào kịch bản
   */
  public createAction(payload: {
    scenarioId: number;
    actionTypeId?: number;
    actionCode?: string;
    actionName?: string;
    name?: string;
    config?: Record<string, any>;
    configJson?: string;
    STT?: number;
    orderIndex?: number;
  }): ScenarioActionDetail {
    const scenarioId = payload.scenarioId;
    let actionTypeId = payload.actionTypeId;

    // Nếu không có actionTypeId nhưng có actionCode, tìm theo actionCode
    if (!actionTypeId && payload.actionCode) {
      const typeRow = queryOne<any>('SELECT Id_TuongTac FROM Tuong_Tac WHERE TenTuongTac = ?', [
        payload.actionCode,
      ]);
      if (typeRow) {
        actionTypeId = Number(typeRow.Id_TuongTac);
      }
    }

    if (!actionTypeId) {
      throw new Error('Cần cung cấp actionTypeId hoặc actionCode hợp lệ');
    }

    // Lấy thông tin loại hành động
    const actionType = queryOne<any>(
      'SELECT TenTuongTac, MoTa, NhomTuongTac, DefaultCauHinh FROM Tuong_Tac WHERE Id_TuongTac = ?',
      [actionTypeId]
    );
    if (!actionType) {
      throw new Error(`Không tìm thấy loại hành động ID ${actionTypeId}`);
    }

    const actionName =
      payload.actionName || payload.name || actionType.MoTa || actionType.TenTuongTac;

    let configStr = '{}';
    let configObj: Record<string, any> = {};
    if (payload.config) {
      configObj = payload.config;
      configStr = JSON.stringify(payload.config);
    } else if (payload.configJson) {
      configStr = payload.configJson;
      try {
        configObj = JSON.parse(payload.configJson);
      } catch {
        configObj = {};
      }
    } else if (actionType.DefaultCauHinh) {
      configStr = actionType.DefaultCauHinh;
      try {
        configObj = JSON.parse(actionType.DefaultCauHinh);
      } catch {
        configObj = {};
      }
    }

    let stt = payload.STT ?? payload.orderIndex;
    if (stt === undefined || stt === null) {
      const maxSttRow = queryOne<any>(
        'SELECT COALESCE(MAX(STT), 0) AS maxStt FROM Hanh_Dong WHERE Id_KichBan = ?',
        [scenarioId]
      );
      stt = (Number(maxSttRow?.maxStt) || 0) + 1;
    }

    const insertSql = `
      INSERT INTO Hanh_Dong (Id_KichBan, Id_TuongTac, TenHanhDong, CauHinh, STT, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now', 'localtime'), datetime('now', 'localtime'));
    `;
    const res = run(insertSql, [scenarioId, actionTypeId, actionName, configStr, stt]);

    return {
      id: res.lastInsertRowid,
      scenarioId,
      actionTypeId,
      actionTypeCode: actionType.TenTuongTac,
      actionTypeName: actionType.MoTa,
      category: actionType.NhomTuongTac,
      actionName,
      config: configObj,
      STT: stt,
    };
  }

  /**
   * Cập nhật thông tin hành động
   */
  public updateAction(
    id: number,
    name?: string,
    config?: Record<string, any>,
    configJson?: string
  ): boolean {
    const setClauses: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      setClauses.push('TenHanhDong = ?');
      params.push(name.trim());
    }

    if (config !== undefined) {
      setClauses.push('CauHinh = ?');
      params.push(JSON.stringify(config));
    } else if (configJson !== undefined) {
      setClauses.push('CauHinh = ?');
      params.push(configJson);
    }

    if (setClauses.length === 0) return true;

    setClauses.push("updated_at = datetime('now', 'localtime')");
    params.push(id);

    const sql = `UPDATE Hanh_Dong SET ${setClauses.join(', ')} WHERE Id_HanhDong = ?;`;
    const res = run(sql, params);
    return res.changes > 0;
  }

  /**
   * Xóa một bước hành động khỏi kịch bản
   */
  public deleteAction(id: number): boolean {
    const res = run('DELETE FROM Hanh_Dong WHERE Id_HanhDong = ?;', [id]);
    return res.changes > 0;
  }

  /**
   * Sắp xếp lại thứ tự thực thi các bước hành động
   */
  public reorderActions(scenarioId: number, orderedActionIds: number[]): boolean {
    if (!orderedActionIds || orderedActionIds.length === 0) return true;

    return transaction(() => {
      for (let i = 0; i < orderedActionIds.length; i++) {
        const actionId = orderedActionIds[i];
        const newStt = i + 1;
        run('UPDATE Hanh_Dong SET STT = ?, updated_at = datetime(\'now\', \'localtime\') WHERE Id_HanhDong = ? AND Id_KichBan = ?;', [
          newStt,
          actionId,
          scenarioId,
        ]);
      }
      return true;
    });
  }
}

export const scenarioRepository = new ScenarioRepository();
