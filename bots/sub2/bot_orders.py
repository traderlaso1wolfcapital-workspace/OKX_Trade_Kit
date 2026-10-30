# -*- coding: utf-8 -*-
"""
bot_orders.py - SMC Order Execution Engine
Hỗ trợ Multi-Timeframe độc lập, gắn tag TF vào clOrdId và đồng bộ TradeLocker
"""
import os
import time
import json
from decimal import Decimal
from typing import List, Optional, Tuple, Dict

from bots.sub2.bot_models import AssetTracker, Pivot, OrderBlock, TradeSetup, FairValueGap, EqualLevel
from bots.sub2 import bot_config
from bots.sub2.bot_config import (
    POSITION_VOLUME_HIGH_CONFIDENCE, LEVERAGE, POSITION_MODE,
    SWING_VOLUME_USDT, SWING_RISK_PCT,
    INTERNAL_VOLUME_USDT, INTERNAL_RISK_PCT, INTERNAL_LEVERAGE,
    ACCOUNT_NAME, CL_ORD_PREFIX,
    SMC_INT_OB, SMC_SWING_OB,
    OB_TP_MODE, OB_MAX_ACTIVE_SETUPS,
    normalize_tf_to_std
)
from bots.sub2.bot_indicators import round_to_tick, BULLISH, BEARISH

def _safe_dec(val, default=Decimal("0")) -> Decimal:
    """Chuyển đổi an toàn sang Decimal, triệt tiêu lỗi InvalidOperation khi chuỗi rỗng"""
    if not val or not str(val).strip():
        return default
    try:
        return Decimal(str(val).strip())
    except Exception:
        return default

def clean_ob_orders(client, inst_id: str, cl_prefix: str, side: str = None):
    """Hủy các lệnh Limit pending của SMC Bot trên sàn OKX (Bảo lưu TP/SL)"""
    try:
        pending = client.request("GET", "/api/v5/trade/orders-pending",
                                 params={"instType": "SWAP", "instId": inst_id}).get("data", [])
        cancel_batch = []
        for o in pending:
            # Hủy lệnh của bot hoặc lệnh tồn đọng ở chế độ isolated (cô lập) cũ
            if cl_prefix in o.get("clOrdId", "") or o.get("tdMode") == "isolated":
                if side is None or o.get("posSide") == side:
                    cancel_batch.append({"instId": inst_id, "ordId": o["ordId"]})
        if cancel_batch:
            for i in range(0, len(cancel_batch), 20):
                client.request("POST", "/api/v5/trade/cancel-batch-orders", body=cancel_batch[i:i+20])
                time.sleep(0.1)
    except Exception as e:
        print(f"⚠️ [clean_ob_orders]: Lỗi khi hủy lệnh rác {inst_id}: {e}")

def clean_algo_orders(client, inst_id: str, pos_side: str = None, cl_prefix: str = CL_ORD_PREFIX):
    """Hủy các lệnh algo conditional cũ/trùng lặp của bot trên sàn OKX (dọn dẹp TP/SL rác)"""
    try:
        pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending",
                                      params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"}).get("data", [])
        ours_algo = [
            o for o in pending_algo
            if cl_prefix in o.get("clOrdId", "") or not o.get("clOrdId")
        ]
        if pos_side and pos_side != "net":
            ours_algo = [o for o in ours_algo if o.get("posSide") == pos_side or o.get("posSide") == "net"]
        if ours_algo:
            body_cancel = [{"algoId": o["algoId"], "instId": o["instId"]} for o in ours_algo]
            for i in range(0, len(body_cancel), 10):
                chunk = body_cancel[i:i+10]
                client.request("POST", "/api/v5/trade/cancel-algos", body=chunk)
                time.sleep(0.1)
            print(f"🧹 [SMC ALGO CLEANUP] {inst_id}: Đã hủy {len(ours_algo)} lệnh algo TP/SL rác.")
    except Exception as e:
        print(f"⚠️ [clean_algo_orders]: Lỗi khi hủy algo orders {inst_id}: {e}")

