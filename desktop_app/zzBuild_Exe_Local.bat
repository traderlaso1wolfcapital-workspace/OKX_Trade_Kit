@echo off
echo ===================================================
echo     TLS1 TRADING APP - DONG GOI EXE LOCAL
echo ===================================================
echo.
echo [1] Cai dat PyInstaller (Neu chua co)...
pip install pyinstaller

echo.
echo [2] Lay duong dan thu vien bieu do...
python -c "import lightweight_charts, os; print(os.path.join(os.path.dirname(lightweight_charts.__file__), 'js'))" > chart_dir.txt
set /p CHART_JS_DIR=<chart_dir.txt
del chart_dir.txt

echo.
echo [3] Dang dong goi ra file .exe (Vui long doi vai phut)...
python -m PyInstaller --noconfirm TLS1_Trading_Setup.spec

echo.
echo ===================================================
echo HOAN TAT! File EXE da duoc tao thanh cong.
echo Duong dan: dist\TLS1_Trading_Setup.exe
echo ===================================================
pause
