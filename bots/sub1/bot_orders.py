from bots.sub1.bot_config import *
from bots.sub1.bot_config import tf_weight
from bots.sub1.bot_ui import *  # pyright: ignore[reportGeneralTypeIssues]
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
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "bot_error.log")
handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s')
handler.setFormatter(formatter)
hft_logger.addHandler(handler)

from bots.sub1.bot_indicators import *

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
def clean_limit_orders(client, inst_id: str, td_mode: str = "cross", pos_side: str | None = None, dry_run: bool = False):
    # 🔒 DRY-RUN: Không hủy lệnh thật khi đang chạy ngầm
    if dry_run:
        print(f"🌑 [DRY-RUN] clean_limit_orders: Bỏ qua hủy Limit cũ cho {inst_id} (shadow mode)")
        return
    try:
        pending_regular = client.request("GET", "/api/v5/trade/orders-pending", params={"instType": "SWAP", "instId": inst_id})["data"]
        # Quét sạch cả hai tiền tố lệnh cũ (scv25) và mới (scvlmt) để tránh sót lệnh trên sàn
        ours_reg = [o for o in pending_regular if (o.get("clOrdId", "").startswith("scvlmt") or o.get("clOrdId", "").startswith("scv25")) and o.get("tdMode") == td_mode]
        if pos_side: ours_reg = [o for o in ours_reg if o.get("posSide") == pos_side]
        if ours_reg: 
            body_cancel = [{"ordId": o["ordId"], "instId": o["instId"]} for o in ours_reg]
            client.request("POST", "/api/v5/trade/cancel-batch-orders", body=body_cancel)
    except Exception as e:
        hft_logger.error(f"Lỗi clean_limit_orders ({inst_id}): {e}")

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

def clean_algo_orders(client, inst_id: str, td_mode: str = "cross", pos_side: str | None = None, dry_run: bool = False):
    # 🔒 DRY-RUN: Không hủy TP/SL thật khi đang chạy ngầm
    if dry_run:
        print(f"🌑 [DRY-RUN] clean_algo_orders: Bỏ qua hủy Algo TP/SL cho {inst_id} (shadow mode)")
        return
    try:
        pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"})["data"]
        # Quét sạch cả hai tiền tố lệnh cũ (scv25) và mới (scvlmt) để tránh sót lệnh trên sàn
        ours_algo = [o for o in pending_algo if (o.get("clOrdId", "").startswith("scvlmt") or o.get("clOrdId", "").startswith("scv25") or o.get("clOrdId", "").startswith(CL_ORD_PREFIX)) and o.get("tdMode") == td_mode]
        if pos_side: ours_algo = [o for o in ours_algo if o.get("posSide") == pos_side]
        if ours_algo: 
            body_cancel = [{"algoId": o["algoId"], "instId": o["instId"]} for o in ours_algo]
            # OKX limits cancel-algos to 10 orders per request, must chunk them
            for i in range(0, len(body_cancel), 10):
                chunk = body_cancel[i:i+10]
                client.request("POST", "/api/v5/trade/cancel-algos", body=chunk)
    except Exception as e:
        hft_logger.error(f"Lỗi clean_algo_orders: {e}", exc_info=True)

def close_position_market(client, inst_id: str, pos_side: str, size: str, log_reason: str, td_mode: str = "cross", dry_run: bool = False):
    # 🔒 DRY-RUN: Không đóng vị thế thật khi đang chạy ngầm
    if dry_run:
        print(f"🌑 [DRY-RUN] close_position_market: Sẽ đóng {inst_id} {pos_side.upper()} Market — {log_reason} (shadow mode, bỏ qua)")
        return
    size_dec = Decimal(size)
    norm_side = "long" if pos_side == "long" or (pos_side == "net" and size_dec > 0) else "short"
    side = "sell" if norm_side == "long" else "buy"
    abs_size = str(abs(size_dec))
    try:
        client.request("POST", "/api/v5/trade/order", body={
            "instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "market", "sz": abs_size
        })
        print(f"🚨 [LIMIT ENGINE]: Market {inst_id} ({pos_side.upper()} - {td_mode.upper()}) closed: {log_reason}")
    except Exception as e:
        err_str = str(e)
        if "posSide" in err_str or "51000" in err_str:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if side == "buy" else "short")
            try:
                client.request("POST", "/api/v5/trade/order", body={
                    "instId": inst_id, "tdMode": td_mode, "side": side, "posSide": fallback_pos_side, "ordType": "market", "sz": abs_size
                })
                print(f"🚨 [LIMIT ENGINE]: Market {inst_id} ({fallback_pos_side.upper()} - {td_mode.upper()}) closed [FALLBACK]: {log_reason}")
                return
            except Exception:
                pass
        hft_logger.error(f"Lỗi close_position_market: {e}", exc_info=True)

