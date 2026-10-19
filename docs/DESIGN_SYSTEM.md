# TÀI LIỆU HỆ THỐNG THIẾT KẾ (DESIGN SYSTEM SPECIFICATION)
## DỰ ÁN: LUSHCARE ELECTRON (FACEBOOK AUTOMATION & MULTI-ACCOUNT MANAGEMENT)
### Tiêu chuẩn Thiết kế UI/UX trên nền tảng React 18 + Tailwind CSS + Lucide React
**Tác giả:** UI/UX Lead Designer  
**Phiên bản:** 2.0 (Chính thức)  
**Tệp tài liệu:** `docs/DESIGN_SYSTEM.md`  
**Ngôn ngữ:** Tiếng Việt & Chuẩn Design Tokens quốc tế  

---

## 1. TỔNG QUAN & TRIẾT LÝ THIẾT KẾ (DESIGN PHILOSOPHY)

### 1.1. Bối cảnh & Tầm nhìn chuyển đổi
Hệ thống **LushCare** cũ phát triển trên nền tảng **C# WinForms (.NET Framework 4.8)** sử dụng giao diện đồ họa GDI+ truyền thống với các hạn chế cố hữu:
- Màu sắc xám nhạt (`System.Drawing.SystemColors.Control`), thiếu tương phản, gây mỏi mắt khi vận hành liên tục 8-12 tiếng.
- Bảng dữ liệu DataGridView thô cứng, font chữ pixel mờ khi hiển thị trên màn hình độ phân giải cao (HiDPI/4K).
- Thao tác chuột nặng nề, thiếu phản hồi thị giác (visual feedback), trạng thái luồng khó theo dõi trực quan.

**LushCare Electron** định hình chuẩn mực trải nghiệm mới cho phần mềm MMO/Automation chuyên nghiệp:
- **Hiện đại & Cao cấp (Cyber-Professional):** Phong cách Dark Mode tối ưu cho các chuyên gia nuôi nick, sử dụng tông màu nền Slate/Zinc sâu thẳm kết hợp điểm nhấn Violet/Indigo gradient công nghệ cao.
- **Mật độ thông tin tối ưu (High Information Density):** Hiển thị lượng dữ liệu khổng lồ (45 cột, hàng chục nghìn tài khoản) mà không gây cảm giác ngột ngạt nhờ bố cục phân lớp thị giác (visual hierarchy) chặt chẽ.
- **Tương tác siêu tốc (Zero-Latency Micro-Interactions):** Mọi thao tác chọn, click, hover, mở menu chuột phải phản hồi trong $\le 16ms$ (chuẩn 60 FPS), tối ưu 100% qua phím tắt chuyên dụng.
- **An toàn thị giác & Độ tin cậy (Clarity & Safety):** Các trạng thái nguy hiểm (Die, Checkpoint 282, Lỗi IP) được cảnh báo bằng các màu sắc quy chuẩn, nổi bật tức thì để người dùng can thiệp kịp thời.

---

## 2. BẢNG MÀU CHUẨN HỆ THỐNG (COLOR SYSTEM)

Hệ thống màu được xây dựng trên bảng mã màu Tailwind CSS v3.4+, chia thành 4 lớp: **Nền trung tính (Neutrals)**, **Màu thương hiệu (Accents)**, **Màu trạng thái tài khoản (Status Badges)** và **Màu chức năng nghiệp vụ (Semantic Tokens)**.

### 2.1. Nền trung tính (Neutral Palette)
LushCare hỗ trợ 2 chế độ: **Dark Mode (Chế độ mặc định chính)** và **Light Mode (Chế độ sáng văn phòng)**.

