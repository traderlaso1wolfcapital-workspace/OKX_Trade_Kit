import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import "./App.css";

const COIN_LIST = [
  { label: "BTC-USDT", value: "BTC-USDT-SWAP" },
  { label: "ETH-USDT", value: "ETH-USDT-SWAP" },
  { label: "XAU-USDT", value: "XAU-USDT-SWAP" },
  { label: "USDT.D", value: "USDT.D" },
  { label: "SOL-USDT", value: "SOL-USDT-SWAP" },
  { label: "XRP-USDT", value: "XRP-USDT-SWAP" },
];
const TF_LIST = ["1m", "5m", "15m", "30m", "1H", "2H", "4H", "1D"];
const BOT_TFS = ["M5", "M15", "M30", "H1", "H2", "H4"];

const calculateEMA = (data, period) => {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let emaData = [];
  let sum = 0;
  for (let i = 0; i < period; i++) sum += data[i].close;
  let prevEma = sum / period;
  emaData.push({ time: data[period - 1].time, value: prevEma });
  for (let i = period; i < data.length; i++) {
    const cur = (data[i].close - prevEma) * k + prevEma;
    emaData.push({ time: data[i].time, value: cur });
    prevEma = cur;
  }
  return emaData;
};

// ToggleSwitch component giống Desktop App
function ToggleSwitch({ checked, onChange, labelOn = "ON", labelOff = "OFF" }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
      <span className="toggle-label">{checked ? labelOn : labelOff}</span>
    </label>
  );
}

// SpinBox component có hậu tố (ví dụ: %) và nút tăng giảm thoáng đãng
function NumberSpinBox({ value, onChange, min = 0, max, step = 1, suffix = "", width = "90px" }) {
  const handleStep = (delta) => {
    const cur = parseFloat(value || 0);
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    let next = parseFloat((cur + delta).toFixed(decimals));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next.toString());
  };

  return (
    <div className="spinbox-container" style={{ width }}>
      <input
        type="number"
        className="spinbox-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        onKeyDown={e => {
          if (e.key === "ArrowUp") { e.preventDefault(); handleStep(step); }
          if (e.key === "ArrowDown") { e.preventDefault(); handleStep(-step); }
        }}
      />
      <span
        className="spinbox-suffix"
        style={{ visibility: suffix ? "visible" : "hidden" }}
        aria-hidden={!suffix}
      >
        {suffix || "%"}
      </span>
      <div className="spinbox-stepper">
        <button type="button" tabIndex={-1} className="spinbox-btn" onClick={() => handleStep(step)} title="Tăng">▲</button>
        <button type="button" tabIndex={-1} className="spinbox-btn" onClick={() => handleStep(-step)} title="Giảm">▼</button>
      </div>
    </div>
  );
}

// TradingView Layout Icons
const renderLayoutIcon = (type, w = 24, h = 24) => {
  if (type === "1") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="3" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "2-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="15" y="3" width="10" height="22" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "2-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
        <rect x="3" y="15" width="22" height="10" rx="2" stroke="currentColor" strokeWidth="2" />
      </svg>
    );
  }
  if (type === "3-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="2.5" y="3" width="6.5" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="10.75" y="3" width="6.5" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="19" y="3" width="6.5" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === "3-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="2.5" width="22" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="10.75" width="22" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="19" width="22" height="6.5" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  if (type === "4-grid") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="15" y="3" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="3" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
        <rect x="15" y="15" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    );
  }
  return null;
};

// Module-level global candle cache across all chart panes and layout transitions
const _webCandlesCache = new Map(); // key: `${coin}_${bar}` -> { candles, volume, ema, ob_boxes, timestamp }

