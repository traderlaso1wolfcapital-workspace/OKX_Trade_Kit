#!/bin/bash
# Dừng các tiến trình cũ nếu có
pkill -f "python3 main.py"
pkill -f "vite"

# Lấy thư mục gốc của script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

# Khởi động Backend
echo "Đang khởi động Backend..."
cd "$DIR/backend"
nohup python3 main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend đã chạy ngầm (PID: $BACKEND_PID)"

# Khởi động Frontend
echo "Đang khởi động Frontend..."
cd "$DIR/frontend"
nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend đã chạy ngầm (PID: $FRONTEND_PID)"

echo "---------------------------------------------------"
echo "🚀 HỆ THỐNG ĐÃ SẴN SÀNG CHẠY 24/7!"
echo "Truy cập Web UI tại: http://localhost:5173"
echo "Để dừng hệ thống, hãy chạy lệnh: ./stop_web_server.sh"
