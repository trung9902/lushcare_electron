# TÀI LIỆU BẢN VẼ GIAO DIỆN & CẤU TRÚC CHI TIẾT (WIREFRAMES SPECIFICATION)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
### Bản vẽ Cấu trúc Chi tiết Giao diện Người dùng trên React 18 + Tailwind CSS
**Tác giả:** UI/UX Lead Designer  
**Phiên bản:** 2.0 (Chính thức)  
**Tệp tài liệu:** `docs/WIREFRAMES.md`  
**Ngôn ngữ:** Tiếng Việt & Sơ đồ ASCII Layout Chuẩn Quốc Tế  

---

## 1. TỔNG QUAN BỐ CỤC KHUNG CỬA SỔ CHÍNH (MAIN SHELL ARCHITECTURE)

Toàn bộ ứng dụng chạy trong cửa sổ Electron Frameless Window (không dùng viền chuẩn Windows cũ) với Custom Titlebar đồng bộ phong cách Dark Mode cao cấp.

```
+---------------------------------------------------------------------------------------------------------------------------------------+
| [A] CUSTOM TITLEBAR (40px) - Drag Area, App Logo, System Summary, Theme Toggle, Window Controls (Min/Max/Close)                      |
+---------------------------------------------------------------------------------------------------------------------------------------+
| [B] TOP TOOLBAR (52px) - Primary Action Buttons, Quick Filters, Search UID/Email, Thread Control Slider                               |
+-------------------------------------+-------------------------------------------------------------------------------------------------+
| [C] LEFT SIDEBAR (260px)            | [D] MAIN WORKSPACE: VIRTUAL DATAGRID (Flex-1)                                                   |
| - Header: Cây Thư Mục & Nút Thêm    | - Sticky Header: Checkbox, STT, UID, Tình trạng, Hành động, Proxy, Kịch bản... (45 cột)        |
| - Danh mục thư mục (Folder Tree)    | - TanStack Virtualizer Table Body (Cuộn mượt 60 FPS, 50.000+ tài khoản)                         |
|   + [Tất cả] (12,450)               | - Dòng tài khoản với Badge màu, Runtime Pulse, Cell Truncation                                  |
|   + Folder 1 (1,250)                | - Menu Chuột Phải 4 Cấp Đa Năng (Context Menu)                                                  |
|   + Folder 2 (3,400)                |                                                                                                 |
|   + [Thùng rác] (215)               |                                                                                                 |
| - Footer Card: Proxy & System Stats |                                                                                                 |
+-------------------------------------+-------------------------------------------------------------------------------------------------+
| [E] COLLAPSIBLE BOTTOM PANEL (Chiều cao co giãn: 180px - 320px, có thể thu gọn xuống 32px)                                            |
| - Tabs: [1. Giám Sát Luồng (Thread Monitor)] | [2. Nhật Ký Live (Live Logs)] | [3. Tài Nguyên Hệ Thống (CPU/RAM)]                     |
| - Danh sách tiến trình các luồng đang chạy thời gian thực / Dòng log máy chủ màu sắc hacker console                                   |
+---------------------------------------------------------------------------------------------------------------------------------------+
| [F] STATUS BAR (24px) - Tổng số tài khoản, Số nick đang chọn, Trạng thái Proxy, Phiên bản V2.0 LTS                                    |
+---------------------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. CHI TIẾT CÁC PHÂN VÙNG GIAO DIỆN CHÍNH (DETAILED SCREEN WIREFRAMES)

---

### PHÂN VÙNG A: THANH TIÊU ĐỀ TÙY BIẾN (CUSTOM WINDOW TITLEBAR)

Thanh tiêu đề hỗ trợ kéo thả di chuyển cửa sổ (`-webkit-app-region: drag`), tích hợp logo thương hiệu, bộ đếm thống kê nhanh và các nút điều khiển cửa sổ tiêu chuẩn.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [APP-LOGO]  LUSHCARE ELECTRON  v2.0   │  📁 Thư mục: [Via Cổ Nuôi Seeding]  │  ⚡ Luồng chạy: 5/10  │  💾 SQLite: WAL OK  │  [☼]  ─  □  ✕ │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Phân rã Component & Tailwind Tokens:
1. **Logo & Thương hiệu (Trái):**
   - Icon: Biểu tượng khiên bảo mật pha tia sét cách điệu `ShieldAlert` / `Sparkles` màu tím sáng.
   - Text: `font-bold tracking-wider text-slate-100 text-sm` kết hợp badge phiên bản `bg-indigo-900/60 text-indigo-300 text-[10px] px-1.5 py-0.5 rounded`.
2. **Khu vực Kéo di chuyển (Center Drag Region):**
   - Vùng kéo thả cửa sổ: `-webkit-app-region: drag`.
   - Các badge trạng thái con (no-drag): Thư mục hiện tại, tổng số luồng đang chạy thời gian thực.
3. **Cụm nút công cụ & Điều khiển cửa sổ (Phải - `-webkit-app-region: no-drag`):**
   - Nút Chuyển đổi Giao diện (Theme Toggle): Icon `Sun` / `Moon` (`p-1.5 text-slate-400 hover:text-white rounded-md`).
   - Nút Thu nhỏ (Minimize): Icon `Minus` (`w-10 h-10 hover:bg-slate-800`).
   - Nút Phóng to / Khôi phục (Maximize/Restore): Icon `Square` (`w-10 h-10 hover:bg-slate-800`).
   - Nút Đóng (Close Window): Icon `X` (`w-10 h-10 hover:bg-rose-600 hover:text-white`).

---

### PHÂN VÙNG B: THANH CÔNG CỤ ĐIỀU KHIỂN CHÍNH (TOP ACTION TOOLBAR)

Nơi tập trung toàn bộ các thao tác cốt lõi: Khởi chạy kịch bản, thêm nick, đổi IP, tìm kiếm và lọc dữ liệu nhanh.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [▶ BẮT ĐẦU] [⏸ TẠM DỪNG] [⏹ DỪNG] │ [➕ Thêm Nick] [💾 Xuất File] [⚡ Kịch Bản] [🔀 Đổi IP] [👁 Cột] │ 🔍 [Tìm UID, Email, Proxy...] │
│                                                                                                                                       │
│ Bộ lọc nhanh: [Tất cả (12,450)] [🟢 Live (10,210)] [🔴 Die (1,840)] [🟠 CP 282 (250)] [🟡 CP 956 (150)]  │ Đã chọn: [120] / 12,450 nick │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Chi tiết các thành phần trên Toolbar:
- **Cụm điều khiển luồng (Execution Control Group):**
  - **Nút "BẮT ĐẦU" (Primary Play):** `bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white font-semibold px-4 h-9 rounded-md shadow-lg shadow-indigo-500/25 flex items-center gap-2`. Phím tắt: `Ctrl + R`.
  - **Nút "TẠM DỪNG" (Pause):** `bg-amber-600/20 border border-amber-600/50 hover:bg-amber-600/30 text-amber-300 px-3 h-9 rounded-md`. Chỉ sáng khi đang có luồng chạy.
  - **Nút "DỪNG" (Emergency Stop):** `bg-rose-600/20 border border-rose-600/50 hover:bg-rose-600 text-rose-300 hover:text-white px-3 h-9 rounded-md`.
- **Cụm chức năng quản trị (Management Group):**
  - **Nút "Thêm Nick" (Import):** Icon `UserPlus`, phím tắt `Ctrl + I`. Mở Smart Import Modal.
  - **Nút "Xuất File" (Export):** Icon `Download`, phím tắt `Ctrl + E`.
  - **Nút "Kịch Bản" (Scenarios):** Icon `Sliders`. Mở Scenario Pipeline Builder.
  - **Nút "Đổi IP" (Proxy Config):** Icon `Shuffle`. Mở bảng cấu hình 5 dịch vụ xoay Proxy.
  - **Nút "Cột" (Column Config):** Icon `Columns`. Cấu hình ẩn/hiện 45 cột.
- **Ô Tìm kiếm toàn văn (Search Box):**
  - Input `bg-slate-950/80 border border-slate-700 h-9 rounded-md w-72 pl-9 pr-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500`.
  - Phím tắt kích hoạt tức thì: `Ctrl + F`.
- **Dải Chip Lọc Nhanh (Quick Filter Chips):**
  - Nhấp chuột lọc tức thì DataGrid không cần reload trang. Chip đang kích hoạt có viền sáng và nền đậm.

---

### PHÂN VÙNG C: SIDEBAR CÂY THƯ MỤC TÀI KHOẢN (ACCOUNT FOLDER SIDEBAR)

Chiều rộng cố định `260px`, nền `bg-slate-900 border-r border-slate-800`. Cho phép kéo giãn chiều rộng (Resizable Divider).

```
┌───────────────────────────────────────┐
│ 📁 DANH MỤC THƯ MỤC      [➕ Thêm Mới]│
├───────────────────────────────────────┤
│                                       │
│ 🗂️ [Tất cả tài khoản]         12,450 │
│    ├── 🟢 Live                10,210 │
│    └── 🔴 Checkpoint/Die       2,240 │
│                                       │
│ 📁 Via Cổ Ngoại 2018           1,250 │
│ 📁 Clone Nuôi Newfeed          3,400 │
│ 📁 Dàn Seeding Fanpage VIP       850 │
│ 📁 Tài Khoản Chờ Giải CP         400 │
│ 📁 Tài Khoản Đổi Pass Xong     1,100 │
│                                       │
│ ───────────────────────────────────── │
│ 🗄️ Thùng Rác (Đã xóa)            215 │
│                                       │
├───────────────────────────────────────┤
│ 📊 TRẠNG THÁI HỆ THỐNG                │
│ Proxy Hoạt Động: 8/10 cổng (MinProxy) │
│ CPU: 18%  │  RAM: 1.4 GB / 16 GB      │
│ Dung lượng Profile: 12.8 GB [Dọn Dẹp] │
└───────────────────────────────────────┘
```

#### Tương tác trên Sidebar:
- **Click vào thư mục:** DataGrid chỉ hiển thị tài khoản thuộc `idfile` đó.
- **Click chuột phải vào thư mục:** Menu xuất hiện gồm: `Thêm thư mục con`, `Đổi tên thư mục (F2)`, `Chuyển toàn bộ nick sang thư mục khác`, `Xóa thư mục (chuyển nick sang Thùng rác)`.
- **Kéo thả (Drag & Drop):** Hỗ trợ kéo các dòng tài khoản từ DataGrid thả vào bất kỳ thư mục nào trên cây để cập nhật `idfile` tức thì.
- **Card Trạng Thái Hệ Thống (Dưới cùng):** Hiển thị dung lượng SSD mà các Profile Chrome đang chiếm dụng, có nút `[Dọn Dẹp]` để gọi tính năng giải phóng dung lượng ổ cứng.

---

### PHÂN VÙNG D: BẢNG DỮ LIỆU ẢO HÓA 45 CỘT (VIRTUAL DATAGRID)

Sử dụng **TanStack Table + Virtualizer**. Chiều cao dòng chuẩn `34px`, font chữ sắc nét, hiệu ứng cuộn 60fps mượt mà trên 50.000 dòng.

```
┌────┬────┬─────────────────┬──────────────┬───────────────┬───────────────┬────────────────────────────┬──────────────────┬───────────┐
│ [x]│ STT│ UID             │ Tình Trạng   │ Trạng Thái    │ Tên Hiển Thị  │ Cookie                     │ Proxy            │ Kịch Bản  │
├────┼────┼─────────────────┼──────────────┼───────────────┼───────────────┼────────────────────────────┼──────────────────┼───────────┤
│ [x]│  1 │ 100084729184712 │ [🟢 Live]    │ Lướt bài (3/5)│ Nguyễn Văn An │ c_user=1000847...; xs=2... │ 14.225.1.8:8080  │ Nuôi Nick │
│ [ ]│  2 │ 100091827461523 │ [🟠 CP 282]  │ Chờ thuê SIM  │ Trần Thị Mai  │ c_user=1000918...; xs=1... │ 118.69.2.14:9090 │ Giải 282  │
│ [ ]│  3 │ 100072615243516 │ [🔵 Đang Chạy│ Xem Story (1) │ David Miller  │ c_user=1000726...; xs=4... │ 171.244.5.2:8000 │ Seeding   │
│ [x]│  4 │ 100063524172819 │ [🟡 CP 956]  │ Két sắt khóa  │ Lê Hoàng Nam  │ c_user=1000635...; xs=9... │ 27.72.10.55:8888 │ Mở Khóa   │
│ [ ]│  5 │ 100054637281920 │ [🔴 Die]     │ Vô hiệu hóa   │ Phạm Đức Long │ c_user=1000546...; xs=7... │ (Không có)       │ Không     │
│ [ ]│  6 │ 100045637281911 │ [⚪ Sẵn Sàng]│ Sẵn sàng chạy │ Jessica Jung  │ c_user=1000456...; xs=3... │ 113.161.4.1:8080 │ Lướt Feed │
└────┴────┴─────────────────┴──────────────┴───────────────┴───────────────┴────────────────────────────┴──────────────────┴───────────┘
```

#### Quy chuẩn Kỹ thuật 45 Cột dữ liệu:
1. **Cột Cố định Ghim bên Trái (Sticky Pinned Columns):**
   - `[x]` (Checkbox): `w-[42px]`, hỗ trợ chọn từng dòng, Shift+Click, Ctrl+A.
   - `STT`: `w-[50px]`, căn giữa, font mono mờ.
   - `UID`: `w-[155px]`, font mono nổi bật `text-indigo-400 font-semibold`, click đúp mở Chrome.
   - `Tình Trạng` (Field `info`): `w-[140px]`, hiển thị Badge màu theo quy chuẩn mục 3 của Design System.
2. **Cột Tiến trình Hoạt động:**
   - `Trạng Thái` (Field `status`): `w-[160px]`, cập nhật thời gian thực hành động Playwright đang thực thi kèm spinner nhỏ nếu đang chạy.
3. **Cột Thông tin Tài khoản (Có thể kéo co giãn độ rộng):**
   - `Pass`, `Token`, `Cookie`, `Email`, `Passmail`, `2FA Secret`, `Proxy`, `UserAgent`, `Bạn bè`, `Nhóm`, `Follow`, `Ngày sinh`, `Giới tính`, `Ngày tương tác cuối`, `Ghi chú`...
4. **Hiệu ứng dòng khi Đang chạy (Active Pulse Row):**
   - Nền dòng chuyển sang `bg-sky-950/40 border-l-4 border-sky-400`, có dải sáng quét nhẹ thể hiện luồng Chrome đang chiếm giữ tài khoản này.

---

### PHÂN VÙNG E: MENU CHUỘT PHẢI 4 CẤP ĐA NĂNG (CONTEXT MENU WIREFRAME)

Menu mở ra khi click chuột phải vào 1 hoặc nhiều dòng tài khoản đã chọn. Menu tự động định vị trong màn hình và căn lề thông minh.

```
┌──────────────────────────────────────────────────────────┐
│ 🌐 Mở Trình Duyệt (Chrome Playwright)            ►───────┼────────────────────────────────────────┐
│ ✏️ Chỉnh Sửa Thông Tin Tài Khoản                 ►───────┤ 1. Mở kèm Cookie (Đăng nhập tự động)   │
│ 🔀 Quản Lý & Gán Proxy                          ►       │ 2. Mở tự động điền Uid|Pass + Vượt 2FA │
│ ⚡ Chạy Kịch Bản Tương Tác Chỉ Định              ►       │ 3. Mở Profile Trắng (Không nạp session)│
│ 📋 Sao Chép Dữ Liệu (Copy nhanh)                 ►       │ 4. Mở trên giao diện Mobile (m.fb)     │
│ 🔍 Kiểm Tra Trạng Thái Tài Khoản (Check Live)    ►       │ 5. Đóng trình duyệt của nick này       │
│ ──────────────────────────────────────────────────────── │ 6. Xóa Thư Mục Profile của nick này    │
│ 📁 Chuyển Đến Thư Mục Khác                      ►       └────────────────────────────────────────┘
│ 🗑️ Chuyển Vào Thùng Rác (Delete)                  Del   │
│ ⚠️ Xóa Vĩnh Viễn & Xóa Profile             Shift + Del   │
└──────────────────────────────────────────────────────────┘
```

#### Đặc tả Menu Con Cấp 2, Cấp 3, Cấp 4:

```
[Mục "📋 Sao Chép Dữ Liệu (Copy nhanh)"]
  ├── UID                                             (Ctrl+C)
  ├── Mật khẩu (Password)
  ├── Mã bảo mật 2FA Secret Key
  ├── 🔑 MÃ 2FA OTP 6 SỐ (Tự Sinh Tức Thì)          (Ctrl+Shift+C)  <-- TÍNH NĂNG ĐỘT PHÁ
  ├── Toàn bộ Cookie Facebook
  ├── Access Token
  ├── Email | Pass Email
  └── Sao chép Ghép Định Dạng Tùy Biến:
        ├── Uid|Pass
        ├── Uid|Pass|2FA
        ├── Uid|Pass|Token|Cookie
        └── Uid|Pass|Token|Cookie|Email|PassMail|2FA

[Mục "🔍 Kiểm Tra Trạng Thái Tài Khoản"]
  ├── Kiểm tra Live / Die UID (Graph API - Không tốn tài nguyên)
  ├── Kiểm tra Cookie còn sống hay chết
  ├── Kiểm tra Token Facebook
  ├── Kiểm tra Hộp thư Hotmail / Outlook qua cổng IMAP
  └── Kiểm tra Tốc độ & Vị trí IP của Proxy đã gán

[Mục "✏️ Chỉnh Sửa Thông Tin Tài Khoản"]
  ├── Cập nhật dữ liệu hàng loạt (Mở Batch Update Modal)
  ├── Đổi mật khẩu trong CSDL
  ├── Gán lại User-Agent chuẩn
  └── Xóa dữ liệu trường được chọn:
        ├── Xóa Cookie
        ├── Xóa Token
        └── Xóa Proxy đã gán
```

---

### PHÂN VÙNG F: PANEL GIÁM SÁT TIẾN TRÌNH & LIVE LOGS (BOTTOM PANEL)

Chiều cao mặc định `220px`, có thanh chia tỷ lệ (Splitter Handle) cho phép kéo chuột lên/xuống để mở rộng hoặc thu gọn xuống còn `32px` (chỉ chừa thanh tiêu đề tab).

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [● Giám Sát Luồng (5 Đang Chạy)]  │  [Nhật Ký Trực Tiếp (Live Logs)]  │  [Biểu Đồ Tài Nguyên]  │           [x] Tự động cuộn  [🗑 Xóa] [▲]│
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ LUỒNG │ TÀI KHOẢN (UID) │ TÊN FACEBOOK  │ PROXY HIỆN TẠI    │ HÀNH ĐỘNG ĐANG THỰC HIỆN        │ THỜI GIAN │ TIẾN ĐỘ    │ THAO TÁC    │
├───────┼─────────────────┼───────────────┼───────────────────┼─────────────────────────────────┼───────────┼────────────┼─────────────┤
│ #01   │ 100084729184712 │ Nguyễn Văn An │ 14.225.1.8:8080   │ Lướt Newsfeed (Đã thả 2 Like)   │ 01:45s    │ [████░░░░] │ [⏹ Dừng]   │
│ #02   │ 100091827461523 │ Trần Thị Mai  │ 118.69.2.14:9090  │ Checkpoint 282 -> Đang đợi OTP  │ 00:32s    │ [██████░░] │ [⏹ Dừng]   │
│ #03   │ 100072615243516 │ David Miller  │ 171.244.5.2:8000  │ Xem Story bạn bè                │ 02:10s    │ [████████] │ [⏹ Dừng]   │
│ #04   │ 100063524172819 │ Lê Hoàng Nam  │ 27.72.10.55:8888  │ Đổi IP MinProxy (Chờ 8s cooldown│ 00:08s    │ [██░░░░░░] │ [⏹ Dừng]   │
│ #05   │ 100054637281920 │ Jessica Jung  │ 113.161.4.1:8080  │ Đăng nhập Cookie vào m.fb...    │ 00:15s    │ [███░░░░░] │ [⏹ Dừng]   │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Chuyển Tab sang "Nhật Ký Trực Tiếp (Live Logs)":
```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Giám Sát Luồng]  │  [● Nhật Ký Trực Tiếp (1,420 dòng)]  │  [Biểu Đồ]  │ 🔍 [Lọc log...] [x] Auto-Scroll [🗑 Xóa Log] [💾 Xuất File] [▲]│
├───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ [14:32:01.102] [INFO]    Khởi tạo TaskPool: Cấu hình tối đa 5 luồng chạy đồng thời.                                                   │
│ [14:32:01.450] [SUCCESS] Luồng #01: Đã kết nối Proxy 14.225.1.8:8080 (Ping: 42ms, Quốc gia: VN).                                    │
│ [14:32:03.890] [INFO]    Luồng #01: Khởi động Chrome Profile profiles/100084729184712 với Stealth mode.                               │
│ [14:32:05.120] [SUCCESS] Luồng #01: Nạp thành công 7 cookies vào Context. Điều hướng tới https://m.facebook.com...                   │
│ [14:32:08.340] [WARN]    Luồng #02: Tài khoản 100091827461523 gặp màn hình Checkpoint 282. Tự kích hoạt Solver282...                 │
│ [14:32:12.780] [INFO]    Luồng #02: Gọi API FastSim lấy số điện thoại: 0984128491. Đang chờ mã OTP từ nhà mạng...                     │
│ [14:32:15.900] [SUCCESS] Luồng #01: Đã thích bài viết của ID 9827361846 trên Newsfeed. Nghỉ giải lao 5s.                             │
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. CÁC HỘP THOẠI MODAL NGHIỆP VỤ (MODAL WIREFRAMES)

