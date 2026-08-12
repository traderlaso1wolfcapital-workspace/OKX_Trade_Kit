from decimal import Decimal
from datetime import datetime
from typing import Any
import os
import time
import json

def format_with_commas(val_any: Any, decimals: int = 1) -> str:
    try:
        val_dec = Decimal(str(val_any))
        if val_dec == 0: return "0"
        return f"{val_dec:,.{decimals}f}"
    except: return str(val_any)

def _sync_update_wallet_metrics(client, env_paths: dict, system_config: dict):
    try:
        balance_data = client.request("GET", "/api/v5/account/balance", params={"ccy": "USDT"})
        usdt_details = balance_data.get("data", [{}])[0].get("details", [])
        
        current_equity = Decimal("2000.00")  
        for detail in usdt_details:
            if detail.get("ccy") == "USDT":
                current_equity = Decimal(str(detail.get("eq", "2000.00")))
                break
        
        data = {}
        evo_file = env_paths.get("JSON_EVOLUTION_DATA_FILE", "")
        if evo_file and os.path.exists(evo_file):
            with open(evo_file, "r", encoding="utf-8") as f:
                try: data = json.load(f)
                except: data = {}
                
        if "wallet_stats" not in data or system_config.get("SHOULD_RESET_WALLET", False):
            data["wallet_stats"] = {
                "von_goc": float(current_equity), "von_hien_tai": float(current_equity),
                "loi_nhuan": 0.0, "tang_truong": 0.0
            }
            if system_config.get("SHOULD_RESET_WALLET", False):
                system_config["SHOULD_RESET_WALLET"] = False
                print(f"\n♻️ [RESET WALLET]: Bộ lõi AI đã khóa cứng mốc VỐN GỐC mới = {current_equity:,.2f} USDT")
        else:
            stats = data["wallet_stats"]
            von_goc = Decimal(str(stats.get("von_goc", current_equity)))
            loi_nhuan = current_equity - von_goc
            tang_truong = (loi_nhuan / von_goc) * Decimal("100") if von_goc > 0 else Decimal("0")
            
            stats["von_hien_tai"] = float(current_equity)
            stats["loi_nhuan"] = float(loi_nhuan)
            stats["tang_truong"] = float(tang_truong)
            
        if evo_file:
            os.makedirs(os.path.dirname(evo_file), exist_ok=True)
            with open(evo_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
    except: pass

def update_wallet_metrics(*args, **kwargs):
    _sync_update_wallet_metrics(*args, **kwargs)

# ==============================================================================
# 🔧 STATE LABELS cho chiến thuật Liquidation
# ==============================================================================
STATE_LABELS = {
    "Waiting For Bulky Candle":     "⏳ Quét tìm Nến Khủng (Bulky Candle)",
    "Waiting For Side Retest":      "🔍 Chờ Quét Thanh Khoản (Liquidity Sweep)",
    "Waiting For OB":               "📦 Chờ xác nhận Order Block (OB)",
    "Waiting For OB Retracement":   "🎯 Chờ giá hồi về vùng OB",
    "Enter Position":               "🔥 VÀO LỆNH!",
}

STATE_ICONS = {
    "Waiting For Bulky Candle":     "⏳",
    "Waiting For Side Retest":      "🔍",
    "Waiting For OB":               "📦",
    "Waiting For OB Retracement":   "🎯",
    "Enter Position":               "🔥",
}

# ==============================================================================
# 📊 BẢNG GIAO DIỆN TERMINAL CHUẨN MỰC (Clone từ Sub1)
# ==============================================================================
def print_dashboard(strategy, env_paths: dict, system_config: dict, coin_states: dict = None):
    """
    In bảng dashboard Terminal giống y hệt Sub1.
    
    Args:
        strategy: LiquidationStrategy instance  
        env_paths: dict chứa các đường dẫn file cấu hình
        system_config: dict cấu hình hệ thống  
        coin_states: dict{coin_name: {live_price, has_long, has_short, entry_px, sl_px, tp_px, pnl_pct, state, direction}}
    """
    sync_time = datetime.now().strftime('%H:%M:%S')
    von_goc, von_hien_tai, loi_nhuan, tang_truong = 2000.00, 2000.00, 0.00, 0.00
    total_pos, total_win = 0, 0
    ai_winrate = 0.0

    try:
        evo_file = env_paths.get("JSON_EVOLUTION_DATA_FILE", "")
        if evo_file and os.path.exists(evo_file):
            with open(evo_file, "r", encoding="utf-8") as f:
                data = json.load(f)
                if "wallet_stats" in data:
                    w = data["wallet_stats"]
                    von_goc = w.get("von_goc", 2000.00)
                    von_hien_tai = w.get("von_hien_tai", 2000.00)
                    loi_nhuan = w.get("loi_nhuan", 0.00)
                    tang_truong = w.get("tang_truong", 0.00)
                if "trade_stats" in data:
                    total_pos = data["trade_stats"].get("total_trades", 0)
                    total_win = data["trade_stats"].get("total_wins", 0)
                    if total_pos > 0:
                        ai_winrate = (total_win / total_pos) * 100
    except: pass

    if coin_states is None:
        coin_states = {}

    pnl_sign = "+" if loi_nhuan >= 0 else ""

    bar  = "-" * 78
    dbar = "=" * 78

    pnl_str = f"{pnl_sign}{format_with_commas(loi_nhuan, 2)}"

    r0 = " ⚡ Bot Liquidation |   💰 Lợi nhuận    |   🏦 Tài khoản    |  🎯 Hiệu suất  "
    
    r1_c1 = f"   {sync_time:^15}   "
    r1_c2 = f" Gốc: {format_with_commas(von_goc, 2):>8} U "
    r1_c3 = f" Tổng: {format_with_commas(von_hien_tai, 2):>8} U "
    r1_c4 = f" Win: {ai_winrate:.1f}% / {total_pos:<3}"
    r1 = f"{r1_c1:<21}|{r1_c2:<19}|{r1_c3:<19}|{r1_c4:<16}"

    r2_c1 = ""
    r2_c2 = f" PNL: {pnl_str:>8} U "
    
    # Uptime
    bot_start = system_config.get("BOT_START_TIME", time.time())
    uptime_sec = int(time.time() - bot_start)
    uptime_h = uptime_sec // 3600
    uptime_m = (uptime_sec % 3600) // 60
    uptime_str = f"{uptime_h}h{uptime_m:02d}m"
    
    r2_c3 = f" Up : {uptime_str:>8}   "
    r2_c4 = f" State: {len(coin_states):<5}"
    r2 = f"{r2_c1:<21}|{r2_c2:<19}|{r2_c3:<19}|{r2_c4:<16}"

    print(f"\n  bot_sub3.py {env_paths.get('ENV_FILE_NAME', '.api')}")
    print(dbar)
    print(r0)
    print(bar)
    print(r1)
    print(r2)
    print(dbar)

    # ==============================================================================
    # ☢ TRẠNG THÁI CHIẾN THUẬT (State Machine)
    # ==============================================================================
    current_state = strategy.state
    state_label = STATE_LABELS.get(current_state, current_state)

    # Thanh trạng thái 5 bước
    states_order = [
        "Waiting For Bulky Candle",
        "Waiting For Side Retest",
        "Waiting For OB",
        "Waiting For OB Retracement",
        "Enter Position"
    ]
    state_idx = states_order.index(current_state) if current_state in states_order else 0
    progress_parts = []
    for i, s in enumerate(states_order):
        icon = STATE_ICONS.get(s, "·")
        if i < state_idx:
            progress_parts.append(f"✅")
        elif i == state_idx:
            progress_parts.append(f"▶{icon}")
        else:
            progress_parts.append(f"○")
    progress_bar = " → ".join(progress_parts)

    print(f"\n☢ CHIẾN THUẬT LIQUIDATION:")
    print(f"  State [{state_idx+1}/5]: {state_label}")
    print(f"  {progress_bar}")

    # Chi tiết bổ sung nếu strategy đang tiến sâu
    if strategy.bulkyHigh is not None and strategy.bulkyLow is not None:
        print(f"  · Nến Khủng: High={format_with_commas(strategy.bulkyHigh, 1)} | Low={format_with_commas(strategy.bulkyLow, 1)}")
    if strategy.overlapDirection:
        dir_label = "TĂNG (Bull)" if strategy.overlapDirection == "Bull" else "GIẢM (Bear)"
        print(f"  · Hướng Sweep: {dir_label}")
    if strategy.ob:
        print(f"  · Order Block: Top={format_with_commas(strategy.ob.get('top', 0), 1)} | Bot={format_with_commas(strategy.ob.get('bottom', 0), 1)}")

    # ==============================================================================
    # ✜ Tình trạng vị thế (Bảng Coin giống Sub1)
    # ==============================================================================
    table_lines = []
    table_lines.append("-" * 78)
    table_lines.append(f" {'Coin':^4} | {'Giá Hiện tại':^12} | {'Vị thế':^10} | {'Entry':^10} | {'SL':^10} | {'TP':^10} | {'PNL':^8} ")
    table_lines.append("-" * 78)

    enabled_coins = system_config.get("ENABLED_COINS", ["XAU", "BTC", "ETH"])
    
    if coin_states:
        for coin_name in enabled_coins:
            cs = coin_states.get(coin_name, {})
            live_px = format_with_commas(cs.get("live_price", 0), 1)
            
            if cs.get("has_long"):
                pos_str = "🟢 LONG"
                entry_str = format_with_commas(cs.get("entry_px", 0), 1)
                sl_str = format_with_commas(cs.get("sl_px", 0), 1)
                tp_str = format_with_commas(cs.get("tp_px", 0), 1)
                pnl_pct = cs.get("pnl_pct", 0)
                pnl_sign_c = "+" if pnl_pct >= 0 else ""
                pnl_str = f"{pnl_sign_c}{pnl_pct:.1f}%"
            elif cs.get("has_short"):
                pos_str = "🔴 SHORT"
                entry_str = format_with_commas(cs.get("entry_px", 0), 1)
                sl_str = format_with_commas(cs.get("sl_px", 0), 1)
                tp_str = format_with_commas(cs.get("tp_px", 0), 1)
                pnl_pct = cs.get("pnl_pct", 0)
                pnl_sign_c = "+" if pnl_pct >= 0 else ""
                pnl_str = f"{pnl_sign_c}{pnl_pct:.1f}%"
            else:
                pos_str = "⬜ Chờ"
                entry_str = "---"
                sl_str = "---"
                tp_str = "---"
                pnl_str = "---"

            table_lines.append(f" {coin_name:^4} | {live_px:^12} | {pos_str:^10} | {entry_str:^10} | {sl_str:^10} | {tp_str:^10} | {pnl_str:^8} ")
    else:
        # Chưa có dữ liệu coin, hiển thị placeholder
        for coin_name in enabled_coins:
            table_lines.append(f" {coin_name:^4} | {'---':^12} | {'⬜ Chờ':^10} | {'---':^10} | {'---':^10} | {'---':^10} | {'---':^8} ")

    print("\n✜ Tình trạng vị thế:")
    
    # In trạng thái chi tiết của mỗi coin
    for coin_name in enabled_coins:
        cs = coin_states.get(coin_name, {})
        coin_state = cs.get("state", strategy.state)
        coin_dir = cs.get("direction", strategy.overlapDirection)
        state_lbl = STATE_LABELS.get(coin_state, coin_state)
        
        if cs.get("has_long"):
            entry_str = format_with_commas(cs.get("entry_px", 0), 1)
            pnl_pct = cs.get("pnl_pct", 0)
            pnl_sign_c = "+" if pnl_pct >= 0 else ""
            print(f"    {coin_name} ╭─ Đã khớp LONG")
            print(f"        ╰─ Entry: {entry_str}  ({pnl_sign_c}{pnl_pct:.1f}%)")
        elif cs.get("has_short"):
            entry_str = format_with_commas(cs.get("entry_px", 0), 1)
            pnl_pct = cs.get("pnl_pct", 0)
            pnl_sign_c = "+" if pnl_pct >= 0 else ""
            print(f"    {coin_name} ╭─ Đã khớp SHORT")
            print(f"        ╰─ Entry: {entry_str}  ({pnl_sign_c}{pnl_pct:.1f}%)")
        else:
            print(f"    {coin_name} ╭─  Chưa có vị thế")
            print(f"        ╰─ {state_lbl}")
        print("")

    for line in table_lines:
        print(line)
    print("=" * 78 + "\n")
