# TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)

---

## 1. TỔNG QUAN DỰ ÁN & MỤC TIÊU HỆ THỐNG

### 1.1. Bối cảnh
Hệ thống **LushCare** hiện tại là ứng dụng desktop phát triển trên nền tảng **C# WinForms (.NET Framework 4.8)**, sử dụng Selenium WebDriver và SQLite (System.Data.SQLite). Phần mềm phục vụ mục đích quản lý hàng nghìn tài khoản Facebook, nuôi nick tự động, seeding, tương tác nhóm, kết bạn, quản lý Fanpage và giải quyết các trường hợp checkpoint bảo mật.

Tuy nhiên, kiến trúc WinForms .NET 4.8 gặp nhiều hạn chế:
- Phụ thuộc nền tảng Windows cũ, giao diện GDI+ không còn hiện đại, giật lag khi tải bảng dữ liệu lớn (hàng chục nghìn dòng).
- Selenium WebDriver cồng kềnh, tiêu tốn nhiều RAM/CPU, dễ bị Facebook phát hiện dấu vân tay tự động hóa (`navigator.webdriver`).
- Khó mở rộng hệ sinh thái mô-đun, khó áp dụng kiến trúc component hóa hiện đại.

### 1.2. Mục tiêu chuyển đổi
Chuyển đổi toàn diện (100% Feature Parity) mã nguồn từ C# WinForms sang hệ sinh thái công nghệ hiện đại:
- **Khung ứng dụng (Core App):** Electron + Node.js (v20+ LTS).
- **Giao diện người dùng (UI Layer):** React 18, Tailwind CSS, Lucide React, Virtualized DataGrid (TanStack Virtual / React Virtualized) đảm bảo hiển thị mượt mà 50.000+ tài khoản không trễ lag.
- **Cơ sở dữ liệu (Storage):** `better-sqlite3` (truy vấn đồng bộ hiệu năng cao, thread-safe, không overhead network).
- **Tự động hóa trình duyệt (Browser Automation):** `playwright-core` kết nối trực tiếp với Chromium/Chrome qua Chrome DevTools Protocol (CDP), tùy biến tham số chống nhận diện bot (Stealth Mode), cô lập Profile tuyệt đối.
- **Đa luồng & Xử lý nền:** Node.js Worker Threads / Child Processes đảm bảo giao diện React không bao giờ bị đơ (UI Unblocking) khi chạy hàng trăm luồng song song.

---

## 2. KIẾN TRÚC HỆ THỐNG & CÔNG NGHỆ (TECH STACK)

```
+-------------------------------------------------------------------------------+
|                        LUSHCARE ELECTRON ARCHITECTURE                         |
+-------------------------------------------------------------------------------+
| [ FRONTEND LAYER - REACT 18 + TAILWIND CSS ]                                  |
| - Virtual DataGrid (TanStack Table + Virtualizer) (45 Cột, Sort, Filter)      |
| - Scenario Builder / Action Flow Designer (70+ Hành động tương tác)           |
| - Realtime Dashboard & Thread Activity Monitor                                |
| - Settings & Proxy Management Center                                          |
+---------------------------------------^---------------------------------------+
                                        | IPC Channels (contextBridge)
+---------------------------------------v---------------------------------------+
| [ ELECTRON MAIN PROCESS & NODE.JS CORE ]                                      |
| - App Lifecycle, Window Management, Tray, Hotkeys                             |
| - IPC Handlers & Dispatcher (Account, Scenario, Settings, Automation)         |
+-------------------+-----------------------------------+-----------------------+
                    |                                   |
+-------------------v-------------------+       +-------v-----------------------+
| [ DATABASE ENGINE - better-sqlite3 ]  |       | [ AUTOMATION & RUNNER ENGINE ]|
| - db_lushcare.sqlite:                 |       | - Task Pool & Thread Manager  |
|   + accounts (45 trường dữ liệu)      |       | - Playwright-Core Chromium    |
|   + files (Thư mục phân loại)         |       | - Isolated Profile Manager    |
| - interact.sqlite:                    |       | - TOTP / 2FA Engine (RFC6238) |
|   + Kich_Ban, Hanh_Dong, Tuong_Tac    |       | - Dynamic Proxy Rotator       |
| - System Settings (JSON Key-Value)    |       | - Checkpoint Solvers (282/956)|
+---------------------------------------+       +-------------------------------+
```

---

## 3. ĐẶC TẢ MÔ HÌNH DỮ LIỆU (DATABASE SCHEMA SPECIFICATION)

Hệ thống kế thừa và chuẩn hóa 2 cơ sở dữ liệu SQLite: `database/db_lushcare.sqlite` và `interact/interact.sqlite`.

### 3.1. Bảng `accounts` (Tài khoản Facebook - 45 Trường dữ liệu)
Đường dẫn: `database/db_lushcare.sqlite`

| Tên Cột | Kiểu Dữ Liệu | Khóa | Ràng Buộc | Ý Nghĩa Chức Năng |
| :--- | :--- | :--- | :--- | :--- |
| `id` | INTEGER | PK | AUTOINCREMENT | Định danh tài khoản duy nhất |
| `uid` | TEXT | | INDEX | Facebook User ID (số UID hoặc username) |
| `pass` | TEXT | | | Mật khẩu Facebook hiện tại |
| `token` | TEXT | | | Access Token Facebook (EAAB, EAAG, EAAAA...) |
| `cookie` | TEXT | | | Chuỗi Cookie phiên đăng nhập (c_user, xs, datr...) |
| `cookie1` | TEXT | | | Chuỗi Cookie dự phòng |
| `email` | TEXT | | | Email chính của tài khoản |
| `email2` | TEXT | | | Email đầy đủ (bao gồm alias/domain) |
| `email_old` | TEXT | | | Email cũ trước khi đổi |
| `passmail` | TEXT | | | Mật khẩu truy cập hộp thư Email chính |
| `passmail_old` | TEXT | | | Mật khẩu mail cũ |
| `mailrecovery` | TEXT | | | Email khôi phục (Recovery Email) |
| `passmailrecovery` | TEXT | | | Mật khẩu của email khôi phục |
| `phone` | TEXT | | | Số điện thoại gắn với tài khoản |
| `name` | TEXT | | | Tên hiển thị Facebook của tài khoản |
| `fa2` | TEXT | | | Khóa bí mật 2FA (Secret Key base32) |
| `useragent` | TEXT | | | Chuỗi User-Agent riêng biệt gắn với tài khoản |
| `proxy` | TEXT | | | Cấu hình Proxy (IP:Port hoặc IP:Port:User:Pass hoặc API Key) |
| `idfile` | INTEGER | FK | INDEX | Khóa ngoại liên kết tới `files.id` (Thư mục phân loại) |
| `friends` | TEXT | | | Số lượng bạn bè (hoặc danh sách friend count) |
| `groups` | TEXT | | | Số lượng nhóm đã tham gia |
| `pages` | TEXT | | | Số lượng Fanpage quản trị |
| `pagePro5` | TEXT | | | Số lượng Page Profile (Pro5) thuộc tài khoản |
| `follow` | TEXT | | | Số lượng người theo dõi (Followers) |
| `birthday` | TEXT | | | Ngày tháng năm sinh (dd/MM/yyyy) |
| `gender` | TEXT | | | Giới tính (Nam, Nữ, Khác) |
| `location` | TEXT | | | Quốc gia / Địa chỉ IP Location |
| `hometown` | TEXT | | | Quê quán |
| `currentCity` | TEXT | | | Thành phố / Nơi ở hiện tại |
| `job` | TEXT | | | Nghề nghiệp / Công việc khai báo |
| `dating` | TEXT | | | Trạng thái tính năng Hẹn hò (Dating) |
| `ads` | TEXT | | | Tình trạng tài khoản quảng cáo Facebook Ads |
| `bm` | TEXT | | | Tình trạng tài khoản Doanh nghiệp (Business Manager) |
| `wallPosts` | TEXT | | | Số lượng bài viết hiện có trên tường cá nhân |
| `fbBlock` | TEXT | | | Tình trạng bị Facebook chặn tính năng (chặn like, share...) |
| `avatar` | TEXT | | | Trạng thái hoặc đường dẫn Avatar cá nhân |
| `profile` | TEXT | | | Trạng thái Profile trình duyệt (Đã tạo / Chưa tạo) |
| `status` | TEXT | | | Trạng thái thực thi runtime (Đang chạy, Thành công, Lỗi...) |
| `info` | TEXT | | | Tình trạng tài khoản (Live, Die, Checkpoint 282, Checkpoint 956...) |
| `status282` | TEXT | | | Chi tiết lỗi Checkpoint 282 (ngày bị, link ảnh kháng...) |
| `interactEnd` | TEXT | | | Thời gian kết thúc lần tương tác gần nhất |
| `dateCreateAcc` | TEXT | | | Ngày tạo tài khoản Facebook |
| `dateImport` | TEXT | | | Ngày nhập tài khoản vào hệ thống |
| `kichban` | TEXT | | | Tên/ID kịch bản được gán riêng cho tài khoản |
| `infoDevice` | TEXT | | | Thông số phần cứng / Device fingerprint mô phỏng |
| `cookieHotmail` | TEXT | | | Cookie đăng nhập webmail Outlook / Hotmail |
| `ghiChu` | TEXT | | | Ghi chú tùy ý của người dùng |
| `active` | INTEGER | | DEFAULT 1 | 1: Đang hoạt động, 0: Đã chuyển vào thùng rác |
| `dateDelete` | TEXT | | | Ngày giờ chuyển vào thùng rác |
| `created_at` | TEXT | | | Thời điểm tạo bản ghi trong CSDL |
| `updated_at` | TEXT | | | Thời điểm cập nhật bản ghi gần nhất |

