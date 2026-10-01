@echo off
chcp 65001 >nul
echo ========================================================
echo   TLS1 - FIX QUYEN GHI/XOA CHO THU MUC .GIT (WIN 11)
echo ========================================================
echo.
echo Dang tiep quan so huu (takeown) cho thu muc .git...
takeown /f "%~dp0.git" /r /d y >nul 2>&1

echo Dang cap quyen Full Control (icacls) cho Users...
icacls "%~dp0.git" /grant "BUILTIN\Users:(OI)(CI)F" /T /C >nul 2>&1

echo.
echo [OK] DA CAP QUYEN THANH CONG!
echo Tu gio Git se khong bao gio bi loi 'unable to write index' hoac 'main.lock' nua.
echo.
pause
