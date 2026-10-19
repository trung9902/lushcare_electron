import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  FolderInput,
  Copy,
  Trash2,
  X,
  ChevronUp,
  Check,
  Key,
} from 'lucide-react';
import { Folder as FolderType } from '../types';
import { copyToClipboard } from '../utils/otp';

interface FloatingActionBarProps {
  selectedCount: number;
  folders: FolderType[];
  onStartSelected: () => void;
  onMoveToFolder: (folderId: number | null) => void;
  onCopySelected: (format: 'UID' | 'UID_PASS' | 'FULL') => void;
  onDeleteSelected: () => void;
  onDeselectAll: () => void;
}

export const FloatingActionBar: React.FC<FloatingActionBarProps> = ({
  selectedCount,
  folders,
  onStartSelected,
  onMoveToFolder,
  onCopySelected,
  onDeleteSelected,
  onDeselectAll,
}) => {
  const [showFolderMenu, setShowFolderMenu] = useState(false);
  const [showCopyMenu, setShowCopyMenu] = useState(false);
  const folderMenuRef = useRef<HTMLDivElement>(null);
  const copyMenuRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (folderMenuRef.current && !folderMenuRef.current.contains(e.target as Node)) {
        setShowFolderMenu(false);
      }
      if (copyMenuRef.current && !copyMenuRef.current.contains(e.target as Node)) {
        setShowCopyMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (selectedCount === 0) return null;

  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 select-none animate-in fade-in slide-in-from-bottom-2 duration-150 pointer-events-auto">
      <div className="bg-[#061e17]/95 border border-[#1b4d40]/80 rounded-full shadow-2xl backdrop-blur-md px-3.5 py-1.5 flex items-center gap-1.5 text-xs text-zinc-200">
        {/* Count Badge */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#0a2c22] border border-[#61c73f]/30 rounded-full font-mono text-[11px] text-[#61c73f]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#61c73f] animate-pulse" />
          <span className="font-medium">{selectedCount} đã chọn</span>
        </div>

        <div className="h-4 w-[1px] bg-[#1b4d40]/60 mx-0.5" />

        {/* Start Action */}
        <button
          onClick={onStartSelected}
          title="Bắt đầu chạy cho các nick này (Ctrl+R)"
          className="h-7 px-3 bg-gradient-to-r from-[#1f8538] to-[#259b43] hover:from-[#17682c] hover:to-[#1f8538] text-white rounded-full font-semibold flex items-center gap-1.5 shadow-sm shadow-[#1f8538]/30 transition-colors text-[11px]"
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Chạy ngay</span>
        </button>

        {/* Move to Folder Button with Popover */}
        <div className="relative" ref={folderMenuRef}>
          <button
            onClick={() => {
              setShowFolderMenu(!showFolderMenu);
              setShowCopyMenu(false);
            }}
            title="Chuyển vào thư mục"
            className="h-7 px-2.5 hover:bg-[#0e2c23] rounded-full flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
          >
            <FolderInput className="w-3.5 h-3.5 text-zinc-400" />
            <span>Chuyển thư mục</span>
            <ChevronUp className="w-3 h-3 text-zinc-500" />
          </button>

          {showFolderMenu && (
            <div className="absolute bottom-9 left-0 w-44 bg-[#071f19] border border-[#1b4d40] rounded-lg shadow-2xl p-1 z-50 text-xs flex flex-col gap-0.5 animate-in fade-in duration-100">
              <div className="px-2 py-1 text-[10px] font-semibold text-[#61c73f] uppercase tracking-wider">
                Chọn thư mục đến
              </div>
              <button
                onClick={() => {
                  onMoveToFolder(null);
                  setShowFolderMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-[#0e2c23] text-zinc-200 rounded text-[11px] flex items-center justify-between"
              >
                <span>[Tất cả / Mặc định]</span>
              </button>
              {folders.map(f => (
                <button
                  key={f.id}
                  onClick={() => {
                    onMoveToFolder(f.id);
                    setShowFolderMenu(false);
                  }}
                  className="w-full text-left px-2.5 py-1.5 hover:bg-[#0e2c23] text-zinc-200 rounded text-[11px] flex items-center justify-between truncate"
                >
                  <span className="truncate">{f.name}</span>
                  <span className="text-[10px] text-zinc-400 font-mono">({f.accountCount || 0})</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Copy Button with Popover */}
        <div className="relative" ref={copyMenuRef}>
          <button
            onClick={() => {
              setShowCopyMenu(!showCopyMenu);
              setShowFolderMenu(false);
            }}
            title="Sao chép định dạng"
            className="h-7 px-2.5 hover:bg-[#0e2c23] rounded-full flex items-center gap-1 text-[11px] text-zinc-300 hover:text-white transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-zinc-400" />
            <span>Sao chép</span>
            <ChevronUp className="w-3 h-3 text-zinc-500" />
          </button>

          {showCopyMenu && (
            <div className="absolute bottom-9 left-0 w-48 bg-[#071f19] border border-[#1b4d40] rounded-lg shadow-2xl p-1 z-50 text-xs flex flex-col gap-0.5 animate-in fade-in duration-100">
              <button
                onClick={() => {
                  onCopySelected('UID');
                  setShowCopyMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-[#0e2c23] text-zinc-200 rounded text-[11px]"
              >
                Chỉ UID
              </button>
              <button
                onClick={() => {
                  onCopySelected('UID_PASS');
                  setShowCopyMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-[#0e2c23] text-zinc-200 rounded text-[11px]"
              >
                UID|Mật khẩu
              </button>
              <button
                onClick={() => {
                  onCopySelected('FULL');
                  setShowCopyMenu(false);
                }}
                className="w-full text-left px-2.5 py-1.5 hover:bg-[#0e2c23] text-zinc-200 rounded text-[11px]"
              >
                UID|Pass|2FA|Cookie|Proxy
              </button>
            </div>
          )}
        </div>

        {/* Delete Action */}
        <button
          onClick={onDeleteSelected}
          title="Xóa các nick đã chọn"
          className="h-7 px-2.5 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded-full flex items-center gap-1 text-[11px] transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Xóa</span>
        </button>

        <div className="h-4 w-[1px] bg-[#1b4d40]/60 mx-0.5" />

        {/* Deselect All */}
        <button
          onClick={onDeselectAll}
          title="Bỏ chọn tất cả (Esc)"
          className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-zinc-200 rounded-full transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
