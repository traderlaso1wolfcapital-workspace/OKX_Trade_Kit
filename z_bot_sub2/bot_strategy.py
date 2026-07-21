# -*- coding: utf-8 -*-
"""
bot_sub2.py - SMC Order Block Engine
Port 100% từ chỉ báo TLS1 - SMC OB Auto v2 (PineScript -> Python)
"""
import os
import time
import json
from decimal import Decimal
from typing import List, Optional, Tuple, Dict, Any

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

from z_bot_sub2.bot_indicators import *
from z_bot_sub2.bot_orders import *

def replay_history(
    tracker: AssetTracker,
    closes: list, opens: list, highs: list, lows: list, times: list,
    volatility: Decimal
):
    """
    Port đầy đủ của logic PineScript chạy bar-by-bar.
    Duyệt từ nến thứ max(SWING_LENGTH, INTERNAL_LENGTH) đến cuối.
    """
    parsed_highs, parsed_lows = build_parsed_arrays(highs, lows, volatility)
    tracker.parsed_highs = parsed_highs[:-1]
    tracker.parsed_lows = parsed_lows[:-1]

    # Reset state
    tracker.swing_high = Pivot()
    tracker.swing_low = Pivot()
    tracker.internal_high = Pivot()
    tracker.internal_low = Pivot()
    tracker.equal_high = Pivot()
    tracker.equal_low = Pivot()
    tracker.swing_leg = -1
    tracker.internal_leg = -1
    tracker.swing_trend = 0
    tracker.internal_trend = 0
    tracker.swing_obs = []
    tracker.internal_obs = []
    tracker.fvg_list = []
    tracker.eqh_eql_list = []
    tracker.trailing_top = None
    tracker.trailing_bottom = None
    tracker.trailing_top_time = None
    tracker.trailing_bottom_time = None
    tracker.trailing_bar_time = None

    start = max(SWING_LENGTH, INTERNAL_LENGTH) + 2

    # Chỉ xử lý các nến đã đóng (bỏ qua nến cuối cùng len(closes)-1 đang chạy)
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

        # --- UPDATE TRAILING EXTREMES ---
        update_trailing_extremes(tracker, h, l, t)

        # ---------------------------------------------------------------
        # SWING STRUCTURE
        # ---------------------------------------------------------------
        new_swing_leg = detect_leg(sub_h, sub_l, SWING_LENGTH)
        if new_swing_leg != -1 and new_swing_leg != tracker.swing_leg:
            sh, sl, changed = update_pivots_from_leg(
                new_swing_leg, tracker.swing_leg,
                tracker.swing_high, tracker.swing_low,
                sub_h, sub_l, sub_t, i, SWING_LENGTH
            )
            if changed:
                tracker.swing_high = sh
                tracker.swing_low = sl
                tracker.swing_leg = new_swing_leg

        sb, stag, st, sbias = detect_structure_break(
            c, tracker.swing_high, tracker.swing_low, tracker.swing_trend,
            bull_filter=SMC_SWING_BULL, bear_filter=SMC_SWING_BEAR,
            is_internal=False,
            prev_close=closes[i-1] if i > 0 else None
        )
        if sb and sbias != 0:
            pivot_used = tracker.swing_low if sbias == BULLISH else tracker.swing_high
            if SMC_SWING_OB:
                ob = find_order_block(
                    sub_ph, sub_pl, sub_t,
                    pivot_used.bar_index, i, sbias, "SWING",
                    highs=sub_h, lows=sub_l
                )
                if ob:
                    tracker.swing_obs.insert(0, ob)
                    if len(tracker.swing_obs) > 100:
                        tracker.swing_obs.pop()
        tracker.swing_trend = st

        # ---------------------------------------------------------------
        # INTERNAL STRUCTURE
        # ---------------------------------------------------------------
        new_int_leg = detect_leg(sub_h, sub_l, INTERNAL_LENGTH)
        if new_int_leg != -1 and new_int_leg != tracker.internal_leg:
            ih, il, changed = update_pivots_from_leg(
                new_int_leg, tracker.internal_leg,
                tracker.internal_high, tracker.internal_low,
                sub_h, sub_l, sub_t, i, INTERNAL_LENGTH
            )
            if changed:
                tracker.internal_high = ih
                tracker.internal_low = il
                tracker.internal_leg = new_int_leg

        ib, itag, it, ibias = detect_structure_break(
            c, tracker.internal_high, tracker.internal_low, tracker.internal_trend,
            bull_filter=SMC_INT_BULL, bear_filter=SMC_INT_BEAR,
            confluence_filter=SMC_INT_CONF,
            open_p=o, high_p=h, low_p=l,
            internal_high=tracker.swing_high, internal_low=tracker.swing_low,
            is_internal=True,
            prev_close=closes[i-1] if i > 0 else None
        )
        if ib and ibias != 0:
            pivot_used = tracker.internal_low if ibias == BULLISH else tracker.internal_high
            if SMC_INT_OB:
                ob = find_order_block(
                    sub_ph, sub_pl, sub_t,
                    pivot_used.bar_index, i, ibias, "INTERNAL",
                    highs=sub_h, lows=sub_l
                )
                if ob:
                    tracker.internal_obs.insert(0, ob)
                    if len(tracker.internal_obs) > 100:
                        tracker.internal_obs.pop()
        tracker.internal_trend = it

        # ---------------------------------------------------------------
        # MITIGATE OBs mỗi nến
        # ---------------------------------------------------------------
        tracker.swing_obs = mitigate_order_blocks(tracker.swing_obs, h, l, c)
        tracker.internal_obs = mitigate_order_blocks(tracker.internal_obs, h, l, c)

        # ---------------------------------------------------------------
        # EQH / EQL
        # ---------------------------------------------------------------
        if SMC_EQH:
            atr_val = calculate_atr(sub_c, sub_h, sub_l, 200)
            eqs = detect_eqh_eql(tracker, sub_h, sub_l, sub_t, atr_val, SMC_EQH_BARS, SMC_EQH_THR, i)
            tracker.eqh_eql_list.extend(eqs)

        # ---------------------------------------------------------------
        # FVG
        # ---------------------------------------------------------------
        if SMC_FVG and i >= 2:
            new_fvgs = detect_fvg(sub_c, sub_o, sub_h, sub_l, sub_t, SMC_FVG_AUTO)
            if new_fvgs:
                # chỉ thêm FVG mới nhất của bar này
                tracker.fvg_list.insert(0, new_fvgs[-1])
            tracker.fvg_list = mitigate_fvg(tracker.fvg_list, h, l)
            if len(tracker.fvg_list) > 50:
                tracker.fvg_list = tracker.fvg_list[:50]

    # Cắt OB theo config
    tracker.swing_obs = tracker.swing_obs[:SMC_SWING_OB_CNT if SMC_SWING_OB else 0]
    tracker.internal_obs = tracker.internal_obs[:SMC_INT_OB_CNT if SMC_INT_OB else 0]


