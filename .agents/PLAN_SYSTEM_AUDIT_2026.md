# 🚀 BẢN THIẾT KẾ KIẾN TRÚC & SỬA LỖI (SYSTEM AUDIT 2026)
**Dự án:** `OKX_Trade_Kit`
**Người lập:** CTO Antigravity
**Mục tiêu:** Quét toàn bộ mã nguồn, tìm kiếm các rủi ro tiềm ẩn (hidden bugs), nợ kỹ thuật (technical debt), và đề xuất giải pháp triệt để trước khi xảy ra sự cố trong môi trường Live.

---

## 🐞 1. PHÂN TÍCH CÁC LỖI & RỦI RO NGHIÊM TRỌNG (BUGS & RISKS)

Qua quá trình quét sâu vào `sys_bot_sub1.py`, `sys_bot_sub2.py`, `bot_api.py`, `bot_strategy.py` và `gui_main.py`, tôi đã phát hiện 3 lỗ hổng hệ thống cốt lõi:

### 🔴 Lỗ hổng 1: Tệ nạn "Nuốt Lỗi Tĩnh Lặng" (Silent Exception Swallowing)
- **Triệu chứng:** Hơn **30 block code** trong toàn bộ hệ thống sử dụng cú pháp `except: pass` hoặc `except Exception: pass`.
- **Hậu quả:** Khi API OKX bị timeout, hoặc mất mạng, hoặc tính toán sai khối lượng lệnh, lỗi sẽ bị ỉm đi mà không log ra `bot_error.log`. Điều này làm Bot bị "mù" tạm thời: không vào được lệnh, không DCA được, hoặc không cắt lỗ được nhưng hệ thống vẫn báo đang chạy bình thường.
- **Vị trí nhạy cảm nhất:** Các hàm xử lý Order (`bot_orders.py`), vòng lặp chính (`bot_strategy.py`), và HTTP requests trong `sys_bot_sub*.py`.

### 🔴 Lỗ hổng 2: Sập bẫy Rate Limit của OKX (No Retry Mechanism)
- **Triệu chứng:** Hàm `request()` trong `bot_api.py` (cả bản thường lẫn Async) gọi request qua `requests.request` và `aiohttp.ClientSession`. Nếu OKX trả về mã lỗi `50011` (Rate limit exceeded) hoặc HTTP `429`, hàm này quăng thẳng `RuntimeError` hoặc bị sập ở `raise_for_status()`.
- **Hậu quả:** Khi Bot cố gắng quét nhiều mã Altcoin cùng lúc (đặc biệt lúc biến động mạnh), OKX chặn request, vòng lặp Bot crash hoặc văng ra ngoài, làm lỡ nhịp giao dịch quan trọng. Chưa có cơ chế `Exponential Backoff` (Thử lại sau X giây).

### 🔴 Lỗ hổng 3: Rò rỉ Luồng & Crash Ẩn ở GUI (Thread Leaks)
- **Triệu chứng:** Console log báo `QThread: Destroyed while thread '' is still running` và thỉnh thoảng sập App khi Tắt App hoặc Đăng xuất.
- **Hậu quả:** `BotSubprocessWorker` và các tiến trình âm thanh (`QMediaPlayer`) không được dọn dẹp (graceful shutdown) trước khi App đóng. Khi QThread bị bóp chết cưỡng bức, nó để lại tàn dư trong RAM và sinh ra Crash Log.

---

## 🛠️ 2. PHƯƠNG ÁN GIẢI QUYẾT (IMPLEMENTATION PLAN)
*(Luôn áp dụng tư duy Ponytail Mode: Sửa đơn giản, gọn nhẹ, không vẽ thêm thư viện phức tạp)*

### Bước 1: Khắc phục Rate Limit & API Timeout (Cốt lõi nhất)
- Mở `bot_api.py`.
- Sửa hàm `request()` và `AsyncOKXRestCore.request()`: 
  - Thêm cơ chế vòng lặp thử lại tối đa 3 lần (max_retries = 3).
  - Nếu gặp lỗi Timeout hoặc Rate Limit (`429`, `50011`), cho Bot `time.sleep(1)` rồi thử gọi lại.
  - Điều này giúp Bot lỳ đòn hơn khi sàn lag.

### Bước 2: Thanh trừng `except: pass` tại các hàm Trọng yếu
- Quét các file `bot_orders.py`, `bot_strategy.py`, `bot_ui.py`.
- Tại những chỗ liên quan đến Tiền (vào lệnh, hủy lệnh, lấy số dư): 
  - Đổi `except: pass` thành `except Exception as e: hft_logger.error(f"Lỗi ABC: {e}")`
  - Đảm bảo mọi lỗi giao dịch đều được ghi vào `bot_error.log` để CEO dễ dàng theo dõi nguyên nhân khi Bot trượt lệnh.

### Bước 3: Dọn dẹp QThread (Graceful Shutdown)
- Trong `gui_main.py`, bắt sự kiện `closeEvent(self, event)` của `AppWindow`.
- Force đóng tất cả các `BotSubprocessWorker` đang chạy (`worker.terminate()`, `worker.wait()`) trước khi cho phép App thoát hoàn toàn.
- Dọn dẹp `_GLOBAL_AUDIO_PLAYERS.clear()` trước khi thoát.

---

Sếp vui lòng xem bản kế hoạch này. Nếu duyệt, Sếp chỉ cần dùng Prompt bên dưới để Coder (Cline) tiến hành thi công!
