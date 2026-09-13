#!/usr/bin/env python3
"""
===============================================================================================
🏛️ LÕI HỆ THỐNG (STATICAL ENGINE) — sys_bot_sub3.py
===============================================================================================
- Chức năng: Entry point của Bot Sub3 (Chiến thuật Liquidation Sweep + OB).
- Kiến trúc: Thừa kế API Core của Sub1/Sub2 để tái sử dụng mã nguồn.
===============================================================================================
"""

import os
import sys
import time
import json
import threading
import queue

# Tự động thêm thư mục gốc dự án vào sys.path
_file_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(_file_dir) in ["sub1", "sub2", "sub3"]:
    _parent_dir = os.path.dirname(_file_dir) # Đây là thư mục 'bots'
    _workspace_dir = os.path.dirname(_parent_dir) # Đây là thư mục OKX_Trade_Kit
    if _workspace_dir not in sys.path:
        sys.path.insert(0, _workspace_dir)

try:
    import psutil
    HAS_PSUTIL = True
except ModuleNotFoundError:
    HAS_PSUTIL = False

from bots.sub1.bot_api import OKXRestCore
from bots.sub1.bot_orders import place_market_entry, place_algo_tpsl, fetch_spec, clean_algo_orders
from bots.sub3.sys_liquid_strategy import LiquidationStrategy
from bots.sub3.bot_ui import print_dashboard, update_wallet_metrics
import math
import datetime

# Đường dẫn dữ liệu User (Luôn dùng LOCALAPPDATA kể cả khi chạy dev)
USER_DATA_DIR = os.path.join(os.environ.get("LOCALAPPDATA", os.path.expanduser("~")), "TLS1_Trading")


system_config = {
    "SHOULD_STOP": False,
    "SHOULD_RESET_WALLET": False,
    "SHOULD_RESET_NEN": False,
    "BOT_START_TIME": time.time(),
    "ENABLED_COINS": ["XAU", "BTC", "ETH"]
}

def _build_env_paths(base_dir: str, env_file_name: str) -> dict:
    """Xây dựng dict đường dẫn file giống Sub1."""
    json_data_dir = os.path.join(USER_DATA_DIR, "bots", "sub3", "json_data")
    os.makedirs(json_data_dir, exist_ok=True)
    
    acc_name = os.path.splitext(env_file_name)[0] if "." in env_file_name else env_file_name
    
    return {
        "ENV_FILE_NAME": env_file_name,
        "JSON_DATA_DIR": json_data_dir,
        "JSON_EVOLUTION_DATA_FILE": os.path.join(json_data_dir, f"{acc_name}_evolution_data.json"),
        "FILE_GLOBAL_CONFIG": os.path.join(json_data_dir, f"{acc_name}_global_config.json"),
        "FILE_TRADE_HISTORY": os.path.join(json_data_dir, f"{acc_name}_lich_su_tien_hoa_chi_tiet.json"),
    }

def _load_strategy_config(env_paths: dict) -> dict:
    """Đọc cấu hình chiến thuật từ file global_config.json."""
    cfg = {}
    config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
    if config_path and os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8-sig") as f:
                cfg = json.load(f)
        except: pass
    return cfg

def start_terminal_listener(system_config: dict):
    """Lắng nghe lệnh từ Terminal (giống Sub1)."""
    def terminal_input_listener():
        while True:
            try:
                user_cmd = input().strip()
                if user_cmd == "reset_wallet":
                    system_config["SHOULD_RESET_WALLET"] = True
                    print("\n♻️ [HỆ THỐNG]: Đã tiếp nhận tín hiệu từ Sếp! Đang kiểm toán mốc VỐN GỐC...")
                elif user_cmd in ("reset_nen", "rs_nen"):
                    system_config["SHOULD_RESET_NEN"] = True
                    print(f"\n♻️ [HỆ THỐNG]: Đã tiếp nhận tín hiệu từ Sếp! Đang reset lại toàn bộ ({user_cmd})...")
            except:
                time.sleep(1)
    threading.Thread(target=terminal_input_listener, daemon=True).start()

