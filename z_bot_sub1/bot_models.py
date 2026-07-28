
from decimal import Decimal
import time


def record_trade_marker(coin: str, side: str, price: float, status: str = "active"):
    try:
        import os, json, time
        local_app_data = os.getenv('LOCALAPPDATA', os.path.join(os.path.expanduser('~'), 'AppData', 'Local'))
        marker_dir = os.path.join(local_app_data, 'TLS1_Trading', 'json_data')
        os.makedirs(marker_dir, exist_ok=True)
        marker_file = os.path.join(marker_dir, "trade_markers.json")
        markers = {}
        if os.path.exists(marker_file):
            try:
                with open(marker_file, "r", encoding="utf-8") as f:
                    markers = json.load(f)
            except Exception: pass
            
        if coin not in markers:
            markers[coin] = []
            
        if status == "closed":
            # Mark all active ones for this side as closed
            for m in markers[coin]:
                if m["side"] == side and m["status"] == "active":
                    m["status"] = "closed"
        else:
            markers[coin].append({
                "time": int(time.time() * 1000),
                "side": side,
                "price": float(price),
                "status": "active"
            })
            
        markers[coin] = markers[coin][-50:] # Giữ 50 marker gần nhất
        with open(marker_file, "w", encoding="utf-8") as f:
            json.dump(markers, f)
    except Exception as e:
        print(f"Error recording marker: {e}")

# 🧠 CLASS LƯU TRỮ VÀ QUẢN LÝ TÀI SẢN

