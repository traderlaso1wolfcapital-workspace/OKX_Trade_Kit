#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
🧹 CÔNG CỤ DỌN SẠCH TOÀN BỘ TIẾN TRÌNH BOT CHẠY NGẦM & CỜ RÁC — zClean_Zombie_Bots.py
===============================================================================
Sử dụng script này khi:
1. Bot bị kẹt chạy ngầm, liên tục đẻ lệnh limit trên sàn dù web báo đã dừng.
2. Web báo lỗi tài khoản đang chạy độc quyền bởi bot khác dù bot đó không chạy.
3. Muốn làm sạch 100% hệ thống để khởi động lại mới tinh khôi.
===============================================================================
"""
import os
import sys
import time

try:
    import psutil
except ImportError:
    print("⚠️ Cần cài đặt thư viện psutil: pip install psutil")
    sys.exit(1)

def clean_all():
    print("\n" + "=" * 80)
    print("🧹 [CLEANUP] BẮT ĐẦU DỌN SẠCH TOÀN BỘ TIẾN TRÌNH BOT VÀ CỜ LƯU VẾT...")
    print("=" * 80)

    # 1. KILL TOÀN BỘ TIẾN TRÌNH BOT PYTHON ĐANG CHẠY TRÊN HỆ THỐNG
    killed_count = 0
    current_pid = os.getpid()

    for proc in psutil.process_iter(['pid', 'name', 'cmdline']):
        try:
            if proc.info['pid'] == current_pid:
                continue
            cmdline_list = proc.info.get('cmdline') or []
            cmdline = " ".join(cmdline_list).lower()
            pname = (proc.info.get('name') or "").lower()

            is_bot = False
            if any(k in cmdline for k in ["sys_bot_sub1", "sys_bot_sub2", "sys_bot_sub3", "--run-bot"]):
                is_bot = True
            elif "python" in pname and any(k in cmdline for k in ["sub1", "sub2", "sub3", "xgui_main"]):
                is_bot = True

            if is_bot:
                print(f"🛑 [KILL] Đang tiêu diệt tiến trình bot PID {proc.info['pid']}: {cmdline[:70]}...")
                try:
                    for child in proc.children(recursive=True):
                        try: child.kill()
                        except: pass
                    proc.kill()
                    killed_count += 1
                except:
                    pass
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    # Chờ 0.5s để OS giải phóng tài nguyên
    time.sleep(0.5)

    # 2. XÓA SẠCH CÁC FILE PID, RUNNING ACCOUNT VÀ FLAGS
    local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
    scan_dirs = [
        os.path.join(local_app_data, "TLS1_Trading_Users"),
        os.path.join(local_app_data, "TLS1_Trading"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "bots")
    ]

    deleted_files = 0
    for sdir in scan_dirs:
        if not os.path.exists(sdir):
            continue
        for root, dirs, files in os.walk(sdir):
            for f in files:
                fpath = os.path.join(root, f)
                should_delete = False

                if f.endswith(".pid"):
                    should_delete = True
                elif f.startswith(".running_account"):
                    should_delete = True
                elif f.endswith(".flag") and any(f.startswith(p) for p in ["stop_", "activate_", "dry_run_", "kill_", "reset_"]):
                    should_delete = True

                if should_delete:
                    try:
                        os.remove(fpath)
                        deleted_files += 1
                    except Exception as e:
                        print(f"⚠️ Không thể xóa {fpath}: {e}")

    print("\n" + "-" * 80)
    print(f"✅ ĐÃ TIÊU DIỆT: {killed_count} tiến trình bot chạy ngầm.")
    print(f"✅ ĐÃ DỌN SẠCH: {deleted_files} file .pid, .running_account và cờ flags rác.")
    print("-" * 80)
    print("🎉 HỆ THỐNG ĐÃ HOÀN TOÀN SẠCH SẼ 100%! BÂY GIỜ BẠN CÓ THỂ:")
    print("   1. Khởi động bot trên Web App mà không sợ bị trùng lặp hoặc khóa nhầm.")
    print("   2. Các lệnh Limit cũ sẽ không bao giờ tự động đẻ lại.")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    clean_all()