def clean_ob_orders_by_tf(client, inst_id: str, cl_prefix: str, tf: str):
    """Hủy các lệnh Limit pending riêng cho 1 Timeframe cụ thể khi TF đó bị bỏ chọn"""
    try:
        std_tf = normalize_tf_to_std(tf)
        pending = client.request("GET", "/api/v5/trade/orders-pending",
                                 params={"instType": "SWAP", "instId": inst_id}).get("data", [])
        cancel_batch = []
        for o in pending:
            cl_id = o.get("clOrdId", "")
            if cl_prefix in cl_id and (f"EL{std_tf}" in cl_id or f"ES{std_tf}" in cl_id or f"LMT{std_tf}" in cl_id or f"_{std_tf}_" in cl_id):
                cancel_batch.append({"instId": inst_id, "ordId": o["ordId"]})
        if cancel_batch:
            for i in range(0, len(cancel_batch), 20):
                client.request("POST", "/api/v5/trade/cancel-batch-orders", body=cancel_batch[i:i+20])
                time.sleep(0.1)
            print(f"🧹 [SMC TF CLEANUP] {inst_id}: Đã hủy {len(cancel_batch)} lệnh Limit của TF {tf}")
    except Exception as e:
        print(f"⚠️ [clean_ob_orders_by_tf]: Lỗi khi hủy lệnh TF {tf} ({inst_id}): {e}")

# Global counter để tránh trùng clOrdId trong cùng 1 giây
_ORDER_COUNTER = 0