### 3.2. Bảng `files` (Thư mục phân loại tài khoản)
Đường dẫn: `database/db_lushcare.sqlite`

| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa |
| :--- | :--- | :--- | :--- |
| `id` | INTEGER | PK AUTOINCREMENT | ID thư mục duy nhất |
| `name` | TEXT | NOT NULL | Tên thư mục hiển thị |
| `createddate` | TEXT | | Ngày tạo thư mục |
| `active` | INTEGER | DEFAULT 1 | 1: Hiển thị, 0: Đã xóa |
| `STT` | INTEGER | | Thứ tự sắp xếp hiển thị |

### 3.3. Cơ sở dữ liệu kịch bản tương tác: `interact/interact.sqlite`

#### 3.3.1. Bảng `Kich_Ban` (Kịch bản tổng hợp)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa |
| :--- | :--- | :--- | :--- |
| `Id_KichBan` | INTEGER | PK AUTOINCREMENT | Mã định danh kịch bản |
| `TenKichBan` | TEXT | NOT NULL | Tên kịch bản tương tác (VD: Nuôi nick mới, Seeding bài viết...) |
| `CauHinh` | TEXT | | Cấu hình chung kịch bản (JSON) |
| `STT` | INTEGER | | Thứ tự sắp xếp hiển thị |

#### 3.3.2. Bảng `Hanh_Dong` (Hành động chi tiết trong kịch bản)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa |
| :--- | :--- | :--- | :--- |
| `Id_HanhDong` | INTEGER | PK AUTOINCREMENT | Mã định danh hành động |
| `Id_KichBan` | INTEGER | FK -> Kich_Ban | Liên kết tới kịch bản sở hữu |
| `Id_TuongTac` | INTEGER | FK -> Tuong_Tac | Loại hành động tương tác |
| `TenHanhDong` | TEXT | NOT NULL | Tên riêng người dùng đặt cho bước hành động |
| `CauHinh` | TEXT | | Dữ liệu tham số chi tiết (Chuỗi JSON) |
| `STT` | INTEGER | | Thứ tự thực thi từ trên xuống dưới |

#### 3.3.3. Bảng `Tuong_Tac` (Danh mục phân loại tương tác)
| Tên Cột | Kiểu Dữ Liệu | Ràng Buộc | Ý Nghĩa |
| :--- | :--- | :--- | :--- |
| `Id_TuongTac` | INTEGER | PK AUTOINCREMENT | Mã danh mục tương tác |
| `TenTuongTac` | TEXT | UNIQUE | Tên định danh mã (VD: `HDDangBai`, `HDBaiVietNewsfeed`...) |
| `MoTa` | TEXT | | Tên tiếng Việt hiển thị trên giao diện |

---

## 4. CHI TIẾT CÁC PHÂN HỆ CHỨC NĂNG (SYSTEM MODULES)

### 4.1. PHÂN HỆ QUẢN LÝ TÀI KHOẢN (ACCOUNT MANAGEMENT MODULE)

#### 4.1.1. Bảng dữ liệu ảo hóa (Virtualized DataGrid - 45 Cột)
- Sử dụng TanStack Virtual / Table để render DOM theo vùng nhìn thấy (Windowing), hỗ trợ 50.000+ tài khoản mà RAM giao diện duy trì dưới 120MB.
- **Tính năng DataGrid:**
  - Cột Checkbox đa chọn: Chọn tất cả, Đảo chọn, Chọn theo vùng (Shift + Click), Bỏ chọn.
  - Sắp xếp (Sort) đa cột, bộ lọc nhanh (Filter theo Tình trạng: Live, Die, Checkpoint, Chưa tạo profile...).
  - Tìm kiếm toàn văn theo UID, Email, Tên, Proxy, Ghi chú.
  - Cấu hình hiển thị cột: Ẩn/hiện bất kỳ cột nào trong 45 cột, lưu cấu hình vào LocalStorage/Database.
  - Kéo giãn độ rộng cột (Column Resizing), cố định cột bên trái (Sticky Pinning cho Checkbox, STT, UID).

#### 4.1.2. Thư mục phân loại (Folder Management)
- Cây thư mục hiển thị số lượng tài khoản (Tổng số nick / Nick Live / Nick Checkpoint).
- Thư mục hệ thống: `[Tất cả thư mục]`, `[Chọn nhiều thư mục]`, `[Thùng rác - Tài khoản đã xóa]`.
- Thao tác: Thêm thư mục mới, Đổi tên, Xóa thư mục (chuyển nick sang thùng rác hoặc xóa vĩnh viễn), Sắp xếp vị trí STT.

#### 4.1.3. Nhập dữ liệu tài khoản (Import Accounts)
- **Hộp thoại Import linh hoạt:**
  - Hỗ trợ định dạng có sẵn:
    1. `Uid|Pass|2FA`
    2. `Cookie`
    3. `Uid|Pass`
    4. `Uid|Pass|Token|Cookie`
    5. `Uid|Pass|Token|Cookie|Email|Pass Email`
    6. `Uid|Pass|Token|Cookie|Email|Pass Email|2FA`
  - **Trình tạo định dạng tùy chỉnh (Custom Format Builder):** Cho phép ghép tối đa 12 trường tùy chọn với dấu phân cách linh hoạt (`|`, `\t`, `:`, `,`).
  - **Xử lý trùng lặp (Duplicate Detection):**
    - Tùy chọn 1: Bỏ qua các UID đã tồn tại trong CSDL.
    - Tùy chọn 2: Ghi đè cập nhật thông tin mới nhất vào UID đã tồn tại.
  - Gán trực tiếp vào Thư mục đích hoặc tạo thư mục mới ngay khi nhập.
  - Tùy chọn tự động gán Proxy / Useragent ngẫu nhiên hoặc theo thứ tự từ danh sách kèm theo.

#### 4.1.4. Xuất & Sao chép dữ liệu (Export & Copy System)
- **Copy nhanh qua Context Menu (Right Click):**
  - Copy từng trường: UID, Pass, Token, Cookie, Email, 2FA.
  - **Mã bảo mật 6 số từ 2FA (Auto-TOTP):** Tự động giải thuật toán RFC 6238 từ Secret Key và copy mã OTP 6 số vào Clipboard ngay lập tức mà không cần mở website 2fa.live.
  - Copy định dạng ghép: `Uid|Pass`, `Uid|Pass|2FA`, `Mail|Pass Mail`, `Email|PassMail|MailKp|Pass MailKp`, `Uid|Pass|Token|Cookie|Mail|Pass Mail`, `Uid|Pass|Token|Cookie|Mail|Pass Mail|2FA`.
- **Hộp thoại Export Custom:**
  - Chọn các cột cần xuất, định dạng phân cách, xuất ra file TXT hoặc CSV.

#### 4.1.5. Cập nhật dữ liệu hàng loạt (Batch Data Updates)
- Cập nhật Mật khẩu, Token, Cookie, Proxy, Useragent, Email/PassMail, Mail khôi phục, Tình trạng, Ghi chú, Kịch bản gán.
- Chuyển thư mục (Move Folder) hoặc Sao chép tài khoản sang thư mục khác (Copy to Folder).
- Khôi phục Email trước đó (`email_old` -> `email`).

#### 4.1.6. Thùng rác & Giải phóng dung lượng (Trash & Disk Cleanup)
- **Tài khoản đã xóa:** Xem danh sách nick đã xóa (`active = 0`), có thể Khôi phục về thư mục ban đầu hoặc Xóa vĩnh viễn khỏi CSDL.
- **Giải phóng dung lượng Profile (Profile Cleaner):**
  - Xóa toàn bộ thư mục Chrome Profile của các tài khoản đã chọn.
  - Xóa bộ nhớ cache, cookies tạm, crash reports để giải phóng hàng chục GB dung lượng ổ cứng SSD.

---

### 4.2. PHÂN HỆ TỰ ĐỘNG HÓA TRÌNH DUYỆT (BROWSER AUTOMATION & PLAYWRIGHT CORE)

