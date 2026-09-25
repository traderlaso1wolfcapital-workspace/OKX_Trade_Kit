# 📖 CẨM NANG HƯỚNG DẪN CHI TIẾT CÁC NÚT BẤM & TÍNH NĂNG TRÊN WEB APP
> **Hệ Thống:** Giao Diện Quản Trị & Giao Dịch Tự Động (Web Trading Platform)  
> **Tên miền:** [autotrader.fun](https://autotrader.fun)  
> **Dự án:** OKX Trade Kit - TLS1 Company  
> **Cập nhật:** 25/09/2026  

---

## MỤC LỤC
1. [I. Bảng Kết Nối (Connect Modal)](#i-bảng-kết-nối-connect-modal)
2. [II. Thanh Điều Hành Bên Trái (Sidebar Trái)](#ii-thanh-điều-hành-bên-trái-sidebar-trái)
3. [III. Thanh Điều Hướng Trên Cùng (App Header)](#iii-thanh-điều-hướng-trên-cùng-app-header)
4. [IV. Bảng Cài Đặt Thông Số Chiến Lược (System Settings Modal)](#iv-bảng-cài-đặt-thông-số-chiến-lược-system-settings-modal)
5. [V. Bảng Quản Lý Vị Thế & Lịch Sử Giao Dịch (Bottom Table)](#v-bảng-quản-lý-vị-thế--lịch-sử-giao-dịch-bottom-table)
6. [VI. Bảng Nhật Ký Hoạt Động (System Logs & Terminal)](#vi-bảng-nhật-ký-hoạt-động-system-logs--terminal)

---

## I. BẢNG KẾT NỐI (CONNECT MODAL)

Bảng Kết Nối là trung tâm liên kết tài khoản giao dịch, hỗ trợ 2 phương thức: Kết Nối Nhanh (Fast Connect qua OAuth 2.0) và Kết Nối Thủ Công (API Key Connect).

### 1. Tab "Fast Connect" (Kết Nối Nhanh)
* **[Mở App ➔]** *(trên thẻ OKX Connect mặc định)*:
  * **Chức năng:** Kích hoạt cơ chế xác thực OAuth 2.0 chính thức được cấp phép bởi sàn OKX.
  * **Cơ chế:** Khi người dùng bấm vào, ứng dụng sẽ tự động chuyển hướng mở App OKX trên điện thoại hoặc mở trang đăng nhập bảo mật của OKX. Hệ thống tự động liên kết tài khoản và đồng bộ API Key mà **người dùng không cần phải copy-paste thủ công bất kỳ ký tự nào**, triệt tiêu 100% rủi ro lộ khóa bí mật.
* **[Disconnect]** *(nút viền đỏ trên từng thẻ tài khoản đã kết nối)*:
  * **Chức năng:** Ngắt kết nối riêng lẻ từng tài khoản OKX độc lập.
  * **Cơ chế:** Xóa toàn bộ API Key của tài khoản đó khỏi máy chủ và tự động quét dọn các lệnh chờ (Limit) chưa khớp.
  * **Bảo vệ an toàn vốn:** Toàn bộ các vị thế đang gồng lãi/lỗ và các lệnh Chốt Lời/Cắt Lỗ (TP/SL) đã có trên sàn OKX được **bảo lưu nguyên vẹn 100%**. Có hộp thoại xác nhận Yes/No trước khi ngắt.
* **Các thẻ [Sắp ra mắt]** *(Binance Connect, Bybit Connect, OKX Web3 / Crypto Wallet)*:
  * **Chức năng:** Đặt chỗ cho tính năng giao dịch liên sàn (Cross-exchange) và ví phi tập trung Web3 trong lộ trình nâng cấp sắp tới.

---

### 2. Tab "API Key Connect" (Kết Nối Thủ Công)
* **Dropdown [Quản lý tài khoản]**:
  * **Chức năng:** Danh sách chọn tài khoản phụ/tài khoản quỹ để xem hoặc cấu hình cụm API Key riêng biệt cho từng bot.
* **Nút [+] (Thêm tài khoản)**:
  * **Chức năng:** Mở hộp thoại nhập tên tài khoản phụ mới (ví dụ: "Tài khoản 2", "Quỹ Phụ B").
* **Nút [-] (Xóa tài khoản)**:
  * **Chức năng:** Xóa bỏ hoàn toàn tài khoản đang chọn khỏi hệ thống.
  * **Khóa an toàn:** Nếu Bot đang trong trạng thái giao dịch thực tế trên tài khoản này, hệ thống sẽ **chặn xóa và cảnh báo** người dùng phải BẤM DỪNG BOT trước để tránh gián đoạn tiến trình lệnh.
* **Nút [Lưu API Key]** *(nút xanh lá)*:
  * **Chức năng:** Kiểm tra tính hợp lệ của bộ 3 thông tin (*Mã API Key, Khóa Bí Mật Secret Key, Cụm Mật Khẩu Passphrase*) với máy chủ OKX, mã hóa và lưu trữ an toàn.

---

### 3. Chân Bảng Connect (Footer)
* **Chấm trạng thái kết nối & Mã UID**:
  * 🟢 **Chấm xanh ngọc `#26a69a` phát sáng hào quang**: Hiển thị khi tài khoản đang kết nối ổn định: `UID: [Mã_UID_Của_User]`.
  * 🔴 **Chấm đỏ rực `#ff4d4f` phát sáng hào quang**: Hiển thị khi chưa kết nối hoặc đã đăng xuất an toàn: `UID: Đã ngắt kết nối (Vui lòng kết nối để kích hoạt)`.
* **Nút [Đăng Xuất]** *(nút viền đỏ góc phải dưới)*:
  * **Chức năng:** Đăng xuất toàn diện và reset hệ thống về trạng thái ban đầu:
    1. Tự động **dừng toàn bộ các bot** đang chạy thuộc UID chính này.
    2. **Xóa sạch toàn bộ API Key** của mọi tài khoản phụ trên hệ thống.
    3. Hủy các lệnh Limit chờ; **bảo lưu 100% vị thế và TP/SL** trên sàn OKX.
    4. Xóa sạch cache đăng nhập trên trình duyệt và chuyển ngay chân bảng sang **chấm đỏ "UID: Đã ngắt kết nối"**.
    5. Có hộp thoại xác nhận Yes/No trước khi thi hành.

---

## II. THANH ĐIỀU HÀNH BÊN TRÁI (SIDEBAR TRÁI)

* **Các Tab Chiến Lược Bot [EMA200 Bot] / [SMC Bot] / [Liquidation Bot]**:
  * **Chức năng:** Chuyển đổi giữa 3 thuật toán giao dịch độc lập. Mỗi bot có thể chạy trên một tài khoản API Key riêng biệt và quản lý dòng lệnh riêng.
* **Dropdown [Tài khoản (Bot)]**:
  * **Chức năng:** Chỉ định tài khoản API Key cho bot được chọn giao dịch.
  * **Cơ chế khóa bảo vệ (🔒):** Khi bot đang ở trạng thái chạy (`RUNNING`), dropdown sẽ **khóa cứng không cho phép đổi tài khoản**, ngăn chặn triệt để thao tác bấm nhầm làm loạn lệnh.
* **Nút [CHẠY BOT]** *(nút xanh lá rực rỡ)*:
  * **Chức năng:** Khởi động chu trình quét nến, phân tích cản kỹ thuật và đặt lệnh tự động thực tế (Live Trading) trên sàn OKX.
* **Nút [DỪNG BOT]** *(nút màu đỏ khi bot đang chạy)*:
  * **Chức năng:** Lập tức dừng chu trình vào lệnh và chuyển bot về chế độ quan sát ngầm (Shadow Mode).
  * **Xử lý lệnh an toàn:** Tự động quét và **hủy toàn bộ lệnh Limit chưa khớp** trên sàn OKX, đồng thời **giữ nguyên 100% TP/SL** của các vị thế đang chạy. Có hộp thoại xác nhận Yes/No.
* **Công tắc [Bảo Vệ Xu Hướng BTC / Altcoin Follow]**:
  * **Chức năng:** Bật/tắt cơ chế giám sát xung lực Bitcoin. Khi BTC có biến động giảm mạnh bất thường, bot sẽ tạm dừng bắt đáy Altcoin để bảo toàn dòng vốn.
* **Công tắc [Dynamic Trailing Limit]**:
  * **Chức năng:** Tự động dịch chuyển (trailing) các lệnh Limit bám sát theo độ dốc của đường EMA200 theo thời gian thực, giúp đón được mức giá tối ưu nhất khi thị trường đảo chiều.

---

## III. THANH ĐIỀU HƯỚNG TRÊN CÙNG (APP HEADER)

* **Bộ Chọn Bố Cục Biểu Đồ (Layout Selector)**:
  * **[1]**: Xem 1 biểu đồ duy nhất cỡ lớn (Full-focus).
  * **[2 Cột] / [2 Hàng]**: Chia đôi màn hình so sánh 2 cặp tiền song song.
  * **[3 Cột] / [3 Hàng]**: Giám sát 3 khung đồ thị đồng thời (ví dụ: XAU, BTC, ETH).
  * **[4 Lưới (2x2)]**: Bố cục chuyên nghiệp 4 màn hình, theo dõi đồng thời BTC, ETH, Altcoin và tỷ trọng USDT.Dominance.
* **Nút Chọn Cặp Tiền (Coin Selector)** *(trên từng biểu đồ)*:
  * **Chức năng:** Chuyển đổi nhanh cặp tài sản cần quan sát: `BTC-USDT-SWAP`, `ETH-USDT-SWAP`, `SOL-USDT-SWAP`, `XAU-USDT-SWAP`...
* **Bộ Nút Khung Thời Gian (Timeframes)**:
  * **Các nút:** `M1` - `M5` - `M15` - `M30` - `1H` - `4H` - `1D`.
  * **Chức năng:** Chuyển bước nến phân tích kỹ thuật và hiển thị cản tương ứng trên đồ thị.
* **Nút [⚙️ Cài Đặt Hệ Thống]**:
  * **Chức năng:** Mở bảng cấu hình tham số thuật toán chi tiết.
* **Nút [Ví / Connect]**:
  * **Chức năng:** Mở nhanh bảng kết nối tài khoản OKX và kiểm tra tình trạng API Key.
* **Nút Chọn Ngôn Ngữ [🌐 Language]**:
  * **Chức năng:** Đổi tức thì ngôn ngữ toàn bộ hệ thống: Tiếng Việt 🇻🇳, English 🇬🇧, 中文 🇨🇳, 한국어 🇰🇷, Français 🇫🇷, Español 🇪🇸.
* **Nút Toàn Màn Hình [⛶ Fullscreen]**:
  * **Chức năng:** Mở rộng giao diện chiếm trọn màn hình thiết bị, ẩn thanh tiêu đề trình duyệt để tối đa hóa không gian biểu đồ.

---

## IV. BẢNG CÀI ĐẶT THÔNG SỐ CHIẾN LƯỢC (SYSTEM SETTINGS MODAL)

* **Bộ Nút Tăng/Giảm NumberSpinBox [▲] / [▼]**:
  * **Chức năng:** Tinh chỉnh chuẩn xác từng bước số cho: Hệ số đòn bẩy, % vốn ký quỹ, khoảng cách DCA %, độ lệch đệm vào lệnh (Base Offset)...
* **Nút Trợ Giúp [?]**:
  * **Chức năng:** Bấm vào để xem giải nghĩa cặn kẽ cơ chế toán học của từng tham số thuật toán.
* **Nút [Khôi Phục Mặc Định]**:
  * **Chức năng:** Đưa toàn bộ thông số thuật toán về cấu hình chuẩn vàng (Golden Preset) đã được kiểm chứng qua hàng ngàn chu kỳ nến.
* **Nút [Lưu Cài Đặt]**:
  * **Chức năng:** Cập nhật thông số mới vào bộ nhớ bot và có hiệu lực ngay trong chu kỳ tính toán tiếp theo.

---

## V. BẢNG QUẢN LÝ VỊ THẾ & LỊCH SỬ GIAO DỊCH (BOTTOM TABLE)

* **Tab [Vị Thế Đang Mở (Open Positions)]**:
  * **Chức năng:** Theo dõi trực tiếp các lệnh đang khớp thực tế trên sàn: Khối lượng, Giá vào (Entry), Giá đánh dấu (Mark), Tỷ lệ PnL % và Lời/Lỗ USDT.
* **Nút [Đóng Vị Thế (Market Close)]** *(ở cuối mỗi dòng vị thế)*:
  * **Chức năng:** Đóng lệnh khẩn cấp theo giá thị trường ngay tức thì trên sàn OKX.
* **Nút [Sửa TP / SL]**:
  * **Chức năng:** Can thiệp thủ công sửa đổi mức Chốt Lời / Cắt Lỗ của vị thế đang chạy.
* **Tab [Lịch Sử Lệnh Đóng (Closed History)]**:
  * **Chức năng:** Bảng nhật ký tổng hợp các lệnh đã đóng trong quá khứ kèm kết quả PnL thực nhận.
* **Nút [Xuất Báo Cáo / Refresh]**:
  * **Chức năng:** Đồng bộ lại số dư ví và làm mới bảng dữ liệu từ sàn OKX.

---

## VI. BẢNG NHẬT KÝ HOẠT ĐỘNG (SYSTEM LOGS & TERMINAL)

* **Nút [Xóa Log (Clear)]**:
  * **Chức năng:** Dọn sạch các thông báo cũ trên khung nhật ký để tiện quan sát tín hiệu mới.
* **Nút [Tự Động Cuộn (Auto Scroll)]**:
  * **Chức năng:** Giữ màn hình luôn tự động trượt xuống dòng nhật ký mới nhất khi bot phát hiện cơ hội hoặc thực thi lệnh.
