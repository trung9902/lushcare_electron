# TÀI LIỆU QUY TRÌNH TRẢI NGHIỆM NGƯỜI DÙNG (USER FLOW SPECIFICATION)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
### Đặc tả Luồng Thao tác Người dùng Toàn diện & Trực quan
**Tác giả:** UI/UX Lead Designer  
**Phiên bản:** 2.0 (Chính thức)  
**Tệp tài liệu:** `docs/USER_FLOW.md`  
**Ngôn ngữ:** Tiếng Việt  

---

## 1. TỔNG QUAN KIẾN TRÚC TRẢI NGHIỆM NGƯỜI DÙNG (UX ARCHITECTURE)

Hệ thống **LushCare Electron** được xây dựng xung quanh vòng đời quản trị và nuôi tài khoản Facebook quy mô lớn:

```
+-----------------------------------------------------------------------------------------+
|                                TỔNG QUAN USER JOURNEY                                   |
+-----------------------------------------------------------------------------------------+
|                                                                                         |
|  [1. Khởi động & Mở App]                                                                |
|          │                                                                              |
|          ▼                                                                              |
|  [2. Quản lý Thư mục] ──► Tạo thư mục mới / Chọn thư mục làm việc                       |
|          │                                                                              |
|          ▼                                                                              |
|  [3. Smart Import]    ──► Nhập danh sách tài khoản (Custom Format / Auto Detect)        |
|          │                                                                              |
|          ▼                                                                              |
|  [4. Quản lý & Lọc]   ──► Chọn tài khoản (Ctrl+A, Shift+Click, Lọc Live/Die/CP)         |
|          │                                                                              |
|          ├─────────────────────────────────────────┐                                    |
|          ▼                                         ▼                                    |
|  [5A. Mở Trình duyệt Đơn lẻ]              [5B. Cấu hình Kịch bản Tương tác]             |
|    - Profile cô lập                         - Chọn từ 70 hành động                      |
|    - Tự nạp Cookie & OTP 2FA                - Pipeline kéo thả sắp xếp                  |
|    - Thao tác tay / Check nick              - Xem trước Spin text                       |
|          │                                         │                                    |
|          │                                         ▼                                    |
|          │                                [6. Thiết lập Đổi IP & Luồng]                 |
|          │                                  - MinProxy / XProxy / OBC                   |
|          │                                  - Giới hạn luồng per IP                     |
|          │                                         │                                    |
|          │                                         ▼                                    |
|          └────────────────────────────────► [7. Chạy Đa luồng & Giám sát Realtime]      |
|                                             - Grid Chrome tự động chia lưới             |
|                                             - Panel Thread Monitor cập nhật từng giây   |
|                                             - Live Logs & Xử lý Checkpoint tự động      |
|                                                    │                                    |
|                                                    ▼                                    |
|                                           [8. Báo cáo & Xuất dữ liệu]                   |
|                                             - Cập nhật thông số CSDL                    |
|                                             - Copy mã OTP 6 số / Export TXT, CSV        |
+-----------------------------------------------------------------------------------------+
```

---

## 2. CHI TIẾT CÁC LUỒNG THAO TÁC CHÍNH (CORE USER FLOWS)

---

### LUỒNG 1: KHỞI ĐỘNG ỨNG DỤNG & PHỤC HỒI TRẠNG THÁI (APP LAUNCH & STATE RESTORE)

#### Mục tiêu
Người dùng khởi chạy phần mềm từ màn hình Desktop, hệ thống nạp dữ liệu SQLite siêu tốc trong $\le 1.5s$, khôi phục vị trí cửa sổ và thư mục tài khoản làm việc gần nhất.

