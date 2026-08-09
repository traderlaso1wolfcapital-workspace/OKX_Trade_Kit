import os
import sys

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    bat_path = os.path.join(base_dir, "web_app", "zRun_Web.bat")
    
    if not os.path.exists(bat_path):
        print(f"Lỗi: Không tìm thấy file {bat_path}")
        input("Nhấn Enter để thoát...")
        sys.exit(1)
        
    print(f"Đang khởi chạy TLS1 Web App từ: {bat_path}...")
    
    # Chuyển thư mục làm việc vào web_app trước khi chạy file .bat để các đường dẫn tương đối hoạt động đúng
    os.chdir(os.path.join(base_dir, "web_app"))
    
    # Chạy file .bat bằng lệnh hệ thống để nó bật cửa sổ CMD mới (giống như click đúp)
    os.system(f'start "" "{bat_path}"')

if __name__ == "__main__":
    main()
