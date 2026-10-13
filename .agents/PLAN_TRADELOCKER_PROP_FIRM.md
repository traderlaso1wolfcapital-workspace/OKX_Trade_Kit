# Kế Hoạch Tích Hợp Đánh Quỹ E8 Markets (TradeLocker API) Vào Hệ Thống AutoTrader.fun

## 1. Mục Tiêu & Nguyên Lý Hoạt Động (Ponytail Architecture)
- **Tận dụng 100% Bộ Não Chiến Lược Có Sẵn:** Giữ nguyên toàn bộ logic phân tích nến, SMC, EMA200, Range Box, Lưới Đa Khung hiện tại của `autotrader.fun`. Không viết lại chiến lược mới.
- **Tách Biệt Cầu Nối Thực Thi (Execution Bridge):** Khi có tín hiệu Mua/Bán (BUY/SELL), hệ thống điều phối lệnh song song: vừa có thể đánh sàn OKX (nếu bật), vừa tự động bắn lệnh sang tài khoản quỹ TradeLocker (E8 Markets).
- **Kiến Trúc Đa Người Dùng (Multi-Tenant Security):** Mỗi user trên web dùng tài khoản quỹ riêng của họ (Email, Password, Server do E8 cấp). Thông tin được mã hóa AES Fernet lưu độc lập trong thư mục riêng của từng user, tuyệt đối không dùng chung tài khoản của CEO.
- **Tuân Thủ Tuyệt Đối Quy Định Quỹ E8 (ESPA Agreement):**
  * Tích hợp **Cầu dao ngắt lỗ ngày (Daily Drawdown Breaker):** Quỹ $5,000 có giới hạn lỗ ngày là $125. Bot tự động khóa chặt khi lỗ lũy kế ngày chạm ngưỡng an toàn (ví dụ: -$75) để không bao giờ vi phạm mốc $125.
  * Tích hợp **Cầu dao chốt lời ngày (Daily Profit Cap):** Gói E8 giới hạn trần lãi $100/ngày. Khi đạt ngưỡng lãi ~$85 - $95, bot tự động ngưng vào lệnh mới để bảo toàn kết quả thi.
  * Tự động tính toán Lot size (Position Sizing) dựa vào mức Ký quỹ / Rủi ro người dùng nhập trên giao diện.

---

## 2. Các Thành Phần Triển Khai (Components)

### A. Backend Module: `web_app/backend/tradelocker_service.py`
1. **Quản lý Xác thực & Phiên làm việc (JWT Auth):**
   - Đăng nhập qua endpoint `https://demo.tradelocker.com/backend-api/auth/jwt/token` (hoặc `live.tradelocker.com`).
   - Tự động lưu và gia hạn `accessToken`, `refreshToken`.
2. **Quản lý Tài khoản & Số dư (Account State):**
   - Gọi `/auth/jwt/all-accounts` lấy `accNum`, `accountId`.
   - Gọi `/trade/accounts/{accId}/state` lấy Số dư (Balance), Vốn khả dụng (Equity), Lãi/Lỗ tạm thời (PnL).
3. **Bộ Tra Cứu & Khớp Mã Giao Dịch (Symbol Mapper):**
   - Tự động map các cặp coin/forex của bot sang format của E8 TradeLocker:
     * Vàng: `XAUUSD` / `XAU` ⭢ `XAUUSD+` (Instrument ID: `6713`)
     * Bitcoin: `BTCUSDT` / `BTC` ⭢ `BTCUSD+` (Instrument ID: `6753`)
     * Ethereum: `ETHUSDT` / `ETH` ⭢ `ETHUSD+` (Instrument ID: `6751`)
     * Forex: `EURUSD` ⭢ `EURUSD+` (ID: `6730`), `GBPUSD` ⭢ `GBPUSD+` (ID: `6727`)
4. **Bộ Tính Toán Khối Lượng Lot (Auto-Lot Sizing Engine):**
   - Công thức quy đổi Lot chuẩn theo khoảng cách Stop Loss và số tiền Ký quỹ / Rủi ro cho phép.
5. **Thực Thi Lệnh (Order Execution):**
   - Bắn lệnh qua API TradeLocker kèm trực tiếp Stop Loss và Take Profit.
   - Giám sát vị thế mở và lịch sử lệnh.

