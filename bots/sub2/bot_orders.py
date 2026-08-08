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

from bots.sub2.bot_models import AssetTracker, Pivot, OrderBlock, TradeSetup, FairValueGap, EqualLevel
from bots.sub2.bot_config import (
    # Data & Timeframe
    TIMEFRAME_BASE, TIMEFRAME_HEDGE, LIMIT_CANDLES, M30_LIMIT_CANDLES,
    # Volume & Risk
    POSITION_VOLUME_HIGH_CONFIDENCE, LEVERAGE, POSITION_MODE,
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

from bots.sub2.bot_indicators import *

def clean_ob_orders(client, inst_id: str, cl_prefix: str, side: str = None):
    try:
        pending = client.request("GET", "/api/v5/trade/orders-pending",
                                 params={"instType": "SWAP", "instId": inst_id}).get("data", [])
        cancel_batch = []
        for o in pending:
            if cl_prefix in o.get("clOrdId", ""):
                if side is None or o.get("posSide") == side:
                    cancel_batch.append({"instId": inst_id, "ordId": o["ordId"]})
        if cancel_batch:
            for i in range(0, len(cancel_batch), 20):
                client.request("POST", "/api/v5/trade/cancel-batch-orders", body=cancel_batch[i:i+20])
                time.sleep(0.1)
    except Exception as e:
        print(f"⚠️ [clean_ob_orders]: Lỗi khi hủy lệnh rác {inst_id}: {e}")


# Global counter để tránh trùng clOrdId trong cùng 1 giây
_ORDER_COUNTER = 0

def place_ob_limit_order(client, inst_id: str, setup: TradeSetup, sz_str: str, tick_sz: Decimal, cl_prefix: str) -> tuple[bool, str]:
    global _ORDER_COUNTER
    _ORDER_COUNTER += 1
    px_str = f"{round_to_tick(setup.entry_price, tick_sz):.5f}"
    side = "buy" if setup.bias == BULLISH else "sell"
    pMode = getattr(client, 'pMode', 'net_mode')
    if pMode == "net_mode" or pMode == "net":
        pos_side = "net"
    else:
        pos_side = "long" if setup.bias == BULLISH else "short"
        
    cl_id = f"{cl_prefix}{_ORDER_COUNTER:04d}{int(time.time())}"[:32]
    try:
        # Phân biệt mode & đòn bẩy: Internal OB dùng isolated (50x), Swing OB dùng cross (100x)
        if setup.ob_source == "INTERNAL":
            td_mode = "isolated"
            lever = str(INTERNAL_LEVERAGE)
        else:
            td_mode = POSITION_MODE
            lever = str(LEVERAGE)

        # Set leverage trước khi đặt lệnh
        try:
            client.request("POST", "/api/v5/account/set-leverage", body={
                "instId": inst_id, "lever": lever, "mgnMode": td_mode
            })
        except:
            pass
        resp = client.request("POST", "/api/v5/trade/order", body={
            "instId": inst_id, "tdMode": td_mode,
            "side": side, "posSide": pos_side, "ordType": "limit", "sz": sz_str,
            "px": px_str, "clOrdId": cl_id
        })
        if resp and resp.get("code") == "0":
            return True, ""
        err_msg = resp.get("msg", "Unknown") if resp else "No response"
        if resp and "data" in resp and resp["data"]:
            for item in resp["data"]:
                s_msg = item.get("sMsg", "")
                if s_msg:
                    err_msg = s_msg
                    break

        # Nếu gặp lỗi posSide error (51000), tự động fallback retry giữa net và long/short
        if "posSide" in err_msg or "51000" in str(resp.get("code", "")) or "51000" in err_msg:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if setup.bias == BULLISH else "short")
            resp_retry = client.request("POST", "/api/v5/trade/order", body={
                "instId": inst_id, "tdMode": td_mode,
                "side": side, "posSide": fallback_pos_side, "ordType": "limit", "sz": sz_str,
                "px": px_str, "clOrdId": cl_id
            })
            if resp_retry and resp_retry.get("code") == "0":
                client.pMode = "net_mode" if fallback_pos_side == "net" else "long_short_mode"
                return True, ""
            if resp_retry and "data" in resp_retry and resp_retry["data"]:
                for item in resp_retry["data"]:
                    if item.get("sMsg"): err_msg = item["sMsg"]

        return False, err_msg
    except RuntimeError as e:
        return False, str(e)
    except Exception as e:
        return False, f"Exception: {e}"