| Token Tailwind | Dark Mode (Mặc định) | Light Mode | Ứng dụng thực tế |
| :--- | :--- | :--- | :--- |
| `bg-app` | `#090D16` (Slate 950 Deep) | `#F8FAFC` (Slate 50) | Nền khung cửa sổ chính của ứng dụng |
| `bg-surface` | `#0F172A` (Slate 900) | `#FFFFFF` (White) | Nền DataGrid, Sidebar, Card chứa dữ liệu |
| `bg-surface-elevated`| `#1E293B` (Slate 800) | `#F1F5F9` (Slate 100) | Nền Toolbar, Titlebar, Footer, Modal |
| `bg-surface-hover` | `#334155` (Slate 700 / 50%) | `#E2E8F0` (Slate 200) | Hover dòng bảng, Hover nút bấm, Hover item menu |
| `border-subtle` | `#1E293B` (Slate 800) | `#E2E8F0` (Slate 200) | Đường viền ngăn cách nhẹ giữa các cột bảng |
| `border-default` | `#334155` (Slate 700) | `#CBD5E1` (Slate 300) | Viền ô nhập liệu (Input), viền Card, viền Modal |
| `border-strong` | `#475569` (Slate 600) | `#94A3B8` (Slate 400) | Viền phân cách Titlebar, Toolbar, Sidebar |
| `text-primary` | `#F8FAFC` (Slate 50) | `#0F172A` (Slate 900) | Tiêu đề, dữ liệu UID, tên tài khoản, text chính |
| `text-secondary` | `#94A3B8` (Slate 400) | `#64748B` (Slate 500) | Tiêu đề cột, nhãn mô tả, thông số phụ |
| `text-muted` | `#64748B` (Slate 500) | `#94A3B8` (Slate 400) | Placeholder, timestamp lịch sử, text vô hiệu hóa |

### 2.2. Điểm nhấn thương hiệu & Công nghệ (Brand & Accent Colors)
Sử dụng dải màu Tím hiện đại (Violet/Indigo) kết hợp Xanh biển Cyber (Cyan/Sky) tạo cảm giác phần mềm tự động hóa tương lai:

| Token | Mã Hex | Ý nghĩa & Vị trí hiển thị |
| :--- | :--- | :--- |
| `accent-primary` | `#6366F1` (Indigo 500) | Nút bấm hành động chính (Bắt đầu, Thêm mới, Lưu cấu hình) |
| `accent-primary-hover`| `#4F46E5` (Indigo 600) | Trạng thái rê chuột vào nút chính |
| `accent-primary-active`| `#4338CA` (Indigo 700) | Trạng thái nhấn giữ nút chính |
| `accent-gradient` | `linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)` | Nút "Bắt đầu chạy tương tác", Header nổi bật |
| `accent-secondary` | `#06B6D4` (Cyan 500) | Chỉ số tiến trình, biểu đồ luồng hoạt động, Badge kịch bản |
| `accent-focus-ring`| `rgba(99, 102, 241, 0.35)` | Vòng hào quang phát sáng khi Focus ô nhập hoặc ô chọn |

---

## 3. HUY HIỆU TRẠNG THÁI TÀI KHOẢN (ACCOUNT STATUS BADGES & RUNTIME MATRIX)

Trạng thái tài khoản là yếu tố thị giác quan trọng số 1 của phần mềm quản lý tài khoản. Hệ thống quy định rõ ràng mã màu, biểu tượng và hiệu ứng động cho từng tình trạng:

```
+-----------------------------------------------------------------------------------------+
|                              ACCOUNT STATUS VISUAL MATRIX                               |
+-----------------------------------------------------------------------------------------+
| [LIVE]            bg-emerald-950/40  border-emerald-600  text-emerald-400  Dot Solid     |
| [DIE / KHÓA]      bg-rose-950/40     border-rose-600     text-rose-400     Dot Solid     |
| [CHECKPOINT 282]  bg-amber-950/40    border-amber-600    text-amber-400    Warning Alert |
| [CHECKPOINT 956]  bg-yellow-950/40   border-yellow-600   text-yellow-400   Lock Icon     |
| [ĐANG CHẠY...]    bg-sky-950/40      border-sky-500      text-sky-300      Pulse Ring    |
| [SẴN SÀNG / CHỜ]  bg-slate-800/60    border-slate-600    text-slate-300    Clock Icon    |
| [LỖI TRÌNH DUYỆT] bg-red-950/50      border-red-500      text-red-300      X Circle      |
| [ĐỔI IP / PAUSE]  bg-purple-950/40   border-purple-600   text-purple-300   Rotate Loader |
+-----------------------------------------------------------------------------------------+
```

### 3.1. Đặc tả Chi tiết Tokens Huy hiệu (Badge Tokens)

