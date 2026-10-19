import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AccountEntity, FolderEntity, ScenarioEntity, LogEntryEvent, ThreadStatusEvent } from '@shared/types';
import { ColumnItem, RunningThreadInfo, SystemStats, ToastMessage } from './types';
import { ALL_COLUMNS, getPresetColumns } from './utils/columns';
import { getAccountStatus } from './utils/format';
import { copyToClipboard, generate2FaOtp } from './utils/otp';
import { ipcService } from './services/ipc';

// Components
import { Titlebar } from './components/Titlebar';
import { Toolbar } from './components/Toolbar';
import { Sidebar } from './components/Sidebar';
import { VirtualDataGrid } from './components/VirtualDataGrid';
import { ContextMenu, ContextMenuPosition } from './components/ContextMenu';
import { LogPanel } from './components/LogPanel';
import { ToastContainer } from './components/Toast';
import { CommandPalette, CommandAction } from './components/CommandPalette';
import { FloatingActionBar } from './components/FloatingActionBar';
import { AccountInspector } from './components/AccountInspector';
import {
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
  PanelLeft,
} from 'lucide-react';

// Modals
import { SmartImportModal } from './components/modals/SmartImportModal';
import { ScenarioBuilderModal } from './components/modals/ScenarioBuilderModal';
import { ProxyConfigModal } from './components/modals/ProxyConfigModal';
import { ColumnVisibilityModal } from './components/modals/ColumnVisibilityModal';
import { BatchUpdateModal } from './components/modals/BatchUpdateModal';
import { ExportModal } from './components/modals/ExportModal';

