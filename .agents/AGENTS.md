# Behavior Rules

- **Cập nhật Changelog / Version Code:** Khi chỉnh sửa các file bot (như `bot_main.py`, `bot_sub1.py`, v.v.), luôn luôn nhớ kiểm tra và cập nhật dòng ghi chú phiên bản/changelog ở cuối cùng của file (ví dụ: `# z1949 | ...`). Phải tóm tắt ngắn gọn các thay đổi vừa thực hiện và nối thêm vào hoặc cập nhật dòng mã phiên bản này.
- **Đồng bộ Mã nguồn và Tài liệu:** Luôn luôn cập nhật và đồng bộ song hành giữa mã nguồn của bot (các file `.py`) và tài liệu kế hoạch tương ứng (các file `PLAN_BOT_*.md` nằm trong thư mục `.agents/`). Bất kỳ thay đổi logic nào trong code cũng phải được phản ánh chính xác vào file Plan và ngược lại.
- **Theo dõi Lỗi (Issue Tracking):** Bắt buộc phải đọc file `ISSUE_TRACKER.md` (nằm ở thư mục `.agents`) TRƯỚC KHI thực hiện bất kỳ sửa đổi hay debug nào để nắm bắt các lỗi hiện tại. Bất kỳ lỗi mới nào được phát hiện trong quá trình code/test đều phải được ghi lại vào file đó. Sau khi sửa xong một lỗi, phải cập nhật file đó để xóa bỏ hoặc đánh dấu hoàn thành lỗi.
- **Tiêu chuẩn đếm Nến (Candle Counting):** Đối với TẤT CẢ các chiến thuật/bot có sử dụng bộ đếm nến (như đếm số nến tích lũy, đếm chuỗi nến), khi so sánh nến với các đường Trung bình động (EMA/MA), **BẮT BUỘC** phải so sánh **toàn bộ thân nến** (`min(open, close)` và `max(open, close)`). Tuyệt đối không chỉ dùng mỗi giá đóng cửa (`close`) để xác định phía của nến. Một nến chỉ được coi là nằm hẳn về một phía (above/under) khi cả open và close đều thỏa mãn, qua đó tự động lọc bỏ nhiễu từ các râu nến chạm vào MA.
- **Quản lý API Key khi Đóng gói:** TUYỆT ĐỐI KHÔNG xóa hay reset API Key trong các file `.env` ở môi trường phát triển (`d:\4. Trade Coin - TLS1\4. Cursor - IDE\OKX_Trade_Kit\`). API Key chỉ được phép bị xóa (để trống) đối với các file `.env` nằm trong thư mục release (`TLS1_Trading_App\App_Release`) khi thực hiện thao tác đóng gói thành phần mềm `TLS1 Trading Setup.exe` cho khách hàng.
- **YÊU CẦU TỐI THƯỢNG ĐẦU PHIÊN CHAT (GIT PULL & DỌN DẸP):** Bất kỳ khi nào bắt đầu một phiên yêu cầu chat mới, AI PHẢI lập tức thực hiện lệnh `git pull` để đồng bộ mã nguồn mới nhất của dự án từ Github về máy. Cấm code đè lên phiên bản cũ. Ngoài ra, tất cả các file rác, file tạm (scratch files, scripts test) được tạo ra trong quá trình fix lỗi BẮT BUỘC phải được xóa đi ngay sau khi fix xong. Nếu có dữ liệu cần giữ lại, chỉ được phép lưu vào thư mục `json_data` hoặc `TLS1_Trading_App`.
- **Kiến trúc Máy chủ Web App & Cổng Mạng (PM2 & Cloudflare Tunnel):**
  - Web App chạy trên máy chủ Mac Mini M1 sử dụng PM2 quản lý FastAPI Backend (`8080`) phục vụ đồng thời REST API, WebSocket và Static bundle của Frontend.
  - Tuyệt đối không xóa cơ chế **Port Bridge 5173 ➔ 8080** trong `main.py`: đây là cầu nối TCP chuyển tiếp lưu lượng để tương thích 100% với cấu hình Cloudflare Zero Trust của domain `autotrader.fun`, chống lỗi 502 Bad Gateway.
  - Mọi thư viện mới của backend bắt buộc phải cập nhật đồng bộ vào `web_app/backend/requirements.txt` (đặc biệt là `requests`, `pydantic`). Cấu hình PM2 `ecosystem.config.js` bắt buộc dùng `path.resolve(__dirname, 'web_app/backend')` và `PYTHONUNBUFFERED: "1"`.

- **Đồng Bộ Tuyệt Đối Giữa "Tổng" Trên Dashboard Và Số Tiền $ Sau Tag `#xxxx`:**
  - Mục **"Tổng:"** trên bảng điều khiển Terminal Logs và **Số tiền $ hiển thị ngay sau thẻ `#xxxx`** (trên nút Header capsule chính và trong từng mục dropdown của mọi tài khoản) **BẮT BUỘC LUÔN LUÔN PHẢI ĐỒNG BỘ 100% VỚI NHAU**:
    1. **Về con số:** Phản ánh chính xác cùng một con số số dư thực tế (Live Equity / Total Balance) từ WebSocket và API, không được lệch dù chỉ 1 xu.
    2. **Về màu sắc & kiểu dáng:** Sử dụng cùng một mã màu thống nhất là **Xanh lá tươi (`#4ade80`)** (hoặc mã màu mà CEO chỉ định cho Tổng).
    3. **Bảng màu chuẩn toàn hệ thống:**
       - **Gốc:** Xanh Cyan (`#38bdf8`) [Tùy chọn 2 dự phòng: Vàng cam sáng `#fbbf24`]
       - **Tổng & Số tiền sau `#xxxx`:** Xanh lá tươi (`#4ade80`, nền `rgba(74, 222, 128, 0.10)`, viền `rgba(74, 222, 128, 0.22)`)
       - **PNL Dương (Lãi):** Xanh ngọc Emerald (`#34d399`)
       - **PNL Âm (Lỗ):** Đỏ san hô (`#f87171`)
       - **Trạng thái Bot LIVE:** Chấm tròn đỏ phát sáng 5px (`#ef4444`) đặt ngay TRÊN mũi tên dropdown (nút capsule), không dùng nhãn chữ [LIVE] to cồng kềnh.
       - **Lưu ý màu Gốc:** Luôn lưu trữ 2 mã màu chuẩn đã nghiệm thu: 🔵 **Cyan (`#38bdf8`)** và 🟡 **Vàng cam (`#fbbf24`)** để chuyển đổi theo yêu cầu CEO.

## BẢO MẬT MÃ NGUỒN
- TUYỆT ĐỐI KHÔNG ĐƯỢC TỰ Ý PUSH MÃ NGUỒN LÊN GITHUB NẾU KHÔNG CÓ LỆNH TRỰC TIẾP TỪ CEO.

