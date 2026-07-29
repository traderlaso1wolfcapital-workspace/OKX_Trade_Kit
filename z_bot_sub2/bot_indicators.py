# -*- coding: utf-8 -*-
"""
bot_sub2.py - SMC Order Block Engine
Port 100% từ chỉ báo TLS1 - SMC OB Auto v2 (PineScript -> Python)
"""
import os
import time
import json
from decimal import Decimal
from typing import List, Optional, Tuple, Dict

from z_bot_sub2.bot_models import AssetTracker, Pivot, OrderBlock, TradeSetup, FairValueGap, EqualLevel
from z_bot_sub2.bot_config import (
    # Data & Timeframe
    TIMEFRAME_BASE, TIMEFRAME_HEDGE, LIMIT_CANDLES, M30_LIMIT_CANDLES,
    # Volume & Risk
    POSITION_VOLUME_HIGH_CONFIDENCE, LEVERAGE,
    SWING_VOLUME_USDT, SWING_RISK_PCT,
    INTERNAL_VOLUME_USDT, INTERNAL_RISK_PCT, INTERNAL_LEVERAGE,
    # SMC General
    ACCOUNT_NAME, CL_ORD_PREFIX,
    # Structure
    SWING_LENGTH, INTERNAL_LENGTH,
    SMC_INT_BULL, SMC_INT_BEAR, SMC_SWING_BULL, SMC_SWING_BEAR,
    SMC_INT_CONF,
    # Order Blocks
    SMC_INT_OB, SMC_INT_OB_CNT,
    SMC_SWING_OB, SMC_SWING_OB_CNT,
    SMC_OB_FILTER, SMC_OB_MITIG,
    OB_VOLATILITY_MULT,
    # EQH/EQL
    SMC_EQH, SMC_EQH_BARS, SMC_EQH_THR,
    # FVG
    SMC_FVG, SMC_FVG_AUTO,
    # Zones
    SMC_ZONES,
    # OB Trade Setup
    SMC_TRADE, OB_RR_RATIO_TREND, OB_RR_RATIO_INTERNAL, OB_TP_MODE,
    OB_SOURCE, OB_DIRECTION,
    OB_MAX_ACTIVE_SETUPS,
)

BULLISH = 1
BEARISH = -1
BULLISH_LEG = 1
BEARISH_LEG = 0


# =============================================================================
# TECHNICAL INDICATORS
# =============================================================================

def calculate_atr(closes: list, highs: list, lows: list, period: int = 200) -> Decimal:
    """ATR(period) - Average True Range."""
    if len(closes) < period + 1:
        return Decimal("0")
    tr_list = []
    for i in range(1, len(closes)):
        h = highs[i]
        l = lows[i]
        pc = closes[i - 1]
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    return sum(tr_list[-period:]) / period


def calculate_cumulative_mean_range(highs: list, lows: list) -> Decimal:
    """Cumulative Mean Range = sum(TR) / bar_count - fallback filter."""
    if len(highs) < 2:
        return Decimal("0")
    total = sum(highs[i] - lows[i] for i in range(len(highs)))
    return total / len(highs)


def get_volatility_measure(closes: list, highs: list, lows: list) -> Decimal:
    """Trả về volatility theo SMC_OB_FILTER: Atr hoặc Cumulative Mean Range."""
    if SMC_OB_FILTER == "Atr":
        return calculate_atr(closes, highs, lows, 200)
    else:
        return calculate_cumulative_mean_range(highs, lows)


def build_parsed_arrays(highs: list, lows: list, volatility: Decimal) -> Tuple[list, list]:
    """
    Port của PineScript:
        highVolatilityBar = (high - low) >= 2 * volatilityMeasure
        parsedHigh = highVolatilityBar ? low : high
        parsedLow  = highVolatilityBar ? high : low
    """
    threshold = volatility * Decimal("2")
    parsed_highs = []
    parsed_lows = []
    for i in range(len(highs)):
        h = highs[i]
        l = lows[i]
        if (h - l) >= threshold:
            parsed_highs.append(l)   # swap
            parsed_lows.append(h)    # swap
        else:
            parsed_highs.append(h)
            parsed_lows.append(l)
    return parsed_highs, parsed_lows


