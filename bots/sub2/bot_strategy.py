# -*- coding: utf-8 -*-
"""
bot_strategy.py - SMC Order Block Engine (Sub 2)
Port 100% từ chỉ báo TLS1 - SMC OB Auto v2 (PineScript -> Python)
Kiến trúc Multi-Timeframe Độc Lập theo cột TF trade Web App (M5, M15, M30, H1, H2, H4)
"""
import os
import time
import json
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any

from bots.sub2.bot_models import AssetTracker, Pivot, OrderBlock, TradeSetup, FairValueGap, EqualLevel, TFState
from bots.sub2 import bot_config
from bots.sub2.bot_config import (
    LIMIT_CANDLES, LEVERAGE, POSITION_MODE,
    POSITION_VOLUME_HIGH_CONFIDENCE,
    SWING_VOLUME_USDT, SWING_RISK_PCT,
    INTERNAL_VOLUME_USDT, INTERNAL_RISK_PCT, INTERNAL_LEVERAGE,
    ACCOUNT_NAME, CL_ORD_PREFIX,
    SWING_LENGTH, INTERNAL_LENGTH,
    SMC_INT_BULL, SMC_INT_BEAR, SMC_SWING_BULL, SMC_SWING_BEAR,
    SMC_INT_CONF,
    SMC_INT_OB, SMC_INT_OB_CNT,
    SMC_SWING_OB, SMC_SWING_OB_CNT,
    SMC_OB_FILTER, SMC_OB_MITIG,
    OB_VOLATILITY_MULT,
    SMC_EQH, SMC_EQH_BARS, SMC_EQH_THR,
    SMC_FVG, SMC_FVG_AUTO,
    SMC_ZONES,
    SMC_TRADE, OB_RR_RATIO_TREND, OB_RR_RATIO_COUNTER, OB_TP_MODE,
    OB_SOURCE, OB_DIRECTION, OB_MAX_ACTIVE_SETUPS,
    normalize_tf_to_okx, normalize_tf_to_std, get_tf_multiplier
)

BULLISH = 1
BEARISH = -1
BULLISH_LEG = 1
BEARISH_LEG = 0

from bots.sub2.bot_indicators import *
from bots.sub2.bot_orders import *


def replay_history_for_state(
    state: Any,
    closes: list, opens: list, highs: list, lows: list, times: list,
    volatility: Decimal,
    tf: str = ""
):
    """
    Port của logic PineScript chạy bar-by-bar cho 1 khung thời gian độc lập.
    Hỗ trợ cả TFState hoặc AssetTracker.
    """
    parsed_highs, parsed_lows = build_parsed_arrays(highs, lows, volatility)
    state.parsed_highs = parsed_highs[:-1]
    state.parsed_lows = parsed_lows[:-1]

    # Reset state
    state.swing_high = Pivot()
    state.swing_low = Pivot()
    state.internal_high = Pivot()
    state.internal_low = Pivot()
    state.equal_high = Pivot()
    state.equal_low = Pivot()
    state.swing_leg = -1
    state.internal_leg = -1
    state.swing_trend = 0
    state.internal_trend = 0
    state.swing_obs = []
    state.internal_obs = []
    state.fvg_list = []
    state.eqh_eql_list = []
    state.trailing_top = None
    state.trailing_bottom = None
    state.trailing_top_time = None
    state.trailing_bottom_time = None

    start = max(SWING_LENGTH, INTERNAL_LENGTH) + 2
    if len(closes) <= start:
        return

    # Duyệt qua các nến đã đóng
    for i in range(start, len(closes) - 1):
        sub_h = highs[:i + 1]
        sub_l = lows[:i + 1]
        sub_c = closes[:i + 1]
        sub_o = opens[:i + 1]
        sub_t = times[:i + 1]
        sub_ph = parsed_highs[:i + 1]
        sub_pl = parsed_lows[:i + 1]

        c = closes[i]
        o = opens[i]
        h = highs[i]
        l = lows[i]
        t = times[i]

        update_trailing_extremes(state, h, l, t)

        # ---------------------------------------------------------------
        # SWING STRUCTURE
        # ---------------------------------------------------------------
        new_swing_leg = detect_leg(sub_h, sub_l, SWING_LENGTH)
        if new_swing_leg != -1 and new_swing_leg != state.swing_leg:
            sh, sl, changed = update_pivots_from_leg(
                new_swing_leg, state.swing_leg,
                state.swing_high, state.swing_low,
                sub_h, sub_l, sub_t, i, SWING_LENGTH
            )
            if changed:
                state.swing_high = sh
                state.swing_low = sl
                state.swing_leg = new_swing_leg

        sb, stag, st, sbias = detect_structure_break(
            c, state.swing_high, state.swing_low, state.swing_trend,
            bull_filter=SMC_SWING_BULL, bear_filter=SMC_SWING_BEAR,
            is_internal=False,
            prev_close=closes[i-1] if i > 0 else None
        )
        if sb and sbias != 0:
            pivot_used = state.swing_low if sbias == BULLISH else state.swing_high
            if SMC_SWING_OB:
                ob = find_order_block(
                    sub_ph, sub_pl, sub_t,
                    pivot_used.bar_index, i, sbias, "SWING",
                    highs=sub_h, lows=sub_l, opens=sub_o, closes=sub_c
                )
                if ob:
                    ob.tf = tf
                    add_ob_and_merge(state.swing_obs, ob)
        state.swing_trend = st

        # ---------------------------------------------------------------
        # INTERNAL STRUCTURE
        # ---------------------------------------------------------------
        new_int_leg = detect_leg(sub_h, sub_l, INTERNAL_LENGTH)
        if new_int_leg != -1 and new_int_leg != state.internal_leg:
            ih, il, changed = update_pivots_from_leg(
                new_int_leg, state.internal_leg,
                state.internal_high, state.internal_low,
                sub_h, sub_l, sub_t, i, INTERNAL_LENGTH
            )
            if changed:
                state.internal_high = ih
                state.internal_low = il
                state.internal_leg = new_int_leg

        ib, itag, it, ibias = detect_structure_break(
            c, state.internal_high, state.internal_low, state.internal_trend,
            bull_filter=SMC_INT_BULL, bear_filter=SMC_INT_BEAR,
            confluence_filter=SMC_INT_CONF,
            open_p=o, high_p=h, low_p=l,
            internal_high=state.swing_high, internal_low=state.swing_low,
            is_internal=True,
            prev_close=closes[i-1] if i > 0 else None
        )
        if ib and ibias != 0:
            pivot_used = state.internal_low if ibias == BULLISH else state.internal_high
            if SMC_INT_OB:
                ob = find_order_block(
                    sub_ph, sub_pl, sub_t,
                    pivot_used.bar_index, i, ibias, "INTERNAL",
                    highs=sub_h, lows=sub_l, opens=sub_o, closes=sub_c
                )
                if ob:
                    ob.tf = tf
                    add_ob_and_merge(state.internal_obs, ob)
        state.internal_trend = it

        # ---------------------------------------------------------------
        # MITIGATE OBs mỗi nến (nếu bật Auto Mitigation)
        # ---------------------------------------------------------------
        if getattr(bot_config, "OB_AUTO_MITIGATION", True):
            state.swing_obs = mitigate_order_blocks(state.swing_obs, h, l, c)
            state.internal_obs = mitigate_order_blocks(state.internal_obs, h, l, c)

        # EQH / EQL
        if SMC_EQH:
            atr_val = calculate_atr(sub_c, sub_h, sub_l, 200)
            eqs = detect_eqh_eql(state, sub_h, sub_l, sub_t, atr_val, SMC_EQH_BARS, SMC_EQH_THR, i)
            state.eqh_eql_list.extend(eqs)

        # FVG
        if SMC_FVG and i >= 2:
            new_fvgs = detect_fvg(sub_c, sub_o, sub_h, sub_l, sub_t, SMC_FVG_AUTO)
            if new_fvgs:
                state.fvg_list.insert(0, new_fvgs[-1])
            state.fvg_list = mitigate_fvg(state.fvg_list, h, l)
            if len(state.fvg_list) > 50:
                state.fvg_list = state.fvg_list[:50]

    # Cắt OB theo config
    state.swing_obs = state.swing_obs[:SMC_SWING_OB_CNT if SMC_SWING_OB else 0]
    state.internal_obs = state.internal_obs[:SMC_INT_OB_CNT if SMC_INT_OB else 0]


