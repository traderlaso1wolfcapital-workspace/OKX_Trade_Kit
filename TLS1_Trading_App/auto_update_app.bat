@echo off
chcp 65001 >nul
echo =========================================
echo    AUTO RELEASE TLS1 TRADING APP
echo =========================================
echo.

echo [1/6] Dang tang so phien ban (Version) tu dong...
python bump_version.py
echo.

echo [1.5/6] Dang build updater.exe moi nhat...
if exist "build\updater" rmdir /s /q "build\updater"
python -m PyInstaller --noconfirm --onefile --console --icon="media\logo.ico" updater.py
copy /Y "dist\updater.exe" "App_Release\updater.exe"
echo.

echo [2/6] Dang ma hoa Code (PyArmor) va Build TLS1 Trading.exe...
taskkill /f /im "TLS1 Trading.exe" >nul 2>&1
taskkill /f /im "TLS1 Trading Setup.exe" >nul 2>&1
if exist "obf_dist" rmdir /s /q "obf_dist"
if exist "build\TLS1 Trading" rmdir /s /q "build\TLS1 Trading"

for /f "delims=" %%i in ('python -c "import lightweight_charts, os; print(os.path.join(os.path.dirname(lightweight_charts.__file__), 'js'))"') do set "CHART_JS_DIR=%%i"

echo Dang chuan bi moi truong Build Cython...
if exist "cython_build" rmdir /s /q "cython_build"
mkdir "cython_build"

echo Copy cac file ma nguon sang thu muc build doc lap...
xcopy /E /I /Y "..\z_bot_sub1" "cython_build\z_bot_sub1" >nul
xcopy /E /I /Y "..\z_bot_sub2" "cython_build\z_bot_sub2" >nul
copy /Y "..\sys_bot_*.py" cython_build >nul
copy /Y gui_main.py cython_build >nul
copy /Y version.json cython_build >nul
xcopy /E /I /Y media cython_build\media >nul
copy /Y "..\build_cython.py" cython_build >nul

cd cython_build

echo Dang bien dich source code thanh C bang Cython...
python build_cython.py

echo Dang xoa cac file .py goc trong thu muc build de chi giu lai file .pyd bao mat...
del /q "sys_bot_*.py"
del /q "z_bot_sub1\*.py"
del /q "z_bot_sub2\*.py"
del /q "build_cython.py"

echo Dang nhoi Code da ma hoa vao file .exe...
python -m PyInstaller --noconfirm --onefile --windowed --icon "media\logo.ico" --name "TLS1 Trading" ^
--add-data "version.json;." ^
--add-data "media;media" ^
--add-data "%CHART_JS_DIR%;lightweight_charts/js" ^
--hidden-import "z_bot_sub1.bot_config" ^
--hidden-import "z_bot_sub1.bot_strategy" ^
--hidden-import "z_bot_sub2.bot_config" ^
--hidden-import "z_bot_sub2.bot_strategy" ^
--hidden-import "sys_bot_sub1" ^
--hidden-import "sys_bot_sub2" ^
gui_main.py

cd ..
echo.
echo [3/6] Dang copy vao thu muc App_Release va thu muc hien tai...
copy /Y "cython_build\dist\TLS1 Trading.exe" "App_Release\TLS1 Trading.exe"
copy /Y "cython_build\dist\TLS1 Trading.exe" "..\TLS1 Trading.exe"
copy /Y "App_Release\updater.exe" "App_Release\updater.exe" >nul 2>&1
REM Rebuild updater.exe tuoi moi de dam bao update.zip luon chua phien ban moi nhat
if exist "dist\updater.exe" copy /Y "dist\updater.exe" "App_Release\updater.exe"
REM Copy version.json vao App_Release de app co the doc dung version khi chay .exe
copy /Y "version.json" "App_Release\version.json"
xcopy /E /I /Y "media" "App_Release\media"

echo [3.5/6] Dang tao file .env.example (khong chua API Key) cho khach hang...
echo OKX_IS_DEMO="False" > "App_Release\.env.example"
echo OKX_API_KEY="" >> "App_Release\.env.example"
echo OKX_SECRET_KEY="" >> "App_Release\.env.example"
echo OKX_PASSPHRASE="" >> "App_Release\.env.example"


echo.
echo [4/6] Dang nen thanh file update.zip...
powershell -Command "Compress-Archive -Path 'App_Release\*' -DestinationPath 'Update_Package\update.zip' -Force"

echo.
echo [5/6] Dang tu dong dong goi file Setup.exe bang Inno Setup...
"C:\Program Files (x86)\Inno Setup 6\ISCC.exe" build_installer.iss

echo.
echo [5.5/6] Dang copy update.zip va version.json vao thu muc Output...
copy /Y "Update_Package\update.zip" "Output\update.zip"
copy /Y "version.json" "Output\version.json"

echo.
echo [6/6] Dang gom chung 3 file cuoi cung vao thu muc chung tren Google Drive...
if not exist "G:\My Drive\Output_Chung" mkdir "G:\My Drive\Output_Chung"
copy /Y "Output\TLS1 Trading Setup.exe" "G:\My Drive\Output_Chung\"
copy /Y "Update_Package\update.zip" "G:\My Drive\Output_Chung\"
copy /Y "version.json" "G:\My Drive\Output_Chung\"

echo.
echo [7/7] Dang don dep cac file rac va thu muc tam thoi...
if exist "cython_build" rmdir /s /q "cython_build"
if exist "dist" rmdir /s /q "dist"

echo.
echo [8/8] Dang ket noi sang Mac Mini de build ban Mac tu dong...
echo (Luu y: Vui long go mat khau cua may Mac vao neu duoc hoi. Man hinh se khong hien chu, hay cu go va an Enter)
ssh tls1clawbot@192.168.2.79 "cd ~/Downloads/TLS1_Trading_App && sh build_mac.sh"

echo.
echo =========================================
echo    HOAN THANH DONG GOI BAN MOI 100%%!
echo =========================================
echo Moi thu ban can da duoc gom san vao thu muc Output!
echo Ban chi can lam not viec sau tren Google Drive:
echo 1. Mo thu muc Output o tren may tinh.
echo 2. Keo tha CA 3 FILE trong do len trang web Google Drive.
echo 3. Bam chon "Thay the tep hien tai" (Ghi de) de giu nguyen link.
echo.
pause
