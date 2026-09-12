import json
import re
import os
import subprocess

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

# 1. Update version.json
with open(v_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

old_v = data['version']
if ENABLE_BUILD_EXE_ACTION:
    new_v = bump_version(old_v)
    data['version'] = new_v
    with open(v_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4)
    print(f"[1] Đã tự động tăng Version từ {old_v} lên {new_v}")
else:
    new_v = old_v
    print(f"[1] [ĐÃ KHÓA BUILD .EXE] Giữ nguyên Version: {new_v}")

# 2. Git Commands
git = "git"

print("[2] Đang lưu thay đổi (Commit) dưới danh nghĩa Ẩn danh (TLS1 Admin)...")
subprocess.run([git, "add", "."], check=False, cwd=base_dir)

print("[2.1] Tạm thời loại bỏ TLS1_Trading_Web và các file dev thọ khỏi commit lần này...")
subprocess.run([git, "reset", "HEAD", "TLS1_Trading_Web", "web_frontend", "old_index.css", "old_media.css", "patch_auth.py", "test_limit.py"], check=False, cwd=base_dir)

subprocess.run([git, "-c", "user.name=TLS1 Admin", "-c", "user.email=admin@tls1.com", "commit", "-m", f"Update App v{new_v}"], check=False, cwd=base_dir)

print("[2.2] Đồng bộ với remote trước khi push...")
subprocess.run([git, "pull", "--no-edit", "origin", "main"], check=False, cwd=base_dir)

if ENABLE_BUILD_EXE_ACTION:
    print(f"[3] Đang tạo nhãn phiên bản (Tag) v{new_v} để kích hoạt Build Action...")
    subprocess.run([git, "tag", f"v{new_v}"], check=False, cwd=base_dir)
else:
    print("[3] [ĐÃ KHÓA] Bỏ qua bước tạo Tag (không kích hoạt Build Action .exe)...")

print("[4] Đang đẩy code lên GitHub...")
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
        print("✅ HOÀN TẤT! CODE ĐÃ ĐƯỢC ĐẨY LÊN GITHUB (ĐÃ KHÓA BUILD ACTION .EXE).")
    print(f"Phiên bản: v{new_v}")
else:
    print("❌ THẤT BẠI: Quá trình đẩy code lên GitHub gặp lỗi (Exit code != 0).")
print("=========================================")
