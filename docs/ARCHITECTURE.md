# TÀI LIỆU KIẾN TRÚC KỸ THUẬT HỆ THỐNG (SYSTEM ARCHITECTURE SPECIFICATION)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
### Chuyển đổi toàn diện từ C# WinForms sang Electron + Node.js + React 18 + Playwright
**Tác giả:** System Architect  
**Phiên bản:** 2.0 (Chính thức)  
**Tệp tài liệu:** `docs/ARCHITECTURE.md`  
**Ngôn ngữ:** Tiếng Việt kết hợp thuật ngữ kỹ thuật chuẩn

---

## 1. TỔNG QUAN KIẾN TRÚC & MỤC TIÊU HỆ THỐNG

### 1.1. Bối cảnh & Động lực Chuyển đổi
Phần mềm **LushCare** nguyên bản được viết trên nền tảng **C# WinForms (.NET Framework 4.8)** sử dụng Selenium WebDriver và SQLite (System.Data.SQLite). Mặc dù đáp ứng được các chức năng nuôi nick cơ bản, hệ thống cũ bộc lộ nhiều điểm nghẽn nghiêm trọng:
1. **Giao diện GDI+ lỗi thời và giật lag:** Khi số lượng tài khoản vượt quá 5.000 dòng, DataGridView của WinForms chiếm dụng CPU cao, gây hiện tượng trắng màn hình và "Not Responding" do cơ chế đơn luồng UI của Windows Forms.
2. **Selenium WebDriver nặng nề và dễ bị Facebook phát hiện:** ChromeDriver gắn cờ `navigator.webdriver = true` mặc định, fingerprint không tự nhiên, tiêu tốn 150MB - 300MB RAM cho mỗi cửa sổ trình duyệt, không tối ưu được cho mô hình chạy đồng thời 20 - 50 luồng.
3. **Mã nguồn đóng khung và khó bảo trì:** Phụ thuộc vào các file `.cs` monolithic dài hàng nghìn dòng, trộn lẫn giữa logic giao diện và nghiệp vụ tự động hóa, thiếu tính module hóa và không thể tái sử dụng linh hoạt.

### 1.2. Mục tiêu Kiến trúc Mới (Electron + Node.js + React 18)
Hệ thống **LushCare Electron** được tái thiết kế theo tiêu chuẩn công nghệ máy tính hiện đại với các chỉ số mục tiêu rõ ràng:
- **Hiệu năng hiển thị vượt trội:** Ứng dụng công nghệ Virtualized DataGrid (TanStack Virtual), tải và cuộn mượt mà 50.000+ tài khoản tại tốc độ ổn định $\ge 55$ FPS, RAM giao diện duy trì dưới 120 MB.
- **Tiết kiệm tài nguyên phần cứng:** Thay thế Selenium bằng `playwright-core` kết nối trực tiếp giao thức Chrome DevTools Protocol (CDP), tinh chỉnh vô hiệu hóa WebGL, WebRTC, Media Stream và hình ảnh, giúp giảm hơn 40% RAM và 60% băng thông mạng cho mỗi luồng.
- **Tàng hình chống phát hiện Bot (Stealth Evasion):** Triển khai kỹ thuật vá tầng thấp các thuộc tính JavaScript runtime, giả lập vân tay thiết bị thật (Hardware concurrency, Canvas noise, AudioContext, Vendor/Renderer), vượt qua cơ chế kiểm duyệt bot của Facebook, Cloudflare và DataDome.
- **Độ tin cậy CSDL tuyệt đối:** Sử dụng `better-sqlite3` với cơ chế Write-Ahead Logging (WAL), bộ nhớ đệm cache 64MB và Memory-Mapped I/O 256MB, đảm bảo thực thi các truy vấn hàng loạt trong vài mili-giây, không bị lỗi khóa file hay hỏng dữ liệu khi mất điện đột ngột.
- **Kiến trúc phân rã module cho 4 Lập trình viên:** Tách biệt ranh giới rõ ràng giữa Core Lead, Backend/Database, Frontend UI, và Scenario Runner, giao tiếp qua Hợp đồng IPC được định kiểu tĩnh (Typed IPC Contracts).

---

## 2. KIẾN TRÚC TỔNG THỂ HỆ THỐNG (HIGH-LEVEL SYSTEM ARCHITECTURE)

Hệ thống được thiết kế theo mô hình **Multi-Process Layered Architecture** chuẩn mực của Electron:

```
+---------------------------------------------------------------------------------------+
|                                    USER INTERFACE                                     |
|                       React 18 + Vite + Tailwind CSS + Lucide                         |
|  [Virtual DataGrid (45 Cột)]  [Scenario Pipeline]  [Settings Center]  [Live Monitor]  |
+-------------------------------------------^-------------------------------------------+
                                            | 
                                contextBridge IPC (Strongly Typed)
                                            |
+-------------------------------------------v-------------------------------------------+
|                           ELECTRON MAIN PROCESS (Node.js LTS)                         |
|  - App Lifecycle Manager, Window Controller, System Tray, Hotkeys                     |
|  - IPC Dispatcher & Security Guard (Preload validation)                               |
|  - Central Event Bus & State Orchestrator                                             |
+-------------------+-----------------------------------+-------------------------------+
                    |                                   |
+-------------------v-------------------+       +-------v-------------------------------+
|     DATABASE & STORAGE ENGINE         |       |      AUTOMATION & RUNNER ENGINE       |
|          (better-sqlite3)             |       |       (Node.js Worker Threads)        |
|  - db_lushcare.sqlite (WAL Mode)      |       |  - Task Pool Executor (Adaptive Concurrency)|
|    + accounts (45 fields, 50k+ rows)  |       |  - Playwright-Core Controller (CDP)   |
|    + files, proxy_configs, settings   |       |  - Anti-Detect Stealth Injector       |
|  - interact.sqlite                    |       |  - Smart Login & RFC 6238 TOTP Engine |
|    + Kich_Ban, Hanh_Dong, Tuong_Tac   |       |  - 70 Action Pipeline Runners (fHD*)  |
|  - Disk Cache & Profile Cleaner       |       |  - Dynamic Proxy Rotator (5 Hubs)     |
+---------------------------------------+       +---------------------------------------+
```

### 2.1. Phân định Ranh giới Tiến trình (Process Boundaries)
1. **Renderer Process (Giao diện người dùng):**
   - Chạy trong môi trường Chromium sandbox độc lập, không có quyền truy cập Node.js API (`fs`, `child_process`, `net`).
   - Quản lý trạng thái cục bộ bằng Zustand/React Context.
   - Chỉ tương tác với hệ thống thông qua đối tượng toàn cục `window.api` do Preload script phơi bày.
2. **Main Process (Bộ điều phối trung tâm):**
   - Chạy trên Node.js runtime đầy đủ quyền hạn.
   - Quản lý vòng đời ứng dụng, tạo và điều khiển cửa sổ `BrowserWindow`, đăng ký System Tray và Shortcut.
   - Đóng vai trò là IPC Router, nhận các lệnh từ Renderer và ủy quyền xử lý cho các Service tương ứng.