#### 4.2.1. Quản lý vòng đời Chrome & Cô lập Profile (Profile Isolation)
- Mỗi tài khoản Facebook sở hữu một thư mục Profile Chromium riêng biệt tại `profiles/{uid}`.
- Cơ chế khởi tạo thông qua `playwright-core` kết nối trực tiếp Chromium:
  - Stealth Flag: `--disable-blink-features=AutomationControlled`, xóa cờ `navigator.webdriver`.
  - Tối ưu tài nguyên: Cờ `--disable-webgl`, `--disable-3d-apis`, `--disable-webrtc`, `--mute-audio`, tùy chọn tắt tải hình ảnh (`--blink-settings=imagesEnabled=false`) giúp tiết kiệm 70% băng thông mạng và RAM.
  - Sắp xếp cửa sổ Chrome dạng lưới (Grid Tiling): Tự động tính toán tọa độ `(X, Y, Width, Height)` chia đều theo màn hình dựa vào cấu hình số Hàng (Rows) và số Cột (Columns).

#### 4.2.2. Cơ chế nạp Cookie & Đăng nhập thông minh (Cookie Injection & Smart Login)
- **4 Kiểu đăng nhập:**
  1. `Cookie`: Nạp trực tiếp danh sách Cookie (`c_user`, `xs`, `fr`, `datr`...) vào Browser Context trước khi điều hướng trang.
  2. `Uid|Pass`: Tự động tìm input login trên giao diện Facebook, điền UID và Mật khẩu với tốc độ gõ người thật (Human-like typing delay 50-150ms).
  3. `Email|Pass`: Tương tự Uid|Pass nhưng sử dụng trường Email.
  4. `Cookie>Pass` (Khuyên dùng): Ưu tiên nạp Cookie, kiểm tra tính hợp lệ của phiên; nếu Cookie chết hoặc hết hạn, tự động fallback sang Uid/Pass + 2FA và trích xuất lưu lại Cookie mới.
- **4 Giao diện Facebook hỗ trợ:**
  1. `m.fb` (`https://m.facebook.com` - Nhẹ, ít tốn tài nguyên).
  2. `www` (`https://www.facebook.com` - Giao diện Desktop chuẩn).
  3. `mbasic` (`https://mbasic.facebook.com` - Siêu nhẹ, vượt rào cản mạng yếu).
  4. `www->m.fb` (Vào www để lấy session rồi chuyển m.fb).

#### 4.2.3. Tự động giải mã 2FA & Vượt màn hình xác thực
- Tích hợp thư viện sinh mã OTP chuẩn RFC 6238 TOTP (SHA1, 6 chữ số, chu kỳ 30s) từ Secret Key `cFa2`.
- Tự động nhận diện selector ô nhập mã: `input[name='approvals_code']`, `input[autocomplete='one-time-code']`.
- Điền OTP và kích hoạt nút `checkpointSubmitButton` / "Tiếp tục" / "Đây là tôi" / "Lưu trình duyệt" hoàn toàn tự động.

#### 4.2.4. Phân hệ giải Checkpoint tự động (282 & 956 Solvers)
- **Checkpoint 282 (Vô hiệu hóa tạm thời / Bắt gửi ảnh & số điện thoại):**
  - Tự động vượt Captcha: Tích hợp API **2Captcha** và **CapSolver**.
  - Tự động thuê số điện thoại và lấy mã OTP SMS qua API các cổng:
    - `viotp.com`, `fastsim.online`, `otp282.com`, `chothuesimcode.com`, `codetext247.com`, `funotp.com`, `otptextnow.com`, `thuesim.app`, `codeotp.site`.
  - Tự động lấy ảnh selfie chân dung ngẫu nhiên từ thư mục chỉ định hoặc kho ảnh AI để gửi kháng cáo.
  - Tùy chọn đổi mật khẩu mới sau khi kháng.
- **Checkpoint 956 (Két sắt / Xác minh danh tính):**
  - Hỗ trợ mở khóa bằng cách mở Chrome để người dùng thao tác hoặc giải tự động qua Cookie.
  - Tự động đăng nhập Hotmail qua IMAP để đọc mã xác nhận gửi về email.
  - Tự động xuất danh sách Link 956 lưu ra file để xử lý dịch vụ.

---

### 4.3. PHÂN HỆ PROXY & ĐỔI IP (PROXY & IP ROTATION SYSTEM)

Hỗ trợ quản lý và xoay IP độc lập cho từng luồng xử lý:

| Loại Proxy / Dịch vụ | Giao thức | Cơ chế Xoay IP (Change IP Method) |
| :--- | :--- | :--- |
| **Proxy Tĩnh (Static)** | HTTP / SOCKS5 | Gán cố định vào từng tài khoản (Định dạng: `IP:Port` hoặc `IP:Port:User:Pass`). |
| **MinProxy** | HTTP / SOCKS5 | Gọi API GET/POST đổi IP (`https://api.minproxy.vn/...`), tự động lấy IP:Port mới và đợi thời gian chờ xoay (cooldown). |
| **ShopLike** | HTTP | Gọi API key ShopLike (`http://proxy.shoplike.vn/Api/...`), xoay IP theo vị trí tỉnh thành. |
| **XProxy (X-KVM Dongle)** | HTTP / SOCKS5 | Gửi lệnh reset thiết bị USB qua Endpoint XProxy (`http://xproxy_host/reset?proxy=IP:Port`). Tự động xử lý lỗi `reset_too_much`. |
| **OBC Proxy** | HTTP / SOCKS5 | Reset Hub Dcom OBC qua API URL (`http://obc_host/reset?proxy=...`). |
| **Dcom 3G/4G** | USB Hilink / RAS | Ngắt kết nối và kết nối lại Dcom USB cắm trực tiếp trên máy tính qua Hilink API hoặc rasdial shell. |
| **VPN / SSH** | SSH / App CLI | Tích hợp script đổi IP qua SSH Client, NordVPN CLI, ExpressVPN CLI, Hotspot Shield. |

- **Quản lý giới hạn luồng per Proxy:** Cho phép cấu hình tối đa $N$ luồng chạy đồng thời trên 1 Proxy; khi đủ số tài khoản hoàn thành, tự động kích hoạt xoay IP cho lượt tiếp theo.
- **Kiểm tra rò rỉ IP (Leak Prevention):** Kiểm tra IP công khai qua `api.ipify.org` trước khi mở trình duyệt; nếu IP trùng hoặc lỗi proxy, dừng luồng cảnh báo.

---

### 4.4. ĐẶC TẢ CHI TIẾT 70 HÀNH ĐỘNG KỊCH BẢN (INTERACTIVE SCENARIOS - 100% PARITY)

Mỗi hành động trong C# tương ứng với một form `fHD*.cs`, lưu cấu hình JSON trong `Hanh_Dong.CauHinh`. Hệ thống mới chuyển đổi 100% sang các module runner tương ứng.

#### 4.4.1. Nhóm 1: Tương tác cá nhân & Nuôi dưỡng bảng tin (Feed & Personal)
1. **`fHDBaiVietNewsfeed` (Lướt Newsfeed v1):** Cuộn bảng tin trang chủ, dừng đọc bài ngẫu nhiên theo thời gian cấu hình, thả reaction ngẫu nhiên theo tỷ lệ %, tự động comment nội dung hỗ trợ cú pháp Spin `{a|b|c}`.
2. **`fHDBaiVietNewsfeed2` (Lướt Newsfeed v2):** Tối ưu hóa điều hướng m.fb/www, phát hiện bài viết tài trợ (Sponsored), theo dõi bài viết bạn bè trên bảng tin.
3. **`fHDBaiVietNewsfeed3` (Lướt Newsfeed v3 Nâng cao):** Bổ sung bộ lọc tương tác theo từ khóa bài viết, bỏ qua bài viết chứa từ khóa tiêu cực, chia sẻ bài viết về tường cá nhân.
4. **`fHDXemStory` (Xem tin Story):** Click xem Story bạn bè/gợi ý, cấu hình thời gian xem mỗi story (giây), thả tim/like story, gửi icon phản hồi nhanh.
5. **`fHDXemWatch` (Xem video Watch):** Truy cập Facebook Watch, xem video theo thời lượng ngẫu nhiên (VD: 30 - 90s), like video, comment video theo danh sách.
6. **`fHDDocThongBao` (Đọc thông báo Notifications):** Bấm mở danh sách thông báo, click đọc ngẫu nhiên $N$ thông báo chưa đọc để giả lập hành vi người thật.
7. **`fHDChocBanBe` (Chọc bạn bè - Poke):** Truy cập mục `pokes`, chọc lại bạn bè đã chọc mình hoặc chọc danh sách bạn bè gợi ý.
8. **`fHDChucMungSinhNhat` (Chúc mừng sinh nhật):** Quét danh sách bạn bè có sinh nhật hôm nay, tự động gửi tin nhắn Messenger hoặc đăng lời chúc lên tường kèm spin text `{Chúc bạn sinh nhật vui vẻ|Happy Birthday nha!}`.
9. **`fHDNghiGiaiLao` (Nghỉ giải lao giữa các hành động):** Cho luồng dừng tạm thời trong khoảng thời gian từ $A$ đến $B$ giây trước khi thực thi bước kế tiếp.
10. **`fHDTimKiemGoogle` (Tìm kiếm từ khóa Google):** Mở tab mới vào Google.com, gõ từ khóa tìm kiếm, lướt kết quả, click ngẫu nhiên vào link web mục tiêu và cuộn trang (tạo lịch sử cookie tự nhiên).
11. **`fHDTruyCapWebsite` (Duyệt web bên ngoài):** Mở trang web chỉ định (báo chí, thương mại điện tử), lướt và xem bài viết trong thời gian chỉ định để tích lũy cookie quảng cáo của Facebook Pixel.
12. **`fHDKhangSpam` (Kháng spam vi phạm):** Tự động phát hiện thông báo bị chặn tính năng (chặn like/comment), bấm nút "Báo cáo sự cố" / "Gửi phản hồi" để xin mở khóa.