### B. Mở Rộng API Backend trong `web_app/backend/main.py`
- `POST /api/tradelocker/connect`: Đăng nhập, kiểm tra thông tin tài khoản E8, mã hóa và lưu credentials cho user hiện tại.
- `GET /api/tradelocker/account`: Trả về trạng thái tài khoản, số dư, equity, thống kê drawdown ngày & drawdown tổng.
- `POST /api/tradelocker/config`: Lưu thiết lập rủi ro quỹ (Quy mô quỹ, Mức ký quỹ bot được dùng, Risk per trade, Cặp trade).
- `GET /api/tradelocker/config`: Đọc cấu hình rủi ro quỹ của user.
- `POST /api/tradelocker/disconnect`: Hủy liên kết tài khoản quỹ.

### C. Giao Diện Người Dùng (Frontend)
1. **Modal Kết Nối Tài Khoản (`ConnectModal.jsx`):**
   - Thêm tab thứ 3: **"Quỹ E8 / TradeLocker"** bên cạnh OKX Fast Connect và OKX API Key.
   - Form nhập liệu: Server (E8 Demo / E8 Live / Custom URL), Email, Password.
   - Tùy chọn cài đặt quỹ: Size gói ($5k, $10k, $25k, $50k, $100k, $200k), Mức ký quỹ/rủi ro cho bot.
   - Nút **"Kết Nối Tài Khoản Quỹ"**.
2. **Bảng Điều Khiển Quỹ (Prop Firm Goal Widget):**
   - Hiển thị trực quan thanh tiến trình mục tiêu:
     * **Mục tiêu lợi nhuận (Profit Target):** Đã đạt bao nhiêu / Cần đạt $400.
     * **Ngưỡng lỗ ngày (Daily Drawdown):** Đang âm bao nhiêu / Tối đa $125.
     * **Ngưỡng lỗ tổng (Static Drawdown):** Mức thấp nhất / Tối đa $400.
     * **Trần lãi ngày (Daily Profit Cap):** Đã lãi bao nhiêu / Tối đa $100.

---

## 3. Lộ Trình Triển Khai Từng Bước
- [x] **Bước 1:** Test kết nối ngầm trực tiếp thành công với TradeLocker API server E8 (Account $5,000, ID `2534591`).
- [x] **Bước 2:** Viết module `web_app/backend/tradelocker_service.py` xử lý toàn bộ logic API TradeLocker (JWT token, account state, symbol mapper, lot sizing, circuit breakers, placement/close position, cancel orders).
- [x] **Bước 3:** Bổ sung các endpoints REST API trong `web_app/backend/main.py` (`/api/tradelocker/connect`, `/account`, `/config`, `/disconnect`, và truyền `BOT_USER_UID` vào process bot).
- [x] **Bước 4:** Nâng cấp `ConnectModal.jsx` và `TradeLockerTab.jsx` để user nhập tài khoản quỹ, cấu hình rủi ro và giám sát mục tiêu quỹ trực quan.
- [x] **Bước 5:** Tích hợp bộ tính Lot và cơ chế bắn lệnh tự động từ tín hiệu chiến lược của bot qua `dispatch_signal_async` trong `bots/sub1/bot_orders.py` và `bots/sub2/bot_orders.py`.
- [x] **Bước 6:** Kiểm thử end-to-end trên tài khoản E8 Demo ($5,000 ID 2534591):
  * Khắc phục vấn đề chặn mạng DNS/TLS SNI tại Việt Nam qua Cloudflare WARP.
  * Bắn lệnh test thật BUY XAUUSD 0.01 Lot (Mã lệnh: `360287970213215464`), khớp vị thế ngay tức thì.
  * Đóng vị thế thành công qua `DELETE /trade/positions/{posId}` (chuẩn TradeLocker API).
  * Đặt và hủy lệnh Limit thành công (Mã lệnh: `360287970213215662`). Nghiệm thu sạch sẽ 100%.
- [x] **Bước 7:** Tách biệt độc lập 100% giữa Sàn OKX và Quỹ FX (TradeLocker Dual-Engine Isolation):
  * Khắc phục triệt để lỗi bảng vị thế bị giật/nhảy liên tục (flickering) giữa OKX và TradeLocker: cô lập riêng `wsPositions` và `propPositions`.
  * Bổ sung cờ chạy `is_bot_running` riêng cho Quỹ FX trong `tradelocker_service.py` và các API độc lập: `GET /api/tradelocker/bot/status`, `POST /api/tradelocker/bot/start`, `POST /api/tradelocker/bot/stop`.
  * Tách biệt nút bấm và trạng thái `isRunning` trên giao diện: Khi Bot OKX đang chạy, người dùng vẫn có thể chuyển sang Quỹ FX và bật chạy Bot Quỹ FX song song mà không làm dừng hay ảnh hưởng đến Bot OKX.
  * Mở khóa dropdown chọn nền tảng (`SidebarLeft.jsx`) cho phép chuyển đổi qua lại bất kỳ lúc nào.