3. **Worker Threads / Child Process Pool (Bộ máy thực thi nền):**
   - Chạy các tác vụ tốn CPU hoặc I/O blocking nặng: khởi chạy nhiều instance Playwright, quét kiểm tra IMAP hòm thư Hotmail, xử lý import tệp tài khoản 50.000 dòng.
   - Đảm bảo Renderer Process và Main Event Loop luôn phản hồi ở mức 60 FPS, không bao giờ bị đơ giao diện.

### 2.2. Mô hình Bảo mật (Security Isolation Architecture)
- Cờ bảo mật cấu hình cho `BrowserWindow`:
  ```typescript
  webPreferences: {
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
    preload: path.join(__dirname, '../preload/index.js')
  }
  ```
- **Lớp chắn Preload (contextBridge Guard):** Mọi tham số đầu vào từ Renderer đều được xác thực cấu trúc (schema validation) trước khi chuyển qua IPC Main Handle, ngăn chặn rủi ro tấn công Prototype Pollution hoặc RCE.

---

## 3. THIẾT KẾ CHI TIẾT CÁC PHÂN HỆ CỐT LÕI (CORE SUBSYSTEMS)

### 3.1. Phân hệ Quản lý Trình duyệt & Tự động hóa (Browser Manager & Playwright Core)

Phân hệ chịu trách nhiệm khởi tạo, điều khiển và giám sát các phiên trình duyệt Chromium với hiệu năng cao nhất và khả năng ẩn danh tối đa.

```
+-------------------------------------------------------------------------------+
|                           PLAYWRIGHT BROWSER MANAGER                          |
+-------------------------------------------------------------------------------+
|  1. Profile Directory Isolation: `profiles/{uid}/`                            |
|  2. Launch Arguments (Stealth + Memory Optimization)                          |
|  3. Chrome DevTools Protocol (CDP) Session Hijacking                          |
|  4. Window Grid Tiling Calculator: (X, Y, Width, Height)                      |
|  5. Smart Login & RFC 6238 TOTP Autofill                                      |
+-------------------------------------------------------------------------------+
```

#### 3.1.1. Cô lập Profile Tuyệt đối (Isolated User Data Directory)
- Mỗi tài khoản Facebook được gán một thư mục dữ liệu trình duyệt riêng biệt tại đường dẫn: `profiles/{uid}` (ví dụ: `profiles/100089283748291/`).
- Thư mục này lưu trữ LocalStorage, IndexedDB, Cookies và Service Workers độc lập, ngăn chặn hoàn toàn việc rò rỉ cookie chéo giữa các tài khoản.
- Sử dụng phương thức `chromium.launchPersistentContext(userDataDir, options)` của `playwright-core` để phiên làm việc được lưu giữ bền vững qua các lần khởi động mà không cần xuất/nhập cookie thủ công liên tục.

#### 3.1.2. Tham số Khởi động Tối ưu Hóa Tài nguyên & Ẩn danh (Launch Arguments)
Để giảm 40% RAM và 60% băng thông so với Selenium WinForms cũ, Playwright được khởi chạy với tập cờ (flags) chuyên dụng:

```typescript
export const BROWSER_OPTIMIZED_ARGS = [
  // Vô hiệu hóa thông báo điều khiển tự động hóa
  '--disable-blink-features=AutomationControlled',
  '--disable-infobars',
  '--exclude-switches=enable-automation',
  
  // Tiết kiệm bộ nhớ RAM và CPU tối đa
  '--disable-webgl',
  '--disable-3d-apis',
  '--disable-accelerated-2d-canvas',
  '--disable-gpu',
  '--disable-webrtc',
  '--mute-audio',
  '--no-default-browser-check',
  '--no-first-run',
  '--disable-background-networking',
  '--disable-background-timer-throttling',
  '--disable-backgrounding-occluded-windows',
  '--disable-breakpad',
  '--disable-component-extensions-with-background-pages',
  '--disable-extensions',
  '--disable-features=TranslateUI,BlinkGenPropertyTrees',
  '--disable-ipc-flooding-protection',
  '--disable-renderer-backgrounding',
  '--force-color-profile=srgb',
  '--metrics-recording-only',
  
  // Tùy chọn cờ tắt hình ảnh (tiết kiệm băng thông nếu cấu hình disableImages = true)
  // '--blink-settings=imagesEnabled=false'
];
```

#### 3.1.3. Cơ chế Chống Phát Hiện Bot Toàn diện (Stealth Evasion Engine)
Hệ thống can thiệp sâu vào môi trường JavaScript của trang web thông qua script `addInitScript` chạy trước khi bất kỳ script nào của Facebook được tải:
1. **Xóa cờ `navigator.webdriver`:**
   ```javascript
   Object.defineProperty(navigator, 'webdriver', {
     get: () => undefined
   });
   ```
2. **Giả lập `window.chrome` Runtime:** Tạo các thuộc tính chuẩn của Google Chrome thật (`app`, `csi`, `loadTimes`, `runtime`).
3. **Giả lập Plugin Array & MimeTypes:** Điền đầy đủ các plugin mặc định như Chrome PDF Plugin, Chrome PDF Viewer để không bị nhận diện là trình duyệt headless rỗng.
4. **Bảo vệ Vân tay Phần cứng (Hardware Fingerprint):** Giả lập `navigator.hardwareConcurrency` (4 hoặc 8 cores), `navigator.deviceMemory` (8GB), chuẩn hóa `navigator.languages = ['vi-VN', 'vi', 'en-US', 'en']`.
5. **Chống rò rỉ WebRTC (WebRTC IP Leak Protection):** Thiết lập chính sách WebRTC nghiêm ngặt, buộc toàn bộ lưu lượng UDP/TCP của WebRTC phải đi xuyên qua đường hầm Proxy đã chỉ định, không bao giờ để lộ địa chỉ IP thật của máy chủ nuôi nick.

#### 3.1.4. Thuật toán Bố trí Cửa sổ Dạng Lưới Màn hình (Window Grid Tiling Algorithm)
Hệ thống tự động tính toán tọa độ `(X, Y, Width, Height)` chia đều các cửa sổ Chrome trên màn hình theo cấu hình $R$ hàng và $C$ cột:

$$\text{Width} = \left\lfloor \frac{W_{\text{screen}}}{C} \right\rfloor, \quad \text{Height} = \left\lfloor \frac{H_{\text{screen}}}{R} \right\rfloor$$

$$\text{RowIndex} = \left\lfloor \frac{\text{Index}}{C} \right\rfloor \pmod R, \quad \text{ColIndex} = \text{Index} \pmod C$$

$$X = \text{ColIndex} \times \text{Width}, \quad Y = \text{RowIndex} \times \text{Height}$$

Khi khởi chạy tài khoản thứ $i$, Playwright áp dụng ngay cờ:
`--window-position=${X},${Y}` và `--window-size=${Width},${Height}`.

#### 3.1.5. Cơ chế Đăng nhập Thông minh & Vượt 2FA (Smart Login & RFC 6238 TOTP)
- **Quy trình Đăng nhập Fallback (`Cookie > Pass`):**
  1. Nạp danh sách Cookie (`c_user`, `xs`, `fr`, `datr`...) vào Browser Context bằng `context.addCookies()`.
  2. Điều hướng trang chủ `https://m.facebook.com` hoặc `https://www.facebook.com`.
  3. Kiểm tra sự tồn tại của các thành phần định danh phiên đăng nhập (như ô tìm kiếm, icon avatar, menu điều hướng).
  4. Nếu phiên hết hạn hoặc trang điều hướng về form login, tự động kích hoạt bộ gõ người thật (Human-like typing):
     - Gõ UID với delay ngẫu nhiên $50\text{ms} - 150\text{ms}$ giữa các phím.
     - Gõ Mật khẩu với delay $40\text{ms} - 120\text{ms}$.
     - Bấm nút Đăng nhập và chờ phản hồi.
