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
    "SHOULD_STOP": False
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
    if sys.platform == 'win32': os.system('chcp 65001 >nul')
    
    # Khởi tạo lại trạng thái cờ dừng và reset khi chạy mới
    system_config["SHOULD_STOP"] = False
    system_config["SHOULD_RESET_WALLET"] = False
    system_config["SHOULD_RESET_NEN"] = False
    system_config["LAST_EVOLUTION_TIMESTAMP"] = 0.0
    
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
        # Khi đóng gói, file cấu hình API nằm trong thư mục dữ liệu người dùng
        local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
        user_data_dir = os.path.join(local_app_data, 'TLS1_Trading')
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for _ in range(4):
            if os.path.isdir(os.path.join(base_dir, "z_bot_sub2")):
                break
            base_dir = os.path.dirname(base_dir)
        user_data_dir = base_dir

    env_arg = sys.argv[1] if len(sys.argv) > 1 else ".env_sub2"
    env_basename = os.path.basename(env_arg)
    
    # Thử tìm file ở user_data_dir trước (nơi GUI lưu), rồi mới fallback về base_dir
    env_file = os.path.join(user_data_dir, "z_bot_sub2", env_basename)
    if not os.path.exists(env_file):
        env_file = os.path.join(base_dir, "z_bot_sub2", env_basename)
    
    if not os.path.exists(env_file):
        print(f"❌ [LỖI] Không tìm thấy file cấu hình API: {env_file}")
        print("Vui lòng tạo file .env_sub2 trong thư mục z_bot_sub2 hoặc chỉ định đúng file.")
        sys.exit(1)
        
    acc_name = os.path.basename(env_file).replace(".env_sub2", "").replace(".env", "").replace("_", "")
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
        raise ValueError(f"❌ Thiếu API Key trong file {env_file}! Dừng hệ thống.")

    # =========================================================================
    # 🔒 SINGLE INSTANCE LOCK — Ngăn chặn chạy 2 bot cùng tài khoản
    # =========================================================================
    lock_file = os.path.join("json_data", f"{acc_name}.pid")
    os.makedirs("json_data", exist_ok=True)
    
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

    if getattr(sys, 'frozen', False):
        CURRENT_DIR = os.path.dirname(sys.executable)
    else:
        CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
    
    JSON_DATA_DIR = os.path.join(CURRENT_DIR, "json_data")
    os.makedirs(JSON_DATA_DIR, exist_ok=True)

    env_paths = {
        "FILE_GLOBAL_CONFIG": os.path.join(JSON_DATA_DIR, f"{acc_name}_global_config.json"),
        "JSON_EVOLUTION_DATA_FILE": os.path.join(JSON_DATA_DIR, f"{acc_name}_du_lieu_tien_hoa.json"),
        "FILE_MTF_STATES": os.path.join(JSON_DATA_DIR, f"{acc_name}_mtf_states.json"),
        "ENV_NAME": env_file,
        "ENV_FILE_NAME": env_file
    }

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
    pMode = client.request("GET", "/api/v5/account/config")["data"][0].get("posMode", "net_mode")

    for cfg in bot_config.COIN_PORTFOLIO:
        try: client.request("POST", "/api/v5/account/set-leverage", body={"instId": cfg["swap"], "lever": str(bot_config.POSITION_LEVERAGE), "mgnMode": bot_config.POSITION_MODE})
        except: pass
        tk = AssetTracker()
        tk.swap_id = cfg["swap"]
        tk.coin_name = cfg["coin"]
        state_matrix[cfg["swap"]] = tk

    # Luồng nhập Terminal
    import z_bot_sub2.bot_terminal as bot_terminal
    bot_terminal.start_terminal_listener(system_config)

    print(f"\n✅  SMC ORDER BLOCK BOT KHỞI ĐỘNG TRÊN [{env_file}]...")

    # Nạp cấu hình JSON ngay khi khởi động
    bot_sub2.load_global_config_from_json(env_paths, bot_config)

    last_realtime_scan, last_limit_setup, last_dashboard_update = 0.0, 0.0, 0.0
    last_logic_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_sub2.py"))
    last_ui_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_ui.py"))
    last_cfg_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py"))

    last_config_mtime = 0.0
    config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
    if config_path and os.path.exists(config_path):
        last_config_mtime = os.path.getmtime(config_path)

    import z_bot_sub2.bot_ui as bot_ui

    while True:
        try:
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
            curr_logic_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_sub2.py"))
            curr_ui_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_ui.py"))
            curr_cfg_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub2", "bot_config.py"))
            
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

            # 3. STATIC HEARTBEAT: RUN_STRATEGY_CYCLE (2 giây)
            if now - last_realtime_scan >= 2.0:
                last_realtime_scan = now
                is_limit_setup_cycle = False
                if now - last_limit_setup >= 30.0:
                    is_limit_setup_cycle = True
                    last_limit_setup = now

                # CHẠY ĐA LUỒNG (THREAD POOL) THAY VÌ FOR LOOP TUẦN TỰ
                with concurrent.futures.ThreadPoolExecutor(max_workers=len(bot_config.COIN_PORTFOLIO)) as executor:
                    futures = []
                    for cfg in bot_config.COIN_PORTFOLIO:
                        futures.append(executor.submit(
                            bot_sub2.run_strategy_cycle,
                            client, cfg, pMode, state_matrix, env_paths, system_config, is_limit_setup_cycle
                        ))
                    
                    # Chờ tất cả quét xong
                    for future in concurrent.futures.as_completed(futures):
                        try:
                            future.result()
                        except Exception as e:
                            print(f"Error in ThreadPool run_strategy_cycle: {e}")

            # 4. CẬP NHẬT GIAO DIỆN TERMINAL (20 giây)
            if now - last_dashboard_update >= 20.0:
                last_dashboard_update = now
                bot_ui.update_wallet_metrics(client, env_paths, system_config)
                bot_ui.print_dashboard(state_matrix, env_paths)

            time.sleep(0.1)

        except KeyboardInterrupt:
            print("\n🛑 Người dùng đã bấm Ctrl+C, Dừng lại toàn bộ.")
            break
        except Exception:
            time.sleep(1)

if __name__ == "__main__":
    main()