#### Biểu đồ Luồng Thao tác
```
[User Click Icon App]
        │
        ▼
[Electron Main Process Boot] ──► Mở CSDL SQLite WAL Mode & Kiểm tra Schema
        │
        ▼
[Hiển thị Splash Screen] ──────► Tải cấu hình UserSettings từ JSON
        │
        ▼
[Renderer Khởi tạo] ──────────► window.api.folders.getAll() + window.api.accounts.getAll()
        │
        ▼
[Màn hình Chính sẵn sàng] ────► Khôi phục:
                                  1. Thư mục được chọn lần trước
                                  2. Cột 45 trường đã ẩn/hiện
                                  3. Tỷ lệ phân chia Sidebar / Bottom Panel
```

#### Các bước tương tác & Phản hồi UI
1. **Khởi động:** Người dùng nhấp đúp vào icon `LushCare.exe` trên Desktop hoặc thanh Taskbar.
2. **Khung nhìn Splash Screen:**
   - Xuất hiện một cửa sổ nhỏ viền mờ cao cấp với Logo LushCare màu tím, thanh loading chuyển động mượt mà.
   - Text trạng thái bên dưới: *"Đang khởi tạo cơ sở dữ liệu SQLite..."* -> *"Đang nạp cấu hình hệ thống..."* -> *"Sẵn sàng!"*.
3. **Màn hình chính xuất hiện:**
   - Splash đóng lại, cửa sổ chính hiển thị ở kích thước và tọa độ đã lưu trước đó (mặc định: `1440 x 900`).
   - Cây thư mục bên trái tự động bôi đậm thư mục làm việc gần nhất (hoặc mặc định `[Tất cả thư mục]`).
   - Bảng Virtual DataGrid tải ngay lập tức 50 dòng đầu tiên của danh sách tài khoản mà không có bất kỳ hiện tượng giật màn hình.
   - Thanh trạng thái dưới cùng hiển thị: `Tổng số tài khoản: 12,450 | Live: 10,210 | Die: 1,840 | CP: 400 | Sẵn sàng`.

---

### LUỒNG 2: QUẢN LÝ THƯ MỤC TÀI KHOẢN (FOLDER MANAGEMENT WORKFLOW)

#### Mục tiêu
Phân loại hàng chục nghìn tài khoản vào các thư mục logic (VD: "Via Ngoại cổ", "Clone nuôi Newfeed", "Nick Seeding Page", "Nick Đổi Pass") để dễ dàng điều phối chiến dịch.

#### Biểu đồ Luồng Thao tác
```
[Người dùng xem Sidebar]
        │
        ├──► [Click Chuột Phải vào Cây Thư Mục]
        │           │
        │           ├──► Chọn "Thêm thư mục mới" ──► Nhập tên ──► Nhấn Enter/Lưu ──► Tạo mới
        │           ├──► Chọn "Đổi tên"          ──► Sửa tên trực tiếp trên ô inline
        │           └──► Chọn "Xóa thư mục"      ──► Dialog cảnh báo ──► Chuyển nick sang Thùng rác
        │
        └──► [Kéo thả tài khoản (Drag & Drop)]
                    │
                    ▼
             Chọn N tài khoản trên DataGrid ──► Kéo thả vào Thư mục đích ──► Cập nhật idfile tức thì
```

#### Các bước chi tiết
1. **Xem danh sách thư mục:**
   - Sidebar bên trái hiển thị danh sách thư mục cha:
     - 🗂️ `[Tất cả thư mục]` (Hiển thị toàn bộ tài khoản trong hệ thống).
     - 📁 `Via Việt Cổ 2018 - 2020` (Badge: `1,250`).
     - 📁 `Clone 1000 Bạn Bè Seeding` (Badge: `3,400`).
     - 🗄️ `Thùng rác - Tài khoản đã xóa` (Badge: `215`).
2. **Tạo thư mục mới:**
   - Người dùng bấm nút `+ Thêm thư mục` trên đỉnh Sidebar hoặc click chuột phải chọn `Thêm thư mục mới`.
   - Một ô nhập liệu inline xuất hiện với viền tím phát sáng `ring-2 ring-indigo-500`.
   - Người dùng gõ tên: `Dàn Nuôi Tương Tác Tháng 10` và nhấn `Enter` (hoặc click icon Check).
   - Hệ thống gửi IPC `folders:create`, thư mục mới được lưu vào CSDL `db_lushcare.sqlite` và xuất hiện ngay trên cây thư mục.