- **Vượt 2FA Tự động (TOTP RFC 6238):**
  - Khi phát hiện màn hình yêu cầu xác minh 2 bước (`input[name="approvals_code"]`, `input[autocomplete="one-time-code"]`), module đọc giá trị khóa bí mật `fa2` trong CSDL.
  - Sử dụng thuật toán native HMAC-SHA1 tính mã OTP 6 chữ số:
    $$\text{Counter} = \left\lfloor \frac{\text{EpochTime}}{30} \right\rfloor, \quad \text{Hash} = \text{HMAC-SHA1}(\text{SecretKey}, \text{Counter})$$
  - Trích xuất 6 chữ số từ hash và tự động điền vào ô mã xác thực, bấm xác nhận "Lưu trình duyệt" ("Đây là tôi").
  - Sau khi đăng nhập thành công, tự động trích xuất toàn bộ cookie phiên mới nhất lưu ngược lại vào cột `cookie` của CSDL.

---

### 3.2. Phân hệ Cơ sở Dữ liệu Hiệu năng cao (Database Engine - better-sqlite3)

Lớp dữ liệu là trái tim của hệ thống, xử lý đồng thời 50.000+ tài khoản và hàng triệu dòng nhật ký hoạt động.

```
+-------------------------------------------------------------------------------+
|                       DATABASE LAYER (better-sqlite3)                         |
+-------------------------------------------------------------------------------+
|  Connection 1: `database/db_lushcare.sqlite` (accounts, files, settings, logs)|
|  Connection 2: `interact/interact.sqlite` (Kich_Ban, Hanh_Dong, Tuong_Tac)    |
|                                                                               |
|  - PRAGMA journal_mode = WAL;                                                 |
|  - PRAGMA synchronous = NORMAL;                                               |
|  - PRAGMA cache_size = -64000; (64MB)                                         |
|  - PRAGMA mmap_size = 268435456; (256MB)                                      |
|  - Prepared Statements Cache                                                  |
|  - Atomic Transactions & Chunking (500 items/txn)                             |
+-------------------------------------------------------------------------------+
```

#### 3.2.1. Chiến lược 2 Cơ sở Dữ liệu (Dual-Database Separation)
1. **`database/db_lushcare.sqlite`:** Lưu trữ toàn bộ dữ liệu thực thể của hệ thống: bảng `accounts` (45 trường), `files` (thư mục), `proxy_configs`, `system_settings` và `app_logs`.
2. **`interact/interact.sqlite`:** Lưu trữ kịch bản tương tác: bảng `Kich_Ban`, `Hanh_Dong`, `Tuong_Tac` (danh mục 70 hành động) và `Lich_Trinh` (Scheduler). Tách biệt CSDL kịch bản giúp người dùng có thể dễ dàng chia sẻ file `interact.sqlite` cho các máy khác mà không làm lộ dữ liệu tài khoản cá nhân.

#### 3.2.2. Tối ưu Hiệu năng CSDL cho 50.000+ Bản ghi
- **Chế độ WAL (Write-Ahead Logging):** Cho phép các luồng đọc (SELECT cho giao diện DataGrid) và các luồng ghi (UPDATE trạng thái của 20 luồng Playwright) diễn ra đồng thời mà không hề khóa file hay gây nghẽn `SQLITE_BUSY`.
- **Prepared Statements Caching:** Khởi tạo và biên dịch sẵn (compile) toàn bộ các câu lệnh SQL thường dùng (`updateStatusStmt`, `updateCookieStmt`, `getAccountsByFolderStmt`). Khi chạy, chỉ cần bind tham số giúp tốc độ truy vấn đạt hàng trăm nghìn operations/giây.
- **Batch Processing & Atomic Transactions:** Khi Import 10.000 tài khoản, hệ thống chia nhỏ thành từng batch 500 bản ghi và bọc trong transaction:
  ```typescript
  const insertMany = db.transaction((accounts: AccountInput[]) => {
    for (const acc of accounts) insertStmt.run(acc);
  });
  insertMany(batch);
  ```
  Kỹ thuật này rút ngắn thời gian nhập 10.000 tài khoản từ 45 giây (từng bản ghi) xuống **chưa đầy 1.2 giây**.

#### 3.2.3. Hệ thống Chỉ mục Tối ưu (Covering Indexes)
- `idx_accounts_uid`: Phục vụ kiểm tra trùng lặp $O(\log N)$ cực nhanh.
- `idx_accounts_idfile_active`: Chỉ mục kết hợp giúp lọc tức thì các tài khoản đang hoạt động của từng thư mục.
- `idx_accounts_active_status`: Hỗ trợ bộ điều phối lấy danh sách tài khoản sẵn sàng chạy.
- `idx_hanhdong_kichban_stt`: Tối ưu hóa tải các bước hành động theo đúng thứ tự thực thi.

---

### 3.3. Phân hệ Proxy & Xoay IP Đa luồng (Proxy & Network Rotation Engine)

Hệ thống quản lý hàng trăm địa chỉ IP động, cam kết không bị trùng IP giữa các tài khoản và chống rò rỉ IP gốc.

```
+-------------------------------------------------------------------------------+
|                       DYNAMIC PROXY ROTATION PIPELINE                         |
+-------------------------------------------------------------------------------+
|  [Account Dispatcher] ---> [Proxy Manager: Mutex / Semaphore Controller]      |
|                                   |                                           |
|       +---------------------------+---------------------------+               |
|       |                           |                           |               |
|  [MinProxy API]           [XProxy Dongle]             [ShopLike / OBC / Dcom] |
|       |                           |                           |               |
|       +--------------------------->---------------------------+               |
|                                   |                                           |
|               [Pre-flight Verification: api.ipify.org]                        |
|                                   |                                           |
|                       [Inject into Playwright Context]                        |
+-------------------------------------------------------------------------------+
```

#### 3.3.1. Hỗ trợ Đa Dạng Giao thức & Dịch vụ Proxy
1. **Proxy Tĩnh (Static Proxy):** HTTP / SOCKS5 có xác thực user/password (`ip:port:user:pass`). Gán trực tiếp vào tham số khởi tạo context của Playwright:
   ```typescript
   proxy: {
     server: `http://${host}:${port}`,
     username: user,
     password: pass
   }
   ```
2. **MinProxy (API Rotator):** Gọi HTTP REST API lấy IP mới kèm kiểm tra cooldown xoay IP (`https://api.minproxy.vn/api_service/request-key...`).
3. **XProxy (X-KVM Dongle Hub):** Gửi lệnh reset thiết bị Dcom vật lý gắn trên Hub (`http://host:port/reset?proxy=ip:port`). Tự động nhận diện và xử lý mã lỗi `reset_too_much`, đưa vào hàng đợi chờ thông minh.
4. **ShopLike:** Xoay IP theo vị trí tỉnh thành mong muốn qua API key.
5. **OBC Proxy & Dcom Hilink:** Reset modem qua REST HTTP hoặc lệnh AT command.

