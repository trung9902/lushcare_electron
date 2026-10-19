import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Copy,
  Check,
  Eye,
  EyeOff,
  ExternalLink,
  Key,
  Shield,
  Clock,
  User,
  Globe,
  FileText,
  Trash2,
  Play,
  RotateCw,
} from 'lucide-react';
import { Account, AccountStatusType } from '../types';
import { generate2FaOtp, copyToClipboard } from '../utils/otp';
import { getStatusBadgeConfig } from '../utils/format';

interface AccountInspectorProps {
  account: Account | null;
  isOpen: boolean;
  onClose: () => void;
  onLaunchBrowser: (account: Account, mode: 'COOKIE' | 'CREDENTIALS') => void;
  onUpdateAccount?: (account: Partial<Account> & { id: number }) => void;
  onDeleteAccount?: (id: number) => void;
}

export const AccountInspector: React.FC<AccountInspectorProps> = ({
  account,
  isOpen,
  onClose,
  onLaunchBrowser,
  onUpdateAccount,
  onDeleteAccount,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [otpCode, setOtpCode] = useState<string>('------');
  const [timeLeft, setTimeLeft] = useState<number>(30);
  const [customFa2, setCustomFa2] = useState<string>('');

  // Sync customFa2 when account changes
  useEffect(() => {
    if (account) {
      setCustomFa2(account.fa2 || '');
      setShowPassword(false);
    }
  }, [account]);

  // Live 2FA Timer
  useEffect(() => {
    if (!isOpen || !account) return;

    const secret = (account.fa2 || customFa2 || '').trim();

    const updateOtp = () => {
      const epoch = Math.floor(Date.now() / 1000);
      const remaining = 30 - (epoch % 30);
      setTimeLeft(remaining);

      if (secret) {
        const code = generate2FaOtp(secret);
        setOtpCode(code);
      } else {
        setOtpCode('------');
      }
    };

    updateOtp();
    const timer = setInterval(updateOtp, 1000);
    return () => clearInterval(timer);
  }, [isOpen, account, customFa2]);

  const handleCopy = async (field: string, text?: string | null) => {
    if (!text) return;
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  if (!isOpen || !account) return null;

  const badge = getStatusBadgeConfig(account.status, account.status);
  const progressPercent = (timeLeft / 30) * 100;

  return (
    <div
      className="fixed top-9 right-0 bottom-0 w-96 bg-[#061813] border-l border-[#1b4d40]/80 shadow-2xl z-40 flex flex-col select-none animate-in slide-in-from-right duration-200"
      onClick={e => e.stopPropagation()}
    >
      {/* Header */}
      <div className="h-12 px-4 border-b border-[#1b4d40]/60 flex items-center justify-between bg-[#09221b]">
        <div className="flex items-center gap-2 truncate">
          <User className="w-4 h-4 text-[#61c73f] flex-shrink-0" />
          <div className="flex flex-col truncate">
            <span className="font-semibold text-xs text-zinc-100 truncate">
              {account.name || 'Chi tiết tài khoản'}
            </span>
            <span className="font-mono text-[11px] text-zinc-400 truncate">
              {account.uid}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div
            className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[10px] font-medium ${badge.badgeClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badge.dotClass}`} />
            <span>{badge.label}</span>
          </div>

          <button
            onClick={onClose}
            title="Đóng inspector (Esc)"
            className="p-1 hover:bg-[#0e2c23] text-zinc-400 hover:text-zinc-200 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Body Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* 1. Live 2FA OTP Widget */}
        <div className="p-3.5 bg-[#09221b] border border-[#1b4d40]/60 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-zinc-400 text-[11px]">
            <div className="flex items-center gap-1.5 font-medium">
              <Key className="w-3.5 h-3.5 text-[#61c73f]" />
              <span className="text-zinc-200">Xác thực 2FA OTP (VMAX Live)</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-mono text-[#61c73f]">
              <Clock className="w-3 h-3 text-[#61c73f]" />
              <span>{timeLeft}s</span>
            </div>
          </div>

          {/* OTP Code Display Box */}
          <div className="flex items-center justify-between bg-[#041611] border border-[#1b4d40]/60 rounded-lg p-2.5">
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-500">Mã 6 chữ số</span>
              <span className="font-mono text-xl font-bold tracking-widest text-[#61c73f]">
                {otpCode.length === 6
                  ? `${otpCode.substring(0, 3)} ${otpCode.substring(3)}`
                  : otpCode}
              </span>
            </div>

            <button
              onClick={() => handleCopy('otp', otpCode)}
              disabled={otpCode === '------' || otpCode === 'ERR_KEY'}
              className="h-8 px-2.5 bg-[#0b261f] hover:bg-[#12392f] border border-[#61c73f]/30 text-[#61c73f] rounded flex items-center gap-1.5 transition-colors disabled:opacity-40"
            >
              {copiedField === 'otp' ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#61c73f]" />
                  <span className="text-[#61c73f] text-[11px]">Đã chép</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Sao chép</span>
                </>
              )}
            </button>
          </div>

          {/* Countdown Progress Bar */}
          <div className="w-full bg-[#041611] rounded-full h-1 overflow-hidden">
            <div
              style={{ width: `${progressPercent}%` }}
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                timeLeft <= 5 ? 'bg-[#ff7a1a]' : 'bg-[#1f8538]'
              }`}
            />
          </div>

          {/* 2FA Secret Key string */}
          <div className="flex items-center justify-between text-[11px] text-zinc-500 pt-1">
            <span className="truncate max-w-[200px] font-mono">
              Key: {account.fa2 || customFa2 || 'Chưa có key 2FA'}
            </span>
            {(account.fa2 || customFa2) && (
              <button
                onClick={() => handleCopy('fa2Key', account.fa2 || customFa2)}
                className="hover:text-[#61c73f]"
              >
                {copiedField === 'fa2Key' ? 'Đã copy key' : 'Copy key'}
              </button>
            )}
          </div>
        </div>

        {/* 2. Primary Launch Chrome Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onLaunchBrowser(account, 'COOKIE')}
            className="h-9 px-3 bg-gradient-to-r from-[#1f8538] to-[#259b43] hover:from-[#17682c] hover:to-[#1f8538] text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm shadow-[#1f8538]/30 text-xs"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Mở Chrome (Cookie)</span>
          </button>

          <button
            onClick={() => onLaunchBrowser(account, 'CREDENTIALS')}
            className="h-9 px-3 bg-[#0b261f] hover:bg-[#12392f] text-zinc-200 rounded-lg font-medium flex items-center justify-center gap-1.5 transition-colors border border-[#1b4d40]/80 text-xs"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#61c73f]" />
            <span>Mở Chrome (Pass)</span>
          </button>
        </div>

        {/* 3. Credentials & Info Card */}
        <div className="p-3.5 bg-[#09221b] border border-[#1b4d40]/60 rounded-xl space-y-3">
          <div className="text-[10px] font-semibold text-[#61c73f] uppercase tracking-wider">
            Thông tin đăng nhập & Proxy
          </div>

          {/* UID */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>UID Facebook:</span>
              <button
                onClick={() => handleCopy('uid', account.uid)}
                className="hover:text-[#61c73f] flex items-center gap-1"
              >
                {copiedField === 'uid' ? (
                  <Check className="w-3 h-3 text-[#61c73f]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <div className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded font-mono text-xs text-zinc-200 select-text">
              {account.uid}
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Mật khẩu:</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPassword(!showPassword)}
                  className="hover:text-zinc-200 flex items-center gap-1"
                >
                  {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showPassword ? 'Ẩn' : 'Hiện'}</span>
                </button>
                <button
                  onClick={() => handleCopy('pass', account.pass)}
                  className="hover:text-[#61c73f] flex items-center gap-1"
                >
                  {copiedField === 'pass' ? (
                    <Check className="w-3 h-3 text-[#61c73f]" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>Copy</span>
                </button>
              </div>
            </div>
            <div className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded font-mono text-xs text-zinc-200 select-text truncate">
              {showPassword ? account.pass || '—' : '••••••••••••'}
            </div>
          </div>

          {/* Cookie */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span>Cookie Facebook:</span>
              <button
                onClick={() => handleCopy('cookie', account.cookie)}
                disabled={!account.cookie}
                className="hover:text-[#61c73f] flex items-center gap-1 disabled:opacity-40"
              >
                {copiedField === 'cookie' ? (
                  <Check className="w-3 h-3 text-[#61c73f]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <div
              className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded font-mono text-[11px] text-zinc-400 truncate select-text"
              title={account.cookie || ''}
            >
              {account.cookie || '—'}
            </div>
          </div>

          {/* Proxy */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-zinc-400 text-[11px]">
              <span className="flex items-center gap-1">
                <Globe className="w-3 h-3 text-[#61c73f]" />
                <span>Proxy:</span>
              </span>
              <button
                onClick={() => handleCopy('proxy', account.proxy)}
                disabled={!account.proxy}
                className="hover:text-[#61c73f] flex items-center gap-1 disabled:opacity-40"
              >
                {copiedField === 'proxy' ? (
                  <Check className="w-3 h-3 text-[#61c73f]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>Copy</span>
              </button>
            </div>
            <div className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded font-mono text-xs text-zinc-300 select-text truncate">
              {account.proxy || 'Trực tiếp (Không dùng proxy)'}
            </div>
          </div>

          {/* Email & Passmail */}
          {(account.email || account.passmail) && (
            <div className="space-y-1">
              <div className="text-zinc-400 text-[11px]">Email / Passmail:</div>
              <div className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded font-mono text-xs text-zinc-300 select-text truncate">
                {account.email} {account.passmail ? `| ${account.passmail}` : ''}
              </div>
            </div>
          )}

          {/* Note */}
          {account.notes && (
            <div className="space-y-1">
              <div className="text-zinc-400 text-[11px]">Ghi chú:</div>
              <div className="p-2 bg-[#041611] border border-[#1b4d40]/40 rounded text-xs text-zinc-300 select-text">
                {account.notes}
              </div>
            </div>
          )}
        </div>

        {/* 4. Delete Account Danger Zone */}
        {onDeleteAccount && (
          <div className="pt-2">
            <button
              onClick={() => {
                if (confirm(`Xác nhận xóa tài khoản ${account.uid}?`)) {
                  onDeleteAccount(account.id);
                  onClose();
                }
              }}
              className="w-full h-8 px-3 border border-rose-500/20 hover:bg-rose-500/10 text-rose-400 hover:text-rose-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Xóa tài khoản này</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