#### 4.4.2. Nhóm 2: Đăng bài & Sáng tạo nội dung (Posting & Creative Content)
13. **`fHDDangBai` (Đăng bài tổng hợp):** Đăng bài viết lên tường cá nhân, Fanpage hoặc Group. Hỗ trợ nội dung text (spin text đa tầng), đăng kèm danh sách ảnh ngẫu nhiên từ thư mục, video, tùy chỉnh gắn thẻ (tag bạn bè).
14. **`fHDDangStatus` (Đăng Status m.fb):** Đăng dòng trạng thái nhanh trên giao diện di động.
15. **`fHDDangStatusV2` (Đăng Status nâng cao):** Hỗ trợ chọn phông nền màu (background text), cảm xúc (feeling/activity), chế độ quyền riêng tư (Công khai, Bạn bè, Chỉ mình tôi).
16. **`fHDDangReel` (Đăng video ngắn Facebook Reels):** Tải video ngắn lên Facebook Reels, gắn tiêu đề/mô tả kèm hashtag (`#trending`, `#reels`), tùy chỉnh âm thanh.
17. **`fHDDangStory` (Đăng tin Story):** Đăng ảnh hoặc video ngắn biến mất sau 24h lên Story cá nhân.
18. **`fHDShareBai` (Chia sẻ bài viết):** Share link bài viết chỉ định về tường cá nhân, share vào các nhóm đã tham gia (có tùy chọn kèm caption hoặc không kèm caption).
19. **`fHDSharePage` (Share quyền quản trị Page):** Tự động thêm UID khác làm Admin/Biên tập viên của Fanpage Pro5 hoặc Page truyền thống.
20. **`fHDUptopBaiViet` (Đẩy top bài viết cũ):** Tìm bài viết cũ đã đăng trong nhóm/tường, tự động comment ký tự/icon để đẩy bài lên đầu bảng tin nhóm.
21. **`fHDXoaBaiTuong` (Xóa bài viết trên tường):** Quét tường cá nhân và xóa các bài viết cũ theo số lượng chỉ định hoặc xóa bài trước một mốc ngày nhất định.

#### 4.4.3. Nhóm 3: Tự động hóa bạn bè (Friends Automation)
22. **`fHDKetBanGoiY` (Kết bạn theo gợi ý Facebook):** Tự động gửi lời mời kết bạn cho danh sách Facebook đề xuất, lọc theo điều kiện: có bạn chung, có avatar.
23. **`fHDKetBanTepUid` (Kết bạn theo tệp UID):** Nhập danh sách UID mục tiêu, tự động truy cập profile từng UID và bấm Kết bạn; tự động ghi nhận số lượng kết bạn thành công.
24. **`fHDKetBanTheoTuKhoa` (Kết bạn theo từ khóa tìm kiếm):** Tìm kiếm người dùng theo nghề nghiệp, khu vực, sở thích và gửi lời mời kết bạn.
25. **`fHDKetBanThanhVienNhom` (Kết bạn thành viên nhóm):** Quét danh sách thành viên trong nhóm chỉ định, lọc thành viên tích cực và gửi lời mời kết bạn.
26. **`fHDKetBanVoiBanBeCuaUid` (Kết bạn với bạn bè của UID):** Vào mục bạn bè của một tài khoản mục tiêu (KOLs/đối thủ) và gửi lời mời kết bạn với tệp bạn bè đó.
27. **`fHDXacNhanKetBan` (Chấp nhận lời mời kết bạn):** Tự động đồng ý các lời mời kết bạn đang chờ, ưu tiên người có bạn chung hoặc ảnh đại diện.
28. **`fHDHuyLoiMoiKetBan` (Hủy lời mời đã gửi):** Tự động thu hồi các yêu cầu kết bạn đã gửi quá $N$ ngày mà đối phương không đồng ý để không bị Facebook chặn tính năng.
29. **`fHDHuyKetBan` (Hủy kết bạn Unfriend):** Hủy kết bạn theo danh sách UID chỉ định hoặc tự động quét lọc bạn bè không tương tác trong 3 tháng.
30. **`fHDBaiVietBanBe` (Tương tác tường bạn bè):** Truy cập trang cá nhân của bạn bè trong danh sách, thả reaction và comment bài viết mới nhất của họ.

#### 4.4.4. Nhóm 4: Tự động hóa hội nhóm (Groups Automation)
31. **`fHDThamGiaNhomGoiY` (Tham gia nhóm gợi ý):** Gửi yêu cầu gia nhập các nhóm do Facebook đề xuất trên tab Group.
32. **`fHDThamGiaNhomTuKhoa` (Tham gia nhóm theo từ khóa):** Tìm kiếm nhóm theo từ khóa (VD: "Bất động sản", "Thanh lý"), lọc nhóm công khai/nhóm kín, số lượng thành viên tối thiểu.
33. **`fHDThamGiaNhomUid` (Tham gia nhóm theo danh sách UID):** Nhập tệp ID nhóm, tự động vào nhóm kèm tính năng **Tự động trả lời câu hỏi xét duyệt** và đồng ý quy tắc nhóm.
34. **`fHDRoiNhom` (Rời nhóm):** Tự động thoát khỏi các nhóm: nhóm bị kiểm duyệt bài viết, nhóm ít thành viên, hoặc danh sách ID nhóm chỉ định.
35. **`fHDMoiBanBeVaoNhom` (Mời bạn bè vào nhóm):** Chọn nhóm mình sở hữu/quản lý, tự động tích chọn và gửi lời mời tham gia nhóm cho toàn bộ bạn bè.
36. **`fHDBaiVietNhom` (Tương tác bài viết trong nhóm v1):** Lướt các nhóm đã tham gia, tìm bài viết ngẫu nhiên để like và comment thảo luận.
37. **`fHDTuongTacNhomv2` (Tương tác bài viết nhóm www v2):** Tối ưu hóa trên giao diện www, cuộn bài viết thảo luận trong nhóm, phản hồi các bài đăng mới nhất.

#### 4.4.5. Nhóm 5: Tự động hóa Fanpage & Video ngắn (Pages & Reels)
38. **`fHDBuffFollowLikePage` (Like & Follow Fanpage):** Truy cập link/ID Fanpage và bấm nút Like / Follow trang.
39. **`fHDHuyLikePage` (Bỏ like Fanpage):** Quét danh sách page đã like và tự động Unlike các trang không còn nhu cầu.
40. **`fHDMoiLikePage` (Mời bạn bè thích trang):** Mở popup mời thích trang của Fanpage mục tiêu, tự động mời bạn bè.
41. **`fHDBaiVietFanpage` (Tương tác bài viết Fanpage):** Truy cập Fanpage mục tiêu, lướt và tương tác like/comment các bài đăng mới nhất.
42. **`fHDTaoPage` (Tự động tạo Fanpage mới):** Tự động điền Tên Page, Danh mục (Category), Tiểu sử (Bio), tự động tạo thành công Fanpage Pro5.
43. **`fHDDanhGiaPage` (Đánh giá & Review Page 5 sao):** Vào mục đánh giá của Page, chọn 5 sao và đăng nội dung review khen ngợi có spin text.
44. **`fHDKichHoatPageVhh` (Kích hoạt lại Page vô hiệu hóa):** Gửi yêu cầu kháng nghị khôi phục quyền quản trị đối với các page bị tạm khóa tính năng.
45. **`fHDTuongTacReelChiDinh` (Tương tác Reels chỉ định):** Xem link Reel cụ thể, thả cảm xúc, comment và share lên tường.
46. **`fHDTuongTacReelNgauNhien` (Lướt xem Reels ngẫu nhiên):** Chuyển sang tab Reels, cuộn xem liên tục $N$ video ngắn, like và comment ngẫu nhiên.