#### 3.3.2. Cơ chế Khóa Đồng quy & Quản lý Hàng đợi (Concurrency Mutex & Cooldown Queue)
- **Giới hạn số luồng per Proxy:** Mỗi Proxy được cấu hình tham số `maxThreads` (ví dụ: tối đa 2 tài khoản chạy chung 1 IP).
- **Mutex Lock khi Reset:** Khi một luồng yêu cầu đổi IP cho cổng proxy $K$, hệ thống kích hoạt cờ Semaphore khóa cổng đó, tạm dừng cấp phát tài khoản mới cho cổng $K$. Sau khi lệnh Reset thành công và IP mới được xác nhận, Semaphore được giải phóng cho các luồng tiếp theo.
- **Pre-flight IP Verification (Kiểm tra chống rò rỉ):** Trước khi Playwright mở trang Facebook, một request kiểm tra siêu nhẹ được gửi tới `https://api.ipify.org?format=json` thông qua proxy đó. Nếu IP trả về không đổi (chưa xoay thành công) hoặc request timeout, luồng sẽ dừng lại và báo lỗi, tuyệt đối không mở Facebook trên IP cũ.

---

### 3.4. Phân hệ Kịch bản Tương tác (Scenario Execution Pipeline - 70 Actions)

Hệ thống kế thừa và hiện thực hóa trọn vẹn 100% (70 hành động fHD) từ phiên bản C# WinForms, được thiết kế theo mẫu **Pipeline & Strategy Pattern**.

```
+-------------------------------------------------------------------------------+
|                        SCENARIO EXECUTION PIPELINE                            |
+-------------------------------------------------------------------------------+
|  [Scenario Definition] -> Action 1 -> Action 2 -> ... -> Action N             |
|                                                                               |
|  Abstract: BaseActionRunner                                                   |
|    - init(context, page, config)                                              |
|    - execute(): Promise<ActionResult>                                         |
|    - verify(): Promise<boolean>                                               |
|    - cleanup(): Promise<void>                                                 |
|    - handleException(error): Promise<ActionFallback>                          |
|                                                                               |
|  Engine: Nested Spin Text Parser {a|{b|c}}                                    |
|  Integration: AI Content Generation (OpenAI GPT & Google Gemini)              |
+-------------------------------------------------------------------------------+
```

#### 3.4.1. Cấu trúc Lớp Trừu tượng `BaseActionRunner`
Mọi hành động trong 70 hành động đều kế thừa lớp nền chuẩn:
```typescript
export abstract class BaseActionRunner {
  protected page: Page;
  protected account: AccountEntity;
  protected config: Record<string, any>;
  protected logger: (message: string, level?: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS') => void;

  constructor(page: Page, account: AccountEntity, config: Record<string, any>, logger: any) {
    this.page = page;
    this.account = account;
    this.config = config;
    this.logger = logger;
  }

  // Khởi tạo trạng thái và tiền kiểm tra
  abstract init(): Promise<void>;

  // Thực thi nghiệp vụ tương tác chính
  abstract execute(): Promise<ActionResult>;

  // Hậu kiểm tra kết quả hành động
  abstract verify(): Promise<boolean>;

  // Dọn dẹp tài nguyên sau hành động
  async cleanup(): Promise<void> {}

  // Bộ sinh thời gian nghỉ ngẫu nhiên mô phỏng người thật
  protected async randomSleep(minSeconds: number, maxSeconds: number): Promise<void> {
    const delay = Math.floor(Math.random() * (maxSeconds - minSeconds + 1) + minSeconds) * 1000;
    await this.page.waitForTimeout(delay);
  }

  // Cuộn trang mô phỏng thao tác vuốt của người dùng thật
  protected async smoothScroll(distance: number, steps = 10): Promise<void> {
    const stepDistance = distance / steps;
    for (let i = 0; i < steps; i++) {
      await this.page.mouse.wheel(0, stepDistance);
      await this.page.waitForTimeout(Math.random() * 50 + 50);
    }
  }
}
```

#### 3.4.2. Bộ Phân tích Cú pháp Spin Text Lồng nhau (Nested Spin Text Engine)
Nội dung bình luận, tin nhắn, bài đăng hỗ trợ cú pháp Spin `{a|b|c}` và đặc biệt hỗ trợ **Spin lồng nhau đa tầng** (ví dụ: `{Chào bạn|Hi {anh|chị}}! {Rất vui được làm quen|Chúc {ngày mới|buổi sáng} tốt lành}`).  
Thuật toán phân tích sử dụng biểu thức chính quy đệ quy giải từ trong ra ngoài:
```typescript
export function parseSpinText(template: string): string {
  const spinRegex = /\{([^{}]+)\}/g;
  let text = template;
  while (spinRegex.test(text)) {
    text = text.replace(spinRegex, (_, choices) => {
      const parts = choices.split('|');
      return parts[Math.floor(Math.random() * parts.length)];
    });
  }
  return text;
}
```

#### 3.4.3. Tích hợp AI Tự động Sinh Nội dung (Google Gemini & OpenAI ChatGPT)
Hệ thống tích hợp trực tiếp SDK của Google Gemini (`@google/genai`) và OpenAI (`openai`):
- Cho phép người dùng cấu hình các mẫu prompt linh hoạt với biến `{content}` đại diện cho bài viết đang tương tác.
- Tự động phân tích nội dung bài viết Facebook, sinh câu bình luận tự nhiên, hài hước, đúng trọng tâm dưới 70 ký tự.
- Cơ chế Fallback: Nếu API AI gặp lỗi hạn ngạch (429 Rate Limit) hoặc mất mạng, hệ thống tự động chuyển sang lấy mẫu bình luận từ danh sách Spin Text đã cấu hình sẵn, đảm bảo luồng kịch bản không bao giờ bị dừng đột ngột.

---

### 3.5. Phân hệ Giải Checkpoint Tự động (Checkpoint Solvers)

Tự động nhận diện và xử lý hai loại checkpoint phổ biến nhất của Facebook:

```
+-------------------------------------------------------------------------------+
|                       AUTOMATED CHECKPOINT RECOVERY                           |
+-------------------------------------------------------------------------------+
|  1. Checkpoint 282 (Bắt xác minh khuôn mặt & SĐT):                           |
|     - Nhận diện màn hình 282 qua URL (`/checkpoint/1501...`)                  |
|     - Thuê số điện thoại nhận mã SMS qua API (Viotp, FastSim, OTP282...)       |
|     - Giải Captcha hình ảnh qua 2Captcha / CapSolver                          |
|     - Chọn ảnh selfie chân dung ngẫu nhiên từ thư mục chỉ định                |
|     - Tải ảnh lên và bấm kháng cáo                                            |
|                                                                               |
|  2. Checkpoint 956 (Két sắt / Xác minh danh tính):                            |
|     - Mở khóa bằng nút Bắt đầu                                                |
|     - Tự động kết nối hộp thư Hotmail/Outlook qua giao thức IMAP TLS           |
|     - Lọc email mới nhất từ Facebook, bóc tách mã xác nhận 6 số bằng Regex    |
|     - Điền mã và mở khóa tài khoản thành công                                 |
+-------------------------------------------------------------------------------+
```

---

