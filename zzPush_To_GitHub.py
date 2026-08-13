import json
import re
import os
import subprocess

def bump_version(v):
    parts = v.split('.')
    parts[-1] = str(int(parts[-1]) + 1)
    return '.'.join(parts)

print("=========================================")
print("  TỰ ĐỘNG ĐẨY CODE LÊN GITHUB ACTIONS")
print("=========================================")

# Paths
base_dir = os.path.dirname(os.path.abspath(__file__))
v_path = os.path.join(base_dir, "desktop_app", "version.json")
g_path = os.path.join(base_dir, "desktop_app", "gui_main.py")

# 1. Update version.json
with open(v_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

old_v = data['version']
new_v = bump_version(old_v)
data['version'] = new_v

with open(v_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

print(f"[1] Đã tự động tăng Version từ {old_v} len {new_v}")

# 2. Git Commands
git = "git"

print("[2] Đang lưu thay đổi (Commit) dưới danh nghĩa Ẩn danh (TLS1 Admin)...")
subprocess.run([git, "add", "."], check=False, cwd=base_dir)

print("[2.1] Tạm thời loại bỏ TLS1_Trading_Web khỏi commit lần này...")
subprocess.run([git, "reset", "HEAD", "TLS1_Trading_Web"], check=False, cwd=base_dir)

subprocess.run([git, "-c", "user.name=TLS1 Admin", "-c", "user.email=admin@tls1.com", "commit", "-m", f"Update App v{new_v} [skip ci]"], check=False, cwd=base_dir)

print(f"[3] BỎ QUA tạo nhãn phiên bản (Tạm dừng Desktop)...")
# subprocess.run([git, "tag", f"v{new_v}"], check=False, cwd=base_dir)

print("[4] Đang đẩy code lên GitHub... (Không kích hoạt Action)")
subprocess.run([git, "push", "origin", "main"], check=False, cwd=base_dir)
# subprocess.run([git, "push", "origin", f"v{new_v}"], check=False, cwd=base_dir)

print("=========================================")
print("HOÀN TẤT! CODE ĐÃ ĐƯỢC ĐẨY LÊN GITHUB (KHÔNG RUN ACTION).")
print(f"Phiên bản: v{new_v}")
print("=========================================")
