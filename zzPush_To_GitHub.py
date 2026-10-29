import json
import re
import os
import sys
import subprocess
from datetime import datetime

if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ⚠️ CỜ BẬT/TẮT CHỨC NĂNG BUILD ACTION .EXE (Theo lệnh CEO)
# Khi đặt False: Chỉ đẩy code lên GitHub, không tăng Version, không tạo Tag -> Không kích hoạt Action Build .exe
# Khi nào CEO yêu cầu mở lại, chỉ cần đổi thành True.
ENABLE_BUILD_EXE_ACTION = False

def bump_version(v):
    parts = v.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    return '.'.join(parts)

print("=========================================")
if ENABLE_BUILD_EXE_ACTION:
    print("  TỰ ĐỘNG ĐẨY CODE & KÍCH HOẠT BUILD .EXE")
else:
    print("  TỰ ĐỘNG ĐẨY CODE LÊN GITHUB (ĐÃ KHÓA ACTION BUILD .EXE)")
print("=========================================")

# Paths
base_dir = os.path.dirname(os.path.abspath(__file__))
v_path = os.path.join(base_dir, "desktop_app", "version.json")
g_path = os.path.join(base_dir, "desktop_app", "gui_main.py")

# 0. Đảm bảo môi trường Git sạch (dọn dẹp các file lock tạm nếu có)
for lock_file in [os.path.join(base_dir, ".git", f) for f in ["index.lock", "refs/heads/main.lock", "HEAD.lock", "index_user"]]:
    if os.path.exists(lock_file):
        try:
            os.remove(lock_file)
        except Exception:
            pass

# 1. Update version.json
new_v = "1.0.0"
if os.path.exists(v_path):
    try:
        with open(v_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        old_v = data.get('version', "1.0.0")
        if ENABLE_BUILD_EXE_ACTION:
            new_v = bump_version(old_v)
            data['version'] = new_v
            with open(v_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=4)
            print(f"[1] Đã tự động tăng Version từ {old_v} lên {new_v}")
        else:
            new_v = old_v
            print(f"[1] [ĐÃ KHÓA BUILD .EXE] Giữ nguyên Version: {new_v}")
    except Exception as e:
        print(f"[1] Bỏ qua cập nhật version.json: {e}")

# 2. Git Commands
git = "git"

# 2.1 Luôn đồng bộ dữ liệu mới nhất từ GitHub trước khi commit để chống xung đột (Rebase/Pull)
print("[2] Đang kiểm tra và đồng bộ từ GitHub trước khi đẩy...")
fetch_res = subprocess.run([git, "fetch", "origin", "main"], check=False, cwd=base_dir)
if fetch_res.returncode == 0:
    # Kéo code mới nếu local không có thay đổi xung đột
    subprocess.run([git, "pull", "--rebase", "origin", "main"], check=False, cwd=base_dir)

print("[3] Đang lưu thay đổi (Commit) dưới danh nghĩa Ẩn danh (TLS1 Admin)...")
subprocess.run([git, "add", "."], check=False, cwd=base_dir)

# 2.2 Bảo vệ tuyệt đối: Unstage các file nhạy cảm nếu lỡ add
sensitive_excludes = [
    "TLS1_Trading_Web", "web_frontend", "old_index.css", "old_media.css",
    "patch_auth.py", "test_limit.py", "accounts.json", "mac_mini_config.json"
]
existing_excludes = [f for f in sensitive_excludes if os.path.exists(os.path.join(base_dir, f))]
if existing_excludes:
    print(f"[3.1] Bảo vệ tài sản & loại bỏ các file ngoại lệ: {existing_excludes}...")
    subprocess.run([git, "reset", "HEAD"] + existing_excludes, check=False, cwd=base_dir)

commit_res = subprocess.run([
    git,
    "-c", "user.name=TLS1 Admin",
    "-c", "user.email=admin@tls1.com",
    "commit",
    "-m", f"Update App v{new_v}: TLS1 Trading Sync"
], check=False, cwd=base_dir)

if ENABLE_BUILD_EXE_ACTION:
    print(f"[4] Đang tạo nhãn phiên bản (Tag) v{new_v} để kích hoạt Build Action...")
    subprocess.run([git, "tag", f"v{new_v}"], check=False, cwd=base_dir)
else:
    print("[4] [ĐÃ KHÓA] Bỏ qua bước tạo Tag (không kích hoạt Build Action .exe)...")

print("[5] Đang đẩy code lên GitHub...")
res = subprocess.run([git, "push", "origin", "main"], check=False, cwd=base_dir)

if ENABLE_BUILD_EXE_ACTION:
    res_tag = subprocess.run([git, "push", "origin", f"v{new_v}"], check=False, cwd=base_dir)
else:
    res_tag = type('obj', (object,), {'returncode': 0})

print("=========================================")
if res.returncode == 0 and res_tag.returncode == 0:
    if ENABLE_BUILD_EXE_ACTION:
        print("🚀 HOÀN TẤT! CODE ĐÃ ĐƯỢC ĐẨY LÊN GITHUB (ACTION ĐANG CHẠY TRÊN SERVER).")
    else:
        print("✅ HOÀN TẤT! CODE ĐÃ ĐƯỢC ĐẨY LÊN GITHUB THÀNH CÔNG.")
    print(f"Phiên bản: v{new_v}")
    print(f"Thời gian: {datetime.now().strftime('%d/%m/%Y %H:%M:%S')}")
else:
    print("⚠️ Có lỗi khi đẩy code lên GitHub (kiểm tra lại kết nối mạng hoặc quyền truy cập).")
print("=========================================")
