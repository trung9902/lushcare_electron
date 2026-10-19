import React, { useState } from 'react';
import {
  X,
  Columns,
  Check,
  RotateCcw,
  Search,
  CheckSquare,
  Square,
  Star,
  ShieldCheck,
  Globe,
  Sliders
} from 'lucide-react';
import { ColumnItem, PresetType } from '../../types';
import { getPresetColumns } from '../../utils/columns';

interface ColumnVisibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  columns: ColumnItem[];
  onApplyColumns: (columns: ColumnItem[]) => void;
}

export const ColumnVisibilityModal: React.FC<ColumnVisibilityModalProps> = ({
  isOpen,
  onClose,
  columns,
  onApplyColumns,
}) => {
  const [colList, setColList] = useState<ColumnItem[]>(columns);
  const [searchQuery, setSearchQuery] = useState('');

  if (!isOpen) return null;

  const handleToggleColumn = (id: string) => {
    setColList(prev =>
      prev.map(c => {
        if (c.fixed) return c; // pinned cannot be toggled off
        if (c.id === id) return { ...c, visible: !c.visible };
        return c;
      })
    );
  };

  const handleSelectPreset = (preset: PresetType) => {
    setColList(getPresetColumns(preset));
  };

  const handleSelectAll = () => {
    setColList(prev => prev.map(c => ({ ...c, visible: true })));
  };

  const handleDeselectAll = () => {
    setColList(prev => prev.map(c => (c.fixed ? c : { ...c, visible: false })));
  };

  const handleResetDefault = () => {
    setColList(getPresetColumns('DEFAULT'));
  };

  const handleApply = () => {
    onApplyColumns(colList);
    onClose();
  };

  const filtered = colList.filter(c => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return c.label.toLowerCase().includes(q) || c.id.toLowerCase().includes(q);
  });

  const visibleCount = colList.filter(c => c.visible).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in select-none">
      <div className="w-[740px] max-h-[85vh] bg-slate-900 border border-slate-700 rounded-xl shadow-2xl flex flex-col overflow-hidden text-xs text-slate-200">
        {/* Header */}
        <div className="h-12 px-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-teal-600/30 border border-teal-500/40 flex items-center justify-center text-teal-400">
              <Columns className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100">
                CẤU HÌNH HIỂN THỊ CỘT DỮ LIỆU (45 CỘT)
              </h2>
              <p className="text-[11px] text-slate-400">
                Tùy chỉnh bật/tắt cột để tối ưu hóa không gian hiển thị cho từng nghiệp vụ
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

        {/* Quick Presets Bar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Bộ Mẫu Hiển Thị Nhanh (Presets):
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSelectPreset('DEFAULT')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md flex items-center gap-1.5 font-medium border border-slate-700 transition-colors"
            >
              <Star className="w-3.5 h-3.5 text-amber-400 fill-current" />
              <span>⭐ Mặc Định (15 cột)</span>
            </button>

            <button
              onClick={() => handleSelectPreset('SEEDING')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md flex items-center gap-1.5 font-medium border border-slate-700 transition-colors"
            >
              <Sliders className="w-3.5 h-3.5 text-indigo-400" />
              <span>📝 Nuôi Seeding (15 cột)</span>
            </button>

            <button
              onClick={() => handleSelectPreset('SECURITY')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md flex items-center gap-1.5 font-medium border border-slate-700 transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>🛡️ Kiểm Tra Bảo Mật (15 cột)</span>
            </button>

            <button
              onClick={() => handleSelectPreset('FULL')}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md flex items-center gap-1.5 font-medium border border-slate-700 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-sky-400" />
              <span>🌐 Đầy Đủ 45 Cột</span>
            </button>
          </div>
        </div>

        {/* Search & Fast Controls */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm tên cột hoặc mã trường..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full h-7 pl-8 pr-2 bg-slate-950 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSelectAll}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
            >
              Chọn tất cả
            </button>
            <button
              onClick={handleDeselectAll}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px]"
            >
              Bỏ chọn
            </button>
            <button
              onClick={handleResetDefault}
              className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Mặc định</span>
            </button>
          </div>
        </div>

        {/* Columns Grid List */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {filtered.map((col, idx) => {
              return (
                <div
                  key={col.id}
                  onClick={() => handleToggleColumn(col.id)}
                  className={`p-2 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                    col.visible
                      ? 'bg-slate-950/80 border-indigo-500/50 text-slate-100'
                      : 'bg-slate-950/30 border-slate-800 text-slate-500 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <input
                      type="checkbox"
                      checked={col.visible}
                      disabled={col.fixed}
                      onChange={() => {}}
                      className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 cursor-pointer disabled:opacity-40"
                    />
                    <div className="truncate">
                      <div className="font-semibold text-xs truncate">
                        {col.label || col.id}
                      </div>
                      <div className="font-mono text-[10px] text-slate-500 truncate">
                        {col.id}
                      </div>
                    </div>
                  </div>

                  {col.fixed && (
                    <span className="text-[10px] bg-slate-800 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                      Cố định
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="h-14 px-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
          <div className="text-slate-400 text-xs">
            Đang hiển thị: <span className="font-mono text-indigo-400 font-bold">[{visibleCount} / 45]</span> cột
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md font-medium"
            >
              Hủy Bỏ
            </button>
            <button
              onClick={handleApply}
              className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/25"
            >
              <Check className="w-4 h-4" />
              <span>ÁP DỤNG NGAY</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