---

### MODAL 1: NHẬP LIỆU THÔNG MINH (SMART IMPORT MODAL)

Kích thước: `w-[820px] max-h-[85vh]`, bo góc `rounded-xl`, nền `bg-slate-900 border border-slate-700 shadow-2xl`.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ➕ NHẬP TÀI KHOẢN HÀNG LOẠT (SMART IMPORT)                                         [✕] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. DÁN DANH SÁCH TÀI KHOẢN (Mỗi dòng một tài khoản hoặc bấm [📁 Tải file .txt]):       │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ 100084729184712|MatKhau123|JBSWY3DPEHPK3PXP|c_user=1000847...; xs=2...|an@mail.com │ │
│ │ 100091827461523|MatKhau456|KZXW4ZDPNU======|c_user=1000918...; xs=1...|mai@mail.com │ │
│ │ 100072615243516|MatKhau789|MZXW633PNU======|c_user=1000726...; xs=4...|dav@mail.com │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ Đã phát hiện: [ 3 dòng tài khoản ]                                                     │
│                                                                                        │
│ 2. CHỌN ĐỊNH DẠNG TÀI KHOẢN:                                                           │
│ [ Định dạng mẫu: Uid|Pass|2FA|Cookie|Email|PassMail                          ▼ ]       │
│                                                                                        │
│ Hoặc Tự Tạo Định Dạng: [Ký tự phân cách: ( | ) ▼]                                      │
│ [+ UID]  [+ Mật khẩu]  [+ 2FA]  [+ Cookie]  [+ Token]  [+ Email]  [+ PassMail] [+ Proxy]│
│ Chuỗi đang ghép: [ UID | Pass | 2FA | Cookie | Email ]                     [↺ Xóa làm lại]│
│                                                                                        │
│ 3. THƯ MỤC LƯU & XỬ LÝ TRÙNG LẶP:                                                      │
│ Thư mục đích: [ 📁 Via Cổ Ngoại 2018                              ▼ ]  [➕ Tạo thư mục]│
│                                                                                        │
│ Tùy chọn xử lý trùng:                                                                  │
│   (●) Bỏ qua tài khoản nếu trùng UID trong CSDL (Khuyên dùng)                          │
│   ( ) Cập nhật ghi đè thông tin mới vào UID đã có                                      │
│                                                                                        │
│ Gán Proxy kèm theo (Tùy chọn):                                                         │
│   [x] Tự động gán danh sách Proxy từ bộ nhớ cấu hình theo thứ tự xoay vòng             │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [👁 Xem Trước 3 Dòng]                                    [Hủy Bỏ]  [✔ BẮT ĐẦU NHẬP NICK]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### MODAL 2: THIẾT LẬP KỊCH BẢN TƯƠNG TÁC (SCENARIO BUILDER MODAL)

