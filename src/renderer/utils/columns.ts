import { ColumnItem, PresetType } from '../types';

export const ALL_COLUMNS: ColumnItem[] = [
  // Cố định ghim trái
  { id: 'checkbox', label: '', width: 42, minWidth: 42, fixed: true, category: 'system', visible: true },
  { id: 'stt', label: 'STT', width: 50, minWidth: 50, fixed: true, category: 'system', visible: true },
  { id: 'uid', label: 'UID', width: 155, minWidth: 140, fixed: true, category: 'auth', visible: true },
  { id: 'info', label: 'Tình Trạng', width: 140, minWidth: 130, fixed: true, category: 'system', visible: true },
  
  // Trạng thái & thông tin cốt lõi
  { id: 'status', label: 'Trạng Thái', width: 160, minWidth: 140, category: 'interaction', visible: true },
  { id: 'name', label: 'Tên Hiển Thị', width: 150, minWidth: 120, category: 'profile', visible: true },
  { id: 'proxy', label: 'Proxy', width: 160, minWidth: 130, category: 'network', visible: true },
  { id: 'kichban', label: 'Kịch Bản', width: 150, minWidth: 120, category: 'interaction', visible: true },
  { id: 'ghiChu', label: 'Ghi Chú', width: 160, minWidth: 120, category: 'system', visible: true },

  // Thông tin bảo mật & đăng nhập
  { id: 'pass', label: 'Mật Khẩu', width: 130, minWidth: 100, category: 'auth', visible: true },
  { id: 'fa2', label: 'Mã 2FA', width: 150, minWidth: 120, category: 'auth', visible: true },
  { id: 'cookie', label: 'Cookie', width: 180, minWidth: 140, category: 'auth', visible: true },
  { id: 'token', label: 'Token', width: 160, minWidth: 130, category: 'auth', visible: false },
  { id: 'cookie1', label: 'Cookie Dự Phòng', width: 160, minWidth: 130, category: 'auth', visible: false },
  
  // Email & Số điện thoại
  { id: 'email', label: 'Email Chính', width: 180, minWidth: 140, category: 'auth', visible: true },
  { id: 'passmail', label: 'Pass Email', width: 130, minWidth: 100, category: 'auth', visible: false },
  { id: 'mailrecovery', label: 'Mail Khôi Phục', width: 160, minWidth: 130, category: 'auth', visible: false },
  { id: 'passmailrecovery', label: 'Pass Mail Khôi Phục', width: 140, minWidth: 110, category: 'auth', visible: false },
  { id: 'phone', label: 'Số Điện Thoại', width: 130, minWidth: 110, category: 'auth', visible: false },
  { id: 'email2', label: 'Email Phụ', width: 160, minWidth: 130, category: 'auth', visible: false },
  { id: 'cookieHotmail', label: 'Cookie Hotmail', width: 160, minWidth: 130, category: 'auth', visible: false },

  // Mạng xã hội & Tương tác
  { id: 'friends', label: 'Bạn Bè', width: 90, minWidth: 80, category: 'profile', visible: true },
  { id: 'groups', label: 'Nhóm', width: 80, minWidth: 70, category: 'profile', visible: false },
  { id: 'follow', label: 'Followers', width: 90, minWidth: 80, category: 'profile', visible: false },
  { id: 'interactEnd', label: 'Tương Tác Cuối', width: 150, minWidth: 130, category: 'interaction', visible: true },
  { id: 'wallPosts', label: 'Bài Đăng Tường', width: 110, minWidth: 90, category: 'profile', visible: false },
  { id: 'pages', label: 'Fanpage', width: 80, minWidth: 70, category: 'profile', visible: false },
  { id: 'pagePro5', label: 'Page Pro5', width: 100, minWidth: 80, category: 'profile', visible: false },
  
  // Thông tin cá nhân Profile
  { id: 'birthday', label: 'Ngày Sinh', width: 110, minWidth: 95, category: 'profile', visible: false },
  { id: 'gender', label: 'Giới Tính', width: 90, minWidth: 80, category: 'profile', visible: false },
  { id: 'location', label: 'Vị Trí', width: 130, minWidth: 100, category: 'profile', visible: false },
  { id: 'hometown', label: 'Quê Quán', width: 130, minWidth: 100, category: 'profile', visible: false },
  { id: 'currentCity', label: 'Thành Phố', width: 130, minWidth: 100, category: 'profile', visible: false },
  { id: 'job', label: 'Nghề Nghiệp', width: 130, minWidth: 100, category: 'profile', visible: false },
  { id: 'avatar', label: 'Avatar', width: 80, minWidth: 70, category: 'profile', visible: false },
  { id: 'dating', label: 'Hẹn Hò FB', width: 95, minWidth: 80, category: 'profile', visible: false },

  // Kỹ thuật & Checkpoint
  { id: 'useragent', label: 'User Agent', width: 200, minWidth: 150, category: 'network', visible: false },
  { id: 'profile', label: 'Chrome Profile', width: 160, minWidth: 130, category: 'network', visible: false },
  { id: 'ads', label: 'Tài Khoản Ads', width: 110, minWidth: 90, category: 'extended', visible: false },
  { id: 'bm', label: 'Business Manager', width: 120, minWidth: 100, category: 'extended', visible: false },
  { id: 'status282', label: 'Trạng Thái 282', width: 140, minWidth: 120, category: 'extended', visible: false },
  { id: 'fbBlock', label: 'Chặn Tính Năng', width: 130, minWidth: 110, category: 'extended', visible: false },
  { id: 'infoDevice', label: 'Thông Tin Thiết Bị', width: 120, minWidth: 100, category: 'extended', visible: false },
  { id: 'dateCreateAcc', label: 'Ngày Tạo Nick', width: 130, minWidth: 110, category: 'extended', visible: false },
  { id: 'dateImport', label: 'Ngày Nhập', width: 130, minWidth: 110, category: 'extended', visible: false },
];

export function getPresetColumns(preset: PresetType): ColumnItem[] {
  return ALL_COLUMNS.map(col => {
    if (col.fixed) return { ...col, visible: true };

    switch (preset) {
      case 'DEFAULT':
        return {
          ...col,
          visible: ['checkbox', 'stt', 'uid', 'info', 'status', 'name', 'proxy', 'kichban', 'ghiChu', 'pass', 'fa2', 'cookie', 'email', 'friends', 'interactEnd'].includes(col.id),
        };
      case 'SEEDING':
        return {
          ...col,
          visible: ['checkbox', 'stt', 'uid', 'info', 'status', 'name', 'proxy', 'kichban', 'friends', 'groups', 'follow', 'wallPosts', 'pages', 'interactEnd', 'ghiChu'].includes(col.id),
        };
      case 'SECURITY':
        return {
          ...col,
          visible: ['checkbox', 'stt', 'uid', 'info', 'pass', 'fa2', 'cookie', 'token', 'email', 'passmail', 'mailrecovery', 'phone', 'status282', 'status', 'proxy'].includes(col.id),
        };
      case 'FULL':
        return {
          ...col,
          visible: true,
        };
      default:
        return col;
    }
  });
}
