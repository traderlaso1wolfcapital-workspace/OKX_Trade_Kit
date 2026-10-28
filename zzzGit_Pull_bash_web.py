# -*- coding: utf-8 -*-
"""
===============================================================================
    🚀 TLS1 CLOUD DEPLOY - KÍCH HOẠT PULL & KHỞI ĐỘNG WEB SERVER TRÊN MAC MINI M1
===============================================================================
Script này kết nối SSH từ máy tính Windows của CEO tới máy Mac Mini M1:
  - Tự động di chuyển vào /Users/tls1clawbot/Desktop/OKX_Trade_Kit/web_app
  - Thực thi: git pull origin main && bash start_web_server.sh
  - Stream toàn bộ log tiến trình (Git pull, Build Frontend, PM2, Cloudflare Tunnel)
    về màn hình console của CEO theo thời gian thực.
===============================================================================
"""

import os
import sys
import json
import time
import socket
import getpass
import subprocess

# Đảm bảo terminal Windows hiển thị tiếng Việt UTF-8 chuẩn
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    import paramiko
except ImportError:
    print("⚠️ Đang tự động cài đặt thư viện paramiko...")
    subprocess.run([sys.executable, "-m", "pip", "install", "paramiko"], check=False)
    import paramiko

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_PATH = os.path.join(BASE_DIR, "mac_mini_config.json")

DEFAULT_CONFIG = {
    "host": "192.168.100.154",
    "port": 22,
    "username": "tls1clawbot",
    "password": "",
    "remote_path": "/Users/tls1clawbot/Desktop/OKX_Trade_Kit/web_app",
    "command": "git pull origin main && bash start_web_server.sh"
}

def load_config() -> dict:
    if os.path.exists(CONFIG_PATH):
        try:
            with open(CONFIG_PATH, "r", encoding="utf-8") as f:
                cfg = json.load(f)
                # Ghép với default nếu thiếu trường
                for k, v in DEFAULT_CONFIG.items():
                    if k not in cfg:
                        cfg[k] = v
                return cfg
        except Exception:
            pass
    return dict(DEFAULT_CONFIG)

def save_config(cfg: dict):
    try:
        with open(CONFIG_PATH, "w", encoding="utf-8") as f:
            json.dump(cfg, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"⚠️ Không thể lưu cấu hình: {e}")

def check_port(host: str, port: int, timeout: float = 2.0) -> bool:
    try:
        with socket.create_connection((host, port), timeout=timeout):
            return True
    except Exception:
        return False

def discover_mac_ip() -> str:
    """Tự động tìm kiếm IP của Mac Mini trong mạng LAN nếu IP cũ bị đổi qua DHCP"""
    print("🔍 Đang quét tìm máy Mac Mini trong mạng LAN (192.168.100.*)...")
    try:
        out = subprocess.check_output(["arp", "-a"], text=True, errors="replace")
        candidates = []
        for line in out.splitlines():
            line = line.strip()
            if "192.168.100." in line:
                parts = line.split()
                if len(parts) >= 1:
                    ip = parts[0]
                    if ip not in ("192.168.100.1", "192.168.100.255"):
                        candidates.append(ip)
        for ip in candidates:
            if check_port(ip, 22, timeout=1.0):
                print(f"🎯 Đã phát hiện thiết bị mở port SSH tại: {ip}")
                return ip
    except Exception:
        pass
    return ""

def setup_ssh_key_if_possible(client: paramiko.SSHClient):
    """Tự động sinh và nạp SSH Key vào Mac Mini để lần sau không bao giờ cần mật khẩu"""
    ssh_dir = os.path.expanduser("~/.ssh")
    os.makedirs(ssh_dir, exist_ok=True)
    key_path = os.path.join(ssh_dir, "id_ed25519")
    pub_path = f"{key_path}.pub"

    if not os.path.exists(key_path) or not os.path.exists(pub_path):
        try:
            print("🔑 Đang tạo cặp khóa SSH Ed25519 cục bộ...")
            subprocess.run(["ssh-keygen", "-t", "ed25519", "-N", "", "-f", key_path, "-q"], check=False)
        except Exception:
            return

    if os.path.exists(pub_path):
        try:
            with open(pub_path, "r", encoding="utf-8") as f:
                pub_key = f.read().strip()
            if pub_key:
                remote_cmd = (
                    "mkdir -p ~/.ssh && chmod 700 ~/.ssh && "
                    f'grep -qF "{pub_key}" ~/.ssh/authorized_keys 2>/dev/null || echo "{pub_key}" >> ~/.ssh/authorized_keys && '
                    "chmod 600 ~/.ssh/authorized_keys"
                )
                client.exec_command(remote_cmd)
        except Exception:
            pass