def place_ob_market_order(client, inst_id: str, setup: TradeSetup, sz_str: str, tick_sz: Decimal, cl_prefix: str) -> tuple[bool, str]:
    global _ORDER_COUNTER
    _ORDER_COUNTER += 1
    side = "buy" if setup.bias == BULLISH else "sell"
    pMode = getattr(client, 'pMode', 'net_mode')
    if pMode == "net_mode" or pMode == "net":
        pos_side = "net"
    else:
        pos_side = "long" if setup.bias == BULLISH else "short"
        
    cl_id = f"{cl_prefix}mkt{_ORDER_COUNTER:03d}{int(time.time())}"[:32]
    try:
        if setup.ob_source == "INTERNAL":
            td_mode = "isolated"
            lever = str(INTERNAL_LEVERAGE)
        else:
            td_mode = POSITION_MODE
            lever = str(LEVERAGE)

        try:
            client.request("POST", "/api/v5/account/set-leverage", body={
                "instId": inst_id, "lever": lever, "mgnMode": td_mode
            })
        except:
            pass

        resp = client.request("POST", "/api/v5/trade/order", body={
            "instId": inst_id, "tdMode": td_mode,
            "side": side, "posSide": pos_side, "ordType": "market", "sz": sz_str,
            "clOrdId": cl_id
        })
        if resp and resp.get("code") == "0":
            return True, ""
        err_msg = resp.get("msg", "Unknown") if resp else "No response"
        return False, err_msg
    except Exception as e:
        return False, f"Exception: {e}"


def apply_ob_tpsl(client, inst_id: str, setup: TradeSetup, pos_sz: str, tick_sz: Decimal, cl_prefix: str, td_mode: str = "cross", live_price: Decimal = None, pos_side: str = None) -> bool:
    pMode = getattr(client, 'pMode', 'net_mode')
    if pMode == "net_mode" or pMode == "net" or pos_side == "net":
        pos_side = "net"
    elif not pos_side:
        pos_side = "long" if setup.bias == BULLISH else "short"
        
    tp_px = f"{round_to_tick(setup.take_profit, tick_sz):.5f}"
    sl_px = f"{round_to_tick(setup.stop_loss, tick_sz):.5f}"
    tp_side = "sell" if setup.bias == BULLISH else "buy"
    global _ORDER_COUNTER

    tp_dec = Decimal(tp_px)
    sl_dec = Decimal(sl_px)
    lp = live_price if live_price and live_price > 0 else None

    # Validate TP: chỉ đặt nếu hợp lệ so với giá hiện tại
    tp_valid = True
    if lp:
        if setup.bias == BULLISH and tp_dec < lp:
            tp_valid = False
        elif setup.bias == BEARISH and tp_dec > lp:
            tp_valid = False

    # Validate SL: chỉ đặt nếu hợp lệ
    sl_valid = True
    if lp:
        if setup.bias == BULLISH and sl_dec > lp:
            sl_valid = False
        elif setup.bias == BEARISH and sl_dec < lp:
            sl_valid = False

    tp_ok = not tp_valid
    sl_ok = not sl_valid

    # Đặt lệnh TP
    if tp_valid:
        _ORDER_COUNTER += 1
        tp_cl_id = f"{cl_prefix}TP{_ORDER_COUNTER:04d}{int(time.time())}"[:32]
        try:
            resp = client.request("POST", "/api/v5/trade/order-algo", body={
                "instId": inst_id, "tdMode": td_mode,
                "side": tp_side, "posSide": pos_side,
                "ordType": "conditional", "sz": pos_sz,
                "tpTriggerPx": tp_px, "tpOrdPx": "-1",
                "clOrdId": tp_cl_id
            })
            if resp and resp.get("code") == "0":
                tp_ok = True
                print(f"🔒 [SMC] {inst_id}: TP set @ {tp_px} ({td_mode})")
            else:
                # Nếu lỗi posSide, thử retry với posSide ngược lại (net vs long/short)
                fallback_pos_side = "net" if pos_side != "net" else ("long" if setup.bias == BULLISH else "short")
                resp_retry = client.request("POST", "/api/v5/trade/order-algo", body={
                    "instId": inst_id, "tdMode": td_mode,
                    "side": tp_side, "posSide": fallback_pos_side,
                    "ordType": "conditional", "sz": pos_sz,
                    "tpTriggerPx": tp_px, "tpOrdPx": "-1",
                    "clOrdId": tp_cl_id
                })
                if resp_retry and resp_retry.get("code") == "0":
                    tp_ok = True
                    client.pMode = "net_mode" if fallback_pos_side == "net" else "long_short_mode"
                    print(f"🔒 [SMC] {inst_id}: TP set @ {tp_px} ({td_mode}) [fallback]")
                else:
                    err = resp.get("msg","?") if resp else "NoResp"
                    print(f"🚫 [SMC] {inst_id}: TP FAILED - {err}")
        except Exception as e:
            print(f"🚫 [SMC] {inst_id}: TP EXCEPTION - {e}")

    # Đặt lệnh SL
    if sl_valid:
        _ORDER_COUNTER += 1
        sl_cl_id = f"{cl_prefix}SL{_ORDER_COUNTER:04d}{int(time.time())}"[:32]
        try:
            resp = client.request("POST", "/api/v5/trade/order-algo", body={
                "instId": inst_id, "tdMode": td_mode,
                "side": tp_side, "posSide": pos_side,
                "ordType": "conditional", "sz": pos_sz,
                "slTriggerPx": sl_px, "slOrdPx": "-1",
                "clOrdId": sl_cl_id
            })
            if resp and resp.get("code") == "0":
                sl_ok = True
                print(f"🔒 [SMC] {inst_id}: SL set @ {sl_px} ({td_mode})")
            else:
                fallback_pos_side = "net" if pos_side != "net" else ("long" if setup.bias == BULLISH else "short")
                resp_retry = client.request("POST", "/api/v5/trade/order-algo", body={
                    "instId": inst_id, "tdMode": td_mode,
                    "side": tp_side, "posSide": fallback_pos_side,
                    "ordType": "conditional", "sz": pos_sz,
                    "slTriggerPx": sl_px, "slOrdPx": "-1",
                    "clOrdId": sl_cl_id
                })
                if resp_retry and resp_retry.get("code") == "0":
                    sl_ok = True
                    client.pMode = "net_mode" if fallback_pos_side == "net" else "long_short_mode"
                    print(f"🔒 [SMC] {inst_id}: SL set @ {sl_px} ({td_mode}) [fallback]")
                else:
                    err = resp.get("msg","?") if resp else "NoResp"
                    print(f"🚫 [SMC] {inst_id}: SL FAILED - {err}")
        except Exception as e:
            print(f"🚫 [SMC] {inst_id}: SL EXCEPTION - {e}")

    return tp_ok and sl_ok


