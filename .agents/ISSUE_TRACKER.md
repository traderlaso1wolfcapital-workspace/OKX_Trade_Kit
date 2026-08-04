# Hệ thống Lưu vết Lỗi (Bug Tracker)

File này đóng vai trò là bảng theo dõi toàn bộ các lỗi (bugs) hoặc vấn đề (issues) phát sinh trong quá trình Bot giao dịch thực tế. 
**QUY TẮC BẮT BUỘC DÀNH CHO CÁC AI AGENT:** 
- Bất cứ khi nào Agent bắt đầu một phiên làm việc mới liên quan đến việc sửa lỗi hoặc cập nhật tính năng, Agent **PHẢI** đọc file này trước tiên để xem có lỗi nào đang tồn tại hay không.
- Sau khi fix xong một lỗi, Agent **PHẢI** tự động xóa (hoặc đánh dấu hoàn thành) lỗi đó khỏi danh sách này.
- Bất kỳ lỗi mới nào phát sinh chưa được giải quyết phải được ghi chú vào đây.

---

## 🐞 CÁC LỖI HIỆN TẠI ĐANG CHỜ XỬ LÝ (PENDING BUGS)

*(Danh sách trống — tất cả lỗi đã được xử lý)*




---

## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[05/08/2026]** - Sửa lỗi đen xì màn hình Chart (QWebEngineView) trên bản APP máy khách:
  - **Nguyên nhân:** Khi đóng gói bằng PyInstaller, thành phần WebEngine của PyQt6 thiếu tương thích với GPU/Driver đồ họa trên một số cấu hình máy khách, dẫn đến không thể render biểu đồ và xuất hiện màn hình đen.
  - **Cập nhật:** Đã chèn thêm các cờ `sys.argv.append("--disable-gpu")`, `--disable-software-rasterizer` và thiết lập biến môi trường `QTWEBENGINE_CHROMIUM_FLAGS` trong `gui_main.py` ngay trước khi khởi tạo `QApplication`. Điều này ép WebEngine sử dụng Software Rendering thay cho GPU, khắc phục triệt để lỗi đen màn hình trên tất cả các máy tính. (Mã patch: `z276`)

- **[05/08/2026]** - Dọn dẹp File rác & Tự động Build Release v1.0.277 lên GitHub:
  - **Cập nhật:** Đã xóa bỏ các file test/rác phát sinh (`diff_gui_main.txt`, `fix_bugs.py`, `test.py`). Chạy thành công `zBuild_To_GitHub.py`, nâng version đồng bộ lên **`v1.0.277`**, commit, gắn tag `v1.0.277` và đẩy toàn bộ source code lên GitHub. GitHub Actions đã được kích hoạt tự động build bản cập nhật mới nhất cho khách hàng. (Mã patch: `z275`)

- **[05/08/2026]** - Áp dụng đồng bộ 100% toàn bộ cải tiến UI cho cả Bot SMC (Sub 2):
  - **Cập nhật:** Do `panel_main` (Bot EMA200) và `panel_sub2` (Bot SMC) dùng chung class `BotInstanceWidget` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), toàn bộ các cải tiến UI (Bảng vị thế, Căn lề phải 3 space, Cột Ký quỹ 85px, PNL 16px, Cột TP/SL PNL USDT Xanh/Đỏ nhạt, Nút Đóng đỏ 15%, Splitter ratio 75/25, Tab Cam #FF9900) đã tự động đồng bộ hoàn toàn sang **Bot SMC**. Đồng thời cập nhật nhãn `Bot Sub 2 (SMC)` thống nhất toàn app. (Mã patch: `z274`)

- **[05/08/2026]** - Chuyển đổi Cột Chốt lời | Dừng lỗ hiển thị Giá trị PNL Lời/Lỗ dự kiến bằng USDT:
  - **Cập nhật:** Thay thế hiển thị mức giá cũ (`4031.93 | 4129.87`) bằng giá trị Lời/Lỗ PNL thực tế dự kiến tính bằng USDT (`+12.50 | -12.50`) dựa trên TP/SL thực tế của lệnh đó trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Định dạng màu Chốt lời xanh lá nhạt (`#81c784`) và Dừng lỗ đỏ nhạt (`#ef5350`) mềm mại, dễ nhìn chuẩn theo yêu cầu CEO. (Mã patch: `z273`)

- **[05/08/2026]** - Ép chiều cao nút Đóng mở rộng phủ dọc sát mép trên/dưới ô:
  - **Cập nhật:** Thiết lập `btn_close.setSizePolicy(Expanding, Expanding)` và `setContentsMargins(6, 1, 6, 1)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Ép chiều cao nút đỏ Đóng giãn rộng tối đa theo chiều dọc kề sát biên trên và đường gạch dưới ô (chỉ để khe mỏng 1px), đồng thời giữ nguyên độ thu gọn chiều ngang 6px hai bên. (Mã patch: `z272`)

- **[05/08/2026]** - Nhả lại chiều dọc nút Đóng màu đỏ (chỉ còn ~7% lề trên/dưới):
  - **Cập nhật:** Giảm lề đệm trên/dưới `setContentsMargins(6, 2, 6, 2)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Giữ nguyên độ thu hẹp chiều ngang 6px đẹp mắt, tăng độ cao chiều dọc của nút đỏ Đóng để lề trên/dưới chỉ còn mỏng ~7% chuẩn theo ý kiến CEO. (Mã patch: `z271`)

- **[05/08/2026]** - Đổi tên Nút Cộng Đồng trên Header thành "Join Cộng đồng":
  - **Cập nhật:** Cập nhật text nút từ `💬 Cộng Đồng` thành **`💬 Join Cộng đồng`** trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) theo yêu cầu CEO. (Mã patch: `z270`)

