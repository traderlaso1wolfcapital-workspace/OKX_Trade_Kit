import numpy as np

def calculate_atr(highs, lows, closes, period=50):
    if len(highs) < period:
        return 0.0
    tr = np.maximum(highs - lows, np.maximum(np.abs(highs - np.roll(closes, 1)), np.abs(lows - np.roll(closes, 1))))
    tr[0] = highs[0] - lows[0]
    atr = np.zeros_like(tr)
    atr[0] = tr[0]
    for i in range(1, len(tr)):
        atr[i] = (atr[i-1] * (period - 1) + tr[i]) / period
    return atr[-1]

def find_order_block(klines, direction="Bull", window=10):
    """
    Xác định Order Block gần nhất trong dải nến gần đây.
    klines format: list of dict {'open', 'high', 'low', 'close'}
    """
    if len(klines) < window:
        return None
        
    recent_klines = klines[-window:]
    
    if direction == "Bull":
        # Bullish OB: Nến giảm (Close < Open) cuối cùng trước đợt tăng mạnh
        ob_candle = None
        ob_index = -1
        for i in range(len(recent_klines) - 2, -1, -1):
            k = recent_klines[i]
            if k['close'] < k['open']:
                ob_candle = k
                ob_index = i
                break
        if ob_candle:
            return {'top': ob_candle['high'], 'bottom': ob_candle['low'], 'index': ob_index}
            
    elif direction == "Bear":
        # Bearish OB: Nến tăng (Close > Open) cuối cùng trước đợt giảm mạnh
        ob_candle = None
        ob_index = -1
        for i in range(len(recent_klines) - 2, -1, -1):
            k = recent_klines[i]
            if k['close'] > k['open']:
                ob_candle = k
                ob_index = i
                break
        if ob_candle:
            return {'top': ob_candle['high'], 'bottom': ob_candle['low'], 'index': ob_index}
            
    return None