| Tình trạng (Field `info` / `status`) | Màu nền (Dark) | Màu viền | Màu chữ | Icon Lucide | Hiệu ứng động (Animation) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Live** (Hoạt động tốt) | `bg-emerald-950/50` | `border-emerald-500/40` | `text-emerald-400` | `CheckCircle2` | Không |
| **Die** (Khóa vĩnh viễn/Vô hiệu hóa) | `bg-rose-950/50` | `border-rose-500/40` | `text-rose-400` | `XCircle` | Không |
| **Checkpoint 282** (Bắt ảnh + SĐT) | `bg-amber-950/50` | `border-amber-500/40` | `text-amber-400` | `AlertTriangle` | Không |
| **Checkpoint 956** (Két sắt tạm khóa) | `bg-yellow-950/50`| `border-yellow-500/40`| `text-yellow-400`| `ShieldAlert` | Không |
| **Đang chạy** (In Progress) | `bg-sky-950/60` | `border-sky-400/60` | `text-sky-300` | `Loader2` | `animate-spin` hoặc `animate-pulse` |
| **Sẵn sàng** (Ready / Idle) | `bg-slate-800/60` | `border-slate-700` | `text-slate-300` | `Circle` | Không |
| **Thành công** (Completed) | `bg-emerald-950/40` | `border-emerald-600` | `text-emerald-300`| `Check` | Không |
| **Lỗi mạng / Proxy die** | `bg-red-950/60` | `border-red-500` | `text-red-400` | `WifiOff` | Nhấp nháy cảnh báo 3s |
| **Đang xoay IP** (Rotating IP) | `bg-indigo-950/50`| `border-indigo-500/40`| `text-indigo-300`| `RefreshCw` | `animate-spin` chậm |

---

## 4. HỆ THỐNG TYPOGRAPHY (FONT & SCALE)

Hệ thống sử dụng bộ phông chữ kép: **Inter** cho toàn bộ giao diện điều khiển (UI Controls) và **JetBrains Mono** cho các trường dữ liệu kỹ thuật nhạy cảm (UID, Proxy, Cookie, Token, Mã 2FA, Dòng Log thời gian thực).

### 4.1. Họ phông chữ (Font Families)
```css
--font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
--font-mono: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace;
```

### 4.2. Bảng tỷ lệ cỡ chữ (Type Scale)

| Cấp bậc (Level) | Kích thước | Chiều cao dòng (Line-height) | Độ đậm (Weight) | Tracking | Ứng dụng |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `text-xs` | 11px | 16px (1.45) | Regular (400) / Medium (500) | `+0.01em` | Header bảng 45 cột, Badge status, Ghi chú nhỏ |
| `text-sm` | 13px | 18px (1.40) | Regular (400) / Semibold (600)| `0` | Nội dung ô dữ liệu DataGrid, Text Input, MenuItem |
| `text-base` | 14px | 20px (1.42) | Medium (500) / Semibold (600)| `-0.01em`| Nút bấm Toolbar, Tabs navigation, Tiêu đề Card |
| `text-lg` | 16px | 24px (1.50) | Semibold (600) | `-0.02em`| Tiêu đề Modal, Tên thư mục Sidebar cấp cha |
| `text-xl` | 18px | 28px (1.55) | Bold (700) | `-0.02em`| Tiêu đề trang chính, Bộ đếm tổng số nick |
| `mono-xs` | 11px | 14px (1.27) | Regular (400) / Medium (500) | `0` | Cột UID, Mã OTP 6 số, IP Proxy, Timestamp log |
| `mono-sm` | 12px | 16px (1.33) | Regular (400) | `0` | Terminal Live Logs, Nội dung Cookie/Token xem trước |

---

## 5. KHOẢNG CÁCH, BO GÓC & ĐỔ BÓNG (SPACING, ELEVATION & RADII)

### 5.1. Hệ thống lưới khoảng cách (4px Base Grid)
- `space-1` = 4px: Khoảng cách giữa icon và nhãn văn bản.
- `space-1.5` = 6px: Padding trong của ô bảng thu nhỏ (compact cell padding).
- `space-2` = 8px: Khoảng cách giữa các nút trên Toolbar, padding ô bảng tiêu chuẩn.
- `space-3` = 12px: Khoảng cách giữa các khối cấu hình trong Modal.
- `space-4` = 16px: Padding tổng thể của Card, Titlebar, Footer.
- `space-6` = 24px: Padding viền trong của Modal lớn, khoảng cách các phân khu lớn.

