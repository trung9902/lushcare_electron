import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal,
  Activity,
  Cpu,
  HardDrive,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Search,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  Square,
  Play,
  RotateCw
} from 'lucide-react';
import { LogEntryEvent, ThreadStatusEvent } from '@shared/types';
import { RunningThreadInfo, SystemStats } from '../types';

interface LogPanelProps {
  logs: LogEntryEvent[];
  threads: RunningThreadInfo[];
  systemStats: SystemStats;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onClearLogs: () => void;
  onStopThread?: (threadIndex: number) => void;
}

export const LogPanel: React.FC<LogPanelProps> = ({
  logs,
  threads,
  systemStats,
  isCollapsed,
  onToggleCollapse,
  onClearLogs,
  onStopThread,
}) => {
  const [activeTab, setActiveTab] = useState<'THREADS' | 'LOGS' | 'SYSTEM'>('THREADS');
  const [panelHeight, setPanelHeight] = useState(220);
  const [autoScroll, setAutoScroll] = useState(true);
  const [logFilterQuery, setLogFilterQuery] = useState('');
  const [logLevelFilter, setLogLevelFilter] = useState<string>('ALL');

  const logContainerRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  // Auto-scroll logs to bottom if enabled
  useEffect(() => {
    if (autoScroll && activeTab === 'LOGS' && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, autoScroll, activeTab]);

  // Handle panel resize drag
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    const startY = e.clientY;
    const startHeight = panelHeight;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDraggingRef.current) return;
      const delta = startY - moveEvent.clientY;
      const newHeight = Math.max(120, Math.min(500, startHeight + delta));
      setPanelHeight(newHeight);
    };

    const handleMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleExportLogs = () => {
    const text = logs
      .map(l => `[${l.timestamp}] [${l.level}] ${l.uid ? `[${l.uid}] ` : ''}${l.message}`)
      .join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vmax-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter logs
  const filteredLogs = logs.filter(log => {
    if (logLevelFilter !== 'ALL' && log.level !== logLevelFilter) return false;
    if (logFilterQuery.trim() !== '') {
      const q = logFilterQuery.toLowerCase();
      return (
        log.message.toLowerCase().includes(q) ||
        (log.uid && log.uid.includes(q)) ||
        log.level.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div
      style={{ height: isCollapsed ? 34 : panelHeight }}
      className="bg-[#031410] border-t border-[#1b4d40]/50 flex flex-col select-none transition-[height] duration-75 relative z-20"
    >
      {/* Drag Splitter Handle (only when expanded) */}
      {!isCollapsed && (
        <div
          onMouseDown={handleMouseDown}
          className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize hover:bg-[#61c73f]/50 transition-colors z-30"
          title="Kéo để điều chỉnh chiều cao panel"
        />
      )}

      {/* Panel Header & Tabs */}
      <div className="h-8 bg-[#061813] border-b border-[#1b4d40]/40 flex items-center justify-between px-3 text-xs">
        {/* Left Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTab('THREADS');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`px-2.5 py-1 text-xs font-normal flex items-center gap-1.5 transition-colors ${
              activeTab === 'THREADS' && !isCollapsed
                ? 'text-[#61c73f] font-semibold border-b-2 border-[#61c73f]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                threads.length > 0 ? 'bg-[#61c73f] animate-pulse' : 'bg-zinc-600'
              }`}
            />
            <span>Giám sát luồng ({threads.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('LOGS');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`px-2.5 py-1 text-xs font-normal flex items-center gap-1.5 transition-colors ${
              activeTab === 'LOGS' && !isCollapsed
                ? 'text-[#61c73f] font-semibold border-b-2 border-[#61c73f]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Terminal className="w-3 h-3 text-zinc-500" />
            <span>Nhật ký ({logs.length})</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('SYSTEM');
              if (isCollapsed) onToggleCollapse();
            }}
            className={`px-2.5 py-1 text-xs font-normal flex items-center gap-1.5 transition-colors ${
              activeTab === 'SYSTEM' && !isCollapsed
                ? 'text-[#61c73f] font-semibold border-b-2 border-[#61c73f]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Activity className="w-3 h-3 text-zinc-500" />
            <span>Tài nguyên</span>
          </button>
        </div>

        {/* Right Tools (Active Tab Tools + Collapse Button) */}
        <div className="flex items-center gap-2">
          {activeTab === 'LOGS' && !isCollapsed && (
            <>
              {/* Log Search */}
              <div className="relative">
                <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={logFilterQuery}
                  onChange={e => setLogFilterQuery(e.target.value)}
                  placeholder="Lọc log..."
                  className="w-28 h-6 pl-6 pr-2 bg-[#041611] border border-[#1b4d40]/60 rounded text-[11px] text-zinc-200 focus:outline-none focus:border-[#61c73f]"
                />
              </div>

              {/* Log Level Select */}
              <select
                value={logLevelFilter}
                onChange={e => setLogLevelFilter(e.target.value)}
                className="h-6 px-1.5 bg-[#041611] border border-[#1b4d40]/60 rounded text-[11px] text-zinc-300 focus:outline-none"
              >
                <option value="ALL">Mọi cấp độ</option>
                <option value="INFO">INFO</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="WARN">WARN</option>
                <option value="ERROR">ERROR</option>
              </select>

              {/* Auto Scroll Checkbox */}
              <label className="flex items-center gap-1 text-[11px] text-zinc-400 cursor-pointer hover:text-zinc-200">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={e => setAutoScroll(e.target.checked)}
                  className="w-3 h-3 rounded bg-[#041611] border-[#1b4d40] text-[#1f8538] focus:ring-0"
                />
                <span>Tự cuộn</span>
              </label>

              {/* Clear Logs */}
              <button
                onClick={onClearLogs}
                title="Xóa toàn bộ nhật ký"
                className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-rose-400 rounded transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>

              {/* Export Logs */}
              <button
                onClick={handleExportLogs}
                title="Xuất file nhật ký .txt"
                className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-[#61c73f] rounded transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {/* Toggle Collapse/Expand */}
          <button
            onClick={onToggleCollapse}
            title={isCollapsed ? 'Mở rộng panel' : 'Thu gọn panel'}
            className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-zinc-200 rounded transition-colors ml-1"
          >
            {isCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Panel Body Content (hidden when collapsed) */}
      {!isCollapsed && (
        <div className="flex-1 overflow-hidden bg-[#031410]">
          {/* TAB 1: THREAD MONITOR */}
          {activeTab === 'THREADS' && (
            <div className="h-full overflow-auto text-xs">
              {threads.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-2.5 select-none py-6">
                  <div className="w-9 h-9 rounded-lg bg-[#061813] border border-[#1b4d40]/60 flex items-center justify-center text-[#61c73f] shadow-sm">
                    <Play className="w-4 h-4 text-[#61c73f] fill-[#61c73f]/20 ml-0.5" />
                  </div>
                  <p className="text-xs text-zinc-400 font-normal flex items-center gap-1.5">
                    <span>Chưa có luồng nào đang chạy. Chọn các tài khoản trên bảng và bấm</span>
                    <span className="text-[#61c73f] font-semibold">Bắt đầu</span>
                    <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-[#041611] border border-[#1b4d40] text-[#61c73f] rounded">Ctrl+R</kbd>
                  </p>
                </div>
              ) : (
                <table className="w-full border-collapse text-left">
                  <thead className="bg-[#061813] sticky top-0 border-b border-[#1b4d40]/40 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                    <tr>
                      <th className="py-1.5 px-3 w-16">Luồng</th>
                      <th className="py-1.5 px-3 w-36">UID</th>
                      <th className="py-1.5 px-3 w-36">Tên Facebook</th>
                      <th className="py-1.5 px-3 w-40">Proxy Hiện Tại</th>
                      <th className="py-1.5 px-3">Hành Động Đang Thực Hiện</th>
                      <th className="py-1.5 px-3 w-36">Tiến Độ</th>
                      <th className="py-1.5 px-3 w-20 text-center">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1b4d40]/25 font-mono text-[11px]">
                    {threads.map(thread => (
                      <tr key={thread.threadIndex} className="hover:bg-[#071f19]">
                        <td className="py-1.5 px-3 text-[#61c73f] font-semibold">
                          #{thread.threadIndex.toString().padStart(2, '0')}
                        </td>
                        <td className="py-1.5 px-3 text-zinc-200 font-medium">{thread.uid}</td>
                        <td className="py-1.5 px-3 font-sans text-zinc-300 truncate max-w-[140px]">
                          {thread.name}
                        </td>
                        <td className="py-1.5 px-3 text-zinc-400 truncate max-w-[150px]">
                          {thread.proxy || 'Trực tiếp'}
                        </td>
                        <td className="py-1.5 px-3 font-sans text-zinc-200">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#61c73f] animate-pulse" />
                            <span className="truncate">{thread.action}</span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-[#041611] rounded-full h-1 overflow-hidden">
                              <div
                                style={{ width: `${thread.progressPercent}%` }}
                                className="bg-[#1f8538] h-full rounded-full transition-all duration-300"
                              />
                            </div>
                            <span className="text-[10px] text-zinc-400 w-7 text-right">
                              {thread.progressPercent}%
                            </span>
                          </div>
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <button
                            onClick={() => onStopThread?.(thread.threadIndex)}
                            title="Dừng luồng này"
                            className="p-1 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 rounded transition-colors"
                          >
                            <Square className="w-3 h-3 fill-current" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* TAB 2: LIVE LOGS */}
          {activeTab === 'LOGS' && (
            <div
              ref={logContainerRef}
              className="h-full overflow-auto p-2.5 font-mono text-[11px] leading-relaxed space-y-1 bg-[#031410] text-zinc-300"
            >
              {filteredLogs.length === 0 ? (
                <div className="text-zinc-500">Chưa có bản ghi nhật ký nào...</div>
              ) : (
                filteredLogs.map((log, idx) => {
                  let levelColor = 'text-zinc-400';
                  if (log.level === 'SUCCESS') levelColor = 'text-[#61c73f] font-medium';
                  if (log.level === 'WARN') levelColor = 'text-[#ff7a1a]';
                  if (log.level === 'ERROR') levelColor = 'text-rose-400 font-medium';
                  if (log.level === 'INFO') levelColor = 'text-[#61c73f]';

                  return (
                    <div key={idx} className="flex items-start gap-2 hover:bg-[#071f19] px-1 py-0.5 rounded">
                      <span className="text-zinc-500 flex-shrink-0">[{log.timestamp}]</span>
                      <span className={`w-16 flex-shrink-0 ${levelColor}`}>[{log.level}]</span>
                      {log.uid && (
                        <span className="text-[#61c73f] font-medium flex-shrink-0">
                          [{log.uid}]
                        </span>
                      )}
                      <span className="flex-1 text-zinc-200 break-all">{log.message}</span>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 3: SYSTEM METRICS */}
          {activeTab === 'SYSTEM' && (
            <div className="h-full p-4 grid grid-cols-1 md:grid-cols-4 gap-3 overflow-auto bg-[#031410]">
              <div className="p-3 bg-[#061813] border border-[#1b4d40]/50 rounded">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Sử Dụng CPU</span>
                  <Cpu className="w-3.5 h-3.5 text-[#ff7a1a]" />
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">{systemStats.cpuUsage}%</div>
                <div className="mt-2 w-full bg-[#041611] rounded-full h-1 overflow-hidden">
                  <div
                    style={{ width: `${systemStats.cpuUsage}%` }}
                    className="bg-[#1f8538] h-full rounded-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#061813] border border-[#1b4d40]/50 rounded">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Bộ Nhớ RAM</span>
                  <Activity className="w-3.5 h-3.5 text-[#61c73f]" />
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">
                  {(systemStats.ramUsageMB / 1024).toFixed(1)} GB
                  <span className="text-xs text-zinc-500 font-normal ml-1">
                    / {(systemStats.ramTotalMB / 1024).toFixed(0)} GB
                  </span>
                </div>
                <div className="mt-2 w-full bg-[#041611] rounded-full h-1 overflow-hidden">
                  <div
                    style={{
                      width: `${(systemStats.ramUsageMB / systemStats.ramTotalMB) * 100}%`,
                    }}
                    className="bg-[#1f8538] h-full rounded-full"
                  />
                </div>
              </div>

              <div className="p-3 bg-[#061813] border border-[#1b4d40]/50 rounded">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Dung Lượng Profile SSD</span>
                  <HardDrive className="w-3.5 h-3.5 text-[#61c73f]" />
                </div>
                <div className="text-lg font-bold font-mono text-zinc-100">
                  {systemStats.profileSizeGB} GB
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Lưu trữ cookie, cache và local storage của Chrome.
                </p>
              </div>

              <div className="p-3 bg-[#061813] border border-[#1b4d40]/50 rounded">
                <div className="flex items-center justify-between text-zinc-400 text-xs mb-1">
                  <span>Cổng Proxy Sẵn Sàng</span>
                  <RotateCw className="w-3.5 h-3.5 text-[#61c73f]" />
                </div>
                <div className="text-lg font-bold font-mono text-[#61c73f]">
                  {systemStats.activeProxies}/{systemStats.totalProxies}
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">
                  Nhà cung cấp: {systemStats.proxyProvider}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
