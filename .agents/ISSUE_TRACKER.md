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

- **[10/09/2026]** - Rà Soát Toàn Diện, Dọn Sạch Tàn Dư Hedge & Phân Định Tách Biệt Tuyệt Đối Giữa DCA Dương và DCA Âm:
  - **Yêu cầu của CEO:** Rà soát và dọn sạch hoàn toàn tàn dư, phân định rõ ràng giữa DCA Dương (Pyramid) và DCA Âm để bot không bao giờ bị sai logic vào lệnh.
  - **Đã kiểm tra & Dọn sạch tàn dư Hedge:**
    1. `bot_strategy.py` (`load_state_from_disk`): Chỉ nạp `hedge_tf` từ file JSON khi `is_hedge_pos` là True; nếu vị thế là Trend, tự động reset `hedge_tf = None`, `hedge_pos_side = ""` để xóa sạch rác file cũ khi khởi động bot.
    2. `bot_strategy.py` (`calculate_entry_px`): Buộc biến `_is_xl_pos` phải thỏa mãn `is_hedge == True` mới được kích hoạt, tránh việc lệnh Trend bị gán nhầm offset của Hedge.
    3. `bot_strategy.py` (`save_data_to_disk`): Chỉ ghi `hedge_tf` vào file JSON khi đang có vị thế Hedge thực sự; với vị thế Trend, luôn ghi `None` và `""`.
    4. `bot_strategy.py` (`hedge bypass`): Chỉ bypass `allowed_long`/`allowed_short` khi đang thực sự có vị thế Hedge hoặc đang rình cơ hội Hedge (`xl_found`), tuyệt đối cấm bypass vị thế Trend.
    5. `bot_strategy.py` (Volume Multiplier Long/Short): Chỉ nhân `HEDGE_TF_VOLUME_MULTIPLIERS` khi đúng là lệnh Hedge của khung đó (`_is_this_tf_hedge`), ngược lại luôn dùng `TF_VOLUME_MULTIPLIERS` chuẩn Trend.
  - **Phân định rõ ràng DCA Dương và DCA Âm:**
    1. **Khởi tạo vị thế đầu tiên:**
       - **DCA Dương (`ENABLE_PYRAMID_DCA = True`):** Lệnh mở vị thế BẮT BUỘC chỉ được đặt tại khung lớn nhất (**H4**), chỉ khi H4 đủ điều kiện xu hướng (`aligned_tfs`). Terminal hiển thị chuẩn `chờ LONG/SHORT [TREND] tại H4`.
       - **DCA Âm (`ENABLE_PYRAMID_DCA = False`):** Lệnh mở vị thế bắt đầu từ khung nhỏ nhất (**M5**). Terminal hiển thị chuẩn `chờ LONG/SHORT [TREND] tại M5`.
    2. **Lưới đặt lệnh Limit:**
       - **DCA Dương:** Bậc thang tuần tự từ trên xuống (H4 -> H2 -> H1 -> M30 -> M15 -> M5). Chỉ mở duy nhất bậc tiếp theo khi bậc trước đã khớp VÀ bậc tiếp theo đủ điều kiện xu hướng. Nếu chưa đủ điều kiện thì đứng chờ, cấm tuyệt đối nhảy cóc.
       - **DCA Âm:** Rải lệnh ở toàn bộ các khung thời gian `aligned_tfs` chưa filled (càng lỗ càng cắn các khung lớn hơn để kéo entry lại).
    3. **Altcoin Fallback:**
       - **DCA Dương:** Chỉ cho phép Altcoin mở vị thế H4 nếu H4 của chính coin đó thuận chiều với hướng dự định (giá trên EMA200 H4 với Long, dưới với Short).
       - **DCA Âm:** Mở lệnh theo khung tín hiệu khả dụng tốt nhất.
    4. **Cơ chế TP/SL & Upgrade TF Logic:**
       - **DCA Dương:** Chốt lời co ngắn dần theo khung nhỏ nhất vừa cắn (`min(filled)`). KHÔNG chạy Upgrade TF logic (vì lệnh DCA Dương ở chiều lãi, không làm ảnh hưởng SL ở chiều lỗ).
       - **DCA Âm:** Dãn SL theo khung lớn nhất đã cắn (`max(filled)`). CHẠY Upgrade TF logic khi SL sát entry lệnh tiếp theo.
    5. **Tái tạo TF từ Volume (`reconstruct_filled_tfs_from_volume`):**
       - **DCA Dương:** Quét lũy kế từ H4 xuống M5.
       - **DCA Âm:** Quét lũy kế từ M5 lên H4.

- **[09/09/2026]** - Đổi Vị Trí 2 Tab Cấu Hình Trong Hộp Thoại Cài Đặt (Desktop & Web):
  - **Yêu cầu:** Đổi vị trí của tab "Cấu Hình Chiến Thuật" và "Cấu Hình API Key" cho nhau để tab API Key nằm trước, Chiến Thuật nằm sau.
  - **Đã cập nhật:**
    - `desktop_app/gui_main.py`: Thêm `self.tab_api` trước `self.tab_strategy` trong `open_settings_dialog()`.
    - `web_app/frontend/src/App.jsx`: Đổi thứ tự tab buttons `🔑 Cấu Hình API Key` lên trước `⚙️ Cấu Hình Chiến Thuật`.

- **[09/09/2026]** - Sửa Lỗi Quy Đổi Volume Lệch Khung & Không Đặt Lệnh Anchor H4 trong Mode DCA Dương:
  - **Hiện tượng:** Khi user bật bot với vị thế có sẵn trên sàn (ví dụ 397 U = M5 base của XAU), bot tự động gán nhầm thành `[H4]` dù H4 cần 2000 U. Sau đó do tưởng H4 đã khớp, bot không đặt lệnh Limit H4 (2000 U) tại cản EMA200 H4 dù giá đang ở sát mép và H4 đang Uptrend.
  - **Nguyên nhân:**
    1. Trong `reconstruct_filled_tfs_from_volume()`, vòng lặp DCA Dương duyệt từ H4 xuống. Thấy `pos_vol_usdt < 70% H4` nên break ngay và fallback mặc định lấy `tfs_order[0] = H4`, ép lệnh 397 U thành [H4].
    2. Trong logic targeting DCA Dương, khi `has_long = True`, bot chỉ tìm `next_tf` của các khung đã có trong `_filled_long`. Vì bot tưởng H4 đã khớp nên tìm H2 (đang Downtrend) và bỏ qua việc đặt lệnh H4.
  - **Đã fix:**
    1. Chuẩn hóa công thức ngưỡng lũy kế `cum_prev + cur_vol * 0.70`. Nếu volume không đủ khung lớn nhất (H4), bot tự động map chính xác về các khung nhỏ hơn (397 U map chuẩn về M5).
    2. Trong chế độ DCA Dương, nếu khung Anchor lớn nhất (`anchor_tf`, ví dụ H4) chưa nằm trong `_filled_long` (do volume trên sàn chưa đủ volume của Anchor TF), bot **bắt buộc phải đặt lệnh Limit cho Anchor TF** đón tại cản EMA200.

- **[04/09/2026]** - Tôn Trọng & Bảo Lưu Tuyệt Đối TP/SL Khi Tắt/Bật Bot (TP/SL Persistence):
  - **Cơ chế an toàn:**
    1. **Khi tắt bot (đột ngột, tắt máy, tắt terminal):** Lệnh TP/SL đã được gài trực tiếp trên hệ thống đám mây của sàn OKX nên vẫn tồn tại và hoạt động 100%, bảo vệ tài khoản ngay cả khi bot tắt hoàn toàn.
    2. **Khi bật lại bot (`cleanup_all_orders_on_startup`):** Đã loại bỏ hoàn toàn lệnh hủy algo TP/SL trong hàm khởi động. Bot chỉ dọn dẹp các lệnh Limit chờ cũ và **bảo lưu nguyên vẹn 100% TP/SL** của các vị thế đang mở.
    3. **Tôn trọng TP/SL chỉnh tay:** Không bao giờ hủy/đè lại TP/SL khi CEO kéo thả thay đổi mức giá. Chỉ can thiệp khi trên sàn thiếu TP/SL hoặc khi cắn thêm DCA tăng khối lượng.

- **[04/09/2026]** - Rà Soát Toàn Diện & Tối Ưu Hóa Logic Bậc Thang DCA Dương (Pyramid):
  - **Phát hiện & Xử lý:**
    1. **Tách biệt Anchor TF:** Trong chế độ DCA Dương, logic chọn `anchor_tf` chỉ được phép chạy khi **chưa có vị thế** (`not tracker.has_long`/`not tracker.has_short`). Khi vị thế đã mở, bot chỉ chạy logic bậc thang tiến dần xuống các khung nhỏ hơn và ngắt nhịp (`break`) để duy trì duy nhất 1 lệnh limit gài sẵn tiếp theo. Tránh tình trạng khung lớn đảo pha gây đặt lệnh ngược lại phía sau (tránh DCA âm).
    2. **Đồng bộ Hedge Bypass:** Thay thế toàn bộ các biến sót `tracker.xole_tf` thành `getattr(tracker, "hedge_tf", getattr(tracker, "xole_tf", None))` tại các chốt kiểm tra bypass vị thế và khối lượng limit.
    3. **Bộ lọc Tối thượng TF Trade:** Bất kỳ khung nào bị bỏ tích trên giao diện sẽ bị cắt đứt 100% tại mọi luồng đặt lệnh.

