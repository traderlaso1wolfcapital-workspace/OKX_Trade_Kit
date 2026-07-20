# Kế Hoạch Khắc Phục Lỗi Bất Đồng Bộ Cấu Hình (Split-Brain Config)

## 1. Phân Tích Nguyên Nhân Gốc Rễ (Root Cause)
CEO vừa phát hiện một lỗi kiến trúc rất nguy hiểm được gọi là **Split-Brain (Hai nguồn chân lý)**.
Cụ thể, dự án đang có 2 nơi lưu trữ cấu hình:
1. File code tĩnh: `bot_config.py` (Nơi CEO thao tác sửa code trực tiếp)
2. File động: `JSON_Data/sub*_global_config.json` (Lưu giá trị sinh ra từ giao diện GUI)

Khi CEO lưu file `bot_config.py`, cơ chế Hot-reload trong `sys_bot_sub*.py` đã nhận diện và nạp lại file này. Tuy nhiên, ngay sau đó, vòng lặp AI tự động gọi hàm `run_ai_self_evolution()` trong `bot_strategy.py`. Hàm này tiếp tục đọc file JSON cũ và **đè bẹp (overwrite) mất** các giá trị mới trên RAM quay trở lại thông số cũ của JSON. 

## 2. Giải Pháp Kiến Trúc (Two-Way Sync)
Để biến `bot_config.py` thành một bản điều khiển trung tâm chuẩn mực, nơi CEO sửa code là toàn bộ hệ thống (kể cả giao diện GUI và các bot phụ) phải đồng bộ theo ngay lập tức, chúng ta cần thiết lập cơ chế **Đồng bộ hai chiều (Two-Way Sync)**:

- **Chiều 1 (Code → JSON): Ưu tiên Coder (CEO)**
  Nếu file `bot_config.py` có thời gian chỉnh sửa mới hơn file JSON, hệ thống sẽ ưu tiên nạp các giá trị từ `bot_config.py` và lập tức **ghi đè ngược lại** vào file JSON. Nhờ đó giao diện GUI cũng sẽ được cập nhật.
  
- **Chiều 2 (JSON → Code): Ưu tiên Người dùng GUI**
  Nếu CEO không đụng vào code mà dùng giao diện GUI để bấm Save (làm file JSON mới hơn `bot_config.py`), hệ thống sẽ làm như cũ: ưu tiên nạp thông số từ file JSON vào RAM.

## 3. Chi Tiết Thực Thi Dành Cho Cline (Implementation Steps)

### 📂 File: `z_bot_sub1/bot_strategy.py` và `z_bot_sub2/bot_strategy.py`
*   **Thêm hàm mới:** `sync_config_to_json(env_paths, globals_ref)`
*   *Mục đích:* Trích xuất các biến số định trước từ `globals_ref` (chính là module `bot_config`) và lưu đè (json.dump) vào file `env_paths["FILE_GLOBAL_CONFIG"]` để đồng bộ.

### 📂 File: `sys_bot_sub1.py` và `sys_bot_sub2.py`
*   **Vị trí:** Khối lệnh `🔥 HOT-RELOAD CHECKER` (Khoảng dòng 280-300)
*   *Mục đích:* So sánh `os.path.getmtime(config_path_hot)` và `os.path.getmtime(env_paths["FILE_GLOBAL_CONFIG"])`. Nếu `bot_config.py` mới hơn file JSON, hãy gọi ngay hàm `bot_sub1.sync_config_to_json(env_paths, bot_sub1)` (hoặc bot_sub2) để xuất cấu hình ra. Sau đó cập nhật biến `last_config_mtime = os.path.getmtime(env_paths["FILE_GLOBAL_CONFIG"])` để tránh việc vòng lặp ngay bên dưới (`run_ai_self_evolution()`) lại tải ngược file JSON vừa mới lưu.
*   *Lưu ý:* Việc sửa vào file `sys_` là CẤM ĐỤNG CHẠM, nhưng trong trường hợp vá lỗi luồng Hot-reload này, CTO cho phép Cline sửa trực tiếp vào file `sys_bot_sub*.py`. Phải cực kỳ cẩn thận không làm hỏng vòng lặp `while True`.

## 4. Kế Hoạch Xác Minh (Verification Plan)
1. Chỉnh sửa một thông số bất kỳ trong `bot_config.py` và lưu lại.
2. Kiểm tra Terminal xem có in ra dòng thông báo *"Đã đồng bộ cấu hình từ bot_config.py sang JSON"* không.
3. Mở file `JSON_Data/sub1_global_config.json` ra xem giá trị có tự động nhảy theo `bot_config.py` không. Nếu nhảy là thành công 100%.
