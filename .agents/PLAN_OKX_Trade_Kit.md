# PLAN_BOT_MAIN.md — Tài liệu Kiến trúc & Chiến lược Bot
# THỢ SĂN EMA200 | Pure Limit Cross | Hedge Mode | v23.x
# Cập nhật: 2026-09-19

> [!CAUTION]
> ### 🛡️ NGUYÊN TẮC BẢO TOÀN CODE LOCAL CỦA CEO KHI PULL TỪ GITHUB
> **Khi CEO pull mã nguồn từ GitHub (do thọ dev hoặc đối tác push lên), nếu xảy ra xung đột (Git merge conflict):**
> 1. **ƯU TIÊN TUYỆT ĐỐI BẢN VÁ TRÊN MÁY TÍNH LOCAL CỦA CEO** (`ours`).
> 2. Tuyệt đối KHÔNG được để code từ xa (remote/theirs) ghi đè làm mất các bản vá chuẩn đã kiểm thử trên máy CEO:
>    - **Bot SMC:** Ánh xạ 1-1 khối OB chuẩn; Entry tại biên OB; SL tại biên đối diện; TP 1.5R; 1 OB = 1 lệnh duy nhất; Box chờ tịnh tiến theo nến live hiện tại.
>    - **Bot EMA200:** Bộ đếm tích lũy chuẩn 60 nến; Lệnh chờ Limit bám theo đường EMA200 động (Dynamic Trailing Limit); Tự động khớp chính xác khi nến retest chạm EMA200; Chốt độ dài box tại nến TP/SL.
>    - **Biểu đồ & Giao diện:** Tự động khóa và bật sẵn 2 chế độ **A (Auto Fit)** và **L (Logarithmic Scale)** trên mọi khung thời gian/coin; Định dạng giá Hyperliquid; Nút thu gọn cài đặt tài khoản mượt mà.
> 3. Khi giải quyết xung đột Git, AI bắt buộc phải thực thi lệnh ưu tiên local:
>    ```powershell
>    git checkout --ours <tên_file_xung_đột>
>    # Hoặc:
>    git merge origin/main -X ours
>    ```



===========================================================================================
## I. THAM SỐ CẤU HÌNH TOÀN CỤC
===========================================================================================
| Tham số                        | Giá trị    | Ý nghĩa                                              |
|--------------------------------|------------|------------------------------------------------------|
| TIMEFRAME_BASE                 | 5m         | Khung nến chủ — vòng lặp Bot chạy theo nến M5       |
| LIMIT_CANDLES                  | 900        | Số nến tải về mỗi TF để tính EMA                    |
| RISK_PER_TRADE_PCT             | 1.0%       | % vốn tài khoản dùng cho mỗi lệnh                   |
| EMA_CONFLUENCE_TOLERANCE_PCT   | 0.23%      | Dung sai hội tụ EMA89↔EMA200 để dùng Midpoint       |
| EMA_SQUEEZE_TOLERANCE_PCT      | 0.25%      | Dung sai khoảng cách EMA34↔EMA89 để xác nhận Squeeze|
| PING_PONG_VOL_DIVIDER          | 3.0x       | Chia nhỏ volume lệnh Ping-Pong (= 1/3 vol thường)   |
| PING_PONG_TD_MODE              | isolated   | Chế độ ký quỹ cho Ping-Pong                         |
| PING_PONG_LEVERAGE             | 50         | Đòn bẩy cho Ping-Pong                               |
| SCALPING_TP_PCT (M5 base)      | 2.1%       | TP gốc — nhân TF_MULTIPLIERS để ra TP thực tế       |
| SCALPING_SL_PCT (M5 base)      | 2.1%       | SL gốc — nhân TF_MULTIPLIERS để ra SL thực tế       |
| REQUIRED_ACCUMULATION_CANDLES  | 60 nến     | Nến tối thiểu cùng chiều EMA200 để xác nhận trend   |
| QUANTUM_BUFFER_CANDLES         | 12 nến     | Số nến ngược chiều tối đa trước khi tính fail+1     |
| QUANTUM_FORTH_CANDLES          | 10 nến     | Số nến phục hồi để cộng accum trở lại              |
| MAX_CYCLE_FAILURES             | 2          | Số lần nhấp nhô cho phép — vượt: SIDEWAY            |
| REALTIME_SCAN_INTERVAL         | 1.0s       | Tần suất cập nhật biến động giá và check lệnh        |
| LIMIT_SETUP_CYCLE              | 3.0s       | Chu kỳ gọi AMEND-FIRST dời lệnh theo EMA (trước: 30s)|
### Hệ số nhân TP/SL theo khung thời gian (TF_MULTIPLIERS)
| TF  | Hệ số  | TP/SL thực (2.1% × hệ số) |
|-----|--------|---------------------------|
| M5  | x1.000 | ~2.1%                     |
| M15 | x1.533 | ~3.2%                     |
| M30 | x2.333 | ~4.9%                     |
| H1  | x3.333 | ~7.0%                     |
| H2  | x4.667 | ~9.8%                     |
| H4  | x6.772 | ~14.2%                    |


===========================================================================================
## II. CÁC ĐƯỜNG EMA SỬ DỤNG
===========================================================================================
EMA34, EMA89, EMA160, EMA200 — tính cho mỗi TF: M5, M15, M30, H1, H2, H4.
- EMA200 — Trục chính. Vùng tích lũy/phân phối. Điểm Entry.
- EMA89  — Cán cân xu hướng trung hạn. Confirm chiều.
- EMA34  — Nhịp thở ngắn hạn. Báo hiệu momentum.

Cấu trúc xếp lớp xác định xu hướng:
  TANG MANH  : EMA200 < EMA89 < EMA34  (giá nằm trên tất cả)
  GIAM MANH  : EMA200 > EMA89 > EMA34  (giá nằm dưới tất cả)
  NEN Squeeze: EMA89 < EMA34 < EMA200  hoặc ngược lại
               + EMA34-EMA89 ≤ 0.25% giá   (nén rất hẹp)
               + EMA200 drift ≤ 0.3% / 20 nến  (cho phép dốc nhẹ ≤ 4 độ)
               + Giá kẹt trong vùng giữa EMA34/89 và EMA200


===========================================================================================
## III. 3 CHẾ ĐỘ VÀO LỆNH (ENTRY MODES)
===========================================================================================
❶ THUẬN XU HƯỚNG (Main Trend)
Điều kiện:
  - Cặp TF (small_tf, big_tf) có cùng side (cùng above/under EMA200)
  - Quét từ nhỏ → lớn: (M5↔M15) → (M15↔M30) → (M30↔H1) → (H1↔H2) → (H2↔H4)
  - Lấy cặp đầu tiên thỏa mãn → small_tf = TF đánh lệnh
  - EMA34 & EMA89 của small_tf xếp lớp đúng chiều

Bộ lọc nến (khắt khe):
  - accum ≥ 60 nến cùng chiều EMA200
  - back (ngược chiều) ≤ 12 nến
  - fail < 2 lần nhấp nhô

Entry:
  - Nếu EMA89(TF lớn) ≤ dung sai hội tụ: Entry = Midpoint(EMA200_small, EMA89_big)
  - Ngược lại:                              Entry = EMA200(small_tf)

TP/SL:
  - TP = SCALPING_TP_PCT × TF_MULTIPLIERS[small_tf]
  - SL = SCALPING_SL_PCT × TF_MULTIPLIERS[small_tf]
  Ví dụ: TF = H1 → TP/SL = 2.1% × 3.333 ≈ 7.0%

Bộ lọc phụ (phải qua):
  - BTC Anchor Filter (Đồng pha BTC độc lập cho từng TF): Từng khung thời gian của Altcoin tự đối chiếu xu hướng của mình với khung thời gian tương ứng của BTC (yêu cầu BTC phải có xu hướng và cùng side). Nếu không đồng pha ở TF nào thì chỉ bỏ qua việc đặt lệnh/DCA tại TF đó chứ không hủy toàn bộ lưới của coin.
  - Macro Trend Filter
  - Volume Spike Guard (volume nến > 3× TB20 → hủy lưới)

❷ XO LE HEDGE (Counter-Trend Early Reversal)
Điều kiện tiên quyết (Vĩ mô):
  - CHỈ KÍCH HOẠT khi Cầu Dao Vĩ Mô đóng: Giá đứt lìa xa EMA200-H4 vượt quá ngưỡng rướn `MACRO_EXTENSION_LIMIT_PCT` (ví dụ 8%). 
  - Khóa vĩnh viễn (thu lưới XO LE) ngay khi giá hồi phục đập vào trục `EMA200-H2` (ranh giới an toàn, nhường sân chơi lại cho lưới thuận xu hướng).

Điều kiện sóng mồi (Nội bộ):
  - Quét cụm đa TF: tf / tf+1 và tiếp tục quét tf+n (n ≥ 2)
  - tf VÀ tf+1 cùng chiều (Tăng mạnh hoặc Giảm mạnh — EMA xếp lớp hoàn chỉnh)
  - Tìm kiếm tf+n (với n ≥ 2) NGƯỢC chiều hoàn toàn để làm mốc TP
  - Vẫn yêu cầu đủ nến tích lũy (Accum/Buffer) ở khung tf vào lệnh theo EMA200 đó (và cả khung tf+1)
  - Cấu trúc xếp lớp của các khung:
    * Xo Le LONG (Bắt đáy):
      • Điều kiện: Đang trong trend Giảm quá đà của H4 (Cầu Dao Vĩ Mô kích hoạt).
      • tf và tf+1 Tăng mạnh: EMA200 < EMA89 < EMA34
      • Quét tìm tf+n Giảm mạnh (Ngược chiều): EMA200 > EMA89 > EMA34
      • Entry: Limit LONG tại EMA200(tf)
      • Target: Chốt lời sát dưới EMA200(tf+n) nào nằm phía trước (cản trên đối kháng). Nếu không có cản trước mặt, TP sấp sỉ SCALPING_TP_PCT × TF_MULTIPLIERS.
      • Lệnh bị bóp nghẹt nếu live_price vọt lên chạm / đâm thủng `EMA200-H2` (Trần H2).
    * Xo Le SHORT (Bắt đỉnh):
      • Điều kiện: Đang trong trend Tăng quá đà của H4 (Cầu Dao Vĩ Mô kích hoạt).
      • tf và tf+1 Giảm mạnh: EMA200 > EMA89 > EMA34
      • Quét tìm tf+n Tăng mạnh (Ngược chiều): EMA200 < EMA89 < EMA34
      • Entry: Limit SHORT tại EMA200(tf)
      • Target: Chốt lời sát trên EMA200(tf+n) nào nằm phía trước (cản dưới đối kháng). Nếu không có cản trước mặt, TP sấp sỉ SCALPING_TP_PCT × TF_MULTIPLIERS.
      • Lệnh bị bóp nghẹt nếu live_price tụt xuống chạm / đâm thủng `EMA200-H2` (Sàn H2).

