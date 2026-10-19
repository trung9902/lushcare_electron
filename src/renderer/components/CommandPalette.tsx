import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Search,
  Command,
  Play,
  Square,
  UserPlus,
  Download,
  Sliders,
  Shuffle,
  Columns,
  RefreshCw,
  HardDrive,
  Sun,
  Moon,
  CheckSquare,
  SquareDashed,
  ExternalLink,
  Folder,
  Layers,
  PanelLeftClose,
  ChevronRight,
  ShieldCheck,
  ShieldAlert,
  Key,
} from 'lucide-react';
import { Account, Folder as FolderType } from '../types';

export interface CommandAction {
  id: string;
  title: string;
  category: 'Điều khiển' | 'Công cụ' | 'Chọn lọc' | 'Giao diện';
  shortcut?: string;
  icon: React.ReactNode;
  onSelect: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  actions: CommandAction[];
  accounts: Account[];
  folders: FolderType[];
  onSelectAccount: (account: Account) => void;
  onSelectFolder: (folderId: number | null) => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  actions,
  accounts,
  folders,
  onSelectAccount,
  onSelectFolder,
}) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Filter items
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    const result: Array<{
      type: 'action' | 'account' | 'folder';
      id: string;
      title: string;
      subtitle?: string;
      category: string;
      shortcut?: string;
      icon: React.ReactNode;
      item: any;
    }> = [];

    // 1. Actions
    for (const act of actions) {
      if (!q || act.title.toLowerCase().includes(q) || act.category.toLowerCase().includes(q)) {
        result.push({
          type: 'action',
          id: `act-${act.id}`,
          title: act.title,
          category: act.category,
          shortcut: act.shortcut,
          icon: act.icon,
          item: act,
        });
      }
    }

    // 2. Folders
    for (const f of folders) {
      if (!q || f.name.toLowerCase().includes(q)) {
        result.push({
          type: 'folder',
          id: `f-${f.id}`,
          title: f.name,
          subtitle: `${f.accountCount || 0} tài khoản`,
          category: 'Thư mục',
          icon: <Folder className="w-3.5 h-3.5 text-indigo-400" />,
          item: f,
        });
      }
    }

    // 3. Accounts (matching UID or Name)
    if (q) {
      const matchedAccounts = accounts.filter(
        a =>
          a.uid.toLowerCase().includes(q) ||
          (a.name && a.name.toLowerCase().includes(q)) ||
          (a.proxy && a.proxy.toLowerCase().includes(q))
      );

      for (const acc of matchedAccounts.slice(0, 15)) {
        result.push({
          type: 'account',
          id: `acc-${acc.id}`,
          title: acc.uid,
          subtitle: `${acc.name || 'Chưa đặt tên'} • ${acc.status} • ${acc.proxy || 'Trực tiếp'}`,
          category: 'Tài khoản',
          icon: (
            <span
              className={`w-2 h-2 rounded-full ${
                acc.status === 'LIVE'
                  ? 'bg-emerald-400'
                  : acc.status === 'DIE'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
          ),
          item: acc,
        });
      }
    }

    return result;
  }, [query, actions, accounts, folders]);

  // Adjust selectedIndex
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < filteredItems.length - 1 ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > 0 ? prev - 1 : filteredItems.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const current = filteredItems[selectedIndex];
      if (current) {
        handleExecute(current);
      }
    }
  };

  const handleExecute = (item: typeof filteredItems[0]) => {
    if (item.type === 'action') {
      item.item.onSelect();
    } else if (item.type === 'folder') {
      onSelectFolder(item.item.id);
    } else if (item.type === 'account') {
      onSelectAccount(item.item);
    }
    onClose();
  };

  // Auto-scroll selected item into view
  useEffect(() => {
    const listEl = listRef.current;
    if (listEl) {
      const selectedEl = listEl.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
      if (selectedEl) {
        selectedEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/70 backdrop-blur-sm select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#061813] border border-[#1b4d40]/80 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="h-11 px-3.5 border-b border-[#1b4d40]/60 flex items-center gap-2.5 bg-[#09221b]">
          <Search className="w-4 h-4 text-[#61c73f] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm lệnh, UID nick, thư mục... (Gõ để tìm)"
            className="flex-1 bg-transparent text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
          />
          <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#041611] border border-[#1b4d40] text-zinc-400 rounded">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-80 overflow-y-auto p-1.5 space-y-0.5">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-zinc-500">
              Không tìm thấy lệnh hoặc tài khoản nào phù hợp
            </div>
          ) : (
            filteredItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isFirstInCategory = idx === 0 || filteredItems[idx - 1].category !== item.category;

              return (
                <React.Fragment key={item.id}>
                  {isFirstInCategory && (
                    <div className="px-3 pt-2 pb-1 text-[10px] font-semibold text-[#61c73f] uppercase tracking-wider select-none">
                      {item.category}
                    </div>
                  )}
                  <div
                    data-index={idx}
                    onClick={() => handleExecute(item)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#1f8538] to-[#259b43] text-white shadow-sm'
                        : 'text-zinc-300 hover:bg-[#0e2c23]/60'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <span
                        className={`flex-shrink-0 ${
                          isSelected ? 'text-white' : 'text-[#61c73f]'
                        }`}
                      >
                        {item.icon}
                      </span>
                      <div className="truncate flex items-baseline gap-2">
                        <span className="font-medium truncate">{item.title}</span>
                        {item.subtitle && (
                          <span
                            className={`text-[11px] truncate ${
                              isSelected ? 'text-emerald-100' : 'text-zinc-500'
                            }`}
                          >
                            {item.subtitle}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      {item.shortcut && (
                        <kbd
                          className={`px-1.5 py-0.5 text-[10px] font-mono rounded ${
                            isSelected
                              ? 'bg-[#17682c] text-white'
                              : 'bg-[#041611] border border-[#1b4d40]/80 text-[#61c73f]'
                          }`}
                        >
                          {item.shortcut}
                        </kbd>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Navigation Hints */}
        <div className="h-8 px-3 border-t border-[#1b4d40]/50 bg-[#041410] flex items-center justify-between text-[11px] text-zinc-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1 py-0.2 font-mono bg-[#09221b] border border-[#1b4d40] rounded text-[10px] text-zinc-300">
                ↑
              </kbd>
              <kbd className="px-1 py-0.2 font-mono bg-[#09221b] border border-[#1b4d40] rounded text-[10px] text-zinc-300">
                ↓
              </kbd>
              <span>Di chuyển</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.2 font-mono bg-[#09221b] border border-[#1b4d40] rounded text-[10px] text-zinc-300">
                ↵
              </kbd>
              <span>Thực hiện</span>
            </span>
          </div>
          <span className="text-[#61c73f] font-medium">VMAX Command Palette • Raycast Style</span>
        </div>
      </div>
    </div>
  );
};