- [x] **Bước 8:** Tách biệt hoàn toàn hệ thống Logs giữa Sàn OKX và Quỹ FX (TradeLocker Logs Channel Isolation):
  * Phân luồng dữ liệu log tại backend `log_reader_task`: Tự động nhận diện và chuyển hướng các dòng log liên quan đến Quỹ FX (TradeLocker, E8 Dispatch, Shadow Mode) sang `TradeLockerManager.log_event`, tuyệt đối không để lẫn vào log ring buffer của sàn OKX.
  * Xây dựng Dashboard Snapshot và Event stream riêng cho Quỹ FX qua REST endpoint `GET /api/tradelocker/logs` và WebSocket `/ws/tradelocker/logs/{uid}`.
  * Tách biệt 2 state log độc lập trên Frontend (`logs` cho OKX, `propLogs` cho Quỹ FX).
  * Nâng cấp `LogsTerminal.jsx` với thanh điều hướng kênh logs chuyên nghiệp: `[ 🌐 SÀN OKX ]` và `[ 🏆 QUỸ FX (TRADELOCKER) ]`, tích hợp đèn tín hiệu trạng thái LIVE thời gian thực và tự động đồng bộ khi chuyển nền tảng.
- [x] **Bước 9:** Khắc phục triệt để lỗi báo đặt lệnh TradeLocker thành công mã None và lỗi vượt ký quỹ (Not enough margin):
  * Thẩm định chặt chẽ kết quả đặt lệnh từ TradeLocker API: Kiểm tra cờ trạng thái `s` ("ok" vs "error"/"fail") và trích xuất chính xác mã `orderId`. Loại bỏ hoàn toàn tình trạng báo thành công giả (`Mã lệnh: None`) khi sàn thực tế từ chối lệnh.
  * Đồng bộ khối lượng Lot cố định (Fixed Lot) giữa giao diện người dùng và backend: Ô SpinBox `Khối lượng: [LOT] [Cố định] 0.01 L` được lưu trực tiếp vào backend qua `/api/tradelocker/config`.
  * Bot ưu tiên tuyệt đối số Lot cố định được cài đặt trên UI (mặc định an toàn: 0.01 Lot), ngăn chặn việc tính toán khối lượng động quá lớn (ví dụ 0.70 Lot ETH) làm vi phạm ký quỹ của tài khoản quỹ.
- [x] **Bước 10:** Khắc phục triệt để lỗi Spam vào lệnh liên tục, Thiếu Stop Loss / Take Profit, Không hiện Logs Quỹ FX và Bảng Vị Thế (0):
  * **Cầu dao chống spam lệnh cùng chiều (Anti-Spam Position Check):** Trước khi chuyển tiếp lệnh sang TradeLocker, tự động truy vấn danh sách vị thế đang mở qua `get_positions()`. Nếu cặp giao dịch đã có vị thế mở cùng chiều (BUY/SELL), lập tức chặn và ghi nhận log cảnh báo, không mở thêm vị thế dồn dập.
  * **Khóa ngắt nhịp Cooldown:** Áp dụng thời gian chờ tối thiểu 45 giây giữa các lần xử lý tín hiệu cho cùng một symbol.
  * **Bảo vệ SL / TP Fallback:** Nếu bot không truyền tham số cắt lỗ/chốt lời (hoặc lệnh Limit giá cao hơn giá thị trường khiến OKX algo bị None), tự động tính toán SL và TP theo cấu hình `sl_percent`/`tp_percent` (mặc định 1.2%) trước khi bắn lệnh sang TradeLocker.
  * **Cơ chế tự sửa lỗi SL/TP (Self-Healing Position Patch):** Khi duyệt danh sách vị thế đang mở trên TradeLocker, nếu phát hiện vị thế nào chưa có Stop Loss, hệ thống tự động gọi API `PATCH /trade/positions/{posId}` để gắn bổ sung SL và TP an toàn.
  * **Sửa lỗi Bảng Vị Thế (0) & Định dạng ma trận:** Chuẩn hóa dữ liệu trả về từ TradeLocker API (ma trận mảng lồng nhau 2D) thông qua `get_positions_columns()`, ánh xạ chính xác `ticket_id, symbol, posSide, size, openPrice, upl, roi, stopLoss, takeProfit` hiển thị trực quan trên giao diện web.
  * **Khắc phục kênh Logs Quỹ FX & Lọc rác HTML Cloudflare:** Chuyển hướng log song song vào cả queue UID và queue `default` cho WebSocket; lọc sạch thẻ HTML lỗi 502/504 từ Cloudflare thành thông báo súc tích dễ nhìn.


