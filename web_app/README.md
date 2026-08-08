# TLS1_Trading_Web

Đây là giao diện Web của hệ thống **TLS1 Trading OS** (đưa toàn bộ giao diện Desktop App sang nền tảng trình duyệt Web).

## 🏗 Cấu trúc Dự án
* `backend/`: FastAPI Web Backend Bridge làm nhiệm vụ điều khiển bot, đọc log, cập nhật config và stream dữ liệu.
* `frontend/`: Single Page App viết bằng React + Vite + Lightweight Charts vẽ nến chuyên nghiệp.
* `zRun_Web.bat`: Trình khởi chạy nhanh 1-Click tự động cài dependencies và bật song song cả Backend và Frontend.

## 🚀 Hướng dẫn Khởi chạy
1. Click đúp vào file `zRun_Web.bat` ở gốc thư mục dự án này.
2. Script sẽ tự cài đặt thư viện cho Frontend (nếu chưa có) và bật 2 cửa sổ chạy Web Backend và Web Frontend.
3. Chờ vài giây rồi mở trình duyệt truy cập: **`http://localhost:5173`**.

## ⚙️ Cổng Mặc định
* **FastAPI Backend:** Cổng `8080` (`http://localhost:8080`).
* **Vite Frontend:** Cổng `5173` (`http://localhost:5173`).