- **[04/09/2026]** - Thiết Lập Bộ Lọc Tối Thượng Cho TF Trade (`ENABLED_TFS`):
  - **Yêu cầu:** Đảm bảo khi CEO bỏ tích bất kỳ khung thời gian nào trong bảng TF Trade (ví dụ: bỏ tích M5), bot BẮT BUỘC không được phép giao dịch khung đó trong mọi tình huống (kể cả DCA, Altcoin Fallback hay Hedge).
  - **Cập nhật:**
    - Bổ sung bộ lọc tối thượng (`_tfs_allowed_now`) ngay tại cổng chốt chặn trước khi đặt lệnh limit trong `_run_strategy_cycle_impl()`: `target_long_tfs = [tf for tf in target_long_tfs if tf in _tfs_allowed_now]`. Bất kỳ TF nào bị bỏ tích sẽ bị loại bỏ 100%, và bot sẽ kích hoạt hủy lệnh treo trên sàn ngay lập tức.
    - Cập nhật hàm `_can_inject_tf()` kiểm tra nghiêm ngặt `ENABLED_TFS` trước khi cho phép inject lệnh Hedge.
    - Nâng cấp nạp cấu hình `current_coin_tfs` trong `run_strategy_cycle()` hỗ trợ tra cứu linh hoạt theo cả `swap_id`, `coin_name` và `instId`.

- **[04/09/2026]** - Hiển thị % Khoảng cách tới EMA200 H4 tại Cột Price trong Bảng Terminal (`bot_ui.py`):
  - **Yêu cầu:** Thêm % khoảng cách từ giá hiện tại đến EMA200 H4 vào cột `Price` trong bảng trạng thái đa khung (Ví dụ: `80,870.0 (10.6%)`).
  - **Cập nhật:** 
    - Cập nhật dòng hiển thị mỗi coin trong `table_lines`: `price_disp = f"{format_with_commas(tk.live_price, 1)} ({abs(dist_to_h4):.1f}%)"`.
    - Căn chỉnh độ rộng cột `Price` lên 18 ký tự và căn lề phải ngay ngắn.
    - Cập nhật viền bảng phân cách (`tbl_bar`) và viền đáy bảng (`bottom_bar`) tự động co giãn khớp 100% với chiều dài tiêu đề.

- **[04/09/2026]** - Chuẩn hóa Cấu hình Mặc định (DCA Dương ON, Hedge ON, Dynamic EMA200 OFF, Toàn bộ Safeguards OFF) & Đổi Tên Toàn Diện XOLE ➔ HEDGE:
  - **Yêu cầu:** 
    1. Khi cài đặt mới App chưa có cấu hình JSON hoặc mở Web App lần đầu: Chế độ DCA Dương = ON, Đánh sóng đảo chiều (Hedge) = ON, Chốt lời bám EMA200 = OFF, toàn bộ nhóm Bảo vệ & Cắt lệnh tự động = OFF.
    2. Đổi toàn bộ XOLE trong toàn bộ mã nguồn và tên gọi thành HEDGE (bao gồm thông báo Terminal: `[TREND]` vs `[HEDGE]`, lệnh limit `Đang limit LONG [TREND/HEDGE]`).
  - **Cập nhật:**
    1. Cập nhật `bot_config.py` và `sys_bot_sub1.py`: Set `ENABLE_PYRAMID_DCA=True`, `ENABLE_STRATEGY_HEDGE=True`, `ENABLE_DYNAMIC_EMA200_TP=False`, toàn bộ safeguards (`ENABLE_SIDEWAY_SAFE_EXIT`, `ENABLE_SQUEEZE_ESCAPE_EXIT`, `ENABLE_SAFEGUARD_ENTRY_EXIT`, `ENABLE_TRAILING_SL`, `ENABLE_MAX_ROI_EXIT`, `ENABLE_SIDEWAY_VAP_EXIT`, `ENABLE_H4_FLIP_CLOSE`) = `False`.
    2. Cập nhật `gui_main.py`: Thiết lập mặc định ban đầu và nút Khôi phục mặc định đồng bộ đúng trạng thái trên.
    3. Cập nhật `App.jsx` (Web App): Bổ sung công tắc `Chế độ: DCA Dương (Mới)`, set state khởi tạo và reset mặc định đồng bộ, cập nhật tooltip HEDGE.
    4. Thay thế nhãn hiển thị Terminal UI trong `bot_ui.py`: `_get_mode_tag()` trả về `[HEDGE]`, dòng chờ limit hiển thị `Đang limit LONG [HEDGE]` / `[TREND]`, cập nhật nhóm giải thích `HEDGE`.
    5. Cập nhật `bot_models.py`, `bot_orders.py`, `bot_strategy.py` sử dụng các trường và hàm `is_hedge_pos`, `hedge_tf`, `hedge_win_streak`, `get_hedge_opp`, bảo lưu aliases `xole_*` để tương thích ngược 100%.

- **[04/09/2026]** - Sửa lỗi Bật DCA Dương (Pyramid) nhưng Bot vẫn đặt lệnh limit M5 (Chạy nhầm DCA Âm):
  - **Nguyên nhân 1 (Thiếu Reload Config vào Bộ nhớ):** Người dùng bật công tắc "Chế độ: DCA Dương (Mới)" trên giao diện Desktop GUI (`chk_pyramid`), GUI lưu `"ENABLE_PYRAMID_DCA": true` vào file JSON cấu hình. Tuy nhiên, hàm tiến hóa cấu hình định kỳ `run_ai_self_evolution()` trong `bot_strategy.py` lại KHÔNG có dòng đọc key `"ENABLE_PYRAMID_DCA"` từ JSON. Do đó, biến runtime `globals_ref.ENABLE_PYRAMID_DCA` trong bot vẫn luôn giữ giá trị `False` (DCA Âm). Ở chế độ DCA Âm, bot rải lệnh limit ở toàn bộ các TF thỏa mãn (cả M5 và H4) dẫn đến việc XAU chưa có vị thế nhưng đã treo lệnh limit M5.
  - **Nguyên nhân 2 (Ghi đè cấu hình lúc khởi động):** Hàm `sync_initial_config_to_json()` ép ghi đè giá trị mặc định từ `bot_config.py` (False) vào JSON thay vì bảo lưu trạng thái người dùng đã chọn trên GUI.
  - **Nguyên nhân 3 (Neo cứng TF Khởi đầu):** Logic chọn `anchor_tf` cho DCA Dương bị gán cứng vào `reversed_tfs[0]` (H4). Nếu H4 không thỏa mãn xu hướng mà H2/H1 thỏa mãn, bot sẽ bị kẹt không đặt bất kỳ lệnh nào.
  - **Cập nhật:**
    1. Bổ sung `if "ENABLE_PYRAMID_DCA" in cfg: set_val("ENABLE_PYRAMID_DCA", bool(cfg["ENABLE_PYRAMID_DCA"]))` vào `run_ai_self_evolution()` để bot cập nhật ngay lập tức trạng thái DCA Dương khi GUI thay đổi.
    2. Cập nhật `sync_initial_config_to_json()` ưu tiên lấy giá trị từ file cấu hình JSON hiện hữu nếu có.
    3. Nâng cấp logic chọn `anchor_tf` thành `next((tf for tf in reversed_tfs if tf in aligned_long_tfs), None)` để tự động chọn khung thời gian lớn nhất đang có xu hướng hợp lệ làm điểm khởi đầu cho chuỗi Pyramid. Khi chưa có vị thế, bot CHỈ đặt duy nhất 1 lệnh tại TF lớn nhất này và triệt tiêu hoàn toàn các lệnh limit rải nhỏ như M5.

- **[26/08/2026]** - Hoàn thiện các yêu cầu UI/UX Web App & Hỗ trợ Tách lệnh OKX nguyên bản (Native Split Positions):
  - **Cập nhật 1 (Bảo mật):** Thêm bước xác thực bảo mật (Prompt UID) khi bấm nút `DỪNG CHẠY BOT` trong `App.jsx`, ngăn chặn rủi ro xung đột/vô tình bấm nhầm từ thiết bị khác khi dùng chung API Key.
  - **Cập nhật 2 (UI Gạch viền):** Thay thế chữ "Long"/"Short" thô cứng bằng các gạch dọc màu Xanh/Đỏ 4px ở đầu hàng bảng Vị thế, kết hợp làm mềm UI tổng thể.
  - **Cập nhật 3 (Màu Chart):** Đổi màu nền của Lightweight Charts sang tone tối (`#131722`) và ẩn bớt lưới (grid) để đồng bộ hoàn toàn với giao diện ban đêm (Dark Mode) nguyên bản của TradingView.
  - **Cập nhật 4 (OKX Native Split):** Viết lại hoàn toàn logic get/close positions ở `main.py` để sử dụng dữ liệu Tách vị thế (Split Position) nguyên gốc từ OKX API (dựa trên nhóm `instId` và `posSide`). Giao diện tự động phân cấp thành hàng **"Lệnh tổng"** (Aggregated) và các hàng **"Tách"** (Child rows) lùi đầu dòng hình chữ L, loại bỏ hoàn toàn cơ chế chia phần trăm ảo (virtual ticket percentage) trước đây. Lệnh đóng vị thế nay đẩy thẳng `posId` hoặc kích thước hợp đồng (size) thật lên sàn OKX đảm bảo khớp 100% không còn lệch volume.