def cleanup_all_orders_on_startup(client, portfolio: list[dict], dry_run: bool = False):
    """
    Dọn dẹp toàn bộ lệnh Limit rác cũ khi khởi động.
    BẢO LƯU nguyên vẹn toàn bộ lệnh TP/SL của vị thế để đảm bảo an toàn tuyệt đối.
    """
    # 🔒 DRY-RUN: Không hủy lệnh khi đang chạy ngầm
    if dry_run:
        print("🌑 [DRY-RUN] cleanup_all_orders_on_startup: Bỏ qua dọn dẹp Startup (shadow mode)")
        return
    try:
        import time
        print("🧹 [STARTUP CLEANUP]: Bắt đầu dọn dẹp lệnh Limit rác trên OKX (Bảo lưu TP/SL)...")
        for item in portfolio:
            inst_id = item["swap"]
            # 1. Quét và Hủy Limit chờ cũ (tránh lệnh treo sai giá từ phiên trước, bảo toàn reduceOnly & TP/SL)
            try:
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
            except Exception as e:
                hft_logger.error(f"Lỗi cleanup startup Limit ({inst_id}): {e}")
        
        print("✅ [STARTUP CLEANUP]: Hoàn tất dọn dẹp lệnh Limit. Bảo lưu 100% TP/SL của vị thế.")
    except Exception as e:
        hft_logger.error(f"Lỗi cleanup_all_orders_on_startup: {e}", exc_info=True)

SHOW_DRY_RUN_LOGS = False  # Ẩn log lặp vô tận của dry-run shadow mode theo yêu cầu của CEO

def _clean_num_str(val) -> str:
    """Loại bỏ các số 0 thừa ở phần thập phân (VD: 0.1900000000000000000000000000 -> 0.19)"""
    try:
        s = str(val)
        if "." in s:
            s = s.rstrip("0").rstrip(".")
        return s
    except Exception:
        return str(val)

def place_market_entry(client, inst_id: str, side: str, pos_side: str, size: str, td_mode: str = "cross", dry_run: bool = False):
    # 🔒 DRY-RUN
    if dry_run:
        if SHOW_DRY_RUN_LOGS:
            clean_sz = _clean_num_str(size)
            print(f"🌑 [DRY-RUN] place_market_entry: Sẽ vào lệnh Market {inst_id} {side.upper()} {pos_side.upper()} sz={clean_sz} (shadow mode, bỏ qua)")
        return None
    try:
        resp = client.request("POST", "/api/v5/trade/order", body={
            "instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "market", "sz": size
        })
        print(f"🚀 [MARKET FALLBACK 51006] Đã khớp Market {inst_id} ({side.upper()} {pos_side.upper()}) size={size}: {resp}")
        return resp
    except Exception as e:
        err_str = str(e)
        if "posSide" in err_str or "51000" in err_str:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if side == "buy" else "short")
            try:
                resp = client.request("POST", "/api/v5/trade/order", body={
                    "instId": inst_id, "tdMode": td_mode, "side": side, "posSide": fallback_pos_side, "ordType": "market", "sz": size
                })
                print(f"🚀 [MARKET FALLBACK 51006] Đã khớp Market {inst_id} ({side.upper()} {fallback_pos_side.upper()}) [FALLBACK posSide]: {resp}")
                return resp
            except Exception as e2:
                err_str = f"{err_str} | Fallback failed: {e2}"
        if "51010" in err_str or "51015" in err_str or "current account mode" in err_str:
            print("💡 [HƯỚNG DẪN] OKX báo lỗi 51010 (Sai chế độ vị thế).")
            print("   Bạn vui lòng chuyển sang Chế độ phòng ngừa rủi ro (Hedge Mode), thay vì Chế độ một chiều (One-way Mode) như hiện tại.")
        hft_logger.error(f"Lỗi place_market_entry: {err_str}", exc_info=True)
        print(f"🚨 [MARKET FALLBACK ERROR]: Không thể bắn lệnh Market: {err_str}")