# =============================================================================
# PIVOT DETECTION - Port leg() và getCurrentStructure() của PineScript
# =============================================================================

def detect_leg(highs: list, lows: list, size: int) -> int:
    """
    Port của PineScript leg(size):
        newLegHigh = high[size] > ta.highest(size)   -> BEARISH_LEG = 0
        newLegLow  = low[size]  < ta.lowest(size)    -> BULLISH_LEG = 1
    Ta dùng index -1 là nến hiện tại, -1-size là nến cách size bước.
    ta.highest(size) = max của [size-1] nến gần nhất (không kể nến ở [-1-size]).
    """
    if len(highs) < size + 2:
        return -1  # chưa đủ dữ liệu
    pivot_high = highs[-(size + 1)]
    pivot_low = lows[-(size + 1)]
    recent_highs = highs[-size:]
    recent_lows = lows[-size:]
    if pivot_high > max(recent_highs):
        return BEARISH_LEG
    elif pivot_low < min(recent_lows):
        return BULLISH_LEG
    return -1  # không thay đổi


def update_pivots_from_leg(
    new_leg: int, prev_leg: int,
    swing_high: Pivot, swing_low: Pivot,
    highs: list, lows: list, times: list, bar_index: int, size: int
) -> Tuple[Pivot, Pivot, bool]:
    """
    Port của startOfNewLeg + cập nhật pivot trong getCurrentStructure.
    Trả về (new_swing_high, new_swing_low, pivot_changed).
    """
    if new_leg == prev_leg:
        return swing_high, swing_low, False

    pivot_bar_index = len(highs) - size - 2  # absolute index của nến pivot
    if pivot_bar_index < 0:
        return swing_high, swing_low, False

    pivot_time = times[-(size + 1)]
    changed = False

    if new_leg == BULLISH_LEG:
        # Leg chuyển thành BULLISH -> vừa xác nhận đáy mới
        level = lows[-(size + 1)]
        new_low = Pivot(
            current_level=level,
            last_level=swing_low.current_level,
            crossed=False,
            bar_time=pivot_time,
            bar_index=bar_index - size - 1
        )
        return swing_high, new_low, True
    elif new_leg == BEARISH_LEG:
        # Leg chuyển thành BEARISH -> vừa xác nhận đỉnh mới
        level = highs[-(size + 1)]
        new_high = Pivot(
            current_level=level,
            last_level=swing_high.current_level,
            crossed=False,
            bar_time=pivot_time,
            bar_index=bar_index - size - 1
        )
        return new_high, swing_low, True

    return swing_high, swing_low, False


# =============================================================================
# STRUCTURE BREAK (BOS / CHoCH) - displayStructure()
# =============================================================================

