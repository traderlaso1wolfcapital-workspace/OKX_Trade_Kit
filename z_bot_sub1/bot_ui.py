from decimal import Decimal
from datetime import datetime
from typing import Any
import os
import json
from z_bot_sub1.bot_config import *

def fmt_tf(t: str) -> str:
    t_up = str(t).upper()
    return t_up.lower() if t_up.startswith("M") else t_up

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

def update_wallet_metrics(*args, **kwargs):
    import sys
    if hasattr(sys, '_bot_sub1_io_queue'):
        sys._bot_sub1_io_queue.put((_sync_update_wallet_metrics, args, kwargs))
    else:
        _sync_update_wallet_metrics(*args, **kwargs)

# ==============================================================================
# 📊 BẢNG GIAO DIỆN TERMINAL CHUẨN MỰC
# ==============================================================================
def print_dashboard(state_matrix: dict, env_paths: dict, system_config: dict):
    sync_time = datetime.now().strftime('%H:%M:%S')
    ai_winrate, ai_avg_mae, ai_avg_mfe = 0.0, 0.0, 0.0  
    von_goc, von_hien_tai, loi_nhuan, tang_truong = 2000.00, 2000.00, 0.00, 0.00
    total_pos = 0
    
    try:
        if os.path.exists(env_paths["JSON_EVOLUTION_DATA_FILE"]):
            with open(env_paths["JSON_EVOLUTION_DATA_FILE"], "r", encoding="utf-8") as f:
                data = json.load(f)
                if "wallet_stats" in data:
                    w = data["wallet_stats"]
                    von_goc, von_hien_tai = w.get("von_goc", 2000.00), w.get("von_hien_tai", 2000.00)
                    loi_nhuan, tang_truong = w.get("loi_nhuan", 0.00), w.get("tang_truong", 0.00)
                total_pos, total_win, all_mae, all_mfe = 0, 0, [] ,[]
                for coin in data:
                    if coin == "wallet_stats": continue
                    total_pos += data[coin].get("tong_lenh_dong", 0)
                    total_win += data[coin].get("lenh_thang", 0)
                    all_mae.extend(data[coin].get("lich_su_mae", []))
                    all_mfe.extend(data[coin].get("lich_su_mfe", []))
                if total_pos > 0: ai_winrate = (total_win / total_pos) * 100
                if all_mae: ai_avg_mae = sum(all_mae) / len(all_mae)
                if all_mfe: ai_avg_mfe = sum(all_mfe) / len(all_mfe)
    except: pass

    import sys; globals_ref = sys.modules[__name__]
    import textwrap
    
    def smart_print(text, width=97, indent="    "):
        wrapped = textwrap.wrap(text, width=width, subsequent_indent=indent)
        for line in wrapped:
            print(line)

    target_vol = globals_ref.POSITION_VOLUME_HIGH_CONFIDENCE
    try:
        if os.path.exists(env_paths["FILE_GLOBAL_CONFIG"]):
            with open(env_paths["FILE_GLOBAL_CONFIG"], "r", encoding="utf-8") as _f:
                _cfg = json.load(_f)
                if "POSITION_VOLUME_HIGH_CONFIDENCE" in _cfg:
                    target_vol = Decimal(str(_cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
    except: pass
    if getattr(globals_ref, "USE_DYNAMIC_RISK", False):
        try:
            sl_pct = globals_ref.SCALPING_SL_PCT
            _risk = getattr(globals_ref, "RISK_PER_TRADE_PCT", Decimal("0"))
            if sl_pct > 0 and _risk > 0:
                target_vol = (Decimal(str(von_hien_tai)) * _risk) / sl_pct
        except:
            pass

    pnl_sign = "+" if loi_nhuan >= 0 else ""
    growth_sign = "+" if tang_truong >= 0 else ""

    bot_name = "THỢ SĂN EMA200"
    col1_w, col2_w, col3_w, col4_w = 18, 21, 27, 19
    line_w = 94

    r1_c1 = f"☢  {bot_name}"
    r1_c2 = f" Vốn gốc: {format_with_commas(von_goc, 2)} USDT"
    mfe_str = f"+{ai_avg_mfe:.1f}%" if ai_avg_mfe > 0 else "--"
    mae_str = f"-{ai_avg_mae:.1f}%" if ai_avg_mae > 0 else "--"
    r1_c3 = f"PNL: {pnl_sign}{format_with_commas(loi_nhuan, 2)} USD ({growth_sign}{tang_truong:.0f}%)"
    r1_c4 = f"WINRATE : {ai_winrate:.1f}% / {total_pos}"

    r2_c1 = f" {sync_time:^{col1_w - 1}}"
    r2_c2 = f"Tổng vốn: {format_with_commas(von_hien_tai, 2)} USDT"
    r2_c3 = f"VOL: {format_with_commas(target_vol, 1)} U"
    r2_c4 = f"MFE/MAE : {mfe_str} / {mae_str}"

    print(f"\nbot_sub1.py {env_paths.get('ENV_FILE_NAME', '.api')}")
    print("=" * line_w)
    print(f"{r1_c1:<{col1_w}} | {r1_c2:<{col2_w}} | {r1_c3:<{col3_w}} | {r1_c4:<{col4_w}}")
    print(f"{r2_c1:<{col1_w}} | {r2_c2:<{col2_w}} | {r2_c3:<{col3_w}} | {r2_c4:<{col4_w}}")
    print("=" * line_w)

    # ==============================================================================
    # ⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT
    # ==============================================================================
    MODE_LABELS_H = {
        "MAIN":    ("·", "THUẬN XU HƯỚNG"),
        "XOLE":    ("·", "XO LE HEDGE"),
        "PINGPONG":("·", "PING-PONG NÉN"),
        "SIDEWAY": ("·", "SIDEWAY / CHỜ"),
    }
    _alt_mode = "🔄 ON (Neo BTC)" if getattr(globals_ref, "ALTCOIN_FOLLOW_BTC_EMA", True) else "🔒 LOCK (EMA riêng)"
    print(f"\n⚡ CHIẾN THUẬT ĐANG KÍCH HOẠT:  [Altcoin: {_alt_mode}]")
    active_strategies = {"MAIN": [], "XOLE": [], "PINGPONG": [], "SIDEWAY": []}
    
    for cfg in COIN_PORTFOLIO:
        sid = cfg["swap"]
        if sid not in state_matrix: continue
        tk = state_matrix[sid]
        coin_n = cfg["coin"]
        
        has_any = False

        # Hien thi chien thuat kem trang thai vi the thuc te neu dang gong
        if tk.has_long or tk.has_short:
            pos_tf = getattr(tk, "active_pos_tf", "M5")
            open_reason_l = getattr(tk, "open_reason_long", "")
            open_reason_s = getattr(tk, "open_reason_short", "")
            open_reason = open_reason_l if tk.has_long else open_reason_s
            if "Xo Le" in open_reason:
                strategy_tag = "XO LE HEDGE"
            elif "Ping-Pong" in open_reason:
                strategy_tag = "PING-PONG NÉN"
            else:
                strategy_tag = "THUẬN XU HƯỚNG"
            sides = []
            if tk.has_long: sides.append(f"Long {pos_tf}")
            if tk.has_short: sides.append(f"Short {pos_tf}")
            side_str = " / ".join(sides)
            active_strategies["MAIN"].append(f"       · {coin_n}: {strategy_tag}  {side_str} → DCA đến H4 ( Co giãn: {tk.current_vol_mult:.2f}x )")
            has_any = True
        elif tk.trend in ("UPTREND", "DOWNTREND", "HEDGE"):
            mkey = "MAIN"
            sl_tf = getattr(tk, "signal_long_tf", None)
            ss_tf = getattr(tk, "signal_short_tf", None)
            if tk.trend == "HEDGE":
                detail = f"HEDGE: Long {sl_tf} / Short {ss_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            elif tk.trend == "UPTREND":
                detail = f"Tăng từ H4 đến {sl_tf} — Entry EMA200-{sl_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            else:
                detail = f"Giảm từ H4 đến {ss_tf} — Entry EMA200-{ss_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            icon, label = MODE_LABELS_H[mkey]
            active_strategies["MAIN"].append(f"       {icon} {coin_n}: {label}  {detail}")
            # ⚡ Ghi chú Ping-Pong H4
            if getattr(tk, "is_h4_squeeze", False):
                active_strategies["MAIN"].append("            ╰─  ⚠️ H4 đang PING-PONG: đã huỷ limit thuận chiều, chờ xu hướng rõ")
            has_any = True
        elif coin_n != "BTC" and state_matrix.get("BTC-USDT-SWAP") and state_matrix["BTC-USDT-SWAP"].trend in ("UPTREND", "DOWNTREND", "HEDGE"):
            btc_tk = state_matrix["BTC-USDT-SWAP"]
            mkey = "MAIN"
            b_sl_tf = getattr(btc_tk, "signal_long_tf", None)
            b_ss_tf = getattr(btc_tk, "signal_short_tf", None)
            if btc_tk.trend == "HEDGE":
                detail = f"HEDGE: Long {b_sl_tf} / Short {b_ss_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            elif btc_tk.trend == "UPTREND":
                detail = f"Tăng từ H4 đến {b_sl_tf} — Entry EMA200-{b_sl_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            else:
                detail = f"Giảm từ H4 đến {b_ss_tf} — Entry EMA200-{b_ss_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            icon, label = MODE_LABELS_H[mkey]
            active_strategies["MAIN"].append(f"       {icon} {coin_n}: {label}  {detail}")
            has_any = True

        if getattr(tk, "is_xole_pos", False):
            mkey = "XOLE"
            xl_tf  = getattr(tk, "xole_tf", getattr(tk, "active_target_tf", "?"))
            xl_big = getattr(tk, "xole_big_tf", "?")
            detail = f"Thuận {xl_tf}, nghịch {xl_big} → EMA200-{xl_tf} | TP=EMA200-{xl_big} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            icon, label = MODE_LABELS_H[mkey]
            active_strategies["XOLE"].append(f"       {icon} {coin_n}: {label}  {detail}")
            has_any = True

        if getattr(tk, "is_ping_pong_pos", False):
            mkey = "PINGPONG"
            pp_tf  = getattr(tk, "ping_pong_tf", getattr(tk, "active_target_tf", "?"))
            pp_big = getattr(tk, "ping_pong_big_tf", "?")
            detail = f"Nén {pp_big} → Bắt bẻ tại EMA200 {pp_tf} ( Co giãn: {tk.current_vol_mult:.2f}x )"
            icon, label = MODE_LABELS_H[mkey]
            active_strategies["PINGPONG"].append(f"       {icon} {coin_n}: {label}  {detail}")
            has_any = True

        if not has_any:
            mkey = "SIDEWAY"
            detail = "Chưa đủ điều kiện — đứng ngoài quan sát"
            icon, label = MODE_LABELS_H[mkey]
            active_strategies["SIDEWAY"].append(f"       {icon} {coin_n}: {label}  {detail}")

    for mkey in ["MAIN", "XOLE", "PINGPONG", "SIDEWAY"]:
        for line in active_strategies[mkey]:
            smart_print(line)

    active_limit_tfs = set()
    for cfg in COIN_PORTFOLIO:
        if cfg["swap"] in state_matrix:
            tk = state_matrix[cfg["swap"]]
            # Đang có vị thế → đóng khung TF đã khớp
            if tk.has_long or tk.has_short:
                pos_tf = getattr(tk, "active_pos_tf", None)
                if pos_tf:
                    active_limit_tfs.add(pos_tf)
            # Đang có limit chờ → đóng khung TF limit
            for side_px, by_tf in [
                (getattr(tk, "placed_entry_px_long", "---"), getattr(tk, "placed_entry_px_long_by_tf", {})),
                (getattr(tk, "placed_entry_px_short", "---"), getattr(tk, "placed_entry_px_short_by_tf", {}))
            ]:
                if side_px != "---":
                    for tf, px in by_tf.items():
                        if px not in ("---", "ERR"):
                            active_limit_tfs.add(tf)

    m5_lbl = f"[{fmt_tf('M5')}]" if "M5" in active_limit_tfs else fmt_tf("M5")
    m15_lbl = f"[{fmt_tf('M15')}]" if "M15" in active_limit_tfs else fmt_tf("M15")
    m30_lbl = f"[{fmt_tf('M30')}]" if "M30" in active_limit_tfs else fmt_tf("M30")
    h1_lbl = f"[{fmt_tf('H1')}]" if "H1" in active_limit_tfs else fmt_tf("H1")
    h2_lbl = f"[{fmt_tf('H2')}]" if "H2" in active_limit_tfs else fmt_tf("H2")
    h4_lbl = f"[{fmt_tf('H4')}]" if "H4" in active_limit_tfs else fmt_tf("H4")

    print("\n" + "-" * 95)
    print(f" {'COIN':^4} | {m5_lbl:^7} | {m15_lbl:^7} | {m30_lbl:^7} | {h1_lbl:^7} | {h2_lbl:^7} | {h4_lbl:^7} | {'PRICE':^9} | {'CÁCH EMA 200':^21}")
    print("-" * 95)
    
    exp_groups = {
        "POS": [],
        "XOLE": [],
        "PINGPONG": [],
        "LIMIT": [],
        "WAIT": []
    }
    
    def fmt_tf_state(st):
        arrow = '▲' if st["side"] == 'above' else ('▼' if st["side"] == 'under' else ('◆' if st["side"] == 'touch' else '■'))
        return f"{arrow} {st['accum']:3}-{st['fail']}"
        
    def _get_vol_str(tk_obj, tf_name):
        target_usdt = getattr(globals_ref, "POSITION_VOLUME_HIGH_CONFIDENCE", Decimal("200"))
        try:
            cfg_path = env_paths.get("FILE_GLOBAL_CONFIG", "") if isinstance(env_paths, dict) else ""
            if cfg_path and os.path.exists(cfg_path):
                with open(cfg_path, "r", encoding="utf-8") as _f:
                    _cfg = json.load(_f)
                    if "POSITION_VOLUME_HIGH_CONFIDENCE" in _cfg:
                        target_usdt = Decimal(str(_cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
            elif os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "global_config.json")):
                with open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "global_config.json"), "r", encoding="utf-8") as _f:
                    _cfg = json.load(_f)
                    if "POSITION_VOLUME_HIGH_CONFIDENCE" in _cfg:
                        target_usdt = Decimal(str(_cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
        except: pass
        _is_xl = getattr(tk_obj, "xole_tf", None)
        if _is_xl:
            v_mult = getattr(globals_ref, "XOLE_TF_VOLUME_MULTIPLIERS", {}).get(tf_name, Decimal("1.0"))
        else:
            v_mult = getattr(globals_ref, "TF_VOLUME_MULTIPLIERS", {}).get(tf_name, Decimal("1.0"))
        vol_val = target_usdt * v_mult
        return f"(VOL: {vol_val:.1f} U)"
    
    for cfg_idx, cfg in enumerate(COIN_PORTFOLIO):
        sid = cfg["swap"]
        if sid not in state_matrix: 
            print(f" {cfg['coin']:^4} | {'---':^7} | {'---':^7} | {'---':^7} | {'---':^7} | {'---':^7} | {'---':^7} | {'0.0':>9} | {'---':<20}")
            continue
            
        tk = state_matrix[sid]
        
        # CÁCH EMA: luôn hiển thị khoảng cách tới EMA200-H4
        btc_tk = state_matrix.get("BTC-USDT-SWAP")
        h4_ema200_raw = getattr(tk, "h4_ema200", Decimal("0"))
        if h4_ema200_raw > 0:
            dist_to_h4 = ((tk.live_price - h4_ema200_raw) / h4_ema200_raw * 100)
        else:
            dist_to_h4 = Decimal("0")
        
        if cfg["coin"] == "BTC":
            # Hiển thị Entry thực (có đệm lõm tĩnh của H4 x biến động thực tế)
            buffer_h4_pct = getattr(globals_ref, "TF_ENTRY_OFFSETS", {}).get("H4", Decimal("0.00406")) * 100
            volatility_mult = getattr(tk, 'current_vol_mult', Decimal("1.0"))
            buffer_h4_pct = buffer_h4_pct * volatility_mult

            if tk.trend == "UPTREND":
                entry_dist_h4 = dist_to_h4 - buffer_h4_pct  # LONG: Entry dưới giá hiện tại
                dist_ema_display = f"[H4] {entry_dist_h4:+.2f}%"
            elif tk.trend == "DOWNTREND":
                entry_dist_h4 = dist_to_h4 + buffer_h4_pct  # SHORT: Entry trên giá hiện tại
                dist_ema_display = f"[H4] {entry_dist_h4:+.2f}%"
            else:
                dist_ema_display = f"[H4] {dist_to_h4:+.2f}%"
        else:
            # Altcoin: hiển thị Entry thực (có đệm lõm + hệ số vol_mult động)
            btc_h4_ema200 = getattr(btc_tk, "h4_ema200", btc_tk.ema200) if btc_tk else Decimal("0")
            if btc_h4_ema200 > 0:
                btc_dist_unsigned = abs((btc_tk.live_price - btc_h4_ema200) / btc_h4_ema200 * 100)
                btc_elasticity = getattr(btc_tk, 'current_vol_mult', Decimal("1.0"))
            else:
                btc_dist_unsigned = Decimal("0")
                btc_elasticity = Decimal("1.0")
                
            alt_elasticity = getattr(tk, 'current_vol_mult', Decimal("1.3"))
            if btc_elasticity <= 0: btc_elasticity = Decimal("1.0")
            alt_vol_mult = alt_elasticity / btc_elasticity
            
            buffer_h4_pct = getattr(globals_ref, "TF_ENTRY_OFFSETS", {}).get("H4", Decimal("0.00406")) * 100
            
            if tk.trend == "UPTREND":
                # Entry Offset = [ ( dist_to_tf(ETH) - |dist_to_tf(BTC)| ) × vol_mult ] + base_buffer
                entry_offset = (dist_to_h4 - btc_dist_unsigned) * alt_vol_mult + buffer_h4_pct
            elif tk.trend == "DOWNTREND":
                # Entry Offset = [ ( |dist_to_tf(BTC)| + dist_to_tf(ETH) ) × vol_mult ] - base_buffer
                entry_offset = (btc_dist_unsigned + dist_to_h4) * alt_vol_mult - buffer_h4_pct
            else:
                entry_offset = dist_to_h4 + btc_dist_unsigned * alt_vol_mult
            dist_ema_display = f"[H4] {dist_to_h4:+.2f}% ({entry_offset:+.2f}%)"

        # Dùng cho WAIT section (vẫn cần target_tf và dist_ema)
        target_tf = getattr(tk, "active_target_tf", "M5")
        dist_ema = float(abs(dist_to_h4))
        
        m5_str = fmt_tf_state(tk.mtf_states["M5"])
        m15_str = fmt_tf_state(tk.mtf_states["M15"])
        m30_str = fmt_tf_state(tk.mtf_states["M30"])
        h1_str = fmt_tf_state(tk.mtf_states["H1"])
        h2_str = fmt_tf_state(tk.mtf_states.get("H2", {"accum":0,"fail":0,"side":"none"}))
        h4_str = fmt_tf_state(tk.mtf_states.get("H4", {"accum":0,"fail":0,"side":"none"}))
        
        print(f" {cfg['coin']:^4} | {m5_str:^7} | {m15_str:^7} | {m30_str:^7} | {h1_str:^7} | {h2_str:^7} | {h4_str:^7} | {format_with_commas(tk.live_price, 1):>9} | {dist_ema_display:<20}")

        # BÁO CÁO PHÂN TÍCH REALTIME
        has_any_exp = False
        
        placed_long_dict = getattr(tk, "placed_entry_px_long_by_tf", {})
        active_tfs_long = [tf for tf, px in placed_long_dict.items() if px not in ("---", "ERR")]
        active_tfs_long_sorted = sorted(active_tfs_long, key=globals_ref.tf_weight) if active_tfs_long else []
        grid_details_long_dca = " -> ".join([f"{fmt_tf(tf)}: {placed_long_dict[tf]}" for tf in active_tfs_long_sorted])
            
        placed_short_dict = getattr(tk, "placed_entry_px_short_by_tf", {})
        active_tfs_short = [tf for tf, px in placed_short_dict.items() if px not in ("---", "ERR")]
        active_tfs_short_sorted = sorted(active_tfs_short, key=globals_ref.tf_weight) if active_tfs_short else []
        grid_details_short_dca = " -> ".join([f"{fmt_tf(tf)}: {placed_short_dict[tf]}" for tf in active_tfs_short_sorted])
            
        if tk.has_long:
            open_reason = getattr(tk, "open_reason_long", "")
            entry_px = f"{format_with_commas(tk.active_avg_px_long, 1):>8}"
            dca_str = f". chờ DCA khung Lớn -> {grid_details_long_dca}" if grid_details_long_dca else ""
            if open_reason or dca_str:
                exp_groups["POS"].append((0, globals_ref.tf_weight(target_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Gồng lệnh LONG ({entry_px}){dca_str}"))
                has_any_exp = True
                
        if tk.has_short:
            open_reason = getattr(tk, "open_reason_short", "")
            entry_px = f"{format_with_commas(tk.active_avg_px_short, 1):>8}"
            dca_str = f". chờ DCA khung Lớn -> {grid_details_short_dca}" if grid_details_short_dca else ""
            if open_reason or dca_str:
                exp_groups["POS"].append((1, globals_ref.tf_weight(target_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Gồng lệnh SHORT ({entry_px}){dca_str}"))
                has_any_exp = True

        # Ping pong
        if getattr(tk, "is_ping_pong_pos", False):
            pp_tf = getattr(tk, "ping_pong_tf", tk.active_target_tf)
            pp_big_tf = getattr(tk, "ping_pong_big_tf", "")
            display_vol = target_vol / getattr(globals_ref, "PING_PONG_VOL_DIVIDER", Decimal("3.0"))
            if tk.placed_entry_px_long != "---": 
                px_str = f"{format_with_commas(tk.placed_entry_px_long):>8}"
                exp_groups["PINGPONG"].append((0, globals_ref.tf_weight(pp_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Kích hoạt Ping-Pong [{pp_tf}] [Isolated x50] (LONG {pp_tf}->{pp_big_tf}) tại {px_str} ({format_with_commas(display_vol, 0)}U)."))
                has_any_exp = True
            if tk.placed_entry_px_short != "---": 
                px_str = f"{format_with_commas(tk.placed_entry_px_short):>8}"
                exp_groups["PINGPONG"].append((1, globals_ref.tf_weight(pp_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Kích hoạt Ping-Pong [{pp_tf}] [Isolated x50] (SHORT {pp_tf}->{pp_big_tf}) tại {px_str} ({format_with_commas(display_vol, 0)}U)."))
                has_any_exp = True

        # Xo Le Hedge
        if getattr(tk, "is_xole_pos", False):
            xl_tf = getattr(tk, "xole_tf", tk.active_target_tf)
            xl_big_tf = getattr(tk, "xole_big_tf", "")
            if tk.placed_entry_px_long != "---": 
                px_str = f"{format_with_commas(tk.placed_entry_px_long):>8}"
                exp_groups["XOLE"].append((0, globals_ref.tf_weight(xl_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Kích hoạt Xo Le Hedge [{xl_tf}] (Bắt đáy {xl_tf}->{xl_big_tf}) tại {px_str}."))
                has_any_exp = True
            if tk.placed_entry_px_short != "---": 
                px_str = f"{format_with_commas(tk.placed_entry_px_short):>8}"
                exp_groups["XOLE"].append((1, globals_ref.tf_weight(xl_tf), cfg_idx, f"  ✧ [{cfg['coin']}]: Kích hoạt Xo Le Hedge [{xl_tf}] (Bắt đỉnh {xl_tf}->{xl_big_tf}) tại {px_str}."))
                has_any_exp = True

        # MAIN DCA limits (Only print standalone if NO position is active)
        if not tk.has_long and active_tfs_long:
            grid_details = ", ".join([f"{fmt_tf(tf)}: {placed_long_dict[tf]}" for tf in active_tfs_long_sorted])
            exp_groups["LIMIT"].append((0, globals_ref.tf_weight(active_tfs_long_sorted[0]), cfg_idx, f"  ✧ [{cfg['coin']}]: Chờ khớp LONG đa khung ({format_with_commas(target_vol, 0)}U) -> {grid_details}."))
            has_any_exp = True
            
        if not tk.has_short and active_tfs_short:
            grid_details = ", ".join([f"{fmt_tf(tf)}: {placed_short_dict[tf]}" for tf in active_tfs_short_sorted])
            exp_groups["LIMIT"].append((1, globals_ref.tf_weight(active_tfs_short_sorted[0]), cfg_idx, f"  ✧ [{cfg['coin']}]: Chờ khớp SHORT đa khung ({format_with_commas(target_vol, 0)}U) -> {grid_details}."))
            has_any_exp = True

        # Nếu không có vị thế và không có limit nào chờ, thì mới in lý do tại sao đứng ngoài
        if not has_any_exp:
            is_squeeze_active = getattr(tk, f"is_{target_tf.lower()}_squeeze", False)
            if is_squeeze_active: exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Dừng [{target_tf}] -> Nén tam giác hẹp (Squeeze Breakout), rủi ro xả mạnh."))
            elif tk.fan_delta < Decimal("-0.51"): exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Dừng [{target_tf}] -> EMA co hẹp nhanh (Delta: {tk.fan_delta:.4f}) báo hiệu quét 2 đầu."))
            elif tk.cycle_fail_count >= 2: exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Dừng [{target_tf}] -> Giá nhấp nhô ({tk.cycle_fail_count}/{globals_ref.MAX_CYCLE_FAILURES} lần)."))
            elif tk.accum_candle_count < globals_ref.REQUIRED_ACCUMULATION_CANDLES: exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Dò trend [{target_tf}] -> Chờ nến xác nhận trục ({tk.accum_candle_count}/{globals_ref.REQUIRED_ACCUMULATION_CANDLES})."))
            elif dist_ema * 10 < 1.5: exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Dừng [{target_tf}] -> EMA hội tụ quá sát, mất xu hướng."))
            elif tk.trend == "SIDEWAY": exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Đứng ngoài [{target_tf}] -> Không có 2 TF liền kề đồng pha."))
            else:
                active_tf_mult = float(globals_ref.TF_MULTIPLIERS.get(target_tf, Decimal("1.0")))
                mode = "Midpoint(EMA89/EMA200)" if dist_ema >= 0.2 else "EMA200"
                exp_groups["WAIT"].append((0, 0, cfg_idx, f"  ✧ [{cfg['coin']}]: Quan sát [{target_tf}] quanh {mode} ({dist_ema:.2f}%). Chờ Limit."))
    print("-" * 95)

    print("\n✜ TÌNH TRẠNG VỊ THẾ:")
    # ⚡ Thu thập tất cả dòng output, sắp xếp theo chiến thuật
    def _get_mode_icon(tk, side):
        """Trả về icon chiến thuật"""
        if getattr(tk, "is_ping_pong_pos", False) and getattr(tk, "ping_pong_pos_side", "") == side:
            return "·", 3
        if getattr(tk, "is_xole_pos", False) and getattr(tk, "xole_pos_side", "") == side:
            return "·", 2
        return "·", 1

    pos_lines = []  # list of (mode_priority, coin_name, line_list)
    for cfg in COIN_PORTFOLIO:
        sid = cfg["swap"]
        coin_name = cfg["coin"]
        if sid not in state_matrix: continue
        tk = state_matrix[sid]
        leverage = cfg.get("leverage", 100)
        has_any = False
        # ╰─ luôn thẳng hàng dọc với ╭─ bằng cách tính indent từ chính dòng ╭─
        if tk.has_long:
            has_any = True
            icon, mode = _get_mode_icon(tk, "long")
            mae_lev = tk.mae_max_pct_long * Decimal(str(leverage))
            entry_px_str = f"{format_with_commas(tk.active_avg_px_long, 1):>8}"
            sl_px_str = f"{format_with_commas(tk.active_sl_px_long, 1):>8}"
            filled_tfs = getattr(tk, "pos_cycle_filled_tfs", [])
            if filled_tfs:
                sorted_tfs = sorted(filled_tfs, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t.upper(),0))
                filled_str = " ".join([fmt_tf(t) for t in sorted_tfs])
            else:
                filled_str = fmt_tf("M5")
            long_vol_str = f" = {tk.long_pos_vol:.0f} U " if getattr(tk, "long_pos_vol", 0) > 0 else " "
            line_main = f"    ✧ {coin_name} ╭─  Đã khớp LONG [{filled_str}]{long_vol_str}: Entry {entry_px_str.strip()}  → ROI (+{tk.max_roi_long:.1f}% / -{mae_lev:.1f}%)"
            # Tìm vị trí của ╭─ để tính indent cho ╰─
            idx_branch = line_main.index("╭─")
            indent_branch = " " * idx_branch
            lines = [line_main]
            
            placed_long_dict = getattr(tk, "placed_entry_px_long_by_tf", {})
            filled = getattr(tk, "pos_cycle_filled_tfs", [])
            active_dca_tfs = [tf for tf, px in placed_long_dict.items() if px not in ("---", "ERR") and tf not in filled]
            if active_dca_tfs:
                active_dca_tfs_sorted = sorted(active_dca_tfs, key=lambda tf: Decimal(placed_long_dict[tf]), reverse=True)
                for i, tf in enumerate(active_dca_tfs_sorted):
                    prefix = "╰─" if i == len(active_dca_tfs_sorted) - 1 else "├─"
                    vol_str = _get_vol_str(tk, tf)
                    lines.append(f"{indent_branch}{prefix}  Chờ DCA: {fmt_tf(tf)}: {placed_long_dict[tf]} {vol_str}")
            pos_lines.append((mode, coin_name, lines))
        if tk.has_short:
            has_any = True
            icon, mode = _get_mode_icon(tk, "short")
            mae_lev = tk.mae_max_pct_short * Decimal(str(leverage))
            entry_px_str = f"{format_with_commas(tk.active_avg_px_short, 1):>8}"
            filled_tfs = getattr(tk, "pos_cycle_filled_tfs", [])
            if filled_tfs:
                sorted_tfs = sorted(filled_tfs, key=lambda t: {"M5":1,"M15":2,"M30":3,"H1":4,"H2":5,"H4":6}.get(t.upper(),0))
                filled_str = " ".join([fmt_tf(t) for t in sorted_tfs])
            else:
                filled_str = fmt_tf("M5")
            short_vol_str = f" = {tk.short_pos_vol:.0f} U " if getattr(tk, "short_pos_vol", 0) > 0 else " "
            line_main = f"    ✧ {coin_name} ╭─  Đã khớp SHORT [{filled_str}]{short_vol_str}: Entry {entry_px_str.strip()}  → ROI (+{tk.max_roi_short:.1f}% / -{mae_lev:.1f}%)"
            idx_branch = line_main.index("╭─")
            indent_branch = " " * idx_branch
            lines = [line_main]
            
            placed_short_dict = getattr(tk, "placed_entry_px_short_by_tf", {})
            filled_short = getattr(tk, "pos_cycle_filled_tfs", [])
            active_dca_tfs = [tf for tf, px in placed_short_dict.items() if px not in ("---", "ERR") and tf not in filled_short]
            if active_dca_tfs:
                active_dca_tfs_sorted = sorted(active_dca_tfs, key=lambda tf: Decimal(placed_short_dict[tf]))
                for i, tf in enumerate(active_dca_tfs_sorted):
                    prefix = "╰─" if i == len(active_dca_tfs_sorted) - 1 else "├─"
                    vol_str = _get_vol_str(tk, tf)
                    lines.append(f"{indent_branch}{prefix}  Chờ DCA: {fmt_tf(tf)}: {placed_short_dict[tf]} {vol_str}")
            pos_lines.append((mode, coin_name, lines))
        # DCA PENDING (có lệnh chờ nhưng chưa có vị thế mở)
        if not tk.has_long and not tk.has_short:
            has_pending = False
            pending_parts = []
            placed_long_dict = getattr(tk, "placed_entry_px_long_by_tf", {})
            active_dca_tfs_l = [tf for tf, px in placed_long_dict.items() if px not in ("---", "ERR")]
            if active_dca_tfs_l:
                has_pending = True
                active_dca_tfs_sorted_l = sorted(active_dca_tfs_l, key=lambda tf: Decimal(placed_long_dict[tf]), reverse=True)
                pending_parts.extend([f"{fmt_tf(tf)}: {placed_long_dict[tf]}" for tf in active_dca_tfs_sorted_l])
            
            placed_short_dict = getattr(tk, "placed_entry_px_short_by_tf", {})
            active_dca_tfs_s = [tf for tf, px in placed_short_dict.items() if px not in ("---", "ERR")]
            if active_dca_tfs_s:
                has_pending = True
                active_dca_tfs_sorted_s = sorted(active_dca_tfs_s, key=lambda tf: Decimal(placed_short_dict[tf]))
                pending_parts.extend([f"{fmt_tf(tf)}: {placed_short_dict[tf]}" for tf in active_dca_tfs_sorted_s])
            
            if has_pending:
                has_any = True
                line_main = f"    ✧ {coin_name} ╭─  Chưa có vị thế"
                idx_branch = line_main.index("╭─")
                indent_branch = " " * idx_branch
                lines = [line_main]
                # Tách riêng LONG và SHORT với ký tự ├─/╰─
                placed_long_dict = getattr(tk, "placed_entry_px_long_by_tf", {})
                active_l = [tf for tf, px in placed_long_dict.items() if px not in ("---", "ERR")]
                placed_short_dict2 = getattr(tk, "placed_entry_px_short_by_tf", {})
                active_s = [tf for tf, px in placed_short_dict2.items() if px not in ("---", "ERR")]
                if active_l:
                    active_l_sorted = sorted(active_l, key=lambda tf: Decimal(placed_long_dict[tf]), reverse=True)
                    for i, tf in enumerate(active_l_sorted):
                        prefix = "╰─" if not active_s and i == len(active_l_sorted) - 1 else "├─"
                        vol_str = _get_vol_str(tk, tf)
                        lines.append(f"{indent_branch}{prefix}  Đang limit LONG: {fmt_tf(tf)}: {placed_long_dict[tf]} {vol_str}")
                if active_s:
                    active_s_sorted = sorted(active_s, key=lambda tf: Decimal(placed_short_dict2[tf]))
                    for i, tf in enumerate(active_s_sorted):
                        prefix = "╰─" if i == len(active_s_sorted) - 1 else "├─"
                        vol_str = _get_vol_str(tk, tf)
                        lines.append(f"{indent_branch}{prefix}  Đang limit SHORT: {fmt_tf(tf)}: {placed_short_dict2[tf]} {vol_str}")
                pos_lines.append((0, coin_name, lines))
            else:
                pos_lines.append((0, coin_name, [f"    ✧ {coin_name} ╭─  Chưa có vị thế"]))
        else:
            # Có vị thế 1 bên, in pending bên kia nếu có
            if not tk.has_long:
                placed_long_dict = getattr(tk, "placed_entry_px_long_by_tf", {})
                active_dca_tfs_l = [tf for tf, px in placed_long_dict.items() if px not in ("---", "ERR")]
                if active_dca_tfs_l:
                    active_dca_tfs_l_sorted = sorted(active_dca_tfs_l, key=lambda tf: Decimal(placed_long_dict[tf]), reverse=True)
                    line_main = f"    ✧ {coin_name} ╭─  Chưa có vị thế LONG"
                    idx_branch = line_main.index("╭─")
                    indent_branch = " " * idx_branch
                    lines = [line_main]
                    for i, tf in enumerate(active_dca_tfs_l_sorted):
                        prefix = "╰─" if i == len(active_dca_tfs_l_sorted) - 1 else "├─"
                        vol_str = _get_vol_str(tk, tf)
                        lines.append(f"{indent_branch}{prefix}  Đang limit: {fmt_tf(tf)}: {placed_long_dict[tf]} {vol_str}")
                    pos_lines.append((0, coin_name, lines))
            if not tk.has_short:
                placed_short_dict = getattr(tk, "placed_entry_px_short_by_tf", {})
                active_dca_tfs_s = [tf for tf, px in placed_short_dict.items() if px not in ("---", "ERR")]
                if active_dca_tfs_s:
                    active_dca_tfs_sorted_s = sorted(active_dca_tfs_s, key=lambda tf: Decimal(placed_short_dict[tf]))
                    line_main = f"    ✧ {coin_name} ╭─  Chưa có vị thế SHORT"
                    idx_branch = line_main.index("╭─")
                    indent_branch = " " * idx_branch
                    lines = [line_main]
                    for i, tf in enumerate(active_dca_tfs_sorted_s):
                        prefix = "╰─" if i == len(active_dca_tfs_sorted_s) - 1 else "├─"
                        vol_str = _get_vol_str(tk, tf)
                        lines.append(f"{indent_branch}{prefix}  Đang limit: {fmt_tf(tf)}: {placed_short_dict[tf]} {vol_str}")
                    pos_lines.append((0, coin_name, lines))

    # ⚡ Sắp xếp: XAU ưu tiên 0, BTC ưu tiên 1, ETH ưu tiên 2, sau đó đến mode priority (❶=1, ❷=2, ❸=3), pending=0 xếp cuối
    def _coin_order(c_name): return {"XAU": 0, "BTC": 1, "ETH": 2}.get(c_name, 99)
    pos_lines.sort(key=lambda x: (_coin_order(x[1]), x[0] if x[0] > 0 else 99))

    is_first = True
    for mode, coin_name, lines in pos_lines:
        if not is_first:
            print("")  # Blank line giữa tất cả các vị thế
        is_first = False
        for line in lines:
            print(line)  # Dùng print thay smart_print để không bị wrap ╭─/╰─
    print("\n☯ LỊCH SỬ LỆNH VỪA ĐÓNG:")
    has_closed_history = False
    for cfg in COIN_PORTFOLIO:
        sid = cfg["swap"]
        coin_name = cfg["coin"]
        if sid not in state_matrix: continue
        tk = state_matrix[sid]
        closed_list = getattr(tk, "closed_history", [])
        if closed_list:
            has_closed_history = True
            recent = closed_list[-1:]
            for entry in reversed(recent):
                pnl_color = "+" if entry["roi"] > 0 else ""
                roi_str = f"{pnl_color}{entry['roi']:.1f}%"
                raw_dca = entry.get('dca_tfs', '')
                if raw_dca:
                    clean_dca = " ".join([fmt_tf(t) for t in raw_dca.replace(" + ", " ").split()])
                    dca_str = f" cụm DCA [{clean_dca}]"
                else:
                    dca_str = ""
                mode_icon = entry.get("mode_icon", "")
                icon_str = f" {mode_icon}" if mode_icon else ""
                smart_print(f"  ✧{icon_str} [{coin_name}]: Đã đóng {entry['side']} ({roi_str}){dca_str} → Lý do: {entry['reason']}")
        elif getattr(tk, "last_closed_side", ""):
            has_closed_history = True
            pnl_color = "+" if tk.last_closed_roi > 0 else ""
            roi_str = f"{pnl_color}{tk.last_closed_roi:.1f}%"
            reason = getattr(tk, "last_closed_reason", "Không rõ")
            smart_print(f"  ✧ [{coin_name}]: Đã đóng {tk.last_closed_side} ({roi_str}) → Lý do: {reason}")
    if not has_closed_history:
        smart_print("  · Chưa có lệnh nào được đóng trong phiên này.")
    print("=" * 95 + "\n" * 3)

# z1951 | Áp dụng tỷ lệ Co giãn Động (Dynamic ATR Elasticity Ratio) vào hiển thị Entry Limit Offset
# z1952 | Fix NameError by adding globals_ref. to MAX_CYCLE_FAILURES and REQUIRED_ACCUMULATION_CANDLES
# z2419 | Hiển thị tất cả các TF đã khớp trong "cụm DCA" trên Dashboard thay vì chỉ hiển thị active_pos_tf
# z2420 | Cập nhật format hiển thị trạng thái vị thế và chờ lệnh limit trên Dashboard
# z2421 | Căn lề dòng hiển thị chờ DCA thụt vào thêm 2 spaces để thẳng cột dưới tên coin trên Dashboard
# z2423 | Căn chỉnh thẳng hàng phần đuôi (Entry - SL) của các dòng vị thế bằng format <44 width
# z2424 | Chỉnh sửa padding prefix thành 42 và giữ nguyên padding >8 của Entry để dóng thẳng hàng dấu thập phân
# z2425 | Giữ nguyên format >8 cho SL_px và bổ sung dòng trống phân cách giữa tất cả các vị thế trên Dashboard

# z1949 | Fix Partial Fills using Fills API, RAM structure order list(), Disk I/O Memory Cache, Time-based Caching for Rate Limit
# z2500 | Bỏ hiển thị SL trong dòng "Đã khớp LONG/SHORT" trên Dashboard để giao diện gọn hơn
# z3350 | Clean up: Xoá các imports (time) và các biến (von_goc, date_part, active_pos_count, sl_px_str, has_both, tf_tol) không sử dụng để tối ưu code.
# z1950 | Đổi đuôi mở rộng file chứa khoá API từ .env sang .api để tăng tính bảo mật, tránh nhầm lẫn
