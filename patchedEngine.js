// Engine Tính Toán Chỉ Báo Kỹ Thuật & Môi Trường Viết Script Cho Coder (TLS1 Trading Engine)

/**
 * Tính toán Simple Moving Average (SMA)
 */
export function calculateSMA(candles, period, source = "close") {
  if (!candles || candles.length < period) return [];
  const result = [];
  let sum = 0;

  for (let i = 0; i < candles.length; i++) {
    const val = typeof candles[i] === "number" ? candles[i] : candles[i][source];
    sum += val;
    if (i >= period) {
      const prevVal = typeof candles[i - period] === "number" ? candles[i - period] : candles[i - period][source];
      sum -= prevVal;
    }
    if (i >= period - 1) {
      result.push({
        time: candles[i].time || i,
        value: parseFloat((sum / period).toFixed(4))
      });
    }
  }
  return result;
}

/**
 * Tính toán Exponential Moving Average (EMA)
 */
export function calculateEMA(candles, period, source = "close") {
  if (!candles || candles.length === 0) return [];
  const result = [];
  const k = 2 / (period + 1);
  let prevEma = null;

  for (let i = 0; i < candles.length; i++) {
    const val = typeof candles[i] === "number" ? candles[i] : candles[i][source];
    if (i === 0) {
      prevEma = val;
    } else {
      prevEma = val * k + prevEma * (1 - k);
    }
    if (i >= Math.min(period - 1, 10)) {
      result.push({
        time: candles[i].time || i,
        value: parseFloat(prevEma.toFixed(4))
      });
    }
  }
  return result;
}

/**
 * Tính toán Relative Strength Index (RSI - 14)
 */
export function calculateRSI(candles, period = 14) {
  if (!candles || candles.length <= period) return [];
  const result = [];
  let gains = 0;
  let losses = 0;

  // Khởi tạo bình quân tăng/giảm ban đầu
  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  const firstRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: candles[period].time,
    value: parseFloat((100 - (100 / (1 + firstRs))).toFixed(2))
  });

  // Tính RSI smoothed theo công thức chuẩn Wilder's RSI
  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff >= 0 ? diff : 0;
    const loss = diff < 0 ? Math.abs(diff) : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = avgLoss === 0 ? 100 : 100 - (100 / (1 + rs));

    result.push({
      time: candles[i].time,
      value: parseFloat(rsi.toFixed(2))
    });
  }
  return result;
}

/**
 * Tính toán Bollinger Bands (BB - 20, 2)
 */
export function calculateBollingerBands(candles, period = 20, multiplier = 2) {
  if (!candles || candles.length < period) return { upper: [], basis: [], lower: [] };
  const upper = [];
  const basis = [];
  const lower = [];

  for (let i = period - 1; i < candles.length; i++) {
    const slice = candles.slice(i - period + 1, i + 1);
    const sum = slice.reduce((acc, c) => acc + c.close, 0);
    const mean = sum / period;

    const variance = slice.reduce((acc, c) => acc + Math.pow(c.close - mean, 2), 0) / period;
    const stdDev = Math.sqrt(variance);

    const time = candles[i].time;
    basis.push({ time, value: parseFloat(mean.toFixed(4)) });
    upper.push({ time, value: parseFloat((mean + stdDev * multiplier).toFixed(4)) });
    lower.push({ time, value: parseFloat((mean - stdDev * multiplier).toFixed(4)) });
  }

  return { upper, basis, lower };
}

/**
 * Tính toán MACD (12, 26, 9)
 */