def merge_ob_zones(tracker: AssetTracker, entry_threshold_pct: Decimal = None):
    from bots.sub2 import bot_config
    if entry_threshold_pct is None:
        entry_threshold_pct = getattr(bot_config, "OB_MERGE_THRESHOLD_PCT", Decimal("0.010"))
    """
    Gộp các OB gần nhau (cùng bias) thành 1 vùng Zone tổng.
    Giữ nguyên TP multiplier của OB có risk lớn nhất.
    """
    setups = tracker.trade_setups
    if len(setups) <= 1: return

    longs = [s for s in setups if s.bias == BULLISH and not s.triggered]
    shorts = [s for s in setups if s.bias == BEARISH and not s.triggered]
    triggered = [s for s in setups if s.triggered]

    def merge_group(group: list[TradeSetup], bias: int) -> Optional[TradeSetup]:
        if not group: return None
        if len(group) == 1: return group[0]
        
        if bias == BULLISH:
            max_entry = max(s.entry_price for s in group)
            min_sl = min(s.stop_loss for s in group)
            risk = abs(max_entry - min_sl)
            if risk <= 0 or risk < max_entry * Decimal("0.001"):
                return None
            best = max(group, key=lambda s: abs(s.entry_price - s.stop_loss))
            tp_mult = abs(best.take_profit - best.entry_price) / abs(best.entry_price - best.stop_loss) if abs(best.entry_price - best.stop_loss) > 0 else Decimal("3.0")
            tp = max_entry + risk * tp_mult
            return TradeSetup(
                bias=BULLISH, entry_price=max_entry, stop_loss=min_sl,
                take_profit=tp, ob_source=best.ob_source,
                created_bar=max(s.created_bar for s in group),
                tf=best.tf, pos_usdt=best.pos_usdt
            )
        else:
            min_entry = min(s.entry_price for s in group)
            max_sl = max(s.stop_loss for s in group)
            risk = abs(max_sl - min_entry)
            if risk <= 0 or risk < min_entry * Decimal("0.001"):
                return None
            best = max(group, key=lambda s: abs(s.entry_price - s.stop_loss))
            tp_mult = abs(best.take_profit - best.entry_price) / abs(best.entry_price - best.stop_loss) if abs(best.entry_price - best.stop_loss) > 0 else Decimal("3.0")
            tp = min_entry - risk * tp_mult
            return TradeSetup(
                bias=BEARISH, entry_price=min_entry, stop_loss=max_sl,
                take_profit=tp, ob_source=best.ob_source,
                created_bar=max(s.created_bar for s in group),
                tf=best.tf, pos_usdt=best.pos_usdt
            )

    def cluster_setups(group: list[TradeSetup], bias: int) -> list[TradeSetup]:
        if not group: return []
        group.sort(key=lambda s: float(s.entry_price))
        clusters = []
        current_cluster = [group[0]]
        for i in range(1, len(group)):
            prev = current_cluster[-1]
            curr = group[i]
            diff = abs(curr.entry_price - prev.entry_price) / curr.entry_price
            if diff < entry_threshold_pct:
                current_cluster.append(curr)
            else:
                clusters.append(current_cluster)
                current_cluster = [curr]
        clusters.append(current_cluster)
        
        merged = []
        for cl in clusters:
            m = merge_group(cl, bias)
            if m: merged.append(m)
        return merged

    final_setups = triggered.copy()
    final_setups.extend(cluster_setups(longs, BULLISH))
    final_setups.extend(cluster_setups(shorts, BEARISH))
    tracker.trade_setups = final_setups


