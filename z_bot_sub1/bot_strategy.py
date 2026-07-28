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
    log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "TLS1_Trading_App", "bot_error.log")
handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s')
handler.setFormatter(formatter)
hft_logger.addHandler(handler)

from z_bot_sub1.bot_indicators import *
from z_bot_sub1.bot_orders import *
try:
    from z_bot_sub1 import bot_models
except ImportError:
    import bot_models

def _sync_save_data_point_to_json(coin: str, is_win: bool, mae_val: float, mfe_val: float, nen_entry: int, vap_entry: int, pb_entry: int, entry_px: float, exit_px: float, side: str, ema_dist: float, mtf_vols: dict, env_paths: dict, state_matrix: dict, globals_ref: Any):
    try:
        data = {}
        if os.path.exists(env_paths["JSON_EVOLUTION_DATA_FILE"]):
            with open(env_paths["JSON_EVOLUTION_DATA_FILE"], "r", encoding="utf-8") as f:
                try: data = json.load(f)
                except: data = {}

        if coin not in data:
            data[coin] = {"tong_lenh_dong": 0, "lenh_thang": 0, "lenh_thua": 0, "lich_su_mae": [], "lich_su_mfe": []}

        coin_data = data[coin]
        coin_data["tong_lenh_dong"] += 1
        if is_win: coin_data["lenh_thang"] += 1
        else: coin_data["lenh_thua"] += 1

        coin_data["lich_su_mae"].append(mae_val)
        coin_data["lich_su_mfe"].append(mfe_val)
        
        if len(coin_data["lich_su_mae"]) > 40: coin_data["lich_su_mae"].pop(0)
        if len(coin_data["lich_su_mfe"]) > 40: coin_data["lich_su_mfe"].pop(0)

        with open(env_paths["JSON_EVOLUTION_DATA_FILE"], "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except:
        pass

def save_data_point_to_json(*args, **kwargs):
    import sys
    if hasattr(sys, '_bot_sub1_io_queue'):
        sys._bot_sub1_io_queue.put((_sync_save_data_point_to_json, args, kwargs))
    else:
        _sync_save_data_point_to_json(*args, **kwargs)

TRADE_HISTORY_CACHE = None
LAST_HISTORY_DUMP = 0

def _sync_update_post_trade_monitoring(coin: str, current_price: float, env_paths: dict, globals_ref: Any):
    global TRADE_HISTORY_CACHE, LAST_HISTORY_DUMP
    import time
    
    if TRADE_HISTORY_CACHE is None:
        if not os.path.exists(env_paths["FILE_TRADE_HISTORY"]): 
            TRADE_HISTORY_CACHE = []
        else:
            try:
                with open(env_paths["FILE_TRADE_HISTORY"], "r", encoding="utf-8") as f: 
                    TRADE_HISTORY_CACHE = json.load(f)
            except:
                TRADE_HISTORY_CACHE = []
    
    try:
        logs = TRADE_HISTORY_CACHE
        needs_dump = False
        status_changed = False
        
        for log in logs:
            if log.get("status") == "pending" and log.get("coin") == coin:
                needs_dump = True
                log["so_vong_quet"] = log.get("so_vong_quet", 0) + 1
                if "gia_cao_nhat_sau_dong" in log and current_price > log["gia_cao_nhat_sau_dong"]: log["gia_cao_nhat_sau_dong"] = float(current_price)
                if "gia_thap_nhat_sau_dong" in log and current_price < log["gia_thap_nhat_sau_dong"]: log["gia_thap_nhat_sau_dong"] = float(current_price)
                
                if log.get("phe") == "LONG":
                    if log.get("gia_cao_nhat_sau_dong", 0) >= log.get("moc_tp_gia_lap", 0):
                        log["ket_luan_ai"] = "ĐÓNG SAI: Giá chạy cố chạm mốc TP giả lập!"; log["status"] = "completed"
                        status_changed = True
                    elif log.get("gia_thap_nhat_sau_dong", float('inf')) <= log.get("moc_sl_gia_lap", float('-inf')):
                        log["ket_luan_ai"] = "ĐÓNG ĐÚNG: Giá sập sâu chạm SL giả lập!"; log["status"] = "completed"
                        status_changed = True
                elif log.get("phe") == "SHORT":
                    if log.get("gia_thap_nhat_sau_dong", float('inf')) <= log.get("moc_tp_gia_lap", float('-inf')):
                        log["ket_luan_ai"] = "ĐÓNG SAI: Giá chạy cố chạm mốc TP giả lập!"; log["status"] = "completed"
                        status_changed = True
                    elif log.get("gia_cao_nhat_sau_dong", 0) >= log.get("moc_sl_gia_lap", 0):
                        log["ket_luan_ai"] = "ĐÓNG ĐÚNG: Giá dựng cột chạm SL giả lập!"; log["status"] = "completed"
                        status_changed = True
                        
                if log.get("so_vong_quet", 0) >= 4800 and log["status"] == "pending":
                    log["ket_luan_ai"] = "HÒA HOÃN: Sau 160 phút giá vẫn không chạm biên."; log["status"] = "completed"
                    status_changed = True
                    
        now = time.time()
        if needs_dump and (status_changed or now - LAST_HISTORY_DUMP >= 60.0):
            with open(env_paths["FILE_TRADE_HISTORY"], "w", encoding="utf-8") as f:
                json.dump(logs, f, indent=2, ensure_ascii=False)
            LAST_HISTORY_DUMP = now
            
    except: pass

def update_post_trade_monitoring(*args, **kwargs):
    import sys
    if hasattr(sys, '_bot_sub1_io_queue'):
        sys._bot_sub1_io_queue.put((_sync_update_post_trade_monitoring, args, kwargs))
    else:
        _sync_update_post_trade_monitoring(*args, **kwargs)

def sync_config_to_json(env_paths: dict, globals_ref: Any):
    """Đồng bộ cấu hình từ bot_config.py → JSON (Two-Way Sync Chiều 1: Code → JSON)"""
    try:
        config_path = env_paths["FILE_GLOBAL_CONFIG"]
        # Đọc JSON hiện tại để giữ các giá trị do User đặt (ví dụ: POSITION_VOLUME_HIGH_CONFIDENCE)
        existing_cfg = {}
        if os.path.exists(config_path):
            try:
                with open(config_path, "r", encoding="utf-8") as _f:
                    existing_cfg = json.load(_f)
            except: pass
        cfg = {
            "AI_CONFIDENCE_SCORE": str(globals_ref.AI_CONFIDENCE_SCORE),
            "TP_TARGET_OPTIMAL": str(globals_ref.SCALPING_TP_PCT),
            "SL_TARGET_OPTIMAL": str(globals_ref.SCALPING_SL_PCT),
            "POSITION_VOLUME_HIGH_CONFIDENCE": str(getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", existing_cfg.get("POSITION_VOLUME_HIGH_CONFIDENCE", "200"))),
            "ENABLE_STRATEGY_MAIN": bool(globals_ref.ENABLE_STRATEGY_MAIN),
            "ENABLE_STRATEGY_XOLE": bool(globals_ref.ENABLE_STRATEGY_XOLE),
            "ENABLE_DYNAMIC_EMA200_TP": bool(getattr(globals_ref, "ENABLE_DYNAMIC_EMA200_TP", False)),
            "ENABLE_DYNAMIC_PINGPONG_TP": bool(getattr(globals_ref, "ENABLE_DYNAMIC_PINGPONG_TP", False)),
            "ALTCOIN_FOLLOW_BTC_EMA": bool(globals_ref.ALTCOIN_FOLLOW_BTC_EMA),
            "ENABLE_SIDEWAY_SAFE_EXIT": bool(globals_ref.ENABLE_SIDEWAY_SAFE_EXIT),
            "ENABLE_SQUEEZE_ESCAPE_EXIT": bool(globals_ref.ENABLE_SQUEEZE_ESCAPE_EXIT),
            "ENABLE_SAFEGUARD_ENTRY_EXIT": bool(globals_ref.ENABLE_SAFEGUARD_ENTRY_EXIT),
            "ENABLE_TRAILING_SL": bool(globals_ref.ENABLE_TRAILING_SL),
            "ENABLE_MAX_ROI_EXIT": bool(globals_ref.ENABLE_MAX_ROI_EXIT),
            "ENABLE_SIDEWAY_VAP_EXIT": bool(globals_ref.ENABLE_SIDEWAY_VAP_EXIT),
            "ENABLE_H4_FLIP_CLOSE": bool(globals_ref.ENABLE_H4_FLIP_CLOSE),
            "DCA_GAP_THRESHOLD_PCT": str(globals_ref.DCA_GAP_THRESHOLD_PCT),
            "EMA_CONFLUENCE_TOLERANCE_PCT": str(globals_ref.EMA_CONFLUENCE_TOLERANCE_PCT),
            "BASE_ENTRY_OFFSET_PCT": str(globals_ref.BASE_ENTRY_OFFSET_PCT),
            "REQUIRED_ACCUMULATION_CANDLES": int(globals_ref.REQUIRED_ACCUMULATION_CANDLES),
            "QUANTUM_BUFFER_CANDLES": int(globals_ref.QUANTUM_BUFFER_CANDLES),
            "QUANTUM_FORTH_CANDLES": int(globals_ref.QUANTUM_FORTH_CANDLES),
            "EVOLUTION_CYCLE_SECONDS": int(globals_ref.EVOLUTION_CYCLE_SECONDS),
            "VOL_MULTIPLIERS": {c["coin"]: str(c["vol_mult"]) for c in globals_ref.COIN_PORTFOLIO},
            "LEVERAGES": {c["coin"]: c["leverage"] for c in globals_ref.COIN_PORTFOLIO},
        }
        temp_file = config_path + ".tmp"
        with open(temp_file, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=2, ensure_ascii=False)
        os.replace(temp_file, config_path)
        print("🔄 [TWO-WAY SYNC]: Đã đồng bộ cấu hình từ bot_config.py sang JSON!")
    except Exception as e:
        print(f"⚠️ [SYNC LỖI]: Không thể đồng bộ config ra JSON: {e}")

def run_ai_self_evolution(env_paths: dict, globals_ref: Any):
    try:
        if os.path.exists(env_paths["FILE_GLOBAL_CONFIG"]):
            with open(env_paths["FILE_GLOBAL_CONFIG"], "r", encoding="utf-8") as f:
                cfg = json.load(f)
                globals_ref.AI_CONFIDENCE_SCORE = Decimal(str(cfg.get("AI_CONFIDENCE_SCORE", "0")))
                globals_ref.SCALPING_TP_PCT = Decimal(str(cfg.get("TP_TARGET_OPTIMAL", "0.01500")))
                globals_ref.SCALPING_SL_PCT = Decimal(str(cfg.get("SL_TARGET_OPTIMAL", "0.01500")))
                


                if "POSITION_VOLUME_HIGH_CONFIDENCE" in cfg:
                    globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE = Decimal(str(cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
                    
                # Các cờ chiến thuật
                if "ENABLE_STRATEGY_MAIN" in cfg: globals_ref.ENABLE_STRATEGY_MAIN = bool(cfg["ENABLE_STRATEGY_MAIN"])
                if "ENABLE_STRATEGY_XOLE" in cfg: globals_ref.ENABLE_STRATEGY_XOLE = bool(cfg["ENABLE_STRATEGY_XOLE"])
                if "ENABLE_DYNAMIC_EMA200_TP" in cfg: globals_ref.ENABLE_DYNAMIC_EMA200_TP = bool(cfg["ENABLE_DYNAMIC_EMA200_TP"])
                if "ENABLE_DYNAMIC_PINGPONG_TP" in cfg: globals_ref.ENABLE_DYNAMIC_PINGPONG_TP = bool(cfg["ENABLE_DYNAMIC_PINGPONG_TP"])
                if "ALTCOIN_FOLLOW_BTC_EMA" in cfg: globals_ref.ALTCOIN_FOLLOW_BTC_EMA = bool(cfg["ALTCOIN_FOLLOW_BTC_EMA"])

                # Lớp bảo vệ cục bộ
                if "ENABLE_SIDEWAY_SAFE_EXIT" in cfg: globals_ref.ENABLE_SIDEWAY_SAFE_EXIT = bool(cfg["ENABLE_SIDEWAY_SAFE_EXIT"])
                if "ENABLE_SQUEEZE_ESCAPE_EXIT" in cfg: globals_ref.ENABLE_SQUEEZE_ESCAPE_EXIT = bool(cfg["ENABLE_SQUEEZE_ESCAPE_EXIT"])
                if "ENABLE_SAFEGUARD_ENTRY_EXIT" in cfg: globals_ref.ENABLE_SAFEGUARD_ENTRY_EXIT = bool(cfg["ENABLE_SAFEGUARD_ENTRY_EXIT"])
                if "ENABLE_TRAILING_SL" in cfg: globals_ref.ENABLE_TRAILING_SL = bool(cfg["ENABLE_TRAILING_SL"])
                if "ENABLE_MAX_ROI_EXIT" in cfg: globals_ref.ENABLE_MAX_ROI_EXIT = bool(cfg["ENABLE_MAX_ROI_EXIT"])
                if "ENABLE_SIDEWAY_VAP_EXIT" in cfg: globals_ref.ENABLE_SIDEWAY_VAP_EXIT = bool(cfg["ENABLE_SIDEWAY_VAP_EXIT"])
                if "ENABLE_H4_FLIP_CLOSE" in cfg: globals_ref.ENABLE_H4_FLIP_CLOSE = bool(cfg["ENABLE_H4_FLIP_CLOSE"])

                # Thông số kỹ thuật & dung sai
                if "DCA_GAP_THRESHOLD_PCT" in cfg:
                    globals_ref.DCA_GAP_THRESHOLD_PCT = Decimal(str(cfg["DCA_GAP_THRESHOLD_PCT"]))
                if "EMA_CONFLUENCE_TOLERANCE_PCT" in cfg:
                    globals_ref.EMA_CONFLUENCE_TOLERANCE_PCT = Decimal(str(cfg["EMA_CONFLUENCE_TOLERANCE_PCT"]))
                if "BASE_ENTRY_OFFSET_PCT" in cfg:
                    globals_ref.BASE_ENTRY_OFFSET_PCT = Decimal(str(cfg["BASE_ENTRY_OFFSET_PCT"]))
                    # Tự động tính toán lại 2 bảng tĩnh nếu BASE_ENTRY_OFFSET_PCT bị ghi đè
                    globals_ref.TF_ENTRY_OFFSETS = {k: globals_ref.BASE_ENTRY_OFFSET_PCT * v for k, v in globals_ref.TF_MULTIPLIERS.items()}
                    globals_ref.XOLE_TF_ENTRY_OFFSETS = {k: globals_ref.BASE_ENTRY_OFFSET_PCT * v for k, v in globals_ref.XOLE_TF_MULTIPLIERS.items()}
                if "REQUIRED_ACCUMULATION_CANDLES" in cfg:
                    globals_ref.REQUIRED_ACCUMULATION_CANDLES = int(cfg["REQUIRED_ACCUMULATION_CANDLES"])

                # Cấu hình Lượng tử
                if "QUANTUM_BUFFER_CANDLES" in cfg: globals_ref.QUANTUM_BUFFER_CANDLES = int(cfg["QUANTUM_BUFFER_CANDLES"])
                if "QUANTUM_FORTH_CANDLES" in cfg: globals_ref.QUANTUM_FORTH_CANDLES = int(cfg["QUANTUM_FORTH_CANDLES"])
                if "EVOLUTION_CYCLE_SECONDS" in cfg: globals_ref.EVOLUTION_CYCLE_SECONDS = int(cfg["EVOLUTION_CYCLE_SECONDS"])
                vol_mults = cfg.get("VOL_MULTIPLIERS", {})
                leverages = cfg.get("LEVERAGES", {})
                for item in globals_ref.COIN_PORTFOLIO:
                    cname = item["coin"]
                    if cname in vol_mults:
                        item["vol_mult"] = Decimal(str(vol_mults[cname]))
                    if cname in leverages:
                        item["leverage"] = int(leverages[cname])
    except: pass

    pass


def update_tf_state(tf_opens_asc: list[Decimal], tf_closes_asc: list[Decimal], tf_ema200: Decimal, state_dict: dict, is_new_closed: bool, latest_closed_ts: int, tf_ms: int, req_accum: int, quantum_buf: int, quantum_forth: int):
    if not is_new_closed: return
    # Kiểm tra gap nến (nếu mất > 1.5 nến hoặc > 60 phút thì reset đếm lại cho cẩn thận)
    gap_ms = latest_closed_ts - state_dict["ts"]
    if state_dict["ts"] > 0 and gap_ms > max(tf_ms * 1.5, 3600000):
        state_dict["side"] = "none"
        state_dict["accum"], state_dict["fail"], state_dict["back"], state_dict["forth"] = 0, 0, 0, 0
        state_dict["win_streak"] = 0
        state_dict["streak_locked"] = False
        
    state_dict["ts"] = latest_closed_ts
    last_open = tf_opens_asc[-1]
    last_close = tf_closes_asc[-1]
    body_low = min(last_open, last_close)
    body_high = max(last_open, last_close)
    if body_low > tf_ema200:
        nominal_side = "above"
    elif body_high < tf_ema200:
        nominal_side = "under"
    else:
        nominal_side = "touch"
    
    if state_dict["side"] == "none" or state_dict.get("accum", 0) == 0:
        # 🔄 Tái dựng lịch sử bằng cơ chế Forward Replay (Quét thuận chiều)
        temp_state = {"side": "none", "accum": 0, "fail": 0, "back": 0, "forth": 0, "recovery_count": 0}
        
        for i in range(len(tf_closes_asc)):
            s_open = tf_opens_asc[i]
            s_close = tf_closes_asc[i]
            s_low = min(s_open, s_close)
            s_high = max(s_open, s_close)
            
            sub_closes = tf_closes_asc[:i+1]
            if len(sub_closes) < 200: continue
            sub_ema200 = calculate_ema(sub_closes, 200)
            if sub_ema200 <= 0: continue
            
            if s_low > sub_ema200:
                s_nominal = "above"
            elif s_high < sub_ema200:
                s_nominal = "under"
            else:
                s_nominal = "touch"
                
            if temp_state["side"] == "none":
                if s_nominal != "touch":
                    temp_state["side"] = s_nominal
                    temp_state["accum"] = 1
                continue
                
            if s_nominal != "touch":
                if s_nominal == temp_state["side"]:
                    if temp_state["back"] > 0:
                        temp_state["forth"] += 1
                        if temp_state["forth"] >= quantum_forth:
                            temp_state["accum"] += temp_state["forth"]
                            temp_state["recovery_count"] = temp_state.get("recovery_count", 0) + temp_state["forth"]
                            temp_state["back"], temp_state["forth"] = 0, 0
                            temp_state.pop("cycle_fail_triggered", None)
                    else:
                        temp_state["accum"] += 1
                        temp_state["recovery_count"] = temp_state.get("recovery_count", 0) + 1
                        if temp_state["fail"] > 0 and temp_state["recovery_count"] >= req_accum:
                            temp_state["fail"] = 0
                else:
                    if temp_state["forth"] > 0: temp_state["forth"] = 0 
                    temp_state["back"] += 1
                    
                    cycle_trig = temp_state.get("cycle_fail_triggered", False)
                    if temp_state["back"] >= quantum_buf and not cycle_trig:
                        temp_state["fail"] += 1 
                        temp_state["recovery_count"] = 0
                        temp_state["cycle_fail_triggered"] = True
                    
                    if temp_state["back"] >= req_accum:
                        temp_state["side"] = s_nominal
                        temp_state["accum"] = temp_state["back"]
                        temp_state["back"], temp_state["forth"], temp_state["fail"] = 0, 0, 0
                        temp_state.pop("cycle_fail_triggered", None)
                        temp_state["recovery_count"] = temp_state["accum"]
                        
        state_dict["side"] = temp_state["side"]
        state_dict["accum"] = temp_state["accum"] if temp_state["accum"] > 0 else 1
        state_dict["fail"] = temp_state["fail"]
        state_dict["back"] = temp_state["back"]
        state_dict["forth"] = temp_state["forth"]
        if temp_state.get("cycle_fail_triggered"):
            state_dict["cycle_fail_triggered"] = True
        
        if state_dict["accum"] >= req_accum: 
            state_dict["locked"] = False
    elif nominal_side != "touch":
            if nominal_side == state_dict["side"]:
                if state_dict["back"] > 0:
                    state_dict["forth"] += 1
                    if state_dict["forth"] >= quantum_forth:
                        state_dict["accum"] += state_dict["forth"]
                        state_dict["recovery_count"] = state_dict.get("recovery_count", 0) + state_dict["forth"]
                        state_dict["back"], state_dict["forth"] = 0, 0
                        state_dict.pop("cycle_fail_triggered", None)  # Reset flag để chu kỳ sau fail bình thường
                else:
                    state_dict["accum"] += 1
                    state_dict["recovery_count"] = state_dict.get("recovery_count", 0) + 1
                    
                    if state_dict["fail"] > 0 and state_dict["recovery_count"] >= req_accum:
                        state_dict["fail"] = 0
                
                if state_dict["accum"] >= req_accum: 
                    state_dict["locked"] = False
            else:
                # Giá đang đi ngược chiều xu hướng (nominal_side != state side)
                if state_dict["forth"] > 0: state_dict["forth"] = 0 
                state_dict["back"] += 1
                
                # Dùng cycle_fail_triggered flag để tránh fail++ lặp khi back vượt quá quantum_buf
                cycle_triggered = state_dict.get("cycle_fail_triggered", False)
                if state_dict["back"] >= quantum_buf and not cycle_triggered:
                    state_dict["fail"] += 1 
                    state_dict["recovery_count"] = 0
                    state_dict["cycle_fail_triggered"] = True
                    state_dict["win_streak"] = 0
                    state_dict["streak_locked"] = False
                
                # Đảo chiều hoàn toàn khi back vượt req_accum (60 nến ngược chiều)
                if state_dict["back"] >= req_accum:
                    state_dict["side"] = nominal_side
                    state_dict["accum"] = state_dict["back"]
                    state_dict["back"], state_dict["forth"], state_dict["fail"] = 0, 0, 0
                    state_dict.pop("cycle_fail_triggered", None)
                    state_dict["recovery_count"] = state_dict["accum"]
                    state_dict["locked"] = False
                    state_dict["win_streak"] = 0
                    state_dict["streak_locked"] = False

# ==============================================================================
# 🔁 TÁI DỰNG LỊCH SỬ NẾN KHI RESET (REPLAY ENGINE)
# ==============================================================================
# 🧠 ĐỘNG CƠ CỐT LÕI (CHẠY CHIẾN LƯỢC MỖI VÒNG LẶP)
# ==============================================================================
def get_current_candle_start_ms(tf_str: str) -> int:
    import time
    ts_sec = int(time.time())
    if tf_str == "M5": period = 300
    elif tf_str == "M15": period = 900
    elif tf_str == "M30": period = 1800
    elif tf_str == "H1": period = 3600
    elif tf_str == "H2": period = 7200
    elif tf_str == "H4": period = 14400
    else: period = 300
    return (ts_sec // period) * period * 1000

def get_nearest_opposite_ema200(tracker, side, pos_tf):
    tfs = ["M5", "M15", "M30", "H1", "H2", "H4"]
    try: start_idx = tfs.index(pos_tf) + 1
    except ValueError: return Decimal("0")
    for tf in tfs[start_idx:]:
        e34 = getattr(tracker, f"{tf.lower()}_ema34", getattr(tracker, "ema34", Decimal("0")) if tf == "M5" else Decimal("0"))
        e89 = getattr(tracker, f"{tf.lower()}_ema89", getattr(tracker, "ema89", Decimal("0")) if tf == "M5" else Decimal("0"))
        e200 = getattr(tracker, f"{tf.lower()}_ema200", getattr(tracker, "ema200", Decimal("0")) if tf == "M5" else Decimal("0"))
        if e200 <= 0: continue
        if side == "LONG":
            if e34 < e200 and e89 < e200: return e200
        else:
            if e34 > e200 and e89 > e200: return e200
    return Decimal("0")

def run_strategy_cycle(client, cfg: dict, pMode: str, state_matrix: dict, env_paths: dict, system_config: dict, is_limit_setup_cycle: bool): # pyright: ignore[reportGeneralTypeIssues]
    import sys; globals_ref = sys.modules[__name__] # Tham chiếu trực tiếp thay vì import lại

    swap_id = cfg["swap"]
    coin_name = cfg["coin"]
    if swap_id not in state_matrix: return
    tracker = state_matrix[swap_id]
    
    # Phân nhóm tài sản: crypto (neo BTC nếu ON) | forex (kim loại, cổ phiếu, cặp tiền - giao dịch độc lập)
    _asset_class = cfg.get("asset_class", "crypto")
    _is_alt_synced = (coin_name != "BTC" and _asset_class == "crypto" and getattr(globals_ref, "ALTCOIN_FOLLOW_BTC_EMA", True))
    
    # Khởi tạo giá trị mặc định để IDE/Pylance không báo lỗi NameError "Could not find name"
    closes_asc = []
    is_new_candle_closed = False
    latest_closed_timestamp = 0
    closed_m15 = []
    closed_m30 = []
    closed_h1 = []
    closed_h2 = []
    closed_h4 = []
    
    if not hasattr(tracker, "mtf_states"):
        loaded = False
        mtf_file = env_paths.get("FILE_MTF_STATES")
        if mtf_file and os.path.exists(mtf_file):
            try:
                import json
                with open(mtf_file, "r", encoding="utf-8") as f:
                    saved_data = json.load(f)
                    if swap_id in saved_data:
                        coin_data = saved_data[swap_id]
                        if "mtf_states" in coin_data:
                            tracker.mtf_states = coin_data["mtf_states"]
                            if "max_roi_long" in coin_data: tracker.max_roi_long = Decimal(str(coin_data["max_roi_long"]))
                            if "max_roi_short" in coin_data: tracker.max_roi_short = Decimal(str(coin_data["max_roi_short"]))
                            if "mae_max_pct_long" in coin_data: tracker.mae_max_pct_long = Decimal(str(coin_data["mae_max_pct_long"]))
                            if "mae_max_pct_short" in coin_data: tracker.mae_max_pct_short = Decimal(str(coin_data["mae_max_pct_short"]))
                            if "last_entry_l" in coin_data: tracker.last_entry_l = Decimal(str(coin_data["last_entry_l"]))
                            if "last_entry_s" in coin_data: tracker.last_entry_s = Decimal(str(coin_data["last_entry_s"]))
                            if "open_reason_long" in coin_data: setattr(tracker, "open_reason_long", coin_data["open_reason_long"])
                            if "open_reason_short" in coin_data: setattr(tracker, "open_reason_short", coin_data["open_reason_short"])
                            if "last_closed_side" in coin_data: tracker.last_closed_side = coin_data["last_closed_side"]
                            if "last_closed_roi" in coin_data: tracker.last_closed_roi = Decimal(str(coin_data["last_closed_roi"]))
                            if "last_closed_reason" in coin_data: tracker.last_closed_reason = coin_data["last_closed_reason"]
                            if "pos_cycle_filled_tfs" in coin_data: 
                                tracker.pos_cycle_filled_tfs = list(coin_data["pos_cycle_filled_tfs"])
                                tracker.pos_cycle_closed_tfs = list(tracker.pos_cycle_filled_tfs)
                            # BUG FIX: Restore active_pos_tf từ file, tránh bị reset về M5 sau restart
                            if "active_pos_tf" in coin_data:
                                tracker.active_pos_tf = coin_data["active_pos_tf"]
                        else:
                            tracker.mtf_states = coin_data
                        loaded = True
            except:
                pass
        if not loaded:
            tracker.mtf_states = {
                "M5": {"accum": getattr(tracker, "accum_candle_count", 0), "fail": getattr(tracker, "cycle_fail_count", 0), "back": getattr(tracker, "back_count", 0), "forth": getattr(tracker, "forth_count", 0), "side": getattr(tracker, "current_side", "none"), "ts": getattr(tracker, "last_candle_timestamp", 0), "locked": False},
                "M15": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                "M30": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                "H1": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                "H2": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                "H4": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False}
            }
        
        # Đảm bảo toàn bộ các khung thời gian đều có đầy đủ cấu trúc
        for tf in ["M5", "M15", "M30", "H1", "H2", "H4"]:
            tracker.mtf_states.setdefault(tf, {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False})
            
        tracker.placed_target_tf = "M5"
        tracker.active_pos_tf = "M5"

    spec = client.fetch_spec(swap_id)
    tick_sz, contract_val = spec["tickSz"], spec["ctVal"]
    dec_places = abs(tick_sz.normalize().as_tuple().exponent)

    # --------------------------------------------------------------------------
    # ⚙️ CÁC HÀM HỖ TRỢ RẢI LIMIT ĐA KHUNG ĐỒNG PHA (MULTI-TIMEFRAME GRID HELPERS)
    # ### HELPER CLOSURES ###
    # --------------------------------------------------------------------------
    def get_optimal_ema_for_tf(tf, trend_direction):
        base = Decimal("0")
        confirm = Decimal("0")
        
        if tf == "M5": 
            base = tracker.ema200
            confirm = getattr(tracker, "m15_ema89", Decimal("0"))
        elif tf == "M15": 
            base = getattr(tracker, "m15_ema200", Decimal("0"))
            confirm = getattr(tracker, "m30_ema89", Decimal("0"))
        elif tf == "M30": 
            base = getattr(tracker, "m30_ema200", Decimal("0"))
            confirm = getattr(tracker, "h1_ema89", Decimal("0"))
        elif tf == "H1": 
            base = getattr(tracker, "h1_ema200", Decimal("0"))
            confirm = getattr(tracker, "h2_ema89", Decimal("0"))
        elif tf == "H2": 
            base = getattr(tracker, "h2_ema200", Decimal("0"))
            confirm = getattr(tracker, "h4_ema89", Decimal("0"))
        elif tf == "H4":
            base = getattr(tracker, "h4_ema200", Decimal("0"))
            confirm = Decimal("0")
        
        if confirm == Decimal("0"): return base
        if base == Decimal("0"): return confirm
        
        dist_pct = abs(base - confirm) / base * Decimal("100")
        tf_multiplier = globals_ref.TF_MULTIPLIERS.get(tf, Decimal("1.0"))
        tolerance_pct = getattr(globals_ref, "EMA_CONFLUENCE_TOLERANCE_PCT", Decimal("0.0020")) * tf_multiplier * Decimal("100")
        
        if dist_pct <= tolerance_pct:
            return (base + confirm) / Decimal("2")
        else:
            return base

    def calculate_entry_px(tf, side):
        _xl_tf  = getattr(tracker, "xole_tf", None)
        if side == "long":
            if _xl_tf and tf == _xl_tf:
                target_ema = getattr(tracker, "xole_entry_ema", Decimal("0"))
            else:
                target_ema = get_optimal_ema_for_tf(tf, "UPTREND")
        else:
            if _xl_tf and tf == _xl_tf:
                target_ema = getattr(tracker, "xole_entry_ema", Decimal("0"))
            else:
                target_ema = get_optimal_ema_for_tf(tf, "DOWNTREND")

        if target_ema <= 0:
            return Decimal("0")

        _is_pp_pos = False
        _is_xl_pos = getattr(tracker, "xole_tf", None) == tf

        is_xole = getattr(tracker, "is_xole_pos", False)
        if is_xole and hasattr(globals_ref, "XOLE_TF_ENTRY_OFFSETS"):
            base_buffer = globals_ref.XOLE_TF_ENTRY_OFFSETS.get(tf, Decimal("0.0006"))
        else:
            base_buffer = getattr(globals_ref, "TF_ENTRY_OFFSETS", {}).get(tf, Decimal("0.0006"))
        
        if coin_name == "BTC" or _is_pp_pos or _is_xl_pos or not _is_alt_synced:
            # Bỏ volatility_mult (ATR elasticity) — offset thuần dựa trên TF_MULTIPLIERS
            offset = base_buffer
            if side == "long":
                raw_px = target_ema * (Decimal("1") + offset)
            else:
                raw_px = target_ema * (Decimal("1") - offset)
        else:
            # ==============================================================================
            # ALTCOIN ĐỆM LÕM TUYỆT ĐỐI THEO BTC (Bỏ qua EMA của Altcoin)
            # ==============================================================================
            btc_tk = state_matrix.get("BTC-USDT-SWAP")
            if not btc_tk or btc_tk.live_price <= 0:
                # Fallback an toàn nếu mất kết nối data BTC
                volatility_mult = getattr(tracker, 'current_vol_mult', Decimal("1.0"))
                tf_vol_mult = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
                offset = base_buffer * volatility_mult * tf_vol_mult
                if side == "long":
                    raw_px = target_ema * (Decimal("1") + offset)
                else:
                    raw_px = target_ema * (Decimal("1") - offset)
            else:
                # 1. Tính cản EMA200 của BTC ở TF hiện tại (dùng get_ema200_for_tf từ closure)
                # Lưu tạm tracker gốc, thay bằng BTC tracker để gọi get_ema200_for_tf
                _orig_tracker = tracker
                # Dùng tham chiếu tạm — vì get_ema200_for_tf dùng biến tracker trong closure
                btc_ema = Decimal("0")
                if tf == "M5": btc_ema = btc_tk.ema200
                elif tf == "M15": btc_ema = getattr(btc_tk, "m15_ema200", Decimal("0"))
                elif tf == "M30": btc_ema = getattr(btc_tk, "m30_ema200", Decimal("0"))
                elif tf == "H1": btc_ema = getattr(btc_tk, "h1_ema200", Decimal("0"))
                elif tf == "H2": btc_ema = getattr(btc_tk, "h2_ema200", Decimal("0"))
                elif tf == "H4": btc_ema = getattr(btc_tk, "h4_ema200", Decimal("0"))
                if btc_ema <= 0:
                    btc_ema = btc_tk.live_price # Fallback

                # 2. Lấy khoảng cách từ Giá Live BTC tới Cản EMA200 của BTC
                btc_ema_dist = (btc_ema - btc_tk.live_price) / btc_tk.live_price

                # 3. Lấy hệ số biến động riêng của Altcoin
                _coin_vol_mult = Decimal("1.0")
                for item in getattr(globals_ref, "COIN_PORTFOLIO", []):
                    if item["coin"] == coin_name:
                        _coin_vol_mult = Decimal(str(item.get("vol_mult", "1.0")))
                        break

                # 4. Nhân bản khoảng cách EMA theo độ biến động của Altcoin
                alt_base_dist = btc_ema_dist * _coin_vol_mult

                # 5. Đệm lùi cho Altcoin: dùng base_buffer (= BASE_ENTRY_OFFSET_PCT × TF_MULTIPLIERS[tf])
                # Giống hệt BTC — KHÔNG nhân thêm volatility_mult hay TF_VOLUME_MULTIPLIERS
                # base_buffer đã được tính sẵn ở trên: TF_ENTRY_OFFSETS.get(tf) = BASE_ENTRY_OFFSET_PCT * TF_MULTIPLIERS[tf]
                alt_offset = base_buffer

                # 6. Chốt giá Limit cuối cùng
                if side == "long":
                    alt_final_pct = alt_base_dist + alt_offset
                else:
                    alt_final_pct = alt_base_dist - alt_offset

                raw_px = tracker.live_price * (Decimal("1") + alt_final_pct)

                # ⚡ EMA FLOOR CLAMP: Giới hạn entry Altcoin không vượt quá EMA200 của chính nó
                # Ngăn chặn 2 kịch bản nguy hiểm:
                # (A) BTC gần EMA200 → alt_final_pct dương → entry trên giá live (fill ngay như market)
                # (B) BTC overshoots → btc_ema_dist dương → entry trên giá live (vô nghĩa)
                alt_own_ema = get_ema200_for_tf(tf)  # EMA200 của Altcoin tại TF hiện tại
                if alt_own_ema > 0:
                    if side == "long":
                        ema_floor = alt_own_ema * (Decimal("1") + base_buffer)
                        raw_px = min(raw_px, ema_floor)  # LONG: không đặt cao hơn EMA200 Altcoin + buffer
                    else:
                        ema_ceiling = alt_own_ema * (Decimal("1") - base_buffer)
                        raw_px = max(raw_px, ema_ceiling)  # SHORT: không đặt thấp hơn EMA200 Altcoin - buffer

        # ⚡ SAFETY CLAMP: Giới hạn limit không vượt quá EMA200 của TF tín hiệu chủ đạo
        # Khi TF lưới nhỏ hơn TF tín hiệu, EMA200 của TF nhỏ có thể lệch pha gây limit vô nghĩa
        # VD: M5 EMA200 > H4 EMA200 → SHORT limit M5 vượt lên trên cản H4 → không bao giờ khớp
        _signal_tf = getattr(tracker, "signal_short_tf", None) if side == "short" else getattr(tracker, "signal_long_tf", None)
        if _signal_tf and tf_weight(_signal_tf) > tf_weight(tf):
            _signal_ema = get_ema200_for_tf(_signal_tf)
            if _signal_ema > 0:
                if side == "short" and raw_px > _signal_ema:
                    raw_px = _signal_ema  # SHORT: không đặt limit trên EMA200 của TF tín hiệu
                elif side == "long" and raw_px < _signal_ema:
                    raw_px = _signal_ema  # LONG: không đặt limit dưới EMA200 của TF tín hiệu

        return round_to_tick(raw_px, tick_sz)

    def get_ema200_for_tf(tf):
        if tf == "M5": return tracker.ema200
        if tf == "M15": return getattr(tracker, "m15_ema200", Decimal("0"))
        if tf == "M30": return getattr(tracker, "m30_ema200", Decimal("0"))
        if tf == "H1": return getattr(tracker, "h1_ema200", Decimal("0"))
        if tf == "H2": return getattr(tracker, "h2_ema200", Decimal("0"))
        if tf == "H4": return getattr(tracker, "h4_ema200", Decimal("0"))
        return Decimal("0")

    def determine_filled_tf(side, old_has, old_pos_amt, new_pos_amt, avg_px):
        try:
            # Lấy 100 lệnh khớp gần nhất
            fills = client.request("GET", "/api/v5/trade/fills", 
                                   params={"instType": "SWAP", "instId": swap_id, "limit": "100"}).get("data", [])
            prefix = f"{CL_ORD_PREFIX}EL" if side == "long" else f"{CL_ORD_PREFIX}ES"
            current_ms = int(time.time() * 1000)
            matched_tfs = []
            for f in fills:
                fill_time = int(f.get("ts", "0"))
                # Khi đang chạy live (old_has=True): chỉ lấy fill trong 60s
                # Khi khởi động lại bot (old_has=False): lấy toàn bộ fill gần nhất không giới hạn 60s
                if old_has and (current_ms - fill_time > 60000): continue
                cl_id = f.get("clOrdId", "")
                if cl_id.startswith(prefix):
                    for tf_cand in ["H4", "H2", "H1", "M30", "M15", "M5"]:
                        if cl_id[len(prefix):].startswith(tf_cand):
                            matched_tfs.append(tf_cand)
                            break
            if matched_tfs:
                # Trả về TF cao nhất có trong lịch sử khớp lệnh
                return max(matched_tfs, key=tf_weight)
        except: pass

        # Fallback 1: So sánh tổng volume của lệnh đang chạy trên sàn với volume các TF
        try:
            _amt = (new_pos_amt - old_pos_amt) if old_has else new_pos_amt
            current_vol_usdt = Decimal(str(_amt)) * Decimal(str(contract_val)) * Decimal(str(avg_px))
            _target_usdt = Decimal("200")
            try:
                gcfg_path = env_paths.get("FILE_GLOBAL_CONFIG") if env_paths else None
                if gcfg_path and os.path.exists(gcfg_path):
                    with open(gcfg_path, "r", encoding="utf-8") as f:
                        _gcfg = json.load(f)
                        if "POSITION_VOLUME_HIGH_CONFIDENCE" in _gcfg:
                            _target_usdt = Decimal(str(_gcfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
                elif hasattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE"):
                    _target_usdt = Decimal(str(globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE))
            except Exception:
                _target_usdt = getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", Decimal("200"))

            vol_mults = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {
                "M5": Decimal("1.0"), "M15": Decimal("1.2"), "M30": Decimal("1.5"),
                "H1": Decimal("2.0"), "H2": Decimal("3.0"), "H4": Decimal("5.0")
            })
            
            _coin_vol_mult = Decimal("1.0")
            for item in getattr(globals_ref, "COIN_PORTFOLIO", []):
                if item["coin"] == coin_name:
                    _coin_vol_mult = Decimal(str(item.get("vol_mult", "1.0")))
                    break
            
            tfs_order = ["M5", "M15", "M30", "H1", "H2", "H4"]
            if not old_has:
                # Cumulative matching (khi restart bot, tính tổng volume dồn)
                cumulative_vols = {}
                cum_sum = Decimal("0")
                for tf_cand in tfs_order:
                    expected = _target_usdt * vol_mults.get(tf_cand, Decimal("1.0")) * _coin_vol_mult
                    cum_sum += expected
                    cumulative_vols[tf_cand] = cum_sum
                
                for tf_cand in reversed(tfs_order):
                    if current_vol_usdt >= cumulative_vols[tf_cand] * Decimal("0.70"):
                        return tf_cand
            else:
                # Individual matching (khi đang chạy live có fill mới)
                for tf_cand in reversed(tfs_order):
                    expected = _target_usdt * vol_mults.get(tf_cand, Decimal("1.0")) * _coin_vol_mult
                    if current_vol_usdt >= expected * Decimal("0.70"):
                        return tf_cand
        except: pass
            
        # Fallback 2: Kiểm tra lệnh Pending
        try:
            pending = client.request("GET", "/api/v5/trade/orders-pending",
                                     params={"instType": "SWAP", "instId": swap_id})["data"]
            pending_tfs = set()
            prefix = f"{CL_ORD_PREFIX}EL" if side == "long" else f"{CL_ORD_PREFIX}ES"
            for o in pending:
                cl_id = o.get("clOrdId", "")
                if cl_id.startswith(prefix):
                    for tf_cand in ["M5", "M15", "M30", "H1", "H2", "H4"]:
                        if cl_id[len(prefix):].startswith(tf_cand):
                            pending_tfs.add(tf_cand)
                            break
            
            placed_dict_name = "placed_entry_px_long_by_tf" if side == "long" else "placed_entry_px_short_by_tf"
            placed_tfs = getattr(tracker, placed_dict_name, {})
            missing_tfs = [tf for tf, px in placed_tfs.items() if px != "---" and tf not in pending_tfs and tf not in tracker.pos_cycle_filled_tfs]
            if missing_tfs:
                current_pos_tf = getattr(tracker, "active_pos_tf", "M5")
                if old_has and new_pos_amt > old_pos_amt:
                    larger_missing = [tf for tf in missing_tfs if tf_weight(tf) > tf_weight(current_pos_tf) and tf not in tracker.pos_cycle_filled_tfs]
                    if larger_missing:
                        return larger_missing[0]
                smallest_missing = min(missing_tfs, key=tf_weight)
                if smallest_missing not in tracker.pos_cycle_filled_tfs:
                    return smallest_missing
                return None
        except: pass

        # Fallback 3: Dò TF có EMA200 gần entry nhất
        TFS = ["M5", "M15", "M30", "H1", "H2", "H4"]
        best_tf = None
        min_diff = Decimal("inf")
        for tf in TFS:
            if tf in tracker.pos_cycle_filled_tfs:
                continue
            ema_tf = get_ema200_for_tf(tf)
            if ema_tf > 0:
                diff = abs(avg_px - ema_tf) / ema_tf
                if diff < min_diff:
                    min_diff = diff
                    best_tf = tf
        if min_diff < Decimal("0.0200"):
            return best_tf
        return None
    try:
        candles = fetch_candles_paginated(client, swap_id, globals_ref.TIMEFRAME_BASE, int(globals_ref.LIMIT_CANDLES))
        candles_m15 = fetch_candles_paginated(client, swap_id, "15m", int(globals_ref.LIMIT_CANDLES))
        candles_m30 = fetch_candles_paginated(client, swap_id, "30m", int(globals_ref.LIMIT_CANDLES))
        candles_h1 = fetch_candles_paginated(client, swap_id, "1H", int(globals_ref.LIMIT_CANDLES))
        candles_h2 = fetch_candles_paginated(client, swap_id, "2H", int(globals_ref.LIMIT_CANDLES))
        candles_h4 = fetch_candles_paginated(client, swap_id, "4H", int(globals_ref.LIMIT_CANDLES))
        if not candles or len(candles) < 250: return
        if not candles_m15 or len(candles_m15) < 280: return
        if not candles_m30 or len(candles_m30) < 280: return
        if not candles_h1 or len(candles_h1) < 280: return
        if not candles_h2 or len(candles_h2) < 280: return
        if not candles_h4 or len(candles_h4) < 280: return
    except Exception as e:
        hft_logger.error(f"Lỗi fetch candles {coin_name} ({swap_id}): {e}")
        return

    # --------------------------------------------------------------------------
    # 🌐 TÍNH TOÁN XU HƯỚNG M15 (MACRO MTF FILTER)
    # --------------------------------------------------------------------------
    closed_m15 = candles_m15[1:]
    m15_closes = [Decimal(c[4]) for c in reversed(closed_m15)]
    m15_ema34 = calculate_ema(m15_closes, 34)
    m15_ema89 = calculate_ema(m15_closes, 89)
    m15_ema200 = calculate_ema(m15_closes, 200)
    tracker.m15_ema34 = m15_ema34
    tracker.m15_ema89 = m15_ema89
    tracker.m15_ema200 = m15_ema200
    
    closed_m30 = candles_m30[1:]
    m30_closes = [Decimal(c[4]) for c in reversed(closed_m30)]
    m30_ema34 = calculate_ema(m30_closes, 34)
    m30_ema89 = calculate_ema(m30_closes, 89)
    m30_ema200 = calculate_ema(m30_closes, 200)
    tracker.m30_ema34 = m30_ema34
    tracker.m30_ema89 = m30_ema89
    tracker.m30_ema200 = m30_ema200

    closed_h1 = candles_h1[1:]
    h1_closes = [Decimal(c[4]) for c in reversed(closed_h1)]
    h1_ema34 = calculate_ema(h1_closes, 34)
    h1_ema89 = calculate_ema(h1_closes, 89)
    h1_ema200 = calculate_ema(h1_closes, 200)
    tracker.h1_ema34 = h1_ema34
    tracker.h1_ema89 = h1_ema89
    tracker.h1_ema200 = h1_ema200

    closed_h2 = candles_h2[1:]
    h2_closes = [Decimal(c[4]) for c in reversed(closed_h2)]
    tracker.h2_ema34 = calculate_ema(h2_closes, 34)
    tracker.h2_ema89 = calculate_ema(h2_closes, 89)
    tracker.h2_ema200 = calculate_ema(h2_closes, 200)

    closed_h4 = candles_h4[1:]
    h4_closes = [Decimal(c[4]) for c in reversed(closed_h4)]
    tracker.h4_ema34 = calculate_ema(h4_closes, 34)
    tracker.h4_ema89 = calculate_ema(h4_closes, 89)
    tracker.h4_ema200 = calculate_ema(h4_closes, 200)

    tracker.macro_trend = "SIDEWAY"
    if m15_ema34 > m15_ema89 > m15_ema200: tracker.macro_trend = "UPTREND"
    elif m15_ema34 < m15_ema89 < m15_ema200: tracker.macro_trend = "DOWNTREND"

    # --------------------------------------------------------------------------
    # ⏱️ TÍNH TOÁN XU HƯỚNG BASE
    # --------------------------------------------------------------------------
    tracker.live_price = Decimal(candles[0][4])
    
    closed_candles_only = candles[1:]
    latest_closed_timestamp = int(closed_candles_only[0][0])
    is_new_candle_closed = (latest_closed_timestamp != tracker.last_candle_timestamp)
    
    candles_asc = list(reversed(closed_candles_only))
    opens_asc = [Decimal(c[1]) for c in candles_asc]
    closes_asc = [Decimal(c[4]) for c in candles_asc]
    highs_asc = [Decimal(c[2]) for c in candles_asc]
    lows_asc = [Decimal(c[3]) for c in candles_asc]

    tracker.ema34 = calculate_ema(closes_asc, 34)
    tracker.ema89 = calculate_ema(closes_asc, 89)
    tracker.ema160 = calculate_ema(closes_asc, 160)
    tracker.ema200 = calculate_ema(closes_asc, 200)
    
    tracker.is_m5_squeeze = check_ema_squeeze(closes_asc, tracker.ema34, tracker.ema89, tracker.ema200, tracker.live_price)
    tracker.is_m15_squeeze = check_ema_squeeze(m15_closes, m15_ema34, m15_ema89, m15_ema200, tracker.live_price)
    tracker.is_m30_squeeze = check_ema_squeeze(m30_closes, m30_ema34, m30_ema89, m30_ema200, tracker.live_price)
    tracker.is_h1_squeeze = check_ema_squeeze(h1_closes, h1_ema34, h1_ema89, h1_ema200, tracker.live_price)
    tracker.is_h2_squeeze = check_ema_squeeze(h2_closes, tracker.h2_ema34, tracker.h2_ema89, tracker.h2_ema200, tracker.live_price)
    tracker.is_h4_squeeze = check_ema_squeeze(h4_closes, tracker.h4_ema34, tracker.h4_ema89, tracker.h4_ema200, tracker.live_price)

    tracker.roc_14 = ((closes_asc[-1] - closes_asc[-15]) / closes_asc[-15]) * Decimal("100") if len(closes_asc) >= 15 else Decimal("0")

    atr_current = calculate_atr(closes_asc, highs_asc, lows_asc, 14)
    atr_100 = calculate_atr(closes_asc, highs_asc, lows_asc, 100)
    elasticity = Decimal("1.0")
    if atr_100 > 0: elasticity = atr_current / atr_100
    elasticity = max(Decimal("0.6"), min(Decimal("2.0"), elasticity))
    
    base_vol_mult = Decimal(str(cfg.get("vol_mult", "1.0")))
    # Sếp yêu cầu Co giãn (elasticity) chỉ dùng để lùi entry, không dùng cho volume hay TP/SL
    tracker.current_vol_mult = base_vol_mult * elasticity  # Dùng hiển thị Co giãn lên dashboard & tính đệm lùi entry
    tf_mult_active = globals_ref.TF_MULTIPLIERS.get(getattr(tracker, "active_pos_tf", "M5"), Decimal("1.0"))
    coin_sl_pct = globals_ref.SCALPING_SL_PCT * tf_mult_active  # Khóa cứng SL theo cấu hình gốc x TF multiplier
    
    is_vol_spike = Decimal(candles[0][5]) > ((sum([Decimal(c[5]) for c in candles[1:21]]) / Decimal("20")) * Decimal("3.0")) 

    ema_max = max(tracker.ema34, tracker.ema89, tracker.ema200)
    ema_min = min(tracker.ema34, tracker.ema89, tracker.ema200)
    ema_spread_pct = ((ema_max - ema_min) / tracker.ema200) * Decimal("1000") if tracker.ema200 > 0 else Decimal("10")
    ema_dist_pct = (abs(tracker.ema89 - tracker.ema200) / tracker.ema200) * Decimal("100") if tracker.ema200 > 0 else Decimal("0")
    
    is_sideway_strict = (
        tracker.accum_candle_count < globals_ref.REQUIRED_ACCUMULATION_CANDLES or
        ema_spread_pct <= Decimal("0.1") or
        tracker.cycle_fail_count >= globals_ref.MAX_CYCLE_FAILURES or
        tracker.fan_delta < Decimal("-0.51")  
    )
    
    if ema_spread_pct <= Decimal("1.5"):
        if is_new_candle_closed:
            if tracker.ema_squeeze_candle_count == 0:
                tracker.squeeze_start_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                tracker.squeeze_max_tightness = ema_spread_pct
            else:
                tracker.squeeze_max_tightness = min(tracker.squeeze_max_tightness, ema_spread_pct)
            tracker.ema_squeeze_candle_count += 1
    else:
        if tracker.ema_squeeze_candle_count >= 15 and is_new_candle_closed:
            tracker.ema_squeeze_candle_count = 0; tracker.squeeze_start_time = None

    # LẤY TÌNH TRẠNG VỊ THẾ TỪ SÀN
    old_has_l, old_has_s = tracker.has_long, tracker.has_short
    old_avg_px_l = getattr(tracker, "active_avg_px_long", Decimal("0"))
    old_avg_px_s = getattr(tracker, "active_avg_px_short", Decimal("0"))
    old_long_vol = getattr(tracker, "long_pos_vol", Decimal("0"))
    old_short_vol = getattr(tracker, "short_pos_vol", Decimal("0"))
    
    tracker.has_long, tracker.has_short = False, False
    tracker.active_avg_px_long, tracker.active_avg_px_short = Decimal("0"), Decimal("0")
    active_long_pos, active_short_pos = [], []
    try:
        old_pos_amt_l = getattr(tracker, "last_long_pos_amt", Decimal("0"))
        old_pos_amt_s = getattr(tracker, "last_short_pos_amt", Decimal("0"))
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
            td_mode = p.get("mgnMode", "cross")
            
            norm_side = "long" if (pos_side == "long" or (pos_side == "net" and pos_amt > 0)) else "short"
            if norm_side == "long":
                if td_mode == "cross":
                    active_long_pos.append(p); tracker.has_long = True
                    avg_px = Decimal(p.get("avgPx", "0"))
                    if avg_px <= 0: avg_px = Decimal(p.get("markPx", tracker.live_price))
                    if avg_px <= 0: avg_px = getattr(tracker, "live_price", Decimal("1"))
                    cross_long_amt += abs(pos_amt)
                    cross_long_vol += abs(pos_amt) * contract_val * avg_px
            else:
                if td_mode == "cross":
                    active_short_pos.append(p); tracker.has_short = True
                    avg_px = Decimal(p.get("avgPx", "0"))
                    if avg_px <= 0: avg_px = Decimal(p.get("markPx", tracker.live_price))
                    if avg_px <= 0: avg_px = getattr(tracker, "live_price", Decimal("1"))
                    cross_short_amt += abs(pos_amt)
                    cross_short_vol += abs(pos_amt) * contract_val * avg_px

        def reconstruct_filled_tfs_from_volume(side_str: str, pos_vol_usdt: Decimal) -> list[str]:
            """
            BẮT BUỘC KHỞI ĐẦU: Quét tổng volume thực tế trên sàn, so sánh với Setting Base Volume trong JSON
            để quy đổi chính xác TẤT CẢ các khung thời gian (TF) đã được DCA trong khối volume đó.
            """
            _target_usdt = Decimal("200")
            try:
                gcfg_path = env_paths.get("FILE_GLOBAL_CONFIG") if env_paths else None
                if gcfg_path and os.path.exists(gcfg_path):
                    with open(gcfg_path, "r", encoding="utf-8") as f:
                        _gcfg = json.load(f)
                        if "POSITION_VOLUME_HIGH_CONFIDENCE" in _gcfg:
                            _target_usdt = Decimal(str(_gcfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
                elif hasattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE"):
                    _target_usdt = Decimal(str(globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE))
            except Exception:
                _target_usdt = getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", Decimal("200"))

            _coin_vol_mult = Decimal("1.0")
            for item in getattr(globals_ref, "COIN_PORTFOLIO", []):
                if item["coin"] == coin_name:
                    _coin_vol_mult = Decimal(str(item.get("vol_mult", "1.0")))
                    break

            base_vol = _target_usdt * _coin_vol_mult
            vol_mults = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {
                "M5": Decimal("1.0"), "M15": Decimal("1.2"), "M30": Decimal("1.5"),
                "H1": Decimal("2.0"), "H2": Decimal("3.0"), "H4": Decimal("5.0")
            })

            tfs_order = ["M5", "M15", "M30", "H1", "H2", "H4"]
            cum_vols = {}
            cum = Decimal("0")
            for tf in tfs_order:
                cum += base_vol * vol_mults.get(tf, Decimal("1.0"))
                cum_vols[tf] = cum

            filled_tfs = []
            for tf in tfs_order:
                if pos_vol_usdt >= cum_vols[tf] * Decimal("0.70"):
                    filled_tfs.append(tf)
                else:
                    break

            if not filled_tfs:
                filled_tfs = ["M5"]

            return filled_tfs

        if cross_long_amt > 0:
            tracker.active_avg_px_long = cross_long_vol / (cross_long_amt * contract_val)
            tracker.entry_price_long = tracker.active_avg_px_long
            tracker.long_pos_vol = cross_long_vol
            tracker.last_long_pos_amt = cross_long_amt

            # BẮT BUỘC: Đồng bộ ngay danh sách TF đã DCA từ Volume thực tế trên sàn
            detected_long_tfs = reconstruct_filled_tfs_from_volume("long", cross_long_vol)
            for _tf in detected_long_tfs:
                if _tf not in tracker.pos_cycle_filled_tfs:
                    tracker.pos_cycle_filled_tfs.append(_tf)
            tracker.pos_cycle_closed_tfs = list(tracker.pos_cycle_filled_tfs)
            tracker.active_pos_tf = detected_long_tfs[-1]

        if cross_short_amt > 0:
            tracker.active_avg_px_short = cross_short_vol / (cross_short_amt * contract_val)
            tracker.entry_price_short = tracker.active_avg_px_short
            tracker.short_pos_vol = cross_short_vol
            tracker.last_short_pos_amt = cross_short_amt

            # BẮT BUỘC: Đồng bộ ngay danh sách TF đã DCA từ Volume thực tế trên sàn
            detected_short_tfs = reconstruct_filled_tfs_from_volume("short", cross_short_vol)
            for _tf in detected_short_tfs:
                if _tf not in tracker.pos_cycle_filled_tfs:
                    tracker.pos_cycle_filled_tfs.append(_tf)
            tracker.pos_cycle_closed_tfs = list(tracker.pos_cycle_filled_tfs)
            tracker.active_pos_tf = detected_short_tfs[-1]
    except Exception as e:
        hft_logger.error(f"Lỗi lấy position {coin_name}: {e}", exc_info=True)
        tracker.has_long, tracker.has_short = old_has_l, old_has_s
        tracker.active_avg_px_long, tracker.active_avg_px_short = old_avg_px_l, old_avg_px_s
        tracker.long_pos_vol, tracker.short_pos_vol = old_long_vol, old_short_vol

    try:
        if tracker.has_long:
            if not old_has_l:
                tracker.mtf_volumes_at_entry = {"vol_5m": float(candles[0][5]), "vol_30m": float(candles_m15[0][5])}
                _is_xl = getattr(tracker, "is_xole_pos", False)
                _tf = getattr(tracker, "active_target_tf", tracker.active_pos_tf)
                if _is_xl:
                    _big = getattr(tracker, "xole_big_tf", "")
                    tracker.open_reason_long = f"Xo Le Hedge (LONG {_tf}): Cấu trúc đảo chiều sớm ngược pha {_big}"
                else:
                    tracker.open_reason_long = f"Xu hướng Tăng tại [{_tf}]: Đồng pha EMA34/89/200 xếp lớp"
                
                # MARKER
                bot_models.record_trade_marker(coin_name, "LONG", float(tracker.active_avg_px_long), "active")
                
            elif old_has_l and tracker.last_long_pos_amt > old_pos_amt_l:
                # DCA MARKER
                bot_models.record_trade_marker(coin_name, "LONG", float(tracker.active_avg_px_long), "active")
                _tf = getattr(tracker, "active_pos_tf", "M5")
                tracker.open_reason_long = f"DCA Khung Lớn Tăng tại [{_tf}]: Cập nhật trung bình giá"

        if tracker.has_short:
            if not old_has_s:
                tracker.mtf_volumes_at_entry = {"vol_5m": float(candles[0][5]), "vol_30m": float(candles_m15[0][5])}
                _is_xl = getattr(tracker, "is_xole_pos", False)
                _tf = getattr(tracker, "active_target_tf", tracker.active_pos_tf)
                if _is_xl:
                    _big = getattr(tracker, "xole_big_tf", "")
                    tracker.open_reason_short = f"Xo Le Hedge (SHORT {_tf}): Cấu trúc đảo chiều sớm ngược pha {_big}"
                else:
                    tracker.open_reason_short = f"Xu hướng Giảm tại [{_tf}]: Đồng pha EMA34/89/200 xếp lớp"
                
                # MARKER
                bot_models.record_trade_marker(coin_name, "SHORT", float(tracker.active_avg_px_short), "active")
                
            elif old_has_s and tracker.last_short_pos_amt > old_pos_amt_s:
                # DCA MARKER
                bot_models.record_trade_marker(coin_name, "SHORT", float(tracker.active_avg_px_short), "active")
                _tf = getattr(tracker, "active_pos_tf", "M5")
                tracker.open_reason_short = f"DCA Khung Lớn Giảm tại [{_tf}]: Cập nhật trung bình giá"
    except Exception:
        pass

    # ⚡ ĐỒNG BỘ ACTIVE_POS_TF CỦA ALTCOIN THEO BTC (cùng MAIN trend)
    # Nếu BTC đang có vị thế ở TF lớn (vd H4), Altcoin cùng hướng phải kế thừa TF đó
    # để TP/SL tính cùng hệ số, tránh tình trạng BTC H4-SL 14.2% mà ETH vẫn M5-SL 2.1%
    btc_sync_tf_changed = False
    if coin_name != "BTC":
        btc_tk_sync = state_matrix.get("BTC-USDT-SWAP")
        if btc_tk_sync:
            btc_pos_tf = getattr(btc_tk_sync, "active_pos_tf", "M5")
            # LONG: nếu cả BTC và Altcoin đều có long, sync TF
            if tracker.has_long and btc_tk_sync.has_long:
                if tf_weight(btc_pos_tf) > tf_weight(getattr(tracker, "active_pos_tf", "M5")):
                    old_tf = getattr(tracker, "active_pos_tf", "M5")
                    tracker.active_pos_tf = btc_pos_tf
                    btc_sync_tf_changed = True
                    btc_sync_tf_changed = True
                    print(f"🔄 [SYNC] {coin_name} LONG active_pos_tf: {old_tf} → {btc_pos_tf} (theo BTC)")
            # SHORT: nếu cả BTC và Altcoin đều có short, sync TF
            if tracker.has_short and btc_tk_sync.has_short:
                if tf_weight(btc_pos_tf) > tf_weight(getattr(tracker, "active_pos_tf", "M5")):
                    old_tf = getattr(tracker, "active_pos_tf", "M5")
                    tracker.active_pos_tf = btc_pos_tf
                    btc_sync_tf_changed = True
                    btc_sync_tf_changed = True
                    print(f"🔄 [SYNC] {coin_name} SHORT active_pos_tf: {old_tf} → {btc_pos_tf} (theo BTC)")

    # ==============================================================================
    # ⚔️ QUẢN TRỊ VỊ THẾ & PHANH BẢO VỆ LIMIT CROSS
    # ==============================================================================
    
    # ⚡ DYNAMIC HIGHEST ALIGNED TF LOGIC FOR MTF DCA
    # BUG FIX: Chỉ nâng TF lên, không được hạ xuống (ví dụ: đã H4 không được điều chỉnh về M5)
    _tf_order = ["H4", "H2", "H1", "M30", "M15", "M5"]
    if tracker.has_long:
        for tf in _tf_order:
            if tracker.mtf_states.get(tf, {}).get("side") == "above":
                # Chỉ cập nhật nếu TF mới >= TF hiện tại
                if tf_weight(tf) >= tf_weight(getattr(tracker, "active_pos_tf", "M5")):
                    tracker.active_pos_tf = tf
                break
    elif tracker.has_short:
        for tf in _tf_order:
            if tracker.mtf_states.get(tf, {}).get("side") == "under":
                # Chỉ cập nhật nếu TF mới >= TF hiện tại
                if tf_weight(tf) >= tf_weight(getattr(tracker, "active_pos_tf", "M5")):
                    tracker.active_pos_tf = tf
                break

    # ⚡ Force re-apply TP/SL ngay sau khi sync TF thay đổi
    if btc_sync_tf_changed:
        if tracker.has_long and active_long_pos:
            clean_algo_orders(client, swap_id, "cross", "long")
            apply_emergency_tpsl(client, swap_id, active_long_pos[0], state_matrix, globals_ref)
        if tracker.has_short and active_short_pos:
            clean_algo_orders(client, swap_id, "cross", "short")
            apply_emergency_tpsl(client, swap_id, active_short_pos[0], state_matrix, globals_ref)

    if tracker.has_long and tracker.has_short: tracker.last_pos_state = "had_both"
    elif tracker.has_long: tracker.last_pos_state = "had_long"
    elif tracker.has_short: tracker.last_pos_state = "had_short"

    if not tracker.has_long: 
        tracker.mae_max_pct_long, tracker.mae_history_disp_long = Decimal("0"), "---"
    if not tracker.has_short: 
        tracker.mae_max_pct_short, tracker.mae_history_disp_short = Decimal("0"), "---"



    # ==============================================================================
    # ⚔️ QUẢN TRỊ VỊ THẾ & PHANH BẢO VỆ LIMIT CROSS
    # ==============================================================================
    if tracker.has_long and active_long_pos:
        pos_l = active_long_pos[0]
        apply_emergency_tpsl(client, swap_id, pos_l, state_matrix, globals_ref)
        
        avg_px_l = tracker.active_avg_px_long
        current_roi_pct = ((tracker.live_price - avg_px_l) / avg_px_l) * Decimal("100") * Decimal(str(cfg["leverage"]))
        is_in_profit = tracker.live_price > avg_px_l
        
        if not is_in_profit:
            current_mae = ((avg_px_l - tracker.live_price) / avg_px_l) * Decimal("100")
            if current_mae > tracker.mae_max_pct_long: tracker.mae_max_pct_long = current_mae
        tracker.mae_history_disp_long = f"{tracker.mae_max_pct_long:.1f}%"

        if globals_ref.ENABLE_SIDEWAY_SAFE_EXIT and is_sideway_strict and current_roi_pct >= Decimal("20.0"):
            clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
            close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Sideway Protection LONG: ROI {current_roi_pct:.1f}%", "cross")
            tracker.closure_reason_long = "Sideway_Safe_Exit"
            tracker.record_exit("LONG", current_roi_pct, "Sideway_Safe_Exit", "Chốt lời chủ động do Sideway (Vi phạm ĐK)")
            return

        # 1.6 Squeeze Defense (Dời SL về dương khi xuất hiện nén tam giác)
        pos_tf = getattr(tracker, "active_pos_tf", "M5")
        is_squeeze = getattr(tracker, f"is_{pos_tf.lower()}_squeeze", False)
        if globals_ref.ENABLE_SQUEEZE_ESCAPE_EXIT and is_squeeze:
            if is_in_profit:
                # Dời SL về dương nhẹ (trả phí giao dịch ~ 0.1% ROE / đòn bẩy)
                # Tính giá phòng thủ: Lãi 0.1% trên vốn = avg_px * (1 + 0.001 / leverage)
                defense_sl_px = round_to_tick(avg_px_l * (Decimal("1") + (Decimal("0.001") / Decimal(str(cfg["leverage"])))), tick_sz)
                if tracker.live_price <= defense_sl_px:
                    clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                    close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Squeeze Defense LONG: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_long = "Squeeze_Defense_Exit"
                    tracker.record_exit("LONG", current_roi_pct, "Squeeze_Defense_Exit", f"Phòng thủ Nén tam giác tại {pos_tf} (SL Dương).")
                    return

        # 1.7 Dynamic Ping-Pong TP
        if globals_ref.ENABLE_DYNAMIC_PINGPONG_TP and is_squeeze:
            if is_in_profit:
                target_ema200 = getattr(tracker, f"{pos_tf.lower()}_ema200", tracker.ema200 if pos_tf == "M5" else Decimal("0"))
                if target_ema200 > 0 and tracker.live_price >= target_ema200:
                    clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                    close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Ping-Pong TP LONG: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_long = "PingPong_TP_Exit"
                    tracker.record_exit("LONG", current_roi_pct, "PingPong_TP_Exit", f"Chốt lời non (Ping-Pong) tại {pos_tf} EMA200.")
                    return

        # 1.8 Dynamic EMA200 TP (Higher TF)
        if globals_ref.ENABLE_DYNAMIC_EMA200_TP:
            higher_tf_ema200 = get_nearest_opposite_ema200(tracker, "LONG", pos_tf)
            if higher_tf_ema200 > 0 and is_in_profit:
                if tracker.live_price >= higher_tf_ema200:
                    clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                    close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Dynamic EMA200 TP LONG: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_long = "Dynamic_EMA200_TP_Exit"
                    tracker.record_exit("LONG", current_roi_pct, "Dynamic_EMA200_TP_Exit", f"Chốt lời động chạm cản EMA200 TF lớn hơn.")
                    return

        # 1.5. Safeguard Entry Recover Close (Âm >70% SL, hồi về Entry thoát hòa)
        sl_pct_cap = coin_sl_pct * Decimal("100")
        if globals_ref.ENABLE_SAFEGUARD_ENTRY_EXIT and tracker.mae_max_pct_long >= (sl_pct_cap * Decimal("0.70")) and tracker.live_price >= avg_px_l:
            clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
            close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Safeguard Entry Close LONG: MAE reached {tracker.mae_max_pct_long:.2f}%", "cross")
            tracker.closure_reason_long = "Safeguard_Entry_Exit"
            tracker.record_exit("LONG", current_roi_pct, "Safeguard_Entry_Exit", f"Lỗ sâu ({tracker.mae_max_pct_long:.2f}%) hồi về Entry thoát hòa.")
            return

        dynamic_sl_roi_threshold = coin_sl_pct * Decimal("100") * Decimal(str(cfg["leverage"]))
        if not hasattr(tracker, 'max_roi_long') or getattr(tracker, 'last_entry_l', None) != avg_px_l:
            tracker.max_roi_long = Decimal("0"); tracker.last_entry_l = avg_px_l
            
        if current_roi_pct > tracker.max_roi_long: 
            tracker.max_roi_long = current_roi_pct

        if globals_ref.ENABLE_TRAILING_SL:
            # --- UPGRADE TF LOGIC CỤC BỘ ---
            filled_tfs_l = getattr(tracker, "pos_cycle_filled_tfs", [])
            if filled_tfs_l:
                max_filled_tf = max(filled_tfs_l, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
            else:
                max_filled_tf = getattr(tracker, "active_pos_tf", "M5")
                
            try:
                tf_weights = {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}
                next_tf_map = {"M5": "M15", "M15": "M30", "M30": "H1", "H1": "H2", "H2": "H4", "H4": "H4"}
                current_weight = tf_weights.get(max_filled_tf, 0)
                upgrade_tf = max_filled_tf
                
                temp_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
                base_sl_pct = globals_ref.SCALPING_SL_PCT * temp_tf_mult
                base_sl = avg_px_l * (Decimal("1") - base_sl_pct)
                placed_dict = getattr(tracker, "placed_entry_px_long_by_tf", {})
                
                for tf, px_str in placed_dict.items():
                    if tf not in filled_tfs_l and px_str not in ("---", "ERR"):
                        w = tf_weights.get(tf, 0)
                        if w > current_weight:
                            pending_px = Decimal(px_str)
                            dist = abs(base_sl - pending_px) / pending_px
                            if dist <= Decimal("0.006"):
                                upgrade_tf = next_tf_map.get(max_filled_tf, max_filled_tf)
                                break
                                    
                if upgrade_tf != max_filled_tf:
                    max_filled_tf = upgrade_tf
            except Exception:
                pass
                
            active_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
            active_coin_sl_pct = globals_ref.SCALPING_SL_PCT * active_tf_mult
            # -------------------------------

            if tracker.max_roi_long >= dynamic_sl_roi_threshold:
                locked_roi_profit = tracker.max_roi_long - dynamic_sl_roi_threshold
                price_buffer_back = (locked_roi_profit / Decimal("100")) / Decimal(str(cfg["leverage"]))
                tracker.active_sl_px_long = round_to_tick(avg_px_l * (Decimal("1") + price_buffer_back), tick_sz)
            else:
                tracker.active_sl_px_long = round_to_tick(avg_px_l * (Decimal("1") - active_coin_sl_pct), tick_sz)

            if tracker.live_price <= tracker.active_sl_px_long:
                clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Trailing SL Hit LONG", "cross")
                tracker.closure_reason_long = "Dynamic_Floor_Safe_Close_Long"
                tracker.record_exit("LONG", current_roi_pct, "Dynamic_Floor_Safe_Close_Long", "Chạm Trailing SL bảo vệ")
                return
        else:
            tracker.active_sl_px_long = round_to_tick(avg_px_l * (Decimal("1") - coin_sl_pct), tick_sz)

        # ⚡ PARTIAL LOCK SL: Chia TP 3 phần — kéo SL tự động theo tiến độ giá
        if getattr(globals_ref, "ENABLE_PARTIAL_LOCK_SL", False):
            tp_long = getattr(tracker, "active_tp_px_long", Decimal("0"))
            check_partial_lock_sl(
                client, swap_id, "long", avg_px_l, tp_long, tracker.live_price,
                tracker, tick_sz, dec_places, pos_l["pos"], "cross"
            )

        if globals_ref.ENABLE_MAX_ROI_EXIT and is_in_profit:
            if current_roi_pct >= Decimal("120.0"):
                clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Max ROI Hit LONG", "cross")
                tracker.closure_reason_long = "Divergence_Exit_Long"
                tracker.record_exit("LONG", current_roi_pct, "Divergence_Exit_Long", "Cắn mốc Lợi nhuận Vàng tối đa")
                return

        pos_tf = getattr(tracker, "active_pos_tf", "M5")
        if globals_ref.ENABLE_SIDEWAY_VAP_EXIT and tracker.mtf_states.get(pos_tf, tracker.mtf_states["M5"])["fail"] >= 2 and current_roi_pct >= Decimal("0.0"):
            clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
            close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], f"Sideway Vap Exit LONG: ROI {current_roi_pct:.1f}%", "cross")
            tracker.closure_reason_long = "Sideway_Vap_Exit"
            tracker.record_exit("LONG", current_roi_pct, "Sideway_Vap_Exit", f"Cắt hòa/dương khi Vấp 2/2 trong khung {pos_tf}")
            return

    if not tracker.has_long and tracker.last_pos_state in ["had_long", "had_both"]:
        bot_models.record_trade_marker(coin_name, "LONG", 0, "closed")
        
        closure_reason_l = getattr(tracker, "closure_reason_long", "")
        if not closure_reason_l:
            exit_roi = Decimal("0")
            pnl_usd = Decimal("0")
            okx_fetched = False
            try:
                pos_hist = client.request("GET", "/api/v5/account/positions-history", 
                                          params={"instType": "SWAP", "instId": swap_id, "limit": "1"}).get("data", [])
                if pos_hist:
                    last_p = pos_hist[0]
                    pnl_usd = Decimal(str(last_p.get("pnl", "0")))
                    pnl_ratio = Decimal(str(last_p.get("pnlRatio", "0"))) * Decimal("100")
                    if pnl_ratio != 0 or pnl_usd != 0:
                        exit_roi = pnl_ratio
                        okx_fetched = True
            except Exception:
                pass

            if not okx_fetched:
                exit_roi = ((tracker.live_price - tracker.entry_price_long) / tracker.entry_price_long) * Decimal("100") * Decimal(str(cfg["leverage"]))
                try:
                    _base = Decimal(str(getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", 500)))
                    _risk = getattr(globals_ref, "RISK_PER_TRADE_PCT", Decimal("0"))
                    if _risk > 0:
                        _base = (Decimal(str(getattr(globals_ref, "von_hien_tai", 10000))) * _risk) / Decimal("0.015")
                    _total = sum([_base * getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(t, Decimal("1.0")) for t in getattr(tracker, "pos_cycle_filled_tfs", [])])
                    if _total == 0: _total = _base
                    pnl_usd = _total * (exit_roi / Decimal("100")) / Decimal(str(cfg["leverage"]))
                except Exception:
                    pnl_usd = Decimal("0")
                
            pnl_label = "Lãi" if pnl_usd >= 0 else "Lỗ"
            pnl_str = f"{pnl_label} {abs(float(pnl_usd)):.2f}$"
            if pnl_usd >= 0:
                tracker.record_exit("LONG", exit_roi, "Exchange_TP_Hit", pnl_str)
                is_sl_hit = False
            else:
                tracker.record_exit("LONG", exit_roi, "Exchange_SL_Hit", pnl_str)
                is_sl_hit = True
        else:
            is_sl_hit = (closure_reason_l and ("SL" in closure_reason_l or "Cắt" in closure_reason_l))
            if closure_reason_l == "Divergence_Exit_Long": is_sl_hit = False
        save_data_point_to_json(cfg["coin"], not is_sl_hit, float(tracker.mae_max_pct_long), float(getattr(tracker, 'max_roi_long', Decimal("0"))), int(tracker.accum_candle_count), int(tracker.back_count), int(tracker.pullback_count_long), float(tracker.entry_price_long), float(tracker.live_price), "long", float(ema_dist_pct), getattr(tracker, 'mtf_volumes_at_entry', {}), env_paths, state_matrix, globals_ref)
        tracker.closure_reason_long = ""
        tracker.last_pos_state = "none"
        tracker.partial_lock_stage_long = 0  # Reset partial lock stage cho chu kỳ tiếp theo

    if tracker.has_short and active_short_pos:
        pos_s = active_short_pos[0]
        apply_emergency_tpsl(client, swap_id, pos_s, state_matrix, globals_ref)
        
        avg_px_s = tracker.active_avg_px_short
        current_roi_pct = ((avg_px_s - tracker.live_price) / avg_px_s) * Decimal("100") * Decimal(str(cfg["leverage"]))
        is_in_profit = tracker.live_price < avg_px_s
        
        if not is_in_profit:
            current_mae = ((tracker.live_price - avg_px_s) / avg_px_s) * Decimal("100")
            if current_mae > tracker.mae_max_pct_short: tracker.mae_max_pct_short = current_mae
        tracker.mae_history_disp_short = f"{tracker.mae_max_pct_short:.1f}%"

        if globals_ref.ENABLE_SIDEWAY_SAFE_EXIT and is_sideway_strict and current_roi_pct >= Decimal("20.0"):
            clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
            close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Sideway Protection SHORT: ROI {current_roi_pct:.1f}%", "cross")
            tracker.closure_reason_short = "Sideway_Safe_Exit"
            tracker.record_exit("SHORT", current_roi_pct, "Sideway_Safe_Exit", "Chốt lời chủ động do Sideway (Vi phạm ĐK)")
            return

        # 1.6 Squeeze Defense (Dời SL về dương khi xuất hiện nén tam giác)
        pos_tf = getattr(tracker, "active_pos_tf", "M5")
        is_squeeze = getattr(tracker, f"is_{pos_tf.lower()}_squeeze", False)
        if globals_ref.ENABLE_SQUEEZE_ESCAPE_EXIT and is_squeeze:
            if is_in_profit:
                # Dời SL về dương nhẹ (trả phí giao dịch ~ 0.1% ROE / đòn bẩy)
                defense_sl_px = round_to_tick(avg_px_s * (Decimal("1") - (Decimal("0.001") / Decimal(str(cfg["leverage"])))), tick_sz)
                if tracker.live_price >= defense_sl_px:
                    clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                    close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Squeeze Defense SHORT: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_short = "Squeeze_Defense_Exit"
                    tracker.record_exit("SHORT", current_roi_pct, "Squeeze_Defense_Exit", f"Phòng thủ Nén tam giác tại {pos_tf} (SL Dương).")
                    return

        # 1.7 Dynamic Ping-Pong TP
        if globals_ref.ENABLE_DYNAMIC_PINGPONG_TP and is_squeeze:
            if is_in_profit:
                target_ema200 = getattr(tracker, f"{pos_tf.lower()}_ema200", tracker.ema200 if pos_tf == "M5" else Decimal("0"))
                if target_ema200 > 0 and tracker.live_price <= target_ema200:
                    clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                    close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Ping-Pong TP SHORT: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_short = "PingPong_TP_Exit"
                    tracker.record_exit("SHORT", current_roi_pct, "PingPong_TP_Exit", f"Chốt lời non (Ping-Pong) tại {pos_tf} EMA200.")
                    return

        # 1.8 Dynamic EMA200 TP (Higher TF)
        if globals_ref.ENABLE_DYNAMIC_EMA200_TP:
            higher_tf_ema200 = get_nearest_opposite_ema200(tracker, "SHORT", pos_tf)
            if higher_tf_ema200 > 0 and is_in_profit:
                if tracker.live_price <= higher_tf_ema200:
                    clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                    close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Dynamic EMA200 TP SHORT: ROI {current_roi_pct:.1f}%", "cross")
                    tracker.closure_reason_short = "Dynamic_EMA200_TP_Exit"
                    tracker.record_exit("SHORT", current_roi_pct, "Dynamic_EMA200_TP_Exit", f"Chốt lời động chạm cản EMA200 TF lớn hơn.")
                    return

        # 1.5. Safeguard Entry Recover Close (Âm >70% SL, hồi về Entry thoát hòa)
        sl_pct_cap = coin_sl_pct * Decimal("100")
        if globals_ref.ENABLE_SAFEGUARD_ENTRY_EXIT and tracker.mae_max_pct_short >= (sl_pct_cap * Decimal("0.70")) and tracker.live_price <= avg_px_s:
            clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
            close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Safeguard Entry Close SHORT: MAE reached {tracker.mae_max_pct_short:.2f}%", "cross")
            tracker.closure_reason_short = "Safeguard_Entry_Exit"
            tracker.record_exit("SHORT", current_roi_pct, "Safeguard_Entry_Exit", f"Lỗ sâu ({tracker.mae_max_pct_short:.2f}%) hồi về Entry thoát hòa.")
            return

        dynamic_sl_roi_threshold = coin_sl_pct * Decimal("100") * Decimal(str(cfg["leverage"]))
        
        if not hasattr(tracker, 'max_roi_short') or getattr(tracker, 'last_entry_s', None) != avg_px_s:
            tracker.max_roi_short = Decimal("0"); tracker.last_entry_s = avg_px_s
            
        if current_roi_pct > tracker.max_roi_short: 
            tracker.max_roi_short = current_roi_pct

        if globals_ref.ENABLE_TRAILING_SL:
            # --- UPGRADE TF LOGIC CỤC BỘ ---
            filled_tfs_s = getattr(tracker, "pos_cycle_filled_tfs", [])
            if filled_tfs_s:
                max_filled_tf = max(filled_tfs_s, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t,0))
            else:
                max_filled_tf = getattr(tracker, "active_pos_tf", "M5")
                
            try:
                tf_weights = {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}
                next_tf_map = {"M5": "M15", "M15": "M30", "M30": "H1", "H1": "H2", "H2": "H4", "H4": "H4"}
                current_weight = tf_weights.get(max_filled_tf, 0)
                upgrade_tf = max_filled_tf
                
                temp_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
                base_sl_pct = globals_ref.SCALPING_SL_PCT * temp_tf_mult
                base_sl = avg_px_s * (Decimal("1") + base_sl_pct)
                placed_dict = getattr(tracker, "placed_entry_px_short_by_tf", {})
                
                for tf, px_str in placed_dict.items():
                    if tf not in filled_tfs_s and px_str not in ("---", "ERR"):
                        w = tf_weights.get(tf, 0)
                        if w > current_weight:
                            pending_px = Decimal(px_str)
                            dist = abs(base_sl - pending_px) / pending_px
                            if dist <= Decimal("0.006"):
                                upgrade_tf = next_tf_map.get(max_filled_tf, max_filled_tf)
                                break
                                    
                if upgrade_tf != max_filled_tf:
                    max_filled_tf = upgrade_tf
            except Exception:
                pass
                
            active_tf_mult = globals_ref.TF_MULTIPLIERS.get(max_filled_tf, Decimal("1.0"))
            active_coin_sl_pct = globals_ref.SCALPING_SL_PCT * active_tf_mult
            # -------------------------------

            if tracker.max_roi_short >= dynamic_sl_roi_threshold:
                locked_roi_profit = tracker.max_roi_short - dynamic_sl_roi_threshold
                roi_fraction = (locked_roi_profit / Decimal("100")) / Decimal(str(cfg["leverage"]))
                tracker.active_sl_px_short = round_to_tick(avg_px_s * (Decimal("1") - roi_fraction), tick_sz)
            else:
                tracker.active_sl_px_short = round_to_tick(avg_px_s * (Decimal("1") + active_coin_sl_pct), tick_sz)

            if tracker.live_price >= tracker.active_sl_px_short:
                clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Trailing SL Hit SHORT", "cross")
                tracker.closure_reason_short = "Dynamic_Floor_Safe_Close_Short"
                tracker.record_exit("SHORT", current_roi_pct, "Dynamic_Floor_Safe_Close_Short", "Chạm Trailing SL bảo vệ")
                return
        else:
            tracker.active_sl_px_short = round_to_tick(avg_px_s * (Decimal("1") + coin_sl_pct), tick_sz)

        # ⚡ PARTIAL LOCK SL: Chia TP 3 phần — kéo SL tự động theo tiến độ giá
        if getattr(globals_ref, "ENABLE_PARTIAL_LOCK_SL", False):
            tp_short = getattr(tracker, "active_tp_px_short", Decimal("0"))
            check_partial_lock_sl(
                client, swap_id, "short", avg_px_s, tp_short, tracker.live_price,
                tracker, tick_sz, dec_places, pos_s["pos"], "cross"
            )

        if globals_ref.ENABLE_MAX_ROI_EXIT and is_in_profit:
            if current_roi_pct >= Decimal("120.0"):
                clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Max ROI Hit SHORT", "cross")
                tracker.closure_reason_short = "Divergence_Exit_Short"
                tracker.record_exit("SHORT", current_roi_pct, "Divergence_Exit_Short", "Cắn mốc Lợi nhuận Vàng tối đa")
                return

        pos_tf = getattr(tracker, "active_pos_tf", "M5")
        if globals_ref.ENABLE_SIDEWAY_VAP_EXIT and tracker.mtf_states.get(pos_tf, tracker.mtf_states["M5"])["fail"] >= 2 and current_roi_pct >= Decimal("0.0"):
            clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
            close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], f"Sideway Vap Exit SHORT: ROI {current_roi_pct:.1f}%", "cross")
            tracker.closure_reason_short = "Sideway_Vap_Exit"
            tracker.record_exit("SHORT", current_roi_pct, "Sideway_Vap_Exit", f"Cắt hòa/dương khi Vấp 2/2 trong khung {pos_tf}")
            return

    if not tracker.has_short and tracker.last_pos_state in ["had_short", "had_both"]:
        bot_models.record_trade_marker(coin_name, "SHORT", 0, "closed")
        
        closure_reason_s = getattr(tracker, "closure_reason_short", "")
        if not closure_reason_s:
            exit_roi = Decimal("0")
            pnl_usd = Decimal("0")
            okx_fetched = False
            try:
                pos_hist = client.request("GET", "/api/v5/account/positions-history", 
                                          params={"instType": "SWAP", "instId": swap_id, "limit": "1"}).get("data", [])
                if pos_hist:
                    last_p = pos_hist[0]
                    pnl_usd = Decimal(str(last_p.get("pnl", "0")))
                    pnl_ratio = Decimal(str(last_p.get("pnlRatio", "0"))) * Decimal("100")
                    if pnl_ratio != 0 or pnl_usd != 0:
                        exit_roi = pnl_ratio
                        okx_fetched = True
            except Exception:
                pass

            if not okx_fetched:
                exit_roi = ((tracker.entry_price_short - tracker.live_price) / tracker.entry_price_short) * Decimal("100") * Decimal(str(cfg["leverage"]))
                try:
                    _base = Decimal(str(getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", 500)))
                    _risk = getattr(globals_ref, "RISK_PER_TRADE_PCT", Decimal("0"))
                    if _risk > 0:
                        _base = (Decimal(str(getattr(globals_ref, "von_hien_tai", 10000))) * _risk) / Decimal("0.015")
                    _total = sum([_base * getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(t, Decimal("1.0")) for t in getattr(tracker, "pos_cycle_filled_tfs", [])])
                    if _total == 0: _total = _base
                    pnl_usd = _total * (exit_roi / Decimal("100")) / Decimal(str(cfg["leverage"]))
                except Exception:
                    pnl_usd = Decimal("0")
                
            pnl_label = "Lãi" if pnl_usd >= 0 else "Lỗ"
            pnl_str = f"{pnl_label} {abs(float(pnl_usd)):.2f}$"
            if pnl_usd >= 0:
                tracker.record_exit("SHORT", exit_roi, "Exchange_TP_Hit", pnl_str)
                is_sl_hit = False
            else:
                tracker.record_exit("SHORT", exit_roi, "Exchange_SL_Hit", pnl_str)
                is_sl_hit = True
        else:
            is_sl_hit = (closure_reason_s and ("SL" in closure_reason_s or "Cắt" in closure_reason_s))
            if closure_reason_s == "Divergence_Exit_Short": is_sl_hit = False
        save_data_point_to_json(cfg["coin"], not is_sl_hit, float(tracker.mae_max_pct_short), float(getattr(tracker, 'max_roi_short', Decimal("0"))), int(tracker.accum_candle_count), int(tracker.back_count), int(tracker.pullback_count_short), float(tracker.entry_price_short), float(tracker.live_price), "short", float(ema_dist_pct), getattr(tracker, 'mtf_volumes_at_entry', {}), env_paths, state_matrix, globals_ref)
        tracker.closure_reason_short = ""
        tracker.last_pos_state = "none"
        tracker.partial_lock_stage_short = 0  # Reset partial lock stage cho chu kỳ tiếp theo

    if not tracker.has_long and tracker.accum_candle_count >= 100 and tracker.trend == "UPTREND":
        if tracker.last_pos_state in ["had_long", "had_both"]: tracker.last_pos_state = "none"
    if not tracker.has_short and tracker.accum_candle_count >= 100 and tracker.trend == "DOWNTREND":
        if tracker.last_pos_state in ["had_short", "had_both"]: tracker.last_pos_state = "none"

    # ==============================================================================
    # ⚙️ ĐỒNG BỘ NẾN ĐÓNG & CẬP NHẬT CHU KỲ VĨ MÔ
    # ==============================================================================
    # M5
    update_tf_state(opens_asc, closes_asc, tracker.ema200, tracker.mtf_states["M5"], is_new_candle_closed, latest_closed_timestamp, 300000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)  # pyright: ignore
    tracker.last_candle_timestamp = latest_closed_timestamp
    
    # M15
    m15_asc = list(reversed(closed_m15))
    m15_opens_asc = [Decimal(c[1]) for c in m15_asc]
    m15_closes_asc = [Decimal(c[4]) for c in m15_asc]
    m15_latest_closed_ts = int(m15_asc[-1][0])
    is_m15_closed = (m15_latest_closed_ts != tracker.mtf_states["M15"]["ts"])
    update_tf_state(m15_opens_asc, m15_closes_asc, tracker.m15_ema200, tracker.mtf_states["M15"], is_m15_closed, m15_latest_closed_ts, 900000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)

    # M30
    m30_asc = list(reversed(closed_m30))
    m30_opens_asc = [Decimal(c[1]) for c in m30_asc]
    m30_closes_asc = [Decimal(c[4]) for c in m30_asc]
    m30_latest_closed_ts = int(m30_asc[-1][0])
    is_m30_closed = (m30_latest_closed_ts != tracker.mtf_states["M30"]["ts"])
    update_tf_state(m30_opens_asc, m30_closes_asc, tracker.m30_ema200, tracker.mtf_states["M30"], is_m30_closed, m30_latest_closed_ts, 1800000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)

    # H1
    h1_asc = list(reversed(closed_h1))
    h1_opens_asc = [Decimal(c[1]) for c in h1_asc]
    h1_closes_asc = [Decimal(c[4]) for c in h1_asc]
    h1_latest_closed_ts = int(h1_asc[-1][0])
    is_h1_closed = (h1_latest_closed_ts != tracker.mtf_states["H1"]["ts"])
    update_tf_state(h1_opens_asc, h1_closes_asc, tracker.h1_ema200, tracker.mtf_states["H1"], is_h1_closed, h1_latest_closed_ts, 3600000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)

    # H2
    h2_asc = list(reversed(closed_h2))  # type: ignore
    h2_opens_asc = [Decimal(c[1]) for c in h2_asc]
    h2_closes_asc = [Decimal(c[4]) for c in h2_asc]
    h2_latest_closed_ts = int(h2_asc[-1][0])
    is_h2_closed = (h2_latest_closed_ts != tracker.mtf_states.get("H2", {"ts": 0}).get("ts", 0))
    update_tf_state(h2_opens_asc, h2_closes_asc, tracker.h2_ema200, tracker.mtf_states.setdefault("H2", {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False}), is_h2_closed, h2_latest_closed_ts, 7200000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)

    # H4
    h4_asc = list(reversed(closed_h4))  # type: ignore
    h4_opens_asc = [Decimal(c[1]) for c in h4_asc]
    h4_closes_asc = [Decimal(c[4]) for c in h4_asc]
    h4_latest_closed_ts = int(h4_asc[-1][0])
    is_h4_closed = (h4_latest_closed_ts != tracker.mtf_states.get("H4", {"ts": 0}).get("ts", 0))
    update_tf_state(h4_opens_asc, h4_closes_asc, tracker.h4_ema200, tracker.mtf_states.setdefault("H4", {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False}), is_h4_closed, h4_latest_closed_ts, 14400000, globals_ref.REQUIRED_ACCUMULATION_CANDLES, globals_ref.QUANTUM_BUFFER_CANDLES, globals_ref.QUANTUM_FORTH_CANDLES)

    # 💾 LƯU TRẠNG THÁI NẾN VÀ CẤU TRÚC VỊ THẾ VÀO FILE JSON ĐỂ TRÁNH RESET KHI TẮT APP
    mtf_file = env_paths.get("FILE_MTF_STATES")
    if mtf_file:
        try:
            import json
            saved_data = {}
            if os.path.exists(mtf_file):
                with open(mtf_file, "r", encoding="utf-8") as f:
                    saved_data = json.load(f)
            
            # Gộp mtf_states và các thuộc tính vị thế mở rộng
            saved_data[swap_id] = {
                "mtf_states": tracker.mtf_states,
                "max_roi_long": str(tracker.max_roi_long),
                "max_roi_short": str(tracker.max_roi_short),
                "mae_max_pct_long": str(tracker.mae_max_pct_long),
                "mae_max_pct_short": str(tracker.mae_max_pct_short),
                "last_entry_l": str(getattr(tracker, "last_entry_l", "0")),
                "last_entry_s": str(getattr(tracker, "last_entry_s", "0")),
                "open_reason_long": getattr(tracker, "open_reason_long", ""),
                "open_reason_short": getattr(tracker, "open_reason_short", ""),
                "last_closed_side": tracker.last_closed_side,
                "last_closed_roi": str(tracker.last_closed_roi),
                "last_closed_reason": tracker.last_closed_reason,
                "pos_cycle_filled_tfs": list(getattr(tracker, "pos_cycle_filled_tfs", [])),
                "active_pos_tf": getattr(tracker, "active_pos_tf", "M5")
            }
            
            temp_mtf_file = mtf_file + ".tmp"
            with open(temp_mtf_file, "w", encoding="utf-8") as f:
                json.dump(saved_data, f, indent=2)
            os.replace(temp_mtf_file, mtf_file)
        except:
            pass

    # ==============================================================================
    # ⛔️ PHÁT HIỆN TÍN HIỆU ĐA CHIỀU (ADJACENT-PAIR CONFLUENCE)
    # Quy tắc: TF nhỏ được vào lệnh nếu nó đồng pha với TF lớn liền kề phía trên:
    #   M5  thuận pha M15  → tín hiệu tại M5
    #   M15 thuận pha M30  → tín hiệu tại M15
    #   M30 thuận pha H1   → tín hiệu tại M30
    # ==============================================================================
    def _is_tf_valid(tf):
        st = tracker.mtf_states[tf]
        # Trend còn hiệu lực khi: đủ nến tích lũy + side rõ ràng + không bị lock
        # ⚡ KHÔNG dùng fail count ở đây — EMA34/89 vs EMA200 là tiêu chí cuối cùng
        return (not st["locked"] and not st.get("streak_locked", False) and
                st["accum"] >= globals_ref.REQUIRED_ACCUMULATION_CANDLES and
                st["side"] in ("above", "under"))

    def _ema_confirms(tf, direction):
        # Điều kiện duy nhất xác nhận trend: EMA34 VÀ EMA89 đều nằm cùng phía với EMA200
        # UPTREND: ema34 > ema200 AND ema89 > ema200 (cả hai trên ema200)
        # DOWNTREND: ema34 < ema200 AND ema89 < ema200 (cả hai dưới ema200)
        if direction == "UPTREND":
            if tf == "M5":  return tracker.ema34 > tracker.ema200 and tracker.ema89 > tracker.ema200
            if tf == "M15": return tracker.m15_ema34 > tracker.m15_ema200 and tracker.m15_ema89 > tracker.m15_ema200
            if tf == "M30": return tracker.m30_ema34 > tracker.m30_ema200 and tracker.m30_ema89 > tracker.m30_ema200
            if tf == "H1":  return tracker.h1_ema34 > tracker.h1_ema200 and tracker.h1_ema89 > tracker.h1_ema200
            if tf == "H2":  return getattr(tracker, "h2_ema34", Decimal("0")) > getattr(tracker, "h2_ema200", Decimal("0")) and getattr(tracker, "h2_ema89", Decimal("0")) > getattr(tracker, "h2_ema200", Decimal("0"))
            if tf == "H4":  return getattr(tracker, "h4_ema34", Decimal("0")) > getattr(tracker, "h4_ema200", Decimal("0")) and getattr(tracker, "h4_ema89", Decimal("0")) > getattr(tracker, "h4_ema200", Decimal("0"))
        else:
            if tf == "M5":  return tracker.ema34 < tracker.ema200 and tracker.ema89 < tracker.ema200
            if tf == "M15": return tracker.m15_ema34 < tracker.m15_ema200 and tracker.m15_ema89 < tracker.m15_ema200
            if tf == "M30": return tracker.m30_ema34 < tracker.m30_ema200 and tracker.m30_ema89 < tracker.m30_ema200
            if tf == "H1":  return tracker.h1_ema34 < tracker.h1_ema200 and tracker.h1_ema89 < tracker.h1_ema200
            if tf == "H2":  return getattr(tracker, "h2_ema34", Decimal("99999")) < getattr(tracker, "h2_ema200", Decimal("0")) and getattr(tracker, "h2_ema89", Decimal("99999")) < getattr(tracker, "h2_ema200", Decimal("0"))
            if tf == "H4":  return getattr(tracker, "h4_ema34", Decimal("99999")) < getattr(tracker, "h4_ema200", Decimal("0")) and getattr(tracker, "h4_ema89", Decimal("99999")) < getattr(tracker, "h4_ema200", Decimal("0"))
        return False


    # get_ema200_for_tf đã được định nghĩa ở trên (dòng 796), dùng chung

    def get_aligned_tfs(trigger_tf, direction):
        if not trigger_tf:
            return []
        

        TFS = ["M5", "M15", "M30", "H1", "H2", "H4"]
        if trigger_tf not in TFS:
            return [trigger_tf]
        idx = TFS.index(trigger_tf)
        target_side = "above" if direction == "UPTREND" else "under"
        # ⚡ ALTCOIN SYNC: Khi neo theo BTC, dùng aligned TFs của BTC thay vì tự tính từ EMA Altcoin
        if _is_alt_synced:
            _btc_tk_sync = state_matrix.get("BTC-USDT-SWAP")
            if _btc_tk_sync:
                # Lấy aligned TFs của BTC từ placed_entry dictionaries
                _btc_placed = getattr(_btc_tk_sync, "placed_entry_px_short_by_tf", {}) if direction == "DOWNTREND" else getattr(_btc_tk_sync, "placed_entry_px_long_by_tf", {})
                _btc_aligned = [tf for tf, px in _btc_placed.items() if px not in ("---", "ERR")]
                
                # Bổ sung các TF đã khớp của BTC
                if direction == "UPTREND" and getattr(_btc_tk_sync, "has_long", False):
                    _btc_aligned.extend(getattr(_btc_tk_sync, "pos_cycle_filled_tfs", []))
                elif direction == "DOWNTREND" and getattr(_btc_tk_sync, "has_short", False):
                    _btc_aligned.extend(getattr(_btc_tk_sync, "pos_cycle_filled_tfs", []))
                
                if _btc_aligned:
                    # Tìm TF cao nhất mà BTC đã chạm tới hoặc đang chờ
                    _btc_max_tf = max(_btc_aligned, key=tf_weight)
                    _btc_max_idx = TFS.index(_btc_max_tf)
                    
                    # Mở cửa cho ETH rải Limit toàn bộ từ trigger_tf cho đến TF cao nhất của BTC
                    if idx <= _btc_max_idx:
                        raw_aligned = TFS[idx:_btc_max_idx + 1]
                        aligned = []
                        for tf in raw_aligned:
                            if tf in tracker.mtf_states:
                                st = tracker.mtf_states[tf]
                                is_sqz = getattr(tracker, f"is_{tf.lower()}_squeeze", False)
                                is_valid = (st["fail"] < globals_ref.MAX_CYCLE_FAILURES and
                                            not st["locked"] and not st.get("streak_locked", False) and
                                            st["accum"] >= globals_ref.REQUIRED_ACCUMULATION_CANDLES and
                                            st["side"] == target_side and
                                            not is_sqz)
                                if is_valid:
                                    aligned.append(tf)
                    else:
                        aligned = []
                else:
                    aligned = []
            else:
                aligned = []
        else:
            aligned = []
            for tf in TFS[idx:]:
                if tf in tracker.mtf_states:
                    st = tracker.mtf_states[tf]
                    is_sqz = getattr(tracker, f"is_{tf.lower()}_squeeze", False)
                    is_valid = (st["fail"] < globals_ref.MAX_CYCLE_FAILURES and
                                not st["locked"] and not st.get("streak_locked", False) and
                                st["accum"] >= globals_ref.REQUIRED_ACCUMULATION_CANDLES and
                                st["side"] == target_side and
                                not is_sqz)

                    if is_valid:
                        aligned.append(tf)

        # Lọc các khung thời gian quá sát nhau (closeness filter)
        # Nếu khoảng cách giữa EMA200 của TF hiện tại và TF+1 < 0.5% * TF_MULTIPLIER, bỏ qua TF hiện tại và dịch lên TF+1
        filtered = []
        for i, tf in enumerate(aligned):
            if i + 1 < len(aligned):
                next_tf = aligned[i + 1]
                ema_curr = get_ema200_for_tf(tf)
                ema_next = get_ema200_for_tf(next_tf)
                if ema_curr > 0 and ema_next > 0:
                    dist = abs(ema_next - ema_curr) / ema_curr
                    # Ưu tiên TF lớn hơn: Ngưỡng khoảng cách sẽ được tính dựa trên hệ số của TF lớn hơn (next_tf)
                    active_tf_mult = globals_ref.TF_MULTIPLIERS.get(next_tf, Decimal("1.0"))
                    gap_threshold = getattr(globals_ref, "DCA_GAP_THRESHOLD_PCT", Decimal("0.0050"))
                    threshold = gap_threshold * active_tf_mult

                    if dist < threshold:
                        # Quá sát nhau -> bỏ qua TF hiện tại để chuyển lên entry của TF tiếp theo
                        continue
            filtered.append(tf)
        return filtered

    # Main Trend Signal — ưu tiên TF lớn nhất (H4→M5), không cần cặp liền kề
    # Chỉ cần TF có accum ≥ 60, fail < 2, side rõ ràng, EMA xếp lớp đúng chiều
    signal_long_tf = None
    signal_short_tf = None
    for tf in ["H4", "H2", "H1", "M30", "M15", "M5"]:
        if not _is_tf_valid(tf): continue
        st = tracker.mtf_states[tf]
        direction = "UPTREND" if st["side"] == "above" else "DOWNTREND"
        if direction == "UPTREND" and signal_long_tf is None:
            signal_long_tf = tf
        elif direction == "DOWNTREND" and signal_short_tf is None:
            signal_short_tf = tf

    tracker.signal_long_tf  = signal_long_tf
    tracker.signal_short_tf = signal_short_tf

    # Xác định trend và best_tf (TF lớn nhất có tín hiệu làm chủ)
    if signal_long_tf and signal_short_tf:
        tracker.trend = "HEDGE"
        best_tf = signal_short_tf if tf_weight(signal_short_tf) > tf_weight(signal_long_tf) else signal_long_tf
    elif signal_long_tf:
        tracker.trend = "UPTREND"
        best_tf = signal_long_tf
    elif signal_short_tf:
        tracker.trend = "DOWNTREND"
        best_tf = signal_short_tf
    else:
        tracker.trend = "SIDEWAY"
        best_tf = "M5"

    # Ép Altcoin chạy theo Trục neo H4 của BTC (chỉ áp dụng cho Altcoin thực sự, không áp dụng forex như XAU)
    if coin_name != "BTC" and _is_alt_synced:
        btc_tk = state_matrix.get("BTC-USDT-SWAP")
        if btc_tk and "H4" in btc_tk.mtf_states:
            btc_h4_side = btc_tk.mtf_states["H4"]["side"]
            
            if btc_h4_side == "above":
                tracker.trend = "UPTREND"
            elif btc_h4_side == "under":
                tracker.trend = "DOWNTREND"
            else:
                tracker.trend = "SIDEWAY"
                
            best_tf = "H4"

    tracker.active_target_tf = best_tf
    active_st = tracker.mtf_states[best_tf]
    tracker.accum_candle_count = active_st["accum"]
    tracker.cycle_fail_count   = active_st["fail"]
    tracker.back_count         = active_st["back"]
    tracker.forth_count        = active_st["forth"]
    tracker.current_side       = active_st["side"]

    # Bỏ chặn SIDEWAY cưỡng bức để các TF lớn hơn vẫn gài DCA độc lập bình thường


    def get_xole_opp(trk):
        # ⚡ CHỈ CHO PHÉP XO LE KHI ĐÃ VƯỢT NGƯỠNG RƯỚN VĨ MÔ (MACRO_EXTENSION_LIMIT_PCT)
        if not getattr(trk, "is_macro_overextended", False):
            return False, None, None, None, None, None
            
        tfs = ["M5", "M15", "M30", "H1", "H2", "H4"]
        
        def is_raw_up(tf):
            e34 = getattr(trk, f"{tf.lower()}_ema34", trk.ema34 if tf == "M5" else Decimal("0"))
            e89 = getattr(trk, f"{tf.lower()}_ema89", trk.ema89 if tf == "M5" else Decimal("0"))
            e200 = getattr(trk, f"{tf.lower()}_ema200", trk.ema200 if tf == "M5" else Decimal("0"))
            if e200 <= 0: return False
            return e200 < e89 < e34
            
        def is_raw_down(tf):
            e34 = getattr(trk, f"{tf.lower()}_ema34", trk.ema34 if tf == "M5" else Decimal("0"))
            e89 = getattr(trk, f"{tf.lower()}_ema89", trk.ema89 if tf == "M5" else Decimal("0"))
            e200 = getattr(trk, f"{tf.lower()}_ema200", trk.ema200 if tf == "M5" else Decimal("0"))
            if e200 <= 0: return False
            return e200 > e89 > e34

        for i in range(len(tfs) - 2):
            tf = tfs[i]
            tf1 = tfs[i+1]
            
            # Bộ lọc tích lũy nến: 2 khung nhỏ phải đủ chín (>= 60 nến, fail < MAX)
            if not _is_tf_valid(tf) or not _is_tf_valid(tf1): continue
            
            is_up = is_raw_up(tf) and is_raw_up(tf1)
            is_down = is_raw_down(tf) and is_raw_down(tf1)
            
            if not is_up and not is_down: continue
            
            entry = getattr(trk, f"{tf.lower()}_ema200", trk.ema200 if tf == "M5" else Decimal("0"))
            if entry <= 0: continue
            
            # Quét cụm toàn bộ nến ngược chiều từ tf+2 trở đi
            found_opp = False
            target_ema = Decimal("0")
            opp_tf = None
            
            for j in range(i + 2, len(tfs)):
                tf_n = tfs[j]
                
                if is_up and is_raw_down(tf_n):
                    found_opp = True
                    opp_ema = getattr(trk, f"{tf_n.lower()}_ema200", Decimal("0"))
                    if opp_ema > entry:
                        target_ema = opp_ema
                        opp_tf = tf_n
                        break
                    else:
                        opp_tf = tf_n
                        # Không break, tiếp tục tìm TF lớn hơn xem có cản nằm phía trước mặt không
                
                if is_down and is_raw_up(tf_n):
                    found_opp = True
                    opp_ema = getattr(trk, f"{tf_n.lower()}_ema200", Decimal("0"))
                    if opp_ema > 0 and opp_ema < entry:
                        target_ema = opp_ema
                        opp_tf = tf_n
                        break
                    else:
                        opp_tf = tf_n
                        # Không break, tiếp tục tìm
            
            if found_opp:
                trend = "UPTREND" if is_up else "DOWNTREND"
                return True, trend, tf, entry, target_ema, opp_tf

        return False, None, None, None, None, None

    xl_found, xl_trend, xl_tf, xl_entry, xl_target, xl_big_tf = get_xole_opp(tracker)
    
    # 🕹️ Áp dụng công tắc BẬT/TẮT chiến thuật
    if not getattr(globals_ref, "ENABLE_STRATEGY_XOLE", True):
        xl_found = False
    
    # ⚡ BỘ LỌC BẢO VỆ XO LE TẠI TRẠM H2: Giá chạm/vượt H2 về phía H4 sẽ cấm mở vị thế XO LE mới
    _h2_ema_xl = get_ema200_for_tf("H2")
    if xl_found and _h2_ema_xl > 0:
        if xl_trend == "UPTREND" and tracker.live_price >= _h2_ema_xl:
            xl_found = False
        elif xl_trend == "DOWNTREND" and tracker.live_price <= _h2_ema_xl:
            xl_found = False

    tracker.is_xole_pos = xl_found
    

    if xl_found:
        # ⚡ XOLE cũng là overlay TF-cục bộ: KHÔNG override trend/best_tf toàn cục
        tracker.xole_pos_side = "long" if xl_trend == "UPTREND" else "short"
        tracker.xole_tf = xl_tf               # TF duy nhất chịu ảnh hưởng xole
        tracker.xole_entry_ema = xl_entry
        tracker.xole_big_tf = xl_big_tf
        if xl_entry > 0:
            if xl_target > 0:
                xl_reward_pct = abs(xl_target - xl_entry) / xl_entry
            else:
                tf_mult = getattr(globals_ref, "TF_MULTIPLIERS", {}).get(xl_tf, Decimal("1.0"))
                xl_reward_pct = getattr(globals_ref, "SCALPING_TP_PCT", Decimal("0.02")) * tf_mult
            
            base_offset = getattr(globals_ref, "BASE_ENTRY_OFFSET_PCT", Decimal("0.0006"))
            xl_tp_pct = xl_reward_pct - base_offset
            if xl_tp_pct < Decimal("0.0005"): xl_tp_pct = Decimal("0.0005")
            tracker.xole_tp_pct = xl_tp_pct
            tracker.xole_sl_pct = xl_reward_pct
    else:
        tracker.xole_tf = None                # Reset khi không còn xole

    # Lọc nhiễu rụt râu
    if is_new_candle_closed and not tracker.has_long and not tracker.has_short:
        if tracker.trend == "UPTREND":
            last_low = lows_asc[-1]
            if last_low > tracker.ema200:
                dist = last_low - tracker.ema200
                dist_atr_ratio = dist / atr_current if atr_current > 0 else Decimal("99")
                if dist_atr_ratio < Decimal("0.20") and closes_asc[-1] > opens_asc[-1]:
                    pass  # z3306: removed log_opportunity_cost stub
        elif tracker.trend == "DOWNTREND":
            last_high = highs_asc[-1]
            if last_high < tracker.ema200:
                dist = tracker.ema200 - last_high
                dist_atr_ratio = dist / atr_current if atr_current > 0 else Decimal("99")
                if dist_atr_ratio < Decimal("0.20") and closes_asc[-1] < opens_asc[-1]:
                    pass  # z3306: removed log_opportunity_cost stub

    # ==============================================================================
    # ⚡ H4 FLIP CLOSE: Đóng toàn bộ vị thế ngược chiều khi H4 đảo chiều (accum >= 60)
    # ==============================================================================
    if globals_ref.ENABLE_H4_FLIP_CLOSE and is_h4_closed:
        h4_st = tracker.mtf_states.get("H4", {})
        old_h4_side = getattr(tracker, "last_h4_side", "none")
        new_h4_side = h4_st.get("side", "none")
        if new_h4_side != "none" and old_h4_side != "none" and new_h4_side != old_h4_side \
           and h4_st.get("accum", 0) >= globals_ref.REQUIRED_ACCUMULATION_CANDLES:
            if new_h4_side == "above" and tracker.has_short and active_short_pos:
                pos_s = active_short_pos[0]
                avg_px_s = tracker.active_avg_px_short
                roi_s = ((avg_px_s - tracker.live_price) / avg_px_s) * Decimal("100") * Decimal(str(cfg["leverage"]))
                clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"],
                    f"H4 Flip under→above ({h4_st['accum']}n)", "cross")
                tracker.closure_reason_short = "H4_Flip_Close"
                tracker.record_exit("SHORT", roi_s, "H4_Flip_Close",
                    f"H4 đảo chiều Tăng sau {h4_st['accum']} nến — đóng toàn bộ SHORT")
                print(f"\n🔄 [H4 FLIP] {coin_name}: under→above ({h4_st['accum']} nến). Đã đóng SHORT! Chuyển sang LONG.")
            elif new_h4_side == "under" and tracker.has_long and active_long_pos:
                pos_l = active_long_pos[0]
                avg_px_l = tracker.active_avg_px_long
                roi_l = ((tracker.live_price - avg_px_l) / avg_px_l) * Decimal("100") * Decimal(str(cfg["leverage"]))
                clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"],
                    f"H4 Flip above→under ({h4_st['accum']}n)", "cross")
                tracker.closure_reason_long = "H4_Flip_Close"
                tracker.record_exit("LONG", roi_l, "H4_Flip_Close",
                    f"H4 đảo chiều Giảm sau {h4_st['accum']} nến — đóng toàn bộ LONG")
                print(f"\n🔄 [H4 FLIP] {coin_name}: above→under ({h4_st['accum']} nến). Đã đóng LONG! Chuyển sang SHORT.")
        tracker.last_h4_side = new_h4_side
    elif is_h4_closed:
        tracker.last_h4_side = tracker.mtf_states.get("H4", {}).get("side", "none")

    # ==============================================================================
    # ⚔️ TỰ ĐỘNG CHUYỂN TRỤC RẢI LỆNH LIMIT CROSS (PURE LIMIT)
    # ==============================================================================
    spec = fetch_spec(client, swap_id)
    tick_sz = spec["tickSz"]
    is_btc_approved = True  # Đã chuyển sang bộ lọc đồng pha BTC độc lập cho từng TF trong get_aligned_tfs

    # ==============================
    # ⚔️ LỌC XU HƯỚNG VĨ MÔ (MACRO)
    # ==============================
    is_macro_approved = True
    # ⚡ ALTCOIN SYNC: Khi neo theo BTC, bỏ qua filter macro_trend của chính Altcoin
    if not (coin_name != "BTC" and _is_alt_synced):
        if tracker.macro_trend != "SIDEWAY":
            if tracker.trend == "UPTREND" and tracker.macro_trend == "DOWNTREND":
                is_macro_approved = False
            elif tracker.trend == "DOWNTREND" and tracker.macro_trend == "UPTREND":
                is_macro_approved = False

    if not is_macro_approved and not xl_found:
        if tracker.placed_entry_px_long != "---" or tracker.placed_entry_px_short != "---":
            clean_limit_orders(client, swap_id, "cross")
            tracker.placed_entry_px_long, tracker.placed_entry_px_short = "---", "---"

    # ==============================
    # ==============================
    is_btc_h4_squeeze = False
    if "BTC" in state_matrix:
        is_btc_h4_squeeze = getattr(state_matrix["BTC"], "is_h4_squeeze", False)
        
    if is_btc_h4_squeeze:
        # 1. Chặn lưới Limit mới (tạm ngưng giao dịch chờ xu hướng rõ)
        is_limit_setup_cycle = False
        if tracker.placed_entry_px_long != "---" or tracker.placed_entry_px_short != "---":
            clean_limit_orders(client, swap_id, "cross")
            tracker.placed_entry_px_long, tracker.placed_entry_px_short = "---", "---"
            
        # 2. Đóng hoà lệnh dương (ROI >= +0.1%)
        _roi_threshold = Decimal("0.1")
        if tracker.has_long and active_long_pos:
            pos_l = active_long_pos[0]
            avg_px_l = tracker.active_avg_px_long
            roi_l = ((tracker.live_price - avg_px_l) / avg_px_l) * Decimal("100") * Decimal(str(cfg["leverage"]))
            if roi_l >= _roi_threshold:
                clean_algo_orders(client, swap_id, "cross", pos_l["posSide"])
                close_position_market(client, swap_id, pos_l["posSide"], pos_l["pos"], "BTC_H4_Squeeze_BreakEven", "cross")
                tracker.closure_reason_long = "BTC_H4_Squeeze"
                tracker.record_exit("LONG", roi_l, "BTC_H4_Squeeze", "Cầu dao: BTC H4 Nén — Đóng hoà lệnh LONG")
                msg = f"🚨 [CẦU DAO] {cfg['coin']}: BTC H4 đang Nén chờ đảo chiều! Đã đóng hoà LONG (ROI: +{roi_l:.2f}%)."
                print(f"\n{msg}")
                send_telegram_notification(msg)
                
        if tracker.has_short and active_short_pos:
            pos_s = active_short_pos[0]
            avg_px_s = tracker.active_avg_px_short
            roi_s = ((avg_px_s - tracker.live_price) / avg_px_s) * Decimal("100") * Decimal(str(cfg["leverage"]))
            if roi_s >= _roi_threshold:
                clean_algo_orders(client, swap_id, "cross", pos_s["posSide"])
                close_position_market(client, swap_id, pos_s["posSide"], pos_s["pos"], "BTC_H4_Squeeze_BreakEven", "cross")
                tracker.closure_reason_short = "BTC_H4_Squeeze"
                tracker.record_exit("SHORT", roi_s, "BTC_H4_Squeeze", "Cầu dao: BTC H4 Nén — Đóng hoà lệnh SHORT")
                msg = f"🚨 [CẦU DAO] {cfg['coin']}: BTC H4 đang Nén chờ đảo chiều! Đã đóng hoà SHORT (ROI: +{roi_s:.2f}%)."
                print(f"\n{msg}")
                send_telegram_notification(msg)


    if is_limit_setup_cycle and (is_btc_approved or xl_found) and (is_macro_approved or xl_found):
        if True: # Bỏ chặn is_sideway_strict để hỗ trợ rải lưới độc lập từng TF
            # 🛑 CẦU DAO AN TOÀN: VOLUME SPIKE KHÔNG GÀI LIMIT
            if is_vol_spike:
                if tracker.placed_entry_px_long != "---" or tracker.placed_entry_px_short != "---":
                    clean_limit_orders(client, swap_id, "cross")
                    tracker.placed_entry_px_long, tracker.placed_entry_px_short = "---", "---"
                    send_telegram_notification(f"🛑 [CẦU DAO] {cfg['coin']}: Bão Volume Spike! Đã hủy lưới Limit để né bắt dao rơi.")
                return 

            # ---------------------------------------------------------
            # TỐI ƯU HÓA ENTRY BẰNG CÁCH CHỌN EMA TỐT NHẤT (SMART ENTRY)
            # ---------------------------------------------------------
            get_optimal_ema = get_optimal_ema_for_tf  # Alias: 2 hàm giống hệt, gộp chung

            target_ema_long = Decimal("0")
            target_ema_short = Decimal("0")

            if tracker.trend == "UPTREND":
                if getattr(tracker, "is_xole_pos", False):
                    target_ema_long = tracker.xole_entry_ema
                    tracker.placed_target_tf = tracker.active_target_tf
                else:
                    target_ema_long = get_optimal_ema(tracker.signal_long_tf, "UPTREND")
                    tracker.placed_target_tf = tracker.signal_long_tf
                tracker.active_target_ema_px = target_ema_long
            elif tracker.trend == "DOWNTREND":
                if getattr(tracker, "is_xole_pos", False):
                    target_ema_short = tracker.xole_entry_ema
                    tracker.placed_target_tf = tracker.active_target_tf
                else:
                    target_ema_short = get_optimal_ema(tracker.signal_short_tf, "DOWNTREND")
                    tracker.placed_target_tf = tracker.signal_short_tf
                tracker.active_target_ema_px = target_ema_short
            elif tracker.trend == "HEDGE":
                target_ema_long = get_optimal_ema(tracker.signal_long_tf, "UPTREND")
                target_ema_short = get_optimal_ema(tracker.signal_short_tf, "DOWNTREND")
                tracker.active_target_ema_px = target_ema_short
                tracker.placed_target_tf = tracker.signal_short_tf
            else:
                target_ema_long = tracker.ema200
                target_ema_short = tracker.ema200
                tracker.active_target_ema_px = tracker.ema200
            tracker.confluence_found_status = True  # Luôn true vì bỏ check dung sai


            try:
                cfg_file = env_paths.get("FILE_GLOBAL_CONFIG", "")
                if cfg_file and os.path.exists(cfg_file):
                    with open(cfg_file, "r", encoding="utf-8") as _f:
                        _cfg = json.load(_f)
                        if "POSITION_VOLUME_HIGH_CONFIDENCE" in _cfg:
                            globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE = Decimal(str(_cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
            except: pass
            target_usdt = globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE
            # ====================================================================
            # 🎯 ĐẶT LỆNH LIMIT ĐA KHUNG ĐỒNG PHA (MULTI-TIMEFRAME GRID)
            # ====================================================================
            # Khởi tạo các từ điển lưu trạng thái nếu chưa tồn tại
            if not hasattr(tracker, "placed_entry_px_long_by_tf"):
                tracker.placed_entry_px_long_by_tf = {}
            if not hasattr(tracker, "placed_entry_px_short_by_tf"):
                tracker.placed_entry_px_short_by_tf = {}

            # Đồng bộ hóa từ điển trạng thái khi bị xóa bởi các bộ lọc bên ngoài
            if tracker.placed_entry_px_long == "---":
                tracker.placed_entry_px_long_by_tf = {}
            if tracker.placed_entry_px_short == "---":
                tracker.placed_entry_px_short_by_tf = {}

            TFS_ALL = ["M5", "M15", "M30", "H1", "H2", "H4"]

            actual_pending = []
            # ⚡ Khởi tạo mặc định để tránh lỗi "cannot access local variable"
            exchange_longs_cross = {}
            exchange_shorts_cross = {}
            try:
                actual_pending = client.request("GET", "/api/v5/trade/orders-pending",
                                                params={"instType": "SWAP", "instId": swap_id})["data"]
                
                # Tạo bản đồ các lệnh thực tế đang chờ trên sàn
                prefix_l = f"{CL_ORD_PREFIX}EL"
                prefix_s = f"{CL_ORD_PREFIX}ES"
                
                for o in actual_pending:
                    cl_id = o.get("clOrdId", "")
                    px_val = o.get("px", "")
                    if not cl_id or not px_val: continue
                    
                    if cl_id.startswith(prefix_l):
                        for tf_cand in TFS_ALL:
                            if cl_id[len(prefix_l):].startswith(tf_cand):
                                exchange_longs_cross[tf_cand] = px_val
                                break
                    elif cl_id.startswith(prefix_s):
                        for tf_cand in TFS_ALL:
                            if cl_id[len(prefix_s):].startswith(tf_cand):
                                exchange_shorts_cross[tf_cand] = px_val
                                break
                                
                # Cập nhật từ điển trạng thái
                if not hasattr(tracker, "missing_count"):
                    tracker.missing_count = {"long": {}, "short": {}}
                    
                _emergency_needed = False
                for tf in TFS_ALL:
                    # LONG
                    found_px_l = exchange_longs_cross.get(tf)
                        
                    if found_px_l:
                        tracker.placed_entry_px_long_by_tf[tf] = found_px_l
                        tracker.missing_count["long"][tf] = 0
                    else:
                        if tracker.placed_entry_px_long_by_tf.get(tf, "---") not in ("---", "ERR", ""):
                            tracker.missing_count["long"][tf] = tracker.missing_count["long"].get(tf, 0) + 1
                            if tracker.missing_count["long"][tf] >= 5:
                                tracker.placed_entry_px_long_by_tf[tf] = "---"
                                _emergency_needed = True
                        else:
                            tracker.placed_entry_px_long_by_tf[tf] = "---"
                            tracker.missing_count["long"][tf] = 0
                            
                    # SHORT
                    found_px_s = exchange_shorts_cross.get(tf)
                        
                    if found_px_s:
                        tracker.placed_entry_px_short_by_tf[tf] = found_px_s
                        tracker.missing_count["short"][tf] = 0
                    else:
                        if tracker.placed_entry_px_short_by_tf.get(tf, "---") not in ("---", "ERR", ""):
                            tracker.missing_count["short"][tf] = tracker.missing_count["short"].get(tf, 0) + 1
                            if tracker.missing_count["short"][tf] >= 5:
                                tracker.placed_entry_px_short_by_tf[tf] = "---"
                                _emergency_needed = True
                        else:
                            tracker.placed_entry_px_short_by_tf[tf] = "---"
                            tracker.missing_count["short"][tf] = 0

                if _emergency_needed:
                    is_limit_setup_cycle = True
                    print(f"⚡ [EMERGENCY RE-PLACE] {coin_name}: Phát hiện lệnh Limit bị hủy trên sàn → Đặt lại ngay!")
            except Exception as e:
                hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")

            def _get_td_mode(tf):
                return "cross"
            
            def _get_leverage(tf):
                return int(cfg.get("leverage", 100))

            # --- Xác định target timeframes ---
            allowed_long = False
            allowed_short = False

            if tracker.has_long:
                allowed_long = True
            if tracker.has_short:
                allowed_short = True
            
            if not tracker.has_long and not tracker.has_short:
                # Reset filled_tfs khi không còn vị thế nào (chu kỳ mới)
                tracker.pos_cycle_filled_tfs = []
                tracker.pos_cycle_closed_tfs = []
                # Nếu chưa có vị thế, hướng đi được quyết định bởi BTC (nếu là Altcoin sync) hoặc tín hiệu của bản thân (BTC, forex như XAU)
                h4_side = tracker.mtf_states.get("H4", {}).get("side", "none")
                if coin_name == "BTC" or not _is_alt_synced:
                    allowed_long = (tracker.trend in ("UPTREND", "HEDGE")) and h4_side != "under"
                    allowed_short = (tracker.trend in ("DOWNTREND", "HEDGE")) and h4_side != "above"
                else:
                    btc_tk = state_matrix.get("BTC-USDT-SWAP")
                    if btc_tk:
                        btc_dir = "SIDEWAY"
                        if btc_tk.has_long:
                            btc_dir = "UPTREND"
                        elif btc_tk.has_short:
                            btc_dir = "DOWNTREND"
                        else:
                            btc_dir = btc_tk.trend
                        btc_h4_side = btc_tk.mtf_states.get("H4", {}).get("side", "none")
                        allowed_long = (btc_dir in ("UPTREND", "HEDGE")) and btc_h4_side != "under"
                        allowed_short = (btc_dir in ("DOWNTREND", "HEDGE")) and btc_h4_side != "above"

            # ⚡ Bổ sung Bypass vị thế cho Xo Le Hedge (Mở lệnh ngược chiều)
            _cur_xl_tf = getattr(tracker, "xole_tf", None)
            if _cur_xl_tf:
                _xl_tf_ema200 = get_ema200_for_tf(_cur_xl_tf)
                if _xl_tf_ema200 > 0:
                    if tracker.live_price >= _xl_tf_ema200:
                        allowed_long = True
                    else:
                        allowed_short = True

            # Lấy danh sách các khung thời gian đồng pha và kiểm tra tính hợp lệ của từng khung độc lập
            start_tf = "M5"  # Luôn quét từ M5 để không bỏ sót các TF nhỏ thỏa mãn điều kiện
            

            
            # ⚡ CẦU DAO CHỐNG RƯỚN VĨ MÔ (Macro Extension Breaker)
            # Khi ALTCOIN_FOLLOW_BTC_EMA = ON, dùng trạng thái của BTC làm chuẩn
            # Tránh Altcoin bị kẹt khóa vĩnh viễn do lệch pha H2/H4 EMA200 với BTC
            _alt_follow_btc_macro = getattr(globals_ref, "ALTCOIN_FOLLOW_BTC_EMA", True)
            if _is_alt_synced and _alt_follow_btc_macro:
                _btc_tk_macro = state_matrix.get("BTC-USDT-SWAP")
                if _btc_tk_macro:
                    tracker.is_macro_overextended = getattr(_btc_tk_macro, "is_macro_overextended", False)
            else:
                _h4_ema200 = get_ema200_for_tf("H4")
                _h2_ema200 = get_ema200_for_tf("H2")
                if _h4_ema200 > 0 and _h2_ema200 > 0:
                    _macro_dist_pct = abs(tracker.live_price - _h4_ema200) / _h4_ema200
                    _limit_pct = getattr(globals_ref, "MACRO_EXTENSION_LIMIT_PCT", Decimal("0.08")) * getattr(tracker, "vol_mult", Decimal("1.0"))
                    _is_overextended = getattr(tracker, "is_macro_overextended", False)
                    
                    if _macro_dist_pct > _limit_pct:
                        if not _is_overextended:
                            tracker.is_macro_overextended = True
                            print(f"\n🚨 [CẦU DAO VĨ MÔ] {coin_name} vượt ngưỡng rướn {_limit_pct*100:.1f}% (Cách H4 {_macro_dist_pct*100:.1f}%). Khóa rải lưới M5, M15, M30!")
                    elif _is_overextended:
                        # Mở khóa ở mốc H2
                        _macro_is_up = (tracker.live_price > _h4_ema200)
                        if (_macro_is_up and tracker.live_price <= _h2_ema200) or \
                           (not _macro_is_up and tracker.live_price >= _h2_ema200):
                            tracker.is_macro_overextended = False
                            print(f"\n🔓 [MỞ KHÓA VĨ MÔ] {coin_name} đã chạm về trạm H2. Mở lại lưới M5, M15, M30!")

            _is_overextended = getattr(tracker, "is_macro_overextended", False)
            _blocked_tfs = ["M5", "M15", "M30", "H1", "H2", "H4"] if _is_overextended else []

            aligned_long_tfs = get_aligned_tfs(start_tf, "UPTREND") if allowed_long else []
            # ⚡ DCA FILTER MỚI: Dùng pos_cycle_filled_tfs thay vì active_pos_tf
            # KB1: TF đã filled trong chu kỳ này → KHÔNG DCA lại
            # KB2: TF chưa filled → ĐƯỢC DCA
            # KB3: Sau TP/SL (pos_cycle_filled_tfs bị reset) → TF có thể vào lại
            _filled_long = tracker.pos_cycle_filled_tfs if tracker.has_long else []
            target_long_tfs = [tf for tf in aligned_long_tfs if tf not in _filled_long]
            target_long_tfs = [tf for tf in target_long_tfs if tf not in _blocked_tfs]

            aligned_short_tfs = get_aligned_tfs(start_tf, "DOWNTREND") if allowed_short else []
            _filled_short = tracker.pos_cycle_filled_tfs if tracker.has_short else []
            target_short_tfs = [tf for tf in aligned_short_tfs if tf not in _filled_short]
            target_short_tfs = [tf for tf in target_short_tfs if tf not in _blocked_tfs]

            if not getattr(globals_ref, "ENABLE_STRATEGY_MAIN", True):
                target_long_tfs = []
                target_short_tfs = []

            # Điều này giúp vượt qua bộ lọc get_aligned_tfs (nơi có thể chặn do squeeze hoặc fail limit)
            # ⚠️ QUAN TRỌNG: Phải tôn trọng bộ lọc DCA — nếu vị thế đã tồn tại, chỉ inject TF lớn hơn active_pos_tf
            _cur_xl_tf = getattr(tracker, "xole_tf", None)
            
            # Helper: kiểm tra TF có được phép inject không
            # KB1: TF đã filled → KHÔNG inject (tránh DCA trùng)
            # KB2: TF chưa filled → ĐƯỢC inject
            def _can_inject_tf(tf, has_pos):
                if not has_pos:
                    return True  # Chưa có vị thế → được phép inject
                return tf not in tracker.pos_cycle_filled_tfs
            

                    
            if _cur_xl_tf and _cur_xl_tf not in target_long_tfs and allowed_long:
                if _can_inject_tf(_cur_xl_tf, tracker.has_long):
                    _xl_tf_ema200 = get_ema200_for_tf(_cur_xl_tf)
                    if _xl_tf_ema200 > 0 and tracker.live_price >= _xl_tf_ema200:
                        target_long_tfs.append(_cur_xl_tf)
            if _cur_xl_tf and _cur_xl_tf not in target_short_tfs and allowed_short:
                if _can_inject_tf(_cur_xl_tf, tracker.has_short):
                    _xl_tf_ema200 = get_ema200_for_tf(_cur_xl_tf)
                    if _xl_tf_ema200 > 0 and tracker.live_price < _xl_tf_ema200:
                        target_short_tfs.append(_cur_xl_tf)

            # ⚡ ALTCOIN FALLBACK: Khi BTC có tín hiệu (allowed_short/long=True)
            # nhưng Altcoin chưa có TF nào aligned → force đặt limit theo BTC direction
            if coin_name != "BTC" and not tracker.has_long and not tracker.has_short:
                if allowed_long and not target_long_tfs:
                    fallback_tf = best_tf if best_tf not in _blocked_tfs else "H4"
                    if fallback_tf not in _blocked_tfs:
                        target_long_tfs = [fallback_tf]
                if allowed_short and not target_short_tfs:
                    fallback_tf = best_tf if best_tf not in _blocked_tfs else "H4"
                    if fallback_tf not in _blocked_tfs:
                        target_short_tfs = [fallback_tf]


            # ⚡ Dedup target TFs (phòng thủ — tránh trùng lặp TF gây cancel/replace vô ích)
            target_long_tfs = list(dict.fromkeys(target_long_tfs))
            target_short_tfs = list(dict.fromkeys(target_short_tfs))

            # ⚡ ALTCOIN TF CAP: Không cho Altcoin đặt limit ở TF vượt quá TF lớn nhất của BTC
            if coin_name != "BTC" and _is_alt_synced:
                btc_tk_cap = state_matrix.get("BTC-USDT-SWAP")
                if btc_tk_cap:
                    _btc_placed_long = getattr(btc_tk_cap, "placed_entry_px_long_by_tf", {})
                    _btc_placed_short = getattr(btc_tk_cap, "placed_entry_px_short_by_tf", {})
                    _btc_active_long = [tf for tf, px in _btc_placed_long.items() if px not in ("---", "ERR")]
                    if getattr(btc_tk_cap, "has_long", False):
                        _btc_active_long.extend(getattr(btc_tk_cap, "pos_cycle_filled_tfs", []))
                        
                    _btc_active_short = [tf for tf, px in _btc_placed_short.items() if px not in ("---", "ERR")]
                    if getattr(btc_tk_cap, "has_short", False):
                        _btc_active_short.extend(getattr(btc_tk_cap, "pos_cycle_filled_tfs", []))
                    _btc_max_tf_long = max(_btc_active_long, key=tf_weight) if _btc_active_long else None
                    _btc_max_tf_short = max(_btc_active_short, key=tf_weight) if _btc_active_short else None

                    if _btc_max_tf_long:
                        _max_w_long = tf_weight(_btc_max_tf_long)
                        target_long_tfs = [tf for tf in target_long_tfs if tf_weight(tf) <= _max_w_long]
                    else:
                        target_long_tfs = []

                    if _btc_max_tf_short:
                        _max_w_short = tf_weight(_btc_max_tf_short)
                        target_short_tfs = [tf for tf in target_short_tfs if tf_weight(tf) <= _max_w_short]
                    else:
                        target_short_tfs = []

            # --- XỬ LÝ LONG ---
            # 1. Hủy lệnh LONG cho các TF không còn nằm trong mục tiêu
            for tf in TFS_ALL:
                if tf not in target_long_tfs:
                    if tracker.placed_entry_px_long_by_tf.get(tf, "---") != "---":
                        try:
                            long_orders_tf = [o for o in actual_pending
                                              if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}EL{tf}")
                                              and o.get("tdMode") == _get_td_mode(tf) and o.get("side") == "buy"]
                            if long_orders_tf:
                                client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                               body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in long_orders_tf])
                        except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                        tracker.placed_entry_px_long_by_tf[tf] = "---"

                for tf in TFS_ALL:
                    try:
                        iso_orders = [o for o in actual_pending
                                      if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}EL{tf}")
                                      and o.get("tdMode") == "isolated"
                                      and o.get("instId") == swap_id]
                        if iso_orders:
                            client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                           body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in iso_orders])
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                    # Reset isolated entries
                    if tracker.placed_entry_px_long_by_tf.get(tf, "---") != "---":
                        if tf not in exchange_longs_cross:
                            tracker.placed_entry_px_long_by_tf[tf] = "---"

            # 2. Đặt hoặc cập nhật lệnh LONG ở các TF mục tiêu
            for tf in target_long_tfs:
                _is_xl = getattr(tracker, "xole_tf", None)
                if _is_xl:
                    tf_vol_mult = getattr(globals_ref, "XOLE_TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
                else:
                    tf_vol_mult = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
                tf_target_usdt = target_usdt * tf_vol_mult
                px_tf = calculate_entry_px(tf, "long")
                if px_tf <= 0: continue
                
                # Tính volume dựa trên entry price (px_tf) thay vì live_price để chống rung lắc size liên tục
                _sz_tf_raw = round_to_tick(tf_target_usdt / (px_tf * contract_val), spec["lotSz"])
                sz_for_tf = max(_sz_tf_raw, spec["minSz"])
                
                # ⚡ Yêu cầu của User: Cho phép khớp luôn thành Market nếu giá Limit đẹp hơn giá Live hiện tại
                # (Đã bỏ block: BẢO VỆ CHỐNG KHỚP LỆNH MARKET)
                    
                px_str = f"{px_tf:.{dec_places}f}"
                
                # Tìm lệnh thực tế tương ứng trên sàn
                tf_mode = _get_td_mode(tf)
                tf_orders = []
                for o in actual_pending:
                    if o.get("tdMode") == tf_mode and o.get("side") == "buy":
                        cl_id = o.get("clOrdId", "")
                        if cl_id.startswith(f"{CL_ORD_PREFIX}EL{tf}") or cl_id.startswith(f"scvlmtEL{tf}") or cl_id.startswith(f"scv25EL{tf}"):
                            tf_orders.append(o)
                        elif not cl_id.startswith(CL_ORD_PREFIX):
                            # Nhận diện lệnh đặt thủ công dựa trên volume
                            try:
                                o_sz = Decimal(o.get("sz", "0"))
                                if o_sz > 0 and abs(o_sz - Decimal(str(sz_for_tf))) / Decimal(str(sz_for_tf)) <= Decimal("0.05"):
                                    tf_orders.append(o)
                            except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                matching_order = None
                if len(tf_orders) > 1:
                    print(f"🧹 [CLEANUP] Phát hiện {len(tf_orders)} lệnh Limit trùng lặp cho LONG {tf}, dọn dẹp...")
                    matching_order = tf_orders[0]
                    duplicates = tf_orders[1:]
                    try:
                        client.request("POST", "/api/v5/trade/cancel-batch-orders", 
                                       body=[{"ordId": dup["ordId"], "instId": swap_id} for dup in duplicates])
                        for dup in duplicates:
                            if dup in actual_pending:
                                actual_pending.remove(dup)
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                elif len(tf_orders) == 1:
                    matching_order = tf_orders[0]
                
                last_closed_ts_for_tf = get_current_candle_start_ms(tf)
                
                if matching_order:
                    try:
                        old_px = Decimal(matching_order["px"])
                        new_px = Decimal(px_str)
                        pct_diff = abs(new_px - old_px) / old_px
                        old_sz = Decimal(matching_order["sz"])
                        new_sz = Decimal(str(sz_for_tf))
                        
                        # ⚡ PER-TF CANDLE COOLDOWN: Chỉ skip amend nếu nến chưa đóng mới VÀ size không thay đổi
                        # Nếu User vừa lưu Volume mới (old_sz != new_sz) → Thực hiện amend cập nhật size lên OKX ngay lập tức!
                        if old_sz == new_sz and last_closed_ts_for_tf > 0 and last_closed_ts_for_tf == tracker.last_limit_update_ts.get(tf, 0):
                            tracker.placed_entry_px_long_by_tf[tf] = matching_order["px"]
                            continue
                    except Exception as e:
                        hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                # ⚡ AMEND-FIRST: Sửa lệnh tại chỗ để tránh khoảng trống lệnh trên sàn
                amend_ok = False
                if matching_order:
                    try:
                        amend_body = {"ordId": matching_order["ordId"], "instId": swap_id, "newPx": px_str}
                        if Decimal(str(sz_for_tf)) != Decimal(matching_order["sz"]):
                            amend_body["newSz"] = str(sz_for_tf)
                        resp = client.request("POST", "/api/v5/trade/amend-order", body=amend_body)
                        if resp.get("code") == "0":
                            tracker.placed_entry_px_long_by_tf[tf] = px_str
                            amend_ok = True
                            tracker.last_limit_update_ts[tf] = last_closed_ts_for_tf
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                if not amend_ok:
                    # Fallback: Hủy lệnh cũ rồi đặt lệnh mới
                    try:
                        long_orders_tf = [o for o in actual_pending
                                          if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}EL{tf}")
                                          and o.get("tdMode") == tf_mode and o.get("side") == "buy"]
                        if long_orders_tf:
                            client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                           body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in long_orders_tf])
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                    try:
                        try:
                            _lever = str(_get_leverage(tf))
                            _resp = client.request("POST", "/api/v5/account/set-leverage", body={
                                "instId": swap_id, "lever": _lever,
                                "mgnMode": tf_mode, "posSide": "net" if pMode == "net_mode" else "long"
                            })
                            if _resp and _resp.get("code") != "0":
                                print(f"🚨 [Hệ thống] set-leverage long failed: {_resp}")
                        except Exception as e:
                            print(f"🚨 [Hệ thống] Exception set-leverage long: {e}")
                            
                        # Safety: Kiểm tra lại actual_pending trước khi đặt (tránh race condition)
                        already_on_exchange = any(
                            o.get("clOrdId", "").startswith(f"{CL_ORD_PREFIX}EL{tf}")
                            and o.get("tdMode") == tf_mode
                            for o in actual_pending
                        )
                        if already_on_exchange:
                            # Giữ nguyên giá đã ghi – KHÔNG reset về "---" (đây là bug gây DCA 2 lần)
                            if tracker.placed_entry_px_long_by_tf.get(tf, "---") in ("---", "ERR"):
                                # Ghi lại giá từ sàn nếu tracker chưa có
                                for _o in actual_pending:
                                    if _o.get("clOrdId", "").startswith(f"{CL_ORD_PREFIX}EL{tf}") and _o.get("tdMode") == tf_mode:
                                        tracker.placed_entry_px_long_by_tf[tf] = _o.get("px", px_str)
                                        break
                            tracker.missing_count_long = getattr(tracker, "missing_count_long", {})
                            tracker.missing_count_long[tf] = 0
                            continue
                            
                        # ⚡ THÊM: Nếu không thấy trên sàn nhưng Tracker đã có ghi nhận giá -> Đợi 3 chu kỳ
                        tracker.missing_count_long = getattr(tracker, "missing_count_long", {})
                        if tracker.placed_entry_px_long_by_tf.get(tf, "---") not in ("---", "ERR"):
                            missing_count = tracker.missing_count_long.get(tf, 0) + 1
                            tracker.missing_count_long[tf] = missing_count
                            if missing_count <= 3:
                                # Chưa đủ 3 chu kỳ vắng mặt, bỏ qua không đặt lệnh mới
                                print(f"⏳ [API LAG WARNING] Lệnh LONG {tf} biến mất khỏi API, đợi {missing_count}/3 chu kỳ...")
                                continue
                            else:
                                # Quá 3 chu kỳ, chắc chắn đã mất lệnh
                                tracker.missing_count_long[tf] = 0
                        else:
                            tracker.missing_count_long[tf] = 0
                            

                        place_pure_limit(client, swap_id, "buy", "net" if pMode == "net_mode" else "long", str(sz_for_tf), px_str,
                                         f"{CL_ORD_PREFIX}EL{tf}{int(time.time() * 1000000)}"[:32], tf_mode)
                        tracker.placed_entry_px_long_by_tf[tf] = px_str
                        tracker.last_limit_update_ts[tf] = last_closed_ts_for_tf
                    except Exception as _e:
                        tracker.placed_entry_px_long_by_tf[tf] = "ERR"

            # Cập nhật tracker.placed_entry_px_long hiển thị lên dashboard (lấy mức giá của khung TF nhỏ nhất)
            active_placed_long = [tf for tf in target_long_tfs if tracker.placed_entry_px_long_by_tf.get(tf, "---") not in ("---", "ERR")]
            if active_placed_long:
                smallest_tf = min(active_placed_long, key=tf_weight)
                tracker.placed_entry_px_long = tracker.placed_entry_px_long_by_tf[smallest_tf]
            else:
                tracker.placed_entry_px_long = "---"

            # --- XỬ LÝ SHORT ---
            # 1. Hủy lệnh SHORT cho các TF không còn nằm trong mục tiêu
            for tf in TFS_ALL:
                if tf not in target_short_tfs:
                    if tracker.placed_entry_px_short_by_tf.get(tf, "---") != "---":
                        try:
                            short_orders_tf = [o for o in actual_pending
                                               if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}ES{tf}")
                                               and o.get("tdMode") == _get_td_mode(tf) and o.get("side") == "sell"]
                            if short_orders_tf:
                                client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                               body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in short_orders_tf])
                        except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                        tracker.placed_entry_px_short_by_tf[tf] = "---"

                for tf in TFS_ALL:
                    try:
                        iso_orders = [o for o in actual_pending
                                      if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}ES{tf}")
                                      and o.get("tdMode") == "isolated"
                                      and o.get("instId") == swap_id]
                        if iso_orders:
                            client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                           body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in iso_orders])
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                    # Reset isolated entries
                    if tracker.placed_entry_px_short_by_tf.get(tf, "---") != "---":
                        if tf not in exchange_shorts_cross:
                            tracker.placed_entry_px_short_by_tf[tf] = "---"

            # 2. Đặt hoặc cập nhật lệnh SHORT ở các TF mục tiêu
            for tf in target_short_tfs:
                _is_xl = getattr(tracker, "xole_tf", None)
                if _is_xl:
                    tf_vol_mult = getattr(globals_ref, "XOLE_TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
                else:
                    tf_vol_mult = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(tf, Decimal("1.0"))
                tf_target_usdt = target_usdt * tf_vol_mult
                px_tf = calculate_entry_px(tf, "short")
                if px_tf <= 0: continue

                # Tính volume dựa trên entry price (px_tf) thay vì live_price để chống rung lắc size liên tục
                _sz_tf_raw = round_to_tick(tf_target_usdt / (px_tf * contract_val), spec["lotSz"])
                sz_for_tf = max(_sz_tf_raw, spec["minSz"])
                
                # ⚡ Yêu cầu của User: Cho phép khớp luôn thành Market nếu giá Limit đẹp hơn giá Live hiện tại
                # (Đã bỏ block: BẢO VỆ CHỐNG KHỚP LỆNH MARKET)
                    
                px_str = f"{px_tf:.{dec_places}f}"
                
                # Tìm lệnh thực tế tương ứng trên sàn
                tf_mode = _get_td_mode(tf)
                tf_orders = []
                for o in actual_pending:
                    if o.get("tdMode") == tf_mode and o.get("side") == "sell":
                        cl_id = o.get("clOrdId", "")
                        if cl_id.startswith(f"{CL_ORD_PREFIX}ES{tf}") or cl_id.startswith(f"scvlmtES{tf}") or cl_id.startswith(f"scv25ES{tf}"):
                            tf_orders.append(o)
                        elif not cl_id.startswith(CL_ORD_PREFIX):
                            # Nhận diện lệnh đặt thủ công dựa trên volume
                            try:
                                o_sz = Decimal(o.get("sz", "0"))
                                if o_sz > 0 and abs(o_sz - Decimal(str(sz_for_tf))) / Decimal(str(sz_for_tf)) <= Decimal("0.05"):
                                    tf_orders.append(o)
                            except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                matching_order = None
                if len(tf_orders) > 1:
                    print(f"🧹 [CLEANUP] Phát hiện {len(tf_orders)} lệnh Limit trùng lặp cho SHORT {tf}, dọn dẹp...")
                    matching_order = tf_orders[0]
                    duplicates = tf_orders[1:]
                    try:
                        client.request("POST", "/api/v5/trade/cancel-batch-orders", 
                                       body=[{"ordId": dup["ordId"], "instId": swap_id} for dup in duplicates])
                        for dup in duplicates:
                            if dup in actual_pending:
                                actual_pending.remove(dup)
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                elif len(tf_orders) == 1:
                    matching_order = tf_orders[0]
                
                last_closed_ts_for_tf_s = get_current_candle_start_ms(tf)
                
                if matching_order:
                    try:
                        old_px = Decimal(matching_order["px"])
                        new_px = Decimal(px_str)
                        pct_diff = abs(new_px - old_px) / old_px
                        old_sz = Decimal(matching_order["sz"])
                        new_sz = Decimal(str(sz_for_tf))
                        
                        # ⚡ PER-TF CANDLE COOLDOWN: Chỉ skip amend nếu nến chưa đóng mới VÀ size không thay đổi
                        # Nếu User vừa lưu Volume mới (old_sz != new_sz) → Thực hiện amend cập nhật size lên OKX ngay lập tức!
                        if old_sz == new_sz and last_closed_ts_for_tf_s > 0 and last_closed_ts_for_tf_s == tracker.last_limit_update_ts.get(tf, 0):
                            tracker.placed_entry_px_short_by_tf[tf] = matching_order["px"]
                            continue
                    except Exception as e:
                        hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                # ⚡ AMEND-FIRST: Sửa lệnh tại chỗ để tránh khoảng trống lệnh trên sàn
                amend_ok = False
                if matching_order:
                    try:
                        amend_body = {"ordId": matching_order["ordId"], "instId": swap_id, "newPx": px_str}
                        if Decimal(str(sz_for_tf)) != Decimal(matching_order["sz"]):
                            amend_body["newSz"] = str(sz_for_tf)
                        resp = client.request("POST", "/api/v5/trade/amend-order", body=amend_body)
                        if resp.get("code") == "0":
                            tracker.placed_entry_px_short_by_tf[tf] = px_str
                            amend_ok = True
                            tracker.last_limit_update_ts[tf] = last_closed_ts_for_tf_s
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                
                if not amend_ok:
                    # Fallback: Hủy lệnh cũ rồi đặt lệnh mới
                    try:
                        short_orders_tf = [o for o in actual_pending
                                           if o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}ES{tf}")
                                           and o.get("tdMode") == tf_mode and o.get("side") == "sell"]
                        if short_orders_tf:
                            client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                           body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in short_orders_tf])
                    except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")
                    try:
                        try:
                            _lever = str(_get_leverage(tf))
                            _resp = client.request("POST", "/api/v5/account/set-leverage", body={
                                "instId": swap_id, "lever": _lever,
                                "mgnMode": tf_mode, "posSide": "net" if pMode == "net_mode" else "short"
                            })
                            if _resp and _resp.get("code") != "0":
                                print(f"🚨 [Hệ thống] set-leverage short failed: {_resp}")
                        except Exception as e:
                            print(f"🚨 [Hệ thống] Exception set-leverage short: {e}")
                            
                        # Safety: Kiểm tra lại actual_pending trước khi đặt (tránh race condition)
                        already_on_exchange = any(
                            o.get("clOrdId", "").startswith(f"{CL_ORD_PREFIX}ES{tf}")
                            and o.get("tdMode") == tf_mode
                            for o in actual_pending
                        )
                        if already_on_exchange:
                            # Giữ nguyên giá đã ghi – KHÔNG reset về "---" (đây là bug gây DCA 2 lần)
                            if tracker.placed_entry_px_short_by_tf.get(tf, "---") in ("---", "ERR"):
                                for _o in actual_pending:
                                    if _o.get("clOrdId", "").startswith(f"{CL_ORD_PREFIX}ES{tf}") and _o.get("tdMode") == tf_mode:
                                        tracker.placed_entry_px_short_by_tf[tf] = _o.get("px", px_str)
                                        break
                            tracker.missing_count_short = getattr(tracker, "missing_count_short", {})
                            tracker.missing_count_short[tf] = 0
                            continue
                            
                        # ⚡ THÊM: Nếu không thấy trên sàn nhưng Tracker đã có ghi nhận giá -> Đợi 3 chu kỳ
                        tracker.missing_count_short = getattr(tracker, "missing_count_short", {})
                        if tracker.placed_entry_px_short_by_tf.get(tf, "---") not in ("---", "ERR"):
                            missing_count = tracker.missing_count_short.get(tf, 0) + 1
                            tracker.missing_count_short[tf] = missing_count
                            if missing_count <= 3:
                                print(f"⏳ [API LAG WARNING] Lệnh SHORT {tf} biến mất khỏi API, đợi {missing_count}/3 chu kỳ...")
                                continue
                            else:
                                tracker.missing_count_short[tf] = 0
                        else:
                            tracker.missing_count_short[tf] = 0
                            
                        place_pure_limit(client, swap_id, "sell", "net" if pMode == "net_mode" else "short", str(sz_for_tf), px_str,
                                         f"{CL_ORD_PREFIX}ES{tf}{int(time.time() * 1000000)}"[:32], tf_mode)
                        tracker.placed_entry_px_short_by_tf[tf] = px_str
                        tracker.last_limit_update_ts[tf] = last_closed_ts_for_tf_s
                    except Exception as _e:
                        print(f"🚨 [Hệ thống] Lỗi đặt lệnh Limit Short {tf}: {_e}")
                        tracker.placed_entry_px_short_by_tf[tf] = "ERR"


            # Cập nhật tracker.placed_entry_px_short hiển thị lên dashboard (lấy mức giá của khung TF nhỏ nhất)
            active_placed_short = [tf for tf in target_short_tfs if tracker.placed_entry_px_short_by_tf.get(tf, "---") not in ("---", "ERR")]
            if active_placed_short:
                smallest_tf = min(active_placed_short, key=tf_weight)
                tracker.placed_entry_px_short = tracker.placed_entry_px_short_by_tf[smallest_tf]
            else:
                tracker.placed_entry_px_short = "---"

            # --- DỌN DẸP LỆNH LIMIT CŨ (scvlmtEL1 hoặc scvlmtES1) NẾU CÓ ---
            try:
                pending = client.request("GET", "/api/v5/trade/orders-pending",
                                         params={"instType": "SWAP", "instId": swap_id})["data"]
                old_orders = [o for o in pending
                              if (o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}EL1") or o.get("clOrdId","").startswith(f"{CL_ORD_PREFIX}ES1"))
                              and o.get("tdMode") == "cross"]
                if old_orders:
                    client.request("POST", "/api/v5/trade/cancel-batch-orders",
                                   body=[{"ordId": o["ordId"], "instId": o["instId"]} for o in old_orders])
            except Exception as e: hft_logger.error(f"Lỗi API (Hủy/Đặt lệnh): {e}")