- **[20/08/2026]** - Sửa lỗi Nút "Reset Vốn Gốc (Audit)" trên Web App không hoạt động và Lỗi 2000U hiển thị sai lệch:
  - **Nguyên nhân 1 (Nút bấm):** Frontend `App.jsx` có nút HTML nhưng chưa được gắn hàm xử lý sự kiện `onClick` và backend `main.py` chưa có endpoint hỗ trợ.
  - **Nguyên nhân 2 (Lỗi 2000U & Lỗi 51010):** Do người dùng đăng nhập Web App bằng UID mới tinh (chưa cấu hình API Futures/Multi-currency Margin) nên bị OKX trả lỗi 51010. Khi API gặp lỗi, Bot không đọc được equity thật từ sàn nên đã fallback hiển thị mốc 2000U mặc định cho thư mục tài khoản mới này (khác biệt với cấu hình UID Desktop).
  - **Cập nhật:** Đã gắn thêm API endpoint `/api/bot/reset_capital` ở Backend (`main.py`) để tự động tạo file cờ `reset_wallet_{strategy}.flag`. Cập nhật `App.jsx` gắn logic gọi API cho nút bấm. Hướng dẫn người dùng đăng nhập đúng UID đồng bộ với Desktop App để khắc phục dứt điểm lỗi API.

- **[10/08/2026]** - Hoàn thành xây dựng cấu trúc nền tảng và lõi chiến thuật cho Bot Sub3:
  - **Cập nhật:** Đã tạo thư mục `bots/sub3` chứa các file: `sys_bot_sub3.py` (vòng lặp chính, xử lý PID, kế thừa API Core), `sys_liquid_strategy.py` (state machine 4 giai đoạn theo CRT & Liquidation Sweep), và `utils_ob.py` (thuật toán tính ATR và phát hiện Order Block). Hệ thống đã được kiểm thử chạy luồng giả lập thành công, nhận diện được file PID và không gây crash. (Mã patch: `z3501`)

- **[10/08/2026]** - Sửa lỗi giao diện chìm chữ ở bảng Cài đặt Sub3:
  - **Nguyên nhân:** Danh sách dropdown của QComboBox (chứa khung thời gian, entry mode) có nền màu trắng mặc định của Windows làm chìm chữ màu trắng. Vi phạm quy tắc UI Design Rule #4.
  - **Cập nhật:** Đã setView thành QListView và cấu hình stylesheet CSS đồng bộ với Theme chung của ứng dụng: nền xám đậm (`#1e1e1e`), chữ trắng (`#ffffff`), hover màu xanh (`#0e639c`). Đã đẩy bản cập nhật tức thời (hotfix) vào mã nguồn.

- **[10/08/2026]** - Sửa lỗi crash khi khởi động do UI chưa khởi tạo:
  - **Nguyên nhân:** Khi khởi động (hàm `reload_accounts`), biến `sp_fixed_sl` chưa được tạo (do `setup_tab_strategy` chưa chạy) nhưng hàm `load_current_settings` cố tình gọi `setValue()`.
  - **Cập nhật:** Bọc toàn bộ các lời gọi gán dữ liệu vào UI của Sub3 trong hàm `load_current_settings` bằng lệnh `hasattr(self, '...')` để bảo vệ chống crash. Lỗi đã được khắc phục hoàn toàn.

- **[10/08/2026]** - Sửa lỗi cắt chữ (truncate) ở ComboBox "Chọn tài khoản":
  - **Nguyên nhân:** Bề ngang tối đa mặc định của QComboBox bị giới hạn bởi Layout nên không tự dàn trang (scale) vừa với các đoạn text dài như "Tài khoản phụ...".
  - **Cập nhật:** Đã thêm chính sách kích thước `setSizeAdjustPolicy(QtWidgets.QComboBox.SizeAdjustPolicy.AdjustToContents)` cho `account_dropdown` của cả 3 Bot. Hệ thống sẽ tự động đo lường độ dài của item dài nhất để kéo dãn menu xổ xuống không bị mất chữ.
- **[07/08/2026]** - Sửa lỗi GitHub Actions Runner timeout (Job not acquired):
  - **Nguyên nhân:** Lỗi "The job was not acquired by Runner of type hosted" xảy ra do máy chủ cấp phát (Runner pool) của GitHub bị quá tải không thể khởi tạo máy ảo, hoặc lỗi giới hạn hàng đợi. Hoàn toàn không phải do lỗi code logic ở `gui_main.py`.
  - **Cập nhật:** Đã chỉnh sửa cấu hình file `.github/workflows/build-release.yml`, đổi hệ điều hành từ `windows-latest` sang bản fix cứng `windows-2022` và `macos-latest` sang `macos-13`. Việc ép version cụ thể giúp bypass lỗi kẹt hàng đợi của pool "latest" và mồi lại GitHub Actions chạy thành công. (Mã patch: `z249`)

- **[07/08/2026]** - Sửa lỗi kết nối biểu đồ nến (LiveChartWorker) theo tên miền khu vực:
  - **Nguyên nhân:** Biểu đồ nến trong giao diện sử dụng `LiveChartWorker` kết nối cứng qua URL `https://www.okx.com/...`. Đối với người dùng ở các khu vực châu Âu/châu Mỹ bị chặn truy cập domain này, biểu đồ sẽ bị đen/trống hoặc không tải được dữ liệu, dù API Key đã được tự động định tuyến thành công qua tên miền phụ (`eea.okx.com` / `us.okx.com`).
  - **Cập nhật:** Cập nhật `LiveChartWorker` tại [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) để tự động lấy tên miền hoạt động (`okx_domain`) từ tiến trình `pos_worker` của Widget cha. Giờ đây, các yêu cầu tải nến biểu đồ cũng sẽ đi qua đúng tên miền khu vực tương tự như các yêu cầu giao dịch khác. (Mã patch: `z247`)

- **[07/08/2026]** - Hỗ trợ API Key OKX tại châu Âu (Khu vực EEA):
  - **Nguyên nhân:** OKX giới hạn các tài khoản đăng ký tại khu vực Châu Âu (EEA) bắt buộc phải sử dụng domain riêng là `eea.okx.com` (và Mỹ/Úc dùng `us.okx.com`). Do đó, nếu ứng dụng hardcode kết nối tới `www.okx.com`, OKX sẽ trả về lỗi `API key doesn't exist` (lỗi 50119 hoặc không hợp lệ) dù API Key và Passphrase hoàn toàn đúng.
  - **Cập nhật:**
    1. Trong [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), cơ chế lưu API Key được nâng cấp để thử xác thực lần lượt qua 3 domain: `www.okx.com`, `eea.okx.com`, và `us.okx.com`. Khi domain nào trả về thành công, ứng dụng sẽ lưu domain đó vào cấu hình dưới biến `OKX_DOMAIN`. Đồng thời, sửa lại định dạng Timestamp sử dụng `.strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'` thay vì `.isoformat()` (vốn sinh ra đuôi múi giờ `+00:00Z` không hợp lệ khiến OKX báo lỗi `Invalid OK-ACCESS-TIMESTAMP`).
    2. Các tiểu trình giao dịch trong `gui_main.py` (`OKXPositionsWorker`, hàm đóng vị thế nhanh) và bộ lõi API của hai bot tại [z_bot_sub1/bot_api.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub1/bot_api.py) & [z_bot_sub2/bot_api.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub2/bot_api.py) được cập nhật để tự động đọc biến `OKX_DOMAIN` này từ file `.env` và sử dụng làm Endpoint kết nối, đảm bảo bot chạy mượt mà ở châu Âu và toàn cầu. (Mã patch: `z292`)

- **[07/08/2026]** - Loại bỏ hoàn toàn Chế độ Demo (Simulated Trading) trên GUI và mã nguồn:
  - **Nguyên nhân:** Khách hàng không có nhu cầu chạy Demo và hay bị nhầm lẫn giữa API Key Live và API Key Demo (gây ra lỗi 50101 từ sàn OKX khi chọn nhầm chế độ). Yêu cầu chỉ hỗ trợ giao dịch tài khoản thực (Live trading).
  - **Cập nhật:** Trong file [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), ẩn công tắc ToggleSwitch `chk_demo_mode` khỏi giao diện Cài đặt API, mặc định giá trị checkbox về `False`. Đồng thời, ép cứng giá trị biến `is_demo`/`demo_mode` về `False` khi đọc/lưu file cấu hình `.env` cũng như lúc gọi API xác thực khóa bảo mật UID, đảm bảo toàn bộ hệ thống hoạt động duy nhất trên môi trường tài khoản Thực. (Mã patch: `z291`)

