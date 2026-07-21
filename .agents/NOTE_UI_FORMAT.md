# QUY CHUẨN THIẾT KẾ GIAO DIỆN TERMINAL (UI FORMAT GUIDE)

Tài liệu này ghi nhớ toàn bộ quy chuẩn thiết kế giao diện hiển thị Terminal cho hệ thống OKX Trading Bot v23.x.
Mọi bot con (`bot_sub1.py`, `sys_bot_trinhsat.py`, `sys_bot_quansu.py`...) phải tuân thủ theo `bot_main.py` làm chuẩn.

Cập nhật lần cuối: 2026-06-30 (Đồng bộ theo PLAN_BOT_MAIN.md v23.x — z1948)

---

## 1. Độ Rộng Giao Diện Mặc Định (Line Width)

- Mỗi dòng hiển thị có độ dài chính xác là **97 ký tự**.
- **Đường phân cách chính (Double border)**: `=` × 97
- **Đường phân cách phụ (Single border)**: `-` × 97
- **Word-wrap**: Dùng hàm `smart_print()` để tự động xuống dòng, đảm bảo từ ngữ không bị cắt đứt giữa chừng. Dòng tiếp theo căn lề 4 dấu cách.

```python
def smart_print(text, width=97, indent="    "):
    import textwrap
    wrapped = textwrap.wrap(text, width=width, subsequent_indent=indent)
    for line in wrapped:
        print(line)
```

---

## 2. Cấu Trúc Tiêu Đề Bot (Bot Header)

Dòng đầu tiên không viền: hiển thị `tên_file.py` và file `.env` đang dùng.
Tiếp theo là 2 dòng nội dung kẹp giữa 2 border `=`.

```text
bot_main.py .env
=================================================================================================
☢  THỢ SĂN EMA200 v23.0 | EQUITY: 2,006.88 USDT (+0.34%)     | RISK: 3.0%     | WINRATE: 67.5% / 12
    14:45:30            | PNL   : +6.88 USD                    | VOL: 250.0 U   | R/R    : 1 / 2.3
=================================================================================================
```

### Bố cục cột tiêu đề (col widths: 23 | 34 | 14 | 17):

| Cột | Dòng 1 | Dòng 2 |
|-----|--------|--------|
| C1  | `☢  THỢ SĂN EMA200 v23.0` | `    HH:MM:SS    ` |
| C2  | `EQUITY: xxx USDT (+x.xx%)` | `PNL   : +xxx USD` |
| C3  | `RISK: x.x%` | `VOL: xxx.x U` |
| C4  | `WINRATE: xx.x% / N` | `R/R    : 1 / x.x` |

---

## 3. Hệ Thống Biểu Tượng (Icon Rules)

### A. Tiêu đề mục lớn (cố định)

| Biểu tượng | Ý nghĩa |
|------------|---------|
| `☢` | Tên bot / Phiên bản |
| `⚡` | CHIẾN THUẬT ĐANG KÍCH HOẠT |
| `✜` | TÌNH TRẠNG VỊ THẾ |
| `☯` | PHÂN TÍCH CẤU TRÚC REALTIME |

### B. Nội dung dòng chi tiết

- Mỗi dòng nội dung bắt đầu bằng `  ✧ ` (2 dấu cách + ✧ + 1 dấu cách).
- Kết nối các ý dùng `->` (mũi tên ASCII), **không** dùng `➔` hay `→`.
- Các chế độ chiến thuật ký hiệu bằng số tròn:
  - `①` = THUẬN XU HƯỚNG
  - `②` = XO LE HEDGE
  - `③` = PING-PONG NÉN
  - `·` = SIDEWAY / CHỜ (không có tín hiệu)

### C. Trong bảng số liệu (Table)

| Ký tự | Ý nghĩa |
|-------|---------|
| `▲` | Tăng / nến đang Above EMA |
| `▼` | Giảm / nến đang Under EMA |
| `■` | Sideway / không xác định |
| `◆` | Pivotal / tiếp xúc EMA |

---

## 4. Phần ⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT

**Vai trò**: Hiển thị trạng thái chiến thuật hiện tại của từng coin dưới dạng một dòng duy nhất cho mỗi coin, đặt trực tiếp dưới Header.

### Format dòng chiến thuật:
```text
⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT:
  ✧ BTC: ① THUẬN XU HƯỚNG   Giảm từ H4 xuống M30 — Entry EMA200-M30 | TP/SL × TF_MULT
  ✧ ETH: ② XO LE HEDGE      Thuận M15, nghịch H1 → EMA200-M15 | TP=EMA200-H1 RR1:1 | Bypass BTC/Macro
```

---

## 5. Bảng Theo Dõi MTF (Multi-Timeframe Table)

Phân cách phía trên bằng đường phân cách phụ `-` × 97 và phía dưới bằng `-` × 97.

```text
-------------------------------------------------------------------------------------------------
 COIN |   M5   |  M15   | [M30]  |   H1   |   H2   |   H4   |  PRICE   | CÁCH EMA
-------------------------------------------------------------------------------------------------
 BTC  | +236-0 | -399-1 | -219-0 | -114-0 | - 60-0 | -197-0 | 60,545.0 | [M30] -0.47%
 ETH  | +311-0 | -204-1 | -219-0 | -108-0 | - 60-0 | -262-0 |  1,595.3 | [M30] -0.68% (0.21%)
-------------------------------------------------------------------------------------------------
```

### Quy tắc bảng MTF:
- **Cột TF đang active**: đặt trong ngoặc vuông `[M30]` thay vì `M30` ở header dòng đầu.
- **Cột MTF state**: định dạng `{arrow/sign}{accum}-{fail}`. Ví dụ: `+236-0` (nằm trên EMA200, 236 nến tích lũy, 0 lần fail) hoặc `-399-1` (nằm dưới EMA200, 399 nến tích lũy, 1 lần fail).
- **Cột CÁCH EMA**:
  - BTC: `[TF] +/-x.xx%` (% khoảng cách giá live đến EMA200 target_tf).
  - Altcoin: `[TF] +/-x.xx% (y.yy%)` — thêm `(y.yy%)` là hiệu số chênh lệch khoảng cách giữa BTC và Altcoin tới EMA200 (dùng để lọc đồng pha hoặc tính đệm lùi entry).
- **Đồng bộ khung thời gian Altcoin theo BTC**: Toàn bộ Altcoin sẽ bị ép chạy theo TF của BTC (`active_target_tf` của BTC). Cả cột `CÁCH EMA` và tín hiệu vào lệnh của Altcoin đều dựa trên TF này.

---

## 6. Phần ✜ TÌNH TRẠNG VỊ THẾ

**Vai trò**: Hiển thị **snapshot tức thời** trạng thái vị thế đang mở từ sàn giao dịch OKX. Không chứa lịch sử hay lý do. Đặt ngay dưới bảng MTF.

### 6.1. Khi đang có lệnh mở
```text
✜ TÌNH TRẠNG VỊ THẾ:
  ✧ [BTC] SHORT x30 -> Entry: 60,329.7 -> SL: 63,285.8 -> MaxROI: +0.5% / MAE: -1.2% -> Co giãn: 0.83x
  ✧ [ETH] Chưa có vị thế -> Số dư an toàn -> Co giãn: 0.98x
```

### 6.2. Khi không có lệnh nào
```text
✜ TÌNH TRẠNG VỊ THẾ:
  ✧ [BTC] Chưa có vị thế -> Số dư an toàn -> Co giãn: 0.83x
  ✧ [ETH] Chưa có vị thế -> Số dư an toàn -> Co giãn: 0.98x
```

### 6.3. Các trường hiển thị khi có vị thế
```
[COIN] LONG/SHORT x{leverage} -> Entry: {giá vào} -> SL: {giá SL} -> MaxROI: +{x}% / MAE: -{y}% -> Co giãn: {z}x
```