def check_entry_touch(tracker: AssetTracker) -> bool:
    """
    Kiểm tra xem setup nào đã THỰC SỰ khớp trên sàn OKX.
    Chỉ coi là triggered khi sàn OKX có vị thế mở cùng chiều (tracker.has_long / tracker.has_short).
    Tuyệt đối không tự ý gán triggered ảo trong RAM khi sàn chưa khớp lệnh!
    """
    # 1. Nếu sàn OKX không có vị thế mở cùng chiều, bảo đảm triggered = False
    if not tracker.has_long:
        for s in tracker.trade_setups:
            if s.bias == BULLISH:
                s.triggered = False
                s.tp_sl_placed = False
    if not tracker.has_short:
        for s in tracker.trade_setups:
            if s.bias == BEARISH:
                s.triggered = False
                s.tp_sl_placed = False

    if not tracker.has_long and not tracker.has_short:
        return False

    newly_triggered = False
    for setup in tracker.trade_setups:
        has_pos_on_exchange = (setup.bias == BULLISH and tracker.has_long) or \
                              (setup.bias == BEARISH and tracker.has_short)
        if not has_pos_on_exchange:
            setup.triggered = False
            continue

        if not setup.triggered:
            avg_px = tracker.active_avg_px_long if setup.bias == BULLISH else tracker.active_avg_px_short
            is_price_touched = (tracker.live_low <= setup.entry_price <= tracker.live_high)
            is_avg_px_matched = (avg_px > Decimal("0") and abs(avg_px - setup.entry_price) / setup.entry_price < Decimal("0.02"))

            if is_price_touched or is_avg_px_matched:
                setup.triggered = True
                newly_triggered = True
                side_tag = "LONG" if setup.bias == BULLISH else "SHORT"
                print(f"🎯 [SMC TRIGGER] Khớp vị thế thực tế trên OKX: {side_tag} [{setup.tf}] @ {setup.entry_price}")
    return newly_triggered


# =============================================================================
# MAIN STRATEGY CYCLE — MULTI-TIMEFRAME PER-TF EXECUTION
# =============================================================================