Bố cục 2 cột chuyên nghiệp: Kích thước `w-[1100px] h-[680px]`, chia tách rõ ràng giữa danh mục kịch bản và chuỗi bước thực thi (Pipeline).

```
┌───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│ ⚡ THIẾT LẬP KỊCH BẢN TƯƠNG TÁC TỰ ĐỘNG (SCENARIO BUILDER)                                                         [✕]│
├──────────────────────────────────────────┬────────────────────────────────────────────────────────────────────────────┤
│ DANH SÁCH KỊCH BẢN          [➕ Thêm Mới]│ KỊCH BẢN ĐANG CHỌN: "Nuôi Nick Mới Tạo 7 Ngày"            [💾 Lưu Thay Đổi]│
├──────────────────────────────────────────┼────────────────────────────────────────────────────────────────────────────┤
│ ⚡ Nuôi Nick Mới Tạo 7 Ngày      (5 bước)│ ≡ BƯỚC 1: [🌐 Lướt Bảng Tin Newsfeed]                      [Cấu hình] [✕]  │
│ ⚡ Tương Tác Bạn Bè & Nhóm       (4 bước)│   - Thời gian lướt: 120 - 240 giây | Thả Like: 40% | Comment: 20%          │
│ ⚡ Seeding Bài Viết Bán Hàng     (3 bước)│                                                                            │
│ ⚡ Kháng Checkpoint 282 + 956    (2 bước)│ ≡ BƯỚC 2: [📱 Xem Tin Story Bạn Bè]                        [Cấu hình] [✕]  │
│ ⚡ Đổi Pass & Bật Bảo Mật 2FA    (3 bước)│   - Số lượng Story xem: 3 - 5 tin | Thả tim: 50%                           │
│ ⚡ Tham Gia Nhóm Theo Từ Khóa    (4 bước)│                                                                            │
│                                          │ ≡ BƯỚC 3: [☕ Nghỉ Giải Lao Giữa Giờ]                      [Cấu hình] [✕]  │
│                                          │   - Thời gian tạm dừng luồng: 15 - 30 giây                                 │
│                                          │                                                                            │
│                                          │ ≡ BƯỚC 4: [👥 Gửi Lời Mời Kết Bạn Gợi Ý]                   [Cấu hình] [✕]  │
│                                          │   - Số lượng kết bạn: 2 - 3 người | Chỉ kết bạn người có bạn chung         │
│                                          │                                                                            │
│                                          │ ────────────────────────────────────────────────────────────────────────── │
│                                          │ [➕ THÊM HÀNH ĐỘNG MỚI VÀO KỊCH BẢN (CHỌN TỪ KHO 70 HÀNH ĐỘNG)]             │
├──────────────────────────────────────────┴────────────────────────────────────────────────────────────────────────────┤
│ [Sao Chép Kịch Bản]  [Xóa Kịch Bản Này]                                                    [Đóng]  [✔ ÁP DỤNG CHO DÀN NICK]│
└───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Drawer Danh mục 70 Hành động (Mở ra khi bấm "+ Thêm Hành Động Mới"):
Drawer trượt từ cạnh phải sang (`w-[420px]`):
- **Ô tìm kiếm hành động:** Gõ "Reels", "Story", "Đổi pass", "Tham gia nhóm"...
- **Tabs phân loại:**
  1. `Tất cả (70)`
  2. `Bảng tin (12)`
  3. `Đăng bài (9)`
  4. `Bạn bè (9)`
  5. `Nhóm (7)`
  6. `Fanpage (9)`
  7. `Seeding (8)`
  8. `Bảo mật (16)`
- Khi click vào 1 hành động: Form cấu hình tham số JSON hiển thị ngay bên dưới với trình xem trước Spin Text thời gian thực.

---

### MODAL 3: CẤU HÌNH ĐỔI IP & PROXY ROTATOR (IP ROTATION CONFIG MODAL)

Kích thước: `w-[760px]`, hỗ trợ 6 tab tương ứng 6 phương thức xoay IP hàng đầu.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 🔀 CẤU HÌNH ĐỔI IP & PROXY ROTATOR                                                 [✕] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [● MinProxy API] │ [XProxy Dongle] │ [OBC Proxy] │ [ShopLike] │ [Dcom 4G] │ [Proxy Tĩnh]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ CẤU HÌNH DỊCH VỤ MINPROXY (VIỆT NAM):                                                  │
│                                                                                        │
│ Danh sách API Key MinProxy (Mỗi dòng 1 key tương ứng 1 cổng Proxy):                    │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ MP_VN_KEY_849281928471928471928471                                                 │ │
│ │ MP_VN_KEY_192847192847192847192842                                                 │ │
│ │ MP_VN_KEY_561928471928471928471923                                                 │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ Đang có: [ 3 API Keys tương ứng 3 luồng xoay IP độc lập ]                              │
│                                                                                        │
│ Tham số xoay IP thông minh:                                                            │
│   - Số tài khoản chạy tối đa trên 1 IP trước khi đổi: [ 1 ] nick (Khuyên dùng)         │
│   - Thời gian chờ đổi IP thành công (Cooldown):       [ 10 ] giây                      │
│   - Loại IP Proxy: (●) Dân cư xoay vòng (Residential)    ( ) Datacenter                │
│                                                                                        │
│ Cơ chế an toàn mạng:                                                                   │
│   [x] Kiểm tra IP ngoại mạng qua api.ipify.org trước khi mở Facebook                   │
│   [x] Tự động dừng luồng nếu IP bị trùng với luồng khác                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [🔄 Kiểm Tra Kết Nối Toàn Bộ Key]                            [Hủy Bỏ]  [✔ LƯU CẤU HÌNH]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### MODAL 4: CẤU HÌNH HIỂN THỊ 45 CỘT (COLUMN VISIBILITY & ORDER CONFIG)

Kích thước: `w-[700px] max-h-[80vh]`. Cho phép bật tắt và kéo thả sắp xếp thứ tự hiển thị cột trên DataGrid.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ 👁️ CẤU HÌNH HIỂN THỊ CỘT DỮ LIỆU (45 CỘT)                                         [✕] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ BỘ MẪU HIỂN THỊ NHANH (PRESETS):                                                       │
│ [ ⭐ Mặc Định ]  [ 📝 Nuôi Seeding ]  [ 🛡️ Kiểm Tra Bảo Mật ]  [ 🌐 Hiển Thị Đầy Đủ 45 ]│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ DANH SÁCH CỘT (Kéo ≡ để đổi thứ tự | Tích chọn để hiển thị):                           │
│ ┌────────────────────────────────────────────────────────────────────────────────────┐ │
│ │ [x] ≡ 01. Checkbox chọn dòng (Cố định ghim trái)                                   │ │
│ │ [x] ≡ 02. Số thứ tự (STT) (Cố định ghim trái)                                      │ │
│ │ [x] ≡ 03. UID Facebook (Cố định ghim trái)                                         │ │
│ │ [x] ≡ 04. Tình trạng tài khoản (Live/Die/CP)                                       │ │
│ │ [x] ≡ 05. Trạng thái thực thi runtime (Đang chạy, Lỗi...)                           │ │
│ │ [x] ≡ 06. Mật khẩu (Password)                                                      │ │
│ │ [x] ≡ 07. Cookie Facebook                                                          │ │
│ │ [ ] ≡ 08. Cookie dự phòng (cookie1)                                                │ │
│ │ [x] ≡ 09. Mã bảo mật 2FA Secret Key                                                │ │
│ │ [x] ≡ 10. Access Token                                                             │ │
│ │ [x] ≡ 11. Email chính                                                              │ │
│ │ [x] ≡ 12. Mật khẩu Email (PassMail)                                                │ │
│ │ [ ] ≡ 13. Email khôi phục (MailRecovery)                                           │ │
│ │ [ ] ≡ 14. Số điện thoại (Phone)                                                    │ │
│ │ [x] ≡ 15. Tên hiển thị (Name)                                                      │ │
│ │ [x] ≡ 16. Cấu hình Proxy đã gán                                                    │ │
│ │ [x] ≡ 17. User-Agent riêng biệt                                                    │ │
│ │ [ ] ≡ 18. Số lượng bạn bè (Friends)                                                │ │
│ │ [ ] ≡ 19. Số lượng nhóm tham gia (Groups)                                          │ │
│ │ ... (tiếp tục danh sách 45 cột)                                                    │ │
│ └────────────────────────────────────────────────────────────────────────────────────┘ │
│ [Chọn tất cả]  [Bỏ chọn tất cả]  [Khôi phục về mặc định ban đầu]                       │
├────────────────────────────────────────────────────────────────────────────────────────┤
│                                                              [Hủy Bỏ]  [✔ ÁP DỤNG NGAY]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### MODAL 5: CẬP NHẬT DỮ LIỆU HÀNG LOẠT (BATCH UPDATE MODAL)

Kích thước: `w-[640px]`. Cho phép sửa đổi thông tin cho hàng nghìn nick đã chọn cùng lúc.

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ ✏️ CẬP NHẬT DỮ LIỆU HÀNG LOẠT (Đang chọn: 120 tài khoản)                           [✕] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ Tích chọn các trường cần cập nhật giá trị mới:                                         │
│                                                                                        │
│ [ ] Mật khẩu mới:        [ Nhập mật khẩu chung cho các nick...                       ] │
│ [ ] Trạng thái / Ghi chú:[ Nhập ghi chú mới...                                       ] │
│ [ ] Kịch bản gán riêng:  [ Chọn kịch bản tương tác gán cho dàn nick...             ▼ ] │
│ [x] Cấu hình Proxy mới:                                                                │
│     ( ) Một proxy duy nhất cho tất cả: [ IP:Port:User:Pass                           ] │
│     (●) Nhập danh sách nhiều Proxy (Tự chia đều cho 120 nick):                         │
│         ┌────────────────────────────────────────────────────────────────────────────┐ │
│         │ 14.225.1.8:8080:user1:pass1                                                │ │
│         │ 118.69.2.14:9090:user2:pass2                                               │ │
│         └────────────────────────────────────────────────────────────────────────────┘ │
│ [ ] Thay đổi User-Agent:                                                               │
│     [ (●) Ngẫu nhiên Chrome Windows mới nhất   ( ) Giữ nguyên User-Agent cũ          ] │
│ [ ] Chuyển thư mục lưu:  [ 📁 Clone Nuôi Newfeed                                   ▼ ] │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [!] Lưu ý: Thao tác này sẽ ghi đè dữ liệu trực tiếp trong CSDL SQLite.                 │
│                                                              [Hủy Bỏ]  [✔ CẬP NHẬT 120 NICK]│
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. BẢNG TỔNG HỢP CÁC TRẠNG THÁI EMPTY & LOADING STATES

1. **Empty State Bảng DataGrid (Khi thư mục chưa có tài khoản nào):**
   - Giữa bảng hiển thị hình minh họa SVG chiếc hộp rỗng màu tím mờ, kèm text:
     *"Thư mục này chưa có tài khoản nào! Bấm nút bên dưới để bắt đầu."*
   - Nút hành động nổi bật: `[➕ Thêm Tài Khoản Ngay (Ctrl + I)]`.
2. **Empty State Tìm kiếm (Không tìm thấy kết quả phù hợp):**
   - Biểu tượng kính lúp gạch chéo kèm thông điệp:
     *"Không tìm thấy tài khoản nào khớp với từ khóa '[từ_khóa]'. Nhấn Esc để xóa bộ lọc."*
3. **Loading State khi Import 50.000 Nick:**
   - Một Modal Overlay mờ nhẹ phủ lên màn hình.
   - Thanh tiến trình chuyển động Gradient Violet: `[████████████░░░░░░░░] 62% (31,000 / 50,000)`.
   - Text chi tiết: *"Đang ghi dữ liệu vào SQLite trong Transaction... Tốc độ: 8,500 nick/giây"*.
   - Nút `[Hủy bỏ an toàn]` nếu người dùng muốn dừng lại giữa chừng.
