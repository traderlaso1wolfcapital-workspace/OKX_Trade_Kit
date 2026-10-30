import os
import time
import json
from decimal import Decimal
from typing import Dict, Any, Optional
from datetime import datetime
from bots.sub2.bot_models import AssetTracker

BULLISH = 1
BEARISH = -1

ALL_TFS = ["5m", "15m", "30m", "1H", "2H", "4H", "D1"]

TF_NORM_MAP = {
    "5": "5m", "5m": "5m", "M5": "5m",
    "15": "15m", "15m": "15m", "M15": "15m",
    "30": "30m", "30m": "30m", "M30": "30m",
    "1h": "1H", "1H": "1H", "H1": "1H", "60": "1H",
    "2h": "2H", "2H": "2H", "H2": "2H", "120": "2H",
    "4h": "4H", "4H": "4H", "H4": "4H", "240": "4H",
    "1d": "D1", "1D": "D1", "D1": "D1", "d": "D1", "D": "D1"
}

def norm_tf(raw_tf: str) -> str:
    s = str(raw_tf).strip()
    return TF_NORM_MAP.get(s, TF_NORM_MAP.get(s.lower(), s.upper()))

def format_with_commas(value: Any, decimals: int = 2) -> str:
    try:
        val_dec = Decimal(str(value))
        if val_dec == 0:
            return "0.00" if decimals == 2 else "0.0"
        return f"{val_dec:,.{decimals}f}"
    except Exception:
        return str(value)

def _extract_balance_from_response(balance_data: dict) -> Decimal:
    """Trích xuất số dư tài khoản OKX an toàn và chính xác, không dùng số ảo."""
    try:
        if not isinstance(balance_data, dict):
            return Decimal("0.00")
        bal_items = balance_data.get("data", [])
        if not bal_items:
            return Decimal("0.00")
        b = bal_items[0]
        teq = b.get("totalEq")
        if teq not in [None, "", "0", 0, "0.0", "0.00"]:
            val = Decimal(str(teq))
            if val > 0:
                return val

        details = b.get("details", [])
        target_d = None
        for d in details:
            if isinstance(d, dict) and str(d.get("ccy", "")).upper() == "USDT":
                target_d = d
                break
        candidates = [target_d] if target_d else details
        for d in candidates:
            if not isinstance(d, dict): continue
            for field in ["cashBal", "availBal", "eq", "availEq", "eqUsd", "disEq"]:
                v = d.get(field)
                if v not in [None, "", "0", 0, "0.0", "0.00"]:
                    val = Decimal(str(v))
                    if val > 0:
                        return val
    except Exception:
        pass
    return Decimal("0.00")

