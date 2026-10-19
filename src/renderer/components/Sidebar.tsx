import React, { useState } from 'react';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  Layers,
  Archive,
  Trash2,
  HardDrive,
  Cpu,
  Activity,
  Edit2,
  Check,
  X,
  Wifi,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { FolderEntity } from '@shared/types';
import { SystemStats } from '../types';

interface SidebarProps {
  folders: FolderEntity[];
  activeFolderId: number | null; // null = All, -1 = Trash, >0 = Folder id
  onSelectFolder: (folderId: number | null) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onDeleteFolder: (folderId: number) => Promise<void>;
  onCleanProfiles: () => Promise<void>;
  totalAccountsCount: number;
  totalLiveCount: number;
  totalDieCount: number;
  trashCount: number;
  systemStats: SystemStats;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  folders,
  activeFolderId,
  onSelectFolder,
  onCreateFolder,
  onDeleteFolder,
  onCleanProfiles,
  totalAccountsCount,
  totalLiveCount,
  totalDieCount,
  trashCount,
  systemStats,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [cleaning, setCleaning] = useState(false);

  const handleCreate = async () => {
    if (!newFolderName.trim()) {
      setIsAdding(false);
      return;
    }
    await onCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsAdding(false);
  };

  const handleClean = async () => {
    setCleaning(true);
    await onCleanProfiles();
    setCleaning(false);
  };

