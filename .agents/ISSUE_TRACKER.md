# Hệ thống Lưu vết Lỗi (Bug Tracker)

File này đóng vai trò là bảng theo dõi toàn bộ các lỗi (bugs) hoặc vấn đề (issues) phát sinh trong quá trình Bot giao dịch thực tế. 
**QUY TẮC BẮT BUỘC DÀNH CHO CÁC AI AGENT:** 
- Bất cứ khi nào Agent bắt đầu một phiên làm việc mới liên quan đến việc sửa lỗi hoặc cập nhật tính năng, Agent **PHẢI** đọc file này trước tiên để xem có lỗi nào đang tồn tại hay không.
- Sau khi fix xong một lỗi, Agent **PHẢI** tự động xóa (hoặc đánh dấu hoàn thành) lỗi đó khỏi danh sách này.
- Bất kỳ lỗi mới nào phát sinh chưa được giải quyết phải được ghi chú vào đây.

---

## 🐞 CÁC LỖI HIỆN TẠI ĐANG CHỜ XỬ LÝ (PENDING BUGS)

*(Danh sách trống — tất cả lỗi đã được xử lý)*




---

## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[03/08/2026]** - Chuẩn hóa toàn bộ giao diện App & Terminal theo 1 khuôn mẫu chung (Unified UI System):
  1. **Tự động áp dụng chung cho mọi Bot (Main, Sub1, Sub2 SMC-OB, Sub3...):** Giao diện GUI dùng chung class `BotInstanceWidget`.
  2. **Font Size & Style Bảng Vị Thế:** Font nền `14px` (Chữ thường `normal`), riêng PNL amount `16px` nổi bật; Căn lề số/USDT bên phải, PNL/TPSL căn giữa.
  3. **Ký Quỹ:** Hiển thị theo đơn vị `$`, tự động tính fallback `Margin = Size / Leverage` nếu sàn chưa trả về `mgn`.
  4. **Nút Bắt Đầu / Dừng:** Đồng bộ trạng thái màu sắc (Kích hoạt ➔ Xanh `#2E7D32` / Đỏ `#C62828`, Vô hiệu hóa ➔ Xám `#555555`).
  5. **Terminal Log:** Chuẩn hóa chiều rộng 78 ký tự, chuyển toàn bộ nhãn tiêu đề từ Chữ IN HOA sang Chữ in thường/Hoa đầu từ mềm mại trên cả Sub1 và Sub2. (Mã patch: `z3500`)

- **[01/08/2026]** - Lỗi `NameError: name 'bot_config' is not defined` tại `z_bot_sub2/bot_strategy.py:L783`. Đã fix: Bổ sung import module `from z_bot_sub2 import bot_config` ở đầu file `bot_strategy.py` để các lệnh `getattr(bot_config, ...)` truy cập đúng cấu hình toàn cục.

- **[28/07/2026]** - Sửa hàng loạt các lỗi liên quan đến UI & Config. Đã fix: Lỗi tick bỏ chọn coin (XAU) nhưng bot vẫn đặt lệnh do lỗi lưu file config; Ẩn các dòng log '[SYNC]' gây rối mắt trên console; Canh lề thẳng dấu hai chấm (:) ở mục tình trạng lệnh bằng cách đệm cứng khoảng trắng cho chuỗi Khung thời gian DCA; Đổi lại nhãn TÀI KHOẢN thành LỢI NHUẬN và TỔNG VỐN thành TÀI KHOẢN trên Dashboard. (Mã patch: `z6`, `z1951`, `z7718`)

