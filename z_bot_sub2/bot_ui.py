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
    c1, c2, c3, c4 = 20, 26, 20, 16
    line_w = 78

    mfe_str = f"+{ai_avg_mfe:.1f}%" if ai_avg_mfe > 0 else "--"
    mae_str = f"-{ai_avg_mae:.1f}%" if ai_avg_mae > 0 else "--"
    target_vol = 100.0

    r0 = f"  {'⚡ ' + bot_name:^{c1-1}} | {'💰 Lợi nhuận':^{c2-1}} | {'🏦 Tài khoản':^{c3-1}} | 🎯 Hiệu suất"
    r1 = f"   {sync_time:^{c1-1}} | {'Gốc : ' + format_with_commas(von_goc, 2) + ' U':<{c2}} | {'Tổng: ' + format_with_commas(von_hien_tai, 2) + ' U':<{c3}} | Win : {ai_winrate:.1f}% / {total_pos}"
    r2 = f"   {'':<{c1-1}} | {'PNL : ' + pnl_sign + format_with_commas(loi_nhuan, 2) + ' U (' + growth_sign + f'{tang_truong:.0f}' + '%)':<{c2}} | {'Vol : ' + format_with_commas(target_vol, 1) + ' U':<{c3}} | M/M : {mfe_str} / {mae_str}"

    bar  = "-" * line_w
    dbar = "=" * line_w

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
        
        # --- A. Lệnh ĐÃ KHỚP (Triggered Setups) ---
        # Bỏ qua in chi tiết vì đã có trên bảng Dashboard của GUI

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
    
    print("=" * 78 + "\n")
# z7713 | Thiết kế lại bảng COIN: OB ZONE, LONG @, SHORT @, STATUS
# z7716 | Dashboard mới: OB ZONE LONG / OB ZONE SHORT với hiển thị RR. Bỏ cột LONG @ / SHORT @.
# z1950 | Đổi đuôi mở rộng file chứa khoá API từ .env sang .api để tăng tính bảo mật, tránh nhầm lẫn

