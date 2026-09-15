import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import DrawingToolbar, { DRAWING_TOOLS } from "./components/DrawingToolbar";
import DrawingCanvasOverlay from "./components/DrawingCanvasOverlay";
import IndicatorsModal, { COMMUNITY_SCRIPTS } from "./components/IndicatorsModal";
import TradingViewEmbedChart from "./components/TradingViewEmbedChart";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  calculateSuperTrend,
  runCoderCustomScript,
  calculateLiquidV5,
} from "./utils/indicatorEngine";
import "./App.css";

const COIN_LIST = [
  { label: "XAU-USDT", value: "XAU-USDT-SWAP", maxLever: 100 },
  { label: "CL-USDT", value: "CL-USDT-SWAP", maxLever: 50 },
  { label: "BTC-USDT", value: "BTC-USDT-SWAP", maxLever: 100 },
  { label: "ETH-USDT", value: "ETH-USDT-SWAP", maxLever: 100 },
  { label: "SOL-USDT", value: "SOL-USDT-SWAP", maxLever: 100 },
  { label: "XRP-USDT", value: "XRP-USDT-SWAP", maxLever: 100 },
  { label: "DOGE-USDT", value: "DOGE-USDT-SWAP", maxLever: 50 },
  { label: "SUI-USDT", value: "SUI-USDT-SWAP", maxLever: 50 },
  { label: "NEAR-USDT", value: "NEAR-USDT-SWAP", maxLever: 50 },
  { label: "ADA-USDT", value: "ADA-USDT-SWAP", maxLever: 50 },
  { label: "LTC-USDT", value: "LTC-USDT-SWAP", maxLever: 50 },
  { label: "TRX-USDT", value: "TRX-USDT-SWAP", maxLever: 50 },
  { label: "HYPE-USDT", value: "HYPE-USDT-SWAP", maxLever: 50 },
  { label: "ZEC-USDT", value: "ZEC-USDT-SWAP", maxLever: 50 },
  { label: "USDT.D", value: "USDT.D", maxLever: 1 },
];
const TF_LIST = ["1m", "5m", "15m", "30m", "1H", "2H", "4H", "1D"];
const BOT_TFS = ["M5", "M15", "M30", "H1", "H2", "H4"];
export const ADMIN_UID = "admin";

// calculateEMA, calculateSMA, calculateRSI... được import trực tiếp từ utils/indicatorEngine.js

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