- **[28/07/2026]** - Sửa lỗi `No module named 'bot_models'`, cập nhật tính Volume động từ cấu hình người dùng (JSON) cho hàm `determine_filled_tf` và bổ sung Fallback Market khi gặp lỗi OKX `51006`. Đã fix: Đưa import `bot_models` lên top-level với try-except fallback, đọc trực tiếp `POSITION_VOLUME_HIGH_CONFIDENCE` từ `FILE_GLOBAL_CONFIG` (JSON) thay vì dùng mốc cứng 450 U, và bổ sung hàm `place_market_entry` kích hoạt khi OKX từ chối lệnh Limit do trượt giá (`51006`). (Mã patch: `z7718`)
- **[28/07/2026]** - Tối ưu UI & Tích hợp Firebase Chat: Thay thế WebEngineView (Cbox/tlk.io) ở tab Cộng Đồng bằng Native PyQt Chat kết nối thẳng tới Firebase RTDB để nhẹ và ổn định hơn. Cập nhật Checkbox trên Dashboard thành dạng tương tác được (interactive) và auto-save vào cấu hình. Fix màu nền đen trùng với màu chữ của Dropdown chọn tài khoản API. (Mã patch: `z5`)
- **[28/07/2026]** - Lỗi v1.0.231 không hiển thị chart trên bản release Windows và yêu cầu tính năng vẽ marker B/S. Đã fix: Sửa `fix_qtwebengine_path` hỗ trợ Windows tìm `QtWebEngineProcess.exe`, đồng bộ mặc định `combo_coin` với `LiveChartWorker` để tránh blank chart khởi tạo. Tích hợp tính năng ghi log trade markers tại `bot_models.py` khi vào lệnh/thoát lệnh và vẽ (update) liên tục trên `LiveChartWorker` của `gui_main.py` (Marker sáng màu khi Active, và chuyển màu tối/chìm khi Closed). (Mã patch: `z4`, `z7717`)
- **[27/07/2026]** - XAU (forex) giao dịch sai trend do bị ép neo theo BTC H4. Phát hiện 4 vị trí hardcode `["BTC", "XAU"]` hoặc chỉ check `coin_name != "BTC"` bỏ qua `_is_alt_synced`. Đã fix triệt để: thêm field `asset_class` ("crypto"/"forex") vào `COIN_PORTFOLIO` trong `bot_config.py`, sửa `_is_alt_synced` trong `bot_strategy.py` dùng `cfg.get("asset_class")`, sửa 3 block khác (ép trend H4, allowed_long/short, Macro Extension Breaker) để dùng `_is_alt_synced` thay vì hardcode. (Mã patch: `z7715`, `z7716`)

- **[23/07/2026]** - ✅ Hoàn thành Audit System 2026: Vá 3 lỗ hổng hệ thống cốt lõi:
  1. **Retry/Backoff API OKX**: Thêm vòng lặp retry 3 lần kèm `time.sleep(1)` vào cả sync `request()` và async `request()` trong `bot_api.py` (sub1 + sub2), bắt HTTP 429 và OKX 50011/50026, timeout/connection error.
  2. **Thanh trừng `except: pass`**: Thay thế các block `except: pass` tại các hàm trọng yếu (`clean_limit_orders`, `cleanup_all_orders_on_startup`, fetch candles, xử lý vị thế, trailing SL upgrade TF) bằng `hft_logger.error(...)` trong `bot_orders.py` và `bot_strategy.py`.
  3. **Graceful Shutdown QThread**: Bổ sung logic dừng `BotSubprocessWorker` (stop → quit → wait → terminate) và dọn dẹp `_GLOBAL_AUDIO_PLAYERS.clear()` trong `closeEvent` của `gui_main.py`.
  *(CTO Antigravity Update: Đã fix lại triệt để lỗi bắt thiếu JSONDecodeError/HTTPError, sửa lỗi treo App do worker.stop block Main Thread, và rà soát triệt để except: pass do Cline làm sót trong bot_strategy.py)*
  (Tham chiếu: `PLAN_SYSTEM_AUDIT_2026.md`, Mã patch: `z3400`)

