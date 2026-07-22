import os
import sys
import json
import time
import zipfile
import subprocess
import requests
import gdown

VERSION_FILE = 'version.json'
TEMP_ZIP = 'update_temp.zip'

def get_local_version():
    if os.path.exists(VERSION_FILE):
        try:
            with open(VERSION_FILE, 'r', encoding='utf-8') as f:
                data = json.load(f)
                return data.get('version', '0.0.0')
        except Exception as e:
            print(f"Lỗi đọc {VERSION_FILE}: {e}")
    return '0.0.0'

def download_file(url, dest):
    try:
        # Sử dụng gdown để tải, tự động bypass Google Drive virus scan warning
        result = gdown.download(url, dest, quiet=False)
        return result is not None
    except Exception as e:
        print(f"Lỗi tải file: {e}")
        return False

def check_for_updates():
    local_version = get_local_version()
    print(f"Phiên bản hiện tại: {local_version}")
    
    GDRIVE_VERSION_URL = "https://drive.google.com/uc?export=download&id=14633-c4_aQhMweh4S3HcW9vOhySI7-P5"
    
    if GDRIVE_VERSION_URL == "YOUR_VERSION_JSON_GDRIVE_LINK_HERE":
        print("Chưa cấu hình Google Drive Link, bỏ qua cập nhật.")
        return False
        
    try:
        response = requests.get(GDRIVE_VERSION_URL)
        response.raise_for_status()
        remote_data = response.json()
        remote_version = remote_data.get('version', '0.0.0')
        import sys
        if sys.platform == "darwin": # Mac OS
            update_url = remote_data.get('update_url_mac', remote_data.get('update_url', ''))
        else: # Windows
            update_url = remote_data.get('update_url_win', remote_data.get('update_url', ''))
        changelog = remote_data.get('changelog', '')
        
        # So sánh chuỗi version cơ bản
        def version_tuple(v):
            return tuple(map(int, (v.split("."))))
            
        if version_tuple(remote_version) > version_tuple(local_version):
            print(f"Có bản cập nhật mới: {remote_version} (Hiện tại: {local_version})")
            print(f"Chi tiết: {changelog}")
            print("Đang tải xuống bản cập nhật...")
            
            if download_file(update_url, TEMP_ZIP):
                print("Tải xong. Đang giải nén và cập nhật...")
                
                # Giải nén đè lên các file hiện tại
                with zipfile.ZipFile(TEMP_ZIP, 'r') as zip_ref:
                    for member in zip_ref.namelist():
                        # Bỏ qua updater.exe vì nó đang chạy, Windows không cho phép ghi đè
                        if os.path.basename(member).lower() == 'updater.exe':
                            continue
                        try:
                            zip_ref.extract(member, '.')
                        except Exception as ex:
                            print(f"Bỏ qua file {member}: {ex}")
                
                # Cập nhật file version.json ở local
                with open(VERSION_FILE, 'w', encoding='utf-8') as f:
                    json.dump(remote_data, f, indent=4)
                    
                os.remove(TEMP_ZIP)
                print("Cập nhật thành công!")
                return True
            else:
                print("Tải bản cập nhật thất bại.")
        else:
            print("Bạn đang sử dụng phiên bản mới nhất.")
            
    except Exception as e:
        print(f"Lỗi kiểm tra cập nhật: {e}")
        
    return False

def main():
    check_for_updates()
    
    # Mở file bot chính tùy theo hệ điều hành
    import sys
    if sys.platform == "win32":
        MAIN_APP_EXE = "TLS1 Trading.exe"
    else:
        MAIN_APP_EXE = "TLS1_Trading.app" # Tren Mac, nó là một thư mục .app

    if os.path.exists(MAIN_APP_EXE):
        print(f"Đang khởi động {MAIN_APP_EXE}...")
        # Sử dụng Popen để mở app độc lập rồi tắt updater
        if sys.platform == "darwin": # Mac OS
            subprocess.Popen(["open", MAIN_APP_EXE])
        else:
            subprocess.Popen([MAIN_APP_EXE])
    else:
        print(f"Không tìm thấy {MAIN_APP_EXE}! Có thể chưa được tải về hoặc cài đặt sai.")
        time.sleep(5)

if __name__ == "__main__":
    main()
