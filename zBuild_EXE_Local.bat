@echo off
echo =========================================
echo   TỰ ĐỘNG BUILD FILE EXE (CỤC BỘ)
echo =========================================
cd TLS1_Trading_App

echo [1] Dang xac dinh thu muc lightweight_charts...
python -c "import lightweight_charts, os; print(os.path.join(os.path.dirname(lightweight_charts.__file__), 'js'))" > chart_dir.txt
set /p CHART_JS_DIR=<chart_dir.txt
del chart_dir.txt

echo [2] Dang tien hanh dong goi bang PyInstaller (Se mat vai phut)...
python -m PyInstaller --noconfirm --onefile --windowed --icon "media\logo.ico" --name "TLS1_Trading_Setup" --paths .. --add-data "version.json;." --add-data "media;media" --add-data "%CHART_JS_DIR%;lightweight_charts/js" --hidden-import "z_bot_sub1.bot_config" --hidden-import "z_bot_sub1.bot_strategy" --hidden-import "z_bot_sub1.bot_api" --hidden-import "z_bot_sub1.bot_indicators" --hidden-import "z_bot_sub1.bot_orders" --hidden-import "z_bot_sub1.bot_ui" --hidden-import "z_bot_sub1.bot_sub1" --hidden-import "z_bot_sub2.bot_config" --hidden-import "z_bot_sub2.bot_strategy" --hidden-import "z_bot_sub2.bot_api" --hidden-import "z_bot_sub2.bot_indicators" --hidden-import "z_bot_sub2.bot_orders" --hidden-import "z_bot_sub2.bot_ui" --hidden-import "z_bot_sub2.bot_sub2" --hidden-import "sys_bot_sub1" --hidden-import "sys_bot_sub2" --hidden-import "PyQt6.QtWebEngineCore" --hidden-import "PyQt6.QtWebEngineWidgets" --collect-all "z_bot_sub1" --collect-all "z_bot_sub2" --collect-all "PyQt6" --collect-all "lightweight_charts" --collect-all "pandas" gui_main.py

echo =========================================
echo HOÀN TẤT!
echo File EXE nam tai: zProjects\OKX_Trade_Kit\TLS1_Trading_App\dist\TLS1_Trading_Setup.exe
echo =========================================
pause