- **[06/08/2026]** - Sửa lỗi đăng nhập báo "chưa đăng ký ref TLS1" (UID Minh Nguyễn), Sửa lỗi GPU/JS, và Tăng tốc Ép Cập Nhật tự động:
  - **Nguyên nhân 1 (Đăng nhập):** Khi tải danh sách UID từ Google Sheet dưới dạng CSV, thư viện `requests.get` nhận diện sai encoding là `ISO-8859-1`. Chữ "ễ" trong "Minh Nguyễn" (UTF-8 byte `\xe1\xbb\x85`) bị giải mã thành ký tự Unicode Next Line (`\u0085`). Khi gọi `splitlines()`, python cắt dòng này làm đôi làm mất cột dữ liệu và loại bỏ UID, dẫn đến báo lỗi chưa đăng ký.
  - **Nguyên nhân 2 (Lỗi JS callback):** Thư viện `lightweight_charts` gọi hàm JS gán `window.callbackFunction = window.pythonObject.callback` sau 200ms qua `on_js_load`, nhưng do `QWebChannel` khởi tạo bất đồng bộ bị trễ dẫn đến `window.pythonObject` là `undefined`, ném lỗi `TypeError` trong console.
  - **Nguyên nhân 3 (Lỗi GPU virtual context):** Cờ Chromium cũ và `--use-gl=swiftshader` xung đột với `--disable-gpu`, gây ra lỗi cấu hình không được hỗ trợ trong console.
  - **Cập nhật:** 
    1. Thêm `response.encoding = 'utf-8'` trước khi parse CSV trong `check_login` tại [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py).
    2. Định nghĩa một JS Object Descriptor tạm thời làm proxy cho `window.pythonObject` tại sự kiện `loadFinished` của webview để hứng callback an toàn trước khi `QWebChannel` load xong.
    3. Đơn giản hóa cờ Chromium thành `--disable-gpu --disable-gpu-compositing` (loại bỏ `--disable-software-rasterizer` và `--use-gl=swiftshader`), giúp Chromium tự động dùng software rendering gốc mượt mà và không báo lỗi.
    4. Rút ngắn thời gian quét cập nhật lúc khởi động từ `2000ms` xuống `100ms` để kiểm tra tức thì. Đồng thời, chỉnh sửa `QProgressDialog` hiển thị với parent là `activeModalWidget()` để đè lên trên màn hình đăng nhập `LoginDialog`, ép cập nhật tự động nhanh chóng và bắt buộc trước khi người dùng kịp đăng nhập. (Mã patch: `z288`)

- **[05/08/2026]** - Sửa lỗi Terminal Logs của Bot SMC (Sub2) không hiển thị Dashboard:
  - **Nguyên nhân:** File `sys_bot_sub2.py` có gọi hàm `bot_ui.update_wallet_metrics()` trước khi in Dashboard, nhưng hàm này đã bị gỡ bỏ khỏi `bot_ui.py` (do bot tự đọc từ file JSON). Việc gọi hàm không tồn tại đã gây ra ngoại lệ `AttributeError`. Tệ hơn nữa, vòng lặp chính lại sử dụng `except Exception:` nuốt trọn mọi lỗi mà không in ra console, khiến Dashboard liên tục bị gián đoạn ngầm mà không có cảnh báo.
  - **Cập nhật:** Đã xóa bỏ lời gọi hàm thừa `bot_ui.update_wallet_metrics()` trong [sys_bot_sub2.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/sys_bot_sub2.py), đồng thời bổ sung `import traceback` để in rõ lỗi nếu vòng lặp chính của bot gặp sự cố trong tương lai. Sau khi lộ diện lỗi `NameError: target_vol`, tôi cũng đã bổ sung logic lấy `target_vol` trực tiếp từ file cấu hình JSON hoặc dùng giá trị mặc định trong [bot_ui.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub2/bot_ui.py). Giao diện Terminal của Bot SMC nay đã xuất hiện lại đầy đủ và đẹp mắt. (Mã patch: `z286`)


  - **Nguyên nhân:** Khi bảng chuyển trạng thái từ Trống (không lệnh) sang Có lệnh, các ô chứa Widget (như PNL, Nút đóng) được đè lên trên lớp Text. Do background của Widget là trong suốt nên vạch ngang rỗng `—` của trạng thái cũ vẫn bị lộ bóng mờ từ bên dưới chiếu lên chữ.
  - **Cập nhật:** Theo yêu cầu tinh gọn giao diện, tôi đã gỡ bỏ hoàn toàn ký tự dấu gạch ngang `—` trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Giờ đây, khi không có lệnh, các ô dữ liệu sẽ trống hoàn toàn (chuỗi rỗng `""`). Điều này giúp giao diện bảng Vị thế trông sạch sẽ tuyệt đối và triệt tiêu vĩnh viễn hiện tượng bóng mờ. (Mã patch: `z285`)

- **[05/08/2026]** - Thêm hiệu ứng âm thanh (Sound Effect) khi Đóng lệnh thành công:
  - **Cập nhật:** Đã loại bỏ hoàn toàn cơ chế `winsound` hệ thống gây ra lỗi không có tiếng trên một số máy. Thay vào đó, tôi đã tích hợp trực tiếp file âm thanh **Cha-Ching! Money** (`Cha-Ching-the-sound.mp3`) do CEO tự tay cung cấp, kết hợp sử dụng thư viện `QMediaPlayer` của PyQt6 để phát ra tiếng ngay tại thời điểm gọi API đóng lệnh trả về thành công trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Trải nghiệm nghe giờ đây cực kỳ đã tai (tiếng thu tiền), báo hiệu cho người dùng biết lệnh đã được chốt một cách chắc chắn và phấn khích. (Mã patch: `z284`)

- **[05/08/2026]** - Sửa lỗi giao diện Bảng vị thế bị "dính" số liệu sau khi Đóng lệnh:
  - **Nguyên nhân:** Khi Đóng lệnh xong, vị thế chuyển sang trạng thái trống (inactive). Code cũ chỉ gán lại chữ trống (`—`) cho các ô dữ liệu nhưng quên chưa xóa các `CellWidget` (chứa Label màu và Nút Đóng) được đè lên từ trước đó.
  - **Cập nhật:** Đã bổ sung hàm `self.pos_table.removeCellWidget(row, c)` vào vòng lặp làm mới bảng trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Ngay khi phát hiện không còn vị thế, toàn bộ các Widget cũ của cột PNL, TP/SL và Nút Đóng sẽ bị "cạo sạch" và trả về đúng ký tự `—` nguyên thủy như chưa từng có lệnh nào được mở. (Mã patch: `z283`)

- **[05/08/2026]** - Sửa lỗi không thể Đóng Lệnh khi đang có lệnh Chốt lời/Dừng lỗ chờ xử lý (autoCxl):
  - **Nguyên nhân:** OKX API trả về lỗi *"Cancel all pending close-orders before liquidation"* (Lỗi 51023) do sàn OKX chặn việc gọi API Đóng toàn bộ Vị thế (`close-position`) nếu Vị thế đó đang tồn tại các lệnh chờ như Chốt Lời / Dừng Lỗ (TP/SL).
  - **Cập nhật:** Đã cập nhật lại thuộc tính `autoCxl` từ `False` thành `True` trong Payload truyền đi qua API ở hàm `close_position()` trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Việc này sẽ ra lệnh cho OKX tự động hủy tất cả các lệnh TP/SL đang treo cản đường, và lập tức đóng Vị thế bằng Market ngay sau đó. Đảm bảo Đóng lệnh thành công trong mọi điều kiện. (Mã patch: `z282`)

- **[05/08/2026]** - Tăng khoảng cách hiển thị ở Cột PNL Thả nổi:
  - **Cập nhật:** Đã xử lý lại chuỗi HTML hiển thị tại Cột 3 (PNL Thả nổi) trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đổi 3 dấu cách thường thành ký tự `&nbsp;&nbsp;&nbsp;` để ép Qt nhận dạng chính xác 3 khoảng trắng giữa phần giá trị "USDT" và phần "Phần trăm (%)", giúp giao diện trông rộng rãi và dễ nhìn hơn. (Mã patch: `z281`)

- **[05/08/2026]** - Sửa lỗi HTTP 403 Forbidden và loại bỏ hộp thoại xác nhận khi Đóng Lệnh (Quick Close):
  - **Nguyên nhân:** OKX/Cloudflare chặn thư viện `urllib.request` mặc định của Python do thiếu header User-Agent chuẩn (gây lỗi 403). Đồng thời, thao tác phải ấn "Yes" để đóng lệnh làm chậm trễ quá trình xử lý lệnh gấp.
  - **Cập nhật:** Chuyển đổi hàm `close_position()` trong [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) sang sử dụng thư viện `requests` kèm `User-Agent: Mozilla/5.0` để vượt qua bộ lọc WAF. Đặc biệt, đã xóa bỏ hoàn toàn bảng cảnh báo `Bạn chắc chắn muốn ĐÓNG vị thế...` và thông báo thành công. Giờ đây, chỉ cần 1 click vào nút Đóng, lệnh Market sẽ lập tức đẩy thẳng lên sàn OKX để ép đóng vị thế không độ trễ (1-Click Close). (Mã patch: `z278`)

