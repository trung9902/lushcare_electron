# HƯỚNG DẪN CÀI ĐẶT & SỬ DỤNG VMAX TECH AUTOMATION SUITE
> **Phiên bản:** v25.5.8 Pro  
> **Thương hiệu:** VMAX Tech (http://vmaxtech.vn/)  
> **Nền tảng:** Windows 10 / Windows 11 (64-bit)

---

## 🚀 CÁCH 1: CÀI ĐẶT BẰNG FILE SETUP CHUYÊN NGHIỆP (Khuyên dùng)

1. Truy cập thư mục:
   ```
   C:\Users\trung\software_studio\projects\lushcare_electron\release
   ```
2. Chạy file cài đặt:
   **`VMAX Tech Automation-Setup-25.5.8.exe`** (hoặc click đúp file **`CAI_DAT.bat`** ngoài thư mục gốc).
3. Trình cài đặt sẽ tự động:
   * Cho phép chọn thư mục cài đặt tùy ý.
   * Tạo biểu tượng **Shortcut ngoài Desktop** và trong **Start Menu**.
   * Tích hợp sẵn tính năng gỡ cài đặt (Uninstall) chuẩn Windows.
4. Sau khi cài xong, bạn chỉ cần bấm vào biểu tượng **VMAX Tech Automation** trên màn hình Desktop để mở ứng dụng!

---

## ⚡ CÁCH 2: DÙNG NGAY BẢN PORTABLE (Không cần cài đặt)

Nếu bạn muốn chạy ngay lập tức hoặc sao chép sang máy khác (USB, ổ cứng ngoài):

1. Mở thư mục `release/` và chạy trực tiếp file:
   **`VMAX Tech Automation-Portable-25.5.8.exe`** (hoặc click đúp file **`CHAY_NGAY.bat`** ngoài thư mục gốc).
2. Phần mềm sẽ khởi động ngay lập tức mà không cần cài đặt thêm bất kỳ phần mềm nào khác!

---

## 🛠️ CÁCH 3: CHẠY QUA MÃ NGUỒN NODE.JS / ELECTRON (Dành cho Lập trình viên)

1. Mở Terminal / PowerShell tại thư mục dự án:
   ```bash
   cd C:\Users\trung\software_studio\projects\lushcare_electron
   ```
2. Cài đặt các gói phụ thuộc (nếu chưa cài):
   ```bash
   npm install
   ```
3. Khởi chạy ứng dụng:
   ```bash
   npm start
   ```

---

## 📋 THÔNG TIN KỸ THUẬT VÀ TÍNH NĂNG
* **Cơ sở dữ liệu:** SQLite WAL Mode (`database/db_lushcare.sqlite`) chứa sẵn 244 tài khoản gốc.
* **Lõi trình duyệt:** Playwright-core + Stealth Evasion chống checkpoint, tự nhận diện Google Chrome trên máy (`C:\Program Files\Google\Chrome\Application\chrome.exe`).
* **Hành động tự động:** 19 kịch bản chuyên sâu (Lướt Feed, Reels, Watch, Story, Đăng tường, Đăng nhóm, Tham gia nhóm, Nhắn tin Messenger, Đổi pass, Bật 2FA, Vượt 956 qua mail...).
* **Bảng màu:** Chuẩn nhận diện VMAX Tech (Xanh laser `#61c73f`, Xanh lục bảo `#1f8538`, Nền không gian sâu VMAX Space `#031410`).
