import numpy as np
from bots.sub3.utils_ob import calculate_atr, find_order_block

class LiquidationStrategy:
    def __init__(self, config=None):
        self.state = "Waiting For Bulky Candle"
        self.bulkyHigh = None
        self.bulkyLow = None
        self.overlapDirection = None
        self.ob = None
        
        self.slATRMult = 1.5
        self.DynamicRR = 2.0
        self.bulkyCandleATR = 2.1
        self.atrLenCRT = 50
        self.atrLenBulky = 10
        self.sweep_time = None
        
        self.tpslMethod = "Dynamic"
        self.fixedSlPct = 1.0
        self.fixedTpPct = 2.0
        
        if config:
            self.slATRMult = float(config.get("SL_ATR_MULT", self.slATRMult))
            self.DynamicRR = float(config.get("DYNAMIC_RR", self.DynamicRR))
            self.bulkyCandleATR = float(config.get("BULKY_ATR_MULT", self.bulkyCandleATR))
            self.atrLenBulky = int(config.get("ATR_LEN_BULKY", self.atrLenBulky))
            self.tpslMethod = config.get("TPSL_METHOD", self.tpslMethod)
            self.fixedSlPct = float(config.get("FIXED_SL_PCT", self.fixedSlPct))
            self.fixedTpPct = float(config.get("FIXED_TP_PCT", self.fixedTpPct))
        
    def reset(self):
        self.state = "Waiting For Bulky Candle"
        self.bulkyHigh = None
        self.bulkyLow = None
        self.overlapDirection = None
        self.ob = None
        self.sweep_time = None

    def get_signal(self, htf_klines, ltf_klines):
        """
        htf_klines: Danh sách nến 1H [{'open', 'high', 'low', 'close'}, ...]
        ltf_klines: Danh sách nến 5m [{'open', 'high', 'low', 'close'}, ...]
        Trả về json signal nếu vào lệnh, ngược lại None.
        """
        if len(htf_klines) < self.atrLenCRT:
            return None
            
        highs = np.array([k['high'] for k in htf_klines])
        lows = np.array([k['low'] for k in htf_klines])
        closes = np.array([k['close'] for k in htf_klines])
        atr_1h = calculate_atr(highs, lows, closes, self.atrLenBulky)
        
        # 1. Waiting For Bulky Candle
        if self.state == "Waiting For Bulky Candle":
            # Check nến đóng gần nhất
            last_htf = htf_klines[-1]
            tr = max(last_htf['high'] - last_htf['low'], 
                     abs(last_htf['high'] - htf_klines[-2]['close']), 
                     abs(last_htf['low'] - htf_klines[-2]['close']))
            
            if tr > atr_1h * self.bulkyCandleATR:
                self.bulkyHigh = last_htf['high']
                self.bulkyLow = last_htf['low']
                self.state = "Waiting For Side Retest"
                return {"status": "Found Bulky, Waiting Retest"}

        # 2. Waiting For Side Retest
        elif self.state == "Waiting For Side Retest":
            last_ltf = ltf_klines[-1]
            
            # Nếu đóng nến quá xa (bị phá vỡ hoàn toàn) -> Abort
            if last_ltf['close'] > self.bulkyHigh or last_ltf['close'] < self.bulkyLow:
                self.reset()
                return {"status": "Aborted, Reset"}
                
            # Check Sweep
            bear_overlap = last_ltf['high'] > self.bulkyHigh and last_ltf['close'] <= self.bulkyHigh
            bull_overlap = last_ltf['low'] < self.bulkyLow and last_ltf['close'] >= self.bulkyLow
            
            if bear_overlap and not bull_overlap:
                self.overlapDirection = "Bear"
                self.state = "Waiting For OB"
                self.sweep_time = last_ltf.get('timestamp', len(ltf_klines))
                return {"status": "Bearish Sweep, Waiting OB"}
                
            if bull_overlap and not bear_overlap:
                self.overlapDirection = "Bull"
                self.state = "Waiting For OB"
                self.sweep_time = last_ltf.get('timestamp', len(ltf_klines))
                return {"status": "Bullish Sweep, Waiting OB"}

        # 3. Waiting For OB
        elif self.state == "Waiting For OB":
            ob = find_order_block(ltf_klines, direction=self.overlapDirection, window=10, min_time=self.sweep_time)
            if ob:
                self.ob = ob
                self.state = "Waiting For OB Retracement"
                return {"status": "Found OB, Waiting Retracement"}

        # 4. Waiting For OB Retracement
        elif self.state == "Waiting For OB Retracement":
            last_ltf = ltf_klines[-1]
            if self.overlapDirection == "Bull":
                if last_ltf['low'] < self.ob['bottom']:
                    self.reset()
                    return {"status": "OB Invalidated, Reset"}
                elif last_ltf['low'] <= self.ob['top']:  # Giá chạm về vùng đỉnh của OB
                    self.state = "Enter Position"
            else:
                if last_ltf['high'] > self.ob['top']:
                    self.reset()
                    return {"status": "OB Invalidated, Reset"}
                elif last_ltf['high'] >= self.ob['bottom']: # Giá chạm về vùng đáy của OB
                    self.state = "Enter Position"

        # 5. Enter Position
        if self.state == "Enter Position":
            if self.overlapDirection == "Bull":
                entry_price = self.ob['top']
            else:
                entry_price = self.ob['bottom']
            
            # Tính ATR khung nhỏ để SL sát hơn
            highs_5m = np.array([k['high'] for k in ltf_klines])
            lows_5m = np.array([k['low'] for k in ltf_klines])
            closes_5m = np.array([k['close'] for k in ltf_klines])
            atr_5m = calculate_atr(highs_5m, lows_5m, closes_5m, self.atrLenCRT)
            
            if self.overlapDirection == "Bull":
                if self.tpslMethod == "Fixed":
                    sl = entry_price * (1 - self.fixedSlPct / 100.0)
                    tp = entry_price * (1 + self.fixedTpPct / 100.0)
                else:
                    sl = entry_price - (atr_5m * self.slATRMult)
                    tp = entry_price + abs(entry_price - sl) * self.DynamicRR
                    
                self.reset()
                return {"action": "LONG", "entry": entry_price, "sl": sl, "tp": tp}
            else:
                if self.tpslMethod == "Fixed":
                    sl = entry_price * (1 + self.fixedSlPct / 100.0)
                    tp = entry_price * (1 - self.fixedTpPct / 100.0)
                else:
                    sl = entry_price + (atr_5m * self.slATRMult)
                    tp = entry_price - abs(entry_price - sl) * self.DynamicRR
                    
                self.reset()
                return {"action": "SHORT", "entry": entry_price, "sl": sl, "tp": tp}
                
        return None

# z1949 | 2026-09-17: Sửa ATR(10) cho nến Bulky, track thời gian sweep để lọc OB sau sweep, và fix điều kiện Invalidate OB.
