# -*- coding: utf-8 -*-
from decimal import Decimal
from typing import Dict, Tuple

# ==============================================================================
# ⚙️ CẤU HÌNH DANH MỤC & CHIẾN THUẬT SMC ORDER BLOCK (SUB 2)
# ==============================================================================
ENABLE_STRATEGY_SMC = True          # CHIẾN THUẬT SMC ORDER BLOCK (MAIN)
ENABLE_MULTITF_GRID = True          # Lưới Đa Khung Độc Lập (chạy theo từng TF tích chọn)

# ==============================================================================
# 1. CẤU HÌNH DỮ LIỆU & ĐA KHUNG THỜI GIAN (MULTI-TIMEFRAME INDEPENDENT)
# ==============================================================================
# Bảng hệ số Ký Quỹ & Vào Lệnh đa khung chuẩn hóa toàn công ty TLS1
# (Hệ số nhân Ký Quỹ (Vốn), Hệ số nhân Entry/TP/SL)
TF_MULTIPLIERS: Dict[str, Tuple[Decimal, Decimal]] = {
    "M5":  (Decimal("1.0"), Decimal("1.0")),
    "M15": (Decimal("1.2"), Decimal("1.5")),
    "M30": (Decimal("1.5"), Decimal("2.3")),
    "H1":  (Decimal("2.0"), Decimal("3.3")),
    "H2":  (Decimal("3.0"), Decimal("4.7")),
    "H4":  (Decimal("5.0"), Decimal("6.8")),
    "D1":  (Decimal("8.0"), Decimal("10.0")),
}

# Chế độ Dual Nearest OB (Luôn duy trì 2 kịch bản Long & Short ở 2 đầu cản OB gần nhất)
DUAL_OB_MODE = True
MIN_OB_BAR_GAP = 5                   # Khoảng cách tối thiểu giữa 2 nến tạo OB (>= 5 nến)
MIN_OB_PRICE_GAP_PCT = Decimal("0.005") # Khoảng cách giá an toàn tối thiểu (0.5%)

# Cột TF trade từ Web App: {"BTC": ["5m", "15m", "30m", "1H", "4H"], ...}
ENABLED_TFS: dict = {}
ENABLE_TF_VOLUME_MULTIPLIER = False  # Bật/Tắt nhân Volume theo hệ số TF

# Fallback mặc định khi coin chưa có TF nào được chọn
DEFAULT_ACTIVE_TFS = ["1H"]
TIMEFRAME_BASE = "1H"               # Fallback timeframe nếu chưa chọn
TIMEFRAME_HEDGE = "2H"
LIMIT_CANDLES = 300                 # Số nến fetch trên mỗi TF (300 nến đủ nhận diện Swing 50)
M30_LIMIT_CANDLES = 300

def normalize_tf_to_okx(tf: str) -> str:
    """Chuẩn hóa ký hiệu TF về định dạng OKX API: M5->5m, M15->15m, M30->30m, H1->1H, H2->2H, H4->4H"""
    t = tf.strip().upper()
    mapping = {
        "M1": "1m", "M3": "3m", "M5": "5m", "M15": "15m", "M30": "30m",
        "H1": "1H", "H2": "2H", "H4": "4H", "H6": "6H", "H12": "12H",
        "D1": "1D", "1D": "1D", "1H": "1H", "2H": "2H", "4H": "4H",
        "5M": "5m", "15M": "15m", "30M": "30m"
    }
    return mapping.get(t, tf.lower())

def normalize_tf_to_std(tf: str) -> str:
    """Chuẩn hóa ký hiệu TF về định dạng hệ thống: 5m->M5, 15m->M15, 30m->M30, 1H->H1, 2H->H2, 4H->H4"""
    t = tf.strip().lower()
    mapping = {
        "1m": "M1", "3m": "M3", "5m": "M5", "15m": "M15", "30m": "M30",
        "1h": "H1", "2h": "H2", "4h": "H4", "6h": "H6", "12h": "H12",
        "1d": "D1", "d1": "D1", "h1": "H1", "h2": "H2", "h4": "H4",
        "m5": "M5", "m15": "M15", "m30": "M30"
    }
    return mapping.get(t, tf.upper())

def get_tf_multiplier(tf: str) -> Tuple[Decimal, Decimal]:
    """Trả về (vol_multiplier, entry_offset_multiplier) theo TF"""
    std = normalize_tf_to_std(tf)
    return TF_MULTIPLIERS.get(std, (Decimal("1.0"), Decimal("1.0")))

# ==============================================================================
# 2. CẤU HÌNH QUẢN LÝ VỐN & ĐÒN BẨY
# ==============================================================================
USE_DYNAMIC_RISK = False            # Bắt buộc dùng Volume cố định
POSITION_VOLUME_HIGH_CONFIDENCE = Decimal("0.4") # Vốn cố định cơ sở (0.4 USDT)
POSITION_VOLUME_USDT = Decimal("0.4")
RISK_PER_TRADE_PCT = Decimal("0.01") # Risk per trade theo % vốn (1%)
LEVERAGE = 100                      # Đòn bẩy
POSITION_MODE = "cross"             # Chế độ Margin