def detect_structure_break(
    close: Decimal,
    swing_high: Pivot, swing_low: Pivot,
    current_trend: int,
    bull_filter: str = "All", bear_filter: str = "All",
    confluence_filter: bool = False,
    open_p: Decimal = None, high_p: Decimal = None, low_p: Decimal = None,
    internal_high: Pivot = None, internal_low: Pivot = None,
    is_internal: bool = False,
    prev_close: Decimal = None  # ⚡ Port của ta.crossover/ta.crossunder
) -> Tuple[bool, str, int, int]:
    """
    Port của displayStructure().
    Trả về (is_break, tag, new_trend, bias) với bias=1 (BULLISH) hoặc -1 (BEARISH).
    """
    is_break = False
    tag = ""
    new_trend = current_trend
    bias = 0

    # Confluence filter cho internal structure
    bullish_allowed = True
    bearish_allowed = True
    if confluence_filter and is_internal and open_p is not None:
        wick_up = high_p - max(close, open_p)
        wick_down = min(close, open_p) - low_p
        bullish_allowed = wick_up > wick_down   # nến có wick trên lớn hơn -> bullish ok
        bearish_allowed = wick_up < wick_down   # nến có wick dưới lớn hơn -> bearish ok

    # ⚡ Port của ta.crossover(close, pivot.currentLevel):
    # Yêu cầu: nến TRƯỚC <= pivot VÀ nến HIỆN TẠI > pivot
    is_crossover = (prev_close is not None and prev_close <= swing_high.current_level and close > swing_high.current_level)
    # ⚡ Port của ta.crossunder(close, pivot.currentLevel):
    # Yêu cầu: nến TRƯỚC >= pivot VÀ nến HIỆN TẠI < pivot
    is_crossunder = (prev_close is not None and prev_close >= swing_low.current_level and close < swing_low.current_level)
    
    # Guard: chỉ xét phá vỡ khi Pivot đã được xác lập
    if (swing_high.current_level != Decimal("0") and
            is_crossover and not swing_high.crossed and bullish_allowed):
        # Extra condition cho internal: high không trùng swing high
        if is_internal and internal_high is not None:
            if swing_high.current_level == internal_high.current_level:
                pass  # bỏ qua
            else:
                swing_high.crossed = True
                is_break = True
                new_trend = BULLISH
                tag = "CHoCH" if current_trend == BEARISH else "BOS"
                bias = BULLISH
        else:
            swing_high.crossed = True
            is_break = True
            new_trend = BULLISH
            tag = "CHoCH" if current_trend == BEARISH else "BOS"
            bias = BULLISH

        # Filter theo bull_filter
        if is_break and bull_filter != "All":
            if bull_filter == "BOS" and tag == "CHoCH":
                is_break = False
            elif bull_filter == "CHoCH" and tag == "BOS":
                is_break = False

    elif (swing_low.current_level != Decimal("0") and
          is_crossunder and not swing_low.crossed and bearish_allowed):
        # Extra condition cho internal: low không trùng swing low
        if is_internal and internal_low is not None:
            if swing_low.current_level == internal_low.current_level:
                pass
            else:
                swing_low.crossed = True
                is_break = True
                new_trend = BEARISH
                tag = "CHoCH" if current_trend == BULLISH else "BOS"
                bias = BEARISH
        else:
            swing_low.crossed = True
            is_break = True
            new_trend = BEARISH
            tag = "CHoCH" if current_trend == BULLISH else "BOS"
            bias = BEARISH

        # Filter theo bear_filter
        if is_break and bear_filter != "All":
            if bear_filter == "BOS" and tag == "CHoCH":
                is_break = False
            elif bear_filter == "CHoCH" and tag == "BOS":
                is_break = False

    return is_break, tag, new_trend, bias


# =============================================================================
# ORDER BLOCK - storeOrderBlock() của PineScript
# =============================================================================

def find_order_block(
    parsed_highs: list, parsed_lows: list, times: list,
    pivot_bar_index: int, current_bar_index: int,
    bias: int, source: str,
    highs: list = None, lows: list = None  # Giá nguyên bản (đỉnh/râu thật) cho SL
) -> Optional[OrderBlock]:
    """
    Port của storeOrderBlock():
        BEARISH: a_rray = parsedHighs.slice(p_ivot.barIndex, bar_index)
                 parsedIndex = p_ivot.barIndex + indexof(max)
        BULLISH: a_rray = parsedLows.slice(p_ivot.barIndex, bar_index)
                 parsedIndex = p_ivot.barIndex + indexof(min)
    """
    start = pivot_bar_index
    end = current_bar_index
    if start < 0 or end >= len(parsed_highs) or start >= end:
        return None

    if bias == BEARISH:
        sub = parsed_highs[start:end]
        if not sub:
            return None
        best_i = sub.index(max(sub)) + start
    else:
        sub = parsed_lows[start:end]
        if not sub:
            return None
        best_i = sub.index(min(sub)) + start

    # Lấy đỉnh/râu nguyên bản và parsed của đúng nến OB (1 nến gốc)
    raw_h = highs[best_i] if highs and best_i < len(highs) else parsed_highs[best_i]
    raw_l = lows[best_i] if lows and best_i < len(lows) else parsed_lows[best_i]
    bar_h = parsed_highs[best_i]
    bar_l = parsed_lows[best_i]

    return OrderBlock(
        bar_high=bar_h,
        bar_low=bar_l,
        raw_high=raw_h,
        raw_low=raw_l,
        bar_time=times[best_i],
        bias=bias,
        source=source
    )