export function calculateMACD(candles, fast = 12, slow = 26, signalPeriod = 9) {
  if (!candles || candles.length < slow) return { macd: [], signal: [], histogram: [] };

  const fastEma = calculateEMA(candles, fast);
  const slowEma = calculateEMA(candles, slow);

  const slowMap = new Map(slowEma.map(item => [item.time, item.value]));
  const macdRaw = [];

  for (const f of fastEma) {
    if (slowMap.has(f.time)) {
      const slowVal = slowMap.get(f.time);
      macdRaw.push({
        time: f.time,
        close: f.value - slowVal // Lưu để tính EMA signal
      });
    }
  }

  const signalRaw = calculateEMA(macdRaw, signalPeriod);
  const signalMap = new Map(signalRaw.map(item => [item.time, item.value]));

  const macd = [];
  const signal = [];
  const histogram = [];

  for (const m of macdRaw) {
    const time = m.time;
    const macdVal = parseFloat(m.close.toFixed(4));
    macd.push({ time, value: macdVal });

    if (signalMap.has(time)) {
      const sigVal = parseFloat(signalMap.get(time).toFixed(4));
      signal.push({ time, value: sigVal });
      const histVal = parseFloat((macdVal - sigVal).toFixed(4));
      histogram.push({
        time,
        value: histVal,
        color: histVal >= 0 ? "rgba(38, 166, 154, 0.7)" : "rgba(239, 83, 80, 0.7)"
      });
    }
  }

  return { macd, signal, histogram };
}

/**
 * Tính toán SuperTrend (ATR 10, Multiplier 3)
 */
export function calculateSuperTrend(candles, period = 10, multiplier = 3) {
  if (!candles || candles.length <= period) return [];
  const result = [];

  // Tính True Range (TR)
  const tr = [];
  for (let i = 0; i < candles.length; i++) {
    if (i === 0) {
      tr.push(candles[i].high - candles[i].low);
    } else {
      const hl = candles[i].high - candles[i].low;
      const hc = Math.abs(candles[i].high - candles[i - 1].close);
      const lc = Math.abs(candles[i].low - candles[i - 1].close);
      tr.push(Math.max(hl, hc, lc));
    }
  }

  // Smooth ATR
  let atr = tr.slice(0, period).reduce((a, b) => a + b, 0) / period;
  let upperBand = 0;
  let lowerBand = 0;
  let inUptrend = true;

  for (let i = period; i < candles.length; i++) {
    atr = (atr * (period - 1) + tr[i]) / period;
    const c = candles[i];
    const prevC = candles[i - 1];
    const hl2 = (c.high + c.low) / 2;

    let basicUpper = hl2 + multiplier * atr;
    let basicLower = hl2 - multiplier * atr;

    upperBand = (basicUpper < upperBand || prevC.close > upperBand) ? basicUpper : upperBand;
    lowerBand = (basicLower > lowerBand || prevC.close < lowerBand) ? basicLower : lowerBand;

    if (inUptrend && c.close < lowerBand) {
      inUptrend = false;
    } else if (!inUptrend && c.close > upperBand) {
      inUptrend = true;
    }

    result.push({
      time: c.time,
      value: parseFloat((inUptrend ? lowerBand : upperBand).toFixed(4)),
      color: inUptrend ? "#26a69a" : "#ef5350",
      inUptrend
    });
  }

  return result;
}

/**
 * Môi Trường Thực Thi Script Cho Coder (Custom Scripting Sandbox)
 * Cho phép coder lập trình chỉ báo tự do như Pine Script
 */