// Component Biểu Đồ Nến Độc Lập (SingleChartPane)
function SingleChartPane({
  chartIndex,
  coin,
  tf,
  onChangeCoin,
  onChangeTf,
  isActive,
  onActivate,
  showToolbar = true,
  layout,
  isVisible = true,
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const overlayRef = useRef(null);
  const activeObsRef = useRef([]);
  const candlesRef = useRef([]);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const [isLogScale, setIsLogScale] = useState(false);

  // Mặc định zoom nến to (khoảng 30-80 cây nến, cách viền phải 5-10 cây nến)
  const applyDefaultZoom = () => {
    if (!chartRef.current || !candlesRef.current || candlesRef.current.length === 0) return;
    const total = candlesRef.current.length;
    const candleCount = 55; // 30-80 cây nến (50-60 nến là kích thước to rõ đẹp)
    const rightOffset = 8;  // Cách viền phải 5-10 cây nến cho thoáng
    try {
      // Luôn ép nến và trục giá Y (Price Scale) tự động co giãn về đúng tâm màn hình
      chartRef.current.timeScale().fitContent();
      chartRef.current.priceScale('right').applyOptions({ autoScale: true });
      if (candleSeriesRef.current) {
        candleSeriesRef.current.priceScale().applyOptions({ autoScale: true });
      }
      // Ép trục thời gian X hiển thị 55 cây nến mới nhất tới thời điểm hiện tại
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, total - candleCount),
        to: total - 1 + rightOffset,
      });
    } catch (e) {}
  };

  const drawObs = () => {
    const obs = activeObsRef.current;
    const c = chartRef.current;
    const s = candleSeriesRef.current;
    const o = overlayRef.current;
    const cont = containerRef.current;
    if (!obs || !c || !s || !o || !cont || obs.length === 0) {
      if (o) o.innerHTML = "";
      return;
    }
    o.innerHTML = "";
    const w = o.clientWidth || cont.clientWidth;
    if (w <= 0) return;
    const maxRightX = w - 65;

    obs.forEach(ob => {
      const y1 = s.priceToCoordinate(ob.high);
      const y2 = s.priceToCoordinate(ob.low);
      if (y1 === null || y2 === null) return;
      const topY = Math.min(y1, y2);
      const botY = Math.max(y1, y2);
      const h = Math.max(botY - topY, 4);
      const isBull = ob.bias === 1;

      let startX = null;
      if (ob.time && ob.time > 0) {
        try {
          const secTime = ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time;
          const xCoord = c.timeScale().timeToCoordinate(secTime);
          if (xCoord !== null) startX = Math.floor(xCoord);
        } catch (e) { }
      }

      if (startX === null) startX = 0;
      if (startX < -2000) startX = -2000;
      if (startX >= maxRightX) return;

      const boxWidth = maxRightX - startX;
      if (boxWidth <= 0) return;

      const bg = isBull ? 'rgba(21, 101, 192, 0.2)' : 'rgba(198, 40, 40, 0.2)';
      const box = document.createElement('div');
      box.style.position = 'absolute';
      box.style.top = topY + 'px';
      box.style.left = startX + 'px';
      box.style.width = boxWidth + 'px';
      box.style.height = h + 'px';
      box.style.backgroundColor = bg;
      box.style.pointerEvents = 'none';
      o.appendChild(box);
    });
  };

  // Khởi tạo Chart
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 300,
      height: containerRef.current.clientHeight || 200,
      layout: { background: { type: 'solid', color: '#0c0c0c' }, textColor: '#787b86', attributionLogo: false },
      grid: {
        vertLines: { color: 'rgba(42, 46, 57, 0.4)' },
        horzLines: { color: 'rgba(42, 46, 57, 0.4)' }
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(160, 165, 180, 0.45)',
          width: 1,
          style: 3,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: '#2a2e39',
        },
        horzLine: {
          color: 'rgba(160, 165, 180, 0.45)',
          width: 1,
          style: 3,
          visible: true,
          labelVisible: true,
          labelBackgroundColor: '#2a2e39',
        },
      },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 8, barSpacing: 12, minBarSpacing: 3, borderColor: '#2a2e39' },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    const es = chart.addSeries(LineSeries, {
      color: "rgba(220,220,220,0.8)", lineWidth: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      autoscaleInfoProvider: () => null,
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350",
      autoscaleInfoProvider: (original) => {
        const res = original();
        if (!res || !res.priceRange) return res;

        let min = res.priceRange.minValue;
        let max = res.priceRange.maxValue;
        if (typeof min !== 'number' || typeof max !== 'number' || max <= min) return res;

        const candles = candlesRef.current;
        if (!candles || candles.length === 0) return res;

        const lastCandle = candles[candles.length - 1];
        const currentPrice = lastCandle ? lastCandle.close : null;
        if (typeof currentPrice !== 'number' || isNaN(currentPrice)) return res;

        // Chỉ áp dụng khi người dùng đang xem nến hiện tại (không scroll sâu về quá khứ)
        try {
          const lr = chartRef.current ? chartRef.current.timeScale().getVisibleLogicalRange() : null;
          if (lr && lr.to < (candles.length - 15)) {
            return res; // Đang soi lịch sử nến xa thì hiển thị co giãn tự nhiên
          }
        } catch (e) {}

        const range = max - min;
        const pos = (currentPrice - min) / range; // 0.0 (đáy) -> 1.0 (đỉnh), 0.50 là tâm chính giữa

        // Vùng giữa: Giữ đường giá hiện tại luôn ở khoảng giữa chart (biên xê dịch 0% - 20% từ tâm)
        // Vùng dao động tự nhiên cho phép: từ 38% đến 62% chiều cao chart (tương ứng tâm 50% ± 12%)
        const minAllowedPos = 0.38;
        const maxAllowedPos = 0.62;

        if (pos < minAllowedPos) {
          // Giá tụt xuống dưới 38%, mở rộng đáy đối diện để đưa giá hiện tại về tâm 50%
          min = currentPrice - (max - currentPrice);
        } else if (pos > maxAllowedPos) {
          // Giá đẩy lên trên 62%, mở rộng đỉnh đối diện để đưa giá hiện tại về tâm 50%
          max = currentPrice + (currentPrice - min);
        }

        return {
          priceRange: {
            minValue: min,
            maxValue: max,
          },
          margins: res.margins,
        };
      },
    });

    const vs = chart.addSeries(HistogramSeries, {
      color: '#26a69a',
      priceFormat: { type: 'volume' },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = cs;
    volumeSeriesRef.current = vs;
    emaSeriesRef.current = es;

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => drawObs());

    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current && entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          chartRef.current.applyOptions({ width, height });
          drawObs();
          if (isAutoFit) {
            applyDefaultZoom();
          }
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Tự động căn chỉnh lại kích thước và zoom khi bố cục hoặc trạng thái hiển thị thay đổi
  useEffect(() => {
    if (!isVisible) return;
    setIsAutoFit(true);
    const timer = setTimeout(() => {
      if (chartRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          chartRef.current.applyOptions({ width: w, height: h });
        }
        applyDefaultZoom();
        drawObs();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isVisible, layout]);

  // Quản lý dữ liệu nến: Khôi phục tức thì từ cache RAM (0ms) + Fetch ngầm cập nhật
  useEffect(() => {
    if (!isVisible) return;

    let isMounted = true;
    const targetCoin = coin;
    const targetTf = tf;
    const tfMap = { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1H", "2H": "2H", "4H": "4H", "1D": "1D" };
    const bar = tfMap[tf] || tf;
    const cacheKey = `${coin}_${bar}`;

    // 1. Tức thì khôi phục nến từ RAM cache nếu có (0ms - không bị nhấp nháy/trắng xoá biểu đồ)
    const cached = _webCandlesCache.get(cacheKey);
    if (cached && cached.candles && cached.candles.length > 0) {
      candlesRef.current = cached.candles;
      activeObsRef.current = cached.ob_boxes || [];
      if (candleSeriesRef.current) {
        try { candleSeriesRef.current.setData(cached.candles); } catch {}
      }
      if (volumeSeriesRef.current && cached.volume) {
        try { volumeSeriesRef.current.setData(cached.volume); } catch {}
      }
      if (emaSeriesRef.current && cached.ema) {
        try { emaSeriesRef.current.setData(cached.ema); } catch {}
      }
      if (isAutoFit) {
        setTimeout(() => {
          if (isMounted) {
            applyDefaultZoom();
            drawObs();
          }
        }, 15);
      }
    } else {
      // Chỉ xoá trắng khi chưa từng có dữ liệu cho coin/tf này
      if (candleSeriesRef.current) {
        try { candleSeriesRef.current.setData([]); } catch { }
      }
      if (volumeSeriesRef.current) {
        try { volumeSeriesRef.current.setData([]); } catch { }
      }
      if (emaSeriesRef.current) {
        try { emaSeriesRef.current.setData([]); } catch { }
      }
      if (overlayRef.current) {
        overlayRef.current.innerHTML = "";
      }
      candlesRef.current = [];
      activeObsRef.current = [];
    }

    const fetchCandles = async () => {
      if (!candleSeriesRef.current) return;
      try {
        const res = await fetch(`/api/market/candles?instId=${coin}&bar=${bar}&limit=1500`);
        if (!res.ok) return;
        const rd = await res.json();
        if (!isMounted || targetCoin !== coin || targetTf !== tf || rd.code !== "0" || !rd.data || rd.data.length === 0) return;

        const candles = [];
        for (let i = rd.data.length - 1; i >= 0; i--) {
          const c = rd.data[i];
          const t = Math.floor(parseInt(c[0]) / 1000);
          candles.push({
            time: t,
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[5])
          });
        }
        candles.sort((a, b) => a.time - b.time);
        const unique = candles.filter((c, i) => i === 0 || c.time !== candles[i - 1].time);
        const uniqueVolume = unique.map(c => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));
        const emaData = calculateEMA(unique, 200);

        // Lưu vào RAM Cache cho toàn app
        _webCandlesCache.set(cacheKey, {
          candles: unique,
          volume: uniqueVolume,
          ema: emaData,
          ob_boxes: rd.ob_boxes || [],
          timestamp: Date.now()
        });

        candlesRef.current = unique;
        candleSeriesRef.current.setData(unique);
        if (volumeSeriesRef.current) {
          volumeSeriesRef.current.setData(uniqueVolume);
        }
        if (emaSeriesRef.current) {
          emaSeriesRef.current.setData(emaData);
        }
        if (rd.ob_boxes) {
          activeObsRef.current = rd.ob_boxes;
        }

        setTimeout(() => {
          if (!isMounted) return;
          drawObs();
          if (isAutoFit) {
            applyDefaultZoom();
          }
        }, 30);
      } catch (e) {
        console.warn("fetchCandles error:", e);
      }
    };

    fetchCandles();
    const interval = setInterval(fetchCandles, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [coin, tf, isVisible]);

  return (
    <div
      className={`single-chart-card ${isActive ? "active" : ""}`}
      style={{ display: isVisible ? "flex" : "none" }}
      onClick={onActivate}
    >
      {showToolbar && (
        <div className="single-chart-header">
          <div className="single-chart-header-left">
            <select
              className="styled-select"
              style={{ width: "105px", fontSize: "11px", padding: "1px 4px", height: "22px", border: "1px solid #333", borderRadius: "3px" }}
              value={coin}
              onChange={e => {
                e.stopPropagation();
                onChangeCoin(e.target.value);
              }}
            >
              {COIN_LIST.map(c => (
                <option key={c.value} value={c.value}>{c.label.replace("-SWAP", "")}</option>
              ))}
            </select>
            <select
              className="styled-select"
              style={{ width: "50px", fontSize: "11px", padding: "1px 4px", fontWeight: "bold", height: "22px", border: "1px solid #333", borderRadius: "3px" }}
              value={tf}
              onChange={e => {
                e.stopPropagation();
                onChangeTf(e.target.value);
              }}
            >
              {TF_LIST.map(item => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div style={{ fontSize: "10px", color: "#888", fontWeight: "bold" }}>
            #{chartIndex + 1}
          </div>
        </div>
      )}

      <div className="single-chart-body">
        <div
          className="single-chart-canvas"
          ref={containerRef}
          onWheel={() => setIsAutoFit(false)}
          onTouchStart={() => setIsAutoFit(false)}
          onMouseDown={() => setIsAutoFit(false)}
        />
        <div
          ref={overlayRef}
          style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            pointerEvents: 'none', zIndex: 4, overflow: 'hidden'
          }}
        />
        <div style={{
          position: "absolute", bottom: "6px", right: "52px",
          display: "flex", gap: "4px", zIndex: 10
        }}>
          <button
            title="Auto (Mặc định zoom 30-80 nến)"
            onClick={(e) => {
              e.stopPropagation();
              const next = !isAutoFit;
              setIsAutoFit(next);
              if (next) applyDefaultZoom();
            }}
            style={{
              width: "20px", height: "20px",
              background: isAutoFit ? "rgba(41,98,255,0.85)" : "rgba(30,30,46,0.85)",
              color: isAutoFit ? "#fff" : "#d1d4dc",
              border: isAutoFit ? "1px solid #2962ff" : "1px solid #444",
              borderRadius: "3px", fontSize: "10px", fontWeight: "bold", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
            }}
          >A</button>
          <button
            title="Log scale"
            onClick={(e) => {
              e.stopPropagation();
              const next = !isLogScale;
              setIsLogScale(next);
              chartRef.current?.priceScale("right").applyOptions({ mode: next ? 1 : 0 });
            }}
            style={{
              width: "20px", height: "20px",
              background: isLogScale ? "rgba(41,98,255,0.85)" : "rgba(30,30,46,0.85)",
              color: isLogScale ? "#fff" : "#d1d4dc",
              border: isLogScale ? "1px solid #2962ff" : "1px solid #444",
              borderRadius: "3px", fontSize: "10px", fontWeight: "bold", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", lineHeight: 1
            }}
          >L</button>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Auth state — restore from localStorage
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem("tls1_auth") === "true";
  });
  const [loginUid, setLoginUid] = useState(() => localStorage.getItem("tls1_uid") || "");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [lockMessage, setLockMessage] = useState("");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [botPnl, setBotPnl] = useState("");
  const [botWinrate, setBotWinrate] = useState("");
  const [isBotRunning, setIsBotRunning] = useState(false);
  const [botUptime, setBotUptime] = useState("00:00:00");
  const [hwid] = useState(() => {
    let saved = localStorage.getItem('tls1_hwid');
    if (!saved) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      saved = `WEB-${rand}`;
      localStorage.setItem('tls1_hwid', saved);
    }
    return saved;
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Focus Log
  const logsEndRef = useRef(null);

  const [selectedCoin, setSelectedCoin] = useState("BTC-USDT-SWAP");
  const [activePairs, setActivePairs] = useState([]);
  const [selectedTf, setSelectedTf] = useState("4H");

  // Multi-chart layout & configuration (TradingView Style)
  const getLayoutDefaults = (layout) => {
    if (layout === "1") return ["BTC-USDT-SWAP"];
    if (layout === "2-col" || layout === "2-row") return ["BTC-USDT-SWAP", "ETH-USDT-SWAP"];
    if (layout === "3-col" || layout === "3-row") return ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"];
    if (layout === "4-grid") return ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP", "USDT.D"];
    return ["BTC-USDT-SWAP"];
  };

  const DEFAULT_CHARTS = [
    { id: 0, coin: "BTC-USDT-SWAP", tf: "1H" },
    { id: 1, coin: "ETH-USDT-SWAP", tf: "1H" },
    { id: 2, coin: "XAU-USDT-SWAP", tf: "1H" },
    { id: 3, coin: "USDT.D", tf: "1H" },
  ];

  const [chartLayout, setChartLayout] = useState(() => {
    return localStorage.getItem("tls1_chart_layout") || "1";
  });

  const [chartsConfig, setChartsConfig] = useState(() => {
    const layout = localStorage.getItem("tls1_chart_layout") || "1";
    try {
      const saved = localStorage.getItem("tls1_charts_config");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length >= 4) {
          if (parsed[3]?.coin !== "USDT.D") {
            parsed[3].coin = "USDT.D";
          }
          return parsed;
        }
      }
    } catch (e) {}
    const defaultCoins = getLayoutDefaults(layout);
    return [
      { id: 0, coin: defaultCoins[0] || "BTC-USDT-SWAP", tf: "1H" },
      { id: 1, coin: defaultCoins[1] || "ETH-USDT-SWAP", tf: "1H" },
      { id: 2, coin: defaultCoins[2] || "XAU-USDT-SWAP", tf: "1H" },
      { id: 3, coin: defaultCoins[3] || "USDT.D", tf: "1H" },
    ];
  });

  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutSelectorRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (layoutSelectorRef.current && !layoutSelectorRef.current.contains(e.target)) {
        setShowLayoutMenu(false);
      }
    };
    if (showLayoutMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLayoutMenu]);

  // Pre-warm client-side candles cache cho các coin mặc định ngay khi mở Web App
  useEffect(() => {
    const warmupItems = [
      { coin: "BTC-USDT-SWAP", tf: "1H" },
      { coin: "ETH-USDT-SWAP", tf: "1H" },
      { coin: "XAU-USDT-SWAP", tf: "1H" },
      { coin: "USDT.D", tf: "1H" },
    ];
    warmupItems.forEach(async ({ coin, tf }) => {
      const cacheKey = `${coin}_${tf}`;
      if (_webCandlesCache.has(cacheKey)) return;
      try {
        const res = await fetch(`/api/market/candles?instId=${coin}&bar=${tf}&limit=1500`);
        if (!res.ok) return;
        const rd = await res.json();
        if (rd.code === "0" && rd.data && rd.data.length > 0) {
          const candles = [];
          for (let i = rd.data.length - 1; i >= 0; i--) {
            const c = rd.data[i];
            const t = Math.floor(parseInt(c[0]) / 1000);
            candles.push({
              time: t,
              open: parseFloat(c[1]),
              high: parseFloat(c[2]),
              low: parseFloat(c[3]),
              close: parseFloat(c[4]),
              volume: parseFloat(c[5])
            });
          }
          candles.sort((a, b) => a.time - b.time);
          const unique = candles.filter((c, i) => i === 0 || c.time !== candles[i - 1].time);
          const uniqueVolume = unique.map(c => ({
            time: c.time,
            value: c.volume || 0,
            color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
          }));
          const emaData = calculateEMA(unique, 200);
          _webCandlesCache.set(cacheKey, {
            candles: unique,
            volume: uniqueVolume,
            ema: emaData,
            ob_boxes: rd.ob_boxes || [],
            timestamp: Date.now()
          });
        }
      } catch (e) {}
    });
  }, []);

  const updateChartConfig = (index, updates) => {
    setChartsConfig(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      localStorage.setItem("tls1_charts_config", JSON.stringify(next));
      return next;
    });
    if (updates.coin) {
      setSelectedCoin(updates.coin);
    }
    if (updates.tf && index === 0) {
      setSelectedTf(updates.tf);
    }
  };

  const handleSelectLayout = (layoutKey) => {
    setChartLayout(layoutKey);
    localStorage.setItem("tls1_chart_layout", layoutKey);
    setShowLayoutMenu(false);

    // Áp dụng các coin mặc định khi chọn số lượng biểu đồ:
    // 1 biểu đồ: chart BTC
    // 2 biểu đồ: chart BTC -> ETH
    // 3 biểu đồ: XAU > BTC > ETH
    // 4 biểu đồ: XAU > BTC > ETH > USDT.D
    const defaultCoins = getLayoutDefaults(layoutKey);
    setChartsConfig(prev => {
      const next = [...prev];
      defaultCoins.forEach((coin, idx) => {
        next[idx] = {
          id: idx,
          coin: coin,
          tf: next[idx]?.tf || "1H"
        };
      });
      localStorage.setItem("tls1_charts_config", JSON.stringify(next));
      return next;
    });
    setSelectedCoin(defaultCoins[0]);
    setActiveChartIndex(0);
  };

  const getActiveChartsCount = (layout) => {
    if (layout === "2-col" || layout === "2-row") return 2;
    if (layout === "3-col" || layout === "3-row") return 3;
    if (layout === "4-grid") return 4;
    return 1;
  };

  const [enabledTfs, setEnabledTfs] = useState({});
  const [botStatus, setBotStatus] = useState("STOPPED");
  const [uptime, setUptime] = useState(0);
  const [chartRatio, setChartRatio] = useState(50);

  const startResizing = (e) => {
    e.preventDefault();
    const isVertical = layoutMode === "vertical";

    // Add is-resizing to body to prevent iframe capturing mouse events
    document.body.classList.add("is-resizing");
    if (isVertical) {
      document.body.classList.add("is-resizing-vertical");
    }

    const doDrag = (dragEvent) => {
      const workspace = document.querySelector(".main-workspace");
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      if (isVertical) {
        let newRatio = ((dragEvent.clientY - rect.top) / rect.height) * 100;
        if (newRatio < 25) newRatio = 25;
        if (newRatio > 75) newRatio = 75;
        setChartRatio(newRatio);
      } else {
        let newRatio = ((dragEvent.clientX - rect.left) / rect.width) * 100;
        if (newRatio < 25) newRatio = 25;
        if (newRatio > 75) newRatio = 75;
        setChartRatio(newRatio);
      }
    };
    const stopDrag = () => {
      document.body.classList.remove("is-resizing");
      document.body.classList.remove("is-resizing-vertical");
      document.removeEventListener("mousemove", doDrag);
      document.removeEventListener("mouseup", stopDrag);
    };
    document.addEventListener("mousemove", doDrag);
    document.addEventListener("mouseup", stopDrag);
  };

  const [activeTab, setActiveTab] = useState("positions");
  const [layoutMode, setLayoutMode] = useState("vertical");
  const [logs, setLogs] = useState(["Đã kết nối với TLS1 Trading Web Terminal Server..."]);
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("strategy");

  const [accounts, setAccounts] = useState(() => {
    try {
      const cached = localStorage.getItem("tls1_accounts");
      if (cached) {
        let parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          parsed = parsed
            .map(a => a.id === "sub1" ? { ...a, name: "Tài khoản phụ" } : a)
            .filter(a => !(a.id === "sub2" && (a.name === "Tài khoản phụ 2" || a.name === "Tài khoản 2")));
          if (!parsed.some(a => a.id === "sub1")) {
            parsed.unshift({ id: "sub1", name: "Tài khoản phụ" });
          }
          return parsed;
        }
      }
    } catch (e) {}
    return [{ id: "sub1", name: "Tài khoản phụ" }];
  });

  // Quản lý tab Bot chiến thuật độc lập (sub1: Bot EMA200, sub2: Bot SMC, sub3: Bot Liquidation)
  const [activeBotTab, setActiveBotTab] = useState(() => {
    return localStorage.getItem("tls1_active_bot_tab") || "sub1";
  });

  // Ánh xạ tài khoản cho từng tab bot { sub1: "accA", sub2: "accB", sub3: "accA" }
  const [botAccountMap, setBotAccountMap] = useState(() => {
    const saved = localStorage.getItem("tls1_bot_accounts");
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return { sub1: "sub1", sub2: "sub1", sub3: "sub1" };
  });

  const currentAccount = botAccountMap[activeBotTab] || "sub1";
  const [selectedAccount, setSelectedAccount] = useState(currentAccount);

  // Khi chuyển bot tab hoặc cập nhật botAccountMap, đồng bộ selectedAccount
  useEffect(() => {
    const acc = botAccountMap[activeBotTab] || "sub1";
    setSelectedAccount(acc);
    localStorage.setItem("tls1_active_bot_tab", activeBotTab);
  }, [activeBotTab]);

  const handleAssignAccountToActiveBot = (accId) => {
    setSelectedAccount(accId);
    setBotAccountMap(prev => {
      const next = { ...prev, [activeBotTab]: accId };
      localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
      return next;
    });
  };

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [newAccountInput, setNewAccountInput] = useState("");
  const [fadeClass, setFadeClass] = useState("tab-fade");
  const [selectedBotType, setSelectedBotType] = useState("ema200");
  const [slotCount] = useState(() => [56, 57, 58][Math.floor(Math.random() * 3)]);
  const MAX_SLOTS = 100;
  const [isLogScale, setIsLogScale] = useState(false);
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Order Panel State
  const [tradeType, setTradeType] = useState("limit");
  const [tradePrice, setTradePrice] = useState("");
  const [tradeSize, setTradeSize] = useState("");
  const [availBal, setAvailBal] = useState("0");
  const [reduceOnly, setReduceOnly] = useState(false);
  const [hasTPSL, setHasTPSL] = useState(false);
  const [tradeSL, setTradeSL] = useState("");
  const [tradeTP, setTradeTP] = useState("");
  const [tradePct, setTradePct] = useState(0);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  const handleBBO = async () => {
    try {
      const res = await fetch(`/api/market/ticker?instId=${selectedCoin}&t=${Date.now()}`, { cache: 'no-store' });
      const data = await res.json();
      if (data.code === "0" && data.data && data.data[0]) {
        setTradePrice(data.data[0].last);
      } else {
        setTradePrice("ERR: " + (data.code || "unknown"));
      }
    } catch (e) {
      setTradePrice("FETCH_ERROR");
      console.error("Failed to fetch BBO", e);
    }
  };

  const handleResetCapital = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn Reset Vốn Gốc (hệ thống sẽ lấy số dư hiện tại từ OKX làm Vốn Gốc mới)?")) return;

    try {
      const uid = localStorage.getItem("tls1_uid") || loginUid || "default";
      const resp = await fetch(`/api/bot/reset_capital?uid=${uid}&strategy=${activeBotTab}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        alert("✅ Đã gửi lệnh Reset Vốn Gốc (Audit) đến Bot thành công!");
      } else {
        alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
      }
    } catch (e) {
      alert("❌ Lỗi kết nối đến Server: " + e.message);
    }
  };

  const handleResetNen = async () => {
    const currentUid = (localStorage.getItem("tls1_uid") || loginUid || "").trim();
    const isAdm = currentUid.toLowerCase().startsWith("admtls12021_") && currentUid.length > "admtls12021_".length;
    if (!isAdm) {
      alert("⚠️ Chức năng này chỉ dành riêng cho Quản trị viên (Admin)!");
      return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn gửi lệnh Reset Đếm Nến đến Bot?")) return;

    try {
      const resp = await fetch(`/api/bot/reset_nen?uid=${currentUid}&strategy=${activeBotTab}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        alert("✅ Đã kích hoạt lệnh Reset Đếm Nến thành công!");
      } else {
        alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
      }
    } catch (e) {
      alert("❌ Lỗi kết nối đến Server: " + e.message);
    }
  };

  const handleSizePct = (pct) => {
    setTradePct(pct);
    setTradeSize(`${pct}%`);
  };

  useEffect(() => {
    if (tradeType === 'limit') {
      handleBBO();
    }
  }, [selectedCoin, tradeType]);

  // Fetch balance
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchBalance = async () => {
      try {
        const acc = botAccountMap[activeBotTab] || "sub1";
        const r = await fetch(`/api/account/balance?uid=${localStorage.getItem('tls1_uid') || loginUid}&strategy=${activeBotTab}&account_id=${acc}`);
        if (r.ok) {
          const d = await r.json();
          if (d.status === "success") setAvailBal(d.availBal);
        }
      } catch { }
    };
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, activeBotTab, botAccountMap, loginUid]);

  const handlePlaceOrder = async (side) => {
    if (tradeType === "limit" && !tradePrice) return alert("Vui lòng nhập giá Limit");
    if (!tradeSize) return alert("Vui lòng nhập số lượng (Lô)");

    let finalSz = tradeSize;
    if (String(tradeSize).includes('%')) {
      const pct = parseFloat(tradeSize.replace('%', ''));
      const ctVals = {
        "XAU-USDT-SWAP": 0.001,
        "BTC-USDT-SWAP": 0.01,
        "ETH-USDT-SWAP": 0.1,
        "SOL-USDT-SWAP": 1,
        "XRP-USDT-SWAP": 100,
      };
      const ctVal = ctVals[selectedCoin];
      const balance = parseFloat(availBal);

      let price = parseFloat(tradePrice);
      if (!price || isNaN(price)) {
        try {
          const res = await fetch(`/api/market/ticker?instId=${selectedCoin}&t=${Date.now()}`, { cache: 'no-store' });
          const data = await res.json();
          if (data.code === "0" && data.data && data.data[0]) {
            price = parseFloat(data.data[0].last);
          }
        } catch (e) { }
      }

      if (!price || isNaN(price)) {
        alert("Không thể lấy giá hiện tại để quy đổi Số Lô. Vui lòng bấm BBO hoặc tải lại trang.");
        return;
      }

      if (ctVal && balance > 0) {
        const usdtToSpend = balance * (pct / 100);
        const notionalValue = usdtToSpend * 100;
        let lots = Math.floor(notionalValue / (price * ctVal));
        if (lots < 1) {
          alert(`Số dư hiện tại (${balance.toFixed(2)} USDT) x 100 đòn bẩy = ${notionalValue.toFixed(2)} USDT. Vẫn không đủ để mua 1 Lô (tối thiểu ~${(price * ctVal).toFixed(2)} USDT/Lô). Vui lòng chọn % cao hơn.`);
          return;
        }
        finalSz = lots.toString();
      } else {
        alert("Lỗi quy đổi: Thiếu thông tin số dư khả dụng.");
        return;
      }
    }

    setIsPlacingOrder(true);
    try {
      const payload = {
        instId: selectedCoin,
        tdMode: "cross", // Default OKX
        side: side,
        ordType: tradeType,
        sz: finalSz,
        px: tradeType === "limit" ? tradePrice.toString() : "",
        reduceOnly: reduceOnly,
        slTriggerPx: hasTPSL && tradeSL ? tradeSL.toString() : "",
        tpTriggerPx: hasTPSL && tradeTP ? tradeTP.toString() : ""
      };
      const acc = botAccountMap[activeBotTab] || "sub1";
      const r = await fetch(`/api/trade/order?uid=${localStorage.getItem('tls1_uid') || loginUid}&strategy=${activeBotTab}&account_id=${acc}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const d = await r.json();
      if (d.status === "success") {
        alert(`✅ Đặt lệnh ${side.toUpperCase()} thành công!`);
        setTradeSize("");
        fetchPositions();
      } else {
        alert("❌ Lỗi: " + d.message);
      }
    } catch (err) {
      alert("Lỗi khi gửi yêu cầu đặt lệnh: " + err);
    }
    setIsPlacingOrder(false);
  };

  // Settings state — clone từ Desktop App
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [activeCoinsCfg, setActiveCoinsCfg] = useState({ xau: true, btc: true, eth: true });

  // Strategy toggles (clone Công Tắc Chiến Thuật)
  const [strat, setStrat] = useState({
    main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
    dynamicPingpongTp: false, altcoinFollowBtc: true,
    sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
    trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
    timeframeBase: "1H",
  });
  // Risk settings
  const [risk, setRisk] = useState({ posVol: 40, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const isInitialRiskRender = useRef(true);

  useEffect(() => {
    if (isInitialRiskRender.current) {
      isInitialRiskRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        const u = localStorage.getItem('tls1_uid') || loginUid;
        if (!u) return;
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${u}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: Number(risk.posVol),
            scalping_tp_pct: Number(risk.tpPct) / 100,
            scalping_sl_pct: Number(risk.slPct) / 100
          }),
        }).then(res => {
          if (res.ok) {
            addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình cho ${activeBotTab === "sub1" ? "Bot EMA200" : "Bot SMC"}: Volume = ${risk.posVol} ${risk.volUnit} | Chốt lời = ${risk.tpPct}% | Cắt lỗ = ${risk.slPct}%`);
          }
        });
      } catch { }
    }, 500);
    return () => clearTimeout(timer);
  }, [risk, activeBotTab, loginUid]);

  const addSystemLog = (msg) => {
    setLogs(prev => {
      let newBlocks = [...prev];
      newBlocks.unshift({ id: Date.now() + Math.random(), lines: [msg] });
      if (newBlocks.length > 20) newBlocks = newBlocks.slice(0, 20);
      return newBlocks;
    });
  };

  // Nạp danh sách tài khoản API từ backend
  useEffect(() => {
    if (!isAuthenticated) return;
    const uid = localStorage.getItem('tls1_uid') || loginUid;
    if (!uid) return;
    fetch(`/api/bot/accounts?uid=${uid}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
          localStorage.setItem("tls1_accounts", JSON.stringify(data));
        }
      })
      .catch(err => console.error("Error loading accounts:", err));
  }, [isAuthenticated, loginUid]);

  const handleCreateAccount = () => {
    setNewAccountInput("");
    setShowAddAccountModal(true);
  };

  const confirmCreateAccount = async () => {
    if (!newAccountInput || !newAccountInput.trim() || isCreatingAccount) return;
    const cleanName = newAccountInput.trim();

    if (accounts.some(a => a.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`Tài khoản "${cleanName}" đã tồn tại!`);
      return;
    }

    // 1. Hiệu ứng loading 1.2s (theo yêu cầu CEO tầm 1-1.5s)
    setIsCreatingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    // 2. Tạo ID duy nhất cho tài khoản phụ mới
    const newId = `sub_${Date.now()}`;
    const newAcc = { id: newId, name: cleanName };
    const updatedList = [...accounts, newAcc];

    setAccounts(updatedList);
    localStorage.setItem("tls1_accounts", JSON.stringify(updatedList));
    setSelectedAccount(newId);
    setBotAccountMap(prev => {
      const next = { ...prev, [activeBotTab]: newId };
      localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
      return next;
    });
    setApiKey("");
    setSecretKey("");
    setPassphrase("");
    setShowAddAccountModal(false);
    setNewAccountInput("");
    addSystemLog(`➕ [ACCOUNT] Đã tạo tài khoản mới: "${cleanName}" và gán cho ${activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot"}`);

    // 3. Đồng bộ ngầm lên Backend
    const uid = localStorage.getItem('tls1_uid') || loginUid;
    try {
      fetch(`/api/bot/accounts?uid=${uid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, name: cleanName })
      }).then(async res => {
        if (res.ok) {
          const data = await res.json();
          if (data.accounts && Array.isArray(data.accounts)) {
            setAccounts(data.accounts);
            localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
          }
        }
      }).catch(err => {
        console.warn("Background create account sync warning:", err);
      });
    } catch (e) {
      console.warn("Create account error:", e);
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDeleteAccount = () => {
    setShowDeleteAccountModal(true);
  };

  const confirmDeleteAccount = async () => {
    if (isDeletingAccount) return;

    // 1. Hiệu ứng loading 1.2s (theo yêu cầu CEO tầm 1-1.5s)
    setIsDeletingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const targetAccountId = selectedAccount;
    const currentAcc = accounts.find(a => a.id === targetAccountId);
    const accName = currentAcc?.name || targetAccountId;
    const uid = localStorage.getItem('tls1_uid') || loginUid;

    if (accounts.length > 1) {
      const updatedList = accounts.filter(a => a.id !== targetAccountId);
      setAccounts(updatedList);
      localStorage.setItem("tls1_accounts", JSON.stringify(updatedList));
      const nextAcc = updatedList[0];
      setSelectedAccount(nextAcc.id);
      setBotAccountMap(prev => {
        const next = { ...prev };
        for (const k in next) {
          if (next[k] === targetAccountId) next[k] = nextAcc.id;
        }
        localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
        return next;
      });
      setShowDeleteAccountModal(false);
      addSystemLog(`🗑️ [ACCOUNT] Đã xoá tài khoản: "${accName}"`);
    } else {
      setApiKey("");
      setSecretKey("");
      setPassphrase("");
      const resetList = [{ id: "sub1", name: "Tài khoản phụ" }];
      setAccounts(resetList);
      localStorage.setItem("tls1_accounts", JSON.stringify(resetList));
      setSelectedAccount("sub1");
      setBotAccountMap({ sub1: "sub1", sub2: "sub1", sub3: "sub1" });
      localStorage.setItem("tls1_bot_accounts", JSON.stringify({ sub1: "sub1", sub2: "sub1", sub3: "sub1" }));
      setShowDeleteAccountModal(false);
      addSystemLog(`🗑️ [ACCOUNT] Đã làm sạch toàn bộ API Key và đưa tài khoản về mặc định`);
    }

    try {
      fetch(`/api/bot/accounts/${targetAccountId}?uid=${uid}`, { method: "DELETE" })
        .then(async res => {
          if (res.ok) {
            const data = await res.json();
            if (data.accounts && Array.isArray(data.accounts)) {
              setAccounts(data.accounts);
              localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
            }
          }
        })
        .catch(err => {
          console.warn("Background delete account sync warning:", err);
        });
    } catch (e) {
      console.warn("Delete account error:", e);
    } finally {
      setIsDeletingAccount(false);
    }
  };

  // Cấu hình Điểm vào lệnh (Entry Config - EMA200)
  const [entryCfg, setEntryCfg] = useState({
    entryOffset: "0.05",
    dcaGapPct: "0.20",
    confluencePct: "0.23",
    accumCandles: 60,
    altcoinFollowBtc: true,
    ethVolMult: "1.30",
  });

  // Cấu hình Điểm vào lệnh SMC (Entry Config - SMC)
  const [smcEntryCfg, setSmcEntryCfg] = useState({
    source: "ALL",
    dir: "BOTH",
    obVol: 2.0,
    swingLength: 50,
    internalLength: 5,
    forceMarket: true,
    maxSlippage: 0.8,
  });

  // Sync defaults from Desktop App when switching Bots
  useEffect(() => {
    setFadeClass("");
    setTimeout(() => setFadeClass("tab-fade"), 10);

    if (activeBotTab === "sub1") {
      // Defaults for Bot EMA200
      setRisk({ posVol: 40, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
      setStrat({
        main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    } else if (activeBotTab === "sub2") {
      // Defaults for Bot SMC
      setRisk({ posVol: 500, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: false,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        timeframeBase: "1H",
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    }
  }, [activeBotTab]);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const priceLinesRef = useRef([]);
  const emaSeriesRef = useRef(null);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null); // Reference for click sound
  const lastLogTimeRef = useRef(0);
  const logBlockIdRef = useRef(0);

  const [authStep, setAuthStep] = useState("uid");
  const [level2Password, setLevel2Password] = useState("");
  const [loginPassphrase, setLoginPassphrase] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");

  // Login handler — lưu vào localStorage
  const handleLogin = async (e) => {
    e.preventDefault();
    if (audioRef.current) audioRef.current.play().catch(e => console.log(e));
    const cleanUid = (loginUid || "").trim().toLowerCase();
    if (cleanUid === "admtls12021") {
      setLoginError("Vui lòng nhập đầy đủ cú pháp Admin: admtls12021_tên (Ví dụ: admtls12021_bao)!");
      return;
    }

    if (authStep === "create_password") {
      if (!adminPassword || adminPassword.length < 4) {
        setLoginError("Mật khẩu phải có tối thiểu 4 ký tự!");
        return;
      }
      if (adminPassword !== adminConfirmPassword) {
        setLoginError("Mật khẩu xác nhận không khớp! Vui lòng kiểm tra lại.");
        return;
      }
    }

    setIsLoggingIn(true);
    setLoginError("");
    try {
      let pwdToSend = "";
      if (authStep === "require_password" || authStep === "create_password") {
        pwdToSend = adminPassword;
      }

      const payload = {
        uid: loginUid,
        password: pwdToSend,
        passphrase: authStep === "require_passphrase" ? loginPassphrase : ""
      };
      console.log("[AUTH] Sending login request:", { uid: loginUid, authStep, hasPassword: !!pwdToSend });
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      console.log("[AUTH] Login response:", data);
      if (data.status === "success") {
        setIsAuthenticated(true);
        localStorage.setItem("tls1_auth", "true");
        localStorage.setItem("tls1_uid", loginUid);
        // Reset login state for clean next login
        setAuthStep("uid");
        setAdminPassword("");
        setAdminConfirmPassword("");
        setLoginPassphrase("");
        setLoginError("");
      } else if (data.status === "require_create_password") {
        setAuthStep("create_password");
        setAdminPassword("");
        setAdminConfirmPassword("");
        setLoginError("");
      } else if (data.status === "require_password") {
        setAuthStep("require_password");
        setAdminPassword("");
        setLoginError("");
      } else if (data.status === "locked" || data.status === "pending") {
        setLoginError(data.message || "Tài khoản đang bị khoá hoặc chờ duyệt.");
      } else {
        setLoginError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      console.error("[AUTH] Login error:", err);
      setLoginError("Không thể kết nối đến máy chủ xác thực. Hãy kiểm tra kết nối mạng.");
    }
    setIsLoggingIn(false);
  };

  // Poll trạng thái lock/pending mỗi 30s — giống Desktop App
  useEffect(() => {
    if (!isAuthenticated) return;
    const uid = localStorage.getItem("tls1_uid") || loginUid;
    if (!uid) return;
    const checkLock = async () => {
      try {
        const res = await fetch(`/api/auth/verify?uid=${uid}`);
        const data = await res.json();
        if (data.status === "locked") {
          setLockMessage(data.message || "⛔ Tài khoản của bạn đã bị khoá. Vui lòng liên hệ Admin.");
        } else if (data.status === "pending") {
          setLockMessage(data.message || "⏳ Tài khoản đang chờ duyệt.");
        } else {
          setLockMessage("");
        }
      } catch { }
    };
    checkLock();
    const timer = setInterval(checkLock, 30000);
    return () => clearInterval(timer);
  }, [isAuthenticated, loginUid]);

  // WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    let ws = null;

    const connectWS = () => {
      if (!isMounted) return;
      ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/logs/${localStorage.getItem('tls1_uid') || loginUid}/${activeBotTab}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const now = Date.now();
        setLogs(prev => {
          // Xóa hoàn toàn log cũ nếu gặp dấu hiệu in Dashboard mới
          if (typeof e.data === 'string' && e.data.includes("bot_sub1.py")) {
            logBlockIdRef.current += 1;
            return [{ id: logBlockIdRef.current, lines: [e.data] }];
          }

          let newBlocks = [...prev];
          // LUÔN LUÔN đẩy log mới nhất lên ĐẦU (tin mới nhất trên cùng)
          if (newBlocks.length === 0 || now - lastLogTimeRef.current > 1500) {
            logBlockIdRef.current += 1;
            newBlocks.unshift({ id: logBlockIdRef.current, lines: [e.data] });
          } else {
            // Log đến liên tục => gộp vào block ĐẦU TIÊN theo chiều xuôi (để bảng không bị lộn ngược)
            newBlocks[0] = { ...newBlocks[0], lines: [...newBlocks[0].lines, e.data] };
          }
          // Giữ tối đa 20 blocks gần nhất để không lag
          if (newBlocks.length > 20) newBlocks = newBlocks.slice(0, 20);
          return newBlocks;
        });
        lastLogTimeRef.current = now;
      };
      ws.onclose = () => {
        if (isMounted && wsRef.current === ws) {
          setTimeout(connectWS, 3000);
        }
      };
    };

    // Đổi tab => clear log cũ, nối lại WS mới
    setLogs([]);
    lastLogTimeRef.current = 0;
    logBlockIdRef.current = 0;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    connectWS();

    return () => {
      isMounted = false;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isAuthenticated, activeBotTab, loginUid]);

  useEffect(() => {
    if (terminalRef.current) {
      const { scrollTop } = terminalRef.current;
      // Nếu đang ở gần trên cùng (cách top <= 50px), tự động cuộn lên sát mép trên để xem log mới nhất
      if (scrollTop <= 50) {
        terminalRef.current.scrollTop = 0;
      }
    }
  }, [logs]);

  // Periodic polling
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/bot/status?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) { const d = await r.json(); setBotStatus(d.status); setUptime(d.uptime); }
      } catch { }
    };
    const fetchConfig = async () => {
      try {
        const r = await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) {
          const d = await r.json();
          if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS);
          if (d.ENABLED_COINS) setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
        }
      } catch { }
    };
    const fetchCreds = async () => {
      try {
        const targetAcc = selectedAccount || botAccountMap[activeBotTab] || "sub1";
        const r = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) {
          const d = await r.json();
          setApiKey(d.api_key || "");
          setSecretKey(d.secret_key || "");
          setPassphrase(d.passphrase || "");
        }
      } catch { }
    };
    fetchStatus(); fetchConfig(); fetchCreds(); fetchPositions();
    const s = setInterval(fetchStatus, 2000);
    const p = setInterval(fetchPositions, 5000);
    return () => { clearInterval(s); clearInterval(p); };
  }, [isAuthenticated, activeBotTab, selectedAccount, botAccountMap, loginUid]);

  const fetchPositions = async () => {
    try {
      const acc = botAccountMap[activeBotTab] || "sub1";
      const r = await fetch(`/api/bot/positions?strategy=${activeBotTab}&account_id=${acc}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
      if (r.ok) setPositions(await r.json());

      const r2 = await fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
      if (r2.ok) setClosedPositions(await r2.json());
    } catch { }
  };

  // Chart rendering handled inside SingleChartPane component
  const handleStartBot = async () => {
    const currentAcc = botAccountMap[activeBotTab] || "sub1";
    // 1. Kiểm tra cấu hình API Key
    if (!apiKey || !secretKey || !passphrase) {
      alert(`⚠️ Vui lòng cấu hình API Key OKX cho tài khoản đang chọn (${accounts.find(a => a.id === currentAcc)?.name || currentAcc}) trước khi chạy bot!`);
      setShowSettings(true);
      setSettingsTab("api");
      return;
    }

    // 2. Kiểm tra Cặp giao dịch & TF trade
    if (activePairs.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất 1 Cặp giao dịch và cấu hình TF trade!");
      return;
    }

    const hasAnyTfSelected = activePairs.some(pair => {
      const coinTfs = Array.isArray(enabledTfs) ? enabledTfs : (enabledTfs[pair] || []);
      return coinTfs.length > 0;
    });

    if (!hasAnyTfSelected) {
      alert("⚠️ Vui lòng cấu hình ít nhất 1 TF trade cho các Cặp giao dịch đã chọn!");
      return;
    }

    try {
      const r = await fetch(`/api/bot/start?uid=${localStorage.getItem('tls1_uid') || loginUid}&strategy=${activeBotTab}&account_id=${currentAcc}`, { method: "POST" });
      if (r.ok) { 
        const d = await r.json(); 
        setBotStatus(d.status); 
        addSystemLog(`🚀 [BOT] Đã khởi động ${activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot"} với tài khoản ${accounts.find(a => a.id === currentAcc)?.name || currentAcc}`);
      } else {
        const err = await r.json();
        alert(`❌ Lỗi khởi động bot: ${err.detail || "Không rõ nguyên nhân"}`);
      }
    } catch { alert("Lỗi kết nối khi khởi động bot!"); }
  };
  const handleStopBot = async () => {
    const currentUid = localStorage.getItem('tls1_uid') || loginUid;
    const confirmKey = window.prompt("Vui lòng nhập mã bảo mật (OKX UID) để xác nhận dừng Bot:");
    if (confirmKey !== currentUid) {
      if (confirmKey !== null) alert("Mã xác nhận không đúng! Không thể dừng Bot.");
      return;
    }

    try {
      setIsStoppingBot(true);
      const r = await fetch(`/api/bot/stop?strategy=${activeBotTab}&uid=${currentUid}`, { method: "POST" });
      if (r.ok) { const d = await r.json(); setBotStatus(d.status); }
    } catch { alert("Lỗi dừng bot!"); }
    finally { setIsStoppingBot(false); }
  };
  const handleTfToggle = async (coin, tf) => {
    const isOldFormat = Array.isArray(enabledTfs);
    const safeDict = isOldFormat ? {} : { ...enabledTfs };

    if (!safeDict[coin]) {
      safeDict[coin] = isOldFormat ? [...enabledTfs] : [];
    }

    const currentTfs = safeDict[coin];
    const updatedCoinTfs = currentTfs.includes(tf) ? currentTfs.filter(t => t !== tf) : [...currentTfs, tf];

    const updatedTfs = { ...safeDict, [coin]: updatedCoinTfs };
    setEnabledTfs(updatedTfs);
    try {
      fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_tfs: updatedTfs }),
      }).then(res => {
        if (res.ok) {
          const isOn = updatedCoinTfs.includes(tf);
          addSystemLog(`⚙️ [SYSTEM] Đã ${isOn ? 'BẬT' : 'TẮT'} khung thời gian ${tf} cho coin ${coin.replace("-USDT-SWAP", "")}`);
        }
      });
    } catch { }
  };
  const formatUptime = (s) => {
    const h = Math.floor(s / 3600).toString().padStart(2, "0");
    const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${h}:${m}:${sec}`;
  };

  const safePos = Array.isArray(positions) ? positions : [];
  const togglePair = (pair) => {
    setActivePairs(prev => {
      const updated = prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair];
      try {
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled_coins: updated.map(p => p.split("-")[0]) }),
        }).then(res => {
          if (res.ok) {
            const isOn = updated.includes(pair);
            addSystemLog(`⚙️ [SYSTEM] Đã ${isOn ? 'BẬT' : 'TẮT'} giao dịch cho cặp ${pair.replace("-USDT-SWAP", "")}`);
          }
        });
      } catch { }
      return updated;
    });
  };
  const safeEnabledTfs = Array.isArray(enabledTfs) ? enabledTfs : [];
  const isRunning = botStatus === "RUNNING";

  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: "center", alignItems: "center" }}>
        {/* Audio element cho âm thanh nút click */}
        <audio ref={audioRef} src="/media/ribhavagrawal-hit-by-a-wood-230542.mp3" preload="auto"></audio>

        <div className="login-box" style={{ background: "#262626", padding: "0 0 20px 0", borderRadius: "8px", border: "1px solid #444", width: "400px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)", overflow: "hidden" }}>
          {/* Banner */}
          <div style={{ background: "#000", padding: "10px", borderBottom: "1px solid #444", marginBottom: "20px" }}>
            <img src="/media/banner.png" alt="TLS1 TRADING SYSTEM" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
          </div>

          <div style={{ padding: "0 20px" }}>
            <h3 style={{ color: "#e0e0e0", marginBottom: "15px", fontSize: "16px" }}>
              {authStep === "uid"
                ? "Nhập OKX UID của bạn:"
                : authStep === "create_password"
                ? `Thiết Lập Mật Khẩu (${loginUid}):`
                : authStep === "require_password"
                ? `Nhập Mật Khẩu (${loginUid}):`
                : "Nhập Mật Khẩu Passphrase:"}
            </h3>
            <form onSubmit={handleLogin}>
              {authStep === "uid" ? (
                <>
                  <input
                    type="text"
                    placeholder="Ví dụ: 12345678 hoặc admtls12021_bao"
                    value={loginUid}
                    onChange={e => setLoginUid(e.target.value)}
                    style={{ width: "260px", padding: "10px", marginBottom: "8px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "14px", textAlign: "center" }}
                  />
                  <div style={{ fontSize: "11px", color: "#888", marginBottom: "12px" }}>
                    Admin: <code>admtls12021_&lt;tên_hoặc_mã_máy&gt;</code>
                  </div>
                </>
              ) : authStep === "create_password" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                  <div style={{ fontSize: "12px", color: "#00ffff", maxWidth: "340px", lineHeight: "1.4", textAlign: "center" }}>
                    🛡️ Lần đầu đăng nhập! Vui lòng đặt mật khẩu bảo vệ để đăng nhập an toàn trên mọi thiết bị.
                  </div>
                  <input
                    type="password"
                    placeholder="Mật khẩu mới (tối thiểu 4 ký tự)"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    autoFocus
                    style={{ width: "260px", padding: "10px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "14px", textAlign: "center" }}
                  />
                  <input
                    type="password"
                    placeholder="Xác nhận lại mật khẩu"
                    value={adminConfirmPassword}
                    onChange={e => setAdminConfirmPassword(e.target.value)}
                    style={{ width: "260px", padding: "10px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "14px", textAlign: "center" }}
                  />
                  <button type="button" onClick={() => { setAuthStep("uid"); setAdminPassword(""); setAdminConfirmPassword(""); setLoginError(""); }} style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Quay lại</button>
                </div>
              ) : authStep === "require_password" ? (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                  <div style={{ fontSize: "12px", color: "#aaaaaa", marginBottom: "2px" }}>
                    Nhập mật khẩu tài khoản đã tạo để tiếp tục:
                  </div>
                  <input
                    type="password"
                    placeholder="Nhập mật khẩu của bạn"
                    value={adminPassword}
                    onChange={e => setAdminPassword(e.target.value)}
                    autoFocus
                    style={{ width: "260px", padding: "10px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "14px", textAlign: "center" }}
                  />
                  <button type="button" onClick={() => { setAuthStep("uid"); setAdminPassword(""); setLoginError(""); }} style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Quay lại</button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                  <input
                    type="password"
                    placeholder="Mật khẩu Passphrase"
                    value={loginPassphrase}
                    onChange={e => setLoginPassphrase(e.target.value)}
                    style={{ width: "200px", padding: "10px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "15px", textAlign: "center" }}
                  />
                  <button type="button" onClick={() => { setAuthStep("uid"); setLoginPassphrase(""); setLoginError(""); }} style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}>Quay lại</button>
                </div>
              )}
              {loginError && <div style={{ color: "#ff3333", fontSize: "14px", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>{loginError}</div>}
              <button
                type="submit"
                disabled={isLoggingIn || (authStep === "uid" ? !loginUid : authStep === "create_password" ? (!adminPassword || !adminConfirmPassword) : authStep === "require_password" ? !adminPassword : !loginPassphrase)}
                style={{ width: "100%", padding: "12px", background: "#ff9900", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer", color: "#000", fontSize: "16px", transition: "0.2s" }}
              >
                {isLoggingIn ? "Đang kiểm tra..." : authStep === "create_password" ? "Thiết Lập Mật Khẩu & Đăng Nhập" : "Đăng Nhập"}
              </button>
            </form>

            <div style={{ marginTop: "20px", textAlign: "left", fontSize: "12px", color: "#aaaaaa", lineHeight: "1.6" }}>
              <p style={{ color: "#27ae60", fontWeight: "bold", margin: "0 0 5px 0", fontSize: "14px" }}>✅ ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:</p>
              <p style={{ margin: "0 0 5px 0" }}>1. Đăng ký tài khoản OKX dưới Link Ref của cộng đồng TLS1, mã ref: <strong style={{ color: "#00ffff", cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText("HoanPhiTLS1"); alert("✅ Đã Copy Mã Ref!"); }}>HoanPhiTLS1</strong></p>
              <p style={{ margin: "0 0 15px 0" }}>2. Hoặc thực hiện chuyển Ref về TLS1 nếu đã có sẵn tài khoản OKX.</p>

              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button
                  onClick={() => window.open("https://www.okx.com/join/HoanPhiTLS1", "_blank")}
                  style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid #555", color: "#58a6ff", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  Đăng ký OKX (VIP)
                </button>
                <button
                  onClick={() => window.open("https://t.me/traderlaso1/6758", "_blank")}
                  style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid #555", color: "#58a6ff", borderRadius: "6px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}
                >
                  Hướng dẫn chuyển Ref
                </button>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px", border: "1px solid #444", borderRadius: "6px", background: "#262626" }}>
                <span style={{ fontSize: "12px", fontWeight: "bold" }}>Liên hệ Admin:</span>
                <div style={{ display: "flex", gap: "12px" }}>
                  <img src="/media/Telegram.png" alt="Telegram" style={{ width: "24px", height: "24px", cursor: "pointer" }} onClick={() => window.open("https://t.me/baotran_tls1", "_blank")} />
                  <img src="/media/Messenger.png" alt="Messenger" style={{ width: "24px", height: "24px", cursor: "pointer" }} onClick={() => window.open("https://www.facebook.com/baotran.tls1/", "_blank")} />
                  <img src="/media/zalo.png" alt="Zalo" style={{ width: "24px", height: "24px", cursor: "pointer" }} onClick={() => window.open("zalo://conversation?phone=84377333096", "_blank")} />
                  <img src="/media/Discord.png" alt="Discord" style={{ width: "24px", height: "24px", cursor: "pointer" }} onClick={() => window.open("https://discord.gg/8NXaSCvZ6u", "_blank")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* BANNER KHÓA / CHỜ DUYỆT — giống Desktop App */}
      {lockMessage && (
        <div style={{ background: "#c0392b", color: "#fff", padding: "10px 16px", fontSize: "14px", fontWeight: "bold", textAlign: "center", zIndex: 9999, position: "fixed", top: 0, left: 0, right: 0 }}>
          {lockMessage}
        </div>
      )}

      <div className={`content-wrapper ${fadeClass}`}>
        {/* SIDEBAR - NẰM BÊN TRÁI: TRADER LÀ SỐ 1 & QUẢN LÝ VỐN & RỦI RO (1:1 DESKTOP APP) */}
        <aside className="sidebar-left">
          <div className="sidebar-header">
            <div className="app-title">TRADER LÀ SỐ 1</div>
            <div className="app-subtitle">VIỆT NAM</div>
          </div>

          {/* Sidebar content - QUẢN LÝ VỐN & RỦI RO */}
          <div className="sidebar-content">
            {/* Account selector per Bot */}
            <div style={{ marginBottom: "10px", padding: "8px 10px", background: "#1e1e1e", borderRadius: "6px", border: "1px solid #333" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                <span style={{ fontSize: "11px", color: "#aaa", fontWeight: "bold" }}>
                  Tài khoản ({activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation"}):
                </span>
                <button
                  onClick={() => { setShowSettings(true); setSettingsTab("api"); }}
                  style={{ background: "transparent", border: "none", color: "#58a6ff", cursor: "pointer", fontSize: "11px", textDecoration: "underline" }}
                >
                  ⚙️ Cài đặt
                </button>
              </div>
              <select
                className="styled-select"
                style={{ width: "100%", background: "#2a2a2a", border: "1px solid #444", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", outline: "none" }}
                value={botAccountMap[activeBotTab] || "sub1"}
                onChange={e => handleAssignAccountToActiveBot(e.target.value)}
              >
                {accounts.map(acc => (
                  <option key={acc.id} value={acc.id}>{acc.name}</option>
                ))}
              </select>
            </div>

            <div className="group-box" style={{ position: "relative" }}>
              <span className="group-box-title">QUẢN LÝ VỐN & RỦI RO</span>
              <div style={{ position: "absolute", top: "-10px", right: "8px", display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#252526", padding: "0 4px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                  <button
                    onClick={() => setRisk(r => ({ ...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 40 : r.posVol }))}
                    style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "USDT" ? "#26a69a" : "#222", color: risk.volUnit === "USDT" ? "#fff" : "#888", cursor: "pointer" }}
                  >USDT</button>
                  <button
                    onClick={() => setRisk(r => ({ ...r, volUnit: "LOT", posVol: r.volUnit === "USDT" ? 0.01 : r.posVol }))}
                    style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "LOT" ? "#26a69a" : "#222", color: risk.volUnit === "LOT" ? "#fff" : "#888", cursor: "pointer" }}
                  >LOT</button>
                </div>
                <button
                  onClick={() => setIsRiskCollapsed(!isRiskCollapsed)}
                  style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "10px", padding: "0 2px" }}
                  title={isRiskCollapsed ? "Mở rộng" : "Thu gọn"}
                >
                  {isRiskCollapsed ? "▼" : "▲"}
                </button>
              </div>
              {!isRiskCollapsed && (
                <div className="risk-grid">
                  <div className="risk-row">
                    <label>{risk.volUnit === "USDT" ? "Volume Size (USDT):" : "Volume Size (Lot):"}</label>
                    <NumberSpinBox
                      value={risk.posVol}
                      onChange={val => setRisk(r => ({ ...r, posVol: val }))}
                      min={risk.volUnit === "LOT" ? 0.01 : 1}
                      step={risk.volUnit === "LOT" ? 0.01 : 10}
                    />
                  </div>
                  {activeBotTab === "sub1" ? (
                    <>
                      <div className="risk-row">
                        <label>Mức chốt lời gốc M5:</label>
                        <NumberSpinBox
                          value={risk.tpPct}
                          onChange={val => setRisk(r => ({ ...r, tpPct: val }))}
                          min={0.1}
                          step={0.05}
                          suffix="%"
                        />
                      </div>
                      <div className="risk-row">
                        <label>Mức cắt lỗ gốc M5:</label>
                        <NumberSpinBox
                          value={risk.slPct}
                          onChange={val => setRisk(r => ({ ...r, slPct: val }))}
                          min={0.1}
                          step={0.05}
                          suffix="%"
                        />
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="risk-row">
                        <label>Tỷ lệ chốt lời Thuận Trend:</label>
                        <NumberSpinBox
                          value={risk.tpPct}
                          onChange={val => setRisk(r => ({ ...r, tpPct: val }))}
                          min={0.1}
                          step={0.5}
                          suffix="R"
                        />
                      </div>
                      <div className="risk-row">
                        <label>Tỷ lệ chốt lời Ngược Trend:</label>
                        <NumberSpinBox
                          value={risk.slPct}
                          onChange={val => setRisk(r => ({ ...r, slPct: val }))}
                          min={0.1}
                          step={0.5}
                          suffix="R"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* PHẦN KHÔNG GIAN LÀM VIỆC CHÍNH BÊN PHẢI */}
        <div className="main-section">
          {/* 1. HEADER BAR: BOT TABS (1:1 DESKTOP APP) + JOIN CỘNG ĐỒNG + SLOT INDICATOR */}
          <header className="bot-tabs-bar">
          <div className="bot-tabs-group">
            {[["sub1", "Bot EMA200"], ["sub2", "Bot SMC"], ["sub3", "Bot Liquidation"]].map(([sub, label]) => (
              <button
                key={sub}
                className={`bot-tab ${activeBotTab === sub ? "active" : ""}`}
                onClick={() => setActiveBotTab(sub)}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Slot indicator & Nút Join Cộng đồng */}
          <div className="header-right-tools">
            <a
              href="https://discord.gg/8NXaSCvZ6u"
              target="_blank"
              rel="noopener noreferrer"
              className="btn-join-community"
              title="Tham gia cộng đồng Discord Trader TLS1"
            >
              💬 Join Cộng đồng
            </a>
            <div className="slot-indicator-wrap">
              <span style={{ color: "#ccc", fontSize: "11px", fontWeight: "bold" }}>Slot:</span>
              <span style={{ color: slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50", fontSize: "11px", fontWeight: "bold" }}>
                {slotCount}/{MAX_SLOTS}
              </span>
              <span style={{ display: "inline-flex", gap: "2px", alignItems: "center", marginLeft: "2px" }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const threshold = (i + 1) * 20;
                  const active = slotCount >= threshold - 19;
                  const barColor = slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50";
                  return (
                    <span
                      key={i}
                      style={{
                        display: "inline-block",
                        width: "3px",
                        height: "10px",
                        backgroundColor: active ? barColor : "#3a3a3a",
                        borderRadius: "1px"
                      }}
                    />
                  );
                })}
              </span>
            </div>
          </div>
        </header>

        {/* THẺ LIỀN KHỐI BAO TRÒN TOÀN BỘ MỌI THỨ BÊN TRONG CỤM BOT (1:1 ẢNH 2) */}
        <div className="bot-panel-card">
          {/* Hàng nút Hành động: Bắt đầu / Dừng bot */}
          <div className="bot-action-bar">
            <button
              onClick={handleStartBot}
              disabled={isRunning}
              className="btn-action-start"
            >
              ▶ BẮT ĐẦU CHẠY BOT
            </button>
            <button
              onClick={handleStopBot}
              disabled={!isRunning || isStoppingBot}
              className="btn-action-stop"
            >
              {isStoppingBot ? "⏳ ĐANG DỪNG..." : "■ DỪNG CHẠY BOT"}
            </button>
          </div>

          {/* Cụm thẻ Workspace & Biểu đồ */}
          <div className="chart-panel-card">
            {/* Hàng điều khiển bo gọn đúng đến các nút và sát chart nến */}
            <div className="chart-corner-toolbar">
              <div className="chart-title-controls">
                {/* Nút chọn Bố cục TradingView */}
                <div className="layout-selector-wrapper" ref={layoutSelectorRef}>
                  <button
                    type="button"
                    className={`btn-layout-selector ${showLayoutMenu ? "active" : ""}`}
                    title="Chọn bố cục biểu đồ (TradingView Layout)"
                    onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                  >
                    {renderLayoutIcon(chartLayout, 18, 18)}
                  </button>

                  {showLayoutMenu && (
                    <div className="layout-selector-popover">
                      {/* Row 1: 1 chart */}
                      <div className="layout-popover-row">
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "1" ? "selected" : ""}`}
                          title="1 Biểu đồ đơn"
                          onClick={() => handleSelectLayout("1")}
                        >
                          {renderLayoutIcon("1", 24, 24)}
                        </button>
                      </div>
                      <div className="layout-popover-divider"></div>

                      {/* Row 2: 2 charts */}
                      <div className="layout-popover-row">
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "2-col" ? "selected" : ""}`}
                          title="2 Biểu đồ (Cột dọc 1x2)"
                          onClick={() => handleSelectLayout("2-col")}
                        >
                          {renderLayoutIcon("2-col", 24, 24)}
                        </button>
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "2-row" ? "selected" : ""}`}
                          title="2 Biểu đồ (Hàng ngang 2x1)"
                          onClick={() => handleSelectLayout("2-row")}
                        >
                          {renderLayoutIcon("2-row", 24, 24)}
                        </button>
                      </div>
                      <div className="layout-popover-divider"></div>

                      {/* Row 3: 3 charts */}
                      <div className="layout-popover-row">
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "3-col" ? "selected" : ""}`}
                          title="3 Biểu đồ (Cột dọc 1x3)"
                          onClick={() => handleSelectLayout("3-col")}
                        >
                          {renderLayoutIcon("3-col", 24, 24)}
                        </button>
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "3-row" ? "selected" : ""}`}
                          title="3 Biểu đồ (Hàng ngang 3x1)"
                          onClick={() => handleSelectLayout("3-row")}
                        >
                          {renderLayoutIcon("3-row", 24, 24)}
                        </button>
                      </div>
                      <div className="layout-popover-divider"></div>

                      {/* Row 4: 4 charts */}
                      <div className="layout-popover-row">
                        <button
                          type="button"
                          className={`layout-option-btn ${chartLayout === "4-grid" ? "selected" : ""}`}
                          title="4 Biểu đồ (Lưới 2x2)"
                          onClick={() => handleSelectLayout("4-grid")}
                        >
                          {renderLayoutIcon("4-grid", 24, 24)}
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <button className="btn-chart-settings" onClick={() => setShowSettings(true)}>
                  ⚙ Cài Đặt
                </button>
              </div>
            </div>

            <main className={`main-workspace ${layoutMode}`} style={{ '--chart-ratio': `${chartRatio}%` }}>
              <section className="pane-chart" style={{ position: "relative" }}>
                <div className={`multi-chart-container layout-${chartLayout}`}>
                  {chartsConfig.slice(0, 4).map((cfg, idx) => (
                    <SingleChartPane
                      key={`chart_slot_${idx}`}
                      chartIndex={idx}
                      coin={cfg.coin}
                      tf={cfg.tf}
                      onChangeCoin={(newCoin) => updateChartConfig(idx, { coin: newCoin })}
                      onChangeTf={(newTf) => updateChartConfig(idx, { tf: newTf })}
                      isActive={activeChartIndex === idx}
                      onActivate={() => {
                        setActiveChartIndex(idx);
                        setSelectedCoin(cfg.coin);
                      }}
                      showToolbar={true}
                      layout={chartLayout}
                      isVisible={idx < getActiveChartsCount(chartLayout)}
                    />
                  ))}
                </div>
              </section>

            {/* Resizer */}
            <div
              className={`resizer ${layoutMode === "vertical" ? "horizontal-resizer" : "vertical-resizer"}`}
              onMouseDown={startResizing}
            />

            <section className="pane-tabs">
              <div className="tab-bar-header">
                <div className="tab-buttons">
                  <button className={`tab-btn ${activeTab === "positions" ? "active" : ""}`} onClick={() => setActiveTab("positions")}>
                    📊 Bảng Vị Thế ({safePos.length})
                  </button>
                  <button className={`tab-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
                    🖥 Logs
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingRight: "12px", whiteSpace: "nowrap", flexShrink: 0 }}>
                  {/* Tạm thời ẩn nút lịch sử lệnh theo yêu cầu CEO */}
                  {/* <button
                    className={activeTab === "history" ? "active-icon-btn" : "icon-btn"}
                    onClick={() => setActiveTab("history")}
                    title={`Lịch Sử Lệnh (${closedPositions.length})`}
                    style={{
                      padding: "4px 8px",
                      background: activeTab === "history" ? "#ff990022" : "#222",
                      border: activeTab === "history" ? "1px solid #ff9900" : "1px solid #444",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "15px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    📜
                  </button> */}
                  <span className={`status-badge ${isRunning ? "running" : "stopped"}`}>
                    {isRunning ? `● ĐANG CHẠY | ${formatUptime(uptime)}` : "● ĐÃ DỪNG"}
                  </span>
                </div>
              </div>
              <div className="tab-content">
                {activeTab === "logs" ? (
                  <div className="logs-terminal" ref={terminalRef}>
                    {logs.map((block) => (
                      <div key={block.id} className="log-block" style={{ marginBottom: "20px" }}>
                        {block.lines.map((l, i) => <div key={i} className="log-line">{l}</div>)}
                      </div>
                    ))}
                  </div>
                ) : activeTab === "history" ? (
                  <div className="positions-table-wrapper" style={{ flex: 1, overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="positions-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                      <thead>
                        <tr style={{ background: "#252526", borderBottom: "1px solid #333" }}>
                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "15px", whiteSpace: "nowrap" }}>Thời gian đóng</th>
                          <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "15px", whiteSpace: "nowrap" }}>Cặp giao dịch (TF)</th>
                          <th style={{ padding: "6px 10px", fontSize: "15px", whiteSpace: "nowrap" }}>Giá vào</th>
                          <th style={{ padding: "6px 10px", fontSize: "15px", whiteSpace: "nowrap" }}>Giá đóng</th>
                          <th style={{ padding: "6px 10px", fontSize: "15px", whiteSpace: "nowrap" }}>Ký quỹ</th>
                          <th style={{ padding: "6px 15px", textAlign: "right", fontSize: "15px", whiteSpace: "nowrap", minWidth: "120px" }}>PNL (USDT)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {closedPositions.map((pos) => (
                          <tr key={pos.ticket_id} style={{ borderBottom: "1px solid #333" }}>
                            <td style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", color: "#aaa" }}>
                              {new Date(pos.closeTime).toLocaleString('vi-VN')}
                            </td>
                            <td style={{ textAlign: "left", padding: "6px 10px", fontSize: "15px", fontWeight: "bold", color: pos.posSide === "long" ? "#4caf50" : "#ff5252" }}>
                              {pos.instId.replace("-SWAP", "")} ({pos.tf})
                            </td>
                            <td style={{ padding: "6px 10px", fontSize: "15px" }}>{parseFloat(pos.entryPx).toFixed(4)}</td>
                            <td style={{ padding: "6px 10px", fontSize: "15px" }}>{parseFloat(pos.exitPx).toFixed(4)}</td>
                            <td style={{ padding: "6px 10px", fontSize: "15px" }}>{parseFloat(pos.pos).toFixed(2)}</td>
                            <td style={{ padding: "6px 15px", fontSize: "15px", fontWeight: "bold", color: parseFloat(pos.pnl) >= 0 ? "#4caf50" : "#ff5252" }}>
                              {parseFloat(pos.pnl) >= 0 ? "+" : ""}{parseFloat(pos.pnl).toFixed(4)} $
                            </td>
                          </tr>
                        ))}
                        {closedPositions.length === 0 && (
                          <tr>
                            <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                              Chưa có dữ liệu lịch sử đóng lệnh.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="positions-table-wrapper" style={{ flex: 1, overflowX: "auto", overflowY: "auto", WebkitOverflowScrolling: "touch" }}>
                    <table className="positions-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                      <thead>
                        <tr style={{ background: "#252526", borderBottom: "1px solid #333" }}>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cặp giao dịch</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Điểm vào</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Ký quỹ</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap", minWidth: "150px" }}>PNL thả nổi</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>TF trade</th>
                          <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cắt lệnh</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          const baseCoins = [
                            COIN_LIST.find(c => c.value === "BTC-USDT-SWAP") || { label: "BTC-USDT", value: "BTC-USDT-SWAP" },
                            COIN_LIST.find(c => c.value === "ETH-USDT-SWAP") || { label: "ETH-USDT", value: "ETH-USDT-SWAP" },
                            COIN_LIST.find(c => c.value === "XAU-USDT-SWAP") || { label: "XAU-USDT", value: "XAU-USDT-SWAP" },
                          ];
                          const allCoinValues = new Set([...baseCoins.map(c => c.value), ...safePos.map(p => p.instId)]);
                          const displayCoins = Array.from(allCoinValues).map(val => {
                            const found = COIN_LIST.find(c => c.value === val);
                            if (found) return found;
                            return { label: val.replace("-SWAP", ""), value: val };
                          }).filter(c => c.value !== "USDT.D");

                          const getCoinRoi = (coinValue) => {
                            const list = safePos.filter(p => p.instId === coinValue);
                            if (list.length === 0) return -999999999;
                            return Math.max(...list.map(p => parseFloat(p.roi || 0)));
                          };

                          const sortedCoins = [...displayCoins].sort((a, b) => {
                            return getCoinRoi(b.value) - getCoinRoi(a.value); // % PNL cao nhất từ trên xuống dưới
                          });

                          return sortedCoins.map((coin, i) => {
                            const posList = safePos
                              .filter(p => p.instId === coin.value)
                              .sort((a, b) => parseFloat(b.roi || 0) - parseFloat(a.roi || 0));
                            const isChecked = activePairs.includes(coin.value);

                          if (posList.length === 0) {
                            return (
                              <tr key={coin.value} style={{ borderBottom: "1px solid #333" }}>
                                <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap", borderLeft: "3px solid transparent" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => togglePair(coin.value)}
                                      onClick={e => e.stopPropagation()}
                                      style={{ cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
                                    />
                                    <span style={{ color: "#aaa", fontSize: "15px" }}>{coin.label.replace("-SWAP", "")}</span>
                                  </div>
                                </td>
                                <td></td><td></td><td></td>
                                <td style={{ padding: "6px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                                  <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                    {["M5", "M15", "M30", "H1", "H2", "H4"].map(tf => {
                                      const coinTfs = Array.isArray(enabledTfs) ? enabledTfs : (enabledTfs[coin.value] || []);
                                      const isOn = coinTfs.includes(tf);
                                      const label = tf.replace("M", "");
                                      return (
                                        <span
                                          key={tf}
                                          onClick={() => handleTfToggle(coin.value, tf)}
                                          style={{
                                            cursor: "pointer", padding: "0px", borderRadius: "6px",
                                            fontSize: "12px", fontWeight: "bold",
                                            background: isOn ? "#1d766b" : "#222222", color: isOn ? "#f0f0f0" : "#aaaaaa",
                                            border: isOn ? "1px solid #1d766b" : "1px solid #444444",
                                            width: "24px", height: "19px", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center"
                                          }}
                                        >
                                          {label}
                                        </span>
                                      );
                                    })}
                                  </div>
                                </td>
                                <td></td>
                              </tr>
                            );
                          }

                          return posList.map((pos, ticketIndex) => {
                            const isLong = pos.posSide === "long";
                            const upl = parseFloat(pos.upl || "0");
                            const margin = parseFloat(pos.margin || "0");
                            const isChild = pos.is_child;
                            const isAggregate = pos.is_aggregate || (!isChild && ticketIndex === 0);

                            return (
                              <tr key={`${coin.value}-${pos.ticket_id || ticketIndex}`} style={{ borderBottom: ticketIndex === posList.length - 1 ? "1px solid #333" : (isChild ? "1px solid transparent" : "1px solid rgba(255, 255, 255, 0.03)"), position: "relative", backgroundColor: isChild ? "rgba(255, 255, 255, 0.01)" : "transparent" }}>
                                <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap", paddingLeft: isChild ? "32px" : "16px" }}>
                                  {!isChild && <div style={{ position: "absolute", left: 0, top: "6px", bottom: "6px", width: "4px", borderRadius: "2px", backgroundColor: isLong ? "#4caf50" : "#ff5252" }}></div>}
                                  
                                  <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                    {!isChild ? (
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => togglePair(coin.value)}
                                        onClick={e => e.stopPropagation()}
                                        style={{ cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
                                      />
                                    ) : (
                                      <div style={{ width: "18px", height: "18px", flexShrink: 0 }}></div>
                                    )}
                                    
                                    <span style={{ fontSize: isChild ? "13px" : "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                                      <span style={{ color: isChild ? "rgba(255,255,255,0.4)" : "#fff" }}>{coin.label.replace("-SWAP", "")}</span>
                                      
                                      {!isChild && (
                                        <span style={{ fontSize: "12px", color: isLong ? "#4caf50" : "#ff5252", backgroundColor: isLong ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 82, 82, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                          {isLong ? "Long" : "Short"} {pos.lever || "100"}x
                                        </span>
                                      )}
                                      
                                      {isChild && pos.tf && (
                                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "1px 6px" }}>
                                          {pos.tf.toLowerCase()}
                                        </span>
                                      )}
                                    </span>
                                  </div>
                                </td>
                                <td style={{ textAlign: "center", padding: "6px 10px", fontSize: isChild ? "13px" : "15px", color: isChild ? "rgba(255,255,255,0.4)" : "#fff", whiteSpace: "nowrap" }}>{pos.avgPx ? parseFloat(pos.avgPx).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0"}</td>
                                <td style={{ textAlign: "center", padding: "6px 10px", fontSize: isChild ? "13px" : "15px", color: isChild ? "rgba(255,255,255,0.4)" : "#fff", whiteSpace: "nowrap" }}>{margin.toFixed(2)} $</td>
                                <td style={{ padding: "6px 10px", textAlign: "center", fontSize: "15px", whiteSpace: "nowrap" }}>
                                  {(() => {
                                    const roi = parseFloat(pos.roi || 0);
                                    const color = roi >= 0 ? "#26a69a" : "#ef5350";
                                    return (
                                      <span style={{ color }}>
                                          <span style={{ fontSize: "17px" }}>{upl >= 0 ? "+" : ""}{upl.toFixed(2)}</span> USDT &nbsp;&nbsp; <span style={{ opacity: 0.97 }}>({roi > 0 ? "+" : ""}{roi.toFixed(2)}%)</span>
                                        </span>
                                    );
                                  })()}
                                </td>
                                <td style={{ padding: "6px 10px", textAlign: "center", whiteSpace: "nowrap" }}>
                                  {!isChild && ticketIndex === 0 && (
                                    <div style={{ display: "flex", gap: "5px", justifyContent: "center" }}>
                                      {["M5", "M15", "M30", "H1", "H2", "H4"].map(tf => {
                                        const coinTfs = Array.isArray(enabledTfs) ? enabledTfs : (enabledTfs[coin.value] || []);
                                        const isOn = coinTfs.includes(tf);
                                        const label = tf.replace("M", "");
                                        return (
                                          <span
                                            key={tf}
                                            onClick={() => handleTfToggle(coin.value, tf)}
                                            style={{
                                              cursor: "pointer", padding: "0px", borderRadius: "6px",
                                              fontSize: "12px", fontWeight: "bold",
                                              background: isOn ? "#1d766b" : "#222222", color: isOn ? "#f0f0f0" : "#aaaaaa",
                                              border: isOn ? "1px solid #1d766b" : "1px solid #444444",
                                              width: "24px", height: "19px", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center"
                                            }}
                                          >
                                            {label}
                                          </span>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: "center", padding: "6px 10px" }}>
                                  <button
                                    onClick={async () => {
                                      const coinName = coin.label.replace("-SWAP", "");
                                      if (!window.confirm(`Bạn có chắc chắn muốn đóng vị thế ${coinName} không?`)) return;
                                      try {
                                        const u = localStorage.getItem('tls1_uid') || loginUid;
                                        const strat = selectedAccount || "sub1";
                                        const res = await fetch(`/api/bot/positions/close_ticket?uid=${u}&strategy=${strat}`, {
                                          method: "POST",
                                          headers: { "Content-Type": "application/json" },
                                          body: JSON.stringify({
                                            ticket_id: pos.ticket_id,
                                            instId: pos.instId || `${coin.value}-SWAP`,
                                            posSide: pos.posSide,
                                            pos: pos.pos,
                                            upl: pos.upl,
                                            exitPx: pos.lastPx
                                          })
                                        });
                                        const data = await res.json();
                                        if (res.ok) {
                                          alert(`✅ Đã đóng vị thế ${coinName} thành công!`);
                                          fetchPositions();
                                        } else {
                                          alert(`❌ Lỗi khi đóng vị thế ${coinName}: ` + (data.detail || data.message || "Lỗi máy chủ"));
                                        }
                                      } catch (e) {
                                        alert(`❌ Lỗi kết nối khi đóng vị thế ${coinName}: ` + e.message);
                                      }
                                    }}
                                    style={{
                                      background: "#c62828", color: "white", border: "none",
                                      borderRadius: "6px", padding: "6px 16px", cursor: "pointer",
                                      fontSize: "14px", fontWeight: "bold"
                                    }}>
                                    Đóng
                                  </button>
                                </td>
                              </tr>
                            );
                          });
                        });
                      })()}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          </main>
          </div>
        </div>
      </div>
    </div>

            {/* SETTINGS MODAL — 1:1 CLONE TỪ DESKTOP APP (PyQt6 QDialog) */}
      {showSettings && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="modal-content settings-modal">
            {/* Header Dialog */}
            <div className="modal-header">
              <h3>⚙️ Cấu Hình Hệ Thống - {activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation"}</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)} title="Đóng">×</button>
            </div>

            {/* Tab Bar (InnerTabs) */}
            <div className="settings-tab-bar">
              <button className={`settings-tab-btn ${settingsTab === "api" ? "active" : ""}`} onClick={() => setSettingsTab("api")}>
                🔑 Cấu Hình API Key
              </button>
              <button className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`} onClick={() => setSettingsTab("strategy")}>
                ⚙️ Cấu Hình Chiến Thuật
              </button>
            </div>

            <div className="modal-body settings-body">

              {/* ===== TAB 1: CẤU HÌNH API KEY ===== */}
              {settingsTab === "api" && (
                <div className="settings-tab-content">
                  <div className="settings-tab-scroll">
                  {/* Chọn tài khoản */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginBottom: "14px" }}>
                    <label style={{ color: "#e0e0e0", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                      Tài khoản gán cho [{activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot"}]:
                    </label>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                      <select
                        className="styled-select"
                        style={{ minWidth: "200px", background: "#2d2d2d", border: "1px solid #555555", color: "#e0e0e0", padding: "5px 10px", borderRadius: "4px", fontSize: "12px" }}
                        value={selectedAccount}
                        onChange={e => handleAssignAccountToActiveBot(e.target.value)}
                      >
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>{acc.name}</option>
                        ))}
                      </select>
                      <button
                        style={{ backgroundColor: "#28a745", color: "white", fontSize: "16px", fontWeight: "bold", borderRadius: "4px", width: "32px", height: "28px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Tạo Tài Khoản Mới"
                        onClick={handleCreateAccount}
                      >+</button>
                      <button
                        style={{ backgroundColor: "#dc3545", color: "white", fontSize: "16px", fontWeight: "bold", borderRadius: "4px", width: "32px", height: "28px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Xóa Tài Khoản"
                        onClick={handleDeleteAccount}
                      >−</button>
                    </div>
                  </div>

                  {/* Thông Tin API OKX */}
                  <div className="settings-group">
                    <div className="settings-group-title">Thông Tin API OKX</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                      <div className="settings-form-row">
                        <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Mã API (API Key):</label>
                        <input
                          type="text"
                          className="styled-input"
                          style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                          value={apiKey}
                          onChange={e => setApiKey(e.target.value)}
                          placeholder="Nhập API Key..."
                        />
                      </div>
                      <div className="settings-form-row">
                        <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Khóa Bí Mật (Secret):</label>
                        <input
                          type="password"
                          className="styled-input"
                          style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                          value={secretKey}
                          onChange={e => setSecretKey(e.target.value)}
                          placeholder="Nhập Secret Key..."
                        />
                      </div>
                      <div className="settings-form-row">
                        <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Cụm Mật Khẩu (Pass):</label>
                        <input
                          type="password"
                          className="styled-input"
                          style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                          value={passphrase}
                          onChange={e => setPassphrase(e.target.value)}
                          placeholder="Nhập Passphrase..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Lệnh Can Thiệp Nhanh */}
                  <div className="settings-group">
                    <div className="settings-group-title">Lệnh Can Thiệp Nhanh (Audit Hệ Thống)</div>
                    <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                      <button
                        className="btn-audit"
                        onClick={handleResetCapital}
                      >
                        ♻️ Reset Vốn Gốc (Audit)
                      </button>
                      {(Boolean(localStorage.getItem('tls1_uid') || loginUid) && (localStorage.getItem('tls1_uid') || loginUid).toLowerCase().startsWith("admtls12021_")) && (
                        <button
                          className="btn-audit"
                          onClick={handleResetNen}
                        >
                          ♻️ Reset Đếm Nến
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Mã Máy HWID */}
                  <div className="settings-group">
                    <div className="settings-group-title">Mã Máy (HWID) Cá Nhân</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                      <span style={{ color: "#aaaaaa", fontSize: "12px" }}>Mã Máy của bạn:</span>
                      <span
                        className="hwid-value"
                        style={{ color: "#00ffff", fontWeight: "bold", fontSize: "13px", cursor: "pointer", fontFamily: "Consolas, monospace" }}
                        title="Click để copy Mã Máy"
                        onClick={() => {
                          navigator.clipboard.writeText(hwid);
                          alert("✅ Đã Copy Mã Máy: " + hwid);
                        }}
                      >
                        {hwid}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const admFormat = `admtls12021_${hwid.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}`;
                          navigator.clipboard.writeText(admFormat);
                          alert(`✅ Đã copy ID Admin theo mã máy:\n${admFormat}`);
                        }}
                        style={{
                          background: "#333",
                          border: "1px solid #555",
                          color: "#ff9900",
                          borderRadius: "4px",
                          padding: "2px 8px",
                          fontSize: "11px",
                          cursor: "pointer"
                        }}
                        title="Copy ID Admin kèm Mã Máy"
                      >
                        Copy Admin ID theo Mã Máy
                      </button>
                      <button
                        type="button"
                        onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U&list=PLdzvL_bHCpls&index=2", "_blank", "noopener,noreferrer")}
                        style={{
                          background: "#e50914",
                          border: "1px solid #ff4d4d",
                          color: "#ffffff",
                          borderRadius: "4px",
                          padding: "2px 10px",
                          fontSize: "11px",
                          fontWeight: "bold",
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px"
                        }}
                        title="Xem video Hướng Dẫn Sử Dụng trên YouTube"
                      >
                        📺 Hướng Dẫn Sử Dụng
                      </button>
                    </div>
                  </div>
                  </div>

                  {/* Nút Lưu API Key chuẩn vị trí Tab 1 Desktop App */}
                  <div className="api-actions-row">
                    <button
                      type="button"
                      className="btn-logout-strat"
                      onClick={() => {
                        localStorage.removeItem("tls1_auth");
                        localStorage.removeItem("tls1_uid");
                        window.location.reload();
                      }}
                    >
                      Đăng Xuất
                    </button>
                    <button
                      type="button"
                      className="btn-save-strat"
                      disabled={isSavingConfig}
                      onClick={async () => {
                        setIsSavingConfig(true);
                        await new Promise(resolve => setTimeout(resolve, 1200));
                        try {
                          const res = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
                            method: "POST", headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ api_key: apiKey, secret_key: secretKey, passphrase })
                          });

                          if (!res.ok) {
                            const errorData = await res.json();
                            alert(`❌ Lỗi: ${errorData.detail || "Không thể lưu API Key"}`);
                            setIsSavingConfig(false);
                            return;
                          }

                          handleAssignAccountToActiveBot(selectedAccount);
                          const curAccName = accounts.find(a => a.id === selectedAccount)?.name || selectedAccount;
                          alert(`Đã lưu cấu hình API Key cho [${curAccName}] và gán cho [${activeBotTab === "sub1" ? "Bot EMA200" : "Bot SMC"}]!`);
                          addSystemLog(`🔑 [SYSTEM] Đã lưu cấu hình API Key cho tài khoản "${curAccName}"`);
                        } catch (e) {
                          alert(`Lỗi kết nối khi lưu API Key: ${e.message}`);
                        }
                        setIsSavingConfig(false);
                        setShowSettings(false);
                      }}
                    >
                      {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "LƯU CẤU HÌNH API KEY"}
                    </button>
                  </div>
                </div>
              )}

              {/* ===== TAB 2: CẤU HÌNH CHIẾN THUẬT ===== */}
              {settingsTab === "strategy" && (
                <div className="settings-tab-content">
                  <div className="settings-tab-scroll">
                  {activeBotTab === "sub1" ? (
                    <>
                      {/* QUẢN LÝ VỐN & RỦI RO (Chuẩn Desktop App gui_main.py:2293) */}
                      <div className="settings-group">
                        <div className="settings-group-title">QUẢN LÝ VỐN & RỦI RO</div>
                        <div className="entry-setup-list">
                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Volume Size ({risk.volUnit}):</span>
                            </div>
                            <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                              <button
                                type="button"
                                onClick={() => setRisk(r => ({ ...r, volUnit: r.volUnit === "USDT" ? "LOT" : "USDT" }))}
                                style={{
                                  padding: "2px 8px", fontSize: "11px", borderRadius: "4px",
                                  border: "1px solid #555", background: "#2d2d2d", color: "#ff9900",
                                  cursor: "pointer", fontWeight: "bold"
                                }}
                              >
                                {risk.volUnit}
                              </button>
                              <NumberSpinBox
                                value={risk.posVol}
                                onChange={val => setRisk(r => ({ ...r, posVol: val }))}
                                min={risk.volUnit === "LOT" ? 0.01 : 1}
                                step={risk.volUnit === "LOT" ? 0.01 : 10}
                                width="95px"
                              />
                            </div>
                          </div>
                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Mức chốt lời gốc M5:</span>
                            </div>
                            <NumberSpinBox
                              value={risk.tpPct}
                              onChange={val => setRisk(r => ({ ...r, tpPct: val }))}
                              min={0.1}
                              step={0.05}
                              suffix="%"
                              width="95px"
                            />
                          </div>
                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Mức cắt lỗ gốc M5:</span>
                            </div>
                            <NumberSpinBox
                              value={risk.slPct}
                              onChange={val => setRisk(r => ({ ...r, slPct: val }))}
                              min={0.1}
                              step={0.05}
                              suffix="%"
                              width="95px"
                            />
                          </div>
                        </div>
                      </div>
                      {/* 1. Công Tắc Chiến Thuật EMA200 (Chuẩn layout Desktop: DCA Dương bên trái, Hedge & Chốt lời EMA200 cột phải) */}
                      <div className="settings-group">
                        <div className="settings-group-title">Công Tắc Chiến Thuật</div>
                        <div className="tactics-toggles-layout">
                          {/* Cột trái: DCA Dương chiếm trọn chiều cao */}
                          <div className="toggle-row tactics-left-col">
                            <ToggleSwitch checked={strat.pyramidDca ?? true} onChange={v => setStrat(s => ({ ...s, pyramidDca: v }))} />
                            <span className="toggle-name">Chế độ: DCA Dương (Mới)</span>
                            <button className="btn-help" onClick={() => alert("BẬT: Nhồi lệnh thuận xu hướng từ H4->M5. TẮT: DCA âm từ M5->H4 (Mặc định).")} title="BẬT: Nhồi lệnh thuận xu hướng từ H4->M5. TẮT: DCA âm từ M5->H4 (Mặc định).">[?]</button>
                          </div>

                          {/* Cột phải: Đánh Sóng Đảo Chiều ở trên, Chốt lời bám EMA200 ở dưới */}
                          <div className="tactics-right-col">
                            <div className="toggle-row">
                              <ToggleSwitch checked={strat.hedge ?? strat.xole} onChange={v => setStrat(s => ({ ...s, hedge: v, xole: v }))} />
                              <span className="toggle-name">Đánh Sóng Đảo Chiều (Hedge)</span>
                              <button className="btn-help" onClick={() => alert("Bật/Tắt chiến thuật HEDGE đánh sóng đảo chiều khi giá cách EMA200 H4 > 8%")} title="Bật/Tắt chiến thuật HEDGE đánh sóng đảo chiều khi giá cách EMA200 H4 > 8%">[?]</button>
                            </div>
                            <div className="toggle-row">
                              <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({ ...s, dynamicEma200Tp: v }))} />
                              <span className="toggle-name">Chốt lời bám EMA200</span>
                              <button className="btn-help" onClick={() => alert("Chốt lời động bám theo trục EMA200 của khung thời gian nhỏ hơn liền kề.")} title="Chốt lời động bám theo trục EMA200 của khung thời gian nhỏ hơn liền kề.">[?]</button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 2. Lớp Bảo Vệ Cục Bộ EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Bảo Vệ & Cắt Lệnh Tự Động</div>
                        <div className="toggle-grid">
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.safeguardEntry} onChange={v => setStrat(s => ({ ...s, safeguardEntry: v }))} />
                            <span className="toggle-name">Thoát hòa vốn khi giá hồi</span>
                            <button className="btn-help" onClick={() => alert("Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry.")} title="Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.trailingSl} onChange={v => setStrat(s => ({ ...s, trailingSl: v }))} />
                            <span className="toggle-name">Khóa lời động (Trailing SL)</span>
                            <button className="btn-help" onClick={() => alert("Trailing SL động — tự kéo chặn lãi theo sóng khi ROI tăng dần.")} title="Trailing SL động — tự kéo chặn lãi theo sóng khi ROI tăng dần.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.maxRoi} onChange={v => setStrat(s => ({ ...s, maxRoi: v }))} />
                            <span className="toggle-name">Chốt lời lớn (ROI ≥ 120%)</span>
                            <button className="btn-help" onClick={() => alert("Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng).")} title="Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng).">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.h4Flip} onChange={v => setStrat(s => ({ ...s, h4Flip: v }))} />
                            <span className="toggle-name">Cắt lệnh khi H4 đảo chiều</span>
                            <button className="btn-help" onClick={() => alert("Đóng toàn bộ vị thế ngược chiều khi nến H4 đổi hướng (tích lũy >= 60).")} title="Đóng toàn bộ vị thế ngược chiều khi nến H4 đổi hướng (tích lũy >= 60).">[?]</button>
                          </div>
                        </div>
                      </div>



                      {/* 2. Điểm Vào Lệnh (Entry Setup) EMA200 — Mỗi setting là 1 dòng riêng biệt */}
                      <div className="settings-group">
                        <div className="settings-group-title">Điểm Vào Lệnh (Entry Setup)</div>
                        <div className="entry-setup-list">
                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Đón trước cản:</span>
                              <button className="btn-help" onClick={() => alert("Đệm đón trước (VD: 0.05%) trừ lùi vào vị trí đặt Limit để dễ khớp trước vạch cản.")}>[?]</button>
                            </div>
                            <NumberSpinBox
                              value={entryCfg.entryOffset}
                              onChange={val => setEntryCfg(prev => ({ ...prev, entryOffset: val }))}
                              step={0.01}
                              min={0}
                              suffix="%"
                              width="95px"
                            />
                          </div>

                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Khoảng cách nhồi DCA:</span>
                              <button className="btn-help" onClick={() => alert("Khoảng cách tối thiểu giữa 2 trục EMA200 liền kề (VD: 0.20%) để rải limit. Dưới mức này sẽ gộp lệnh.")}>[?]</button>
                            </div>
                            <NumberSpinBox
                              value={entryCfg.dcaGapPct}
                              onChange={val => setEntryCfg(prev => ({ ...prev, dcaGapPct: val }))}
                              step={0.05}
                              min={0}
                              suffix="%"
                              width="95px"
                            />
                          </div>

                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span>Số nến xu hướng tối thiểu:</span>
                              <button className="btn-help" onClick={() => alert("Số nến tối thiểu phải duy trì xu hướng liên tục để xác nhận tín hiệu vào lệnh.")}>[?]</button>
                            </div>
                            <NumberSpinBox
                              value={entryCfg.accumCandles}
                              onChange={val => setEntryCfg(prev => ({ ...prev, accumCandles: val }))}
                              min={1}
                              max={200}
                              step={1}
                              width="95px"
                            />
                          </div>

                          <div className="entry-setup-row">
                            <div className="entry-label-wrap">
                              <span style={{ fontWeight: "bold", color: "#ffffff" }}>Altcoin neo theo BTC:</span>
                            </div>
                            <ToggleSwitch
                              checked={entryCfg.altcoinFollowBtc}
                              onChange={v => setEntryCfg(prev => ({ ...prev, altcoinFollowBtc: v }))}
                            />
                          </div>

                          {entryCfg.altcoinFollowBtc && (
                            <div className="entry-setup-row">
                              <div className="entry-label-wrap">
                                <span>Hệ số nhạy ETH (Vol Mult):</span>
                                <button className="btn-help" onClick={() => alert("Hệ số nhân Volume cho ETH khi đánh theo BTC.")}>[?]</button>
                              </div>
                              <NumberSpinBox
                                value={entryCfg.ethVolMult}
                                onChange={val => setEntryCfg(prev => ({ ...prev, ethVolMult: val }))}
                                step={0.1}
                                min={0}
                                width="95px"
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* 5. Hệ Số Nhân Đa Khung (TF Multipliers) EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Hệ Số Nhân Đa Khung (TF Multipliers)</div>
                        <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ color: "#aaaaaa", borderBottom: "1px solid #333333" }}>
                              <th style={{ padding: "6px 8px", textAlign: "left" }}>Khung</th>
                              <th style={{ padding: "6px 8px" }}>Hệ số đón trước</th>
                              <th style={{ padding: "6px 8px" }}>Hệ số Volume</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              ["M5", "1.0x", "1.0x"],
                              ["M15", "1.5x", "1.2x"],
                              ["M30", "2.3x", "1.5x"],
                              ["H1", "3.3x", "2.0x"],
                              ["H2", "4.7x", "3.0x"],
                              ["H4", "6.8x", "5.0x"],
                            ].map(([tf, offset, vol]) => (
                              <tr key={tf} style={{ borderBottom: "1px solid #282828" }}>
                                <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: "bold", color: "#26a69a" }}>{tf}</td>
                                <td style={{ padding: "6px 8px", color: "#e0e0e0" }}>{offset}</td>
                                <td style={{ padding: "6px 8px", color: "#ff9900", fontWeight: "bold" }}>{vol}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 1. Chiến Thuật Bắt Sóng SMC */}
                      <div className="settings-group">
                        <div className="settings-group-title">Chiến Thuật Bắt Sóng SMC</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                            <span className="toggle-name">Đánh SMC Order Block</span>
                            <button className="btn-help" onClick={() => alert("Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch SMC.")}>[?]</button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Khung thời gian gốc (Base TF):</span>
                            <select
                              className="styled-select"
                              value={strat.timeframeBase || "1H"}
                              onChange={e => setStrat(s => ({ ...s, timeframeBase: e.target.value }))}
                              style={{ width: "90px" }}
                            >
                              <option value="5m">5m</option>
                              <option value="15m">15m</option>
                              <option value="30m">30m</option>
                              <option value="1H">1H</option>
                              <option value="2H">2H</option>
                              <option value="4H">4H</option>
                            </select>
                          </div>
                        </div>
                      </div>



                      {/* 2. Cấu Hình Bắt Sóng SMC — Mỗi setting là 1 dòng riêng biệt */}
                      <div className="settings-group">
                        <div className="settings-group-title">Cấu Hình Bắt Sóng SMC</div>
                        <div className="entry-setup-list">
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Nguồn bắt cản (OB Source):</span>
                            <select
                              className="styled-select"
                              style={{ width: "130px" }}
                              value={smcEntryCfg.source}
                              onChange={e => setSmcEntryCfg(s => ({ ...s, source: e.target.value }))}
                            >
                              <option value="ALL">Cả hai sóng</option>
                              <option value="SWING">Chỉ sóng lớn</option>
                              <option value="INTERNAL">Chỉ sóng nhỏ</option>
                            </select>
                          </div>
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Hướng vào lệnh:</span>
                            <select
                              className="styled-select"
                              style={{ width: "130px" }}
                              value={smcEntryCfg.dir}
                              onChange={e => setSmcEntryCfg(s => ({ ...s, dir: e.target.value }))}
                            >
                              <option value="BOTH">Hai chiều</option>
                              <option value="LONG_ONLY">Chỉ Long</option>
                              <option value="SHORT_ONLY">Chỉ Short</option>
                            </select>
                          </div>
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Lọc lực nến cản (x ATR):</span>
                            <NumberSpinBox
                              value={smcEntryCfg.obVol}
                              onChange={val => setSmcEntryCfg(s => ({ ...s, obVol: val }))}
                              step={0.1}
                              min={0}
                              width="95px"
                            />
                          </div>
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Độ dài sóng lớn (Swing nến):</span>
                            <NumberSpinBox
                              value={smcEntryCfg.swingLength}
                              onChange={val => setSmcEntryCfg(s => ({ ...s, swingLength: val }))}
                              min={10}
                              max={200}
                              step={1}
                              width="95px"
                            />
                          </div>
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Độ dài sóng nhỏ (Internal nến):</span>
                            <NumberSpinBox
                              value={smcEntryCfg.internalLength}
                              onChange={val => setSmcEntryCfg(s => ({ ...s, internalLength: val }))}
                              min={1}
                              max={50}
                              step={1}
                              width="95px"
                            />
                          </div>
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px", fontWeight: "bold", color: "#ffffff" }}>Ép khớp Market khi lọt cản:</span>
                            <ToggleSwitch
                              checked={smcEntryCfg.forceMarket}
                              onChange={v => setSmcEntryCfg(s => ({ ...s, forceMarket: v }))}
                            />
                          </div>
                          {smcEntryCfg.forceMarket && (
                            <div className="entry-setup-row">
                              <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Trượt giá Market tối đa:</span>
                              <NumberSpinBox
                                value={smcEntryCfg.maxSlippage}
                                onChange={val => setSmcEntryCfg(s => ({ ...s, maxSlippage: val }))}
                                step={0.1}
                                min={0}
                                suffix="%"
                                width="95px"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  </div>

                  {/* Hàng 2 nút điều khiển chuẩn Desktop App bên dưới Tab 2 */}
                  <div className="strat-actions-row">
                    <button
                      type="button"
                      className="btn-reset-strat"
                      onClick={() => {
                        if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình chiến thuật về MẶC ĐỊNH của app không?")) {
                          if (activeBotTab === "sub1") {
                            setRisk({ posVol: 100, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
                            setStrat({
                              main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
                              dynamicPingpongTp: false, altcoinFollowBtc: true,
                              sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
                              trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
                            });
                            setEntryCfg({
                              entryOffset: "0.05",
                              dcaGapPct: "0.20",
                              confluencePct: "0.23",
                              accumCandles: 60,
                              altcoinFollowBtc: true,
                              ethVolMult: "1.30",
                            });
                          } else if (activeBotTab === "sub2") {
                            setRisk({ posVol: 100, tpPct: 5.0, slPct: 1.0, volUnit: "USDT" });
                            setStrat({
                              main: true, xole: false, dynamicEma200Tp: false,
                              dynamicPingpongTp: false, altcoinFollowBtc: false,
                              sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
                              trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
                              timeframeBase: "1H",
                            });
                            setSmcEntryCfg({
                              source: "ALL",
                              dir: "BOTH",
                              obVol: 2.0,
                              swingLength: 50,
                              internalLength: 5,
                              forceMarket: true,
                              maxSlippage: 0.8,
                            });
                          }
                          alert("Đã khôi phục cài đặt về mặc định của nhà sản xuất!");
                        }
                      }}
                    >
                      KHÔI PHỤC MẶC ĐỊNH
                    </button>
                    <button
                      type="button"
                      className="btn-save-strat"
                      disabled={isSavingConfig}
                      onClick={async () => {
                        setIsSavingConfig(true);
                        await new Promise(resolve => setTimeout(resolve, 1200));
                        alert(`Đã lưu Cấu Hình Chiến Thuật cho [${activeBotTab === "sub1" ? "Bot EMA200" : "Bot SMC"}] thành công!`);
                        addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình Chiến Thuật cho ${activeBotTab === "sub1" ? "Bot EMA200" : "Bot SMC"}`);
                        setIsSavingConfig(false);
                        setShowSettings(false);
                      }}
                    >
                      {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "LƯU CẤU HÌNH CHIẾN THUẬT (AUTO-RELOAD)"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL TẠO TÀI KHOẢN MỚI */}
      {showAddAccountModal && (
        <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && setShowAddAccountModal(false)}>
          <div className="account-prompt-card">
            <div className="account-prompt-title">➕ Tạo Tài Khoản Mới</div>
            <div style={{ color: "#aaa", fontSize: "12px", marginBottom: "12px", marginTop: "4px" }}>
              Nhập tên tài khoản bạn muốn tạo:
            </div>
            <input
              type="text"
              className="styled-input"
              placeholder="Ví dụ: Tài khoản phụ 2, Quỹ A, v.v..."
              value={newAccountInput}
              onChange={e => setNewAccountInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") confirmCreateAccount();
                if (e.key === "Escape") {
                  setShowAddAccountModal(false);
                  setNewAccountInput("");
                }
              }}
              autoFocus
              style={{
                width: "100%",
                padding: "8px 10px",
                fontSize: "13px",
                backgroundColor: "#1e1e1e",
                color: "#ffffff",
                border: "1px solid #555555",
                borderRadius: "4px",
                boxSizing: "border-box"
              }}
            />
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
              <button
                type="button"
                disabled={isCreatingAccount}
                onClick={() => { setShowAddAccountModal(false); setNewAccountInput(""); }}
                style={{
                  padding: "7px 15px",
                  background: "#333333",
                  border: "1px solid #555555",
                  borderRadius: "4px",
                  color: "#cccccc",
                  cursor: isCreatingAccount ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                  opacity: isCreatingAccount ? 0.6 : 1
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isCreatingAccount}
                onClick={confirmCreateAccount}
                style={{
                  padding: "7px 18px",
                  background: isCreatingAccount ? "#1e7e34" : "#28a745",
                  border: "none",
                  borderRadius: "4px",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: isCreatingAccount ? "wait" : "pointer",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "125px"
                }}
              >
                {isCreatingAccount ? (
                  <>
                    <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang tạo...
                  </>
                ) : (
                  "Tạo Tài Khoản"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XOÁ TÀI KHOẢN */}
      {showDeleteAccountModal && (
        <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && !isDeletingAccount && setShowDeleteAccountModal(false)}>
          <div className="account-prompt-card">
            <div className="account-prompt-title" style={{ color: "#ff4d4f" }}>🗑️ Xóa Tài Khoản</div>
            <div style={{ color: "#dddddd", fontSize: "13px", margin: "14px 0 6px 0", lineHeight: "1.5" }}>
              Bạn có chắc chắn muốn xóa tài khoản <strong style={{ color: "#ffffff" }}>"{accounts.find(a => a.id === selectedAccount)?.name || selectedAccount}"</strong>?
            </div>
            <div style={{ color: "#888888", fontSize: "12px", marginBottom: "16px", lineHeight: "1.4" }}>
              {accounts.length > 1
                ? "Tài khoản này cùng toàn bộ API Key liên kết sẽ bị xóa khỏi hệ thống."
                : "Đây là tài khoản duy nhất. Xác nhận xóa sẽ làm sạch toàn bộ API Key và đưa tài khoản về mặc định ban đầu."}
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={() => setShowDeleteAccountModal(false)}
                style={{
                  padding: "7px 15px",
                  background: "#333333",
                  border: "1px solid #555555",
                  borderRadius: "4px",
                  color: "#cccccc",
                  cursor: isDeletingAccount ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                  opacity: isDeletingAccount ? 0.6 : 1
                }}
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={confirmDeleteAccount}
                style={{
                  padding: "7px 18px",
                  background: isDeletingAccount ? "#882222" : "#dc3545",
                  border: "none",
                  borderRadius: "4px",
                  color: "#ffffff",
                  fontWeight: "bold",
                  cursor: isDeletingAccount ? "wait" : "pointer",
                  fontSize: "12px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: "130px"
                }}
              >
                {isDeletingAccount ? (
                  <>
                    <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang xóa...
                  </>
                ) : (
                  "Xác Nhận Xóa"
                )}
              </button>
            </div>
          </div>
        </div>
      )}


      {/* FOOTER MARQUEE */}
      <div className="marquee-footer">
        <div className="marquee-content">
          ⚠️ CẢNH BÁO: Bot chỉ là công cụ hỗ trợ điểm giao dịch, không phải là lời kêu gọi đầu tư. Bot is only a trading point support tool, not an investment call. ⚠️
        </div>
      </div>
    </div>
  );
}

export default App;
