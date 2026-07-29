# -*- coding: utf-8 -*-
from decimal import Decimal

# ==============================================================================
# ⚙️ CẤU HÌNH DANH MỤC & CHIẾN THUẬT (Sửa ở đây sẽ tự cập nhật vào Bot)
# ==============================================================================
# ------------------------------------------------------------------------------
ENABLE_STRATEGY_SMC = True          # ❶ CHIẾN THUẬT SMC ORDER BLOCK (MAIN)
# ------------------------------------------------------------------------------

# ==============================================================================
# 1. CẤU HÌNH DỮ LIỆU & KHUNG THỜI GIAN
# ==============================================================================
TIMEFRAME_BASE = "15m"              # Khung nến chính MAIN (M15)
TIMEFRAME_HEDGE = "30m"             # Khung nến phụ HEDGE (M30)
LIMIT_CANDLES = 900                 # Số nến fetch từ OKX (900 nến 15m ≈ 225h / 9.4 ngày)
M30_LIMIT_CANDLES = 600             # Số nến M30 fetch (600 nến 30m ≈ 300h / 12.5 ngày)

# ==============================================================================
# 2. CẤU HÌNH QUẢN LÝ VỐN & ĐÒN BẨY
# ==============================================================================
USE_DYNAMIC_RISK = False            # Bắt buộc dùng Volume cố định
POSITION_VOLUME_HIGH_CONFIDENCE = Decimal("100") # Vốn cố định mặc định (100 USDT)
RISK_PER_TRADE_PCT = Decimal("0.01") # Risk per trade theo % vốn (1%)
LEVERAGE = 100                      # Đòn bẩy
POSITION_MODE = "cross"             # Chế độ Margin

# -- Volume & Risk riêng cho Swing OB (lệnh chính) --
SWING_VOLUME_USDT = Decimal("100")   # Volume USDT cho Swing OB (100 USDT)
SWING_RISK_PCT = Decimal("0.02")     # Risk % cho Swing OB (2%)

# -- Volume & Risk riêng cho Internal OB (lệnh phụ) --
INTERNAL_VOLUME_USDT = Decimal("100")# Volume USDT cho Internal OB (100 USDT)
INTERNAL_RISK_PCT = Decimal("0.01")  # Risk % cho Internal OB (1%)
INTERNAL_LEVERAGE = 50               # Đòn bẩy riêng cho Internal OB (isolated)

# ==============================================================================
# 3. SMART MONEY CONCEPTS — General Settings
#    Port của modeInput và styleInput trong PineScript
# ==============================================================================
SMC_MODE = "Historical"             # "Historical" | "Present"
SMC_STYLE = "Colored"               # "Colored" | "Monochrome"

# ==============================================================================
# 4. REAL TIME INTERNAL STRUCTURE
#    Port của showInternalsInput, showInternalBullInput, showInternalBearInput,
#    internalFilterConfluenceInput, internalLengthInput
# ==============================================================================
SMC_SHOW_INTERNAL = True            # Show Internal Structure
SMC_INT_BULL = "All"                # "All" | "BOS" | "CHoCH"
SMC_INT_BEAR = "All"                # "All" | "BOS" | "CHoCH"
SMC_INT_CONF = False                # Confluence Filter cho Internal Structure
INTERNAL_LENGTH = 5                 # internalLengthInput (default = 5 trong chỉ báo gốc)

# ==============================================================================
# 5. REAL TIME SWING STRUCTURE
#    Port của showStructureInput, showSwingBullInput, showSwingBearInput,
#    showSwingsInput, swingsLengthInput, showHighLowSwingsInput
# ==============================================================================
SMC_SHOW_SWING = True               # Show Swing Structure
SMC_SWING_BULL = "All"              # "All" | "BOS" | "CHoCH"
SMC_SWING_BEAR = "All"              # "All" | "BOS" | "CHoCH"
SMC_SHOW_SWING_PTS = False          # Show Swings Points (HH/HL/LL/LH labels)
SWING_LENGTH = 50                   # swingsLengthInput
SMC_SHOW_HL = True                  # showHighLowSwingsInput (Strong/Weak High/Low)

