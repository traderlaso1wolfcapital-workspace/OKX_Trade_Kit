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
    """Hiển thị Dashboard UI cho Bot Sub2"""

    print(f"\nbot_sub2.py {env_paths.get('ENV_FILE_NAME', '.env')}")

    sync_time = datetime.now().strftime('%H:%M:%S')
    
    # Lấy thông tin ví
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

    total_ob = sum(len(t.swing_obs) + len(t.internal_obs) for t in trackers.values())
    total_setups = sum(len([s for s in t.trade_setups if not s.triggered]) for t in trackers.values())

    pnl_sign = "+" if loi_nhuan >= 0 else ""
    growth_sign = "+" if tang_truong >= 0 else ""

    print("=" * 97)
    bot_name = "SMC ORDER BLOCK"
    BOT_VERSION = "v1.0"
    
    col1_w, col2_w, col3_w, col4_w = 23, 34, 14, 17
    r1_c1 = f"☢  {bot_name} {BOT_VERSION}"
    r1_c2 = f"EQUITY: {format_with_commas(von_hien_tai, 2)} USDT ({growth_sign}{tang_truong:.2f}%)"
    r1_c3 = f"OB COUNT: {total_ob}"
    
    rr_ratio = 0.0
    if ai_avg_mae > 0: rr_ratio = ai_avg_mfe / ai_avg_mae
    rr_str = f"{int(rr_ratio)}" if rr_ratio == int(rr_ratio) else f"{rr_ratio:.1f}"
    
    r1_c4 = f"WINRATE: {ai_winrate:.1f}% / {total_pos}"
    
    r2_c1 = f"    {sync_time}    "
    r2_c2 = f"PNL   : {pnl_sign}{format_with_commas(loi_nhuan, 2)} USD"
    r2_c3 = f"SETUPS  : {total_setups}"
    r2_c4 = f"R/R    : 1 / {rr_str}"

    print(f"{r1_c1:<{col1_w}} | {r1_c2:<{col2_w}} | {r1_c3:<{col3_w}} | {r1_c4:<{col4_w}}")
    print(f"{r2_c1:<{col1_w}} | {r2_c2:<{col2_w}} | {r2_c3:<{col3_w}} | {r2_c4:<{col4_w}}")
    print("=" * 97)
    
    # CHIẾN THUẬT ĐANG KÍCH HOẠT
    print("\n⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT:")
    for symbol, tracker in trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        # In trạng thái của SMC Sub2
        detail = "Order Block SMC (Thuận Trend)"
        if tracker.swing_trend == 1:
            detail = "Order Block SMC (LONG)"
        elif tracker.swing_trend == -1:
            detail = "Order Block SMC (SHORT)"
        else:
            detail = "Order Block SMC (CHỜ TÍN HIỆU)"
        print(f"       · {coin:<4}: THUẬN XU HƯỚNG  {detail}")

    # BẢNG COIN — Cột OB luôn width cố định 23 ký tự, dấu | thẳng hàng
    OB_W = 23  # width cố định cho mỗi cột OB ZONE
    # Header động theo trend: MAIN = thuận trend, HEDGE = ngược trend
    if any(t.swing_trend == 1 for t in trackers.values()):
        h1, h2 = "OB MAIN (M15 LONG)", "OB HEDGE (M30 SHORT)"
    elif any(t.swing_trend == -1 for t in trackers.values()):
        h1, h2 = "OB MAIN (M15 SHORT)", "OB HEDGE (M30 LONG)"
    else:
        h1, h2 = "OB MAIN (M15)", "OB HEDGE (M30)"
    
    print("\n" + f"-" * 95)
    print(f" {'COIN':<4} | {'PRICE':>9} | {'TREND':<6} | {h1:^{OB_W}} | {h2:^{OB_W}} | {'STATUS'}")
    print(f"-" * 95)
    
    for symbol, tracker in trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        price = f"{float(tracker.live_price):.2f}"
        
        if tracker.swing_trend == 1: trend_str = "BULL ▲"
        elif tracker.swing_trend == -1: trend_str = "BEAR ▼"
        else: trend_str = "SIDE ◆"
        
        # M15 Swing OB (chưa crossed)
        m15_active = [ob for ob in tracker.swing_obs if not ob.crossed]
        # M30 OB (chưa crossed)
        m30_active = [ob for ob in tracker.m30_swing_obs if not ob.crossed]
        
        if tracker.swing_trend == 1:
            # BULL: MAIN = M15 Bullish OB (LONG), HEDGE = M30 Bearish OB (SHORT)
            main_obs = [ob for ob in m15_active if ob.bias == BULLISH]
            hedge_obs = [ob for ob in m30_active if ob.bias == BEARISH]
        elif tracker.swing_trend == -1:
            # BEAR: MAIN = M15 Bearish OB (SHORT), HEDGE = M30 Bullish OB (LONG)
            main_obs = [ob for ob in m15_active if ob.bias == BEARISH]
            hedge_obs = [ob for ob in m30_active if ob.bias == BULLISH]
        else:
            main_obs = m15_active[:1]
            hedge_obs = m30_active[:1]
        
        main_zone = f"{float(main_obs[0].bar_low):.2f} - {float(main_obs[0].bar_high):.2f}" if main_obs else "-- - --"
        hedge_zone = f"{float(hedge_obs[0].bar_low):.2f} - {float(hedge_obs[0].bar_high):.2f}" if hedge_obs else "-- - --"
        
        pending = [s for s in tracker.trade_setups if not s.triggered]
        if tracker.has_long:
            status = f"GỒNG LONG +{float(tracker.max_roi_long):.1f}%"
        elif tracker.has_short:
            status = f"GỒNG SHORT +{float(tracker.max_roi_short):.1f}%"
        elif pending:
            status = f"CHỜ {len(pending)} SETUP"
        else:
            status = "QUAN SÁT"
            
        print(f" {coin:<4} | {price:>9} | {trend_str:<6} | {main_zone:^{OB_W}} | {hedge_zone:^{OB_W}} | {status}")

    print("-" * 95)
    
    # ✜ TÌNH TRẠNG VỊ THẾ (chỉ pending, chưa khớp)
    print("\n✜ TÌNH TRẠNG VỊ THẾ (CHỜ KHỚP):")
    any_pending = False
    
    all_int_pending = {}
    all_swing_pending = {}
    
    for symbol, tracker in trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        pending = [s for s in tracker.trade_setups if not s.triggered]
        int_p = [s for s in pending if s.ob_source == "INTERNAL"]
        swing_p = [s for s in pending if s.ob_source == "SWING"]
        
        if int_p:
            long_i = [s for s in int_p if s.bias == BULLISH]
            short_i = [s for s in int_p if s.bias == BEARISH]
            all_int_pending[coin] = {
                "LONG": [f"{float(s.entry_price):.2f}" for s in long_i],
                "SHORT": [f"{float(s.entry_price):.2f}" for s in short_i]
            }
        
        if swing_p:
            long_s = [s for s in swing_p if s.bias == BULLISH]
            short_s = [s for s in swing_p if s.bias == BEARISH]
            all_swing_pending[coin] = {"LONG": long_s, "SHORT": short_s}
    
    int_printed = False
    for coin in sorted(all_int_pending.keys()):
        data = all_int_pending[coin]
        if data["LONG"]:
            print(f"    ✧ {coin:<4}      Chờ khớp LONG Internal: {', '.join(data['LONG'])} (RR 1:1)")
            int_printed = True; any_pending = True
        if data["SHORT"]:
            print(f"    ✧ {coin:<4}      Chờ khớp SHORT Internal: {', '.join(data['SHORT'])} (RR 1:1)")
            int_printed = True; any_pending = True
    
    if int_printed:
        print("")
    
    swing_printed = False
    for coin in sorted(all_swing_pending.keys()):
        data = all_swing_pending[coin]
        for s in data.get("LONG", []):
            ep = float(s.entry_price); sl_px = float(s.stop_loss); tp_px = float(s.take_profit)
            rr_val = abs(tp_px - ep) / abs(ep - sl_px) if abs(ep - sl_px) > 0 else 0
            line = f"    ✧ {coin:<4} ╭─  Chờ khớp LONG (Swing) tại {ep:.2f} (RR 1:{rr_val:.0f})"
            indent = " " * line.index("╭─")
            print(line); print(f"{indent}╰─  SL: {sl_px:.2f} | TP: {tp_px:.2f}")
            swing_printed = True; any_pending = True
        for s in data.get("SHORT", []):
            ep = float(s.entry_price); sl_px = float(s.stop_loss); tp_px = float(s.take_profit)
            rr_val = abs(tp_px - ep) / abs(ep - sl_px) if abs(ep - sl_px) > 0 else 0
            line = f"    ✧ {coin:<4} ╭─  Chờ khớp SHORT (Swing) tại {ep:.2f} (RR 1:{rr_val:.0f})"
            indent = " " * line.index("╭─")
            print(line); print(f"{indent}╰─  SL: {sl_px:.2f} | TP: {tp_px:.2f}")
            swing_printed = True; any_pending = True
    
    if not any_pending:
        print("  · Chưa có lệnh chờ khớp nào.")
    
    # ✜ ĐÃ KHỚP (triggered)
    print("\n✜ TÌNH TRẠNG VỊ THẾ (ĐÃ KHỚP):")
    any_triggered = False
    for symbol, tracker in trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        triggered = [s for s in tracker.trade_setups if s.triggered]
        for s in triggered:
            ep = float(s.entry_price); sl_px = float(s.stop_loss); tp_px = float(s.take_profit)
            side = "LONG" if s.bias == BULLISH else "SHORT"
            src = "Swing" if s.ob_source == "SWING" else "Internal"
            rr_val = abs(tp_px - ep) / abs(ep - sl_px) if abs(ep - sl_px) > 0 else 0
            # Tính ROI dựa trên live_price
            if s.bias == BULLISH:
                roi = ((float(tracker.live_price) - ep) / ep * 100) if ep > 0 else 0
            else:
                roi = ((ep - float(tracker.live_price)) / ep * 100) if ep > 0 else 0
            tpsl_status = "🔒 Có TP/SL" if s.tp_sl_placed else "⚠️ Chưa cài"
            print(f"    ✧ {coin:<4} ╭─  Đã khớp {side} ({src}): Entry {ep:.2f}  RR 1:{rr_val:.0f}  |  ROI {roi:+.2f}%  |  {tpsl_status}")
            any_triggered = True
    
    if not any_triggered:
        print("  · Chưa có lệnh nào đã khớp.")
    print("")
# z7713 | Thiết kế lại bảng COIN: OB ZONE, LONG @, SHORT @, STATUS
# z7716 | Dashboard mới: OB ZONE LONG / OB ZONE SHORT với hiển thị RR. Bỏ cột LONG @ / SHORT @.