- **[05/08/2026]** - Thu nhỏ nút Đóng màu đỏ trong Bảng vị thế (-15% kích thước ô):
  - **Cập nhật:** Bọc `btn_close` trong container widget `btn_container` và thiết lập `setContentsMargins(6, 4, 6, 4)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Giảm kích thước nút đỏ khoảng -15% so với kích thước ô, tạo khoảng hở lề gọn gàng và bo góc thẩm mỹ. (Mã patch: `z269`)

- **[05/08/2026]** - Đổi tên Tab Bot SMC và Khôi phục màu sắc chữ / viền trên màu Cam (#FF9900):
  - **Cập nhật:** Trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py):
    1. Đổi tên tab `Bot SMC - OB` ngắn gọn thành **`Bot SMC`**.
    2. Khôi phục màu chữ active (`color: #FF9900`) và viền trên active (`border-top: 3px solid #FF9900`) của các Tab Bot chính (`QTabWidget#OuterTabs`) về màu cam sáng chuẩn bản cũ theo đúng yêu cầu CEO. (Mã patch: `z268`)

- **[05/08/2026]** - Cơ chế Ép Cập Nhật Tự Động (Auto-Update) khi mở lại App & Thông báo khi đang chạy:
  - **Cập nhật:** Tách biệt 2 kịch bản cập nhật trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py):
    1. **Khi app đang chạy (`is_startup=False`):** Giữ nguyên nút thông báo nhấp nháy `🚀 Cập nhật ngay (vX.X.X)` ở góc trên giao diện, không can thiệp ngắt ngang các vị thế/bot đang giao dịch.
    2. **Khi tắt app đi mở lại (`is_startup=True`):** Sau 2 giây mở app, nếu phát hiện có bản cập nhật mới sẽ **ÉP AUTO-UPDATE TỰ ĐỘNG BẮT BUỘC** (`bypass_confirm=True`), tự động tải bản cài mới, thay thế file `.exe` và khởi động lại app mới mà không bắt khách thao tác bất cứ nút nào. (Mã patch: `z267`)

- **[05/08/2026]** - Điều chỉnh độ mờ Opacity khối Order Block (OB) lên 20%:
  - **Cập nhật:** Đặt tham số mờ màu nền khối OB Bullish (`rgba(21, 101, 192, 0.2)`) và Bearish (`rgba(198, 40, 40, 0.2)`) về mức **`20%`** chuẩn hài hòa theo yêu cầu CEO trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z266`)

- **[05/08/2026]** - Đẩy sạ thanh phân chia Splitter & Triệt tiêu khoảng trống thừa trên Terminal Logs:
  - **Cập nhật:** Thiết lập `setSizes([850, 150])` cùng `setStretchFactor(0, 1)` và `setStretchFactor(1, 0)`, đồng thời siết lề trên `console_layout.setContentsMargins(5, 2, 5, 5)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đẩy vị trí mặc định của thanh phân chia `......` xuống kề sát dòng `Terminal Logs:`, triệt tiêu hoàn toàn khoảng trống tối màu dư thừa phía trên. (Mã patch: `z265`)

- **[05/08/2026]** - Đẩy thanh phân chia (Splitter Handle) giữa Chart và Logs xuống phía dưới:
  - **Cập nhật:** Điều chỉnh tỷ lệ Splitter dọc `setSizes([680, 220])` và `setStretchFactor(0, 7) / (1, 3)` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đẩy thanh kéo splitter xuống phía dưới, ưu tiên 75% chiều cao cho vùng Chart & Bảng vị thế, loại bỏ khoảng không khoảng thừa phía trên `Terminal Logs:`. (Mã patch: `z264`)

- **[05/08/2026]** - Tự động bỏ bôi màu (Clear Highlight) khi nhấp chuột ra ngoài Bảng Vị Thế:
  - **Cập nhật:** Xây dựng class `FocusClearTableWidget` ghi đè sự kiện `focusOutEvent` để tự động gọi `clearSelection()` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Khi nhấp vào ô bất kỳ sẽ bôi màu highlight xanh cyan/teal mờ nổi bật, và khi nhấp chuột ra khu vực khác (như Chart, Logs, Nút bấm) sẽ tự động bỏ bôi màu và trả về trạng thái bình thường. (Mã patch: `z263`)

- **[05/08/2026]** - Điều chỉnh kích thước Font chữ Terminal Logs về mức 17px:
  - **Cập nhật:** Đặt kích thước font chữ Terminal Logs về **`17px`** (Consolas, monospace) theo yêu cầu CEO trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp cân bằng vừa mắt nhất giữa độ to và mật độ dòng log. (Mã patch: `z262`)

