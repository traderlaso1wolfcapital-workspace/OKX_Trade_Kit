#!/bin/bash
# Dừng các tiến trình cũ nếu có
pkill -f "python3 main.py"
pkill -f "vite"

# Khởi động Backend
echo "Đang khởi động Backend..."
cd web_app/backend
nohup python3 main.py > backend.log 2>&1 &
BACKEND_PID=$!
echo "✅ Backend đã chạy ngầm (PID: $BACKEND_PID)"

# Khởi động Frontend
echo "Đang khởi động Frontend..."
cd ../frontend
nohup npm run dev -- --host 0.0.0.0 > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "✅ Frontend đã chạy ngầm (PID: $FRONTEND_PID)"

echo "---------------------------------------------------"
echo "🚀 HỆ THỐNG ĐÃ SẴN SÀNG CHẠY 24/7!"
echo "Truy cập Web UI tại: http://localhost:5173"
echo "(Hoặc dùng IP của máy Mac này nếu truy cập từ xa)"
echo "Để dừng hệ thống, hãy chạy lệnh: ./stop_web_server.sh"
echo "---------------------------------------------------"
