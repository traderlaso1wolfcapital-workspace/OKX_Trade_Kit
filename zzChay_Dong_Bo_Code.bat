@echo off
title TLS1 Auto-Sync Code
color 0A
echo ========================================================
echo HE THONG DONG BO TU DONG (CHUYEN CODE PYTHON VA AGENTS)
echo ========================================================
echo Dang giam sat thu muc OKX_Trade_Kit...
echo Khi Sep chay file nay, he thong se copy toan bo code
echo moi nhat sang may cu mot lan duy nhat.
echo ========================================================

robocopy "%~dp0." "D:\4. Trade Coin - TLS1\4. Cursor - IDE\OKX_Trade_Kit" /MIR /XO /XD .venv __pycache__ .git json_data python_nuget .gemini cython_build obf_dist build dist App_Release Output Update_Package Old /XF *.json .api_* *.pyd *.c *.log /NDL /NC /NS /NP

echo.
echo Da copy dong bo thanh cong!
pause
