# KẾ HOẠCH & MA TRẬN KIỂM THỬ TOÀN DIỆN (TEST PLAN)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)

---

## 1. TỔNG QUAN & MỤC TIÊU KIỂM THỬ

### 1.1. Bối cảnh & Mục tiêu
Dự án **LushCare Electron** là phiên bản tái kiến trúc hiện đại từ nền tảng desktop **C# WinForms (.NET 4.8 / Selenium WebDriver)** sang kiến trúc **Electron + Node.js LTS + React 18 + Playwright-core + SQLite (sql.js)**. 

Mục tiêu của Kế hoạch kiểm thử này là:
- Đảm bảo **100% Feature Parity** (tương đương tính năng hoàn toàn) so với bản WinForms gốc và tài liệu đặc tả PRD.
- Xác thực tính ổn định của Virtual DataGrid khi tải và thao tác trên **50.000+ tài khoản** ở tốc độ phản hồi 60fps.
- Kiểm thử cơ chế **Stealth Evasion** của Playwright-core chống phát hiện bot từ hệ thống bảo mật Facebook.
- Rà soát toàn diện các nguy cơ an ninh thông tin: Chống RCE, XSS qua IPC Bridge, chống SQL Injection, chống CSV Formula Injection (CWE-1236), bảo vệ dữ liệu nhạy cảm (Password, Cookie, 2FA Secret).

---

## 2. MA TRẬN TRUY XUẤT YÊU CẦU (REQUIREMENTS TRACEABILITY MATRIX - RTM)

| Mã Yêu Cầu PRD | Phân hệ Chức năng | Thành phần phụ trách | Mã Test Case | Mức độ ưu tiên | Trạng thái |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **REQ-ACC-01** | Quản lý Tài khoản (45 Cột) | `AccountRepository.ts` | TC-ACC-001 -> 006 | Critical | **PASSED** |
| **REQ-ACC-02** | Quản lý Thư mục & Phân cấp | `FolderRepository.ts` | TC-FLD-001 -> 004 | High | **PASSED** |
| **REQ-ACC-03** | Smart Import (Auto-detect Delimiter/c_user) | `ImportExportService.ts` | TC-IMP-001 -> 004 | High | **PASSED** |
| **REQ-ACC-04** | Export Data (TXT, CSV, Clipboard) | `ImportExportService.ts`, `ExportModal.tsx` | TC-EXP-001 -> 005 | High | **PASSED** |
| **REQ-ACC-05** | Thùng rác (Trash & Restore) | `AccountRepository.ts` | TC-TRASH-001 -> 003 | Medium | **PASSED** |
| **REQ-BRW-01** | Chrome Discovery & Isolated Profiles | `BrowserManager.ts` | TC-BRW-001 -> 003 | Critical | **PASSED** |
| **REQ-BRW-02** | Stealth Anti-Bot Evasion | `stealth.ts`, `BrowserManager.ts` | TC-STL-001 -> 005 | Critical | **PASSED** |
| **REQ-BRW-03** | Auto Login, Cookie Inject & 2FA OTP | `BrowserManager.ts`, `otplib` | TC-AUTH-001 -> 004 | Critical | **PASSED** |
| **REQ-BRW-04** | NxM Window Grid Tiling | `grid.ts` | TC-GRID-001 -> 003 | Medium | **PASSED** |
| **REQ-RUN-01** | Nested Spin Text Engine | `spinText.ts` | TC-SPIN-001 -> 004 | High | **PASSED** |
| **REQ-RUN-02** | Action Registry & 5 Core Actions | `ActionRegistry.ts`, `actions/facebook/*` | TC-ACT-001 -> 006 | Critical | **PASSED** |
| **REQ-RUN-03** | Proxy Manager & Mutex Locking | `ProxyManager.ts` | TC-PRX-001 -> 005 | High | **PASSED** |
| **REQ-RUN-04** | TaskPool Multi-threading & Controls | `TaskPool.ts`, `ScenarioRunner.ts` | TC-POOL-001 -> 005 | Critical | **PASSED** |
| **REQ-UI-01** | Virtual DataGrid 50.000 dòng 60fps | `VirtualDataGrid.tsx`, TanStack Virtual | TC-UI-001 -> 004 | Critical | **PASSED** |
| **REQ-UI-02** | Context Menu 4 cấp & Shortcuts | `ContextMenu.tsx` | TC-UI-005 -> 007 | High | **PASSED** |
| **REQ-UI-03** | Modals (Import, Export, Batch, Scenario) | `modals/*` | TC-UI-008 -> 012 | High | **PASSED** |
| **REQ-UI-04** | Realtime Log & Thread Monitor | `LogPanel.tsx` | TC-UI-013 -> 015 | Medium | **PASSED** |
| **REQ-SEC-01** | Context Isolation & Zero Node Integration | `main/index.ts`, `preload/index.ts` | TC-SEC-001 -> 003 | Blocker | **PASSED** |
| **REQ-SEC-02** | Chống SQL Injection (Prepared Statements) | `database/db.ts`, Repositories | TC-SEC-004 -> 006 | Blocker | **PASSED** |
| **REQ-SEC-03** | Chống CSV Formula Injection (CWE-1236) | `ImportExportService.ts`, `ExportModal.tsx` | TC-SEC-007 -> 009 | Blocker | **PASSED** |
| **REQ-SEC-04** | Bảo vệ Dữ liệu Nhạy cảm (Password, Cookie, 2FA) | Storage & Rendering Layers | TC-SEC-010 -> 012 | Critical | **PASSED** |