| Trường | Nguồn dữ liệu |
|--------|--------------|
| LONG/SHORT | `tracker.has_long` / `tracker.has_short` |
| Entry | `tracker.active_avg_px_long/short` |
| SL | `tracker.active_sl_px_long/short` |
| MaxROI | `tracker.max_roi_long/short` |
| MAE | `tracker.mae_max_pct_long/short * leverage` |
| Co giãn | `tracker.current_vol_mult` |

---

## 7. Phần ☯ PHÂN TÍCH CẤU TRÚC REALTIME

**Vai trò**: Nhật ký lý luận — giải thích **tại sao** bot đã mở/đóng lệnh, và đang **hành động** gì tiếp theo. Đặt ở vị trí cuối cùng của Dashboard.

### 7.1. Lịch sử lệnh đã đóng
**Format**: `✧ [COIN]: Đóng lệnh {SIDE} ({+/-pnl}%). Lý do: {last_closed_reason}`
```text
  ✧ [BTC]: Đóng lệnh SHORT (+1.6%). Lý do: [Squeeze_Escape_Exit] Thoát lệnh sớm do Nén tam
    giác (Squeeze Breakout) tại M15.
```

### 7.2. Lý do mở lệnh hiện tại
**Format**: `✧ [COIN]: Mở lệnh {SIDE} ({entry_px}). Lý do: {open_reason}`
```text
  ✧ [BTC]: Mở lệnh SHORT (65,324.0). Lý do: Xu hướng Giảm tại [M15]: Đồng pha EMA34/89/200 xếp lớp
```

### 7.3. Trạng thái hành động hiện tại (khi chưa có lệnh)
**Format**: `✧ [PP0 - COIN]: Action: {mô tả hành động} -> Lý do: {lý do}`

| Điều kiện | Nội dung hiển thị |
|-----------|-------------------|
| Ping-Pong + Limit LONG | `[PP0 - BTC]: Action: Kích hoạt Ping-Pong (LONG M5->M15) -> Limit tại 60,033.0 (83U). Lý do: Tận dụng nén giá hẹp.` |
| Ping-Pong + Limit SHORT | `[PP0 - BTC]: Action: Kích hoạt Ping-Pong (SHORT M5->M15) -> Limit tại 65,800.0 (83U). Lý do: Tận dụng nén giá hẹp.` |
| HEDGE | `[PP0 - BTC]: Action: Đánh HEDGE MODE -> Cài 2 đầu LONG [M5] và SHORT [M15]. Lý do: Thị trường đi ngang biên độ lớn.` |
| Chờ Limit LONG | `[PP0 - BTC]: Action: Chờ khớp Limit LONG (250U) quanh 65,000.0. Lý do: Xu hướng Tăng & Các TF đồng thuận.` |
| Chờ Limit SHORT | `[PP0 - BTC]: Action: Chờ khớp Limit SHORT (250U) quanh 65,500.0. Lý do: Xu hướng Giảm & Các TF đồng thuận.` |
| Squeeze | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: Nén tam giác hẹp (Squeeze Breakout) tại M15, rủi ro xả mạnh.` |
| EMA co hẹp | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: EMA co hẹp nhanh (Delta: -0.xxxx) báo hiệu sắp quét 2 đầu.` |
| Sideway Vấp | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: Giá nhấp nhô nhiễu trục EMA200 (2/2 lần).` |
| Dò trend | `[PP0 - BTC]: Action: Tiếp tục Dò trend -> Lý do: Chờ đóng nến ổn định để xác nhận trục (34/60 ▲).` |
| Back ngược chiều | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: Xuất hiện nén ngược chiều mạnh (Back 3/5).` |
| EMA hội tụ | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: Các đường EMA hội tụ quá sát nhau, có dấu hiệu mất xu hướng.` |
| RSI cực đoan | `[PP0 - BTC]: Action: Dừng rải Limit -> Lý do: Chỉ số RSI cực đoan (85.0), rủi ro đảo chiều cao.` |
| Sideway toàn khung | `[PP0 - BTC]: Action: Đứng ngoài quan sát -> Lý do: Không có 2 Khung thời gian liền kề đồng pha.` |
| Entry xa EMA | `[PP0 - BTC]: Action: Tính toán Entry -> Lý do: Trục 89-200 rộng (0.35%), đang tính đệm lùi.` |
| Entry gần EMA | `[PP0 - BTC]: Action: Tính toán Entry -> Lý do: Trục 89-200 hẹp (0.08%), chuẩn bị bám sát EMA200.` |

---

## 8. Ví Dụ Dashboard Hoàn Chỉnh (v23.x)

```text
bot_main.py .env
=================================================================================================
☢  THỢ SĂN EMA200 v23.0 | EQUITY: 2,006.88 USDT (+0.34%)     | RISK: 3.0%     | WINRATE: 67.5% / 12
    14:45:30            | PNL   : +6.88 USD                    | VOL: 250.0 U   | R/R    : 1 / 2.3
