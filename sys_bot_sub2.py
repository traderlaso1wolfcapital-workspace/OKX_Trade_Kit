#!/usr/bin/env python3
"""
===============================================================================================
🏛️ LÕI HỆ THỐNG (STATIC ENGINE) — sys_bot_sub2.py
===============================================================================================
- Chức năng: Lưu trữ API (OKXRestCore), RAM State (AssetTracker) và Vòng lặp Hot-Reload.
- KIẾN TRÚC: Khung xương này bọc thép 100%. Không bao giờ tắt file này khi đang chạy.
===============================================================================================
"""

import os
import sys
import time
import importlib
import json
import threading
import subprocess
import queue
import concurrent.futures

try:
    import requests
    from dotenv import load_dotenv
except ModuleNotFoundError:
    print("⚠️ [Môi Trường Mới]: Thiếu thư viện. Đang tự động tải...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "requests", "python-dotenv"])
    import requests
    from dotenv import load_dotenv

# psutil chỉ dùng cho Single Instance Lock — nếu thiếu thì bỏ qua lock, không crash
try:
    import psutil
    HAS_PSUTIL = True
except ModuleNotFoundError:
    HAS_PSUTIL = False
    print("⚠️ [CẢNH BÁO]: Thiếu psutil. Single Instance Lock bị vô hiệu hóa.")

# ==============================================================================

from z_bot_sub2.bot_models import AssetTracker
from z_bot_sub2.bot_api import OKXRestCore

# 🚀 VÒNG LẶP CHÍNH (MAIN LOOP & HOT-RELOADER)
# ==============================================================================
# BIẾN MÔI TRƯỜNG DÙNG CHUNG CỦA HỆ THỐNG (Phạm vi toàn cục)
system_config = {
    "SHOULD_RESET_WALLET": False,
    "SHOULD_RESET_NEN": False,
    "LAST_EVOLUTION_TIMESTAMP": 0.0,
    "SHOULD_STOP": False,
    "STARTUP_CLEANUP_DONE": False
}

# ==============================================================================
# HÀNG ĐỢI I/O GHI FILE NGẦM (CHỐNG ĐỨNG MÁY)
# ==============================================================================
_bot_sub2_io_queue = queue.Queue()
sys._bot_sub2_io_queue = _bot_sub2_io_queue

class JSON_IO_Worker_Sub2(threading.Thread):
    def __init__(self, q):
        super().__init__(daemon=True)
        self.q = q
    def run(self):
        while True:
            try:
                func, args, kwargs = self.q.get()
                if func is None: break
                func(*args, **kwargs)
                self.q.task_done()
            except Exception as e:
                print(f"Lỗi IO Worker Sub2: {e}")

_io_thread = JSON_IO_Worker_Sub2(_bot_sub2_io_queue)
_io_thread.start()
# ==============================================================================

def main():
    global system_config
    print('🚀 TLS1_COMPANY: BOT SUB2 ĐÃ ĐƯỢC CẬP NHẬT KIẾN TRÚC V2!')
    if sys.platform == 'win32': pass
    
    # Khởi tạo lại trạng thái cờ dừng và reset khi chạy mới
    system_config["SHOULD_STOP"] = False
    system_config["SHOULD_RESET_WALLET"] = False
    system_config["SHOULD_RESET_NEN"] = False
    system_config["LAST_EVOLUTION_TIMESTAMP"] = 0.0
    system_config["STARTUP_CLEANUP_DONE"] = False
    system_config["BOT_START_TIME"] = time.time()
    
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for _ in range(4):
            if os.path.isdir(os.path.join(base_dir, "z_bot_sub2")):
                break
            base_dir = os.path.dirname(base_dir)

    local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
    user_data_dir = os.path.join(local_app_data, 'TLS1_Trading')

    if getattr(sys, 'frozen', False):
        CURRENT_DIR = os.path.dirname(sys.executable)
    else:
        CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))

    env_arg = sys.argv[1] if len(sys.argv) > 1 else ".api_sub2"
    env_basename = os.path.basename(env_arg)
    
    # Tìm file ở nhiều đường dẫn khả thi (ưu tiên user_data_dir trước)
    possible_paths = [
        os.path.join(user_data_dir, "z_bot_sub2", env_basename),
        os.path.join(user_data_dir, env_basename),
        os.path.join(base_dir, "z_bot_sub2", env_basename),
        os.path.join(base_dir, env_basename),
    ]
    
    env_file = None
    for p in possible_paths:
        if os.path.exists(p):
            env_file = p
            break
            
    if not env_file:
        print(f"❌ [LỖI CONFIG]: Chưa cấu hình API Keys cho Bot Sub 2!")
        print(f"💡 HƯỚNG DẪN SỬA LỖI: Vui lòng mở App -> Vào Tab 'Cấu hình Sub 2' -> Nhập OKX API Key/Secret/Passphrase -> Bấm '💾 Lưu Cấu Hình API' trước khi bật Bot!")
        sys.exit(1)
        
    acc_name = os.path.basename(env_file).replace(".api_sub2", "").replace(".api", "").replace("_", "")
    if acc_name == "": acc_name = "sub2"

    # Tải API keys
    api_key, secret_key, passphrase = "", "", ""
    is_demo = False
    with open(env_file, "r") as f:
        for line in f:
            if "=" in line:
                k, v = line.strip().split("=", 1)
                v = v.strip("\"'")
                if k == "OKX_API_KEY": api_key = v
                elif k == "OKX_SECRET_KEY": secret_key = v
                elif k == "OKX_PASSPHRASE": passphrase = v
                elif k == "OKX_IS_DEMO": is_demo = (v.lower() == "true")

    if not api_key or not secret_key or not passphrase:
        fallback_files = [
            os.path.join(os.path.dirname(env_file), ".api_sub1"),
            os.path.join(user_data_dir, "z_bot_sub1", ".api_sub1"),
            os.path.join(user_data_dir, "z_bot_sub2", ".api_sub1")
        ]
        for fpath in fallback_files:
            if os.path.exists(fpath) and fpath != env_file:
                try:
                    with open(fpath, "r", encoding="utf-8") as f:
                        for line in f:
                            if "=" in line:
                                k, v = line.strip().split("=", 1)
                                v = v.strip("\"'")
                                if k == "OKX_API_KEY": api_key = v
                                elif k == "OKX_SECRET_KEY": secret_key = v
                                elif k == "OKX_PASSPHRASE": passphrase = v
                                elif k == "OKX_IS_DEMO": is_demo = (v.lower() == "true")
                    if api_key and secret_key and passphrase:
                        print(f"💡 [API KEY FALLBACK]: Đã tự động đọc API Key từ [{os.path.basename(fpath)}] cho Bot Sub 2!")
                        break
                except: pass

    if not api_key or not secret_key or not passphrase: 
        raise ValueError(f"❌ Thiếu API Key trong file {env_file}! Dừng hệ thống.")

    # =========================================================================
    # 🔒 SINGLE INSTANCE LOCK — Ngăn chặn chạy 2 bot cùng tài khoản
    # =========================================================================
    sub2_dir = os.path.join(user_data_dir, "z_bot_sub2")
    JSON_DATA_DIR = os.path.join(sub2_dir, "json_data")
    os.makedirs(JSON_DATA_DIR, exist_ok=True)
    lock_file = os.path.join(JSON_DATA_DIR, f"{acc_name}.pid")
    
    if HAS_PSUTIL:
        if os.path.exists(lock_file):
            try:
                with open(lock_file, "r") as f:
                    old_pid = int(f.read().strip())
                if psutil.pid_exists(old_pid):
                    old_proc = psutil.Process(old_pid)
                    old_name = old_proc.name()
                    print(f"\n{'='*80}")
                    print(f"🚫 CẢNH BÁO: Bot tài khoản [{acc_name}] đang chạy ở tiến trình khác!")
                    print(f"   PID: {old_pid} | Tên: {old_name}")
                    print("   Vui lòng tắt tiến trình đó trước khi bắt đầu phiên mới.")
                    print(f"   File lock: {lock_file}")
                    print(f"{'='*80}\n")
                    sys.exit(1)
                else:
                    print(f"🧹 [LOCK] PID {old_pid} không còn tồn tại. Dọn dẹp lock cũ...")
                    os.remove(lock_file)
            except (ValueError, psutil.NoSuchProcess):
                print("🧹 [LOCK] File lock cũ không hợp lệ. Dọn dẹp...")
                os.remove(lock_file)
        
        current_pid = os.getpid()
        with open(lock_file, "w") as f:
            f.write(str(current_pid))
        
        import atexit
        def _cleanup_lock():
            try:
                if os.path.exists(lock_file):
                    lock_pid = int(open(lock_file).read().strip())
                    if lock_pid == current_pid:
                        os.remove(lock_file)
            except:
                pass
        atexit.register(_cleanup_lock)
        print(f"🔒 [LOCK] Đã khóa phiên duy nhất cho tài khoản [{acc_name}] (PID: {current_pid})")
    else:
        print(f"⚠️ [LOCK] Single Instance Lock bị vô hiệu hóa (thiếu psutil). Không thể ngăn chặn chạy trùng.")

    config_filename = f"{acc_name}_global_config.json"
    env_paths = {
        "FILE_GLOBAL_CONFIG": os.path.join(JSON_DATA_DIR, config_filename),
        "JSON_EVOLUTION_DATA_FILE": os.path.join(JSON_DATA_DIR, f"{acc_name}_du_lieu_tien_hoa.json"),
        "FILE_MTF_STATES": os.path.join(JSON_DATA_DIR, f"{acc_name}_mtf_states.json"),
        "ENV_NAME": env_file,
        "ENV_FILE_NAME": env_file
    }

    if not os.path.exists(env_paths["FILE_GLOBAL_CONFIG"]):
        try:
            default_sub2_cfg = {
                "ENABLED_COINS": ["XAU", "BTC", "ETH"],
                "ENABLE_STRATEGY_SMC": True,
                "TIMEFRAME_BASE": "1H",
                "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
                "OB_RR_RATIO_TREND": "5.00",
                "OB_RR_RATIO_COUNTER": "1.00",
                "USE_DYNAMIC_RISK": False,
                "RISK_PER_TRADE_PCT": "0.0050",
                "SMC_MODE": "All Setups",
                "SMC_STYLE": "Normal",
                "OB_SOURCE": "ALL",
                "OB_DIRECTION": "BOTH",
                "OB_TP_MODE": "RR"
            }
            with open(env_paths["FILE_GLOBAL_CONFIG"], "w", encoding="utf-8") as f:
                json.dump(default_sub2_cfg, f, indent=4)
        except Exception: pass

    # Dọn sạch các file flag cũ của tài khoản này
    for flag_name in ["stop", "reset_wallet", "reset_nen"]:
        flag_file = os.path.join(JSON_DATA_DIR, f"{flag_name}_{acc_name}.flag")
        if os.path.exists(flag_file):
            try: os.remove(flag_file)
            except: pass

    client = OKXRestCore(api_key, secret_key, passphrase, is_demo)
    state_matrix = {}

    import z_bot_sub2.bot_sub2 as bot_sub2
    import z_bot_sub2.bot_config as bot_config
    
    try: client.request("POST", "/api/v5/account/set-position-mode", body={"posMode": "long_short"})
    except: pass
    try:
        res = client.request("GET", "/api/v5/account/config")
        pMode = res["data"][0].get("posMode", "net_mode") if (res and "data" in res and res["data"]) else "net_mode"
    except:
        pMode = "net_mode"
    client.pMode = pMode

    for cfg in bot_config.COIN_PORTFOLIO:
        try: client.request("POST", "/api/v5/account/set-leverage", body={"instId": cfg["swap"], "lever": str(bot_config.LEVERAGE), "mgnMode": bot_config.POSITION_MODE})
        except: pass
        tk = AssetTracker()
        tk.swap_id = cfg["swap"]
        tk.coin_name = cfg["coin"]
        state_matrix[cfg["swap"]] = tk

    # Luồng nhập Terminal
    import z_bot_sub2.bot_terminal as bot_terminal
    bot_terminal.start_terminal_listener(system_config)

    # Kiểm tra số dư 2 ví OKX
    try:
        trading_resp = client.request("GET", "/api/v5/account/balance")
        trading_usdt = 0.0
        if trading_resp and "data" in trading_resp and trading_resp["data"]:
            for d in trading_resp["data"][0].get("details", []):
                if d.get("ccy") == "USDT":
                    trading_usdt = float(d.get("availEq", "0"))
                    break
        
        funding_resp = client.request("GET", "/api/v5/asset/balances", params={"ccy": "USDT"})
        funding_usdt = 0.0
        if funding_resp and "data" in funding_resp and funding_resp["data"]:
            for d in funding_resp["data"]:
                if d.get("ccy") == "USDT":
                    funding_usdt = float(d.get("availBal", "0"))
                    break
                    
        print(f"\n💰 [SỐ DƯ TÀI KHOẢN] Ví Giao dịch (Trading): {trading_usdt:.2f} USDT | Ví Cấp vốn (Funding): {funding_usdt:.2f} USDT")
        if trading_usdt < 10:
            print("⚠️ [CẢNH BÁO] Số dư ví Trading quá thấp (Dưới 10 USDT)!")
            if funding_usdt > 0:
                print("💡 [HƯỚNG DẪN] Tiền của bạn đang nằm ở ví Funding! Hãy mở App OKX -> Chọn 'Chuyển tiền' (Transfer) sang ví Giao dịch (Trading) để Bot hoạt động.")
            else:
                print("💡 [HƯỚNG DẪN] Cả 2 ví đều cạn kiệt USDT. Vui lòng nạp thêm tiền vào ví Trading.")
    except Exception as e:
        print(f"⚠️ [LỖI API] Không thể kiểm tra số dư ví OKX: {e}")

    print(f"\n✅  SMC ORDER BLOCK BOT KHỞI ĐỘNG TRÊN [{env_file}]...")

    # Nạp cấu hình JSON ngay khi khởi động
    bot_sub2.load_global_config_from_json(env_paths, bot_config)

    last_realtime_scan, last_limit_setup, last_dashboard_update = 0.0, 0.0, 0.0
    try:
        last_logic_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_sub2.py"))
        last_ui_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_ui.py"))
        last_cfg_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py"))
    except FileNotFoundError:
        last_logic_mtime, last_ui_mtime, last_cfg_mtime = 0.0, 0.0, 0.0

    last_config_mtime = 0.0
    config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
    if config_path and os.path.exists(config_path):
        last_config_mtime = os.path.getmtime(config_path)

    import z_bot_sub2.bot_ui as bot_ui

    while True:
        try:
            # --- STARTUP CLEANUP ---
            if not system_config.get("STARTUP_CLEANUP_DONE", False):
                bot_sub2.cleanup_all_orders_on_startup(client, bot_sub2.COIN_PORTFOLIO)
                system_config["STARTUP_CLEANUP_DONE"] = True
                time.sleep(2)
                
            # 1. BỘ LẮNG NGHE LỆNH (IPC) TỪ GUI
            stop_flag = os.path.join(JSON_DATA_DIR, f"stop_{acc_name}.flag")
            if os.path.exists(stop_flag) or system_config["SHOULD_STOP"]:
                print(f"\n🛑 Nhận tín hiệu DỪNG TỪ GUI hoặc Terminal. Đang tắt Bot tài khoản [{acc_name}]...")
                sys.exit(0)
                
            reset_wallet_flag = os.path.join(JSON_DATA_DIR, f"reset_wallet_{acc_name}.flag")
            if os.path.exists(reset_wallet_flag) or system_config["SHOULD_RESET_WALLET"]:
                system_config["SHOULD_RESET_WALLET"] = False
                try: os.remove(reset_wallet_flag)
                except: pass
                print("Đã reset Wallet (chờ cập nhật metric).")

            reset_nen_flag = os.path.join(JSON_DATA_DIR, f"reset_nen_{acc_name}.flag")
            if os.path.exists(reset_nen_flag) or system_config["SHOULD_RESET_NEN"]:
                system_config["SHOULD_RESET_NEN"] = True
                try: os.remove(reset_nen_flag)
                except: pass
                print("Đã kích hoạt reset nến SMC.")

            now = time.time()
            
            # 2. HOT RELOADER
            try:
                curr_logic_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_sub2.py"))
                curr_ui_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_ui.py"))
                curr_cfg_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py"))
            except FileNotFoundError:
                curr_logic_mtime, curr_ui_mtime, curr_cfg_mtime = 0.0, 0.0, 0.0
            
            if curr_logic_mtime > last_logic_mtime:
                try:
                    # Force-reload bot_models trước để tránh stale cache khi bot_sub2 thay đổi
                    import sys as _sys
                    for _mod_name in list(_sys.modules.keys()):
                        if 'z_bot_sub2' in _mod_name and _mod_name != 'z_bot_sub2.bot_api':
                            del _sys.modules[_mod_name]
                    import z_bot_sub2.bot_sub2 as bot_sub2  # re-import fresh
                    import z_bot_sub2.bot_config as bot_config  # re-import fresh
                    last_logic_mtime = curr_logic_mtime
                    print("\n🔄 Đã Hot-Reload z_bot_sub2.bot_sub2 thành công!")
                    # ⚡ TWO-WAY SYNC: Nếu bot_config.py mới hơn JSON → ghi đè JSON
                    json_config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
                    cfg_py_path = os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py")
                    if os.path.exists(cfg_py_path) and os.path.exists(json_config_path):
                        cfg_py_mtime = os.path.getmtime(cfg_py_path)
                        json_cfg_mtime = os.path.getmtime(json_config_path)
                        if cfg_py_mtime > json_cfg_mtime:
                            bot_sub2.sync_config_to_json(env_paths, bot_config)
                except Exception as e: print(f"❌ Lỗi Hot-Reload bot_sub2: {e}")

            if curr_ui_mtime > last_ui_mtime:
                try:
                    importlib.reload(bot_ui)
                    last_ui_mtime = curr_ui_mtime
                    print("\n🔄 Đã Hot-Reload z_bot_sub2.bot_ui thành công!")
                except Exception as e: print(f"❌ Lỗi Hot-Reload bot_ui: {e}")

            if curr_cfg_mtime > last_cfg_mtime:
                try:
                    importlib.reload(bot_config)
                    last_cfg_mtime = curr_cfg_mtime
                    print("\n🔄 Đã Hot-Reload z_bot_sub2.bot_config thành công!")
                    # ⚡ TWO-WAY SYNC: Nếu bot_config.py mới hơn JSON → ghi đè JSON
                    json_config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
                    cfg_py_path = os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py")
                    if os.path.exists(cfg_py_path) and os.path.exists(json_config_path):
                        cfg_py_mtime = os.path.getmtime(cfg_py_path)
                        json_cfg_mtime = os.path.getmtime(json_config_path)
                        if cfg_py_mtime > json_cfg_mtime:
                            bot_sub2.sync_config_to_json(env_paths, bot_config)
                            last_config_mtime = os.path.getmtime(json_config_path)
                except Exception as e: print(f"❌ Lỗi Hot-Reload bot_config: {e}")

            # ⚙️ ĐỒNG BỘ CẤU HÌNH ĐỘNG TỪ FILE JSON CỦA GUI (Sub2 SMC)
            if config_path and os.path.exists(config_path):
                cfg_mtime = os.path.getmtime(config_path)
                if cfg_mtime > last_config_mtime:
                    try:
                        bot_sub2.load_global_config_from_json(env_paths, bot_config)
                        last_config_mtime = cfg_mtime
                        print("\n♻️ [HỆ THỐNG]: Đã tự động đồng bộ cấu hình mới từ file JSON (Sub2 SMC)!")
                    except Exception as e: print(f"❌ Lỗi Hot-Reload JSON: {e}")

            # 3. STATIC HEARTBEAT: RUN_STRATEGY_CYCLE (10 giây)
            if now - last_realtime_scan >= 10.0:
                last_realtime_scan = now
                is_limit_setup_cycle = False
                if now - last_limit_setup >= 30.0:
                    is_limit_setup_cycle = True
                    last_limit_setup = now

                # --- Xử lý đa luồng (Multi-threading) chống trễ mạng (Sub1 Engine Pattern) ---
                if not hasattr(sys, '_bot_sub2_executor'):
                    sys._bot_sub2_executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(32, len(bot_config.COIN_PORTFOLIO) * 2))
                
                try:
                    with open(env_paths["FILE_GLOBAL_CONFIG"], "r", encoding="utf-8") as f:
                        _gcfg = json.load(f)
                        enabled_coins = _gcfg.get("ENABLED_COINS", ["XAU", "BTC", "ETH"])
                except:
                    enabled_coins = getattr(bot_config, "ENABLED_COINS", ["XAU", "BTC", "ETH"])
                
                futures = []
                for cfg in bot_config.COIN_PORTFOLIO:
                    is_enabled = cfg.get("coin", "") in enabled_coins
                    futures.append(sys._bot_sub2_executor.submit(
                        bot_sub2.run_strategy_cycle,
                        client, cfg, pMode, state_matrix, env_paths, system_config, is_limit_setup_cycle, is_enabled
                    ))
                concurrent.futures.wait(futures)

            # 4. CẬP NHẬT GIAO DIỆN TERMINAL (20 giây)
            if now - last_dashboard_update >= 20.0:
                last_dashboard_update = now
                bot_ui.print_dashboard(state_matrix, env_paths)

            time.sleep(0.1)

        except KeyboardInterrupt:
            print("\n🛑 Người dùng đã bấm Ctrl+C, Dừng lại toàn bộ.")
            break
        except Exception as e:
            import traceback
            print(f"\n❌ LỖI VÒNG LẶP CHÍNH (sys_bot_sub2): {e}\n{traceback.format_exc()}")
            time.sleep(1)

if __name__ == "__main__":
    main()# z1950 | Đổi đuôi mở rộng file chứa khoá API từ .env sang .api để tăng tính bảo mật, tránh nhầm lẫn
