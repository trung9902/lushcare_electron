# HỢP ĐỒNG GIAO TIẾP LIÊN TIẾN TRÌNH (IPC CONTRACTS SPECIFICATION)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
### Tài liệu chuẩn dành cho 4 Developer (Lead, Backend, Frontend, Scenario Runner)
**Phiên bản:** 2.0  
**Tệp định nghĩa:** `docs/IPC_CONTRACTS.md`  
**Mục tiêu:** Cung cấp định nghĩa chuẩn xác 100% về Channels, TypeScript Interfaces, Request/Response payloads và Mã lỗi nhằm đảm bảo 4 kỹ sư phần mềm làm việc song song không xảy ra xung đột hay sai lệch kiểu dữ liệu.

---

## 1. NGUYÊN TẮC THIẾT KẾ & KIẾN TRÚC GIAO TIẾP IPC

### 1.1. Mô hình Bảo mật Electron contextBridge
Hệ thống tuân thủ tiêu chuẩn bảo mật nghiêm ngặt của Electron:
- `nodeIntegration: false` (Vô hiệu hóa Node.js trong Renderer để chống XSS/RCE).
- `contextIsolation: true` (Cách ly hoàn toàn ngữ cảnh JavaScript giữa Preload và Renderer).
- Toàn bộ giao tiếp thông qua cầu nối `window.api` (Preload API) được định kiểu bằng TypeScript Interface `LushCareApi`.

```
+-------------------------------------------------------------------------------+
| RENDERER PROCESS (React 18 + TanStack Virtual DataGrid)                       |
|   window.api.accounts.getAll(filter)                                          |
+---------------------------------------^---------------------------------------+
                                        | Typed invoke() / on()
+---------------------------------------v---------------------------------------+
| PRELOAD SCRIPT (contextBridge.exposeInMainWorld('api', ...))                  |
+---------------------------------------^---------------------------------------+
                                        | ipcRenderer.invoke / ipcMain.handle
+---------------------------------------v---------------------------------------+
| MAIN PROCESS & SERVICE DISPATCHER                                             |
|   ipcMain.handle('accounts:getAll', async (event, payload) => { ... })        |
+---------------------------------------^---------------------------------------+
                                        | Worker Thread / Task Pool
+---------------------------------------v---------------------------------------+
| WORKER POOL & DATABASE ENGINE (better-sqlite3 / Playwright / Proxy Rotator)   |
+-------------------------------------------------------------------------------+
```

### 1.2. Chuẩn hóa Định dạng Envelope (Standard IPC Envelope)

Toàn bộ các kênh IPC dạng Request - Response (`ipcRenderer.invoke` <-> `ipcMain.handle`) **bắt buộc** trả về cấu trúc chuẩn `IpcResponse<T>`:

```typescript
export interface IpcResponse<T = any> {
  success: boolean;            // true nếu xử lý thành công, false nếu có lỗi
  data?: T;                    // Dữ liệu kết quả trả về khi success = true
  error?: {
    code: string;              // Mã lỗi định danh (VD: 'ERR_ACCOUNT_NOT_FOUND')
    message: string;           // Thông báo lỗi thân thiện hiển thị trên giao diện
    details?: any;             // Chi tiết lỗi kỹ thuật hoặc Stack trace phục vụ debug
  };
  timestamp: number;           // Unix epoch timestamp (ms) tại thời điểm phản hồi
}
```

### 1.3. Mô hình Luồng Dữ liệu Sự kiện (Event-Driven Stream Channels)
Đối với các tiến trình chạy nền dài (Automation Task Runner, Live Log, Trạng thái xoay IP), Main Process sẽ đẩy sự kiện một chiều xuống Renderer thông qua `event.sender.send(channel, data)` hoặc `mainWindow.webContents.send(channel, data)`.  
Phía Renderer lắng nghe bằng cú pháp:
```typescript
const unsubscribe = window.api.on('runner:log', (logEntry) => {
  console.log(logEntry);
});
// Hủy đăng ký khi unmount component
return () => unsubscribe();
```

---

## 2. BẢNG DANH MỤC TOÀN BỘ IPC CHANNELS

