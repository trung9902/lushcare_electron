import React, { useState, useMemo, useRef } from 'react';
import {
  X,
  Upload,
  UserPlus,
  FileText,
  RotateCcw,
  CheckCircle2,
  FolderPlus,
  Eye,
  AlertCircle
} from 'lucide-react';
import { FolderEntity, AccountImportPayload } from '@shared/types';

interface SmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  folders: FolderEntity[];
  currentFolderId: number | null;
  onImport: (payload: AccountImportPayload) => Promise<void>;
  onCreateFolder: (name: string) => Promise<FolderEntity>;
}

const PRESET_FORMATS = [
  'uid|pass|2fa|cookie|email|passmail',
  'uid|pass|2fa|cookie',
  'uid|pass|2fa',
  'uid|pass',
  'uid|pass|token|cookie',
  'uid|pass|email|passmail|2fa',
  'uid|pass|2fa|cookie|proxy',
];

const CHIP_FIELDS = [
  { id: 'uid', label: 'UID' },
  { id: 'pass', label: 'Mật Khẩu' },
  { id: '2fa', label: '2FA' },
  { id: 'cookie', label: 'Cookie' },
  { id: 'token', label: 'Token' },
  { id: 'email', label: 'Email' },
  { id: 'passmail', label: 'PassMail' },
  { id: 'proxy', label: 'Proxy' },
  { id: 'useragent', label: 'UserAgent' },
];