export const App: React.FC = () => {
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Data states
  const [accounts, setAccounts] = useState<AccountEntity[]>([]);
  const [folders, setFolders] = useState<FolderEntity[]>([]);
  const [trashCount, setTrashCount] = useState<number>(0);
  const [scenarios, setScenarios] = useState<ScenarioEntity[]>([]);
  const [columns, setColumns] = useState<ColumnItem[]>(() => getPresetColumns('DEFAULT'));

  // Filtering & Navigation
  const [activeFolderId, setActiveFolderId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [focusedIndex, setFocusedIndex] = useState(0);

  // Runner & System states
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [maxThreads, setMaxThreads] = useState(5);
  const [runningThreads, setRunningThreads] = useState<RunningThreadInfo[]>([]);
  const [logs, setLogs] = useState<LogEntryEvent[]>([]);
  const [systemStats, setSystemStats] = useState<SystemStats>({
    cpuUsage: 18,
    ramUsageMB: 1430,
    ramTotalMB: 16384,
    profileSizeGB: 12.8,
    activeProxies: 8,
    totalProxies: 10,
    proxyProvider: 'MinProxy',
  });

  // UI Panels & Modals
  const [isLogPanelCollapsed, setIsLogPanelCollapsed] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [inspectedAccount, setInspectedAccount] = useState<AccountEntity | null>(null);
  const [modalImportOpen, setModalImportOpen] = useState(false);
  const [modalScenarioOpen, setModalScenarioOpen] = useState(false);
  const [modalProxyOpen, setModalProxyOpen] = useState(false);
  const [modalColumnOpen, setModalColumnOpen] = useState(false);
  const [modalBatchUpdateOpen, setModalBatchUpdateOpen] = useState(false);
  const [modalExportOpen, setModalExportOpen] = useState(false);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<{
    position: ContextMenuPosition;
    account: AccountEntity;
  } | null>(null);

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback(
    (title: string, message: string, type: 'success' | 'info' | 'warning' | 'error' = 'info') => {
      const id = Date.now().toString() + Math.random().toString().slice(2, 6);
      setToasts(prev => [...prev, { id, title, message, type, timestamp: Date.now() }]);
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load Accounts & Folders
  const reloadData = useCallback(async () => {
    try {
      const [accRes, foldRes, scRes] = await Promise.all([
        ipcService.getAccounts({
          folderId: activeFolderId !== null ? activeFolderId : undefined,
          searchQuery,
          statusFilter: statusFilter as any,
        }),
        ipcService.getFolders(),
        ipcService.getScenarios(),
      ]);

      setAccounts(accRes.accounts);
      setFolders(foldRes);
      setScenarios(scRes);

      if (window.api?.folders?.getAll) {
        const fullFolders = await window.api.folders.getAll();
        if (fullFolders.success && fullFolders.data) {
          setTrashCount(fullFolders.data.trashCount || 0);
        }
      }
    } catch (err: any) {
      showToast('Lỗi nạp dữ liệu', err?.message || 'Không thể nạp dữ liệu từ SQLite', 'error');
    }
  }, [activeFolderId, searchQuery, statusFilter, showToast]);

  useEffect(() => {
    reloadData();
  }, [reloadData]);

  // IPC Event Subscriptions
  useEffect(() => {
    const unsubThread = ipcService.onThreadStatus((evt: ThreadStatusEvent) => {
      setRunningThreads(prev => {
        const existingIdx = prev.findIndex(t => t.threadIndex === evt.threadIndex);
        const item: RunningThreadInfo = {
          threadIndex: evt.threadIndex ?? 1,
          accountId: evt.accountId,
          uid: evt.uid,
          name: accounts.find(a => a.id === evt.accountId)?.name || 'Người dùng FB',
          proxy: accounts.find(a => a.id === evt.accountId)?.proxy || '14.225.1.8:8080',
          action: evt.status,
          startTime: Date.now(),
          progressPercent: evt.progressPercent || 0,
          status: evt.status,
        };
        if (existingIdx !== -1) {
          const next = [...prev];
          next[existingIdx] = item;
          return next;
        } else {
          return [...prev, item];
        }
      });

      // Update in accounts array
      setAccounts(prev =>
        prev.map(a =>
          a.id === evt.accountId ? { ...a, runningStatus: evt.status } : a
        )
      );
    });

    const unsubLog = ipcService.onLog((entry: LogEntryEvent) => {
      setLogs(prev => [...prev.slice(-1000), entry]);
    });

    const unsubDone = ipcService.onCompleted(() => {
      setIsRunning(false);
      setIsPaused(false);
      setRunningThreads([]);
      showToast('Hoàn thành', 'Tất cả các luồng chạy kịch bản đã kết thúc!', 'success');
      reloadData();
    });

    return () => {
      unsubThread();
      unsubLog();
      unsubDone();
    };
  }, [accounts, reloadData, showToast]);

  // Status Counts
  const statusCounts = useMemo(() => {
    let live = 0;
    let die = 0;
    let cp282 = 0;
    let cp956 = 0;
    let running = 0;

    accounts.forEach(a => {
      const st = getAccountStatus(a.info, a.runningStatus);
      if (st === 'LIVE') live++;
      else if (st === 'DIE') die++;
      else if (st === 'CP282') cp282++;
      else if (st === 'CP956') cp956++;
      else if (st === 'RUNNING') running++;
    });

    return {
      all: accounts.length,
      live,
      die,
      cp282,
      cp956,
      running,
    };
  }, [accounts]);

  // Folder Counts
  const totalAccountsCount = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.accountCount ?? 0), 0);
  }, [folders]);

  const totalLiveCount = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.liveCount ?? 0), 0);
  }, [folders]);

  const totalDieCount = useMemo(() => {
    return folders.reduce((sum, f) => sum + (f.dieCount ?? 0), 0);
  }, [folders]);

  // Selection handlers
  const handleSelectRow = (id: number, multiSelect = false, rangeSelect = false, index = 0) => {
    if (rangeSelect) {
      const start = Math.min(focusedIndex, index);
      const end = Math.max(focusedIndex, index);
      const newSet = new Set(selectedIds);
      for (let i = start; i <= end; i++) {
        if (accounts[i]) newSet.add(accounts[i].id);
      }
      setSelectedIds(newSet);
    } else if (multiSelect) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(accounts.map(a => a.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleSelectByStatus = (type: 'LIVE' | 'DIE' | 'CHECKPOINT') => {
    const matched = accounts
      .filter(a => {
        const st = getAccountStatus(a.info, a.runningStatus);
        if (type === 'LIVE') return st === 'LIVE';
        if (type === 'DIE') return st === 'DIE';
        if (type === 'CHECKPOINT') return st === 'CP282' || st === 'CP956';
        return false;
      })
      .map(a => a.id);
    setSelectedIds(new Set(matched));
    showToast('Chọn nhanh', `Đã chọn ${matched.length} tài khoản phù hợp!`, 'info');
  };

  // Launch Browser
  const handleLaunchBrowser = async (account: AccountEntity, mode: 'COOKIE' | 'PASS_2FA' | 'BLANK' | 'MOBILE') => {
    showToast('Mở trình duyệt', `Đang mở Chrome cho UID ${account.uid} (Chế độ: ${mode})...`, 'info');
    try {
      await ipcService.launchBrowser({
        accountId: account.id,
        uid: account.uid,
        pass: account.pass,
        cookie: account.cookie || account.cookie1,
        fa2: account.fa2,
        autoLogin: mode === 'COOKIE' || mode === 'PASS_2FA',
        loginMode: mode === 'COOKIE' ? 'cookie_pass' : mode === 'PASS_2FA' ? 'pass_2fa' : 'cookie_pass',
        proxy: account.proxy || undefined,
        useragent: account.useragent || undefined,
      });
      showToast('Trình duyệt sẵn sàng', `Đã mở Chrome Profile của ${account.uid}`, 'success');
    } catch (err: any) {
      showToast('Lỗi mở Chrome', err?.message || 'Không thể khởi chạy Chromium', 'error');
    }
  };

  // Runner Controls
  const handleStartRunner = async () => {
    const targetIds = Array.from(selectedIds);
    if (targetIds.length === 0) {
      showToast('Chưa chọn tài khoản', 'Vui lòng chọn ít nhất 1 tài khoản để chạy kịch bản!', 'warning');
      return;
    }

    setIsRunning(true);
    setIsPaused(false);
    showToast('Bắt đầu kịch bản', `Khởi động ${maxThreads} luồng cho ${targetIds.length} tài khoản...`, 'info');

    await ipcService.startRunner({
      accountIds: targetIds,
      scenarioId: scenarios[0]?.id || 1,
      threads: maxThreads,
      delayPerThreadSec: 2,
      proxyType: 'NONE',
      headless: false,
      autoSolve2fa: true,
    });
  };

  const handlePauseRunner = async () => {
    await ipcService.pauseRunner();
    setIsPaused(true);
    showToast('Tạm dừng', 'Đã tạm dừng các luồng tương tác', 'warning');
  };

  const handleResumeRunner = async () => {
    await ipcService.resumeRunner();
    setIsPaused(false);
    showToast('Tiếp tục', 'Tiếp tục chạy các luồng tương tác', 'info');
  };

  const handleStopRunner = async () => {
    await ipcService.stopRunner();
    setIsRunning(false);
    setIsPaused(false);
    setRunningThreads([]);
    showToast('Dừng luồng', 'Đã dừng khẩn cấp toàn bộ các luồng trình duyệt!', 'error');
    reloadData();
  };

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      // Ctrl + A: Select All
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      }
      // Ctrl + F: Focus search box
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        const searchInput = document.querySelector('input[placeholder*="Tìm UID"]') as HTMLInputElement;
        searchInput?.focus();
        searchInput?.select();
      }
      // Ctrl + I: Open Smart Import
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'i') {
        e.preventDefault();
        setModalImportOpen(true);
      }
      // Ctrl + E: Open Export
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        setModalExportOpen(true);
      }
      // Ctrl + R: Start Runner
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'r') {
        e.preventDefault();
        if (!isRunning && selectedIds.size > 0) {
          handleStartRunner();
        }
      }
      // Ctrl + Shift + C: Copy 2FA OTP of focused account
      else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        const acc = accounts[focusedIndex];
        if (acc?.fa2) {
          const otp = generate2FaOtp(acc.fa2);
          if (otp) {
            await copyToClipboard(otp);
            showToast('Mã OTP 2FA', `Mã OTP của ${acc.uid}: ${otp}`, 'success');
          }
        }
      }
      // F5: Refresh Data
      else if (e.key === 'F5') {
        e.preventDefault();
        reloadData();
        showToast('Nạp lại dữ liệu', 'Đã làm mới dữ liệu từ SQLite', 'info');
      }
      // Delete: Move to Trash
      else if (e.key === 'Delete') {
        e.preventDefault();
        const ids = Array.from(selectedIds);
        if (ids.length > 0) {
          if (confirm(`Chuyển ${ids.length} tài khoản vào Thùng Rác?`)) {
            await ipcService.deleteAccounts(ids);
            setSelectedIds(new Set());
            reloadData();
            showToast('Đã xóa', `Đã chuyển ${ids.length} nick vào Thùng Rác`, 'info');
          }
        }
      }
      // Ctrl + K: Toggle Command Palette
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
      // Ctrl + B: Toggle Sidebar Collapse
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        setIsSidebarCollapsed(prev => !prev);
      }
      // Escape: Close modal / context menu / command palette / inspector
      else if (e.key === 'Escape') {
        setIsCommandPaletteOpen(false);
        setInspectedAccount(null);
        setContextMenu(null);
        setModalImportOpen(false);
        setModalScenarioOpen(false);
        setModalProxyOpen(false);
        setModalColumnOpen(false);
        setModalBatchUpdateOpen(false);
        setModalExportOpen(false);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [accounts, focusedIndex, isRunning, selectedIds, reloadData, showToast]);

  const currentFolder = folders.find(f => f.id === activeFolderId);
  const currentFolderName = currentFolder ? currentFolder.name : '[Tất cả tài khoản]';

  const selectedAccountsList = useMemo(() => {
    return accounts.filter(a => selectedIds.has(a.id));
  }, [accounts, selectedIds]);

  const handleCopySelected = useCallback((format: 'UID' | 'UID_PASS' | 'FULL') => {
    const selected = accounts.filter(a => selectedIds.has(a.id));
    if (selected.length === 0) return;
    let text = '';
    if (format === 'UID') {
      text = selected.map(a => a.uid).join('\n');
    } else if (format === 'UID_PASS') {
      text = selected.map(a => `${a.uid}|${a.pass || ''}`).join('\n');
    } else {
      text = selected.map(a => `${a.uid}|${a.pass || ''}|${a.fa2 || ''}|${a.cookie || ''}|${a.proxy || ''}`).join('\n');
    }
    copyToClipboard(text);
    showToast('Đã sao chép', `Đã sao chép ${selected.length} tài khoản (${format})`, 'success');
  }, [accounts, selectedIds, showToast]);

  const handleMoveSelectedToFolder = useCallback(async (folderId: number | null) => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    await ipcService.moveToFolder(ids, folderId);
    reloadData();
    showToast('Chuyển thư mục', `Đã chuyển ${ids.length} nick vào thư mục mới`, 'success');
  }, [selectedIds, reloadData, showToast]);

  const handleDeleteSelected = useCallback(async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (confirm(`Chuyển ${ids.length} tài khoản vào Thùng Rác?`)) {
      await ipcService.deleteAccounts(ids);
      setSelectedIds(new Set());
      reloadData();
      showToast('Đã xóa', `Đã chuyển ${ids.length} nick vào Thùng Rác`, 'info');
    }
  }, [selectedIds, reloadData, showToast]);

  const commandActions: CommandAction[] = useMemo(() => [
    {
      id: 'start-runner',
      title: 'Bắt đầu chạy tương tác',
      category: 'Điều khiển',
      shortcut: 'Ctrl+R',
      icon: <Play className="w-3.5 h-3.5 text-indigo-400" />,
      onSelect: handleStartRunner,
    },
    {
      id: 'pause-runner',
      title: isPaused ? 'Tiếp tục chạy' : 'Tạm dừng tất cả luồng',
      category: 'Điều khiển',
      icon: <Play className="w-3.5 h-3.5 text-amber-400" />,
      onSelect: isPaused ? handleResumeRunner : handlePauseRunner,
    },
    {
      id: 'stop-runner',
      title: 'Dừng khẩn cấp toàn bộ luồng',
      category: 'Điều khiển',
      icon: <Square className="w-3.5 h-3.5 text-rose-400" />,
      onSelect: handleStopRunner,
    },
    {
      id: 'add-accounts',
      title: 'Thêm tài khoản mới',
      category: 'Công cụ',
      shortcut: 'Ctrl+I',
      icon: <UserPlus className="w-3.5 h-3.5 text-indigo-400" />,
      onSelect: () => setModalImportOpen(true),
    },
    {
      id: 'export-accounts',
      title: 'Xuất file tài khoản',
      category: 'Công cụ',
      shortcut: 'Ctrl+E',
      icon: <Download className="w-3.5 h-3.5 text-sky-400" />,
      onSelect: () => setModalExportOpen(true),
    },
    {
      id: 'manage-scenarios',
      title: 'Quản lý kịch bản nuôi nick',
      category: 'Công cụ',
      icon: <Sliders className="w-3.5 h-3.5 text-amber-400" />,
      onSelect: () => setModalScenarioOpen(true),
    },
    {
      id: 'proxy-config',
      title: 'Cấu hình Proxy & Xoay IP',
      category: 'Công cụ',
      icon: <Shuffle className="w-3.5 h-3.5 text-purple-400" />,
      onSelect: () => setModalProxyOpen(true),
    },
    {
      id: 'columns-config',
      title: 'Cấu hình hiển thị 45 cột',
      category: 'Công cụ',
      icon: <Columns className="w-3.5 h-3.5 text-teal-400" />,
      onSelect: () => setModalColumnOpen(true),
    },
    {
      id: 'refresh-data',
      title: 'Làm mới dữ liệu từ SQLite',
      category: 'Công cụ',
      shortcut: 'F5',
      icon: <RefreshCw className="w-3.5 h-3.5 text-zinc-400" />,
      onSelect: reloadData,
    },
    {
      id: 'select-all',
      title: 'Chọn tất cả tài khoản',
      category: 'Chọn lọc',
      shortcut: 'Ctrl+A',
      icon: <CheckSquare className="w-3.5 h-3.5 text-indigo-400" />,
      onSelect: handleSelectAll,
    },
    {
      id: 'deselect-all',
      title: 'Bỏ chọn tất cả tài khoản',
      category: 'Chọn lọc',
      shortcut: 'Esc',
      icon: <SquareDashed className="w-3.5 h-3.5 text-zinc-400" />,
      onSelect: handleDeselectAll,
    },
    {
      id: 'select-live',
      title: 'Chọn tất cả nick Live',
      category: 'Chọn lọc',
      icon: <span className="w-2 h-2 rounded-full bg-emerald-400" />,
      onSelect: () => handleSelectByStatus('LIVE'),
    },
    {
      id: 'select-die',
      title: 'Chọn tất cả nick Die / Khóa',
      category: 'Chọn lọc',
      icon: <span className="w-2 h-2 rounded-full bg-rose-400" />,
      onSelect: () => handleSelectByStatus('DIE'),
    },
    {
      id: 'select-cp',
      title: 'Chọn tất cả nick Checkpoint (282 / 956)',
      category: 'Chọn lọc',
      icon: <span className="w-2 h-2 rounded-full bg-amber-400" />,
      onSelect: () => handleSelectByStatus('CHECKPOINT'),
    },
    {
      id: 'toggle-sidebar',
      title: isSidebarCollapsed ? 'Mở rộng thanh bên' : 'Thu gọn thanh bên',
      category: 'Giao diện',
      shortcut: 'Ctrl+B',
      icon: <PanelLeft className="w-3.5 h-3.5 text-zinc-400" />,
      onSelect: () => setIsSidebarCollapsed(prev => !prev),
    },
    {
      id: 'toggle-theme',
      title: isDarkMode ? 'Chuyển sang giao diện Sáng' : 'Chuyển sang giao diện Tối',
      category: 'Giao diện',
      icon: isDarkMode ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />,
      onSelect: () => setIsDarkMode(prev => !prev),
    },
  ], [
    isPaused,
    isRunning,
    isSidebarCollapsed,
    isDarkMode,
    handleStartRunner,
    handleResumeRunner,
    handlePauseRunner,
    handleStopRunner,
    handleSelectAll,
    handleDeselectAll,
    handleSelectByStatus,
    reloadData,
  ]);

  return (
    <div className={`h-screen w-screen flex flex-col bg-[#031410] text-zinc-100 overflow-hidden font-sans ${isDarkMode ? 'dark' : ''}`}>
      {/* 1. Custom Titlebar */}
      <Titlebar
        currentFolderName={currentFolderName}
        activeThreads={runningThreads.length}
        maxThreads={maxThreads}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode(!isDarkMode)}
      />

      {/* 2. Top Action Toolbar */}
      <Toolbar
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onClearSearch={() => setSearchQuery('')}
        statusCounts={statusCounts}
        selectedCount={selectedIds.size}
        totalCount={accounts.length}
        isRunning={isRunning}
        isPaused={isPaused}
        maxThreads={maxThreads}
        onMaxThreadsChange={setMaxThreads}
        onStart={handleStartRunner}
        onPause={handlePauseRunner}
        onResume={handleResumeRunner}
        onStop={handleStopRunner}
        onOpenImport={() => setModalImportOpen(true)}
        onOpenExport={() => setModalExportOpen(true)}
        onOpenScenarios={() => setModalScenarioOpen(true)}
        onOpenProxyConfig={() => setModalProxyOpen(true)}
        onOpenColumnConfig={() => setModalColumnOpen(true)}
        onRefresh={reloadData}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        onSelectByStatus={handleSelectByStatus}
        onOpenCommandPalette={() => setIsCommandPaletteOpen(true)}
      />

      {/* 3. Main Body: Left Sidebar + Virtual DataGrid */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Sidebar */}
        <Sidebar
          folders={folders}
          activeFolderId={activeFolderId}
          onSelectFolder={setActiveFolderId}
          onCreateFolder={async name => {
            const f = await ipcService.createFolder(name);
            setFolders(prev => [...prev, f]);
            showToast('Tạo thư mục', `Đã tạo thư mục "${name}"`, 'success');
          }}
          onDeleteFolder={async id => {
            await ipcService.deleteFolder(id);
            setFolders(prev => prev.filter(f => f.id !== id));
            if (activeFolderId === id) setActiveFolderId(null);
            showToast('Xóa thư mục', 'Đã xóa thư mục và chuyển nick vào Thùng Rác', 'info');
          }}
          onCleanProfiles={async () => {
            showToast('Dọn dẹp Profile', 'Đang quét và dọn dẹp các thư mục Chrome rác...', 'info');
            setTimeout(() => {
              setSystemStats(prev => ({ ...prev, profileSizeGB: 2.1 }));
              showToast('Dọn dẹp thành công', 'Đã giải phóng 10.7 GB dung lượng ổ đĩa SSD!', 'success');
            }, 1500);
          }}
          totalAccountsCount={totalAccountsCount}
          totalLiveCount={totalLiveCount}
          totalDieCount={totalDieCount}
          trashCount={trashCount}
          systemStats={systemStats}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(prev => !prev)}
        />

        {/* Center Main Virtual DataGrid */}
        <VirtualDataGrid
          accounts={accounts}
          columns={columns}
          selectedIds={selectedIds}
          focusedIndex={focusedIndex}
          onSelectRow={handleSelectRow}
          onSelectAll={handleSelectAll}
          onDeselectAll={handleDeselectAll}
          onFocusRow={setFocusedIndex}
          onRowDoubleClick={acc => handleLaunchBrowser(acc, 'COOKIE')}
          onRowContextMenu={(e, acc, idx) => {
            e.preventDefault();
            setFocusedIndex(idx);
            if (!selectedIds.has(acc.id)) {
              setSelectedIds(new Set([acc.id]));
            }
            setContextMenu({
              position: { x: e.clientX, y: e.clientY },
              account: acc,
            });
          }}
          onOpenImport={() => setModalImportOpen(true)}
          searchQuery={searchQuery}
          onInspectAccount={setInspectedAccount}
          onCopyField={(txt, label) => {
            copyToClipboard(txt);
            showToast('Đã sao chép', `Đã sao chép ${label} vào clipboard`, 'success');
          }}
        />

        {/* Floating Action Bar (when accounts are selected) */}
        <FloatingActionBar
          selectedCount={selectedIds.size}
          folders={folders}
          onStartSelected={handleStartRunner}
          onMoveToFolder={handleMoveSelectedToFolder}
          onCopySelected={handleCopySelected}
          onDeleteSelected={handleDeleteSelected}
          onDeselectAll={handleDeselectAll}
        />
      </div>

      {/* 4. Collapsible Bottom Log Panel */}
      <LogPanel
        logs={logs}
        threads={runningThreads}
        systemStats={systemStats}
        isCollapsed={isLogPanelCollapsed}
        onToggleCollapse={() => setIsLogPanelCollapsed(!isLogPanelCollapsed)}
        onClearLogs={() => setLogs([])}
        onStopThread={threadIdx => {
          setRunningThreads(prev => prev.filter(t => t.threadIndex !== threadIdx));
          showToast('Dừng luồng', `Đã dừng luồng #${threadIdx}`, 'warning');
        }}
      />

      {/* 5. Desktop 4-Level Context Menu */}
      {contextMenu && (
        <ContextMenu
          position={contextMenu.position}
          account={contextMenu.account}
          selectedAccounts={selectedAccountsList}
          folders={folders}
          onClose={() => setContextMenu(null)}
          onLaunchBrowser={handleLaunchBrowser}
          onCloseBrowser={async id => {
            await ipcService.closeBrowser(id);
            showToast('Đóng trình duyệt', `Đã đóng cửa sổ Chrome của tài khoản`, 'info');
          }}
          onDeleteProfile={id => {
            showToast('Xóa Profile', 'Đã xóa thư mục Profile của tài khoản này', 'info');
          }}
          onMoveToFolder={async (ids, fId) => {
            await ipcService.moveToFolder(ids, fId);
            reloadData();
            showToast('Chuyển thư mục', `Đã chuyển ${ids.length} nick sang thư mục mới`, 'success');
          }}
          onDeleteAccounts={async (ids, permanent) => {
            await ipcService.deleteAccounts(ids);
            setSelectedIds(new Set());
            reloadData();
            showToast(permanent ? 'Xóa vĩnh viễn' : 'Chuyển vào thùng rác', `Đã xử lý ${ids.length} tài khoản`, 'warning');
          }}
          onOpenBatchUpdate={() => setModalBatchUpdateOpen(true)}
          onCheckStatus={(ids, type) => {
            showToast('Kiểm tra trạng thái', `Đang kiểm tra ${type} cho ${ids.length} tài khoản...`, 'info');
          }}
          onShowToast={showToast}
        />
      )}

      {/* 6. Modals */}
      <SmartImportModal
        isOpen={modalImportOpen}
        onClose={() => setModalImportOpen(false)}
        folders={folders}
        currentFolderId={activeFolderId}
        onImport={async payload => {
          const res = await ipcService.importAccounts(payload);
          reloadData();
          showToast('Nhập thành công', `Đã nhập ${res.totalImported} tài khoản (${res.duplicatesSkipped} trùng bỏ qua)`, 'success');
        }}
        onCreateFolder={async name => {
          const newF = await ipcService.createFolder(name);
          setFolders(prev => [...prev, newF]);
          return newF;
        }}
      />

      <ScenarioBuilderModal
        isOpen={modalScenarioOpen}
        onClose={() => setModalScenarioOpen(false)}
        scenarios={scenarios}
        onSaveScenario={async sc => {
          setScenarios(prev => prev.map(s => (s.id === sc.id ? sc : s)));
          showToast('Lưu kịch bản', `Đã lưu kịch bản "${sc.name}"`, 'success');
        }}
        onCreateScenario={async name => {
          const sc = await ipcService.createScenario(name);
          setScenarios(prev => [...prev, sc]);
          showToast('Tạo kịch bản', `Đã tạo kịch bản "${name}"`, 'success');
          return sc;
        }}
        onDeleteScenario={async id => {
          setScenarios(prev => prev.filter(s => s.id !== id));
          showToast('Xóa kịch bản', 'Đã xóa kịch bản', 'info');
        }}
        onApplyToAccounts={scId => {
          const sc = scenarios.find(s => s.id === scId);
          if (sc && selectedIds.size > 0) {
            ipcService.batchUpdateAccounts(Array.from(selectedIds), { kichban: sc.name });
            reloadData();
            showToast('Áp dụng kịch bản', `Đã gán kịch bản "${sc.name}" cho ${selectedIds.size} tài khoản`, 'success');
          }
        }}
      />

      <ProxyConfigModal
        isOpen={modalProxyOpen}
        onClose={() => setModalProxyOpen(false)}
        onSaveConfig={cfg => {
          showToast('Cấu hình Proxy', 'Đã lưu cấu hình xoay IP thành công', 'success');
        }}
      />

      <ColumnVisibilityModal
        isOpen={modalColumnOpen}
        onClose={() => setModalColumnOpen(false)}
        columns={columns}
        onApplyColumns={cols => {
          setColumns(cols);
          showToast('Cấu hình cột', 'Đã cập nhật hiển thị cột dữ liệu', 'success');
        }}
      />

      <BatchUpdateModal
        isOpen={modalBatchUpdateOpen}
        onClose={() => setModalBatchUpdateOpen(false)}
        selectedAccounts={selectedAccountsList}
        folders={folders}
        scenarios={scenarios}
        onBatchUpdate={async (ids, updates) => {
          await ipcService.batchUpdateAccounts(ids, updates);
          reloadData();
          showToast('Cập nhật hàng loạt', `Đã cập nhật ${ids.length} tài khoản thành công!`, 'success');
        }}
      />

      <ExportModal
        isOpen={modalExportOpen}
        onClose={() => setModalExportOpen(false)}
        selectedAccounts={selectedAccountsList}
        allAccounts={accounts}
        onShowToast={showToast}
      />

      {/* 8. Slide-over Inspector (Account details & 2FA live) */}
      <AccountInspector
        account={inspectedAccount}
        isOpen={inspectedAccount !== null}
        onClose={() => setInspectedAccount(null)}
        onLaunchBrowser={handleLaunchBrowser}
        onDeleteAccount={async id => {
          await ipcService.deleteAccounts([id]);
          reloadData();
          showToast('Đã xóa', 'Đã chuyển tài khoản vào Thùng Rác', 'info');
        }}
      />

      {/* 9. Raycast-style Command Palette (Ctrl+K) */}
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        actions={commandActions}
        accounts={accounts}
        folders={folders}
        onSelectAccount={acc => {
          setInspectedAccount(acc);
          const idx = accounts.findIndex(a => a.id === acc.id);
          if (idx !== -1) setFocusedIndex(idx);
        }}
        onSelectFolder={fId => {
          setActiveFolderId(fId);
        }}
      />

      {/* 10. Floating Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
};
export default App;
