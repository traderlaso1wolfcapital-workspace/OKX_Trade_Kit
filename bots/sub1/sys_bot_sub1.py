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
# Tự động thêm thư mục gốc dự án vào sys.path để hỗ trợ import bots.sub1 khi di chuyển file
_file_dir = os.path.dirname(os.path.abspath(__file__))
if os.path.basename(_file_dir) in ["sub1", "sub2"]:
    _parent_dir = os.path.dirname(_file_dir)
    if _parent_dir not in sys.path:
        sys.path.insert(0, _parent_dir)

# ==============================================================================
from bots.sub1.bot_models import AssetTracker
from bots.sub1.bot_api import OKXRestCore

# 🚀 VÒNG LẶP CHÍNH (MAIN LOOP & HOT-RELOADER)
# ==============================================================================
# BIẾN MÔI TRƯỜNG DÙNG CHUNG CỦA HỆ THỐNG (Phạm vi toàn cục)
system_config = {
    "SHOULD_RESET_WALLET": False,
    "SHOULD_RESET_NEN": False,
    "LAST_EVOLUTION_TIMESTAMP": 0.0,
    "SHOULD_STOP": False,
    "STARTUP_CLEANUP_DONE": False,
    "DRY_RUN": True,       # 🔒 Mặc định: chạy ngầm, không đặt lệnh OKX cho đến khi được kích hoạt
    "KILL_PROCESS": False, # 🛑 Thoát hoàn toàn process khi app tắt
}

