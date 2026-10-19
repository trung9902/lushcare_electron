import React from 'react';
import { ShieldAlert, Minus, Square, X, Sun, Moon, Database, Cpu, Layers } from 'lucide-react';
import { ipcService } from '../services/ipc';
import vmaxLogo from '../assets/vmax_logo.png';

interface TitlebarProps {
  currentFolderName?: string;
  activeThreads: number;
  maxThreads: number;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

export const Titlebar: React.FC<TitlebarProps> = ({
  currentFolderName = 'Tất cả tài khoản',
  activeThreads = 0,
  maxThreads = 5,
  isDarkMode,
  onToggleTheme,
}) => {
  return (
    <header className="h-10 bg-[#061813] border-b border-[#1b4d40]/40 flex items-center justify-between px-3 select-none titlebar-drag z-40">
      {/* Brand & Logo */}
      <div className="flex items-center gap-2.5 titlebar-nodrag">
        <div className="h-7 px-2 py-0.5 rounded bg-black/50 border border-[#61c73f]/30 flex items-center justify-center shadow-sm overflow-hidden">
          <img src={vmaxLogo} alt="VMAX Tech Logo" className="h-5 max-h-5 w-auto object-contain" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-xs tracking-tight text-white flex items-center gap-1">
            <span className="text-[#61c73f]">VMAX</span>
            <span className="text-zinc-200">Tech</span>
          </span>
          <span className="bg-[#1f8538]/25 border border-[#61c73f]/30 text-[#61c73f] font-mono text-[9px] px-1.5 py-0.5 rounded font-medium">
            v25.5 Pro
          </span>
        </div>
      </div>

      {/* Center Status Indicators */}
      <div className="hidden md:flex items-center gap-2 text-xs">
        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#09221b]/80 border border-[#1b4d40]/40 titlebar-nodrag text-[11px]">
          <Layers className="w-3 h-3 text-[#61c73f]" />
          <span className="text-zinc-400">Thư mục:</span>
          <span className="text-zinc-200 font-medium max-w-[140px] truncate">{currentFolderName}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#09221b]/80 border border-[#1b4d40]/40 titlebar-nodrag text-[11px]">
          <span className={`w-1.5 h-1.5 rounded-full ${activeThreads > 0 ? 'bg-[#61c73f] animate-pulse' : 'bg-zinc-500'}`} />
          <span className="text-zinc-400">Luồng:</span>
          <span className="font-mono text-zinc-200 font-medium">{activeThreads}/{maxThreads}</span>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-[#09221b]/80 border border-[#1b4d40]/40 titlebar-nodrag text-[11px]">
          <Database className="w-3 h-3 text-[#61c73f]" />
          <span className="text-zinc-400">SQLite:</span>
          <span className="text-[#61c73f] font-mono text-[10px]">WAL OK</span>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-0.5 titlebar-nodrag">
        <button
          onClick={onToggleTheme}
          title={isDarkMode ? 'Chuyển sang chế độ sáng' : 'Chuyển sang chế độ tối'}
          className="p-1 text-zinc-400 hover:text-zinc-100 hover:bg-[#0e2c23] rounded transition-colors mr-1"
        >
          {isDarkMode ? <Sun className="w-3 h-3" /> : <Moon className="w-3 h-3" />}
        </button>

        <button
          onClick={() => ipcService.minimizeWindow()}
          title="Thu nhỏ"
          className="w-8 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#0e2c23] rounded transition-colors"
        >
          <Minus className="w-3 h-3" />
        </button>

        <button
          onClick={() => ipcService.maximizeWindow()}
          title="Phóng to / Khôi phục"
          className="w-8 h-6 flex items-center justify-center text-zinc-400 hover:text-zinc-100 hover:bg-[#0e2c23] rounded transition-colors"
        >
          <Square className="w-2.5 h-2.5" />
        </button>

        <button
          onClick={() => ipcService.closeWindow()}
          title="Đóng ứng dụng"
          className="w-8 h-6 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-rose-600 rounded transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    </header>
  );
};