def place_pure_limit(client, inst_id: str, side: str, pos_side: str, size: str, price: str, cl_id: str, td_mode: str = "cross", dry_run: bool = False, attach_algo_ords: list = None):
    # 🔒 DRY-RUN: Ghi log ảo thay vì đặt lệnh thật lên OKX
    if dry_run:
        if SHOW_DRY_RUN_LOGS:
            clean_sz = _clean_num_str(size)
            clean_px = _clean_num_str(price)
            algo_info = f" [TP/SL: {attach_algo_ords[0]['tpTriggerPx']}/{attach_algo_ords[0]['slTriggerPx']}]" if attach_algo_ords else ""
            print(f"🌑 [DRY-RUN] place_pure_limit: Sẽ đặt LIMIT {inst_id} {side.upper()} {pos_side.upper()} @{clean_px} sz={clean_sz}{algo_info} (shadow mode, bỏ qua)")
        return None
    body = {"instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "limit", "sz": size, "px": price, "clOrdId": cl_id}
    if attach_algo_ords:
        body["attachAlgoOrds"] = attach_algo_ords
    try:
        resp = client.request("POST", "/api/v5/trade/order", body=body)
        if resp and resp.get("code") != "0":
            raise Exception(str(resp.get('msg', 'Unknown')))
        return resp
    except Exception as e:
        err_str = str(e)
        
        # Fallback posSide (51000)
        if "posSide" in err_str or "51000" in err_str:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if side == "buy" else "short")
            body["posSide"] = fallback_pos_side
            try:
                resp = client.request("POST", "/api/v5/trade/order", body=body)
                if resp and resp.get("code") != "0":
                    raise Exception(str(resp.get('msg', 'Unknown')))
                return resp
            except Exception as e2:
                err_str = str(e2)

        # Fallback nếu OKX từ chối attachAlgoOrds (ví dụ lỗi 51046, 51047, 51048, 51049 hoặc liên quan TP/SL)
        if attach_algo_ords and any(k in err_str for k in ["attachAlgoOrds", "51046", "51047", "51048", "51049", "tpTriggerPx", "slTriggerPx"]):
            print(f"⚠️ [ATTACH ALGO WARNING] OKX từ chối attachAlgoOrds ({err_str}), fallback đặt Limit trơn...")
            body_no_algo = dict(body)
            body_no_algo.pop("attachAlgoOrds", None)
            try:
                resp = client.request("POST", "/api/v5/trade/order", body=body_no_algo)
                if resp and resp.get("code") == "0":
                    return resp
            except Exception:
                pass

        if "51006" in err_str or "Order price is not within the price limit" in err_str:
            print(f"⚠️ [LIMIT REJECT 51006] OKX báo 51006 cho {inst_id} {side}@{price}. Giá Limit không hợp lệ, bỏ qua lệnh này chờ nhịp sau (PURE LIMIT không vào Market)!")
            return None
            
        print(f"🚨 [LIMIT] Lỗi kết nối: {err_str} | {inst_id} {side}@{price}")
        if "51008" in err_str:
            print("💡 [HƯỚNG DẪN] OKX báo lỗi 51008 (Insufficient USDT margin).")
            print("   Tài khoản Trading của Sếp đã hết số dư khả dụng (Available Margin) để gài lệnh.")
            print("   CÁCH XỬ LÝ:")
            print("   1. Giảm Volume hoặc Risk trong bot_config.py.")
            print("   2. Vào App OKX -> Open Orders hủy bớt các lệnh Limit rác đang giam vốn.")
            print("   3. Nạp thêm USDT vào ví Phái sinh.")
        elif "51010" in err_str or "51015" in err_str or "current account mode" in err_str:
            print("💡 [HƯỚNG DẪN] OKX báo lỗi 51010 (Sai chế độ vị thế).")
            print("   Bạn vui lòng chuyển sang Chế độ phòng ngừa rủi ro (Hedge Mode), thay vì Chế độ một chiều (One-way Mode) như hiện tại.")
        raise

