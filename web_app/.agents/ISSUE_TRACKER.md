# ISSUE TRACKER - TLS1_Trading_Web

Nhật ký theo dõi các Tasks, Bugs và Lịch sử chỉnh sửa giao diện Web của hệ thống TLS1 Trading OS.

---

## 📌 DANH SÁCH CÁC TASK ĐANG CHỜ XỬ LÝ (PENDING TASKS)

- `[x]` **Task 1: Khởi tạo cấu trúc thư mục Web App**
  - Khởi tạo Backend FastAPI ở `zProjects/TLS1_Trading_Web/backend`.
  - Khởi tạo Frontend React + Vite ở `zProjects/TLS1_Trading_Web/frontend`.
- `[x]` **Task 2: Viết Backend Bridge cho API & WebSocket**
  - Viết API đọc/ghi cấu hình bot sub1/sub2.
  - Viết API start/stop subprocess gọi `sys_bot_sub1.py` / `sys_bot_sub2.py`.
  - Thiết lập WebSocket stream logs từ các tệp tin log của bot.
- `[x]` **Task 3: Thiết kế Giao diện Frontend (Dashboard)**
  - Thiết kế Layout 50/50 splitter (biểu đồ nến ở trên, log ở dưới).
  - Tích hợp Lightweight Charts vẽ nến và EMA200.
  - Tạo bảng vị thế và các nút "▶ BẮT ĐẦU CHẠY BOT", "■ DỪNG CHẠY BOT".
  - Chuyển cụm 6 checkbox TF thành nút Tag/Badge (màu viền #666666, chữ #cccccc, nền tối #161616 khi checked).
- `[x]` **Task 4: Tích hợp và Kiểm thử toàn diện**
  - Chạy liên thông cả bot, backend và frontend web.
  - Kiểm tra đồng bộ hóa các tùy chỉnh cài đặt và trạng thái nút bấm.

---

## 🐞 CÁC LỖI HIỆN TẠI ĐANG CHỜ XỬ LÝ (PENDING BUGS)

*(Danh sách trống — tất cả lỗi đã được xử lý)*

---

## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[09/08/2026]** - Khắc phục lỗi giao diện Web đen xì do crash parse positions API:
  - **Nguyên nhân:**
    1. Backend API `/api/bot/positions` trả về Object (dict từ `trade_markers.json`) thay vì mảng (List) khiến React crash do gọi `positions.map` lỗi.
    2. Backend chưa thực sự kết nối để lấy vị thế thực tế từ sàn OKX.
  - **Cập nhật:**
    1. Sửa `App.jsx` khai báo `safePositions` phòng vệ lỗi React crash.
    2. Sửa backend `main.py` tự động đọc credentials từ file `.api_sub1` trong Local AppData, ký số HMAC SHA256 và fetch trực tiếp vị thế thực tế cùng lệnh TP/SL Algo từ OKX API.
    3. Thêm cơ chế fallback tự động chuyển sang parse `trade_markers.json` thành mảng vị thế giả lập nếu chưa cấu hình API key.

- **[09/08/2026]** - Di chuyển dự án TLS1_Trading_Web vào bên trong thư mục OKX_Trade_Kit:
  - **Nguyên nhân:** CEO muốn gom nhóm giao diện Web và Bot giao dịch của OKX vào chung một thư mục mẹ để dễ dàng quản lý, đóng gói và đồng bộ hóa.
  - **Cập nhật:**
    1. Di chuyển toàn bộ thư mục `zProjects/TLS1_Trading_Web` vào trong `zProjects/OKX_Trade_Kit/TLS1_Trading_Web`.
    2. Cập nhật `OKX_TRADE_KIT_DIR` trong `backend/main.py` tự động định vị về thư mục cha của dự án.
    3. Cập nhật đường dẫn tương đối trỏ tới `.venv` của root công ty trong `zRun_Web.bat` lên 3 cấp (`..\..\..\.venv`).

