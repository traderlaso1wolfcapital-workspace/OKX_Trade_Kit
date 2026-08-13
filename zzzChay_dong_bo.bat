@echo off
rem ------------------------------------------------------------
rem  Sync toàn bộ nội dung thư mục nguồn sang thư mục đích
rem  Source : "D:\\4. Trade Coin - TLS1\\4. Cursor - IDE\\TLS1_Company\\zProjects\\OKX_Trade_Kit"
rem  Target : "D:\\4. Trade Coin - TLS1\\4. Cursor - IDE\\OKX_Trade_Kit"
rem ------------------------------------------------------------

set "SRC=D:\\4. Trade Coin - TLS1\\4. Cursor - IDE\\TLS1_Company\\zProjects\\OKX_Trade_Kit"
set "DST=D:\\4. Trade Coin - TLS1\\4. Cursor - IDE\\OKX_Trade_Kit"

rem Tạo thư mục đích nếu chưa tồn tại
if not exist "%DST%" md "%DST%"

rem /MIR  : Mirror (copy + delete) – đồng bộ 100%
rem /R:3  : Số lần retry khi lỗi
rem /W:5  : Thời gian chờ giữa các retry (giây)
rem /FFT  : Tolerate 2‑second timestamp differences
rem /COPY:DAT  : Copy Data, Attributes, Timestamps
robocopy "%SRC%" "%DST%" /MIR /R:3 /W:5 /FFT /COPY:DAT

rem Kiểm tra kết quả
if %ERRORLEVEL% LSS 8 (
    echo Sync completed successfully.
) else (
    echo !!! Sync encountered errors (errorlevel=%ERRORLEVEL%).
)

pause