- **[05/08/2026]** - Thu nhỏ font chữ phần trạng thái Long/Short ở Cột Cặp giao dịch:
  - **Cập nhật:** Đã chỉnh sửa định dạng hiển thị ở Cột 0 (Cặp giao dịch) trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Cụ thể, khi có lệnh đang chạy (vd: `BTC-USDT (Long 100x)`), phần hậu tố `(Long 100x)` sẽ được bọc vào thẻ `<span>` với `font-size: 12px;`, nhỏ hơn 2px so với phần chữ chính `BTC-USDT` (14px). Giúp chữ gọn gàng và phân cấp thông tin tốt hơn. (Mã patch: `z277`)

- **[05/08/2026]** - Sửa lỗi đen xì màn hình Chart (QWebEngineView) trên bản APP máy khách:
  - **Nguyên nhân:** Khi đóng gói bằng PyInstaller, thành phần WebEngine của PyQt6 thiếu tương thích với GPU/Driver đồ họa trên một số cấu hình máy khách, dẫn đến không thể render biểu đồ và xuất hiện màn hình đen.
  - **Cập nhật:** Đã chèn thêm các cờ `sys.argv.append("--disable-gpu")`, `--disable-software-rasterizer` và thiết lập biến môi trường `QTWEBENGINE_CHROMIUM_FLAGS` trong `gui_main.py` ngay trước khi khởi tạo `QApplication`. Điều này ép WebEngine sử dụng Software Rendering thay cho GPU, khắc phục triệt để lỗi đen màn hình trên tất cả các máy tính. (Mã patch: `z276`)

- **[05/08/2026]** - Dọn dẹp File rác & Tự động Build Release v1.0.277 lên GitHub:
  - **Cập nhật:** Đã xóa bỏ các file test/rác phát sinh (`diff_gui_main.txt`, `fix_bugs.py`, `test.py`). Chạy thành công `zBuild_To_GitHub.py`, nâng version đồng bộ lên **`v1.0.277`**, commit, gắn tag `v1.0.277` và đẩy toàn bộ source code lên GitHub. GitHub Actions đã được kích hoạt tự động build bản cập nhật mới nhất cho khách hàng. (Mã patch: `z275`)

- **[05/08/2026]** - Áp dụng đồng bộ 100% toàn bộ cải tiến UI cho cả Bot SMC (Sub 2):
  - **Cập nhật:** Do `panel_main` (Bot EMA200) và `panel_sub2` (Bot SMC) dùng chung class `BotInstanceWidget` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), toàn bộ các cải tiến UI (Bảng vị thế, Căn lề phải 3 space, Cột Ký quỹ 85px, PNL 16px, Cột TP/SL PNL USDT Xanh/Đỏ nhạt, Nút Đóng đỏ 15%, Splitter ratio 75/25, Tab Cam #FF9900) đã tự động đồng bộ hoàn toàn sang **Bot SMC**. Đồng thời cập nhật nhãn `Bot Sub 2 (SMC)` thống nhất toàn app. (Mã patch: `z274`)

- **[05/08/2026]** - Chuyển đổi Cột Chốt lời | Dừng lỗ hiển thị Giá trị PNL Lời/Lỗ dự kiến bằng USDT:
  - **Cập nhật:** Thay thế hiển thị mức giá cũ (`4031.93 | 4129.87`) bằng giá trị Lời/Lỗ PNL thực tế dự kiến tính bằng USDT (`+12.50 | -12.50`) dựa trên TP/SL thực tế của lệnh đó trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Định dạng màu Chốt lời xanh lá nhạt (`#81c784`) và Dừng lỗ đỏ nhạt (`#ef5350`) mềm mại, dễ nhìn chuẩn theo yêu cầu CEO. (Mã patch: `z273`)

- **[05/08/2026]** - Ép chiều cao nút Đóng mở rộng phủ dọc sát mép trên/dưới ô:
  - **Cập nhật:** Thiết lập `btn_close.setSizePolicy(Expanding, Expanding)` và `setContentsMargins(6, 1, 6, 1)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Ép chiều cao nút đỏ Đóng giãn rộng tối đa theo chiều dọc kề sát biên trên và đường gạch dưới ô (chỉ để khe mỏng 1px), đồng thời giữ nguyên độ thu gọn chiều ngang 6px hai bên. (Mã patch: `z272`)

- **[05/08/2026]** - Nhả lại chiều dọc nút Đóng màu đỏ (chỉ còn ~7% lề trên/dưới):
  - **Cập nhật:** Giảm lề đệm trên/dưới `setContentsMargins(6, 2, 6, 2)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Giữ nguyên độ thu hẹp chiều ngang 6px đẹp mắt, tăng độ cao chiều dọc của nút đỏ Đóng để lề trên/dưới chỉ còn mỏng ~7% chuẩn theo ý kiến CEO. (Mã patch: `z271`)

- **[05/08/2026]** - Đổi tên Nút Cộng Đồng trên Header thành "Join Cộng đồng":
  - **Cập nhật:** Cập nhật text nút từ `💬 Cộng Đồng` thành **`💬 Join Cộng đồng`** trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) theo yêu cầu CEO. (Mã patch: `z270`)

- **[05/08/2026]** - Thu nhỏ nút Đóng màu đỏ trong Bảng vị thế (-15% kích thước ô):
  - **Cập nhật:** Bọc `btn_close` trong container widget `btn_container` và thiết lập `setContentsMargins(6, 4, 6, 4)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Giảm kích thước nút đỏ khoảng -15% so với kích thước ô, tạo khoảng hở lề gọn gàng và bo góc thẩm mỹ. (Mã patch: `z269`)

- **[05/08/2026]** - Đổi tên Tab Bot SMC và Khôi phục màu sắc chữ / viền trên màu Cam (#FF9900):
  - **Cập nhật:** Trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py):
    1. Đổi tên tab `Bot SMC - OB` ngắn gọn thành **`Bot SMC`**.
    2. Khôi phục màu chữ active (`color: #FF9900`) và viền trên active (`border-top: 3px solid #FF9900`) của các Tab Bot chính (`QTabWidget#OuterTabs`) về màu cam sáng chuẩn bản cũ theo đúng yêu cầu CEO. (Mã patch: `z268`)

- **[05/08/2026]** - Cơ chế Ép Cập Nhật Tự Động (Auto-Update) khi mở lại App & Thông báo khi đang chạy:
  - **Cập nhật:** Tách biệt 2 kịch bản cập nhật trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py):
    1. **Khi app đang chạy (`is_startup=False`):** Giữ nguyên nút thông báo nhấp nháy `🚀 Cập nhật ngay (vX.X.X)` ở góc trên giao diện, không can thiệp ngắt ngang các vị thế/bot đang giao dịch.
    2. **Khi tắt app đi mở lại (`is_startup=True`):** Sau 2 giây mở app, nếu phát hiện có bản cập nhật mới sẽ **ÉP AUTO-UPDATE TỰ ĐỘNG BẮT BUỘC** (`bypass_confirm=True`), tự động tải bản cài mới, thay thế file `.exe` và khởi động lại app mới mà không bắt khách thao tác bất cứ nút nào. (Mã patch: `z267`)

- **[05/08/2026]** - Điều chỉnh độ mờ Opacity khối Order Block (OB) lên 20%:
  - **Cập nhật:** Đặt tham số mờ màu nền khối OB Bullish (`rgba(21, 101, 192, 0.2)`) và Bearish (`rgba(198, 40, 40, 0.2)`) về mức **`20%`** chuẩn hài hòa theo yêu cầu CEO trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z266`)

- **[05/08/2026]** - Đẩy sạ thanh phân chia Splitter & Triệt tiêu khoảng trống thừa trên Terminal Logs:
  - **Cập nhật:** Thiết lập `setSizes([850, 150])` cùng `setStretchFactor(0, 1)` và `setStretchFactor(1, 0)`, đồng thời siết lề trên `console_layout.setContentsMargins(5, 2, 5, 5)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đẩy vị trí mặc định của thanh phân chia `......` xuống kề sát dòng `Terminal Logs:`, triệt tiêu hoàn toàn khoảng trống tối màu dư thừa phía trên. (Mã patch: `z265`)