def mitigate_order_blocks(
    obs: List[OrderBlock],
    current_high: Decimal, current_low: Decimal, current_close: Decimal
) -> List[OrderBlock]:
    """
    Port của deleteOrderBlocks():
        bearishMitigationSource = OB_MITIG == CLOSE ? close : high
        bullishMitigationSource = OB_MITIG == CLOSE ? close : low
    """
    use_close = (SMC_OB_MITIG == "Close")
    bear_source = current_close if use_close else current_high
    bull_source = current_close if use_close else current_low

    active = []
    for ob in obs:
        if ob.bias == BEARISH and bear_source > ob.bar_high:
            ob.crossed = True
            continue
        elif ob.bias == BULLISH and bull_source < ob.bar_low:
            ob.crossed = True
            continue
        active.append(ob)
    return active


# =============================================================================
# NEAREST OPPOSITE OB TP - nearestOppositeOBTP()
# =============================================================================

def nearest_opposite_ob_tp(
    bias: int, is_internal: bool, entry_price: Decimal,
    int_obs: List[OrderBlock], swing_obs: List[OrderBlock]
) -> Optional[Decimal]:
    """
    Port chính xác của nearestOppositeOBTP():
    Tìm trong cùng loại OB (internal nếu is_internal, swing nếu không).
    """
    obs = int_obs if is_internal else swing_obs
    for ob in obs:
        if ob.bias == -bias and not ob.crossed:
            if bias == BULLISH:
                candidate = ob.bar_low
                if candidate > entry_price:
                    return candidate
            else:
                candidate = ob.bar_high
                if candidate < entry_price:
                    return candidate
    return None


# =============================================================================
# TRADE SETUP - registerOBTradeSetup()
# =============================================================================

def register_trade_setups_for_ob(ob: OrderBlock, current_bar: int, swing_trend: int = 0, is_hedge: bool = False) -> list[TradeSetup]:
    """
    Logic PineScript gốc: 1 OB → 1 setup theo bias của OB.
    - Bullish OB: Entry = bar_high, SL = bar_low → LONG
    - Bearish OB: Entry = bar_low, SL = bar_high → SHORT
    - MAIN (M15 thuận trend): TP = 1R
    - HEDGE (M30 ngược trend): TP = 3R (reward cao hơn)
    """
    if ob.source not in ("SWING", "INTERNAL"):
        return []

    if ob.bias not in (BULLISH, BEARISH):
        return []

    # Xác định đỉnh/đáy THỰC của OB từ raw (ưu tiên) hoặc bar
    # Tránh raw_high/raw_low = 0 (chưa set) gây sai lệch
    candidates_high = [ob.bar_high, ob.bar_low]
    candidates_low = [ob.bar_high, ob.bar_low]
    if ob.raw_high > Decimal("0"): candidates_high.append(ob.raw_high)
    if ob.raw_low > Decimal("0"): candidates_low.append(ob.raw_low)
    real_high = max(candidates_high)
    real_low = min(candidates_low)

    # Entry & SL theo bias Pinescript gốc:
    # - Bullish OB: LONG từ barHigh xuống, SL = barLow
    # - Bearish OB: SHORT từ barLow lên, SL = barHigh
    if ob.bias == BULLISH:
        entry = real_high
        sl = real_low
    else:
        entry = real_low
        sl = real_high

    # GUARD: Đảm bảo Entry < SL cho SHORT, Entry > SL cho LONG
    if ob.bias == BEARISH and entry >= sl:
        entry, sl = sl, entry
    elif ob.bias == BULLISH and entry <= sl:
        entry, sl = sl, entry

    risk = abs(entry - sl)

    # Filter: bỏ qua OB có risk quá nhỏ hoặc entry/sl bất thường
    min_risk_pct = Decimal("0.001")
    if risk <= Decimal("0") or risk < entry * min_risk_pct or entry <= Decimal("0") or sl <= Decimal("0"):
        return []

    # Filter: bỏ qua OB có risk quá nhỏ
    min_risk_pct = Decimal("0.001")  # 0.1%
    if risk <= Decimal("0") or risk < max(real_high, real_low) * min_risk_pct:
        return []

    # TP: H1 thuận trend → 5R (RR 1:5), H2 ngược trend → 1R (RR 1:1)
    # is_hedge=False nghĩa là H1, is_hedge=True nghĩa là H2
    tp_mult = Decimal("1.0") if is_hedge else Decimal("5.0")

    if ob.bias == BULLISH:
        tp = entry + risk * tp_mult
    else:
        tp = entry - risk * tp_mult

    source_label = ob.source
    setup = TradeSetup(
        bias=ob.bias,
        entry_price=entry,
        stop_loss=sl,
        take_profit=tp,
        ob_source=source_label,
        created_bar=current_bar
    )
    return [setup]


