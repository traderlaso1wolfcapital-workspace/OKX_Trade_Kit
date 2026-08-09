#!/bin/bash
echo "Đang dừng các tiến trình..."
pkill -f "python3 main.py"
pkill -f "vite"
echo "✅ Đã dừng hệ thống Web Server!"
