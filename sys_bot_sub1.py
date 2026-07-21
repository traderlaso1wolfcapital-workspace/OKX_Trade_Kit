#!/usr/bin/env python3
"""
===============================================================================================
🏛️ LÕI HỆ THỐNG (STATICAL ENGINE) — sys_bot_sub1.py
===============================================================================================
- Chức năng: Lưu trữ API (OKXRestCore), RAM State (AssetTracker) và Vòng lặp Hot-Reload.
- KIẾN TRÚC HFT: Khung xương này bọc thép 100%. Không bao giờ tắt file này khi đang chạy.
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

# ==============================================================================
from z_bot_sub1.bot_models import AssetTracker
from z_bot_sub1.bot_api import OKXRestCore

# 🚀 VÒNG LẶP CHÍNH (MAIN LOOP & HOT-RELOADER)
# ==============================================================================
# BIẾN MÔI TRƯỜNG DÙNG CHUNG CỦA HỆ THỐNG (Phạm vi toàn cục)
system_config = {
    "SHOULD_RESET_WALLET": False,
    "SHOULD_RESET_NEN": False,
    "LAST_EVOLUTION_TIMESTAMP": 0.0,
    "SHOULD_STOP": False
}

def main():
    global system_config
    if sys.platform == 'win32': os.system('chcp 65001 >nul')
    
    # --- Khởi tạo Hàng đợi & Luồng chạy ngầm cho I/O JSON ---
    if not hasattr(sys, '_bot_sub1_io_queue'):
        setattr(sys, '_bot_sub1_io_queue', queue.Queue())
        def _io_worker():
            while True:
                task = sys._bot_sub1_io_queue.get()
                if task is None: break
                try:
                    func, args, kwargs = task
                    func(*args, **kwargs)
                except Exception as e:
                    print(f"⚠️ [I/O Thread Lỗi]: {e}")
                finally:
                    sys._bot_sub1_io_queue.task_done()
        _io_thread = threading.Thread(target=_io_worker, daemon=True, name="JSON_IO_Worker")
        _io_thread.start()
        setattr(sys, '_bot_sub1_io_thread', _io_thread)
    # ---------------------------------------------------------
    
    # Khởi tạo lại trạng thái cờ dừng và reset khi chạy mới
    system_config["SHOULD_STOP"] = False
    system_config["SHOULD_RESET_WALLET"] = False
    system_config["SHOULD_RESET_NEN"] = False
    system_config["LAST_EVOLUTION_TIMESTAMP"] = 0.0
    
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
        # Khi đóng gói, file cấu hình API nằm trong thư mục dữ liệu người dùng
        # (cùng chỗ mà GUI lưu vào), KHÔNG nằm trong app bundle
        local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
        user_data_dir = os.path.join(local_app_data, 'TLS1_Trading')
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for _ in range(4):
            if os.path.isdir(os.path.join(base_dir, "z_bot_sub1")):
                break
            base_dir = os.path.dirname(base_dir)
        user_data_dir = base_dir

    env_arg = sys.argv[1] if len(sys.argv) > 1 else ".env_sub1"
    env_basename = os.path.basename(env_arg)
    
    # Thử tìm file ở user_data_dir trước (nơi GUI lưu), rồi mới fallback về base_dir
    env_file = os.path.join(user_data_dir, "z_bot_sub1", env_basename)
    if not os.path.exists(env_file):
        env_file = os.path.join(base_dir, "z_bot_sub1", env_basename)
    
    if not os.path.exists(env_file):
        print(f"❌ [LỖI] Không tìm thấy file cấu hình API: {env_file}")
        print("Vui lòng tạo file .env_sub1 trong thư mục z_bot_sub1 hoặc chỉ định đúng file.")
        sys.exit(1)
        
    acc_name = os.path.basename(env_file).replace(".env_sub1", "").replace(".env", "").replace("_", "")
    if acc_name == "": acc_name = "sub1"

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
    lock_file = os.path.join(user_data_dir, "json_data", f"{acc_name}.pid")
    os.makedirs(os.path.join(user_data_dir, "json_data"), exist_ok=True)
    
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

    JSON_DATA_DIR = os.path.join(user_data_dir, "json_data")
    os.makedirs(JSON_DATA_DIR, exist_ok=True)

    env_paths = {
        "FILE_GLOBAL_CONFIG": os.path.join(JSON_DATA_DIR, f"{acc_name}_global_config.json"),
        "JSON_EVOLUTION_DATA_FILE": os.path.join(JSON_DATA_DIR, f"{acc_name}_du_lieu_tien_hoa.json"),
        "FILE_TRADE_HISTORY": os.path.join(JSON_DATA_DIR, f"{acc_name}_lich_su_tien_hoa_chi_tiet.json"),
        "FILE_RSI_BEHAVIOR": os.path.join(JSON_DATA_DIR, f"{acc_name}_hanh_vi_rsi_macro.json"),
        "FILE_WAIT_LOG": os.path.join(JSON_DATA_DIR, f"{acc_name}_nhat_ky_phien_cho_doi.json"),
        "FILE_GEOMETRY_EMA": os.path.join(JSON_DATA_DIR, f"{acc_name}_du_lieu_hoc_geometry_ema.json"),
        "FILE_MTF_STATES": os.path.join(JSON_DATA_DIR, f"{acc_name}_mtf_states.json"),
        "ENV_NAME": env_file,
        "ENV_FILE_NAME": env_file
    }

    for path in [env_paths["FILE_RSI_BEHAVIOR"], env_paths["FILE_WAIT_LOG"]]:
        if not os.path.exists(path):
            with open(path, "w", encoding="utf-8") as f: f.write("[]" if "nhat_ky" in path else "{}")


    # Dọn sạch các file flag cũ của tài khoản này khi khởi động lại bot để tránh tình trạng nhận diện nhầm lệnh dừng từ phiên cũ
    for flag_name in ["stop", "reset_wallet", "reset_nen"]:
        flag_file = os.path.join(JSON_DATA_DIR, f"{flag_name}_{acc_name}.flag")
        if os.path.exists(flag_file):
            try: os.remove(flag_file)
            except: pass

    client = OKXRestCore(api_key, secret_key, passphrase, is_demo)
    state_matrix = {}

    import z_bot_sub1.bot_sub1 as bot_sub1 # Lần nạp module đầu tiên
    
    try: client.request("POST", "/api/v5/account/set-position-mode", body={"posMode": "long_short"})
    except: pass
    pMode = client.request("GET", "/api/v5/account/config")["data"][0].get("posMode", "net_mode")

    for cfg in bot_sub1.COIN_PORTFOLIO:
        try: client.request("POST", "/api/v5/account/set-leverage", body={"instId": cfg["swap"], "lever": str(cfg["leverage"]), "mgnMode": "cross"})
        except: pass
        state_matrix[cfg["swap"]] = AssetTracker()

    # Luồng nhập Terminal
    import z_bot_sub1.bot_terminal as bot_terminal
    bot_terminal.start_terminal_listener(system_config)

    bot_sub1.update_wallet_metrics(client, env_paths, system_config)
    bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
    system_config["LAST_EVOLUTION_TIMESTAMP"] = time.time()

    print("\n✅  SYSTEM EMA 200 v23.0 [DUAL-CORE PURE LIMIT] KHỞI ĐỘNG...")
    bot_sub1.send_telegram_notification(f"🤖 Bot v23.0 PURE LIMIT CROSS đã kích hoạt trên {env_file}! Cấu trúc Dual-Core chống mất trạng thái.")

    last_realtime_scan, last_limit_setup, last_dashboard_update = 0.0, 0.0, 0.0
    last_logic_mtime = os.path.getmtime(os.path.join(CURRENT_DIR, "z_bot_sub1", "bot_sub1.py"))
    
    last_config_mtime = 0.0
    config_path = env_paths["FILE_GLOBAL_CONFIG"]
    if os.path.exists(config_path):
        last_config_mtime = os.path.getmtime(config_path)

    while True:
        # Hỗ trợ dừng bot từ GUI
        if system_config.get("SHOULD_STOP", False):
            print("\n🛑 [HỆ THỐNG DỪNG]: Đã nhận tín hiệu tắt bot từ GUI.")
            break

        try:
            current_now = time.time()
            # --- THE START OF GUI IPC FLAGS ---
            try:
                stop_flag_path = os.path.join(JSON_DATA_DIR, f"stop_{acc_name}.flag")
                if os.path.exists(stop_flag_path):
                    system_config["SHOULD_STOP"] = True
                    try: os.remove(stop_flag_path)
                    except: pass

                reset_wallet_flag_path = os.path.join(JSON_DATA_DIR, f"reset_wallet_{acc_name}.flag")
                if os.path.exists(reset_wallet_flag_path):
                    system_config["SHOULD_RESET_WALLET"] = True
                    try: os.remove(reset_wallet_flag_path)
                    except: pass

                reset_nen_flag_path = os.path.join(JSON_DATA_DIR, f"reset_nen_{acc_name}.flag")
                if os.path.exists(reset_nen_flag_path):
                    system_config["SHOULD_RESET_NEN"] = True
                    try: os.remove(reset_nen_flag_path)
                    except: pass
            except: pass
            # --- THE END OF GUI IPC FLAGS ---

            
            # 🧹 XỬ LÝ LỆNH RESET NẾN TỪ TERMINAL
            if system_config.get("SHOULD_RESET_NEN", False):
                system_config["SHOULD_RESET_NEN"] = False
                # Xóa file JSON cache cũ
                mtf_file = env_paths.get("FILE_MTF_STATES")
                if mtf_file and os.path.exists(mtf_file):
                    try: os.remove(mtf_file)
                    except: pass

                print("\n🔄 [RESET_NEN → REPLAY]: Đang tái dựng lịch sử từ OKX cho toàn bộ coin...")
                for sid, tk in state_matrix.items():
                    coin_label = next((c["coin"] for c in bot_sub1.COIN_PORTFOLIO if c["swap"] == sid), sid)
                    print(f"\n[{coin_label}]")
                    if hasattr(tk, "mtf_states"):
                        tk.mtf_states = {
                            "M5": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                            "M15": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                            "M30": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                            "H1": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                            "H2": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False},
                            "H4": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False}
                        }
                    # Reset các field cũ để đồng bộ
                    tk.last_candle_timestamp = 0
                    tk.accum_candle_count = 0
                    tk.cycle_fail_count = 0
                    tk.back_count = 0
                    tk.forth_count = 0

                bot_sub1.print_dashboard(state_matrix, env_paths, system_config)
                print("\n✅ [REPLAY HOÀN TẤT]: Dashboard đã phản ánh chính xác từ lịch sử sàn!")


            # 🔥 HOT-RELOAD CHECKER
            logic_path = os.path.join(CURRENT_DIR, "z_bot_sub1", "bot_sub1.py")
            current_mtime = os.path.getmtime(logic_path)
            
            config_path_hot = os.path.join(CURRENT_DIR, "z_bot_sub1", "bot_config.py")
            ui_path_hot = os.path.join(CURRENT_DIR, "z_bot_sub1", "bot_ui.py")
            if os.path.exists(config_path_hot) and os.path.getmtime(config_path_hot) > current_mtime: current_mtime = os.path.getmtime(config_path_hot)
            if os.path.exists(ui_path_hot) and os.path.getmtime(ui_path_hot) > current_mtime: current_mtime = os.path.getmtime(ui_path_hot)

            if current_mtime > last_logic_mtime:
                importlib.reload(sys.modules.get('z_bot_sub1.bot_config', sys.modules.get('bot_config'))) if 'z_bot_sub1.bot_config' in sys.modules or 'bot_config' in sys.modules else None
                importlib.reload(sys.modules.get('z_bot_sub1.bot_ui', sys.modules.get('bot_ui'))) if 'z_bot_sub1.bot_ui' in sys.modules or 'bot_ui' in sys.modules else None
                importlib.reload(bot_sub1) # XÓA SẠCH VÀ NẠP LẠI TOÀN BỘ LOGIC
                print("\n🔄 [HOT-RELOAD]: Phát hiện sửa đổi thuật toán! Nạp lại bộ não mới thành công.")
                last_logic_mtime = current_mtime
                # ⚡ TWO-WAY SYNC: Nếu bot_config.py mới hơn JSON → ghi đè JSON
                json_config_path = env_paths["FILE_GLOBAL_CONFIG"]
                if os.path.exists(config_path_hot) and os.path.exists(json_config_path):
                    cfg_py_mtime = os.path.getmtime(config_path_hot)
                    json_cfg_mtime = os.path.getmtime(json_config_path)
                    if cfg_py_mtime > json_cfg_mtime:
                        bot_sub1.sync_config_to_json(env_paths, bot_sub1)
                        last_config_mtime = os.path.getmtime(json_config_path)
                try:
                    bot_sub1.print_dashboard(state_matrix, env_paths, system_config)
                except:
                    try:
                        sys.modules.get('z_bot_sub1.bot_ui', sys.modules.get('bot_ui')).print_dashboard(state_matrix, env_paths, system_config)
                    except: pass

            # ⚙️ ĐỒNG BỘ CẤU HÌNH ĐỘNG TỪ FILE JSON CỦA GUI
            if os.path.exists(config_path):
                cfg_mtime = os.path.getmtime(config_path)
                if cfg_mtime > last_config_mtime:
                    bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
                    last_config_mtime = cfg_mtime
                    print("\n♻️ [HỆ THỐNG]: Đã tự động đồng bộ cấu hình mới từ file JSON!")

            # ⚙️ AI EVOLUTION CHU KỲ
            if current_now - system_config["LAST_EVOLUTION_TIMESTAMP"] >= bot_sub1.EVOLUTION_CYCLE_SECONDS:
                bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
                system_config["LAST_EVOLUTION_TIMESTAMP"] = current_now

            # ⚡ QUÉT REALTIME MỖI 1 GIÂY
            if current_now - last_realtime_scan >= 2.0:
                is_limit_setup_cycle = False
                if current_now - last_limit_setup >= 3.0: 
                    is_limit_setup_cycle = True
                    last_limit_setup = current_now
                
                # --- Xử lý đa luồng (Multi-threading) để loại bỏ độ trễ mạng ---
                def process_coin(cfg):
                    try:
                        bot_sub1.run_strategy_cycle(client, cfg, pMode, state_matrix, env_paths, system_config, is_limit_setup_cycle)
                        if cfg['swap'] in state_matrix:
                            live_px = float(state_matrix[cfg['swap']].live_price)
                            bot_sub1.update_post_trade_monitoring(cfg['coin'], live_px, env_paths, bot_sub1)
                    except Exception as e:
                        print(f"⚠️ [Lỗi quét {cfg['coin']}]: {e}")

                if not hasattr(sys, '_bot_sub1_executor'):
                    sys._bot_sub1_executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(32, len(bot_sub1.COIN_PORTFOLIO) * 2))
                
                futures = []
                for cfg in bot_sub1.COIN_PORTFOLIO: 
                    futures.append(sys._bot_sub1_executor.submit(process_coin, cfg))
                concurrent.futures.wait(futures)
                # ----------------------------------------------------------------
                
                # 📊 IN BẢNG ĐIỀU KHIỂN
                if current_now - last_dashboard_update >= 20.0:
                    bot_sub1.update_wallet_metrics(client, env_paths, system_config)
                    bot_sub1.print_dashboard(state_matrix, env_paths, system_config)
                    last_dashboard_update = current_now

                last_realtime_scan = current_now
            
            time.sleep(0.1) 
        except KeyboardInterrupt: 
            print("\n🛑 [HỆ THỐNG DỪNG]: Ngắt hoạt động Bot an toàn.")
            break
        except Exception as e: 
            print(f"⚠️ Lỗi vận hành Loop Main: {e}")
            time.sleep(2)

if __name__ == "__main__": 
    main()

# z1953 | Change default acc_name to sub1
# z6796 | pos_cycle_filled_tfs + pos_cycle_closed_tfs anti-spam M5 | dca_tfs in record_exit | SYSTEM EMA 200 rename | Thêm mode_icon vào record_exit
# z2499 | Fixed env_file path resolution to always use z_bot_sub1 directory.
# z2403 | Clean up stale flags (*.flag) for this account at startup to prevent immediate termination if an old stop flag was left over. Resolve flag names dynamically via acc_name instead of hardcoded _main.flag.
# z1949 | Đổi tên bot main thành bot_sub1 (EMA200)
# z7711 | Giảm chu kỳ đặt lệnh Limit xuống 3s, tần suất realtime quét xuống 1s để giảm khoảng trống lệnh, tối ưu AMEND-FIRST.
# z1949 | Fix Partial Fills using Fills API, RAM structure order list(), Disk I/O Memory Cache, Time-based Caching for Rate Limit
