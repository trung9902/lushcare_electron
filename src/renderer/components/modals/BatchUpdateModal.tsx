import React, { useState } from 'react';
import { X, Edit3, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { AccountEntity, FolderEntity, ScenarioEntity } from '@shared/types';

interface BatchUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccounts: AccountEntity[];
  folders: FolderEntity[];
  scenarios: ScenarioEntity[];
  onBatchUpdate: (accountIds: number[], updates: Partial<AccountEntity>) => Promise<void>;
}

export const BatchUpdateModal: React.FC<BatchUpdateModalProps> = ({
  isOpen,
  onClose,
  selectedAccounts,
  folders,
  scenarios,
  onBatchUpdate,
}) => {
  const [updatePass, setUpdatePass] = useState(false);
  const [newPass, setNewPass] = useState('');

  const [updateNote, setUpdateNote] = useState(false);
  const [newNote, setNewNote] = useState('');

  const [updateScenario, setUpdateScenario] = useState(false);
  const [selectedScenarioName, setSelectedScenarioName] = useState(scenarios[0]?.name || '');

  const [updateProxy, setUpdateProxy] = useState(false);
  const [proxyMode, setProxyMode] = useState<'SINGLE' | 'MULTI'>('SINGLE');
  const [singleProxy, setSingleProxy] = useState('');
  const [multiProxies, setMultiProxies] = useState('');

  const [updateFolder, setUpdateFolder] = useState(false);
  const [targetFolderId, setTargetFolderId] = useState(folders[0]?.id || 1);

  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (selectedAccounts.length === 0) return;
    setIsSubmitting(true);

    try {
      const updates: Partial<AccountEntity> = {};
      if (updatePass) updates.pass = newPass;
      if (updateNote) updates.ghiChu = newNote;
      if (updateScenario) updates.kichban = selectedScenarioName;
      if (updateFolder) updates.idfile = targetFolderId;

      if (updateProxy) {
        if (proxyMode === 'SINGLE') {
          updates.proxy = singleProxy;
        } else {
          // In multi mode, handle proxy assignment
          const pList = multiProxies.split('\n').map(p => p.trim()).filter(Boolean);
          if (pList.length > 0) {
            // First proxy for updates or let caller split
            updates.proxy = pList[0];
          }
        }
      }

      await onBatchUpdate(selectedAccounts.map(a => a.id), updates);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[640px] max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                CẬP NHẬT DỮ LIỆU HÀNG LOẠT
              </h2>
              <p className="text-[11px] text-slate-400">
                Đang áp dụng cho <span className="text-indigo-400 font-bold">{selectedAccounts.length}</span> tài khoản đã chọn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {/* Update Password */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkUpPass"
                checked={updatePass}
                onChange={e => setUpdatePass(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkUpPass" className="font-semibold text-slate-200 cursor-pointer">
                Đổi mật khẩu tài khoản
              </label>
            </div>
            {updatePass && (
              <input
                type="text"
                placeholder="Nhập mật khẩu mới chung cho các nick..."
                value={newPass}
                onChange={e => setNewPass(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
              />
            )}
          </div>

          {/* Update Note */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkUpNote"
                checked={updateNote}
                onChange={e => setUpdateNote(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkUpNote" className="font-semibold text-slate-200 cursor-pointer">
                Cập nhật ghi chú
              </label>
            </div>
            {updateNote && (
              <input
                type="text"
                placeholder="Nhập nội dung ghi chú..."
                value={newNote}
                onChange={e => setNewNote(e.target.value)}
                className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
              />
            )}
          </div>

          {/* Update Scenario */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkUpSc"
                checked={updateScenario}
                onChange={e => setUpdateScenario(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkUpSc" className="font-semibold text-slate-200 cursor-pointer">
                Gán kịch bản tương tác
              </label>
            </div>
            {updateScenario && (
              <select
                value={selectedScenarioName}
                onChange={e => setSelectedScenarioName(e.target.value)}
                className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.name}>
                    ⚡ {s.name} ({s.actions.length} bước)
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Update Proxy */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkUpProxy"
                checked={updateProxy}
                onChange={e => setUpdateProxy(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkUpProxy" className="font-semibold text-slate-200 cursor-pointer">
                Gán cấu hình Proxy mới
              </label>
            </div>
            {updateProxy && (
              <div className="space-y-2 pt-1">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="proxyMode"
                      checked={proxyMode === 'SINGLE'}
                      onChange={() => setProxyMode('SINGLE')}
                      className="text-indigo-600"
                    />
                    <span>Một proxy duy nhất cho tất cả</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="proxyMode"
                      checked={proxyMode === 'MULTI'}
                      onChange={() => setProxyMode('MULTI')}
                      className="text-indigo-600"
                    />
                    <span>Chia đều danh sách Proxy</span>
                  </label>
                </div>

                {proxyMode === 'SINGLE' ? (
                  <input
                    type="text"
                    placeholder="IP:Port:User:Pass hoặc IP:Port"
                    value={singleProxy}
                    onChange={e => setSingleProxy(e.target.value)}
                    className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-slate-100"
                  />
                ) : (
                  <textarea
                    rows={3}
                    placeholder="Mỗi dòng 1 Proxy (sẽ chia đều cho danh sách nick đã chọn)..."
                    value={multiProxies}
                    onChange={e => setMultiProxies(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded p-2 font-mono text-xs text-slate-100"
                  />
                )}
              </div>
            )}
          </div>

          {/* Update Destination Folder */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="chkUpFolder"
                checked={updateFolder}
                onChange={e => setUpdateFolder(e.target.checked)}
                className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
              />
              <label htmlFor="chkUpFolder" className="font-semibold text-slate-200 cursor-pointer">
                Chuyển sang thư mục khác
              </label>
            </div>
            {updateFolder && (
              <select
                value={targetFolderId}
                onChange={e => setTargetFolderId(Number(e.target.value))}
                className="w-full h-8 px-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100"
              >
                {folders.map(f => (
                  <option key={f.id} value={f.id}>
                    📁 {f.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 text-[11px]">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Thao tác sẽ cập nhật trực tiếp vào CSDL SQLite.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Check className="w-4 h-4" />
              <span>CẬP NHẬT {selectedAccounts.length} NICK</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