#### 4.4.6. Nhóm 6: Seeding bài viết & Tương tác chuyên sâu (Seeding & Direct Engagement)
47. **`fHDBuffLikeComment` (Tương tác bài viết chỉ định):** Seeding bài viết mục tiêu (bài bán hàng/chạy ads) bằng danh sách cảm xúc (Like, Love, Haha, Wow...), comment nội dung văn bản (spin text, tag người khác) và comment hình ảnh từ thư mục.
48. **`fHDTuongTacBaiVietTuKhoa` (Tương tác bài viết theo từ khóa):** Tìm từ khóa trên ô tìm kiếm Facebook, chọn tab Bài viết (Posts), like và comment các bài viết thảo luận về chủ đề đó.
49. **`fHDTuongTacLivestream` (Tăng tương tác Livestream):** Xem video trực tiếp đang phát, duy trì thời gian xem (giữ mắt xem), thả reaction liên tục và comment theo kịch bản bán hàng.
50. **`fHDBuffTinNhanProfile` (Nhắn tin riêng Messenger):** Gửi tin nhắn chào hỏi, CSKH hoặc giới thiệu dịch vụ đến danh sách UID profile, hỗ trợ chèn tên người nhận `{name}` và đính kèm ảnh.
51. **`fHDBuffFollowCaNhan` (Follow tài khoản cá nhân):** Bấm theo dõi tài khoản cá nhân (KOLs/Profile mục tiêu).
52. **`fHDSpamBaiViet` (Spam bình luận hàng loạt):** Đăng bình luận quảng bá lên hàng loạt bài viết trên các Group hoặc Fanpage mục tiêu.
53. **`fHDPhanHoiBinhLuan` (Tự động trả lời comment):** Quét các comment trên bài viết của mình và tự động reply lại bằng văn bản hoặc mẫu câu AI.
54. **`fHDReport` (Báo cáo vi phạm Report):** Tự động gửi báo cáo vi phạm đối với UID lừa đảo, Page mạo danh hoặc bài viết tiêu cực.

#### 4.4.7. Nhóm 7: Quản trị thông tin & Bảo mật tài khoản (Profile & Security)
55. **`fHDDoiMatKhau` (Đổi mật khẩu):** Tự động vào cài đặt bảo mật Facebook, đổi sang mật khẩu mới (tự đặt hoặc ngẫu nhiên), cập nhật trực tiếp vào CSDL cột `pass` và lưu `pass_old`.
56. **`fHDDoiTen` (Đổi tên hiển thị):** Đổi Họ và Tên theo danh sách tên Việt Nam hoặc tên nước ngoài ngẫu nhiên.
57. **`fHDCapNhatThongTin` (Cập nhật Profile):** Thay đổi thông tin Giới thiệu, Quê quán, Nơi ở hiện tại, Nơi làm việc, Trường học, Sở thích.
58. **`fHDUpAvatar` (Thay ảnh đại diện Avatar):** Tự động chọn ảnh từ thư mục ảnh chân dung trên máy tính, cắt ảnh và tải lên làm Avatar Facebook.
59. **`fHDUpCover` (Thay ảnh bìa Cover):** Tải ảnh từ thư mục làm ảnh bìa timeline.
60. **`fHDOnOff2FA` (Bật / Tắt bảo mật 2 lớp 2FA):** Tự động bật xác thực 2 yếu tố, lấy mã QR/chuỗi bí mật Secret Key, sinh mã OTP xác minh, lưu Secret Key vào cột `fa2`.
61. **`fHDAddMail` (Thêm Email vào tài khoản):** Nhập email mới, gửi yêu cầu thêm mail, tự động đăng nhập hộp thư Hotmail/Gmail qua giao thức IMAP lấy mã OTP 5 số và xác thực thành công; gán làm email chính.
62. **`fHDXoaSdt` (Gỡ số điện thoại):** Gỡ số điện thoại liên kết để tránh checkpoint hoặc bảo mật lại tài khoản.
63. **`fHDDangXuatThietBiCu` (Đăng xuất khỏi thiết bị cũ):** Đăng xuất toàn bộ các phiên đăng nhập lạ trên các trình duyệt/thiết bị khác.
64. **`fHDXoaThietBiTinCay` (Xóa thiết bị tin cậy):** Xóa danh sách trình duyệt đã lưu trong mục bảo mật tài khoản.
65. **`fHDBatCheDoChuyenNghiep` (Bật chế độ Professional Mode):** Nâng cấp tài khoản cá nhân lên chế độ chuyên nghiệp để kiếm tiền và hiển thị bảng điều khiển nhà sáng tạo.
66. **`fHDLinkToInstagram` (Liên kết Instagram):** Kết nối tài khoản Facebook với tài khoản Instagram trong Trung tâm tài khoản (Accounts Center).
67. **`fHDHuyLienKetInstagram` (Hủy liên kết Instagram):** Gỡ bỏ tài khoản Instagram khỏi Facebook.
68. **`fHDUnlockProfile` (Mở khóa tính năng bị chặn):** Tự động xử lý kháng nghị mở khóa các tính năng tài khoản bị hạn chế.
69. **`fHDScriptGemLogin` (Tích hợp Trình duyệt GemLogin):** Điều khiển profile thông qua cổng API Antidetect GemLogin bên thứ ba.
70. **`fHDDangBaiTrenTuong` / `fHDBaiVietTrenTuong` (Tương tác bài viết trên tường):** Quét tường cá nhân của chính tài khoản hoặc tài khoản chỉ định để thả reaction và viết bài.

---

### 4.5. PHÂN HỆ CẤU HÌNH, ĐIỀU PHỐI & LẬP LỊCH (SETTINGS & SCHEDULER)

#### 4.5.1. Cấu hình Chung (General Settings)
- Đường dẫn thực thi Chromium (Chrome mặc định hoặc bản Portable tùy chỉnh).
- Số luồng chạy đồng thời (Threads per session: 1 - 50 luồng).
- Kích thước cửa sổ trình duyệt (Window Width x Height).
- Cấu hình sắp xếp lưới màn hình: Số hàng x Số cột (VD: 2x3, 3x4).
- Khoảng cách chờ mở và đóng trình duyệt (Delay open/close: ngẫu nhiên $X - Y$ giây).
- Tùy chọn ẩn trình duyệt (Headless Mode) hoặc chạy có giao diện trực quan.
- Tùy chọn tự động thêm Chrome vào khung theo dõi nội bộ.

#### 4.5.2. Cấu hình Tương tác đa luồng (Interaction Settings)
- Lựa chọn Kịch bản chạy: Chạy 1 kịch bản chung cho tất cả các nick, hoặc chạy kịch bản riêng được gán theo từng dòng tài khoản (`ckbChayKichBanDaGan`).
- Giới hạn thời gian chạy cho mỗi tài khoản (Timeout per Account) và mỗi kịch bản (Timeout per Scenario).
- Tùy chọn xáo trộn thứ tự tài khoản trước khi chạy (Random Order).
- Chạy lặp lại toàn bộ tài khoản sau khi hoàn thành (Loop Mode): Số lượt chạy lặp, khoảng thời gian nghỉ giữa các lượt.
- Hành vi trước khi chạy: Tự động xóa cache, xóa profile cũ, kiểm tra trạng thái UID Live trước khi mở.
- Hành vi sau khi chạy: Đăng xuất tài khoản, tự động cập nhật lại các thông số mới (Avatar, Friend, Group, Follow, Name...) vào CSDL.

#### 4.5.3. Lập lịch tương tác tự động (Scheduler Module)
- Lập lịch tự động kích hoạt kịch bản theo ngày & giờ cụ thể (`dd/MM/yyyy HH:mm`).
- Chu kỳ lặp: Chạy hàng ngày, Chạy ngày chẵn, Chạy ngày lẻ, hoặc ngày chỉ định trong tuần.
- Tự động gán kịch bản và danh sách thư mục tài khoản tương ứng vào từng khung giờ hẹn.

#### 4.5.4. Tích hợp Trí tuệ nhân tạo (AI Content Generation)
- Hỗ trợ 2 nhà cung cấp API: **Google Gemini API** và **OpenAI ChatGPT API**.
- Quản lý kho Prompt templates:
  1. Prompt tạo bình luận theo ngữ cảnh bài viết: Sử dụng biến placeholder `{content}` để AI phân tích nội dung bài gốc và sinh bình luận tự nhiên, hài hước, kích thích tương tác dưới 70 ký tự.
  2. Prompt trả lời tin nhắn Messenger CSKH.
  3. Prompt sáng tạo status thả thính, bài viết theo chủ đề.
- Kiểm tra trực tiếp Prompt và API Key trên giao diện tiện ích (`fTienIchChatGPT`, `fCauHinhAI`).