- **[05/08/2026]** - Khôi phục kích thước Font chữ Terminal Logs chuẩn 18px v1.0.271:
  - **Cập nhật:** Đã kiểm tra lịch sử commit `a097cd2` (v1.0.271): Font size gốc của Terminal Logs chính xác là **`18px`** (Consolas, monospace). Đã khôi phục từ `13px` lên lại **`18px`** chuẩn trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp các dòng log hiển thị to, rõ ràng và cực kỳ dễ đọc. (Mã patch: `z261`)

- **[05/08/2026]** - Tinh chỉnh độ rộng cột Ký quỹ (Col 2) vừa vặn chuẩn 85px:
  - **Cập nhật:** Căn chỉnh lại độ rộng cột *Ký quỹ* xuống mức **`85px`** vừa vặn hoàn hảo cho các lệnh có mức ký quỹ tối đa tới `999.00 $` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py), vừa đảm bảo vừa khít tinh tế vừa không chiếm dụng diện tích thừa của bảng. (Mã patch: `z260`)

- **[05/08/2026]** - Mở rộng độ rộng tối thiểu cột Ký quỹ (Col 2):
  - **Cập nhật:** Đặt chiều rộng cố định linh hoạt cho cột *Ký quỹ* tối thiểu `110px` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Đảm bảo khi đánh các lệnh ký quỹ lớn (như `100.00 $`, `1,500.00 $`, `10,000.00 $`) giao diện vẫn rộng rãi, không bao giờ bị co hẹp hay khuất ký tự `$`. (Mã patch: `z259`)

- **[05/08/2026]** - Đồng bộ kích thước font chữ bảng vị thế chuẩn 14px:
  - **Cập nhật:** Chuẩn hóa toàn bộ text hiển thị trong Bảng Vị Thế (tiêu đề, tên cặp coin, giá, ký quỹ, chữ `USDT`, phần `%` PNL, giá TP/SL) lên **14px**. Duy nhất con số tiền PNL thực tế (`-0.10` / `+1.41`) được tăng +2 size lên **16px** nổi bật trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z258`)

- **[05/08/2026]** - Thêm khoảng thở (Right Padding Spaces) cho cột Giá vào lệnh và Ký quỹ:
  - **Cập nhật:** Chèn 3 khoảng trống (`   `) phía cuối chuỗi ký tự hiển thị ở cột *Giá vào lệnh* và *Ký quỹ* giúp đẩy phần số và ký hiệu `$` lùi sang trái, tránh bị dính sát vào mép đường viền dọc bên phải trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z257`)

- **[05/08/2026]** - Căn lề số thẳng hàng & Tăng font size con số PNL thả nổi:
  - **Cập nhật:** Căn lề phải (`AlignRight`) cho cột *Giá vào lệnh* và *Ký quỹ* giúp thẳng hàng toàn bộ các dấu chấm thập phân `.` và ký hiệu `$`. Tăng +2 size (`16px`) riêng cho con số tiền PNL thực tế (`-0.10` / `+1.41`), giữ phần `USDT` và `%` ở size `13px` thường trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z256`)

- **[05/08/2026]** - Ẩn vạch kẻ đứt giá và nhãn giá EMA200 trên Chart:
  - **Cập nhật:** Đặt `price_line=False` và `price_label=False` khi khởi tạo `self.ema_line` trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py) giúp ẩn đường kẻ đứt phụ và tag giá EMA200 khỏi trục giá bên phải. (Mã patch: `z255`)

- **[05/08/2026]** - Đồng bộ StyleSheet Checkbox nguyên bản theo Ảnh 1 & Cấu hình chiến thuật:
  - **Cập nhật:** Khôi phục chuẩn `cb_style` gốc (`border: 1px solid #777777; border-radius: 2px; background-color: transparent; image: url(check_green.svg)`) y hệt ô tích trong Popup Cấu hình chiến thuật và Dashboard cho Bảng Vị Thế trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z254`)

- **[05/08/2026]** - Tự động tích chọn Checkbox đầu mỗi cặp coin:
  - **Cập nhật:** Tự động bật tích chọn `[✓]` ở đầu mỗi dòng cặp coin trong Bảng Vị Thế khi phát hiện coin đó được bật trong Cấu hình (Settings) **HOẶC** đang có vị thế giao dịch active (`is_active = True`) trên sàn OKX. (Mã patch: `z253`)

- **[05/08/2026]** - Chuẩn hóa định dạng PNL thả nổi theo bản cũ:
  - **Cập nhật:** Giữ nguyên ký hiệu `USDT` (VD: `+25.69 USDT`), phân tách với phần tỷ lệ `%` bằng 3 khoảng trống `   ` (VD: `+25.69 USDT   (+58.73%)`), font size `14px` thường (`font-weight: normal`), căn giữa ô trong file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). (Mã patch: `z252`)