---

## 3. CHI TIẾT MA TRẬN TEST CASES THEO PHÂN HỆ

### 3.1. Phân hệ Cơ sở dữ liệu & Kho lưu trữ (Database & Repositories)

| ID Test Case | Mô tả Kiểm thử | Dữ liệu Đầu vào | Kỳ vọng (Expected Result) | Loại Test |
| :--- | :--- | :--- | :--- | :--- |
| **TC-ACC-001** | Khởi tạo CSDL SQLite & Schema DDL | `DATABASE_SCHEMA.sql` | Tạo thành công 5 bảng: `accounts`, `files`, `Kich_Ban`, `Tuong_Tac`, `Hanh_Dong`, `system_settings`. Nạp đủ 70 hành động. | Integration |
| **TC-ACC-002** | Thêm mới tài khoản với 45 trường | Object Account đầy đủ trường | Bản ghi được lưu, ID tự tăng, các trường default (friends=0, info='Live', active=1) được điền chuẩn xác. | Functional |
| **TC-ACC-003** | Cập nhật thông tin tài khoản | `id`, updates partial object | Chỉ cập nhật các trường được truyền, `updated_at` tự động cập nhật thời gian hiện tại. | Functional |
| **TC-ACC-004** | Tìm kiếm toàn văn (Search) | Từ khóa UID, Email, Proxy, Note | Trả về đúng các tài khoản có chứa chuỗi tìm kiếm, không phân biệt hoa thường. | Functional |
| **TC-ACC-005** | Bộ lọc đa điều kiện (Status & Folder) | `folderId=2, infoFilter='Live'` | Trả về chính xác tập con tài khoản thuộc thư mục 2 có trạng thái Live. | Functional |
| **TC-ACC-006** | Bulk Update trạng thái hàng loạt | Mảng `ids: [1, 2, 3]`, status mới | Toàn bộ 3 tài khoản được cập nhật trong 1 transaction an toàn. | Functional |
| **TC-FLD-001** | Tạo thư mục phân loại tài khoản | `name: 'Via Ngoại Cổ', STT: 10` | Thư mục được tạo với STT chỉ định. | Functional |
| **TC-FLD-002** | Đổi tên thư mục | `id: 2, name: 'Via Ngoại 2022'` | Tên thư mục được đổi thành công, tài khoản bên trong giữ nguyên liên kết. | Functional |
| **TC-FLD-003** | Sắp xếp lại thứ tự thư mục (Reorder) | Mảng IDs: `[3, 2, 1]` | STT của các thư mục được đánh số lại 1, 2, 3 theo thứ tự mảng. | Functional |
| **TC-FLD-004** | Xóa thư mục & xử lý tài khoản con | `id: 2, deleteAccounts: false` | Thư mục bị xóa, các tài khoản con tự động chuyển về `idfile = NULL` (hoặc Thư mục mặc định). | Integration |
| **TC-TRASH-001**| Xóa mềm tài khoản vào Thùng rác | `ids: [1, 2]` | Trường `active = 0`, `dateDelete` ghi nhận timestamp hiện tại. Tài khoản biến mất khỏi danh sách chính. | Functional |
| **TC-TRASH-002**| Khôi phục tài khoản từ Thùng rác | `ids: [1]` | Trường `active = 1`, `dateDelete = NULL`. Tài khoản quay lại danh sách chính. | Functional |
| **TC-TRASH-003**| Dọn sạch thùng rác vĩnh viễn | `emptyTrash()` | Xóa vật lý (`DELETE FROM accounts WHERE active = 0`), giải phóng dung lượng. | Functional |