| Phân hệ | Tên Channel | Hướng giao tiếp | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| **Accounts** | `accounts:getAll` | Renderer -> Main (invoke) | Lấy danh sách tài khoản kèm bộ lọc, phân trang, đếm |
| | `accounts:getById` | Renderer -> Main (invoke) | Lấy chi tiết 1 tài khoản theo ID |
| | `accounts:create` | Renderer -> Main (invoke) | Thêm mới 1 tài khoản thủ công |
| | `accounts:update` | Renderer -> Main (invoke) | Cập nhật thông tin 1 tài khoản |
| | `accounts:batchUpdate` | Renderer -> Main (invoke) | Cập nhật hàng loạt (nhiều ID) trong 1 Transaction |
| | `accounts:delete` | Renderer -> Main (invoke) | Chuyển tài khoản vào thùng rác (`active = 0`) |
| | `accounts:import` | Renderer -> Main (invoke) | Nhập hàng loạt tài khoản kèm xử lý trùng UID |
| | `accounts:export` | Renderer -> Main (invoke) | Xuất tài khoản ra định dạng tùy chọn (TXT, CSV) |
| | `accounts:moveToFolder` | Renderer -> Main (invoke) | Chuyển danh sách tài khoản sang thư mục khác |
| | `accounts:getTrash` | Renderer -> Main (invoke) | Lấy danh sách tài khoản trong thùng rác |
| | `accounts:restoreFromTrash`| Renderer -> Main (invoke) | Khôi phục tài khoản từ thùng rác |
| | `accounts:emptyTrash` | Renderer -> Main (invoke) | Xóa vĩnh viễn và dọn dẹp profile tài khoản đã xóa |
| **Folders** | `folders:getAll` | Renderer -> Main (invoke) | Lấy cây thư mục kèm số lượng tài khoản (Live/Die) |
| | `folders:create` | Renderer -> Main (invoke) | Thêm mới thư mục |
| | `folders:update` | Renderer -> Main (invoke) | Sửa tên hoặc thứ tự thư mục |
| | `folders:delete` | Renderer -> Main (invoke) | Xóa thư mục (chuyển nick sang thùng rác) |
| | `folders:reorder` | Renderer -> Main (invoke) | Cập nhật lại thứ tự sắp xếp STT |
| **Browser** | `browser:launch` | Renderer -> Main (invoke) | Mở trình duyệt Chrome cho 1 tài khoản (Profile, Stealth) |
| | `browser:close` | Renderer -> Main (invoke) | Đóng trình duyệt của 1 tài khoản |
| | `browser:closeAll` | Renderer -> Main (invoke) | Đóng toàn bộ các cửa sổ Chrome đang mở |
| | `browser:getActiveSessions`| Renderer -> Main (invoke) | Lấy danh sách các session Chrome đang chạy |
| | `browser:login` | Renderer -> Main (invoke) | Kích hoạt luồng tự động đăng nhập (Cookie / Pass) |
| | `browser:solve2FA` | Renderer -> Main (invoke) | Điền mã OTP 2FA vào form đăng nhập |
| | `browser:getOtp` | Renderer -> Main (invoke) | Sinh mã OTP 6 số chuẩn RFC 6238 từ Secret Key |
| | `browser:cleanProfile` | Renderer -> Main (invoke) | Xóa thư mục Chrome Profile của 1 hoặc nhiều tài khoản |
| | `browser:cleanAllProfiles`| Renderer -> Main (invoke) | Dọn dẹp cache, profile rác giải phóng ổ đĩa |
| **Scenarios** | `scenarios:getAll` | Renderer -> Main (invoke) | Lấy danh sách kịch bản tương tác |
| | `scenarios:getById` | Renderer -> Main (invoke) | Lấy chi tiết kịch bản và danh sách các bước hành động |
| | `scenarios:create` | Renderer -> Main (invoke) | Tạo mới kịch bản |
| | `scenarios:update` | Renderer -> Main (invoke) | Cập nhật thông tin kịch bản |
| | `scenarios:delete` | Renderer -> Main (invoke) | Xóa kịch bản (cascade xóa hành động con) |
| | `scenarios:duplicate` | Renderer -> Main (invoke) | Nhân bản kịch bản |
| **Actions** | `actions:getAllTypes` | Renderer -> Main (invoke) | Lấy danh mục 70 loại hành động tương tác (Tuong_Tac) |
| | `actions:create` | Renderer -> Main (invoke) | Thêm 1 bước hành động vào kịch bản |
| | `actions:update` | Renderer -> Main (invoke) | Cập nhật cấu hình JSON của bước hành động |
| | `actions:delete` | Renderer -> Main (invoke) | Xóa bước hành động |
| | `actions:reorder` | Renderer -> Main (invoke) | Sắp xếp lại thứ tự thực thi các bước (STT) |
| **Runner** | `runner:start` | Renderer -> Main (invoke) | Bắt đầu chạy kịch bản đa luồng cho các nick đã chọn |
| | `runner:pause` | Renderer -> Main (invoke) | Tạm dừng chạy các luồng |
| | `runner:resume` | Renderer -> Main (invoke) | Tiếp tục chạy các luồng |
| | `runner:stop` | Renderer -> Main (invoke) | Dừng toàn bộ luồng thực thi an toàn |
| | `runner:getStatus` | Renderer -> Main (invoke) | Lấy trạng thái tổng quan bộ điều phối luồng |
| **Stream Events** | `runner:onThreadStatus`| Main -> Renderer (event) | Thông báo cập nhật tiến độ, trạng thái của 1 tài khoản |
| | `runner:onLog` | Main -> Renderer (event) | Bắn dòng nhật ký thời gian thực (Live Log) |
| | `runner:onSummaryUpdate`| Main -> Renderer (event) | Cập nhật tổng số nick đang chạy, thành công, lỗi |
| | `runner:onCompleted` | Main -> Renderer (event) | Báo hiệu đợt chạy đã hoàn thành toàn bộ |
| **Proxy** | `proxy:check` | Renderer -> Main (invoke) | Kiểm tra Live/Die, Ping và IP ngoại mạng của Proxy |
| | `proxy:rotate` | Renderer -> Main (invoke) | Gọi lệnh đổi IP (MinProxy, XProxy, ShopLike, OBC, Dcom) |
| | `proxy:getAll` | Renderer -> Main (invoke) | Lấy danh sách cấu hình Proxy đã lưu |
| | `proxy:save` | Renderer -> Main (invoke) | Lưu hoặc cập nhật cấu hình Proxy Hub |
| | `proxy:delete` | Renderer -> Main (invoke) | Xóa cấu hình Proxy Hub |
| **Checkpoint** | `checkpoint:solve282` | Renderer -> Main (invoke) | Giải checkpoint 282 (thuê SIM OTP, giải captcha, gửi ảnh) |
| | `checkpoint:solve956` | Renderer -> Main (invoke) | Giải checkpoint 956 két sắt (đọc OTP Hotmail IMAP) |
| | `checkpoint:checkImap` | Renderer -> Main (invoke) | Kiểm tra kết nối hòm thư Hotmail/Outlook qua IMAP |
| **Settings** | `settings:get` | Renderer -> Main (invoke) | Lấy cấu hình theo key ('general', 'interaction'...) |
| | `settings:set` | Renderer -> Main (invoke) | Cập nhật cấu hình theo key |
| | `settings:getAll` | Renderer -> Main (invoke) | Lấy toàn bộ cấu hình hệ thống |
| **Utilities** | `utilities:findUid` | Renderer -> Main (invoke) | Chuyển link Facebook thành UID |
| | `utilities:checkLiveUid`| Renderer -> Main (invoke) | Check Live/Die hàng loạt UID không cần login |
| | `utilities:testSpin` | Renderer -> Main (invoke) | Xem trước kết quả giải mã cú pháp Spin Text |
| | `utilities:aiGenerate` | Renderer -> Main (invoke) | Gọi AI Gemini / OpenAI sinh nội dung theo prompt |
| **System** | `system:getInfo` | Renderer -> Main (invoke) | Lấy thông số hệ thống máy chủ (RAM, CPU, Ổ đĩa) |
| | `system:selectDirectory`| Renderer -> Main (invoke) | Mở hộp thoại hệ thống chọn thư mục (VD: thư mục ảnh) |
| | `system:openPath` | Renderer -> Main (invoke) | Mở thư mục hoặc file trong Windows Explorer |

