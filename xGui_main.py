import os
import sys
import traceback

def setup_env():
    """Thiết lập môi trường cho ứng dụng"""
    current_dir = os.path.dirname(os.path.abspath(__file__))
    if current_dir not in sys.path:
        sys.path.insert(0, current_dir)
    os.environ['PYTHONUNBUFFERED'] = '1'

def main():
    try:
        setup_env()
        
        print("Đang khởi động TLS1 Trading App...")
        
        # Import và chạy giao diện chính
        from TLS1_Trading_App import gui_main
        gui_main.main()
        
        pass
    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")
        input("Nhấn Enter để thoát...")

if __name__ == "__main__":
    main()
