import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { createChart, CandlestickSeries, LineSeries, HistogramSeries, CrosshairMode } from "lightweight-charts";
import DrawingCanvasOverlay from "../DrawingCanvasOverlay";
import IndicatorsModal, { COMMUNITY_SCRIPTS } from "../IndicatorsModal";
import TradingViewEmbedChart from "../TradingViewEmbedChart";
import LiquidV5SettingsModal from "../modals/LiquidV5SettingsModal";
import useMarketWebSocket from "../../hooks/useMarketWebSocket";
import { DRAWING_TOOLS } from "../DrawingToolbar";
import { COIN_LIST, TF_LIST } from "../../constants/tradeConfig";
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateBollingerBands,
  calculateMACD,
  calculateSuperTrend,
  runCoderCustomScript,
  calculateLiquidV5,
} from "../../utils/indicatorEngine";

// Module-level global candle cache across all chart panes and layout transitions
const _webCandlesCache = new Map(); // key: `${coin}_${bar}` -> { candles, volume, ema, ob_boxes, timestamp }

// Format giá theo chuẩn Hyperliquid (vi-VN locale: chấm phân cách nghìn, phẩy thập phân)
const formatHyperliquidPrice = (price) => {
  if (typeof price !== 'number' || isNaN(price)) return '';
  let decimals = 2;
  if (price >= 10000) {
    decimals = 0; // BTC: 81.750, 81.334
  } else if (price >= 1000) {
    decimals = 1; // ETH: 2.560,0, 2.647,3 (chuẩn ảnh 3 của Hyperliquid)
  } else if (price >= 100) {
    decimals = 2; // SOL: 145,60
  } else if (price >= 10) {
    decimals = 3; // LINK: 18,250
  } else if (price >= 1) {
    decimals = 4; // NEAR: 3,8000, 3,7023 (chuẩn ảnh NEAR của Hyperliquid)
  } else if (price >= 0.1) {
    decimals = 5; // DOGE: 0,18524
  } else {
    decimals = 6;
  }
  return new Intl.NumberFormat('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(price);
};

export default function SingleChartPane({
  chartIndex,
  coin,
  tf,
  risk,
  enabledTfs = {},
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
  const coinRef = useRef(coin);
  coinRef.current = coin;
  const enabledTfsRef = useRef(enabledTfs);
  enabledTfsRef.current = enabledTfs;
  const riskRef = useRef(risk);
  riskRef.current = risk;
  const rafIdRef = useRef(null);
  const drawObsRef = useRef(null);
  const drawLiquidV5BoxesRef = useRef(null);

  const [priceScaleWidth, setPriceScaleWidth] = useState(55);
  const [isAutoFit, setIsAutoFit] = useState(true);
  const isAutoFitRef = useRef(isAutoFit);
  isAutoFitRef.current = isAutoFit;
  const [isLogScale, setIsLogScale] = useState(true);
  const isLogScaleRef = useRef(isLogScale);
  isLogScaleRef.current = isLogScale;
  const prevLengthRef = useRef(0);
  const userInteractedRef = useRef(false);
  const hasInitializedRef = useRef(false);
  const [activeDrawingTool, setActiveDrawingTool] = useState(DRAWING_TOOLS.CURSOR);
  const [, setDrawingsCount] = useState(0);
  const [clearDrawingsTrigger] = useState(0);
  const [chartInstance, setChartInstance] = useState(null);
  const [seriesInstance, setSeriesInstance] = useState(null);

  // Chế độ biểu đồ Hybrid: 'standard' hoặc 'tv'
  const [chartMode] = useState(() => {
    try {
      const saved = localStorage.getItem(`tls1_chart_mode_${chartIndex}`);
      if (saved === "smc") return "standard";
      return saved || "standard";
    } catch {
      return "standard";
    }
  });

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

  const adminStats = useMemo(() => {
    const filtered = adminClosedPositions.filter(p => {
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

  const backtestStats = useMemo(() => {
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

  const scheduleDraw = useCallback(() => {
    if (rafIdRef.current) return;
    rafIdRef.current = requestAnimationFrame(() => {
      rafIdRef.current = null;
      drawObsRef.current?.();
      drawLiquidV5BoxesRef.current?.();
    });
  }, []);

  useEffect(() => {
    activeBotTabRef.current = activeBotTab;
    tfRef.current = tf;
    coinRef.current = coin;
    enabledTfsRef.current = enabledTfs;
    scheduleDraw();
  }, [activeBotTab, tf, coin, enabledTfs, scheduleDraw]);

  useEffect(() => {
    riskRef.current = risk;
    scheduleDraw();
  }, [risk, scheduleDraw]);

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
      if (!list.includes("ema200")) list.unshift("ema200");
      if (!list.includes("volume")) {
        const emaIdx = list.indexOf("ema200");
        list.splice(emaIdx + 1, 0, "volume");
      }
      setActiveIndicators(list);
    } catch { }

    setTimeout(() => {
      applyDefaultZoom();
      scheduleDraw();
    }, 50);
  }, [activeBotTab, scheduleDraw]);

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

  const [hiddenIndicators, setHiddenIndicators] = useState(new Set());
  const hiddenIndicatorsRef = useRef(hiddenIndicators);
  hiddenIndicatorsRef.current = hiddenIndicators;
  const [isLegendVisible, setIsLegendVisible] = useState(false);
  const [isBacktestCollapsed, setIsBacktestCollapsed] = useState(true);
  const [indicatorsModalTab] = useState("system");

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

  const applyDefaultZoom = () => {
    if (!chartRef.current || !candlesRef.current || candlesRef.current.length === 0) return;
    const total = candlesRef.current.length;
    const candleCount = 55;
    const rightOffset = 8;
    try {
      chartRef.current.priceScale('right').applyOptions({
        autoScale: true,
        mode: isLogScaleRef.current ? 1 : 0
      });
      if (candleSeriesRef.current) {
        candleSeriesRef.current.priceScale().applyOptions({
          autoScale: true,
          mode: isLogScaleRef.current ? 1 : 0
        });
      }
      chartRef.current.timeScale().setVisibleLogicalRange({
        from: Math.max(0, total - candleCount),
        to: total - 1 + rightOffset,
      });
    } catch { }
  };

  const getTfMultiplier = (rawTf) => {
    if (!rawTf) return 1.0;
    const str = rawTf.toString().toUpperCase().trim();
    if (str === "5M" || str === "5" || str === "M5") return 1.0;
    if (str === "15M" || str === "15" || str === "M15") return 1.5333;
    if (str === "30M" || str === "30" || str === "M30") return 2.3333;
    if (str === "1H" || str === "60M" || str === "60" || str === "H1") return 3.333;
    if (str === "2H" || str === "120M" || str === "120" || str === "H2") return 4.667;
    if (str === "4H" || str === "240M" || str === "240" || str === "H4") return 6.772;
    if (str === "1D" || str === "D" || str === "1440M" || str === "D1") return 10.0;

    if (/^5m?$/i.test(str)) return 1.0;
    if (/^15m?$/i.test(str)) return 1.5333;
    if (/^30m?$/i.test(str)) return 2.3333;
    if (/^(1h|60m?|h1)$/i.test(str)) return 3.333;
    if (/^(2h|120m?|h2)$/i.test(str)) return 4.667;
    if (/^(4h|240m?|h4)$/i.test(str)) return 6.772;
    if (/^(1d|d|d1)$/i.test(str)) return 10.0;
    return 1.0;
  };

  const calculateEMA200Positions = (candles, currentTf) => {
    // 1. Bộ đếm tích lũy chuẩn 60 nến (REQUIRED_ACCUMULATION_CANDLES = 60)
    const REQUIRED_ACCUM = (riskRef.current && riskRef.current.accumCandles)
      ? parseInt(riskRef.current.accumCandles, 10)
      : 60;

    if (!candles || candles.length < (200 + REQUIRED_ACCUM)) return [];
    const emaData = calculateEMA(candles, 200);
    if (!emaData || emaData.length === 0) return [];

    const emaMap = new Map();
    emaData.forEach(item => emaMap.set(item.time, item.value));

    const offsetMult = getTfMultiplier(currentTf);
    const baseTp = (riskRef.current && riskRef.current.tpPct)
      ? (parseFloat(riskRef.current.tpPct) / 100)
      : 0.0080;
    const baseSl = (riskRef.current && riskRef.current.slPct)
      ? (parseFloat(riskRef.current.slPct) / 100)
      : 0.0080;

    const entryOffsetPct = 0.0005 * offsetMult;
    const tpPct = baseTp * offsetMult;
    const slPct = baseSl * offsetMult;

    const results = [];
    let activeTrade = null;
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

      if (activeTrade) {
        if (activeTrade.state === 'waiting') {
          const isLong = activeTrade.entryType === 'Long';
          // Khi lệnh đang chờ, giá Limit bám theo đường EMA200 động
          const ep = isLong ? (ema * (1 + entryOffsetPct)) : (ema * (1 - entryOffsetPct));
          const tp = isLong ? (ep * (1 + tpPct)) : (ep * (1 - tpPct));
          const sl = isLong ? (ep * (1 - slPct)) : (ep * (1 + slPct));

          // Kiểm tra khớp entry khi giá chạm vùng EMA200
          const entryHit = isLong ? candle.low <= ep : candle.high >= ep;

          if (entryHit) {
            activeTrade.state = 'open';
            activeTrade.entryTime = candle.time;
            activeTrade.entryPrice = ep;
            activeTrade.tpTarget = tp;
            activeTrade.slTarget = sl;
          } else {
            // Cập nhật giá Limit bám theo đường EMA200
            activeTrade.entryPrice = ep;
            activeTrade.entryEma = ema;
            activeTrade.tpTarget = tp;
            activeTrade.slTarget = sl;

            // Hủy nếu gãy trục xu hướng (nến đóng cửa xuyên qua phía bên kia)
            if (isLong && consecutiveBelow > 0) activeTrade = null;
            if (!isLong && consecutiveAbove > 0) activeTrade = null;
          }
        } else if (activeTrade.state === 'open') {
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
      }

      // Chỉ xuất hiện box khi nến tích lũy bám một phía trục EMA200 vượt qua điều kiện >= 60 nến
      if (!activeTrade && (consecutiveAbove >= REQUIRED_ACCUM || consecutiveBelow >= REQUIRED_ACCUM)) {
        const isBull = consecutiveAbove >= REQUIRED_ACCUM;
        const ep = isBull ? (ema * (1 + entryOffsetPct)) : (ema * (1 - entryOffsetPct));
        const tp = isBull ? (ep * (1 + tpPct)) : (ep * (1 - tpPct));
        const sl = isBull ? (ep * (1 - slPct)) : (ep * (1 + slPct));

        activeTrade = {
          entryTime: candle.time,
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

    if (activeTrade && activeTrade.state === 'waiting') {
      const curIdx = candles.length - 1;
      results.push({
        ...activeTrade,
        entryTime: candles[curIdx].time, // Cạnh trái luôn thẳng hàng với cây nến hiện tại khi đang chờ khớp
        state: 'waiting',
        isWaiting: true,
      });
    } else if (activeTrade && activeTrade.state === 'open') {
      results.push({ ...activeTrade, state: 'Active Position', isWaiting: false });
    }

    return results;
  };

  const calculateSMCPositions = (candles, obs) => {
    if (!candles || candles.length < 25) return [];

    // Chỉ lấy các khối OB còn hợp lệ (chưa bị đóng cửa xuyên thủng)
    const validObs = (obs || []).filter(ob => {
      if (!ob || !ob.high || !ob.low) return false;
      const obSec = ob.time ? (ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time) : 0;
      for (let i = candles.length - 1; i >= 0; i--) {
        const cd = candles[i];
        if (obSec > 0 && cd.time <= obSec) break;
        if (ob.bias === 1 && cd.close < ob.low) return false;
        if (ob.bias === -1 && cd.close > ob.high) return false;
      }
      return true;
    });

    if (validObs.length === 0) return [];

    const positions = [];
    let waitingPos = null;

    for (let idx = 0; idx < validObs.length; idx++) {
      const ob = validObs[idx];
      const isBull = ob.bias === 1;

      // 1. ENTRY: Luôn đặt tại biên của OB (Long: biên trên ob.high, Short: biên dưới ob.low)
      const entryPrice = isBull ? ob.high : ob.low;

      // 2. STOP LOSS: Luôn đặt tại biên đối diện của OB (Long: biên dưới ob.low, Short: biên trên ob.high)
      const slTarget = isBull ? ob.low : ob.high;

      // 3. TAKE PROFIT: Tỷ lệ RR 1.5R dựa trên khoảng cách SL (chính bằng chiều cao khối OB)
      const obHeight = Math.abs(ob.high - ob.low);
      const tpTarget = isBull
        ? (entryPrice + obHeight * 1.5)
        : (entryPrice - obHeight * 1.5);

      // 4. LOẠI BOX: OB Long (xanh dương) -> Box Long; OB Short (đỏ) -> Box Short
      const entryType = isBull ? 'Long' : 'Short';

      const obSec = ob.time ? (ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time) : 0;
      let obIdx = candles.findIndex(c => c.time >= obSec);
      if (obIdx === -1) obIdx = Math.max(0, candles.length - 20);

      // Kiểm tra giá bứt phá thoát ra ngoài OB rồi mới vòng về chạm biên entry
      let hasBrokenOut = false;
      let hitEntryIdx = -1;

      for (let i = obIdx + 1; i < candles.length; i++) {
        const c = candles[i];
        if (isBull) {
          if (!hasBrokenOut) {
            if (c.low > entryPrice) {
              hasBrokenOut = true;
            }
          } else {
            // Khi đã bứt phá, nến sau đó quay đầu chạm biên trên OB (entryPrice)
            if (c.low <= entryPrice) {
              if (c.close >= slTarget) {
                hitEntryIdx = i;
                break;
              } else {
                break; // Thủng biên dưới SL
              }
            }
          }
        } else {
          if (!hasBrokenOut) {
            if (c.high < entryPrice) {
              hasBrokenOut = true;
            }
          } else {
            // Khi đã bứt phá, nến sau đó quay đầu chạm biên dưới OB (entryPrice)
            if (c.high >= entryPrice) {
              if (c.close <= slTarget) {
                hitEntryIdx = i;
                break;
              } else {
                break; // Thủng biên trên SL
              }
            }
          }
        }
      }

      // TRƯỜNG HỢP 1: Giá CHƯA vòng về chạm Entry -> Box tịnh tiến dóng thẳng hàng theo cây nến hiện tại
      if (hitEntryIdx === -1) {
        if (idx === validObs.length - 1) {
          const curIdx = candles.length - 1;
          waitingPos = {
            entryTime: candles[curIdx].time,
            entryPrice,
            tpTarget,
            slTarget,
            exitTime: null,
            exitResult: null,
            entryType,
            state: 'waiting',
            isSmcBot: true,
            isWaiting: true,
          };
        }
        continue;
      }

      // TRƯỜNG HỢP 2: Giá ĐÃ VÒNG VỀ CHẠM Entry -> Dừng tịnh tiến, FIX VỊ TRÍ bắt đầu tại nến khớp Entry
      let exitTime = null;
      let exitResult = null;
      let state = 'Active Position';

      for (let j = hitEntryIdx + 1; j < candles.length; j++) {
        const c = candles[j];
        if (isBull) {
          if (c.high >= tpTarget) {
            exitTime = c.time;
            exitResult = 'TP';
            state = 'Take Profit';
            break;
          }
          if (c.low <= slTarget) {
            exitTime = c.time;
            exitResult = 'SL';
            state = 'Stop Loss';
            break;
          }
        } else {
          if (c.low <= tpTarget) {
            exitTime = c.time;
            exitResult = 'TP';
            state = 'Take Profit';
            break;
          }
          if (c.high >= slTarget) {
            exitTime = c.time;
            exitResult = 'SL';
            state = 'Stop Loss';
            break;
          }
        }
      }

      // Mỗi OB chỉ tương ứng với 1 lệnh duy nhất. Khớp TP hay SL 1 lần là xong.
      positions.push({
        entryTime: candles[hitEntryIdx].time,
        entryPrice,
        tpTarget,
        slTarget,
        exitTime,
        exitResult,
        state,
        entryType,
        isSmcBot: true,
        isWaiting: false,
      });
    }

    if (waitingPos) {
      positions.push(waitingPos);
    }

    return positions;
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

    // Chỉ hiển thị các OB còn đủ điều kiện, chưa bị đâm thủng / lấp hết
    const candles = candlesRef.current || [];
    const validObs = obs.filter(ob => {
      if (!ob || !ob.high || !ob.low) return false;
      const obSec = ob.time ? (ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time) : 0;
      for (let i = candles.length - 1; i >= 0; i--) {
        const cd = candles[i];
        if (obSec > 0 && cd.time <= obSec) break;
        if (ob.bias === 1 && cd.close < ob.low) return false;
        if (ob.bias === -1 && cd.close > ob.high) return false;
      }
      return true;
    });

    validObs.forEach(ob => {
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
        } catch { }
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
  drawObsRef.current = drawObs;

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

    const { alerts, stats, position_boxes } = liquidV5BoxesRef.current || {};
    const c = chartRef.current;
    const s = candleSeriesRef.current;
    const cont = containerRef.current;
    if (!c || !s || !cont) {
      return;
    }
    const w = (oBoxes && oBoxes.clientWidth) || (oTop && oTop.clientWidth) || cont.clientWidth;
    if (w <= 0) return;
    const plotW = (c.timeScale && typeof c.timeScale().width === 'function') ? c.timeScale().width() : 0;
    const pScaleWidth = (c.priceScale && typeof c.priceScale('right').width === 'function') ? c.priceScale('right').width() : (w - plotW);
    const maxRightX = plotW > 0 ? Math.floor(plotW) : (w - (pScaleWidth > 0 ? pScaleWidth : 55));

    if (pScaleWidth > 20 && pScaleWidth < 120 && Math.abs(pScaleWidth - priceScaleWidth) >= 2) {
      setPriceScaleWidth(pScaleWidth);
    }

    if (oBoxes) {
      oBoxes.style.width = maxRightX + 'px';
      oBoxes.style.overflow = 'hidden';
    }
    if (oTop) {
      oTop.style.width = maxRightX + 'px';
      oTop.style.overflow = 'hidden';
    }



    const candles = candlesRef.current || [];
    let posList = [];
    if (isEmaBot) {
      posList = calculateEMA200Positions(candles, tfRef.current);
    } else if (isSmcBot) {
      posList = calculateSMCPositions(candles, activeObsRef.current);
    } else {
      posList = position_boxes || [];
    }

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
      const renderBoxes = posList.length > 15 ? posList.slice(-15) : posList;
      renderBoxes.forEach(pos => {
        if (!pos.entryTime || !pos.entryPrice || !pos.tpTarget || !pos.slTarget) return;

        const entryTimeSec = pos.entryTime > 100000000000 ? Math.floor(pos.entryTime / 1000) : pos.entryTime;
        const entryIdx = candles.findIndex(item => item.time >= entryTimeSec);
        if (entryIdx < 0) return;

        let startX = null;
        let endX = null;
        const logicalRange = c.timeScale().getVisibleLogicalRange();

        if (logicalRange && logicalRange.to > logicalRange.from) {
          const barWidth = maxRightX / (logicalRange.to - logicalRange.from);
          startX = Math.floor((entryIdx - logicalRange.from) * barWidth);

          if (pos.exitTime) {
            const exitTimeSec = pos.exitTime > 100000000000 ? Math.floor(pos.exitTime / 1000) : pos.exitTime;
            const exitIdx = candles.findIndex(item => item.time >= exitTimeSec);
            if (exitIdx > entryIdx) {
              endX = Math.floor((exitIdx + 1 - logicalRange.from) * barWidth);
            } else {
              endX = Math.floor((entryIdx + 1 - logicalRange.from) * barWidth);
            }
          } else {
            const curIdx = candles.length - 1;
            const targetIdx = pos.isWaiting ? (entryIdx + 10) : Math.max(entryIdx + 10, curIdx + 1);
            endX = Math.floor((targetIdx - logicalRange.from) * barWidth);
          }
        } else {
          try {
            const sc = c.timeScale().timeToCoordinate(candles[entryIdx].time);
            if (sc !== null) startX = Math.floor(sc);
          } catch { }

          let barSpacing = 14;
          if (candles.length >= 2) {
            try {
              const c1 = c.timeScale().timeToCoordinate(candles[candles.length - 1].time);
              const c2 = c.timeScale().timeToCoordinate(candles[candles.length - 2].time);
              if (c1 !== null && c2 !== null && c1 > c2) barSpacing = c1 - c2;
            } catch { }
          }

          if (pos.exitTime) {
            try {
              const exitTimeSec = pos.exitTime > 100000000000 ? Math.floor(pos.exitTime / 1000) : pos.exitTime;
              const scExit = c.timeScale().timeToCoordinate(exitTimeSec);
              if (scExit !== null && startX !== null && scExit >= startX) {
                endX = Math.floor(scExit + barSpacing);
              }
            } catch { }
          } else {
            try {
              const curIdx = candles.length - 1;
              const count = pos.isWaiting ? 10 : Math.max(10, curIdx - entryIdx + 1);
              endX = Math.floor(startX + count * barSpacing);
            } catch { }
          }
        }

        if (startX === null || endX === null) return;
        if (endX < 0 || startX >= maxRightX) return;

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

        const isStandardBot = pos.isEmaBot || pos.isSmcBot;
        
        let effectiveYEntry2;
        if (isStandardBot) {
          effectiveYEntry2 = yEntry1;
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

        const greenBg = 'rgba(20, 58, 54, 0.75)';
        const redBg = 'rgba(68, 24, 33, 0.75)';
        const lineStrokeColor = 'rgba(235, 240, 250, 0.45)';
        const labelTextColor = 'rgba(235, 240, 250, 0.5)';

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
          const greenTop = Math.min(clampedYTP, effectiveYEntry2);
          const greenH = Math.max(Math.abs(effectiveYEntry2 - clampedYTP), 2);
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
          const redTop = Math.min(clampedYSL, effectiveYEntry2);
          const redH = Math.max(Math.abs(effectiveYEntry2 - clampedYSL), 2);
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

    if (liveStatsObj.totalEntries > 0) {
      setLiveStats(liveStatsObj);
    } else if (stats && stats.totalEntries > 0) {
      setLiveStats(stats);
    }

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
  drawLiquidV5BoxesRef.current = drawLiquidV5Boxes;

  const updateIndicators = () => {
    const chart = chartRef.current;
    const candles = candlesRef.current;
    if (!chart || !candles || candles.length === 0) return;

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
        } catch { }
        seriesMap.delete(key);
      }
    };

    const isIndHidden = (id) => hiddenIndicatorsRef.current?.has(id);

    // 1. EMA 200
    if (emaSeriesRef.current) {
      if (currentActive.includes("ema200") && !isIndHidden("ema200")) {
        const emaData = calculateEMA(candles, 200);
        try { emaSeriesRef.current.setData(emaData); } catch { }
      } else {
        try { emaSeriesRef.current.setData([]); } catch { }
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
      } catch { }
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
      } catch { }
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
      } catch { }
    } else {
      removeSeriesByKey("ind_supertrend");
    }

    // 5. RSI (14) & 6. MACD (12, 26, 9)
    const hasRsi = currentActive.includes("rsi") && !isIndHidden("rsi");
    const hasMacd = currentActive.includes("macd") && !isIndHidden("macd");

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
    } catch { }

    // RSI (14)
    if (hasRsi) {
      const sRsi = getOrCreateLineSeries("ind_rsi", {
        color: "#b388ff", lineWidth: 1.5,
        priceScaleId: "rsi",
        priceLineVisible: false, lastValueVisible: true, crosshairMarkerVisible: false,
      });
      try {
        sRsi.setData(calculateRSI(candles, 14));
      } catch { }
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
      } catch { }
    } else {
      removeSeriesByKey("ind_macd_hist");
      removeSeriesByKey("ind_macd_line");
      removeSeriesByKey("ind_macd_sig");
    }

    // 7. Volume 20
    const hasVol = currentActive.includes("volume") && !isIndHidden("volume");
    if (volumeSeriesRef.current) {
      try {
        volumeSeriesRef.current.applyOptions({ visible: hasVol });
      } catch { }
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
      } catch { }
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
        } catch { }
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
            } catch { }
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

  updateIndicatorsRef.current = updateIndicators;

  // Khởi tạo Chart
  useEffect(() => {
    if (!containerRef.current) return;
    containerRef.current.innerHTML = "";

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth || 300,
      height: containerRef.current.clientHeight || 200,
      layout: { background: { type: 'solid', color: 'transparent' }, textColor: '#787b86', attributionLogo: false },
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
        mode: 1,
        scaleMargins: {
          top: 0.08,
          bottom: 0.25,
        },
      },
    });

    const es = chart.addSeries(LineSeries, {
      color: "rgba(220,220,220,0.8)", lineWidth: 2,
      priceLineVisible: false, lastValueVisible: false, crosshairMarkerVisible: false,
      autoscaleInfoProvider: () => null,
      priceFormat: {
        type: 'custom',
        formatter: formatHyperliquidPrice,
      },
    });

    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350",
      priceFormat: {
        type: 'custom',
        formatter: formatHyperliquidPrice,
      },
      autoscaleInfoProvider: (original) => {
        const res = original();
        if (!res || !res.priceRange) return res;
        if (userInteractedRef.current || !isAutoFitRef.current) return res;

        let min = res.priceRange.minValue;
        let max = res.priceRange.maxValue;
        if (typeof min !== 'number' || typeof max !== 'number' || max <= min) return res;

        const candles = candlesRef.current;
        if (!candles || candles.length === 0) return res;

        const lastCandle = candles[candles.length - 1];
        const currentPrice = lastCandle ? lastCandle.close : null;
        if (typeof currentPrice !== 'number' || isNaN(currentPrice)) return res;

        try {
          const lr = chartRef.current ? chartRef.current.timeScale().getVisibleLogicalRange() : null;
          if (lr && lr.to < (candles.length - 15)) {
            return res;
          }
        } catch { }

        const range = max - min;
        if (range <= 0) return res;

        const pos = (currentPrice - min) / range;
        const minAllowedPos = 0.38;
        const maxAllowedPos = 0.62;

        if (pos < minAllowedPos) {
          const newMin = currentPrice - (max - currentPrice);
          if (newMin > 0 && newMin < max) {
            min = newMin;
          }
        } else if (pos > maxAllowedPos) {
          const newMax = currentPrice + (currentPrice - min);
          if (newMax > min) {
            max = newMax;
          }
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
        type: 'volume',
      },
      priceScaleId: '',
    });
    chart.priceScale('').applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    chartRef.current = chart;
    candleSeriesRef.current = cs;
    volumeSeriesRef.current = vs;
    emaSeriesRef.current = es;
    setChartInstance(chart);
    setSeriesInstance(cs);

    // Nạp ngay dữ liệu nến hiện có nếu có sẵn trong bộ nhớ
    if (candlesRef.current && candlesRef.current.length > 0) {
      try {
        cs.setData(candlesRef.current);
        const vols = candlesRef.current.map(c => ({
          time: c.time,
          value: c.volume || 0,
          color: c.close >= c.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        }));
        vs.setData(vols);
        es.setData(calculateEMA(candlesRef.current, 200));
      } catch { }
    }

    chart.timeScale().subscribeVisibleLogicalRangeChange(() => {
      scheduleDraw();
    });

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
          scheduleDraw();
          if (isAutoFitRef.current && !userInteractedRef.current) {
            applyDefaultZoom();
          }
        }
      }
    });
    resizeObserver.observe(containerEl);
    const dynSeries = dynamicSeriesRef.current;

    return () => {
      containerEl.removeEventListener('wheel', handleUserInteraction);
      containerEl.removeEventListener('pointerdown', handleUserInteraction);
      containerEl.removeEventListener('touchstart', handleUserInteraction);
      resizeObserver.disconnect();
      if (dynSeries) dynSeries.clear();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      setChartInstance(null);
      setSeriesInstance(null);
    };
  }, [scheduleDraw]);

  useEffect(() => {
    activeIndicatorsRef.current = activeIndicators;
    coderScriptsRef.current = coderScripts;
    hiddenIndicatorsRef.current = hiddenIndicators;
    if (!isVisible || !chartRef.current) return;
    updateIndicatorsRef.current?.();
    scheduleDraw();
  }, [activeIndicators, coderScripts, isVisible, hiddenIndicators, scheduleDraw]);

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
        scheduleDraw();
      }
    }, 40);
    return () => clearTimeout(timer);
  }, [isVisible, layout, scheduleDraw]);

  // Real-time tick callback from OKX Public WebSocket
  const handleWsTick = useCallback((liveCandle) => {
    if (!candleSeriesRef.current || !candlesRef.current || candlesRef.current.length === 0) return;
    const candles = candlesRef.current;
    const lastIdx = candles.length - 1;
    const last = candles[lastIdx];

    if (liveCandle.time === last.time) {
      candles[lastIdx] = liveCandle;
    } else if (liveCandle.time > last.time) {
      candles.push(liveCandle);
      if (candles.length > 2500) candles.shift();
    }

    try {
      candleSeriesRef.current.update(liveCandle);
      if (volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: liveCandle.time,
          value: liveCandle.volume || 0,
          color: liveCandle.close >= liveCandle.open ? 'rgba(38, 166, 154, 0.5)' : 'rgba(239, 83, 80, 0.5)'
        });
      }
    } catch { }
  }, []);

  // Hook OKX Public WebSocket: tick-by-tick real-time
  useMarketWebSocket(coin, tf, handleWsTick);

  // Quản lý dữ liệu nến: Khôi phục tức thì từ cache RAM (0ms) + Fetch ngầm cập nhật
  useEffect(() => {
    if (!isVisible) return;

    hasInitializedRef.current = false;
    userInteractedRef.current = false;
    setIsAutoFit(true);
    isAutoFitRef.current = true;
    setIsLogScale(true);
    isLogScaleRef.current = true;
    try {
      chartRef.current?.priceScale("right").applyOptions({ autoScale: true, mode: 1 });
      if (candleSeriesRef.current) {
        candleSeriesRef.current.priceScale().applyOptions({ autoScale: true, mode: 1 });
      }
    } catch { }

    let isMounted = true;
    const targetCoin = coin;
    const targetTf = tf;
    const tfMap = { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1H", "2H": "2H", "4H": "4H", "1D": "1D" };
    const bar = tfMap[tf] || tf;
    const cacheKey = `${coin}_${bar}`;

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
            updateIndicatorsRef.current?.();
            scheduleDraw();
          }
        }, 15);
      } else {
        updateIndicatorsRef.current?.();
      }
    } else {
      // Giữ biểu đồ mượt mà không chớp đen trong 0.15s chờ API 2-Pha phản hồi
      if (overlayRef.current) overlayRef.current.innerHTML = "";
      if (liquidV5OverlayRef.current) liquidV5OverlayRef.current.innerHTML = "";
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

        _webCandlesCache.set(cacheKey, {
          candles: unique,
          volume: uniqueVolume,
          ema: emaData,
          ob_boxes: rd.ob_boxes || [],
          timestamp: Date.now()
        });

        let prevRange = null;
        if (chartRef.current && hasInitializedRef.current) {
          try {
            prevRange = chartRef.current.timeScale().getVisibleLogicalRange();
          } catch { }
        }

        candlesRef.current = unique;
        candleSeriesRef.current.setData(unique);
        if (volumeSeriesRef.current) volumeSeriesRef.current.setData(uniqueVolume);
        if (emaSeriesRef.current) emaSeriesRef.current.setData(emaData);
        if (rd.ob_boxes) activeObsRef.current = rd.ob_boxes;
        updateIndicatorsRef.current?.();

        if (!hasInitializedRef.current) {
          hasInitializedRef.current = true;
          prevLengthRef.current = unique.length;
          setTimeout(() => {
            if (!isMounted) return;
            applyDefaultZoom();
            updateIndicatorsRef.current?.();
            scheduleDraw();
          }, 30);
        } else {
          // Khi update thêm nến (sau 300 nến + tải Phase 2), nếu đang ở chế độ Auto (hoặc số lượng nến thay đổi lớn > 50 nến):
          // Luôn gọi applyDefaultZoom() để nến hiện tại luôn nằm ở tầm nhìn 55 nến bên phải cùng, không bị nhảy mất nến!
          const isHugeCandleJump = Math.abs(unique.length - (prevLengthRef.current || 0)) > 50;
          if (isAutoFitRef.current || !userInteractedRef.current || isHugeCandleJump) {
            applyDefaultZoom();
          } else if (prevRange) {
            try {
              chartRef.current.timeScale().setVisibleLogicalRange(prevRange);
            } catch { }
          }
          prevLengthRef.current = unique.length;
          setTimeout(() => {
            if (!isMounted) return;
            scheduleDraw();
          }, 30);
        }

        // PHA 2: Tự động tải nốt toàn bộ nến lịch sử sau 1.2s khi backend gom xong để vẽ trọn bộ các vị thế Long/Short quá khứ
        if (unique.length < 900) {
          setTimeout(() => {
            if (isMounted) fetchCandles();
          }, 1200);
        }
      } catch (e) {
        console.warn("fetchCandles error:", e);
      }
    };

    fetchCandles();
    // Background reconcile interval (60s instead of 15s freeze, since WS handles live ticks)
    const interval = setInterval(fetchCandles, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [coin, tf, isVisible, scheduleDraw]);

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

          {/* Indicator Legend Overlay */}
          <div className="chart-legend-overlay">
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
          </div>

          {/* Winrate Stats Table (top-right corner of chart, thu nhỏ 15%) */}
          <div 
            className={`chart-backtest-table-wrap ${isBacktestCollapsed ? 'collapsed' : ''}`}
            style={{ right: `${priceScaleWidth + 4}px` }}
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
                  width="10"
                  height="10"
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
                </tbody>
              </table>
            )}
          </div>

          <div style={{
            position: "absolute", bottom: "6px", right: `${priceScaleWidth + 4}px`,
            display: "flex", gap: "4px", zIndex: 10
          }}>
            <button
              title="Auto (Mặc định zoom 30-80 nến)"
              onClick={(e) => {
                e.stopPropagation();
                const next = !isAutoFit;
                setIsAutoFit(next);
                isAutoFitRef.current = next;
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
                isLogScaleRef.current = next;
                chartRef.current?.priceScale("right").applyOptions({ mode: next ? 1 : 0 });
                if (candleSeriesRef.current) {
                  candleSeriesRef.current.priceScale().applyOptions({ mode: next ? 1 : 0 });
                }
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

      <LiquidV5SettingsModal
        isOpen={showLiquidV5Settings}
        onClose={() => setShowLiquidV5Settings(false)}
        liquidV5Settings={liquidV5Settings}
        setLiquidV5Settings={setLiquidV5Settings}
        onApply={() => updateIndicatorsRef.current && updateIndicatorsRef.current()}
      />
    </div>
  );
}