# =========================================================================================
# 🗺️ BẢN ĐỒ GIẢI PHẪU THUẬT TOÁN — CRITICAL STRATEGY MAP (PURE LIMIT CROSS PP0)
# =========================================================================================
# z2417 | Thay đổi công thức tính Entry Offset của Altcoin theo công thức mới của User (Cộng/trừ có dấu khoảng cách ETH, và nhân hệ số co giãn cho cả cụm tổng khoảng cách BTC + ETH). Đồng thời đảo ngược chiều LONG thành (ETH - BTC) để tránh lỗi văng giá.
# z2418 | Fix lỗi DCA trùng lặp liên tục tại cùng 1 TF (Race condition limit order): Ưu tiên TF nhỏ nhất trong determine_filled_tf, loại bỏ TF đã filled ở fallback, và thêm safety check actual_pending trước khi place_pure_limit.
# z2422 | Sửa logic apply_emergency_tpsl dùng TF lớn nhất thực sự đã khớp (pos_cycle_filled_tfs) thay vì active_pos_tf để tính hệ số giãn SL/TP chính xác
# z2423 | Sửa lỗi DCA liên tục lặp lại ở cùng một TF do tính sai khối lượng lệnh vừa khớp (chỉ tính phần chênh lệch thay vì tổng khối lượng vị thế).
# z2424 | Vô hiệu hóa việc ghi log dư thừa cho AI (RSI, Waiting Log, History) trong bot_sub1.py để tối ưu tài nguyên, giữ lại wallet_stats.
# z2425 | Cộng gộp khối lượng (sum) các vị thế trả về từ OKX cho tính năng Copy Trade (Lead Trader) thay vì chỉ lấy vị thế cuối cùng trong danh sách, giúp bot nhận diện đúng tổng khối lượng vị thế.
# z2426 | Cập nhật thuật toán determine_filled_tf: nhân expected_vol với _coin_vol_mult để đối chiếu chính xác lệnh của Altcoin đã được nhân hệ số khối lượng.
# z2427 | Fix bug DCA 2 lần cùng 1 TF (race condition): Trong safety-check already_on_exchange, đổi từ reset "---" sang giữ nguyên/đồng bộ giá từ sàn. Thêm missing_count[3-cycle grace] để tránh reset tracker sai khi API OKX chậm trả lệnh.
# z5332 | Đập bỏ công thức đệm lõm phức tạp của Altcoin. Thay vào đó dùng chung cơ chế với BTC nhưng nhân thêm TF_VOLUME_MULTIPLIERS để lùi sâu hơn.

