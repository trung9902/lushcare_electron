import { AccountStatusType } from '../types';

export function getAccountStatus(info?: string, runningStatus?: string): AccountStatusType {
  if (runningStatus && runningStatus.trim() !== '') return 'RUNNING';
  if (!info) return 'READY';

  const text = info.toLowerCase();
  if (text.includes('live')) return 'LIVE';
  if (text.includes('282')) return 'CP282';
  if (text.includes('956')) return 'CP956';
  if (text.includes('die') || text.includes('khóa') || text.includes('khoa') || text.includes('vô hiệu')) return 'DIE';
  if (text.includes('chạy') || text.includes('running')) return 'RUNNING';
  if (text.includes('lỗi') || text.includes('error')) return 'ERROR';
  return 'READY';
}

export function getStatusBadgeConfig(status: AccountStatusType, customText?: string) {
  switch (status) {
    case 'LIVE':
      return {
        label: customText || 'Live',
        badgeClass: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
        dotClass: 'bg-emerald-400',
        type: 'LIVE' as const,
      };
    case 'DIE':
      return {
        label: customText || 'Die / Khóa',
        badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        dotClass: 'bg-rose-400',
        type: 'DIE' as const,
      };
    case 'CP282':
      return {
        label: customText || 'CP 282',
        badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        dotClass: 'bg-amber-400',
        type: 'CP282' as const,
      };
    case 'CP956':
      return {
        label: customText || 'CP 956',
        badgeClass: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
        dotClass: 'bg-amber-400',
        type: 'CP956' as const,
      };
    case 'RUNNING':
      return {
        label: customText || 'Đang chạy',
        badgeClass: 'bg-sky-500/10 border-sky-500/20 text-sky-300',
        dotClass: 'bg-sky-400 animate-pulse',
        type: 'RUNNING' as const,
      };
    case 'ERROR':
      return {
        label: customText || 'Lỗi',
        badgeClass: 'bg-rose-500/10 border-rose-500/20 text-rose-400',
        dotClass: 'bg-rose-400',
        type: 'ERROR' as const,
      };
    default:
      return {
        label: customText || 'Sẵn sàng',
        badgeClass: 'bg-zinc-800/60 border-white/[0.06] text-zinc-400',
        dotClass: 'bg-zinc-500',
        type: 'READY' as const,
      };
  }
}

export function truncate(str?: string | null, maxLen: number = 30): string {
  if (!str) return '';
  if (str.length <= maxLen) return str;
  return str.substring(0, maxLen - 3) + '...';
}

export function formatDateTime(isoOrDate?: string): string {
  if (!isoOrDate) return '-';
  try {
    const d = new Date(isoOrDate);
    if (isNaN(d.getTime())) return isoOrDate;
    return d.toLocaleString('vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return isoOrDate;
  }
}
