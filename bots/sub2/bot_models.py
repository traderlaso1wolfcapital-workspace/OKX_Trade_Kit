# -*- coding: utf-8 -*-
"""
bot_models.py — Data models cho Bot SMC Sub2
Port 100% từ TLS1 - SMC OB Auto v2 (PineScript types → Python dataclasses)
Hỗ trợ Multi-Timeframe độc lập theo cột TF trade
"""
from dataclasses import dataclass, field
from decimal import Decimal
from typing import List, Optional, Dict, Any


@dataclass
class Pivot:
    """Port của type pivot trong PineScript."""
    current_level: Decimal = Decimal("0")
    last_level: Decimal = Decimal("0")
    crossed: bool = False
    bar_time: int = 0
    bar_index: int = 0


@dataclass
class OrderBlock:
    """Port của type orderBlock trong PineScript."""
    bar_high: Decimal        # parsedHighs[parsedIndex] — vùng OB (đã filter volatility)
    bar_low: Decimal         # parsedLows[parsedIndex] — vùng OB (đã filter volatility)
    bar_time: int            # timestamp nến OB
    bias: int                # +1 = BULLISH, -1 = BEARISH
    source: str = "SWING"    # "SWING" hoặc "INTERNAL"
    crossed: bool = False    # đã bị mitigate hoặc đã có lệnh khớp
    mitigated: bool = False  # đã bị mitigate xuyên qua
    has_triggered: bool = False  # đã từng có lệnh khớp từ OB này
    raw_high: Decimal = Decimal("0")  # Đỉnh râu nguyên bản (dùng cho SL)
    raw_low: Decimal = Decimal("0")   # Đáy râu nguyên bản (dùng cho SL)
    tf: str = ""             # Khung thời gian tạo ra OB (ví dụ "5m", "15m", "30m", "1H", "4H"...)
    bar_index: int = 0       # Vị trí nến tạo OB

    @property
    def is_mitigated(self) -> bool:
        return self.crossed or self.mitigated


@dataclass
class TradeSetup:
    """Port của OB trade setup data trong PineScript arrays."""
    bias: int               # +1 LONG, -1 SHORT
    entry_price: Decimal    # obTradeEntryPrices
    stop_loss: Decimal      # obTradeStopLossPrices
    take_profit: Decimal    # obTradeTakeProfitPrices
    ob_source: str          # "SWING" / "INTERNAL"
    created_bar: int        # obTradeCreatedBars
    triggered: bool = False    # obTradeTriggered
    order_placed: bool = False # Đã đặt lệnh limit lên sàn OKX
    tp_sl_placed: bool = False # Đã đặt TP/SL algo order sau khi khớp
    tf: str = ""               # Timeframe của setup
    cl_ord_id: str = ""        # Client Order Id của lệnh gài
    pos_usdt: Decimal = Decimal("0") # Khối lượng vốn tính theo TF
    last_order_attempt: int = 0      # Timestamp lần cuối thử đặt lệnh


@dataclass
class FairValueGap:
    """Port của type fairValueGap trong PineScript."""
    top: Decimal            # top price của vùng FVG
    bottom: Decimal         # bottom price của vùng FVG
    bias: int               # +1 BULLISH, -1 BEARISH
    left_time: int          # timestamp nến bắt đầu FVG
    right_time: int         # timestamp nến kết thúc FVG
    crossed: bool = False   # đã bị fill chưa
    tf: str = ""


@dataclass
class EqualLevel:
    """Port của EQH/EQL detection result."""
    level: Decimal          # mức giá EQH hoặc EQL
    bias: int               # +1 EQL (đáy), -1 EQH (đỉnh)
    bar_time: int           # timestamp nến
    tf: str = ""


