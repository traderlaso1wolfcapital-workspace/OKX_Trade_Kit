#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
===============================================================================
🔍 CÔNG CỤ KIỂM TRA TIẾN TRÌNH BOT ĐANG CHẠY NGẦM — zInspect_Bots.py
===============================================================================
Sử dụng script này trên máy chủ (Mac Mini hoặc VPS) để kiểm tra:
1. Có những tiến trình bot nào đang thực sự chạy ngầm trong hệ điều hành OS.
2. Kiểm tra các file .pid và file cờ flags trong thư mục TLS1_Trading_Users.
3. Phát hiện các tiến trình Zombie hoặc file PID rác (stale PID).
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

def inspect():
    print("\n" + "=" * 80)
    print("🔍 [INSPECT] ĐANG QUÉT TOÀN BỘ TIẾN TRÌNH BOT TRÊN HỆ THỐNG OS...")
    print("=" * 80)

    found_bots = []
    for proc in psutil.process_iter(['pid', 'name', 'cmdline', 'create_time', 'memory_info', 'status']):
        try:
            cmdline_list = proc.info.get('cmdline') or []
            cmdline = " ".join(cmdline_list).lower()
            pname = (proc.info.get('name') or "").lower()

            is_bot = False
            strat = "Unknown"
            env_target = ""

            if "sys_bot_sub1" in cmdline:
                is_bot = True
                strat = "EMA200 Bot (Sub 1)"
            elif "sys_bot_sub2" in cmdline:
                is_bot = True
                strat = "SMC Bot (Sub 2)"
            elif "sys_bot_sub3" in cmdline:
                is_bot = True
                strat = "Liquidation Bot (Sub 3)"
            elif "--run-bot" in cmdline:
                is_bot = True
                for i, arg in enumerate(cmdline_list):
                    if arg == "--run-bot" and i + 1 < len(cmdline_list):
                        s_name = cmdline_list[i+1]
                        strat = f"Shadow Bot ({s_name})"
                        if i + 2 < len(cmdline_list):
                            env_target = cmdline_list[i+2]
                        break

            # Trích xuất env file / account id
            if is_bot and not env_target:
                for arg in cmdline_list:
                    if ".api" in arg:
                        env_target = os.path.basename(arg)
                        break

            if is_bot:
                mem_mb = (proc.info.get('memory_info').rss / (1024 * 1024)) if proc.info.get('memory_info') else 0
                uptime_sec = int(time.time() - proc.info.get('create_time', time.time()))
                uptime_str = f"{uptime_sec // 60}m {uptime_sec % 60}s"
                found_bots.append({
                    "pid": proc.info['pid'],
                    "strategy": strat,
                    "target": env_target or "default",
                    "status": proc.info.get('status', 'running'),
                    "uptime": uptime_str,
                    "mem": f"{mem_mb:.1f} MB",
                    "cmd": " ".join(cmdline_list[:4])
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    if not found_bots:
        print("✅ KHÔNG CÓ TIẾN TRÌNH BOT NÀO ĐANG CHẠY NGẦM TRÊN HỆ THỐNG.")
    else:
        print(f"⚠️ PHÁT HIỆN {len(found_bots)} TIẾN TRÌNH BOT ĐANG CHẠY TRONG OS:\n")
        print(f"{'PID':<8} | {'CHIẾN THUẬT':<24} | {'TÀI KHOẢN':<20} | {'TRẠNG THÁI':<12} | {'UPTIME':<10} | {'RAM'}")
        print("-" * 90)
        for b in found_bots:
            print(f"{b['pid']:<8} | {b['strategy']:<24} | {b['target']:<20} | {b['status']:<12} | {b['uptime']:<10} | {b['mem']}")
        print("-" * 90)

    # Quét các file PID và Flags
    print("\n📂 [INSPECT] QUÉT CÁC FILE LƯU TRỮ TRẠNG THÁI (PID & FLAGS)...")
    local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
    users_dir = os.path.join(local_app_data, "TLS1_Trading_Users")
    
    stale_pids = []
    valid_pids = []
    running_acc_files = []

    if os.path.exists(users_dir):
        for root, dirs, files in os.walk(users_dir):
            for f in files:
                fpath = os.path.join(root, f)
                if f.endswith(".pid"):
                    try:
                        with open(fpath, "r") as pf:
                            val = pf.read().strip()
                        if val.isdigit():
                            c_pid = int(val)
                            if psutil.pid_exists(c_pid):
                                valid_pids.append((fpath, c_pid))
                            else:
                                stale_pids.append((fpath, c_pid))
                        else:
                            stale_pids.append((fpath, val))
                    except:
                        pass
                elif f.startswith(".running_account"):
                    try:
                        with open(fpath, "r") as rf:
                            running_acc_files.append((fpath, rf.read().strip()))
                    except:
                        pass

    print(f"• File PID sống: {len(valid_pids)}")
    for fp, p in valid_pids:
        print(f"  - [LIVE PID {p}]: {fp}")
    print(f"• File PID rác (tiến trình đã chết): {len(stale_pids)}")
    for fp, p in stale_pids:
        print(f"  - [STALE PID {p}]: {fp}")
    print(f"• File .running_account: {len(running_acc_files)}")
    for fp, a in running_acc_files:
        print(f"  - [{a}]: {fp}")

    print("\n" + "=" * 80)
    if found_bots or stale_pids or running_acc_files:
        print("💡 HƯỚNG DẪN DỌN DẸP:")
        print("   Để dọn sạch toàn bộ bot chạy ngầm và xóa sạch cờ kẹt, vui lòng chạy:")
        print("   👉 python3 zClean_Zombie_Bots.py")
    else:
        print("🎉 Hệ thống sạch sẽ, không có bot kẹt hay file rác!")
    print("=" * 80 + "\n")

if __name__ == "__main__":
    inspect()