### 5.2. Bán kính bo góc (Border Radii)
- `rounded-sm` = 4px: Checkbox, Badge trạng thái nhỏ, Tooltip.
- `rounded-md` = 6px: Ô nhập liệu (Input), Nút bấm (Button), Item menu chuột phải.
- `rounded-lg` = 8px: Khối Card danh mục, Dropdown container, Panel nhật ký luồng.
- `rounded-xl` = 12px: Hộp thoại Modal, Dialog xác nhận.
- `rounded-full`: Nút bấm tròn, Avatar tài khoản, Indicator pulse dot.

### 5.3. Độ sâu & Đổ bóng (Elevation & Shadows)
Ứng dụng sử dụng bóng đổ mịn màu tối kết hợp viền mờ 1px để phân tách các lớp cửa sổ:
- **Level 0 (Flat):** Bảng dữ liệu chính, nền ứng dụng (`border-slate-800`).
- **Level 1 (Card/Toolbar):** `shadow-sm` + `border border-slate-800/80` (Toolbar, Titlebar, Sidebar).
- **Level 2 (Dropdown/Context Menu):** `shadow-xl shadow-black/40` + `border border-slate-700/80` + `backdrop-blur-md` (Menu chuột phải).
- **Level 3 (Modal Dialog):** `shadow-2xl shadow-black/70` + `border border-slate-600/60` (Hộp thoại Import, Kịch bản, Cài đặt).

---

## 6. HỆ THỐNG BIỂU TƯỢNG (LUCIDE REACT TAXONOMY)

Sử dụng đồng nhất thư viện **Lucide React** với kích thước chuẩn: `14px` (trong nút nhỏ và menu), `16px` (Toolbar và Input), `20px` (Tiêu đề Modal và Sidebar cấp cao).

| Nhóm nghiệp vụ | Icon | Tên Icon Lucide | Vị trí sử dụng |
| :--- | :--- | :--- | :--- |
| **Điều khiển luồng** | ▶ | `Play` | Bắt đầu chạy kịch bản tương tác |
| | ⏸ | `Pause` | Tạm dừng chạy các luồng |
| | ⏹ | `Square` | Dừng khẩn cấp toàn bộ luồng |
| | 🌐 | `Globe` | Mở trình duyệt Chrome cho tài khoản |
| **Dữ liệu tài khoản** | ➕ | `UserPlus` / `FileSpreadsheet`| Nhập tài khoản (Smart Import) |
| | 💾 | `Download` | Xuất dữ liệu tài khoản (Export) |
| | 📋 | `Copy` | Sao chép thông tin (UID, Pass, 2FA, OTP) |
| | ✏️ | `Edit3` | Chỉnh sửa thông tin tài khoản |
| | 🗑️ | `Trash2` | Xóa vào thùng rác / Xóa vĩnh viễn |
| | 🔄 | `RefreshCw` | Nạp lại dữ liệu (F5 Reload) |
| **Thư mục & Cấu trúc**| 📁 | `Folder` | Thư mục tài khoản bình thường |
| | 📂 | `FolderOpen` | Thư mục đang được chọn |
| | 🗂️ | `Layers` | Tất cả thư mục (`[Tất cả]`) |
| | 🗄️ | `Archive` | Thùng rác tài khoản |
| **Cấu hình & Mạng** | ⚡ | `Sliders` | Cấu hình kịch bản tương tác (Scenario) |
| | 🔀 | `Shuffle` / `Network` | Cấu hình đổi IP Proxy (MinProxy, XProxy...) |
| | 👁️ | `Columns` | Cấu hình hiển thị 45 cột (Column Config)|
| | ⚙️ | `Settings` | Cài đặt hệ thống chung |
| | 🤖 | `Bot` / `Sparkles` | Cấu hình tích hợp AI (Gemini, ChatGPT) |
| **Bảo mật & Checkpoint**| 🛡️ | `ShieldCheck` | Đăng nhập an toàn & Vượt 2FA |
| | ⚠️ | `AlertTriangle` | Cảnh báo Checkpoint 282 / Lỗi |
| | 🔒 | `Lock` | Checkpoint 956 / Khóa tài khoản |
| | 🔑 | `KeyRound` | Tạo mã OTP bảo mật 2FA |

---

## 7. QUY CHUẨN COMPONENT NỀN TẢNG (CORE COMPONENT SPECIFICATIONS)

