import os
import sys
import subprocess

def main():
    # Lấy đường dẫn thư mục chứa file chạy này
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Đường dẫn trỏ tới gui_main.py
    # Mặc định tìm trong TLS1_Trading_App (nếu file này nằm trong OKX_Trade_Kit)
    gui_path = os.path.join(base_dir, "TLS1_Trading_App", "gui_main.py")
    
    # Fallback: nếu file này được đặt ở ngoài cùng (TLS1_Company)
    if not os.path.exists(gui_path):
        gui_path = os.path.join(base_dir, "zProjects", "OKX_Trade_Kit", "TLS1_Trading_App", "gui_main.py")
        
    if not os.path.exists(gui_path):
        print("LỖI: Không tìm thấy file gui_main.py!")
        print("Vui lòng đặt file này ở cùng thư mục với TLS1_Trading_App hoặc ở thư mục gốc.")
        input("Nhấn Enter để thoát...")
        sys.exit(1)
        
    print(f"Đang khởi động giao diện từ: {gui_path}")
    
    # Chuyển working directory vào thư mục chứa gui_main.py để các đường dẫn tương đối trong GUI hoạt động đúng
    target_dir = os.path.dirname(gui_path)
    
    try:
        subprocess.run([sys.executable, gui_path], cwd=target_dir)
    except KeyboardInterrupt:
        pass
    except Exception as e:
        print(f"Có lỗi xảy ra: {e}")
        input("Nhấn Enter để thoát...")

if __name__ == "__main__":
    main()