- **[23/07/2026]** - Lỗi văng App do thiếu thuộc tính play_sound trên MainWindow và sót biến smc_combo_mode khi lưu cấu hình. Đã fix: Refactor trình phát âm thanh thành hàm toàn cục play_ui_sound() và dọn dẹp các biến cấu hình SMC rác (Mã patch: z3322).
- **[16/07/2026]** - Lỗi `bot_sub1` Altcoin Neo BTC entry bị đẩy cao hơn giá live khi BTC sát EMA200 hoặc bị overshoots sâu qua EMA. Đã fix: Bỏ `volatility_mult` khỏi base offset và áp dụng cơ chế **EMA Floor Clamp**: Giới hạn entry của Altcoin không vượt quá ngưỡng an toàn `EMA200_Altcoin * (1 +/- base_buffer)` của chính nó (Mã patch: `z3318`).
- **[16/07/2026]** - Lỗi `bot_sub1` rải lưới DCA quá sát nhau ở các khung lớn do khoảng cách chặn (DCA_GAP) tính toán sai. Đã fix: Chuyển hệ số nhân từ `TF_VOLUME_MULTIPLIERS` sang `TF_MULTIPLIERS` và set lại Base Gap về chuẩn 0.5% (`0.0050`) để các lưới H1, H2, H4 giãn ra đúng cấp số nhân (Mã patch: `z3319`).
- **[16/07/2026]** - Tối ưu Giao diện UI: Lệnh BTC và Altcoin hiển thị lộn xộn trong bảng trạng thái. Đã fix: Sửa logic sort trong `bot_ui.py` để ép hạng mục `BTC` luôn được ưu tiên in ra đầu tiên trong bảng `✜ TÌNH TRẠNG VỊ THẾ` dù đang pending hay đã khớp (Mã patch: `z3320`).
- **[16/07/2026]** - Dọn dẹp Code: Loại bỏ triệt để 3 biến cấu hình rác không còn sử dụng trong logic (`EMA_SQUEEZE_TOLERANCE_PCT`, `EMA200_DRIFT_THRESHOLD_PCT`, `ALTCOIN_DIFF_THRESHOLD_PCT`) giúp làm sạch `bot_config.py` (Mã patch: `z3321`).

- **[13/07/2026]** - Lỗi syntax (unexpected indent, expected indented block) và lỗi runtime `name '_cur_pp_tf' is not defined`, `name '_pp_tf_grid' is not defined`, `name '_lever' is not defined` trong `bot_sub1.py` sau khi gỡ bỏ cơ chế Ping-Pong. Đã fix: Xóa bỏ triệt để các biến, các dòng code liên quan đến `_cur_pp_tf`, `_pp_tf_grid`, `is_pp_tf` và dọn dẹp lại thụt lề chuẩn xác tại các block if/elif. Định nghĩa lại `_lever` bằng `str(_get_leverage(tf))`. (Mã patch: `z3310`, `z3311`, `z3312`).

- **[14/07/2026]** - Lỗi `bot_sub1` không đặt lệnh TP/SL khi khớp lệnh do crash ngầm `UnboundLocalError` (tàn dư biến `pp_long_pos` từ đợt gỡ Ping-Pong). Đã fix: Xóa bỏ hoàn toàn phần đọc vị thế isolated của Ping-Pong trong vòng lặp `fetch_positions` (Mã patch: `z3317`).
- **[14/07/2026]** - Lỗi `bot_sub1` DCA vô số lệnh cùng 1 TF do API OKX delay (nhân bản Limit Order) và Volume rung lắc liên tục do tính theo `live_price`. Đã fix: Thêm thuật toán `🧹 [CLEANUP]` dọn dẹp các lệnh duplicates trực tiếp trong `actual_pending` và đổi công thức tính Khối lượng Limit (`sz_for_tf`) dựa trên giá Limit (`px_tf`) thay vì `live_price` để ổn định size (Mã patch: `z3316`).

# Hệ thống Lưu vết Lỗi (Bug Tracker)