- **[05/08/2026]** - Đẩy thanh phân chia (Splitter Handle) giữa Chart và Logs xuống phía dưới:
  - **Cập nhật:** Điều chỉnh tỷ lệ Splitter dọc `setSizes([680, 220])` và `setStretchFactor(0, 7) / (1, 3)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đẩy thanh kéo splitter xuống phía dưới, ưu tiên 75% chiều cao cho vùng Chart & Bảng vị thế, loại bỏ khoảng không khoảng thừa phía trên `Terminal Logs:`. (Mã patch: `z264`)

- **[05/08/2026]** - Tự động bỏ bôi màu (Clear Highlight) khi nhấp chuột ra ngoài Bảng Vị Thế:
  - **Cập nhật:** Xây dựng class `FocusClearTableWidget` ghi đè sự kiện `focusOutEvent` để tự động gọi `clearSelection()` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Khi nhấp vào ô bất kỳ sẽ bôi màu highlight xanh cyan/teal mờ nổi bật, và khi nhấp chuột ra khu vực khác (như Chart, Logs, Nút bấm) sẽ tự động bỏ bôi màu và trả về trạng thái bình thường. (Mã patch: `z263`)

- **[05/08/2026]** - Điều chỉnh kích thước Font chữ Terminal Logs về mức 17px:
  - **Cập nhật:** Đặt kích thước font chữ Terminal Logs về **`17px`** (Consolas, monospace) theo yêu cầu CEO trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp cân bằng vừa mắt nhất giữa độ to và mật độ dòng log. (Mã patch: `z262`)

- **[05/08/2026]** - Khôi phục kích thước Font chữ Terminal Logs chuẩn 18px v1.0.271:
  - **Cập nhật:** Đã kiểm tra lịch sử commit `a097cd2` (v1.0.271): Font size gốc của Terminal Logs chính xác là **`18px`** (Consolas, monospace). Đã khôi phục từ `13px` lên lại **`18px`** chuẩn trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp các dòng log hiển thị to, rõ ràng và cực kỳ dễ đọc. (Mã patch: `z261`)

- **[05/08/2026]** - Tinh chỉnh độ rộng cột Ký quỹ (Col 2) vừa vặn chuẩn 85px:
  - **Cập nhật:** Căn chỉnh lại độ rộng cột *Ký quỹ* xuống mức **`85px`** vừa vặn hoàn hảo cho các lệnh có mức ký quỹ tối đa tới `999.00 $` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), vừa đảm bảo vừa khít tinh tế vừa không chiếm dụng diện tích thừa của bảng. (Mã patch: `z260`)

- **[05/08/2026]** - Mở rộng độ rộng tối thiểu cột Ký quỹ (Col 2):
  - **Cập nhật:** Đặt chiều rộng cố định linh hoạt cho cột *Ký quỹ* tối thiểu `110px` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đảm bảo khi đánh các lệnh ký quỹ lớn (như `100.00 $`, `1,500.00 $`, `10,000.00 $`) giao diện vẫn rộng rãi, không bao giờ bị co hẹp hay khuất ký tự `$`. (Mã patch: `z259`)

- **[05/08/2026]** - Đồng bộ kích thước font chữ bảng vị thế chuẩn 14px:
  - **Cập nhật:** Chuẩn hóa toàn bộ text hiển thị trong Bảng Vị Thế (tiêu đề, tên cặp coin, giá, ký quỹ, chữ `USDT`, phần `%` PNL, giá TP/SL) lên **14px**. Duy nhất con số tiền PNL thực tế (`-0.10` / `+1.41`) được tăng +2 size lên **16px** nổi bật trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z258`)

- **[05/08/2026]** - Thêm khoảng thở (Right Padding Spaces) cho cột Giá vào lệnh và Ký quỹ:
  - **Cập nhật:** Chèn 3 khoảng trống (`   `) phía cuối chuỗi ký tự hiển thị ở cột *Giá vào lệnh* và *Ký quỹ* giúp đẩy phần số và ký hiệu `$` lùi sang trái, tránh bị dính sát vào mép đường viền dọc bên phải trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z257`)

- **[05/08/2026]** - Căn lề số thẳng hàng & Tăng font size con số PNL thả nổi:
  - **Cập nhật:** Căn lề phải (`AlignRight`) cho cột *Giá vào lệnh* và *Ký quỹ* giúp thẳng hàng toàn bộ các dấu chấm thập phân `.` và ký hiệu `$`. Tăng +2 size (`16px`) riêng cho con số tiền PNL thực tế (`-0.10` / `+1.41`), giữ phần `USDT` và `%` ở size `13px` thường trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z256`)

- **[05/08/2026]** - Ẩn vạch kẻ đứt giá và nhãn giá EMA200 trên Chart:
  - **Cập nhật:** Đặt `price_line=False` và `price_label=False` khi khởi tạo `self.ema_line` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp ẩn đường kẻ đứt phụ và tag giá EMA200 khỏi trục giá bên phải. (Mã patch: `z255`)

- **[05/08/2026]** - Đồng bộ StyleSheet Checkbox nguyên bản theo Ảnh 1 & Cấu hình chiến thuật:
  - **Cập nhật:** Khôi phục chuẩn `cb_style` gốc (`border: 1px solid #777777; border-radius: 2px; background-color: transparent; image: url(check_green.svg)`) y hệt ô tích trong Popup Cấu hình chiến thuật và Dashboard cho Bảng Vị Thế trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z254`)

- **[05/08/2026]** - Tự động tích chọn Checkbox đầu mỗi cặp coin:
  - **Cập nhật:** Tự động bật tích chọn `[✓]` ở đầu mỗi dòng cặp coin trong Bảng Vị Thế khi phát hiện coin đó được bật trong Cấu hình (Settings) **HOẶC** đang có vị thế giao dịch active (`is_active = True`) trên sàn OKX. (Mã patch: `z253`)

- **[05/08/2026]** - Chuẩn hóa định dạng PNL thả nổi theo bản cũ:
  - **Cập nhật:** Giữ nguyên ký hiệu `USDT` (VD: `+25.69 USDT`), phân tách với phần tỷ lệ `%` bằng 3 khoảng trống `   ` (VD: `+25.69 USDT   (+58.73%)`), font size `14px` thường (`font-weight: normal`), căn giữa ô trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z252`)

- **[05/08/2026]** - Sửa lỗi runtime `UnboundLocalError: cannot access local variable 'os'`:
  - **Nguyên nhân:** Khai báo trùng lặp `import os, json` nội bộ trong block fallback khiến Python coi `os` là biến local phạm vi hàm `update_positions_table`, gây crash văng ngoại lệ khi truy cập `os.path` trước đó.
  - **Đã fix:** Loại bỏ re-import `os, json` dư thừa, sử dụng trực tiếp module `os` và `json` đã import ở top-level file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Bảng vị thế hiển thị lại dữ liệu ổn định bình thường. (Mã patch: `z251`)

- **[03/08/2026]** - Tối ưu toàn bộ Giao diện GUI & Terminal Log theo tiêu chuẩn Monorepo:
  1. **Font Size & Style Bảng Vị Thế:** Font nền `14px` (chữ thường `normal`), PNL amount `16px` nổi bật; Căn lề số/USDT bên phải, Ký quỹ tính bằng `$`.
  2. **Trạng thái Nút bấm & Dropdown:** Nút Bắt đầu/Dừng đổi màu Xanh/Đỏ/Xám chuẩn; Dropdown chế độ xem mặc định đồng bộ `Chế độ ngang`.
  3. **Tối ưu Độ phân giải & Khung hình 1080px (Tablet Fujitsu Q378):** Thu gọn margins viền ngoài từ 35px xuống 15px sát mép viền; Dóng hàng lề trên cùng 2 thẻ `Logs` và `TradingView Toolbar`; Cho phép Chart co giãn `Expanding` 100% lấp đầy diện tích thừa.
  4. **Hiệu ứng Thị giác Đa tầng (Tab Visual Hierarchy & Fade Animation):** Tab chính (`Bot EMA200`, `Bot SMC - OB`) sáng chữ Vàng Kim (`#ffaa00`), viền cam 3px, triệt tiêu đường viền đáy nối liền khối với khung nội dung bên dưới; Bổ sung hiệu ứng chuyển động mượt mà `Fade-in Opacity Animation (220ms)` khi chuyển qua lại giữa các Tab Bot!
  5. **Tối ưu UX Tái cấu trúc Màn hình (Clean Action Bar & Popup Settings Dialogs):** Loại bỏ hoàn toàn dải thanh tab con rác (`Bảng Điều Khiển`, `API Key`, `Chiến Thuật`, `Cộng Đồng`) để mở rộng 100% diện tích màn hình chính cho Chart và Terminal Log; Chuyển toàn bộ mục Cấu hình API/Chiến thuật vào Nút bấm **`⚙️ Cài Đặt`** (mở Popup Modal Dialog) và nút **`💬 Cộng Đồng`** bên góc phải thanh công cụ. (Mã patch: `z3500`)

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



## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[09/08/2026]** - Tạo script launcher zRun_Web.bat hỗ trợ chạy giao diện Web:
  - **Cập nhật:** Tạo file `zRun_Web.bat` ở gốc dự án, tự động kiểm tra/cài đặt `node_modules` cho frontend Next.js, và chạy song song FastAPI backend (port 8000) cùng Next.js frontend (port 3000) để phục vụ việc xem và kiểm thử giao diện Web.

- **[09/08/2026]** - Bổ sung khung thời gian "2H" vào menu chọn nến chart (combo_tf):
  - **Nguyên nhân:** Thiếu khung thời gian `2H` trong menu dropdown chọn hiển thị biểu đồ nến chính của Dashboard, làm giảm trải nghiệm phân tích kỹ thuật của người dùng.
  - **Cập nhật:** Bổ sung `"2H"` vào list items của `self.combo_tf` và tăng chiều rộng cố định lên `50px` để hiển thị vừa vặn, hỗ trợ xem nến 2h trực tiếp đồng bộ với backend.