Entry:
  - EMA200 của TF nhỏ nhất trong cặp thuận chiều (tf)

TP/SL — RR 1:1:
  - Target = EMA200(tf+n) nằm cản đường đi của lệnh
  - reward_pct = |Target - EMA200(tf)| / EMA200(tf) (hoặc SCALPING_TP_PCT × TF_MULTIPLIERS nếu dùng fallback)
  - TP = reward_pct - 0.06%        ← chốt sớm trước khi chạm cản đối kháng
  - SL = reward_pct                ← RR 1:1

Đặc quyền:
  - BYPASS BTC Anchor Filter
  - BYPASS Macro Trend Filter
  - Ưu tiên: sau Ping-Pong, trước Main Trend

❸ PING-PONG NÉN (Squeeze Breakout)
Điều kiện:
  - Quét cặp (small_tf, big_tf): (M5↔M15)(M15↔M30)(M30↔H1)(H1↔H2)(H2↔H4)
  - big_tf đang Squeeze:
      + EMA34 ↔ EMA89 ≤ 0.25% giá    (nén rất hẹp)
      + EMA200 drift ≤ 0.3% / 20 nến  (cho phép dốc nhẹ ≤ 4 độ)
      + Giá kẹt trong vùng EMA34/89 ↔ EMA200
      + Cấu trúc xếp lớp nén:
        * Bullish Squeeze: EMA89 < EMA34 < EMA200 (chờ breakout tăng)
        * Bearish Squeeze: EMA89 > EMA34 > EMA200 (chờ breakout giảm)
  
  - Trạng thái khung nhỏ (small_tf):
    * Khi big_tf nén Bull: small_tf đang Tăng mạnh (EMA200 < EMA89 < EMA34) -> Limit LONG tại EMA200(small_tf)
    * Khi big_tf nén Bear: small_tf đang Giảm mạnh (EMA200 > EMA89 > EMA34) -> Limit SHORT tại EMA200(small_tf)
  
  - Khoảng cách EMA200(small_tf) đến EMA34/89(big_tf) ≤ 0.3%
    → Hai trục tiệm cận nhau = điểm kích nổ

Entry:
  - EMA200(small_tf) ← đáy sóng hồi về trục nhỏ

TP/SL — RR 1:1:
  - Target = EMA200(big_tf)        ← cản phía đối diện sau breakout
  - reward_pct = |EMA200(big) - EMA200(small)| / EMA200(small)
  - TP = reward_pct - 0.06%
  - SL = reward_pct                ← RR 1:1
  - Volume = vol_thường / 3.0      ← lệnh nhỏ hơn để quản lý rủi ro

Bản chất: Giống Xo Le nhưng ở giai đoạn SAU khi đã nén đủ ~30+ nến trong Squeeze.
Ưu tiên: CAO NHẤT — ghi đè cả Main Trend và Xo Le.


===========================================================================================
## IV. THỨ TỰ ƯU TIÊN & LUỒNG QUYẾT ĐỊNH
===========================================================================================
[Mỗi vòng lặp M5]
  │
  ├─ 1. Tính EMA34/89/160/200 cho M5, M15, M30, H1, H2, H4
  │
  ├─ 2. Kiểm tra Squeeze cho tất cả TF (check_ema_squeeze)
  │
  ├─ 3. Cập nhật mtf_states[TF][accum/fail/back/forth]
  │
  ├─ 4. Main Trend Loop → signal_long_tf / signal_short_tf
  │       → trend = UPTREND / DOWNTREND / HEDGE / SIDEWAY
  │
  ├─ 5. get_ping_pong_opp() — ưu tiên CAO NHẤT
  │       → Tìm thấy: đặt Ping-Pong, bỏ qua Main + Xo Le
  │
  ├─ 6. get_xole_opp() — ưu tiên TRUNG BÌNH
  │       → PP không kích: kiểm tra Xo Le
  │       → Xo Le kích: bỏ qua Main Trend
  │
  ├─ 7. Tính Entry Price (Midpoint / EMA200 / xole_entry / pp_entry)
  │
  ├─ 8. Lọc phụ:
  │       Main Trend → BTC Filter + Macro Filter + Vol Spike Guard
  │       Xo Le      → BYPASS BTC + Macro; vẫn qua Vol Spike Guard
  │       Ping-Pong  → BTC Filter + Macro Filter + Vol Spike Guard
  │
  └─ 9. Đặt lệnh Limit Cross + Gài algo TP/SL


===========================================================================================
## V. CÁC CƠ CHẾ BẢO VỆ VỐN
===========================================================================================
A. Volume Spike Guard
   - Volume nến > 3× TB(20 nến) → Hủy toàn bộ lệnh Limit chờ
   - Tránh "bắt dao rơi" khi tin bất ngờ

B. Cycle Fail Guard
   - back ≥ 12 nến ngược chiều → fail += 1
   - fail ≥ 2 → SIDEWAY, hủy lưới, không đặt lệnh mới

C. SL Tự động (Algo TPSL)
   - Bot gài TP/SL qua OKX Algo ngay sau khi lệnh Limit khớp
   - Nếu lệnh đang lãi nhẹ nhưng giá nhấp nhô nhiều → Cắt hòa (Sideway_Vap_Exit)

D. DCA Liên Hoàn Theo Chu Kỳ (Cycle DCA)
   - Đang có lệnh (VD: H4) + phát hiện tín hiệu ở TF khác chưa từng khớp (VD: M5 sau TP/SL hoặc M15)
   - → DCA thêm tại TF đó, cập nhật trung bình giá
   - Điều kiện: tf not in pos_cycle_filled_tfs (TF chưa từng khớp trong chu kỳ vị thế hiện tại)
   - Cập nhật TP/SL OCO: Khi lệnh DCA khớp làm thay đổi khối lượng vị thế, bot sẽ tự động hủy các lệnh OCO TP/SL cũ để gài lại các lệnh OCO TP/SL mới có kích thước khớp với vị thế hiện tại, giá kích hoạt tính theo trung bình giá mới và hệ số TP/SL tính theo khung thời gian DCA vừa khớp.

E. Hedge Mode (Long + Short song song)
   - Hỗ trợ mở đồng thời LONG và SHORT trên cùng 1 coin
   - Ví dụ: LONG H1 (Main Trend) + SHORT M15 (Xo Le) cùng lúc
   - Hủy lệnh: chỉ hủy lệnh cùng hướng, giữ nguyên chiều kia

F. Neo BTC (BTC Anchor Filter)
   - Altcoin không được đi ngược chiều trend BTC (trừ trường hợp cả 2 cách EMA200 ≤ 0.4%)
   - Xo Le BYPASS hoàn toàn bộ lọc này

G. Macro Trend Filter
   - Trend hiện tại không được ngược với macro_trend
   - Xo Le BYPASS bộ lọc này

H. Squeeze Escape Exit (Thoát sớm khi Nén Tam Giác — ENABLE_SQUEEZE_ESCAPE_EXIT)
   Mục đích: Khi vị thế đang mở tại khung thời gian đang bị Squeeze (Nén tam giác EMA34↔EMA89), 
   nếu giá breakout bất ngờ ngược chiều vị thế, bot sẽ chờ giá hồi về chạm EMA34 hoặc EMA89 của 
   khung vị thế đó rồi mới đóng lệnh, thay vì đóng ngay khi breakout.

   Cơ chế:
   - Kiểm tra khung vị thế hiện tại (pos_tf = active_pos_tf) có đang Squeeze không.
   - Nếu đang Squeeze và ENABLE_SQUEEZE_ESCAPE_EXIT = True:
     * LONG: Đợi giá hồi LÊN chạm min(EMA34, EMA89) → live_price >= min(sq_ema34, sq_ema89)
     * SHORT: Đợi giá hồi XUỐNG chạm max(EMA34, EMA89) → live_price <= max(sq_ema34, sq_ema89)
   - Chỉ đóng nếu ROI >= -5.0% (tránh đóng khi đã lỗ quá sâu).

   Lưu ý: Phải đợi giá hồi về chạm EMA (pullback), KHÔNG đóng ngay tại thời điểm breakout. 
   Điều này giúp tránh đóng lệnh ở đáy/tạm thời của cú phá vỡ, cho phép giá có cơ hội hồi phục.