# 🧠 CLASS LƯU TRỮ VÀ QUẢN LÝ TÀI SẢN (RAM STATE ENGINE)
# BẮT BUỘC PHẢI Ở ĐÂY ĐỂ KHÔNG BỊ XÓA BỘ NHỚ KHI RELOAD FILE LOGIC
# ==============================================================================
class AssetTracker:
    def __init__(self):
        self.live_price = Decimal("0")
        self.ema34, self.ema89, self.ema160, self.ema200 = Decimal("0"), Decimal("0"), Decimal("0"), Decimal("0")
        self.rsi_val = Decimal("50")
        self.rsi_history: list[Decimal] = [] 
        
        self.trend = "SIDEWAY"
        self.macro_trend = "SIDEWAY"
        self.accum_candle_count = 0     
        self.cycle_fail_count = 0       
        self.back_count = 0             
        self.forth_count = 0            
        self.current_side = "none"      
        self.is_sw_locked = False       
        self.last_pos_state = "none"

        self.mtf_states = {
            "M5": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False},
            "M15": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False},
            "M30": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False},
            "H1": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False},
            "H2": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False},
            "H4": {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False}
        }
        self.placed_target_tf = "M5"
        self.active_pos_tf = "M5"
        
        self.has_long, self.has_short = False, False
        self.active_avg_px_long, self.active_avg_px_short = Decimal("0"), Decimal("0")
        self.active_sl_px_long, self.active_sl_px_short = Decimal("0"), Decimal("0")
        self.placed_entry_px_long, self.placed_entry_px_short = "---", "---"
        
        self.missing_count_long: dict[str, int] = {}
        self.missing_count_short: dict[str, int] = {}
        self.mae_max_pct_long, self.mae_max_pct_short = Decimal("0"), Decimal("0")
        self.mae_history_disp_long, self.mae_history_disp_short = "---", "---"
        self.max_roi_long, self.max_roi_short = Decimal("0"), Decimal("0")
        self.last_entry_l, self.last_entry_s = Decimal("0"), Decimal("0")

        self.rsi_26_hit, self.rsi_74_hit = False, False
        self.pullback_count_long, self.pullback_count_short = 0, 0
        self.in_neutral_zone_long, self.in_neutral_zone_short = False, False
        
        self.rsi_peak_long, self.rsi_floor_short = Decimal("0"), Decimal("100")
        self.rsi_max_pain_long, self.rsi_max_pain_short = Decimal("50"), Decimal("50")
        
        self.closure_reason_long, self.closure_reason_short = "", ""
        
        self.macro_base_ema200 = Decimal("0")
        self.macro_peak_price = Decimal("0")
        self.macro_peak_rsi = Decimal("50")
        self.is_macro_cycle_active = False
        self.macro_max_rsi_reached = Decimal("50")
        self.macro_price_at_rsi_max = Decimal("0")
        
        self.ema_squeeze_candle_count = 0 
        self.squeeze_start_time = None
        self.squeeze_max_tightness = Decimal("1.5") 
        self.fan_delta = Decimal("0")
        self.last_ema_fan_spread = Decimal("0")
        
        self.last_closed_side = ""
        self.last_closed_roi = Decimal("0")
        self.current_vol_mult = Decimal("1.0")
        self.last_closed_reason = ""
        self.last_candle_timestamp = 0
        self.closed_history: list[dict] = []  # Lưu lịch sử nhiều lệnh gần nhất
        self.pos_cycle_filled_tfs = []        # TF đã khớp trong chu kỳ vị thế hiện tại
        self.pos_cycle_closed_tfs: list[str] = []  # Lưu TF đã đóng để hiển thị cụm DCA

        # Partial Lock SL stage: 0=chưa kích hoạt, 1=kéo về Entry (hòa vốn), 2=kéo về 1/3 TP
        self.partial_lock_stage_long = 0
        self.partial_lock_stage_short = 0

        # ⚡ PER-TF CANDLE COOLDOWN: Chỉ amend limit khi nến của TF đó đã đóng
        # Key: tf name (M5/M15/M30/H1/H2/H4), Value: timestamp nến đóng cuối cùng đã update limit
        self.last_limit_update_ts: dict[str, int] = {}

    def record_exit(self, side: str, roi: Decimal, reason_code: str, reason_desc: str):
        self.last_closed_side = side
        self.last_closed_roi = roi
        if reason_desc:
            self.last_closed_reason = f"[{reason_code}] {reason_desc}"
        else:
            self.last_closed_reason = f"[{reason_code}]"  # Chỉ hiện code khi desc rỗng
            
        # ⚡ Tăng/Reset win_streak theo khung thời gian (Shrinking TP logic)
        tf = getattr(self, "active_pos_tf", "M5")
        if tf not in self.mtf_states:
            self.mtf_states[tf] = {"accum": 0, "fail": 0, "back": 0, "forth": 0, "side": "none", "ts": 0, "locked": False, "win_streak": 0, "streak_locked": False}
            
        if roi > Decimal("0"):
            self.mtf_states[tf]["win_streak"] = self.mtf_states[tf].get("win_streak", 0) + 1
            if self.mtf_states[tf]["win_streak"] >= 4:
                self.mtf_states[tf]["streak_locked"] = True
        else:
            self.mtf_states[tf]["win_streak"] = 0
            self.mtf_states[tf]["streak_locked"] = False
            

        def fmt_tf(t): return t.lower() if t.upper().startswith("M") else t.upper()
        tfs = sorted(self.pos_cycle_closed_tfs, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t.upper(), 0))
        dca_label = " ".join([fmt_tf(t) for t in tfs]) if tfs else ""
        # ⚡ Xác định icon chiến thuật
        _mode_icon = ""
        if getattr(self, "is_ping_pong_pos", False) and getattr(self, "ping_pong_pos_side", "") == side:
            _mode_icon = "·"
        elif getattr(self, "is_xole_pos", False) and getattr(self, "xole_pos_side", "") == side:
            _mode_icon = "·"
        else:
            _mode_icon = "·"
        self.closed_history.append({
            "side": side, "roi": float(roi), "reason": self.last_closed_reason,
            "dca_tfs": dca_label, "mode_icon": _mode_icon,
            "time": int(time.time())
        })
        if len(self.closed_history) > 10:
            self.closed_history.pop(0)

# ==============================================================================
# 🌐 GIAO TIẾP OKX API (Đóng gói tĩnh ở main để giữ Connection Pool)
# z1950 | Fix missing time module import

# z1949 | Fix Partial Fills using Fills API, RAM structure order list(), Disk I/O Memory Cache, Time-based Caching for Rate Limit