@dataclass
class TFState:
    """State riêng cho từng khung thời gian trong mô hình Multi-TF độc lập."""
    tf: str = ""
    last_candle_timestamp: int = 0
    swing_high: Pivot = field(default_factory=Pivot)
    swing_low: Pivot = field(default_factory=Pivot)
    internal_high: Pivot = field(default_factory=Pivot)
    internal_low: Pivot = field(default_factory=Pivot)
    equal_high: Pivot = field(default_factory=Pivot)
    equal_low: Pivot = field(default_factory=Pivot)
    swing_leg: int = -1
    internal_leg: int = -1
    swing_trend: int = 0
    internal_trend: int = 0
    swing_obs: List[OrderBlock] = field(default_factory=list)
    internal_obs: List[OrderBlock] = field(default_factory=list)
    trade_setups: List[TradeSetup] = field(default_factory=list)
    fvg_list: List[FairValueGap] = field(default_factory=list)
    eqh_eql_list: List[EqualLevel] = field(default_factory=list)
    parsed_highs: List[Decimal] = field(default_factory=list)
    parsed_lows: List[Decimal] = field(default_factory=list)
    trailing_top: Optional[Decimal] = None
    trailing_bottom: Optional[Decimal] = None
    trailing_top_time: Optional[int] = None
    trailing_bottom_time: Optional[int] = None
    atr_200: Decimal = Decimal("0")


@dataclass
class AssetTracker:
    """
    State đầy đủ cho mỗi coin trong Bot SMC Sub2.
    Hỗ trợ Multi-TF độc lập qua dictionary tf_states.
    """
    swap_id: str = ""
    coin_name: str = ""

    # Giá realtime
    live_price: Decimal = Decimal("0")
    live_high: Decimal = Decimal("0")
    live_low: Decimal = Decimal("0")

    # ---------------------------------------------------------------
    # Multi-TF States: tf -> TFState instance (5m, 15m, 30m, 1H, 2H, 4H...)
    # ---------------------------------------------------------------
    tf_states: Dict[str, TFState] = field(default_factory=dict)

    # ---------------------------------------------------------------
    # Pivot state & OBs dùng cho legacy / fallback
    # ---------------------------------------------------------------
    swing_high: Pivot = field(default_factory=Pivot)
    swing_low: Pivot = field(default_factory=Pivot)
    internal_high: Pivot = field(default_factory=Pivot)
    internal_low: Pivot = field(default_factory=Pivot)
    equal_high: Pivot = field(default_factory=Pivot)
    equal_low: Pivot = field(default_factory=Pivot)
    swing_leg: int = -1
    internal_leg: int = -1
    swing_trend: int = 0
    internal_trend: int = 0
    swing_obs: List[OrderBlock] = field(default_factory=list)
    internal_obs: List[OrderBlock] = field(default_factory=list)
    m30_swing_obs: List[OrderBlock] = field(default_factory=list)

    # Tổng hợp tất cả trade setup của mọi TF đang active
    trade_setups: List[TradeSetup] = field(default_factory=list)
    fvg_list: List[FairValueGap] = field(default_factory=list)
    eqh_eql_list: List[EqualLevel] = field(default_factory=list)

    trailing_top: Optional[Decimal] = None
    trailing_bottom: Optional[Decimal] = None
    trailing_top_time: Optional[int] = None
    trailing_bottom_time: Optional[int] = None
    trailing_bar_time: Optional[int] = None
    trailing_bar_index: int = 0

    parsed_highs: List[Decimal] = field(default_factory=list)
    parsed_lows: List[Decimal] = field(default_factory=list)
    last_candle_timestamp: int = 0
    last_m30_timestamp: int = 0

    # ---------------------------------------------------------------
    # Portfolio Tracking
    # ---------------------------------------------------------------
    has_long: bool = False
    has_short: bool = False
    active_avg_px_long: Decimal = Decimal("0")
    active_avg_px_short: Decimal = Decimal("0")
    last_long_pos_amt: Decimal = Decimal("0")
    last_short_pos_amt: Decimal = Decimal("0")

    # Lưu giá entry đã đặt theo TF để quản lý lệnh
    placed_entry_px_long_by_tf: Dict[str, str] = field(default_factory=dict)
    placed_entry_px_short_by_tf: Dict[str, str] = field(default_factory=dict)
    _no_tf_cleaned: bool = False

    # Max ROI & MAE State Tracking
    max_roi_long: Decimal = Decimal("0")
    max_roi_short: Decimal = Decimal("0")
    mae_max_pct_long: Decimal = Decimal("0")
    mae_max_pct_short: Decimal = Decimal("0")
    last_entry_l: Decimal = Decimal("0")
    last_entry_s: Decimal = Decimal("0")

    # ATR
    atr_200: Decimal = Decimal("0")