I. Auto-Detect TF cho Lệnh Thủ Công (Manual Position TF Detection)
   Mục đích: Khi bạn chủ động vào lệnh trên sàn không qua bot, bot sẽ tự động phát hiện 
   khung thời gian (TF) phù hợp nhất dựa trên giá entry để gài TP/SL đúng hệ số TF.

   Cơ chế:
   - Bot fetch toàn bộ vị thế cross từ sàn (không phân biệt lệnh bot hay lệnh tay).
   - Với mỗi lệnh mới mở, determine_filled_tf() kiểm tra clOrdId của bot:
     * Nếu có clOrdId của bot → xác định TF từ mã lệnh.
     * Nếu KHÔNG có (lệnh thủ công) → fallback sang Auto-Detect:
       - Dò EMA200 của từng TF (M5, M15, M30, H1, H2, H4)
       - Tính % khoảng cách |avg_px - EMA200| / EMA200
       - Chọn TF có khoảng cách nhỏ nhất → gán làm active_pos_tf
   - TP/SL được gài theo TF đã phát hiện (SCALPING_TP_PCT × TF_MULTIPLIER).
   - Lưu ý: determine_filled_tf dùng raw EMA200 (không qua calculate_entry_px) để tránh BTC luôn về M5.

J. Hiển Thị DCA Pending & LỊCH SỬ LỆNH (Dashboard Enhancements)
   DCA Pending: Khi chưa có vị thế mà đang có lệnh Limit chờ, dashboard hiển thị:
     ✧ [BTC] Chưa có vị thế — Chờ DCA SHORT:
         └─   M5: 61245.3
         └─   M15: 60980.1
   - Sắp xếp theo giá gần live_price nhất (SHORT: thấp→cao, LONG: cao→thấp).

   LỊCH SỬ LỆNH: Hiển thị tối đa 5 lệnh gần nhất cho mỗi coin:
     ✧ [BTC]: Đã đóng SHORT (-293.3%) → Lý do: [Exchange_SL] Cắt lỗ SL tự động khớp trên sàn
     ✧ [BTC]: Đã đóng SHORT (+45.2%) → Lý do: [Exchange_TP] Chốt lời TP tự động khớp trên sàn
   - Lưu trong sys_bot_main.py: AssetTracker.closed_history (list, max 10)

K. Cơ Chế Back/Forth/Fail (Candle Accumulation State Machine) — # z2218
   Mục đích: Xác định sức khỏe xu hướng qua 3 chỉ số tích lũy nến.
   
   | Chỉ số | Đếm | Ngưỡng | Hành động |
   |--------|-----|--------|-----------|
   | accum  | Nến cùng chiều EMA200 | ≥ 60  | Xu hướng xác nhận (valid) |
   | back   | Nến ngược chiều liên tiếp | ≥ 12 | fail += 1 (flag cycle_fail_triggered) |
   | forth  | Nến thuận chiều sau back | ≥ 10 | Hồi phục: accum += forth, reset back/forth/trigger |

   - Dùng flag cycle_fail_triggered (bool) thay vì back == quantum_buf để tránh miss fail++ khi back vượt 12.
   - Khi back ≥ 60 → đảo chiều side hoàn toàn, reset tất cả.
   - Khi forth ≥ 10 → accum được cộng bù, reset cycle_fail_triggered.
   - Khi fail ≥ 2 → SIDEWAY (không vào lệnh mới).


===========================================================================================
## VI. SMART ENTRY (TÍNH ĐIỂM VÀO LỆNH TỐI ƯU)
===========================================================================================
Khi 2 EMA của 2 TF liền kề đủ gần (≤ dung sai):
  Entry = Midpoint(EMA200_small, EMA89_big)   ← điểm giữa cân bằng 2 trục

Khi 2 EMA quá xa nhau:
  Entry = EMA200(target_tf)                   ← chỉ dùng trục chính

Đệm lùi entry chống trượt giá (Entry Offset):
  - BTC (luôn dùng đệm tĩnh cố định nhân với độ co giãn biến động của riêng nó):
    LONG  entry = EMA × (1 + base_buffer × vol_mult)
    SHORT entry = EMA × (1 - base_buffer × vol_mult)
  - Altcoin (lùi lệnh động theo mối tương quan với BTC và hệ số co giãn):
    🔴 SHORT: Entry Offset = [ ( |dist_to_tf(BTC)| + dist_to_tf(ETH) ) × vol_mult ] - base_buffer
              → Entry = EMA × (1 + Entry Offset)
    🟢 LONG:  Entry Offset = [ ( dist_to_tf(ETH) - |dist_to_tf(BTC)| ) × vol_mult ] + base_buffer
              → Entry = EMA × (1 + Entry Offset)


===========================================================================================
## VII. DASHBOARD HIỂN THỊ (console output)
===========================================================================================
Format:
  =====...=====
  ☢  THỢ SĂN EMA200 | EQUITY: xxx | RISK: 1% | WINRATE: XX% / N
      HH:MM:SS       | PNL: xxx    | VOL: xxx | R/R: 1/X
  =====...=====

  ⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT:
    ❶ BTC: THUẬN XU HƯỚNG   Giảm từ H4 đến M30 — Entry EMA200-M30 | Co giãn: 1.86x
    ❷ ETH: XO LE HEDGE      Thuận M15, nghịch H1 → EMA200-M15 | TP=EMA200-H1 RR1:1 | Co giãn: 2.26x
  
  ──────────────────────────────────────────────────────────────────────────────────────
   COIN |   M5   |  M15   | [M30]  |   H1   |   H2   |   H4   | PRICE   | CÁCH EMA
  ──────────────────────────────────────────────────────────────────────────────────────
   BTC  | +236-0 | -399-1 | -219-0 | -114-0 | - 60-0 | -197-0 | 60,545.0 | [M30] -0.47%
   ETH  | +311-0 | -204-1 | -219-0 | -108-0 | - 60-0 | -262-0 |  1,595.3 | [M30] -0.68% (0.21%)
  ──────────────────────────────────────────────────────────────────────────────────────
  Cột MTF: +/- = above/under EMA200 | Số trước "-" = accum nến | Sau "-" = số lần fail
  [M30] trong header = TF đang được chọn đặt lệnh
  CÁCH EMA = % khoảng cách giá live đến EMA200 target_tf | (%) thứ 2 = chênh so BTC
  
  ✜ TÌNH TRẠNG VỊ THẾ:
    ✧ [BTC] SHORT x100 -> Entry: 59,696.4 -> SL: 60,950.0 -> MaxROI/MAE: +0.1% / -0.0%
    ✧ [ETH] SHORT x100 -> Entry:  1,572.1 -> SL:  1,605.1 -> MaxROI/MAE: +0.0% / -13.3%
  ──────────────────────────────────────────────────────────────────────────────────────
  
  ☯ PHÂN TÍCH CẤU TRÚC REALTIME:
    ✧ [BTC]: Mở lệnh SHORT (59,696.4). Xu hướng Giảm tại [M5]: 
    ✧ [ETH]: Mở lệnh SHORT ( 1,572.1). Xu hướng Giảm tại [M5]: 
  =====...=====

Ký hiệu chế độ:
  ❶  = THUẬN XU HƯỚNG  — H4 thuận đến nhỏ, bộ lọc nến 60/12/2
  ❷  = XO LE HEDGE     — Ngược pha khung lớn cấp 2+, không cần nến đệm
  ❸  = PING-PONG NÉN   — Nén Squeeze + 2 TF tiệm cận, vol/3
  ·   = SIDEWAY / CHỜ  — Không đủ điều kiện