def generate_dual_nearest_setups(
    tf_state: TFState,
    live_price: Decimal,
    tf: str,
    current_bar: int,
    vol_mult: Decimal,
    entry_mult: Decimal
) -> list[TradeSetup]:
    """
    Tạo hoặc cập nhật Dual Nearest OB Setups cho 1 TF độc lập theo CHỈ BÁO TRÊN WEB CHART:
    - 1 Bullish OB gần nhất ở dưới giá -> Setup LONG (Entry = mép trên ob.bar_high)
    - 1 Bearish OB gần nhất ở trên giá -> Setup SHORT (Entry = mép dưới ob.bar_low)
    - Điều kiện an toàn: Không đè lên nhau, cách nhau >= 5 nến và >= 0.5% giá.
    - Bảo toàn trạng thái lệnh đã đặt / đã khớp của các vòng lặp trước.
    """
    if not getattr(bot_config, "SMC_TRADE", True):
        return []

    # 1. Thu thập OBs chưa bị đâm xuyên (unmitigated) từ swing_obs
    active_obs = [o for o in tf_state.swing_obs if not (o.crossed or getattr(o, "mitigated", False))]
    if getattr(tf_state, "internal_obs", None):
        active_obs.extend([o for o in tf_state.internal_obs if not (o.crossed or getattr(o, "mitigated", False))])

    if not active_obs:
        return []

    bull_obs = [o for o in active_obs if o.bias == BULLISH]
    bear_obs = [o for o in active_obs if o.bias == BEARISH]

    # 2. Tìm Bullish OB gần nhất ở dưới giá (Cầu đón mua)
    nearest_bull: Optional[OrderBlock] = None
    bulls_below = [o for o in bull_obs if o.bar_high <= live_price * Decimal("1.002")]
    if bulls_below:
        nearest_bull = max(bulls_below, key=lambda x: x.bar_high)
    elif bull_obs:
        nearest_bull = bull_obs[-1]

    # 3. Tìm Bearish OB gần nhất ở trên giá (Cung đón bán)
    nearest_bear: Optional[OrderBlock] = None
    bears_above = [o for o in bear_obs if o.bar_low >= live_price * Decimal("0.998")]
    if bears_above:
        nearest_bear = min(bears_above, key=lambda x: x.bar_low)
    elif bear_obs:
        nearest_bear = bear_obs[-1]

    # 4. Kiểm tra hướng vào lệnh cho phép (OB_DIRECTION)
    direction = getattr(bot_config, "OB_DIRECTION", "BOTH").upper()
    allow_bull = (nearest_bull is not None) and (direction in ("BOTH", "LONG_ONLY"))
    allow_bear = (nearest_bear is not None) and (direction in ("BOTH", "SHORT_ONLY"))

    # 5. Kiểm tra an toàn: Không đè nhau, cách nhau >= 5 nến và >= khoảng cách ngược chiều tối thiểu (mặc định 0.8%)
    min_bar_gap = getattr(bot_config, "MIN_OB_BAR_GAP", 5)
    base_gap = getattr(bot_config, "OB_MERGE_THRESHOLD_PCT", Decimal("0.005"))
    min_price_gap_pct = base_gap * entry_mult

    # BỘ LỌC KHOẢNG CÁCH OB ĐỐI NGHỊCH (OPPOSITE OB GAP FILTER) THEO CHỈ ĐẠO CỦA CEO:
    # Nếu 2 OB xanh/đỏ đối diện nhau quá sát (< min_price_gap_pct),
    # lọc bỏ OB ở giữa CHỈ KHI phía sau nó vẫn còn OB cùng màu để đỡ/chặn.
    while allow_bull and allow_bear and nearest_bull and nearest_bear:
        is_overlapping = nearest_bull.bar_high >= nearest_bear.bar_low
        b_bull = getattr(nearest_bull, "bar_index", 0)
        b_bear = getattr(nearest_bear, "bar_index", 0)
        bar_dist = abs(b_bull - b_bear) if (b_bull and b_bear) else 999
        ref_px = (nearest_bear.bar_low + nearest_bull.bar_high) / Decimal("2") if (nearest_bear.bar_low + nearest_bull.bar_high) > 0 else (live_price if live_price > Decimal("0") else Decimal("1"))
        gap = max(Decimal("0"), nearest_bear.bar_low - nearest_bull.bar_high)
        price_gap = gap / ref_px

        if is_overlapping or bar_dist < min_bar_gap or price_gap < min_price_gap_pct:
            other_bulls = [o for o in bulls_below if o != nearest_bull and o.bar_high < nearest_bull.bar_low]
            other_bears = [o for o in bears_above if o != nearest_bear and o.bar_low > nearest_bear.bar_high]

            has_bull_below = len(other_bulls) > 0
            has_bear_above = len(other_bears) > 0

            if has_bull_below and not has_bear_above:
                # Phía dưới bull còn OB đỡ, nhưng trên bear không còn OB chặn -> Lọc bỏ nearest_bull để lùi xuống OB dưới
                bulls_below.remove(nearest_bull)
                nearest_bull = max(bulls_below, key=lambda x: x.bar_high) if bulls_below else None
                if not nearest_bull:
                    allow_bull = False
                    break
            elif has_bear_above and not has_bull_below:
                # Phía trên bear còn OB chặn, nhưng dưới bull không còn OB đỡ -> Lọc bỏ nearest_bear để đẩy lên OB trên
                bears_above.remove(nearest_bear)
                nearest_bear = min(bears_above, key=lambda x: x.bar_low) if bears_above else None
                if not nearest_bear:
                    allow_bear = False
                    break
            elif has_bull_below and has_bear_above:
                # Cả 2 đều có điểm tựa: Lọc OB mỏng hơn
                h_bull = nearest_bull.bar_high - nearest_bull.bar_low
                h_bear = nearest_bear.bar_high - nearest_bear.bar_low
                if h_bull <= h_bear:
                    bulls_below.remove(nearest_bull)
                    nearest_bull = max(bulls_below, key=lambda x: x.bar_high) if bulls_below else None
                    if not nearest_bull:
                        allow_bull = False
                        break
                else:
                    bears_above.remove(nearest_bear)
                    nearest_bear = min(bears_above, key=lambda x: x.bar_low) if bears_above else None
                    if not nearest_bear:
                        allow_bear = False
                        break
            else:
                # Cả 2 đều không có điểm tựa: Giữ cả 2 nếu không overlap
                if is_overlapping:
                    dist_bull = abs(live_price - nearest_bull.bar_high)
                    dist_bear = abs(live_price - nearest_bear.bar_low)
                    if dist_bull < dist_bear:
                        allow_bear = False
                    else:
                        allow_bull = False
                break
        else:
            break

    # 6. Tạo setup với Entry đón cản theo Phân đoạn thân OB (chia 5 phần) hoặc Offset & Entry Level
    entry_lvl = getattr(bot_config, "OB_ENTRY_LEVEL", "OUTER")
    raw_fraction = getattr(bot_config, "OB_ENTRY_FRACTION", Decimal("0"))
    if not isinstance(raw_fraction, Decimal):
        try:
            raw_fraction = Decimal(str(raw_fraction))
        except Exception:
            raw_fraction = Decimal("0")

    raw_offset_pct = getattr(bot_config, "ENTRY_OFFSET_PCT", Decimal("0"))
    if not isinstance(raw_offset_pct, Decimal):
        try:
            raw_offset_pct = Decimal(str(raw_offset_pct))
        except Exception:
            raw_offset_pct = Decimal("0")
    vol_mult, offset_mult = get_tf_multiplier(tf)
    eff_offset = (raw_offset_pct / Decimal("100")) * offset_mult if entry_lvl != "EQUILIBRIUM" else Decimal("0")
    tp_mode = getattr(bot_config, "OB_TP_MODE", "RR")

    new_setups: list[TradeSetup] = []
    bull_setup: Optional[TradeSetup] = None
    bear_setup: Optional[TradeSetup] = None

    if allow_bull and nearest_bull:
        bull_setups = register_trade_setups_for_ob(
            nearest_bull, current_bar, 0, tf=tf,
            entry_offset_pct=eff_offset, entry_level=entry_lvl,
            entry_fraction=raw_fraction
        )
        if bull_setups:
            bull_setup = bull_setups[0]
            bull_setup.pos_usdt = calculate_setup_volume(bull_setup, vol_mult)

    if allow_bear and nearest_bear:
        bear_setups = register_trade_setups_for_ob(
            nearest_bear, current_bar, 0, tf=tf,
            entry_offset_pct=eff_offset, entry_level=entry_lvl,
            entry_fraction=raw_fraction
        )
        if bear_setups:
            bear_setup = bear_setups[0]
            bear_setup.pos_usdt = calculate_setup_volume(bear_setup, vol_mult)

    # ⚡ ĐIỀU CHỈNH TP NẾU CHỌN CHỐT LỜI THEO OB NGƯỢC CHIỀU (NEAREST_OB)
    if tp_mode == "NEAREST_OB":
        # Long: Chốt lời tại mép dưới của Bearish OB gần nhất
        if bull_setup and nearest_bear:
            bull_setup.take_profit = nearest_bear.bar_low
        # Short: Chốt lời tại mép trên của Bullish OB gần nhất
        if bear_setup and nearest_bull:
            bear_setup.take_profit = nearest_bull.bar_high

    if bull_setup:
        new_setups.append(bull_setup)
    if bear_setup:
        new_setups.append(bear_setup)

    # 7. Bảo toàn trạng thái của các setup đã tồn tại
    final_setups: list[TradeSetup] = []
    for ns in new_setups:
        for os in tf_state.trade_setups:
            if os.bias == ns.bias:
                price_diff_pct = abs(os.entry_price - ns.entry_price) / ns.entry_price if ns.entry_price > Decimal("0") else Decimal("0")
                if price_diff_pct < Decimal("0.003"): # Vùng giá tương đương <= 0.3%
                    ns.order_placed = os.order_placed
                    ns.triggered = os.triggered
                    ns.tp_sl_placed = os.tp_sl_placed
                    ns.cl_ord_id = os.cl_ord_id
                    ns.last_order_attempt = getattr(os, "last_order_attempt", 0)
                    break
        final_setups.append(ns)

    # Giữ lại các lệnh đang triggered/active khi sàn vẫn đang có vị thế mở cùng chiều
    for os in tf_state.trade_setups:
        if os.triggered:
            if not any(fs.bias == os.bias and fs.tf == os.tf for fs in final_setups):
                final_setups.append(os)

    return final_setups


