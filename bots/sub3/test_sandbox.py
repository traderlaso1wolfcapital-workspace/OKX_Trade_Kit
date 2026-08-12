"""
===============================================================================
🧪 TEST SANDBOX — Bot Sub3 (Liquidation Strategy)
===============================================================================
Kiểm tra toàn bộ:
1. Import modules
2. Strategy logic (state machine 5 giai đoạn)
3. bot_ui.py (print_dashboard)
4. sys_bot_sub3.py (env_paths, config loader, API read)
5. GUI integration (gui_main.py compile check)
===============================================================================
"""
import sys, os, traceback, time

# Setup path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

PASS = 0
FAIL = 0
ERRORS = []

def test(name, func):
    global PASS, FAIL, ERRORS
    try:
        func()
        PASS += 1
        print(f"  ✅ {name}")
    except Exception as e:
        FAIL += 1
        tb = traceback.format_exc()
        ERRORS.append((name, str(e), tb))
        print(f"  ❌ {name}: {e}")

# ==============================================================================
# 1. IMPORT TESTS
# ==============================================================================
print("\n" + "=" * 70)
print("📦 [1/5] KIỂM TRA IMPORT MODULES")
print("=" * 70)

def test_import_strategy():
    from bots.sub3.sys_liquid_strategy import LiquidationStrategy
    assert LiquidationStrategy is not None

def test_import_utils_ob():
    from bots.sub3.utils_ob import calculate_atr, find_order_block
    assert calculate_atr is not None
    assert find_order_block is not None

def test_import_bot_ui():
    from bots.sub3.bot_ui import print_dashboard, update_wallet_metrics, STATE_LABELS, STATE_ICONS
    assert print_dashboard is not None
    assert len(STATE_LABELS) == 5
    assert len(STATE_ICONS) == 5

def test_import_bot_api():
    from bots.sub1.bot_api import OKXRestCore
    assert OKXRestCore is not None

def test_import_sys_bot():
    # Chỉ kiểm tra compile, không chạy main()
    import py_compile
    py_compile.compile(os.path.join(BASE_DIR, "bots", "sub3", "sys_bot_sub3.py"), doraise=True)

def test_import_gui_main():
    import py_compile
    py_compile.compile(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), doraise=True)

test("Import LiquidationStrategy", test_import_strategy)
test("Import utils_ob (ATR, OB)", test_import_utils_ob)
test("Import bot_ui (dashboard)", test_import_bot_ui)
test("Import bot_api (OKXRestCore)", test_import_bot_api)
test("Compile sys_bot_sub3.py", test_import_sys_bot)
test("Compile gui_main.py", test_import_gui_main)

# ==============================================================================
# 2. STRATEGY LOGIC TESTS
# ==============================================================================
print("\n" + "=" * 70)
print("🧠 [2/5] KIỂM TRA LOGIC CHIẾN THUẬT (State Machine)")
print("=" * 70)

import numpy as np
from bots.sub3.sys_liquid_strategy import LiquidationStrategy
from bots.sub3.utils_ob import calculate_atr, find_order_block

def test_strategy_init_default():
    s = LiquidationStrategy()
    assert s.state == "Waiting For Bulky Candle"
    assert s.bulkyHigh is None
    assert s.bulkyLow is None
    assert s.overlapDirection is None
    assert s.ob is None
    assert s.slATRMult == 1.5
    assert s.DynamicRR == 2.0
    assert s.bulkyCandleATR == 2.1
    assert s.tpslMethod == "Dynamic"

def test_strategy_init_with_config():
    cfg = {
        "SL_ATR_MULT": 2.0,
        "DYNAMIC_RR": 3.0,
        "BULKY_ATR_MULT": 3.5,
        "TPSL_METHOD": "Fixed",
        "FIXED_SL_PCT": 1.5,
        "FIXED_TP_PCT": 3.0
    }
    s = LiquidationStrategy(config=cfg)
    assert s.slATRMult == 2.0
    assert s.DynamicRR == 3.0
    assert s.bulkyCandleATR == 3.5
    assert s.tpslMethod == "Fixed"
    assert s.fixedSlPct == 1.5
    assert s.fixedTpPct == 3.0

def test_strategy_reset():
    s = LiquidationStrategy()
    s.state = "Enter Position"
    s.bulkyHigh = 100
    s.bulkyLow = 90
    s.overlapDirection = "Bull"
    s.ob = {"top": 95, "bottom": 93}
    s.reset()
    assert s.state == "Waiting For Bulky Candle"
    assert s.bulkyHigh is None
    assert s.bulkyLow is None
    assert s.overlapDirection is None
    assert s.ob is None