---

## 3. CHI TIẾT CONTRACTS & TYPESCRIPT PAYLOADS

### 3.1. Phân hệ Quản lý Tài khoản (Accounts IPC Contracts)

#### Kênh: `accounts:getAll`
- **Mục đích:** Cung cấp dữ liệu cho TanStack Virtual DataGrid hiển thị danh sách tài khoản theo thư mục hoặc tìm kiếm.
- **Request Payload:**
```typescript
export interface AccountFilterPayload {
  folderId?: number;           // ID thư mục (-2: Tất cả, 999999: Nhiều thư mục, >0: Thư mục cụ thể)
  folderIds?: number[];        // Danh sách ID thư mục khi chọn nhiều
  search?: string;             // Từ khóa tìm kiếm toàn văn (UID, Name, Email, Proxy, Ghi chú)
  infoFilter?: string;         // Lọc theo tình trạng: 'All' | 'Live' | 'Die' | 'Checkpoint' | 'Chưa tạo'
  statusFilter?: string;       // Lọc theo trạng thái chạy: 'All' | 'Sẵn sàng' | 'Đang chạy' | 'Lỗi'
  page?: number;               // Trang hiện tại (1-indexed, mặc định 1)
  limit?: number;              // Số lượng dòng mỗi trang (mặc định 50000 để load vào memory cache Virtualizer)
  sortBy?: string;             // Cột sắp xếp (VD: 'id', 'uid', 'name', 'interactEnd')
  sortOrder?: 'ASC' | 'DESC';  // Chiều sắp xếp
}
```
- **Response Payload:**
```typescript
export interface AccountEntity {
  id: number;
  uid: string;
  pass: string | null;
  token: string | null;
  cookie: string | null;
  cookie1: string | null;
  email: string | null;
  email2: string | null;
  email_old: string | null;
  passmail: string | null;
  passmail_old: string | null;
  mailrecovery: string | null;
  passmailrecovery: string | null;
  phone: string | null;
  name: string | null;
  fa2: string | null;
  useragent: string | null;
  proxy: string | null;
  idfile: number | null;
  folder_name?: string;        // Tên thư mục join từ bảng files
  friends: string;
  groups: string;
  pages: string;
  pagePro5: string;
  follow: string;
  birthday: string | null;
  gender: string | null;
  location: string | null;
  hometown: string | null;
  currentCity: string | null;
  job: string | null;
  dating: string | null;
  ads: string | null;
  bm: string | null;
  wallPosts: string;
  fbBlock: string | null;
  avatar: string | null;
  profile: string;             // 'Đã tạo' | 'Chưa tạo'
  status: string;              // Trạng thái runtime
  info: string;                // 'Live' | 'Die' | 'Checkpoint 282' | 'Checkpoint 956'
  status282: string | null;
  interactEnd: string | null;
  dateCreateAcc: string | null;
  dateImport: string | null;
  kichban: string | null;
  infoDevice: string | null;
  cookieHotmail: string | null;
  ghiChu: string | null;
  active: number;
  created_at: string;
  updated_at: string;
}

export interface AccountListResult {
  accounts: AccountEntity[];
  total: number;
  liveCount: number;
  dieCount: number;
  checkpointCount: number;
  noProfileCount: number;
}
```
- **Ví dụ JSON Phản hồi Thành công:**
```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": 101,
        "uid": "100089283748291",
        "pass": "PassSecret123@",
        "token": "EAABsbCS1iZ...",
        "cookie": "c_user=100089283748291; xs=28%3A98273...",
        "name": "Nguyễn Văn An",
        "email": "nguyenvanan92@outlook.com",
        "fa2": "JBSWY3DPEHPK3PXP",
        "proxy": "14.225.21.19:8080:user:pass",
        "idfile": 1,
        "folder_name": "Clone Ngoại",
        "status": "Sẵn sàng",
        "info": "Live",
        "profile": "Đã tạo",
        "friends": "1250",
        "active": 1,
        "created_at": "2026-10-15 08:30:00"
      }
    ],
    "total": 1,
    "liveCount": 1,
    "dieCount": 0,
    "checkpointCount": 0,
    "noProfileCount": 0
  },
  "timestamp": 1792182000000
}
```

