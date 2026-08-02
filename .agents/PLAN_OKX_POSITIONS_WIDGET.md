# PLAN: TÍCH HỢP BẢNG VỊ THẾ DỰ THỰC TẾ TRÊN SÀN OKX VÀO CHẾ ĐỘ DỌC MAIN UI

## 🎯 MỤC TIÊU
Thêm một ô Widget hiển thị danh sách **Vị thế / Lệnh đang chạy trực tiếp từ sàn OKX** ở vị trí giữa **Biểu đồ (Chart)** và **Màn hình Logs hệ thống** khi người dùng chọn **Chế độ dọc** (hoặc mở rộng ở Chế độ ngang).

---

## 🏗️ THIẾT KẾ KIẾN TRÚC & QUY TRÌNH (PONYTAIL MODE)

### 1. Thành phần UI (gui_main.py)
- **Checkbox Toggle Ẩn/Hiện (`self.chk_show_positions`)**:
  - Đặt tại thanh điều khiển trên biểu đồ (kế bên `self.chk_show_ob`) hoặc góc trên cùng.
  - Tên nhãn: `☑ Vị thế OKX` (Mặc định: Checked = True).
  - Kết nối Signal: `self.chk_show_positions.toggled.connect(self.tab_positions.setVisible)`. Khi bỏ tích, `self.tab_positions` sẽ bị ẩn (`setVisible(False)`) và `QSplitter` tự động co giãn 2 phần Chart & Logs lấp đầy màn hình.
- **Tạo Widget Bảng Vị Thế (`self.tab_positions`)**:
  - Đóng gói trong một `QtWidgets.QGroupBox("📌 VỊ THẾ / LỆNH ĐANG CHẠY TRÊN SÀN OKX (REALTIME)")` hoặc `QtWidgets.QWidget()`.
  - Dùng `QtWidgets.QTableWidget` gồm **6 Cột** chính chuẩn sàn OKX:
    1. `Cặp giao dịch` (Symbol & Leverage, e.g., `BTC-USDT (100x Cross)` hoặc `Hợp đồng vĩnh cửu BTCUSDT 100x`)
    2. `Giá vào lệnh` (Entry Price, e.g., `63,881.1`)
    3. `Ký quỹ` (Margin, e.g., `37.85 USDT Chéo`)
    4. `Kích thước` (Position Notional Size, e.g., `3,784.33 USDT`)
    5. `PNL thả nổi` (Unrealized PnL & %, e.g., `+10.35 USDT (+20.78%)` xanh dương/xanh lá, `-29.52 USDT (-77.39%)` đỏ)
    6. `Chốt lời | Dừng lỗ` (TP / SL, e.g., `TP: 67,075.2 | SL: 60,687.0`)


### 2. Cấu trúc QSplitter trong Chế độ dọc (gui_main.py)
- Trong `on_layout_mode_changed` & `setup_tab_live_view`:
  - **Chế độ dọc (Vertical Mode)**:
    - Index 0: `self.tab_chart` (Biểu đồ 1H/5m)
    - Index 1: `self.tab_positions` (Bảng Vị thế OKX mới)
    - Index 2: `self.tab_logs` (Màn hình Logs hệ thống)
    - Kích thước mặc định `split_view.setSizes([350, 250, 400])`.
  - **Chế độ ngang (Horizontal Mode)**:
    - Sắp xếp linh hoạt hoặc giữ `[self.tab_logs, self.tab_chart]` và lồng `self.tab_positions` bên dưới Chart.

### 3. Khởi tạo Luồng Lấy dữ liệu Realtime Trực Tiếp Sàn OKX (`OKXPositionsWorker`)
- Tạo class `OKXPositionsWorker(QtCore.QThread)` trong `gui_main.py`:
  - **Lấy dữ liệu tài khoản live**: Đọc `api_key`, `secret_key`, `passphrase`, `demo_mode` của tài khoản API đang chọn trên UI.
  - **Đồng bộ Realtime**: Định kỳ 2 - 3 giây/lần gọi trực tiếp REST API OKX:
    1. `GET /api/v5/account/positions?instType=SWAP`: Lấy danh sách vị thế đang chạy trực tiếp từ tài khoản OKX (Entry Price, Size, Margin, Realtime PnL, PnL%).
    2. `GET /api/v5/trade/orders-pending?ordType=algo`: Lấy các giá TP (Chốt lời) và SL (Dừng lỗ) đang treo tương ứng của từng cặp.
    3. `GET /api/v5/market/tickers?instType=SWAP`: Lấy giá mark/last price realtime để tự động cập nhật PnL thả nổi tức thì.
  - Phát signal `positions_signal.connect(self.update_positions_table)` gửi danh sách về UI.
  - Bắt try-except kín, tự động khôi phục kết nối nếu mạng chập chờn, tuyệt đối không làm đơ Main UI.


---

## 📋 THỦ TỤC THỰC THI (TASKS DÀNH CHO CLINE)
1. **Task 1**: Bổ sung class `OKXPositionsWorker` trong `gui_main.py` để định kỳ kéo positions & algo orders từ OKX.
2. **Task 2**: Tạo giao diện `self.tab_positions` (QTableWidget 6 cột) trong `setup_tab_live_view()` của `gui_main.py`.
3. **Task 3**: Cập nhật `on_layout_mode_changed` để khi chuyển "Chế độ dọc", `self.split_view` chèn `self.tab_positions` vào giữa Chart và Logs.
4. **Task 4**: Kết nối signal `positions_signal` cập nhật dữ liệu realtime mượt mà, định dạng màu sắc xanh/đỏ cho PnL và TP/SL.
5. **Task 5**: Thử nghiệm và cập nhật nhật ký vào `.agents/ISSUE_TRACKER.md`.
