@echo off
echo Installing dependencies...
pip install pyinstaller requests

echo Building updater.exe...
if exist "build\updater" rmdir /s /q "build\updater"
python -m PyInstaller --noconfirm --onefile --console --icon="media\logo.ico" updater.py

echo Copying to App_Release folder...
copy dist\updater.exe App_Release\updater.exe

echo Done! Please check App_Release folder.
pause