---

#### Kênh: `accounts:batchUpdate`
- **Mục đích:** Cập nhật thông tin hàng loạt (Proxy, Mật khẩu, Trạng thái, Kịch bản gán, Thư mục) cho danh sách tài khoản đã chọn.
- **Request Payload:**
```typescript
export interface AccountBatchUpdatePayload {
  accountIds: number[];                    // Mảng các ID tài khoản được tích chọn trên DataGrid
  updates: Partial<Omit<AccountEntity, 'id' | 'created_at' | 'updated_at'>>;
}
```
- **Response Payload:**
```typescript
export interface BatchUpdateResult {
  updatedCount: number;                    // Số lượng bản ghi đã cập nhật thành công
}
```

---

#### Kênh: `accounts:import`
- **Mục đích:** Nhập hàng nghìn tài khoản với tùy chọn định dạng, xử lý trùng lặp và phân bổ vào thư mục mục tiêu.
- **Request Payload:**
```typescript
export interface AccountImportPayload {
  folderId: number;                        // ID thư mục đích
  rawText: string;                         // Nội dung text dán vào từ clipboard hoặc tệp
  delimiter: string;                       // Dấu phân cách trường: '|', '\t', ':', ','
  fieldsOrder: (keyof AccountEntity)[];    // Thứ tự các trường tương ứng (VD: ['uid', 'pass', 'fa2', 'cookie'])
  duplicateHandling: 'skip' | 'overwrite'; // 'skip': Bỏ qua UID đã có, 'overwrite': Ghi đè thông tin mới
  assignedProxyList?: string[];            // Danh sách Proxy gán lần lượt hoặc ngẫu nhiên
  assignedUserAgentList?: string[];        // Danh sách User-Agent gán kèm
}
```
- **Response Payload:**
```typescript
export interface AccountImportResult {
  totalLines: number;
  importedCount: number;
  overwrittenCount: number;
  skippedDuplicates: number;
  invalidLines: number;
}
```

---

#### Kênh: `accounts:export`
- **Mục đích:** Xuất dữ liệu tài khoản theo định dạng người dùng cấu hình.
- **Request Payload:**
```typescript
export interface AccountExportPayload {
  accountIds: number[];                    // Danh sách ID tài khoản cần xuất
  selectedFields: (keyof AccountEntity)[]; // Các trường chọn xuất (VD: ['uid', 'pass', 'fa2'])
  delimiter: string;                       // Ký tự phân cách (VD: '|', '\t', ',')
  exportType: 'txt' | 'csv' | 'clipboard'; // Hình thức xuất file hoặc copy trực tiếp
  filePath?: string;                       // Đường dẫn lưu file (nếu xuất file)
}
```
- **Response Payload:**
```typescript
export interface AccountExportResult {
  successCount: number;
  outputFilePath?: string;
  clipboardText?: string;
}
```

---

### 3.2. Phân hệ Quản trị Thư mục (Folders IPC Contracts)

#### Kênh: `folders:getAll`
- **Request Payload:** `void` (hoặc `{ includeTrashCount?: boolean }`)
- **Response Payload:**
```typescript
export interface FolderItem {
  id: number;
  name: string;
  createddate: string;
  active: number;
  STT: number;
  totalAccounts: number;
  liveAccounts: number;
  dieAccounts: number;
  checkpointAccounts: number;
}

export interface FolderListResult {
  folders: FolderItem[];
  allCount: number;
  trashCount: number;
}
```