def _sync_update_wallet_metrics(client, env_paths: dict, system_config: dict):
    try:
        balance_data = client.request("GET", "/api/v5/account/balance", params={"ccy": "USDT"})
        current_equity = _extract_balance_from_response(balance_data)

        if current_equity <= 0:
            # Thử thêm endpoint không param
            balance_data2 = client.request("GET", "/api/v5/account/balance")
            current_equity = _extract_balance_from_response(balance_data2)

        evo_file = env_paths.get("JSON_EVOLUTION_DATA_FILE", "")
        if not evo_file:
            return

        data = {}
        if os.path.exists(evo_file):
            try:
                with open(evo_file, "r", encoding="utf-8") as f:
                    data = json.load(f)
            except Exception:
                data = {}

        if current_equity > 0:
            should_reset = system_config.get("SHOULD_RESET_WALLET", False)
            if "wallet_stats" not in data or should_reset:
                data["wallet_stats"] = {
                    "von_goc": float(current_equity),
                    "von_hien_tai": float(current_equity),
                    "loi_nhuan": 0.0,
                    "tang_truong": 0.0,
                    "last_reset_ts": time.time()
                }
                if should_reset:
                    system_config["SHOULD_RESET_WALLET"] = False
                    print(f"\n♻️ [RESET WALLET]: Bot SMC đã khóa cứng mốc VỐN GỐC mới = {current_equity:,.2f} USDT")
            else:
                stats = data["wallet_stats"]
                von_goc = Decimal(str(stats.get("von_goc", current_equity)))
                loi_nhuan = current_equity - von_goc
                tang_truong = (loi_nhuan / von_goc) * Decimal("100") if von_goc > 0 else Decimal("0")

                stats["von_hien_tai"] = float(current_equity)
                stats["loi_nhuan"] = float(loi_nhuan)
                stats["tang_truong"] = float(tang_truong)

            os.makedirs(os.path.dirname(evo_file), exist_ok=True)
            with open(evo_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception:
        pass

def update_wallet_metrics(*args, **kwargs):
    import sys
    if hasattr(sys, '_bot_sub2_io_queue') and sys._bot_sub2_io_queue:
        sys._bot_sub2_io_queue.put((_sync_update_wallet_metrics, args, kwargs))
    else:
        _sync_update_wallet_metrics(*args, **kwargs)

def print_dashboard(trackers: Dict[str, AssetTracker], env_paths: dict, system_config: dict = None):
    """
    Bảng giao diện Terminal chuẩn mực cho Bot SMC Sub2.
    Format 100% đồng bộ với Bot Thợ săn EMA200 (Sub1) và hiển thị đa khung 7 TF thực tế.
    """
    if system_config is None: system_config = {}

    sync_time = datetime.now().strftime('%H:%M:%S')

    von_goc = 0.00
    von_hien_tai = 0.00
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
                    von_goc = float(w.get("von_goc", 0.0))
                    von_hien_tai = float(w.get("von_hien_tai", 0.0))
                    loi_nhuan = float(w.get("loi_nhuan", 0.0))
                    tang_truong = float(w.get("tang_truong", 0.0))

                for coin, cdata in evo_data.items():
                    if coin == "wallet_stats" or not isinstance(cdata, dict): continue
                    total_pos += cdata.get("tong_lenh_dong", 0)
                    total_win += cdata.get("lenh_thang", 0)
                    all_mae.extend(cdata.get("lich_su_mae", []))
                    all_mfe.extend(cdata.get("lich_su_mfe", []))

                if total_pos > 0: ai_winrate = (total_win / total_pos) * 100
                if all_mae: ai_avg_mae = sum(all_mae) / len(all_mae)
                if all_mfe: ai_avg_mfe = sum(all_mfe) / len(all_mfe)
        except Exception:
            pass

    # Đọc cấu hình từ JSON nếu có
    target_vol = Decimal("0.4")
    enabled_coins = ["XAU", "BTC", "ETH"]
    try:
        cfg_file = env_paths.get("FILE_GLOBAL_CONFIG", "")
        if cfg_file and os.path.exists(cfg_file):
            with open(cfg_file, "r", encoding="utf-8") as f:
                _cfg = json.load(f)
                if "POSITION_VOLUME_HIGH_CONFIDENCE" in _cfg:
                    target_vol = Decimal(str(_cfg["POSITION_VOLUME_HIGH_CONFIDENCE"]))
                elif "POSITION_VOLUME_USDT" in _cfg:
                    target_vol = Decimal(str(_cfg["POSITION_VOLUME_USDT"]))
                if "ENABLED_COINS" in _cfg:
                    enabled_coins = _cfg["ENABLED_COINS"]
    except Exception:
        pass
    enabled_set = {str(c).split("-")[0].upper() for c in enabled_coins}

    pnl_sign = "+" if loi_nhuan >= 0 else ""
    pnl_str = f"{pnl_sign}{format_with_commas(loi_nhuan, 2)}"
    vol_str_top = f"{format_with_commas(target_vol, 1)}"
    mfe_str = f"+{ai_avg_mfe:.1f}%" if ai_avg_mfe > 0 else "--"
    mae_str = f"-{ai_avg_mae:.1f}%" if ai_avg_mae > 0 else "--"
    mm_str = f"{mfe_str} / {mae_str}"

    bar  = "-" * 78
    dbar = "=" * 78

    r0 = f" ⚡ SMC Order Block   |   💰 Lợi nhuận    |   🏦 Tài khoản    |  🎯 Hiệu suất  "

    goc_str = f"{format_with_commas(von_goc, 2):>8} $" if von_goc > 0 else "      -- $"
    tong_str = f"{format_with_commas(von_hien_tai, 2):>8} $" if von_hien_tai > 0 else "      -- $"

    r1_c1 = f"   {sync_time:^15}   "
    r1_c2 = f" Gốc: {goc_str} "
    r1_c3 = f" Tổng: {tong_str} "
    r1_c4 = f" Win: {ai_winrate:.1f}% / {total_pos:<3}"
    r1 = f"{r1_c1:<21}|{r1_c2:<19}|{r1_c3:<19}|{r1_c4:<16}"

    mode_txt = "Mode: Độc Lập TF"
    r2_c1 = f"{mode_txt:^21}"
    r2_c2 = f" PNL: {pnl_str:>8} $ "
    r2_c3 = f" Vol : {vol_str_top:>8} U "
    r2_c4 = f" M/M: {mm_str:<10}"
    r2 = f"{r2_c1:<21}|{r2_c2:<19}|{r2_c3:<19}|{r2_c4:<16}"

    env_raw = env_paths.get("ENV_FILE_NAME", ".api_sub2")
    env_name = os.path.basename(env_raw) if env_raw else ".api_sub2"
    print(f"\n  bot_sub2.py {env_name}")
    print(dbar)
    print(r0)
    print(bar)
    print(r1)
    print(r2)
    print(dbar)

    sorted_trackers = dict(sorted(trackers.items(), key=lambda x: (0 if "XAU" in x[0] else (1 if "BTC" in x[0] else 2), x[0])))

    # ==============================================================================
    # ✜ TÌNH TRẠNG VỊ THẾ & LỆNH CHỜ (CHUẨN FORM SUB1 EMA200)
    # ==============================================================================
    print("\n✜ Tình trạng vị thế:")
    pos_lines = []

    for symbol, tracker in sorted_trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        c_upper = coin.upper()
        is_coin_enabled = (c_upper in enabled_set)
        has_pos = (tracker.has_long or tracker.has_short)
        if not is_coin_enabled and not has_pos:
            continue

        triggered = [s for s in tracker.trade_setups if s.triggered]
        pending = [s for s in tracker.trade_setups if not s.triggered]

        coin_lines = []
        if triggered:
            # 1. ĐÃ KHỚP VỊ THẾ
            s0 = triggered[0]
            side_str = "LONG" if s0.bias == BULLISH else "SHORT"
            tf_str = norm_tf(s0.tf) if s0.tf else "15m"
            roi = float(tracker.max_roi_long) if s0.bias == BULLISH else float(tracker.max_roi_short)
            mae = float(tracker.mae_max_pct_long) if s0.bias == BULLISH else float(tracker.mae_max_pct_short)
            vol_val = float(s0.pos_usdt) if s0.pos_usdt > 0 else float(target_vol)
            
            line_main = f"    {coin:<4} ╭─ Đã khớp {side_str} [{tf_str}] - ký quỹ: {vol_val:.2f} U ({roi:+.1f}% / -{mae:.1f}%)"
            coin_lines.append(line_main)
            indent_branch = "        "
            
            for s in triggered:
                s_tf = norm_tf(s.tf) if s.tf else "15m"
                s_vol = float(s.pos_usdt) if s.pos_usdt > 0 else float(target_vol)
                coin_lines.append(f"{indent_branch}├─ Entry {s_tf.upper()}: {float(s.entry_price):,.1f} - {s_vol:.2f} U")
                
            if pending:
                for p in pending:
                    p_side = "LONG" if p.bias == BULLISH else "SHORT"
                    p_tf = norm_tf(p.tf) if p.tf else "15m"
                    p_vol = float(p.pos_usdt) if p.pos_usdt > 0 else float(target_vol)
                    coin_lines.append(f"{indent_branch}├─ Đang limit {p_side}: {p_tf}: {float(p.entry_price):,.1f} (VOL: {p_vol:.1f} U)")

            coin_lines.append(f"{indent_branch}╰─ Chưa có lệnh đóng ⭢ Win Streak: 0")
        elif pending:
            # 2. CHƯA CÓ VỊ THẾ, ĐANG ĐẶT LỆNH LIMIT
            line_main = f"    {coin:<4} ╭─  Chưa có vị thế"
            coin_lines.append(line_main)
            indent_branch = "        "
            for p in pending:
                p_side = "LONG" if p.bias == BULLISH else "SHORT"
                p_tf = norm_tf(p.tf) if p.tf else "15m"
                p_vol = float(p.pos_usdt) if p.pos_usdt > 0 else float(target_vol)
                coin_lines.append(f"{indent_branch}├─  Đang limit {p_side}: {p_tf}: {float(p.entry_price):,.1f} (VOL: {p_vol:.1f} U)")
            coin_lines.append(f"{indent_branch}╰─ Chưa có lệnh đóng ⭢ Win Streak: 0")
        else:
            # 3. CHƯA CÓ VỊ THẾ & CHƯA CÓ LIMIT
            line_main = f"    {coin:<4} ╭─  Chưa có vị thế"
            indent_branch = "        "
            coin_lines.append(line_main)
            coin_lines.append(f"{indent_branch}╰─ Chưa có lệnh đóng ⭢ Win Streak: 0")

        pos_lines.append((0 if "XAU" in coin else (1 if "BTC" in coin else 2), coin, coin_lines))

    pos_lines.sort(key=lambda x: (0 if "XAU" in x[1] else (1 if "BTC" in x[1] else 2), x[1]))
    is_first = True
    for _, coin, lines in pos_lines:
        if not is_first:
            print("")
        is_first = False
        for l in lines:
            print(l)

    # ==============================================================================
    # 📊 MA TRẬN NẾN ĐA KHUNG (7 TF: 5m, 15m, 30m, 1H, 2H, 4H, D1)
    # ==============================================================================
    active_tfs = set()
    for sid, tracker in trackers.items():
        coin_u = (tracker.coin_name if tracker.coin_name else sid.split('-')[0]).upper()
        if coin_u not in enabled_set and not (tracker.has_long or tracker.has_short):
            continue
        for s in tracker.trade_setups:
            if s.tf:
                active_tfs.add(norm_tf(s.tf))
        for tf, px in getattr(tracker, "placed_entry_px_long_by_tf", {}).items():
            if px not in ("---", "ERR"):
                active_tfs.add(norm_tf(tf))
        for tf, px in getattr(tracker, "placed_entry_px_short_by_tf", {}).items():
            if px not in ("---", "ERR"):
                active_tfs.add(norm_tf(tf))

    tf_labels = [f"[{tf}]" if tf in active_tfs else tf for tf in ALL_TFS]
    m5_lbl, m15_lbl, m30_lbl, h1_lbl, h2_lbl, h4_lbl, d1_lbl = tf_labels

    tbl_header = f" {'Coin':^4} | {m5_lbl:^5} | {m15_lbl:^5} | {m30_lbl:^5} | {h1_lbl:^5} | {h2_lbl:^5} | {h4_lbl:^5} | {d1_lbl:^5} | {'Price':^13} "
    tbl_bar = "-" * 78
    print("\n" + tbl_bar)
    print(tbl_header)
    print(tbl_bar)

    for symbol, tracker in sorted_trackers.items():
        coin = tracker.coin_name if tracker.coin_name else symbol.split('-')[0]
        c_upper = coin.upper()
        is_coin_enabled = (c_upper in enabled_set)
        has_pos = (tracker.has_long or tracker.has_short)

        if not is_coin_enabled and not has_pos:
            continue

        price_str = format_with_commas(tracker.live_price, 1)

        row_cells = []
        for tf in ALL_TFS:
            # 1. Kiểm tra vị thế đã khớp trên TF này
            trig_setups = [s for s in tracker.trade_setups if s.triggered and norm_tf(s.tf) == tf]
            if trig_setups:
                side_tag = "L" if trig_setups[0].bias == BULLISH else "S"
                row_cells.append(f"[★ {side_tag}]")
                continue

            # 2. Kiểm tra lệnh chờ (Limit pending) trên TF này
            pend_setups = [s for s in tracker.trade_setups if not s.triggered and norm_tf(s.tf) == tf]
            if pend_setups:
                has_l = any(s.bias == BULLISH for s in pend_setups)
                has_s = any(s.bias == BEARISH for s in pend_setups)
                if has_l and has_s:
                    row_cells.append("[L/S]")
                elif has_l:
                    row_cells.append("[ L ]")
                else:
                    row_cells.append("[ S ]")
                continue

            # 3. Trạng thái xu hướng & số lượng OB trên TF này
            tf_st = tracker.tf_states.get(tf)
            if not tf_st:
                for k, v in tracker.tf_states.items():
                    if norm_tf(k) == tf:
                        tf_st = v
                        break

            if tf_st:
                arrow = '▲' if tf_st.swing_trend == 1 else ('▼' if tf_st.swing_trend == -1 else '◆')
                bull_cnt = len([o for o in tf_st.swing_obs if o.bias == BULLISH and not (o.crossed or getattr(o, "mitigated", False))])
                bear_cnt = len([o for o in tf_st.swing_obs if o.bias == BEARISH and not (o.crossed or getattr(o, "mitigated", False))])
                if bull_cnt == 0 and bear_cnt == 0:
                    row_cells.append(f"{arrow} ---")
                else:
                    row_cells.append(f"{arrow} {bull_cnt}-{bear_cnt}")
            else:
                row_cells.append(" --- ")

        c5, c15, c30, ch1, ch2, ch4, cd1 = row_cells
        print(f" {coin:^4} | {c5:^5} | {c15:^5} | {c30:^5} | {ch1:^5} | {ch2:^5} | {ch4:^5} | {cd1:^5} | {price_str:>13} ")

    print(tbl_bar)
    print("=" * 78 + "\n")