File này đóng vai trò là bảng theo dõi toàn bộ các lỗi (bugs) hoặc vấn đề (issues) phát sinh trong quá trình Bot giao dịch thực tế. 
**QUY TẮC BẮT BUỘC DÀNH CHO CÁC AI AGENT:** 
- Bất cứ khi nào Agent bắt đầu một phiên làm việc mới liên quan đến việc sửa lỗi hoặc cập nhật tính năng, Agent **PHẦI** đọc file này trước tiên để xem có lỗi nào đang tồn tại hay không.
- Sau khi fix xong một lỗi, Agent **PHẦI** tự động xóa (hoặc đánh dấu hoàn thành) lỗi đó khỏi danh sách này.
- Bất kỳ lỗi mới nào phát sinh chưa được giải quyết phải được ghi chú vào đây.

---

## 🐞 CÁC LỖI HIỆN TẠI ĐANG CHỜ XỬ LÝ (PENDING BUGS)

*(Danh sách trống — tất cả lỗi đã được xử lý)*




---

## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[01/08/2026]** - Hoàn thành Task-OKX-Pos-01: Tích hợp Bảng Vị thế OKX Realtime vào giữa Chart và Logs (Chế độ dọc) kèm tính năng Toggle Checkbox `☑ Vị thế OKX` trong `gui_main.py`. Cập nhật luồng `OKXPositionsWorker` kéo API trực tiếp. (Mã patch: `z-task-okx-pos-01`)
- **[01/08/2026]** - Hoàn thành Task-Test-01: Thêm dòng log xác nhận cập nhật kiến trúc V2 vào hàm `main()` trong `sys_bot_sub2.py`. (Mã patch: `z-task-test-01`)

- **[01/08/2026]** - Lỗi `NameError: name 'bot_config' is not defined` tại `z_bot_sub2/bot_strategy.py:L783`. Đã fix: Bổ sung import module `from z_bot_sub2 import bot_config` ở đầu file `bot_strategy.py` để các lệnh `getattr(bot_config, ...)` truy cập đúng cấu hình toàn cục.

- **[28/07/2026]** - Sửa hàng loạt các lỗi liên quan đến UI & Config. Đã fix: Lỗi tick bỏ chọn coin (XAU) nhưng bot vẫn đặt lệnh do lỗi lưu file config; Ẩn các dòng log '[SYNC]' gây rối mắt trên console; Canh lề thẳng dấu hai chấm (:) ở mục tình trạng lệnh bằng cách đệm cứng khoảng trắng cho chuỗi Khung thời gian DCA; Đổi lại nhãn TÀI KHOẢN thành LỢI NHUẬN và TỔNG VỐN thành TÀI KHOẢN trên Dashboard. (Mã patch: `z6`, `z1951`, `z7718`)

- **[28/07/2026]** - Sửa lỗi `No module named 'bot_models'`, cập nhật tính Volume động từ cấu hình người dùng (JSON) cho hàm `determine_filled_tf` và bổ sung Fallback Market khi gặp lỗi OKX `51006`. Đã fix: Đưa import `bot_models` lên top-level với try-except fallback, đọc trực tiếp `POSITION_VOLUME_HIGH_CONFIDENCE` từ `FILE_GLOBAL_CONFIG` (JSON) thay vì dùng mốc cứng 450 U, và bổ sung hàm `place_market_entry` kích hoạt khi OKX từ chối lệnh Limit do trượt giá (`51006`). (Mã patch: `z7718`)
- **[28/07/2026]** - Tối ưu UI & Tích hợp Firebase Chat: Thay thế WebEngineView (Cbox/tlk.io) ở tab Cộng Đồng bằng Native PyQt Chat kết nối thẳng tới Firebase RTDB để nhẹ và ổn định hơn. Cập nhật Checkbox trên Dashboard thành dạng tương tác được (interactive) và auto-save vào cấu hình. Fix màu nền đen trùng với màu chữ của Dropdown chọn tài khoản API. (Mã patch: `z5`)
- **[28/07/2026]** - Lỗi v1.0.231 không hiển thị chart trên bản release Windows và yêu cầu tính năng vẽ marker B/S. Đã fix: Sửa `fix_qtwebengine_path` hỗ trợ Windows tìm `QtWebEngineProcess.exe`, đồng bộ mặc định `combo_coin` với `LiveChartWorker` để tránh blank chart khởi tạo. Tích hợp tính năng ghi log trade markers tại `bot_models.py` khi vào lệnh/thoát lệnh và vẽ (update) liên tục trên `LiveChartWorker` của `gui_main.py` (Marker sáng màu khi Active, và chuyển màu tối/chìm khi Closed). (Mã patch: `z4`, `z7717`)
- **[27/07/2026]** - XAU (forex) giao dịch sai trend do bị ép neo theo BTC H4. Phát hiện 4 vị trí hardcode `["BTC", "XAU"]` hoặc chỉ check `coin_name != "BTC"` bỏ qua `_is_alt_synced`. Đã fix triệt để: thêm field `asset_class` ("crypto"/"forex") vào `COIN_PORTFOLIO` trong `bot_config.py`, sửa `_is_alt_synced` trong `bot_strategy.py` dùng `cfg.get("asset_class")`, sửa 3 block khác (ép trend H4, allowed_long/short, Macro Extension Breaker) để dùng `_is_alt_synced` thay vì hardcode. (Mã patch: `z7715`, `z7716`)