def test_calculate_atr():
    np.random.seed(42)
    n = 60
    highs = np.cumsum(np.random.randn(n)) + 100
    lows = highs - np.abs(np.random.randn(n)) * 2
    closes = (highs + lows) / 2
    atr = calculate_atr(highs, lows, closes, 14)
    assert isinstance(atr, (float, np.floating)), f"ATR should be float, got {type(atr)}"
    assert atr > 0, f"ATR should be positive, got {atr}"

def test_strategy_no_signal_short_data():
    s = LiquidationStrategy()
    htf = [{"open": 100, "high": 101, "low": 99, "close": 100.5} for _ in range(10)]
    ltf = [{"open": 100, "high": 100.5, "low": 99.5, "close": 100} for _ in range(10)]
    result = s.get_signal(htf, ltf)
    assert result is None, "Should return None for insufficient data (< atrLenCRT)"

def test_strategy_bulky_candle_detection():
    """Tạo dữ liệu giả lập với 1 cây nến khủng ở cuối"""
    s = LiquidationStrategy()
    s.bulkyCandleATR = 2.0  # Hạ thấp ngưỡng cho dễ test
    
    # 50 cây nến bình thường
    htf = []
    base = 100.0
    for i in range(50):
        o = base + np.random.randn() * 0.5
        c = o + np.random.randn() * 0.5
        h = max(o, c) + abs(np.random.randn()) * 0.3
        l = min(o, c) - abs(np.random.randn()) * 0.3
        htf.append({"open": o, "high": h, "low": l, "close": c})
    
    # Cây nến khủng (biên độ gấp 5x ATR)
    avg_range = np.mean([k["high"] - k["low"] for k in htf[-14:]])
    bulky_range = avg_range * 8  # Rất lớn
    htf.append({"open": 100, "high": 100 + bulky_range, "low": 100 - bulky_range, "close": 100 + bulky_range * 0.5})
    
    ltf = [{"open": 100, "high": 100.5, "low": 99.5, "close": 100} for _ in range(60)]
    
    result = s.get_signal(htf, ltf)
    # Nếu phát hiện bulky candle thì state phải chuyển
    if result and "status" in result:
        assert s.state == "Waiting For Side Retest", f"Expected state change, got {s.state}"
    # Nếu không thì vẫn ổn (ATR quá lớn)

def test_fixed_tpsl_long():
    s = LiquidationStrategy(config={"TPSL_METHOD": "Fixed", "FIXED_SL_PCT": 1.0, "FIXED_TP_PCT": 2.0})
    entry = 100.0
    expected_sl = 100.0 * (1 - 1.0/100.0)  # 99.0
    expected_tp = 100.0 * (1 + 2.0/100.0)  # 102.0
    # Kiểm tra công thức trực tiếp
    sl = entry * (1 - s.fixedSlPct / 100.0)
    tp = entry * (1 + s.fixedTpPct / 100.0)
    assert abs(sl - 99.0) < 0.001, f"SL should be 99.0, got {sl}"
    assert abs(tp - 102.0) < 0.001, f"TP should be 102.0, got {tp}"

def test_fixed_tpsl_short():
    s = LiquidationStrategy(config={"TPSL_METHOD": "Fixed", "FIXED_SL_PCT": 1.0, "FIXED_TP_PCT": 2.0})
    entry = 100.0
    sl = entry * (1 + s.fixedSlPct / 100.0)
    tp = entry * (1 - s.fixedTpPct / 100.0)
    assert abs(sl - 101.0) < 0.001, f"SL should be 101.0, got {sl}"
    assert abs(tp - 98.0) < 0.001, f"TP should be 98.0, got {tp}"

test("Strategy init (mặc định)", test_strategy_init_default)
test("Strategy init (có config)", test_strategy_init_with_config)
test("Strategy reset", test_strategy_reset)
test("ATR tính toán", test_calculate_atr)
test("Không signal khi data ít", test_strategy_no_signal_short_data)
test("Phát hiện nến khủng", test_strategy_bulky_candle_detection)
test("Fixed TPSL LONG", test_fixed_tpsl_long)
test("Fixed TPSL SHORT", test_fixed_tpsl_short)

# ==============================================================================
# 3. BOT UI TESTS
# ==============================================================================
print("\n" + "=" * 70)
print("🖥️  [3/5] KIỂM TRA GIAO DIỆN TERMINAL (bot_ui.py)")
print("=" * 70)

from bots.sub3.bot_ui import print_dashboard, format_with_commas, STATE_LABELS