# z1949 | Fix Partial Fills using Fills API, RAM structure order list(), Disk I/O Memory Cache, Time-based Caching for Rate Limit
# z3301 | Safety Clamp: Giới hạn limit entry theo EMA200 của TF tín hiệu chủ đạo, tránh lệch pha khi M5 EMA200 vượt H4 EMA200 trong multi-TF grid
# z3302 | Thêm công tắc ALTCOIN_FOLLOW_BTC_EMA — LOCK để Altcoin dùng EMA200 riêng, ON để neo theo BTC
# z3303 | Altcoin Macro Extension Breaker dùng trạng thái của BTC khi ALTCOIN_FOLLOW_BTC_EMA=ON, tránh kẹt khóa vĩnh viễn do lệch pha H2
# z3304 | Bỏ volatility_mult khỏi offset BTC (chỉ dùng BASE_ENTRY_OFFSET_PCT × TF_MULTIPLIERS) + Altcoin sync aligned TFs từ BTC khi ON
# z3305 | Bỏ filter is_macro_approved cho Altcoin neo BTC (macro_trend của Altcoin thường mâu thuẫn với trend ép từ BTC H4)
# z3306 | Fix bug Altcoin neo BTC vẫn dính volatility_mult vào base_buffer + Fix bug chưa sort timeframes theo tf_weight trong get_aligned_tfs.
# z3307 | Fix bug Altcoin không rải lưới Limit do SAFETY CLAMP ép giá sai chiều (Thêm đk chỉ clamp khi EMA thực sự là cản) & Đổi thứ tự kẹp live_price xuống cuối để chống lỗi 51006.
# z3308 | Xóa bỏ hoàn toàn LIMIT_UPDATE_THRESHOLD_PCT theo yêu cầu, cho phép update Limit sau 360s bất kể độ lệch giá. Xác nhận giữ nguyên công thức Altcoin Neo BTC (đã chuẩn 100%).
# z3309 | Fix triệt để lỗi Altcoin mất lệnh do tính sai Limit BTC (đồng bộ bằng giá Limit thực tế đã đặt của BTC thay vì công thức gốc để bảo toàn bù trừ kẹp live_price) + Bỏ lọc Closeness Filter riêng của Altcoin để copy 100% grid BTC.
# z3310 | Khắc phục các lỗi syntax và runtime (unexpected indent, name _cur_pp_tf is not defined) sau khi gỡ bỏ Ping-Pong.
# z3311 | Fix nốt lỗi name _pp_tf_grid is not defined và dọn sạch các tàn dư biến is_pp_tf của Ping Pong.
# z3313 | Xóa bỏ tính năng USE_DYNAMIC_RISK và RISK_PER_TRADE_PCT, khóa cứng volume rải lưới theo POSITION_VOLUME_HIGH_CONFIDENCE.
# z3314 | Bỏ điều kiện EMA34/89 confirms quá chặt khiến miss lệnh Limit M15; Fix logic Altcoin neo BTC: chỉ copy lưới BTC tại những TF mà Altcoin cũng đủ >= 60 nến đồng pha.
# z3315 | Bỏ ép buộc signal_tf bằng H4 cho Altcoin để fix lỗi Safety Clamp chặn lệnh Limit do đọc nhầm cản EMA200.
# z3316 | Fix bug DCA vô số lệnh cùng TF do OKX API lag gây nhân bản limit order. Thêm cơ chế tự dọn dẹp lệnh trùng lặp và tính Limit Volume theo Limit Price thay vì Live Price.
# z3317 | Fix lỗi nghiêm trọng không đặt TP/SL do tàn dư biến `pp_long_pos` của Ping-Pong gây `UnboundLocalError` ngầm, làm nuốt cờ `has_long`. Xóa sạch tàn dư Ping-Pong trong fetch_positions.
# z3318 | Áp dụng review từ Claude: Lọc 60s cho Fills API tránh đọc nhầm order cũ khi API lag, xoá cờ `reduceOnly` vô lý trong Hedge mode khi cài TP/SL.
# z3319 | Cài đặt hệ thống HFT Logger chuyên dụng (RotatingFileHandler) bắt sóng 100% exception ngầm để truy vết lỗi.
# z3320 | Fix khẩn cấp lỗi Race Condition đẻ ra hàng chục lệnh Limit cùng 1 TF do API OKX trả về lệnh trễ bằng cách khôi phục cơ chế missing_count (đợi 3 chu kỳ).
# z3306 | Refactor: Xóa stub functions, gộp _is_alt_synced, xóa get_ema200_for_tf_target trùng lặp, sắp xếp lại thứ tự code
# z3350 | Clean up: Xoá các imports (traceback, time) và các biến (tolerance_pct, live_high, live_low, lot_sz, tf_tol, von_goc, v.v.) không sử dụng để tối ưu code.
# z7713 | Thuật toán reload limit EMA200: Nhúng hàm get_current_candle_start_ms lấy giờ UTC chuẩn, bắt chính xác sát giây nến đóng để tính lại Limit.
# z7714 | Fix Candle Cooldown vô điều kiện: Bỏ ràng buộc `if old_sz == new_sz` khỏi PER-TF CANDLE COOLDOWN (cả LONG & SHORT). Giờ lệnh limit TF nào chỉ được amend/reload khi nến TF đó đóng mới, bất kể size có thay đổi. Tránh amend liên tục mỗi 3s.
# z7717 | Marker Feature: Tích hợp ghi log trade_markers (B/S tag) tại thời điểm entry/exit để GUI vẽ lên Chart.
