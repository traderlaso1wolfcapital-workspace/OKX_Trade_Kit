#!/bin/bash
echo "Đang dừng các tiến trình Web Server & Tunnel..."
pm2 stop all 2>/dev/null
pm2 delete all 2>/dev/null
pkill -f "python3 main.py" 2>/dev/null
pkill -f "vite" 2>/dev/null
pkill -f "cloudflared tunnel run" 2>/dev/null
echo "✅ Đã dừng toàn bộ hệ thống!"