# =============================================================================
# EQH / EQL DETECTION - getCurrentStructure với equalHighLow=True
# =============================================================================

def detect_eqh_eql(
    tracker: AssetTracker,
    highs: list, lows: list, times: list,
    atr: Decimal, size: int, threshold: float, bar_index: int
) -> List[EqualLevel]:
    """
    Port của getCurrentStructure(equalHighsLowsLengthInput, true):
    Khi pivot mới được xác nhận, so sánh với pivot cũ:
        abs(pivot.currentLevel - new_level) < threshold * atr
    """
    results = []
    if len(highs) < size + 2 or atr == Decimal("0"):
        return results

    new_leg = detect_leg(highs, lows, size)
    prev_eq_high = tracker.equal_high
    prev_eq_low = tracker.equal_low

    if new_leg == BULLISH_LEG:  # đáy mới -> kiểm tra EQL
        level = lows[-(size + 1)]
        if (prev_eq_low.current_level != Decimal("0") and
                abs(prev_eq_low.current_level - level) < Decimal(str(threshold)) * atr):
            results.append(EqualLevel(level=level, bias=BULLISH, bar_time=times[-(size + 1)]))
        tracker.equal_low = Pivot(
            current_level=level, last_level=prev_eq_low.current_level,
            crossed=False, bar_time=times[-(size + 1)], bar_index=bar_index - size - 1
        )
    elif new_leg == BEARISH_LEG:  # đỉnh mới -> kiểm tra EQH
        level = highs[-(size + 1)]
        if (prev_eq_high.current_level != Decimal("0") and
                abs(prev_eq_high.current_level - level) < Decimal(str(threshold)) * atr):
            results.append(EqualLevel(level=level, bias=BEARISH, bar_time=times[-(size + 1)]))
        tracker.equal_high = Pivot(
            current_level=level, last_level=prev_eq_high.current_level,
            crossed=False, bar_time=times[-(size + 1)], bar_index=bar_index - size - 1
        )
    return results


# =============================================================================
# FAIR VALUE GAPS - drawFairValueGaps()
# =============================================================================

def detect_fvg(
    closes: list, opens: list, highs: list, lows: list, times: list,
    auto_threshold: bool
) -> List[FairValueGap]:
    """
    Port của drawFairValueGaps() (same-timeframe version):
        bullishFVG = currentLow > last2High and lastClose > last2High
        bearishFVG = currentHigh < last2Low and lastClose < last2Low
    Cần ít nhất 3 nến: [i-2], [i-1], [i]
    """
    results = []
    if len(closes) < 3:
        return results

    for i in range(2, len(closes)):
        last2_high = highs[i - 2]
        last2_low = lows[i - 2]
        last_close = closes[i - 1]
        last_open = opens[i - 1]
        current_high = highs[i]
        current_low = lows[i]
        current_time = times[i]
        last_time = times[i - 1]

        bar_delta = abs(last_close - last_open) / last_open if last_open != Decimal("0") else Decimal("0")
        threshold = Decimal("0")
        # Auto threshold sẽ được tính cumulative, đơn giản hóa: dùng 0 nếu auto=False

        if current_low > last2_high and last_close > last2_high:
            results.append(FairValueGap(
                top=current_low, bottom=last2_high, bias=BULLISH,
                left_time=last_time, right_time=current_time
            ))
        elif current_high < last2_low and last_close < last2_low:
            results.append(FairValueGap(
                top=current_high, bottom=last2_low, bias=BEARISH,
                left_time=last_time, right_time=current_time
            ))
    return results