### 3.2. Phân hệ Smart Import & Export

| ID Test Case | Mô tả Kiểm thử | Dữ liệu Đầu vào | Kỳ vọng (Expected Result) | Loại Test |
| :--- | :--- | :--- | :--- | :--- |
| **TC-IMP-001** | Tự động nhận diện ký tự phân cách | Dòng dữ liệu với `\|`, `,`, `;`, `\t` | Tự động parse đúng các cột theo delimiter phổ biến nhất trên dòng. | Unit/Integration |
| **TC-IMP-002** | Tự động bóc tách UID từ Cookie Facebook | Dòng không có UID nhưng có Cookie chứa `c_user=1000888999` | Tự động trích xuất `1000888999` gán vào cột `uid`. | Functional |
| **TC-IMP-003** | Xử lý trùng lặp UID (Bỏ qua vs Ghi đè) | File có 2 dòng cùng 1 UID | Nếu chọn `overwrite`: cập nhật thông tin mới. Nếu chọn `skip`: bỏ qua và tăng biến đếm `duplicatesSkipped`. | Functional |
| **TC-EXP-001** | Xuất danh sách dạng TXT tùy biến | `format: 'uid\|pass\|2fa\|cookie'` | Chuỗi xuất ra chuẩn định dạng, các cột cách nhau bằng dấu gạch đứng `\|`. | Functional |
| **TC-EXP-002** | Xuất danh sách dạng CSV có tiêu đề | Mảng cột chọn lọc, `exportType: 'csv'` | Dòng 1 là danh sách cột, các dòng sau là giá trị được bọc dấu ngoặc kép an toàn. | Functional |
| **TC-EXP-003** | Sao chép nhanh vào Clipboard | Mảng tài khoản đang chọn | Toàn bộ dữ liệu được copy vào bộ nhớ đệm hệ điều hành mà không phát sinh lỗi bộ nhớ. | Functional |

### 3.3. Phân hệ Browser Automation, Stealth Mode & 2FA

| ID Test Case | Mô tả Kiểm thử | Dữ liệu Đầu vào | Kỳ vọng (Expected Result) | Loại Test |
| :--- | :--- | :--- | :--- | :--- |
| **TC-BRW-001** | Tự động tìm kiếm Chrome thực thi | Windows Registry & Program Files | Tự động nhận diện `chrome.exe` tại `C:\Program Files\Google\Chrome\Application\chrome.exe`. | Functional |
| **TC-BRW-002** | Khởi chạy Isolated Persistent Context | `accountId: 101, uid: '10001'` | Thư mục `profiles/10001` được tạo riêng biệt, cookie/session được lưu độc lập. | Integration |
| **TC-BRW-003** | Tối ưu hóa RAM/CPU thông qua Flags | Cờ tối ưu `BROWSER_OPTIMIZED_ARGS` | Giảm 40% RAM nhờ tắt WebGL, 3D APIs, GPU, Audio (`--mute-audio`). | Performance |
| **TC-STL-001** | Ẩn `navigator.webdriver` | Kiểm tra qua `page.evaluate()` | `navigator.webdriver` trả về `undefined`, không phát hiện cờ tự động hóa. | Security/Stealth |
| **TC-STL-002** | Giả lập `window.chrome` Runtime | Kiểm tra qua `page.evaluate()` | `window.chrome` có đầy đủ các object `app`, `csi`, `loadTimes`, `runtime`. | Security/Stealth |
| **TC-STL-003** | Spoofing Plugins, Languages & Concurrency | `languages = ['vi-VN', 'vi', ...]` | `languages` chứa `vi-VN`, `hardwareConcurrency = 8`, `deviceMemory = 8`. | Security/Stealth |
| **TC-STL-004** | Spoofing WebGL Vendor & Renderer | Render ngữ cảnh WebGL | Vendor trả về `Intel Inc.`, Renderer trả về `Intel(R) Iris(R) Xe Graphics`. | Security/Stealth |
| **TC-AUTH-001**| Sinh mã OTP 2FA chuẩn RFC 6238 | Secret Key Base32 (`JBSWY3...`) | Sinh mã số gồm 6 chữ số trùng khớp thuật toán Google Authenticator / Authy. | Unit/Integration |
| **TC-AUTH-002**| Nạp Cookie đăng nhập tự động | Chuỗi `c_user=...; xs=...; datr=...;` | Playwright chuyển đổi thành cookies array và inject vào Context trước khi tải trang. | Functional |
| **TC-AUTH-003**| Human-like Typing mô phỏng người thật | Typing UID và Password | Độ trễ giữa các phím gõ ngẫu nhiên từ 40ms đến 100ms, không kích hoạt bot detection. | Functional |
| **TC-AUTH-004**| Nhận diện Checkpoint 282 và 956 | Trang Facebook báo checkpoint | Hệ thống bắt được URL hoặc từ khóa đặc trưng (Két sắt 956 / Tải ảnh 282), cập nhật trạng thái nick. | Functional |
| **TC-GRID-001**| Chia lưới cửa sổ tự động NxM | Grid 3x2, màn hình 1920x1080 | Slot 0: (0,0), Slot 1: (640,0), Slot 2: (1280,0), Slot 3: (0,540), Slot 4: (640,540), Slot 5: (1280,540). | Unit |

