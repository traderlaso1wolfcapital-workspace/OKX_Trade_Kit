# KẾ HOẠCH TRIỂN KHAI BOTS/SUB3 (CHIẾN THUẬT LIQUIDATION)

## 1. TỔNG QUAN CHIẾN THUẬT
- **Core Logic:** Candle Range Theory (CRT) & Liquidation Sweep.
- **Mục tiêu:** Bắt nhịp quét thanh lý (quét stoploss của đám đông) tại các đỉnh/đáy nến động lượng, sau đó vào lệnh khi có xác nhận từ Order Block.
- **Trạng thái:** `Waiting For Bulky Candle` -> `Waiting For Side Retest` -> `Waiting For OB` -> `Waiting For OB Retracement` -> `Enter Position`.

## 2. CẤU HÌNH THÔNG SỐ (User Verified)
- **Timeframes:** 
  - Khung lớn (HTF): `1H` (để tìm nến Bulky).
  - Khung nhỏ (LTF): `5m` (để tìm Sweep, OB và Entry).
- **Entry Mode:** CHỈ DÙNG ORDER BLOCK (OB). Bỏ qua FVG.
- **TP/SL Method:** DYNAMIC. 
  - SL = Giá Entry ± (ATR * `slATRMult`). 
  - TP = Giá Entry ± Khoảng cách SL * `DynamicRR`.
- **Retracement:** TRUE. Bắt buộc giá phải quay lại chạm vào vùng Order Block mới kích hoạt điểm vào lệnh.

## 3. THUẬT TOÁN CHI TIẾT
### Giai đoạn 1: Tìm nến dẫn hướng (Bulky Candle) trên HTF (1H)
- Duyệt lịch sử nến 1H gần nhất.
- Nến Bulky khi: `True Range (High - Low) > ATR(50) * 2.1`.
- Ghi nhận `bulkyHigh` và `bulkyLow`.

### Giai đoạn 2: Quét Thanh Lý (Liquidation Sweep) trên LTF (5m)
- Liên tục check nến 5m so với vùng `[bulkyLow, bulkyHigh]`.
- **Bullish Sweep:** Giá quét qua `bulkyLow` (Low < bulkyLow) và rút râu đóng nến bên trên (Close >= bulkyLow).
- **Bearish Sweep:** Giá quét qua `bulkyHigh` (High > bulkyHigh) và đóng nến bên dưới (Close <= bulkyHigh).
- *(Nếu đóng nến 5m hoàn toàn vượt qua vùng Bulky thì Reset trạng thái).*

### Giai đoạn 3: Chờ xác nhận (Order Block) & Retest (5m)
- **Sau khi có Bullish Sweep:** Chờ một Bullish Order Block (OB) hình thành trên khung 5m.
- Khi xuất hiện OB, vì `Retracement = True`, hệ thống CHƯA vào lệnh vội, mà lưu lại giá vùng OB (`ob_top`, `ob_bottom`). Chờ các nến 5m tiếp theo có `Low <= ob_top` (chạm/retest lại OB) mới kích hoạt Long.
- **Sau khi có Bearish Sweep:** Chờ một Bearish OB hình thành. Lưu vùng OB và chờ các nến tiếp theo có `High >= ob_bottom` mới kích hoạt Short.

### Giai đoạn 4: Tính toán SL, TP & Ra Tín Hiệu
- Tính toán theo Dynamic:
  - Long SL = Entry - ATR * `slATRMult`. Long TP = Entry + (Entry - SL) * `DynamicRR`.
  - Short SL = Entry + ATR * `slATRMult`. Short TP = Entry - (SL - Entry) * `DynamicRR`.
- Trả về cấu trúc JSON để Bot đặt lệnh.

## 4. CẤU TRÚC CODE (Dành cho Coder / Cline)
1. Tạo thư mục `zProjects/OKX_Trade_Kit/bots/sub3/`.
2. `sys_bot_sub3.py`: Main process. Giống sub1/sub2 (setup logging, load config, vòng lặp sleep, ghi file pid, check stop flag).
3. `sys_liquid_strategy.py`: Class `LiquidationStrategy`. Chứa logic 4 giai đoạn. Xử lý state machine.
4. `utils_ob.py`: Hàm toán học tính ATR, nhận diện Order Block.
5. Cập nhật `.agents/ISSUE_TRACKER.md` để ghi chú đã xây dựng xong core bot sub3.