## 4. BẢNG TỔNG HỢP VÀ PHÂN NHÓM 70 HÀNH ĐỘNG KỊCH BẢN (100% FEATURE PARITY)

Toàn bộ 70 hành động từ các form `fHD*.cs` của C# WinForms được chuyển đổi sang các Action Runner TypeScript tương ứng trong thư mục `src/main/services/scenarios/actions/`:

| STT | Mã Hành Động (Action Code) | Tên Tiếng Việt Hiển Thị | Phân Nhóm | File C# Gốc | Mô Tả & Nghiệp Vụ Cốt Lõi |
| :---: | :--- | :--- | :---: | :--- | :--- |
| **1** | `HDBaiVietNewsfeed` | Lướt Newsfeed v1 | feed | `fHDBaiVietNewsfeed.cs` | Cuộn bảng tin, xem bài, like, thả tim, comment spin text |
| **2** | `HDBaiVietNewsfeed2` | Lướt Newsfeed v2 | feed | `fHDBaiVietNewsfeed2.cs` | Tối ưu hóa điều hướng m.fb, phát hiện bài viết bạn bè |
| **3** | `HDBaiVietNewsfeed3` | Lướt Newsfeed v3 Nâng cao | feed | `fHDBaiVietNewsfeed3.cs` | Lọc tương tác theo từ khóa bài viết, share bài lên tường |
| **4** | `HDXemStory` | Xem tin Story | feed | `fHDXemStory.cs` | Xem Story bạn bè, thả cảm xúc tim/like, phản hồi tin nhắn |
| **5** | `HDXemWatch` | Xem video Watch | feed | `fHDXemWatch.cs` | Vào Facebook Watch, xem video từ 30s-90s, like, comment |
| **6** | `HDDocThongBao` | Đọc thông báo Notifications | feed | `fHDDocThongBao.cs` | Bấm chuông thông báo, click đọc ngẫu nhiên $N$ tin chưa đọc |
| **7** | `HDChocBanBe` | Chọc bạn bè (Poke) | feed | `fHDChocBanBe.cs` | Truy cập `/pokes`, chọc lại người đã chọc hoặc chọc gợi ý |
| **8** | `HDChucMungSinhNhat` | Chúc mừng sinh nhật | feed | `fHDChucMungSinhNhat.cs` | Quét bạn bè sinh nhật hôm nay, gửi tin nhắn hoặc đăng tường |
| **9** | `HDNghiGiaiLao` | Nghỉ giải lao | feed | `fHDNghiGiaiLao.cs` | Tạm dừng luồng ngẫu nhiên từ $A$ đến $B$ giây |
| **10** | `HDTimKiemGoogle` | Tìm kiếm từ khóa Google | feed | `fHDTimKiemGoogle.cs` | Mở tab Google, gõ từ khóa, click vào web mục tiêu cuộn trang |
| **11** | `HDTruyCapWebsite` | Duyệt web ngoài (Nuôi Cookie) | feed | `fHDTruyCapWebsite.cs` | Mở website báo chí/TMĐT nuôi cookie Facebook Pixel |
| **12** | `HDKhangSpam` | Kháng spam vi phạm tính năng | feed | `fHDKhangSpam.cs` | Tự động bấm gửi báo cáo sự cố khi bị chặn like/comment |
| **13** | `HDDangBai` | Đăng bài tổng hợp | post | `fHDDangBai.cs` | Đăng bài viết kèm nội dung spin text, ảnh ngẫu nhiên, tag bạn |
| **14** | `HDDangStatus` | Đăng Status nhanh (m.fb) | post | `fHDDangStatus.cs` | Đăng dòng trạng thái nhanh trên giao diện di động |
| **15** | `HDDangStatusV2` | Đăng Status nâng cao | post | `fHDDangStatusV2.cs` | Đăng status chọn màu nền background, cảm xúc, quyền riêng tư |
| **16** | `HDDangReel` | Đăng video ngắn Reels | post | `fHDDangReel.cs` | Tải video ngắn lên Facebook Reels kèm tiêu đề, hashtag |
| **17** | `HDDangStory` | Đăng tin Story | post | `fHDDangStory.cs` | Tải ảnh hoặc video ngắn biến mất sau 24h lên Story |
| **18** | `HDShareBai` | Chia sẻ bài viết | post | `fHDShareBai.cs` | Share link bài viết về tường cá nhân hoặc các nhóm đã tham gia |
| **19** | `HDSharePage` | Share quyền quản trị Page | post | `fHDSharePage.cs` | Thêm tài khoản khác làm Admin/Biên tập viên Fanpage |
| **20** | `HDUptopBaiViet` | Đẩy top bài viết cũ | post | `fHDUptopBaiViet.cs` | Tìm bài viết cũ trong nhóm, comment icon đẩy bài lên đầu |
| **21** | `HDXoaBaiTuong` | Xóa bài viết trên tường | post | `fHDXoaBaiTuong.cs` | Quét tường cá nhân và xóa các bài viết cũ chỉ định |
| **22** | `HDKetBanGoiY` | Kết bạn theo gợi ý | friend | `fHDKetBanGoiY.cs` | Gửi lời mời kết bạn cho danh sách Facebook gợi ý |
| **23** | `HDKetBanTepUid` | Kết bạn theo tệp UID | friend | `fHDKetBanTepUid.cs` | Gửi lời mời kết bạn theo danh sách UID mục tiêu nhập vào |
| **24** | `HDKetBanTheoTuKhoa` | Kết bạn theo từ khóa | friend | `fHDKetBanTheoTuKhoa.cs` | Tìm người theo từ khóa nghề nghiệp/khu vực và kết bạn |
| **25** | `HDKetBanThanhVienNhom` | Kết bạn thành viên nhóm | friend | `fHDKetBanThanhVienNhom.cs` | Quét thành viên nhóm mục tiêu và gửi lời mời kết bạn |
| **26** | `HDKetBanVoiBanBeCuaUid`| Kết bạn với bạn bè UID | friend | `fHDKetBanVoiBanBeCuaUid.cs`| Quét danh sách bạn bè của tài khoản mục tiêu để kết bạn |
| **27** | `HDXacNhanKetBan` | Chấp nhận lời mời kết bạn | friend | `fHDXacNhanKetBan.cs` | Tự động đồng ý lời mời kết bạn đang chờ duyệt |
| **28** | `HDHuyLoiMoiKetBan` | Hủy lời mời đã gửi | friend | `fHDHuyLoiMoiKetBan.cs` | Thu hồi lời mời kết bạn đã gửi quá lâu không đồng ý |
| **29** | `HDHuyKetBan` | Hủy kết bạn (Unfriend) | friend | `fHDHuyKetBan.cs` | Hủy kết bạn theo danh sách UID hoặc lọc nick không tương tác |
| **30** | `HDBaiVietBanBe` | Tương tác tường bạn bè | friend | `fHDBaiVietBanBe.cs` | Vào trang cá nhân của bạn bè, like và comment bài viết mới |
| **31** | `HDThamGiaNhomGoiY` | Tham gia nhóm gợi ý | group | `fHDThamGiaNhomGoiY.cs` | Gửi yêu cầu tham gia các nhóm Facebook đề xuất |
| **32** | `HDThamGiaNhomTuKhoa` | Tham gia nhóm theo từ khóa | group | `fHDThamGiaNhomTuKhoa.cs` | Tìm nhóm theo từ khóa, tự động trả lời câu hỏi xét duyệt |
| **33** | `HDThamGiaNhomUid` | Tham gia nhóm theo tệp UID | group | `fHDThamGiaNhomUid.cs` | Nhập tệp ID nhóm, gửi yêu cầu tham gia và đồng ý nội quy |
| **34** | `HDRoiNhom` | Rời khỏi nhóm | group | `fHDRoiNhom.cs` | Thoát các nhóm kiểm duyệt gắt, nhóm rác hoặc danh sách UID |
| **35** | `HDMoiBanBeVaoNhom` | Mời bạn bè vào nhóm | group | `fHDMoiBanBeVaoNhom.cs` | Chọn nhóm quản lý, tự động mời toàn bộ bạn bè tham gia |
| **36** | `HDBaiVietNhom` | Tương tác bài viết nhóm v1 | group | `fHDBaiVietNhom.cs` | Lướt nhóm đã tham gia, like và thảo luận trong các bài đăng |
| **37** | `HDTuongTacNhomv2` | Tương tác bài viết nhóm v2 | group | `fHDTuongTacNhomv2.cs` | Tối ưu tương tác trên giao diện www, cuộn bài viết nhóm |
| **38** | `HDBuffFollowLikePage` | Like & Follow Fanpage | page | `fHDBuffFollowLikePage.cs` | Bấm Like và Theo dõi trang Fanpage chỉ định |
| **39** | `HDHuyLikePage` | Bỏ like Fanpage (Unlike) | page | `fHDHuyLikePage.cs` | Quét danh sách trang đã like và tự động bỏ thích |
| **40** | `HDMoiLikePage` | Mời bạn bè thích trang | page | `fHDMoiLikePage.cs` | Gửi lời mời hàng loạt bạn bè like trang Fanpage |
| **41** | `HDBaiVietFanpage` | Tương tác bài viết Fanpage | page | `fHDBaiVietFanpage.cs` | Vào Fanpage mục tiêu, like và comment bài viết mới nhất |
| **42** | `HDTaoPage` | Tự động tạo Fanpage mới | page | `fHDTaoPage.cs` | Điền tên Page, danh mục, tiểu sử, tạo thành công Page Pro5 |
| **43** | `HDDanhGiaPage` | Đánh giá Page 5 sao | page | `fHDDanhGiaPage.cs` | Viết đánh giá 5 sao kèm bài viết khen ngợi có spin text |
| **44** | `HDKichHoatPageVhh` | Kháng kích hoạt Page VHH | page | `fHDKichHoatPageVhh.cs` | Gửi yêu cầu kháng nghị khôi phục quyền quản trị Page bị khóa |
| **45** | `HDTuongTacReelChiDinh`| Tương tác Reel chỉ định | page | `fHDTuongTacReelChiDinh.cs` | Xem video Reel theo link, thả tim, comment và share |
| **46** | `HDTuongTacReelNgauNhien`| Lướt xem Reels ngẫu nhiên | page | `fHDTuongTacReelNgauNhien.cs`| Cuộn xem liên tục $N$ video ngắn Reels, tương tác ngẫu nhiên |
| **47** | `HDBuffLikeComment` | Tương tác bài viết chỉ định | seeding | `fHDBuffLikeComment.cs` | Seeding bài bán hàng/chạy ads bằng reaction và comment ảnh |
| **48** | `HDTuongTacBaiVietTuKhoa`| Tương tác bài theo từ khóa | seeding | `fHDTuongTacBaiVietTuKhoa.cs`| Tìm từ khóa trên thanh tìm kiếm, like bài viết thảo luận |
| **49** | `HDTuongTacLivestream` | Tăng tương tác Livestream | seeding | `fHDTuongTacLivestream.cs` | Duy trì xem Livestream (giữ mắt), thả tim liên tục, comment |
| **50** | `HDBuffTinNhanProfile` | Nhắn tin riêng Messenger | seeding | `fHDBuffTinNhanProfile.cs` | Gửi tin nhắn CSKH tới tệp UID kèm chèn tên `{name}` và ảnh |
| **51** | `HDBuffFollowCaNhan` | Follow tài khoản cá nhân | seeding | `fHDBuffFollowCaNhan.cs` | Bấm theo dõi tài khoản cá nhân (KOLs/khách hàng) |
| **52** | `HDSpamBaiViet` | Spam bình luận hàng loạt | seeding | `fHDSpamBaiViet.cs` | Đăng bình luận quảng bá lên hàng loạt bài viết hội nhóm |
| **53** | `HDPhanHoiBinhLuan` | Tự động trả lời comment | seeding | `fHDPhanHoiBinhLuan.cs` | Quét bình luận trên bài viết của mình và tự động reply lại |
| **54** | `HDReport` | Báo cáo vi phạm Report | seeding | `fHDReport.cs` | Gửi báo cáo vi phạm đối với nick lừa đảo hoặc page mạo danh |
| **55** | `HDDoiMatKhau` | Đổi mật khẩu Facebook | security | `fHDDoiMatKhau.cs` | Tự đổi mật khẩu mới ngẫu nhiên, lưu lại mật khẩu cũ |
| **56** | `HDDoiTen` | Đổi tên hiển thị Facebook | security | `fHDDoiTen.cs` | Đổi họ tên theo danh sách tên Việt hoặc ngoại ngẫu nhiên |
| **57** | `HDCapNhatThongTin` | Cập nhật Profile cá nhân | security | `fHDCapNhatThongTin.cs` | Cập nhật Quê quán, Nơi ở hiện tại, Trường học, Công việc |
| **58** | `HDUpAvatar` | Thay ảnh đại diện Avatar | security | `fHDUpAvatar.cs` | Chọn ảnh từ thư mục, cắt và tải lên làm Avatar cá nhân |
| **59** | `HDUpCover` | Thay ảnh bìa Cover | security | `fHDUpCover.cs` | Tải ảnh từ thư mục làm ảnh bìa timeline Facebook |
| **60** | `HDOnOff2FA` | Bật / Tắt bảo mật 2FA | security | `fHDOnOff2FA.cs` | Bật xác thực 2 lớp, trích xuất Secret Key lưu vào CSDL |
| **61** | `HDAddMail` | Thêm Email vào tài khoản | security | `fHDAddMail.cs` | Thêm Hotmail/Outlook, tự đọc OTP qua IMAP và xác nhận |
| **62** | `HDXoaSdt` | Gỡ số điện thoại | security | `fHDXoaSdt.cs` | Gỡ số điện thoại liên kết để chống checkpoint hoặc thu hồi |
| **63** | `HDDangXuatThietBiCu` | Đăng xuất khỏi thiết bị cũ | security | `fHDDangXuatThietBiCu.cs` | Đăng xuất tất cả các phiên đăng nhập lạ trên các máy khác |
| **64** | `HDXoaThietBiTinCay` | Xóa thiết bị tin cậy | security | `fHDXoaThietBiTinCay.cs` | Xóa danh sách trình duyệt đã lưu trong cài đặt bảo mật |
| **65** | `HDBatCheDoChuyenNghiep`| Bật Professional Mode | security | `fHDBatCheDoChuyenNghiep.cs`| Bật chế độ chuyên nghiệp để hiển thị bảng điều khiển creator |
| **66** | `HDLinkToInstagram` | Liên kết tài khoản Instagram | security | `fHDLinkToInstagram.cs` | Kết nối tài khoản Instagram trong Accounts Center |
| **67** | `HDHuyLienKetInstagram`| Hủy liên kết Instagram | security | `fHDHuyLienKetInstagram.cs` | Gỡ bỏ tài khoản Instagram khỏi Facebook |
| **68** | `HDUnlockProfile` | Mở khóa tính năng bị chặn | security | `fHDUnlockProfile.cs` | Tự động gửi kháng nghị mở khóa tính năng bị hạn chế |
| **69** | `HDScriptGemLogin` | Tích hợp Trình duyệt GemLogin| security | `fHDScriptGemLogin.cs` | Điều khiển profile Antidetect GemLogin qua REST API |
| **70** | `HDBaiVietTrenTuong` | Tương tác bài trên tường | security | `fHDBaiVietTrenTuong.cs` | Quét tường cá nhân của nick để thả reaction và viết bài mới |

