from z_bot_sub1.bot_config import *
from z_bot_sub1.bot_config import tf_weight
from z_bot_sub1.bot_ui import *  # pyright: ignore[reportGeneralTypeIssues]
import time
import requests
import logging
from logging.handlers import RotatingFileHandler
import os

hft_logger = logging.getLogger("TLS1_Bot_Logger")
hft_logger.setLevel(logging.ERROR)
log_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "bot_error.log")
handler = RotatingFileHandler(log_path, maxBytes=5*1024*1024, backupCount=3, encoding='utf-8')
formatter = logging.Formatter('%(asctime)s | %(levelname)s | %(funcName)s:%(lineno)d | %(message)s')
handler.setFormatter(formatter)
hft_logger.addHandler(handler)

def round_to_tick(price: Decimal, tick: Decimal) -> Decimal:
    remainder = price % tick
    if remainder == 0: return price
    return price - remainder

def calculate_ema(prices: list[Decimal], period: int) -> Decimal:
    if len(prices) < period: return Decimal("0")
    sma_seed = sum(prices[:period], Decimal("0")) / Decimal(str(period))
    multiplier = Decimal("2") / (Decimal(str(period)) + Decimal("1"))
    current_ema = sma_seed
    for price in prices[period:]:
        current_ema = (price - current_ema) * multiplier + current_ema
    return current_ema

def check_ema_squeeze(prices: list[Decimal], ema34: Decimal, ema89: Decimal, ema200: Decimal, live_price: Decimal) -> bool:
    import sys; globals_ref = sys.modules[__name__]
    if ema34 <= 0 or ema89 <= 0 or ema200 <= 0 or live_price <= 0: return False
    
    # 1. Structure check (nến hiện tại)
    is_bullish = (ema89 < ema34 < ema200)
    is_bearish = (ema89 > ema34 > ema200)
    if not (is_bullish or is_bearish): return False
    
    # 2. Structure must persist for > 30 consecutive candles
    if len(prices) >= 200 + 30:
        structure_ok = True
        for i in range(len(prices) - 30, len(prices)):
            sub_prices = prices[:i+1]
            e34 = calculate_ema(sub_prices, 34)
            e89 = calculate_ema(sub_prices, 89)
            e200_sub = calculate_ema(sub_prices, 200)
            if e34 <= 0 or e89 <= 0 or e200_sub <= 0:
                structure_ok = False; break
            if is_bullish and not (e89 < e34 < e200_sub):
                structure_ok = False; break
            if is_bearish and not (e89 > e34 > e200_sub):
                structure_ok = False; break
        if not structure_ok: return False
    
    # 3. Flat Resistance Check (EMA200)
    if len(prices) > 200 + 30:
        ema200_past = calculate_ema(prices[:-30], 200)
        dist_200_slope = abs(ema200 - ema200_past) / live_price
        drift_threshold = getattr(globals_ref, "EMA200_DRIFT_THRESHOLD_PCT", Decimal("0.0030"))
        if dist_200_slope > drift_threshold:
            return False
            
    # 4. Accumulation Check
    if is_bullish:
        if not (min(ema89, ema34) * Decimal("0.999") <= live_price <= ema200 * Decimal("1.001")): return False
    else:
        if not (ema200 * Decimal("0.999") <= live_price <= max(ema89, ema34) * Decimal("1.001")): return False
        
    return True

def calculate_atr(closes: list[Decimal], highs: list[Decimal], lows: list[Decimal], period: int = 14) -> Decimal:
    if len(closes) < period + 1:
        return Decimal("0.0005") * closes[-1] if closes else Decimal("1.0")
    tr_list = []
    for i in range(1, len(closes)):
        h, l, pc = highs[i], lows[i], closes[i-1]
        tr = max(h - l, abs(h - pc), abs(l - pc))
        tr_list.append(tr)
    return sum(tr_list[-period:]) / Decimal(str(period))

def format_with_commas(val_any: Any, decimals: int = 1) -> str:
    try:
        val_dec = Decimal(str(val_any))
        if val_dec == 0: return "0"
        return f"{val_dec:,.{decimals}f}"
    except: return str(val_any)