  // COLLAPSED SIDEBAR (48px)
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-[#061813] border-r border-[#1b4d40]/40 flex flex-col justify-between items-center py-2 select-none flex-shrink-0 z-10 transition-all duration-150">
        <div className="flex flex-col items-center gap-2 w-full">
          {/* Expand Toggle */}
          <button
            onClick={onToggleCollapse}
            title="Mở rộng thanh bên (Ctrl+B)"
            className="w-8 h-8 flex items-center justify-center hover:bg-[#0e2c23] text-zinc-400 hover:text-[#61c73f] rounded transition-colors"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-[#1b4d40]/40 my-1" />

          {/* All Accounts Icon */}
          <button
            onClick={() => onSelectFolder(null)}
            title={`Tất cả tài khoản (${totalAccountsCount})`}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors relative ${
              activeFolderId === null
                ? 'bg-[#0e2c23] text-[#61c73f] border border-[#61c73f]/40'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-[#0e2c23]/40'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span className="absolute -bottom-0.5 right-0.5 text-[9px] font-mono font-medium text-[#61c73f]">
              {totalAccountsCount}
            </span>
          </button>

          {/* Folders Icon List */}
          {folders.map(folder => {
            const isActive = activeFolderId === folder.id;
            return (
              <button
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                title={`${folder.name} (${folder.accountCount || 0})`}
                className={`w-8 h-8 flex items-center justify-center rounded transition-colors relative ${
                  isActive
                    ? 'bg-[#0e2c23] text-[#61c73f] border border-[#61c73f]/40'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#0e2c23]/40'
                }`}
              >
                {isActive ? (
                  <FolderOpen className="w-4 h-4" />
                ) : (
                  <Folder className="w-4 h-4" />
                )}
              </button>
            );
          })}

          {/* Trash Icon */}
          <button
            onClick={() => onSelectFolder(-1)}
            title={`Thùng rác (${trashCount})`}
            className={`w-8 h-8 flex items-center justify-center rounded transition-colors ${
              activeFolderId === -1
                ? 'bg-rose-950/40 text-rose-400 border border-rose-500/30'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-[#0e2c23]/40'
            }`}
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>

        {/* Bottom System Indicator */}
        <div className="flex flex-col items-center gap-1.5 text-zinc-500">
          <div
            title={`Hệ thống OK • CPU ${systemStats.cpuUsage}% • RAM ${(systemStats.ramUsageMB / 1024).toFixed(1)}GB`}
            className="w-2.5 h-2.5 rounded-full bg-[#61c73f] cursor-pointer"
          />
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-60 bg-[#061813] border-r border-[#1b4d40]/40 flex flex-col justify-between select-none flex-shrink-0 z-10 transition-all duration-150">
      {/* Top Section: Folder Tree */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Header */}
        <div className="h-9 px-3 border-b border-[#1b4d40]/40 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[10px] font-medium tracking-wider text-zinc-400 uppercase">
            <Folder className="w-3.5 h-3.5 text-[#61c73f]" />
            <span>Thư mục tài khoản</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsAdding(true)}
              title="Thêm thư mục tài khoản mới"
              className="px-1.5 py-0.5 hover:bg-[#0e2c23] text-zinc-400 hover:text-[#61c73f] rounded transition-colors flex items-center gap-1 text-[11px]"
            >
              <FolderPlus className="w-3 h-3" />
              <span>Thêm</span>
            </button>
            {onToggleCollapse && (
              <button
                onClick={onToggleCollapse}
                title="Thu gọn thanh bên (Ctrl+B)"
                className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-zinc-200 rounded transition-colors"
              >
                <PanelLeftClose className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Inline Add Folder Input */}
        {isAdding && (
          <div className="p-2 border-b border-[#1b4d40]/40 bg-[#041611] flex items-center gap-1">
            <input
              type="text"
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') setIsAdding(false);
              }}
              placeholder="Tên thư mục mới..."
              className="flex-1 h-6 px-2 bg-[#09221b] border border-[#61c73f]/60 rounded text-xs text-zinc-100 focus:outline-none"
            />
            <button
              onClick={handleCreate}
              className="p-1 text-[#61c73f] hover:bg-[#0e2c23] rounded"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsAdding(false)}
              className="p-1 text-zinc-400 hover:bg-[#0e2c23] rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Folder List Scroll Area */}
        <div className="flex-1 overflow-y-auto px-1.5 py-1.5 space-y-0.5">
          {/* ALL ACCOUNTS ITEM */}
          <div
            onClick={() => onSelectFolder(null)}
            className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition-all ${
              activeFolderId === null
                ? 'bg-[#0e2c23] text-white font-medium border-l-2 border-[#61c73f] shadow-sm'
                : 'hover:bg-[#0e2c23]/40 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Layers className={`w-3.5 h-3.5 ${activeFolderId === null ? 'text-[#61c73f]' : 'text-zinc-500'}`} />
              <span className="truncate">Tất cả tài khoản</span>
            </div>
            <div className="flex items-center gap-1 font-mono tabular-nums text-[10px]">
              <span className="text-[#61c73f] bg-[#041611] border border-[#1b4d40]/60 px-1.5 py-0.2 rounded font-medium">
                {totalAccountsCount}
              </span>
            </div>
          </div>

          <div className="h-[1px] bg-[#1b4d40]/40 my-1 mx-1" />

          {/* USER FOLDERS */}
          {folders.map(folder => {
            const isActive = activeFolderId === folder.id;
            const live = folder.liveCount ?? 0;
            const die = folder.dieCount ?? 0;
            const total = folder.accountCount ?? 0;

            return (
              <div
                key={folder.id}
                onClick={() => onSelectFolder(folder.id)}
                className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition-all ${
                  isActive
                    ? 'bg-[#0e2c23] text-white font-medium border-l-2 border-[#61c73f] shadow-sm'
                    : 'hover:bg-[#0e2c23]/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  {isActive ? (
                    <FolderOpen className="w-3.5 h-3.5 text-[#61c73f] flex-shrink-0" />
                  ) : (
                    <Folder className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-400 flex-shrink-0" />
                  )}
                  <span className="truncate">{folder.name}</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono tabular-nums text-[10px]">
                  <span className="text-zinc-400 bg-[#041611] border border-[#1b4d40]/40 px-1.5 py-0.2 rounded">
                    {total}
                  </span>
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm(`Xác nhận xóa thư mục "${folder.name}"? Các nick sẽ được chuyển vào Thùng Rác.`)) {
                        onDeleteFolder(folder.id);
                      }
                    }}
                    title="Xóa thư mục"
                    className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-400 rounded transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          <div className="h-[1px] bg-[#1b4d40]/40 my-1 mx-1" />

          {/* TRASH ITEM */}
          <div
            onClick={() => onSelectFolder(-1)}
            className={`group flex items-center justify-between px-2.5 py-1.5 rounded cursor-pointer text-xs transition-all ${
              activeFolderId === -1
                ? 'bg-rose-950/30 text-rose-300 font-medium border-l-2 border-rose-500 shadow-sm'
                : 'hover:bg-[#0e2c23]/40 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              <Archive className="w-3.5 h-3.5 text-zinc-500" />
              <span className="truncate">Thùng rác</span>
            </div>
            <span className="bg-[#041611] border border-[#1b4d40]/60 text-zinc-400 px-1.5 py-0.2 rounded font-mono text-[10px]">
              {trashCount}
            </span>
          </div>
        </div>
      </div>

      {/* Bottom Section: System Status Card */}
      <div className="p-2.5 border-t border-[#1b4d40]/40 bg-[#041611] space-y-1.5 text-xs">
        <div className="flex items-center justify-between text-zinc-400 font-medium text-[10px] uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3 h-3 text-[#61c73f]" />
            <span>Hệ thống</span>
          </div>
          <span className="w-1.5 h-1.5 rounded-full bg-[#61c73f]" />
        </div>

        {/* Proxy Status */}
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Wifi className="w-3 h-3 text-zinc-500" />
            <span>Proxy Hub:</span>
          </div>
          <span className="font-mono text-zinc-300 text-[10px]">
            {systemStats.activeProxies}/{systemStats.totalProxies}
          </span>
        </div>

        {/* CPU & RAM */}
        <div className="flex items-center justify-between text-zinc-400 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Cpu className="w-3 h-3 text-zinc-500" />
            <span>CPU / RAM:</span>
          </div>
          <span className="font-mono text-zinc-300 text-[10px]">
            {systemStats.cpuUsage}% / {(systemStats.ramUsageMB / 1024).toFixed(1)}GB
          </span>
        </div>

        {/* Disk Profile Cleanup */}
        <div className="flex items-center justify-between text-zinc-400 text-[11px] pt-1 border-t border-[#1b4d40]/30">
          <div className="flex items-center gap-1.5">
            <HardDrive className="w-3 h-3 text-zinc-500" />
            <span>Profile SSD:</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-zinc-300 text-[10px]">
              {systemStats.profileSizeGB} GB
            </span>
            <button
              onClick={handleClean}
              disabled={cleaning}
              title="Dọn dẹp cache profile rác"
              className="px-1.5 py-0.2 bg-[#09221b] hover:bg-[#1f8538] text-zinc-300 hover:text-white rounded text-[10px] border border-[#1b4d40]/80 transition-colors"
            >
              {cleaning ? '...' : 'Dọn'}
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