def run_strategy_cycle(
    client, cfg: dict, pMode: str,
    state_matrix: dict, env_paths: dict, system_config: dict,
    is_limit_setup_cycle: bool, is_enabled: bool = True
):
    swap_id = cfg["swap"]
    coin_name = cfg.get("coin", "")
    tracker = state_matrix[swap_id]

    try:
        # 1. ĐỌC DANH SÁCH TF TRADE CHO COIN NÀY
        enabled_tfs_map = getattr(bot_config, "ENABLED_TFS", {})
        if isinstance(enabled_tfs_map, dict):
            active_tfs_raw = enabled_tfs_map.get(swap_id, enabled_tfs_map.get(coin_name, []))
        elif isinstance(enabled_tfs_map, list):
            active_tfs_raw = enabled_tfs_map
        else:
            active_tfs_raw = []

        # Nếu chưa cấu hình, fallback về ["1H"]
        if not active_tfs_raw:
            active_tfs_raw = getattr(bot_config, "DEFAULT_ACTIVE_TFS", ["1H"])

        # Chuẩn hóa danh sách TF
        active_tfs = [t.strip() for t in active_tfs_raw if t.strip()]

        # 2. LẤY TÌNH TRẠNG VỊ THẾ TỪ SÀN OKX
        tracker.has_long, tracker.has_short = False, False
        tracker.active_avg_px_long, tracker.active_avg_px_short = Decimal("0"), Decimal("0")
        try:
            tracker.last_long_pos_amt = Decimal("0")
            tracker.last_short_pos_amt = Decimal("0")
            positions = client.fetch_positions(swap_id)
            cross_long_amt = Decimal("0")
            cross_long_vol = Decimal("0")
            cross_short_amt = Decimal("0")
            cross_short_vol = Decimal("0")
            
            for p in positions:
                pos_amt = Decimal(p.get("pos", "0"))
                if pos_amt == 0: continue
                pos_side = p.get("posSide", "")
                norm_side = "long" if (pos_side == "long" or (pos_side == "net" and pos_amt > 0)) else "short"
                avg_px = Decimal(p["avgPx"])
                
                if norm_side == "long":
                    tracker.has_long = True
                    cross_long_amt += pos_amt
                    cross_long_vol += pos_amt * avg_px
                else:
                    tracker.has_short = True
                    cross_short_amt += abs(pos_amt)
                    cross_short_vol += abs(pos_amt) * avg_px
                    
            if cross_long_amt > 0:
                tracker.active_avg_px_long = cross_long_vol / cross_long_amt
                tracker.last_long_pos_amt = cross_long_amt
            if cross_short_amt > 0:
                tracker.active_avg_px_short = cross_short_vol / cross_short_amt
                tracker.last_short_pos_amt = cross_short_amt
        except Exception:
            pass

        # 3. NẾU COIN BỊ TẮT HOẶC KHÔNG CÓ TF NÀO ĐƯỢC CHỌN
        if not is_enabled or not active_tfs:
            if not getattr(tracker, "_disabled_cleaned", False):
                clean_ob_orders(client, swap_id, CL_ORD_PREFIX)
                has_open_pos = (tracker.has_long or tracker.has_short)
                if not has_open_pos:
                    clean_algo_orders(client, swap_id, cl_prefix=CL_ORD_PREFIX)
                tracker.trade_setups = []
                tracker._disabled_cleaned = True
                print(f"🧹 [SMC CLEANUP] {coin_name}: Coin/TF bị tắt, đã dọn sạch toàn bộ lệnh limit.")
            return
        else:
            tracker._disabled_cleaned = False

        # 4. DUYỆT TỪNG TF TRONG DANH SÁCH ĐƯỢC TÍCH CHỌN
        all_active_setups = []
        should_reset_nen = system_config.get("SHOULD_RESET_NEN", False)

        for tf in active_tfs:
            okx_bar = normalize_tf_to_okx(tf)
            std_tf = normalize_tf_to_std(tf)

            try:
                candles = client.request("GET", "/api/v5/market/candles",
                                         params={"instId": swap_id, "bar": okx_bar, "limit": LIMIT_CANDLES}).get("data", [])
                if not candles or len(candles) < max(SWING_LENGTH, INTERNAL_LENGTH) + 2:
                    continue
                candles.reverse()

                times = [int(c[0]) for c in candles]
                opens = [Decimal(c[1]) for c in candles]
                highs = [Decimal(c[2]) for c in candles]
                lows = [Decimal(c[3]) for c in candles]
                closes = [Decimal(c[4]) for c in candles]

                # Cập nhật giá realtime tổng
                tracker.live_price = closes[-1]
                tracker.live_high = highs[-1]
                tracker.live_low = lows[-1]

                tf_state = tracker.tf_states.setdefault(std_tf, TFState(tf=std_tf))
                volatility = get_volatility_measure(closes, highs, lows)
                tf_state.atr_200 = calculate_atr(closes, highs, lows, 200)

                # TÍNH TOÁN ORDER BLOCKS ĐỒNG BỘ 100% VỚI WEB CHART
                chart_obs = compute_chart_ob_boxes(candles)
                for o in chart_obs:
                    o.tf = std_tf
                tf_state.swing_obs = chart_obs

                # TẠO DUAL NEAREST OB SETUPS (1 Long ở mép trên Bullish OB, 1 Short ở mép dưới Bearish OB)
                vol_mult, entry_mult = get_tf_multiplier(std_tf)
                tf_setups = generate_dual_nearest_setups(
                    tf_state, tracker.live_price, std_tf, len(closes) - 1, vol_mult, entry_mult
                )
                tf_state.trade_setups = tf_setups
                all_active_setups.extend(tf_state.trade_setups)

            except Exception as _tfe:
                print(f"⚠️ [SMC TF {tf} ERROR] {swap_id}: {_tfe}")

        if should_reset_nen:
            system_config["SHOULD_RESET_NEN"] = False

        # 5. TỔNG HỢP VÀ GỘP CÁC SETUP CỦA MỌI TF
        tracker.trade_setups = all_active_setups
        merge_threshold = getattr(bot_config, "OB_MERGE_THRESHOLD_PCT", Decimal("0.005"))
        merge_ob_zones(tracker, merge_threshold)

        # 6. KIỂM TRA KHỚP ENTRY (CHECK ENTRY TOUCH)
        got_triggered = check_entry_touch(tracker)

        # 7. ĐẶT TP/SL CHO LỆNH VỪA KHỚP
        try:
            spec_data = client.request("GET", "/api/v5/public/instruments",
                                       params={"instType": "SWAP", "instId": swap_id})["data"][0]
            tick_sz = Decimal(spec_data["tickSz"])
            
            for setup in tracker.trade_setups:
                if setup.triggered and not setup.tp_sl_placed:
                    pos_side = "long" if setup.bias == BULLISH else "short"
                    positions = client.fetch_positions(swap_id)
                    for pos in positions:
                        p_side = pos.get("posSide", "net")
                        p_mode = pos.get("mgnMode", "cross")
                        if p_side == pos_side or p_side == "net":
                            pos_sz = pos.get("pos", "0")
                            if Decimal(pos_sz) > 0:
                                ok = apply_ob_tpsl(client, swap_id, setup, pos_sz, tick_sz, CL_ORD_PREFIX, p_mode, tracker.live_price, p_side)
                                setup.tp_sl_placed = ok
                            break
        except Exception as e:
            print(f"🚫 [SMC] Lỗi Exception khi quét/đặt TP/SL: {e}")

        # 8. GÀI LỆNH LIMIT & ÉP KHỚP MARKET THEO TỪNG TF
        try:
            spec_data = client.request("GET", "/api/v5/public/instruments",
                                       params={"instType": "SWAP", "instId": swap_id})["data"][0]
            tick_sz = Decimal(spec_data["tickSz"])
            lot_sz = Decimal(spec_data["lotSz"])
            ct_val = Decimal(spec_data["ctVal"])
            min_sz = Decimal(spec_data["minSz"])
            
            pending_orders = client.request("GET", "/api/v5/trade/orders-pending",
                                            params={"instType": "SWAP", "instId": swap_id}).get("data", [])
            existing_px_set = set()
            for o in pending_orders:
                if o.get("clOrdId", "").startswith(CL_ORD_PREFIX):
                    try:
                        existing_px_set.add(round_to_tick(Decimal(str(o.get("px", "0"))), tick_sz))
                    except: pass

            now_ts = int(time.time())
            # Lọc chọn 1 Long gần nhất và 1 Short gần nhất CHO MỖI TF ĐƯỢC CHỌN (Multi-TF Mode)
            untriggered_setups = [s for s in tracker.trade_setups if not s.triggered]
            selected_setups = []
            for tf in active_tfs:
                std_tf = normalize_tf_to_std(tf)
                tf_untrig = [s for s in untriggered_setups if normalize_tf_to_std(s.tf) == std_tf]
                tf_bulls = [s for s in tf_untrig if s.bias == BULLISH]
                tf_bears = [s for s in tf_untrig if s.bias == BEARISH]
                if tf_bulls:
                    tf_bulls.sort(key=lambda s: abs(tracker.live_price - s.entry_price))
                    selected_setups.append(tf_bulls[0])
                if tf_bears:
                    tf_bears.sort(key=lambda s: abs(tracker.live_price - s.entry_price))
                    selected_setups.append(tf_bears[0])

            # HỦY CÁC LỆNH LIMIT CŨ TRÊN SÀN KHÔNG CÒN TRÙNG VỚI GIÁ OB MỚI
            valid_target_pxs = {round_to_tick(s.entry_price, tick_sz) for s in selected_setups}
            cancel_stale = []
            for o in pending_orders:
                cl_id = o.get("clOrdId", "")
                if CL_ORD_PREFIX in cl_id or o.get("tdMode") == "isolated":
                    try:
                        o_px = round_to_tick(Decimal(str(o.get("px", "0"))), tick_sz)
                        if o_px > Decimal("0") and o_px not in valid_target_pxs:
                            cancel_stale.append({"instId": swap_id, "ordId": o["ordId"]})
                    except Exception:
                        pass
            if cancel_stale:
                for i in range(0, len(cancel_stale), 20):
                    client.request("POST", "/api/v5/trade/cancel-batch-orders", body=cancel_stale[i:i+20])
                    time.sleep(0.1)
                print(f"🧹 [SMC REFRESH] {coin_name}: Đã dọn dẹp {len(cancel_stale)} lệnh limit cũ không còn khớp với vùng OB trên chart.")

            for setup in selected_setups:
                if setup.triggered:
                    continue

                setup_px_rounded = round_to_tick(setup.entry_price, tick_sz)
                if setup_px_rounded in existing_px_set:
                    setup.order_placed = True
                    continue

                last_attempt = getattr(setup, "last_order_attempt", 0)
                if now_ts - last_attempt < 20:
                    continue
                setup.last_order_attempt = now_ts

                pos_usdt = setup.pos_usdt if setup.pos_usdt > Decimal("0") else Decimal("1.0")
                std_tf = normalize_tf_to_std(setup.tf) if setup.tf else "H1"

                # ⚡ Kiểm tra giá lọt qua Entry để ép khớp Market
                lp = tracker.live_price
                if lp > 0:
                    is_crossed = (setup.bias == BULLISH and lp <= setup.entry_price) or (setup.bias == BEARISH and lp >= setup.entry_price)
                    if is_crossed:
                        if getattr(bot_config, "FORCE_MARKET_ENTRY_ON_CROSS", True):
                            max_slip = getattr(bot_config, "MAX_MARKET_SLIPPAGE_PCT", Decimal("0.008"))
                            if abs(lp - setup.entry_price) / setup.entry_price <= max_slip:
                                lev = Decimal(str(getattr(bot_config, "LEVERAGE", 100)))
                                notional_usdt = pos_usdt * lev
                                sz_raw = round_to_tick(notional_usdt / (lp * ct_val), lot_sz)
                                sz_str = str(max(sz_raw, min_sz))
                                ok, err_detail = place_ob_market_order(client, swap_id, setup, sz_str, tick_sz, CL_ORD_PREFIX)
                                if ok:
                                    orig_risk = abs(setup.entry_price - setup.stop_loss)
                                    orig_tp_dist = abs(setup.take_profit - setup.entry_price)
                                    if setup.bias == BULLISH:
                                        setup.entry_price = lp
                                        setup.stop_loss = lp - orig_risk
                                        setup.take_profit = lp + orig_tp_dist
                                    else:
                                        setup.entry_price = lp
                                        setup.stop_loss = lp + orig_risk
                                        setup.take_profit = lp - orig_tp_dist

                                    setup.triggered = True
                                    setup.order_placed = True
                                    print(f"🚀 [SMC MARKET] {coin_name} [{std_tf}]: ÉP KHỚP MARKET {('LONG' if setup.bias == BULLISH else 'SHORT')} @ {float(lp):.2f} (Ký quỹ: {pos_usdt} U)")
                                    continue
                        continue

                lev = Decimal(str(getattr(bot_config, "LEVERAGE", 100)))
                notional_usdt = pos_usdt * lev
                ref_px = setup.entry_price if setup.entry_price > Decimal("0") else tracker.live_price
                sz_raw = round_to_tick(notional_usdt / (ref_px * ct_val), lot_sz)
                sz_str = str(max(sz_raw, min_sz))
                ok, err_detail = place_ob_limit_order(client, swap_id, setup, sz_str, tick_sz, CL_ORD_PREFIX)
                if ok:
                    setup.order_placed = True
                    existing_px_set.add(setup_px_rounded)
                    print(f"📊 [SMC LIMIT] {coin_name} [{std_tf}]: Đặt Limit {('LONG' if setup.bias == BULLISH else 'SHORT')} ({setup.ob_source}) @ {float(setup.entry_price):.2f} (Ký quỹ: {pos_usdt} U)")
                else:
                    print(f"🚫 [SMC LIMIT] {coin_name} [{std_tf}]: OKX từ chối lệnh @ {float(setup.entry_price):.2f} - {err_detail}")
        except Exception:
            pass

    except Exception as e:
        import traceback
        print(f"Exception in run_strategy_cycle: {e}")
        traceback.print_exc()