def fetch_klines(api, inst_id, bar="1H", limit=100):
    """Lấy dữ liệu nến từ OKX và format lại"""
    try:
        res = api.request("GET", "/api/v5/market/candles", params={"instId": inst_id, "bar": bar, "limit": limit})
        data = res.get("data", [])
        klines = []
        for row in reversed(data): # Mới nhất ở đầu -> Đảo ngược để cũ nhất ở đầu
            klines.append({
                "ts": int(row[0]),
                "open": float(row[1]),
                "high": float(row[2]),
                "low": float(row[3]),
                "close": float(row[4])
            })
        return klines
    except Exception as e:
        print(f"Lỗi lấy klines {inst_id}: {e}")
        return []

def main():
    global system_config
    system_config["SHOULD_STOP"] = False
    system_config["BOT_START_TIME"] = time.time()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    for _ in range(4):
        if os.path.isdir(os.path.join(base_dir, "bots", "sub3")):
            break
        base_dir = os.path.dirname(base_dir)
        
    config_dir = os.path.join(base_dir, "config")
    os.makedirs(config_dir, exist_ok=True)
    pid_file = os.path.join(config_dir, "bot_sub3.pid")
    stop_flag = os.path.join(config_dir, "stop_sub3.flag")
    
    # Đọc env_file từ argv (GUI truyền vào)
    env_file_name = ".api"
    if len(sys.argv) >= 3 and sys.argv[1] == "--run-bot":
        env_file_name = sys.argv[2]
    elif len(sys.argv) >= 2:
        env_file_name = sys.argv[1]

    # Check PID
    if os.path.exists(pid_file):
        try:
            with open(pid_file, 'r') as f:
                old_pid = int(f.read().strip())
            if HAS_PSUTIL and psutil.pid_exists(old_pid):
                print(f"⚠️ [CẢNH BÁO]: Tiến trình Bot Sub3 (PID={old_pid}) đang chạy. Thoát bản sao mới.")
                sys.exit(0)
            else:
                os.remove(pid_file)
        except Exception:
            pass

    if os.path.exists(stop_flag):
        os.remove(stop_flag)
        
    with open(pid_file, 'w') as f:
        f.write(str(os.getpid()))

    # Xây dựng env_paths
    env_paths = _build_env_paths(base_dir, env_file_name)
    
    # Đọc config chiến thuật
    strategy_cfg = _load_strategy_config(env_paths)
    system_config["ENABLED_COINS"] = strategy_cfg.get("ENABLED_COINS", ["XAU", "BTC", "ETH"])
    
    # Khởi tạo API & Strategy  
    print("🚀 [START]: Khởi động Bot Sub3 (Liquidation Strategy)...")
    
    # Đọc API key từ file env (format: OKX_API_KEY="xxx")
    api_key, secret, passphrase = "", "", ""
    
    # Tìm file API: ưu tiên USER_DATA_DIR > bots/sub3 > bots/sub1
    search_paths = [
        os.path.join(USER_DATA_DIR, "bots", "sub3", env_file_name),
        os.path.join(USER_DATA_DIR, "bots", "sub1", env_file_name),
        os.path.join(base_dir, "bots", "sub3", env_file_name),
        os.path.join(base_dir, "bots", "sub1", env_file_name),
        os.path.join(base_dir, "bots", "sub2", env_file_name),
    ]
    
    env_file_path = None
    for sp in search_paths:
        if os.path.exists(sp):
            env_file_path = sp
            break
    
    if env_file_path:
        try:
            with open(env_file_path, "r") as f:
                for line in f:
                    line = line.strip().replace('"', '').replace("'", "")
                    if line.startswith("OKX_API_KEY="): api_key = line.split("=", 1)[1]
                    elif line.startswith("API_KEY="): api_key = api_key or line.split("=", 1)[1]
                    elif line.startswith("OKX_SECRET_KEY="): secret = line.split("=", 1)[1]
                    elif line.startswith("SECRET="): secret = secret or line.split("=", 1)[1]
                    elif line.startswith("OKX_PASSPHRASE="): passphrase = line.split("=", 1)[1]
                    elif line.startswith("PASSPHRASE="): passphrase = passphrase or line.split("=", 1)[1]
            print(f"📂 API File: {env_file_path}")
        except: pass
    else:
        print(f"⚠️ Không tìm thấy file API: {env_file_name}")
    
    okx_api = OKXRestCore(api_key=api_key, secret=secret, passphrase=passphrase)
    strategy = LiquidationStrategy(config=strategy_cfg)
    
    # Khởi động Terminal Listener
    start_terminal_listener(system_config)
    
    # Mapping coin -> instId (swap) — Đúng theo OKX API
    COIN_MAP = {
        "XAU": "XAU-USDT-SWAP",
        "BTC": "BTC-USDT-SWAP",
        "ETH": "ETH-USDT-SWAP"
    }
    
    # Dict trạng thái từng coin
    coin_states = {}
    coin_strategies = {}  # Mỗi coin 1 strategy riêng
    for coin in system_config["ENABLED_COINS"]:
        coin_states[coin] = {
            "live_price": 0,
            "has_long": False,
            "has_short": False, 
            "entry_px": 0,
            "sl_px": 0,
            "tp_px": 0,
            "pnl_pct": 0,
            "state": "Waiting For Bulky Candle",
            "direction": None,
            "warmup_done": False
        }
        coin_strategies[coin] = LiquidationStrategy(config=strategy_cfg)
    
    # Vòng lặp chính
    iteration = 0
    DASHBOARD_INTERVAL = 10   # In dashboard mỗi 10 chu kỳ (10s)
    WALLET_UPDATE_INTERVAL = 60  # Cập nhật ví mỗi 60 chu kỳ (1 phút)
    DATA_FETCH_INTERVAL = 15   # Fetch dữ liệu thị trường mỗi 15 giây

    print(f"📡 API Key: {'***' + api_key[-4:] if len(api_key) > 4 else '(trống)'}")
    print(f"🪙 Coins: {system_config['ENABLED_COINS']}")
    print(f"🗺️ Mapping: {COIN_MAP}")
    print(f"🔥 Khởi động WARM UP (Quét dữ liệu quá khứ tìm OB gần nhất)...")

    try:
        while not system_config["SHOULD_STOP"]:
            if os.path.exists(stop_flag):
                print("🛑 Đã nhận lệnh DỪNG BOT từ file stop_sub3.flag.")
                system_config["SHOULD_STOP"] = True
                break
                
            iteration += 1
            
            # ===== FETCH DỮ LIỆU TỪ SÀN OKX =====
            if iteration % DATA_FETCH_INTERVAL == 0:
                for coin in system_config["ENABLED_COINS"]:
                    inst_id = COIN_MAP.get(coin)
                    if not inst_id:
                        continue
                    try:
                        # 1. Lấy giá live
                        ticker = okx_api.request("GET", "/api/v5/market/ticker", params={"instId": inst_id})
                        if ticker.get("data"):
                            coin_states[coin]["live_price"] = float(ticker["data"][0].get("last", 0))
                        
                        # 2. Kiểm tra vị thế đang mở
                        positions = okx_api.request("GET", "/api/v5/account/positions", params={"instType": "SWAP", "instId": inst_id})
                        has_long, has_short = False, False
                        entry_px, pnl_pct = 0, 0
                        
                        for pos in positions.get("data", []):
                            pos_side = pos.get("posSide", "")
                            pos_amt = float(pos.get("pos", "0"))
                            if pos_amt == 0:
                                continue
                            avg_px = float(pos.get("avgPx", "0"))
                            upl_ratio = float(pos.get("uplRatio", "0")) * 100  # Chuyển sang %
                            
                            if pos_side == "long" or (pos_side == "net" and pos_amt > 0):
                                has_long = True
                                entry_px = avg_px
                                pnl_pct = upl_ratio
                            elif pos_side == "short" or (pos_side == "net" and pos_amt < 0):
                                has_short = True
                                entry_px = avg_px
                                pnl_pct = upl_ratio
                        
                        coin_states[coin]["has_long"] = has_long
                        coin_states[coin]["has_short"] = has_short
                        coin_states[coin]["entry_px"] = entry_px
                        coin_states[coin]["pnl_pct"] = pnl_pct
                        
                        # 3. Klines & Trading Logic
                        cs = coin_strategies[coin]
                        
                        if not coin_states[coin]["warmup_done"]:
                            # --- WARM UP QUÁ KHỨ ---
                            htf_klines = fetch_klines(okx_api, inst_id, bar="1H", limit=200)
                            ltf_klines = fetch_klines(okx_api, inst_id, bar="5m", limit=300)
                            
                            if len(htf_klines) > 50 and len(ltf_klines) > 50:
                                cs.reset()
                                # Chạy giả lập thời gian từ nến 50 đến hiện tại
                                for i in range(50, len(ltf_klines)):
                                    ltf_slice = ltf_klines[:i+1]
                                    current_ts = ltf_slice[-1]['ts']
                                    # Lấy nến 1H có thời gian <= nến 5m hiện tại
                                    htf_slice = [k for k in htf_klines if k['ts'] <= current_ts]
                                    if len(htf_slice) >= 50:
                                        cs.get_signal(htf_slice, ltf_slice)
                                        
                                coin_states[coin]["warmup_done"] = True
                                print(f"✅ [{coin}] Warm-up xong. Trạng thái bắt được: {cs.state}")
                        else:
                            # --- REAL-TIME TRADING ---
                            # Chỉ cần 50 nến 1H và 10 nến 5m là đủ tính ATR và quét State hiện tại
                            htf_klines = fetch_klines(okx_api, inst_id, bar="1H", limit=60)
                            ltf_klines = fetch_klines(okx_api, inst_id, bar="5m", limit=30)
                            
                            if len(htf_klines) >= 50 and len(ltf_klines) > 0:
                                signal = cs.get_signal(htf_klines, ltf_klines)
                                if signal and "action" in signal:
                                    action = signal["action"]
                                    # Chống trùng lệnh
                                    if action == "LONG" and coin_states[coin]["has_long"]:
                                        pass
                                    elif action == "SHORT" and coin_states[coin]["has_short"]:
                                        pass
                                    else:
                                        print(f"\n🔥 [{coin}] TÍN HIỆU VÀO LỆNH: {signal}")
                                        try:
                                            # Hủy các lệnh chờ cũ cùng chiều
                                            pos_side = "long" if action == "LONG" else "short"
                                            clean_algo_orders(okx_api, inst_id, pos_side=pos_side)
                                            
                                            spec = fetch_spec(okx_api, inst_id)
                                            vol_usd = float(strategy_cfg.get("posVol", 20.0))
                                            entry_px = float(signal["entry"])
                                            
                                            lot_sz = float(spec.get("lotSz", 0.001))
                                            ct_val = float(spec.get("ctVal", 1.0))
                                            min_sz = float(spec.get("minSz", lot_sz))
                                            tick_sz = float(spec.get("tickSz", 0.1))
                                            
                                            if entry_px > 0 and ct_val > 0:
                                                raw_size = vol_usd / (entry_px * ct_val)
                                                order_size = max(min_sz, math.floor(raw_size / lot_sz) * lot_sz)
                                                sz_str = f"{order_size:.8f}".rstrip("0").rstrip(".")
                                                
                                                side = "buy" if action == "LONG" else "sell"
                                                print(f"🚀 [{coin}] Đặt lệnh {action} MARKET với {sz_str} lots.")
                                                
                                                # Vào lệnh Market
                                                entry_resp = place_market_entry(okx_api, inst_id, side=side, pos_side=pos_side, size=sz_str)
                                                if entry_resp:
                                                    print(f"✅ [{coin}] Đã khớp lệnh {action}.")
                                                    
                                                    # Tính và đặt TPSL
                                                    sl_rounded = math.floor(float(signal["sl"]) / tick_sz) * tick_sz
                                                    tp_rounded = math.floor(float(signal["tp"]) / tick_sz) * tick_sz
                                                    
                                                    sl_str = f"{sl_rounded:.8f}".rstrip("0").rstrip(".")
                                                    tp_str = f"{tp_rounded:.8f}".rstrip("0").rstrip(".")
                                                    
                                                    close_side = "sell" if action == "LONG" else "buy"
                                                    
                                                    print(f"🛡️ [{coin}] Đặt OCO: TP = {tp_str} | SL = {sl_str}")
                                                    # Đặt SL
                                                    place_algo_tpsl(okx_api, inst_id, close_side, pos_side, sz_str, sl_str, is_tp=False, cl_id="")
                                                    # Đặt TP
                                                    place_algo_tpsl(okx_api, inst_id, close_side, pos_side, sz_str, tp_str, is_tp=True, cl_id="")
                                                    
                                                    # Ghi lịch sử
                                                    trade_rec = {
                                                        "time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                                        "coin": coin,
                                                        "type": "Market",
                                                        "action": action,
                                                        "sz": sz_str,
                                                        "price": entry_px,
                                                        "tp": tp_str,
                                                        "sl": sl_str
                                                    }
                                                    history_path = env_paths.get("FILE_TRADE_HISTORY")
                                                    if history_path:
                                                        history_list = []
                                                        if os.path.exists(history_path):
                                                            try:
                                                                with open(history_path, "r", encoding="utf-8") as f:
                                                                    history_list = json.load(f)
                                                            except: pass
                                                        history_list.insert(0, trade_rec)
                                                        history_list = history_list[:100] # Giữ 100 lệnh mới nhất
                                                        with open(history_path, "w", encoding="utf-8") as f:
                                                            json.dump(history_list, f, ensure_ascii=False, indent=4)
                                        except Exception as ex:
                                            print(f"❌ [{coin}] Lỗi đặt lệnh: {ex}")
                        
                    except Exception as e:
                        if iteration <= DATA_FETCH_INTERVAL:
                            print(f"⚠️ [{coin}] Lỗi fetch dữ liệu: {e}")

            # ===== CẬP NHẬT STATE CỦA TỪNG COIN =====
            for coin in coin_states:
                cs = coin_strategies.get(coin)
                if cs:
                    coin_states[coin]["state"] = cs.state
                    coin_states[coin]["direction"] = cs.overlapDirection
            
            # ===== IN DASHBOARD =====
            if iteration % DASHBOARD_INTERVAL == 0:
                # Dùng strategy đầu tiên làm đại diện cho header
                main_strategy = list(coin_strategies.values())[0] if coin_strategies else strategy
                print_dashboard(main_strategy, env_paths, system_config, coin_states)
            
            # ===== CẬP NHẬT VÍ =====
            if iteration % WALLET_UPDATE_INTERVAL == 0:
                try:
                    update_wallet_metrics(okx_api, env_paths, system_config)
                except: pass
            
            time.sleep(1)
            
    except KeyboardInterrupt:
        print("🛑 Dừng bằng KeyboardInterrupt.")
    finally:
        if os.path.exists(pid_file):
            try:
                os.remove(pid_file)
            except Exception:
                pass
        print("✅ Đã tắt Bot Sub3 an toàn.")

if __name__ == "__main__":
    main()

