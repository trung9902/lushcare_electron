import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { AccountEntity } from '@shared/types';
import { ColumnItem } from '../types';
import { getAccountStatus, getStatusBadgeConfig, truncate } from '../utils/format';
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Lock,
  Loader2,
  Circle,
  FolderOpen,
  SearchX,
  UserPlus,
  ExternalLink,
  ShieldCheck,
  Copy,
  Info,
} from 'lucide-react';

interface VirtualDataGridProps {
  accounts: AccountEntity[];
  columns: ColumnItem[];
  selectedIds: Set<number>;
  focusedIndex: number;
  onSelectRow: (id: number, multiSelect?: boolean, rangeSelect?: boolean, index?: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onFocusRow: (index: number) => void;
  onRowDoubleClick: (account: AccountEntity) => void;
  onRowContextMenu: (e: React.MouseEvent, account: AccountEntity, index: number) => void;
  onOpenImport: () => void;
  searchQuery: string;
  onInspectAccount?: (account: AccountEntity) => void;
  onCopyField?: (text: string, label: string) => void;
}

export const VirtualDataGrid: React.FC<VirtualDataGridProps> = ({
  accounts,
  columns,
  selectedIds,
  focusedIndex,
  onSelectRow,
  onSelectAll,
  onDeselectAll,
  onFocusRow,
  onRowDoubleClick,
  onRowContextMenu,
  onOpenImport,
  searchQuery,
  onInspectAccount,
  onCopyField,
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastClickedIndexRef = useRef<number>(0);

  const visibleColumns = useMemo(() => columns.filter(c => c.visible), [columns]);
  const pinnedColumns = useMemo(() => visibleColumns.filter(c => c.fixed), [visibleColumns]);
  const scrollableColumns = useMemo(() => visibleColumns.filter(c => !c.fixed), [visibleColumns]);

  const totalPinnedWidth = useMemo(() => pinnedColumns.reduce((sum, c) => sum + c.width, 0), [pinnedColumns]);
  const totalScrollableWidth = useMemo(() => scrollableColumns.reduce((sum, c) => sum + c.width, 0), [scrollableColumns]);
  const totalTableWidth = useMemo(() => totalPinnedWidth + totalScrollableWidth, [totalPinnedWidth, totalScrollableWidth]);

  const rowVirtualizer = useVirtualizer({
    count: accounts.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 34,
    overscan: 15,
  });

  const isAllSelected = accounts.length > 0 && selectedIds.size === accounts.length;
  const isPartiallySelected = selectedIds.size > 0 && selectedIds.size < accounts.length;

  const handleRowClick = (e: React.MouseEvent, account: AccountEntity, index: number) => {
    onFocusRow(index);
    if (e.shiftKey) {
      onSelectRow(account.id, false, true, index);
    } else if (e.ctrlKey || e.metaKey) {
      onSelectRow(account.id, true, false, index);
      lastClickedIndexRef.current = index;
    } else {
      onSelectRow(account.id, false, false, index);
      lastClickedIndexRef.current = index;
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent, account: AccountEntity, index: number) => {
    e.stopPropagation();
    onFocusRow(index);
    onSelectRow(account.id, true, false, index);
    lastClickedIndexRef.current = index;
  };

  // Keyboard navigation inside grid
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (accounts.length === 0) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIdx = Math.min(accounts.length - 1, focusedIndex + 1);
        onFocusRow(nextIdx);
        rowVirtualizer.scrollToIndex(nextIdx, { align: 'auto' });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIdx = Math.max(0, focusedIndex - 1);
        onFocusRow(prevIdx);
        rowVirtualizer.scrollToIndex(prevIdx, { align: 'auto' });
      } else if (e.key === ' ') {
        e.preventDefault();
        const currentAcc = accounts[focusedIndex];
        if (currentAcc) {
          onSelectRow(currentAcc.id, true, false, focusedIndex);
        }
      } else if (e.key === 'Enter' || e.key.toLowerCase() === 'i') {
        e.preventDefault();
        const currentAcc = accounts[focusedIndex];
        if (currentAcc) {
          onInspectAccount?.(currentAcc);
        }
      }
    },
    [accounts, focusedIndex, onFocusRow, onSelectRow, onInspectAccount, rowVirtualizer]
  );