def calculate_setup_volume(setup: TradeSetup, vol_mult: Decimal = Decimal("1.0")) -> Decimal:
    """Tính quy mô vốn ký quỹ (Margin USDT) cho setup, kết hợp hệ số nhân TF Multiplier nếu được kích hoạt"""
    base_vol = getattr(bot_config, "POSITION_VOLUME_USDT", getattr(bot_config, "POSITION_VOLUME_HIGH_CONFIDENCE", Decimal("0.4")))
    if not isinstance(base_vol, Decimal):
        base_vol = Decimal(str(base_vol))

    # Nếu bật nhân volume theo TF Multiplier
    if getattr(bot_config, "ENABLE_TF_VOLUME_MULTIPLIER", False):
        final_vol = base_vol * vol_mult
    else:
        final_vol = base_vol

    return final_vol


def sync_config_to_json(env_paths: dict, globals_ref):
    """Đồng bộ cấu hình từ bot_config.py → JSON (Two-Way Sync Chiều 1: Code → JSON) cho Sub2 SMC"""
    try:
        import importlib
        import bots.sub2.bot_config as cfg_ref
        importlib.reload(cfg_ref)
        config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if not config_path:
            return
            
        existing_cfg = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as _f:
                    existing_cfg = json.load(_f)
            except: pass
            
        existing_cfg.update({
            "POSITION_VOLUME_HIGH_CONFIDENCE": str(cfg_ref.POSITION_VOLUME_HIGH_CONFIDENCE),
            "POSITION_VOLUME_USDT": float(cfg_ref.POSITION_VOLUME_USDT),
            "LEVERAGE": int(cfg_ref.LEVERAGE),
            "SWING_VOLUME_USDT": str(cfg_ref.SWING_VOLUME_USDT),
            "SWING_RISK_PCT": str(cfg_ref.SWING_RISK_PCT),
            "INTERNAL_VOLUME_USDT": str(cfg_ref.INTERNAL_VOLUME_USDT),
            "INTERNAL_RISK_PCT": str(cfg_ref.INTERNAL_RISK_PCT),
            "INTERNAL_LEVERAGE": int(cfg_ref.INTERNAL_LEVERAGE),
            "SMC_TRADE": bool(cfg_ref.SMC_TRADE),
            "ENABLE_STRATEGY_SMC": bool(cfg_ref.ENABLE_STRATEGY_SMC),
            "ENABLE_MULTITF_GRID": bool(cfg_ref.ENABLE_MULTITF_GRID),
            "OB_SOURCE": cfg_ref.OB_SOURCE,
            "OB_DIRECTION": cfg_ref.OB_DIRECTION,
            "OB_TP_MODE": getattr(cfg_ref, "OB_TP_MODE", "RR"),
            "OB_VOLATILITY_MULT": float(cfg_ref.OB_VOLATILITY_MULT),
            "SWING_LENGTH": int(cfg_ref.SWING_LENGTH),
            "INTERNAL_LENGTH": int(cfg_ref.INTERNAL_LENGTH),
            "FORCE_MARKET_ENTRY_ON_CROSS": bool(cfg_ref.FORCE_MARKET_ENTRY_ON_CROSS),
            "MAX_MARKET_SLIPPAGE_PCT": float(cfg_ref.MAX_MARKET_SLIPPAGE_PCT),
            "ENTRY_OFFSET_PCT": float(cfg_ref.ENTRY_OFFSET_PCT),
            "OB_ENTRY_LEVEL": cfg_ref.OB_ENTRY_LEVEL,
            "OB_MERGE_THRESHOLD_PCT": float(cfg_ref.OB_MERGE_THRESHOLD_PCT),
            "OB_OPPOSITE_GAP_PCT": float(getattr(cfg_ref, "OB_OPPOSITE_GAP_PCT", Decimal("0.008"))),
            "OB_AUTO_MITIGATION": bool(cfg_ref.OB_AUTO_MITIGATION),
            "OB_MERGE_OVERLAPPING": bool(cfg_ref.OB_MERGE_OVERLAPPING),
            "OB_MAX_ACTIVE_SETUPS": int(cfg_ref.OB_MAX_ACTIVE_SETUPS),
            "ENABLE_TF_VOLUME_MULTIPLIER": bool(cfg_ref.ENABLE_TF_VOLUME_MULTIPLIER),
            "ENABLED_TFS": cfg_ref.ENABLED_TFS,
        })
        
        temp_file = config_path + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(existing_cfg, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, config_path)
        print("🔄 [TWO-WAY SYNC]: Đã đồng bộ cấu hình từ bot_config.py sang JSON (Sub2 SMC)!")
    except Exception as e:
        print(f"⚠️ [SYNC LỖI]: Không thể đồng bộ config ra JSON: {e}")