export function runCoderCustomScript(scriptCode, candles) {
  if (!candles || candles.length === 0) {
    return { success: false, error: "Dữ liệu nến trống" };
  }

  const plots = [];

  // API trợ giúp dành cho Coder
  const api = {
    candles,
    close: candles.map(c => c.close),
    open: candles.map(c => c.open),
    high: candles.map(c => c.high),
    low: candles.map(c => c.low),
    volume: candles.map(c => c.volume || 0),
    time: candles.map(c => c.time),

    // Các hàm toán học & chỉ báo sẵn
    sma: (src, period) => {
      const arr = Array.isArray(src) ? src : candles.map(c => c[src] || c.close);
      const res = [];
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
        if (i >= period) sum -= arr[i - period];
        if (i >= period - 1) res.push({ time: candles[i].time, value: sum / period });
      }
      return res;
    },

    ema: (src, period) => {
      const arr = Array.isArray(src) ? src : candles.map(c => c[src] || c.close);
      const res = [];
      const k = 2 / (period + 1);
      let prev = arr[0];
      for (let i = 0; i < arr.length; i++) {
        prev = i === 0 ? arr[i] : arr[i] * k + prev * (1 - k);
        if (i >= Math.min(period - 1, 10)) res.push({ time: candles[i].time, value: prev });
      }
      return res;
    },

    highest: (src, period) => {
      const arr = Array.isArray(src) ? src : candles.map(c => c[src] || c.high);
      const res = [];
      for (let i = period - 1; i < arr.length; i++) {
        let max = -Infinity;
        for (let j = i - period + 1; j <= i; j++) if (arr[j] > max) max = arr[j];
        res.push({ time: candles[i].time, value: max });
      }
      return res;
    },

    lowest: (src, period) => {
      const arr = Array.isArray(src) ? src : candles.map(c => c[src] || c.low);
      const res = [];
      for (let i = period - 1; i < arr.length; i++) {
        let min = Infinity;
        for (let j = i - period + 1; j <= i; j++) if (arr[j] < min) min = arr[j];
        res.push({ time: candles[i].time, value: min });
      }
      return res;
    },

    // Hàm xuất series vẽ lên chart
    plot: (name, seriesData, options = {}) => {
      if (!Array.isArray(seriesData)) return;
      plots.push({
        name: name || "Plot",
        data: seriesData.map(d => ({
          time: d.time,
          value: parseFloat(d.value.toFixed(4))
        })),
        color: options.color || "#2962ff",
        lineWidth: options.lineWidth || 2,
        type: options.type || "line"
      });
    }
  };

  try {
    // Thực thi code trong scope an toàn
    const fn = new Function("api", "candles", "plot", "ema", "sma", "highest", "lowest", `
      with (api) {
        ${scriptCode}
      }
    `);
    fn(api, candles, api.plot, api.ema, api.sma, api.highest, api.lowest);
    return { success: true, plots, error: null };
  } catch (err) {
    console.warn("Lỗi thực thi script coder:", err);
    return { success: false, plots: [], error: err.message };
  }
}

/**
 * Tính toán TLS1 Charts_Liquid v5 (Ported - Core Logic)
 * Trả về danh sách Fair Value Gaps (FVG) và Order Blocks (OB)
 */
