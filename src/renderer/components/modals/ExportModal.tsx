import React, { useState, useMemo } from 'react';
import { X, Download, FileSpreadsheet, Check, Copy } from 'lucide-react';
import { AccountEntity } from '@shared/types';
import { copyToClipboard } from '../../utils/otp';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAccounts: AccountEntity[];
  allAccounts: AccountEntity[];
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

const EXPORT_PRESETS = [
  'uid|pass|2fa|cookie',
  'uid|pass|2fa',
  'uid|pass',
  'uid|pass|cookie',
  'uid|pass|token|cookie',
  'uid|pass|2fa|cookie|email|passmail',
];

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  selectedAccounts,
  allAccounts,
  onShowToast,
}) => {
  const [exportScope, setExportScope] = useState<'SELECTED' | 'ALL'>('SELECTED');
  const [fileType, setFileType] = useState<'TXT' | 'CSV'>('TXT');
  const [formatString, setFormatString] = useState('uid|pass|2fa|cookie');
  const [delimiter, setDelimiter] = useState('|');

  const targetList = exportScope === 'SELECTED' && selectedAccounts.length > 0
    ? selectedAccounts
    : allAccounts;

  const fields = useMemo(() => {
    if (!isOpen) return [];
    return formatString.toLowerCase().split('|').map(s => s.trim()).filter(Boolean);
  }, [formatString, isOpen]);

  const outputContent = useMemo(() => {
    if (!isOpen) return '';
    const sep = delimiter === 'tab' ? '\t' : delimiter;
    const lines: string[] = [];

    if (fileType === 'CSV') {
      lines.push(fields.join(','));
    }

    targetList.forEach(acc => {
      const parts = fields.map(f => {
        let val = (acc as any)[f] || '';
        let strVal = String(val);
        if (fileType === 'CSV') {
          // CWE-1236: CSV Formula Injection Prevention
          if (/^[=+\-@\t\r]/.test(strVal)) {
            strVal = `'${strVal}`;
          }
          if (strVal.includes(',') || strVal.includes('"') || strVal.includes('\n') || strVal.includes('\r')) {
            strVal = `"${strVal.replace(/"/g, '""')}"`;
          }
        }
        return strVal;
      });
      lines.push(parts.join(fileType === 'CSV' ? ',' : sep));
    });

    return lines.join('\n');
  }, [targetList, fields, delimiter, fileType, isOpen]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    const success = await copyToClipboard(outputContent);
    if (success) {
      onShowToast('Đã sao chép', `Đã sao chép ${targetList.length} tài khoản vào Clipboard!`, 'success');
      onClose();
    }
  };

  const handleDownload = () => {
    const blob = new Blob([outputContent], {
      type: fileType === 'CSV' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vmax-export-${Date.now()}.${fileType === 'CSV' ? 'csv' : 'txt'}`;
    a.click();
    URL.revokeObjectURL(url);
    onShowToast('Xuất thành công', `Đã tải về file xuất chứa ${targetList.length} tài khoản!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[680px] max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-sky-600/30 border border-sky-500/40 flex items-center justify-center text-sky-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                XUẤT DỮ LIỆU TÀI KHOẢN (EXPORT)
              </h2>
              <p className="text-[11px] text-slate-400">
                Xuất file định dạng tùy biến (TXT, CSV) theo nhu cầu sử dụng
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
          {/* Scope selection */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2">
            <span className="font-semibold text-slate-300">Phạm vi tài khoản xuất:</span>
            <div className="flex items-center gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'SELECTED'}
                  onChange={() => setExportScope('SELECTED')}
                  disabled={selectedAccounts.length === 0}
                  className="text-indigo-600"
                />
                <span>Chỉ nick đang chọn ({selectedAccounts.length} nick)</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="scope"
                  checked={exportScope === 'ALL'}
                  onChange={() => setExportScope('ALL')}
                  className="text-indigo-600"
                />
                <span>Toàn bộ thư mục hiện tại ({allAccounts.length} nick)</span>
              </label>
            </div>
          </div>

          {/* Format builder */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-300">Định dạng chuỗi xuất:</span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Định dạng file:</span>
                <button
                  onClick={() => setFileType('TXT')}
                  className={`px-2 py-0.5 rounded ${
                    fileType === 'TXT' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  TXT
                </button>
                <button
                  onClick={() => setFileType('CSV')}
                  className={`px-2 py-0.5 rounded ${
                    fileType === 'CSV' ? 'bg-indigo-600 text-white font-medium' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  CSV
                </button>
              </div>
            </div>

            <input
              type="text"
              value={formatString}
              onChange={e => setFormatString(e.target.value)}
              className="w-full h-8 px-2.5 bg-slate-900 border border-slate-700 rounded font-mono text-xs text-indigo-300"
            />

            {/* Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              <span className="text-slate-500 text-[11px]">Mẫu nhanh:</span>
              {EXPORT_PRESETS.map(preset => (
                <button
                  key={preset}
                  onClick={() => setFormatString(preset)}
                  className="px-2 py-0.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded font-mono text-[11px] text-slate-400 hover:text-indigo-300"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-slate-400 text-[11px]">
              <span>Xem trước 3 dòng đầu:</span>
              <span>Tổng: {targetList.length} dòng</span>
            </div>
            <textarea
              readOnly
              rows={4}
              value={outputContent.split('\n').slice(0, 4).join('\n')}
              className="w-full bg-slate-950 border border-slate-800 rounded p-2.5 font-mono text-[11px] text-slate-300"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <button
            onClick={handleCopy}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-md font-medium flex items-center gap-1.5 border border-slate-700"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sao Chép Vào Clipboard</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
            >
              Đóng
            </button>
            <button
              onClick={handleDownload}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Download className="w-4 h-4" />
              <span>TẢI FILE XUỐNG</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
