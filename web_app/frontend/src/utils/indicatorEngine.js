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
export function calculateLiquidV5(candles) {
  if (!candles || candles.length < 5) return { fvg_boxes: [], ob_boxes: [] };
  
  const fvg_boxes = [];
  const ob_boxes = [];
  
  // 1. Tính toán FVG (Fair Value Gaps)
  for (let i = 2; i < candles.length; i++) {
    const c0 = candles[i-2];
    const c1 = candles[i-1];
    const c2 = candles[i];
    
    // Bullish FVG (c2 low > c0 high)
    if (c2.low > c0.high && c1.close > c0.high) {
      const gap = c2.low - c0.high;
      if (gap > (c0.high - c0.low) * 0.1) { // Lọc gap quá nhỏ
        fvg_boxes.push({
          type: 'bull',
          top: c2.low,
          bottom: c0.high,
          time: c1.time, // Bắt đầu từ cây nến tạo gap (c1)
          end_time: null,
          is_fvg: true,
        });
      }
    }
    
    // Bearish FVG (c2 high < c0 low)
    if (c2.high < c0.low && c1.close < c0.low) {
      const gap = c0.low - c2.high;
      if (gap > (c0.high - c0.low) * 0.1) {
        fvg_boxes.push({
          type: 'bear',
          top: c0.low,
          bottom: c2.high,
          time: c1.time,
          end_time: null,
          is_fvg: true,
        });
      }
    }
  }

  // Cập nhật trạng thái FVG bị lấp đầy (Mitigated)
  for (let f of fvg_boxes) {
    const startIndex = candles.findIndex(c => c.time === f.time);
    if (startIndex > -1) {
      for (let i = startIndex + 1; i < candles.length; i++) {
        const c = candles[i];
        if (f.type === 'bull' && c.low <= f.bottom) {
          f.end_time = c.time;
          break;
        }
        if (f.type === 'bear' && c.high >= f.top) {
          f.end_time = c.time;
          break;
        }
      }
    }
  }

  // 2. Tính toán Order Blocks (Dựa trên Swing High/Low cơ bản)
  const pivotLen = 5;
  for (let i = pivotLen; i < candles.length - pivotLen; i++) {
    let isSwingHigh = true;
    let isSwingLow = true;
    for (let j = 1; j <= pivotLen; j++) {
      if (candles[i-j].high >= candles[i].high || candles[i+j].high >= candles[i].high) isSwingHigh = false;
      if (candles[i-j].low <= candles[i].low || candles[i+j].low <= candles[i].low) isSwingLow = false;
    }
    
    if (isSwingHigh) {
      // Bearish OB (Nến xanh cuối cùng trước đợt giảm)
      for (let k = i; k >= Math.max(0, i-5); k--) {
        if (candles[k].close > candles[k].open) {
          ob_boxes.push({
            type: 'bear',
            top: candles[k].high,
            bottom: candles[k].low,
            time: candles[k].time,
            end_time: null,
            is_ob: true,
          });
          break;
        }
      }
    }
    if (isSwingLow) {
      // Bullish OB (Nến đỏ cuối cùng trước đợt tăng)
      for (let k = i; k >= Math.max(0, i-5); k--) {
        if (candles[k].close < candles[k].open) {
          ob_boxes.push({
            type: 'bull',
            top: candles[k].high,
            bottom: candles[k].low,
            time: candles[k].time,
            end_time: null,
            is_ob: true,
          });
          break;
        }
      }
    }
  }

  // Cập nhật trạng thái OB bị phá vỡ hoàn toàn
  for (let ob of ob_boxes) {
    const startIndex = candles.findIndex(c => c.time === ob.time);
    if (startIndex > -1) {
      for (let i = startIndex + 1; i < candles.length; i++) {
        const c = candles[i];
        if (ob.type === 'bull' && c.close < ob.bottom) { // Bị phá xuống
          ob.end_time = c.time;
          break;
        }
        if (ob.type === 'bear' && c.close > ob.top) { // Bị phá lên
          ob.end_time = c.time;
          break;
        }
      }
    }
  }
  // 3. Lọc theo chuẩn TLS1 Charts_Liquid v5:
  // - Chỉ giữ các khối ĐANG CÒN HIỆU LỰC (unmitigated, end_time == null)
  // - showLastXFVGs = 2 (tối đa 2 Bull FVG & 2 Bear FVG mới nhất)
  // - maxOrderBlocks = 5 (tối đa 3 Bull OB & 3 Bear OB mới nhất)
  const activeBullFVG = fvg_boxes.filter(f => f.type === 'bull' && !f.end_time).slice(-2);
  const activeBearFVG = fvg_boxes.filter(f => f.type === 'bear' && !f.end_time).slice(-2);
  const activeBullOB = ob_boxes.filter(o => o.type === 'bull' && !o.end_time).slice(-3);
  const activeBearOB = ob_boxes.filter(o => o.type === 'bear' && !o.end_time).slice(-3);

  return {
    fvg_boxes: [...activeBullFVG, ...activeBearFVG],
    ob_boxes: [...activeBullOB, ...activeBearOB]
  };
}

