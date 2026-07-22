# Kế Hoạch: EMA Floor Clamp cho Altcoin Entry (Neo BTC Mode)

## 1. Vấn Đề Cần Giải Quyết

Công thức Neo BTC hiện tại có **2 kịch bản nguy hiểm** được xác nhận bằng số liệu thực:

### Kịch Bản A: BTC quá gần EMA200 (như hiện tại — BTC +0.12%)
```
btc_ema_dist = -0.12%
alt_final_pct = (-0.12% × 1.3) + 0.61% = +0.454%  ← DƯƠNG!
entry_ETH = 1,871.6 × 1.00454 = 1,880.1  ← CAO HƠN giá Live ETH!
→ Lệnh LONG limit fill ngay như Market Order. Mất đi ưu thế limit.
```

### Kịch Bản B: BTC overshoots qua EMA200 (thị trường sweep liquidity)
```
Live_BTC = 61,000 (đâm qua EMA200 BTC = 64,069)
btc_ema_dist = +5.03%  ← DƯƠNG vì BTC thụt dưới EMA200
alt_final_pct = +5.03% × 1.3 + 0.61% = +7.15%
entry_ETH = 1,800 × 1.0715 = 1,928.7  ← TRÊN giá Live ETH 7%!
→ Lệnh LONG không bao giờ fill, hoặc crash hệ thống logic.
```

---

## 2. Giải Pháp: EMA Floor Clamp

Thêm một **lớp chốt sàn (floor)** dựa trên EMA200 của chính Altcoin.
Logic: Dù Neo BTC tính ra entry ở đâu, entry của Altcoin **KHÔNG ĐƯỢC** đặt cao hơn `ETH_EMA200[tf] × (1 + base_buffer)` (LONG) hoặc thấp hơn `ETH_EMA200[tf] × (1 - base_buffer)` (SHORT).

```
LONG:  entry_ETH = min(neo_btc_entry, eth_ema200[tf] × (1 + base_buffer))
SHORT: entry_ETH = max(neo_btc_entry, eth_ema200[tf] × (1 - base_buffer))
```

**Số liệu thực H4 LONG hiện tại:**
```
eth_ema200_floor = 1,773.75 × (1 + 0.0061) = 1,784.6

Kịch bản A (BTC gần EMA): neo_btc_entry = 1,880.1 → min(1880.1, 1784.6) = 1,784.6 ✅
Kịch bản B (BTC overshoots): neo_btc_entry = 1,928.7 → min(1928.7, 1784.6) = 1,784.6 ✅
Kịch bản bình thường (BTC -1.5% dưới EMA): neo_btc_entry = 1,843 → min(1843, 1784.6) = 1,784.6 ✅
Kịch bản BTC sâu (-5%): neo_btc_entry = 1,756 → min(1756, 1784.6) = 1,756 ✅ (Neo BTC thắng vì hợp lý hơn)
```

---

## 3. Điểm Lợi & Hại Chi Tiết

### ✅ ĐIỂM LỢI

**LỢI 1 — Không bao giờ đặt lệnh vô nghĩa:**
Khi BTC quá sát EMA200 (btc_ema_dist ≈ 0%), entry ETH sẽ không còn bị đẩy lên trên giá live nữa.
Luôn đảm bảo lệnh limit thực sự NẰM DƯỚI giá live (LONG) hoặc TRÊN giá live (SHORT).

**LỢI 2 — Bắt được vùng thanh khoản thực của Altcoin:**
ETH EMA200 H4 = 1,773 là vùng có lệnh lớn nhất trên orderbook.
Khi thị trường sweep ETH về đây (dù BTC không giảm nhiều), bot vẫn có lệnh chờ sẵn tại đó.
Đây chính xác là kịch bản CEO mô tả: "thị trường đẩy ETH về EMA200 của nó để khớp thanh khoản."

**LỢI 3 — Không thay đổi kiến trúc, không mode-switching:**
Chỉ thêm 1 dòng min/max sau khi tính `raw_px`. Không cần sửa `get_aligned_tfs`, không có mode A/B.
Hot-reload hoạt động bình thường, không cần restart bot.