def main():
    global system_config
    if sys.platform == 'win32': pass
    
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
    system_config["STARTUP_CLEANUP_DONE"] = False
    system_config["BOT_START_TIME"] = time.time()
    system_config["DRY_RUN"] = True       # Bắt đầu ở chế độ ngầm cho đến khi nhận lệnh activate
    system_config["KILL_PROCESS"] = False
    
    if getattr(sys, 'frozen', False):
        base_dir = os.path.dirname(sys.executable)
    else:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        for _ in range(4):
            if os.path.isdir(os.path.join(base_dir, "bots/sub1")):
                break
            base_dir = os.path.dirname(base_dir)

    local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
    user_data_dir = os.path.join(local_app_data, 'TLS1_Trading')

    if getattr(sys, 'frozen', False):
        CURRENT_DIR = os.path.dirname(sys.executable)
    else:
        CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
        if os.path.basename(CURRENT_DIR) in ["sub1", "sub2"]:
            CURRENT_DIR = os.path.dirname(CURRENT_DIR)

    env_arg = sys.argv[1] if len(sys.argv) > 1 else ".api_sub1"
    env_basename = os.path.basename(env_arg)
    
    # Tìm file ở nhiều đường dẫn khả thi (ưu tiên user_data_dir trước)
    possible_paths = [
        os.path.join(user_data_dir, "bots/sub1", env_basename),
        os.path.join(user_data_dir, "bots", "sub1", env_basename),
        os.path.join(user_data_dir, env_basename),
        os.path.join(base_dir, "bots/sub1", env_basename),
        os.path.join(base_dir, "bots", "sub1", env_basename),
        os.path.join(base_dir, env_basename),
        env_arg,  # Đường dẫn tuyệt đối truyền vào từ argv
    ]
    
    def _has_valid_api(path):
        """Kiểm tra file có chứa API key thực sự không (không rỗng)."""
        try:
            with open(path, "r", encoding="utf-8") as _f:
                content = _f.read()
            return "OKX_API_KEY" in content and "=\"\"" not in content.split("OKX_API_KEY")[1].split("\n")[0]
        except:
            return False

    env_file = None
    # Ưu tiên file có key hợp lệ
    for p in possible_paths:
        if os.path.exists(p) and _has_valid_api(p):
            env_file = p
            break
    # Fallback: lấy file tồn tại đầu tiên dù rỗng
    if not env_file:
        for p in possible_paths:
            if os.path.exists(p):
                env_file = p
                break
            
    if not env_file:
        print(f"❌ [LỖI CONFIG]: Chưa cấu hình API Keys cho Bot Sub 1!", flush=True)
        print(f"💡 HƯỚNG DẪN SỬA LỖI: Vui lòng mở App -> Vào Tab 'Cấu hình Sub 1' -> Nhập OKX API Key/Secret/Passphrase -> Bấm '💾 Lưu Cấu Hình API' trước khi bật Bot!", flush=True)
        time.sleep(5)
        sys.exit(1)
        
    acc_name = os.path.basename(env_file).replace(".api", "").replace("_", "")
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
        fallback_files = [
            os.path.join(os.path.dirname(env_file), ".api_sub1"),
            os.path.join(user_data_dir, "bots/sub1", ".api_sub1"),
            os.path.join(user_data_dir, "bots", "sub2", ".api_sub1")
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
                        print(f"💡 [API KEY FALLBACK]: Đã tự động đọc API Key từ [{os.path.basename(fpath)}] cho Bot Sub 1!")
                        break
                except: pass

    if not api_key or not secret_key or not passphrase: 
        print(f"❌ Thiếu API Key trong file {env_file}! Dừng hệ thống.", flush=True)
        time.sleep(5)
        sys.exit(1)

    # =========================================================================
    # 🔒 SINGLE INSTANCE LOCK — Ngăn chặn chạy 2 bot cùng tài khoản
    # =========================================================================
    sub1_dir = os.path.join(user_data_dir, "bots/sub1")
    JSON_DATA_DIR = os.path.join(sub1_dir, "json_data")
    os.makedirs(JSON_DATA_DIR, exist_ok=True)
    lock_file = os.path.join(JSON_DATA_DIR, f"{acc_name}.pid")
    
    if HAS_PSUTIL:
        if os.path.exists(lock_file):
            try:
                with open(lock_file, "r") as f:
                    old_pid = int(f.read().strip())
                if psutil.pid_exists(old_pid) and old_pid != os.getpid():
                    try:
                        old_proc = psutil.Process(old_pid)
                        if old_proc.status() == psutil.STATUS_ZOMBIE:
                            pass
                        else:
                            print(f"\n{'='*80}")
                            print(f"🚫 CẢNH BÁO: Bot tài khoản [{acc_name}] đang chạy ở tiến trình khác!")
                            print(f"   PID: {old_pid} | Tên: {old_proc.name()}")
                            print("   Vui lòng tắt tiến trình đó trước khi bắt đầu phiên mới.")
                            print(f"   File lock: {lock_file}")
                            print(f"{'='*80}\n")
                            sys.exit(1)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass
                if os.path.exists(lock_file):
                    os.remove(lock_file)
            except (ValueError, psutil.NoSuchProcess, Exception):
                if os.path.exists(lock_file):
                    try: os.remove(lock_file)
                    except Exception: pass
        
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

    env_paths = {
        "FILE_GLOBAL_CONFIG": os.path.join(JSON_DATA_DIR, f"{acc_name}_global_config.json"),
        "JSON_EVOLUTION_DATA_FILE": os.path.join(JSON_DATA_DIR, f"{acc_name}_du_lieu_tien_hoa.json"),
        "FILE_TRADE_HISTORY": os.path.join(JSON_DATA_DIR, f"{acc_name}_lich_su_tien_hoa_chi_tiet.json"),
        "FILE_RSI_BEHAVIOR": os.path.join(JSON_DATA_DIR, f"{acc_name}_hanh_vi_rsi_macro.json"),
        "FILE_WAIT_LOG": os.path.join(JSON_DATA_DIR, f"{acc_name}_nhat_ky_phien_cho_doi.json"),
        "FILE_MTF_STATES": os.path.join(JSON_DATA_DIR, f"{acc_name}_mtf_states.json"),
        "ENV_NAME": env_file,
        "ENV_FILE_NAME": env_file
    }

    if not os.path.exists(env_paths["FILE_GLOBAL_CONFIG"]):
        try:
            default_sub1_cfg = {
                "ENABLED_COINS": ["XAU", "BTC", "ETH"],
                "ENABLE_STRATEGY_MAIN": True,
                "ENABLE_PYRAMID_DCA": True,
                "ENABLE_STRATEGY_HEDGE": True,
                "ENABLE_STRATEGY_XOLE": True,
                "ENABLE_DYNAMIC_EMA200_TP": False,
                "ENABLE_DYNAMIC_PINGPONG_TP": False,
                "ALTCOIN_FOLLOW_BTC_EMA": True,
                "ENABLE_SIDEWAY_SAFE_EXIT": False,
                "ENABLE_SQUEEZE_ESCAPE_EXIT": False,
                "ENABLE_SAFEGUARD_ENTRY_EXIT": False,
                "ENABLE_TRAILING_SL": False,
                "ENABLE_MAX_ROI_EXIT": False,
                "ENABLE_SIDEWAY_VAP_EXIT": False,
                "ENABLE_H4_FLIP_CLOSE": False,
                "POSITION_VOLUME_HIGH_CONFIDENCE": "100.00",
                "TP_TARGET_OPTIMAL": "0.01200",
                "SL_TARGET_OPTIMAL": "0.01200",
                "EVOLUTION_CYCLE_SECONDS": 3600,
                "LEVERAGES": {"XAU": 50, "BTC": 100, "ETH": 100},
                "VOL_MULTIPLIERS": {"BTC": "1.00", "ETH": "1.30"}
            }
            with open(env_paths["FILE_GLOBAL_CONFIG"], "w", encoding="utf-8") as f:
                json.dump(default_sub1_cfg, f, indent=4)
        except Exception: pass

    # Tự động dọn dẹp các file log rác nặng máy cũ (RSI macro log, nhật ký phiên)
    for path in [env_paths["FILE_RSI_BEHAVIOR"], env_paths["FILE_WAIT_LOG"], env_paths["FILE_TRADE_HISTORY"]]:
        if os.path.exists(path):
            try: os.remove(path)
            except: pass


    # Dọn sạch các file flag cũ của tài khoản này khi khởi động lại bot để tránh tình trạng nhận diện nhầm lệnh dừng từ phiên cũ
    for flag_name in ["stop", "reset_wallet", "reset_nen"]:
        flag_file = os.path.join(JSON_DATA_DIR, f"{flag_name}_{acc_name}.flag")
        if os.path.exists(flag_file):
            try: os.remove(flag_file)
            except: pass

    client = OKXRestCore(api_key, secret_key, passphrase, is_demo)
    state_matrix = {}

    import bots.sub1.bot_sub1 as bot_sub1 # Lần nạp module đầu tiên
    
    try: client.request("POST", "/api/v5/account/set-position-mode", body={"posMode": "long_short"})
    except: pass
    
    try:
        pMode = client.request("GET", "/api/v5/account/config")["data"][0].get("posMode", "net_mode")
    except Exception as e:
        print(f"❌ [LỖI API]: Không thể khởi tạo kết nối OKX: {e}", flush=True)
        print("💡 HƯỚNG DẪN SỬA LỖI: API Key của bạn không hợp lệ, bị hết hạn, hoặc bị giới hạn quyền. Vui lòng kiểm tra lại trong mục Cài Đặt!", flush=True)
        time.sleep(5)
        sys.exit(1)

    for cfg in bot_sub1.COIN_PORTFOLIO:
        try: client.request("POST", "/api/v5/account/set-leverage", body={"instId": cfg["swap"], "lever": str(cfg["leverage"]), "mgnMode": "cross"})
        except: pass
        state_matrix[cfg["swap"]] = AssetTracker()

    # Luồng nhập Terminal
    import bots.sub1.bot_terminal as bot_terminal
    bot_terminal.start_terminal_listener(system_config)

    bot_sub1.update_wallet_metrics(client, env_paths, system_config)
    bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
    system_config["LAST_EVOLUTION_TIMESTAMP"] = time.time()

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

    print("\n✅  SYSTEM EMA 200 v23.0 [DUAL-CORE PURE LIMIT] KHỞI ĐỘNG...")
    bot_sub1.send_telegram_notification(f"🤖 Bot v23.0 PURE LIMIT CROSS đã kích hoạt trên {env_file}! Cấu trúc Dual-Core chống mất trạng thái.")

    last_realtime_scan, last_limit_setup, last_dashboard_update = 0.0, 0.0, 0.0
    _bot_folder = os.path.dirname(os.path.abspath(__file__))
    try:
        last_logic_mtime = max(
            os.path.getmtime(os.path.join(_bot_folder, f))
            for f in ["bot_sub1.py", "bot_strategy.py", "bot_config.py", "bot_ui.py"]
            if os.path.exists(os.path.join(_bot_folder, f))
        )
    except Exception:
        last_logic_mtime = 0.0
    
    last_config_mtime = 0.0
    config_path = env_paths["FILE_GLOBAL_CONFIG"]
    if os.path.exists(config_path):
        last_config_mtime = os.path.getmtime(config_path)

    while True:
        # 🛑 Thoát hoàn toàn (chỉ khi app tắt, không phải khi Stop bình thường)
        if system_config.get("KILL_PROCESS", False):
            print("\n🛑 [HỆ THỐNG TẪT]: Đã nhận tín hiệu tắt toàn bộ process.")
            break

        try:
            current_now = time.time()
            
            # --- STARTUP CLEANUP --- (Chỉ chạy khi được kích hoạt lần đầu, bỏ qua ở DRY-RUN)
            if not system_config.get("STARTUP_CLEANUP_DONE", False) and not system_config.get("DRY_RUN", True):
                bot_sub1.cleanup_all_orders_on_startup(client, bot_sub1.COIN_PORTFOLIO)
                system_config["STARTUP_CLEANUP_DONE"] = True
                time.sleep(2)
                
            # --- THE START OF GUI IPC FLAGS ---
            try:
                stop_flag_path = os.path.join(JSON_DATA_DIR, f"stop_{acc_name}.flag")
                if os.path.exists(stop_flag_path):
                    # Đây giờ chỉ đưa về DRY_RUN (chạy ngầm), không thoát process
                    system_config["DRY_RUN"] = True
                    print(f"\n🌑 [SHADOW MODE]: Bot {acc_name} đã chuyển về chế độ ngầm (DRY-RUN). Tiếp tục đếm nến, không đặt lệnh.")
                    try: os.remove(stop_flag_path)
                    except: pass

                    # 🧹 Dọn sạch toàn bộ Limit chưa khớp trên sàn OKX (Secondary Guarantee, bảo lưu 100% TP/SL)
                    try:
                        bot_sub1.cleanup_all_orders_on_startup(client, bot_sub1.COIN_PORTFOLIO, dry_run=False)
                    except Exception as _ce:
                        print(f"⚠️ Lỗi dọn dẹp limit khi vào Shadow Mode: {_ce}")

                    # 🔄 Reset cache lệnh limit trong RAM của bot để tránh re-place nhầm
                    for coin_tracker in state_matrix.values():
                        coin_tracker.placed_entry_px_long = "---"
                        coin_tracker.placed_entry_px_short = "---"
                        coin_tracker.placed_entry_px_long_by_tf = {}
                        coin_tracker.placed_entry_px_short_by_tf = {}
                        if hasattr(coin_tracker, "missing_count"):
                            coin_tracker.missing_count = {"long": {}, "short": {}}

                # Kích hoạt bot thật (chuyển từ shadow → live)
                activate_flag_path = os.path.join(JSON_DATA_DIR, f"activate_{acc_name}.flag")
                if os.path.exists(activate_flag_path):
                    if not system_config["STARTUP_CLEANUP_DONE"]:
                        bot_sub1.cleanup_all_orders_on_startup(client, bot_sub1.COIN_PORTFOLIO, dry_run=False)
                        system_config["STARTUP_CLEANUP_DONE"] = True
                    system_config["DRY_RUN"] = False
                    print(f"\n⚡ [ACTIVATED]: Bot {acc_name} đã được KÍCH HOẠT! Bắt đầu đặt lệnh thật lên OKX.")
                    try: os.remove(activate_flag_path)
                    except: pass

                # Tắt toàn bộ process (chuyển từ shadow → exit)
                kill_flag_path = os.path.join(JSON_DATA_DIR, f"kill_{acc_name}.flag")
                if os.path.exists(kill_flag_path):
                    system_config["KILL_PROCESS"] = True
                    try: os.remove(kill_flag_path)
                    except: pass

                # Ghi trạng thái DRY_RUN ra file để backend Web đọc
                status_file = os.path.join(JSON_DATA_DIR, f"dry_run_{acc_name}.flag")
                try:
                    with open(status_file, "w") as _sf:
                        _sf.write("1" if system_config.get("DRY_RUN", True) else "0")
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
                            "M5": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0},
                            "M15": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0},
                            "M30": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0},
                            "H1": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0},
                            "H2": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0},
                            "H4": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0}
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
            current_mtime = 0.0
            for _f_hot in ["bot_sub1.py", "bot_strategy.py", "bot_config.py", "bot_ui.py"]:
                _p_hot = os.path.join(_bot_folder, _f_hot)
                if os.path.exists(_p_hot):
                    _mt = os.path.getmtime(_p_hot)
                    if _mt > current_mtime:
                        current_mtime = _mt
            
            config_path_hot = os.path.join(_bot_folder, "bot_config.py")

            if current_mtime > last_logic_mtime:
                importlib.reload(sys.modules.get('bots.sub1.bot_config', sys.modules.get('bot_config'))) if 'bots.sub1.bot_config' in sys.modules or 'bot_config' in sys.modules else None
                importlib.reload(sys.modules.get('bots.sub1.bot_strategy', sys.modules.get('bot_strategy'))) if 'bots.sub1.bot_strategy' in sys.modules or 'bot_strategy' in sys.modules else None
                importlib.reload(sys.modules.get('bots.sub1.bot_ui', sys.modules.get('bot_ui'))) if 'bots.sub1.bot_ui' in sys.modules or 'bot_ui' in sys.modules else None
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
                        sys.modules.get('bots.sub1.bot_ui', sys.modules.get('bot_ui')).print_dashboard(state_matrix, env_paths, system_config)
                    except: pass

            # ⚙️ ĐỒNG BỘ CẤU HÌNH ĐỘNG TỪ FILE JSON CỦA GUI
            if os.path.exists(config_path):
                cfg_mtime = os.path.getmtime(config_path)
                if cfg_mtime > last_config_mtime:
                    bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
                    last_config_mtime = cfg_mtime
                    print("\n♻️ [HỆ THỐNG]: Đã tự động đồng bộ cấu hình mới!")

            # ⚙️ AI EVOLUTION CHU KỲ
            if current_now - system_config["LAST_EVOLUTION_TIMESTAMP"] >= bot_sub1.EVOLUTION_CYCLE_SECONDS:
                bot_sub1.run_ai_self_evolution(env_paths, bot_sub1)
                system_config["LAST_EVOLUTION_TIMESTAMP"] = current_now

            # ⚡ QUÉT REALTIME MỖI 10 GIÂY
            if current_now - last_realtime_scan >= 10.0:
                is_limit_setup_cycle = False
                if current_now - last_limit_setup >= 3.0: 
                    is_limit_setup_cycle = True
                    last_limit_setup = current_now
                
                # --- Xử lý đa luồng (Multi-threading) để loại bỏ độ trễ mạng ---
                def process_coin(cfg, is_enabled):
                    try:
                        bot_sub1.run_strategy_cycle(client, cfg, pMode, state_matrix, env_paths, system_config, is_limit_setup_cycle, is_enabled)
                        if cfg['swap'] in state_matrix:
                            live_px = float(state_matrix[cfg['swap']].live_price)
                            bot_sub1.update_post_trade_monitoring(cfg['coin'], live_px, env_paths, bot_sub1)
                    except Exception as e:
                        print(f"⚠️ [Lỗi quét {cfg['coin']}]: {e}")

                if not hasattr(sys, '_bot_sub1_executor'):
                    sys._bot_sub1_executor = concurrent.futures.ThreadPoolExecutor(max_workers=min(32, len(bot_sub1.COIN_PORTFOLIO) * 2))
                
                try:
                    import json
                    with open(env_paths["FILE_GLOBAL_CONFIG"], "r", encoding="utf-8") as f:
                        _gcfg = json.load(f)
                        enabled_coins = _gcfg.get("ENABLED_COINS", ["BTC", "ETH", "XAU"])
                except:
                    enabled_coins = ["BTC", "ETH", "XAU"]
                
                for cfg in bot_sub1.COIN_PORTFOLIO: 
                    is_enabled = (cfg["coin"] in enabled_coins)
                    process_coin(cfg, is_enabled)
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
# z1949 | Handle OKX API error gracefully in sys_bot_sub1 and sys_bot_sub2, fix xGui_main.py EOFError
# z1950 | Fix UI missing PID check causing multi-instance by removing strict 'python' process name requirement from lock check