- **[23/07/2026]** - ✅ Hoàn thành Audit System 2026: Vá 3 lỗ hổng hệ thống cốt lõi:
  1. **Retry/Backoff API OKX**: Thêm vòng lặp retry 3 lần kèm `time.sleep(1)` vào cả sync `request()` và async `request()` trong `bot_api.py` (sub1 + sub2), bắt HTTP 429 và OKX 50011/50026, timeout/connection error.
  2. **Thanh trừng `except: pass`**: Thay thế các block `except: pass` tại các hàm trọng yếu (`clean_limit_orders`, `cleanup_all_orders_on_startup`, fetch candles, xử lý vị thế, trailing SL upgrade TF) bằng `hft_logger.error(...)` trong `bot_orders.py` và `bot_strategy.py`.
  3. **Graceful Shutdown QThread**: Bổ sung logic dừng `BotSubprocessWorker` (stop → quit → wait → terminate) và dọn dẹp `_GLOBAL_AUDIO_PLAYERS.clear()` trong `closeEvent` của `gui_main.py`.
  *(CTO Antigravity Update: Đã fix lại triệt để lỗi bắt thiếu JSONDecodeError/HTTPError, sửa lỗi treo App do worker.stop block Main Thread, và rà soát triệt để except: pass do Cline làm sót trong bot_strategy.py)*
  (Tham chiếu: `PLAN_SYSTEM_AUDIT_2026.md`, Mã patch: `z3400`)

- **[23/07/2026]** - Lỗi văng App do thiếu thuộc tính play_sound trên MainWindow và sót biến smc_combo_mode khi lưu cấu hình. Đã fix: Refactor trình phát âm thanh thành hàm toàn cục play_ui_sound() và dọn dẹp các biến cấu hình SMC rác (Mã patch: z3322).
- **[16/07/2026]** - Lỗi `bot_sub1` Altcoin Neo BTC entry bị đẩy cao hơn giá live khi BTC sát EMA200 hoặc bị overshoots sâu qua EMA. Đã fix: Bỏ `volatility_mult` khỏi base offset và áp dụng cơ chế **EMA Floor Clamp**: Giới hạn entry của Altcoin không vượt quá ngưỡng an toàn `EMA200_Altcoin * (1 +/- base_buffer)` của chính nó (Mã patch: `z3318`).
- **[16/07/2026]** - Lỗi `bot_sub1` rải lưới DCA quá sát nhau ở các khung lớn do khoảng cách chặn (DCA_GAP) tính toán sai. Đã fix: Chuyển hệ số nhân từ `TF_VOLUME_MULTIPLIERS` sang `TF_MULTIPLIERS` và set lại Base Gap về chuẩn 0.5% (`0.0050`) để các lưới H1, H2, H4 giãn ra đúng cấp số nhân (Mã patch: `z3319`).
- **[16/07/2026]** - Tối ưu Giao diện UI: Lệnh BTC và Altcoin hiển thị lộn xộn trong bảng trạng thái. Đã fix: Sửa logic sort trong `bot_ui.py` để ép hạng mục `BTC` luôn được ưu tiên in ra đầu tiên trong bảng `✜ TÌNH TRẠNG VỊ THẾ` dù đang pending hay đã khớp (Mã patch: `z3320`).
- **[16/07/2026]** - Dọn dẹp Code: Loại bỏ triệt để 3 biến cấu hình rác không còn sử dụng trong logic (`EMA_SQUEEZE_TOLERANCE_PCT`, `EMA200_DRIFT_THRESHOLD_PCT`, `ALTCOIN_DIFF_THRESHOLD_PCT`) giúp làm sạch `bot_config.py` (Mã patch: `z3321`).