3. **Di chuyển tài khoản vào thư mục:**
   - **Cách 1 (Kéo thả):** Bôi đen các dòng nick trên bảng -> Giữ chuột trái kéo vào tên thư mục đích -> Nhả chuột.
   - **Cách 2 (Menu chuột phải):** Click chuột phải vào danh sách tài khoản đã chọn -> `Chuyển thư mục` -> Chọn thư mục đích trong danh sách xổ xuống -> Hệ thống cập nhật trường `idfile` của tất cả tài khoản trong 1 giao dịch SQLite duy nhất (< 50ms).

---

### LUỒNG 3: NHẬP LIỆU THÔNG MINH (SMART IMPORT ACCOUNTS)

#### Mục tiêu
Hỗ trợ người dùng dán hoặc tải lên danh sách từ vài chục đến 50.000 tài khoản với đủ các loại định dạng phân cách, tự động phát hiện định dạng, lọc trùng UID và phân bổ thư mục trong vài giây.

#### Biểu đồ Luồng Thao tác
```
[Bấm nút "Thêm tài khoản" hoặc Ctrl + I]
                │
                ▼
[Mở Modal Smart Import]
                │
                ├── 1. Dán văn bản vào ô Textarea (hoặc bấm "Chọn file .txt")
                ├── 2. Chọn Định dạng:
                │      - Presets: Uid|Pass|2FA, Uid|Pass|Token|Cookie|Email|PassMail|2FA...
                │      - Hoặc bấm "Tự tạo định dạng (Custom Format)"
                ├── 3. Chọn Thư mục đích lưu tài khoản
                ├── 4. Tùy chọn nâng cao:
                │      [x] Không nhập tài khoản trùng UID
                │      [ ] Ghi đè thông tin nếu trùng UID
                │      [x] Tự động gán danh sách Proxy kèm theo
                │
                ▼
[Bấm "Xem trước dữ liệu (Preview)"]
                │
                ▼
[Hiển thị bảng Demo 5 dòng đầu đã bóc tách]
                │
                ▼
[Bấm "Bắt đầu Nhập"] ──► Gửi IPC `accounts:import` (Chunk 500 rows/batch)
                │
                ▼
[Thanh tiến trình chạy realtime 0% -> 100%]
                │
                ▼
[Thông báo kết quả Toast: "Đã nhập thành công 4,850 nick, bỏ qua 150 nick trùng!"]
```

#### Đặc tả Trình tạo định dạng tùy chỉnh (Custom Format Builder)
- Nếu người dùng chọn định dạng `Tự chọn (Custom)`:
  - Một thanh công cụ chứa 12 Badge trường xuất hiện: `[+ UID]`, `[+ Pass]`, `[+ 2FA]`, `[+ Cookie]`, `[+ Token]`, `[+ Email]`, `[+ PassMail]`, `[+ MailKhôiPhục]`, `[+ Phone]`, `[+ Proxy]`, `[+ UserAgent]`, `[+ GhiChú]`.
  - Người dùng click vào từng badge theo thứ tự định dạng file của mình (VD: bấm `UID` -> `Pass` -> `Cookie` -> `Proxy`).
  - Hệ thống tự động tạo chuỗi định dạng: `UID|Pass|Cookie|Proxy` với ký tự phân cách tùy chọn (`|`, Tab, `:`, `,`).

---

### LUỒNG 4: CHỌN TÀI KHOẢN & TƯƠNG TÁC DANH SÁCH (SELECTION & LIST INTERACTIONS)

#### Mục tiêu
Cho phép người dùng lựa chọn chính xác nhóm tài khoản mục tiêu cực nhanh bằng cả chuột và phím tắt chuyên nghiệp.