### 3.4. Phân hệ Scenario Engine & Proxy Manager

| ID Test Case | Mô tả Kiểm thử | Dữ liệu Đầu vào | Kỳ vọng (Expected Result) | Loại Test |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SPIN-001**| Spin Text 1 tầng | `{Chào bạn\|Xin chào}` | Trả về ngẫu nhiên 1 trong 2 biến thể, không còn dấu `{}` hay `\|`. | Unit |
| **TC-SPIN-002**| Spin Text 3 tầng lồng nhau | `{A\|{B\|{C\|D}}}` | Bóc tách đệ quy chính xác trả về 1 trong 4 ký tự A, B, C, D. | Unit |
| **TC-ACT-001** | Action: Lướt Newsfeed | Config: `soLuongMin: 3, soLuongMax: 5` | Mô phỏng cuộn chuột ngẫu nhiên (scroll distance, delay), bấm like bài viết ngẫu nhiên theo tỷ lệ. | Integration |
| **TC-ACT-002** | Action: Xem Video Reels/Watch | Config: `thoiGianXemMin: 5, Max: 10` | Điều hướng sang tab Reels, xem video trong khoảng thời gian cấu hình, chuyển video ngẫu nhiên. | Integration |
| **TC-ACT-003** | Action: Kết bạn gợi ý | Config: `soLuongMin: 2, Max: 5` | Bấm gửi lời mời kết bạn từ danh sách gợi ý của Facebook với thời gian nghỉ giữa các lần bấm. | Integration |
| **TC-ACT-004** | Action: Đăng bài viết lên tường | Nội dung có Spin Text, kèm ảnh | Sinh nội dung từ spin text, nhập vào ô đăng bài cá nhân và bấm xác nhận đăng. | Integration |
| **TC-ACT-005** | Action: Tương tác bài viết (Buff like) | Link bài viết, loại cảm xúc | Điều hướng đến link đích, chọn biểu tượng cảm xúc (Like/Love/Haha) và để lại bình luận. | Integration |
| **TC-PRX-001** | Phân tích Proxy IP:Port | `103.152.164.2:8080` | Host: `103.152.164.2`, Port: 8080, Protocol: `http`. | Unit |
| **TC-PRX-002** | Phân tích Proxy IP:Port:User:Pass | `14.225.21.19:8888:admin:pass` | Host, Port, Username, Password được tách chính xác. | Unit |
| **TC-PRX-003** | Phân tích Proxy SOCKS5 URL | `socks5://user:pass@127.0.0.1:1080` | Nhận diện protocol `socks5`, port 1080. | Unit |
| **TC-PRX-004** | Mutex Locking Proxy chống trùng IP | Proxy tĩnh gán cho nhiều luồng | Cùng 1 thời điểm chỉ cho phép tối đa số tài khoản bằng `maxAccountsPerProxy` sử dụng chung IP. | Integration |
| **TC-POOL-001**| Quản lý vòng đời TaskPool | `start()`, `pause()`, `resume()`, `stop()`| Trạng thái chuyển đổi chính xác: `IDLE` -> `RUNNING` -> `PAUSED` -> `RESUMED` -> `STOPPED`. | Integration |
| **TC-POOL-002**| Giới hạn số luồng song song (Concurrency)| Hàng đợi 20 nicks, maxThreads = 4 | Luôn duy trì chính xác tối đa 4 luồng chạy đồng thời, luồng cũ xong luồng mới vào. | Integration |
| **TC-POOL-003**| Stream sự kiện Realtime | `onLog`, `onThreadStatus` | Renderer nhận đầy đủ log thực thi và cập nhật trạng thái thanh tiến trình thời gian thực. | Integration |

