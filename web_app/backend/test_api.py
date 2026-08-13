import sys
import os
OKX_TRADE_KIT_DIR = os.path.dirname(os.path.abspath(''))
sys.path.append(OKX_TRADE_KIT_DIR)

try:
    from bots.sub2.bot_api import okx_get_klines
    klines = okx_get_klines("BTC-USDT-SWAP", "4H", limit=1500)
    print(f"Got {len(klines)} klines using sub2 api!")
except Exception as e:
    print(f"Error: {e}")