### 7.1. Hệ thống Nút bấm (Buttons)
Nút bấm hỗ trợ 5 biến thể với chiều cao chuẩn `h-8` (32px) hoặc `h-9` (36px):

```
+-------------------------------------------------------------------------------------+
| BUTTON VARIANTS SPECIFICATIONS                                                      |
+-------------------------------------------------------------------------------------+
| [PRIMARY]   bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white      |
| [SUCCESS]   bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white    |
| [DANGER]    bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white            |
| [SECONDARY] bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200  |
| [GHOST]     bg-transparent hover:bg-slate-800/60 text-slate-400 hover:text-white    |
+-------------------------------------------------------------------------------------+
```

- **Quy tắc trạng thái (State Behavior):**
  - **Focus:** Vòng tròn viền phát sáng `ring-2 ring-indigo-500/50 ring-offset-1 ring-offset-slate-900`.
  - **Disabled:** `opacity-40 cursor-not-allowed pointer-events-none`.
  - **Loading:** Hiển thị spinner `Loader2` xoay đều, tự động disable nút để ngăn chặn double-submit.

### 7.2. Ô nhập liệu (Inputs & Form Controls)
- Chiều cao chuẩn: `h-8` (32px) cho bảng lọc, `h-9` (36px) cho Modal form.
- Nền ô nhập: `bg-slate-950/70 border border-slate-700 rounded-md text-slate-100 placeholder:text-slate-500`.
- Hiệu ứng Focus: Viền chuyển sang `border-indigo-500` kèm bóng mờ hào quang `shadow-[0_0_0_3px_rgba(99,102,241,0.2)]`.
- Hỗ trợ nút xóa nhanh text (Clear button) bên phải khi có nội dung.

### 7.3. Bảng dữ liệu ảo hóa (Virtual DataGrid Styling)
- **Cấu trúc lưới:** TanStack Virtualizer tính toán chiều cao dòng cố định `rowHeight = 34px`.
- **Cột ghim cố định (Sticky Left Columns):**
  - Cột 1 (Width: 42px): Checkbox đa chọn (Header có Master Checkbox).
  - Cột 2 (Width: 50px): Số thứ tự (STT).
  - Cột 3 (Width: 155px): Facebook UID (Font `font-mono`, click đúp để mở profile trình duyệt).
  - Cột 4 (Width: 140px): Tình trạng tài khoản (Badge màu nổi bật).
- **Màu sắc dòng (Row States):**
  - **Dòng lẻ (Odd row):** `bg-slate-900/40`.
  - **Dòng chẵn (Even row):** `bg-slate-950/60`.
  - **Dòng Hover:** `bg-indigo-950/30 transition-colors duration-75`.
  - **Dòng được chọn (Selected):** `bg-indigo-950/60 border-l-2 border-indigo-500`.
  - **Dòng đang chạy kịch bản (Active Running):** `bg-sky-950/50 relative overflow-hidden` kèm dải sáng quét nhẹ (gradient shimmer sweep).

### 7.4. Menu ngữ cảnh chuột phải 4 cấp (Context Menu Tokens)
- Chiều rộng tối thiểu: `w-56` (224px), viền bo `rounded-lg`, nền kính mờ `bg-slate-900/95 backdrop-blur-md border border-slate-700/80 shadow-2xl`.
- Chiều cao mỗi dòng item: `h-8` (32px), padding ngang `px-2.5`.
- Hover item: `bg-indigo-600 text-white rounded-md` (Icon tự động chuyển sang màu trắng).
- Menu con cấp 2, 3, 4: Xuất hiện mượt mà sau `delay-75ms`, căn thẳng hàng theo chiều dọc, tự động đảo hướng sang trái nếu chạm viền phải màn hình.
- Hiển thị phím tắt tắt bên phải (VD: `Ctrl+C`, `Ctrl+V`, `Space`, `Del`) bằng font mono mờ `text-slate-400 text-xs`.