def place_algo_tpsl(client, inst_id: str, side: str, pos_side: str, size: str, trigger_px: str, is_tp: bool, cl_id: str, td_mode: str = "cross", dry_run: bool = False):
    # 🔒 DRY-RUN: Ghi log ảo thay vì đặt TP/SL thật
    if dry_run:
        if SHOW_DRY_RUN_LOGS:
            tp_or_sl = "TP" if is_tp else "SL"
            clean_sz = _clean_num_str(size)
            clean_px = _clean_num_str(trigger_px)
            print(f"🌑 [DRY-RUN] place_algo_tpsl: Sẽ đặt {tp_or_sl} {inst_id} {pos_side.upper()} @{clean_px} sz={clean_sz} (shadow mode, bỏ qua)")
        return
    body = {"instId": inst_id, "tdMode": td_mode, "side": side, "posSide": pos_side, "ordType": "conditional", "sz": size, "clOrdId": cl_id}
    tp_or_sl = "TP" if is_tp else "SL"
    if is_tp: body["tpTriggerPx"], body["tpOrdPx"] = trigger_px, "-1"
    else: body["slTriggerPx"], body["slOrdPx"] = trigger_px, "-1"
    try:
        resp = client.request("POST", "/api/v5/trade/order-algo", body=body)
        if resp and resp.get("code") != "0":
            raise Exception(str(resp.get('msg', 'Unknown')))
    except Exception as e:
        err_str = str(e)
        
        # Fallback posSide (51000)
        if "posSide" in err_str or "51000" in err_str:
            fallback_pos_side = "net" if pos_side != "net" else ("long" if side == "buy" else "short")
            body["posSide"] = fallback_pos_side
            try:
                resp = client.request("POST", "/api/v5/trade/order-algo", body=body)
                if resp and resp.get("code") != "0":
                    raise Exception(str(resp.get('msg', 'Unknown')))
                return
            except Exception as e2:
                err_str = str(e2)

        hft_logger.error(f"Lỗi place_algo_tpsl: {err_str}", exc_info=True)
        print(f"🚨 [ALGO {tp_or_sl}] Lỗi kết nối OKX: {err_str} | instId={inst_id} px={trigger_px}")
        
        if any(code in err_str for code in ["51280", "51281", "51282", "51283"]):
            print(f"⚠️ [EMERGENCY] Giá đã vượt qua {tp_or_sl} {trigger_px} trước khi gài lệnh. Đóng {pos_side.upper()} Market ngay lập tức!")
            close_position_market(client, inst_id, pos_side, size, f"{tp_or_sl} bị đâm thủng", td_mode)