export const SmartImportModal: React.FC<SmartImportModalProps> = ({
  isOpen,
  onClose,
  folders,
  currentFolderId,
  onImport,
  onCreateFolder,
}) => {
  const [content, setContent] = useState('');
  const [delimiter, setDelimiter] = useState('|');
  const [formatParts, setFormatParts] = useState<string[]>(['uid', 'pass', '2fa', 'cookie', 'email', 'passmail']);
  const [targetFolderId, setTargetFolderId] = useState<number>(() => {
    if (currentFolderId && currentFolderId > 0) return currentFolderId;
    return folders[0]?.id || 1;
  });
  const [checkDuplicate, setCheckDuplicate] = useState(true);
  const [autoAssignProxy, setAutoAssignProxy] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showNewFolderInput, setShowNewFolderInput] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const lines = useMemo(() => {
    if (!isOpen) return [];
    return content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  }, [content, isOpen]);

  // Preview parsed records
  const previewRows = useMemo(() => {
    if (!isOpen) return [];
    return lines.slice(0, 3).map(line => {
      let sep = delimiter;
      if (delimiter === 'tab') sep = '\t';
      const parts = line.split(sep);
      const row: Record<string, string> = {};
      formatParts.forEach((field, i) => {
        row[field] = parts[i] || '';
      });
      return row;
    });
  }, [lines, delimiter, formatParts, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const text = event.target?.result as string;
      setContent(text || '');
    };
    reader.readAsText(file);
  };

  const handleAddChip = (field: string) => {
    setFormatParts(prev => [...prev, field]);
  };

  const handleResetChips = () => {
    setFormatParts(['uid', 'pass']);
  };

  const handleSelectPreset = (preset: string) => {
    setFormatParts(preset.split('|'));
  };

  const handleCreateFolderQuick = async () => {
    if (!newFolderName.trim()) {
      setShowNewFolderInput(false);
      return;
    }
    const newF = await onCreateFolder(newFolderName.trim());
    setTargetFolderId(newF.id);
    setNewFolderName('');
    setShowNewFolderInput(false);
  };

  const handleSubmit = async () => {
    if (lines.length === 0) return;
    setIsSubmitting(true);
    try {
      await onImport({
        folderId: targetFolderId,
        format: formatParts.join('|'),
        content,
        checkDuplicate,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-full max-w-3xl max-h-[90vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">NHẬP TÀI KHOẢN HÀNG LOẠT (SMART IMPORT)</h2>
              <p className="text-[11px] text-slate-400">Hỗ trợ đa định dạng, tự phát hiện cấu trúc và lọc trùng thông minh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Section 1: Account Input Box */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-300 font-semibold">
              <label>1. Dán danh sách tài khoản (Mỗi dòng một tài khoản):</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".txt,.csv"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 rounded flex items-center gap-1 text-[11px]"
                >
                  <Upload className="w-3 h-3" />
                  <span>Tải file .txt</span>
                </button>
                <span className="font-mono text-indigo-400 font-bold">
                  [{lines.length} dòng]
                </span>
              </div>
            </div>
            <textarea
              rows={5}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="100084729184712|MatKhau123|JBSWY3DPEHPK3PXP|c_user=1000847...; xs=2...|an@gmail.com|MailPass1&#10;100091827461523|MatKhau456|KZXW4ZDPNU======|c_user=1000918...; xs=1...|mai@gmail.com|MailPass2"
              className="w-full bg-slate-950/80 border border-slate-700 rounded-md p-2.5 font-mono text-[11px] text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 leading-relaxed"
            />
          </div>

          {/* Section 2: Format Builder */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-semibold text-slate-300">2. Chọn Định Dạng Tài Khoản:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Ký tự phân cách:</span>
                <select
                  value={delimiter}
                  onChange={e => setDelimiter(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded px-2 py-0.5 text-xs text-slate-200"
                >
                  <option value="|">Phân cách thẳng đứng ( | )</option>
                  <option value=":">Dấu hai chấm ( : )</option>
                  <option value=",">Dấu phẩy ( , )</option>
                  <option value="tab">Phím Tab</option>
                </select>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-slate-400 text-[11px]">Mẫu có sẵn:</span>
              {PRESET_FORMATS.slice(0, 4).map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-[11px] font-mono text-slate-300 hover:text-indigo-300"
                >
                  {preset}
                </button>
              ))}
            </div>

            {/* Clickable Chips */}
            <div>
              <div className="text-[11px] text-slate-400 mb-1">Bấm để thêm trường vào định dạng:</div>
              <div className="flex flex-wrap gap-1.5">
                {CHIP_FIELDS.map(chip => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => handleAddChip(chip.id)}
                    className="px-2 py-1 bg-indigo-950/50 hover:bg-indigo-900/60 border border-indigo-700/50 rounded text-indigo-300 hover:text-white font-medium transition-colors"
                  >
                    + {chip.label}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={handleResetChips}
                  className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded text-slate-400 hover:text-rose-400 flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Xóa làm lại</span>
                </button>
              </div>
            </div>

            {/* Current Assembled Format Display */}
            <div className="flex items-center gap-2 p-2 bg-slate-900 rounded border border-slate-700/80">
              <span className="text-slate-400 font-medium">Chuỗi đang ghép:</span>
              <div className="flex flex-wrap items-center gap-1 font-mono text-indigo-300 font-semibold">
                {formatParts.map((part, index) => (
                  <React.Fragment key={index}>
                    <span className="bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[11px]">
                      {part.toUpperCase()}
                    </span>
                    {index < formatParts.length - 1 && <span className="text-slate-500">|</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Section 3: Target Folder & Duplicates */}
          <div className="p-3 bg-slate-950/50 border border-slate-800 rounded-lg space-y-3">
            <span className="font-semibold text-slate-300">3. Thư Mục Lưu & Tùy Chọn Nhập:</span>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[200px] flex items-center gap-2">
                <span className="text-slate-400">Thư mục đích:</span>
                <select
                  value={targetFolderId}
                  onChange={e => setTargetFolderId(Number(e.target.value))}
                  className="flex-1 h-8 bg-slate-900 border border-slate-700 rounded px-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>
                      📁 {f.name} ({f.accountCount ?? 0} nick)
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput(true)}
                  className="h-8 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded flex items-center gap-1 text-indigo-300"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  <span>Tạo mới</span>
                </button>
              </div>
            </div>

            {/* Quick folder create */}
            {showNewFolderInput && (
              <div className="flex items-center gap-2 p-2 bg-slate-900 rounded border border-indigo-500/50">
                <input
                  type="text"
                  placeholder="Nhập tên thư mục mới..."
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  className="flex-1 h-7 px-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100"
                />
                <button
                  type="button"
                  onClick={handleCreateFolderQuick}
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs"
                >
                  Tạo
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewFolderInput(false)}
                  className="px-2 py-1 text-slate-400 hover:text-white"
                >
                  Hủy
                </button>
              </div>
            )}

            {/* Duplicate & Proxy options */}
            <div className="space-y-1.5 pt-1 text-slate-300">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkDup"
                  checked={checkDuplicate}
                  onChange={e => setCheckDuplicate(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
                />
                <label htmlFor="chkDup" className="cursor-pointer">
                  Bỏ qua tài khoản nếu trùng UID trong CSDL (Khuyên dùng)
                </label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="chkProxy"
                  checked={autoAssignProxy}
                  onChange={e => setAutoAssignProxy(e.target.checked)}
                  className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600"
                />
                <label htmlFor="chkProxy" className="cursor-pointer">
                  Tự động gán danh sách Proxy từ bộ nhớ cấu hình theo thứ tự xoay vòng
                </label>
              </div>
            </div>
          </div>

          {/* Section 4: Live Preview */}
          {lines.length > 0 && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-slate-400">
                <div className="flex items-center gap-1.5 font-semibold text-slate-300">
                  <Eye className="w-3.5 h-3.5 text-sky-400" />
                  <span>Xem trước kết quả phân tích ({Math.min(3, lines.length)} dòng đầu):</span>
                </div>
              </div>

              <div className="border border-slate-800 rounded-lg overflow-x-auto bg-slate-950/70">
                <table className="w-full text-left font-mono text-[11px]">
                  <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 uppercase text-[10px]">
                    <tr>
                      {formatParts.map((field, i) => (
                        <th key={i} className="py-1 px-2.5 font-semibold">
                          {field}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-900">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="text-slate-300">
                        {formatParts.map((field, i) => (
                          <td key={i} className="py-1.5 px-2.5 truncate max-w-[150px]">
                            {row[field] || <span className="text-slate-600 italic">trống</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            Tổng số tài khoản phát hiện: <span className="text-indigo-400 font-bold font-mono">{lines.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={lines.length === 0 || isSubmitting}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-40"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{isSubmitting ? 'ĐANG NHẬP DỮ LIỆU...' : 'BẮT ĐẦU NHẬP NICK'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