def _dispatch_to_tradelocker(inst_id: str, side: str, price: float = 0.0, sl_price: float = None, tp_price: float = None, tf: str = None, dry_run: bool = False, strategy: str = "sub2"):
    """Chuyển tiếp lệnh sang tài khoản Quỹ TradeLocker (E8 Markets) nếu user có kích hoạt"""
    try:
        from web_app.backend.tradelocker_service import TradeLockerManager
        uid = os.environ.get("BOT_USER_UID", "")
        if not uid:
            local_app = os.environ.get("LOCALAPPDATA", "")
            if local_app:
                uid = os.path.basename(local_app)
        if uid:
            TradeLockerManager.dispatch_signal_async(
                uid=uid,
                symbol=inst_id,
                side=side,
                price=price,
                sl_price=sl_price,
                tp_price=tp_price,
                tf=tf,
                dry_run=dry_run,
                strategy=strategy
            )
    except Exception as e:
        print(f"⚠️ [TRADELOCKER E8 DISPATCH LỖI] Không thể chuyển tiếp lệnh {inst_id} {side} [{tf}]: {e}", flush=True)

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

    # Định danh Timeframe
    std_tf = normalize_tf_to_std(setup.tf) if setup.tf else "H1"

    # 🏆 Đồng bộ lệnh Limit sang Quỹ TradeLocker (E8) nếu có bật
    try:
        tl_sl = float(setup.stop_loss) if setup.stop_loss else None
        tl_tp = float(setup.take_profit) if setup.take_profit else None
        tl_px = float(setup.entry_price) if setup.entry_price else 0.0
        _dispatch_to_tradelocker(inst_id=inst_id, side=side, price=tl_px, sl_price=tl_sl, tp_price=tl_tp, tf=std_tf, dry_run=False, strategy="sub2")
    except Exception:
        pass
        
    tag = "EL" if setup.bias == BULLISH else "ES"
    cl_id = f"{cl_prefix}{tag}{std_tf}{_ORDER_COUNTER:02d}{int(time.time())}"[:32]
    setup.cl_ord_id = cl_id
    try:
        # ĐỒNG BỘ 100% CHẾ ĐỘ CHÉO (CROSS) & ĐÒN BẨY 100X THEO CHỈ ĐẠO CỦA CEO
        td_mode = "cross"
        lever = "100"

        # Set leverage 100x Cross trước khi đặt lệnh
        try:
            client.request("POST", "/api/v5/account/set-leverage", body={
                "instId": inst_id, "lever": "100", "mgnMode": "cross"
            })
        except:
            pass
        body_limit = {
            "instId": inst_id, "tdMode": td_mode,
            "side": side, "posSide": pos_side, "ordType": "limit", "sz": sz_str,
            "px": px_str, "clOrdId": cl_id
        }
        if setup.take_profit and setup.stop_loss:
            tp_px = f"{round_to_tick(setup.take_profit, tick_sz):.5f}"
            sl_px = f"{round_to_tick(setup.stop_loss, tick_sz):.5f}"
            coin_clean = inst_id.split("-")[0].replace("/", "")[:4]
            algo_cl_id = f"{cl_prefix}TP{coin_clean}{std_tf}{_ORDER_COUNTER:02d}{int(time.time() * 1000) % 10000000}"[:32]
            body_limit["attachAlgoOrds"] = [
                {
                    "attachAlgoClOrdId": algo_cl_id,
                    "tpTriggerPx": tp_px,
                    "tpOrdPx": "-1",
                    "tpTriggerPxType": "last",
                    "slTriggerPx": sl_px,
                    "slOrdPx": "-1",
                    "slTriggerPxType": "last"
                }
            ]

        resp = client.request("POST", "/api/v5/trade/order", body=body_limit)
        if resp and resp.get("code") == "0":
            return True, ""
        err_msg = resp.get("msg", "Unknown") if resp else "No response"
        if resp and "data" in resp and resp["data"]:
            for item in resp["data"]:
                s_msg = item.get("sMsg", "")
                if s_msg:
                    err_msg = s_msg
                    break

        # Fallback 1: Nếu lỗi liên quan attachAlgoOrds (51046-51054, TP/SL trigger price), đặt lại Limit trơn
        algo_err_keys = [
            "attachalgoords", "tptriggerpx", "sltriggerpx",
            "51046", "51047", "51048", "51049", "51050", "51051", "51052", "51053", "51054",
            "primary order price", "trigger price", "stop loss", "take profit", "stop-loss", "take-profit"
        ]
        if "attachAlgoOrds" in body_limit and any(k in err_msg.lower() for k in algo_err_keys):
            body_no_algo = dict(body_limit)
            body_no_algo.pop("attachAlgoOrds", None)
            resp_fallback = client.request("POST", "/api/v5/trade/order", body=body_no_algo)
            if resp_fallback and resp_fallback.get("code") == "0":
                return True, ""

        # Fallback 2: Nếu gặp lỗi posSide error (51000), tự động fallback retry giữa net và long/short
        if "posSide" in err_msg or "51000" in str(resp.get("code", "")) or "51000" in err_msg:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if setup.bias == BULLISH else "short")
            body_retry = dict(body_limit)
            body_retry["posSide"] = fallback_pos_side
            resp_retry = client.request("POST", "/api/v5/trade/order", body=body_retry)
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
        
    std_tf = normalize_tf_to_std(setup.tf) if setup.tf else "H1"

    # 🏆 Đồng bộ lệnh Market sang Quỹ TradeLocker (E8) nếu có bật
    try:
        tl_sl = float(setup.stop_loss) if setup.stop_loss else None
        tl_tp = float(setup.take_profit) if setup.take_profit else None
        _dispatch_to_tradelocker(inst_id=inst_id, side=side, price=0.0, sl_price=tl_sl, tp_price=tl_tp, tf=std_tf, dry_run=False, strategy="sub2")
    except Exception:
        pass

    tag = "ML" if setup.bias == BULLISH else "MS"
    cl_id = f"{cl_prefix}{tag}{std_tf}{_ORDER_COUNTER:02d}{int(time.time())}"[:32]
    setup.cl_ord_id = cl_id
    try:
        td_mode = "cross"
        lever = "100"

        try:
            client.request("POST", "/api/v5/account/set-leverage", body={
                "instId": inst_id, "lever": "100", "mgnMode": "cross"
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
        
    std_tf = normalize_tf_to_std(setup.tf) if setup.tf else "H1"

    def _safe_dec(val) -> Decimal:
        if not val or not str(val).strip():
            return Decimal("0")
        try:
            return Decimal(str(val).strip())
        except Exception:
            return Decimal("0")

    # ⚡ Kiểm tra nếu vị thế đã có TP và SL sẵn trên sàn (từ attachAlgoOrds khi khớp limit)
    has_tp = False
    has_sl = False
    try:
        pending_algos = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"}).get("data", [])
        has_tp = any(_safe_dec(o.get("tpTriggerPx")) > 0 and (o.get("posSide") == pos_side or pos_side == "net") for o in pending_algos)
        has_sl = any(_safe_dec(o.get("slTriggerPx")) > 0 and (o.get("posSide") == pos_side or pos_side == "net") for o in pending_algos)
        if has_tp and has_sl:
            return True
    except Exception:
        pass

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

    # Nếu sàn đã có sẵn TP hoặc SL thì không đặt trùng lặp
    if has_tp:
        tp_valid = False
        tp_ok = True
    if has_sl:
        sl_valid = False
        sl_ok = True

    tp_ok = not tp_valid
    sl_ok = not sl_valid

    # Đặt lệnh TP
    if tp_valid:
        _ORDER_COUNTER += 1
        tp_cl_id = f"{cl_prefix}TP{std_tf}{_ORDER_COUNTER:02d}{int(time.time())}"[:32]
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
                print(f"🔒 [SMC] {inst_id} [{std_tf}]: TP set @ {tp_px} ({td_mode})")
            else:
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
                    print(f"🔒 [SMC] {inst_id} [{std_tf}]: TP set @ {tp_px} ({td_mode}) [fallback]")
                else:
                    err = resp.get("msg","?") if resp else "NoResp"
                    print(f"🚫 [SMC] {inst_id} [{std_tf}]: TP FAILED - {err}")
        except Exception as e:
            print(f"🚫 [SMC] {inst_id} [{std_tf}]: TP EXCEPTION - {e}")

    # Đặt lệnh SL
    if sl_valid:
        _ORDER_COUNTER += 1
        sl_cl_id = f"{cl_prefix}SL{std_tf}{_ORDER_COUNTER:02d}{int(time.time())}"[:32]
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
                print(f"🔒 [SMC] {inst_id} [{std_tf}]: SL set @ {sl_px} ({td_mode})")
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
                    print(f"🔒 [SMC] {inst_id} [{std_tf}]: SL set @ {sl_px} ({td_mode}) [fallback]")
                else:
                    err = resp.get("msg","?") if resp else "NoResp"
                    print(f"🚫 [SMC] {inst_id} [{std_tf}]: SL FAILED - {err}")
        except Exception as e:
            print(f"🚫 [SMC] {inst_id} [{std_tf}]: SL EXCEPTION - {e}")

    return tp_ok and sl_ok


def cleanup_all_orders_on_startup(client, portfolio: list[dict]):
    """
    Dọn dẹp toàn bộ lệnh Limit chưa khớp khi khởi động hoặc dừng bot.
    BẢO LƯU 100% TP/SL của các vị thế đang chạy để đảm bảo an toàn vốn tuyệt đối.
    """
    try:
        import time
        print("🧹 [SMC CLEANUP]: Bắt đầu dọn dẹp lệnh Limit chờ trên OKX (Bảo lưu TP/SL)...")
        for item in portfolio:
            inst_id = item["swap"]
            try:
                # 1. Hủy các lệnh Limit pending thông thường
                pending_regular = client.request("GET", "/api/v5/trade/orders-pending", params={"instType": "SWAP", "instId": inst_id}).get("data", [])
                if pending_regular:
                    body_cancel = [
                        {"ordId": o["ordId"], "instId": inst_id}
                        for o in pending_regular
                        if o.get("ordType") == "limit" and str(o.get("reduceOnly", "")).lower() != "true"
                    ]
                    if body_cancel:
                        for i in range(0, len(body_cancel), 20):
                            client.request("POST", "/api/v5/trade/cancel-batch-orders", body=body_cancel[i:i+20])
                            time.sleep(0.1)

                # 2. Dọn dẹp orphan conditional TP/SL nếu coin KHÔNG có vị thế mở nào
                positions = client.fetch_positions(inst_id)
                has_open_pos = any(Decimal(p.get("pos", "0")) > 0 for p in positions)
                if not has_open_pos:
                    clean_algo_orders(client, inst_id, cl_prefix=CL_ORD_PREFIX)
            except Exception as e:
                pass
        print("✅ [SMC CLEANUP]: Hoàn tất dọn dẹp lệnh Limit. Bảo lưu 100% TP/SL của vị thế.")
    except Exception as e:
        print(f"⚠️ [SMC CLEANUP LỖI]: {e}")
