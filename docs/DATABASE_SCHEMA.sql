-- ==============================================================================
-- DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
-- TÀI LIỆU: LƯỢC ĐỒ CƠ SỞ DỮ LIỆU SQLITE (DATABASE_SCHEMA.sql)
-- PHIÊN BẢN: 2.0 (Kiến trúc CSDL tối ưu hóa cho 50.000+ tài khoản & 70+ hành động)
-- ==============================================================================

-- ==============================================================================
-- PHẦN 1: CẤU HÌNH HIỆU NĂNG VÀ TOÀN VẸN DỮ LIỆU (PRAGMA OPTIMIZATIONS)
-- Được kích hoạt tự động mỗi khi khởi tạo kết nối better-sqlite3 trong Main Process
-- ==============================================================================

-- Bật chế độ ghi nhật ký trước (Write-Ahead Logging) cho phép đọc ghi đồng thời không khóa file
PRAGMA journal_mode = WAL;

-- Đồng bộ ở mức NORMAL: an toàn trong WAL mode và tăng tốc độ ghi đĩa lên gấp 5-10 lần
PRAGMA synchronous = NORMAL;

-- Bắt buộc kiểm tra toàn vẹn khóa ngoại (Foreign Key Constraints)
PRAGMA foreign_keys = ON;

-- Bộ nhớ đệm trang SQLite: -64000 tương đương 64 MB RAM cache cho mỗi connection
PRAGMA cache_size = -64000;

-- Lưu trữ các bảng tạm (temp tables) và chỉ mục tạm trên RAM
PRAGMA temp_store = MEMORY;

-- Kích hoạt Memory-Mapped I/O dung lượng 256 MB giúp đọc file CSDL với tốc độ bộ nhớ RAM
PRAGMA mmap_size = 268435456;

-- Thời gian chờ mở khóa tối đa 5000ms khi có transaction khác đang thực thi
PRAGMA busy_timeout = 5000;

-- Mã hóa văn bản chuẩn quốc tế UTF-8
PRAGMA encoding = "UTF-8";


-- ==============================================================================
-- PHẦN 2: CSDL QUẢN TRỊ TÀI KHOẢN & HỆ THỐNG (database/db_lushcare.sqlite)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 2.1. BẢNG files: Thư mục phân loại tài khoản Facebook
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                                 -- Tên hiển thị của thư mục (VD: Clone Ngoại, Via Cổ)
    createddate TEXT DEFAULT (datetime('now', 'localtime')), -- Ngày giờ tạo thư mục
    active INTEGER NOT NULL DEFAULT 1,                  -- 1: Hiển thị hoạt động, 0: Đã chuyển vào thùng rác
    STT INTEGER NOT NULL DEFAULT 0                      -- Thứ tự sắp xếp hiển thị trên Sidebar UI
);

-- Chỉ mục tối ưu hiển thị danh sách thư mục đang hoạt động theo thứ tự STT
CREATE INDEX IF NOT EXISTS idx_files_active_stt ON files(active, STT);