def mitigate_fvg(fvgs: List[FairValueGap], current_high: Decimal, current_low: Decimal) -> List[FairValueGap]:
    """
    Port của deleteFairValueGaps():
        bullish FVG bị xóa nếu low < fvg.bottom
        bearish FVG bị xóa nếu high > fvg.top
    """
    active = []
    for fvg in fvgs:
        if fvg.bias == BULLISH and current_low < fvg.bottom:
            continue
        elif fvg.bias == BEARISH and current_high > fvg.top:
            continue
        active.append(fvg)
    return active


# =============================================================================
# TRAILING EXTREMES - Premium / Discount Zones
# =============================================================================

def update_trailing_extremes(tracker: AssetTracker, current_high: Decimal, current_low: Decimal, current_time: int):
    """
    Port của updateTrailingExtremes():
        trailing.top = max(high, trailing.top)
        trailing.bottom = min(low, trailing.bottom)
    """
    if tracker.trailing_top is None or current_high > tracker.trailing_top:
        tracker.trailing_top = current_high
        tracker.trailing_top_time = current_time
    if tracker.trailing_bottom is None or current_low < tracker.trailing_bottom:
        tracker.trailing_bottom = current_low
        tracker.trailing_bottom_time = current_time


def get_premium_discount_zones(tracker: AssetTracker) -> Optional[Dict]:
    """
    Port của drawPremiumDiscountZones():
        Premium: từ trailing.top xuống 95% top + 5% bottom
        Equilibrium: +/-2.5% quanh midpoint
        Discount: từ trailing.bottom lên 95% bottom + 5% top
    """
    if tracker.trailing_top is None or tracker.trailing_bottom is None:
        return None
    top = tracker.trailing_top
    bottom = tracker.trailing_bottom
    mid = (top + bottom) / 2
    return {
        "premium_top": top,
        "premium_bottom": Decimal("0.95") * top + Decimal("0.05") * bottom,
        "equilibrium_top": Decimal("0.525") * top + Decimal("0.475") * bottom,
        "equilibrium_bottom": Decimal("0.525") * bottom + Decimal("0.475") * top,
        "discount_top": Decimal("0.95") * bottom + Decimal("0.05") * top,
        "discount_bottom": bottom,
        "mid": mid
    }


# =============================================================================
# EXCHANGE API HELPERS
# =============================================================================

def round_to_tick(price: Decimal, tick: Decimal) -> Decimal:
    return (price / tick).quantize(Decimal("1")) * tick



def add_ob_and_merge(ob_list: list[OrderBlock], new_ob: OrderBlock) -> bool:
    """
    Thêm OB mới vào danh sách. Nếu có OB nào cùng bias bị giao cắt vùng giá,
    sẽ gộp 2 OB lại thành 1 vùng lớn hơn.
    Trả về True nếu bị gộp, False nếu thêm mới.
    """
    merged = False
    top2 = max(new_ob.bar_high, new_ob.bar_low)
    bot2 = min(new_ob.bar_high, new_ob.bar_low)
    
    for ob in ob_list:
        if ob.bias == new_ob.bias and not ob.crossed:
            top1 = max(ob.bar_high, ob.bar_low)
            bot1 = min(ob.bar_high, ob.bar_low)
            # Check overlap
            if top1 >= bot2 and bot1 <= top2:
                # Gộp
                ob.bar_high = max(top1, top2)
                ob.bar_low = min(bot1, bot2)
                if new_ob.raw_high > Decimal("0"):
                    ob.raw_high = max(ob.raw_high, new_ob.raw_high) if ob.raw_high > Decimal("0") else new_ob.raw_high
                if new_ob.raw_low > Decimal("0"):
                    ob.raw_low = min(ob.raw_low, new_ob.raw_low) if ob.raw_low > Decimal("0") else new_ob.raw_low
                ob.bar_time = max(ob.bar_time, new_ob.bar_time)
                merged = True
                return True
                
    if not merged:
        ob_list.insert(0, new_ob)
        if len(ob_list) > 100:
            ob_list.pop()
        return False

# z1949 | Update: Gom các OB trùng đè lên nhau (add_ob_and_merge), sửa TP H1 RR 1:5, H2 RR 1:1