- **[09/08/2026]** - Sửa đổi tiêu đề Header chính của App:
  - **Cập nhật:** Sửa đổi tiêu đề chính của giao diện, loại bỏ phần chữ rườm rà `"Phát hành bởi cộng đồng: "` và chỉ giữ lại tên thương hiệu gọn gàng, sắc nét: `"TRADER LÀ SỐ 1 - VIỆT NAM"`.

- **[09/08/2026]** - Bổ sung khung thời gian "30m" vào menu chọn nến chart (combo_tf):
  - **Nguyên nhân:** Thiếu khung thời gian `30m` trong menu dropdown chọn hiển thị biểu đồ nến chính của Dashboard, ảnh hưởng đến việc phân tích của người dùng.
  - **Cập nhật:** Bổ sung `"30m"` vào list items của `self.combo_tf` và tăng chiều rộng cố định lên `48px` để hiển thị vừa vặn, hỗ trợ xem nến m30 trực tiếp đồng bộ với backend.

- **[09/08/2026]** - Thay đổi text và icon nút Dừng hoạt động thành "■ DỪNG CHẠY BOT":
  - **Cập nhật:** Sửa text hiển thị của nút dừng từ `🛑 DỪNG HOẠT ĐỘNG` thành `■ DỪNG CHẠY BOT`, sử dụng ký tự dừng ô vuông đen `■` thay thế cho vòng tròn đỏ `🛑` nhằm tạo sự đồng bộ hoàn hảo với ký tự tam giác chạy `▶` ở nút Bắt đầu chạy bot.

- **[09/08/2026]** - Thiết kế lại viền checkbox bao toàn bộ cả dấu tích và nhãn text theo phong cách Đen-Trắng:
  - **Cập nhật:** Sửa `cb_style` để chuyển border từ selector `QCheckBox::indicator` sang selector `QCheckBox`, cho phép viền bao quanh toàn bộ checkbox. Thiết lập hiệu ứng chuyển màu: khi `:checked` thì viền sáng nhẹ (`#666666`), chữ màu trắng xám nhẹ (`#cccccc`) và nền tối màu `#161616`; khi `:hover` thì viền sáng `#666666`, màu nền `#222222`.

- **[09/08/2026]** - Tinh chỉnh tỷ lệ spacing các cụm chức năng ở Header góc phải:
  - **Cập nhật:**
    1. Giảm spacing của `rc_layout` (các cụm chính) từ `18px` xuống `14px`.
    2. Tăng spacing bên trong cụm checkbox `l_tfs` từ `6px` lên `8px` giúp các checkbox giãn nhẹ tự nhiên hơn.

- **[09/08/2026]** - Giãn rộng khoảng cách giữa 6 checkbox Khung thời gian:
  - **Cập nhật:** Tăng thuộc tính spacing của layout `l_tfs` từ `6px` lên `10px` giúp các checkbox M5...H4 cách đều và thoáng mắt hơn, tăng tính mỹ thuật và giảm thiểu việc click nhầm.

- **[09/08/2026]** - Di chuyển ô chọn chế độ layout xuống cùng dòng với Terminal Logs ở góc phải và khôi phục tên đầy đủ:
  - **Nguyên nhân:** Đặt ô chọn chế độ ở Header góc phải gây loãng giao diện; sau khi chuyển xuống cạnh Terminal Logs, do có nhiều diện tích nên người dùng muốn khôi phục lại tên đầy đủ.
  - **Cập nhật:** Đặt `self.combo_layout_mode` vào trong `log_header` của `self.tab_logs`, khôi phục các mục lựa chọn thành `"Chế độ dọc"` / `"Chế độ ngang"` như cũ và mở rộng kích thước rộng cố định thành `110px`.

- **[09/08/2026]** - Đặt tỷ lệ mặc định chia đôi 50/50 giữa biểu đồ nến và Terminal Logs ở chế độ dọc:
  - **Nguyên nhân:** Mặc định trước đây biểu đồ nến chiếm 85% diện tích và Logs chỉ chiếm 15%, khiến giao diện Logs quá nhỏ khó theo dõi khi khởi chạy app.
  - **Cập nhật:** Đặt lại kích thước ban đầu thành `[500, 500]` và set stretch factor thành `(1, 1)` cho cả 2 widget con của splitter, bảo đảm chia đôi tỷ lệ 50/50 hoàn hảo khi khởi động app và tự động co giãn đều nhau khi thay đổi kích thước cửa sổ.

- **[09/08/2026]** - Đưa 6 checkbox Khung thời gian lên Header, thu gọn dropdown Dọc/Ngang thành 50px và đảo nó về cuối cạnh nút Cài đặt:
  - **Nguyên nhân:** Khung thời gian giao dịch trước đây chiếm dụng diện tích phía trên bảng vị thế; đồng thời ô dropdown "Dọc"/"Ngang" cũ vẫn còn khá dài và nằm xen giữa các dropdown nến chart, gây mất cân đối thị giác.
  - **Cập nhật:**
    1. Di chuyển 6 checkbox M5...H4 vào container `self.dash_tfs_container` và chèn trực tiếp vào TopRightCorner của Tab Live View.
    2. Rút gọn combo box chế độ layout thành "Dọc"/"Ngang", ép kích thước cố định bằng CSS min-width/max-width đè cứng xuống `50px`.
    3. Đảo thứ tự add widget trong `rc_layout` để đưa ô Dọc/Ngang này ra phía sau thanh checkbox Khung thời gian, nằm gọn gàng ở vị trí cuối cùng, ngay sát cạnh nút Cài đặt ⚙️.

- **[09/08/2026]** - Tối giản nhóm Khung thời gian giao dịch trên Dashboard thành dạng thanh phẳng (Flat Bar) không viền:
  - **Nguyên nhân:** Khung viền và tiêu đề của QGroupBox chiếm diện tích thừa thãi trên màn hình chính.
  - **Cập nhật:** Đổi `QGroupBox` thành `QWidget` không viền với màu nền transparent, hạ chiều cao cố định xuống `30px` (từ `50px`) giúp 6 checkbox M5...H4 hiển thị gọn gàng, tinh tế và tiết kiệm tối đa không gian hiển thị của Dashboard chính.

- **[09/08/2026]** - Di chuyển `sys_bot_sub1.py` và `sys_bot_sub2.py` vào các thư mục con tương ứng `z_bot_sub1` và `z_bot_sub2`:
  - **Nguyên nhân:** Người dùng không còn chạy các file bot tĩnh này trực tiếp từ terminal nữa mà chạy thông qua xGui_main.py, do đó muốn chuyển các file này vào các thư mục con của từng bot để thư mục gốc dự án gọn gàng và sạch sẽ hơn.
  - **Cập nhật:**
    1. Di chuyển `sys_bot_sub1.py` vào [z_bot_sub1/sys_bot_sub1.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub1/sys_bot_sub1.py).
    2. Di chuyển `sys_bot_sub2.py` vào [z_bot_sub2/sys_bot_sub2.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub2/sys_bot_sub2.py).
    3. Cập nhật mã nguồn của cả 2 file để tự động phát hiện nếu đang nằm trong thư mục con, tự động bổ sung thư mục cha vào `sys.path` (để hỗ trợ import chéo module) và điều chỉnh lại `CURRENT_DIR` chỉ trỏ tới thư mục gốc dự án, bảo đảm tính tương thích ngược 100% với hot-reload và cơ chế gọi bot của GUI chính.

- **[09/08/2026]** - Di chuyển Khung thời gian giao dịch ra giao diện chính Dashboard (dưới bảng Vị thế) và tự động lưu cấu hình ngầm:
  - **Nguyên nhân:** Khung thời gian giao dịch trước đây nằm sâu trong popup cài đặt (Tab Cấu hình chiến thuật), làm giảm tốc độ thao tác của người dùng khi cần bật/tắt nhanh các khung thời gian giao dịch khi thị trường biến động.
  - **Cập nhật:**
    1. Di chuyển toàn bộ GroupBox "Khung Thời Gian Giao Dịch" (6 checkbox: M5, M15, M30, H1, H2, H4) từ [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) trong hàm `setup_tab_strategy()` ra ngoài giao diện chính Dashboard trong hàm `setup_tab_dashboard()`, đặt ngay dưới bảng vị thế `self.tab_positions`. Groupbox này sẽ tự động ẩn đi đối với SMC (sub2).
    2. Sửa đổi `save_strategy_settings()` hỗ trợ chế độ `silent=True` (lưu ngầm không phát âm thanh, không hiện popup) và kết nối tín hiệu check/uncheck của các checkbox trên Dashboard trực tiếp với hàm lưu ngầm này. Cập nhật `load_current_settings()` để sử dụng cờ chặn `self._is_loading_settings` tránh lặp vòng lặp lưu cấu hình khi load dữ liệu.

