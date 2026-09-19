import os
import subprocess
import sys

print("=========================================")
print("  TỰ ĐỘNG ĐỒNG BỘ (PULL) CODE TỪ GITHUB")
print("  🛡️ NGUYÊN TẮC: ƯU TIÊN TUYỆT ĐỐI MÁY CEO")
print("=========================================")

base_dir = os.path.dirname(os.path.abspath(__file__))
git = "git"

def run_cmd(cmd, check=False):
    return subprocess.run(cmd, cwd=base_dir, capture_output=True, text=True, check=check)

# 1. Kiểm tra và bảo lưu toàn bộ thay đổi Local hiện tại của CEO
print("[1] Kiểm tra và bảo lưu an toàn mã nguồn Local của CEO...")
status_res = run_cmd([git, "status", "--porcelain"])
has_uncommitted = bool(status_res.stdout.strip())

if has_uncommitted:
    print("    -> Phát hiện thay đổi mới trên máy CEO. Đang commit bảo vệ...")
    run_cmd([git, "add", "."])
    # Tạm loại trừ các file dev/rác như trong zzPush_To_GitHub.py
    run_cmd([git, "reset", "HEAD", "TLS1_Trading_Web", "web_frontend", "old_index.css", "old_media.css", "patch_auth.py", "test_limit.py"])
    run_cmd([
        git,
        "-c", "user.name=TLS1 Admin",
        "-c", "user.email=admin@tls1.com",
        "commit",
        "-m", "Local CEO backup before pull"
    ])
    print("    -> Đã niêm phong an toàn các thay đổi Local trước khi pull.")
else:
    print("    -> Cây thư mục Local đang sạch sẽ.")

# 2. Tải dữ liệu mới nhất từ GitHub
print("[2] Đang tải dữ liệu mới nhất từ GitHub (git fetch origin main)...")
fetch_res = run_cmd([git, "fetch", "origin", "main"])
if fetch_res.returncode != 0:
    print("❌ LỖI: Không thể kết nối hoặc tải dữ liệu từ GitHub:")
    print(fetch_res.stderr)
    sys.exit(1)
print("    -> Tải dữ liệu từ GitHub thành công.")

# 3. Tiến hành Merge với chiến lược '-X ours' (Ưu tiên tuyệt đối máy CEO nếu xung đột)
print("[3] Đang gộp mã nguồn với chiến lược bảo vệ: -X ours (Ưu tiên bản máy CEO)...")
merge_res = run_cmd([
    git,
    "-c", "user.name=TLS1 Admin",
    "-c", "user.email=admin@tls1.com",
    "merge",
    "origin/main",
    "-X", "ours",
    "--no-edit",
    "-m", "Merge remote from GitHub (Uu tien tuyet doi ban va may CEO)"
])

# 4. Kiểm tra xung đột và tự động xử lý nếu có
conflict_check = run_cmd([git, "diff", "--name-only", "--diff-filter=U"])
conflicted_files = [f for f in conflict_check.stdout.splitlines() if f.strip()]

if conflicted_files:
    print(f"⚠️ Phát hiện {len(conflicted_files)} file phát sinh xung đột (conflict) với code từ GitHub:")
    for f in conflicted_files:
        print(f"    - {f}")
    print("🛡️ Đang tự động ép lấy 100% bản vá trên máy tính CEO (git checkout --ours)...")
    run_cmd([git, "checkout", "--ours", "."])
    run_cmd([git, "add", "."])
    run_cmd([
        git,
        "-c", "user.name=TLS1 Admin",
        "-c", "user.email=admin@tls1.com",
        "commit",
        "-m", "Resolve conflicts: 100% uu tien ban va may CEO"
    ])
    print("✅ Đã giải quyết xong toàn bộ xung đột, bảo toàn 100% bản vá trên máy CEO!")
else:
    print("    -> Không có xung đột hoặc các thay đổi đã được tự động gộp sạch sẽ.")

# 5. Thông tin trạng thái cuối cùng
log_res = run_cmd([git, "log", "-1", "--oneline"])
print("=========================================")
print("🚀 ĐỒNG BỘ HOÀN TẤT! CODE TRÊN MÁY CEO AN TOÀN TUYỆT ĐỐI.")
print(f"Commit hiện tại: {log_res.stdout.strip()}")
print("=========================================")