# =============================================================================
# REPLAY HISTORY - Duyệt lại toàn bộ lịch sử để khởi tạo state
# =============================================================================

def cleanup_all_orders_on_startup(client, portfolio: list[dict]):
    """
    Dọn dẹp toàn bộ lệnh Limit và TP/SL của tất cả các đồng coin trong danh mục khi khởi động.
    """
    try:
        import time
        print("🧹 [SMC STARTUP CLEANUP]: Bắt đầu dọn dẹp lệnh rác trên OKX...")
        for item in portfolio:
            inst_id = item["swap"]
            try:
                pending_regular = client.request("GET", "/api/v5/trade/orders-pending", params={"instType": "SWAP", "instId": inst_id}).get("data", [])
                if pending_regular:
                    body_cancel = [{"ordId": o["ordId"], "instId": inst_id} for o in pending_regular]
                    for i in range(0, len(body_cancel), 20):
                        client.request("POST", "/api/v5/trade/cancel-batch-orders", body=body_cancel[i:i+20])
                        time.sleep(0.1)
            except Exception as e:
                pass
            
            try:
                pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"}).get("data", [])
                if pending_algo:
                    body_cancel_algo = [{"algoId": o["algoId"], "instId": inst_id} for o in pending_algo]
                    for i in range(0, len(body_cancel_algo), 10):
                        client.request("POST", "/api/v5/trade/cancel-algos", body=body_cancel_algo[i:i+10])
                        time.sleep(0.1)
            except Exception as e:
                pass
        print("✅ [SMC STARTUP CLEANUP]: Hoàn tất dọn dẹp lệnh. Sẵn sàng chạy chiến lược.")
    except Exception as e:
        print(f"⚠️ [SMC STARTUP CLEANUP LỖI]: {e}")