#### Kênh: `folders:create`
- **Request Payload:**
```typescript
export interface FolderCreatePayload {
  name: string;
  STT?: number;
}
```
- **Response Payload:** `FolderItem`

---

### 3.3. Phân hệ Điều khiển Trình duyệt (Browser & Automation IPC Contracts)

#### Kênh: `browser:launch`
- **Mục đích:** Khởi tạo Chromium với Profile riêng biệt, áp dụng Stealth, Proxy và sắp xếp cửa sổ theo tọa độ chia lưới.
- **Request Payload:**
```typescript
export interface BrowserLaunchPayload {
  accountId: number;                       // ID tài khoản cần mở
  windowIndex?: number;                    // Vị trí cửa sổ (từ 0 đến N-1) để tính tọa độ Grid
  customProxy?: string;                    // Proxy ghi đè tạm thời (nếu có)
  headless?: boolean;                      // Chạy ẩn hoặc hiện giao diện
  autoLogin?: boolean;                     // Tự động kích hoạt đăng nhập sau khi mở
  loginMode?: 'cookie' | 'uid_pass' | 'cookie_pass';
}
```
- **Response Payload:**
```typescript
export interface BrowserLaunchResult {
  accountId: number;
  uid: string;
  browserPid: number;
  profilePath: string;
  proxyUsed: string | null;
  status: 'launched' | 'already_running';
}
```

---

#### Kênh: `browser:getOtp`
- **Mục đích:** Tính mã OTP 6 số chuẩn RFC 6238 TOTP tức thì từ chuỗi Secret Key để copy vào clipboard hoặc phục vụ autofill.
- **Request Payload:**
```typescript
export interface GetOtpPayload {
  secretKey: string;                       // Khóa 2FA Base32 (VD: 'JBSWY3DPEHPK3PXP')
}
```
- **Response Payload:**
```typescript
export interface GetOtpResult {
  otp: string;                             // Chuỗi 6 chữ số (VD: '482910')
  remainingSeconds: number;                // Số giây còn hiệu lực trong chu kỳ 30s
}
```

---

#### Kênh: `browser:cleanProfile`
- **Mục đích:** Xóa dữ liệu Profile Chrome (`profiles/{uid}`) để giải phóng bộ nhớ đĩa cứng.
- **Request Payload:**
```typescript
export interface CleanProfilePayload {
  accountIds: number[];                    // Danh sách ID tài khoản cần dọn dẹp profile
  deleteCookies?: boolean;                 // Xóa cookies
  deleteCacheOnly?: boolean;               // Chỉ xóa cache (giữ lại session đăng nhập)
}
```
- **Response Payload:**
```typescript
export interface CleanProfileResult {
  cleanedCount: number;
  freedBytes: number;                      // Dung lượng giải phóng (Bytes)
  freedFormatted: string;                  // Chuỗi dung lượng thân thiện (VD: '1.45 GB')
}
```

---

### 3.4. Phân hệ Kịch bản & Hành động (Scenarios & Actions IPC Contracts)

#### Kênh: `scenarios:getById`
- **Request Payload:**
```typescript
export interface ScenarioGetByIdPayload {
  scenarioId: number;
}
```
- **Response Payload:**
```typescript
export interface ScenarioActionDetail {
  id: number;
  scenarioId: number;
  actionTypeId: number;
  actionTypeCode: string;                  // Mã hành động: 'HDBaiVietNewsfeed', 'HDDangBai'...
  actionTypeName: string;                  // Tên tiếng Việt hiển thị
  category: string;                        // Phân nhóm: 'feed', 'post', 'friend'...
  actionName: string;                      // Tên riêng người dùng đặt
  config: Record<string, any>;             // Object cấu hình JSON đã parse
  STT: number;
}

export interface ScenarioDetailResult {
  id: number;
  name: string;
  config: Record<string, any>;
  STT: number;
  actions: ScenarioActionDetail[];
}
```

---

#### Kênh: `actions:create`
- **Request Payload:**
```typescript
export interface ActionCreatePayload {
  scenarioId: number;
  actionTypeId: number;
  actionName: string;
  config: Record<string, any>;             // Object tham số được serialize thành JSON string
  STT?: number;
}
```
- **Response Payload:** `ScenarioActionDetail`

---

#### Kênh: `actions:reorder`
- **Mục đích:** Lưu lại thứ tự thực thi mới sau khi người dùng kéo thả các bước hành động trên giao diện Pipeline.
- **Request Payload:**
```typescript
export interface ActionReorderPayload {
  scenarioId: number;
  orderedActionIds: number[];              // Danh sách ID hành động theo thứ tự mới từ trên xuống
}
```
- **Response Payload:** `{ success: boolean; updatedCount: number }`

---

### 3.5. Phân hệ Điều phối Luồng Tương tác (Runner & Automation Pool IPC Contracts)

