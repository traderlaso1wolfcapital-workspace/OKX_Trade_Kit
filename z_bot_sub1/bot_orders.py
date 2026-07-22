from z_bot_sub1.bot_config import *
from z_bot_sub1.bot_config import tf_weight
from z_bot_sub1.bot_ui import *  # pyright: ignore[reportGeneralTypeIssues]
import time
import requests
import logging
from logging.handlers import RotatingFileHandler
import os

hft_logger = logging.getLogger("TLS1_Bot_Logger")
hft_logger.setLevel(logging.ERROR)
import sys
if getattr(sys, 'frozen', False):
    local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
    user_data_dir = os.path.join(local_app_data, 'TLS1_Trading')
    log_path = os.path.join(user_data_dir, "bot_error.log")
else:
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bot_error.log")
handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s')
handler.setFormatter(formatter)
hft_logger.addHandler(handler)

from z_bot_sub1.bot_indicators import *

def send_telegram_notification(message: str):
    token = os.getenv("TELEGRAM_BOT_TOKEN", "")
    chat_id = os.getenv("TELEGRAM_CHAT_ID", "")
    if not token or not chat_id: return
    try:
        url = f"https://api.telegram.org/bot{token}/sendMessage"
        requests.post(url, json={"chat_id": chat_id, "text": f"🤖 [Hedging Bot]: {message}", "parse_mode": "HTML"}, timeout=3)
    except: pass

def _fetch_candles_paginated_raw(client, inst_id: str, bar: str, limit: int) -> list[list[str]]:
    all_candles = []
    last_ts = None
    while len(all_candles) < limit:
        params = {"instId": inst_id, "bar": bar, "limit": "300"}
        if last_ts: 
            params["after"] = last_ts
        try:
            chunk = client.request("GET", "/api/v5/market/candles", params=params)["data"]
            if not chunk: break
            all_candles.extend(chunk)
            last_ts = chunk[-1][0]
        except:
            break
    return all_candles[:limit]


CANDLE_CACHE = {}

def fetch_candles_paginated(client, inst_id: str, bar: str, limit: int) -> list[list[str]]:
    import time
    global CANDLE_CACHE
    now = time.time()
    cache_key = f"{inst_id}_{bar}"
    
    ttl = 2.0
    if bar == "15m": ttl = 3.0
    elif bar == "30m": ttl = 15.0
    elif bar == "1H": ttl = 30.0
    elif bar in ["2H", "4H"]: ttl = 60.0
    
    if cache_key in CANDLE_CACHE:
        if now - CANDLE_CACHE[cache_key]["timestamp"] < ttl:
            return CANDLE_CACHE[cache_key]["data"]
            
    data = _fetch_candles_paginated_raw(client, inst_id, bar, limit)
    if data:
        CANDLE_CACHE[cache_key] = {"timestamp": now, "data": data}
    else:
        if cache_key in CANDLE_CACHE:
            return CANDLE_CACHE[cache_key]["data"]
    return data

# ==============================================================================
# 🛡️ KIỂM TOÁN LỆNH CƠ SỞ OKX
# ==============================================================================
def clean_limit_orders(client, inst_id: str, td_mode: str = "cross", pos_side: str | None = None):
    try:
        pending_regular = client.request("GET", "/api/v5/trade/orders-pending", params={"instType": "SWAP", "instId": inst_id})["data"]
        # Quét sạch cả hai tiền tố lệnh cũ (scv25) và mới (scvlmt) để tránh sót lệnh trên sàn
        ours_reg = [o for o in pending_regular if (o.get("clOrdId", "").startswith("scvlmt") or o.get("clOrdId", "").startswith("scv25")) and o.get("tdMode") == td_mode]
        if pos_side: ours_reg = [o for o in ours_reg if o.get("posSide") == pos_side]
        if ours_reg: 
            body_cancel = [{"ordId": o["ordId"], "instId": o["instId"]} for o in ours_reg]
            client.request("POST", "/api/v5/trade/cancel-batch-orders", body=body_cancel)
    except: pass