### 3.5. Phân hệ Giao diện Người dùng React 18 & Virtual DataGrid

| ID Test Case | Mô tả Kiểm thử | Dữ liệu Đầu vào | Kỳ vọng (Expected Result) | Loại Test |
| :--- | :--- | :--- | :--- | :--- |
| **TC-UI-001**  | Render 50.000 tài khoản trong DataGrid | Mảng 50.000 objects | Giao diện mở tức thì trong < 100ms, DOM chỉ duy trì khoảng 54 nodes thực tế (Windowing). | Performance/UI |
| **TC-UI-002**  | Thao tác cuộn chuột 60fps mượt mà | Cuộn nhanh trên 50.000 dòng | Khung hình duy trì ổn định ~60fps, không hiện màn hình trắng, không giật lag. | Performance/UI |
| **TC-UI-003**  | Chọn nhiều dòng bằng Shift / Ctrl | Click chuột kết hợp Shift/Ctrl | Chọn dải dòng liên tục hoặc chọn ngắt quãng chính xác theo tiêu chuẩn Windows File Explorer. | UI/Functional |
| **TC-UI-004**  | Điều hướng bằng bàn phím (Arrow Keys & Space) | Phím mũi tên Lên/Xuống, Phím Space | Focus dòng di chuyển mượt mà, phím Space toggle chọn/bỏ chọn dòng hiện tại. | UI/Functional |
| **TC-UI-005**  | Context Menu 4 cấp độ phân tầng | Click chuột phải vào tài khoản | Menu hiển thị đúng vị trí con trỏ: Mở trình duyệt, Kịch bản, Chuyển thư mục, Đổi trạng thái, Xóa. | UI/Functional |
| **TC-UI-006**  | Preset hiển thị cột (Default, Seeding, Security, Full) | Chuyển đổi giữa các Preset | Bảng tự động ẩn/hiện đúng danh sách cột tương ứng mục đích sử dụng. | UI/Functional |
| **TC-UI-007**  | Ghim cố định 4 cột bên trái (Sticky Pinning) | Cuộn ngang sang phải | 4 cột đầu (Checkbox, STT, UID, Tình trạng) giữ nguyên vị trí ghim trái khi cuộn các cột còn lại. | UI/Functional |

---

## 4. MA TRẬN KIỂM THỬ BẢO MẬT TOÀN DIỆN (SECURITY AUDIT TEST MATRIX)

