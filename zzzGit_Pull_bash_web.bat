@echo off
chcp 65001 >nul
title TLS1 - Deploy Mac Mini M1 Web Server
cd /d "%~dp0"

REM Kiem tra python trong virtualenv hoac global
if exist "..\..\.venv\Scripts\python.exe" (
    "..\..\.venv\Scripts\python.exe" zzzGit_Pull_bash_web.py
) else if exist "..\.venv\Scripts\python.exe" (
    "..\.venv\Scripts\python.exe" zzzGit_Pull_bash_web.py
) else (
    python zzzGit_Pull_bash_web.py
)

pause
