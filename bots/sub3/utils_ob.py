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

def find_order_block(klines, direction="Bull", window=10, min_time=None):
    """
    Xác định Order Block gần nhất trong dải nến gần đây theo logic swing (Pine Script).
    klines format: list of dict {'open', 'high', 'low', 'close', 'timestamp'}
    """
    if len(klines) < window * 2 + 1:
        return None
        
    cur_swing = -1
    top_index = -1
    top_val = -1
    btm_index = -1
    btm_val = -1
    
    obs = []
    
    for i in range(window, len(klines)):
        target_idx = i - window
        if target_idx < 0:
            continue
            
        hi = klines[target_idx]['high']
        li = klines[target_idx]['low']
        
        upper = max(k['high'] for k in klines[i - window + 1 : i + 1])
        lower = min(k['low'] for k in klines[i - window + 1 : i + 1])
        
        st_prev = cur_swing
        if hi > upper:
            cur_swing = 0
        elif li < lower:
            cur_swing = 1
            
        if cur_swing == 0 and st_prev != 0:
            top_index = target_idx
            top_val = hi
        if cur_swing == 1 and st_prev != 1:
            btm_index = target_idx
            btm_val = li
            
        if direction == "Bull" and top_index != -1 and (i - top_index) > 1:
            box_btm = klines[top_index + 1]['low']
            box_top = klines[top_index + 1]['high']
            
            for j in range(top_index + 1, i):
                if klines[j]['low'] < box_btm:
                    box_btm = klines[j]['low']
                    box_top = klines[j]['high']
                    
            if klines[i]['close'] > top_val:
                ob = {
                    'top': box_top,
                    'bottom': box_btm,
                    'break_time': klines[i].get('timestamp', i),
                    'type': 'Bull'
                }
                obs.append(ob)
                top_index = -1 
                
        elif direction == "Bear" and btm_index != -1 and (i - btm_index) > 1:
            box_top = klines[btm_index + 1]['high']
            box_btm = klines[btm_index + 1]['low']
            
            for j in range(btm_index + 1, i):
                if klines[j]['high'] > box_top:
                    box_top = klines[j]['high']
                    box_btm = klines[j]['low']
                    
            if klines[i]['close'] < btm_val:
                ob = {
                    'top': box_top,
                    'bottom': box_btm,
                    'break_time': klines[i].get('timestamp', i),
                    'type': 'Bear'
                }
                obs.append(ob)
                btm_index = -1

    if not obs:
        return None
        
    if min_time is not None:
        obs = [ob for ob in obs if ob['break_time'] > min_time]
        
    if not obs:
        return None
        
    return obs[-1]

# z1949 | 2026-09-17: Cập nhật hàm find_order_block sử dụng thuật toán swing high/low giống bản gốc Pine Script.