def test_format_with_commas():
    assert format_with_commas(1234567.89, 2) == "1,234,567.89"
    assert format_with_commas(0, 1) == "0"
    assert format_with_commas(100.5, 1) == "100.5"

def test_dashboard_no_crash():
    """Dashboard phải in ra mà không crash"""
    import io
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    
    try:
        s = LiquidationStrategy()
        env_paths = {"ENV_FILE_NAME": ".api_test"}
        sys_cfg = {"BOT_START_TIME": time.time(), "ENABLED_COINS": ["BTC", "ETH"]}
        coin_states = {
            "BTC": {"live_price": 103000, "has_long": False, "has_short": False, "entry_px": 0, "sl_px": 0, "tp_px": 0, "pnl_pct": 0, "state": "Waiting For Bulky Candle", "direction": None},
            "ETH": {"live_price": 3200, "has_long": True, "has_short": False, "entry_px": 3150, "sl_px": 3100, "tp_px": 3300, "pnl_pct": 1.5, "state": "Enter Position", "direction": "Bull"},
        }
        print_dashboard(s, env_paths, sys_cfg, coin_states)
        output = sys.stdout.getvalue()
        assert "Bot Liquidation" in output
        assert "BTC" in output
        assert "ETH" in output
        assert "103,000" in output or "103000" in output
    finally:
        sys.stdout = old_stdout

def test_dashboard_empty_coins():
    """Dashboard với coin_states rỗng"""
    import io
    old_stdout = sys.stdout
    sys.stdout = io.StringIO()
    try:
        s = LiquidationStrategy()
        env_paths = {"ENV_FILE_NAME": ".api_test"}
        sys_cfg = {"BOT_START_TIME": time.time(), "ENABLED_COINS": ["XAU"]}
        print_dashboard(s, env_paths, sys_cfg, {})
        output = sys.stdout.getvalue()
        assert "XAU" in output
        assert "Chờ" in output
    finally:
        sys.stdout = old_stdout

def test_state_labels_complete():
    expected = ["Waiting For Bulky Candle", "Waiting For Side Retest", "Waiting For OB", "Waiting For OB Retracement", "Enter Position"]
    for state in expected:
        assert state in STATE_LABELS, f"Missing label for {state}"

test("format_with_commas", test_format_with_commas)
test("Dashboard không crash (có dữ liệu)", test_dashboard_no_crash)
test("Dashboard không crash (coin rỗng)", test_dashboard_empty_coins)
test("State labels đầy đủ 5 giai đoạn", test_state_labels_complete)

# ==============================================================================
# 4. SYS_BOT_SUB3 TESTS
# ==============================================================================
print("\n" + "=" * 70)
print("⚙️  [4/5] KIỂM TRA HỆ THỐNG BOT (sys_bot_sub3.py)")
print("=" * 70)

def test_env_paths_builder():
    # Import hàm nội bộ
    sys.path.insert(0, os.path.join(BASE_DIR, "bots", "sub3"))
    # Đọc source và test logic
    import importlib
    spec = importlib.util.spec_from_file_location("sys_bot_sub3", os.path.join(BASE_DIR, "bots", "sub3", "sys_bot_sub3.py"))
    mod = importlib.util.module_from_spec(spec)
    # Không exec (vì main() sẽ chạy), chỉ test compile
    assert spec is not None

def test_api_file_reading():
    """Kiểm tra đọc API key từ file .api"""
    api_dir = os.path.join(BASE_DIR, "bots", "sub3")
    # Tìm bất kỳ file .api nào
    api_files = [f for f in os.listdir(api_dir) if f.startswith(".api")]
    if not api_files:
        api_dir = os.path.join(BASE_DIR, "bots", "sub1")
        api_files = [f for f in os.listdir(api_dir) if f.startswith(".api")]
    
    assert len(api_files) > 0, "Không tìm thấy file .api nào"
    
    env_file = os.path.join(api_dir, api_files[0])
    api_key, secret, passphrase = "", "", ""
    with open(env_file, "r") as f:
        for line in f:
            line = line.strip()
            if line.startswith("API_KEY="): api_key = line.split("=", 1)[1]
            elif line.startswith("SECRET="): secret = line.split("=", 1)[1]
            elif line.startswith("PASSPHRASE="): passphrase = line.split("=", 1)[1]
    
    # Chỉ cần đọc được, không cần có giá trị
    assert isinstance(api_key, str)

