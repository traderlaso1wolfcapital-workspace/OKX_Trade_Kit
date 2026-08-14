import os
import sys
import traceback

def setup_env():
    """Thiết lập môi trường cho ứng dụng"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    os.environ['PYTHONUNBUFFERED'] = '1'

def kill_zombie_bots():
    """Tự động dọn dẹp các tiến trình bot chạy ngầm cũ của phiên trước"""
    try:
        import subprocess
        if sys.platform == 'win32':
            # Chỉ kill các tiến trình python đang chạy có đối số '--run-bot'
            cmd = 'powershell -Command "Get-CimInstance Win32_Process -Filter \\"CommandLine like \'%--run-bot%\'\\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"'
            subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            subprocess.run("pkill -f -- '--run-bot'", shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except:
        pass

def main():
    try:
        setup_env()
        
        # Nếu chạy chế độ bot con từ Popen trong môi trường dev
        if len(sys.argv) >= 4 and sys.argv[1] == '--run-bot':
            strategy = sys.argv[2]
            env_file = sys.argv[3]
            
            # Thiết lập path tương thích
            current_dir = os.path.dirname(os.path.abspath(__file__))
            app_dir_app = os.path.join(current_dir, "desktop_app")
            if app_dir_app not in sys.path:
                sys.path.insert(0, app_dir_app)
                
            sys.argv = [f"sys_bot_{strategy}.py", env_file]
            import importlib
            module_name = f"sys_bot_{strategy}"
            try:
                # Cấu trúc mới
                module = importlib.import_module(f"bots.{strategy}.{module_name}")
            except ImportError:
                try:
                    module = importlib.import_module(module_name)
                except ImportError:
                    fallback_folder = f"z_bot_{strategy}"
                    module = importlib.import_module(f"{fallback_folder}.{module_name}")
            sys.modules[module_name] = module
            module.main()
            return
            
        # Dọn sạch các tiến trình bot chạy ngầm cũ trước khi mở app chính
        kill_zombie_bots()
        
        print("Đang khởi động TLS1 Trading App...")
        
        # Import và chạy giao diện chính
        from desktop_app import gui_main
        gui_main.main()
        
        pass
    except Exception as e:
        print(f"Có lỗi xảy ra: {e}", flush=True)
        import traceback
        traceback.print_exc()
        sys.stdout.flush()
        if sys.stdin.isatty():
            input("Nhấn Enter để thoát...")
        sys.exit(1)

if __name__ == "__main__":
    main()
# z1949 | Handle OKX API error gracefully in sys_bot_sub1 and sys_bot_sub2, fix xGui_main.py EOFError
