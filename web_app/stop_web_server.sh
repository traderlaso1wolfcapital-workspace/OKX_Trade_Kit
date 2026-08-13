#!/bin/bash
echo "Đang dừng các tiến trình Web Server & Tunnel..."
pkill -f "python3 main.py"
pkill -f "vite"
pkill -f "cloudflared tunnel run"
echo "✅ Đã dừng toàn bộ hệ thống!"
