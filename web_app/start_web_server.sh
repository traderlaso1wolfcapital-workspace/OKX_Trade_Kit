#!/bin/bash
export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:$HOME/.npm-global/bin:$PATH"
[ -f "$HOME/.zprofile" ] && source "$HOME/.zprofile" 2>/dev/null
[ -f "$HOME/.zshrc" ] && source "$HOME/.zshrc" 2>/dev/null

# Tự động định vị PM2 chính xác (hỗ trợ cả npm global, brew và standard PATH)
PM2_CMD="pm2"
if ! command -v pm2 &> /dev/null; then
    if [ -x "$HOME/.npm-global/bin/pm2" ]; then
        PM2_CMD="$HOME/.npm-global/bin/pm2"
        export PATH="$HOME/.npm-global/bin:$PATH"
    elif [ -x "/opt/homebrew/bin/pm2" ]; then
        PM2_CMD="/opt/homebrew/bin/pm2"
        export PATH="/opt/homebrew/bin:$PATH"
    fi
fi

# Dừng các tiến trình cũ nếu có
echo "Đang dọn dẹp các tiến trình cũ..."
pkill -f "python3 main.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "cloudflared tunnel run" 2>/dev/null
$PM2_CMD delete all 2>/dev/null

# Lấy thư mục gốc của script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT="$(dirname "$DIR")"

echo "Đang cài đặt các thư viện cần thiết từ requirements.txt..."
cd "$DIR/backend"
pip3 install -r requirements.txt --break-system-packages || pip3 install -r requirements.txt

echo "Đang Build Frontend tối ưu hóa..."
cd "$DIR/frontend"
npm install
npm run build

echo "Đang khởi động toàn bộ hệ thống bằng PM2..."
cd "$PROJECT_ROOT"
$PM2_CMD start ecosystem.config.js
$PM2_CMD save

# Chờ 2 giây để tiến trình ổn định và kiểm tra trạng thái
sleep 2
$PM2_CMD status

# Khởi động Cloudflare Tunnel
echo "Đang khởi động Cloudflare Tunnel..."
nohup cloudflared tunnel run --token eyJhIjoiNzFmZjE5ZTAxMzQzM2FkNDBiMWMyYjU3Njk4ZmFmNmUiLCJ0IjoiNWYyZTE0NmEtZjNjOS00NjJlLTg4YzctYzAyNzk2NzQ1MTBlIiwicyI6IlpqaG1Nak13TW1VdFlXUXhPUzAwTVRFeUxUZzJPR0l0T1dJNE1EbGlZelUzWXpoaSJ9 > "$DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "✅ Cloudflare Tunnel đã thông mạng (PID: $TUNNEL_PID)"

echo "---------------------------------------------------"
echo "🚀 HỆ THỐNG ĐÃ SẴN SÀNG CHẠY 24/7!"
echo "Toàn bộ Frontend và Backend đã gộp chung chạy trên cổng 8080 (kèm cầu nối tự động cổng 5173)."
echo "Truy cập trực tiếp tại máy: http://localhost:8080 hoặc http://localhost:5173"
echo "Truy cập qua Domain: https://autotrader.fun"
echo "💡 Ghi chú: Hệ thống hỗ trợ song song cả 2 cổng 8080 và 5173, tương thích 100% với cấu hình Cloudflare Zero Trust."
echo "Để kiểm tra log Backend: pm2 logs tls1-bot-backend --lines 20"
echo "Để kiểm tra log Cloudflare: tail -n 20 \"$DIR/tunnel.log\""
echo "Để dừng hệ thống, hãy chạy lệnh: pm2 stop all && pkill -f cloudflared"