# ==============================================================================
# 6. ORDER BLOCKS
#    Port của showInternalOrderBlocksInput, internalOrderBlocksSizeInput,
#    showSwingOrderBlocksInput, swingOrderBlocksSizeInput,
#    orderBlockFilterInput, orderBlockMitigationInput, OB_VOLATILITY_MULT
# ==============================================================================
SMC_INT_OB = True                   # Internal Order Blocks
SMC_INT_OB_CNT = 20                 # Số OB internal hiển thị/dùng (1-20)
SMC_SWING_OB = True                 # Swing Order Blocks
SMC_SWING_OB_CNT = 20              # Số OB swing hiển thị/dùng (1-20)
SMC_OB_FILTER = "Cumulative Mean Range"  # "Atr" | "Cumulative Mean Range"
SMC_OB_MITIG = "High/Low"          # "High/Low" | "Close"
OB_VOLATILITY_MULT = 2.0            # Ngưỡng lọc nến OB (≥ N × ATR(200))

# ==============================================================================
# 7. EQH / EQL — Equal Highs & Lows
#    Port của showEqualHighsLowsInput, equalHighsLowsLengthInput, equalHighsLowsThresholdInput
# ==============================================================================
SMC_EQH = False                     # Bật nhận diện EQH/EQL
SMC_EQH_BARS = 3                   # equalHighsLowsLengthInput (bars confirmation)
SMC_EQH_THR = 0.1                  # equalHighsLowsThresholdInput (0-0.5)

# ==============================================================================
# 8. FAIR VALUE GAPS
#    Port của showFairValueGapsInput, fairValueGapsThresholdInput, fairValueGapsExtendInput
# ==============================================================================
SMC_FVG = False                     # Fair Value Gaps
SMC_FVG_AUTO = True                 # Auto Threshold
SMC_FVG_EXTEND = 1                  # Extend FVG (bars)

# ==============================================================================
# 9. HIGHS & LOWS MTF
#    Port của showDailyLevelsInput, showWeeklyLevelsInput, showMonthlyLevelsInput
# ==============================================================================
SMC_DAILY = False                   # Daily H/L
SMC_WEEKLY = False                  # Weekly H/L
SMC_MONTHLY = False                 # Monthly H/L

# ==============================================================================
# 10. PREMIUM & DISCOUNT ZONES
#     Port của showPremiumDiscountZonesInput
# ==============================================================================
SMC_ZONES = False                   # Premium/Discount Zones

# ==============================================================================
# 11. OB TRADE SETUP
#     Port của tradeSetupEnabledInput, tradeSetupSourceInput, tradeSetupDirectionInput,
#     tradeSetupTPModeInput, tradeSetupRRInput, tradeSetupMaxActiveInput, tradeSetupKeepPreviousInput
# ==============================================================================
SMC_TRADE = True                    # Show OB Trade Setup
OB_SOURCE = "SWING"                 # "ALL" | "INTERNAL" | "SWING" ← CHỈ DÙNG SWING OB
OB_DIRECTION = "BOTH"               # "BOTH" | "LONG_ONLY" | "SHORT_ONLY"
OB_TP_MODE = "RR"                   # "RR" | "NEAREST_OB" | "FALLBACK_RR"
OB_RR_RATIO_TREND = Decimal("1.0")   # RR cho Swing OB (1:1)
OB_RR_RATIO_INTERNAL = Decimal("1.0") # RR cho Internal OB (1:1)
OB_RR_RATIO = Decimal("1.0")          # RR mặc định (1:1)
OB_MAX_ACTIVE_SETUPS = 40           # Max setups giữ lại cùng lúc

# ==============================================================================
# 12. HỆ THỐNG & KẾT NỐI
# ==============================================================================
ACCOUNT_NAME = "sub2"
CL_ORD_PREFIX = "scvsub2"

# --- DANH MỤC COIN ---
COIN_PORTFOLIO = [
    {"coin": "XAU", "swap": "XAU-USDT-SWAP", "vol_mult": "1.0"},
    {"coin": "BTC", "swap": "BTC-USDT-SWAP", "vol_mult": "1.0"},
    {"coin": "ETH", "swap": "ETH-USDT-SWAP", "vol_mult": "0.8"},
]
ENABLED_COINS = ["XAU", "BTC", "ETH"]
# z7713 | Chuyển M15, RR 1:1, OB_SOURCE="SWING"
# z7716 | Tách RR thành OB_RR_RATIO_TREND (1:5) và OB_RR_RATIO_COUNTER (1:1)
