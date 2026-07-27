# -*- coding: utf-8 -*-
from decimal import Decimal, ROUND_DOWN
import os
import time
import json
import requests
from datetime import datetime
from typing import Any

# ==============================================================================
# ⚙️ CẤU HÌNH DANH MỤC & CHIẾN THUẬT (Sửa ở đây sẽ tự cập nhật vào Bot)
# ==============================================================================
# ------------------------------------------------------------------------------
ENABLE_STRATEGY_MAIN = True       # ❶ CHIẾN THUẬT ĐA KHUNG (MAIN)
ENABLE_STRATEGY_XOLE = True       # ❷ CHIẾN THUẬT BẮT BẺ (XOLE)

ENABLE_DYNAMIC_EMA200_TP = False   # CHỐT LỜI ĐỘNG (TP THEO CẢN EMA200 CỦA TF TIẾP THEO)
ENABLE_DYNAMIC_PINGPONG_TP = False # CHỐT LỜI ĐỘNG TẠM THỜI (PING-PONG)

ALTCOIN_FOLLOW_BTC_EMA = True     # 🔄 ON: Altcoin neo limit theo BTC | LOCK: Altcoin dùng EMA200 của chính nó
# ------------------------------------------------------------------------------

# ==============================================================================
# 1. CẤU HÌNH DỮ LIỆU & KHUNG THỜI GIAN
# ==============================================================================
TIMEFRAME_BASE = "5m"  
LIMIT_CANDLES = "900"  

# ==============================================================================
# 2. CẤU HÌNH QUẢN LÝ VỐN & ĐÒN BẨY
# ==============================================================================
POSITION_VOLUME_HIGH_CONFIDENCE = Decimal("200")   # Vốn Base Volume cố định dùng cho toàn bộ lệnh Limit
USE_DYNAMIC_RISK = False                           # (ĐÃ TẮT BỞI USER) Bật/tắt vào lệnh theo % vốn (Dynamic Risk)
DYNAMIC_RISK_PCT = Decimal("0.005")                # Tỷ lệ % vốn vào lệnh (0.005 = 0.5%)


# ==============================================================================
# 3. CẤU HÌNH CHỈ BÁO & VÀO/THOÁT LỆNH (Trade Setup) 
# ==============================================================================
# --- Các dung sai & Ngưỡng lệch ---
EMA_CONFLUENCE_TOLERANCE_PCT = Decimal("0.0023")   # Dung sai hợp lưu EMA đa khung (0.0020 = 0.2%)
BASE_ENTRY_OFFSET_PCT = Decimal("0.0005")          # Đệm 0.09% đón lõm Entry và trừ lùi TP để dễ khớp trước vạch cản
DCA_GAP_THRESHOLD_PCT = Decimal("0.0030")          # Ngưỡng khoảng cách tối thiểu (Base Gap = 0.5%) để rải limit. Sẽ nhân với TF_MULTIPLIERS cho các khung lớn.

# --- Lợi nhuận (TP) & Cắt lỗ (SL) cơ sở ---
SCALPING_TP_PCT = Decimal("0.0120")               # TP (M5 base = 0.82%)
SCALPING_SL_PCT = Decimal("0.0120")               # SL (M5 base = 0.82%)

# --- Cấu trúc xu hướng (Nến tích lũy) ---
REQUIRED_ACCUMULATION_CANDLES = 60      
QUANTUM_BUFFER_CANDLES = 12             
QUANTUM_FORTH_CANDLES = 10              
MAX_CYCLE_FAILURES = 2                  

# --- Cấu hình mở rộng & Đặc biệt ---
MACRO_EXTENSION_LIMIT_PCT = Decimal("0.08")        # Ngưỡng rướn Vĩ mô (BTC: 8%)
MACRO_UNLOCK_TARGET_TF = "H2"                      # Mốc mở khóa (Trạm H2)

ENABLE_PARTIAL_LOCK_SL = True                      # Kéo SL tự động: 1/3 TP → SL về Entry | 2/3 TP → SL về 1/3 TP

# ==============================================================================
# 4. HỆ SỐ NHÂN (MULTIPLIERS) CHO CÁC KHUNG THỜI GIAN
# ==============================================================================
def tf_weight(tf: str) -> int:
    return {"M5": 1, "M15": 2, "M30": 3, "H1": 4, "H2": 5, "H4": 6}.get(tf, 0)

# --- MAIN: Hệ số TP/SL, Offsets, Volume ---
TF_MULTIPLIERS = {
    "M5": Decimal("1.0"), "M15": Decimal("1.5333"), "M30": Decimal("2.3333"),
    "H1": Decimal("3.333"), "H2": Decimal("4.667"), "H4": Decimal("6.772")
}
TF_ENTRY_OFFSETS = {k: BASE_ENTRY_OFFSET_PCT * v for k, v in TF_MULTIPLIERS.items()}
TF_VOLUME_MULTIPLIERS = {
    "M5": Decimal("1.0"), "M15": Decimal("1.2"), "M30": Decimal("1.5"),
    "H1": Decimal("2.0"), "H2": Decimal("3.0"), "H4": Decimal("5.0")
}

# --- XO LE: Hệ số TP/SL, Offsets, Volume (Đảo ngược) ---
XOLE_TF_MULTIPLIERS = {
    "M5": Decimal("6.772"), "M15": Decimal("4.667"), "M30": Decimal("3.333"),
    "H1": Decimal("2.3333"), "H2": Decimal("1.5333"), "H4": Decimal("1.0")
}
XOLE_TF_ENTRY_OFFSETS = {k: BASE_ENTRY_OFFSET_PCT * v for k, v in XOLE_TF_MULTIPLIERS.items()}
XOLE_TF_VOLUME_MULTIPLIERS = {
    "M5": Decimal("5.0"), "M15": Decimal("3.0"), "M30": Decimal("2.0"),
    "H1": Decimal("1.5"), "H2": Decimal("1.2"), "H4": Decimal("1.0")
}