===========================================================================================
## VIII. CÁC FILE LIÊN QUAN
===========================================================================================
| File                | Mục đích                                              |
|---------------------|-------------------------------------------------------|
| bot_main.py         | Bot chính — toàn bộ engine giao dịch                 |
| .env                | API keys OKX, Telegram token/chatid, DATA_FOLDER     |
| data/*.json         | Lịch sử lệnh, thống kê winrate, AI training data     |
| PLAN_BOT_MAIN.md    | File này — tài liệu kiến trúc chiến lược             |


===========================================================================================
## IX. ĐIỂM ĐÁNG CHÚ Ý & CẬP NHẬT GẦN NHẤT (v23.x)
===========================================================================================
A. THỨ TỰ DASHBOARD CONSOLE (ĐÃ XÁC NHẬN)
  1. System Header (=====)
  2. ⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT   ← single-line per coin, hiện trước bảng
  3. Bảng COIN MTF (---table---)
  4. ✜ TÌNH TRẠNG VỊ THẾ            ← hiện sau bảng
  5. ☯ PHÂN TÍCH CẤU TRÚC REALTIME  ← cuối cùng

Format dòng chiến thuật:
  "       ❶ BTC: THUẬN XU HƯỚNG   Giảm từ H4 đến M30 — Entry EMA200-M30 ( Co giãn: {tk.current_vol_mult:.2f}x )"
  "       ❷ ETH: XO LE HEDGE      Thuận M15, nghịch H1 → EMA200-M15 | TP=EMA200-M30  ( Co giãn: {tk.current_vol_mult:.2f}x )"
  "       ❸ BTC: PING-PONG NÉN    Nén M30 → Bắt bẻ tại EMA200 M15 | TP=EMA200-M30  | Vol/3 ( Co giãn: {tk.current_vol_mult:.2f}x )"

B. TP/SL TỪNG CHẾ ĐỘ (ĐÃ XÁC NHẬN & ĐÃ CODE)
  ❶ THUẬN XU HƯỚNG:
    TP = SCALPING_TP_PCT × TF_MULTIPLIERS[tf]   (VD: H1 → 2.1% × 3.333 = 7.0%)
    SL = SCALPING_SL_PCT × TF_MULTIPLIERS[tf]   (= TP, symmetric)
    Lấy từ: globals_ref.SCALPING_TP_PCT * tf_mult

  ❷ XO LE HEDGE:
    TP = |EMA200(tf+1) - EMA200(tf)| / EMA200(tf) - 0.06%
         (khoảng cách đến EMA200 của TF lớn hơn 1 cấp, trừ buffer 0.06% chống rụt râu)
    SL = Đúng bằng reward_pct → RR 1:1
    Lưu vào: tracker.xole_tp_pct / tracker.xole_sl_pct

  ❸ PING-PONG NÉN:
    TP = |EMA200(big_tf) - EMA200(small_tf)| / EMA200(small_tf) - 0.06%
    SL = Đúng bằng reward_pct → RR 1:1
    Lưu vào: tracker.ping_pong_tp_pct / tracker.ping_pong_sl_pct
    Volume = vol / PING_PONG_VOL_DIVIDER (= 1/3 volume thường)
    Margin Mode = Isolated x50 (Tách biệt khỏi MAIN/XOLE Cross x100 để set TP/SL độc lập)

C. PHÂN BIỆT XO LE vs PING-PONG NÉN
  Điểm chung:
    - Cả 2 đều đánh ngược pha khung lớn.
    - Cùng công thức TP/SL: EMA200 cấp trên, RR 1:1.
  Khác biệt:
    XO LE HEDGE:
      + Điều kiện: 2 TF thuận chiều liền kề + TF cấp 2 ngược chiều
      + Không yêu cầu Squeeze
      + Volume = bình thường
      + Bypass BTC Filter + Macro Filter
    PING-PONG NÉN:
      + Điều kiện: big_tf đang Squeeze (nén ≥ ~30 nến, EMA34↔EMA89 ≤ 0.25%, EMA200 phẳng)
                   + small_tf tiệm cận sát EMA34/89 của big_tf (≤ 0.3%)
      + Volume = 1/3 (nhỏ hơn để kiểm soát rủi ro khi nổ bất ngờ)
      + Vẫn qua BTC Filter + Macro Filter (không bypass)
      + Ưu tiên CAO NHẤT (ghi đè cả Main Trend và Xo Le)

D. BỘ LỌC ƯU TIÊN VÀO LỆNH (THỨ TỰ TUYỆT ĐỐI)
  1. Ping-Pong Nén  (cao nhất — ghi đè tất cả)
  2. Xo Le Hedge    (trung bình — chỉ khi PP không kích)
  3. Main Trend     (cơ bản — cần đủ 60 nến, 12 buffer, 2 fail)
  [·] Sideway       (không có tín hiệu — đứng ngoài)
  Khi cả Long và Short đều có tín hiệu Main Trend → HEDGE MODE
    → Rải đồng thời 2 lệnh Limit LONG + SHORT 2 đầu

E. CÁC ĐIỂM DỄ NHẦM / LƯU Ý KỸ THUẬT
  1. QUANTUM_BUFFER_CANDLES (12): Số nến ngược chiều ĐƯỢC PHÉP trước khi fail tăng.
     → KHÔNG phải số nến chờ thêm sau khi cắt EMA200.
     → Sau 12 nến ngược chiều: fail += 1 (không dừng ngay).
     → Sau 2 lần fail: mới chuyển SIDEWAY.
  
  2. REQUIRED_ACCUMULATION_CANDLES (60): Cần 60 nến CÙNG CHIỀU EMA200 liên tiếp.
     → Áp dụng cho Main Trend và Xo Le Hedge, KHÔNG áp dụng cho Ping-Pong.
     → Xo Le vẫn yêu cầu tích lũy nến (Accum/Buffer) tại khung tf vào lệnh (và tf+1), còn Ping-Pong chỉ xét cấu trúc EMA nguyên thủy (Raw EMAs).
  
  3. DCA Liên Hoàn: Bot có thể nhồi lệnh thêm nếu phát hiện tín hiệu ở các TF chưa từng khớp.
     → Điều kiện: tf not in pos_cycle_filled_tfs (bỏ chặn active_pos_tf).
     → Không giới hạn số lần DCA nếu đáp ứng điều kiện.
  
  4. Hedge Mode được hỗ trợ đầy đủ: Long + Short cùng lúc trên 1 coin.
     → Khi hủy lệnh (BTC filter, etc.): chỉ hủy lệnh cùng chiều.
     → Xo Le BYPASS BTC/Macro nên có thể mở ngược chiều Main Trend đang chạy.
  
  5. Volume Spike Guard (vol > 3× TB20):
     → Hủy toàn bộ Limit chờ ngay lập tức.
     → Áp dụng cho cả 3 chế độ (không có chế độ nào bypass).
  
  6. EMA200 Drift Check trong Squeeze:
     → Không chỉ xét khoảng cách EMA34↔EMA89, mà còn kiểm tra EMA200 có phẳng không.
     → Drift > 0.3% trong 20 nến → KHÔNG công nhận là Squeeze (tránh trend dốc mạnh, chấp nhận dốc thoải ≤ 4 độ).
  
  7. Xo Le nhận TF cấp trên để tính TP (xl_target = EMA200 của tf+2):
     → Ví dụ: M15 Tăng, M30 Tăng, H1 Giảm → Entry = EMA200 M15, TP = EMA200 H1.
     → Đây chính là EMA200 của H1 (TF ngược chiều cấp 2 - tf+2) đóng vai trò là cản cứng đối nghịch.
  
  8. Đồng bộ khung thời gian Altcoin theo BTC:
     → Toàn bộ Altcoin sẽ bị ép chạy theo TF của BTC (`active_target_tf` của BTC).
     → Tín hiệu vào lệnh và cột khoảng cách EMA (`CÁCH EMA`) của Altcoin đều dựa trên TF này.

F. LOG PHÂN TÍCH REALTIME — CÁC TRẠNG THÁI CÓ THỂ XUẤT HIỆN
  Trạng thái                    | Nguyên nhân
  ------------------------------|--------------------------------------------------------------
  Chờ khớp LONG/SHORT [TF]     | Đã đặt Limit, đang đợi giá chạm EMA
  Kích hoạt Ping-Pong [TF]     | Squeeze 2 TF tiệm cận, đã đặt lệnh vol/3
  Đánh HEDGE MODE [TF/TF]      | Cả Long lẫn Short đều có tín hiệu, rải 2 đầu
  Dò trend [TF] → Chờ nến...  | Main Trend chưa đủ 60 nến tích lũy
  Dừng [TF] → Nén ngược chiều | back_count đang tăng (ngược chiều ≤ 12 nến)
  Dừng [TF] → Giá nhấp nhô    | fail >= 2, đang SIDEWAY
  Dừng [TF] → EMA hội tụ sát  | EMA34↔EMA200 < 0.15%, không còn định hướng
  Đứng ngoài [TF]              | SIDEWAY hoàn toàn, không có cặp TF đồng pha
  Entry [TF] tại Midpoint...   | 2 EMA đủ gần → dùng điểm giữa EMA200+EMA89
  Entry [TF] tại EMA200        | 2 EMA quá xa → chỉ dùng EMA200 chính

G. CÔNG THỨC ENTRY ĐÓN LÕM / ĐỆM CO GIÃN ALTCOIN (MỚI NHẤT)
  Mục đích: Không đặt Limit chính xác tại EMA200 mà đặt CÁCH MỘT ĐOẠN (bằng Entry Offset) dựa trên biến động của cả BTC và Altcoin để vừa đảm bảo làm mồi nhử dễ khớp, vừa tự động né râu khi thị trường có biến động mạnh.
  
  Công thức tính toán Entry Offset cho Altcoin:
  - dist_to_tf(ETH): Khoảng cách % từ giá ETH hiện tại tới cản EMA200 (giữ nguyên dấu, trên cản là dương (+), dưới cản là âm (-)).
  - dist_to_tf(BTC): Khoảng cách % tuyệt đối từ giá BTC hiện tại tới cản EMA200 (luôn lấy trị tuyệt đối dương (+)).
  - vol_mult: Hệ số co giãn động của Altcoin.
  - base_buffer: Đệm tĩnh theo từng TF.

  🔴 Dành cho lệnh SHORT (Bắt đỉnh / Downtrend):
  Entry Offset = [ ( |dist_to_tf(BTC)| + dist_to_tf(ETH) ) × vol_mult ] - base_buffer
  → Giá Limit = EMA200 * (1 + Entry Offset) (Nằm dưới EMA200 làm mồi nhử hoặc lùi trên EMA200 né râu)

  🟢 Dành cho lệnh LONG (Bắt đáy / Uptrend):
  Entry Offset = [ ( dist_to_tf(ETH) - |dist_to_tf(BTC)| ) × vol_mult ] + base_buffer
  → Giá Limit = EMA200 * (1 + Entry Offset) (Nằm trên EMA200 làm mồi nhử hoặc lùi dưới EMA200 né râu)

H. CƠ CHẾ RẢI LƯỚI ĐA KHUNG ĐỒNG PHA & BỘ LỌC KHOẢNG CÁCH (MỚI NHẤT)
  1. Rải lưới đa khung đồng pha (Multi-Timeframe Grid):
     - Nguyên lý: Thay vì chỉ vào lệnh ở duy nhất 1 khung thời gian kích hoạt (tf_trigger), bot sẽ rải limit đồng thời tại EMA200 của toàn bộ các khung thời gian lớn hơn (lên tới H4) nếu chúng đồng pha xu hướng với H4 và khung kích hoạt đó.
     - Phân định DCA thông minh:
       • Chưa có vị thế: Rải limit tại toàn bộ các khung thời gian đồng pha mục tiêu.
       • Đã có vị thế: Dùng cơ chế khóa theo chu kỳ `pos_cycle_filled_tfs`. Khung thời gian nào đã khớp lệnh (filled) trong chu kỳ vị thế hiện tại thì sẽ không đặt Limit DCA lại ở khung đó nữa. Các khung chưa khớp (bất kể lớn hay nhỏ hơn `active_pos_tf`) đều được phép rải DCA nếu thỏa điều kiện. Khi toàn bộ vị thế đóng (TP/SL), danh sách này được reset, cho phép vào lại các khung nhỏ.
       • Tính độc lập của từng TF: Các điều kiện về xu hướng (REQUIRED_ACCUMULATION_CANDLES, QUANTUM_BUFFER_CANDLES, QUANTUM_FORTH_CANDLES, MAX_CYCLE_FAILURES và kiểm tra Squeeze) được đánh giá độc lập hoàn toàn cho từng khung thời gian trong lưới. Việc một khung thời gian cụ thể (chẳng hạn như khung thời gian cơ sở) bị dừng giao dịch (do sideway, nén tam giác hoặc nén ngược chiều) sẽ CHỈ áp dụng cho riêng khung đó, các khung lớn hơn vẫn tiếp tục rải lưới/DCA bình thường nếu thỏa mãn điều kiện của riêng chúng.
     - Mã hóa lệnh độc lập: Mỗi lệnh được gài `clOrdId` riêng biệt chứa tên khung thời gian (dạng chữ và số liền mạch không chứa ký tự đặc biệt, ví dụ: `scvlmtELM15...`) để bot có thể hủy/sửa độc lập từng khung mà không làm ảnh hưởng đến các lệnh khác trên sàn.
     - Volume gài lệnh (DCA Lũy tiến đa khung): Khối lượng của lệnh sẽ được nhân với hệ số **TF_VOLUME_MULTIPLIERS** tương ứng với từng khung thời gian. Việc này giúp trung bình giá (DCA) kéo về rất nhanh ở các khung lớn. Cấu hình mặc định: M5 (x1.0), M15 (x1.2), M30 (x1.4), H1 (x1.6), H2 (x1.8), H4 (x2.0). Cấu hình này có thể tùy chỉnh dễ dàng ở đầu file bot_main.py.
     - Tránh nhấp nháy/hủy đặt lại liên tục: Khi giá trị EMA200 hoặc đệm co giãn thay đổi siêu nhỏ (noise), để tránh hủy và đặt lại lệnh liên tục gây trễ lệnh và quá tải API, bot áp dụng dung sai so sánh giá: nếu lệnh cũ đang có trên sàn chênh lệch giá < 0.1% so với giá đích mới và giữ nguyên size, bot sẽ giữ nguyên lệnh cũ thay vì hủy đi đặt lại.
     - Tối ưu hóa cuộc gọi API: Tái sử dụng danh sách lệnh chờ khớp đã lấy ở đầu chu kỳ rải lệnh cho mọi khâu hủy, kiểm tra và đặt mới của các khung thời gian, giảm số lượt gọi API từ 8 cuộc gọi lặp xuống còn 0 cuộc gọi trên mỗi coin.
     
  2. Bộ lọc khoảng cách EMA200 (Closeness Filter):
     - Vấn đề: Nếu EMA200 của hai khung thời gian quá sát nhau, việc đặt 2 lệnh limit sẽ làm bot khớp lệnh kép gần như cùng một mức giá, mất tác dụng của việc chia nhỏ các lớp DCA.
     - Giải pháp: Đối với mỗi khung thời gian `tf` trong danh sách đồng pha, bot sẽ kiểm tra khoảng cách đến khung lớn hơn liền kề `tf + 1`.
       • Điều kiện lọc: | EMA200(tf + 1) - EMA200(tf) | / EMA200(tf) < DCA_GAP_THRESHOLD_PCT × TF_VOLUME_MULTIPLIERS[tf + 1] (mặc định cấu hình DCA_GAP_THRESHOLD_PCT = 0.5%)
       • Hành động: Nếu khoảng cách dưới ngưỡng này (quá sát nhau), bot sẽ TỰ ĐỘNG BỎ QUA entry tại `tf` và chuyển dịch (nhảy cóc) lên đặt dứt khoát tại entry của `tf + 1`.

I. HỆ THỐNG LƯU TRỮ TRẠNG THÁI BỀN VỮNG (PERSISTENT STATE SYSTEM) — z1948
===========================================================================================
File: json_data/{acc_name}_mtf_states.json

Mục đích: Tránh mất trạng thái khi tắt App/Bot, giúp bot tiếp tục liền mạch sau khi khởi động lại.

Các dữ liệu được lưu tự động sau mỗi chu kỳ quét nến:

| Nhóm dữ liệu            | Thuộc tính                         | Ý nghĩa                                           |
|-------------------------|------------------------------------|---------------------------------------------------|
| Nến đa khung (MTF)      | mtf_states[M5/M15/M30/H1/H2/H4]   | Số nến tích lũy (accum), lần vấp (fail), chiều    |
| Vị thế đang mở          | max_roi_long / max_roi_short       | Mức lãi cao nhất đạt được (MaxROI)                |
| Vị thế đang mở          | mae_max_pct_long / mae_max_pct_short | Mức lỗ gồng lớn nhất (MAE)                      |
| Lý do vào lệnh          | open_reason_long / open_reason_short | Lý do/chiến thuật đã vào lệnh                   |
| Lệnh vừa đóng           | last_closed_side / roi / reason    | Kết quả và lý do của trận đánh gần nhất           |

Cơ chế:
- ĐỌC: Khi bot khởi động, đọc file JSON phục hồi toàn bộ trạng thái trước đó.
- GHI: Tự động cập nhật an toàn (ghi qua file .tmp rồi os.replace) sau mỗi chu kỳ quét nến.
- RESET: Khi sếp nhấn nút 'Reset Đếm Nến' hoặc gõ lệnh `reset_nen`, file JSON bị XÓA hoàn toàn, bot đếm lại từ đầu.

# z1948


  CÁCH EMA = % khoảng cách giá live đến EMA200 target_tf | (%) thứ 2 = chênh so BTC
  
  ✜ TÌNH TRẠNG VỊ THẾ:
    ✧ [BTC] SHORT x30 -> Entry: 59,696.4 -> SL: 60,950.0 -> MaxROI/MAE: +0.1% / -0.0%
    ✧ [ETH] SHORT x30 -> Entry:  1,572.1 -> SL:  1,605.1 -> MaxROI/MAE: +0.0% / -13.3%
  ──────────────────────────────────────────────────────────────────────────────────────
  
  ☯ PHÂN TÍCH CẤU TRÚC REALTIME:
    ✧ [BTC]: Mở lệnh SHORT (59,696.4). Xu hướng Giảm tại [M5]: 
    ✧ [ETH]: Mở lệnh SHORT ( 1,572.1). Xu hướng Giảm tại [M5]: 
  =====...=====

Ký hiệu chế độ:
  ❶  = THUẬN XU HƯỚNG  — H4 thuận đến nhỏ, bộ lọc nến 60/12/2
  ❷  = XO LE HEDGE     — Ngược pha khung lớn cấp 2+, không cần nến đệm
  ❸  = PING-PONG NÉN   — Nén Squeeze + 2 TF tiệm cận, vol/3
  ·   = SIDEWAY / CHỜ  — Không đủ điều kiện


===========================================================================================
## VIII. CÁC FILE LIÊN QUAN
===========================================================================================
| File                | Mục đích                                              |
|---------------------|-------------------------------------------------------|
| bot_main.py         | Bot chính — toàn bộ engine giao dịch                 |
| .env                | API keys OKX, Telegram token/chatid, DATA_FOLDER     |
| data/*.json         | Lịch sử lệnh, thống kê winrate, AI training data     |
| PLAN_BOT_MAIN.md    | File này — tài liệu kiến trúc chiến lược             |


===========================================================================================
## IX. ĐIỂM ĐÁNG CHÚ Ý & CẬP NHẬT GẦN NHẤT (v23.x)
===========================================================================================
A. THỨ TỰ DASHBOARD CONSOLE (ĐÃ XÁC NHẬN)
  1. System Header (=====)
  2. ⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT   ← single-line per coin, hiện trước bảng
  3. Bảng COIN MTF (---table---)
  4. ✜ TÌNH TRẠNG VỊ THẾ            ← hiện sau bảng
  5. ☯ PHÂN TÍCH CẤU TRÚC REALTIME  ← cuối cùng

Format dòng chiến thuật:
  "       ❶ BTC: THUẬN XU HƯỚNG   Giảm từ H4 đến M30 — Entry EMA200-M30 ( Co giãn: {tk.current_vol_mult:.2f}x )"
  "       ❷ ETH: XO LE HEDGE      Thuận M15, nghịch H1 → EMA200-M15 | TP=EMA200-M30  ( Co giãn: {tk.current_vol_mult:.2f}x )"
  "       ❸ BTC: PING-PONG NÉN    Nén M30 → Bắt bẻ tại EMA200 M15 | TP=EMA200-M30  | Vol/3 ( Co giãn: {tk.current_vol_mult:.2f}x )"

B. TP/SL TỪNG CHẾ ĐỘ (ĐÃ XÁC NHẬN & ĐÃ CODE)
  ❶ THUẬN XU HƯỚNG:
    TP = SCALPING_TP_PCT × TF_MULTIPLIERS[tf]   (VD: H1 → 2.1% × 3.333 = 7.0%)
    SL = SCALPING_SL_PCT × TF_MULTIPLIERS[tf]   (= TP, symmetric)
    Lấy từ: globals_ref.SCALPING_TP_PCT * tf_mult

  ❷ XO LE HEDGE:
    TP = |EMA200(tf+1) - EMA200(tf)| / EMA200(tf) - 0.06%
         (khoảng cách đến EMA200 của TF lớn hơn 1 cấp, trừ buffer 0.06% chống rụt râu)
    SL = Đúng bằng reward_pct → RR 1:1
    Lưu vào: tracker.xole_tp_pct / tracker.xole_sl_pct

  ❸ PING-PONG NÉN:
    TP = |EMA200(big_tf) - EMA200(small_tf)| / EMA200(small_tf) - 0.06%
    SL = Đúng bằng reward_pct → RR 1:1
    Lưu vào: tracker.ping_pong_tp_pct / tracker.ping_pong_sl_pct
    Volume = vol / PING_PONG_VOL_DIVIDER (= 1/3 volume thường)
    Margin Mode = Isolated x50 (Tách biệt khỏi MAIN/XOLE Cross x100 để set TP/SL độc lập)

C. PHÂN BIỆT XO LE vs PING-PONG NÉN
  Điểm chung:
    - Cả 2 đều đánh ngược pha khung lớn.
    - Cùng công thức TP/SL: EMA200 cấp trên, RR 1:1.
  Khác biệt:
    XO LE HEDGE:
      + Điều kiện: 2 TF thuận chiều liền kề + TF cấp 2 ngược chiều
      + Không yêu cầu Squeeze
      + Volume = bình thường
      + Bypass BTC Filter + Macro Filter
    PING-PONG NÉN:
      + Điều kiện: big_tf đang Squeeze (nén ≥ ~30 nến, EMA34↔EMA89 ≤ 0.25%, EMA200 phẳng)
                   + small_tf tiệm cận sát EMA34/89 của big_tf (≤ 0.3%)
      + Volume = 1/3 (nhỏ hơn để kiểm soát rủi ro khi nổ bất ngờ)
      + Vẫn qua BTC Filter + Macro Filter (không bypass)
      + Ưu tiên CAO NHẤT (ghi đè cả Main Trend và Xo Le)

D. BỘ LỌC ƯU TIÊN VÀO LỆNH (THỨ TỰ TUYỆT ĐỐI)
  1. Ping-Pong Nén  (cao nhất — ghi đè tất cả)
  2. Xo Le Hedge    (trung bình — chỉ khi PP không kích)
  3. Main Trend     (cơ bản — cần đủ 60 nến, 12 buffer, 2 fail)
  [·] Sideway       (không có tín hiệu — đứng ngoài)
  Khi cả Long và Short đều có tín hiệu Main Trend → HEDGE MODE
    → Rải đồng thời 2 lệnh Limit LONG + SHORT 2 đầu

E. CÁC ĐIỂM DỄ NHẦM / LƯU Ý KỸ THUẬT
  1. QUANTUM_BUFFER_CANDLES (12): Số nến ngược chiều ĐƯỢC PHÉP trước khi fail tăng.
     → KHÔNG phải số nến chờ thêm sau khi cắt EMA200.
     → Sau 12 nến ngược chiều: fail += 1 (không dừng ngay).
     → Sau 2 lần fail: mới chuyển SIDEWAY.
  
  2. REQUIRED_ACCUMULATION_CANDLES (60): Cần 60 nến CÙNG CHIỀU EMA200 liên tiếp.
     → Áp dụng cho Main Trend và Xo Le Hedge, KHÔNG áp dụng cho Ping-Pong.
     → Xo Le vẫn yêu cầu tích lũy nến (Accum/Buffer) tại khung tf vào lệnh (và tf+1), còn Ping-Pong chỉ xét cấu trúc EMA nguyên thủy (Raw EMAs).
  
  3. DCA Khung Lớn: Bot có thể nhồi lệnh thêm nếu phát hiện tín hiệu ở TF lớn hơn.
     → Điều kiện: tf_weight(target) > tf_weight(active_pos_tf).
     → Không giới hạn số lần DCA nếu đáp ứng điều kiện.
  
  4. Hedge Mode được hỗ trợ đầy đủ: Long + Short cùng lúc trên 1 coin.
     → Khi hủy lệnh (BTC filter, etc.): chỉ hủy lệnh cùng chiều.
     → Xo Le BYPASS BTC/Macro nên có thể mở ngược chiều Main Trend đang chạy.
  
  5. Volume Spike Guard (vol > 3× TB20):
     → Hủy toàn bộ Limit chờ ngay lập tức.
     → Áp dụng cho cả 3 chế độ (không có chế độ nào bypass).
  
  6. EMA200 Drift Check trong Squeeze:
     → Không chỉ xét khoảng cách EMA34↔EMA89, mà còn kiểm tra EMA200 có phẳng không.
     → Drift > 0.3% trong 20 nến → KHÔNG công nhận là Squeeze (tránh trend dốc mạnh, chấp nhận dốc thoải ≤ 4 độ).
  
  7. Xo Le nhận TF cấp trên để tính TP (xl_target = EMA200 của tf+2):
     → Ví dụ: M15 Tăng, M30 Tăng, H1 Giảm → Entry = EMA200 M15, TP = EMA200 H1.
     → Đây chính là EMA200 của H1 (TF ngược chiều cấp 2 - tf+2) đóng vai trò là cản cứng đối nghịch.
  
  8. Đồng bộ khung thời gian Altcoin theo BTC:
     → Toàn bộ Altcoin sẽ bị ép chạy theo TF của BTC (`active_target_tf` của BTC).
     → Tín hiệu vào lệnh và cột khoảng cách EMA (`CÁCH EMA`) của Altcoin đều dựa trên TF này.

F. LOG PHÂN TÍCH REALTIME — CÁC TRẠNG THÁI CÓ THỂ XUẤT HIỆN
  Trạng thái                    | Nguyên nhân
  ------------------------------|--------------------------------------------------------------
  Chờ khớp LONG/SHORT [TF]     | Đã đặt Limit, đang đợi giá chạm EMA
  Kích hoạt Ping-Pong [TF]     | Squeeze 2 TF tiệm cận, đã đặt lệnh vol/3
  Đánh HEDGE MODE [TF/TF]      | Cả Long lẫn Short đều có tín hiệu, rải 2 đầu
  Dò trend [TF] → Chờ nến...  | Main Trend chưa đủ 60 nến tích lũy
  Dừng [TF] → Nén ngược chiều | back_count đang tăng (ngược chiều ≤ 12 nến)
  Dừng [TF] → Giá nhấp nhô    | fail >= 2, đang SIDEWAY
  Dừng [TF] → EMA hội tụ sát  | EMA34↔EMA200 < 0.15%, không còn định hướng
  Đứng ngoài [TF]              | SIDEWAY hoàn toàn, không có cặp TF đồng pha
  Entry [TF] tại Midpoint...   | 2 EMA đủ gần → dùng điểm giữa EMA200+EMA89
  Entry [TF] tại EMA200        | 2 EMA quá xa → chỉ dùng EMA200 chính

G. CÔNG THỨC ENTRY ĐÓN LÕM / ĐỆM CO GIÃN ALTCOIN (MỚI NHẤT)
  Mục đích: Không đặt Limit chính xác tại EMA200 mà đặt CÁCH MỘT ĐOẠN (bằng Entry Offset) dựa trên biến động của cả BTC và Altcoin để vừa đảm bảo làm mồi nhử dễ khớp, vừa tự động né râu khi thị trường có biến động mạnh.
  
  Công thức tính toán Entry Offset cho Altcoin:
  - dist_to_tf(ETH): Khoảng cách % từ giá ETH hiện tại tới cản EMA200 (giữ nguyên dấu, trên cản là dương (+), dưới cản là âm (-)).
  - dist_to_tf(BTC): Khoảng cách % tuyệt đối từ giá BTC hiện tại tới cản EMA200 (luôn lấy trị tuyệt đối dương (+)).
  - vol_mult: Hệ số co giãn động của Altcoin.
  - base_buffer: Đệm tĩnh theo từng TF.

  🔴 Dành cho lệnh SHORT (Bắt đỉnh / Downtrend):
  Entry Offset = [ ( |dist_to_tf(BTC)| + dist_to_tf(ETH) ) × vol_mult ] - base_buffer
  → Giá Limit = EMA200 * (1 + Entry Offset) (Nằm dưới EMA200 làm mồi nhử hoặc lùi trên EMA200 né râu)

  🟢 Dành cho lệnh LONG (Bắt đáy / Uptrend):
  Entry Offset = [ ( dist_to_tf(ETH) - |dist_to_tf(BTC)| ) × vol_mult ] + base_buffer
  → Giá Limit = EMA200 * (1 + Entry Offset) (Nằm trên EMA200 làm mồi nhử hoặc lùi dưới EMA200 né râu)

H. CƠ CHẾ RẢI LƯỚI ĐA KHUNG ĐỒNG PHA & BỘ LỌC KHOẢNG CÁCH (MỚI NHẤT)
  1. Rải lưới đa khung đồng pha (Multi-Timeframe Grid):
     - Nguyên lý: Thay vì chỉ vào lệnh ở duy nhất 1 khung thời gian kích hoạt (tf_trigger), bot sẽ rải limit đồng thời tại EMA200 của toàn bộ các khung thời gian lớn hơn (lên tới H4) nếu chúng đồng pha xu hướng với H4 và khung kích hoạt đó.
     - Phân định DCA thông minh:
       • Chưa có vị thế: Rải limit tại toàn bộ các khung thời gian đồng pha mục tiêu.
       • Đã có vị thế: Dùng cơ chế khóa theo chu kỳ `pos_cycle_filled_tfs`. Khung thời gian nào đã khớp lệnh (filled) trong chu kỳ vị thế hiện tại thì sẽ không đặt Limit DCA lại ở khung đó nữa. Các khung chưa khớp (bất kể lớn hay nhỏ hơn `active_pos_tf`) đều được phép rải DCA nếu thỏa điều kiện. Khi toàn bộ vị thế đóng (TP/SL), danh sách này được reset, cho phép vào lại các khung nhỏ.
       • Tính độc lập của từng TF: Các điều kiện về xu hướng (REQUIRED_ACCUMULATION_CANDLES, QUANTUM_BUFFER_CANDLES, QUANTUM_FORTH_CANDLES, MAX_CYCLE_FAILURES và kiểm tra Squeeze) được đánh giá độc lập hoàn toàn cho từng khung thời gian trong lưới. Việc một khung thời gian cụ thể (chẳng hạn như khung thời gian cơ sở) bị dừng giao dịch (do sideway, nén tam giác hoặc nén ngược chiều) sẽ CHỈ áp dụng cho riêng khung đó, các khung lớn hơn vẫn tiếp tục rải lưới/DCA bình thường nếu thỏa mãn điều kiện của riêng chúng.
     - Mã hóa lệnh độc lập: Mỗi lệnh được gài `clOrdId` riêng biệt chứa tên khung thời gian (dạng chữ và số liền mạch không chứa ký tự đặc biệt, ví dụ: `scvlmtELM15...`) để bot có thể hủy/sửa độc lập từng khung mà không làm ảnh hưởng đến các lệnh khác trên sàn.
     - Volume gài lệnh (DCA Lũy tiến đa khung): Khối lượng của lệnh sẽ được nhân với hệ số **TF_VOLUME_MULTIPLIERS** tương ứng với từng khung thời gian. Việc này giúp trung bình giá (DCA) kéo về rất nhanh ở các khung lớn. Cấu hình mặc định: M5 (x1.0), M15 (x1.2), M30 (x1.4), H1 (x1.6), H2 (x1.8), H4 (x2.0). Cấu hình này có thể tùy chỉnh dễ dàng ở đầu file bot_main.py.
     - Tránh nhấp nháy/hủy đặt lại liên tục: Khi giá trị EMA200 hoặc đệm co giãn thay đổi siêu nhỏ (noise), để tránh hủy và đặt lại lệnh liên tục gây trễ lệnh và quá tải API, bot áp dụng dung sai so sánh giá: nếu lệnh cũ đang có trên sàn chênh lệch giá < 0.1% so với giá đích mới và giữ nguyên size, bot sẽ giữ nguyên lệnh cũ thay vì hủy đi đặt lại.
     - Tối ưu hóa cuộc gọi API: Tái sử dụng danh sách lệnh chờ khớp đã lấy ở đầu chu kỳ rải lệnh cho mọi khâu hủy, kiểm tra và đặt mới của các khung thời gian, giảm số lượt gọi API từ 8 cuộc gọi lặp xuống còn 0 cuộc gọi trên mỗi coin.
     
  2. Bộ lọc khoảng cách EMA200 (Closeness Filter):
     - Vấn đề: Nếu EMA200 của hai khung thời gian quá sát nhau, việc đặt 2 lệnh limit sẽ làm bot khớp lệnh kép gần như cùng một mức giá, mất tác dụng của việc chia nhỏ các lớp DCA.
     - Giải pháp: Đối với mỗi khung thời gian `tf` trong danh sách đồng pha, bot sẽ kiểm tra khoảng cách đến khung lớn hơn liền kề `tf + 1`.
       • Điều kiện lọc: | EMA200(tf + 1) - EMA200(tf) | / EMA200(tf) < DCA_GAP_THRESHOLD_PCT × TF_VOLUME_MULTIPLIERS[tf + 1] (mặc định cấu hình DCA_GAP_THRESHOLD_PCT = 0.5%)
       • Hành động: Nếu khoảng cách dưới ngưỡng này (quá sát nhau), bot sẽ TỰ ĐỘNG BỎ QUA entry tại `tf` và chuyển dịch (nhảy cóc) lên đặt dứt khoát tại entry của `tf + 1`.

I. HỆ THỐNG LƯU TRỮ TRẠNG THÁI BỀN VỮNG (PERSISTENT STATE SYSTEM) — z1948
===========================================================================================
File: json_data/{acc_name}_mtf_states.json

Mục đích: Tránh mất trạng thái khi tắt App/Bot, giúp bot tiếp tục liền mạch sau khi khởi động lại.

Các dữ liệu được lưu tự động sau mỗi chu kỳ quét nến:

| Nhóm dữ liệu            | Thuộc tính                         | Ý nghĩa                                           |
|-------------------------|------------------------------------|---------------------------------------------------|
| Nến đa khung (MTF)      | mtf_states[M5/M15/M30/H1/H2/H4]   | Số nến tích lũy (accum), lần vấp (fail), chiều    |
| Vị thế đang mở          | max_roi_long / max_roi_short       | Mức lãi cao nhất đạt được (MaxROI)                |
| Vị thế đang mở          | mae_max_pct_long / mae_max_pct_short | Mức lỗ gồng lớn nhất (MAE)                      |
| Lý do vào lệnh          | open_reason_long / open_reason_short | Lý do/chiến thuật đã vào lệnh                   |
| Lệnh vừa đóng           | last_closed_side / roi / reason    | Kết quả và lý do của trận đánh gần nhất           |

Cơ chế:
- ĐỌC: Khi bot khởi động, đọc file JSON phục hồi toàn bộ trạng thái trước đó.
- GHI: Tự động cập nhật an toàn (ghi qua file .tmp rồi os.replace) sau mỗi chu kỳ quét nến.
- RESET: Khi sếp nhấn nút 'Reset Đếm Nến' hoặc gõ lệnh `reset_nen`, file JSON bị XÓA hoàn toàn, bot đếm lại từ đầu.

# z1948


- ISOLATE HEDGE: Độc lập hoàn toàn Limit/TP/SL của vị thế Xo Le Hedge (ngược chiều) với vị thế Main Trend (thuận chiều), khắc phục lỗi triệt tiêu/xóa nhầm TP/SL chéo giữa 2 vị thế đang chạy song song.

## J. NGƯỢC XU HƯỚNG (XO LE 2.0) & LOCK MAIN TREND — z2410
### J1. Đổi tên XO LE HEDGE → NGƯỢC XU HƯỚNG (❷)
Lệnh đánh ngược chiều Main Trend khi giá vượt ngưỡng 8% H4.

### J2. XOLE_TF_MULTIPLIERS (đảo ngược TF_MULTIPLIERS)
Mục đích: Khi đánh NGƯỢC XU HƯỚNG, TP/SL ở khung nhỏ phải xa nhất (M5 ×6.772), khung lớn gần nhất (H4 ×1.0).

| TF  | Hệ số XOLE | TP/SL thực (2.1% × hệ số) |
|-----|-----------|---------------------------|
| M5  | x6.772    | ~14.2%                    |
| M15 | x4.667    | ~9.8%                     |
| M30 | x3.333    | ~7.0%                     |
| H1  | x2.3333   | ~4.9%                     |
| H2  | x1.5333   | ~3.2%                     |
| H4  | x1.0      | ~2.1%                     |

### J3. XOLE_TF_VOLUME_MULTIPLIERS (đảo ngược TF_VOLUME_MULTIPLIERS)
Volume M5 lớn nhất (×2.0) → H4 nhỏ nhất (×1.0).

### J4. Lock ALL 6 TFs Main Trend khi >8% H4
Khi `is_macro_overextended = True` (giá cách H4 > 8%):
- `_blocked_tfs = ["M5", "M15", "M30", "H1", "H2", "H4"]` → toàn bộ Main Trend bị khóa
- Chỉ NGƯỢC XU HƯỚNG (XO LE) được phép mở lệnh (bypass)
- Khi giá hồi chạm H2 → mở khóa Main Trend

### J5. NGƯỢC XU HƯỚNG mở/đóng theo % H4

| Khoảng cách giá đến H4 | MAIN (❶) | NGƯỢC XU HƯỚNG (❷) |
|----------------------|-----------|---------------------|
| ≤ 8% | ✅ Mở (6 TF) | ❌ Đóng |
| > 8% | ❌ Đóng (lock 6 TF) | ✅ Mở (bypass) |
| Hồi chạm EMA200 H2 | ✅ Mở lại | ❌ Đóng lại |

## K. ALTCOIN DYNAMIC ENTRY — CÔNG THỨC H4 REFERENCE — z2390
### K1. Công thức Entry Altcoin (mới)
Thay vì dùng `btc_dist_ratio × elasticity` (cũ), bot dùng H4 làm tham chiếu cố định:

```
offset = alt_dist_h4 ± btc_dist_h4 × alt_vol_mult ± base_buffer
```

Trong đó:
- `alt_dist_h4` = (giá_alt - EMA200_H4_alt) / EMA200_H4_alt  (signed, có thể âm/dương)
- `btc_dist_h4` = abs(giá_btc - EMA200_H4_btc) / EMA200_H4_btc  (luôn dương)
- `alt_vol_mult` = hệ số biến động altcoin vs BTC (ETH = 1.3)
- `base_buffer` = BASE_ENTRY_OFFSET_PCT × TF_MULT[tf] = 0.06% × TF hệ số

**LONG:** `offset = alt_dist_h4 - btc_dist_h4 × vol_mult + base_buffer`  
**SHORT:** `offset = alt_dist_h4 + btc_dist_h4 × vol_mult - base_buffer`

Ví dụ: BTC -1.2%, ETH -1.3%, DOWNTREND (SHORT), vol_mult=1.3:
→ `offset = -1.3% + 1.2% × 1.3 - 0.41% = +0.15%`
→ Entry SHORT = EMA200_H4 × (1 + 0.15%) = hơi trên EMA200

### K2. Altcoin Fallback — Force Entry khi BTC có tín hiệu
Khi BTC có `allowed_short/long = True` nhưng Altcoin chưa có TF nào aligned → bot vẫn force đặt limit theo direction của BTC. Áp dụng cho Altcoin chưa có vị thế.

## L. MAIN TREND SIGNAL STANDALONE H4→M5 — z2355
Tín hiệu Main Trend giờ quét từng TF đơn lẻ từ H4→M5, không cần cặp liền kề đồng pha. Chỉ cần:
- `_is_tf_valid(tf)` = True (accum ≥ 60, fail < 2, side rõ ràng)
- `_ema_confirms(tf, direction)` = True (EMA34/89 xếp lớp đúng chiều)

## M. H4 FLIP CLOSE — ĐÓNG VỊ THẾ KHI H4 ĐẢO CHIỀU — z2410
Khi H4 side đảo chiều + accum ≥ 60:
- `under → above`: Market close toàn bộ SHORT, chuyển sang LONG
- `above → under`: Market close toàn bộ LONG, chuyển sang SHORT

## N. DASHBOARD CÁCH EMA 200 [H4] — z2390
Cột "CÁCH EMA" đổi thành "CÁCH EMA 200" — luôn hiển thị khoảng cách tới EMA200-H4 (thay vì target_tf).

**BTC:** Hiển thị entry thực (có đệm lõm):
```
[H4] -1.53%   (UPTREND: dist - BASE_ENTRY_OFFSET_PCT × TF_MULT[H4] × 100)
[H4] -0.71%   (DOWNTREND: dist + buffer)
```

**Altcoin:** Hiển thị raw distance + entry offset:
```
[H4] +3.21% (+5.30%)
```
Trong đó `(+5.30%)` = offset entry thực tế (alt_dist + btc_dist × vol_mult ± buffer).

## 6. GIAO DIỆN & BÁO CÁO
- Console UI: Các chiến thuật và tín hiệu được báo cáo nhóm theo Logic Giao Dịch (ưu tiên hiển thị lệnh cùng chiều Long/Short và cùng Timeframe ở gần nhau) (MAIN, XOLE, PINGPONG, LIMIT) thay vì nhóm theo từng coin, giúp người dùng dễ dàng theo dõi toàn cảnh các cụm lệnh đang rải.

- Sửa lỗi NameError: Định nghĩa hàm `get_ema200_for_tf` trong `bot_main.py` để lấy giá trị EMA200 cho logic lọc Closeness Filter.

- Sửa lỗi NameError globals_ref: Định nghĩa biến globals_ref trỏ đến module hiện tại bằng `sys.modules[__name__]` ở đầu `bot_main.py` để sửa lỗi thiếu reference truy xuất config.


## X. CHUẨN MỰC KIẾN TRÚC MẠNG & XỬ LÝ LỖI (Cập nhật 23/07/2026 - z3400)
**QUY TẮC BẤT DI BẤT DỊCH DÀNH CHO MỌI AI CODER (CLINE/DEEPSEEK/GEMINI):**

1. **TUYỆT ĐỐI CẤM SỬ DỤNG except: pass TRONG CORE TRADING:**
   - Tại các file như ot_orders.py, ot_strategy.py, và ot_api.py, tuyệt đối không dùng except: pass để "nuốt lỗi" khi giao tiếp với sàn OKX (Vào lệnh, Hủy lệnh, Fetch nến, Lấy số dư).
   - Nếu có lỗi, BẮT BUỘC phải bắt và ghi log rõ ràng: except Exception as e: hft_logger.error(f"Lỗi API: {e}"). Điều này giúp hệ thống không bị mù trạng thái khi mất mạng.

2. **CƠ CHẾ RETRY BẮT BUỘC (API RATE LIMIT):**
   - Lớp giao tiếp ot_api.py (cả Sync và Async) phải luôn giữ cơ chế lặp or attempt in range(max_retries) (Mặc định 3 lần).
   - Các Exception BẮT BUỘC PHẢI BẮT trong vòng lặp Sync: (requests.exceptions.RequestException, json.JSONDecodeError, ValueError).
   - Các Exception BẮT BUỘC PHẢI BẮT trong vòng lặp Async: (asyncio.TimeoutError, aiohttp.ClientError, json.JSONDecodeError, ValueError).
   - Sàn OKX thường xuyên ném ra mã HTTP 429, 50011, 50026, hoặc đôi khi là trang lỗi HTML (502 Bad Gateway) gây lỗi JSON. Bot phải lùi lại 1 giây (sleep(1)) và retry thay vì crash văng App.

3. **QUẢN LÝ TIẾN TRÌNH & QTHREAD (GRACEFUL SHUTDOWN):**
   - BotSubprocessWorker trong gui_main.py chạy độc lập với giao diện chính.
   - Khi closeEvent (Tắt App) được gọi, không được block GUI Thread. Phải gọi .stop() cho tất cả các Bot chạy song song, sau đó mới tiến hành .wait(3000) và .terminate().
   - Trình phát âm thanh toàn cục (_GLOBAL_AUDIO_PLAYERS) phải được .stop() và .clear() khi tắt App để tránh lỗi QThread: Destroyed while thread is still running.


## XI. QUY CHUẨN VÀ LOGIC VẬN HÀNH BOT SMC (SUB2 - SMART MONEY CONCEPTS)
*(Cập nhật chuẩn hóa: 19/09/2026 - zWebSMC)*

### 1. Bản Chất Kiến Trúc Order Block (OB) & Lọc Mitigation
- **Bullish Order Block (OB Long):** Khối nến giảm cuối cùng trước sóng tăng mạnh phá vỡ cấu trúc (tạo FVG). Hiển thị dải màu xanh dương (`rgba(21, 101, 192, 0.2)`). Đóng vai trò là khối cản hỗ trợ (Support/Demand).
- **Bearish Order Block (OB Short):** Khối nến tăng cuối cùng trước sóng giảm mạnh phá vỡ cấu trúc (tạo FVG). Hiển thị dải màu đỏ (`rgba(198, 40, 40, 0.2)`). Đóng vai trò là khối cản kháng cự (Resistance/Supply).
- **Bộ lọc loại bỏ OB đã bị đâm thủng (Mitigation Filter):**
  - Khối Bullish OB bị loại bỏ ngay khi có nến đóng cửa thấp hơn đáy OB (`close < ob.low`).
  - Khối Bearish OB bị loại bỏ ngay khi có nến đóng cửa cao hơn đỉnh OB (`close > ob.high`).
  - Đảm bảo trên biểu đồ chỉ lưu giữ các vùng OB còn nguyên hiệu lực phòng thủ.

### 2. Quy Tắc Ánh Xạ 1-1: Khối OB → Box Vị Thế Long / Short
Mọi Box Long/Short vẽ trên biểu đồ bắt buộc phải ánh xạ trực tiếp và trùng khớp 100% với các khối OB hiển thị:
- **OB Long (xanh dương) → BẮT BUỘC TƯƠNG ỨNG VỚI BOX LONG:**
  - **Entry:** Luôn đặt chính xác tại **Biên Trên** của OB (`entryPrice = ob.high`).
  - **Stop Loss (SL):** Luôn đặt chính xác tại **Biên Dưới** của OB (`slTarget = ob.low`), dính khít vào đáy khối OB xanh.
  - **Take Profit (TP):** Phía trên theo tỷ lệ 1.5R dựa trên chiều cao OB (`tpTarget = ob.high + (ob.high - ob.low) * 1.5`).
- **OB Short (đỏ) → BẮT BUỘC TƯƠNG ỨNG VỚI BOX SHORT:**
  - **Entry:** Luôn đặt chính xác tại **Biên Dưới** của OB (`entryPrice = ob.low`).
  - **Stop Loss (SL):** Luôn đặt chính xác tại **Biên Trên** của OB (`slTarget = ob.high`), dính khít vào đỉnh khối OB đỏ.
  - **Take Profit (TP):** Phía dưới theo tỷ lệ 1.5R dựa trên chiều cao OB (`tpTarget = ob.low - (ob.high - ob.low) * 1.5`).

### 3. Chu trình Vận Hành Lệnh (Breakout → Sliding Waiting Box → Retest → Fixed Box)
- **Giai đoạn 1: Breakout (Thoát ly OB):** Sau khi hình thành OB, giá phải bứt phá thoát hoàn toàn ra ngoài vùng OB (`low > entryPrice` với Long, `high < entryPrice` với Short).
- **Giai đoạn 2: Box Chờ Tịnh Tiến (Sliding Waiting Box):** Trong suốt thời gian giá chưa quay về, box Long/Short ở trạng thái chờ (`waiting`), cạnh bên trái **luôn dóng thẳng hàng theo cây nến live hiện tại**, vươn sang phải 10 nến và liên tục tịnh tiến sang phải theo từng cây nến mới.
- **Giai đoạn 3: Retest & Fix Vị Trí:** Khi có cây nến sau đó quay đầu (pullback) vòng về chạm đúng biên entry của OB (`c.low <= entryPrice` với Long, `c.high >= entryPrice` với Short) mà không thủng SL, box **dừng tịnh tiến và FIX vị trí bắt đầu** tại chính cây nến đó (`entryTime = candles[hitEntryIdx].time`).
- **Giai đoạn 4: Chốt Lời / Cắt Lỗ & Fix Độ Rộng Box:** Khi nến sau đó chạm TP hoặc SL, độ rộng của box sẽ dừng lại và **cố định vĩnh viễn** tại cây nến chạm TP/SL (`exitTime = c.time`).

### 4. Kỷ Luật Vào Lệnh: Mỗi OB 1 Lệnh Duy Nhất (Không Overlap)
- Mỗi khối OB chỉ được phép vào **DUY NHẤT 1 LỆNH**: Khớp TP hay SL 1 lần là OB đó hoàn tất (mitigated), tuyệt đối không đặt thêm lệnh limit ở OB đó nữa.
- **Không mở lệnh chồng lấn (`lastExitIdx`):** Trong khi một lệnh đang mở chạy từ entry đến exit, bot không mở thêm lệnh nào khác, triệt tiêu hoàn toàn hiện tượng các box bị đè nhau di dít trong vùng sideway.

### 5. Chuẩn Hiển Thị Giao Diện & Bảng Backtesting
- **Trục giá (Right Price Scale):** Định dạng chuẩn Hyperliquid (ngăn cách hàng nghìn bằng dấu chấm, phần thập phân bằng dấu phẩy theo `vi-VN`). BTC $\ge 10.000$ không số lẻ, ETH 1 số lẻ, NEAR 4 số lẻ. Độ rộng trục giá co nhỏ tự động vừa khít chữ số, không thừa khoảng đen bên phải.
- **Bảng Backtesting:** Bảng nổi nằm sát mép trục giá, hiển thị 4 chỉ số minh bạch: `Total Entries`, `Wins`, `Losses`, `Winrate (%)`. Đã loại bỏ chỉ số `Total Profit` không cần thiết.
- **Bảo toàn thẩm mỹ biểu đồ:** Trên biểu đồ chỉ render tối đa 15 box vị thế gần nhất để nến luôn thông thoáng, sạch đẹp, đúng chuẩn TradingView chuyên nghiệp.