**LỢI 4 — An toàn khi BTC overshoots sâu:**
Nếu BTC tạm thời đâm qua EMA200 của nó (sweep liquidity rồi vòng lên), entry ETH không bị đẩy điên rồ lên trên giá live, thay vào đó tự động clamp về EMA200 ETH — vùng an toàn nhất.

---

### ⚠️ ĐIỂM HẠI (Cần CEO cân nhắc)

**HẠI 1 — Mất tính "chạy song song tuyệt đối" với BTC:**
Trong kịch bản bình thường (BTC -1.5%), Neo BTC cho entry ETH ở 1,843.
Sau Clamp, entry ETH vẫn là 1,784 (EMA ETH thắng vì là sàn thấp hơn).
→ ETH entry LUÔN BỊ ĐẬP VỀ EMA200 ETH khi ETH xa BTC về khoảng cách EMA200.
→ Tức là với tình huống hiện tại (ETH xa EMA200 5.57%, BTC chỉ xa 0.12%), EMA Floor LUÔN thắng.

**HẠI 2 — Lệnh fill ít hơn khi thị trường không về EMA ETH:**
Nếu thị trường chỉ giảm nhẹ và không đến gần EMA200 ETH (5.57% là khoảng xa), entry tại 1,784 sẽ không fill trong khi Neo BTC entry tại 1,843 đã fill rồi.
→ Bot bỏ lỡ cơ hội entry sớm hơn.

**HẠI 3 — Phụ thuộc vào độ chính xác của EMA200 ETH:**
EMA200 ETH H4 phải được tính đúng và cập nhật đều. Nếu data lag, floor bị sai.

---

## 4. Điều Kiện Phù Hợp Nhất

Cơ chế này phù hợp nhất khi:
- ETH xa EMA200 hơn BTC (như hiện tại: ETH +5.57% vs BTC +0.12%)
- Thị trường có xu hướng sweep liquidity về EMA200 từng coin riêng lẻ
- CEO ưu tiên **chất lượng entry** hơn **tần suất fill**

Cơ chế này KHÔNG phù hợp khi:
- ETH và BTC cùng xa EMA200 tương đương nhau → neo BTC đang là tối ưu

---

## 5. Code Chi Tiết Cho Cline

### 📂 File: `z_bot_sub1/bot_strategy.py`
**Vị trí:** Sau dòng 584 (`raw_px = tracker.live_price * (1 + alt_final_pct)`), TRƯỚC khối SAFETY CLAMP hiện tại (dòng 586).

Cline cần thêm đoạn code sau:

```python
# ⚡ EMA FLOOR CLAMP: Giới hạn entry Altcoin không vượt quá EMA200 của chính nó
# Ngăn chặn 2 kịch bản nguy hiểm:
# (A) BTC gần EMA200 → alt_final_pct dương → entry trên giá live (fill ngay như market)
# (B) BTC overshoots → btc_ema_dist dương → entry trên giá live (vô nghĩa)
alt_own_ema = get_ema200_for_tf(tf)  # EMA200 của Altcoin tại TF hiện tại
if alt_own_ema > 0:
    if side == "long":
        ema_floor = alt_own_ema * (Decimal("1") + base_buffer)
        raw_px = min(raw_px, ema_floor)  # LONG: không đặt cao hơn EMA200 Altcoin + buffer
    else:
        ema_ceiling = alt_own_ema * (Decimal("1") - base_buffer)
        raw_px = max(raw_px, ema_ceiling)  # SHORT: không đặt thấp hơn EMA200 Altcoin - buffer
```

---

## 6. Lệnh Cho Cline

```text
Đọc kế hoạch EMA Floor Clamp tại _Agent_Plans/PLAN_EMA_FLOOR_CLAMP.md và thực thi theo đúng hướng dẫn.
Chỉ thêm đoạn code EMA Floor Clamp vào đúng vị trí trong hàm `get_altcoin_limit_px` 
của file z_bot_sub1/bot_strategy.py (sau dòng tính raw_px, trước khối SAFETY CLAMP hiện tại).
Không thay đổi bất kỳ logic nào khác. Thêm comment giải thích rõ ràng.
```