-- ------------------------------------------------------------------------------
-- 2.2. BẢNG accounts: Quản lý chi tiết tài khoản Facebook (45 trường dữ liệu)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,               -- Khóa chính tự tăng định danh tài khoản nội bộ
    uid TEXT NOT NULL,                                  -- Facebook UID (chuỗi số hoặc alias định danh)
    pass TEXT,                                          -- Mật khẩu tài khoản Facebook
    token TEXT,                                         -- Access Token Facebook (EAAB, EAAG...)
    cookie TEXT,                                        -- Chuỗi Cookie phiên đăng nhập (c_user, xs, datr...)
    cookie1 TEXT,                                       -- Chuỗi Cookie dự phòng
    email TEXT,                                         -- Email chính liên kết tài khoản
    email2 TEXT,                                        -- Email đầy đủ / alias dự phòng
    email_old TEXT,                                     -- Email cũ trước khi đổi
    passmail TEXT,                                      -- Mật khẩu hòm thư email chính
    passmail_old TEXT,                                  -- Mật khẩu hòm thư cũ
    mailrecovery TEXT,                                  -- Email khôi phục (Recovery Email)
    passmailrecovery TEXT,                              -- Mật khẩu email khôi phục
    phone TEXT,                                         -- Số điện thoại liên kết
    name TEXT,                                          -- Tên hiển thị Facebook
    fa2 TEXT,                                           -- Khóa bí mật 2FA Secret Key (chuỗi Base32)
    useragent TEXT,                                     -- User-Agent riêng biệt gắn với tài khoản
    proxy TEXT,                                         -- Cấu hình proxy riêng (IP:Port hoặc IP:Port:User:Pass)
    idfile INTEGER,                                     -- Khóa ngoại trỏ đến files.id (Thư mục sở hữu)
    friends TEXT DEFAULT '0',                           -- Số lượng bạn bè (Friend count)
    groups TEXT DEFAULT '0',                            -- Số lượng nhóm đã tham gia
    pages TEXT DEFAULT '0',                             -- Số lượng Fanpage truyền thống quản trị
    pagePro5 TEXT DEFAULT '0',                          -- Số lượng Fanpage Pro5 quản trị
    follow TEXT DEFAULT '0',                            -- Số lượng người theo dõi (Followers)
    birthday TEXT,                                      -- Ngày tháng năm sinh (dd/MM/yyyy)
    gender TEXT,                                        -- Giới tính (Nam, Nữ, Khác)
    location TEXT,                                      -- Vị trí địa lý / GeoIP
    hometown TEXT,                                      -- Quê quán
    currentCity TEXT,                                   -- Nơi ở hiện tại
    job TEXT,                                           -- Nghề nghiệp / Công việc
    dating TEXT,                                        -- Trạng thái tính năng Hẹn hò (Dating)
    ads TEXT,                                           -- Tình trạng tài khoản quảng cáo Ads
    bm TEXT,                                            -- Tình trạng tài khoản Business Manager
    wallPosts TEXT DEFAULT '0',                         -- Số lượng bài viết trên tường cá nhân
    fbBlock TEXT,                                       -- Tình trạng chặn tính năng (chặn like, comment, share)
    avatar TEXT,                                        -- Trạng thái hoặc đường dẫn ảnh đại diện
    profile TEXT DEFAULT 'Chưa tạo',                    -- Trạng thái Chrome Profile: 'Đã tạo', 'Chưa tạo'
    status TEXT DEFAULT 'Sẵn sàng',                     -- Trạng thái luồng thực thi (Sẵn sàng, Đang chạy, Thành công, Lỗi...)
    info TEXT DEFAULT 'Live',                           -- Tình trạng tài khoản (Live, Die, Checkpoint 282, Checkpoint 956...)
    status282 TEXT,                                     -- Chi tiết checkpoint 282 (ngày bị, ảnh kháng, sđt)
    interactEnd TEXT,                                   -- Thời điểm kết thúc tương tác gần nhất
    dateCreateAcc TEXT,                                 -- Ngày tạo tài khoản Facebook
    dateImport TEXT DEFAULT (datetime('now', 'localtime')), -- Ngày nhập nick vào phần mềm
    kichban TEXT,                                       -- Tên hoặc ID kịch bản gán riêng cho nick
    infoDevice TEXT,                                    -- Thông số phần cứng / Fingerprint giả lập
    cookieHotmail TEXT,                                 -- Cookie webmail Outlook / Hotmail
    ghiChu TEXT,                                        -- Ghi chú tùy chỉnh của người dùng
    active INTEGER NOT NULL DEFAULT 1,                  -- 1: Đang hoạt động, 0: Đã chuyển vào thùng rác
    dateDelete TEXT,                                    -- Thời điểm chuyển vào thùng rác
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')), -- Thời điểm tạo bản ghi
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')), -- Thời điểm cập nhật bản ghi gần nhất

    FOREIGN KEY (idfile) REFERENCES files(id) ON DELETE SET NULL ON UPDATE CASCADE
);

-- ------------------------------------------------------------------------------
-- CHỈ MỤC TỐI ƯU HÓA TRUY VẤN accounts (Performance Tuning cho 50.000+ bản ghi)
-- ------------------------------------------------------------------------------
-- 1. Tìm kiếm và chống trùng lặp theo UID
CREATE INDEX IF NOT EXISTS idx_accounts_uid ON accounts(uid);

-- 2. Bộ lọc chính hiển thị theo thư mục và trạng thái hoạt động (DataGrid filter mặc định)
CREATE INDEX IF NOT EXISTS idx_accounts_idfile_active ON accounts(idfile, active);

-- 3. Bộ lọc trạng thái thực thi đa luồng (Task Dispatcher query)
CREATE INDEX IF NOT EXISTS idx_accounts_active_status ON accounts(active, status);

-- 4. Bộ lọc trạng thái tài khoản: Live, Die, Checkpoint 282, Checkpoint 956
CREATE INDEX IF NOT EXISTS idx_accounts_active_info ON accounts(active, info);

-- 5. Truy vấn nhóm theo Proxy phục vụ cơ chế giới hạn luồng trên mỗi Proxy
CREATE INDEX IF NOT EXISTS idx_accounts_proxy ON accounts(proxy) WHERE proxy IS NOT NULL AND proxy != '';

-- 6. Truy vấn danh sách tài khoản theo Profile phục vụ giải phóng dung lượng đĩa
CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile);

-- 7. Truy vấn thùng rác (active = 0) sắp xếp theo thời gian xóa
CREATE INDEX IF NOT EXISTS idx_accounts_trash ON accounts(active, dateDelete) WHERE active = 0;


-- ------------------------------------------------------------------------------
-- TRIGGER TỰ ĐỘNG CẬP NHẬT updated_at CHO BẢNG accounts
-- ------------------------------------------------------------------------------
CREATE TRIGGER IF NOT EXISTS trg_accounts_updated_at
AFTER UPDATE ON accounts
FOR EACH ROW
BEGIN
    UPDATE accounts SET updated_at = datetime('now', 'localtime') WHERE id = OLD.id;
END;