def check_partial_lock_sl(client, inst_id: str, side: str, avg_px: Decimal,
                          tp_px: Decimal, live_price: Decimal,
                          tracker, tick_sz: Decimal, dec_places: int,
                          sz: str, td_mode: str = "cross") -> bool:
    """
    Cơ chế Partial Lock SL — Chia TP làm 3 phần:
      Stage 0 → 1: Giá đạt 1/3 quãng Entry→TP → kéo SL về Entry (hòa vốn)
      Stage 1 → 2: Giá đạt 2/3 quãng Entry→TP → kéo SL về 1/3×(TP-Entry)+Entry
    Trả về True nếu đã kéo SL mới (để caller biết là SL đã đổi).
    """
    if tp_px <= Decimal("0") or avg_px <= Decimal("0"):
        return False

    stage_attr = f"partial_lock_stage_{side}"
    stage = getattr(tracker, stage_attr, 0)

    if side == "long":
        dist = tp_px - avg_px
        if dist <= Decimal("0"):
            return False
        milestone_1_3 = avg_px + dist / Decimal("3")
        milestone_2_3 = avg_px + dist * Decimal("2") / Decimal("3")
        new_sl_stage1 = round_to_tick(avg_px, tick_sz)               # hòa vốn = entry
        new_sl_stage2 = round_to_tick(avg_px + dist / Decimal("3"), tick_sz)  # 1/3 TP

        if stage == 0 and live_price >= milestone_1_3:
            # Chỉ kéo SL nếu SL mới CAO HƠN SL hiện tại (không kéo ngược lại)
            current_sl = getattr(tracker, "active_sl_px_long", Decimal("0"))
            if new_sl_stage1 > current_sl:
                clean_algo_orders(client, inst_id, td_mode, side)
                place_algo_tpsl(client, inst_id, "sell", side, sz,
                                f"{new_sl_stage1:.{dec_places}f}", False,
                                f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
                tracker.active_sl_px_long = new_sl_stage1
                setattr(tracker, stage_attr, 1)
                print(f"🔒 [PARTIAL LOCK SL] {inst_id} LONG Stage1: SL → Entry {new_sl_stage1:.{dec_places}f} (hòa vốn)")
                return True

        elif stage == 1 and live_price >= milestone_2_3:
            current_sl = getattr(tracker, "active_sl_px_long", Decimal("0"))
            if new_sl_stage2 > current_sl:
                clean_algo_orders(client, inst_id, td_mode, side)
                place_algo_tpsl(client, inst_id, "sell", side, sz,
                                f"{new_sl_stage2:.{dec_places}f}", False,
                                f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
                tracker.active_sl_px_long = new_sl_stage2
                setattr(tracker, stage_attr, 2)
                print(f"🔒 [PARTIAL LOCK SL] {inst_id} LONG Stage2: SL → 1/3 TP {new_sl_stage2:.{dec_places}f} (khóa lợi nhuận)")
                return True

    else:  # short
        dist = avg_px - tp_px
        if dist <= Decimal("0"):
            return False
        milestone_1_3 = avg_px - dist / Decimal("3")
        milestone_2_3 = avg_px - dist * Decimal("2") / Decimal("3")
        new_sl_stage1 = round_to_tick(avg_px, tick_sz)               # hòa vốn = entry
        new_sl_stage2 = round_to_tick(avg_px - dist / Decimal("3"), tick_sz)  # 1/3 TP

        if stage == 0 and live_price <= milestone_1_3:
            current_sl = getattr(tracker, "active_sl_px_short", Decimal("999999999"))
            if new_sl_stage1 < current_sl:
                clean_algo_orders(client, inst_id, td_mode, side)
                place_algo_tpsl(client, inst_id, "buy", side, sz,
                                f"{new_sl_stage1:.{dec_places}f}", False,
                                f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
                tracker.active_sl_px_short = new_sl_stage1
                setattr(tracker, stage_attr, 1)
                print(f"🔒 [PARTIAL LOCK SL] {inst_id} SHORT Stage1: SL → Entry {new_sl_stage1:.{dec_places}f} (hòa vốn)")
                return True

        elif stage == 1 and live_price <= milestone_2_3:
            current_sl = getattr(tracker, "active_sl_px_short", Decimal("999999999"))
            if new_sl_stage2 < current_sl:
                clean_algo_orders(client, inst_id, td_mode, side)
                place_algo_tpsl(client, inst_id, "buy", side, sz,
                                f"{new_sl_stage2:.{dec_places}f}", False,
                                f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
                tracker.active_sl_px_short = new_sl_stage2
                setattr(tracker, stage_attr, 2)
                print(f"🔒 [PARTIAL LOCK SL] {inst_id} SHORT Stage2: SL → 1/3 TP {new_sl_stage2:.{dec_places}f} (khóa lợi nhuận)")
                return True

    return False

def clean_algo_orders(client, inst_id: str, td_mode: str = "cross", pos_side: str | None = None):
    try:
        pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"})["data"]
        # Quét sạch cả hai tiền tố lệnh cũ (scv25) và mới (scvlmt) để tránh sót lệnh trên sàn
        ours_algo = [o for o in pending_algo if (o.get("clOrdId", "").startswith("scvlmt") or o.get("clOrdId", "").startswith("scv25")) and o.get("tdMode") == td_mode]
        if pos_side: ours_algo = [o for o in ours_algo if o.get("posSide") == pos_side]
        if ours_algo: 
            body_cancel = [{"algoId": o["algoId"], "instId": o["instId"]} for o in ours_algo]
            client.request("POST", "/api/v5/trade/cancel-algos", body=body_cancel)
    except Exception as e:
        hft_logger.error(f"Lỗi clean_algo_orders: {e}", exc_info=True)

def close_position_market(client, inst_id: str, pos_side: str, size: str, log_reason: str, td_mode: str = "cross"):
    side = "sell" if pos_side == "long" else "buy"
    try:
        client.request("POST", "/api/v5/trade/order", body={
            "instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "market", "sz": size
        })
        print(f"🚨 [LIMIT ENGINE]: Market {inst_id} ({pos_side.upper()} - {td_mode.upper()}) closed: {log_reason}")
    except Exception as e:
        hft_logger.error(f"Lỗi close_position_market: {e}", exc_info=True)

def place_pure_limit(client, inst_id: str, side: str, pos_side: str, size: str, price: str, cl_id: str, td_mode: str = "cross"):
    body = {"instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "limit", "sz": size, "px": price, "clOrdId": cl_id}
    try:
        resp = client.request("POST", "/api/v5/trade/order", body=body)
        if resp and resp.get("code") != "0":
            print(f"🚨 [LIMIT] OKX từ chối: {resp.get('msg', 'Unknown')} | {inst_id} {side}@{price}")
            raise Exception(resp.get('msg', 'Unknown'))
    except Exception as e:
        print(f"🚨 [LIMIT] Lỗi kết nối: {e} | {inst_id} {side}@{price}")
        raise

def place_algo_tpsl(client, inst_id: str, side: str, pos_side: str, size: str, trigger_px: str, is_tp: bool, cl_id: str, td_mode: str = "cross"):
    body = {"instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "conditional", "sz": size, "clOrdId": cl_id}
    tp_or_sl = "TP" if is_tp else "SL"
    if is_tp: body["tpTriggerPx"], body["tpOrdPx"] = trigger_px, "-1"
    else: body["slTriggerPx"], body["slOrdPx"] = trigger_px, "-1"
    try:
        resp = client.request("POST", "/api/v5/trade/order-algo", body=body)
        if resp and resp.get("code") != "0":
            print(f"🚨 [ALGO {tp_or_sl}] OKX từ chối: {resp.get('msg', 'Unknown')} | instId={inst_id} px={trigger_px}")
    except Exception as e:
        hft_logger.error(f"Lỗi place_algo_tpsl: {e}", exc_info=True)
        print(f"🚨 [ALGO {tp_or_sl}] Lỗi kết nối OKX: {e} | instId={inst_id} px={trigger_px}")

def check_algo_tpsl_status(client, inst_id: str, pos_side: str, td_mode: str, size: Decimal) -> dict[str, Any]:
    status = {"has_tp": False, "has_sl": False, "tp_px": Decimal("0"), "sl_px": Decimal("0"), "size_matched": True}
    try:
        pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"})["data"]
        for o in pending_algo:
            if o.get("clOrdId", "").startswith(CL_ORD_PREFIX) and o.get("posSide") == pos_side and o.get("tdMode") == td_mode:
                order_sz = Decimal(o.get("sz", "0"))
                if order_sz != size:
                    status["size_matched"] = False
                if o.get("tpTriggerPx") and Decimal(o.get("tpTriggerPx", "0")) > 0: 
                    status["has_tp"] = True; status["tp_px"] = Decimal(o["tpTriggerPx"])
                if o.get("slTriggerPx") and Decimal(o.get("slTriggerPx", "0")) > 0: 
                    status["has_sl"] = True; status["sl_px"] = Decimal(o["slTriggerPx"])
        return status
    except Exception as e:
        hft_logger.error(f"Lỗi check_algo_tpsl_status: {e}", exc_info=True)
        return status

def fetch_spec(client, inst_id: str) -> dict[str, Decimal]:
    spec = client.request("GET", "/api/v5/public/instruments", params={"instType": "SWAP", "instId": inst_id})["data"][0]
    return {"ctVal": Decimal(spec["ctVal"]), "tickSz": Decimal(spec["tickSz"]), "lotSz": Decimal(spec["lotSz"]), "minSz": Decimal(spec["minSz"])}

def apply_emergency_tpsl(client, inst_id: str, pos: dict, state_matrix: dict, globals_ref: Any):
    try:
        side, size, avg_px = pos["posSide"], pos["pos"], Decimal(pos["avgPx"])
        td_mode = pos.get("mgnMode", "cross")
        size_dec = Decimal(str(size))
        
        spec = fetch_spec(client, inst_id)
        tick_sz = spec["tickSz"]
        _exp = tick_sz.normalize().as_tuple().exponent
        dec_places = abs(int(_exp)) if isinstance(_exp, int) else 0
        
        # Lấy hệ số theo TF của vị thế đang mở
        tracker = state_matrix.get(inst_id)
        # Dùng TF lớn nhất đã thực sự khớp, không phải active_pos_tf (có thể đã sync từ BTC)
        if tracker:
            filled = getattr(tracker, "pos_cycle_filled_tfs", [])
            if filled:
                max_filled_tf = max(filled, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
            else:
                max_filled_tf = getattr(tracker, "active_pos_tf", "M5")
        else:
            max_filled_tf = "M5"
        tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
        
        is_xl_pos = getattr(tracker, "is_xole_pos", False) and getattr(tracker, "xole_pos_side", "") == side if tracker else False
        if is_xl_pos:
            target_tp_pct = getattr(tracker, "xole_tp_pct", globals_ref.SCALPING_TP_PCT * tf_mult)
            target_sl_pct = getattr(tracker, "xole_sl_pct", globals_ref.SCALPING_SL_PCT * tf_mult)
        else:
            # Khóa cứng TP/SL tuyệt đối không nhân với hệ số co giãn, chỉ nhân hệ số TF
            target_tp_pct = globals_ref.SCALPING_TP_PCT * tf_mult
            target_sl_pct = globals_ref.SCALPING_SL_PCT * tf_mult
        
        if side in ["long", "net"]:
            calc_tp = round_to_tick(avg_px * (Decimal("1") + target_tp_pct), tick_sz)
            calc_sl = round_to_tick(avg_px * (Decimal("1") - target_sl_pct), tick_sz)
            tp_side, sl_side = "sell", "sell"
            
            if tracker:
                try:
                    filled_tfs = getattr(tracker, "pos_cycle_filled_tfs", [])
                    placed_dict = getattr(tracker, "placed_entry_px_long_by_tf", {})
                    max_pending_px = Decimal("-1")
                    for tf, px_str in placed_dict.items():
                        if tf not in filled_tfs and px_str not in ("---", "ERR"):
                            px_dec = Decimal(px_str)
                            if px_dec > max_pending_px:
                                max_pending_px = px_dec
                    if max_pending_px > 0:
                        dist_to_dca = abs(calc_sl - max_pending_px) / max_pending_px
                        if dist_to_dca <= Decimal("0.003"):
                            calc_sl = round_to_tick(max_pending_px * (Decimal("1") - target_sl_pct), tick_sz)
                except Exception:
                    pass
        else:
            calc_tp = round_to_tick(avg_px * (Decimal("1") - target_tp_pct), tick_sz)
            calc_sl = round_to_tick(avg_px * (Decimal("1") + target_sl_pct), tick_sz)
            tp_side, sl_side = "buy", "buy"
            
            if tracker:
                try:
                    filled_tfs = getattr(tracker, "pos_cycle_filled_tfs", [])
                    placed_dict = getattr(tracker, "placed_entry_px_short_by_tf", {})
                    min_pending_px = Decimal("inf")
                    for tf, px_str in placed_dict.items():
                        if tf not in filled_tfs and px_str not in ("---", "ERR"):
                            px_dec = Decimal(px_str)
                            if px_dec < min_pending_px:
                                min_pending_px = px_dec
                    if min_pending_px < Decimal("inf"):
                        dist_to_dca = abs(calc_sl - min_pending_px) / min_pending_px
                        if dist_to_dca <= Decimal("0.003"):
                            calc_sl = round_to_tick(min_pending_px * (Decimal("1") + target_sl_pct), tick_sz)
                except Exception:
                    pass
            
        status = check_algo_tpsl_status(client, inst_id, side, td_mode, size_dec)
        
        # Nếu đã có lệnh nhưng lệch giá mục tiêu quá 0.5% (do đổi TF), xem như kích thước/vị thế không khớp để đặt lại
        if status["size_matched"]:
            if status["has_tp"] and status["tp_px"] > 0:
                diff_tp = abs(status["tp_px"] - calc_tp) / calc_tp
                if diff_tp > Decimal("0.005"):
                    status["size_matched"] = False
            if status["has_sl"] and status["sl_px"] > 0:
                diff_sl = abs(status["sl_px"] - calc_sl) / calc_sl
                if diff_sl > Decimal("0.005"):
                    status["size_matched"] = False

        if not status["size_matched"]:
            clean_algo_orders(client, inst_id, td_mode, side)
            status["has_tp"] = False
            status["has_sl"] = False

        if tracker:
            if side in ["long", "net"]:
                tracker.active_tp_px_long = status["tp_px"] if status["has_tp"] else calc_tp
                tracker.active_sl_px_long = status["sl_px"] if status["has_sl"] else calc_sl
            else:
                tracker.active_tp_px_short = status["tp_px"] if status["has_tp"] else calc_tp
                tracker.active_sl_px_short = status["sl_px"] if status["has_sl"] else calc_sl

        if not status["has_tp"] or not status["has_sl"]:
            if not status["has_tp"]:
                tp_px_str = f"{calc_tp:.{dec_places}f}"
                place_algo_tpsl(client, inst_id, tp_side, side, size, tp_px_str, True, f"{CL_ORD_PREFIX}TP{int(time.time() * 1000000)}"[:32], td_mode)
            if not status["has_sl"]:
                sl_px_str = f"{calc_sl:.{dec_places}f}"
                place_algo_tpsl(client, inst_id, sl_side, side, size, sl_px_str, False, f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
    except Exception as e:
        hft_logger.error(f"Lỗi apply_emergency_tpsl ({inst_id} {pos.get('posSide', '')}): {e}", exc_info=True)


# 🧠 CÁC HÀM XỬ LÝ DỮ LIỆU & JSON LOGGING
# ==============================================================================

