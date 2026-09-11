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

- **[11/09/2026]** - Tinh chỉnh hiệu ứng loading, giao diện biểu đồ, bố cục mặc định và mức zoom nến:
  - **Nội dung & Giải pháp:**
    1. Giảm thời gian loading hiệu ứng cho TẠO - XOÁ - LƯU (API Key & Cấu hình chiến thuật) từ 2.2s xuống 1.2s.
    2. Loại bỏ viền xanh tím khi chọn/kích hoạt biểu đồ (`.single-chart-card.active`), đồng bộ màu chỉ số sang trung tính.
    3. Đưa các nút chọn mã coin và khung thời gian (1H) vào bên trong biểu đồ cho cả bố cục 1 chart (giống 2/3/4 charts); thanh tiêu đề góc trên bên ngoài chỉ giữ lại nút chọn số lượng biểu đồ và nút Cài Đặt.
    4. Cấu hình danh sách coin mặc định khi chọn bố cục:
       - 1 biểu đồ: BTC
       - 2 biểu đồ: BTC -> ETH
       - 3 biểu đồ: XAU > BTC > ETH
       - 4 biểu đồ: XAU > BTC > ETH > USDT.D (tích hợp lấy dữ liệu nến USDT.D tự động qua TradingView websocket).
- **[11/09/2026]** - Khắc phục triệt để lỗi biểu đồ nến bị trôi/không hiện khi chuyển chế độ đa biểu đồ (Multi-chart) & hoàn thiện tâm đường chữ thập crosshair:
  - **Nguyên nhân:**
    1. Khi chuyển đổi bố cục (ví dụ từ 3 chart sang 2 chart), slot 0 đổi từ `XAU-USDT-SWAP` (giá ~4350) sang `BTC-USDT-SWAP` (giá ~77000). Do React dùng key `cfg.id` (hoặc index) nên tái sử dụng instance biểu đồ cũ, trong khi Lightweight Charts vẫn giữ trục giá Y (`rightPriceScale`) của XAU (4240 - 4480). Vì giá BTC ở mức 77000 nằm ngoài dải 4240 - 4480 nên nến BTC bay khỏi màn hình.
    2. Hàm `applyDefaultZoom` trước đó chỉ set `timeScale().setVisibleLogicalRange` (trục X) mà chưa ép `rightPriceScale().applyOptions({ autoScale: true })` (trục Y).
    3. Đường chữ thập trước đó dùng màu sáng và chưa ép mode `CrosshairMode.Normal` cùng `labelBackgroundColor` nền tối nên dễ gây mất tập trung.
  - **Giải pháp:**
    1. Gắn key React theo định danh duy nhất: `key={\`chart_\${idx}_\${chartLayout}_\${cfg.coin}\`}` giúp mỗi biểu đồ được tái khởi tạo hoàn toàn độc lập, sạch sẽ khi đổi bố cục hoặc đổi mã coin.
    2. Bổ sung `chartRef.current.priceScale('right').applyOptions({ autoScale: true })` và `candleSeriesRef.current.priceScale().applyOptions({ autoScale: true })` ngay khi nạp nến mới và trong `applyDefaultZoom`.
- **[11/09/2026]** - Duy trì đủ 1500 nến theo yêu cầu CEO & Khắc phục triệt để lỗi nến trôi ngoài màn hình:
  - **Yêu cầu CEO:** Giữ nguyên 1500 nến để các chỉ báo kỹ thuật quá khứ (Order Blocks, EMA200...) có đủ dữ liệu tính toán chính xác nhất, đồng thời tăng tốc độ tải biểu đồ và chống trôi nến.
  - **Giải pháp tối ưu:**
    1. **Sliding Window Pool 1500 nến:** Backend tạo bộ nhớ đệm `_historical_pool[(instId, bar)]` lưu trữ đủ 1500 nến. Lần đầu fetch đủ 1500 nến qua `requests.Session()` (tái sử dụng kết nối SSL). Các lần sau (hoặc định kỳ 15s) chỉ cần fetch 100 nến mới nhất (~0.08s), tự động gộp (merge) và trượt giữ đúng 1500 nến lịch sử. Nhờ đó, người dùng luôn có đủ 1500 nến mà tốc độ tải vẫn cực nhanh.
    2. **Chống Race Condition:** Frontend kiểm tra `targetCoin !== coin || targetTf !== tf` sau khi fetch; nếu người dùng đã đổi coin thì hủy bỏ dữ liệu cũ, không đè lên biểu đồ mới.
    3. **Tự động ép nến về đúng tâm màn hình:** Gọi `chart.timeScale().fitContent()` kết hợp `autoScale: true` trước khi áp dụng zoom `setVisibleLogicalRange({ from: total - 55, to: total - 1 + 8 })`. Biểu đồ của bất kỳ coin nào cũng lập tức nằm chuẩn giữa màn hình, không bị lệch hoặc mất nến.