#### Các kịch bản thao tác tuyển chọn:
1. **Chọn tất cả (`Ctrl + A`):**
   - Người dùng bấm `Ctrl + A` khi đang ở trên bảng DataGrid.
   - Toàn bộ các tài khoản đang hiển thị (phù hợp với bộ lọc tìm kiếm hiện tại) chuyển sang trạng thái đã chọn (Checkbox = checked, nền dòng chuyển sang màu tím đậm `bg-indigo-950/60`).
   - Huy hiệu Toolbar cập nhật: *"Đã chọn: 1,500 / 1,500 nick"*.
2. **Chọn theo khoảng liên tục (`Shift + Click`):**
   - Người dùng click chọn dòng thứ 10.
   - Nhấn giữ phím `Shift` và click vào dòng thứ 50.
   - Hệ thống tự động chọn toàn bộ 41 dòng từ 10 đến 50 ngay tức khắc.
3. **Đảo trạng thái từng dòng bằng phím (`Space`):**
   - Người dùng dùng phím mũi tên `Up / Down` để di chuyển con trỏ qua các dòng.
   - Nhấn phím cách `Space`: dòng đang focus tự động đổi trạng thái (chọn -> bỏ chọn, hoặc bỏ chọn -> chọn) mà không cần dùng chuột.
4. **Bộ lọc trạng thái 1-Click (Quick Filter Chips):**
   - Trên thanh Toolbar có các chip lọc nhanh:
     - `Tất cả (12,450)`
     - `🟢 Live (10,210)`
     - `🔴 Die (1,840)`
     - `🟠 CP 282 (250)`
     - `🟡 CP 956 (150)`
     - `⚪ Chưa có Profile (620)`
   - Người dùng click vào `🟠 CP 282`: Bảng DataGrid lọc ngay lập tức chỉ hiển thị 250 nick đang bị Checkpoint 282 để chuẩn bị đưa vào kịch bản giải kháng tự động.

---

### LUỒNG 5: MỞ TRÌNH DUYỆT ĐƠN LẺ & THAO TÁC THỦ CÔNG (SINGLE BROWSER LAUNCH & MANUAL CHECK)

#### Mục tiêu
Người dùng muốn kiểm tra một tài khoản cụ thể, mở trình duyệt Chrome thật với đúng Profile, Cookie, User-Agent và Proxy riêng để xem giao diện Facebook hoặc giải quyết vấn đề thủ công.

#### Biểu đồ Luồng Thao tác
```
[User Click đúp vào dòng UID hoặc Chuột phải ──► "Mở trình duyệt"]
                               │
                               ▼
[Chọn Chế độ Mở]:
  ├── 1. Mở kèm Cookie (Tự động nạp session không cần gõ pass)
  ├── 2. Mở tự động điền Uid|Pass + Tự vượt 2FA (RFC 6238 TOTP)
  ├── 3. Mở Profile trắng (Chưa đăng nhập)
  └── 4. Mở trên thiết bị di động mô phỏng (Mobile User-Agent)
                               │
                               ▼
[Playwright Launch Chrome với Profile cô lập tại `profiles/{uid}`]
                               │
                               ▼
[Gán Proxy & Stealth Args chống phát hiện tự động hóa]
                               │
                               ▼
[Cửa sổ Chrome xuất hiện trên màn hình tại tọa độ thuận tiện]
                               │
                               ▼
[Dòng tài khoản trên DataGrid chuyển trạng thái "Đang mở trình duyệt" (Pulse Blue)]
                               │
                               ▼
[Khi người dùng đóng Chrome ──► Bắt sự kiện close ──► Lưu Cookie mới vào SQLite]
```

#### Điểm đột phá về trải nghiệm:
- **Tự động sao chép OTP 2FA:** Khi mở trình duyệt hoặc khi đang ở màn hình Facebook yêu cầu mã 6 số, người dùng chỉ cần nhấn `Ctrl + Shift + C` trên bảng điều khiển hoặc click chuột phải chọn `Copy mã 2FA 6 số`. Hệ thống tự tính toán mã OTP bằng thuật toán RFC 6238 từ Secret Key và copy thẳng vào Clipboard. Người dùng chỉ việc nhấn `Ctrl + V` vào ô nhập của Facebook.