---

## 5. TỔ CHỨC CẤU TRÚC THƯ MỤC DỰ ÁN & PHÂN CÔNG 4 DEVELOPERS

```
lushcare_electron/
├── docs/                                 # Tài liệu kỹ thuật dự án
│   ├── PRD.md                            # Đặc tả yêu cầu sản phẩm (BA)
│   ├── ARCHITECTURE.md                   # Kiến trúc hệ thống toàn diện (System Architect)
│   ├── DATABASE_SCHEMA.sql               # Lược đồ CSDL SQLite DDL (System Architect)
│   └── IPC_CONTRACTS.md                  # Hợp đồng giao tiếp liên tiến trình (System Architect)
├── database/                             # Thư mục chứa CSDL runtime SQLite
│   └── db_lushcare.sqlite                # CSDL quản lý tài khoản & hệ thống
├── interact/                             # Thư mục chứa CSDL kịch bản tương tác
│   └── interact.sqlite                   # CSDL kịch bản & từ điển 70 hành động
├── profiles/                             # Thư mục chứa dữ liệu trình duyệt Chromium độc lập
│   └── {uid}/                            # Dữ liệu profile Chrome riêng cho từng tài khoản
├── src/
│   ├── main/                             # [DEV 1 & DEV 2] TIẾN TRÌNH ELECTRON CHÍNH
│   │   ├── index.ts                      # Điểm khởi động ứng dụng Main Process
│   │   ├── windowManager.ts              # Quản lý cửa sổ chính, khay hệ thống (System Tray)
│   │   ├── ipc/                          # Bộ điều phối và xử lý kênh IPC (IPC Dispatchers)
│   │   │   ├── accountHandlers.ts        # Handlers cho CRUD tài khoản, Import, Export
│   │   │   ├── folderHandlers.ts         # Handlers cho quản trị thư mục
│   │   │   ├── browserHandlers.ts        # Handlers cho mở/đóng Chrome, lấy OTP 2FA
│   │   │   ├── scenarioHandlers.ts       # Handlers cho kịch bản và 70 hành động
│   │   │   ├── runnerHandlers.ts         # Handlers điều phối luồng chạy tương tác
│   │   │   ├── proxyHandlers.ts          # Handlers cho proxy và xoay IP
│   │   │   └── settingHandlers.ts        # Handlers cho cấu hình và tiện ích
│   │   ├── services/                     # Lớp nghiệp vụ chuyên sâu
│   │   │   ├── database/                 # [DEV 2]better-sqlite3 Database Layer
│   │   │   │   ├── connection.ts         # Khởi tạo kết nối, PRAGMA WAL mode
│   │   │   │   ├── accountRepository.ts  # DAO cho accounts (Prepared statements)
│   │   │   │   ├── folderRepository.ts   # DAO cho files
│   │   │   │   ├── scenarioRepository.ts # DAO cho Kich_Ban, Hanh_Dong, Tuong_Tac
│   │   │   │   └── migrations.ts         # Khởi tạo và nâng cấp lược đồ CSDL
│   │   │   ├── browser/                  # [DEV 1]Playwright Core Automation
│   │   │   │   ├── playwrightManager.ts  # Quản lý vòng đời Chrome, Profile Isolation
│   │   │   │   ├── stealthPlugin.ts      # Chống phát hiện bot (navigator.webdriver)
│   │   │   │   ├── windowTiler.ts        # Thuật toán chia lưới cửa sổ Chrome (NxM)
│   │   │   │   ├── loginAutofill.ts      # Nạp cookie, đăng nhập thông minh, giải 2FA
│   │   │   │   └── profileCleaner.ts     # Dọn dẹp cache và giải phóng dung lượng ổ đĩa
│   │   │   ├── proxy/                    # [DEV 2]Dịch vụ Xoay IP Động
│   │   │   │   ├── proxyManager.ts       # Điều phối hàng đợi và Mutex lock xoay IP
│   │   │   │   ├── minProxyService.ts    # Kết nối API MinProxy
│   │   │   │   ├── xProxyService.ts      # Kết nối Hub XProxy Dongle
│   │   │   │   ├── shopLikeService.ts    # Kết nối API ShopLike
│   │   │   │   └── obcProxyService.ts    # Kết nối OBC Hub
│   │   │   ├── runner/                   # [DEV 4]Bộ Điều phối Kịch bản Tương tác
│   │   │   │   ├── taskPoolExecutor.ts   # Quản lý đa luồng worker pool, Pause/Resume/Stop
│   │   │   │   ├── baseActionRunner.ts   # Lớp trừu tượng cho 70 hành động
│   │   │   │   ├── spinTextParser.ts     # Bộ giải mã cú pháp Spin Text lồng nhau
│   │   │   │   └── actions/              # Hiện thực hóa trọn vẹn 70 hành động
│   │   │   │       ├── feed/             # HDBaiVietNewsfeed, HDXemStory, HDDocThongBao...
│   │   │   │       ├── post/             # HDDangBai, HDDangReel, HDShareBai...
│   │   │   │       ├── friend/           # HDKetBanTepUid, HDXacNhanKetBan...
│   │   │   │       ├── group/            # HDThamGiaNhomUid, HDBaiVietNhom...
│   │   │   │       ├── page/             # HDBuffFollowLikePage, HDTaoPage...
│   │   │   │       ├── seeding/          # HDBuffLikeComment, HDTuongTacLivestream...
│   │   │   │       └── security/         # HDDoiMatKhau, HDOnOff2FA, HDAddMail...
│   │   │   ├── checkpoint/               # [DEV 2 & DEV 4]Giải Checkpoint 282 & 956
│   │   │   │   ├── solver282.ts          # Thuê SIM OTP + Giải Captcha + Gửi ảnh
│   │   │   │   ├── solver956.ts          # Bẻ khóa két sắt + Lấy OTP qua Hotmail
│   │   │   │   └── imapService.ts        # Kết nối IMAP TLS đọc mã xác thực mail
│   │   │   └── ai/                       # [DEV 2]AI Content Generator
│   │   │       └── aiContentService.ts   # Gọi Google Gemini & OpenAI ChatGPT
│   │   └── utils/
│   │       ├── totpGenerator.ts          # Tính mã OTP RFC 6238 từ Secret Key
│   │       └── logger.ts                 # Ghi log thời gian thực
│   ├── preload/                          # [DEV 1]CẦU NỐI PRELOAD (contextBridge)
│   │   ├── index.ts                      # Expose window.api
│   │   └── index.d.ts                    # TypeScript Global Declaration
│   ├── renderer/                         # [DEV 3]GIAO DIỆN NGƯỜI DÙNG REACT 18
│   │   ├── index.html
│   │   ├── src/
│   │   │   ├── main.tsx
│   │   │   ├── App.tsx
│   │   │   ├── components/
│   │   │   │   ├── DataGrid/             # Virtualized DataGrid 45 cột
│   │   │   │   │   ├── AccountTable.tsx  # TanStack Virtual Table
│   │   │   │   │   ├── ColumnHeader.tsx  # Sắp xếp, ghim cột, resize
│   │   │   │   │   └── ContextMenu.tsx   # Menu chuột phải đầy đủ thao tác
│   │   │   │   ├── Sidebar/              # Cây thư mục tài khoản
│   │   │   │   │   └── FolderTree.tsx    # Danh sách thư mục, đếm Live/Die
│   │   │   │   ├── Modals/               # Hộp thoại chức năng
│   │   │   │   │   ├── ImportModal.tsx   # Nhập tài khoản đa định dạng
│   │   │   │   │   ├── ExportModal.tsx   # Xuất tài khoản tùy chỉnh
│   │   │   │   │   ├── BatchUpdateModal.tsx # Cập nhật hàng loạt
│   │   │   │   │   └── ColumnConfigModal.tsx # Cấu hình ẩn/hiện 45 cột
│   │   │   │   ├── Scenarios/            # Trình quản lý kịch bản
│   │   │   │   │   ├── ScenarioList.tsx  # Danh sách kịch bản
│   │   │   │   │   ├── PipelineFlow.tsx  # Kéo thả sắp xếp bước hành động
│   │   │   │   │   └── ActionForms/      # 70 Form cấu hình hành động
│   │   │   │   └── LiveMonitor/          # Bảng điều khiển giám sát luồng
│   │   │   │       ├── LiveLogs.tsx      # Console log thời gian thực
│   │   │   │       └── ThreadStatus.tsx  # Tiến độ từng tài khoản
│   │   │   ├── pages/
│   │   │   │   ├── AccountsPage.tsx      # Trang quản lý tài khoản chính
│   │   │   │   ├── ScenariosPage.tsx     # Trang quản lý kịch bản
│   │   │   │   ├── TrashPage.tsx         # Trang thùng rác tài khoản đã xóa
│   │   │   │   ├── SettingsPage.tsx      # Trang cài đặt hệ thống
│   │   │   │   └── UtilitiesPage.tsx     # Trang 9 công cụ tiện ích
│   │   │   └── store/                    # Quản lý trạng thái Zustand
│   └── shared/                           # [DÙNG CHUNG CHO CẢ 4 DEVS]
│       ├── types/
│       │   ├── contracts.ts              # Toàn bộ Interface thực thể và Payload
│       │   └── ipc.ts                    # Chuẩn Envelope IpcResponse<T>
│       └── constants/
│           ├── actions.ts                # Metadata và cấu hình mặc định 70 hành động
│           └── errorCodes.ts             # Danh mục mã lỗi chuẩn
```