# Volume riêng nếu không dùng Volume cơ sở
SWING_VOLUME_USDT = Decimal("100")
SWING_RISK_PCT = Decimal("0.02")
INTERNAL_VOLUME_USDT = Decimal("100")
INTERNAL_RISK_PCT = Decimal("0.01")
INTERNAL_LEVERAGE = 100

# ==============================================================================
# 3. SMART MONEY CONCEPTS — General Settings
# ==============================================================================
SMC_MODE = "Historical"             # "Historical" | "Present"
SMC_STYLE = "Colored"               # "Colored" | "Monochrome"

# ==============================================================================
# 4. STRUCTURE LENGTHS (Pivots & Legs)
# ==============================================================================
SWING_LENGTH = 50                   # Độ dài sóng lớn (nến)
INTERNAL_LENGTH = 5                 # Độ dài sóng nhỏ (nến)
SMC_SHOW_INTERNAL = True            # Bật sóng Internal
SMC_SHOW_SWING = True               # Bật sóng Swing
SMC_INT_BULL = "All"                # "All" | "BOS" | "CHoCH"
SMC_INT_BEAR = "All"
SMC_SWING_BULL = "All"
SMC_SWING_BEAR = "All"
SMC_INT_CONF = False
SMC_SHOW_SWING_PTS = False
SMC_SHOW_HL = True

# ==============================================================================
# 5. ORDER BLOCKS (Cản Cung Cầu)
# ==============================================================================
SMC_INT_OB = True                   # Bật Internal Order Blocks
SMC_INT_OB_CNT = 20                 # Số OB internal tối đa
SMC_SWING_OB = True                 # Bật Swing Order Blocks
SMC_SWING_OB_CNT = 20               # Số OB swing tối đa
SMC_OB_FILTER = "Cumulative Mean Range"  # "Atr" | "Cumulative Mean Range"
SMC_OB_MITIG = "High/Low"          # "High/Low" | "Close"
OB_VOLATILITY_MULT = 2.0            # Ngưỡng lọc nến giật râu (≥ N × ATR)

# ==============================================================================
# 6. THIẾT LẬP VÀO LỆNH SMC (ENTRY SETUP)
# ==============================================================================
SMC_TRADE = True                    # Bật tạo Trade Setup từ OB
OB_SOURCE = "ALL"                   # "ALL" | "SWING" | "INTERNAL"
OB_DIRECTION = "BOTH"               # "BOTH" | "LONG_ONLY" | "SHORT_ONLY"
OB_TP_MODE = "RR"                   # "RR" (Cố định) | "NEAREST_OB" (Theo OB ngược chiều)
OB_RR_RATIO_TREND = Decimal("5.0")   # Tỷ lệ Chốt lời mặc định (5.0 R)
OB_SL_RATIO = Decimal("1.0")         # Tỷ lệ Cắt lỗ mặc định (1.0 R: x1 mép OB, 2.0 = x2 SL)
OB_RR_RATIO_COUNTER = OB_SL_RATIO   # Alias tương thích ngược
OB_RR_RATIO_INTERNAL = OB_RR_RATIO_COUNTER
OB_RR_RATIO = Decimal("5.0")
OB_MAX_ACTIVE_SETUPS = 10           # Số lượng setup chờ tối đa mỗi coin

# Điểm vào lệnh & Đệm đón cản
ENTRY_OFFSET_PCT = Decimal("0.05")  # Đón trước mép cản OB (0.05% cơ sở, nhân theo TF)
OB_ENTRY_LEVEL = "OUTER"            # "OUTER" (Mép ngoài OB) | "EQUILIBRIUM" (50% Thân OB)
OB_MERGE_THRESHOLD_PCT = Decimal("0.005") # 0.5% khoảng cách tối thiểu giữa các OB
OB_AUTO_MITIGATION = True           # Tự động loại bỏ OB khi giá đâm xuyên qua
OB_MERGE_OVERLAPPING = True         # Tự động gộp các OB đè nhau thành 1 Zone
OB_CLEANUP_CROSSED = True

# Ép vào lệnh Market khi giá lọt qua Entry
FORCE_MARKET_ENTRY_ON_CROSS = True
MAX_MARKET_SLIPPAGE_PCT = Decimal("0.008") # Trượt giá tối đa 0.8%

# EQH / EQL & FVG & Zones
SMC_EQH = False
SMC_EQH_BARS = 3
SMC_EQH_THR = 0.1
SMC_FVG = False
SMC_FVG_AUTO = True
SMC_FVG_EXTEND = 1
SMC_DAILY = False
SMC_WEEKLY = False
SMC_MONTHLY = False
SMC_ZONES = False

# ==============================================================================
# 7. HỆ THỐNG & KẾT NỐI
# ==============================================================================
ACCOUNT_NAME = "sub2"
CL_ORD_PREFIX = "scvsub2"

COIN_PORTFOLIO = [
    {"coin": "XAU", "swap": "XAU-USDT-SWAP", "vol_mult": "1.0"},
    {"coin": "BTC", "swap": "BTC-USDT-SWAP", "vol_mult": "1.0"},
    {"coin": "ETH", "swap": "ETH-USDT-SWAP", "vol_mult": "0.8"},
]
ENABLED_COINS = ["XAU", "BTC", "ETH"]
