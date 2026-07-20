# Kế Hoạch Khắc Phục Lỗi Tính Đệm Lùi (Offset) Cho Altcoin

## 1. Phân Tích Nguyên Nhân Lỗi (Root Cause)
CEO đã phát hiện một điểm vô lý cực kỳ tinh tế trong thuật toán tính giá Limit của Altcoin khi neo theo BTC.
**Thuật toán hiện tại (Bị lỗi):**
- Hệ thống đang lấy `% Khoảng cách từ Live BTC tới Limit BTC`.
- Sau đó nhân `%` này với `vol_mult` của Altcoin (1.3) và áp vào Giá Live Altcoin.
- *Hậu quả:* Vì `Live BTC` luôn biến động sát theo `Limit BTC` mỗi giây, nên khoảng cách này liên tục bị co hẹp lại. Khi BTC có biến động nhẹ giật xuống, khoảng cách này về gần `0%`, khiến Altcoin cũng bị đặt Limit ở mức `0%` (tức là ngay sát giá Live hiện tại như CEO thấy là 1873.06 so với 1873.82).

**Thuật toán kỳ vọng của CEO (Chính xác):**
- Tính `% Khoảng cách từ Live BTC tới Cản EMA200 BTC`.
- Nhân `%` này với `vol_mult` (Ví dụ 1.3 của ETH).
- Cuối cùng, **cộng (+) hoặc trừ (-)** thêm đệm lùi chuẩn của riêng Altcoin (được tính bằng `base_buffer * vol_mult * tf_vol_mult`).

## 2. Bản Vẽ Kiến Trúc Sửa Lỗi (Implementation Steps)

### 📂 File cần sửa: `z_bot_sub1/bot_strategy.py`
**Vị trí:** Xung quanh dòng 570-586, trong khối lệnh xử lý `if _is_alt_synced:`.
Cline cần xóa bỏ logic tính `btc_pct_dist` theo `btc_limit` cũ, thay bằng logic mới bám sát Cản EMA200 như sau:

```python
# [Đoạn code dự kiến cho Cline]
# XÓA ĐOẠN "Lấy giá Limit thực tế của BTC đã đặt..." vì không còn cần thiết.

# 2. Lấy khoảng cách từ Giá Live BTC tới Cản EMA200 của BTC
btc_ema_dist = (btc_ema - btc_tk.live_price) / btc_tk.live_price

# 3. Lấy hệ số biến động riêng của Altcoin
_coin_vol_mult = Decimal("1.0")
for item in getattr(globals_ref, "COIN_PORTFOLIO", []):
    if item["coin"] == coin_name:
        _coin_vol_mult = Decimal(str(item.get("vol_mult", "1.0")))
        break

# 4. Nhân bản khoảng cách EMA theo độ biến động của Altcoin
alt_base_dist = btc_ema_dist * _coin_vol_mult

# 5. Tính đệm lùi riêng biệt cho Altcoin (bao gồm hệ số khung giờ TF)
volatility_mult = getattr(tracker, 'current_vol_mult', Decimal("1.0"))
tf_vol_mult = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
alt_offset = base_buffer * volatility_mult * tf_vol_mult

# 6. Chốt giá Limit cuối cùng
if side == "long":
    alt_final_pct = alt_base_dist + alt_offset
else:
    alt_final_pct = alt_base_dist - alt_offset

raw_px = tracker.live_price * (Decimal("1") + alt_final_pct)
```

## 3. Lợi Ích & Khẳng Định
- **Đúng ý CEO:** Limit của Altcoin sẽ giữ được cự ly ổn định tương đương với cự ly của BTC tới EMA, cộng thêm lớp đệm an toàn của riêng TF đó.
- Không bao giờ có hiện tượng Limit bò sát vào giá Live gây khớp Market nhảm nhí.