---

### LUỒNG 6: THIẾT LẬP KỊCH BẢN TƯƠNG TÁC (SCENARIO BUILDER WORKFLOW)

#### Mục tiêu
Xây dựng chuỗi quy trình tương tác tự nhiên gồm nhiều hành động liên tiếp (trong kho 70 hành động có sẵn) để mô phỏng chính xác hành vi người dùng thật, tránh bị thuật toán Facebook phạt.

#### Biểu đồ Luồng Thao tác
```
[Nhấn nút "Cấu hình Kịch bản" trên Toolbar]
                    │
                    ▼
[Mở Modal Scenario Builder (Bố cục 2 Cột Chuyên Nghiệp)]
                    │
   ┌────────────────┴────────────────┐
   ▼                                 ▼
[Cột Trái: Danh sách Kịch bản]     [Cột Phải: Pipeline Hành động của Kịch bản đang chọn]
 - Nuôi nick mới tạo               1. 🌐 Lướt Newsfeed (3-5 phút, like 40%)
 - Tương tác nhóm & Fanpage        2. 📱 Xem Story bạn bè (2-3 tin)
 - Seeding bài viết bán hàng       3. ☕ Nghỉ giải lao (15-30 giây)
 - Đổi mật khẩu & Bật 2FA          4. 💬 Bình luận bài viết theo từ khóa (Spin text)
                                   5. 👥 Kết bạn theo gợi ý (2-3 người)
                    │
                    ├──► [Bấm "+ Thêm hành động"]
                    │           │
                    │           ▼
                    │    [Mở Drawer Danh mục 70 Hành động]
                    │    (Chia 7 nhóm có Icon và ô tìm kiếm từ khóa)
                    │           │
                    │           ▼
                    │    [Chọn hành động: VD "Đăng bài viết"]
                    │           │
                    │           ▼
                    │    [Mở Form Cấu hình Chi tiết Hành động]:
                    │      - Nhập nội dung (Spin text: `{Chào cả nhà|Hello mọi người}`)
                    │      - Nút bấm: "Kiểm tra Spin Text (Test Preview)"
                    │      - Chọn thư mục ảnh đính kèm
                    │      - Số lượng bài đăng: Min 1 - Max 2
                    │           │
                    │           ▼
                    │    [Bấm "Thêm vào kịch bản"]
                    │
                    ├──► [Kéo thả (Drag & Drop) để thay đổi thứ tự các bước]
                    │
                    └──► [Bấm "Lưu kịch bản" ──► Gửi IPC `scenarios:update` / `actions:create`]
```

---

### LUỒNG 7: CHẠY ĐA LUỒNG & GIÁM SÁT TIẾN TRÌNH THỜI GIAN THỰC (MULTI-THREAD EXECUTION & LIVE MONITOR)

#### Mục tiêu
Vận hành tự động đồng thời từ 2 đến 50 luồng Chrome song song, tự động xoay IP khi cần, theo dõi sát sao tiến độ từng tài khoản mà không làm đơ giật giao diện.