---

## 6. PHÂN CÔNG TRÁCH NHIỆM & KẾ HOẠCH BÀN GIAO CHO 4 DEVELOPERS

| Thành viên | Vai Trò Chuyên Trách | Module Đảm Nhiệm Chính | Deliverables Cốt Lõi |
| :--- | :--- | :--- | :--- |
| **Dev 1** | Automation & Core Lead | Main Shell, Playwright Manager, Stealth, Profile Isolation, Window Tiler | - `src/main/index.ts`, `windowManager.ts`<br>- `playwrightManager.ts`, `stealthPlugin.ts`<br>- `windowTiler.ts`, `loginAutofill.ts`<br>- `preload/index.ts` & contextBridge |
| **Dev 2** | Backend & Database Engineer | better-sqlite3 Layer, DAO Repositories, Proxy Rotators, IMAP Mail, TOTP | - `src/main/services/database/*`<br>- `src/main/services/proxy/*` (5 Hubs)<br>- `totpGenerator.ts`, `imapService.ts`<br>- `solver282.ts`, `solver956.ts` |
| **Dev 3** | Frontend & UI/UX Engineer | React 18, Tailwind, TanStack Virtual DataGrid (45 cột), Sidebar, Modals | - `src/renderer/components/DataGrid/*`<br>- `src/renderer/components/Sidebar/*`<br>- `src/renderer/components/Modals/*`<br>- `src/renderer/components/Scenarios/*` |
| **Dev 4** | Scenario Runner & QA Lead | Task Pool Executor, 70 Action Runners (fHD*), Spin Parser, E2E Testing | - `src/main/services/runner/taskPoolExecutor.ts`<br>- 70 file Action Runners trong `actions/*`<br>- `spinTextParser.ts`, `aiContentService.ts`<br>- Test Suite Vitest/Playwright E2E |

