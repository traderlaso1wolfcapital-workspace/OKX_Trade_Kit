import os
import sys
import subprocess
from datetime import datetime

# Đảm bảo in tiếng Việt trên console Windows không bị lỗi UnicodeEncodeError cp1252
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

print("=========================================")
print("  TỰ ĐỘNG ĐỒNG BỘ (PULL) CODE TỪ GITHUB")
print("  ⚡ CHẾ ĐỘ: THAY THẾ HOÀN TOÀN 100% TỪ GITHUB")
print("=========================================")

base_dir = os.path.dirname(os.path.abspath(__file__))
git = "git"

def run_cmd(cmd, check=False):
    return subprocess.run(cmd, cwd=base_dir, capture_output=True, text=True, check=check, encoding="utf-8", errors="replace")

# 0. Dọn dẹp các file lock tạm nếu có để tránh kẹt tiến trình Git
for lock_file in [os.path.join(base_dir, ".git", f) for f in ["index.lock", "refs/heads/main.lock", "HEAD.lock", "index_user"]]:
    if os.path.exists(lock_file):
        try:
            os.remove(lock_file)
        except Exception:
            pass

# 1. Tải toàn bộ mã nguồn mới nhất từ GitHub
print("[1] Đang kết nối và tải mã nguồn mới nhất từ GitHub (git fetch origin main)...")
fetch_res = run_cmd([git, "fetch", "origin", "main"])
if fetch_res.returncode != 0:
    print("❌ LỖI: Không thể kết nối hoặc tải dữ liệu từ GitHub:")
    print(fetch_res.stderr)
    sys.exit(1)
print("    -> Đã tải xong toàn bộ commit mới nhất từ GitHub.")

# 2. Thực hiện Reset Hard để đè 100% mã nguồn theo GitHub
print("[2] Đang đồng bộ và thay thế hoàn toàn mã nguồn (git reset --hard origin/main)...")
reset_res = run_cmd([git, "reset", "--hard", "origin/main"])
if reset_res.returncode != 0:
    print("❌ LỖI trong quá trình reset code:")
    print(reset_res.stderr)
    sys.exit(1)

# 3. Dọn dẹp cây thư mục, tuyệt đối bảo lưu an toàn API keys, cấu hình và json_data
print("[3] Dọn dẹp cây thư mục đồng bộ (bảo lưu an toàn tuyệt đối API Key, .env và dữ liệu sống)...")
run_cmd([git, "clean", "-fd", "-e", "json_data", "-e", ".env*", "-e", ".api*", "-e", "accounts.json", "-e", "*.log", "-e", "mac_mini_config.json"])

# 4. Thông tin trạng thái cuối cùng
log_res = run_cmd([git, "log", "-1", "--oneline"])
print("=========================================")
print("🚀 ĐỒNG BỘ THÀNH CÔNG 100% TỪ GITHUB!")
print(f"Commit mới nhất: {log_res.stdout.strip()}")
print(f"Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
print("=========================================")
