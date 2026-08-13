@echo off
title TLS1 Trading Web Launcher

echo ===================================================
echo [0/3] Don dep cac tien trinh cu dang chay ngam...
echo ===================================================
for /f "tokens=5" %%a in ('netstat -aon ^| find "8080"') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| find "5173"') do taskkill /F /PID %%a >nul 2>&1
echo.

echo ===================================================
echo [1/3] Kiem tra va cai dat dependencies cho Frontend...
echo ===================================================
cd frontend
if not exist node_modules (
    echo node_modules khong ton tai. Dang chay npm install, vui long cho...
    call npm install
) else (
    echo node_modules da ton tai. Bo qua buoc cai dat.
)
cd ..

echo.
echo ===================================================
echo [2/3] Dang khoi chay FastAPI Backend (Port 8080)...
echo ===================================================
start "TLS1 Web Backend (FastAPI)" cmd /c "..\..\..\.venv\Scripts\python backend\main.py"

echo.
echo ===================================================
echo [3/3] Dang khoi chay React Frontend (Port 5173)...
echo ===================================================
cd frontend
start "TLS1 Web Frontend (Vite)" cmd /c "npm run dev"
cd ..

echo.
echo ===================================================
echo [+] KHOI CHAY HOAN TAT!
echo [+] Backend dang chay tai: http://localhost:8080
echo [+] Frontend dang chay tai: http://localhost:5173
echo [+] Vui long cho 3-5 giay roi mo trinh duyet truy cap:
echo     ==> http://localhost:5173 <==
echo ===================================================
pause