#### Biểu đồ Luồng Thao tác
```
[User chọn 50 tài khoản ──► Bấm nút "BẮT ĐẦU" (Play)]
                          │
                          ▼
[Hộp thoại Xác nhận Chạy Tương tác nhanh]:
  - Kịch bản áp dụng: [Nuôi nick hàng ngày v2]
  - Số luồng chạy đồng thời: [5 luồng]
  - Phương thức đổi IP: [MinProxy API Key] (Xoay sau mỗi 1 nick hoàn thành)
  - Sắp xếp lưới cửa sổ: [2 Hàng x 3 Cột (Tự động chia màn hình)]
                          │
                          ▼
[Bấm "CHẠY NGAY" ──► Gửi IPC `runner:start`]
                          │
                          ▼
[Giao diện chuyển sang Chế độ Giám sát (Running Mode)]:
  - Nút "Bắt đầu" chuyển thành "Tạm dừng (Pause)" và "Dừng hẳn (Stop)"
  - Panel đáy tự động mở tab "Giám sát Luồng (Thread Monitor)"
                          │
                          ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ MAIN PROCESS ĐIỀU PHỐI (Node.js Task Pool Executor):                           │
│  - Luồng 1 (UID: 10001): Mở Chrome -> Đang lướt Newsfeed -> Đã like 2 bài       │
│  - Luồng 2 (UID: 10002): Đang đổi IP MinProxy (Chờ cooldown 10s...)              │
│  - Luồng 3 (UID: 10003): Gặp Checkpoint 282 -> Tự gọi API Thuê SIM nhận OTP...   │
│  - Luồng 4 (UID: 10004): Hoàn thành kịch bản -> Cập nhật CSDL -> Đóng Chrome     │
│  - Luồng 5 (UID: 10005): Đang nạp Cookie -> Đăng nhập thành công                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                          │
                          ▼
[Đẩy sự kiện Realtime IPC `runner:onThreadStatus` & `runner:onLog`]:
  - Bảng DataGrid: Badge dòng tài khoản tương ứng chớp sáng xanh (`Running`)
  - Cột `status` cập nhật: *"Lướt Newsfeed (2/5 bài)"*
  - Khung Live Logs hiển thị dòng chữ xanh: `[14:22:15] [10001] Đã like bài viết thành công.`
                          │
                          ▼
[Khi tất cả 50 tài khoản hoàn tất]:
  - Hệ thống phát âm thanh thông báo nhẹ (Notification Chime)
  - Hiển thị Modal Tổng kết:
    *"Chiến dịch hoàn thành! Thành công: 47 | Gặp lỗi/Checkpoint: 3 | Thời gian: 18 phút 42 giây"*
```

#### Xử lý Tình huống Nguy cấp (Safety & Emergency Controls):
- **Tạm dừng (`Pause`):** Khi người dùng muốn xem xét hoặc mạng có vấn đề, bấm `Pause` -> Các cửa sổ Chrome đang chạy giữ nguyên trạng thái, không đóng và không mở thêm tài khoản mới.
- **Tiếp tục (`Resume`):** Bấm `Resume` -> Các luồng tiếp tục chạy từ vị trí đang dừng.
- **Dừng khẩn cấp (`Stop`):** Bấm `Stop` -> Hệ thống gửi lệnh ngắt an toàn tới Playwright, đóng toàn bộ các cửa sổ Chrome đang mở trong $\le 2s$, giải phóng bộ nhớ RAM và bảo toàn toàn vẹn dữ liệu trong CSDL SQLite.

---

### LUỒNG 8: XUẤT DỮ LIỆU & BÁO CÁO (EXPORT & REPORT WORKFLOW)

#### Mục tiêu
Trích xuất dữ liệu tài khoản theo các mẫu quy chuẩn hoặc tùy chỉnh để giao cho khách hàng, đối tác hoặc sao lưu định kỳ.

#### Biểu đồ Luồng Thao tác
```
[User chọn các tài khoản cần xuất ──► Bấm nút "Xuất file" hoặc Ctrl + E]
                               │
                               ▼
[Hộp thoại Modal Export Dữ liệu Xuất hiện]:
  ├── 1. Chọn Định dạng xuất:
  │      - [x] Định dạng chuẩn TXT (Uid|Pass|2FA|Cookie|Email|PassMail)
  │      - [ ] File bảng tính Excel / CSV (Đầy đủ các cột thông tin)
  │      - [ ] Xuất riêng danh sách Cookie để nạp tiện ích khác
  │      - [ ] Xuất danh sách Link Checkpoint 956 để gửi bên dịch vụ mở khóa
  ├── 2. Bộ lọc tình trạng khi xuất:
  │      - Chỉ xuất các nick "Live"
  │      - Bỏ qua các nick không có mật khẩu
  └── 3. Chọn Thư mục lưu file trên máy tính
                               │
                               ▼
[Bấm "Xác nhận Xuất File"] ──► Gửi IPC `accounts:export`
                               │
                               ▼
[Hệ thống ghi file trong tiến trình nền] ──► Mở thông báo Toast:
  "Đã xuất thành công 1,200 tài khoản ra file: C:/Exports/Via_Live_1710.txt [Mở thư mục]"
```