- **[05/08/2026]** - Sửa lỗi runtime `UnboundLocalError: cannot access local variable 'os'`:
  - **Nguyên nhân:** Khai báo trùng lặp `import os, json` nội bộ trong block fallback khiến Python coi `os` là biến local phạm vi hàm `update_positions_table`, gây crash văng ngoại lệ khi truy cập `os.path` trước đó.
  - **Đã fix:** Loại bỏ re-import `os, json` dư thừa, sử dụng trực tiếp module `os` và `json` đã import ở top-level file [gui_main.py](file:///d:/4.%20Trade%20Coin%20-%20TLS1/4.%20Cursor%20-%20IDE/TLS1_Company/zProjects/OKX_Trade_Kit/TLS1_Trading_App/gui_main.py). Bảng vị thế hiển thị lại dữ liệu ổn định bình thường. (Mã patch: `z251`)

- **[03/08/2026]** - Tối ưu toàn bộ Giao diện GUI & Terminal Log theo tiêu chuẩn Monorepo:
  1. **Font Size & Style Bảng Vị Thế:** Font nền `14px` (chữ thường `normal`), PNL amount `16px` nổi bật; Căn lề số/USDT bên phải, Ký quỹ tính bằng `$`.
  2. **Trạng thái Nút bấm & Dropdown:** Nút Bắt đầu/Dừng đổi màu Xanh/Đỏ/Xám chuẩn; Dropdown chế độ xem mặc định đồng bộ `Chế độ ngang`.
  3. **Tối ưu Độ phân giải & Khung hình 1080px (Tablet Fujitsu Q378):** Thu gọn margins viền ngoài từ 35px xuống 15px sát mép viền; Dóng hàng lề trên cùng 2 thẻ `Logs` và `TradingView Toolbar`; Cho phép Chart co giãn `Expanding` 100% lấp đầy diện tích thừa.
  4. **Hiệu ứng Thị giác Đa tầng (Tab Visual Hierarchy & Fade Animation):** Tab chính (`Bot EMA200`, `Bot SMC - OB`) sáng chữ Vàng Kim (`#ffaa00`), viền cam 3px, triệt tiêu đường viền đáy nối liền khối với khung nội dung bên dưới; Bổ sung hiệu ứng chuyển động mượt mà `Fade-in Opacity Animation (220ms)` khi chuyển qua lại giữa các Tab Bot!
  5. **Tối ưu UX Tái cấu trúc Màn hình (Clean Action Bar & Popup Settings Dialogs):** Loại bỏ hoàn toàn dải thanh tab con rác (`Bảng Điều Khiển`, `API Key`, `Chiến Thuật`, `Cộng Đồng`) để mở rộng 100% diện tích màn hình chính cho Chart và Terminal Log; Chuyển toàn bộ mục Cấu hình API/Chiến thuật vào Nút bấm **`⚙️ Cài Đặt`** (mở Popup Modal Dialog) và nút **`💬 Cộng Đồng`** bên góc phải thanh công cụ. (Mã patch: `z3500`)

- **[01/08/2026]** - Lỗi `NameError: name 'bot_config' is not defined` tại `z_bot_sub2/bot_strategy.py:L783`. Đã fix: Bổ sung import module `from z_bot_sub2 import bot_config` ở đầu file `bot_strategy.py` để các lệnh `getattr(bot_config, ...)` truy cập đúng cấu hình toàn cục.

- **[28/07/2026]** - Sửa hàng loạt các lỗi liên quan đến UI & Config. Đã fix: Lỗi tick bỏ chọn coin (XAU) nhưng bot vẫn đặt lệnh do lỗi lưu file config; Ẩn các dòng log '[SYNC]' gây rối mắt trên console; Canh lề thẳng dấu hai chấm (:) ở mục tình trạng lệnh bằng cách đệm cứng khoảng trắng cho chuỗi Khung thời gian DCA; Đổi lại nhãn TÀI KHOẢN thành LỢI NHUẬN và TỔNG VỐN thành TÀI KHOẢN trên Dashboard. (Mã patch: `z6`, `z1951`, `z7718`)

- **[28/07/2026]** - Sửa lỗi `No module named 'bot_models'`, cập nhật tính Volume động từ cấu hình người dùng (JSON) cho hàm `determine_filled_tf` và bổ sung Fallback Market khi gặp lỗi OKX `51006`. Đã fix: Đưa import `bot_models` lên top-level với try-except fallback, đọc trực tiếp `POSITION_VOLUME_HIGH_CONFIDENCE` từ `FILE_GLOBAL_CONFIG` (JSON) thay vì dùng mốc cứng 450 U, và bổ sung hàm `place_market_entry` kích hoạt khi OKX từ chối lệnh Limit do trượt giá (`51006`). (Mã patch: `z7718`)
- **[28/07/2026]** - Tối ưu UI & Tích hợp Firebase Chat: Thay thế WebEngineView (Cbox/tlk.io) ở tab Cộng Đồng bằng Native PyQt Chat kết nối thẳng tới Firebase RTDB để nhẹ và ổn định hơn. Cập nhật Checkbox trên Dashboard thành dạng tương tác được (interactive) và auto-save vào cấu hình. Fix màu nền đen trùng với màu chữ của Dropdown chọn tài khoản API. (Mã patch: `z5`)
- **[28/07/2026]** - Lỗi v1.0.231 không hiển thị chart trên bản release Windows và yêu cầu tính năng vẽ marker B/S. Đã fix: Sửa `fix_qtwebengine_path` hỗ trợ Windows tìm `QtWebEngineProcess.exe`, đồng bộ mặc định `combo_coin` với `LiveChartWorker` để tránh blank chart khởi tạo. Tích hợp tính năng ghi log trade markers tại `bot_models.py` khi vào lệnh/thoát lệnh và vẽ (update) liên tục trên `LiveChartWorker` của `gui_main.py` (Marker sáng màu khi Active, và chuyển màu tối/chìm khi Closed). (Mã patch: `z4`, `z7717`)
- **[27/07/2026]** - XAU (forex) giao dịch sai trend do bị ép neo theo BTC H4. Phát hiện 4 vị trí hardcode `["BTC", "XAU"]` hoặc chỉ check `coin_name != "BTC"` bỏ qua `_is_alt_synced`. Đã fix triệt để: thêm field `asset_class` ("crypto"/"forex") vào `COIN_PORTFOLIO` trong `bot_config.py`, sửa `_is_alt_synced` trong `bot_strategy.py` dùng `cfg.get("asset_class")`, sửa 3 block khác (ép trend H4, allowed_long/short, Macro Extension Breaker) để dùng `_is_alt_synced` thay vì hardcode. (Mã patch: `z7715`, `z7716`)

- **[23/07/2026]** - ✅ Hoàn thành Audit System 2026: Vá 3 lỗ hổng hệ thống cốt lõi:
  1. **Retry/Backoff API OKX**: Thêm vòng lặp retry 3 lần kèm `time.sleep(1)` vào cả sync `request()` và async `request()` trong `bot_api.py` (sub1 + sub2), bắt HTTP 429 và OKX 50011/50026, timeout/connection error.
  2. **Thanh trừng `except: pass`**: Thay thế các block `except: pass` tại các hàm trọng yếu (`clean_limit_orders`, `cleanup_all_orders_on_startup`, fetch candles, xử lý vị thế, trailing SL upgrade TF) bằng `hft_logger.error(...)` trong `bot_orders.py` và `bot_strategy.py`.
  3. **Graceful Shutdown QThread**: Bổ sung logic dừng `BotSubprocessWorker` (stop → quit → wait → terminate) và dọn dẹp `_GLOBAL_AUDIO_PLAYERS.clear()` trong `closeEvent` của `gui_main.py`.
  *(CTO Antigravity Update: Đã fix lại triệt để lỗi bắt thiếu JSONDecodeError/HTTPError, sửa lỗi treo App do worker.stop block Main Thread, và rà soát triệt để except: pass do Cline làm sót trong bot_strategy.py)*
  (Tham chiếu: `PLAN_SYSTEM_AUDIT_2026.md`, Mã patch: `z3400`)

- **[23/07/2026]** - Lỗi văng App do thiếu thuộc tính play_sound trên MainWindow và sót biến smc_combo_mode khi lưu cấu hình. Đã fix: Refactor trình phát âm thanh thành hàm toàn cục play_ui_sound() và dọn dẹp các biến cấu hình SMC rác (Mã patch: z3322).
- **[16/07/2026]** - Lỗi `bot_sub1` Altcoin Neo BTC entry bị đẩy cao hơn giá live khi BTC sát EMA200 hoặc bị overshoots sâu qua EMA. Đã fix: Bỏ `volatility_mult` khỏi base offset và áp dụng cơ chế **EMA Floor Clamp**: Giới hạn entry của Altcoin không vượt quá ngưỡng an toàn `EMA200_Altcoin * (1 +/- base_buffer)` của chính nó (Mã patch: `z3318`).
- **[16/07/2026]** - Lỗi `bot_sub1` rải lưới DCA quá sát nhau ở các khung lớn do khoảng cách chặn (DCA_GAP) tính toán sai. Đã fix: Chuyển hệ số nhân từ `TF_VOLUME_MULTIPLIERS` sang `TF_MULTIPLIERS` và set lại Base Gap về chuẩn 0.5% (`0.0050`) để các lưới H1, H2, H4 giãn ra đúng cấp số nhân (Mã patch: `z3319`).
- **[16/07/2026]** - Tối ưu Giao diện UI: Lệnh BTC và Altcoin hiển thị lộn xộn trong bảng trạng thái. Đã fix: Sửa logic sort trong `bot_ui.py` để ép hạng mục `BTC` luôn được ưu tiên in ra đầu tiên trong bảng `✜ TÌNH TRẠNG VỊ THẾ` dù đang pending hay đã khớp (Mã patch: `z3320`).
- **[16/07/2026]** - Dọn dẹp Code: Loại bỏ triệt để 3 biến cấu hình rác không còn sử dụng trong logic (`EMA_SQUEEZE_TOLERANCE_PCT`, `EMA200_DRIFT_THRESHOLD_PCT`, `ALTCOIN_DIFF_THRESHOLD_PCT`) giúp làm sạch `bot_config.py` (Mã patch: `z3321`).

- **[13/07/2026]** - Lỗi syntax (unexpected indent, expected indented block) và lỗi runtime `name '_cur_pp_tf' is not defined`, `name '_pp_tf_grid' is not defined`, `name '_lever' is not defined` trong `bot_sub1.py` sau khi gỡ bỏ cơ chế Ping-Pong. Đã fix: Xóa bỏ triệt để các biến, các dòng code liên quan đến `_cur_pp_tf`, `_pp_tf_grid`, `is_pp_tf` và dọn dẹp lại thụt lề chuẩn xác tại các block if/elif. Định nghĩa lại `_lever` bằng `str(_get_leverage(tf))`. (Mã patch: `z3310`, `z3311`, `z3312`).

- **[14/07/2026]** - Lỗi `bot_sub1` không đặt lệnh TP/SL khi khớp lệnh do crash ngầm `UnboundLocalError` (tàn dư biến `pp_long_pos` từ đợt gỡ Ping-Pong). Đã fix: Xóa bỏ hoàn toàn phần đọc vị thế isolated của Ping-Pong trong vòng lặp `fetch_positions` (Mã patch: `z3317`).
- **[14/07/2026]** - Lỗi `bot_sub1` DCA vô số lệnh cùng 1 TF do API OKX delay (nhân bản Limit Order) và Volume rung lắc liên tục do tính theo `live_price`. Đã fix: Thêm thuật toán `🧹 [CLEANUP]` dọn dẹp các lệnh duplicates trực tiếp trong `actual_pending` và đổi công thức tính Khối lượng Limit (`sz_for_tf`) dựa trên giá Limit (`px_tf`) thay vì `live_price` để ổn định size (Mã patch: `z3316`).

# Hệ thống Lưu vết Lỗi (Bug Tracker)

File này đóng vai trò là bảng theo dõi toàn bộ các lỗi (bugs) hoặc vấn đề (issues) phát sinh trong quá trình Bot giao dịch thực tế. 
**QUY TẮC BẮT BUỘC DÀNH CHO CÁC AI AGENT:** 
- Bất cứ khi nào Agent bắt đầu một phiên làm việc mới liên quan đến việc sửa lỗi hoặc cập nhật tính năng, Agent **PHẦI** đọc file này trước tiên để xem có lỗi nào đang tồn tại hay không.
- Sau khi fix xong một lỗi, Agent **PHẦI** tự động xóa (hoặc đánh dấu hoàn thành) lỗi đó khỏi danh sách này.
- Bất kỳ lỗi mới nào phát sinh chưa được giải quyết phải được ghi chú vào đây.

---

## 🐞 CÁC LỖI HIỆN TẠI ĐANG CHỜ XỬ LÝ (PENDING BUGS)

*(Danh sách trống — tất cả lỗi đã được xử lý)*




---

## ✅ CÁC LỖI ĐÃ GIẢI QUYẾT (RESOLVED BUGS)

- **[04/08/2026]** - Lỗi UI/UX: Padding các nút quá lớn, font chữ bảng quá nhỏ, Light Mode bị lỗi trùng màu đen trắng cho Terminal Logs & Table, nút Cộng Đồng thiếu text. Đã fix: Điều chỉnh lại `apply_theme` CSS rules cho QTableWidget, QPushButton, QComboBox; thêm explicit colors cho Light Mode và bổ sung text cho nút Discord/Telegram. (Mã patch: `z247`)

- **[04/08/2026]** - Lỗi v1.0.242 Vùng OB (Order Block) bị ẩn/không hiển thị trên chart. Đã fix: Sửa cơ chế binding HTML overlay vào đúng thẻ cha (wrapper) thay vì thẻ div container sai lệch; Bổ sung vòng lặp retry chờ chart render xong (priceToCoordinate = null fallback); Tích hợp thêm đường chỉ Entry ngang (dashed line) kéo dài từ nến OB qua phía phải giống hệt OKX UI (Mã patch: `z243`, `z244`).
- **[01/08/2026]** - Hoàn thành Task-OKX-Pos-01: Tích hợp Bảng Vị thế OKX Realtime vào giữa Chart và Logs (Chế độ dọc) kèm tính năng Toggle Checkbox `☑ Vị thế OKX` trong `gui_main.py`. Cập nhật luồng `OKXPositionsWorker` kéo API trực tiếp. (Mã patch: `z-task-okx-pos-01`)
- **[01/08/2026]** - Hoàn thành Task-Test-01: Thêm dòng log xác nhận cập nhật kiến trúc V2 vào hàm `main()` trong `sys_bot_sub2.py`. (Mã patch: `z-task-test-01`)

- **[01/08/2026]** - Lỗi `NameError: name 'bot_config' is not defined` tại `z_bot_sub2/bot_strategy.py:L783`. Đã fix: Bổ sung import module `from z_bot_sub2 import bot_config` ở đầu file `bot_strategy.py` để các lệnh `getattr(bot_config, ...)` truy cập đúng cấu hình toàn cục.

- **[28/07/2026]** - Sửa hàng loạt các lỗi liên quan đến UI & Config. Đã fix: Lỗi tick bỏ chọn coin (XAU) nhưng bot vẫn đặt lệnh do lỗi lưu file config; Ẩn các dòng log '[SYNC]' gây rối mắt trên console; Canh lề thẳng dấu hai chấm (:) ở mục tình trạng lệnh bằng cách đệm cứng khoảng trắng cho chuỗi Khung thời gian DCA; Đổi lại nhãn TÀI KHOẢN thành LỢI NHUẬN và TỔNG VỐN thành TÀI KHOẢN trên Dashboard. (Mã patch: `z6`, `z1951`, `z7718`)

- **[28/07/2026]** - Sửa lỗi `No module named 'bot_models'`, cập nhật tính Volume động từ cấu hình người dùng (JSON) cho hàm `determine_filled_tf` và bổ sung Fallback Market khi gặp lỗi OKX `51006`. Đã fix: Đưa import `bot_models` lên top-level với try-except fallback, đọc trực tiếp `POSITION_VOLUME_HIGH_CONFIDENCE` từ `FILE_GLOBAL_CONFIG` (JSON) thay vì dùng mốc cứng 450 U, và bổ sung hàm `place_market_entry` kích hoạt khi OKX từ chối lệnh Limit do trượt giá (`51006`). (Mã patch: `z7718`)
- **[28/07/2026]** - Tối ưu UI & Tích hợp Firebase Chat: Thay thế WebEngineView (Cbox/tlk.io) ở tab Cộng Đồng bằng Native PyQt Chat kết nối thẳng tới Firebase RTDB để nhẹ và ổn định hơn. Cập nhật Checkbox trên Dashboard thành dạng tương tác được (interactive) và auto-save vào cấu hình. Fix màu nền đen trùng với màu chữ của Dropdown chọn tài khoản API. (Mã patch: `z5`)
- **[28/07/2026]** - Lỗi v1.0.231 không hiển thị chart trên bản release Windows và yêu cầu tính năng vẽ marker B/S. Đã fix: Sửa `fix_qtwebengine_path` hỗ trợ Windows tìm `QtWebEngineProcess.exe`, đồng bộ mặc định `combo_coin` với `LiveChartWorker` để tránh blank chart khởi tạo. Tích hợp tính năng ghi log trade markers tại `bot_models.py` khi vào lệnh/thoát lệnh và vẽ (update) liên tục trên `LiveChartWorker` của `gui_main.py` (Marker sáng màu khi Active, và chuyển màu tối/chìm khi Closed). (Mã patch: `z4`, `z7717`)
- **[27/07/2026]** - XAU (forex) giao dịch sai trend do bị ép neo theo BTC H4. Phát hiện 4 vị trí hardcode `["BTC", "XAU"]` hoặc chỉ check `coin_name != "BTC"` bỏ qua `_is_alt_synced`. Đã fix triệt để: thêm field `asset_class` ("crypto"/"forex") vào `COIN_PORTFOLIO` trong `bot_config.py`, sửa `_is_alt_synced` trong `bot_strategy.py` dùng `cfg.get("asset_class")`, sửa 3 block khác (ép trend H4, allowed_long/short, Macro Extension Breaker) để dùng `_is_alt_synced` thay vì hardcode. (Mã patch: `z7715`, `z7716`)

- **[23/07/2026]** - ✅ Hoàn thành Audit System 2026: Vá 3 lỗ hổng hệ thống cốt lõi:
  1. **Retry/Backoff API OKX**: Thêm vòng lặp retry 3 lần kèm `time.sleep(1)` vào cả sync `request()` và async `request()` trong `bot_api.py` (sub1 + sub2), bắt HTTP 429 và OKX 50011/50026, timeout/connection error.
  2. **Thanh trừng `except: pass`**: Thay thế các block `except: pass` tại các hàm trọng yếu (`clean_limit_orders`, `cleanup_all_orders_on_startup`, fetch candles, xử lý vị thế, trailing SL upgrade TF) bằng `hft_logger.error(...)` trong `bot_orders.py` và `bot_strategy.py`.
  3. **Graceful Shutdown QThread**: Bổ sung logic dừng `BotSubprocessWorker` (stop → quit → wait → terminate) và dọn dẹp `_GLOBAL_AUDIO_PLAYERS.clear()` trong `closeEvent` của `gui_main.py`.
  *(CTO Antigravity Update: Đã fix lại triệt để lỗi bắt thiếu JSONDecodeError/HTTPError, sửa lỗi treo App do worker.stop block Main Thread, và rà soát triệt để except: pass do Cline làm sót trong bot_strategy.py)*
  (Tham chiếu: `PLAN_SYSTEM_AUDIT_2026.md`, Mã patch: `z3400`)

- **[23/07/2026]** - Lỗi văng App do thiếu thuộc tính play_sound trên MainWindow và sót biến smc_combo_mode khi lưu cấu hình. Đã fix: Refactor trình phát âm thanh thành hàm toàn cục play_ui_sound() và dọn dẹp các biến cấu hình SMC rác (Mã patch: z3322).
- **[16/07/2026]** - Lỗi `bot_sub1` Altcoin Neo BTC entry bị đẩy cao hơn giá live khi BTC sát EMA200 hoặc bị overshoots sâu qua EMA. Đã fix: Bỏ `volatility_mult` khỏi base offset và áp dụng cơ chế **EMA Floor Clamp**: Giới hạn entry của Altcoin không vượt quá ngưỡng an toàn `EMA200_Altcoin * (1 +/- base_buffer)` của chính nó (Mã patch: `z3318`).
- **[16/07/2026]** - Lỗi `bot_sub1` rải lưới DCA quá sát nhau ở các khung lớn do khoảng cách chặn (DCA_GAP) tính toán sai. Đã fix: Chuyển hệ số nhân từ `TF_VOLUME_MULTIPLIERS` sang `TF_MULTIPLIERS` và set lại Base Gap về chuẩn 0.5% (`0.0050`) để các lưới H1, H2, H4 giãn ra đúng cấp số nhân (Mã patch: `z3319`).
- **[16/07/2026]** - Tối ưu Giao diện UI: Lệnh BTC và Altcoin hiển thị lộn xộn trong bảng trạng thái. Đã fix: Sửa logic sort trong `bot_ui.py` để ép hạng mục `BTC` luôn được ưu tiên in ra đầu tiên trong bảng `✜ TÌNH TRẠNG VỊ THẾ` dù đang pending hay đã khớp (Mã patch: `z3320`).
- **[16/07/2026]** - Dọn dẹp Code: Loại bỏ triệt để 3 biến cấu hình rác không còn sử dụng trong logic (`EMA_SQUEEZE_TOLERANCE_PCT`, `EMA200_DRIFT_THRESHOLD_PCT`, `ALTCOIN_DIFF_THRESHOLD_PCT`) giúp làm sạch `bot_config.py` (Mã patch: `z3321`).

- **[13/07/2026]** - Lỗi syntax (unexpected indent, expected indented block) và lỗi runtime `name '_cur_pp_tf' is not defined`, `name '_pp_tf_grid' is not defined`, `name '_lever' is not defined` trong `bot_sub1.py` sau khi gỡ bỏ cơ chế Ping-Pong. Đã fix: Xóa bỏ triệt để các biến, các dòng code liên quan đến `_cur_pp_tf`, `_pp_tf_grid`, `is_pp_tf` và dọn dẹp lại thụt lề chuẩn xác tại các block if/elif. Định nghĩa lại `_lever` bằng `str(_get_leverage(tf))`. (Mã patch: `z3310`, `z3311`, `z3312`).

- **[14/07/2026]** - Lỗi `bot_sub1` không đặt lệnh TP/SL khi khớp lệnh do crash ngầm `UnboundLocalError` (tàn dư biến `pp_long_pos` từ đợt gỡ Ping-Pong). Đã fix: Xóa bỏ hoàn toàn phần đọc vị thế isolated của Ping-Pong trong vòng lặp `fetch_positions` (Mã patch: `z3317`).
- **[14/07/2026]** - Lỗi `bot_sub1` DCA vô số lệnh cùng 1 TF do API OKX delay (nhân bản Limit Order) và Volume rung lắc liên tục do tính theo `live_price`. Đã fix: Thêm thuật toán `🧹 [CLEANUP]` dọn dẹp các lệnh duplicates trực tiếp trong `actual_pending` và đổi công thức tính Khối lượng Limit (`sz_for_tf`) dựa trên giá Limit (`px_tf`) thay vì `live_price` để ổn định size (Mã patch: `z3316`).

- **[09/07/2026]** - Lỗi `bot_sub1` vào 18 lệnh DCA cùng 1 TF do tính năng "Copy Trade / Dẫn đầu" của OKX tách các lệnh DCA thành từng vị thế độc lập. Đã fix: Code lại hàm đọc vị thế trên OKX để cộng gộp (sum) tất cả các vị thế cùng chiều thay vì bị ghi đè bởi vị thế cuối cùng (Mã patch: `z2425`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp do thuật toán xác định TF quên nhân với `vol_mult` của từng Altcoin. Đã fix: Chèn `_coin_vol_mult` vào `expected_vol` trong hàm `determine_filled_tf` (Mã patch: `z2426`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp liên tục tại cùng 1 TF do tính sai khối lượng lệnh vừa khớp trong `determine_filled_tf` (tính theo tổng vị thế thay vì phần chênh lệch). Đã fix: Trừ đi khối lượng cũ (`new_pos_amt - old_pos_amt`) để so sánh chính xác với khối lượng cấu hình của TF (Mã patch: `z2423`).
- **[09/07/2026]** - Lỗi `bot_sub1` DCA trùng lặp liên tục tại cùng 1 TF (Race condition limit order). Đã fix: Ưu tiên TF nhỏ nhất trong `determine_filled_tf`, loại trừ các TF đã filled ở fallback, và thêm safety check `actual_pending` trước khi `place_pure_limit` (Mã patch: `z2418`).


## 🆕 TASK CẦN XỬ LÝ (CHO CLINE)

*(Danh sách trống — tất cả lỗi đã được xử lý)*