def load_global_config_from_json(env_paths: dict, globals_ref: Any):
    """Nạp cấu hình động từ JSON (Web App) vào bot_config của Sub2 SMC"""
    try:
        config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                
                if "POSITION_VOLUME_HIGH_CONFIDENCE" in cfg:
                    globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE = Decimal(str(cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
                if "POSITION_VOLUME_USDT" in cfg:
                    globals_ref.POSITION_VOLUME_USDT = Decimal(str(cfg["POSITION_VOLUME_USDT"]))
                if "LEVERAGE" in cfg: globals_ref.LEVERAGE = int(cfg["LEVERAGE"])
                if "SWING_VOLUME_USDT" in cfg: globals_ref.SWING_VOLUME_USDT = Decimal(str(cfg["SWING_VOLUME_USDT"]))
                if "INTERNAL_VOLUME_USDT" in cfg: globals_ref.INTERNAL_VOLUME_USDT = Decimal(str(cfg["INTERNAL_VOLUME_USDT"]))
                
                # Multi-TF Configuration
                if "ENABLED_TFS" in cfg: globals_ref.ENABLED_TFS = cfg["ENABLED_TFS"]
                if "ENABLE_TF_VOLUME_MULTIPLIER" in cfg: globals_ref.ENABLE_TF_VOLUME_MULTIPLIER = bool(cfg["ENABLE_TF_VOLUME_MULTIPLIER"])
                if "ENABLE_MULTITF_GRID" in cfg: globals_ref.ENABLE_MULTITF_GRID = bool(cfg["ENABLE_MULTITF_GRID"])
                
                # Risk & Ratio
                if "OB_RR_RATIO_TREND" in cfg: globals_ref.OB_RR_RATIO_TREND = Decimal(str(cfg["OB_RR_RATIO_TREND"]))
                if "OB_RR_RATIO_COUNTER" in cfg:
                    globals_ref.OB_RR_RATIO_COUNTER = Decimal(str(cfg["OB_RR_RATIO_COUNTER"]))
                    globals_ref.OB_SL_RATIO = globals_ref.OB_RR_RATIO_COUNTER
                if "OB_SL_RATIO" in cfg: globals_ref.OB_SL_RATIO = Decimal(str(cfg["OB_SL_RATIO"]))

                # SMC Parameters
                if "SMC_TRADE" in cfg: globals_ref.SMC_TRADE = bool(cfg["SMC_TRADE"])
                if "ENABLE_STRATEGY_SMC" in cfg: globals_ref.ENABLE_STRATEGY_SMC = bool(cfg["ENABLE_STRATEGY_SMC"])
                if "OB_SOURCE" in cfg: globals_ref.OB_SOURCE = cfg["OB_SOURCE"]
                if "OB_DIRECTION" in cfg: globals_ref.OB_DIRECTION = cfg["OB_DIRECTION"]
                if "OB_TP_MODE" in cfg: globals_ref.OB_TP_MODE = cfg["OB_TP_MODE"]
                if "OB_VOLATILITY_MULT" in cfg: globals_ref.OB_VOLATILITY_MULT = float(cfg["OB_VOLATILITY_MULT"])
                if "SWING_LENGTH" in cfg: globals_ref.SWING_LENGTH = int(cfg["SWING_LENGTH"])
                if "INTERNAL_LENGTH" in cfg: globals_ref.INTERNAL_LENGTH = int(cfg["INTERNAL_LENGTH"])
                if "FORCE_MARKET_ENTRY_ON_CROSS" in cfg: globals_ref.FORCE_MARKET_ENTRY_ON_CROSS = bool(cfg["FORCE_MARKET_ENTRY_ON_CROSS"])
                if "MAX_MARKET_SLIPPAGE_PCT" in cfg: globals_ref.MAX_MARKET_SLIPPAGE_PCT = Decimal(str(cfg["MAX_MARKET_SLIPPAGE_PCT"]))
                if "ENTRY_OFFSET_PCT" in cfg: globals_ref.ENTRY_OFFSET_PCT = Decimal(str(cfg["ENTRY_OFFSET_PCT"]))
                if "OB_ENTRY_LEVEL" in cfg: globals_ref.OB_ENTRY_LEVEL = cfg["OB_ENTRY_LEVEL"]
                if "OB_MERGE_THRESHOLD_PCT" in cfg: globals_ref.OB_MERGE_THRESHOLD_PCT = Decimal(str(cfg["OB_MERGE_THRESHOLD_PCT"]))
                if "OB_OPPOSITE_GAP_PCT" in cfg: globals_ref.OB_OPPOSITE_GAP_PCT = Decimal(str(cfg["OB_OPPOSITE_GAP_PCT"]))
                if "OB_AUTO_MITIGATION" in cfg: globals_ref.OB_AUTO_MITIGATION = bool(cfg["OB_AUTO_MITIGATION"])
                if "OB_MERGE_OVERLAPPING" in cfg: globals_ref.OB_MERGE_OVERLAPPING = bool(cfg["OB_MERGE_OVERLAPPING"])
                if "OB_MAX_ACTIVE_SETUPS" in cfg: globals_ref.OB_MAX_ACTIVE_SETUPS = int(cfg["OB_MAX_ACTIVE_SETUPS"])
                if "ENABLED_COINS" in cfg: globals_ref.ENABLED_COINS = cfg["ENABLED_COINS"]
                
                # Update COIN_PORTFOLIO mapping
                for item in globals_ref.COIN_PORTFOLIO:
                    item["leverage"] = globals_ref.LEVERAGE
    except Exception as e:
        print(f"⚠️ Lỗi đọc JSON config Sub2: {e}")