- **[13/07/2026]** - Lỗi syntax (unexpected indent, expected indented block) và lỗi runtime `name '_cur_pp_tf' is not defined`, `name '_pp_tf_grid' is not defined`, `name '_lever' is not defined` trong `bot_sub1.py` sau khi gỡ bỏ cơ chế Ping-Pong. Đã fix: Xóa bỏ triệt để các biến, các dòng code liên quan đến `_cur_pp_tf`, `_pp_tf_grid`, `is_pp_tf` và dọn dẹp lại thụt lề chuẩn xác tại các block if/elif. Định nghĩa lại `_lever` bằng `str(_get_leverage(tf))`. (Mã patch: `z3310`, `z3311`, `z3312`).

- **[14/07/2026]** - Lỗi `bot_sub1` không đặt lệnh TP/SL khi khớp lệnh do crash ngầm `UnboundLocalError` (tàn dư biến `pp_long_pos` từ đợt gỡ Ping-Pong). Đã fix: Xóa bỏ hoàn toàn phần đọc vị thế isolated của Ping-Pong trong vòng lặp `fetch_positions` (Mã patch: `z3317`).
- **[14/07/2026]** - Lỗi `bot_sub1` DCA vô số lệnh cùng 1 TF do API OKX delay (nhân bản Limit Order) và Volume rung lắc liên tục do tính theo `live_price`. Đã fix: Thêm thuật toán `🧹 [CLEANUP]` dọn dẹp các lệnh duplicates trực tiếp trong `actual_pending` và đổi công thức tính Khối lượng Limit (`sz_for_tf`) dựa trên giá Limit (`px_tf`) thay vì `live_price` để ổn định size (Mã patch: `z3316`).

- **[09/07/2026]** - Lỗi `bot_sub1` vào 18 lệnh DCA cùng 1 TF do tính năng "Copy Trade / Dẫn đầu" của OKX tách các lệnh DCA thành từng vị thế độc lập. Đã fix: Code lại hàm đọc vị thế trên OKX để cộng gộp (sum) tất cả các vị thế cùng chiều thay vì bị ghi đè bởi vị thế cuối cùng (Mã patch: `z2425`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp do thuật toán xác định TF quên nhân với `vol_mult` của từng Altcoin. Đã fix: Chèn `_coin_vol_mult` vào `expected_vol` trong hàm `determine_filled_tf` (Mã patch: `z2426`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp liên tục tại cùng 1 TF do tính sai khối lượng lệnh vừa khớp trong `determine_filled_tf` (tính theo tổng vị thế thay vì phần chênh lệch). Đã fix: Trừ đi khối lượng cũ (`new_pos_amt - old_pos_amt`) để so sánh chính xác với khối lượng cấu hình của TF (Mã patch: `z2423`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp liên tục tại cùng 1 TF (Race condition limit order). Đã fix: Ưu tiên TF nhỏ nhất trong `determine_filled_tf`, loại trừ các TF đã filled ở fallback, và thêm safety check `actual_pending` trước khi `place_pure_limit` (Mã patch: `z2418`).


## 🆕 TASK CẦN XỬ LÝ (CHO CLINE)

*(Danh sách trống — tất cả lỗi đã được xử lý)*