- **[09/08/2026]** - Sửa lỗi bot vẫn rải limit ở M5 cho cả BTC và Altcoin dù đã bỏ tích chọn M5, M15, M30:
  - **Nguyên nhân:** Có hai lỗ hổng logic lớn trong [bot_strategy.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub1/bot_strategy.py):
    1. Hàm `get_aligned_tfs` có fallback `if trigger_tf not in TFS: return [trigger_tf]`. Vì `start_tf` mặc định là `"M5"`, khi `"M5"` không có trong `TFS` (bị bỏ tích), hàm vẫn trả về `["M5"]` làm cho bot rải limit ở M5.
    2. Logic `Altcoin Fallback` khi BTC có tín hiệu nhưng Altcoin chưa aligned sẽ ép lấy `best_tf` làm fallback. Khi thị trường đi ngang, `best_tf` mặc định là `"M5"`, dẫn đến ép rải limit ở M5 bất kể có được tích chọn hay không.
  - **Cập nhật:**
    1. Sửa `get_aligned_tfs` trong [bot_strategy.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub1/bot_strategy.py) để nếu `trigger_tf` không nằm trong `TFS`, nó sẽ tự động tìm kiếm và bắt đầu từ khung thời gian lớn hơn tiếp theo được tích chọn trong `TFS`, loại bỏ hoàn toàn các khung thời gian bị tắt khỏi danh sách aligned.
    2. Sửa logic `Altcoin Fallback` để kiểm tra nếu `best_tf` không có trong `TFS` thì tự động chuyển sang lấy khung thời gian lớn nhất có trong `TFS` (ví dụ `"H4"`) làm fallback, bảo đảm không bao giờ rải limit ở các khung bị tắt.

- **[09/08/2026]** - Thêm tính năng tự động dọn dẹp các tiến trình bot chạy ngầm (zombie) cũ của phiên trước khi mở GUI:
  - **Nguyên nhân:** Khi người dùng tắt app GUI chính, các tiến trình bot chạy ngầm (`--run-bot`) từ phiên cũ có thể không được đóng triệt để (hoặc bị kẹt lại). Các tiến trình cũ này vẫn tiếp tục chạy ngầm trong Windows, tự động rải lệnh limit đầy đủ 6 TF lên sàn OKX. Khi người dùng mở app mới lên, bot chạy ngầm cũ vẫn hoạt động gây hiểu lầm là app tự động chạy bot và rải limit khi chưa đăng nhập.
  - **Cập nhật:** Đã bổ sung hàm `kill_zombie_bots()` trong [xGui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/xGui_main.py) tự động quét hệ thống thông qua PowerShell/pkill để kết thúc bắt buộc mọi tiến trình con đang chạy ngầm có tham số `--run-bot` của các phiên cũ trước khi mở giao diện chính. Bảo đảm hệ thống sạch sẽ tuyệt đối, không còn tình trạng lệnh cũ tự động rải trên sàn.

- **[09/08/2026]** - Sửa lỗi khởi chạy xGui_main.py mở 2 cửa sổ GUI song song và lỗi bot không chạy thực tế (không hủy được lệnh limit cũ của các TF đã tắt):
  - **Nguyên nhân:** Khi chạy app qua script `xGui_main.py` trong môi trường dev, tên file script chính `sys.argv[0]` là `xGui_main.py`. Khi nhấn nút khởi động bot, `BotSubprocessWorker` gọi tiến trình con chạy `python xGui_main.py --run-bot ...`. Tuy nhiên, `xGui_main.py` thiếu kiểm tra cờ `--run-bot` nên nó chỉ tiếp tục import và khởi chạy GUI chính lần thứ hai (gây hiện tượng mở 2 cửa sổ), đồng thời kẹt ở event loop GUI khiến bot thực tế hoàn toàn không được chạy và các lệnh limit cũ của các TF đã tắt (M5, M15, M30) trên sàn OKX không được dọn dẹp.
  - **Cập nhật:** Đã cập nhật hàm `main()` của [xGui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/xGui_main.py) để kiểm tra đối số `--run-bot`. Nếu phát hiện chạy chế độ bot con, script sẽ ngay lập tức nạp và thực thi trực tiếp module `sys_bot_sub1` hoặc `sys_bot_sub2` mà không khởi chạy GUI phụ, giúp bot con hoạt động thực tế chính xác và tự động dọn sạch các lệnh limit cũ của các TF vừa tắt.

- **[09/08/2026]** - Đổi nhãn text từ "Main" thành "Sub 1" và sửa lỗi bot vẫn rải lệnh DCA ở các khung thời gian (TFs) đã bỏ tích:
  - **Nguyên nhân 1 (Nhãn text):** file `gui_main.py` khởi tạo `panel_main` truyền tên `"Thợ săn EMA200 (Main)"` trong khi bot chạy thực tế trên `.api_sub1` là của Sub 1.
  - **Nguyên nhân 2 (DCA ở TFs đã bỏ tích):** 
    1. Hàm `run_ai_self_evolution` và `sync_config_to_json` trong `bot_strategy.py` thiếu đồng bộ biến `ENABLED_TFS` giữa JSON và python memory. Đồng thời, cấu hình chỉ được lưu vào module `bot_sub1` mà không cập nhật sang `bot_config` và module `bot_strategy`, dẫn đến lệch bộ nhớ biến immutable và bot vẫn chạy theo config mặc định.
    2. Vòng lặp hủy lệnh limit không mục tiêu chỉ quét qua `TFS_ALL` (danh sách TF đã kích hoạt) thay vì quét qua toàn bộ 6 khung thời gian. Do đó, các TF vừa bị bỏ tích trên GUI sẽ bị bỏ qua và các lệnh limit cũ của chúng vẫn được treo trên sàn OKX.
  - **Cập nhật:**
    1. Đổi `"Thợ săn EMA200 (Main)"` thành `"Thợ săn EMA200 (Sub 1)"` trong [gui_main.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py).
    2. Bổ sung Two-Way Sync cho biến `ENABLED_TFS` trong `sync_config_to_json` và `run_ai_self_evolution`. Cho phép đồng bộ đồng thời cấu hình cho cả 3 module (`bot_sub1`, `bot_config`, `bot_strategy`) để tránh lệch bộ nhớ.
    3. Đổi vòng lặp dọn dẹp lệnh limit không mục tiêu trong [bot_strategy.py](file:///d:/4. Trade Coin - TLS1/4. Cursor - IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub1/bot_strategy.py) quét qua toàn bộ 6 khung thời gian `["M5", "M15", "M30", "H1", "H2", "H4"]` để tự động dọn dẹp triệt để tất cả lệnh limit cũ trên sàn khi người dùng bỏ tích trên giao diện.

- **[08/08/2026]** - Sửa lỗi `NameError: name 'system_config' is not defined` tại `bot_ui.py` (Bot SMC Sub2):
  - **Nguyên nhân:** Lỗi hiển thị Uptime (thời gian chạy bot) ở dòng 133 do hàm `print_dashboard` chưa được truyền biến cấu hình toàn cục `system_config`.
  - **Cập nhật:** Đã bổ sung tham số `system_config` vào hàm `print_dashboard` của [z_bot_sub2/bot_ui.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/z_bot_sub2/bot_ui.py), đồng thời cập nhật lời gọi hàm tại dòng 455 trong [sys_bot_sub2.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/sys_bot_sub2.py) để đẩy data cấu hình xuống UI một cách chính xác.

- **[04/08/2026]** - Lỗi UI/UX: Padding các nút quá lớn, font chữ bảng quá nhỏ, Light Mode bị lỗi trùng màu đen trắng cho Terminal Logs & Table, nút Cộng Đồng thiếu text. Đã fix: Điều chỉnh lại `apply_theme` CSS rules cho QTableWidget, QPushButton, QComboBox; thêm explicit colors cho Light Mode và bổ sung text cho nút Discord/Telegram. (Mã patch: `z247`)

- **[04/08/2026]** - Lỗi v1.0.242 Vùng OB (Order Block) bị ẩn/không hiển thị trên chart. Đã fix: Sửa cơ chế binding HTML overlay vào đúng thẻ cha (wrapper) thay vì thẻ div container sai lệch; Bổ sung vòng lặp retry chờ chart render xong (priceToCoordinate = null fallback); Tích hợp thêm đường chỉ Entry ngang (dashed line) kéo dài từ nến OB qua phía phải giống hệt OKX UI (Mã patch: `z243`, `z244`).
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
- **[15/08/2026]** - Lỗi "đóng từng phần (khung) nhưng lại đi đóng tất cả" khi vị thế thực tế có khối lượng lẻ (ví dụ 0.0075 BTC thay vì số nguyên hợp đồng) và lỗi UI báo đóng nhưng thực tế lệnh vẫn treo trên sàn. Đã fix: Bổ sung logic bắt ngoại lệ chặn `close-position` (đóng 100%) khi lệnh được tính toán là đóng từng phần (do làm tròn tối thiểu lên 1). Đồng thời bắt mã lỗi `51023` từ OKX khi dùng `/api/v5/trade/order` (từ chối do khối lượng khả dụng bị khoá bởi TP/SL), báo lỗi 400 ra UI thay vì âm thầm xoá lệnh ảo ở local. (Mã patch: `z7719`)