=================================================================================================

⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT:
  ✧ BTC: ① THUẬN XU HƯỚNG   Giảm từ H4 xuống M30 — Entry EMA200-M30 | TP/SL × TF_MULT
  ✧ ETH: ② XO LE HEDGE      Thuận M15, nghịch H1 → EMA200-M15 | TP=EMA200-H1 RR1:1 | Bypass BTC/Macro

-------------------------------------------------------------------------------------------------
 COIN |   M5   |  M15   | [M30]  |   H1   |   H2   |   H4   |  PRICE   | CÁCH EMA
-------------------------------------------------------------------------------------------------
 BTC  | +236-0 | -399-1 | -219-0 | -114-0 | - 60-0 | -197-0 | 60,545.0 | [M30] -0.47%
 ETH  | +311-0 | -204-1 | -219-0 | -108-0 | - 60-0 | -262-0 |  1,595.3 | [M30] -0.68% (0.21%)
-------------------------------------------------------------------------------------------------

✜ TÌNH TRẠNG VỊ THẾ:
  ✧ [BTC] SHORT x30 -> Entry: 60,329.7 -> SL: 63,285.8 -> MaxROI: +0.5% / MAE: -1.2% -> Co giãn: 0.83x
  ✧ [ETH] Chưa có vị thế -> Số dư an toàn -> Co giãn: 0.98x
  
-------------------------------------------------------------------------------------------------

☯ PHÂN TÍCH CẤU TRÚC REALTIME:
  ✧ [BTC]: Đóng lệnh SHORT (+1.6%). Lý do: [Squeeze_Escape_Exit] Thoát lệnh sớm do Nén tam
    giác (Squeeze Breakout) tại M15.
  ✧ [BTC]: Mở lệnh SHORT (60,545.0). Lý do: Xu hướng Giảm tại [M30]: Đồng pha EMA34/89/200 xếp lớp
  ✧ [ETH]: Xo Le Hedge (LONG M15): Cấu trúc đảo chiều sớm ngược pha H1.
=================================================================================================
```

---

## 9. Quy Chuẩn Định Danh Phiên Bản (Version Hash)

- Mỗi khi sửa đổi code bất kỳ file bot nào, cập nhật **mã băm** ở dòng cuối cùng:
  ```python
  # z8247
  ```
- Mục tiêu: So sánh file trên máy lập trình vs file đang chạy trên server để xác nhận đồng bộ.

---

## 10. Ghi Chú Quan Trọng Khi Mở Rộng

- **Thứ tự in bắt buộc**:
  1. System Header (bắt đầu bằng `=` × 97)
  2. `⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT`
  3. Bảng COIN MTF (bọc bằng `-` × 97 ở trên và dưới)
  4. `✜ TÌNH TRẠNG VỊ THẾ`
  5. `☯ PHÂN TÍCH CẤU TRÚC REALTIME` (cuối cùng)
- **Thêm cột vào bảng MTF**: Phải tính lại tổng độ rộng đảm bảo ≤ 97 ký tự.
- **Thêm trường vào các phần chi tiết**: Luôn dùng `smart_print()` để tránh tràn dòng và tự thụt dòng sau 4 khoảng trắng.
- **Không bao giờ** để lý luận (reason/logic) lẫn với trạng thái số liệu (ROI/MAE/SL) trong cùng 1 khối.