# ==============================================================================
# 5. CÁC LỚP BẢO VỆ CỤC BỘ (SAFEGUARDS)
# ==============================================================================
ENABLE_SIDEWAY_SAFE_EXIT    = False  # Chốt lời chủ động khi Sideway strict + ROI >= 20%
ENABLE_SQUEEZE_ESCAPE_EXIT  = True   # Phòng thủ SL Dương khi xuất hiện Nén tam giác (Squeeze)
ENABLE_SAFEGUARD_ENTRY_EXIT = False  # Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry
ENABLE_TRAILING_SL          = False  # Trailing SL động — khóa lợi nhuận khi ROI tăng dần
ENABLE_MAX_ROI_EXIT         = False  # Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng)
ENABLE_SIDEWAY_VAP_EXIT     = False  # Cắt hòa/dương khi Vấp EMA200 >= 2 lần liên tiếp
ENABLE_H4_FLIP_CLOSE        = True   # Đóng toàn bộ vị thế ngược chiều khi H4 side đảo chiều (accum >= 60)

# ==============================================================================
# 6. HỆ THỐNG & KẾT NỐI (SYSTEM CONFIGURATION)
# ==============================================================================
CL_ORD_PREFIX = "scvlmt"
EVOLUTION_CYCLE_SECONDS = 86400         
AI_CONFIDENCE_SCORE = Decimal("0")
# --- DANH MỤC COIN ---
COIN_PORTFOLIO = [
    {"coin": "XAU", "swap": "XAU-USDT-SWAP", "leverage": 50, "vol_mult": Decimal("1.0")},
    {"coin": "BTC", "swap": "BTC-USDT-SWAP", "leverage": 100, "vol_mult": Decimal("1.0")},
    {"coin": "ETH", "swap": "ETH-USDT-SWAP", "leverage": 100, "vol_mult": Decimal("1.3")},
]
ENABLED_COINS = ["XAU", "BTC", "ETH"]

import sys
globals_ref = sys.modules[__name__]

# ==============================================================================
# 🧮 CÁC HÀM TIỆN ÍCH TOÁN HỌC & TỔNG HỢP CÔNG THỨC
# ==============================================================================
'''
=== CÔNG THỨC TÍNH GIÁ LIMIT CHO ALTCOIN (NEO BTC) ===

BƯỚC 1: Tính khoảng cách từ Giá Live BTC tới Cản EMA200 của chính BTC
         (BỎ QUA hoàn toàn cản EMA200 của Altcoin — Altcoin chỉ follow BTC)
         %_EMA_BTC = (EMA200_BTC - Live_BTC) / Live_BTC

BƯỚC 2: Ráp khoảng cách EMA của BTC vào Altcoin với hệ số vol_mult
         %_ETH_base = %_EMA_BTC × vol_mult   (Ví dụ ETH: × 1.3)

BƯỚC 3: Tính đệm lùi chuẩn theo khung thời gian (TF)
         base_buffer = BASE_ENTRY_OFFSET_PCT × TF_MULTIPLIERS[tf]
         (Ví dụ H4: 0.0009 × 6.772 = 0.61%)

BƯỚC 4: Chốt giá Limit cuối cùng
         LONG:  entry_ETH = Live_ETH × (1 + %_ETH_base + base_buffer)
         SHORT: entry_ETH = Live_ETH × (1 + %_ETH_base - base_buffer)

VÍ DỤ H4 LONG thực tế:
  Live_BTC  = 64,240  |  EMA200_BTC H4 = 63,538  → %_EMA_BTC = -1.09%
  %_ETH_base = -1.09% × 1.3 = -1.42%
  base_buffer H4 = 0.0009 × 6.772 = +0.61%
  entry_ETH = Live_ETH × (1 + (-1.42%) + 0.61%) = Live_ETH × (1 - 0.81%) ≈ 1,859

💡 BẢN CHẤT CỦA CÔNG THỨC:
  Altcoin bỏ cản EMA200 riêng của nó, chỉ nhìn BTC.
  BTC cách EMA200 bao nhiêu % → Altcoin cũng lùi bấy nhiêu % (nhân vol_mult để bù độ giật),
  sau đó cộng thêm một lớp đệm an toàn riêng theo TF (base_buffer).
  → Chạy song song tuyệt đối với BTC, không bao giờ nằm sát giá Live!
'''

# z2416 | Sửa logic lọc khoảng cách DCA (gap_threshold): Áp dụng hệ số tăng dần theo TF_VOLUME_MULTIPLIERS (M5 1x, H4 2x) và chỉnh DCA_GAP_THRESHOLD_PCT lên 0.5%.
# z2417 | Thay đổi công thức tính Entry Offset mẫu trong chú thích theo yêu cầu của User (Cộng/trừ có dấu khoảng cách ETH, và nhân hệ số co giãn cho cả cụm tổng khoảng cách BTC + ETH). Đồng thời đảo ngược chiều LONG thành (ETH - BTC) để tránh lỗi văng giá.
# z5331 | Sửa lỗi docstring: thêm abs() cho dist_to_tf(ETH) trong công thức SHORT Ngược pha & LONG Thuận pha; xóa ghi chú cũ dư thừa
# z5333 | Refactoring: Dọn dẹp hoàn toàn logic Altcoin cũ, xoá hơn 100 dòng code thừa trong trailing limit và biến ELASTICITY_MULT.
# z5334 | Xóa bỏ toàn bộ biến cấu hình của chiến thuật PING-PONG để tập trung vào cơ chế phòng thủ Squeeze.
