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
v_path = os.path.join(base_dir, "TLS1_Trading_App", "version.json")
g_path = os.path.join(base_dir, "TLS1_Trading_App", "gui_main.py")

# 1. Update version.json
with open(v_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

old_v = data['version']
new_v = bump_version(old_v)
data['version'] = new_v

with open(v_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, indent=4)

# 2. Update gui_main.py
with open(g_path, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'APP_VERSION\s*=\s*".*?"', f'APP_VERSION = "{new_v}"', content)
with open(g_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"[1] Đã tự động tăng Version từ {old_v} len {new_v}")

# 3. Git Commands
git = r"C:\Program Files\Git\cmd\git.exe"

print("[2] Đang lưu thay đổi (Commit)...")
subprocess.run([git, "add", "."], check=False, cwd=base_dir)
subprocess.run([git, "commit", "-m", f"Release v{new_v} (Auto)"], check=False, cwd=base_dir)

print(f"[3] Đang gắn nhãn phiên bản (Tag v{new_v})...")
subprocess.run([git, "tag", f"v{new_v}"], check=False, cwd=base_dir)

print("[4] Đang đẩy code lên GitHub... (Có thể mất 15-30 giây)")
subprocess.run([git, "push", "origin", "main"], check=False, cwd=base_dir)
subprocess.run([git, "push", "origin", f"v{new_v}"], check=False, cwd=base_dir)

print("=========================================")
print("HOÀN TẤT! GITHUB ACTIONS ĐÃ ĐƯỢC KÍCH HOẠT.")
print(f"Phiên bản đang build: v{new_v}")
print("=========================================")
os.system("pause")
