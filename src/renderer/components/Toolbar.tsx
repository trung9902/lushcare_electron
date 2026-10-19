import React, { useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  UserPlus,
  Download,
  Sliders,
  Shuffle,
  Columns,
  RefreshCw,
  Search,
  X,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Loader2,
  CheckSquare,
  Square as SquareIcon,
  ChevronDown,
  Command
} from 'lucide-react';
import { AccountStatusType } from '../types';

interface StatusCounts {
  all: number;
  live: number;
  die: number;
  cp282: number;
  cp956: number;
  running: number;
}

interface ToolbarProps {
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onClearSearch: () => void;
  statusCounts: StatusCounts;
  selectedCount: number;
  totalCount: number;
  isRunning: boolean;
  isPaused: boolean;
  maxThreads: number;
  onMaxThreadsChange: (threads: number) => void;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onOpenImport: () => void;
  onOpenExport: () => void;
  onOpenScenarios: () => void;
  onOpenProxyConfig: () => void;
  onOpenColumnConfig: () => void;
  onRefresh: () => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onSelectByStatus: (statusType: 'LIVE' | 'DIE' | 'CHECKPOINT') => void;
  onOpenCommandPalette?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchChange,
  onClearSearch,
  statusCounts,
  selectedCount,
  totalCount,
  isRunning,
  isPaused,
  maxThreads,
  onMaxThreadsChange,
  onStart,
  onPause,
  onResume,
  onStop,
  onOpenImport,
  onOpenExport,
  onOpenScenarios,
  onOpenProxyConfig,
  onOpenColumnConfig,
  onRefresh,
  onSelectAll,
  onDeselectAll,
  onSelectByStatus,
  onOpenCommandPalette,
}) => {
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showSelectMenu, setShowSelectMenu] = React.useState(false);

  return (
    <div className="bg-[#071f19] border-b border-[#1b4d40]/40 px-3 py-2 flex flex-col gap-2 select-none">
      {/* Top Row: Primary Actions, Management Tools, and Search */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Left: Execution Control & Management Tools */}
        <div className="flex flex-wrap items-center gap-1.5">
          {/* RUNNER CONTROLS */}
          {!isRunning ? (
            <button
              onClick={onStart}
              disabled={selectedCount === 0}
              title="Bắt đầu chạy tương tác cho các nick đã chọn (Ctrl + R)"
              className="h-8 px-3.5 bg-gradient-to-r from-[#1f8538] to-[#259b43] hover:from-[#17682c] hover:to-[#1f8538] active:from-[#145a25] text-white rounded text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-[#1f8538]/30 transition-all duration-100 disabled:opacity-30 disabled:pointer-events-none"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Bắt đầu</span>
            </button>
          ) : (
            <>
              {isPaused ? (
                <button
                  onClick={onResume}
                  title="Tiếp tục chạy"
                  className="h-8 px-3 bg-emerald-500/10 border border-[#61c73f]/40 hover:bg-emerald-500/20 text-[#61c73f] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Tiếp tục</span>
                </button>
              ) : (
                <button
                  onClick={onPause}
                  title="Tạm dừng tất cả các luồng"
                  className="h-8 px-3 bg-[#ff7a1a]/15 border border-[#ff7a1a]/40 hover:bg-[#ff7a1a]/25 text-[#ff7a1a] rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
                >
                  <Pause className="w-3.5 h-3.5 fill-current" />
                  <span>Tạm dừng</span>
                </button>
              )}
              <button
                onClick={onStop}
                title="Dừng khẩn cấp toàn bộ luồng"
                className="h-8 px-3 bg-rose-500/15 border border-rose-500/30 hover:bg-rose-500/25 text-rose-300 rounded text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Dừng</span>
              </button>
            </>
          )}

          <div className="h-4 w-[1px] bg-[#1b4d40]/60 mx-1" />

          {/* MANAGEMENT BUTTONS */}
          <button
            onClick={onOpenImport}
            title="Nhập tài khoản hàng loạt (Ctrl + I)"
            className="h-8 px-2.5 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-300 hover:text-white rounded text-xs font-normal flex items-center gap-1.5 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5 text-[#61c73f]" />
            <span>Thêm nick</span>
          </button>

          <button
            onClick={onOpenExport}
            title="Xuất dữ liệu tài khoản (Ctrl + E)"
            className="h-8 px-2.5 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-300 hover:text-white rounded text-xs font-normal flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Xuất file</span>
          </button>

          <button
            onClick={onOpenScenarios}
            title="Cấu hình kịch bản nuôi nick tự động"
            className="h-8 px-2.5 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-300 hover:text-white rounded text-xs font-normal flex items-center gap-1.5 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#ff7a1a]" />
            <span>Kịch bản</span>
          </button>

          <button
            onClick={onOpenProxyConfig}
            title="Cấu hình đổi IP Proxy (MinProxy, XProxy, ShopLike...)"
            className="h-8 px-2.5 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-300 hover:text-white rounded text-xs font-normal flex items-center gap-1.5 transition-colors"
          >
            <Shuffle className="w-3.5 h-3.5 text-[#61c73f]" />
            <span>Đổi IP</span>
          </button>

          <button
            onClick={onOpenColumnConfig}
            title="Cấu hình hiển thị 45 cột dữ liệu"
            className="h-8 px-2.5 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-300 hover:text-white rounded text-xs font-normal flex items-center gap-1.5 transition-colors"
          >
            <Columns className="w-3.5 h-3.5 text-zinc-400" />
            <span>Cột</span>
          </button>

          <button
            onClick={onRefresh}
            title="Nạp lại dữ liệu từ CSDL (F5)"
            className="h-8 w-8 flex items-center justify-center bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#1b4d40]/60 hover:border-[#61c73f]/40 text-zinc-400 hover:text-[#61c73f] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Thread Concurrency Slider & Fulltext Search */}
        <div className="flex items-center gap-2.5">
          {/* Thread Count Selector */}
          <div className="flex items-center gap-1.5 bg-[#041611] border border-[#1b4d40]/60 px-2 py-0.5 rounded text-xs">
            <span className="text-zinc-400 text-[11px]">Luồng:</span>
            <input
              type="number"
              min={1}
              max={30}
              value={maxThreads}
              onChange={e => onMaxThreadsChange(Math.max(1, Math.min(30, parseInt(e.target.value) || 1)))}
              className="w-10 bg-[#09221b] border border-[#1b4d40]/80 rounded px-1 py-0.5 text-center font-mono text-xs text-[#61c73f] focus:outline-none focus:border-[#61c73f]"
            />
          </div>

          {/* Command Palette Quick Trigger */}
          {onOpenCommandPalette && (
            <button
              onClick={onOpenCommandPalette}
              title="Mở Command Palette điều khiển toàn năng (Ctrl + K)"
              className="h-8 px-2 bg-[#0b261f]/80 hover:bg-[#12392f] border border-[#61c73f]/30 hover:border-[#61c73f]/60 text-[#61c73f] hover:text-white rounded flex items-center gap-1.5 text-xs transition-colors"
            >
              <Command className="w-3.5 h-3.5 text-[#61c73f]" />
              <kbd className="text-[10px] font-mono text-[#61c73f] bg-[#041611] px-1 py-0.2 rounded border border-[#1b4d40]/80">
                Ctrl+K
              </kbd>
            </button>
          )}

          {/* Search Box */}
          <div className="relative w-64">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => onSearchChange(e.target.value)}
              placeholder="Tìm UID, tên, proxy... (Ctrl+F)"
              className="w-full h-8 pl-8 pr-7 bg-[#041611] border border-[#1b4d40]/60 rounded text-xs text-zinc-200 placeholder:text-zinc-500 focus:outline-none focus:border-[#61c73f] focus:ring-1 focus:ring-[#61c73f]/25 transition-all"
            />
            {searchQuery && (
              <button
                onClick={onClearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Row: Quick Status Filter Chips & Multi-selection Indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#1b4d40]/40">
        {/* Quick Filter Chips */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            onClick={() => onStatusFilterChange('ALL')}
            className={`px-2.5 py-1 rounded text-xs font-normal transition-all flex items-center gap-1.5 ${
              statusFilter === 'ALL'
                ? 'bg-[#12392f] text-white font-medium border border-[#61c73f]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/50 border border-transparent'
            }`}
          >
            <span>Tất cả</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] px-1.5 py-0.2 rounded-full">{statusCounts.all}</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('LIVE')}
            className={`px-2.5 py-1 rounded text-xs font-normal transition-all flex items-center gap-1.5 ${
              statusFilter === 'LIVE'
                ? 'bg-[#1f8538]/25 text-[#61c73f] font-medium border border-[#61c73f]/50 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/50 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#61c73f]" />
            <span>Live</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] px-1.5 py-0.2 rounded-full">{statusCounts.live}</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('DIE')}
            className={`px-2.5 py-1 rounded text-xs font-normal transition-all flex items-center gap-1.5 ${
              statusFilter === 'DIE'
                ? 'bg-rose-500/15 text-rose-300 font-medium border border-rose-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/50 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <span>Die / Khóa</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] px-1.5 py-0.2 rounded-full">{statusCounts.die}</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('CHECKPOINT')}
            className={`px-2.5 py-1 rounded text-xs font-normal transition-all flex items-center gap-1.5 ${
              statusFilter === 'CHECKPOINT'
                ? 'bg-[#ff7a1a]/15 text-[#ff7a1a] font-medium border border-[#ff7a1a]/40 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/50 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a1a]" />
            <span>CP 282 / 956</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] px-1.5 py-0.2 rounded-full">{statusCounts.cp282 + statusCounts.cp956}</span>
          </button>

          <button
            onClick={() => onStatusFilterChange('RUNNING')}
            className={`px-2.5 py-1 rounded text-xs font-normal transition-all flex items-center gap-1.5 ${
              statusFilter === 'RUNNING'
                ? 'bg-sky-500/15 text-sky-300 font-medium border border-sky-500/30 shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/50 border border-transparent'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            <span>Đang chạy</span>
            <span className="font-mono text-[10px] text-zinc-400 bg-[#041611] px-1.5 py-0.2 rounded-full">{statusCounts.running}</span>
          </button>
        </div>

        {/* Selected Count & Selection Dropdown */}
        <div className="relative flex items-center gap-2.5">
          <div className="text-xs text-zinc-400 flex items-center gap-1">
            <span>Đã chọn:</span>
            <span className="font-mono text-[#61c73f] font-semibold">
              [{selectedCount}]
            </span>
            <span>/ {totalCount} nick</span>
          </div>

          <div className="relative">
            <button
              onClick={() => setShowSelectMenu(!showSelectMenu)}
              className="h-7 px-2 bg-[#0b261f] hover:bg-[#12392f] border border-[#1b4d40]/60 text-zinc-200 rounded text-[11px] flex items-center gap-1"
            >
              <span>Chọn nhanh</span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {showSelectMenu && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowSelectMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-44 bg-slate-900 border border-slate-700 rounded-md shadow-xl py-1 z-40 text-xs">
                  <button
                    onClick={() => {
                      onSelectAll();
                      setShowSelectMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                    <span>Chọn tất cả (Ctrl+A)</span>
                  </button>
                  <button
                    onClick={() => {
                      onDeselectAll();
                      setShowSelectMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
                  >
                    <SquareIcon className="w-3.5 h-3.5" />
                    <span>Bỏ chọn tất cả</span>
                  </button>
                  <div className="h-[1px] bg-slate-800 my-1" />
                  <button
                    onClick={() => {
                      onSelectByStatus('LIVE');
                      setShowSelectMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 text-emerald-400"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Chọn tất cả LIVE</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectByStatus('DIE');
                      setShowSelectMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 text-rose-400"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Chọn tất cả DIE</span>
                  </button>
                  <button
                    onClick={() => {
                      onSelectByStatus('CHECKPOINT');
                      setShowSelectMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center gap-2 text-amber-400"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Chọn CHECKPOINT</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