-- ------------------------------------------------------------------------------
-- 2.3. BẢNG proxy_configs: Quản lý danh mục cấu hình Proxy & Hub xoay IP
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS proxy_configs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,                                 -- Tên định danh (VD: Hub Dongle HN, MinProxy VIP 1)
    proxy_type TEXT NOT NULL CHECK(proxy_type IN (      -- Chủng loại proxy hỗ trợ
        'static', 'minproxy', 'xproxy', 'shoplike', 'obc', 'dcom', 'tmproxy', 'custom'
    )),
    host TEXT,                                          -- Địa chỉ Host / IP máy chủ proxy
    port INTEGER,                                       -- Cổng Port kết nối
    auth_user TEXT,                                     -- Tên đăng nhập xác thực HTTP/SOCKS5
    auth_pass TEXT,                                     -- Mật khẩu xác thực proxy
    api_key TEXT,                                       -- API Key xoay IP (đối với MinProxy, ShopLike, TMProxy)
    api_url TEXT,                                       -- Endpoint gọi lệnh Reset IP (XProxy, OBC, Hilink)
    location TEXT,                                      -- Mã tỉnh thành hoặc quốc gia
    max_threads INTEGER NOT NULL DEFAULT 1,             -- Số luồng tối đa được chạy đồng thời trên Proxy này
    cooldown_seconds INTEGER NOT NULL DEFAULT 60,       -- Thời gian tối thiểu giữa 2 lần xoay IP (giây)
    current_ip TEXT,                                    -- Địa chỉ IP ngoại mạng hiện tại sau khi check
    last_rotated_at TEXT,                               -- Thời điểm kích hoạt xoay IP gần nhất
    status TEXT NOT NULL DEFAULT 'active',              -- 'active', 'paused', 'error'
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_proxy_configs_type_status ON proxy_configs(proxy_type, status);


-- ------------------------------------------------------------------------------
-- 2.4. BẢNG system_settings: Quản trị cấu hình hệ thống (Key-Value JSON Store)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY,                               -- Khóa cấu hình (VD: 'general', 'display_columns', 'interaction', 'checkpoint')
    value TEXT NOT NULL,                                -- Giá trị cấu hình định dạng JSON String
    description TEXT,                                   -- Mô tả chức năng cấu hình
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);