#### 4.5.5. Phân hệ Tiện ích mở rộng (Utility Tools)
1. **Tìm kiếm UID từ Link Facebook (`fTienIchFindIdFb`):** Chuyển đổi link profile, group, fanpage thành số UID bằng request API.
2. **Kiểm tra Live/Die UID hàng loạt (`fTienIchCheckLiveUid`):** Check trạng thái hoạt động của hàng nghìn UID Facebook qua Graph API hoặc mobile web mà không cần đăng nhập nick.
3. **Kiểm tra tài khoản Hotmail / Outlook (`fTienIchCheckImapHotmail`):** Quét hàng loạt mail xem có mở cổng IMAP không, kiểm tra tình trạng Live/Die của hộp thư.
4. **Kiểm tra Proxy (`fTienIchCheckProxy`):** Kiểm tra trạng thái sống/chết của danh sách Proxy, đo tốc độ ping (ms), vị trí địa lý quốc gia.
5. **Kiểm tra trạng thái thiết bị XProxy (`fTienIchCheckStatusXProxy`):** Kiểm tra trạng thái kết nối mạng của từng cổng USB Dcom trên thiết bị phần cứng XProxy.
6. **Công cụ Lọc trùng (`fTienIchLocTrung`):** Loại bỏ các dòng văn bản trùng lặp trong tệp dữ liệu lớn.
7. **Trình kiểm tra Spin Content (`fTienIchTestSpinContent`):** Xem trước các biến thể văn bản ngẫu nhiên từ cú pháp spin dạng `{lựa chọn 1|lựa chọn 2|lựa chọn 3}`.

---

## 5. USER STORIES & ACCEPTANCE CRITERIA (GIVEN - WHEN - THEN)

### User Story 1: Nhập và phân loại 10.000 tài khoản vào thư mục
> **As a** Nhà quản lý hệ thống tài khoản Facebook số lượng lớn,  
> **I want to** nhập hàng loạt tài khoản với định dạng tùy chỉnh và phân bổ vào thư mục mục tiêu,  
> **So that** dữ liệu tài khoản được tổ chức khoa học, ngăn ngừa trùng lặp và sẵn sàng cho các chiến dịch tương tác.

- **Acceptance Criteria (Given - When - Then):**
  - **Given:** Người dùng đang ở màn hình chính và nhấn nút "Thêm tài khoản" (Import).
  - **When:** Người dùng dán danh sách 10.000 dòng tài khoản theo định dạng `UID|Pass|2FA|Cookie`, chọn thư mục đích "Clone Ngoại", tích chọn "Không nhập tài khoản trùng UID" và nhấn "Thêm".
  - **Then:** Hệ thống phân tích từng dòng trong tiến trình nền, lưu các tài khoản hợp lệ vào bảng `accounts` trong SQLite với `active=1`, `idfile` tương ứng với thư mục; bỏ qua các bản ghi trùng UID; hiển thị thanh tiến trình realtime và cập nhật số lượng nick trên giao diện Virtual DataGrid trong thời gian không quá 3 giây.

---

### User Story 2: Tự động nạp Cookie, đăng nhập và vượt 2FA
> **As a** Kỹ thuật viên nuôi nick,  
> **I want to** hệ thống tự động mở trình duyệt Chrome, nạp Cookie phiên hoặc tự động gõ thông tin tài khoản và giải mã OTP 2FA,  
> **So that** tài khoản đăng nhập thành công vào Facebook mà không bị checkpoint và không cần sự can thiệp thủ công.

- **Acceptance Criteria (Given - When - Then):**
  - **Given:** Tài khoản có trường `uid`, `pass`, `fa2` và `cookie` đã gán trong CSDL, cấu hình đăng nhập là `Cookie>Pass`.
  - **When:** Lệnh "Mở trình duyệt" hoặc hành động kịch bản được kích hoạt.
  - **Then:** Playwright khởi tạo Chromium với Profile độc lập, cấu hình User-Agent và Proxy tương ứng; nạp cookie vào context; nếu session hết hạn, trang tự điều hướng đến form đăng nhập, hệ thống tự động gõ UID và Mật khẩu, nhận diện màn hình yêu cầu mã xác thực 2 bước, dùng thuật toán TOTP tính mã 6 số từ trường `fa2`, điền mã và bấm xác nhận, lưu lại cookie mới nhất vào CSDL và cập nhật trạng thái "Live".

---

### User Story 3: Xoay IP động qua cổng API MinProxy / XProxy
> **As a** Chuyên viên tự động hóa,  
> **I want to** hệ thống tự động gọi API đổi địa chỉ IP sau mỗi chu kỳ $N$ tài khoản hoàn thành,  
> **So that** các tài khoản không bị Facebook đánh dấu bất thường vì đăng nhập từ cùng một địa chỉ IP.

- **Acceptance Criteria (Given - When - Then):**
  - **Given:** Cấu hình đổi IP được thiết lập là "MinProxy", giới hạn số luồng chạy trên 1 IP là 3 luồng, API Key đã được khai báo.
  - **When:** 3 tài khoản đầu tiên kết thúc kịch bản tương tác.
  - **Then:** Bộ điều phối luồng (Thread Dispatcher) tạm dừng mở tài khoản mới, gửi request đến API đổi IP của MinProxy, chờ phản hồi IP mới và thời gian cooldown xác nhận kết nối thành công, sau đó mới tiếp tục cấp phát IP mới cho đợt 3 tài khoản kế tiếp.

---

### User Story 4: Thiết lập và thực thi Kịch bản tương tác đa hành động
> **As a** Nhà tiếp thị số (Marketer),  
> **I want to** tạo một kịch bản gồm nhiều bước (Lướt Newsfeed -> Xem Story -> Đăng bài -> Nghỉ giải lao),  
> **So that** tài khoản tự động thao tác tuần tự như người dùng thật.

- **Acceptance Criteria (Given - When - Then):**
  - **Given:** Người dùng mở trình quản lý kịch bản tương tác và chọn "Thêm kịch bản mới".
  - **When:** Người dùng thêm 3 hành động: `HDBaiVietNewsfeed` (lướt 3-5 bài), `HDXemStory` (xem 2-3 tin), `HDDangBai` (đăng 1 bài kèm ảnh từ thư mục `C:/Images`), kéo thả sắp xếp đúng thứ tự và nhấn "Lưu".
  - **Then:** Hệ thống ghi nhận 1 bản ghi vào bảng `Kich_Ban` và 3 bản ghi vào bảng `Hanh_Dong` với chuỗi `CauHinh` JSON chuẩn xác; khi bấm "Chạy tương tác", worker thread duyệt tuần tự 3 hành động này theo đúng tham số đã định nghĩa.

---

## 6. BẢNG ĐỐI CHIẾU 100% TÍNH NĂNG (WINFORMS VS LUSHCARE ELECTRON)