#### Kênh: `runner:start`
- **Mục đích:** Kích hoạt Task Pool chạy kịch bản đa luồng cho các tài khoản được chọn.
- **Request Payload:**
```typescript
export interface RunnerStartPayload {
  accountIds: number[];                    // Danh sách ID tài khoản tham gia đợt chạy
  scenarioId?: number;                     // ID kịch bản chung (nếu null sẽ dùng kịch bản riêng gán cho từng nick)
  useAssignedScenario?: boolean;           // Ưu tiên chạy kịch bản gán trên từng tài khoản
  maxThreads: number;                      // Số luồng chạy đồng thời (VD: 5)
  delayOpenRange: [number, number];        // Khoảng nghỉ mở giữa các luồng [min, max] giây
  delayCloseRange: [number, number];       // Khoảng nghỉ đóng giữa các luồng [min, max] giây
  proxyRotationConfig?: {
    enabled: boolean;
    proxyType: 'static' | 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'dcom';
    threadsPerProxy: number;               // Số luồng chia sẻ trên 1 proxy
  };
}
```
- **Response Payload:**
```typescript
export interface RunnerStartResult {
  sessionId: string;                       // Định danh phiên chạy duy nhất (UUID v4)
  totalQueued: number;                     // Tổng số tài khoản đưa vào hàng đợi
  maxThreads: number;
  startedAt: number;
}
```

---

#### Kênh Stream Sự kiện (Main -> Renderer Push Events)

##### 1. Kênh: `runner:onThreadStatus`
Được Main Process phát ra mỗi khi tài khoản thay đổi trạng thái hoặc thực thi xong một bước hành động:
```typescript
export interface ThreadStatusEvent {
  sessionId: string;
  accountId: number;
  uid: string;
  status: string;                          // 'Đang mở trình duyệt', 'Lướt newsfeed (2/5 bài)', 'Thành công', 'Lỗi'...
  info?: string;                           // 'Live', 'Die', 'Checkpoint 282'
  currentActionIndex: number;              // Vị trí bước hiện tại (1-based)
  totalActions: number;                    // Tổng số bước trong kịch bản
  progressPercent: number;                 // 0 - 100%
  errorMessage?: string;
  updatedAt: number;
}
```

##### 2. Kênh: `runner:onLog`
Được bắn về Renderer để hiển thị trực tiếp lên Console Log / Live Activity Panel:
```typescript
export interface LiveLogEvent {
  id: string;
  timestamp: string;                       // 'HH:mm:ss'
  accountId?: number;
  uid?: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  actionName?: string;
  message: string;
}
```

##### 3. Kênh: `runner:onSummaryUpdate`
Báo cáo thống kê tiến độ tổng quan định kỳ mỗi 500ms:
```typescript
export interface RunnerSummaryEvent {
  sessionId: string;
  total: number;
  running: number;
  success: number;
  failed: number;
  remaining: number;
  elapsedSeconds: number;
}
```

---

### 3.6. Phân hệ Proxy & Xoay IP (Proxy IPC Contracts)

#### Kênh: `proxy:check`
- **Request Payload:**
```typescript
export interface ProxyCheckPayload {
  proxyString: string;                     // 'IP:Port' hoặc 'IP:Port:User:Pass'
  timeoutMs?: number;                      // Thời gian chờ phản hồi tối đa (mặc định 10000ms)
}
```
- **Response Payload:**
```typescript
export interface ProxyCheckResult {
  isAlive: boolean;
  publicIp: string | null;
  responseTimeMs: number;
  country: string | null;
  city: string | null;
  errorMessage?: string;
}
```

---

#### Kênh: `proxy:rotate`
- **Mục đích:** Kích hoạt lệnh đổi IP cho một cấu hình Proxy Hub cụ thể.
- **Request Payload:**
```typescript
export interface ProxyRotatePayload {
  proxyConfigId?: number;
  proxyType: 'minproxy' | 'xproxy' | 'shoplike' | 'obc' | 'dcom';
  apiKey?: string;
  apiUrl?: string;
  proxyString?: string;                    // Proxy cần reset (đối với XProxy dongle)
}
```
- **Response Payload:**
```typescript
export interface ProxyRotateResult {
  success: boolean;
  newIp: string | null;
  newProxyString: string | null;
  cooldownSeconds: number;
  message: string;
}
```

---

### 3.7. Phân hệ Tiện ích Mở rộng (Utilities IPC Contracts)

#### Kênh: `utilities:findUid`
- **Request Payload:** `{ url: string }`
- **Response Payload:** `{ uid: string; originalUrl: string }`

#### Kênh: `utilities:checkLiveUid`
- **Request Payload:** `{ uids: string[] }`
- **Response Payload:** `{ results: Array<{ uid: string; isLive: boolean; error?: string }> }`

#### Kênh: `utilities:testSpin`
- **Request Payload:** `{ template: string; count?: number }` (Cú pháp Spin `{A|B|C}`)
- **Response Payload:** `{ variations: string[] }`

#### Kênh: `utilities:aiGenerate`
- **Request Payload:**
```typescript
export interface AiGeneratePayload {
  provider: 'gemini' | 'openai';
  promptTemplate: string;                  // Mẫu prompt có placeholder (VD: '{content}')
  contentInput: string;                    // Nội dung thay thế cho {content}
  apiKey?: string;
}
```
- **Response Payload:** `{ generatedText: string; tokensUsed?: number }`

