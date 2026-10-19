import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Copy,
  FolderInput,
  ShieldCheck,
  Edit3,
  Trash2,
  AlertOctagon,
  KeyRound,
  ChevronRight,
  ExternalLink,
  Smartphone,
  Lock,
  RefreshCw,
  XCircle,
  FileText
} from 'lucide-react';
import { AccountEntity, FolderEntity } from '@shared/types';
import { copyToClipboard, generate2FaOtp } from '../utils/otp';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  account: AccountEntity;
  selectedAccounts: AccountEntity[];
  folders: FolderEntity[];
  onClose: () => void;
  onLaunchBrowser: (account: AccountEntity, mode: 'COOKIE' | 'PASS_2FA' | 'BLANK' | 'MOBILE') => void;
  onCloseBrowser: (accountId: number) => void;
  onDeleteProfile: (accountId: number) => void;
  onMoveToFolder: (accountIds: number[], folderId: number) => void;
  onDeleteAccounts: (accountIds: number[], permanent: boolean) => void;
  onOpenBatchUpdate: () => void;
  onCheckStatus: (accountIds: number[], type: 'UID' | 'COOKIE' | 'TOKEN' | 'PROXY') => void;
  onShowToast: (title: string, message: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  position,
  account,
  selectedAccounts,
  folders,
  onClose,
  onLaunchBrowser,
  onCloseBrowser,
  onDeleteProfile,
  onMoveToFolder,
  onDeleteAccounts,
  onOpenBatchUpdate,
  onCheckStatus,
  onShowToast,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const [activeFormatSubmenu, setActiveFormatSubmenu] = useState(false);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Adjust menu position if overflowing window edges
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1200;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 800;

  const menuWidth = 240;
  const menuHeight = 320;

  let posX = position.x;
  let posY = position.y;

  if (posX + menuWidth > windowWidth) {
    posX = Math.max(10, windowWidth - menuWidth - 10);
  }
  if (posY + menuHeight > windowHeight) {
    posY = Math.max(10, windowHeight - menuHeight - 10);
  }

  const targetAccounts = selectedAccounts.length > 0 ? selectedAccounts : [account];
  const targetIds = targetAccounts.map(a => a.id);

  const handleCopy = async (text: string, label: string) => {
    const success = await copyToClipboard(text);
    if (success) {
      onShowToast('Đã sao chép', `Đã sao chép ${label} vào Clipboard!`, 'success');
    }
    onClose();
  };

  const handleCopy2FaOtp = async () => {
    if (!account.fa2) {
      onShowToast('Lỗi 2FA', 'Tài khoản chưa có mã Secret Key 2FA!', 'warning');
      onClose();
      return;
    }
    const otp = generate2FaOtp(account.fa2);
    if (otp && otp !== 'ERR_KEY') {
      await copyToClipboard(otp);
      onShowToast('Mã OTP 2FA', `Mã OTP: ${otp} (Đã chép vào bộ nhớ tạm)`, 'success');
    } else {
      onShowToast('Lỗi 2FA', 'Secret Key không hợp lệ hoặc lỗi định dạng Base32', 'error');
    }
    onClose();
  };

  const handleCopyFormatted = async (format: string) => {
    const lines = targetAccounts.map(acc => {
      switch (format) {
        case 'UID_PASS':
          return `${acc.uid}|${acc.pass || ''}`;
        case 'UID_PASS_2FA':
          return `${acc.uid}|${acc.pass || ''}|${acc.fa2 || ''}`;
        case 'UID_PASS_TOKEN_COOKIE':
          return `${acc.uid}|${acc.pass || ''}|${acc.token || ''}|${acc.cookie || ''}`;
        case 'FULL':
          return `${acc.uid}|${acc.pass || ''}|${acc.token || ''}|${acc.cookie || ''}|${acc.email || ''}|${acc.passmail || ''}|${acc.fa2 || ''}`;
        default:
          return acc.uid;
      }
    });

    await copyToClipboard(lines.join('\n'));
    onShowToast('Đã sao chép', `Đã ghép và sao chép ${lines.length} tài khoản!`, 'success');
    onClose();
  };

  return (
    <div
      ref={menuRef}
      style={{ left: posX, top: posY }}
      className="fixed z-50 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-xs text-slate-200 select-none animate-scale-in"
    >
      {/* 1. Mở Trình Duyệt */}
      <div
        onMouseEnter={() => setActiveSubmenu('BROWSER')}
        className="relative group px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Globe className="w-3.5 h-3.5 text-indigo-400 group-hover:text-white" />
          <span>Mở Trình Duyệt Chrome</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />

        {activeSubmenu === 'BROWSER' && (
          <div className="absolute left-full top-0 ml-1 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50">
            <div
              onClick={() => {
                onLaunchBrowser(account, 'COOKIE');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              1. Mở kèm Cookie (Đăng nhập tự động)
            </div>
            <div
              onClick={() => {
                onLaunchBrowser(account, 'PASS_2FA');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              2. Mở tự động Uid|Pass + Vượt 2FA
            </div>
            <div
              onClick={() => {
                onLaunchBrowser(account, 'BLANK');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              3. Mở Profile Trắng (Không session)
            </div>
            <div
              onClick={() => {
                onLaunchBrowser(account, 'MOBILE');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              4. Mở trên giao diện Mobile (m.fb)
            </div>
            <div className="h-[1px] bg-slate-800 my-1 mx-2" />
            <div
              onClick={() => {
                onCloseBrowser(account.id);
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-rose-600 hover:text-white cursor-pointer rounded-md mx-1 text-rose-300"
            >
              5. Đóng trình duyệt của nick này
            </div>
            <div
              onClick={() => {
                onDeleteProfile(account.id);
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-rose-600 hover:text-white cursor-pointer rounded-md mx-1 text-rose-300"
            >
              6. Xóa Thư Mục Profile của nick này
            </div>
          </div>
        )}
      </div>

      {/* 2. Sao Chép Dữ Liệu */}
      <div
        onMouseEnter={() => setActiveSubmenu('COPY')}
        className="relative group px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Copy className="w-3.5 h-3.5 text-sky-400 group-hover:text-white" />
          <span>Sao Chép Dữ Liệu</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />

        {activeSubmenu === 'COPY' && (
          <div className="absolute left-full top-0 ml-1 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50">
            <div
              onClick={() => handleCopy(account.uid, 'UID')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1"
            >
              <span>UID</span>
              <span className="font-mono text-slate-400 group-hover:text-white text-[10px]">Ctrl+C</span>
            </div>
            <div
              onClick={() => handleCopy(account.pass || '', 'Mật khẩu')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Mật khẩu (Password)
            </div>
            <div
              onClick={() => handleCopy(account.fa2 || '', 'Mã 2FA Secret')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Mã bảo mật 2FA Secret Key
            </div>
            <div
              onClick={handleCopy2FaOtp}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 text-amber-300 font-semibold"
            >
              <div className="flex items-center gap-1.5">
                <KeyRound className="w-3 h-3" />
                <span>MÃ 2FA OTP 6 SỐ</span>
              </div>
              <span className="font-mono text-[10px]">Ctrl+Shift+C</span>
            </div>
            <div
              onClick={() => handleCopy(account.cookie || '', 'Cookie')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Toàn bộ Cookie Facebook
            </div>
            <div
              onClick={() => handleCopy(account.token || '', 'Token')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Access Token
            </div>
            <div
              onClick={() => handleCopy(`${account.email || ''}|${account.passmail || ''}`, 'Email|PassMail')}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Email | Pass Email
            </div>

            <div className="h-[1px] bg-slate-800 my-1 mx-2" />

            {/* Sub-submenu: Ghép định dạng */}
            <div
              onMouseEnter={() => setActiveFormatSubmenu(true)}
              onMouseLeave={() => setActiveFormatSubmenu(false)}
              className="relative px-3 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1"
            >
              <span>Ghép Định Dạng Tùy Biến</span>
              <ChevronRight className="w-3 h-3" />

              {activeFormatSubmenu && (
                <div className="absolute left-full top-0 ml-1 w-52 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl py-1 text-slate-200">
                  <div
                    onClick={() => handleCopyFormatted('UID_PASS')}
                    className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
                  >
                    Uid|Pass
                  </div>
                  <div
                    onClick={() => handleCopyFormatted('UID_PASS_2FA')}
                    className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
                  >
                    Uid|Pass|2FA
                  </div>
                  <div
                    onClick={() => handleCopyFormatted('UID_PASS_TOKEN_COOKIE')}
                    className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
                  >
                    Uid|Pass|Token|Cookie
                  </div>
                  <div
                    onClick={() => handleCopyFormatted('FULL')}
                    className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
                  >
                    Uid|Pass|Token|Cookie|Email|PassMail|2FA
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. Chuyển Đến Thư Mục Khác */}
      <div
        onMouseEnter={() => setActiveSubmenu('MOVE')}
        className="relative group px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderInput className="w-3.5 h-3.5 text-amber-400 group-hover:text-white" />
          <span>Chuyển Đến Thư Mục</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />

        {activeSubmenu === 'MOVE' && (
          <div className="absolute left-full top-0 ml-1 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50">
            {folders.map(f => (
              <div
                key={f.id}
                onClick={() => {
                  onMoveToFolder(targetIds, f.id);
                  onClose();
                }}
                className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1 flex items-center justify-between"
              >
                <span className="truncate">{f.name}</span>
                <span className="text-slate-400 text-[10px]">({f.accountCount ?? 0})</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 4. Kiểm Tra Trạng Thái Tài Khoản */}
      <div
        onMouseEnter={() => setActiveSubmenu('CHECK')}
        className="relative group px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:text-white" />
          <span>Kiểm Tra Trạng Thái</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />

        {activeSubmenu === 'CHECK' && (
          <div className="absolute left-full top-0 ml-1 w-56 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50">
            <div
              onClick={() => {
                onCheckStatus(targetIds, 'UID');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Kiểm tra Live / Die UID
            </div>
            <div
              onClick={() => {
                onCheckStatus(targetIds, 'COOKIE');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Kiểm tra Cookie còn sống
            </div>
            <div
              onClick={() => {
                onCheckStatus(targetIds, 'TOKEN');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Kiểm tra Token Facebook
            </div>
            <div
              onClick={() => {
                onCheckStatus(targetIds, 'PROXY');
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1"
            >
              Kiểm tra Ping & IP Proxy
            </div>
          </div>
        )}
      </div>

      {/* 5. Chỉnh Sửa Thông Tin */}
      <div
        onMouseEnter={() => setActiveSubmenu('EDIT')}
        className="relative group px-2.5 py-1.5 hover:bg-indigo-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Edit3 className="w-3.5 h-3.5 text-purple-400 group-hover:text-white" />
          <span>Chỉnh Sửa Thông Tin</span>
        </div>
        <ChevronRight className="w-3 h-3 text-slate-400 group-hover:text-white" />

        {activeSubmenu === 'EDIT' && (
          <div className="absolute left-full top-0 ml-1 w-60 bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-lg shadow-2xl py-1 text-slate-200 z-50">
            <div
              onClick={() => {
                onOpenBatchUpdate();
                onClose();
              }}
              className="px-3 py-1.5 hover:bg-indigo-600 hover:text-white cursor-pointer rounded-md mx-1 font-semibold text-indigo-300"
            >
              Cập nhật hàng loạt (Batch Update)
            </div>
          </div>
        )}
      </div>

      <div className="h-[1px] bg-slate-800 my-1 mx-2" />

      {/* 6. Chuyển Vào Thùng Rác (Del) */}
      <div
        onClick={() => {
          onDeleteAccounts(targetIds, false);
          onClose();
        }}
        className="px-2.5 py-1.5 hover:bg-rose-600 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 text-rose-300 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trash2 className="w-3.5 h-3.5" />
          <span>Chuyển Vào Thùng Rác</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Del</span>
      </div>

      {/* 7. Xóa Vĩnh Viễn */}
      <div
        onClick={() => {
          if (confirm(`Cảnh báo: Bạn có chắc chắn muốn xóa vĩnh viễn ${targetIds.length} tài khoản này cùng toàn bộ Profile đĩa? Thao tác không thể khôi phục!`)) {
            onDeleteAccounts(targetIds, true);
          }
          onClose();
        }}
        className="px-2.5 py-1.5 hover:bg-rose-700 hover:text-white flex items-center justify-between cursor-pointer rounded-md mx-1 text-rose-400 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertOctagon className="w-3.5 h-3.5" />
          <span>Xóa Vĩnh Viễn & Profile</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">Shift+Del</span>
      </div>
    </div>
  );
};