| STT | Tên Tính Năng (WinForms C#) | File Mã Nguồn WinForms | Mô-đun Tương Đương trên LushCare Electron | Ghi Chú Cải Tiến |
| :---: | :--- | :--- | :--- | :--- |
| **1** | Màn hình chính & Bảng tài khoản | `fMain.cs`, `fMain.resx` | `src/renderer/components/DataGrid/AccountTable.tsx` | Virtualized Table, 60fps mượt mà |
| **2** | Nhập tài khoản đa định dạng | `fImportAccount.cs`, `fImportAccountFormatInput.cs` | `src/renderer/components/Modals/ImportAccountModal.tsx` | UI kéo thả, tự nhận diện định dạng thông minh |
| **3** | Copy & Xuất tài khoản tùy chỉnh | `fCopy.cs`, `fExportAccount.cs` | `src/renderer/components/Modals/ExportAccountModal.tsx` | Tích hợp tính năng Copy TOTP tức thì |
| **4** | Cập nhật dữ liệu hàng loạt | `fCapNhatDuLieu.cs`, `fUpdateData.cs` | `src/renderer/components/Modals/BatchUpdateModal.tsx` | Batch update trong single SQLite transaction |
| **5** | Quản lý Thư mục tài khoản | `fAddFile.cs`, `fEditFile.cs`, `fChuyenThuMuc.cs` | `src/renderer/components/Sidebar/FolderTree.tsx` | Drag & Drop di chuyển tài khoản giữa thư mục |
| **6** | Thùng rác & Tài khoản đã xóa | `fTaiKhoanDaXoa.cs` | `src/renderer/pages/TrashBinPage.tsx` | Khôi phục 1-click hoặc dọn dẹp vĩnh viễn |
| **7** | Dọn dẹp Profile & Cache ổ đĩa | `fClearProfile.cs`, `fGiaiPhongDungLuong.cs` | `src/main/services/browser/profileCleaner.ts` | Tự động tính toán dung lượng giải phóng |
| **8** | Nhân điều khiển Chrome & Playwright | `Chrome.cs`, `CommonChrome.cs`, `AutoControl.cs` | `src/main/services/browser/playwrightManager.ts` | Thay thế Selenium bằng Playwright CDP Stealth |
| **9** | Tự động đăng nhập & 2FA OTP | `FacebookLoginAutofill.cs` | `src/main/services/automation/loginAutofill.ts` | Thuật toán RFC6238 TOTP native, selector bền vững |
| **10** | Quản lý phiên mở Profile trực tiếp | `ProfileSession.cs`, `fMoTrinhDuyet.cs` | `src/main/services/browser/sessionManager.ts` | Mở hàng loạt profile giữ nguyên session cookies |
| **11** | Cấu hình chung hệ thống | `fCauHinhChung.cs` | `src/renderer/components/Settings/GeneralSettings.tsx` | Cấu hình lưu trữ JSON Reactive |
| **12** | Cấu hình hiển thị cột | `fCauHinhHienThi.cs` | `src/renderer/components/Settings/ColumnDisplayConfig.tsx` | Kéo thả sắp xếp vị trí và ẩn hiện 45 cột |
| **13** | Cấu hình tương tác đa luồng | `fCauHinhTuongTac.cs` | `src/renderer/components/Settings/InteractionConfig.tsx` | Trình điều phối số luồng thích ứng (Adaptive pool) |
| **14** | Quản lý kịch bản & hành động | `fDanhSachKichBan_Old.cs`, `fChonKichBan.cs` | `src/renderer/components/Scenarios/ScenarioManager.tsx` | Trực quan hóa các bước hành động dạng Pipeline |
| **15** | Thêm mới & Cấu hình 70 hành động | `fThemHanhDong.cs`, 70 file `fHD*.cs` | `src/renderer/components/Scenarios/ActionForms/*.tsx` | Form cấu hình React Hook Form + Zod validation |
| **16** | Xoay IP MinProxy | `MinProxyVN.cs` | `src/main/services/proxy/minProxyService.ts` | Xử lý hàng đợi xoay IP chống đụng độ luồng |
| **17** | Xoay IP OBC Dongle | `ObcProxy.cs` | `src/main/services/proxy/obcProxyService.ts` | Giao tiếp REST HTTP với Hub OBC |
| **18** | Xoay IP ShopLike | `ShopLike.cs` | `src/main/services/proxy/shopLikeService.ts` | Tự động chọn location tỉnh thành |
| **19** | Xoay IP XProxy Dongle | `XProxyproxy.cs` | `src/main/services/proxy/xProxyService.ts` | Xử lý mã lỗi `reset_too_much` thông minh |
| **20** | Giải Checkpoint 282 (Phone/Captcha) | `fCauHinhCheckpoint.cs` | `src/main/services/checkpoint/solver282.ts` | Đấu nối 9 cổng thuê sim + 2Captcha/CapSolver |
| **21** | Giải Checkpoint 956 | `fCauHinhCheckpoint.cs` | `src/main/services/checkpoint/solver956.ts` | Đọc mã Hotmail qua IMAP tự động |
| **22** | Đọc mail Outlook/Hotmail IMAP | `fCauHinhHotmail.cs`, `fTienIchHotmail.cs` | `src/main/services/mail/imapMailService.ts` | Kết nối IMAP TLS an toàn, bóc tách OTP regex |
| **23** | Lập lịch tương tác tự động | `fLenLichTuongTac2.cs` | `src/main/services/scheduler/taskScheduler.ts` | Quản lý lịch biểu bằng node-cron chính xác |
| **24** | Tích hợp AI (ChatGPT & Gemini) | `fCauHinhAI.cs`, `fTienIchChatGPT.cs` | `src/main/services/ai/aiContentService.ts` | Gọi trực tiếp SDK Gemini & OpenAI, sinh comment |
| **25** | Bộ công cụ Tiện ích mở rộng | 9 file `fTienIch*.cs` | `src/renderer/pages/UtilitiesPage.tsx` | Tab tập trung đầy đủ 9 công cụ tiện ích |

---

## 7. PHÂN RÃ KẾ HOẠCH TRIỂN KHAI CHO ĐỘI NGŨ 4 LẬP TRÌNH VIÊN (DEV TEAM ROADMAP)

Dự án được phân chia thành 4 Phase rõ ràng, phân công chuyên biệt cho 4 kỹ sư phần mềm:

```
+------------------------------------------------------------------------------------------------+
|                             ROADMAP PHÂN RÃ CÔNG VIỆC 4 DEVELOPERS                             |
+------------------------------------------------------------------------------------------------+
| Phase 1: Core Foundation, Database & Main Shell                                                |
| Phase 2: Virtual DataGrid, Browser Engine & Account Workflows                                  |
| Phase 3: 70 Action Scenarios, Proxy Rotators & Checkpoint Solvers                              |
| Phase 4: Scheduler, AI Engine, Utilities & End-to-End Testing                                  |
+------------------------------------------------------------------------------------------------+
```

### 7.1. Phân vai & Trách nhiệm thành viên
- **Dev 1 (Automation & Core Lead):** Trưởng nhóm kỹ thuật, chịu trách nhiệm kiến trúc Electron Main Process, bọc `playwright-core`, stealth fingerprint, quản lý vòng đời Chrome, Profile isolation và cơ chế chống phát hiện tự động hóa.
- **Dev 2 (Backend & Database Engineer):** Chịu trách nhiệm toàn bộ lớp dữ liệu `better-sqlite3`, schema migrations, DAO/Repository cho Accounts/Scenarios/Settings, engine tính toán TOTP 2FA, module kết nối IMAP mail, và các service xoay Proxy (MinProxy, OBC, ShopLike, XProxy).
- **Dev 3 (Frontend & UI/UX Engineer):** Chịu trách nhiệm tầng giao diện React 18, Tailwind CSS, Virtualized DataGrid (45 cột), hệ thống Modal (Import, Export, Settings, Column Visibility), Sidebar cây thư mục, và bộ điều khiển giao diện phản hồi nhanh.
- **Dev 4 (Scenario Runner & QA Specialist):** Chịu trách nhiệm xây dựng Scenario Execution Engine, hiện thực hóa mã thực thi Playwright cho toàn bộ **70 hành động tương tác fHD**, engine phân tích Spin text, kết nối AI content, và lập bộ kiểm thử tự động hóa E2E.

---

### 7.2. Kế hoạch triển khai theo từng Phase

#### GIAI ĐOẠN 1 (PHASE 1): CORE FOUNDATION, DATABASE & MAIN SHELL (TUẦN 1 - TUẦN 2)
- **Dev 1 (Lead):**
  - Khởi tạo khung dự án Electron + TypeScript + Vite + React + Tailwind CSS.
  - Thiết lập giao thức IPC an toàn giữa Main Process và Renderer Process thông qua `contextBridge` và `preload.ts`.
  - Quản lý cửa sổ chính, hệ thống khay hệ thống (System Tray), hotkeys và tối ưu khởi động ứng dụng.
- **Dev 2 (Backend):**
  - Cấu hình và đóng gói thư viện native `better-sqlite3` tương thích với Electron node-abi.
  - Xây dựng file khởi tạo và migrate CSDL: tạo bảng `accounts` (45 trường), `files`, `Kich_Ban`, `Hanh_Dong`, `Tuong_Tac`.
  - Xây dựng tầng Data Access Object (DAO) chuẩn cho bảng `files` (CRUD thư mục) và `accounts` (CRUD cơ bản).
- **Dev 3 (Frontend):**
  - Xây dựng bộ khung giao diện Layout chuẩn (Header trạng thái, Sidebar danh mục thư mục, Khu vực bảng làm việc chính, Footer thống kê).
  - Triển khai cây thư mục (Folder Tree) bên trái: Danh sách thư mục, đếm số lượng tài khoản Live/Die, menu chuột phải (Thêm/Sửa/Xóa thư mục).
  - Xây dựng Modal khung chuẩn (Base Modal UI) và hệ thống Toast Notification thông báo.
- **Dev 4 (Scenario & QA):**
  - Thiết kế kiến trúc trừu tượng `BaseActionRunner` cho kịch bản tương tác.
  - Viết bộ parser cú pháp Spin Text `{nội dung 1|nội dung 2|nội dung 3}` hỗ trợ spin lồng nhau nhiều tầng.
  - Chuẩn bị môi trường kiểm thử (Jest / Vitest) và tài liệu quy chuẩn code quality.

#### GIAI ĐOẠN 2 (PHASE 2): VIRTUAL DATAGRID, BROWSER ENGINE & ACCOUNT WORKFLOWS (TUẦN 3 - TUẦN 4)
- **Dev 1 (Lead):**
  - Xây dựng `PlaywrightManager`: khởi tạo Chromium với Profile độc lập tại `profiles/{uid}`.
  - Cấu hình Stealth parameters, vô hiệu hóa WebGL, WebRTC, hình ảnh để tiết kiệm RAM.
  - Hiện thực thuật toán chia lưới cửa sổ Chrome (Grid window tiling NxM) trên màn hình dựa theo tọa độ desktop.
  - Triển khai `loginAutofill`: tự động điền form đăng nhập Facebook, vượt màn hình 2FA bằng thuật toán TOTP.
- **Dev 2 (Backend):**
  - Hiện thực hóa công cụ tính mã TOTP RFC6238 từ Secret Key `cFa2`.
  - Viết hàm xử lý Import tài khoản hiệu năng cao (xử lý chunk 500 dòng/transaction, loại trừ trùng lặp UID).
  - Viết hàm xử lý Export tài khoản theo định dạng tùy chọn của người dùng.
  - Viết module dọn dẹp thư mục Profile và giải phóng dung lượng đĩa cứng.
- **Dev 3 (Frontend):**
  - Tích hợp TanStack Virtual Table cho bảng tài khoản 45 cột:
    - Checkbox đa chọn, chọn theo khoảng (Shift + Click), phím tắt `Ctrl + A`.
    - Kéo giãn cột, ghim cột, sắp xếp theo cột.
    - Context Menu chuột phải đầy đủ các nhóm chức năng (Copy, Nhập nhanh, Kiểm tra, Xóa, Cập nhật).
  - Hoàn thiện Modal Import tài khoản với Trình tạo định dạng tùy biến (Custom Format Builder).
  - Hoàn thiện Modal Export tài khoản và Modal Cập nhật dữ liệu hàng loạt.
  - Xây dựng màn hình "Thùng rác - Tài khoản đã xóa" và Modal cấu hình ẩn/hiện 45 cột.
- **Dev 4 (Scenario & QA):**
  - Kiểm thử hiệu năng DataGrid với 20.000 dòng dữ liệu giả lập (đạt mục tiêu < 60fps khi cuộn).
  - Viết kịch bản kiểm thử luồng đăng nhập tự động Uid/Pass + 2FA và Cookie injection.
  - Bắt đầu chuyển đổi mã nguồn 15 hành động đầu tiên (Nhóm 1: Tương tác cá nhân & Nuôi dưỡng bảng tin).

#### GIAI ĐOẠN 3 (PHASE 3): 70 ACTION SCENARIOS, PROXY ROTATORS & CHECKPOINT SOLVERS (TUẦN 5 - TUẦN 7)
- **Dev 1 (Lead):**
  - Xây dựng `TaskPoolExecutor`: điều phối hàng chục luồng chạy song song, cơ chế Pause / Resume / Stop an toàn, ngăn chặn memory leak.
  - Tích hợp trực tiếp các tham số Proxy (HTTP/SOCKS5 có User/Pass) vào từng Browser Context riêng biệt của Playwright.
  - Giám sát trạng thái hoạt động của từng cửa sổ Chrome, báo cáo realtime về giao diện người dùng.
- **Dev 2 (Backend):**
  - Hiện thực hóa trọn bộ 5 dịch vụ xoay IP Proxy động: MinProxy, OBC Proxy, ShopLike, XProxy, Dcom Hilink.
  - Xây dựng cơ chế hàng đợi cấp phát Proxy: đảm bảo không vượt quá $N$ luồng/IP, tự động gửi lệnh reset IP khi luồng hoàn thành.
  - Viết module kết nối Hotmail IMAP: tự động lấy mail, đọc tin nhắn mới nhất, trích xuất mã xác nhận bảo mật.
  - Tích hợp API thuê SIM nhận mã OTP (Viotp, FastSim, OTP282, Chothuesimcode) và giải mã Captcha (2Captcha, CapSolver).
- **Dev 3 (Frontend):**
  - Xây dựng Trình quản lý Kịch bản tương tác (Scenario Manager): Danh sách kịch bản, thêm/sửa/xóa/nhân bản kịch bản.
  - Xây dựng giao diện danh sách bước hành động dạng Pipeline kéo thả thay đổi thứ tự thực thi.
  - Xây dựng toàn bộ các Form giao diện cấu hình cho các hành động tương tác (sử dụng component dùng chung như `ucTuongTacBaiVietv2`, `ucTuongTacReel`).
  - Xây dựng các tab cài đặt Cấu hình Chung, Cấu hình Tương tác đa luồng, Cấu hình Checkpoint.
- **Dev 4 (Scenario & QA):**
  - Hiện thực hóa trọn vẹn 55 hành động tương tác còn lại trên nền Playwright:
    - Nhóm Đăng bài & Sáng tạo nội dung (Reels, Story, Đăng bài kèm ảnh).
    - Nhóm Bạn bè & Hội nhóm (Kết bạn tệp UID, tham gia nhóm trả lời câu hỏi, rời nhóm).
    - Nhóm Fanpage & Seeding (Like/Follow, Đánh giá 5 sao, Seeding bài viết chỉ định, Tương tác Livestream).
    - Nhóm Bảo mật & Profile (Đổi pass, đổi tên, bật 2FA, gỡ số điện thoại).
  - Viết E2E test cases cho quy trình giải Checkpoint 282 và 956 tự động.

#### GIAI ĐOẠN 4 (PHASE 4): SCHEDULER, AI ENGINE, UTILITIES & BÀN GIAO (TUẦN 8)
- **Dev 1 (Lead):**
  - Tối ưu hóa đóng gói ứng dụng bằng Electron Builder (tạo bộ cài đặt Windows `.exe` / Portable).
  - Tinh chỉnh bảo mật ứng dụng, mã hóa chuỗi kết nối và thông tin nhạy cảm.
  - Review toàn diện mã nguồn, kiểm tra memory leak khi chạy liên tục 24/7.
- **Dev 2 (Backend):**
  - Xây dựng `TaskScheduler` trên nền `node-cron`: kích hoạt kịch bản theo giờ hẹn, chu kỳ ngày chẵn/lẻ.
  - Tích hợp dịch vụ gọi API OpenAI ChatGPT và Google Gemini: sinh nội dung bình luận, tin nhắn theo prompt.
  - Hoàn thiện các hàm backend phục vụ 9 công cụ trong trang Tiện ích.
- **Dev 3 (Frontend):**
  - Hoàn thiện Trang Tiện ích mở rộng (Find UID, Check Live UID, Check Proxy, Hotmail Checker, Test Spin Content...).
  - Thiết kế màn hình Dashboard giám sát tài nguyên (CPU, RAM, Số luồng đang chạy, Tốc độ xoay IP).
  - Tinh chỉnh trải nghiệm UI/UX: Dark Mode / Light Mode, hiệu ứng chuyển cảnh mượt mà, phản hồi phím tắt.
- **Dev 4 (Scenario & QA):**
  - Thực hiện toàn bộ ma trận kiểm thử E2E (End-to-End Testing):
    - Chạy thử nghiệm đồng thời 30 luồng với 1.000 tài khoản thực tế.
    - Kiểm tra tính ổn định của cơ chế xoay IP XProxy và MinProxy.
    - Đo lường mức tiêu thụ tài nguyên máy tính so sánh trực tiếp với bản C# WinForms cũ (kỳ vọng giảm 40% RAM, không bao giờ bị Not Responding).
  - Biên soạn tài liệu hướng dẫn vận hành và bàn giao mã nguồn.

---

## 8. MA TRẬN YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS)

| Tiêu Chí | Yêu Cầu Kỹ Thuật | Phương Án Đo Lường & Đảm Bảo |
| :--- | :--- | :--- |
| **Hiệu năng hiển thị** | Tải và cuộn mượt mà 50.000 tài khoản | Ứng dụng TanStack Virtual Table, chỉ render tối đa 30-40 node DOM trong viewport; FPS luôn duy trì $\ge 55$ fps. |
| **Tiêu tốn bộ nhớ (RAM)** | Giảm tối thiểu 40% RAM so với C# WinForms | Sử dụng Playwright CDP cờ chặn WebGL/3D/Media Stream; tắt nạp hình ảnh khi chạy nền; giải phóng triệt để Browser Context sau khi đóng. |
| **Độ ổn định giao diện** | Tuyệt đối không bị treo "Not Responding" | Tách biệt 100% logic tự động hóa, truy vấn CSDL nặng và gọi API sang Worker Threads / Child Processes; IPC bất đồng bộ. |
| **Chống nhận diện Bot** | Điểm số Stealth vượt qua Cloudflare & Datadome | Triển khai plugin playwright-stealth, xóa `navigator.webdriver`, giả lập danh sách plugin, audio context, vendor webgl chuẩn thiết bị thật. |
| **Tính toàn vẹn dữ liệu** | Không hỏng CSDL khi mất điện hoặc tắt đột ngột | `better-sqlite3` cấu hình `PRAGMA journal_mode = WAL;` (Write-Ahead Logging) và `PRAGMA synchronous = NORMAL;`. |
| **Khả năng mở rộng** | Dễ dàng bổ sung hành động mới | Kiến trúc Scenario Runner theo mẫu Factory & Strategy Pattern; mỗi hành động là một module độc lập kế thừa `BaseAction`. |

---

## 9. KẾT LUẬN & ĐIỀU KIỆN NGHIỆM THU (ACCEPTANCE GATES)

Dự án **LushCare Electron** sẽ được nghiệm thu khi thỏa mãn đầy đủ các điều kiện tiên quyết sau:
1. **100% Tính năng nguyên bản:** Toàn bộ 45 trường dữ liệu tài khoản, 70 hành động kịch bản fHD, các kiểu xoay IP và phương pháp giải checkpoint từ C# WinForms đều hoạt động chính xác trên Electron.
2. **Hiệu năng vượt trội:** Không giật lag khi tải tệp dữ liệu lớn, thời gian khởi động Chrome và thực thi luồng nhanh hơn tối thiểu 25% so với bản cũ.
3. **Mã nguồn sạch & Chuẩn hóa:** Kiến trúc phân tách rõ ràng giữa Main Process, Renderer Process và Database Layer; tuân thủ quy chuẩn TypeScript strict type và có tài liệu kỹ thuật đầy đủ.
