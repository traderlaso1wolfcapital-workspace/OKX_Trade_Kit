import os
import json
from decimal import Decimal
from typing import Dict
from datetime import datetime
from z_bot_sub2.bot_models import AssetTracker

BULLISH = 1
BEARISH = -1

def update_wallet_metrics(client, env_paths: dict, system_config: dict):
    try:
        balance_data = client.request("GET", "/api/v5/account/balance", params={"ccy": "USDT"})
        usdt_details = balance_data.get("data", [{}])[0].get("details", [])
        
        current_equity = Decimal("2000.00")  
        for detail in usdt_details:
            if detail.get("ccy") == "USDT":
                current_equity = Decimal(str(detail.get("eq", "2000.00")))
                break
        
        data = {}
        if os.path.exists(env_paths["JSON_EVOLUTION_DATA_FILE"]):
            with open(env_paths["JSON_EVOLUTION_DATA_FILE"], "r", encoding="utf-8") as f:
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
            
        with open(env_paths["JSON_EVOLUTION_DATA_FILE"], "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except: pass

def format_with_commas(value, decimals=2):
    try:
        return f"{float(value):,.{decimals}f}"
    except:
        return "0.00"

def print_dashboard(trackers: Dict[str, AssetTracker], env_paths: dict):
    """Hiển thị Dashboard UI cho Bot Sub2 theo format chuẩn mực của Sub1"""

    sync_time = datetime.now().strftime('%H:%M:%S')
    
    # Lấy thông tin ví
    von_goc = 2000.00
    von_hien_tai = 2000.00
    loi_nhuan = 0.00
    tang_truong = 0.00
    
    evo_file = env_paths.get("JSON_EVOLUTION_DATA_FILE")
    
    total_pos, total_win, all_mae, all_mfe = 0, 0, [], []
    ai_winrate, ai_avg_mae, ai_avg_mfe = 0.0, 0.0, 0.0
    
    if evo_file and os.path.exists(evo_file):
        try:
            with open(evo_file, "r", encoding="utf-8") as f:
                evo_data = json.load(f)
                if "wallet_stats" in evo_data:
                    w = evo_data["wallet_stats"]
                    von_goc = w.get("von_goc", 2000.00)
                    von_hien_tai = w.get("von_hien_tai", 2000.00)
                    loi_nhuan = w.get("loi_nhuan", 0.00)
                    tang_truong = w.get("tang_truong", 0.00)
                
                for coin in evo_data:
                    if coin == "wallet_stats": continue
                    total_pos += evo_data[coin].get("tong_lenh_dong", 0)
                    total_win += evo_data[coin].get("lenh_thang", 0)
                    all_mae.extend(evo_data[coin].get("lich_su_mae", []))
                    all_mfe.extend(evo_data[coin].get("lich_su_mfe", []))
                
                if total_pos > 0: ai_winrate = (total_win / total_pos) * 100
                if all_mae: ai_avg_mae = sum(all_mae) / len(all_mae)
                if all_mfe: ai_avg_mfe = sum(all_mfe) / len(all_mfe)
        except: pass

    pnl_sign = "+" if loi_nhuan >= 0 else ""
    growth_sign = "+" if tang_truong >= 0 else ""

    bot_name = "SMC Order Block"
    
    # Format giống v1.0.271
    bar  = "-" * 78
    dbar = "=" * 78
    
    pnl_str = f"{pnl_sign}{format_with_commas(loi_nhuan, 2)}"
    vol_str_top = f"{format_with_commas(target_vol, 1)}"
    mfe_str = f"+{ai_avg_mfe:.1f}%" if ai_avg_mfe > 0 else "--"
    mae_str = f"-{ai_avg_mae:.1f}%" if ai_avg_mae > 0 else "--"
    mm_str = f"{mfe_str} / {mae_str}"
    
    r0 = f" ⚡ {bot_name:<18}|   💰 Lợi nhuận    |   🏦 Tài khoản    |  🎯 Hiệu suất  "
    
    r1_c1 = f"   {sync_time:^15}   "
    r1_c2 = f" Gốc: {format_with_commas(von_goc, 2):>8} U "
    r1_c3 = f" Tổng: {format_with_commas(von_hien_tai, 2):>8} U "
    r1_c4 = f" Win: {ai_winrate:.1f}% / {total_pos:<3}"
    r1 = f"{r1_c1:<21}|{r1_c2:<19}|{r1_c3:<19}|{r1_c4:<16}"

    r2_c1 = " " * 21
    r2_c2 = f" PNL: {pnl_str:>8} U "
    r2_c3 = f" Vol : {vol_str_top:>8} U "
    r2_c4 = f" M/M: {mm_str:<10}"
    r2 = f"{r2_c1:<21}|{r2_c2:<19}|{r2_c3:<19}|{r2_c4:<16}"

    print(f"\n  bot_sub2.py {env_paths.get('ENV_FILE_NAME', '.api')}")
    print(dbar)
    print(r0)
    print(bar)
    print(r1)
    print(r2)
    print(dbar)
    
    try:
        config_path = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if os.path.exists(config_path):
            with open(config_path, "r", encoding="utf-8") as f:
                _gcfg = json.load(f)
                enabled_coins = _gcfg.get("ENABLED_COINS", ["XAU", "BTC", "ETH"])
        else:
            enabled_coins = ["XAU", "BTC", "ETH"]
    except:
        enabled_coins = ["XAU", "BTC", "ETH"]

    sorted_trackers = dict(sorted(trackers.items(), key=lambda x: (0 if "XAU" in x[0] else (1 if "BTC" in x[0] else 2), x[0])))

    btc_tk = sorted_trackers.get("BTC-USDT-SWAP")
    btc_trend_mode = "THUẬN XU HƯỚNG"
    if btc_tk and getattr(btc_tk, "swing_trend", 0) == 0:
        btc_trend_mode = "SIDEWAY"

    print(f"\n☢ CHIẾN THUẬT ĐANG KÍCH HOẠT: {btc_trend_mode}")

    # 3. BẢNG COIN (Giữ nguyên)
    OB_W = 15  # width cố định cho mỗi cột OB ZONE vừa khít 78 chars
    if any(t.swing_trend == 1 for t in sorted_trackers.values()):
        h1, h2 = "M15 (LONG)", "M30 (SHORT)"
    elif any(t.swing_trend == -1 for t in sorted_trackers.values()):
        h1, h2 = "M15 (SHORT)", "M30 (LONG)"
    else:
        h1, h2 = "M15 (OB)", "M30 (OB)"
    
    print("\n" + f"-" * 78)
    print(f" {'Coin':<4} | {'Price':>9} | {'Trend':<6} | {h1:^{OB_W}} | {h2:^{OB_W}} | {'Status'}")
    print(f"-" * 78)
    
    for symbol, tracker in sorted_trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        price = f"{float(tracker.live_price):.2f}"
        is_coin_enabled = (coin in enabled_coins)
        
        if tracker.swing_trend == 1: trend_str = "BULL ▲"
        elif tracker.swing_trend == -1: trend_str = "BEAR ▼"
        else: trend_str = "SIDE ◆"
        
        m15_active = [ob for ob in tracker.swing_obs if not ob.crossed]
        m30_active = [ob for ob in tracker.m30_swing_obs if not ob.crossed]
        
        if tracker.swing_trend == 1:
            main_obs = [ob for ob in m15_active if ob.bias == BULLISH]
            hedge_obs = [ob for ob in m30_active if ob.bias == BEARISH]
        elif tracker.swing_trend == -1:
            main_obs = [ob for ob in m15_active if ob.bias == BEARISH]
            hedge_obs = [ob for ob in m30_active if ob.bias == BULLISH]
        else:
            main_obs = m15_active[:1]
            hedge_obs = m30_active[:1]
        
        main_zone = f"{float(main_obs[0].bar_low):.2f}-{float(main_obs[0].bar_high):.2f}" if main_obs else "-- - --"
        hedge_zone = f"{float(hedge_obs[0].bar_low):.2f}-{float(hedge_obs[0].bar_high):.2f}" if hedge_obs else "-- - --"
        
        pending = [s for s in tracker.trade_setups if not s.triggered]
        if not is_coin_enabled and not (tracker.has_long or tracker.has_short):
            status = "ĐÃ KHÓA"
        elif tracker.has_long:
            status = f"GỒNG LONG +{float(tracker.max_roi_long):.1f}%"
        elif tracker.has_short:
            status = f"GỒNG SHORT +{float(tracker.max_roi_short):.1f}%"
        elif pending and is_coin_enabled:
            status = f"CHỜ {len(pending)} SETUP"
        else:
            status = "QUAN SÁT"
            
        print(f" {coin:<4} | {price:>9} | {trend_str:<6} | {main_zone:^{OB_W}} | {hedge_zone:^{OB_W}} | {status}")

    print("-" * 78)
    
    # 4. ✜ TÌNH TRẠNG VỊ THẾ:
    print("\n✜ Tình trạng vị thế:")
    pos_lines = []
    
    for symbol, tracker in sorted_trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        lines_desc = []
        is_coin_enabled = (coin in enabled_coins)
        
        # --- A. Lệnh ĐÃ KHỚP (Triggered Setups) ĐƯA LÊN ĐẦU TIÊN ---
        triggered = [s for s in tracker.trade_setups if s.triggered]
        if triggered:
            trig_internal = [s for s in triggered if s.ob_source == "INTERNAL"]
            trig_swing = [s for s in triggered if s.ob_source == "SWING"]
            
            for src_name, group_list in [("Internal", trig_internal), ("Swing", trig_swing)]:
                if not group_list: continue
                for side_val, side_str in [(BULLISH, "LONG"), (BEARISH, "SHORT")]:
                    sub_setups = [s for s in group_list if s.bias == side_val]
                    if not sub_setups: continue
                    prices = " - ".join([f"{float(s.entry_price):,.2f}" for s in sub_setups])
                    vol_val = (50.0 if src_name == "Internal" else 100.0) * len(sub_setups)
                    roi = float(tracker.max_roi_long) if side_str == "LONG" else float(tracker.max_roi_short)
                    mae = float(tracker.mae_max_pct_long) if side_str == "LONG" else float(tracker.mae_max_pct_short)
                    lines_desc.append(f"Đã khớp {side_str} ({src_name}) {prices} = {vol_val:.0f} U → ROI ({roi:+.1f}% / -{mae:.1f}%)")

        # --- B. Lệnh CHỜ KHỚP (Pending Setups) ĐƯA BÊN DƯỚI (CHỈ HỆN KHI COIN ĐƯỢC TÍCH MỞ) ---
        if is_coin_enabled:
            pending = [s for s in tracker.trade_setups if not s.triggered]
            if pending:
                pend_internal = [s for s in pending if s.ob_source == "INTERNAL"]
                pend_swing = [s for s in pending if s.ob_source == "SWING"]
                
                if pend_internal:
                    for side_val, side_str in [(BULLISH, "LONG"), (BEARISH, "SHORT")]:
                        sub_p = [f"{float(s.entry_price):,.2f}" for s in pend_internal if s.bias == side_val]
                        if sub_p:
                            lines_desc.append(f"Chờ Entry {side_str} (Internal): {' - '.join(sub_p)}")
                if pend_swing:
                    for side_val, side_str in [(BULLISH, "LONG"), (BEARISH, "SHORT")]:
                        sub_p = [f"{float(s.entry_price):,.2f}" for s in pend_swing if s.bias == side_val]
                        if sub_p:
                            lines_desc.append(f"Chờ Entry {side_str} (Swing): {' - '.join(sub_p)}")

        # Xây dựng các nhánh cây ╭─ ├─ ╰─
        if lines_desc:
            line_main = f"    {coin:<4} ╭─  {lines_desc[0]}"
            idx_branch = line_main.index("╭─")
            indent_branch = " " * idx_branch
            coin_lines = [line_main]
            for i, desc in enumerate(lines_desc[1:]):
                prefix = "╰─" if i == len(lines_desc[1:]) - 1 else "├─"
                coin_lines.append(f"{indent_branch}{prefix}  {desc}")
            pos_lines.append((0 if "XAU" in coin else (1 if "BTC" in coin else 2), coin, coin_lines))
        else:
            no_pos_msg = "Đã khoá giao dịch" if not is_coin_enabled else "Chưa có vị thế"
            pos_lines.append((0 if "XAU" in coin else (1 if "BTC" in coin else 2), coin, [f"    {coin:<4} ╭─  {no_pos_msg}"]))

    pos_lines.sort(key=lambda x: (0 if "XAU" in x[1] else (1 if "BTC" in x[1] else 2), x[1]))
    is_first = True
    for _, coin, lines in pos_lines:
        if not is_first:
            print("")
        is_first = False
        for l in lines:
            print(l)
    
    # 5. ☯ LỊCH SỬ LỆNH VỪA ĐÓNG:
    print("\n☯ Lịch sử lệnh vừa đóng:")
    has_closed = False
    for symbol, tracker in sorted_trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        closed_list = getattr(tracker, "closed_history", [])
        if closed_list:
            has_closed = True
            for entry in reversed(closed_list[-3:]):
                pnl_val = entry.get("pnl", 0.0)
                roi_val = entry.get("roi", 0.0)
                pnl_str = f"Lời +{pnl_val:.2f}$" if pnl_val >= 0 else f"Lỗ {pnl_val:.2f}$"
                side = entry.get("side", "LONG")
                dca_str = f" cụm DCA [{entry['dca']}]" if entry.get("dca") else ""
                print(f"  ✧ · [{coin}]: Đã đóng {side} ({roi_val:+.1f}%){dca_str} → {pnl_str}")
    
    if not has_closed:
        print("  · Chưa có lệnh nào được đóng trong phiên này.")
    print("=" * 78 + "\n")
# z7713 | Thiết kế lại bảng COIN: OB ZONE, LONG @, SHORT @, STATUS
# z7716 | Dashboard mới: OB ZONE LONG / OB ZONE SHORT với hiển thị RR. Bỏ cột LONG @ / SHORT @.
# z1950 | Đổi đuôi mở rộng file chứa khoá API từ .env sang .api để tăng tính bảo mật, tránh nhầm lẫn