def replay_history_m30(
    tracker: AssetTracker,
    closes: list, opens: list, highs: list, lows: list, times: list,
    volatility: Decimal
):
    """Replay M30 hedge frame - chỉ lưu Swing OB vào tracker.m30_swing_obs."""
    parsed_highs, parsed_lows = build_parsed_arrays(highs, lows, volatility)

    # Reset M30 state (dùng pivot local)
    m30_high = Pivot()
    m30_low = Pivot()
    m30_leg = -1
    m30_trend = 0
    tracker.m30_swing_obs = []

    start = SWING_LENGTH + 2
    # Chỉ xử lý các nến đã đóng
    for i in range(start, len(closes) - 1):
        sub_h = highs[:i + 1]
        sub_l = lows[:i + 1]
        sub_t = times[:i + 1]
        sub_ph = parsed_highs[:i + 1]
        sub_pl = parsed_lows[:i + 1]

        c = closes[i]
        h = highs[i]
        l = lows[i]

        new_leg = detect_leg(sub_h, sub_l, SWING_LENGTH)
        if new_leg != -1 and new_leg != m30_leg:
            sh, sl, changed = update_pivots_from_leg(
                new_leg, m30_leg, m30_high, m30_low,
                sub_h, sub_l, sub_t, i, SWING_LENGTH
            )
            if changed:
                m30_high, m30_low = sh, sl
                m30_leg = new_leg

        sb, stag, st, sbias = detect_structure_break(
            c, m30_high, m30_low, m30_trend,
            bull_filter=SMC_SWING_BULL, bear_filter=SMC_SWING_BEAR,
            is_internal=False,
            prev_close=closes[i-1] if i > 0 else None
        )
        if sb and sbias != 0:
            pivot_used = m30_low if sbias == BULLISH else m30_high
            if SMC_SWING_OB:
                ob = find_order_block(
                    sub_ph, sub_pl, sub_t,
                    pivot_used.bar_index, i, sbias, "SWING",
                    highs=sub_h, lows=sub_l
                )
                if ob:
                    tracker.m30_swing_obs.insert(0, ob)
                    if len(tracker.m30_swing_obs) > 100:
                        tracker.m30_swing_obs.pop()
        m30_trend = st

        # Mitigate M30 OB
        tracker.m30_swing_obs = mitigate_order_blocks(tracker.m30_swing_obs, h, l, c)

    # Cắt theo config
    tracker.m30_swing_obs = tracker.m30_swing_obs[:SMC_SWING_OB_CNT if SMC_SWING_OB else 0]


