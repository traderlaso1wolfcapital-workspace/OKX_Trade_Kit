# PLAN TLS1_Trading_Web

Dự án này chuyển đổi toàn bộ giao diện Desktop App hiện tại (chạy trên PyQt6) thành một ứng dụng Web gọn gàng, hiệu năng cao và có thể truy cập qua trình duyệt.

## 🏗 Kế hoạch Kiến trúc

Dự án sẽ gồm 2 phần được tích hợp chung trong thư mục `zProjects/TLS1_Trading_Web`:

### 1. Web Backend (Python - FastAPI)
Cung cấp các API và WebSocket/Socket.IO để giao tiếp trực tiếp với các file bot lõi và OKX API:
* **Quản lý tiến trình (Process Control):** API Bật / Dừng chạy các file bot ngầm (`sys_bot_sub1.py`, `sys_bot_sub2.py`) bằng `subprocess`.
* **Đọc/Ghi Cấu hình (Configuration Bridge):** API đọc và lưu các file cấu hình JSON của bot (`config_sub1.json`, `config_sub2.json`).
* **Logs Real-time (Log Streaming):** Sử dụng WebSockets/Socket.IO để đọc file log của bot theo thời gian thực và đẩy trực tiếp lên trình duyệt.
* **Dữ liệu Vị thế & Tài khoản (Live Data API):** Lấy thông tin vị thế trực tiếp từ OKX API hoặc từ Database nội bộ của bot để cấp cho Frontend.

### 2. Web Frontend (React + Vite + Vanilla CSS)
Giao diện người dùng Single Page App (SPA) được thiết kế hiện đại, mô phỏng 100% bố cục và hành vi của Desktop App hiện tại:
* **Header / TopRightCorner:**
  * Dropdown chọn Symbol (BTC-USDT-SWAP, ETH-USDT-SWAP, XAU-USDT...).
  * Dropdown chọn TF nến (1m, 5m, 15m, 30m, 1H, 2H, 4H, 1D).
  * Cụm 6 checkbox chọn Khung thời gian của bot (`M5➔H4`) hiển thị dưới dạng nút Tag/Badge (khi check đổi viền xám sáng `#666666`, chữ xám trắng nhẹ `#cccccc` trên nền tối `#161616`).
  * Nút "⚙️ Cài đặt" mở dialog cấu hình các thông số của bot.
* **Biểu đồ nến Live (Lightweight Charts):** Hiển thị biểu đồ nến real-time từ API OKX kèm các đường EMA200 tương ứng.
* **Bảng Vị Thế:** Bảng hiển thị thông tin vị thế đang mở từ OKX (Symbol, Side, Size, Avg Price, Live Price, ROI, Unrealized PnL, TP, SL...).
* **Bật/Tắt Bot:** Nút "▶ BẮT ĐẦU CHẠY BOT" (màu xanh lá) và "■ DỪNG CHẠY BOT" (màu đỏ) đồng bộ với trạng thái chạy của bot.
* **Terminal Logs:** Khung hiển thị log chạy thời gian thực với layout tùy chọn (Dọc/Ngang) thông qua Splitter chia đôi 50/50.

---

## 📅 Lộ trình Triển khai (Milestones)

1. **Khởi tạo dự án & Bản vẽ:** Tạo thư mục và cấu trúc tệp tin.
2. **Xây dựng Backend Bridge:** Viết API quản lý bot, đọc cấu hình, stream logs bằng FastAPI.
3. **Xây dựng Frontend Core:** Khởi tạo Next.js hoặc Vite + React, thiết lập Design System bằng Vanilla CSS đồng bộ giao diện Dark Mode của Desktop App.
4. **Tích hợp Chart & Real-time:** Tích hợp Lightweight Charts hiển thị nến và EMA200, kết nối WebSocket stream logs và vị thế.
5. **Đồng bộ hóa & Kiểm thử:** Chạy thử toàn bộ các chức năng Bật/Dừng bot, chỉnh sửa cấu hình trực tuyến, chốt lời/cắt lỗ.