---

## 7. YÊU CẦU PHI CHỨC NĂNG, ĐÓNG GÓI & QUY CHUẨN VẬN HÀNH

### 7.1. Đóng gói Ứng dụng (Packaging & Distribution)
- Sử dụng **Electron Builder** cấu hình đóng gói cho nền tảng **Windows 10 / Windows 11 (x64)**.
- Tạo bộ cài đặt chuyên nghiệp qua NSIS Installer (`.exe`) và phiên bản Portable độc lập không cần cài đặt.
- Tự động đóng gói kèm Chromium nhúng hoặc cho phép cấu hình trỏ tới Google Chrome đã cài sẵn trên máy tính người dùng để giảm dung lượng file cài đặt xuống dưới 90 MB.

### 7.2. Bảo vệ Dữ liệu & Khôi phục Sau Sự cố (Crash Recovery & Data Integrity)
- Nhờ chế độ **WAL Mode** của `better-sqlite3`, nếu phần mềm bị tắt đột ngột (End Task trong Task Manager hoặc mất nguồn điện), cơ sở dữ liệu sẽ tự động khôi phục toàn vẹn dữ liệu từ file `-wal` trong lần khởi động tiếp theo mà không bị hỏng hóc hay mất mát.
- Cơ chế **Lock File Detection**: Khi mở trình duyệt cho UID $X$, hệ thống kiểm tra file lock `SingletonLock` trong `profiles/{uid}/`. Nếu Chrome trước đó bị crash treo tiến trình, hệ thống tự động tìm và kết liễu PID Chrome mồ côi (orphaned process) trước khi khởi tạo phiên mới, ngăn chặn hoàn toàn lỗi trình duyệt bị khóa.

---

## 8. KẾT LUẬN

Tài liệu Kiến trúc Kỹ thuật này cùng với **`DATABASE_SCHEMA.sql`** và **`IPC_CONTRACTS.md`** tạo thành bộ ba trụ cột vững chắc, định nghĩa rõ ràng cấu trúc hệ thống, ranh giới trách nhiệm và hợp đồng dữ liệu cho toàn bộ dự án **LushCare Electron**. Đội ngũ 4 lập trình viên có thể bắt tay ngay vào triển khai độc lập và ghép nối tích hợp một cách mượt mà và chính xác 100%.
