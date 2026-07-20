import time
import threading

def start_terminal_listener(system_config: dict):
    def terminal_input_listener():
        while True:
            try:
                user_cmd = input().strip()
                if user_cmd == "reset_wallet":
                    system_config["SHOULD_RESET_WALLET"] = True
                    print("\n♻️ [HỆ THỐNG]: Đã tiếp nhận tín hiệu từ Sếp! Đang kiểm toán mốc VỐN GỐC...")
                elif user_cmd == "reset_nen":
                    system_config["SHOULD_RESET_NEN"] = True
                    print("\n♻️ [HỆ THỐNG]: Đã tiếp nhận tín hiệu từ Sếp! Đang reset lại toàn bộ setup SMC...")
            except:
                time.sleep(1)

    threading.Thread(target=terminal_input_listener, daemon=True).start()