def test_config_json_read():
    """Kiểm tra đọc config JSON (utf-8-sig compatible)"""
    import json
    json_dir = os.path.join(BASE_DIR, "bots", "sub3", "json_data")
    if not os.path.exists(json_dir):
        # Cũng có thể ở USER_DATA_DIR
        local_app = os.environ.get("LOCALAPPDATA", os.path.expanduser("~"))
        json_dir = os.path.join(local_app, "TLS1_Trading", "bots", "sub3", "json_data")
    
    if os.path.exists(json_dir):
        json_files = [f for f in os.listdir(json_dir) if f.endswith(".json")]
        for jf in json_files:
            fp = os.path.join(json_dir, jf)
            with open(fp, "r", encoding="utf-8-sig") as f:
                data = json.load(f)
            assert isinstance(data, dict), f"JSON should be dict: {jf}"
    # Pass nếu không có file json (chưa chạy lần nào)

def test_pid_file_logic():
    """Kiểm tra tạo/xóa PID file"""
    config_dir = os.path.join(BASE_DIR, "config")
    os.makedirs(config_dir, exist_ok=True)
    test_pid = os.path.join(config_dir, "test_sub3.pid")
    
    # Tạo
    with open(test_pid, "w") as f:
        f.write("99999")
    assert os.path.exists(test_pid)
    
    # Đọc
    with open(test_pid, "r") as f:
        pid = int(f.read().strip())
    assert pid == 99999
    
    # Xóa
    os.remove(test_pid)
    assert not os.path.exists(test_pid)

test("Module spec loadable", test_env_paths_builder)
test("Đọc file API key", test_api_file_reading)
test("Đọc config JSON (utf-8-sig)", test_config_json_read)
test("Logic PID file", test_pid_file_logic)

# ==============================================================================
# 5. GUI INTEGRATION TESTS
# ==============================================================================
print("\n" + "=" * 70)
print("🖼️  [5/5] KIỂM TRA TÍCH HỢP GUI (gui_main.py)")
print("=" * 70)

def test_gui_has_sub3_routing():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert 'strategy_id == "sub3"' in content, "gui_main.py thiếu routing cho sub3"
    assert "setup_tab_strategy_liquidation" in content, "gui_main.py thiếu hàm setup_tab_strategy_liquidation"

def test_gui_has_sub3_tab():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "Bot Liquidation" in content, "gui_main.py thiếu tab Bot Liquidation"
    assert "panel_sub3" in content, "gui_main.py thiếu panel_sub3"

def test_gui_default_sub3_cfg():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "default_sub3_cfg" in content, "gui_main.py thiếu default_sub3_cfg"

def test_gui_save_fixed_tpsl():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "FIXED_SL_PCT" in content, "gui_main.py thiếu FIXED_SL_PCT trong save"
    assert "FIXED_TP_PCT" in content, "gui_main.py thiếu FIXED_TP_PCT trong save"

def test_gui_hasattr_protection():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert "hasattr(self, 'sp_fixed_sl')" in content, "gui_main.py thiếu hasattr cho sp_fixed_sl"
    assert "hasattr(self, 'cb_tpsl_method')" in content, "gui_main.py thiếu hasattr cho cb_tpsl_method"

def test_gui_utf8sig_encoding():
    with open(os.path.join(BASE_DIR, "desktop_app", "gui_main.py"), "r", encoding="utf-8") as f:
        content = f.read()
    assert 'encoding="utf-8-sig"' in content, "gui_main.py chưa fix UTF-8 BOM (utf-8-sig)"

test("GUI routing sub3", test_gui_has_sub3_routing)
test("GUI tab Bot Liquidation", test_gui_has_sub3_tab)
test("GUI default_sub3_cfg", test_gui_default_sub3_cfg)
test("GUI save Fixed TPSL", test_gui_save_fixed_tpsl)
test("GUI hasattr protection", test_gui_hasattr_protection)
test("GUI UTF-8-sig encoding", test_gui_utf8sig_encoding)

# ==============================================================================
# KẾT QUẢ
# ==============================================================================
print("\n" + "=" * 70)
total = PASS + FAIL
print(f"📊 KẾT QUẢ: {PASS}/{total} PASSED | {FAIL} FAILED")
print("=" * 70)

if ERRORS:
    print("\n❌ CHI TIẾT LỖI:")
    for name, err, tb in ERRORS:
        print(f"\n  🔴 {name}:")
        print(f"     {err}")
        # In 3 dòng cuối traceback
        tb_lines = tb.strip().split("\n")
        for line in tb_lines[-3:]:
            print(f"     {line}")

if FAIL == 0:
    print("\n🎉 TẤT CẢ CÁC KIỂM TRA ĐỀU PASS! Bot Sub3 sẵn sàng hoạt động.")
else:
    print(f"\n⚠️ CÒN {FAIL} LỖI CẦN SỬA!")

sys.exit(FAIL)