---

## 3. MA TRẬN CHUYỂN ĐỔI TRẠNG THÁI GIAO DIỆN (UI STATE TRANSITION MATRIX)

| Trạng thái Hệ thống | Toolbar | Bảng DataGrid | Sidebar | Panel Giám sát Đáy | Cửa sổ Chrome |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **1. Trạng thái Nghỉ (Idle)** | Nút `Play` sáng tím; các nút Import/Export/Settings hoạt động | Cho phép chọn dòng, sửa ô, kéo thả, mở menu chuột phải | Cho phép thêm/sửa/xóa thư mục bình thường | Thu gọn tối thiểu hoặc hiển thị lịch sử cũ | Toàn bộ đóng |
| **2. Đang Chạy Đa Luồng (Running)** | Nút `Play` đổi thành `Pause` (vàng) & `Stop` (đỏ); nút Import/Xóa bị khóa mờ | Vẫn cuộn mượt 60fps; các dòng đang chạy có hiệu ứng pulse; không thể xóa tài khoản đang chạy | Không thể xóa thư mục đang có tài khoản chạy | Tự động bung lên, hiển thị tiến độ từng thread & log chạy liên tục | Mở theo lưới chia màn hình (Grid Tiling) |
| **3. Tạm dừng (Paused)** | Nút `Resume` sáng xanh; Nút `Stop` đỏ | Cho phép xem thông tin nhưng không thể kích hoạt đợt chạy mới | Khóa thao tác nhạy cảm | Giữ nguyên trạng thái dòng log cuối cùng | Cửa sổ Chrome giữ nguyên phiên làm việc |
| **4. Lỗi Mạng / Proxy chết** | Nút `Play` tạm vô hiệu hóa nếu toàn bộ Proxy hỏng | Các dòng bị lỗi chuyển sang màu đỏ viền nhấp nháy | Bình thường | Bắn log cảnh báo cấp độ `[ERROR]` màu đỏ | Tự động đóng tab lỗi, kích hoạt đổi IP mới |

---

## 4. CHI TIẾT CÁC PHẢN HỒI LỖI & PHỤC HỒI (ERROR HANDLING & RECOVERY)

1. **Lỗi Trùng UID khi Import:**
   - Hệ thống không ngắt toàn bộ tiến trình nhập.
   - Các dòng trùng sẽ được ghi nhận vào danh sách loại trừ và hiển thị bảng tổng kết: *"Bỏ qua 45 nick trùng UID đã tồn tại trong CSDL"*. Người dùng có thể bấm *"Xem danh sách UID bị trùng"* để kiểm tra.
2. **Lỗi Trình duyệt bị tắt đột ngột (User vô tình đóng cửa sổ Chrome):**
   - Playwright bắt sự kiện `browser.on('disconnected')`.
   - Thread Worker ghi nhận trạng thái: *"Người dùng đã đóng trình duyệt trước khi hoàn tất kịch bản"*.
   - Dòng tài khoản trên bảng DataGrid chuyển từ `Running` về `Sẵn sàng`, cột `status` hiển thị thông báo nhẹ màu xám, không gây crash ứng dụng.
3. **Lỗi Proxy không thể kết nối (Proxy Connection Failed):**
   - Hệ thống tự động kiểm tra `api.ipify.org` trước khi nạp trang Facebook.
   - Nếu timeout quá 10 giây, thread tự động giải phóng tài khoản, ghi log cảnh báo: `[PROXY_TIMEOUT] Proxy không phản hồi, đang thử chuyển sang Proxy dự phòng...`.