### 7.5. Khung giám sát tiến trình & Nhật ký thời gian thực (Live Log Streamer)
- Phong cách giao diện dòng lệnh Hacker Console: Nền đen tuyền `bg-slate-950`, viền trên `border-t border-slate-800`.
- Màu sắc dòng log theo cấp độ (Log Levels):
  - `[INFO]`: `text-slate-300`
  - `[SUCCESS]`: `text-emerald-400 font-medium`
  - `[WARN]`: `text-amber-400`
  - `[ERROR]`: `text-rose-400 font-semibold`
  - `[DEBUG]`: `text-slate-500`
  - Timestamp: `text-slate-500 font-mono text-[11px]` (Định dạng: `[HH:mm:ss.SSS]`).
- Thanh công cụ log tích hợp: Bật/tắt tự động cuộn (Auto-scroll Lock), Ô lọc từ khóa nhanh, Nút xóa sạch log (Clear), Nút xuất log ra file TXT.

---

## 8. BẢNG PHÍM TẮT TOÀN ỨNG DỤNG (KEYBOARD SHORTCUTS MATRIX)

Để tối ưu hóa năng suất vận hành của các thợ nuôi nick chuyên nghiệp, hệ thống hỗ trợ thao tác hoàn toàn qua bàn phím:

| Phím tắt | Phạm vi tác dụng | Hành động kích hoạt | Ghi chú tương thích |
| :--- | :--- | :--- | :--- |
| `Ctrl + A` | Bảng DataGrid | Chọn toàn bộ tài khoản trong thư mục đang xem | Bỏ qua các tài khoản bị ẩn do bộ lọc |
| `Space` (Phím cách) | Bảng DataGrid | Đảo trạng thái Chọn / Bỏ chọn dòng đang focus | Không làm mất focus bàn phím |
| `Shift + Click` | Bảng DataGrid | Chọn một dải liên tục từ dòng trước đến dòng này | Chuẩn thao tác Windows Explorer |
| `Delete` | Bảng DataGrid | Chuyển các tài khoản đã chọn vào Thùng rác | Mở dialog xác nhận nhanh |
| `Shift + Delete` | Bảng DataGrid | Xóa vĩnh viễn tài khoản và xóa sạch Profile đĩa | Cảnh báo đỏ nguy hiểm |
| `F5` | Toàn hệ thống | Nạp lại dữ liệu từ CSDL SQLite | Không làm gián đoạn các luồng đang chạy |
| `Ctrl + F` | Toàn hệ thống | Nhảy tiêu điểm vào ô tìm kiếm nhanh UID/Email | Tự động bôi đen text cũ |
| `Ctrl + I` | Toàn hệ thống | Mở nhanh Modal Smart Import tài khoản | |
| `Ctrl + E` | Toàn hệ thống | Mở nhanh Modal Export tài khoản | |
| `Ctrl + R` | Toàn hệ thống | Bắt đầu chạy tương tác cho các nick đã chọn | Khớp với nút Play trên Toolbar |
| `Ctrl + S` | Modal cấu hình | Lưu thay đổi cấu hình kịch bản/hành động | |
| `Escape` (`Esc`) | Toàn hệ thống | Đóng Modal đang mở / Tắt Menu chuột phải | |
| `Arrow Up / Down` | Bảng DataGrid | Di chuyển dòng focus lên / xuống | Tự động cuộn theo view ảo hóa |
| `Ctrl + Shift + C` | Bảng DataGrid | Sao chép mã 2FA OTP 6 số của tài khoản đang chọn | Tự động sinh OTP tức thì |

---

## 9. GIỚI HẠN HIỂN THỊ & THÍCH ỨNG ĐỘ PHÂN GIẢI (DESKTOP CONSTRAINTS)

Ứng dụng được thiết kế tối ưu hóa cho màn hình máy tính để bàn (Desktop Native):
- **Kích thước tối thiểu (Minimum Window Size):** `1280 x 768 px` (đảm bảo hiển thị đầy đủ Toolbar và Sidebar không bị vỡ bố cục).
- **Kích thước tiêu chuẩn (Default Window Size):** `1440 x 900 px`.
- **Hỗ trợ màn hình lớn (FHD / 2K / 4K):** Bảng DataGrid tự động co giãn 100% chiều rộng màn hình, các cột tự động căn chỉnh tỷ lệ mượt mà.
- **Tùy chỉnh tỷ lệ hiển thị (Zoom Factor):** Hỗ trợ phóng to thu nhỏ toàn bộ giao diện từ `80%` đến `125%` thông qua phím tắt `Ctrl + (+/-)` để phù hợp với mắt người dùng.