def main():
    print("===================================================================")
    print("  🚀 TLS1 CLOUD DEPLOY - KÍCH HOẠT WEB SERVER TRÊN MAC MINI M1")
    print("===================================================================")
    
    cfg = load_config()
    host = cfg.get("host") or "192.168.100.154"
    port = int(cfg.get("port") or 22)
    user = cfg.get("username") or "tls1clawbot"
    pwd = cfg.get("password") or ""
    remote_path = cfg.get("remote_path") or "/Users/tls1clawbot/Desktop/OKX_Trade_Kit/web_app"
    command = cfg.get("command") or "git pull origin main && bash start_web_server.sh"

    # 1. Kiểm tra kết nối tới IP hiện tại
    if not check_port(host, port, timeout=2.5):
        print(f"⚠️ Không kết nối được tới {host}:{port}. Đang tìm kiếm IP mới của Mac Mini...")
        new_ip = discover_mac_ip()
        if new_ip:
            host = new_ip
            cfg["host"] = new_ip
            save_config(cfg)
        else:
            print(f"❌ Không tìm thấy máy Mac Mini trên mạng LAN. Vui lòng kiểm tra Mac Mini có đang bật không.")
            input("\nBấm Enter để thoát...")
            sys.exit(1)

    print(f"📡 Máy chủ Mac Mini: {user}@{host}:{port}")
    print(f"📂 Thư mục Web App : {remote_path}")
    print(f"⚡ Lệnh thực thi   : {command}")
    print("-------------------------------------------------------------------")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    # 2. Thử đăng nhập bằng SSH Key trước nếu có
    connected = False
    ssh_dir = os.path.expanduser("~/.ssh")
    key_candidates = [
        os.path.join(ssh_dir, "id_ed25519"),
        os.path.join(ssh_dir, "id_rsa")
    ]
    for k in key_candidates:
        if os.path.exists(k):
            try:
                client.connect(hostname=host, port=port, username=user, key_filename=k, timeout=6)
                connected = True
                print("🔑 Đã xác thực thành công qua SSH Key!")
                break
            except Exception:
                pass

    # 3. Đăng nhập bằng mật khẩu nếu chưa kết nối được
    if not connected:
        if pwd:
            try:
                client.connect(hostname=host, port=port, username=user, password=pwd, timeout=8)
                connected = True
                print("🔒 Đã xác thực thành công bằng mật khẩu đã lưu!")
            except Exception as e:
                print(f"⚠️ Mật khẩu lưu trong cấu hình không đúng ({e}).")
                pwd = ""

    # Nếu vẫn chưa có kết nối, yêu cầu người dùng nhập mật khẩu
    if not connected:
        attempts = 0
        while attempts < 3 and not connected:
            attempts += 1
            prompt_text = f"🔑 Nhập mật khẩu Mac Mini cho user '{user}': "
            try:
                entered_pwd = getpass.getpass(prompt_text)
            except Exception:
                entered_pwd = input(prompt_text)

            if not entered_pwd:
                print("❌ Mật khẩu không được để trống!")
                continue

            try:
                print("⏳ Đang kết nối...")
                client.connect(hostname=host, port=port, username=user, password=entered_pwd, timeout=10)
                connected = True
                pwd = entered_pwd
                print("✅ Đăng nhập thành công!")

                # Hỏi lưu mật khẩu để các lần sau chạy 100% tự động
                try:
                    ans = input("\n💾 Bạn có muốn LƯU MẬT KHẨU này để các lần sau chạy tự động 100% không? (Y/n): ").strip().lower()
                    if ans in ("", "y", "yes"):
                        cfg["password"] = pwd
                        cfg["host"] = host
                        save_config(cfg)
                        print("✅ Đã lưu mật khẩu vào mac_mini_config.json!")
                        # Nạp thêm SSH Key để tăng cường bảo mật
                        setup_ssh_key_if_possible(client)
                except Exception:
                    pass
            except paramiko.AuthenticationException:
                print("❌ Sai mật khẩu! Vui lòng thử lại.")
            except Exception as e:
                print(f"❌ Lỗi kết nối: {e}")
                break

    if not connected:
        print("❌ Không thể kết nối tới Mac Mini. Hủy thao tác.")
        input("\nBấm Enter để thoát...")
        sys.exit(1)

    print("-------------------------------------------------------------------")
    print("🚀 BẮT ĐẦU CHẠY LỆNH TRÊN MAC MINI M1:")
    full_cmd = (
        'export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.npm-global/bin:$PATH"; '
        '[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile" 2>/dev/null; '
        '[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null; '
        f'cd {remote_path} && {command}'
    )
    print(f"👉 $ {full_cmd}\n")

    # 4. Thực thi lệnh với PTY để nhận toàn bộ màu sắc và output real-time
    try:
        transport = client.get_transport()
        channel = transport.open_session()
        channel.get_pty(term="xterm-256color", width=120, height=35)
        channel.exec_command(full_cmd)

        while True:
            if channel.recv_ready():
                data = channel.recv(4096)
                if not data:
                    break
                try:
                    text = data.decode("utf-8", errors="replace")
                except Exception:
                    text = str(data)
                sys.stdout.write(text)
                sys.stdout.flush()

            if channel.exit_status_ready():
                # Đọc nốt phần buffer còn lại
                while channel.recv_ready():
                    data = channel.recv(4096)
                    if data:
                        sys.stdout.write(data.decode("utf-8", errors="replace"))
                        sys.stdout.flush()
                break

            time.sleep(0.05)

        exit_code = channel.recv_exit_status()
        client.close()

        print("\n===================================================================")
        if exit_code == 0:
            print("  🎉 HOÀN TẤT 100%! HỆ THỐNG ĐÃ ĐƯỢC CẬP NHẬT & CHẠY 24/7 TRÊN MAC MINI!")
            print("  🌐 Domain Cloudflare Live: https://autotrader.fun")
            print("  🏠 Truy cập nội bộ LAN   : http://192.168.100.154:8080")
        else:
            print(f"  ⚠️ Tiến trình kết thúc với mã lỗi: {exit_code}")
        print("===================================================================")

    except Exception as e:
        print(f"\n❌ Lỗi trong quá trình thực thi: {e}")
        try:
            client.close()
        except Exception:
            pass

    input("\nBấm Enter để kết thúc...")

if __name__ == "__main__":
    main()