-- ------------------------------------------------------------------------------
-- 2.5. BẢNG app_logs: Nhật ký hoạt động thời gian thực (Realtime Execution Logs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    account_id INTEGER,                                 -- Khóa ngoại liên kết accounts.id (nếu có)
    uid TEXT,                                           -- UID tài khoản tương ứng
    level TEXT NOT NULL CHECK(level IN (                -- Cấp độ nhật ký
        'INFO', 'WARN', 'ERROR', 'SUCCESS', 'DEBUG'
    )),
    source TEXT NOT NULL,                               -- Nguồn phát sinh: 'BrowserManager', 'Runner', 'ProxyRotator', 'Database'
    action_name TEXT,                                   -- Tên hành động đang thực thi (VD: 'HDBaiVietNewsfeed')
    message TEXT NOT NULL,                              -- Nội dung log chi tiết
    metadata TEXT,                                      -- Dữ liệu ngữ cảnh bổ sung (JSON)
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_app_logs_account ON app_logs(account_id, created_at);
CREATE INDEX IF NOT EXISTS idx_app_logs_created_at ON app_logs(created_at);



-- ==============================================================================
-- PHẦN 3: CSDL KỊCH BẢN TƯƠNG TÁC (interact/interact.sqlite)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 3.1. BẢNG Kich_Ban: Danh mục kịch bản tương tác tổng thể
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Kich_Ban (
    Id_KichBan INTEGER PRIMARY KEY AUTOINCREMENT,       -- Mã định danh kịch bản
    TenKichBan TEXT NOT NULL,                           -- Tên kịch bản (VD: Nuôi nick mới 7 ngày, Seeding Livestream)
    CauHinh TEXT,                                       -- Cấu hình chung kịch bản (JSON String)
    STT INTEGER NOT NULL DEFAULT 0,                     -- Thứ tự hiển thị trong danh sách kịch bản
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime'))
);

CREATE INDEX IF NOT EXISTS idx_kichban_stt ON Kich_Ban(STT);


-- ------------------------------------------------------------------------------
-- 3.2. BẢNG Tuong_Tac: Từ điển 70 loại hành động tương tác hệ thống
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Tuong_Tac (
    Id_TuongTac INTEGER PRIMARY KEY AUTOINCREMENT,      -- Mã định danh danh mục hành động
    TenTuongTac TEXT UNIQUE NOT NULL,                   -- Tên mã hành động (VD: HDBaiVietNewsfeed, HDDangBai)
    MoTa TEXT NOT NULL,                                 -- Tên tiếng Việt hiển thị trên giao diện người dùng
    NhomTuongTac TEXT NOT NULL,                         -- Nhóm phân loại: 'feed', 'post', 'friend', 'group', 'page', 'seeding', 'security'
    Icon TEXT,                                          -- Tên icon Lucide React hiển thị trên giao diện
    DefaultCauHinh TEXT NOT NULL DEFAULT '{}'           -- Tham số JSON mặc định ban đầu của hành động
);

CREATE INDEX IF NOT EXISTS idx_tuongtac_nhom ON Tuong_Tac(NhomTuongTac);


-- ------------------------------------------------------------------------------
-- 3.3. BẢNG Hanh_Dong: Các bước hành động chi tiết nằm trong kịch bản
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Hanh_Dong (
    Id_HanhDong INTEGER PRIMARY KEY AUTOINCREMENT,      -- Mã định danh bước hành động
    Id_KichBan INTEGER NOT NULL,                        -- Khóa ngoại liên kết tới Kich_Ban.Id_KichBan
    Id_TuongTac INTEGER NOT NULL,                       -- Khóa ngoại liên kết tới Tuong_Tac.Id_TuongTac
    TenHanhDong TEXT NOT NULL,                          -- Tên người dùng đặt cho bước hành động này
    CauHinh TEXT NOT NULL DEFAULT '{}',                 -- Chuỗi cấu hình chi tiết (JSON String)
    STT INTEGER NOT NULL DEFAULT 0,                     -- Thứ tự thực thi tuần tự từ trên xuống dưới trong kịch bản
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

    FOREIGN KEY (Id_KichBan) REFERENCES Kich_Ban(Id_KichBan) ON DELETE CASCADE,
    FOREIGN KEY (Id_TuongTac) REFERENCES Tuong_Tac(Id_TuongTac) ON DELETE RESTRICT
);

-- Chỉ mục tối ưu tải danh sách hành động theo kịch bản theo đúng thứ tự STT
CREATE INDEX IF NOT EXISTS idx_hanhdong_kichban_stt ON Hanh_Dong(Id_KichBan, STT);


-- ------------------------------------------------------------------------------
-- 3.4. BẢNG Lich_Trinh: Quản lý lập lịch tương tác tự động (Scheduler Engine)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS Lich_Trinh (
    Id_LichTrinh INTEGER PRIMARY KEY AUTOINCREMENT,     -- Mã định danh lịch hẹn
    TenLichTrinh TEXT NOT NULL,                         -- Tên nhiệm vụ lập lịch
    Id_KichBan INTEGER NOT NULL,                        -- Kịch bản chỉ định thực thi
    DanhSachIdFile TEXT NOT NULL DEFAULT '[]',          -- Mảng JSON chứa ID các thư mục tài khoản chạy
    CronExpression TEXT NOT NULL,                       -- Biểu thức định thời chuẩn (VD: '0 8 * * *')
    LoaiLapLai TEXT NOT NULL DEFAULT 'daily' CHECK(     -- Chế độ chu kỳ lặp
        LoaiLapLai IN ('daily', 'even_days', 'odd_days', 'specific_days', 'once')
    ),
    NgayGioChay TEXT,                                   -- Thời điểm chạy cụ thể (nếu chọn 'once': dd/MM/yyyy HH:mm)
    TrangThai INTEGER NOT NULL DEFAULT 1,               -- 1: Đang kích hoạt lịch, 0: Tạm dừng
    LanChayCuoi TEXT,                                   -- Thời điểm kích hoạt lần cuối
    KetQuaLanCuoi TEXT,                                 -- Báo cáo kết quả đợt chạy trước
    created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),

    FOREIGN KEY (Id_KichBan) REFERENCES Kich_Ban(Id_KichBan) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_lichtrinh_trangthai ON Lich_Trinh(TrangThai);



-- ==============================================================================
-- PHẦN 4: DỮ LIỆU KHỞI TẠO MẶC ĐỊNH (SEED DATA)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 4.1. Khởi tạo thư mục mặc định trong CSDL db_lushcare.sqlite
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO files (id, name, createddate, active, STT) VALUES
(1, 'Mặc định', datetime('now', 'localtime'), 1, 1);


-- ------------------------------------------------------------------------------
-- 4.2. Khởi tạo cấu hình hệ thống mặc định (system_settings)
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO system_settings (key, value, description) VALUES
('general', '{
    "chromiumPath": "",
    "maxThreads": 5,
    "headless": false,
    "windowWidth": 420,
    "windowHeight": 650,
    "gridRows": 2,
    "gridColumns": 4,
    "delayOpenMin": 2,
    "delayOpenMax": 5,
    "delayCloseMin": 1,
    "delayCloseMax": 3,
    "disableImages": true,
    "muteAudio": true,
    "profileBasePath": "profiles"
}', 'Cấu hình chung hệ thống và điều khiển trình duyệt'),

('interaction', '{
    "defaultScenarioId": 1,
    "useAssignedScenario": true,
    "timeoutPerAccountMinutes": 15,
    "shuffleAccounts": true,
    "loopCount": 1,
    "loopIntervalMinutes": 60,
    "autoCleanCacheBeforeRun": true,
    "checkLiveUidBeforeRun": false,
    "updateProfileInfoAfterRun": true
}', 'Cấu hình tham số điều phối tương tác'),

('proxy', '{
    "defaultType": "static",
    "threadsPerProxy": 1,
    "rotateWaitTimeoutSeconds": 120,
    "ipCheckService": "https://api.ipify.org?format=json"
}', 'Cấu hình chính sách xoay IP và kiểm tra Proxy'),

('ai_integration', '{
    "geminiApiKey": "",
    "openaiApiKey": "",
    "defaultModel": "gemini-1.5-flash",
    "temperature": 0.7
}', 'Cấu hình API sinh nội dung thông minh qua Gemini và OpenAI');


-- ------------------------------------------------------------------------------
-- 4.3. Khởi tạo danh mục đầy đủ 70 Hành Động Tương Tác (Tuong_Tac)
-- ------------------------------------------------------------------------------

-- Nhóm 1: Tương tác cá nhân & Nuôi dưỡng bảng tin (Feed & Personal)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(1, 'HDBaiVietNewsfeed', 'Lướt Newsfeed v1', 'feed', 'Layout', '{"soLuongBaiMin":3,"soLuongBaiMax":5,"thoiGianXemMin":10,"thoiGianXemMax":20,"tyLeReaction":60,"reactions":["like","love"],"tyLeComment":20,"noiDungComment":"{Tuyệt vời|Đẹp quá|Thú vị thật}","commentAnh":false}'),
(2, 'HDBaiVietNewsfeed2', 'Lướt Newsfeed v2 (Tối ưu m.fb)', 'feed', 'LayoutGrid', '{"soLuongBaiMin":5,"soLuongBaiMax":10,"thoiGianXemMin":5,"thoiGianXemMax":15,"tyLeReaction":50,"reactions":["like"],"tyLeComment":10,"noiDungComment":""}'),
(3, 'HDBaiVietNewsfeed3', 'Lướt Newsfeed v3 (Nâng cao)', 'feed', 'Compass', '{"soLuongBaiMin":5,"soLuongBaiMax":8,"tuKhoaUuTien":"","tuKhoaBoQua":"","tyLeShare":10,"shareLenTuong":true}'),
(4, 'HDXemStory', 'Xem tin Story', 'feed', 'PlayCircle', '{"soLuongStoryMin":2,"soLuongStoryMax":5,"thoiGianXemMoiStoryMin":5,"thoiGianXemMoiStoryMax":10,"tyLeThaReaction":50,"reactions":["love"],"tyLeNhanTin":10,"noiDungNhanTin":"{Hay quá|Cute ghê}"}'),
(5, 'HDXemWatch', 'Xem video Watch', 'feed', 'Video', '{"soLuongVideoMin":2,"soLuongVideoMax":4,"thoiGianXemMoiVideoMin":30,"thoiGianXemMoiVideoMax":60,"tyLeReaction":40,"reactions":["like"],"tyLeComment":15,"noiDungComment":"{Video hay|Ý nghĩa quá}"}'),
(6, 'HDDocThongBao', 'Đọc thông báo Notifications', 'feed', 'Bell', '{"soLuongThongBaoMin":2,"soLuongThongBaoMax":5,"thoiGianXemMin":3,"thoiGianXemMax":6}'),
(7, 'HDChocBanBe', 'Chọc bạn bè (Poke)', 'feed', 'HandMetal', '{"soLuongChocMin":3,"soLuongChocMax":10,"chocLai":true,"chocGoiY":false}'),
(8, 'HDChucMungSinhNhat', 'Chúc mừng sinh nhật', 'feed', 'Cake', '{"hinhThuc":"tinnhan","noiDungTinNhan":"{Chúc mừng sinh nhật bạn nhé!|Sinh nhật vui vẻ và hạnh phúc nha! 🎉}","guiAnh":false}'),
(9, 'HDNghiGiaiLao', 'Nghỉ giải lao', 'feed', 'Coffee', '{"thoiGianNghiMin":10,"thoiGianNghiMax":30}'),
(10, 'HDTimKiemGoogle', 'Tìm kiếm từ khóa Google', 'feed', 'Search', '{"danhSachTuKhoa":"tin tuc hom nay\nthoi tiet viet nam\ncach lam banh mi","soLanTimKiem":2,"clickVaoWebSite":true,"thoiGianLuotWebMin":15,"thoiGianLuotWebMax":30}'),
(11, 'HDTruyCapWebsite', 'Duyệt web bên ngoài (Nuôi Cookie Pixel)', 'feed', 'Globe', '{"danhSachWeb":"https://vnexpress.net\nhttps://dantri.com.vn\nhttps://shopee.vn","thoiGianLuotMin":20,"thoiGianLuotMax":45,"cuonTrang":true}'),
(12, 'HDKhangSpam', 'Kháng spam vi phạm tính năng', 'feed', 'ShieldAlert', '{"tuDongGuiKhang":true,"noiDungKhang":"Tôi không vi phạm tiêu chuẩn cộng đồng, xin hãy kiểm tra lại."}');

-- Nhóm 2: Đăng bài & Sáng tạo nội dung (Posting & Creative Content)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(13, 'HDDangBai', 'Đăng bài viết tổng hợp', 'post', 'Edit3', '{"loaiBaiDang":"ca_nhan","noiDung":"{Chào ngày mới cả nhà!|Chúc mọi người một ngày vui vẻ! ✨}","coAnh":false,"thuMucAnh":"","soLuongAnh":1,"tagBanBe":false}'),
(14, 'HDDangStatus', 'Đăng Status nhanh (m.fb)', 'post', 'Send', '{"noiDung":"{Hôm nay trời đẹp quá|Một ngày làm việc hiệu quả nhé cả nhà!}"}'),
(15, 'HDDangStatusV2', 'Đăng Status nâng cao (Màu nền, Cảm xúc)', 'post', 'Palette', '{"noiDung":"{Cuộc sống tươi đẹp|Keep smiling!}","chonMauNen":true,"loaiCamXuc":"Vui vẻ","quyenRiengTu":"public"}'),
(16, 'HDDangReel', 'Đăng video ngắn Facebook Reels', 'post', 'Film', '{"thuMucVideo":"","tieuDe":"{Hot trend hôm nay|Mọi người thấy sao?} #trending #reels","amThanh":"mac_dinh"}'),
(17, 'HDDangStory', 'Đăng tin Story cá nhân', 'post', 'Camera', '{"thuMucAnh":"","loaiStory":"anh","chenText":false}'),
(18, 'HDShareBai', 'Chia sẻ bài viết', 'post', 'Share2', '{"linkBaiViet":"","dichVuShare":"tuong","noiDungShare":"{Bài viết rất hữu ích|Mọi người tham khảo nhé}"}'),
(19, 'HDSharePage', 'Share quyền quản trị Page', 'post', 'UserCheck', '{"danhSachUidAdmin":"","vaiTro":"admin","matKhauXacNhan":""}'),
(20, 'HDUptopBaiViet', 'Đẩy top bài viết cũ', 'post', 'ArrowUpCircle', '{"linkBaiViet":"","noiDungUpTop":"{.|up|chấm}","khoangCachMin":60,"khoangCachMax":120}'),
(21, 'HDXoaBaiTuong', 'Xóa bài viết trên tường', 'post', 'Trash2', '{"soLuongBaiXoa":5,"xoaTheoNgay":false,"truocNgay":""}');

-- Nhóm 3: Tự động hóa bạn bè (Friends Automation)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(22, 'HDKetBanGoiY', 'Kết bạn theo gợi ý Facebook', 'friend', 'UserPlus', '{"soLuongMin":3,"soLuongMax":10,"chiKetBanCoBanChung":true,"soBanChungToiThieu":2,"coAvatar":true}'),
(23, 'HDKetBanTepUid', 'Kết bạn theo tệp UID', 'friend', 'Users', '{"danhSachUid":"","soLuongMin":5,"soLuongMax":15,"delayMin":10,"delayMax":20,"tuDongXoaUidDaChay":true}'),
(24, 'HDKetBanTheoTuKhoa', 'Kết bạn theo từ khóa tìm kiếm', 'friend', 'UserSearch', '{"tuKhoa":"Kinh doanh bất động sản","soLuongMin":3,"soLuongMax":8,"viTriDiaLy":""}'),
(25, 'HDKetBanThanhVienNhom', 'Kết bạn thành viên trong nhóm', 'friend', 'UserCheck', '{"idNhom":"","soLuongMin":5,"soLuongMax":10,"chiKetBanThanhVienTichCuc":true}'),
(26, 'HDKetBanVoiBanBeCuaUid', 'Kết bạn với bạn bè của UID', 'friend', 'Network', '{"uidMucTieu":"","soLuongMin":5,"soLuongMax":10}'),
(27, 'HDXacNhanKetBan', 'Chấp nhận lời mời kết bạn', 'friend', 'CheckCircle', '{"soLuongMin":5,"soLuongMax":15,"chiXacNhanCoBanChung":false,"chiXacNhanCoAvatar":true}'),
(28, 'HDHuyLoiMoiKetBan', 'Hủy lời mời kết bạn đã gửi', 'friend', 'UserX', '{"soLuongHuyMin":5,"soLuongHuyMax":10,"sauSoNgay":7}'),
(29, 'HDHuyKetBan', 'Hủy kết bạn (Unfriend)', 'friend', 'UserMinus', '{"danhSachUidHuy":"","unfriendKhongTuongTac":false,"thoiGianKhongTuongTacNgay":90}'),
(30, 'HDBaiVietBanBe', 'Tương tác tường bạn bè', 'friend', 'HeartHandshake', '{"soLuongBanBeMin":2,"soLuongBanBeMax":5,"soBaiMoiBanBe":2,"tyLeReaction":70,"reactions":["like","love"],"tyLeComment":30,"noiDungComment":"{Tuyệt quá bạn ơi|Chúc ngày mới an lành}"}');

-- Nhóm 4: Tự động hóa hội nhóm (Groups Automation)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(31, 'HDThamGiaNhomGoiY', 'Tham gia nhóm gợi ý', 'group', 'PlusSquare', '{"soLuongMin":2,"soLuongMax":5,"chiThamGiaNhomCongKhai":true,"soThanhVienToiThieu":5000}'),
(32, 'HDThamGiaNhomTuKhoa', 'Tham gia nhóm theo từ khóa', 'group', 'SearchCheck', '{"tuKhoa":"Chợ đồ cũ\nHội kinh doanh online","soLuongMin":2,"soLuongMax":5,"tuDongTraLoiCauHoi":true,"cauTraLoiDefault":"Tôi đồng ý với quy định nhóm"}'),
(33, 'HDThamGiaNhomUid', 'Tham gia nhóm theo danh sách UID', 'group', 'FolderPlus', '{"danhSachIdNhom":"","soLuongMin":3,"soLuongMax":6,"tuDongTraLoiCauHoi":true,"dapAnCauHoi":"{Đồng ý|OK|Tuân thủ nội quy}"}'),
(34, 'HDRoiNhom', 'Rời khỏi nhóm', 'group', 'LogOut', '{"danhSachIdNhom":"","roiNhomKiemDuyet":true,"roiNhomItThanhVien":true,"soThanhVienDuoi":500}'),
(35, 'HDMoiBanBeVaoNhom', 'Mời bạn bè vào nhóm', 'group', 'UserPlus', '{"idNhom":"","soLuongMoiMin":10,"soLuongMoiMax":30}'),
(36, 'HDBaiVietNhom', 'Tương tác bài viết trong nhóm v1', 'group', 'MessageSquare', '{"soNhomTuongTac":2,"soBaiMoiNhom":3,"tyLeReaction":60,"reactions":["like"],"tyLeComment":20,"noiDungComment":"{Hữu ích quá|Cảm ơn admin đã duyệt bài}"}'),
(37, 'HDTuongTacNhomv2', 'Tương tác bài viết trong nhóm v2 (www)', 'group', 'MessagesSquare', '{"soNhomTuongTac":3,"soBaiMoiNhom":2,"luotThaoLuan":true,"tyLeReaction":70,"reactions":["like","love"],"tyLeComment":25,"noiDungComment":"{Tuyệt vời|Bài viết chuẩn quá}"}');

-- Nhóm 5: Tự động hóa Fanpage & Video ngắn (Pages & Reels)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(38, 'HDBuffFollowLikePage', 'Like & Follow Fanpage', 'page', 'ThumbsUp', '{"danhSachIdPage":"","soLuongMin":1,"soLuongMax":3,"likePage":true,"followPage":true}'),
(39, 'HDHuyLikePage', 'Bỏ thích (Unlike) Fanpage', 'page', 'ThumbsDown', '{"soLuongHuy":5,"danhSachIdPage":""}'),
(40, 'HDMoiLikePage', 'Mời bạn bè thích trang', 'page', 'UserCheck', '{"idPage":"","soLuongMoiMin":20,"soLuongMoiMax":50}'),
(41, 'HDBaiVietFanpage', 'Tương tác bài viết Fanpage', 'page', 'FileText', '{"idPage":"","soBaiTuongTac":3,"tyLeReaction":80,"reactions":["like","love"],"tyLeComment":30,"noiDungComment":"{Sản phẩm rất đẹp|Tư vấn giúp mình với}"}'),
(42, 'HDTaoPage', 'Tự động tạo Fanpage mới', 'page', 'FolderPlus', '{"tenPage":"{Thời trang cao cấp|Gia dụng thông minh}","danhMuc":"Mua sắm & Bán lẻ","tieuSu":"Chuyên cung cấp các mặt hàng chính hãng"}'),
(43, 'HDDanhGiaPage', 'Đánh giá & Review Page 5 sao', 'page', 'Star', '{"idPage":"","soSao":5,"noiDungDanhGia":"{Shop phục vụ rất nhiệt tình, hàng chất lượng!|Giao hàng nhanh, đóng gói cẩn thận 5 sao!}"}'),
(44, 'HDKichHoatPageVhh', 'Kích hoạt lại Page vô hiệu hóa', 'page', 'RefreshCw', '{"idPage":"","lyDoKhang":"Trang của tôi hoạt động tuân thủ chính sách, đề nghị xem xét lại."}'),
(45, 'HDTuongTacReelChiDinh', 'Tương tác Reels chỉ định', 'page', 'Play', '{"linkReel":"","thoiGianXemGiay":20,"thaTim":true,"noiDungComment":"{Video cuốn quá|Tuyệt vời shop ơi}"}'),
(46, 'HDTuongTacReelNgauNhien', 'Lướt xem Reels ngẫu nhiên', 'page', 'Tv', '{"soLuongReelMin":3,"soLuongReelMax":7,"thoiGianXemMin":10,"thoiGianXemMax":25,"tyLeThaTim":50,"tyLeComment":15,"noiDungComment":"{Haha đỉnh cao|Dễ thương ghê}"}');

-- Nhóm 6: Seeding bài viết & Tương tác chuyên sâu (Seeding & Direct Engagement)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(47, 'HDBuffLikeComment', 'Tương tác bài viết chỉ định', 'seeding', 'Target', '{"linkBaiViet":"","reactions":["like","love"],"tyLeReaction":100,"noiDungComment":"{Shop tư vấn nhiệt tình quá|Đã nhận hàng, rất ưng ý! 💖}","commentAnh":false,"thuMucAnh":""}'),
(48, 'HDTuongTacBaiVietTuKhoa', 'Tương tác bài viết theo từ khóa', 'seeding', 'Search', '{"tuKhoa":"review du lịch đà nẵng","soBaiTuongTac":3,"tyLeReaction":70,"reactions":["like"],"tyLeComment":30,"noiDungComment":"{Bài viết chi tiết quá|Cảm ơn bạn đã chia sẻ}"}'),
(49, 'HDTuongTacLivestream', 'Tăng tương tác Livestream', 'seeding', 'Radio', '{"linkLivestream":"","thoiGianXemPhut":5,"thaReactionLienTuc":true,"khoangCachReactionGiay":5,"noiDungComment":"{Mẫu 1 giá bao nhiêu shop|Cho mình xin giá sỉ với ạ}"}'),
(50, 'HDBuffTinNhanProfile', 'Nhắn tin riêng Messenger', 'seeding', 'MessageCircle', '{"danhSachUid":"","noiDungTinNhan":"{Chào bạn {name}, shop đang có ưu đãi giảm 20% hôm nay ạ!|Hi {name}, chúc bạn một ngày tốt lành! ✨}","guiAnh":false,"thuMucAnh":""}'),
(51, 'HDBuffFollowCaNhan', 'Follow tài khoản cá nhân', 'seeding', 'UserCheck', '{"danhSachUid":"","delayMin":5,"delayMax":15}'),
(52, 'HDSpamBaiViet', 'Spam bình luận hàng loạt', 'seeding', 'Megaphone', '{"danhSachLink":"","noiDungComment":"{Liên hệ Zalo 09xx để nhận quà|Inbox mình để lấy giá ưu đãi nhất nhé}","tagUid":false}'),
(53, 'HDPhanHoiBinhLuan', 'Tự động trả lời comment', 'seeding', 'CornerDownRight', '{"linkBaiViet":"","noiDungReply":"{Dạ bạn kiểm tra tin nhắn chờ giúp shop nhé!|Shop đã inbox bạn rồi ạ 💕}","dungAI":false}'),
(54, 'HDReport', 'Báo cáo vi phạm Report', 'seeding', 'AlertTriangle', '{"linkDoiTuong":"","lyDoReport":"fake_account"}');

-- Nhóm 7: Quản trị thông tin & Bảo mật tài khoản (Profile & Security)
INSERT OR IGNORE INTO Tuong_Tac (Id_TuongTac, TenTuongTac, MoTa, NhomTuongTac, Icon, DefaultCauHinh) VALUES
(55, 'HDDoiMatKhau', 'Đổi mật khẩu Facebook', 'security', 'Key', '{"kieuMatKhau":"ngau_nhien","doDaiMatKhau":12,"matKhauCoDinh":"","dangXuatThietBiKhac":true}'),
(56, 'HDDoiTen', 'Đổi tên hiển thị Facebook', 'security', 'User', '{"kieuDoiTen":"viet_nam","danhSachHo":"Nguyễn\nTrần\nLê\nPhạm","danhSachTen":"An\nBình\nCường\nDung\nHạnh\nTuấn"}'),
(57, 'HDCapNhatThongTin', 'Cập nhật Profile (Giới thiệu, Nơi ở)', 'security', 'FileEdit', '{"queQuan":"Hà Nội","noiO":"Hồ Chí Minh","noiLamViec":"Kinh doanh tự do","truongHoc":"Đại học Quốc gia"}'),
(58, 'HDUpAvatar', 'Thay ảnh đại diện Avatar', 'security', 'Image', '{"thuMucAnh":"","xoaAnhSauKhiDung":false}'),
(59, 'HDUpCover', 'Thay ảnh bìa Cover', 'security', 'Maximize2', '{"thuMucAnh":"","xoaAnhSauKhiDung":false}'),
(60, 'HDOnOff2FA', 'Bật / Tắt bảo mật 2 lớp 2FA', 'security', 'ShieldCheck', '{"hanhDong":"bat_2fa","luuSecretKeyVaoDb":true}'),
(61, 'HDAddMail', 'Thêm Email vào tài khoản', 'security', 'Mail', '{"loaiMail":"hotmail","danhSachMailPass":"","serverImap":"outlook.office365.com","portImap":993,"ganLamMailChinh":true}'),
(62, 'HDXoaSdt', 'Gỡ số điện thoại liên kết', 'security', 'PhoneOff', '{"xoaTatCaSdt":true}'),
(63, 'HDDangXuatThietBiCu', 'Đăng xuất khỏi thiết bị cũ', 'security', 'LogOut', '{"dangXuatKhoiTatCaPhien":true}'),
(64, 'HDXoaThietBiTinCay', 'Xóa thiết bị tin cậy', 'security', 'Trash', '{"xoaHetTrinhDuyetLuu":true}'),
(65, 'HDBatCheDoChuyenNghiep', 'Bật chế độ Professional Mode', 'security', 'Award', '{"batCheDo":true}'),
(66, 'HDLinkToInstagram', 'Liên kết tài khoản Instagram', 'security', 'Instagram', '{"userInstagram":"","passInstagram":""}'),
(67, 'HDHuyLienKetInstagram', 'Hủy liên kết tài khoản Instagram', 'security', 'Unlink', '{"huyLienKet":true}'),
(68, 'HDUnlockProfile', 'Mở khóa tính năng bị chặn', 'security', 'Unlock', '{"tuDongKhangNghi":true}'),
(69, 'HDScriptGemLogin', 'Tích hợp Trình duyệt GemLogin', 'security', 'Terminal', '{"gemLoginApiUrl":"http://localhost:3000","profileId":""}'),
(70, 'HDBaiVietTrenTuong', 'Tương tác bài viết trên tường cá nhân', 'security', 'FileText', '{"soBaiTuongTac":2,"tyLeReaction":80,"reactions":["love"],"tyLeComment":20,"noiDungComment":"{Kỷ niệm tuyệt vời|Ảnh đẹp quá}"}');


-- ------------------------------------------------------------------------------
-- 4.4. Khởi tạo Kịch bản mẫu đầu tiên (Kich_Ban & Hanh_Dong)
-- ------------------------------------------------------------------------------
INSERT OR IGNORE INTO Kich_Ban (Id_KichBan, TenKichBan, CauHinh, STT) VALUES
(1, 'Nuôi Nick Mới - Tương Tác Nhẹ', '{"moTa":"Kịch bản lướt newsfeed và xem story an toàn cho nick mới nhập"}', 1);

INSERT OR IGNORE INTO Hanh_Dong (Id_HanhDong, Id_KichBan, Id_TuongTac, TenHanhDong, CauHinh, STT) VALUES
(1, 1, 1, 'Lướt Newsfeed 3-5 bài', '{"soLuongBaiMin":3,"soLuongBaiMax":5,"thoiGianXemMin":10,"thoiGianXemMax":20,"tyLeReaction":60,"reactions":["like","love"],"tyLeComment":20,"noiDungComment":"{Tuyệt vời|Đẹp quá|Thú vị thật}"}', 1),
(2, 1, 4, 'Xem tin Story bạn bè', '{"soLuongStoryMin":2,"soLuongStoryMax":4,"thoiGianXemMoiStoryMin":5,"thoiGianXemMoiStoryMax":10,"tyLeThaReaction":50,"reactions":["love"]}', 2),
(3, 1, 9, 'Nghỉ giải lao 15 giây', '{"thoiGianNghiMin":10,"thoiGianNghiMax":20}', 3);

-- ==============================================================================
-- KẾT THÚC LƯỢC ĐỒ CƠ SỞ DỮ LIỆU LUSHCARE ELECTRON
-- ==============================================================================