// TradingView Layout Icons (Nét mảnh, tinh tế)
const renderLayoutIcon = (type, w = 24, h = 24) => {
  if (type === "1") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "2-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="3" width="10" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "2-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3" y="15" width="22" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "3-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="2.5" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="10.75" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="19" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }
  if (type === "3-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="2.5" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="3" y="10.75" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="3" y="19" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }
  if (type === "4-grid") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
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
  layoutSelector = null,
  activeBotTab,
  adminClosedPositions = [],
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const volumeSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const overlayRef = useRef(null);
  const liquidV5OverlayRef = useRef(null);
  const liquidV5BoxesOverlayRef = useRef(null);
  const activeObsRef = useRef([]);
  const liquidV5BoxesRef = useRef({ fvg_boxes: [], ob_boxes: [] });
  const candlesRef = useRef([]);
  const activeBotTabRef = useRef(activeBotTab);
  const tfRef = useRef(tf);

  useEffect(() => {
    activeBotTabRef.current = activeBotTab;
    tfRef.current = tf;
    drawLiquidV5Boxes();
    drawObs();
  }, [activeBotTab, tf]);

  const [isAutoFit, setIsAutoFit] = useState(true);
  const [isLogScale, setIsLogScale] = useState(false);
  const userInteractedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState(DRAWING_TOOLS.CURSOR);
  const [drawingsCount, setDrawingsCount] = useState(0);
  const [clearDrawingsTrigger, setClearDrawingsTrigger] = useState(0);
  const [chartInstance, setChartInstance] = useState(null);
  const [seriesInstance, setSeriesInstance] = useState(null);

  // Chế độ biểu đồ Hybrid: 'standard' (Biểu đồ Tiêu Chuẩn nội bộ) hoặc 'tv' (Biểu đồ TradingView Gốc)
  const [chartMode, setChartMode] = useState(() => {
    try {
      const saved = localStorage.getItem(`tls1_chart_mode_${chartIndex}`);
      if (saved === "smc") return "standard";
      return saved || "standard";
    } catch {
      return "standard";
    }
  });

  const handleToggleChartMode = (mode) => {
    setChartMode(mode);
    try {
      localStorage.setItem(`tls1_chart_mode_${chartIndex}`, mode);
    } catch { }
  };

  // Trạng thái Indicators & Coder Custom Scripts
  const [showIndicatorsModal, setShowIndicatorsModal] = useState(false);
  const [activeIndicators, setActiveIndicators] = useState(() => {
    try {
      const key = activeBotTab ? `tls1_active_indicators_${activeBotTab}` : "tls1_active_indicators";
      const saved = localStorage.getItem(key);
      let list = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(list)) list = null;
      if (!list) {
        if (activeBotTab === "sub1") list = ["ema200", "volume"];
        else if (activeBotTab === "sub2") list = ["ema200", "volume", "smc_ob"];
        else if (activeBotTab === "sub3") list = ["ema200", "volume", "liquid_v5"];
        else list = ["ema200", "volume", "liquid_v5"];
      }
      // Toàn bộ các chart luôn mặc định phải có chỉ báo ema200 và volume
      if (!list.includes("ema200")) list.unshift("ema200");
      if (!list.includes("volume")) {
        const emaIdx = list.indexOf("ema200");
        list.splice(emaIdx + 1, 0, "volume");
      }
      return list;
    } catch {
      return ["ema200", "volume", "liquid_v5"];
    }
  });

  const [liveStats, setLiveStats] = useState(null);

  const adminStats = React.useMemo(() => {
    // Lọc theo coin và tf hiện tại
    const filtered = adminClosedPositions.filter(p => {
      // Coin thường dạng "BTC-USDT" và tf dạng "M5" (Bot TFs)
      const isCoinMatch = p.instId === coin;
      const isTfMatch = p.tf && (p.tf.toUpperCase() === tf.toUpperCase() || p.tf.toUpperCase() === tf.replace('m', 'M').replace('h', 'H'));
      return isCoinMatch && isTfMatch;
    });

    if (filtered.length === 0) {
      return { totalEntries: 0, wins: 0, losses: 0, winrate: "—", avgProfit: "—", totalProfit: "—" };
    }

    const totalEntries = filtered.length;
    let wins = 0, losses = 0, totalPnl = 0;
    for (const pos of filtered) {
      const pnl = parseFloat(pos.pnl || "0");
      totalPnl += pnl;
      if (pnl > 0) wins++;
      else losses++;
    }
    const winrate = Math.round((wins / totalEntries) * 100);
    return {
      totalEntries,
      wins,
      losses,
      winrate: `${winrate}%`,
      avgProfit: `${(totalPnl / totalEntries).toFixed(2)} USDT`,
      totalProfit: `${totalPnl >= 0 ? "+" : ""}${totalPnl.toFixed(2)} USDT`
    };
  }, [adminClosedPositions, coin, tf]);

  const backtestStats = React.useMemo(() => {
    if (liveStats && liveStats.totalEntries > adminStats.totalEntries) {
      return {
        totalEntries: liveStats.totalEntries,
        wins: liveStats.wins,
        losses: liveStats.losses,
        winrate: `${liveStats.winrate}%`,
        avgProfit: `${liveStats.avgProfit}%`,
        totalProfit: `${liveStats.totalProfit}%`
      };
    }
    return adminStats;
  }, [adminStats, liveStats]);

  useEffect(() => {
    if (!activeBotTab) return;
    try {
      const key = `tls1_active_indicators_${activeBotTab}`;
      const saved = localStorage.getItem(key);
      let list = saved ? JSON.parse(saved) : null;
      if (!Array.isArray(list)) list = null;
      if (!list) {
        if (activeBotTab === "sub1") list = ["ema200", "volume"];
        else if (activeBotTab === "sub2") list = ["ema200", "volume", "smc_ob"];
        else if (activeBotTab === "sub3") list = ["ema200", "volume", "liquid_v5"];
        else list = ["ema200", "volume", "liquid_v5"];
      }
      // Toàn bộ các chart luôn mặc định phải có chỉ báo ema200 và volume
      if (!list.includes("ema200")) list.unshift("ema200");
      if (!list.includes("volume")) {
        const emaIdx = list.indexOf("ema200");
        list.splice(emaIdx + 1, 0, "volume");
      }
      setActiveIndicators(list);
    } catch (e) { }

    setTimeout(() => {
      applyDefaultZoom();
      drawObs();
      drawLiquidV5Boxes();
    }, 50);
  }, [activeBotTab]);

  // Ref luôn giữ state mới nhất để các hàm bất đồng bộ/setInterval không bị Stale Closure
  const activeIndicatorsRef = useRef(activeIndicators);
  activeIndicatorsRef.current = activeIndicators;

  const [coderScripts, setCoderScripts] = useState([]);
  const coderScriptsRef = useRef(coderScripts);
  coderScriptsRef.current = coderScripts;

  // Liquid V5 Settings
  const [showLiquidV5Settings, setShowLiquidV5Settings] = useState(false);
  const [liquidV5Settings, setLiquidV5Settings] = useState({
    higherTF: 'H4',
    htfCandleSize: 'Big',
    entryMode: 'FVGs',
    requireRetracement: false,
    showHTFCandleLines: true,
    fvgDetectionSensitivity: 'All',
    showFVGs: true,
    swingLength: 35,
    showOrderBlocks: true,
    tpslMethod: 'Dynamic',
    tpPercent: 0.3,
    slPercent: 0.4,
    fillBackgrounds: true,
    onlyWinrateEntry2: false
  });

  // Quản lý ẩn/hiện tạm thời trên biểu đồ (Hide indicator legend / eye icon)
  const [hiddenIndicators, setHiddenIndicators] = useState(new Set());
  const hiddenIndicatorsRef = useRef(hiddenIndicators);
  hiddenIndicatorsRef.current = hiddenIndicators;
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [isBacktestCollapsed, setIsBacktestCollapsed] = useState(true);
  const [indicatorsModalTab, setIndicatorsModalTab] = useState("system");

  const getIndicatorTitle = (id) => {
    const titles = {
      liquid_v5: "TLS1 - Charts Liquid v5",
      smc_ob: "SMC Order Block (Bot Live)",
      ema200: "EMA 200",
      ema_ribbon: "EMA Ribbon (20, 50, 200)",
      bollinger_bands: "Bollinger Bands (20, 2)",
      bb: "Bollinger Bands (20, 2)",
      supertrend: "SuperTrend (10, 3)",
      rsi: "RSI (14)",
      macd: "MACD (12, 26, 9)",
      volume: "Volume 20",
    };
    if (titles[id]) return titles[id];
    const script = coderScripts.find((s) => s.id === id);
    return script ? (script.name || script.title || id) : id;
  };

  const toggleHideIndicator = (id) => {
    setHiddenIndicators((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      hiddenIndicatorsRef.current = next;
      return next;
    });
  };

  const dynamicSeriesRef = useRef(new Map());
  const updateIndicatorsRef = useRef(null);


  const toggleIndicator = (id) => {
    setActiveIndicators((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      activeIndicatorsRef.current = next;
      try {
        const key = activeBotTab ? `tls1_active_indicators_${activeBotTab}` : "tls1_active_indicators";
        localStorage.setItem(key, JSON.stringify(next));
      } catch { }
      return next;
    });
  };

  // Mặc định zoom nến to (khoảng 30-80 cây nến, cách viền phải 5-10 cây nến)
  const applyDefaultZoom = () => {
    if (!chartRef.current || !candlesRef.current || candlesRef.current.length === 0) return;
    const total = candlesRef.current.length;
    const candleCount = 55; // 30-80 cây nến (50-60 nến là kích thước to rõ đẹp)
    const rightOffset = 8;  // Cách viền phải 5-10 cây nến cho thoáng
    try {
      chartRef.current.priceScale('right').applyOptions({ autoScale: true });
      if (candleSeriesRef.current) {
        candleSeriesRef.current.priceScale().applyOptions({ autoScale: true });
      }
      // Ép trục thời gian X hiển thị 55 cây nến mới nhất tới thời điểm hiện tại, cách viền phải 8 nến
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, total - candleCount),
        to: total - 1 + rightOffset,
      });
    } catch (e) { }
  };

  // Quét toàn bộ lịch sử nến và tạo danh sách lệnh đã đóng (TP/SL) + lệnh đang mở hiện tại
  // Mỗi lệnh: chờ giá chạm entryPrice → mở → chờ TP hoặc SL → đóng băng
  const calculateEMA200Positions = (candles, currentTf) => {
    if (!candles || candles.length < 205) return [];
    const emaData = calculateEMA(candles, 200);
    if (!emaData || emaData.length === 0) return [];

    const emaMap = new Map();
    emaData.forEach(item => emaMap.set(item.time, item.value));

    const normTf = (currentTf || "4H").toUpperCase();
    let offsetMult = 6.772;
    if (normTf.includes("5M")) offsetMult = 1.0;
    else if (normTf.includes("15M")) offsetMult = 1.5333;
    else if (normTf.includes("30M")) offsetMult = 2.3333;
    else if (normTf.includes("1H") || normTf.includes("60M")) offsetMult = 3.333;
    else if (normTf.includes("2H") || normTf.includes("120M")) offsetMult = 4.667;
    else if (normTf.includes("4H") || normTf.includes("240M")) offsetMult = 6.772;
    else if (normTf.includes("1D") || normTf.includes("D")) offsetMult = 10.0;

    const entryOffsetPct = 0.0005 * offsetMult;
    const rawTpPct = 0.0120 * offsetMult;
    const tpPct = rawTpPct > 0.05 ? 0.05 : rawTpPct;
    const slPct = tpPct;

    const results = [];
    let activeTrade = null; // lệnh đang chờ entry
    let consecutiveAbove = 0;
    let consecutiveBelow = 0;

    for (let i = 200; i < candles.length; i++) {
      const candle = candles[i];
      const ema = emaMap.get(candle.time);
      if (!ema) continue;

      if (candle.close >= ema) {
        consecutiveAbove++;
        consecutiveBelow = 0;
      } else {
        consecutiveBelow++;
        consecutiveAbove = 0;
      }

      // Nếu đang có lệnh chờ entry (Limit order waiting)
      if (activeTrade && activeTrade.state === 'waiting') {
        const isLong = activeTrade.entryType === 'Long';
        const entryHit = isLong
          ? candle.low <= activeTrade.entryPrice
          : candle.high >= activeTrade.entryPrice;

        if (entryHit) {
          activeTrade.state = 'open';
          activeTrade.entryCandle = i;
          activeTrade.entryTime = candle.time; // Khoá chặt vị trí hộp công cụ tại nến khớp lệnh
        } else {
          // Nếu EMA đã dịch chuyển > 0.3% so với lúc đặt lệnh → huỷ lệnh cũ, tạo lại
          const emaDrift = Math.abs(ema - activeTrade.entryEma) / activeTrade.entryEma;
          if (emaDrift > 0.003) {
            activeTrade = null;
          }
          // Nếu đảo chiều hoàn toàn (trend changed) -> huỷ lệnh chờ
          if (isLong && consecutiveBelow > 0) activeTrade = null;
          if (!isLong && consecutiveAbove > 0) activeTrade = null;
        }
      }

      // Nếu lệnh đang mở → kiểm tra TP/SL
      if (activeTrade && activeTrade.state === 'open') {
        const isLong = activeTrade.entryType === 'Long';
        const tpHit = isLong
          ? candle.high >= activeTrade.tpTarget
          : candle.low <= activeTrade.tpTarget;
        const slHit = isLong
          ? candle.low <= activeTrade.slTarget
          : candle.high >= activeTrade.slTarget;

        if (tpHit || slHit) {
          activeTrade.exitTime = candle.time;
          activeTrade.exitResult = tpHit ? 'TP' : 'SL';
          activeTrade.state = 'closed';
          results.push({ ...activeTrade });
          activeTrade = null;
        }
      }

      // Nếu không có lệnh nào đang chạy → tạo lệnh mới từ EMA hiện tại (Chỉ khi tích luỹ >= 60 nến)
      if (!activeTrade && (consecutiveAbove >= 60 || consecutiveBelow >= 60)) {
        const isBull = consecutiveAbove >= 60;
        const ep = isBull ? (ema * (1 + entryOffsetPct)) : (ema * (1 - entryOffsetPct));
        const tp = isBull ? (ep * (1 + tpPct)) : (ep * (1 - tpPct));
        const sl = isBull ? (ep * (1 - slPct)) : (ep * (1 + slPct));

        activeTrade = {
          entryTime: candle.time, // Bắt đầu tịnh tiến theo thời gian
          entryEma: ema,
          entryPrice: ep,
          tpTarget: tp,
          slTarget: sl,
          entryType: isBull ? 'Long' : 'Short',
          state: 'waiting',
          isEmaBot: true,
        };
      }
    }

    // Thêm lệnh đang mở hiện tại (live) vào cuối danh sách
    if (activeTrade && (activeTrade.state === 'open' || activeTrade.state === 'waiting')) {
      results.push({ ...activeTrade, state: 'Active Position' });
    }

    return results;
  };

  // Helper tính toán tín hiệu Long/Short cho Bot SMC khi khớp Entry theo Order Block
  // Chỉ hiển thị duy nhất 1 tool trên Order Block gần nhất của khung thời gian hiện tại
  const calculateSMCPositions = (candles, obs) => {
    if (!candles || candles.length < 25) return [];
    const validObs = (obs || []).filter(ob => ob.high && ob.low);
    if (validObs.length === 0) return [];

    const latestOb = validObs[validObs.length - 1];
    const isBull = latestOb.bias === 1;
    const entryPrice = isBull ? latestOb.high : latestOb.low;
    const obHeight = Math.abs(latestOb.high - latestOb.low);
    const slDist = Math.max(obHeight, entryPrice * 0.008);
    const tpDist = slDist * 1.5;
    const slTarget = isBull ? latestOb.low - obHeight * 0.15 : latestOb.high + obHeight * 0.15;
    const tpTarget = isBull ? entryPrice + tpDist : entryPrice - tpDist;

    const entryCandle = candles[Math.max(0, candles.length - 20)];
    return [{
      entryTime: latestOb.time || entryCandle.time,
      entryPrice: entryPrice,
      tpTarget: tpTarget,
      slTarget: slTarget,
      entryType: isBull ? 'Long' : 'Short',
      state: 'Active Position',
      isSmcBot: true
    }];
  };

  const drawObs = () => {
    const o = overlayRef.current;
    if (!o) return;
    const currentActive = activeIndicatorsRef.current || [];
    if (!currentActive.includes("smc_ob") || hiddenIndicatorsRef.current?.has("smc_ob")) {
      o.innerHTML = "";
      return;
    }
    const obs = activeObsRef.current;
    const c = chartRef.current;
    const s = candleSeriesRef.current;
    const cont = containerRef.current;
    if (!obs || !c || !s || !cont || obs.length === 0) {
      o.innerHTML = "";
      return;
    }
    o.innerHTML = "";
    const w = o.clientWidth || cont.clientWidth;
    if (w <= 0) return;
    const plotW = (c.timeScale && typeof c.timeScale().width === 'function') ? c.timeScale().width() : 0;
    const maxRightX = plotW > 0 ? Math.floor(plotW) : (w - 70);
    o.style.width = maxRightX + 'px';
    o.style.overflow = 'hidden';

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

      const boxWidth = Math.max(0, maxRightX - startX);
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

  const drawLiquidV5Boxes = () => {
    const oBoxes = liquidV5BoxesOverlayRef.current;
    const oTop = liquidV5OverlayRef.current;
    if (oBoxes) oBoxes.innerHTML = "";
    if (oTop) oTop.innerHTML = "";
    if (!oBoxes && !oTop) return;

    const currentActive = activeIndicatorsRef.current || [];
    const currentTab = activeBotTabRef.current;
    const isEmaBot = currentTab === "sub1";
    const isSmcBot = currentTab === "sub2";
    const isLiquidActive = currentActive.includes("liquid_v5") && !hiddenIndicatorsRef.current?.has("liquid_v5");
    const isLiquidBot = currentTab === "sub3" || isLiquidActive;

    if (!isEmaBot && !isSmcBot && !isLiquidBot) {
      return;
    }

    const { fvg_boxes, ob_boxes, crt_lines, crt_labels, alerts, stats, position_boxes } = liquidV5BoxesRef.current || {};
    const c = chartRef.current;
    const s = candleSeriesRef.current;
    const cont = containerRef.current;
    if (!c || !s || !cont) {
      return;
    }
    const w = (oBoxes && oBoxes.clientWidth) || (oTop && oTop.clientWidth) || cont.clientWidth;
    if (w <= 0) return;
    const plotW = (c.timeScale && typeof c.timeScale().width === 'function') ? c.timeScale().width() : 0;
    const maxRightX = plotW > 0 ? Math.floor(plotW) : (w - 70); // Chuẩn xác tới mép trục giá phải

    if (oBoxes) {
      oBoxes.style.width = maxRightX + 'px';
      oBoxes.style.overflow = 'hidden';
    }
    if (oTop) {
      oTop.style.width = maxRightX + 'px';
      oTop.style.overflow = 'hidden';
    }

    // Function to calculate x coordinate
    const getXCoord = (timeVal) => {
      let x = null;
      if (timeVal) {
        try {
          const secTime = timeVal > 100000000000 ? Math.floor(timeVal / 1000) : timeVal;
          const xCoord = c.timeScale().timeToCoordinate(secTime);
          if (xCoord !== null) x = Math.floor(xCoord);
        } catch (e) { }
      }
      return x;
    };

    // 1. Box SMC & FVG ở bot Liqui: Chỉ vẽ khi có chỉ báo liquid_v5
    if (oBoxes && isLiquidActive) {
      const obs = activeObsRef.current || [];
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

        const boxWidth = Math.max(0, maxRightX - startX);
        if (boxWidth <= 0) return;

        const bg = isBull ? 'rgba(21, 101, 192, 0.2)' : 'rgba(198, 40, 40, 0.2)';
        const box = document.createElement('div');
        box.style.position = 'absolute';
        box.style.top = topY + 'px';
        box.style.left = startX + 'px';
        box.style.width = boxWidth + 'px';
        box.style.height = h + 'px';
        box.style.backgroundColor = bg;
        box.style.border = 'none';
        box.style.pointerEvents = 'none';

        oBoxes.appendChild(box);
      });
    }

    // 2. Toàn bộ tín hiệu Long Short thiết kế lại chuẩn TradingView Position Box,
    // Áp dụng đồng bộ cho TOÀN BỘ CÁC BOT: Bot EMA200 (sub1), Bot SMC (sub2), Bot Liquid V5 (sub3)
    const candles = candlesRef.current || [];
    let posList = [];
    if (isEmaBot) {
      posList = calculateEMA200Positions(candles, tfRef.current);
    } else if (isSmcBot) {
      posList = calculateSMCPositions(candles, activeObsRef.current);
    } else {
      posList = position_boxes || [];
    }

    // Compute universal live stats from posList for ALL bots
    let cWins = 0, cLosses = 0, cProfit = 0, cEntries = 0;
    posList.forEach(p => {
      const isLiquidDone = p.state === 'Take Profit' || p.state === 'Stop Loss';
      const isEmaDone = p.state === 'closed';
      
      if (isLiquidDone || isEmaDone) {
        cEntries++;
        let isWin = false;
        if (p.state === 'Take Profit' || p.exitResult === 'TP') isWin = true;
        
        let profitPct = 0;
        if (isWin) {
          profitPct = Math.abs(p.tpTarget - p.entryPrice) / p.entryPrice;
        } else {
          profitPct = -Math.abs(p.entryPrice - p.slTarget) / p.entryPrice;
        }
        
        if (isWin) cWins++;
        else cLosses++;
        
        cProfit += profitPct;
      }
    });

    const liveStatsObj = {
      totalEntries: cEntries,
      wins: cWins,
      losses: cLosses,
      winrate: cEntries > 0 ? ((cWins / cEntries) * 100).toFixed(2) : 0,
      avgProfit: cEntries > 0 ? ((cProfit / cEntries) * 100).toFixed(2) : 0,
      totalProfit: (cProfit * 100).toFixed(2)
    };

    if (oTop) {
      posList.forEach(pos => {
        if (!pos.entryTime || !pos.entryPrice || !pos.tpTarget || !pos.slTarget) return;

        const entryTimeSec = pos.entryTime > 100000000000 ? Math.floor(pos.entryTime / 1000) : pos.entryTime;
        const entryIdx = candles.findIndex(item => item.time >= entryTimeSec);
        if (entryIdx < 0) return;

        const logicalRange = c.timeScale().getVisibleLogicalRange();
        // Use cached positions if already frozen
        let startX = pos._fixedStartX ?? null;
        let endX = pos._fixedEndX ?? null;

        if (logicalRange && logicalRange.to > logicalRange.from) {
          const barWidth = maxRightX / (logicalRange.to - logicalRange.from);
          // Compute positions only if not already cached
          if (startX === null) {
            startX = Math.floor((entryIdx - logicalRange.from) * barWidth);
          }
          if (endX === null) {
            endX = Math.floor((entryIdx + 25 - logicalRange.from) * barWidth);
          }

          // Adjust endX for exit (TP/SL) if applicable
          if (pos.exitTime) {
            const exitTimeSec = pos.exitTime > 100000000000 ? Math.floor(pos.exitTime / 1000) : pos.exitTime;
            const exitIdx = candles.findIndex(item => item.time >= exitTimeSec);
            if (exitIdx > entryIdx) {
              endX = Math.floor((exitIdx - logicalRange.from) * barWidth);
            }
          }
          // Cache positions after first calculation
          if (pos._fixedStartX === undefined) {
            pos._fixedStartX = startX;
            pos._fixedEndX = endX;
          }
        } else {
          let sc = null;
          try {
            sc = c.timeScale().timeToCoordinate(candles[entryIdx].time);
          } catch (e) { }
          if (sc !== null) {
            if (startX === null) {
              startX = Math.floor(sc);
            }
            let barSpacing = 14;
            if (candles.length >= 2) {
              try {
                const c1 = c.timeScale().timeToCoordinate(candles[candles.length - 1].time);
                const c2 = c.timeScale().timeToCoordinate(candles[candles.length - 2].time);
                if (c1 !== null && c2 !== null && c1 > c2) barSpacing = c1 - c2;
              } catch (e) { }
            }
            if (endX === null) {
              endX = Math.floor(startX + 25 * barSpacing);
            }

            if (pos.exitTime) {
              try {
                const exitTimeSec = pos.exitTime > 100000000000 ? Math.floor(pos.exitTime / 1000) : pos.exitTime;
                const scExit = c.timeScale().timeToCoordinate(exitTimeSec);
                if (scExit !== null && scExit > startX) {
                  endX = Math.floor(scExit);
                }
              } catch (e) { }
            }
            // Cache after calculation if not cached yet
            if (pos._fixedStartX === undefined) {
              pos._fixedStartX = startX;
              pos._fixedEndX = endX;
            }
          }
        }

        if (startX === null || endX === null) return;
        if (endX < 0 || startX >= maxRightX) return;

        // Giới hạn tuyệt đối mép phải không tràn qua trục giá
        const clampedEndX = Math.min(endX, maxRightX);
        const boxWidth = clampedEndX - startX;
        if (boxWidth <= 4) return;

        const yEntry1 = s.priceToCoordinate(pos.entryPrice);
        const yTP = s.priceToCoordinate(pos.tpTarget);
        const ySL = s.priceToCoordinate(pos.slTarget);
        if (yEntry1 === null) return;

        const clientH = oTop.clientHeight || 400;
        const isLong = pos.entryType === 'Long';
        const clampedYTP = yTP !== null ? yTP : (isLong ? 0 : clientH);
        const clampedYSL = ySL !== null ? ySL : (isLong ? clientH : 0);

        // Entry 2 (DCA ở 2/3 khoảng cách Stop Loss từ Entry 1)
        const isStandardBot = pos.isEmaBot || pos.isSmcBot;
        
        let effectiveYEntry2;
        if (isStandardBot) {
          effectiveYEntry2 = yEntry1; // Bot chuẩn chỉ có 1 entry, đường chia cắt xanh/đỏ chính là Entry 1
        } else {
          const entry2Price = pos.entry2Price || (pos.entryPrice + (pos.slTarget - pos.entryPrice) * (2 / 3));
          const yEntry2 = s.priceToCoordinate(entry2Price);
          effectiveYEntry2 = yEntry2 !== null ? yEntry2 : (yEntry1 + (clampedYSL - yEntry1) * (2 / 3));
        }

        const posContainer = document.createElement('div');
        posContainer.style.position = 'absolute';
        posContainer.style.top = '0px';
        posContainer.style.left = startX + 'px';
        posContainer.style.width = boxWidth + 'px';
        posContainer.style.height = '100%';
        posContainer.style.pointerEvents = 'none';
        posContainer.style.zIndex = '1';

        // Màu sắc chuẩn TradingView Long/Short Position Box: phẳng mờ, border: none
        const greenBg = 'rgba(20, 58, 54, 0.75)';
        const redBg = 'rgba(68, 24, 33, 0.75)';

        // Tông màu trắng mờ nhạt, tinh tế cho vạch chỉ và chữ E1/E2
        const lineStrokeColor = 'rgba(235, 240, 250, 0.45)';
        const labelTextColor = 'rgba(235, 240, 250, 0.5)';

        // Vạch trắng Entry chính (luôn hiển thị cho mọi Bot theo yêu cầu CEO)
        const e1Line = document.createElement('div');
        e1Line.style.position = 'absolute';
        e1Line.style.top = yEntry1 + 'px';
        e1Line.style.left = '0px';
        e1Line.style.width = '100%';
        e1Line.style.height = '1px';
        e1Line.style.backgroundColor = lineStrokeColor;
        e1Line.style.zIndex = '1';
        posContainer.appendChild(e1Line);

        if (isLong) {
          // LONG:
          // Vùng XANH bao trọn từ TP xuống tận Entry 2 (khoảng giữa E1 - E2 được tô XANH)
          const greenTop = Math.min(clampedYTP, effectiveYEntry2);
          const greenH = Math.max(Math.abs(effectiveYEntry2 - clampedYTP), 2);

          // Vùng ĐỎ (SL ngắn) từ Entry 2 xuống đến SL
          const redTop = Math.min(effectiveYEntry2, clampedYSL);
          const redH = Math.max(Math.abs(clampedYSL - effectiveYEntry2), 2);

          const tpBox = document.createElement('div');
          tpBox.style.position = 'absolute';
          tpBox.style.top = greenTop + 'px';
          tpBox.style.left = '0px';
          tpBox.style.width = '100%';
          tpBox.style.height = greenH + 'px';
          tpBox.style.backgroundColor = greenBg;
          tpBox.style.border = 'none';
          tpBox.style.boxSizing = 'border-box';
          posContainer.appendChild(tpBox);

          const slBox = document.createElement('div');
          slBox.style.position = 'absolute';
          slBox.style.top = redTop + 'px';
          slBox.style.left = '0px';
          slBox.style.width = '100%';
          slBox.style.height = redH + 'px';
          slBox.style.backgroundColor = redBg;
          slBox.style.border = 'none';
          slBox.style.boxSizing = 'border-box';
          posContainer.appendChild(slBox);

          if (!isStandardBot) {
            const e1Label = document.createElement('span');
            e1Label.textContent = 'E1';
            e1Label.style.position = 'absolute';
            e1Label.style.top = (yEntry1 - 15) + 'px';
            e1Label.style.left = '5px';
            e1Label.style.color = labelTextColor;
            e1Label.style.fontSize = '11px';
            e1Label.style.fontWeight = 'bold';
            e1Label.style.fontFamily = 'monospace';
            e1Label.style.zIndex = '1';
            posContainer.appendChild(e1Label);

            // Vạch trắng Entry 2 (E2) - nhạt, nằm dưới lớp nến
            const e2Line = document.createElement('div');
            e2Line.style.position = 'absolute';
            e2Line.style.top = effectiveYEntry2 + 'px';
            e2Line.style.left = '0px';
            e2Line.style.width = '100%';
            e2Line.style.height = '1px';
            e2Line.style.backgroundColor = lineStrokeColor;
            e2Line.style.zIndex = '1';
            posContainer.appendChild(e2Line);

            const e2Label = document.createElement('span');
            e2Label.textContent = 'E2';
            e2Label.style.position = 'absolute';
            e2Label.style.top = (effectiveYEntry2 - 15) + 'px';
            e2Label.style.left = '5px';
            e2Label.style.color = labelTextColor;
            e2Label.style.fontSize = '11px';
            e2Label.style.fontWeight = 'bold';
            e2Label.style.fontFamily = 'monospace';
            e2Label.style.zIndex = '1';
            posContainer.appendChild(e2Label);
          }
        } else {
          // SHORT:
          // Vùng ĐỎ (SL ngắn) từ SL xuống đến Entry 2
          const redTop = Math.min(clampedYSL, effectiveYEntry2);
          const redH = Math.max(Math.abs(effectiveYEntry2 - clampedYSL), 2);

          // Vùng XANH bao trọn từ Entry 2 xuống tận TP Target (khoảng giữa E2 - E1 được tô XANH)
          const greenTop = Math.min(effectiveYEntry2, clampedYTP);
          const greenH = Math.max(Math.abs(clampedYTP - effectiveYEntry2), 2);

          const slBox = document.createElement('div');
          slBox.style.position = 'absolute';
          slBox.style.top = redTop + 'px';
          slBox.style.left = '0px';
          slBox.style.width = '100%';
          slBox.style.height = redH + 'px';
          slBox.style.backgroundColor = redBg;
          slBox.style.border = 'none';
          slBox.style.boxSizing = 'border-box';
          posContainer.appendChild(slBox);

          const tpBox = document.createElement('div');
          tpBox.style.position = 'absolute';
          tpBox.style.top = greenTop + 'px';
          tpBox.style.left = '0px';
          tpBox.style.width = '100%';
          tpBox.style.height = greenH + 'px';
          tpBox.style.backgroundColor = greenBg;
          tpBox.style.border = 'none';
          tpBox.style.boxSizing = 'border-box';
          posContainer.appendChild(tpBox);

          if (!isStandardBot) {
            // Vạch trắng Entry 2 (E2) - nhạt, nằm dưới lớp nến
            const e2Line = document.createElement('div');
            e2Line.style.position = 'absolute';
            e2Line.style.top = effectiveYEntry2 + 'px';
            e2Line.style.left = '0px';
            e2Line.style.width = '100%';
            e2Line.style.height = '1px';
            e2Line.style.backgroundColor = lineStrokeColor;
            e2Line.style.zIndex = '1';
            posContainer.appendChild(e2Line);

            const e2Label = document.createElement('span');
            e2Label.textContent = 'E2';
            e2Label.style.position = 'absolute';
            e2Label.style.top = (effectiveYEntry2 - 15) + 'px';
            e2Label.style.left = '5px';
            e2Label.style.color = labelTextColor;
            e2Label.style.fontSize = '11px';
            e2Label.style.fontWeight = 'bold';
            e2Label.style.fontFamily = 'monospace';
            e2Label.style.zIndex = '1';
            posContainer.appendChild(e2Label);

            const e1Label = document.createElement('span');
            e1Label.textContent = 'E1';
            e1Label.style.position = 'absolute';
            e1Label.style.top = (yEntry1 - 15) + 'px';
            e1Label.style.left = '5px';
            e1Label.style.color = labelTextColor;
            e1Label.style.fontSize = '11px';
            e1Label.style.fontWeight = 'bold';
            e1Label.style.fontFamily = 'monospace';
            e1Label.style.zIndex = '1';
            posContainer.appendChild(e1Label);
          }
        }

        oTop.appendChild(posContainer);
      });
    }

    // Cập nhật Backtest Stats state cho bảng thống kê (nếu tính toán live có nhiều lệnh hơn)
    if (liveStatsObj.totalEntries > 0) {
      setLiveStats(liveStatsObj);
    } else if (stats && stats.totalEntries > 0) {
      setLiveStats(stats);
    }

    // Process Alerts (only show if not processed yet)
    if (alerts && alerts.length > 0) {
      const lastAlert = alerts[alerts.length - 1];
      const alertKey = `${lastAlert.time}-${lastAlert.event}-${lastAlert.side}`;
      if (window._lastLiquidAlert !== alertKey) {
        window._lastLiquidAlert = alertKey;
        if (window.showToast) {
          window.showToast(`[LIQUID V5] ${lastAlert.event} ${lastAlert.side}`, "info");
        } else {
          console.log(`[LIQUID V5 ALERT] ${lastAlert.event} ${lastAlert.side}`, lastAlert);
        }
      }
    }
  };

  // Quản lý và render toàn bộ các chỉ báo động (Built-in + Custom Scripts của Coder)
  const updateIndicators = () => {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart || !candles || candles.length === 0) return;

    // Luôn lấy danh sách active mới nhất từ Ref để chống Stale Closure
    const currentActive = activeIndicatorsRef.current || [];
    const currentScripts = coderScriptsRef.current || [];
    const seriesMap = dynamicSeriesRef.current;

    const getOrCreateLineSeries = (key, options) => {
      if (seriesMap.has(key)) {
        return seriesMap.get(key);
      }
      const s = chart.addSeries(LineSeries, options);
      seriesMap.set(key, s);
      return s;
    };

    const getOrCreateHistogramSeries = (key, options) => {
      if (seriesMap.has(key)) {
        return seriesMap.get(key);
      }
      const s = chart.addSeries(HistogramSeries, options);
      seriesMap.set(key, s);
      return s;
    };

    const removeSeriesByKey = (key) => {
      if (seriesMap.has(key)) {
        try {
          chart.removeSeries(seriesMap.get(key));
        } catch (e) { }
        seriesMap.delete(key);
      }
    };

    const isIndHidden = (id) => hiddenIndicatorsRef.current?.has(id);

    // 1. EMA 200 Trendline
    if (emaSeriesRef.current) {
      if (currentActive.includes("ema200") && !isIndHidden("ema200")) {
        const emaData = calculateEMA(candles, 200);
        try { emaSeriesRef.current.setData(emaData); } catch (e) { }
      } else {
        try { emaSeriesRef.current.setData([]); } catch (e) { }
      }
    }

    // 2. Multiple EMA Ribbon (20, 50, 200)
    if (currentActive.includes("ema_ribbon") && !isIndHidden("ema_ribbon")) {
      const s20 = getOrCreateLineSeries("ind_ribbon_20", {
        color: "#00e5ff", lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const s50 = getOrCreateLineSeries("ind_ribbon_50", {
        color: "#ffeb3b", lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const s200 = getOrCreateLineSeries("ind_ribbon_200", {
        color: "#e040fb", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      try {
        s20.setData(calculateEMA(candles, 20));
        s50.setData(calculateEMA(candles, 50));
        s200.setData(calculateEMA(candles, 200));
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_ribbon_20");
      removeSeriesByKey("ind_ribbon_50");
      removeSeriesByKey("ind_ribbon_200");
    }

    // 3. Bollinger Bands (20, 2)
    if (currentActive.includes("bollinger_bands") && !isIndHidden("bollinger_bands")) {
      const bb = calculateBollingerBands(candles, 20, 2);
      const sUpper = getOrCreateLineSeries("ind_bb_upper", {
        color: "#2196f3", lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const sBasis = getOrCreateLineSeries("ind_bb_basis", {
        color: "#ff9800", lineWidth: 1.5, lineStyle: 2,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      const sLower = getOrCreateLineSeries("ind_bb_lower", {
        color: "#2196f3", lineWidth: 1.5,
        priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      });
      try {
        sUpper.setData(bb.upper);
        sBasis.setData(bb.basis);
        sLower.setData(bb.lower);
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_bb_upper");
      removeSeriesByKey("ind_bb_basis");
      removeSeriesByKey("ind_bb_lower");
    }

    // 4. SuperTrend (10, 3)
    if (currentActive.includes("supertrend") && !isIndHidden("supertrend")) {
      const st = calculateSuperTrend(candles, 10, 3);
      const sSt = getOrCreateLineSeries("ind_supertrend", {
        color: "#26a69a", lineWidth: 2,
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      });
      try {
        sSt.setData(st.map(item => ({ time: item.time, value: item.value })));
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_supertrend");
    }

    // 5. RSI (14) & 6. MACD (12, 26, 9)
    const hasRsi = currentActive.includes("rsi") && !isIndHidden("rsi");
    const hasMacd = currentActive.includes("macd") && !isIndHidden("macd");

    // Khi bật RSI hoặc MACD, tách biệt trục giá nến và các sub-pane
    try {
      if (hasRsi && hasMacd) {
        chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.05, bottom: 0.38 } });
        chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.65, bottom: 0.18 }, visible: true });
        chart.priceScale("macd").applyOptions({ scaleMargins: { top: 0.83, bottom: 0.02 }, visible: true });
      } else if (hasRsi) {
        chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.25 } });
        chart.priceScale("rsi").applyOptions({ scaleMargins: { top: 0.77, bottom: 0.02 }, visible: true });
      } else if (hasMacd) {
        chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.25 } });
        chart.priceScale("macd").applyOptions({ scaleMargins: { top: 0.77, bottom: 0.02 }, visible: true });
      } else {
        chart.priceScale("right").applyOptions({ scaleMargins: { top: 0.06, bottom: 0.12 } });
      }
    } catch (e) { }

    // RSI (14)
    if (hasRsi) {
      const sRsi = getOrCreateLineSeries("ind_rsi", {
        color: "#b388ff", lineWidth: 1.5,
        priceScaleId: "rsi",
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      });
      try {
        sRsi.setData(calculateRSI(candles, 14));
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_rsi");
    }

    // MACD (12, 26, 9)
    if (hasMacd) {
      const macdRes = calculateMACD(candles, 12, 26, 9);
      const sHist = getOrCreateHistogramSeries("ind_macd_hist", {
        priceScaleId: "macd",
        priceLineVisible: false, lastValueVisible: false,
      });
      const sMacd = getOrCreateLineSeries("ind_macd_line", {
        color: "#2962ff", lineWidth: 1.5,
        priceScaleId: "macd",
        priceLineVisible: false, lastValueVisible: false,
      });
      const sSig = getOrCreateLineSeries("ind_macd_sig", {
        color: "#ff6d00", lineWidth: 1.5,
        priceScaleId: "macd",
        priceLineVisible: false, lastValueVisible: false,
      });
      try {
        sHist.setData(macdRes.histogram);
        sMacd.setData(macdRes.macd);
        sSig.setData(macdRes.signal);
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_macd_hist");
      removeSeriesByKey("ind_macd_line");
      removeSeriesByKey("ind_macd_sig");
    }

    // 7. Volume 20 Chu Kỳ (Histogram + MA 20 Line)
    const hasVol = currentActive.includes("volume") && !isIndHidden("volume");
    if (volumeSeriesRef.current) {
      try {
        volumeSeriesRef.current.applyOptions({ visible: hasVol });
      } catch (e) { }
    }
    if (hasVol && candles && candles.length > 20) {
      const volData = candles.map(c => ({ time: c.time, value: c.volume || 0 }));
      const volMa = calculateSMA(volData, 20);
      const sVolMa = getOrCreateLineSeries("ind_vol_ma", {
        color: "rgba(33, 150, 243, 0.8)",
        lineWidth: 1.5,
        priceScaleId: "",
        priceLineVisible: false,
        lastValueVisible: false,
        crosshairMarkerVisible: false,
      });
      try {
        sVolMa.setData(volMa);
      } catch (e) { }
    } else {
      removeSeriesByKey("ind_vol_ma");
    }

    // 8. Coder Custom Scripts
    const activeCustomScriptIds = currentActive.filter(id => id.startsWith("custom_") || id.startsWith("comm_"));
    for (const [key] of seriesMap.entries()) {
      if (key.startsWith("coder_script_")) {
        const scriptId = key.replace("coder_script_", "").split("_plot_")[0];
        if (!activeCustomScriptIds.includes(scriptId) || isIndHidden(scriptId)) {
          removeSeriesByKey(key);
        }
      }
    }

    for (const sId of activeCustomScriptIds) {
      if (isIndHidden(sId)) continue;
      let script = currentScripts.find(s => s.id === sId);
      if (!script && typeof COMMUNITY_SCRIPTS !== "undefined") {
        script = COMMUNITY_SCRIPTS.find(s => s.id === sId);
      }
      if (!script) {
        try {
          const saved = JSON.parse(localStorage.getItem("tls1_coder_scripts") || "[]");
          script = saved.find(s => s.id === sId);
        } catch (e) { }
      }
      if (script && script.code) {
        const res = runCoderCustomScript(script.code, candles);
        if (res.success && res.plots) {
          res.plots.forEach((plotItem, idx) => {
            const plotKey = `coder_script_${sId}_plot_${idx}`;
            const pSeries = getOrCreateLineSeries(plotKey, {
              color: plotItem.color || "#00e676",
              lineWidth: plotItem.lineWidth || 2,
              priceLineVisible: false,
              lastValueVisible: true,
              crosshairMarkerVisible: false,
            });
            try {
              pSeries.setData(plotItem.data);
            } catch (e) { }
          });
        }
      }
    }

    // SMC Order Blocks
    drawObs();

    // TLS1 Charts Liquid v5
    if (currentActive.includes("liquid_v5") && !isIndHidden("liquid_v5")) {
      const bulkyATR = liquidV5Settings.htfCandleSize === 'Big' ? 2.1 : liquidV5Settings.htfCandleSize === 'Normal' ? 1.6 : 1.3;
      liquidV5BoxesRef.current = calculateLiquidV5(candles, {
        higherTF: liquidV5Settings.higherTF,
        bulkyCandleATR: bulkyATR,
        entryMode: liquidV5Settings.entryMode,
        requireRetracement: liquidV5Settings.requireRetracement,
        fvgSensitivity: liquidV5Settings.fvgDetectionSensitivity === 'All' ? 1.0 : 1.5,
        swingLength: liquidV5Settings.swingLength,
        tpslMethod: liquidV5Settings.tpslMethod,
        tpPercent: liquidV5Settings.tpPercent,
        slPercent: liquidV5Settings.slPercent
      });
    } else {
      liquidV5BoxesRef.current = { fvg_boxes: [], ob_boxes: [] };
    }
    drawLiquidV5Boxes();
  };


  // Cập nhật ref cho hàm updateIndicators
  updateIndicatorsRef.current = updateIndicators;

  // Khởi tạo Chart
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 300,
      height: containerRef.current.clientHeight || 200,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#787b86', attributionLogo: false },
      localization: {
        priceFormatter: (price) => new Intl.NumberFormat('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(price),
      },
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
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 8,
        barSpacing: 12,
        minBarSpacing: 3,
        borderColor: '#2a2e39',
        shiftVisibleRangeOnNewBar: true,
      },
      rightPriceScale: {
        borderColor: '#2a2e39',
        autoScale: true,
        scaleMargins: {
          top: 0.08,
          bottom: 0.25, // Thoáng đãng, nến không bao giờ chạm volume bên dưới
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
        } catch (e) { }

        const range = max - min;
        const pos = (currentPrice - min) / range; // 0.0 (đáy) -> 1.0 (đỉnh), 0.50 là tâm chính giữa

        // Vùng giữa: Giữ đường giá hiện tại luôn ở khoảng giữa chart (biên xê dịch 0% - 20% từ tâm)
        const minAllowedPos = 0.38;
        const maxAllowedPos = 0.62;

        if (pos < minAllowedPos) {
          min = currentPrice - (max - currentPrice);
        } else if (pos > maxAllowedPos) {
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
      priceFormat: {
        type: 'custom',
        formatter: (price) => {
          if (price >= 1000000) return (price / 1000000).toFixed(1) + 'M';
          if (price >= 1000) return (price / 1000).toFixed(1) + 'K';
          return price.toFixed(1);
        },
      },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 }, // Giữ volume gọn gàng 18% dưới đáy
    });

    chartRef.current = chart;
    candleSeriesRef.current = cs;
    volumeSeriesRef.current = vs;
    emaSeriesRef.current = es;
    setChartInstance(chart);
    setSeriesInstance(cs);

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      drawObs();
      drawLiquidV5Boxes();
    });

    // Bắt tương tác chuột/touch của người dùng để khóa zoom, không tự ý reset
    const handleUserInteraction = () => {
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        setIsAutoFit(false);
      }
    };

    const containerEl = containerRef.current;
    containerEl.addEventListener('wheel', handleUserInteraction, { passive: true });
    containerEl.addEventListener('pointerdown', handleUserInteraction, { passive: true });
    containerEl.addEventListener('touchstart', handleUserInteraction, { passive: true });

    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current && entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          chartRef.current.applyOptions({ width, height });
          drawObs();
          drawLiquidV5Boxes();
          if (isAutoFit && !userInteractedRef.current) {
            applyDefaultZoom();
          }
        }
      }
    });
    resizeObserver.observe(containerEl);

    return () => {
      containerEl.removeEventListener('wheel', handleUserInteraction);
      containerEl.removeEventListener('pointerdown', handleUserInteraction);
      containerEl.removeEventListener('touchstart', handleUserInteraction);
      resizeObserver.disconnect();
      dynamicSeriesRef.current.clear();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      setChartInstance(null);
      setSeriesInstance(null);
    };
  }, []);

  // Tự động cập nhật các Indicators động khi activeIndicators, coderScripts hoặc hiddenIndicators thay đổi
  useEffect(() => {
    activeIndicatorsRef.current = activeIndicators;
    coderScriptsRef.current = coderScripts;
    hiddenIndicatorsRef.current = hiddenIndicators;
    if (!isVisible || !chartRef.current) return;
    (updateIndicatorsRef.current || updateIndicators)();
    drawObs();
    drawLiquidV5Boxes();
  }, [activeIndicators, coderScripts, isVisible, hiddenIndicators]);

  // Tự động căn chỉnh lại kích thước và zoom khi bố cục hoặc trạng thái hiển thị thay đổi
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(() => {
      if (chartRef.current && containerRef.current) {
        const w = containerRef.current.clientWidth;
        const h = containerRef.current.clientHeight;
        if (w > 0 && h > 0) {
          chartRef.current.applyOptions({ width: w, height: h });
        }
        if (!userInteractedRef.current) {
          applyDefaultZoom();
        }
        drawObs();
        drawLiquidV5Boxes();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isVisible, layout]);

  // Quản lý dữ liệu nến: Khôi phục tức thì từ cache RAM (0ms) + Fetch ngầm cập nhật
  useEffect(() => {
    if (!isVisible) return;

    hasInitializedRef.current = false;
    userInteractedRef.current = false;
    setIsAutoFit(true);

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
        try { candleSeriesRef.current.setData(cached.candles); } catch { }
      }
      if (volumeSeriesRef.current && cached.volume) {
        try { volumeSeriesRef.current.setData(cached.volume); } catch { }
      }
      if (emaSeriesRef.current && cached.ema) {
        try { emaSeriesRef.current.setData(cached.ema); } catch { }
      }
      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        setTimeout(() => {
          if (isMounted) {
            applyDefaultZoom();
            (updateIndicatorsRef.current || updateIndicators)();
            drawObs();
            drawLiquidV5Boxes();
          }
        }, 15);
      } else {
        (updateIndicatorsRef.current || updateIndicators)();
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
      if (liquidV5OverlayRef.current) {
        liquidV5OverlayRef.current.innerHTML = "";
      }
      candlesRef.current = [];
      activeObsRef.current = [];
    }

    const fetchCandles = async () => {
      if (!candleSeriesRef.current) return;
      try {
        const res = await fetch(`/api/market/candles?instId=${coin}&bar=${bar}&limit=2500`);
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

        // Lưu lại visibleLogicalRange trước khi update để tránh giật/reset tầm nhìn
        let prevRange = null;
        if (chartRef.current && hasInitializedRef.current) {
          try {
            prevRange = chartRef.current.timeScale().getVisibleLogicalRange();
          } catch (e) { }
        }

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
        (updateIndicatorsRef.current || updateIndicators)();

        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          setTimeout(() => {
            if (!isMounted) return;
            applyDefaultZoom();
            (updateIndicatorsRef.current || updateIndicators)();
            drawObs();
            drawLiquidV5Boxes();
          }, 30);
        } else {
          // Khi cập nhật nến định kỳ:
          if (userInteractedRef.current && prevRange) {
            // User đã tự zoom/drag: TUYỆT ĐỐI GIỮ NGUYÊN tầm nhìn hiện tại, không reset!
            try {
              chartRef.current.timeScale().setVisibleLogicalRange(prevRange);
            } catch (e) { }
          } else if (!userInteractedRef.current) {
            // Chưa thao tác (chế độ Auto): bám theo nến mới nhất và luôn cách viền phải 8 nến
            try {
              const lr = prevRange || chartRef.current.timeScale().getVisibleLogicalRange();
              const span = lr ? (lr.to - lr.from) : 55;
              chartRef.current.timeScale().setVisibleLogicalRange({
                from: unique.length - 1 + 8 - span,
                to: unique.length - 1 + 8,
              });
            } catch (e) { }
          }
          setTimeout(() => {
            if (!isMounted) return;
            drawObs();
            drawLiquidV5Boxes();
          }, 30);
        }
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
            {layoutSelector}
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
            <button
              className={`chart-indicators-btn ${activeIndicators.length > 0 ? "active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setIndicatorsModalTab("system");
                setShowIndicatorsModal(true);
              }}
              title="Indicators, metrics & strategies"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M3 3v18h18" />
                <path d="M7 16l4-6 4 3 6-8" />
              </svg>
              <span>Indicators</span>
              {activeIndicators.length > 0 && (
                <span
                  className="indicator-badge"
                  title="Đang kích hoạt: Bấm để quản lý bật/tắt"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIndicatorsModalTab("active");
                    setShowIndicatorsModal(true);
                  }}
                >
                  {activeIndicators.length}
                </span>
              )}
            </button>

            {/* Chế độ Hybrid: Chuyển đổi giữa Standard và TV Pro - Hoàn toàn không có icon */}
            <div className="chart-mode-pill-group">
              <button
                className={`chart-mode-pill ${chartMode === "standard" ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleChartMode("standard");
                }}
                title="Biểu đồ Tiêu Chuẩn (Khối Order Block live từ Bot)"
              >
                Standard
              </button>
              <button
                className={`chart-mode-pill tv ${chartMode === "tv" ? "active" : ""}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggleChartMode("tv");
                }}
                title="Biểu đồ TradingView Gốc (Full công cụ vẽ & indicator chính hãng)"
              >
                TradingView
              </button>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <div style={{ fontSize: "10px", color: "#888", fontWeight: "bold" }}>
              #{chartIndex + 1}
            </div>
          </div>
        </div>
      )}

      <div className="single-chart-body" style={{ display: chartMode === "tv" ? "none" : "flex" }}>
        <div className="chart-stage-wrapper" style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#0c0c0c', overflow: 'hidden' }}>
          {/* TOÀN BỘ CÁC TOOL VÀ BOX (SMC OB, Liquid OB/FVG, Long/Short Position Box) NẰM BÊN DƯỚI NẾN */}
          <div
            ref={overlayRef}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              pointerEvents: 'none', zIndex: 1, overflow: 'hidden'
            }}
          />
          <div
            ref={liquidV5BoxesOverlayRef}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              pointerEvents: 'none', zIndex: 1, overflow: 'hidden'
            }}
          />
          <div
            ref={liquidV5OverlayRef}
            style={{
              position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
              pointerEvents: 'none', zIndex: 1, overflow: 'hidden'
            }}
          />

          {/* Canvas Biểu Đồ Nến NẰM ĐÈ LÊN TRÊN ĐẦU TIÊN BẤT CHẤP MỌI THỨ */}
          <div
            className="single-chart-canvas"
            ref={containerRef}
            style={{ position: 'relative', width: '100%', height: '100%', zIndex: 10 }}
            onWheel={() => setIsAutoFit(false)}
            onTouchStart={() => setIsAutoFit(false)}
            onMouseDown={() => setIsAutoFit(false)}
          />
          <DrawingCanvasOverlay
            chart={chartInstance}
            series={seriesInstance}
            coin={coin}
            activeTool={activeDrawingTool}
            setActiveTool={setActiveDrawingTool}
            onDrawingsCountChange={setDrawingsCount}
            clearTrigger={clearDrawingsTrigger}
          />

          {/* TradingView-Style Indicator Legend Overlay */}
          <div 
            className="chart-legend-overlay"
          >
            {isLegendVisible && activeIndicators.length > 0 && (
              <div className="chart-legend-list">
                {activeIndicators.map((id) => {
                  const isHidden = hiddenIndicators.has(id);
                  const title = getIndicatorTitle(id);
                  return (
                    <div key={id} className={`chart-legend-item ${isHidden ? "legend-item-hidden" : ""}`}>
                      <span
                        className="chart-legend-item-title"
                        title={title}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleHideIndicator(id);
                        }}
                      >
                        {title}
                      </span>
                      <div className="chart-legend-actions">
                        <button
                          className="chart-legend-action-btn"
                          title={isHidden ? "Show indicator" : "Hide indicator"}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleHideIndicator(id);
                          }}
                        >
                          {isHidden ? (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                              <line x1="1" y1="1" x2="23" y2="23" />
                            </svg>
                          ) : (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                              <circle cx="12" cy="12" r="3" />
                            </svg>
                          )}
                        </button>

                        <button
                          className="chart-legend-action-btn remove-btn"
                          title="Remove indicator"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleIndicator(id);
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="chart-legend-header">
              <button
                className="chart-legend-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLegendVisible(prev => !prev);
                }}
                title={isLegendVisible ? "Hide indicator legend" : "Show indicator legend"}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{
                    transform: isLegendVisible ? "rotate(0deg)" : "rotate(180deg)",
                    transition: "transform 0.15s ease",
                  }}
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
              {!isLegendVisible && activeIndicators.length > 0 && (
                <span
                  className="chart-legend-collapsed-hint"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsLegendVisible(true);
                  }}
                  title="Show indicator legend"
                >
                  {activeIndicators.length} ind
                </span>
              )}
            </div>
          </div>

          {/* Bảng Thống Kê Winrate (Luôn đặt ở góc trên bên phải chart, có nút xổ ra xổ vào) */}
          <div 
            className={`chart-backtest-table-wrap ${isBacktestCollapsed ? 'collapsed' : ''}`}
            onMouseDown={e => e.stopPropagation()}
            onMouseUp={e => e.stopPropagation()}
            onTouchStart={e => e.stopPropagation()}
            onTouchEnd={e => e.stopPropagation()}
            onPointerDown={e => e.stopPropagation()}
          >
            <div
              className="chart-backtest-header"
              onClick={() => setIsBacktestCollapsed(prev => !prev)}
              title={isBacktestCollapsed ? "Bấm để mở rộng bảng Backtesting" : "Bấm để thu gọn bảng Backtesting"}
            >
              <span className="chart-backtest-title">
                Backtesting
              </span>
              <button
                className="chart-backtest-toggle-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBacktestCollapsed(prev => !prev);
                }}
                title={isBacktestCollapsed ? "Mở rộng" : "Thu gọn"}
              >
                <svg
                  width="11"
                  height="11"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  style={{
                    transform: isBacktestCollapsed ? "rotate(180deg)" : "rotate(0deg)",
                    transition: "transform 0.2s ease"
                  }}
                >
                  <polyline points="18 15 12 9 6 15" />
                </svg>
              </button>
            </div>

            {!isBacktestCollapsed && (
              <table className="chart-backtest-table">
                <tbody>
                  <tr>
                    <td className="col-metric">Total Entries</td>
                    <td className="col-val">{backtestStats.totalEntries}</td>
                  </tr>
                  <tr>
                    <td className="col-metric">Wins</td>
                    <td className="col-val">{backtestStats.wins}</td>
                  </tr>
                  <tr>
                    <td className="col-metric">Losses</td>
                    <td className="col-val">{backtestStats.losses}</td>
                  </tr>
                  <tr>
                    <td className="col-metric">Winrate</td>
                    <td className="col-val" style={{ color: '#00e676', fontWeight: 700 }}>{backtestStats.winrate}</td>
                  </tr>

                  <tr>
                    <td className="col-metric">Total Profit</td>
                    <td className="col-val" style={{ color: '#00e676', fontWeight: 700 }}>{backtestStats.totalProfit}</td>
                  </tr>
                </tbody>
              </table>
            )}
          </div>

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
                if (next) {
                  userInteractedRef.current = false;
                  applyDefaultZoom();
                }
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

      {/* Widget TradingView Chính Hãng khi ở chế độ TV Pro */}
      {chartMode === "tv" && (
        <div className="single-chart-body tv-body" style={{ flex: 1, height: "100%", width: "100%", position: "relative" }}>
          <TradingViewEmbedChart
            coin={coin}
            tf={tf}
            chartIndex={chartIndex}
            isVisible={isVisible && chartMode === "tv"}
          />
        </div>
      )}

      {/* TradingView Indicators & Coder Scripts Modal */}
      <IndicatorsModal
        isOpen={showIndicatorsModal}
        onClose={() => setShowIndicatorsModal(false)}
        activeIndicators={activeIndicators}
        onToggleIndicator={toggleIndicator}
        customScripts={coderScripts}
        onUpdateCustomScripts={setCoderScripts}
        candles={candlesRef.current}
        initialCategory={indicatorsModalTab}
      />

      {/* LIQUID V5 SETTINGS MODAL */}
      {showLiquidV5Settings && (
        <div className="account-prompt-overlay" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: 100000 }} onClick={e => e.target === e.currentTarget && setShowLiquidV5Settings(false)}>
          <div className="tv-settings-modal" style={{
            width: '420px',
            background: '#1e222d',
            border: '1px solid #434651',
            borderRadius: '6px',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
            display: 'flex',
            flexDirection: 'column',
            color: '#d1d4dc',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tiodev_TLS1 Charts_Liquid</h3>
              <button onClick={() => setShowLiquidV5Settings(false)} style={{ background: 'none', border: 'none', color: '#787b86', cursor: 'pointer', fontSize: '20px', padding: 0 }}>✕</button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: '24px', padding: '16px 20px 0', borderBottom: '1px solid #434651', fontSize: '14px', fontWeight: 500 }}>
              <div style={{ paddingBottom: '10px', color: '#d1d4dc', borderBottom: '2px solid #2962ff', cursor: 'pointer' }}>Inputs</div>
            </div>

            <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>

              {/* General Configuration */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Higher Timeframe</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} value={liquidV5Settings.higherTF} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, higherTF: e.target.value })}>
                  <option value="1H">1H</option>
                  <option value="H4">4H</option>
                  <option value="D">Daily</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>HTF Candle Size</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} value={liquidV5Settings.htfCandleSize} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, htfCandleSize: e.target.value })}>
                  <option value="Big">Big</option>
                  <option value="Normal">Normal</option>
                  <option value="Small">Small</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Entry Mode</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} value={liquidV5Settings.entryMode} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, entryMode: e.target.value })}>
                  <option value="FVGs">FVGs (Auto)</option>
                  <option value="Order Blocks">Order Blocks</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" id="requireRet" checked={liquidV5Settings.requireRetracement} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, requireRetracement: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="requireRet" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Require Retracement</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" id="showHtfLine" checked={liquidV5Settings.showHTFCandleLines} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, showHTFCandleLines: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="showHtfLine" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show HTF Candle Lines</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>FVG Detection Sensitivity</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} value={liquidV5Settings.fvgDetectionSensitivity} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, fvgDetectionSensitivity: e.target.value })}>
                  <option value="All">All</option>
                  <option value="Extreme">Extreme</option>
                  <option value="High">High</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" id="showFVG" checked={liquidV5Settings.showFVGs} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, showFVGs: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="showFVG" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show FVGs</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Swing Length</span>
                <input type="number" style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }} value={liquidV5Settings.swingLength} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, swingLength: parseInt(e.target.value) || 35 })} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                <input type="checkbox" id="showOB" checked={liquidV5Settings.showOrderBlocks} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, showOrderBlocks: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="showOB" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show Order Blocks</label>
              </div>

              {/* TP / SL */}
              <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>TP / SL</div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" defaultChecked style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Enabled</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>TP / SL Method</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} value={liquidV5Settings.tpslMethod} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, tpslMethod: e.target.value })}>
                  <option value="Dynamic">Dynamic</option>
                  <option value="Fixed">Fixed</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Dynamic Risk</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} defaultValue="Highest">
                  <option value="Highest">Highest</option>
                  <option value="Normal">Normal</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Fixed Take Profit %</span>
                <input type="number" step="0.1" style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }} value={liquidV5Settings.tpPercent} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, tpPercent: parseFloat(e.target.value) || 0.3 })} />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Fixed Stop Loss %</span>
                <input type="number" step="0.1" style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }} value={liquidV5Settings.slPercent} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, slPercent: parseFloat(e.target.value) || 0.4 })} />
              </div>

              {/* BACKTESTING DASHBOARD */}
              <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>BACKTESTING DASHBOARD</div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" id="onlyWinrateEntry2" checked={liquidV5Settings.onlyWinrateEntry2} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, onlyWinrateEntry2: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="onlyWinrateEntry2" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Only winrate Entry2</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" defaultChecked style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Enabled</label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Position</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} defaultValue="Top Right">
                  <option value="Top Right">Top Right</option>
                  <option value="Bottom Right">Bottom Right</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
                <input type="checkbox" id="fillBackgrounds" checked={liquidV5Settings.fillBackgrounds} onChange={(e) => setLiquidV5Settings({ ...liquidV5Settings, fillBackgrounds: e.target.checked })} style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label htmlFor="fillBackgrounds" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Fill Backgrounds</label>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px', width: '120px' }}>Background</span>
                <div style={{ width: '28px', height: '28px', backgroundColor: '#131722', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
              </div>

              {/* ALERTS */}
              <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>ALERTS</div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Long Signal</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Short Signal</label>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '16px', marginBottom: '16px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Take-Profit Signal</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Stop-Loss Signal</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>TP 2/3 Signal</label>
                </div>
                <div style={{ display: 'flex', alignItems: 'center' }}>
                  <input type="checkbox" defaultChecked style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                  <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>SL 2/3 Signal</label>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
                <input type="checkbox" style={{ marginRight: '8px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
                <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>[TEST] 1 alert</label>
              </div>

              {/* VISUALS */}
              <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>VISUALS</div>

              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                <span style={{ color: '#d1d4dc', fontSize: '14px' }}>TP / SL Layout</span>
                <select style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }} defaultValue="Default">
                  <option value="Default">Default</option>
                  <option value="Compact">Compact</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Bullish FVG</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: 'rgba(0, 150, 136, 0.4)', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Bearish FVG</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: 'rgba(244, 67, 54, 0.4)', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Long</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#00bcd4', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Short</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#ff5252', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Text</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#ffffff', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Entry2</span>
                  <div style={{ width: '28px', height: '28px', backgroundColor: '#ffb300', border: '1px solid #434651', borderRadius: '4px', cursor: 'pointer' }}></div>
                </div>
              </div>

            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #434651', alignItems: 'center' }}>
              <select style={{ background: 'transparent', border: 'none', color: '#d1d4dc', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
                <option>Defaults</option>
              </select>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button
                  style={{ background: 'transparent', border: '1px solid #434651', color: '#d1d4dc', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                  onClick={() => setShowLiquidV5Settings(false)}
                >
                  Cancel
                </button>
                <button
                  style={{ background: '#2962ff', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
                  onClick={() => {
                    setShowLiquidV5Settings(false);
                    updateIndicatorsRef.current(); // Force re-render indicators
                  }}
                >
                  Ok
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
    } catch (e) { }
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
        const res = await fetch(`/api/market/candles?instId=${coin}&bar=${tf}&limit=2500`);
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
      } catch (e) { }
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
    if (e.cancelable) e.preventDefault();
    const isVertical = layoutMode === "vertical";
    const isTouch = e.type === "touchstart";

    // Add is-resizing to body to prevent iframe capturing mouse events
    document.body.classList.add("is-resizing");
    if (isVertical) {
      document.body.classList.add("is-resizing-vertical");
    }

    const doDrag = (dragEvent) => {
      if (isTouch && dragEvent.cancelable) dragEvent.preventDefault();
      const clientX = isTouch ? dragEvent.touches[0].clientX : dragEvent.clientX;
      const clientY = isTouch ? dragEvent.touches[0].clientY : dragEvent.clientY;
      
      const workspace = document.querySelector(".main-workspace");
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      if (isVertical) {
        let newRatio = ((clientY - rect.top) / rect.height) * 100;
        if (newRatio < 25) newRatio = 25;
        if (newRatio > 75) newRatio = 75;
        setChartRatio(newRatio);
      } else {
        let newRatio = ((clientX - rect.left) / rect.width) * 100;
        if (newRatio < 25) newRatio = 25;
        if (newRatio > 75) newRatio = 75;
        setChartRatio(newRatio);
      }
    };
    const stopDrag = () => {
      document.body.classList.remove("is-resizing");
      document.body.classList.remove("is-resizing-vertical");
      if (isTouch) {
        document.removeEventListener("touchmove", doDrag);
        document.removeEventListener("touchend", stopDrag);
      } else {
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
      }
    };
    
    if (isTouch) {
      document.addEventListener("touchmove", doDrag, { passive: false });
      document.addEventListener("touchend", stopDrag);
    } else {
      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    }
  };

  const [activeTab, setActiveTab] = useState("positions");
  const [layoutMode, setLayoutMode] = useState("vertical");
  const [logs, setLogs] = useState(["Đã kết nối với TLS1 Trading Web Terminal Server..."]);
  const [positions, setPositions] = useState([]);
  const [closedPositions, setClosedPositions] = useState([]);
  const [adminClosedPositions, setAdminClosedPositions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("strategy");
  const [showCoinSelector, setShowCoinSelector] = useState(false);
  const [watchlistCoins, setWatchlistCoins] = useState(() => {
    try {
      const curUid = localStorage.getItem("tls1_uid") || "guest";
      const saved = localStorage.getItem(`tls1_watchlist_coins_${curUid}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (!parsed.includes("CL-USDT-SWAP")) {
            parsed.splice(1, 0, "CL-USDT-SWAP");
          }
          return parsed;
        }
      }
    } catch { }
    return ["XAU-USDT-SWAP", "CL-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"];
  });

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
    } catch (e) { }
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
      try { return JSON.parse(saved); } catch { }
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
    const isAdm = currentUid.toLowerCase() === "admtls12021";
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
  const [risk, setRisk] = useState({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
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
      setRisk({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
      setStrat({
        main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    } else if (activeBotTab === "sub2") {
      // Defaults for Bot SMC
      setRisk({ posVol: 1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
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
            if (newBlocks[0].lines.length > 20) {
              newBlocks[0].lines = newBlocks[0].lines.slice(newBlocks[0].lines.length - 20);
            }
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
          if (d.POSITION_VOLUME_HIGH_CONFIDENCE !== undefined && d.POSITION_VOLUME_HIGH_CONFIDENCE !== null) {
            setRisk(r => ({
              ...r,
              posVol: Number(d.POSITION_VOLUME_HIGH_CONFIDENCE),
              tpPct: d.SCALPING_TP_PCT ? Number((d.SCALPING_TP_PCT * 100).toFixed(2)) : r.tpPct,
              slPct: d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : r.slPct
            }));
          }
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
    // Khởi động Shadow Bot ngay khi login (nếu chưa chạy)
    const autoStartShadow = async () => {
      try {
        const curUid = localStorage.getItem('tls1_uid') || loginUid;
        await fetch(`/api/bot/shadow/start?uid=${curUid}&strategy=${activeBotTab}`, { method: 'POST' });
      } catch { }
    };
    autoStartShadow();
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
      if (r2.ok) {
        setClosedPositions(await r2.json());
      }

      // Fetch admin data for backtest stats
      const rAdmin = await fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${ADMIN_UID}`);
      if (rAdmin.ok) {
        setAdminClosedPositions(await rAdmin.json());
      }
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
    if (!window.confirm("Bạn có chắc chắn muốn DỪNG CHẠY BOT không?")) {
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

  // Tạm thời ẩn các dòng lệnh tách theo yêu cầu CEO, chỉ để dòng lệnh gộp
  const safePos = (Array.isArray(positions) ? positions : []).filter(p => !p.is_child);
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

  const handleToggleWatchlistCoin = (coinValue) => {
    const isCurrentlySelected = watchlistCoins.includes(coinValue);
    const curUid = localStorage.getItem("tls1_uid") || loginUid || "guest";
    if (isCurrentlySelected) {
      // Bắt buộc kiểm tra: nếu coin còn vị thế trên sàn thì CHẶN
      const hasOpenPosition = safePos.some(p => p.instId === coinValue);
      if (hasOpenPosition) {
        const coinName = coinValue.replace("-USDT-SWAP", "").replace("-SWAP", "");
        alert(`⚠️ Không thể bỏ chọn [${coinName}] vì đang có vị thế mở trên sàn!\n\nQuy tắc an toàn: Vui lòng đóng hết lệnh của cặp này trước khi gỡ bỏ khỏi danh sách theo dõi.`);
        return;
      }
      const updated = watchlistCoins.filter(c => c !== coinValue);
      setWatchlistCoins(updated);
      try {
        localStorage.setItem(`tls1_watchlist_coins_${curUid}`, JSON.stringify(updated));
      } catch { }
      // Tự động tắt trade nếu cặp này đang bật trong activePairs
      if (activePairs.includes(coinValue)) {
        togglePair(coinValue);
      }
    } else {
      const updated = [...watchlistCoins, coinValue];
      setWatchlistCoins(updated);
      try {
        localStorage.setItem(`tls1_watchlist_coins_${curUid}`, JSON.stringify(updated));
      } catch { }
    }
  };
  const safeEnabledTfs = Array.isArray(enabledTfs) ? enabledTfs : [];
  const isRunning = botStatus === "RUNNING";
  const isShadow = botStatus === "SHADOW";

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
                    placeholder="Ví dụ: 12345678"
                    value={loginUid}
                    onChange={e => setLoginUid(e.target.value)}
                    style={{ width: "260px", padding: "10px", marginBottom: "15px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "6px", fontSize: "14px", textAlign: "center" }}
                  />
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
              <div style={{ marginBottom: "5px" }}>
                <span style={{ fontSize: "11px", color: "#aaa", fontWeight: "bold" }}>
                  Tài khoản ({activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation"}):
                </span>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <select
                  className="styled-select"
                  style={{ flex: 1, minWidth: 0, background: "#2a2a2a", border: "1px solid #444", color: "#fff", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", outline: "none", height: "28px" }}
                  value={botAccountMap[activeBotTab] || "sub1"}
                  onChange={e => handleAssignAccountToActiveBot(e.target.value)}
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  className="btn-chart-settings"
                  style={{ height: "28px", whiteSpace: "nowrap", flexShrink: 0 }}
                  onClick={() => setShowSettings(true)}
                  title="Cài đặt hệ thống & API Key"
                >
                  ⚙ Cài Đặt
                </button>
              </div>
            </div>

            <div className="group-box" style={{ position: "relative" }}>
              <span className="group-box-title">QUẢN LÝ VỐN & RỦI RO</span>
              <div style={{ position: "absolute", top: "-10px", right: "8px", display: "flex", alignItems: "center", gap: "5px", backgroundColor: "#252526", padding: "0 4px" }}>
                <div style={{ display: "flex", gap: "2px" }}>
                  <button
                    onClick={() => setRisk(r => ({ ...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 1 : r.posVol }))}
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
                    <label>{risk.volUnit === "USDT" ? "Ký quỹ (USDT):" : "Ký quỹ (Lot):"}</label>
                    <NumberSpinBox
                      value={risk.posVol}
                      onChange={val => setRisk(r => ({ ...r, posVol: val }))}
                      min={risk.volUnit === "LOT" ? 0.01 : 1}
                      step={risk.volUnit === "LOT" ? 0.01 : 10}
                      suffix={risk.volUnit === "USDT" ? "$" : ""}
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
                <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
                  <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.73 56.6 2.05 80A105.73 105.73 0 0 0 34.6 96.36a77.7 77.7 0 0 0 7-11.41 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 60.32 0c.87.66 1.75 1.34 2.66 2a68.42 68.42 0 0 1-10.87 5.19 77 77 0 0 0 7 11.41A105.49 105.49 0 0 0 125.09 80c4.15-26.15-.98-49.49-17.39-71.93ZM42.56 65.3c-5.36 0-9.82-4.9-9.82-10.88s4.36-10.88 9.82-10.88 9.9 4.9 9.82 10.88c0 6-4.46 10.88-9.82 10.88Zm41.92 0c-5.36 0-9.82-4.9-9.82-10.88s4.36-10.88 9.82-10.88 9.9 4.9 9.82 10.88c0 6-4.46 10.88-9.82 10.88Z" />
                </svg>
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
            <div className="bot-action-bar" style={{ display: 'flex', justifyContent: 'center' }}>
              {isRunning ? (
                <button
                  onClick={handleStopBot}
                  disabled={isStoppingBot}
                  className="btn-action-stop"
                  style={{ width: "fit-content", alignSelf: "center" }}
                >
                  {isStoppingBot ? '⏳ ĐANG DỪNG...' : '■ DỪNG BOT'}
                </button>
              ) : (
                <button
                  onClick={handleStartBot}
                  className="btn-action-start"
                  style={{ width: "fit-content", alignSelf: "center" }}
                >
                  ▶ CHẠY BOT
                </button>
              )}
            </div>

            {/* Cụm thẻ Workspace & Biểu đồ */}
            <div className="chart-panel-card">
              <main className={`main-workspace ${layoutMode}`} style={{ '--chart-ratio': `${chartRatio}%` }}>
                <section className="pane-chart" style={{ position: "relative" }}>
                  <div className={`multi-chart-container layout-${chartLayout}`}>
                    {chartsConfig.slice(0, 4).map((cfg, idx) => (
                      <SingleChartPane
                        key={`chart_slot_${idx}`}
                        activeBotTab={activeBotTab}
                        adminClosedPositions={adminClosedPositions}
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
                        layoutSelector={idx === 0 ? (
                          <div className="layout-selector-wrapper" ref={layoutSelectorRef}>
                            <button
                              type="button"
                              className={`btn-layout-selector ${showLayoutMenu ? "active" : ""}`}
                              title="Chọn bố cục biểu đồ (TradingView Layout)"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowLayoutMenu(!showLayoutMenu);
                              }}
                            >
                              {renderLayoutIcon(chartLayout, 14, 14)}
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
                        ) : null}
                      />
                    ))}
                  </div>
                </section>

                <div
                  className={`resizer ${layoutMode === "vertical" ? "horizontal-resizer" : "vertical-resizer"}`}
                  onMouseDown={startResizing}
                  onTouchStart={startResizing}
                />

                <section className="pane-tabs">
                  <div className="tab-bar-header">
                    <div className="tab-buttons">
                      <button className={`tab-btn ${activeTab === "positions" ? "active" : ""}`} onClick={() => setActiveTab("positions")}>
                        Bảng Vị Thế ({safePos.length})
                      </button>
                      <button className={`tab-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
                        Logs
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
                      {/* <span className={`status-badge ${isRunning ? "running" : "stopped"}`}>
                    {isRunning ? `● ĐANG CHẠY | ${formatUptime(uptime)}` : "● ĐÃ DỪNG"}
                  </span> */}
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
                              const baseCoins = watchlistCoins.map(val => {
                                const found = COIN_LIST.find(c => c.value === val);
                                if (found) return found;
                                return { label: val.replace("-SWAP", ""), value: val, maxLever: 50 };
                              });
                              const allCoinValues = new Set([...watchlistCoins, ...safePos.map(p => p.instId)]);
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
                                const roiA = getCoinRoi(a.value);
                                const roiB = getCoinRoi(b.value);
                                if (roiA !== roiB) return roiB - roiA; // % PNL cao nhất từ trên xuống dưới
                                // Nếu cả 2 đều chưa có vị thế, giữ đúng thứ tự ưu tiên trong COIN_LIST (XAU, CL lên đầu)
                                const idxA = COIN_LIST.findIndex(c => c.value === a.value);
                                const idxB = COIN_LIST.findIndex(c => c.value === b.value);
                                return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
                              });

                              return sortedCoins.map((coin, i) => {
                                const rawPosList = (Array.isArray(positions) ? positions : []).filter(p => p.instId === coin.value);
                                const parentList = rawPosList.filter(p => !p.is_child).sort((a, b) => parseFloat(b.roi || 0) - parseFloat(a.roi || 0));
                                const posList = [];
                                parentList.forEach(parent => {
                                  posList.push(parent);
                                  const children = rawPosList.filter(p => p.is_child && p.parent_id === parent.ticket_id);
                                  posList.push(...children);
                                });
                                const isChecked = activePairs.includes(coin.value);

                                if (posList.length === 0) {
                                  return (
                                    <tr key={coin.value} style={{ borderBottom: "1px solid #333" }}>
                                      <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                          {/* Tạm ẩn vạch màu 4x20 theo yêu cầu CEO */}
                                          <input
                                            type="checkbox"
                                            className="coin-toggle"
                                            checked={isChecked}
                                            onChange={() => togglePair(coin.value)}
                                            onClick={e => e.stopPropagation()}
                                            title={isChecked ? "Đang BẬT trade (Click để TẮT)" : "Đang TẮT trade (Click để BẬT)"}
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
                                      <td style={{ padding: "6px 10px", textAlign: "center" }}>
                                        <span style={{ color: "#444", fontSize: "11px" }}>—</span>
                                      </td>
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
                                    <tr key={`${coin.value}-${pos.ticket_id || ticketIndex}`} style={{ borderBottom: ticketIndex === posList.length - 1 ? "1px solid #333" : (isChild ? "1px solid transparent" : "1px solid rgba(255, 255, 255, 0.03)"), backgroundColor: isChild ? "rgba(255, 255, 255, 0.01)" : "transparent" }}>
                                      <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0, paddingLeft: isChild ? "20px" : "0px" }}>
                                          {/* Tạm ẩn vạch màu 4x20 theo yêu cầu CEO */}
                                          {!isChild ? (
                                            <input
                                              type="checkbox"
                                              className="coin-toggle"
                                              checked={isChecked}
                                              onChange={() => togglePair(coin.value)}
                                              onClick={e => e.stopPropagation()}
                                              title={isChecked ? "Đang BẬT trade (Click để TẮT)" : "Đang TẮT trade (Click để BẬT)"}
                                            />
                                          ) : (
                                            <div style={{ width: "17px", height: "13px", flexShrink: 0 }}></div>
                                          )}

                                          <span style={{ fontSize: isChild ? "13px" : "15px", display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span 
                                              style={{ color: isChild ? "rgba(255,255,255,0.4)" : "#fff", cursor: "pointer" }}
                                              onClick={() => {
                                                const rawTf = pos.tf ? pos.tf.split(' ')[0].toUpperCase() : "1H";
                                                let mappedTf = "1H";
                                                if (rawTf.includes("1M") || rawTf.includes("M1")) mappedTf = "1m";
                                                else if (rawTf.includes("5M") || rawTf.includes("M5")) mappedTf = "5m";
                                                else if (rawTf.includes("15M") || rawTf.includes("M15")) mappedTf = "15m";
                                                else if (rawTf.includes("30M") || rawTf.includes("M30")) mappedTf = "30m";
                                                else if (rawTf.includes("1H") || rawTf.includes("H1")) mappedTf = "1H";
                                                else if (rawTf.includes("2H") || rawTf.includes("H2")) mappedTf = "2H";
                                                else if (rawTf.includes("4H") || rawTf.includes("H4")) mappedTf = "4H";
                                                else if (rawTf.includes("1D") || rawTf.includes("D1")) mappedTf = "1D";
                                                updateChartConfig(activeChartIndex, { coin: coin.value, tf: mappedTf });
                                              }}
                                              title="Click để xem biểu đồ"
                                            >
                                              {coin.label.replace("-SWAP", "")}
                                            </span>

                                            {!isChild && (
                                              <>
                                                <span style={{ fontSize: "12px", color: isLong ? "#4caf50" : "#ff5252", backgroundColor: isLong ? "rgba(76, 175, 80, 0.1)" : "rgba(255, 82, 82, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                                                  {isLong ? "Long" : "Short"} {pos.lever || "100"}x
                                                </span>
                                                {pos.tf && pos.tf.split(' ').length === 1 && (
                                                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: "12px", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", padding: "1px 6px" }}>
                                                    {pos.tf.toLowerCase()}
                                                  </span>
                                                )}
                                              </>
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
                        {(Boolean(localStorage.getItem('tls1_uid') || loginUid) && (localStorage.getItem('tls1_uid') || loginUid).toLowerCase() === "admtls12021") && (
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
                          onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U&list=PLdzvL_bHCpls&index=2", "_blank", "noopener,noreferrer")}
                          style={{
                            background: "#1e3a5f",
                            border: "1px solid #2563eb",
                            color: "#ffffff",
                            borderRadius: "4px",
                            padding: "2px 10px",
                            fontSize: "11px",
                            fontWeight: "bold",
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            transition: "all 0.15s ease"
                          }}
                          onMouseEnter={e => {
                            e.currentTarget.style.background = "#2563eb";
                          }}
                          onMouseLeave={e => {
                            e.currentTarget.style.background = "#1e3a5f";
                          }}
                          title="Xem video Hướng Dẫn trên YouTube"
                        >
                          Hướng dẫn
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
                    {/* ===== CÁC PHẦN CHUNG ĐỒNG BỘ CHO TẤT CẢ CÁC BOT ===== */}
                    {/* 1. THÊM MÃ GIAO DỊCH (CHUNG) */}
                    <div className="settings-group">
                      <div className="settings-group-title" style={{ margin: 0 }}>THÊM MÃ GIAO DỊCH</div>
                      <div className="coin-select-grid">
                        {COIN_LIST.filter(c => c.value !== "USDT.D").map(coin => {
                          const isSelected = watchlistCoins.includes(coin.value);
                          const hasPos = safePos.some(p => p.instId === coin.value);
                          const coinSymbol = coin.label.replace("-USDT", "").replace("-SWAP", "");
                          return (
                            <div
                              key={coin.value}
                              className={`coin-select-card ${isSelected ? "selected" : ""}`}
                              onClick={() => handleToggleWatchlistCoin(coin.value)}
                              title={hasPos ? `${coinSymbol}: Đang có vị thế mở (bắt buộc đóng lệnh trước khi bỏ chọn)` : isSelected ? `Click để bỏ chọn ${coinSymbol}` : `Click để thêm ${coinSymbol} ra ngoài Bảng Vị Thế`}
                            >
                              <span className="coin-select-symbol">{coinSymbol}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* 2. QUẢN LÝ VỐN & RỦI RO (CHUNG) */}
                    <div className="settings-group">
                      <div className="settings-group-title">QUẢN LÝ VỐN & RỦI RO</div>
                      <div className="entry-setup-list">
                        <div className="entry-setup-row">
                          <div className="entry-label-wrap">
                            <span>Ký quỹ ({risk.volUnit}):</span>
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
                              suffix={risk.volUnit === "USDT" ? "$" : ""}
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

                    {/* ===== PHẦN CẤU HÌNH ĐẶC THÙ CHO TỪNG BOT ===== */}
                    {activeBotTab === "sub1" && (
                      <>
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
                      </>
                    )}

                    {activeBotTab === "sub2" && (
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

                    {activeBotTab === "sub3" && (
                      <div className="settings-group">
                        <div className="settings-group-title">Chiến Thuật Bắt Thanh Khoản (Liquidation)</div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                            <span className="toggle-name">Quét Thanh Khoản Tự Động</span>
                            <button className="btn-help" onClick={() => alert("Kích hoạt thuật toán săn thanh khoản các cụm lệnh Liquidation.")}>[?]</button>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Khung quét thanh khoản:</span>
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
                              <option value="4H">4H</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ===== CÁC PHẦN CHUNG TIẾP THEO (ĐỒNG BỘ CHO TẤT CẢ CÁC BOT) ===== */}
                    {/* 3. Điểm Vào Lệnh (Entry Setup) — Mỗi setting là 1 dòng riêng biệt */}
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
                            <span style={{ fontWeight: "bold", color: "#ffffff" }}>Đồng pha BTC & Lọc Vĩ mô:</span>
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

                    {/* 4. Hệ Số Nhân Đa Khung (TF Multipliers) */}
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

                  </div>

                  {/* Hàng 2 nút điều khiển chuẩn Desktop App bên dưới Tab 2 */}
                  <div className="strat-actions-row">
                    <button
                      type="button"
                      className="btn-reset-strat"
                      onClick={() => {
                        if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình chiến thuật về MẶC ĐỊNH của app không?")) {
                          if (activeBotTab === "sub1") {
                            setRisk({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
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
                            setRisk({ posVol: 1, tpPct: 5.0, slPct: 1.0, volUnit: "USDT" });
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
                            setEntryCfg({
                              entryOffset: "0.05",
                              dcaGapPct: "0.20",
                              confluencePct: "0.23",
                              accumCandles: 60,
                              altcoinFollowBtc: true,
                              ethVolMult: "1.30",
                            });
                          } else {
                            setRisk({ posVol: 1, tpPct: 1.0, slPct: 1.0, volUnit: "USDT" });
                            setStrat({ main: true, timeframeBase: "1H" });
                            setEntryCfg({
                              entryOffset: "0.05",
                              dcaGapPct: "0.20",
                              confluencePct: "0.23",
                              accumCandles: 60,
                              altcoinFollowBtc: true,
                              ethVolMult: "1.30",
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
                        const curBotName = activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : activeBotTab === "sub3" ? "Bot Liquidation" : "Bot";
                        alert(`Đã lưu Cấu Hình Chiến Thuật cho [${curBotName}] thành công!`);
                        addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình Chiến Thuật cho ${curBotName}`);
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
