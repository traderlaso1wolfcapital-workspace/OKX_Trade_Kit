# TLS1 Trading Web (Giao diện Web Nền tảng Đám Mây)

Đây là giao diện Web của hệ sinh thái **TLS1 Trading OS** phục vụ giám sát, điều khiển Bot giao dịch OKX và Quỹ FX (TradeLocker) hoạt động 24/7 trên máy chủ đám mây (Mac Mini M1).

---

## 🏗 Kiến trúc Hệ thống

Hệ thống được thiết kế theo mô hình High-Performance Web Service:
1. **Frontend (React + Vite + Lightweight Charts):**
   - Được biên dịch tối ưu hóa thành bộ mã nguồn tĩnh (`web_app/frontend/dist/`).
   - Tích hợp biểu đồ nến chuyên nghiệp, bảng vị thế Realtime, logs streaming và điều khiển đa tài khoản.
2. **Backend (FastAPI + Uvicorn + WebSocket):**
   - Đóng vai trò là máy chủ duy nhất vừa điều khiển lõi Bot Python, vừa phát sóng WebSocket (`/ws/bot_data`, `/ws/logs`, `/ws/tradelocker/logs`), vừa phục vụ các file tĩnh React Frontend (`app.mount("/assets", ...)`).
   - Lắng nghe chính thức trên cổng **`8080`**.
3. **Cơ chế Cầu Nối Kép Tự Động (Dual Port Bridge 5173 ➔ 8080):**
   - Ngay khi khởi động, Backend tự động kích hoạt một luồng TCP Streamer trên cổng **`5173`** chuyển tiếp trực tiếp vào cổng **`8080`**.
   - **Tác dụng:** Tương thích 100% với cả 2 kiểu cấu hình Public Hostname trên Cloudflare Zero Trust (dù cấu hình trỏ vào `http://localhost:5173` hay `http://localhost:8080` đều hoạt động mượt mà, triệt tiêu vĩnh viễn lỗi `502 Bad Gateway`).
4. **Quản lý Tiến trình (PM2):**
   - Sử dụng file cấu hình chuẩn `ecosystem.config.js` với đường dẫn tuyệt đối `path.resolve(__dirname, 'web_app/backend')` và cờ `PYTHONUNBUFFERED=1` giúp backend tự phục hồi sau sự cố và ghi log theo thời gian thực.
5. **Đường hầm Cloudflare Tunnel (cloudflared):**
   - Mở đường hầm bảo mật HTTPS trỏ về domain chính thức: **`https://autotrader.fun`**.

---

## 🚀 Hướng Dẫn Vận Hành Trên Máy Chủ Mac Mini M1

### 1. Khởi động / Cập nhật Bản Web Mới:
Mở terminal trên Mac Mini (hoặc SSH), vào thư mục `web_app` và chạy:
```bash
git pull origin main && bash start_web_server.sh
```

Script sẽ tự động:
- Dọn dẹp các tiến trình cũ và giải phóng cổng mạng.
- Cài đặt đầy đủ dependencies từ `requirements.txt`.
- Biên dịch Frontend tối ưu bằng `npm run build`.
- Khởi động Backend bằng PM2 và hiển thị bảng trạng thái.
- Khởi chạy Cloudflare Tunnel kết nối domain `https://autotrader.fun`.

### 2. Dừng Hệ Thống Hoàn Toàn:
```bash
bash web_app/stop_web_server.sh
```

---

## 🛠 Lệnh Tra Cứu & Khắc Phục Sự Cố

| Tình huống | Lệnh thực hiện |
|---|---|
| **Xem bảng trạng thái PM2** | `pm2 status` |
| **Xem log Backend thời gian thực** | `pm2 logs tls1-bot-backend --lines 30` |
| **Khởi động lại riêng Backend** | `pm2 restart tls1-bot-backend` |
| **Xem log Cloudflare Tunnel** | `tail -n 30 web_app/tunnel.log` |
| **Kiểm tra cổng 8080 & 5173 đang mở** | `lsof -i :8080` hoặc `lsof -i :5173` |

---

## ⚙️ Quy Chuẩn Cổng Mạng (Port Reference)

* **FastAPI Backend (Cổng chính):** `http://localhost:8080`
* **Port Bridge (Cổng tương thích Cloudflare cũ / Vite):** `http://localhost:5173` ➔ Chuyển tiếp 8080
* **Domain Công Khai:** `https://autotrader.fun`
* **Cloudflare Zero Trust Service Target:** Khuyên dùng `http://localhost:8080` (hoặc `http://localhost:5173` đều được hỗ trợ).
