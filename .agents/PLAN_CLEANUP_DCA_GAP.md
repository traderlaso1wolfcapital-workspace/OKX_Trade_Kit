# Kế Hoạch: Dọn dẹp Config và Sửa logic DCA Gap Threshold

## 1. Dọn Dẹp Các Biến Config Thừa
Qua rà soát toàn bộ mã nguồn của bot, tôi xác nhận các biến sau **không còn được sử dụng** trong logic (chỉ khai báo mà không tính toán), cần gỡ bỏ hoàn toàn khỏi `bot_config.py` và phần xuất JSON của `bot_strategy.py` để code sạch sẽ:
- `EMA_SQUEEZE_TOLERANCE_PCT` (Chức năng nén tam giác đã bị loại bỏ)
- `EMA200_DRIFT_THRESHOLD_PCT` (Tính năng drift 20 nến không còn dùng)
- `ALTCOIN_DIFF_THRESHOLD_PCT` (Chế độ lùi entry sâu của Altcoin cũ đã bị thay thế bằng Neo BTC)

*(Lưu ý: `EMA_CONFLUENCE_TOLERANCE_PCT`, `BASE_ENTRY_OFFSET_PCT`, `LIMIT_UPDATE_THRESHOLD_PCT` vẫn đang được sử dụng).*

## 2. Nâng Cấp Logic Lọc Khoảng Cách DCA (DCA_GAP_THRESHOLD_PCT)
**Vấn đề hiện tại:**
Bot đang dùng `TF_VOLUME_MULTIPLIERS` (hệ số khối lượng) thay vì `TF_MULTIPLIERS` (hệ số khoảng cách) để nhân với `DCA_GAP_THRESHOLD_PCT`. Do hệ số khối lượng tăng rất chậm (1.0, 1.2, 1.4...) nên khoảng cách lưới không giãn ra đúng tỷ lệ các TF lớn.

**Giải pháp (Theo đúng ý CEO):**
Chuyển về dùng mốc cơ sở (Base M5 = 0.5% hoặc 1.2% tuỳ CEO chọn trong config) và nhân với `TF_MULTIPLIERS` để các TF lớn có khoảng cách rộng rãi hơn một cách chuẩn xác:
- M15 (Base × 1.533)
- M30 (Base × 2.333)
- H1 (Base × 3.333)
- H4 (Base × 6.772)

**Code thay đổi trong `bot_strategy.py` (Hàm `get_aligned_tfs`):**
```python
# Thay vì dùng TF_VOLUME_MULTIPLIERS:
active_tf_mult = globals_ref.TF_MULTIPLIERS.get(next_tf, Decimal("1.0"))
gap_threshold = getattr(globals_ref, "DCA_GAP_THRESHOLD_PCT", Decimal("0.0050"))
threshold = gap_threshold * active_tf_mult
```

## 3. Phân Tích Kiến Trúc: Tách Độc Lập Altcoin Entry (Câu Hỏi Của CEO)
CEO đề xuất: Nếu BTC chưa đủ nến, nhưng ETH đã đủ, thì ETH sẽ tính theo EMA của riêng nó (độc lập). Nếu BTC đủ nến thì ETH lại theo công thức Neo BTC.

**CẢNH BÁO TỪ CTO — ĐÁ NHAU CỰC MẠNH:**
Điều này chắc chắn sẽ dẫn đến thảm họa **thang DCA bị lộn ngược**. 
Ví dụ:
- **H4:** BTC đủ 60 nến → ETH H4 dùng Mode Neo BTC. Do BTC rất xa EMA của nó (VD: -3%), lệnh H4 ETH bị kéo sâu xuống **1750**.
- **H1:** BTC mới 55 nến (chưa đủ) → ETH H1 dùng Mode Độc Lập (EMA ETH). EMA ETH H1 đang ở **1800**.
→ Kết quả: **Lệnh H1 (1800) nằm CAO HƠN lệnh H4 (1750)!**
→ Khi giá ETH rớt xuống 1800, nó sẽ khớp H1 (dù chưa đến H4). Cấu trúc DCA từ lớn đến nhỏ bị phá vỡ hoàn toàn, rủi ro cháy tài khoản vì nhồi lệnh sai thứ tự.

**Khuyến nghị:** 
TUYỆT ĐỐI không nên mix 2 công thức cho 2 TF khác nhau trên cùng 1 đồng coin. Đã bật Neo BTC thì mọi TF (từ M5 đến H4) của Altcoin đều phải đồng bộ danh sách TF (aligned) với BTC để giữ nguyên thứ bậc thang DCA. Logic khóa TF hiện tại (alt_synced) là đúng và an toàn nhất.