  return (
    <div
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="flex-1 flex flex-col bg-[#031410] overflow-hidden outline-none select-none relative"
    >
      {/* Scroll Container encompassing both Sticky Header and Virtual Rows */}
      <div ref={parentRef} className="flex-1 overflow-auto bg-[#031410] relative">
        <div style={{ minWidth: totalTableWidth, width: 'max-content' }}>
          {/* Sticky Table Header */}
          <div className="sticky top-0 z-30 flex bg-[#061813] border-b border-[#1b4d40]/50 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider select-none shadow-sm">
            {/* Pinned Left Columns */}
            <div
              className="sticky left-0 z-40 flex bg-[#061813] border-r border-[#1b4d40]/60 shadow-sm flex-shrink-0"
              style={{ width: totalPinnedWidth }}
            >
              {pinnedColumns.map(col => {
                if (col.id === 'checkbox') {
                  return (
                    <div
                      key={col.id}
                      style={{ width: col.width, minWidth: col.width }}
                      className="h-8 flex items-center justify-center border-r border-[#1b4d40]/40 flex-shrink-0"
                    >
                      <input
                        type="checkbox"
                        checked={isAllSelected}
                        ref={el => {
                          if (el) el.indeterminate = isPartiallySelected;
                        }}
                        onChange={e => {
                          if (e.target.checked) onSelectAll();
                          else onDeselectAll();
                        }}
                        className="w-3.5 h-3.5 rounded bg-[#041611] border-[#1b4d40] text-[#1f8538] focus:ring-0 cursor-pointer"
                      />
                    </div>
                  );
                }

                return (
                  <div
                    key={col.id}
                    style={{ width: col.width, minWidth: col.width }}
                    className={`h-8 px-2 flex items-center border-r border-[#1b4d40]/40 truncate flex-shrink-0 ${
                      col.id === 'stt' ? 'justify-center font-mono' : ''
                    }`}
                  >
                    {col.label}
                  </div>
                );
              })}
            </div>

            {/* Scrollable Columns Header */}
            <div className="flex flex-shrink-0" style={{ width: totalScrollableWidth }}>
              {scrollableColumns.map(col => (
                <div
                  key={col.id}
                  style={{ width: col.width, minWidth: col.width }}
                  className="h-8 px-2.5 flex items-center border-r border-[#1b4d40]/40 truncate text-zinc-400 flex-shrink-0"
                  title={col.label}
                >
                  {col.label}
                </div>
              ))}
            </div>
          </div>

          {/* Virtual Table Rows or Empty State */}
          {accounts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 px-6 text-center text-slate-400 min-h-[400px]">
              {searchQuery ? (
                <>
                  <SearchX className="w-12 h-12 text-slate-600 mb-3" />
                  <p className="text-sm font-medium text-slate-300">Không tìm thấy tài khoản nào phù hợp</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Không có kết quả khớp với từ khóa "{searchQuery}". Nhấn Esc hoặc xóa từ khóa để thử lại.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-2xl bg-indigo-950/40 border border-indigo-800/40 flex items-center justify-center mb-3">
                    <FolderOpen className="w-8 h-8 text-indigo-400" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">Thư mục này chưa có tài khoản nào!</p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Nhập tài khoản từ file TXT hoặc dán trực tiếp danh sách UID|Pass|2FA để bắt đầu chạy tương tác.
                  </p>
                  <button
                    onClick={onOpenImport}
                    className="mt-4 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-md text-xs font-semibold flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Thêm Tài Khoản Ngay (Ctrl + I)</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                position: 'relative',
                width: totalTableWidth,
              }}
            >
              {rowVirtualizer.getVirtualItems().map(virtualRow => {
                const account = accounts[virtualRow.index];
                if (!account) return null;

                const isSelected = selectedIds.has(account.id);
                const isFocused = focusedIndex === virtualRow.index;
                const isRunning = Boolean(account.runningStatus && account.runningStatus.trim() !== '');
                const statusType = getAccountStatus(account.info, account.runningStatus);
                const badge = getStatusBadgeConfig(statusType, account.info);

                return (
                  <div
                    key={account.id}
                    onClick={e => handleRowClick(e, account, virtualRow.index)}
                    onDoubleClick={() => onRowDoubleClick(account)}
                    onContextMenu={e => onRowContextMenu(e, account, virtualRow.index)}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: totalTableWidth,
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className={`flex text-xs transition-colors cursor-pointer select-none border-b border-[#1b4d40]/30 ${
                      virtualRow.index % 2 === 0 ? 'bg-[#031410]' : 'bg-[#051913]'
                    } ${isSelected ? 'bg-[#0b2b22] border-l-2 border-[#61c73f] text-white' : 'text-zinc-300'} ${
                      isRunning ? 'bg-[#082218] border-l-2 border-[#61c73f] animate-shimmer' : ''
                    } ${isFocused ? 'ring-1 ring-inset ring-[#61c73f]/40' : ''} hover:bg-[#09221b]`}
                  >
                    {/* Sticky Pinned Left Columns */}
                    <div
                      className="sticky left-0 z-20 flex bg-inherit border-r border-[#1b4d40]/50 shadow-sm flex-shrink-0"
                      style={{ width: totalPinnedWidth }}
                    >
                      {/* Checkbox Column */}
                      <div
                        style={{ width: 42, minWidth: 42 }}
                        onClick={e => handleCheckboxClick(e, account, virtualRow.index)}
                        className="h-full flex items-center justify-center border-r border-[#1b4d40]/30 flex-shrink-0"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="w-3.5 h-3.5 rounded bg-[#041611] border-[#1b4d40] text-[#1f8538] focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {/* STT Column */}
                      <div
                        style={{ width: 50, minWidth: 50 }}
                        className="h-full flex items-center justify-center font-mono tabular-nums text-[11px] text-zinc-500 border-r border-[#1b4d40]/30 flex-shrink-0"
                      >
                        {virtualRow.index + 1}
                      </div>

                      {/* UID Column */}
                      <div
                        style={{ width: 155, minWidth: 155 }}
                        className="group/uid h-full px-2.5 flex items-center justify-between font-mono tabular-nums text-zinc-300 font-normal text-xs border-r border-[#1b4d40]/30 truncate gap-1 flex-shrink-0"
                      >
                        <span
                          onClick={e => {
                            e.stopPropagation();
                            onInspectAccount?.(account);
                          }}
                          className="truncate hover:text-[#61c73f] cursor-pointer"
                          title="Click để xem chi tiết & 2FA live"
                        >
                          {account.uid}
                        </span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/uid:opacity-100 flex-shrink-0 transition-opacity">
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onCopyField?.(account.uid, 'UID');
                            }}
                            title="Sao chép UID"
                            className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-[#61c73f] rounded"
                          >
                            <Copy className="w-2.5 h-2.5" />
                          </button>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              onInspectAccount?.(account);
                            }}
                            title="Xem chi tiết & mã 2FA live"
                            className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-[#61c73f] rounded"
                          >
                            <ExternalLink className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      </div>

                      {/* Status Badge Column */}
                      <div
                        style={{ width: 140, minWidth: 140 }}
                        className="h-full px-2 flex items-center border-r border-[#1b4d40]/30 flex-shrink-0"
                      >
                        <div
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium truncate ${badge.badgeClass}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${badge.dotClass}`} />
                          <span className="truncate">{badge.label}</span>
                        </div>
                      </div>
                    </div>

                    {/* Scrollable Columns */}
                    <div className="flex flex-shrink-0" style={{ width: totalScrollableWidth }}>
                      {scrollableColumns.map(col => {
                        const val = (account as any)[col.id];

                        // Status runtime column
                        if (col.id === 'status') {
                          return (
                            <div
                              key={col.id}
                              style={{ width: col.width, minWidth: col.width }}
                              className="h-full px-2.5 flex items-center border-r border-white/[0.04] truncate text-zinc-300 flex-shrink-0 text-xs"
                              title={account.runningStatus || val || ''}
                            >
                              {isRunning ? (
                                <div className="flex items-center gap-1.5 text-sky-400 font-medium truncate">
                                  <Loader2 className="w-3 h-3 animate-spin flex-shrink-0" />
                                  <span className="truncate">{account.runningStatus}</span>
                                </div>
                              ) : (
                                val ? <span className="truncate">{val}</span> : <span className="text-zinc-600 select-none text-[11px]">—</span>
                              )}
                            </div>
                          );
                        }

                        // Monospace technical fields
                        if (['pass', 'fa2', 'cookie', 'token', 'proxy', 'useragent'].includes(col.id)) {
                          return (
                            <div
                              key={col.id}
                              style={{ width: col.width, minWidth: col.width }}
                              className="h-full px-2.5 flex items-center font-mono tabular-nums text-[11px] text-zinc-400 border-r border-white/[0.04] truncate flex-shrink-0"
                              title={String(val || '')}
                            >
                              {val ? truncate(val, 25) : <span className="text-zinc-600 select-none text-[11px]">—</span>}
                            </div>
                          );
                        }

                        return (
                          <div
                            key={col.id}
                            style={{ width: col.width, minWidth: col.width }}
                            className="h-full px-2.5 flex items-center border-r border-white/[0.04] truncate text-zinc-300 flex-shrink-0 text-xs"
                            title={String(val || '')}
                          >
                            {val ? truncate(val, 30) : <span className="text-zinc-600 select-none text-[11px]">—</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