export function calculateLiquidV5(candles, options = {}) {
  const {
    atrLen = 10,
    bulkyCandleATR = 2.1,
    fvgSensitivity = 1.5,
    swingLength = 10,
    atrLenCRT = 50,
    slATRMult = 6.5,
    dynamicRR = 0.39,
    entryMode = 'FVGs', 
    requireRetracement = false,
    tpslMethod = 'Dynamic',
    tpPercent = 0.3,
    slPercent = 0.4,
  } = options;

  const fvg_boxes = [];
  const ob_boxes = [];
  const crt_lines = [];
  const crt_labels = [];
  const alerts = [];

  if (!candles || candles.length < Math.max(atrLen, swingLength, atrLenCRT) + 5) {
    return { fvg_boxes, ob_boxes, crt_lines, crt_labels, alerts };
  }

  // 1. Calculate TR and ATR
  const tr = new Array(candles.length).fill(0);
  const atr = new Array(candles.length).fill(0);
  const atrCRT = new Array(candles.length).fill(0);

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (i === 0) {
      tr[i] = c.high - c.low;
      atr[i] = tr[i];
      atrCRT[i] = tr[i];
    } else {
      const pc = candles[i - 1];
      tr[i] = Math.max(c.high - c.low, Math.abs(c.high - pc.close), Math.abs(c.low - pc.close));
      atr[i] = (atr[i - 1] * (atrLen - 1) + tr[i]) / atrLen;
      atrCRT[i] = (atrCRT[i - 1] * (atrLenCRT - 1) + tr[i]) / atrLenCRT;
    }
  }

  // 2. State & Variables
  let FVGInfoList = [];
  let orderBlockInfoList = [];
  let crtList = [];
  let lastCRT = null;
  let lastHigh = null;
  let lastLow = null;

  for (let i = Math.max(atrLen, swingLength); i < candles.length; i++) {
    const c = candles[i];
    const c1 = candles[i - 1];
    const c2 = candles[i - 2];
    
    let newBulkyCandle = false;
    
    // Trigger bulky candle if the current candle itself is massive 
    if (tr[i] > atr[i] * bulkyCandleATR * 2) {
      newBulkyCandle = true;
      lastHigh = c.high;
      lastLow = c.low;
    }

    // -- FVG Detection --
    const bearCondition = (Math.abs(c2.low - c.high) * fvgSensitivity > atr[i] / 1.5);
    const bullCondition = (Math.abs(c.low - c2.high) * fvgSensitivity > atr[i] / 1.5);
    
    const bearFVG = c.high < c2.low && c1.close < c2.low && bearCondition;
    const bullFVG = c.low > c2.high && c1.close > c2.high && bullCondition;

    if (bearFVG) {
      FVGInfoList.unshift({
        type: 'bear',
        max: c2.low,
        min: c.high,
        time: c1.time,
        end_time: null,
        is_fvg: true,
      });
    } else if (bullFVG) {
      FVGInfoList.unshift({
        type: 'bull',
        max: c.low,
        min: c2.high,
        time: c1.time,
        end_time: null,
        is_fvg: true,
      });
    }

    for (let f of FVGInfoList) {
      if (!f.end_time) {
        if (f.type === 'bull' && c.close < f.min) f.end_time = c.time;
        else if (f.type === 'bear' && c.close > f.max) f.end_time = c.time;
      }
    }

    // -- Order Blocks --
    let isSwingHigh = true;
    let isSwingLow = true;
    if (i >= swingLength * 2) {
      let pivotIndex = i - swingLength;
      let pivotC = candles[pivotIndex];
      for (let j = 1; j <= swingLength; j++) {
        if (candles[pivotIndex - j].high >= pivotC.high || candles[pivotIndex + j].high >= pivotC.high) isSwingHigh = false;
        if (candles[pivotIndex - j].low <= pivotC.low || candles[pivotIndex + j].low <= pivotC.low) isSwingLow = false;
      }
      
      if (isSwingHigh) {
        let boxBtmBear = candles[pivotIndex].low;
        let boxTopBear = candles[pivotIndex].high;
        for (let k = 1; k < 5; k++) {
           boxTopBear = Math.max(candles[pivotIndex - k].high, boxTopBear);
           boxBtmBear = boxTopBear === candles[pivotIndex - k].high ? candles[pivotIndex - k].low : boxBtmBear;
        }
        orderBlockInfoList.unshift({ type: 'bear', top: boxTopBear, bottom: boxBtmBear, time: pivotC.time, end_time: null, is_ob: true });
      }
      if (isSwingLow) {
        let boxBtmBull = candles[pivotIndex].high;
        let boxTopBull = candles[pivotIndex].low;
        for (let k = 1; k < 5; k++) {
           boxBtmBull = Math.min(candles[pivotIndex - k].low, boxBtmBull);
           boxTopBull = boxBtmBull === candles[pivotIndex - k].low ? candles[pivotIndex - k].high : boxTopBull;
        }
        orderBlockInfoList.unshift({ type: 'bull', top: boxTopBull, bottom: boxBtmBull, time: pivotC.time, end_time: null, is_ob: true });
      }
    }
    
    for (let ob of orderBlockInfoList) {
      if (!ob.end_time) {
        if (ob.type === 'bull' && c.close < ob.bottom) ob.end_time = c.time;
        else if (ob.type === 'bear' && c.close > ob.top) ob.end_time = c.time;
      }
    }

    // -- CRT Logic --
    let createNewCRT = true;
    if (lastCRT && !lastCRT.exitPrice && lastCRT.state !== 'Aborted') {
      createNewCRT = false;
    }
    if (createNewCRT) {
      lastCRT = { state: 'Waiting For Bulky Candle', startTime: c.time };
      crtList.unshift(lastCRT);
    }

    if (lastCRT) {
      if (lastCRT.state === 'Waiting For Bulky Candle' && newBulkyCandle) {
        lastCRT.bulkyHigh = lastHigh;
        lastCRT.bulkyLow = lastLow;
        lastCRT.state = 'Waiting For Side Retest'; global.logState('Waiting For Side Retest');
      } else if (lastCRT.state === 'Waiting For Side Retest') {
        if (c.close > lastCRT.bulkyHigh || c.close < lastCRT.bulkyLow) {
          lastCRT.state = 'Aborted'; global.logState('Aborted');
        } else {
          let bearOverlap = c.high > lastCRT.bulkyHigh && c.close <= lastCRT.bulkyHigh;
          let bullOverlap = c.low < lastCRT.bulkyLow && c.close >= lastCRT.bulkyLow;
          
          if (bearOverlap && !bullOverlap) {
            lastCRT.overlapDirection = 'Bear';
            lastCRT.breakTime = c.time;
            lastCRT.state = entryMode === 'FVGs' ? 'Waiting For FVG' : 'Waiting For OB';
          }
          if (bullOverlap && !bearOverlap) {
            lastCRT.overlapDirection = 'Bull';
            lastCRT.breakTime = c.time;
            lastCRT.state = entryMode === 'FVGs' ? 'Waiting For FVG' : 'Waiting For OB';
          }
        }
      }
      
      if (lastCRT.state === 'Waiting For FVG') {
        let latestFVG = FVGInfoList[0];
        if (latestFVG && latestFVG.time >= lastCRT.breakTime) {
          if (lastCRT.overlapDirection === 'Bear' && latestFVG.type === 'bear') {
            lastCRT.fvg = latestFVG;
            lastCRT.state = requireRetracement ? 'Waiting For FVG Retracement' : 'Enter Position';
          } else if (lastCRT.overlapDirection === 'Bull' && latestFVG.type === 'bull') {
            lastCRT.fvg = latestFVG;
            lastCRT.state = requireRetracement ? 'Waiting For FVG Retracement' : 'Enter Position';
          }
        }
      } else if (lastCRT.state === 'Waiting For OB') {
        let latestOB = orderBlockInfoList[0];
        if (latestOB && latestOB.time >= lastCRT.breakTime) {
          if (lastCRT.overlapDirection === 'Bear' && latestOB.type === 'bear') {
            lastCRT.ob = latestOB;
            lastCRT.state = requireRetracement ? 'Waiting For OB Retracement' : 'Enter Position';
          } else if (lastCRT.overlapDirection === 'Bull' && latestOB.type === 'bull') {
            lastCRT.ob = latestOB;
            lastCRT.state = requireRetracement ? 'Waiting For OB Retracement' : 'Enter Position';
          }
        }
      }
      
      if (lastCRT.state === 'Waiting For FVG Retracement') {
        if (lastCRT.fvg.type === 'bull' && c.low <= lastCRT.fvg.max) lastCRT.state = 'Enter Position'; global.logState('Enter Position');
        if (lastCRT.fvg.type === 'bear' && c.high >= lastCRT.fvg.min) lastCRT.state = 'Enter Position'; global.logState('Enter Position');
      }
      
      if (lastCRT.state === 'Waiting For OB Retracement') {
        if (lastCRT.ob.type === 'bull' && c.low <= lastCRT.ob.top) lastCRT.state = 'Enter Position'; global.logState('Enter Position');
        if (lastCRT.ob.type === 'bear' && c.high >= lastCRT.ob.bottom) lastCRT.state = 'Enter Position'; global.logState('Enter Position');
      }

      if (lastCRT.state === 'Enter Position') {
        lastCRT.state = 'Entry Taken'; global.logState('Entry Taken');
        lastCRT.entryTime = c.time;
        lastCRT.entryPrice = c.close;
        lastCRT.entry2Hit = false;

        if (lastCRT.overlapDirection === 'Bull') {
          lastCRT.entryType = 'Long';
          if (tpslMethod === 'Fixed') {
            lastCRT.slTarget = lastCRT.entryPrice * (1 - slPercent / 100);
            lastCRT.tpTarget = lastCRT.entryPrice * (1 + tpPercent / 100);
          } else {
            lastCRT.slTarget = lastCRT.entryPrice - atrCRT[i] * slATRMult;
            lastCRT.tpTarget = lastCRT.entryPrice + (Math.abs(lastCRT.entryPrice - lastCRT.slTarget) * dynamicRR);
          }
        } else {
          lastCRT.entryType = 'Short';
          if (tpslMethod === 'Fixed') {
            lastCRT.slTarget = lastCRT.entryPrice * (1 + slPercent / 100);
            lastCRT.tpTarget = lastCRT.entryPrice * (1 - tpPercent / 100);
          } else {
            lastCRT.slTarget = lastCRT.entryPrice + atrCRT[i] * slATRMult;
            lastCRT.tpTarget = lastCRT.entryPrice - (Math.abs(lastCRT.entryPrice - lastCRT.slTarget) * dynamicRR);
          }
        }
        lastCRT.entry2Price = lastCRT.entryPrice + (lastCRT.slTarget - lastCRT.entryPrice) * (2 / 3);
        
        alerts.push({ event: 'ENTRY', side: lastCRT.entryType.toUpperCase(), entry1: lastCRT.entryPrice, entry2: lastCRT.entry2Price, sl: lastCRT.slTarget, tp: lastCRT.tpTarget, time: c.time });
      }

      if (lastCRT.state === 'Entry Taken' && c.time > lastCRT.entryTime) {
        if (!lastCRT.entry2Hit) {
          if (lastCRT.entryType === 'Long' && c.low <= lastCRT.entry2Price) {
            lastCRT.entry2Hit = true;
            alerts.push({ event: 'ENTRY2_HIT', side: 'LONG', time: c.time });
          }
          if (lastCRT.entryType === 'Short' && c.high >= lastCRT.entry2Price) {
            lastCRT.entry2Hit = true;
            alerts.push({ event: 'ENTRY2_HIT', side: 'SHORT', time: c.time });
          }
        }

        if (lastCRT.entryType === 'Long') {
          if (c.high >= lastCRT.tpTarget) {
            lastCRT.exitPrice = lastCRT.tpTarget;
            lastCRT.exitTime = c.time;
            lastCRT.state = 'Take Profit'; global.logState('Take Profit');
            alerts.push({ event: 'TP_HIT', side: 'LONG', time: c.time });
          } else if (c.low <= lastCRT.slTarget) {
            lastCRT.exitPrice = lastCRT.slTarget;
            lastCRT.exitTime = c.time;
            lastCRT.state = 'Stop Loss'; global.logState('Stop Loss');
            alerts.push({ event: 'SL_HIT', side: 'LONG', time: c.time });
          }
        } else {
          if (c.low <= lastCRT.tpTarget) {
            lastCRT.exitPrice = lastCRT.tpTarget;
            lastCRT.exitTime = c.time;
            lastCRT.state = 'Take Profit'; global.logState('Take Profit');
            alerts.push({ event: 'TP_HIT', side: 'SHORT', time: c.time });
          } else if (c.high >= lastCRT.slTarget) {
            lastCRT.exitPrice = lastCRT.slTarget;
            lastCRT.exitTime = c.time;
            lastCRT.state = 'Stop Loss'; global.logState('Stop Loss');
            alerts.push({ event: 'SL_HIT', side: 'SHORT', time: c.time });
          }
        }
      }
    }
  }

  const limitFVG = FVGInfoList.slice(0, 2);
  for (let f of limitFVG) {
    if (!f.end_time || f.end_time > candles[candles.length - 100]?.time) {
      fvg_boxes.push({
        type: f.type,
        top: f.max,
        bottom: f.min,
        time: f.time,
        end_time: f.end_time,
        is_fvg: true
      });
    }
  }

  const limitOB = orderBlockInfoList.slice(0, 5);
  for (let ob of limitOB) {
    if (!ob.end_time || ob.end_time > candles[candles.length - 100]?.time) {
      ob_boxes.push({
        type: ob.type,
        top: ob.top,
        bottom: ob.bottom,
        time: ob.time,
        end_time: ob.end_time,
        is_ob: true
      });
    }
  }

  let wins = 0;
  let losses = 0;
  let totalProfit = 0;
  let totalEntries = 0;

  for (let crt of crtList) {
    if (crt.state === 'Take Profit' || crt.state === 'Stop Loss') {
      totalEntries++;
      let profit = 0;
      if (crt.entryType === 'Long') {
         profit = (crt.exitPrice - crt.entryPrice) / crt.entryPrice;
      } else {
         profit = (crt.entryPrice - crt.exitPrice) / crt.entryPrice;
      }
      
      if (profit > 0) wins++;
      else losses++;
      
      totalProfit += profit;
    }
  }
  
  let winrate = totalEntries > 0 ? (wins / totalEntries) * 100 : 0;
  let avgProfit = totalEntries > 0 ? (totalProfit / totalEntries) * 100 : 0;

  const stats = {
    totalEntries,
    wins,
    losses,
    winrate: winrate.toFixed(2),
    avgProfit: avgProfit.toFixed(2),
    totalProfit: (totalProfit * 100).toFixed(2)
  };

  const limitCRT = crtList.slice(0, 20);
  for (let crt of limitCRT) {
    if (crt.entryTime && crt.tpTarget && crt.slTarget) {
      const eTime = crt.exitTime || candles[candles.length - 1].time;
      
      crt_lines.push({ start_time: crt.entryTime, end_time: eTime, price: crt.entryPrice, color: '#ff9800', type: 'solid', tag: 'Entry 1%' });
      crt_lines.push({ start_time: crt.entryTime, end_time: eTime, price: crt.entry2Price, color: '#ff9800', type: 'dashed', tag: 'Entry 2%' });
      
      const highColor = '#089981';
      const lowColor = '#f23646';
      
      crt_lines.push({ start_time: crt.entryTime, end_time: eTime, price: crt.tpTarget, color: highColor, type: 'dashed', tag: 'TP' });
      crt_lines.push({ start_time: crt.entryTime, end_time: eTime, price: crt.slTarget, color: lowColor, type: 'dashed', tag: 'SL' });
      
      crt_labels.push({ time: eTime, price: crt.tpTarget, text: 'TP', color: highColor, bg: 'rgba(8,153,129,0.5)' });
      crt_labels.push({ time: eTime, price: crt.slTarget, text: 'SL', color: lowColor, bg: 'rgba(242,54,70,0.5)' });
      
      let entryY = crt.entryType === 'Long' ? Math.min(crt.entryPrice, Math.min(crt.slTarget, crt.tpTarget)) : Math.max(crt.entryPrice, Math.max(crt.slTarget, crt.tpTarget));
      crt_labels.push({ time: crt.entryTime, price: entryY, text: crt.entryType.toUpperCase(), color: crt.entryType === 'Long' ? highColor : lowColor, bg: 'rgba(30,34,45,0.8)' });
    }
  }

  return { fvg_boxes, ob_boxes, crt_lines, crt_labels, alerts, stats };
}