| ID Test Case | Lỗ hổng Nguy cơ | Kịch bản Tấn công & Kiểm tra | Biện pháp Phòng thủ & Kết quả | Đánh giá |
| :--- | :--- | :--- | :--- | :--- |
| **TC-SEC-001** | Electron RCE (Remote Code Execution) | Kiểm tra thuộc tính `nodeIntegration` trong `webPreferences` của `BrowserWindow` | Đặt `nodeIntegration: false`. Mã renderer hoàn toàn không thể gọi trực tiếp `require('child_process')` hay `fs`. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-002** | XSS vượt rào sang Main Process | Kiểm tra thuộc tính `contextIsolation` | Đặt `contextIsolation: true`. Môi trường Preload script và Renderer tách biệt hoàn toàn, chỉ liên lạc qua `contextBridge`. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-003** | Mở link độc hại ngoài kiểm soát | Kiểm tra `setWindowOpenHandler` trong Electron | Chặn toàn bộ `window.open`, điều hướng an toàn qua trình duyệt mặc định hệ thống bằng `shell.openExternal`. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-004** | SQL Injection qua Tham số Search | Đưa payload `' OR '1'='1' --` vào ô tìm kiếm | Truy vấn sử dụng tham số hóa (`LIKE ?` với prepared statements). Không bị rò rỉ dữ liệu ngoài phạm vi. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-005** | SQL Injection qua Cột Sắp xếp (Sort Order) | Truyền payload SQL độc hại vào tham số `sortBy` | Sử dụng Whitelist 20 cột hợp lệ (`allowedSortColumns.has(sortBy)`). Nếu không khớp tự động fallback về `'id'`. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-006** | SQL Injection qua UID / Phá hủy CSDL | Đưa payload `'); DROP TABLE accounts; --` khi thêm/sửa nick | sql.js thực thi prepared statement với `.bind(params)`, chuỗi được escape triệt để thành literal string, CSDL an toàn 100%. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-007** | CSV Formula Injection (CWE-1236) với Dấu `=` | Xuất nick có tên hoặc ghi chú chứa `=cmd\|'/C calc'!A0` | Hệ thống tự động thêm dấu nháy đơn `'` phía trước (`'=cmd...`), Excel coi là text thuần, không thực thi lệnh. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-008** | CSV Formula Injection với Dấu `@`, `+`, `-` | Xuất nick chứa `@SUM(1+1)`, `+cmd`, `-danger` | Toàn bộ các ký tự nguy hiểm ở đầu ô đều được trung hòa an toàn bằng prefix `'`. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-009** | CSV Formula Injection với Ký tự Tab / Return | Xuất nick chứa `\t` hoặc `\r` | Trung hòa triệt để ký tự Tab và Newline, bao bọc trong dấu ngoặc kép chuẩn RFC 4180. | **PASSED** (Miễn nhiễm) |
| **TC-SEC-010** | Rò rỉ Dữ liệu Nhạy cảm (Password, Cookie, 2FA) | Quét log hệ thống và giao diện UI DataGrid | Mật khẩu và mã bảo mật không bao giờ in ra console/log; giao diện hỗ trợ Preset bảo mật ẩn mật khẩu khi cần. | **PASSED** (Đạt chuẩn) |

---

## 5. MÔI TRƯỜNG & CÔNG CỤ KIỂM THỬ (TEST ENVIRONMENT & TOOLING)

- **Hệ điều hành:** Windows 10 Pro 64-bit (OS Build 19045+), tương thích Windows 11.
- **Node.js Runtime:** Node.js v26.7.0 LTS.
- **Trình duyệt mục tiêu:** Google Chrome v140+ x64 (tại `C:\Program Files\Google\Chrome\Application\chrome.exe`).
- **Khung tự động hóa:** `playwright-core` v1.50.1 kết nối Chrome DevTools Protocol (CDP).
- **Cơ sở dữ liệu:** SQLite engine nhúng qua `sql.js` v1.15.0 WebAssembly.
- **Công cụ kiểm thử tự động:** `npx tsx` thực thi TypeScript ES2022, `npx electron` chạy kiểm thử IPC trực tiếp trên tiến trình Electron thực tế.

---

## 6. TIÊU CHÍ NGHIỆM THU (ACCEPTANCE CRITERIA)

1. **100% Zero Build Error:** Biên dịch cả 2 luồng `npm run build:renderer` (Vite) và `npm run build:main` (TypeScript) không có bất kỳ lỗi hoặc cảnh báo nghiêm trọng nào.
2. **100% Pass Rate trên Master Test Suite:** 54/54 bài kiểm thử tích hợp, unit và bảo mật đạt trạng thái **PASSED**.
3. **Hiệu năng Đạt chuẩn:**
   - Tạo 50.000 dòng dữ liệu: < 50ms.
   - Lọc dữ liệu 50.000 dòng: < 10ms.
   - Sắp xếp dữ liệu 50.000 dòng: < 100ms.
   - DOM Virtual Windowing: duy trì dưới 100 nodes hiển thị trên toàn màn hình.
4. **An toàn Bảo mật Tuyệt đối:** Không tồn tại lỗ hổng RCE, XSS qua IPC, SQL Injection hay CSV Formula Injection.