def merge_ob_zones(tracker: AssetTracker, entry_threshold_pct: Decimal = Decimal("0.005")):
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
            # LONG: lấy entry cao nhất, SL thấp nhất
            max_entry = max(s.entry_price for s in group)
            min_sl = min(s.stop_loss for s in group)
            risk = abs(max_entry - min_sl)
            if risk <= 0 or risk < max_entry * Decimal("0.001"):
                return None
            # Giữ tp_mult từ OB có risk lớn nhất
            best = max(group, key=lambda s: abs(s.entry_price - s.stop_loss))
            tp_mult = abs(best.take_profit - best.entry_price) / abs(best.entry_price - best.stop_loss) if abs(best.entry_price - best.stop_loss) > 0 else Decimal("3.0")
            tp = max_entry + risk * tp_mult
            return TradeSetup(
                bias=BULLISH, entry_price=max_entry, stop_loss=min_sl,
                take_profit=tp, ob_source=best.ob_source,
                created_bar=max(s.created_bar for s in group)
            )
        else:
            # SHORT: lấy entry thấp nhất, SL cao nhất
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
                created_bar=max(s.created_bar for s in group)
            )

    # Gom nhóm các setup có entry gần nhau
    def cluster_setups(group: list[TradeSetup], bias: int) -> list[TradeSetup]:
        if not group: return []
        # Sắp xếp theo entry
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
    Port của checkOBTradeEntries() trong PineScript gốc:
    touchedEntry = bar_index > createdBar and low <= entryPrice and high >= entryPrice
    Khi setup khớp -> đánh dấu OB gốc là crossed + has_triggered để không tạo thêm setup.
    Trả về True nếu có ít nhất 1 setup mới được triggered.
    """
    newly_triggered = False
    for setup in tracker.trade_setups:
        if not setup.triggered:
            if (setup.bias == BULLISH and tracker.live_low <= setup.entry_price <= tracker.live_high) or \
               (setup.bias == BEARISH and tracker.live_low <= setup.entry_price <= tracker.live_high):
                setup.triggered = True
                newly_triggered = True
                # Đánh dấu OB gốc đã chết -> không tạo setup mới từ OB này nữa
                all_obs = tracker.swing_obs + tracker.internal_obs + tracker.m30_swing_obs
                for ob in all_obs:
                    if not ob.has_triggered and ob.bias == setup.bias:
                        # OB tạo ra setup này có entry trùng với bar_high (LONG) hoặc bar_low (SHORT)
                        if (setup.bias == BULLISH and abs(ob.bar_high - setup.entry_price) / setup.entry_price < Decimal("0.005")) or \
                           (setup.bias == BEARISH and abs(ob.bar_low - setup.entry_price) / setup.entry_price < Decimal("0.005")):
                            ob.has_triggered = True
                            ob.crossed = True  # chặn tạo setup mới từ OB này
                            break
    return newly_triggered


# =============================================================================
# MAIN STRATEGY CYCLE
# =============================================================================

def run_strategy_cycle(
    client, cfg: dict, pMode: str,
    state_matrix: dict, env_paths: dict, system_config: dict,
    is_limit_setup_cycle: bool
):
    swap_id = cfg["swap"]
    tracker = state_matrix[swap_id]

    try:
        candles = client.request("GET", "/api/v5/market/candles",
                                 params={"instId": swap_id, "bar": TIMEFRAME_BASE, "limit": LIMIT_CANDLES}).get("data", [])
        if not candles:
            return
        candles.reverse()
        
        # Fetch M30 candles cho hedge frame
        m30_candles = client.request("GET", "/api/v5/market/candles",
                                      params={"instId": swap_id, "bar": TIMEFRAME_HEDGE, "limit": M30_LIMIT_CANDLES}).get("data", [])
        if m30_candles:
            m30_candles.reverse()
        
        # --- Remove redundant chart_data JSON print here to prevent console flooding ---

        times = [int(c[0]) for c in candles]
        opens = [Decimal(c[1]) for c in candles]
        highs = [Decimal(c[2]) for c in candles]
        lows = [Decimal(c[3]) for c in candles]
        closes = [Decimal(c[4]) for c in candles]

        tracker.live_price = closes[-1]
        tracker.live_high = highs[-1]
        tracker.live_low = lows[-1]

        # Tính volatility measure theo config
        volatility = get_volatility_measure(closes, highs, lows)
        tracker.atr_200 = calculate_atr(closes, highs, lows, 200)

        # ---------------------------------------------------------------
        # LẤY TÌNH TRẠNG VỊ THẾ TỪ SÀN
        # ---------------------------------------------------------------
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
        except Exception as e:
            pass

        # ---------------------------------------------------------------
        # INITIALIZATION / RESET
        # ---------------------------------------------------------------
        if tracker.last_candle_timestamp == 0 or system_config.get("SHOULD_RESET_NEN", False):
            # ⚡ Hủy tất cả lệnh limit cũ trên sàn trước khi replay OB Zone mới
            clean_ob_orders(client, swap_id, CL_ORD_PREFIX)
            
            replay_history(tracker, closes, opens, highs, lows, times, volatility)
            
            # ⚡ Replay M30 hedge frame
            if m30_candles and len(m30_candles) >= SWING_LENGTH + 2:
                m30_times = [int(c[0]) for c in m30_candles]
                m30_highs = [Decimal(c[2]) for c in m30_candles]
                m30_lows = [Decimal(c[3]) for c in m30_candles]
                m30_closes = [Decimal(c[4]) for c in m30_candles]
                m30_opens = [Decimal(c[1]) for c in m30_candles]
                m30_vol = get_volatility_measure(m30_closes, m30_highs, m30_lows)
                replay_history_m30(tracker, m30_closes, m30_opens, m30_highs, m30_lows, m30_times, m30_vol)
            
            tracker.last_candle_timestamp = times[-1]
            system_config["SHOULD_RESET_NEN"] = False
            tracker.trade_setups = []  # clear setups on reset
            
            # ⚡ Sau replay: tạo trade setups từ Swing OB + Internal OB
            if SMC_TRADE:
                # M15 OB (thuận trend) → TP=1R
                for ob in list(tracker.swing_obs) + list(tracker.internal_obs):
                    if not ob.crossed:
                        new_setups = register_trade_setups_for_ob(ob, len(closes)-1, tracker.swing_trend, is_hedge=False)
                        for setup in new_setups:
                            tracker.trade_setups.append(setup)
                # M30 OB (ngược trend HEDGE) → TP=3R
                for ob in list(tracker.m30_swing_obs):
                    if not ob.crossed:
                        new_setups = register_trade_setups_for_ob(ob, len(closes)-1, tracker.swing_trend, is_hedge=True)
                        for setup in new_setups:
                            tracker.trade_setups.append(setup)
                while len(tracker.trade_setups) > OB_MAX_ACTIVE_SETUPS:
                    tracker.trade_setups.pop(0)
                
                # ⚡ ĐỒNG BỘ TRIGGERED VỚI POSITION THỰC TẾ TRÊN SÀN
                try:
                    positions = client.fetch_positions(swap_id)
                    for setup in tracker.trade_setups:
                        if not setup.triggered:
                            for pos in positions:
                                p_side = pos.get("posSide", "net")
                                p_avg = Decimal(pos.get("avgPx", "0"))
                                if p_avg <= 0:
                                    continue
                                if (setup.bias == BULLISH and p_side in ("long", "net")) or \
                                   (setup.bias == BEARISH and p_side in ("short", "net")):
                                    if abs(p_avg - setup.entry_price) / setup.entry_price < Decimal("0.01"):
                                        setup.triggered = True
                                        # Đánh dấu OB gốc đã chết
                                        all_obs = tracker.swing_obs + tracker.internal_obs + tracker.m30_swing_obs
                                        for ob in all_obs:
                                            if not ob.has_triggered and ob.bias == setup.bias:
                                                if (setup.bias == BULLISH and abs(ob.bar_high - setup.entry_price) / setup.entry_price < Decimal("0.005")) or \
                                                   (setup.bias == BEARISH and abs(ob.bar_low - setup.entry_price) / setup.entry_price < Decimal("0.005")):
                                                    ob.has_triggered = True
                                                    ob.crossed = True
                                                    break
                                        break
                except:
                    pass

            # Load MTF state nếu có
            mtf_file = env_paths.get("FILE_MTF_STATES")
            if mtf_file and os.path.exists(mtf_file):
                try:
                    with open(mtf_file, "r", encoding="utf-8") as f:
                        saved_data = json.load(f)
                        if swap_id in saved_data:
                            cd = saved_data[swap_id]
                            if "max_roi_long" in cd: tracker.max_roi_long = Decimal(str(cd["max_roi_long"]))
                            if "max_roi_short" in cd: tracker.max_roi_short = Decimal(str(cd["max_roi_short"]))
                            if "mae_max_pct_long" in cd: tracker.mae_max_pct_long = Decimal(str(cd["mae_max_pct_long"]))
                            if "mae_max_pct_short" in cd: tracker.mae_max_pct_short = Decimal(str(cd["mae_max_pct_short"]))
                            if "last_entry_l" in cd: tracker.last_entry_l = Decimal(str(cd["last_entry_l"]))
                            if "last_entry_s" in cd: tracker.last_entry_s = Decimal(str(cd["last_entry_s"]))
                except:
                    pass
            return

        # ---------------------------------------------------------------
        # REAL-TIME UPDATE - Nến mới đóng
        # ---------------------------------------------------------------
        if len(times) >= 2 and times[-1] > tracker.last_candle_timestamp:
            tracker.last_candle_timestamp = times[-1]

            # CHỈ xử lý cấu trúc nến vừa ĐÓNG XONG (nến liền trước nến đang chạy)
            i = len(closes) - 2
            if i < 0:
                pass

            sub_h = highs[:i+1]
            sub_l = lows[:i+1]
            sub_c = closes[:i+1]
            sub_o = opens[:i+1]
            sub_t = times[:i+1]
            sub_ph = tracker.parsed_highs
            sub_pl = tracker.parsed_lows

            # Cập nhật parsed arrays cho nến vừa đóng
            h_new = highs[i]
            l_new = lows[i]
            volatility_new = get_volatility_measure(sub_c, sub_h, sub_l)
            threshold = volatility_new * Decimal("2")
            if (h_new - l_new) >= threshold:
                sub_ph.append(l_new)
                sub_pl.append(h_new)
            else:
                sub_ph.append(h_new)
                sub_pl.append(l_new)

            c = closes[i]
            o = opens[i]
            h = highs[i]
            l = lows[i]
            t = times[i]

            # Update trailing extremes
            update_trailing_extremes(tracker, h, l, t)

            # SWING
            new_swing_leg = detect_leg(sub_h, sub_l, SWING_LENGTH)
            if new_swing_leg != -1 and new_swing_leg != tracker.swing_leg:
                sh, sl, changed = update_pivots_from_leg(
                    new_swing_leg, tracker.swing_leg,
                    tracker.swing_high, tracker.swing_low,
                    sub_h, sub_l, sub_t, i, SWING_LENGTH
                )
                if changed:
                    tracker.swing_high = sh
                    tracker.swing_low = sl
                    tracker.swing_leg = new_swing_leg

            sb, stag, st, sbias = detect_structure_break(
                c, tracker.swing_high, tracker.swing_low, tracker.swing_trend,
                bull_filter=SMC_SWING_BULL, bear_filter=SMC_SWING_BEAR,
                is_internal=False,
                prev_close=closes[-2] if len(closes) >= 2 else None
            )
            if sb and sbias != 0:
                pivot_used = tracker.swing_low if sbias == BULLISH else tracker.swing_high
                if SMC_SWING_OB:
                    ob = find_order_block(sub_ph, sub_pl, sub_t, pivot_used.bar_index, i, sbias, "SWING",
                                          highs=sub_h, lows=sub_l)
                    if ob:
                        tracker.swing_obs.insert(0, ob)
                        if len(tracker.swing_obs) > 100:
                            tracker.swing_obs.pop()
                        # 1 OB -> 1 Setup theo bias, RR linh hoạt theo swing_trend
                        if SMC_TRADE:
                            new_setups = register_trade_setups_for_ob(ob, i, tracker.swing_trend)
                            for setup in new_setups:
                                tracker.trade_setups.append(setup)
            tracker.swing_trend = st

            # INTERNAL
            new_int_leg = detect_leg(sub_h, sub_l, INTERNAL_LENGTH)
            if new_int_leg != -1 and new_int_leg != tracker.internal_leg:
                ih, il, changed = update_pivots_from_leg(
                    new_int_leg, tracker.internal_leg,
                    tracker.internal_high, tracker.internal_low,
                    sub_h, sub_l, sub_t, i, INTERNAL_LENGTH
                )
                if changed:
                    tracker.internal_high = ih
                    tracker.internal_low = il
                    tracker.internal_leg = new_int_leg

            ib, itag, it, ibias = detect_structure_break(
                c, tracker.internal_high, tracker.internal_low, tracker.internal_trend,
                bull_filter=SMC_INT_BULL, bear_filter=SMC_INT_BEAR,
                confluence_filter=SMC_INT_CONF,
                open_p=o, high_p=h, low_p=l,
                internal_high=tracker.swing_high, internal_low=tracker.swing_low,
                is_internal=True,
                prev_close=closes[-2] if len(closes) >= 2 else None
            )
            if ib and ibias != 0:
                pivot_used = tracker.internal_low if ibias == BULLISH else tracker.internal_high
                if SMC_INT_OB:
                    ob = find_order_block(sub_ph, sub_pl, sub_t, pivot_used.bar_index, i, ibias, "INTERNAL",
                                          highs=sub_h, lows=sub_l)
                    if ob:
                        tracker.internal_obs.insert(0, ob)
                        if len(tracker.internal_obs) > 100:
                            tracker.internal_obs.pop()
                        # ⚡ Cho phép Internal OB tạo setup nếu ngược trend
                        if SMC_TRADE:
                            new_setups = register_trade_setups_for_ob(ob, i, tracker.swing_trend)
                            for setup in new_setups:
                                tracker.trade_setups.append(setup)
            tracker.internal_trend = it

            # M30 HEDGE FRAME REALTIME UPDATE
            if m30_candles and len(m30_candles) >= SWING_LENGTH + 2:
                m30_last_ts = int(m30_candles[-1][0])
                if m30_last_ts > tracker.last_m30_timestamp:
                    tracker.last_m30_timestamp = m30_last_ts
                    m30_times = [int(c[0]) for c in m30_candles]
                    m30_highs = [Decimal(c[2]) for c in m30_candles]
                    m30_lows = [Decimal(c[3]) for c in m30_candles]
                    m30_closes = [Decimal(c[4]) for c in m30_candles]
                    m30_vol = get_volatility_measure(m30_closes, m30_highs, m30_lows)
                    replay_history_m30(tracker, m30_closes,
                                       [Decimal(c[1]) for c in m30_candles],
                                       m30_highs, m30_lows, m30_times, m30_vol)

            # MITIGATE
            tracker.swing_obs = mitigate_order_blocks(tracker.swing_obs, h, l, c)
            tracker.internal_obs = mitigate_order_blocks(tracker.internal_obs, h, l, c)
            tracker.m30_swing_obs = mitigate_order_blocks(tracker.m30_swing_obs, h, l, c)

            # Cắt theo count config
            tracker.swing_obs = tracker.swing_obs[:SMC_SWING_OB_CNT if SMC_SWING_OB else 0]
            tracker.internal_obs = tracker.internal_obs[:SMC_INT_OB_CNT if SMC_INT_OB else 0]

            # FVG
            if SMC_FVG and i >= 2:
                new_fvgs = detect_fvg(sub_c, sub_o, sub_h, sub_l, sub_t, SMC_FVG_AUTO)
                if new_fvgs:
                    tracker.fvg_list.insert(0, new_fvgs[-1])
                tracker.fvg_list = mitigate_fvg(tracker.fvg_list, h, l)

            # Prune trade setups
            while len(tracker.trade_setups) > OB_MAX_ACTIVE_SETUPS:
                tracker.trade_setups.pop(0)

        # ---------------------------------------------------------------
        # CHECK ENTRY TOUCH (mọi tick)
        # ---------------------------------------------------------------
        got_triggered = check_entry_touch(tracker)
        
        # ⚡ NẾU CÓ LỆNH VỪA KHỚP -> HỦY TOÀN BỘ LIMIT CŨ, ĐẶT LẠI CHỈ CÁC SETUP CHƯA TRIGGERED
        if got_triggered:
            clean_ob_orders(client, swap_id, CL_ORD_PREFIX)
            for s in tracker.trade_setups:
                if not s.triggered:
                    s.order_placed = False  # reset để đặt lại ở block dưới
        
        # ---------------------------------------------------------------
        # ⚡ ĐẶT TP/SL CHO LỆNH VỪA KHỚP
        # ---------------------------------------------------------------
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
                        # Match: net mode khớp mọi thứ, long/short khớp chính xác
                        if p_side == pos_side or p_side == "net":
                            pos_sz = pos.get("pos", "0")
                            if Decimal(pos_sz) > 0:
                                ok = apply_ob_tpsl(client, swap_id, setup, pos_sz, tick_sz, CL_ORD_PREFIX, p_mode, tracker.live_price, p_side)
                                setup.tp_sl_placed = ok
                            break
        except Exception as e:
            print(f"🚫 [SMC] Lỗi Exception khi quét/đặt TP/SL: {e}")
        
        # ---------------------------------------------------------------
        # ⚡ QUÉT SÀN & ĐẶT LỆNH LIMIT OKX (đồng bộ trạng thái thực tế)
        # ---------------------------------------------------------------
        try:
            # Lấy thông số sàn 1 lần
            spec_data = client.request("GET", "/api/v5/public/instruments",
                                       params={"instType": "SWAP", "instId": swap_id})["data"][0]
            tick_sz = Decimal(spec_data["tickSz"])
            lot_sz = Decimal(spec_data["lotSz"])
            ct_val = Decimal(spec_data["ctVal"])
            min_sz = Decimal(spec_data["minSz"])
            
            # Lấy tất cả lệnh pending hiện tại trên sàn
            pending_orders = client.request("GET", "/api/v5/trade/orders-pending",
                                            params={"instType": "SWAP", "instId": swap_id}).get("data", [])
            our_order_ids = set()
            for o in pending_orders:
                cid = o.get("clOrdId", "")
                if cid.startswith(CL_ORD_PREFIX):
                    our_order_ids.add(cid)
            
            # === GỘP OB ZONE TRÙNG LẶP TRƯỚC KHI ĐẶT LỆNH ===
            merge_ob_zones(tracker, Decimal("0.005"))  # 0.5% threshold
            
            # ⚡ Volume riêng cho Swing vs Internal OB
            now_ts = int(time.time())
            for setup in tracker.trade_setups:
                if setup.triggered:
                    continue
                
                # === FILTER BIÊN ĐỘ OKX: chỉ gửi nếu entry trong ±0.45% live_price ===
                lp = tracker.live_price
                if lp > 0:
                    max_limit = lp * Decimal("1.0045")
                    min_limit = lp * Decimal("0.9955")
                    if setup.bias == BULLISH and setup.entry_price > max_limit:
                        continue  # Entry LONG quá xa phía trên, bỏ qua
                    if setup.bias == BEARISH and setup.entry_price < min_limit:
                        continue  # Entry SHORT quá xa phía dưới, bỏ qua
                
                last_attempt = getattr(setup, "last_order_attempt", 0)
                if now_ts - last_attempt < 60:
                    continue
                
                has_order_on_exchange = any(
                    cid.startswith(CL_ORD_PREFIX) for cid in our_order_ids
                )
                
                if has_order_on_exchange:
                    setup.order_placed = True
                    setup.last_order_attempt = now_ts
                    continue
                
                setup.last_order_attempt = now_ts
                # Chọn volume theo loại OB
                if setup.ob_source == "SWING":
                    pos_usdt = SWING_VOLUME_USDT
                else:
                    pos_usdt = INTERNAL_VOLUME_USDT
                sz_raw = round_to_tick(pos_usdt / (tracker.live_price * ct_val), lot_sz)
                sz_str = str(max(sz_raw, min_sz))
                ok, err_detail = place_ob_limit_order(client, swap_id, setup, sz_str, tick_sz, CL_ORD_PREFIX)
                if ok:
                    setup.order_placed = True
                    print(f"📊 [SMC] {cfg.get('coin', swap_id)}: Đặt limit {('LONG' if setup.bias == BULLISH else 'SHORT')} @ {float(setup.entry_price):.2f} | SL: {float(setup.stop_loss):.2f} | TP: {float(setup.take_profit):.2f}")
                else:
                    print(f"🚫 [SMC] {cfg.get('coin', swap_id)}: OKX từ chối lệnh {('LONG' if setup.bias == BULLISH else 'SHORT')} @ {float(setup.entry_price):.2f} - {err_detail}")
        except Exception as _e:
            pass

        # ---------------------------------------------------------------
        # SAVE MTF STATE
        # ---------------------------------------------------------------
        mtf_file = env_paths.get("FILE_MTF_STATES")
        if mtf_file:
            data_to_save = {
                "max_roi_long": str(tracker.max_roi_long),
                "max_roi_short": str(tracker.max_roi_short),
                "mae_max_pct_long": str(tracker.mae_max_pct_long),
                "mae_max_pct_short": str(tracker.mae_max_pct_short),
                "last_entry_l": str(tracker.last_entry_l),
                "last_entry_s": str(tracker.last_entry_s),
            }
            import sys
            if hasattr(sys, '_bot_sub2_io_queue'):
                sys._bot_sub2_io_queue.put((_sync_save_mtf_states_sub2, (swap_id, data_to_save, mtf_file), {}))
            else:
                _sync_save_mtf_states_sub2(swap_id, data_to_save, mtf_file)

    except Exception as e:
        import traceback
        print(f"Exception in run_strategy_cycle: {e}")
        traceback.print_exc()

# z1949 | fix: add missing import os | fix: detect_structure_break false trigger on zero-init Pivot (OB COUNT=0 bug) | fix: add swing_leg/internal_leg to AssetTracker | fix: register_trade_setup pass all_obs for NEAREST_OB TP mode | MAJOR REWRITE: port 100% TLS1-SMC OB Auto v2 - leg() pivot detection, confluence filter, OB mitigation modes (Close/HL), nearestOppOBTP tách internal/swing, FALLBACK_RR mode, direction filter, Int/Swing OB count riêng biệt, keep previous setups, EQH/EQL, FVG, Premium/Discount Zones, Trailing Extremes
# z7712 | Remove redundant JSON chart_data print inside run_strategy_cycle to prevent console flooding
# z7713 | Logic mới: Chỉ dùng Swing OB, 1 OB -> 2 Setup (LONG @ bottom + SHORT @ top) M15 RR 1:1, hủy lệnh ngược chiều khi 1 bên khớp
# z7716 | Quay về logic gốc PineScript: 1 OB -> 1 setup theo bias. RR linh hoạt theo trend: thuận trend 1:5, ngược trend 1:1. Bỏ logic hủy lệnh ngược chiều.


def sync_config_to_json(env_paths: dict, globals_ref):
    """Đồng bộ cấu hình từ bot_config.py → JSON (Two-Way Sync Chiều 1: Code → JSON) cho Sub2 SMC"""
    try:
        import importlib
        import z_bot_sub2.bot_config as cfg_ref
        importlib.reload(cfg_ref)
        cfg = {
            "POSITION_VOLUME_HIGH_CONFIDENCE": str(cfg_ref.POSITION_VOLUME_HIGH_CONFIDENCE),
            "LEVERAGE": int(cfg_ref.LEVERAGE),
            "SWING_VOLUME_USDT": str(cfg_ref.SWING_VOLUME_USDT),
            "SWING_RISK_PCT": str(cfg_ref.SWING_RISK_PCT),
            "INTERNAL_VOLUME_USDT": str(cfg_ref.INTERNAL_VOLUME_USDT),
            "INTERNAL_RISK_PCT": str(cfg_ref.INTERNAL_RISK_PCT),
            "INTERNAL_LEVERAGE": int(cfg_ref.INTERNAL_LEVERAGE),
            "SMC_TRADE": bool(cfg_ref.SMC_TRADE),
            "OB_SOURCE": cfg_ref.OB_SOURCE,
            "OB_DIRECTION": cfg_ref.OB_DIRECTION,
            "OB_MAX_ACTIVE_SETUPS": int(cfg_ref.OB_MAX_ACTIVE_SETUPS),
            "ENABLE_STRATEGY_SMC": bool(cfg_ref.ENABLE_STRATEGY_SMC),
        }
        config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if not config_path:
            return
        temp_file = config_path + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, config_path)
        print("🔄 [TWO-WAY SYNC]: Đã đồng bộ cấu hình từ bot_config.py sang JSON (Sub2 SMC)!")
    except Exception as e:
        print(f"⚠️ [SYNC LỖI]: Không thể đồng bộ config ra JSON: {e}")

def load_global_config_from_json(env_paths: dict, globals_ref: Any):
    try:
        config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                
                if "POSITION_VOLUME_HIGH_CONFIDENCE" in cfg: globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE = float(cfg["POSITION_VOLUME_HIGH_CONFIDENCE"])
                if "LEVERAGE" in cfg: globals_ref.LEVERAGE = int(cfg["LEVERAGE"])
                if "SWING_VOLUME_USDT" in cfg: globals_ref.SWING_VOLUME_USDT = float(cfg["SWING_VOLUME_USDT"])
                if "SWING_RISK_PCT" in cfg: globals_ref.SWING_RISK_PCT = float(cfg["SWING_RISK_PCT"])
                if "INTERNAL_VOLUME_USDT" in cfg: globals_ref.INTERNAL_VOLUME_USDT = float(cfg["INTERNAL_VOLUME_USDT"])
                if "INTERNAL_RISK_PCT" in cfg: globals_ref.INTERNAL_RISK_PCT = float(cfg["INTERNAL_RISK_PCT"])
                if "INTERNAL_LEVERAGE" in cfg: globals_ref.INTERNAL_LEVERAGE = int(cfg["INTERNAL_LEVERAGE"])
                
                if "SMC_TRADE" in cfg: globals_ref.SMC_TRADE = bool(cfg["SMC_TRADE"])
                if "OB_SOURCE" in cfg: globals_ref.OB_SOURCE = cfg["OB_SOURCE"]
                if "OB_DIRECTION" in cfg: globals_ref.OB_DIRECTION = cfg["OB_DIRECTION"]
                if "OB_MAX_ACTIVE_SETUPS" in cfg: globals_ref.OB_MAX_ACTIVE_SETUPS = int(cfg["OB_MAX_ACTIVE_SETUPS"])
                if "ENABLE_STRATEGY_SMC" in cfg: globals_ref.ENABLE_STRATEGY_SMC = bool(cfg["ENABLE_STRATEGY_SMC"])
                
                # Update COIN_PORTFOLIO mapping
                for item in globals_ref.COIN_PORTFOLIO:
                    item["leverage"] = globals_ref.LEVERAGE
    except Exception as e:
        print(f"⚠️ Lỗi đọc JSON config Sub2: {e}")

def _sync_save_mtf_states_sub2(swap_id: str, data: dict, mtf_file: str):
    import os, json
    saved_data = {}
    if os.path.exists(mtf_file):
        try:
            with open(mtf_file, 'r', encoding='utf-8') as f:
                saved_data = json.load(f)
        except: pass
    saved_data[swap_id] = data
    try:
        temp = mtf_file + '.tmp'
        with open(temp, 'w', encoding='utf-8') as f:
            json.dump(saved_data, f, indent=4)
        os.replace(temp, mtf_file)
    except: pass