---

## 4. TỔNG HỢP MÃ LỖI CHUẨN (STANDARD ERROR CODES)

Khi `success = false`, trường `error.code` sẽ trả về một trong các hằng số chuẩn sau:

| Nhóm lỗi | Mã lỗi (Error Code) | Ý nghĩa & Hướng xử lý |
| :--- | :--- | :--- |
| **Validation** | `ERR_INVALID_PAYLOAD` | Tham số gửi từ Renderer không hợp lệ hoặc thiếu trường bắt buộc |
| | `ERR_DUPLICATE_ENTRY` | Bản ghi đã tồn tại trong CSDL (trùng UID, tên kịch bản) |
| **Database** | `ERR_DB_QUERY_FAILED` | Lỗi thực thi truy vấn SQLite |
| | `ERR_DB_LOCKED` | Cơ sở dữ liệu đang bị khóa bởi tiến trình khác sau 5000ms timeout |
| | `ERR_RECORD_NOT_FOUND` | Không tìm thấy bản ghi theo ID yêu cầu |
| **Browser** | `ERR_CHROMIUM_NOT_FOUND`| Không tìm thấy đường dẫn thực thi Chromium trên máy tính |
| | `ERR_BROWSER_LAUNCH` | Lỗi khi Playwright kết nối hoặc khởi chạy tiến trình trình duyệt |
| | `ERR_PROFILE_IN_USE` | Thư mục Profile đang bị một tiến trình Chrome khác chiếm dụng (Lock file) |
| | `ERR_NAVIGATION_TIMEOUT`| Trình duyệt không tải được trang Facebook trong thời gian quy định |
| **Proxy** | `ERR_PROXY_CONNECTION` | Không kết nối được tới Proxy (Proxy Die hoặc sai thông tin xác thực) |
| | `ERR_PROXY_ROTATION` | Gọi API đổi IP thất bại (hết hạn ngạch hoặc lỗi cổng Hub) |
| | `ERR_PROXY_COOLDOWN` | Proxy đang trong thời gian chờ cooldown đổi IP |
| **Authentication** | `ERR_LOGIN_FAILED` | Đăng nhập thất bại (Sai mật khẩu hoặc tài khoản bị vô hiệu hóa) |
| | `ERR_2FA_INVALID_KEY` | Khóa Secret Key 2FA không đúng định dạng Base32 |
| | `ERR_CHECKPOINT_HIT` | Tài khoản rơi vào màn hình Checkpoint 282 hoặc 956 |
| **Runner** | `ERR_RUNNER_ALREADY_BUSY`| Hệ thống đang có một đợt chạy kịch bản chưa kết thúc |
| | `ERR_SCENARIO_EMPTY` | Kịch bản được chỉ định không chứa bất kỳ hành động nào |
| **System** | `ERR_IO_PERMISSION` | Lỗi phân quyền khi đọc ghi file hoặc thư mục trên Windows |
| | `ERR_INTERNAL_EXCEPTION` | Lỗi ngoại lệ chưa được xử lý trong Main Process |

---

## 5. ĐỊNH NGHĨA PRELOAD CONTEXT BRIDGE API (`src/preload/index.d.ts`)

File TypeScript Declaration hoàn chỉnh cho Frontend Dev sử dụng:

```typescript
import { IpcResponse } from '../shared/types/ipc';
import {
  AccountEntity,
  AccountFilterPayload,
  AccountListResult,
  AccountBatchUpdatePayload,
  AccountImportPayload,
  AccountImportResult,
  AccountExportPayload,
  AccountExportResult,
  FolderItem,
  FolderListResult,
  BrowserLaunchPayload,
  BrowserLaunchResult,
  GetOtpPayload,
  GetOtpResult,
  CleanProfilePayload,
  CleanProfileResult,
  ScenarioDetailResult,
  ScenarioActionDetail,
  ActionCreatePayload,
  ActionReorderPayload,
  RunnerStartPayload,
  RunnerStartResult,
  ThreadStatusEvent,
  LiveLogEvent,
  RunnerSummaryEvent,
  ProxyCheckPayload,
  ProxyCheckResult,
  ProxyRotatePayload,
  ProxyRotateResult,
  AiGeneratePayload
} from '../shared/types/contracts';

export interface LushCareApi {
  // Accounts API
  accounts: {
    getAll: (filter: AccountFilterPayload) => Promise<IpcResponse<AccountListResult>>;
    getById: (id: number) => Promise<IpcResponse<AccountEntity>>;
    create: (account: Partial<AccountEntity>) => Promise<IpcResponse<AccountEntity>>;
    update: (id: number, updates: Partial<AccountEntity>) => Promise<IpcResponse<boolean>>;
    batchUpdate: (payload: AccountBatchUpdatePayload) => Promise<IpcResponse<{ updatedCount: number }>>;
    delete: (ids: number[]) => Promise<IpcResponse<{ deletedCount: number }>>;
    import: (payload: AccountImportPayload) => Promise<IpcResponse<AccountImportResult>>;
    export: (payload: AccountExportPayload) => Promise<IpcResponse<AccountExportResult>>;
    moveToFolder: (accountIds: number[], targetFolderId: number) => Promise<IpcResponse<boolean>>;
    getTrash: () => Promise<IpcResponse<AccountEntity[]>>;
    restoreFromTrash: (ids: number[]) => Promise<IpcResponse<{ restoredCount: number }>>;
    emptyTrash: () => Promise<IpcResponse<{ purgedCount: number }>>;
  };

  // Folders API
  folders: {
    getAll: () => Promise<IpcResponse<FolderListResult>>;
    create: (name: string) => Promise<IpcResponse<FolderItem>>;
    update: (id: number, name: string) => Promise<IpcResponse<boolean>>;
    delete: (id: number, deleteAccountsPermanently?: boolean) => Promise<IpcResponse<boolean>>;
    reorder: (folderIds: number[]) => Promise<IpcResponse<boolean>>;
  };

  // Browser & Automation API
  browser: {
    launch: (payload: BrowserLaunchPayload) => Promise<IpcResponse<BrowserLaunchResult>>;
    close: (accountId: number) => Promise<IpcResponse<boolean>>;
    closeAll: () => Promise<IpcResponse<boolean>>;
    getOtp: (payload: GetOtpPayload) => Promise<IpcResponse<GetOtpResult>>;
    cleanProfile: (payload: CleanProfilePayload) => Promise<IpcResponse<CleanProfileResult>>;
  };

  // Scenarios & Actions API
  scenarios: {
    getAll: () => Promise<IpcResponse<Array<{ id: number; name: string; actionCount: number; STT: number }>>>;
    getById: (id: number) => Promise<IpcResponse<ScenarioDetailResult>>;
    create: (name: string, config?: Record<string, any>) => Promise<IpcResponse<{ id: number; name: string }>>;
    update: (id: number, name: string, config?: Record<string, any>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    duplicate: (id: number) => Promise<IpcResponse<{ newScenarioId: number }>>;
  };

  actions: {
    getAllTypes: () => Promise<IpcResponse<Array<{ id: number; code: string; name: string; category: string; defaultJson: string }>>>;
    create: (payload: ActionCreatePayload) => Promise<IpcResponse<ScenarioActionDetail>>;
    update: (id: number, name: string, config: Record<string, any>) => Promise<IpcResponse<boolean>>;
    delete: (id: number) => Promise<IpcResponse<boolean>>;
    reorder: (payload: ActionReorderPayload) => Promise<IpcResponse<boolean>>;
  };

  // Runner & Automation Execution Pool
  runner: {
    start: (payload: RunnerStartPayload) => Promise<IpcResponse<RunnerStartResult>>;
    pause: () => Promise<IpcResponse<boolean>>;
    resume: () => Promise<IpcResponse<boolean>>;
    stop: () => Promise<IpcResponse<boolean>>;
    getStatus: () => Promise<IpcResponse<{ isRunning: boolean; isPaused: boolean; activeThreads: number }>>;
    
    // Push Event Listeners
    onThreadStatus: (callback: (event: ThreadStatusEvent) => void) => () => void;
    onLog: (callback: (event: LiveLogEvent) => void) => () => void;
    onSummaryUpdate: (callback: (event: RunnerSummaryEvent) => void) => () => void;
    onCompleted: (callback: () => void) => () => void;
  };

  // Proxy API
  proxy: {
    check: (payload: ProxyCheckPayload) => Promise<IpcResponse<ProxyCheckResult>>;
    rotate: (payload: ProxyRotatePayload) => Promise<IpcResponse<ProxyRotateResult>>;
  };

  // Settings & System API
  settings: {
    get: <T = any>(key: string) => Promise<IpcResponse<T>>;
    set: (key: string, value: any) => Promise<IpcResponse<boolean>>;
    getAll: () => Promise<IpcResponse<Record<string, any>>>;
  };

  system: {
    getInfo: () => Promise<IpcResponse<{ platform: string; arch: string; cpus: number; freeMemMB: number; totalMemMB: number }>>;
    selectDirectory: () => Promise<IpcResponse<string | null>>;
    openPath: (path: string) => Promise<IpcResponse<boolean>>;
  };

  // Utilities API
  utilities: {
    findUid: (url: string) => Promise<IpcResponse<{ uid: string }>>;
    checkLiveUid: (uids: string[]) => Promise<IpcResponse<Array<{ uid: string; isLive: boolean }>>>;
    testSpin: (template: string, count?: number) => Promise<IpcResponse<string[]>>;
    aiGenerate: (payload: AiGeneratePayload) => Promise<IpcResponse<{ generatedText: string }>>;
  };
}

declare global {
  interface Window {
    api: LushCareApi;
  }
}
```

---

*Tài liệu này là cam kết kỹ thuật bắt buộc giữa 4 Developer trong toàn bộ các giai đoạn triển khai.*