def check_algo_tpsl_status(client, inst_id: str, pos_side: str, td_mode: str, size: Decimal) -> dict[str, Any]:
    status = {"has_tp": False, "has_sl": False, "tp_px": Decimal("0"), "sl_px": Decimal("0"), "size_matched": True}
    try:
        pending_algo = client.request("GET", "/api/v5/trade/orders-algo-pending", params={"instType": "SWAP", "instId": inst_id, "ordType": "conditional"})["data"]
        expected_exit_side = "sell" if pos_side in ("long", "buy") else ("buy" if pos_side in ("short", "sell") else None)
        for o in pending_algo:
            o_pos_side = o.get("posSide", "")
            o_td_mode = o.get("tdMode", "")
            o_side = o.get("side", "")
            
            # Khớp posSide tương ứng hoặc khớp chiều thoát lệnh (sell cho Long, buy cho Short)
            pos_match = (o_pos_side == pos_side) or (o_pos_side in ("net", "") and expected_exit_side and o_side == expected_exit_side)
            if pos_match and (o_td_mode == td_mode or not o_td_mode):
                order_sz = Decimal(o.get("sz", "0"))
                if order_sz != size:
                    status["size_matched"] = False
                if o.get("tpTriggerPx") and Decimal(o.get("tpTriggerPx", "0")) > 0: 
                    status["has_tp"] = True
                    status["tp_px"] = Decimal(o["tpTriggerPx"])
                if o.get("slTriggerPx") and Decimal(o.get("slTriggerPx", "0")) > 0: 
                    status["has_sl"] = True
                    status["sl_px"] = Decimal(o["slTriggerPx"])
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
        _is_pyramid = getattr(globals_ref, "ENABLE_PYRAMID_DCA", False)
        _is_neg_dca = getattr(globals_ref, "ENABLE_NEGATIVE_DCA", False)
        if tracker:
            filled = getattr(tracker, "pos_cycle_filled_tfs", [])
            if filled:
                if _is_pyramid:
                    max_filled_tf = min(filled, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
                elif _is_neg_dca:
                    max_filled_tf = max(filled, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
                else:
                    max_filled_tf = filled[0]
            else:
                max_filled_tf = getattr(tracker, "active_pos_tf", "M5")
        else:
            max_filled_tf = "M5"

        # --- UPGRADE TF LOGIC (Chỉ áp dụng cho DCA Âm, không áp dụng cho DCA Dương hoặc Đơn Lệnh) ---
        if tracker and _is_neg_dca:
            try:
                tf_weights = {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}
                next_tf_map = {"M5": "M15", "M15": "M30", "M30": "H1", "H1": "H2", "H2": "H4", "H4": "H4"}
                current_weight = tf_weights.get(max_filled_tf, 0)
                upgrade_tf = max_filled_tf
                
                is_hedge = getattr(tracker, "is_hedge_pos", getattr(tracker, "is_xole_pos", False))
                hedge_big = getattr(tracker, "hedge_big_tf", getattr(tracker, "xole_big_tf", None))
                if is_hedge and hedge_big:
                    temp_tf_mult = globals_ref.TF_MULTIPLIERS.get(hedge_big, Decimal("1.0"))
                else:
                    temp_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
                base_sl_pct = globals_ref.SCALPING_SL_PCT * temp_tf_mult
                
                if side in ["long", "net"]:
                    base_sl = avg_px * (Decimal("1") - base_sl_pct)
                    placed_dict = getattr(tracker, "placed_entry_px_long_by_tf", {})
                else:
                    base_sl = avg_px * (Decimal("1") + base_sl_pct)
                    placed_dict = getattr(tracker, "placed_entry_px_short_by_tf", {})
                
                filled_tfs = getattr(tracker, "pos_cycle_filled_tfs", [])
                
                for tf, px_str in placed_dict.items():
                    if tf not in filled_tfs and px_str not in ("---", "ERR"):
                        w = tf_weights.get(tf, 0)
                        if w > current_weight:
                            pending_px = Decimal(px_str)
                            dist = abs(base_sl - pending_px) / pending_px
                            if dist <= Decimal("0.006"):
                                upgrade_tf = next_tf_map.get(max_filled_tf, max_filled_tf)
                                break
            except Exception:
                pass
        # ------------------------

        tp_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
        sl_tf_mult = globals_ref.TF_MULTIPLIERS.get(upgrade_tf, Decimal("1.0")) if 'upgrade_tf' in locals() else tp_tf_mult
        
        # ⚡ Tính hệ số giảm (Shrink) TP/SL dựa trên chuỗi thắng (win_streak)
        streak_mult = Decimal("1.0")
        is_hd_pos = (getattr(tracker, "is_hedge_pos", False) or getattr(tracker, "is_xole_pos", False)) and (getattr(tracker, "hedge_pos_side", "") == side or getattr(tracker, "xole_pos_side", "") == side) if tracker else False
        
        if is_hd_pos:
            # Ưu tiên lấy hedge_tf làm chuẩn tra cứu streak
            hd_tf = getattr(tracker, "hedge_tf", getattr(tracker, "xole_tf", max_filled_tf)) or max_filled_tf
            win_streak = getattr(tracker, "hedge_win_streak", getattr(tracker, "xole_win_streak", 0))
            if win_streak == 0 and tracker and hd_tf in tracker.mtf_states:
                win_streak = tracker.mtf_states[hd_tf].get("win_streak", 0)
        else:
            win_streak = tracker.mtf_states[max_filled_tf].get("win_streak", 0) if (tracker and max_filled_tf in tracker.mtf_states) else 0
            
        streak = min(win_streak, 4)
        if streak == 0: streak_mult = Decimal("1.0")
        elif streak == 1: streak_mult = Decimal("0.8")
        elif streak == 2: streak_mult = Decimal("0.6")
        elif streak == 3: streak_mult = Decimal("0.4")
        else: streak_mult = Decimal("0.3")
        
        if is_hd_pos:
            target_tp_pct = getattr(tracker, "hedge_tp_pct", getattr(tracker, "xole_tp_pct", globals_ref.SCALPING_TP_PCT * tp_tf_mult)) * streak_mult
            target_sl_pct = getattr(tracker, "hedge_sl_pct", getattr(tracker, "xole_sl_pct", globals_ref.SCALPING_SL_PCT * sl_tf_mult)) * streak_mult
        else:
            # Nhân hệ số TF và hệ số bóp TP/SL (streak_mult)
            target_tp_pct = globals_ref.SCALPING_TP_PCT * tp_tf_mult * streak_mult
            target_sl_pct = globals_ref.SCALPING_SL_PCT * sl_tf_mult * streak_mult
        
        # ⚡ SAFETY CLAMP: Giới hạn TP/SL tối đa 5% cho forex (XAU, kim loại) — OKX từ chối nếu vượt ngưỡng
        if max_filled_tf in ("H2", "H4") and target_tp_pct > Decimal("0.05"):
            target_tp_pct = Decimal("0.05")
            target_sl_pct = Decimal("0.05")
        
        norm_side = "long" if side == "long" or (side == "net" and Decimal(str(pos["pos"])) > 0) else "short"
        if norm_side == "long":
            calc_tp = round_to_tick(avg_px * (Decimal("1") + target_tp_pct), tick_sz)
            calc_sl = round_to_tick(avg_px * (Decimal("1") - target_sl_pct), tick_sz)
            tp_side, sl_side = "sell", "sell"
        else:
            calc_tp = round_to_tick(avg_px * (Decimal("1") - target_tp_pct), tick_sz)
            calc_sl = round_to_tick(avg_px * (Decimal("1") + target_sl_pct), tick_sz)
            tp_side, sl_side = "buy", "buy"
            
        abs_size_dec = abs(size_dec)
        status = check_algo_tpsl_status(client, inst_id, side, td_mode, abs_size_dec)
        
        # ⚡ CHẾ ĐỘ LƯỚI ĐA KHUNG (TẮT CẢ 2 DCA):
        # Mỗi lệnh con đã được gắn TP/SL riêng độc lập qua attachAlgoOrds (chế độ Split/Chia trên OKX).
        # Nếu trên sàn ĐÃ CÓ bất kỳ lệnh Algo TP hoặc SL nào, BẢO LƯU NGUYÊN VẸN 100%, tuyệt đối không hủy/gài đè lệnh tổng!
        is_grid_mode = (not _is_pyramid) and (not _is_neg_dca)
        if is_grid_mode:
            if status["has_tp"] or status["has_sl"]:
                if tracker:
                    if norm_side == "long":
                        tracker.active_tp_px_long = status["tp_px"] if status["has_tp"] else calc_tp
                        tracker.active_sl_px_long = status["sl_px"] if status["has_sl"] else calc_sl
                    else:
                        tracker.active_tp_px_short = status["tp_px"] if status["has_tp"] else calc_tp
                        tracker.active_sl_px_short = status["sl_px"] if status["has_sl"] else calc_sl
                return

        # ⚡ TÔN TRỌNG TP/SL CỦA CEO:
        # Nếu trên sàn ĐÃ CÓ TP hoặc SL và khối lượng khớp với vị thế hiện tại:
        # Tuyệt đối KHÔNG xóa và KHÔNG gài đè lại khi lệch giá. Giữ nguyên giá do CEO thiết lập.
        # Chỉ hủy và gài lại khi khối lượng vị thế thay đổi (ví dụ vừa cắn DCA nhồi thêm lệnh).
        if not status["size_matched"]:
            clean_algo_orders(client, inst_id, td_mode, side)
            status["has_tp"] = False
            status["has_sl"] = False

        if tracker:
            if norm_side == "long":
                tracker.active_tp_px_long = status["tp_px"] if status["has_tp"] else calc_tp
                tracker.active_sl_px_long = status["sl_px"] if status["has_sl"] else calc_sl
            else:
                tracker.active_tp_px_short = status["tp_px"] if status["has_tp"] else calc_tp
                tracker.active_sl_px_short = status["sl_px"] if status["has_sl"] else calc_sl

        if not status["has_tp"] or not status["has_sl"]:
            abs_size_str = str(abs_size_dec)
            if not status["has_tp"]:
                tp_px_str = f"{calc_tp:.{dec_places}f}"
                place_algo_tpsl(client, inst_id, tp_side, side, abs_size_str, tp_px_str, True, f"{CL_ORD_PREFIX}TP{int(time.time() * 1000000)}"[:32], td_mode)
            if not status["has_sl"]:
                sl_px_str = f"{calc_sl:.{dec_places}f}"
                place_algo_tpsl(client, inst_id, sl_side, side, abs_size_str, sl_px_str, False, f"{CL_ORD_PREFIX}SL{int(time.time() * 1000000)}"[:32], td_mode)
    except Exception as e:
        hft_logger.error(f"Lỗi apply_emergency_tpsl ({inst_id} {pos.get('posSide', '')}): {e}", exc_info=True)


# 🧠 CÁC HÀM XỬ LÝ DỮ LIỆU & JSON LOGGING
# ==============================================================================

