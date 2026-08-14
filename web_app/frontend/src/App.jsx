import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import "./App.css";

const COIN_LIST = [
  { label: "XAU-USDT", value: "XAU-USDT-SWAP" },
  { label: "BTC-USDT", value: "BTC-USDT-SWAP" },
  { label: "ETH-USDT", value: "ETH-USDT-SWAP" },
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
function ToggleSwitch({ checked, onChange, labelOn = "BẬT", labelOff = "TẮT" }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
      <span className="toggle-label">{checked ? labelOn : labelOff}</span>
    </label>
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

  const [selectedCoin, setSelectedCoin] = useState("BTC-USDT-SWAP");
  const [activePairs, setActivePairs] = useState([]);
  const [selectedTf, setSelectedTf] = useState("4H");
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

  const [selectedAccount, setSelectedAccount] = useState("sub1");
  const [fadeClass, setFadeClass] = useState("tab-fade");
  const [selectedBotType, setSelectedBotType] = useState("ema200");
  const [slotCount] = useState(() => [56, 57, 58][Math.floor(Math.random() * 3)]);
  const MAX_SLOTS = 100;
  const [isLogScale, setIsLogScale] = useState(false);
  const [isAutoFit, setIsAutoFit] = useState(true);

  // Settings state — clone từ Desktop App
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [activeCoinsCfg, setActiveCoinsCfg] = useState({ xau: true, btc: true, eth: true });

  // Strategy toggles (clone Công Tắc Chiến Thuật)
  const [strat, setStrat] = useState({
    main: true, xole: false, dynamicEma200Tp: true,
    dynamicPingpongTp: false, altcoinFollowBtc: true,
    sidewaySafe: true, squeezeEscape: false, safeguardEntry: true,
    trailingSl: true, maxRoi: false, sidewayVap: false, h4Flip: false,
    timeframeBase: "1H",
  });
  // Risk settings
  const [risk, setRisk] = useState({ posVol: 40, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
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
        fetch(`/api/bot/config?strategy=${selectedAccount}&uid=${u}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            position_volume: Number(risk.posVol),
            scalping_tp_pct: Number(risk.tpPct) / 100,
            scalping_sl_pct: Number(risk.slPct) / 100
          }),
        }).then(res => {
          if (res.ok) {
            addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình: Volume = ${risk.posVol} ${risk.volUnit} | Chốt lời = ${risk.tpPct}% | Cắt lỗ = ${risk.slPct}%`);
          }
        });
      } catch {}
    }, 500);
    return () => clearTimeout(timer);
  }, [risk, selectedAccount, loginUid]);

  const addSystemLog = (msg) => {
    setLogs(prev => {
      let newBlocks = [...prev];
      newBlocks.unshift({ id: Date.now() + Math.random(), lines: [msg] });
      if (newBlocks.length > 20) newBlocks = newBlocks.slice(0, 20);
      return newBlocks;
    });
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
    
    if (selectedAccount === "sub1") {
      // Defaults for Bot EMA200
      setRisk({ posVol: 40, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: true,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: true, squeezeEscape: false, safeguardEntry: true,
        trailingSl: true, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    } else if (selectedAccount === "sub2") {
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
  }, [selectedAccount]);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const audioRef = useRef(null); // Reference for click sound
  const lastLogTimeRef = useRef(0);
  const logBlockIdRef = useRef(0);

  const [authStep, setAuthStep] = useState("uid"); // "uid", "require_password", "require_new_password"
  const [level2Password, setLevel2Password] = useState("");

  // Login handler — lưu vào localStorage
  const handleLogin = async (e) => {
    e.preventDefault();
    if (audioRef.current) audioRef.current.play().catch(e => console.log(e));
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: loginUid, password: authStep === "uid" ? "" : level2Password })
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsAuthenticated(true);
        localStorage.setItem("tls1_auth", "true");
        localStorage.setItem("tls1_uid", loginUid);
      } else if (data.status === "require_new_password") {
        setAuthStep("require_new_password");
      } else if (data.status === "require_password") {
        setAuthStep("require_password");
      } else if (data.status === "locked" || data.status === "pending") {
        setLoginError(data.message || "Tài khoản đang bị khoá hoặc chờ duyệt.");
      } else {
        setLoginError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      setLoginError("Không thể kết nối đến máy chủ xác thực.");
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
      } catch {}
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
      ws = new WebSocket(`${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws/logs/${localStorage.getItem('tls1_uid') || loginUid}/${selectedAccount}`);
      wsRef.current = ws;
      ws.onmessage = (e) => {
        const now = Date.now();
        setLogs(prev => {
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
  }, [isAuthenticated, selectedAccount]);

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
        const r = await fetch(`/api/bot/status?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) { const d = await r.json(); setBotStatus(d.status); setUptime(d.uptime); }
      } catch {}
    };
    const fetchConfig = async () => {
      try {
        const r = await fetch(`/api/bot/config?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) { 
          const d = await r.json(); 
          if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS); 
          if (d.ENABLED_COINS) setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
        }
      } catch {}
    };
    const fetchCreds = async () => {
      try {
        const r = await fetch(`/api/bot/credentials?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) {
          const d = await r.json();
          setApiKey(d.api_key || "");
          setSecretKey(d.secret_key || "");
        }
      } catch {}
    };
    fetchStatus(); fetchConfig(); fetchCreds(); fetchPositions();
    const s = setInterval(fetchStatus, 2000);
    const p = setInterval(fetchPositions, 5000);
    return () => { clearInterval(s); clearInterval(p); };
  }, [isAuthenticated, selectedAccount]);

  const fetchPositions = async () => {
    try {
      const r = await fetch(`/api/bot/positions?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
      if (r.ok) setPositions(await r.json());
      
      const r2 = await fetch(`/api/bot/closed_positions?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
      if (r2.ok) setClosedPositions(await r2.json());
    } catch {}
  };

  // Chart init
  useEffect(() => {
    if (!isAuthenticated || !chartContainerRef.current) return;
    chartContainerRef.current.innerHTML = "";
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: chartContainerRef.current.clientHeight || 400,
      layout: { background: { color: "#131722" }, textColor: "#d1d4dc" },
      grid: { vertLines: { color: "#2b2b43" }, horzLines: { color: "#2b2b43" } },
      crosshair: { mode: 1 },
      timeScale: { timeVisible: true, secondsVisible: false, rightOffset: 8 },
    });
    const es = chart.addSeries(LineSeries, {
      color: "rgba(220,220,220,0.8)", lineWidth: 2,
      priceLineVisible: false, crosshairMarkerVisible: false,
    });
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350",
    });
    chartRef.current = chart;
    candleSeriesRef.current = cs;
    emaSeriesRef.current = es;
    const resizeObserver = new ResizeObserver((entries) => {
      if (chartRef.current && entries.length > 0) {
        const { width, height } = entries[0].contentRect;
        chartRef.current.applyOptions({ width, height });
      }
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => { 
      resizeObserver.disconnect();
      chart.remove(); 
    };
  }, [isAuthenticated, layoutMode]); // Re-init on layout change

  // Fetch candles — dùng backend proxy để tránh CORS trên mobile
  useEffect(() => {
    if (!isAuthenticated) return;
    let isInitialFit = true;
    // Xóa data cũ ngay khi đổi coin/TF để không bị lag hiển thị cũ
    if (candleSeriesRef.current) {
      try { candleSeriesRef.current.setData([]); } catch {}
    }
    if (emaSeriesRef.current) {
      try { emaSeriesRef.current.setData([]); } catch {}
    }

    const fetchCandles = async () => {
      if (!candleSeriesRef.current) return;
      try {
        const tfMap = { "1m": "1m", "5m": "5m", "15m": "15m", "30m": "30m", "1H": "1H", "2H": "2H", "4H": "4H", "1D": "1D" };
        const bar = tfMap[selectedTf] || selectedTf;
        const url = `/api/market/candles?instId=${selectedCoin}&bar=${bar}&limit=1500`;
        const res = await fetch(url);
        if (!res.ok) return;
        const rd = await res.json();
        if (rd.code !== "0" || !rd.data || rd.data.length === 0) return;
        const candles = [];
        for (let i = rd.data.length - 1; i >= 0; i--) {
          const c = rd.data[i];
          const t = Math.floor(parseInt(c[0]) / 1000);
          candles.push({ time: t, open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]) });
        }
        // Sắp xếp tăng dần theo time, không trùng
        candles.sort((a, b) => a.time - b.time);
        const unique = candles.filter((c, i) => i === 0 || c.time !== candles[i-1].time);
        candleSeriesRef.current.setData(unique);
        emaSeriesRef.current?.setData(calculateEMA(unique, 200));
        
        if (rd.ob_boxes) {
          window._active_smc_obs = rd.ob_boxes;
          
          let overlay = document.getElementById('smc_ob_shaded_overlay');
          if (!overlay && chartContainerRef.current) {
            overlay = document.createElement('div');
            overlay.id = 'smc_ob_shaded_overlay';
            overlay.style.position = 'absolute';
            overlay.style.top = '0';
            overlay.style.left = '0';
            overlay.style.width = '100%';
            overlay.style.height = '100%';
            overlay.style.pointerEvents = 'none';
            overlay.style.zIndex = '4';
            overlay.style.overflow = 'hidden';
            if (chartContainerRef.current.style) chartContainerRef.current.style.position = 'relative';
            chartContainerRef.current.appendChild(overlay);
          }

          const drawObShadedBands = () => {
            const obs = window._active_smc_obs;
            const chart = chartRef.current;
            const series = candleSeriesRef.current;
            const container = chartContainerRef.current;
            if (!obs || !chart || !series || !overlay || !container) return;
            
            overlay.innerHTML = '';
            const w = overlay.clientWidth || container.clientWidth;
            const maxRightX = w - 70; // 70px price scale approx

            obs.forEach(ob => {
              const y1 = series.priceToCoordinate(ob.high);
              const y2 = series.priceToCoordinate(ob.low);
              if (y1 === null || y2 === null) return;
              const topY = Math.min(y1, y2);
              const botY = Math.max(y1, y2);
              const h = Math.max(botY - topY, 4);
              const isBull = ob.bias === 1;

              let startX = null;
              if (ob.time && ob.time > 0) {
                try {
                  const secTime = ob.time > 100000000000 ? Math.floor(ob.time / 1000) : ob.time;
                  const xCoord = chart.timeScale().timeToCoordinate(secTime);
                  if (xCoord !== null) startX = Math.floor(xCoord);
                } catch (e) {}
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
              box.style.border = 'none';
              box.style.boxSizing = 'border-box';
              box.style.pointerEvents = 'none';
              overlay.appendChild(box);
            });
          };

          window._drawObShadedBands = drawObShadedBands;
          
          if (!window._smc_ob_subscribed && chartRef.current) {
            window._smc_ob_subscribed = true;
            chartRef.current.timeScale().subscribeVisibleLogicalRangeChange(() => {
              if (window._drawObShadedBands) window._drawObShadedBands();
            });
          }
          
          // Use setTimeout to ensure the chart is fully rendered before drawing
          setTimeout(() => {
            if (window._drawObShadedBands) window._drawObShadedBands();
          }, 100);
        }

        if (isInitialFit) {
          chartRef.current?.timeScale().fitContent(); // Fit duy nhất 1 lần khi mới load
          isInitialFit = false;
        }
      } catch (err) {
        console.error("Error fetching candles:", err);
      }
    };
    fetchCandles();
    const iv = setInterval(fetchCandles, 15000);
    return () => clearInterval(iv);
  }, [selectedCoin, selectedTf, isAuthenticated]);

  const handleStartBot = async () => {
    // 1. Kiểm tra cấu hình API Key
    if (!apiKey || !secretKey || !passphrase) {
      alert("⚠️ Vui lòng cấu hình API Key OKX trước khi bắt đầu chạy bot!");
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
      const r = await fetch(`/api/bot/start?uid=${localStorage.getItem('tls1_uid') || loginUid}&strategy=${selectedAccount}&env_file=.api_${selectedAccount}`, { method: "POST" });
      if (r.ok) { const d = await r.json(); setBotStatus(d.status); }
    } catch { alert("Lỗi khởi động bot!"); }
  };
  const handleStopBot = async () => {
    try {
      setIsStoppingBot(true);
      const r = await fetch(`/api/bot/stop?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, { method: "POST" });
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
      fetch(`/api/bot/config?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_tfs: updatedTfs }),
      }).then(res => {
        if (res.ok) {
          const isOn = updatedCoinTfs.includes(tf);
          addSystemLog(`⚙️ [SYSTEM] Đã ${isOn ? 'BẬT' : 'TẮT'} khung thời gian ${tf} cho coin ${coin.replace("-USDT-SWAP", "")}`);
        }
      });
    } catch {}
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
        fetch(`/api/bot/config?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ enabled_coins: updated.map(p => p.split("-")[0]) }),
        }).then(res => {
          if (res.ok) {
            const isOn = updated.includes(pair);
            addSystemLog(`⚙️ [SYSTEM] Đã ${isOn ? 'BẬT' : 'TẮT'} giao dịch cho cặp ${pair.replace("-USDT-SWAP", "")}`);
          }
        });
      } catch {}
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
              {authStep === "uid" ? "Nhập OKX UID của bạn:" : 
               authStep === "require_new_password" ? "Tạo Mật khẩu cấp 2:" : "Nhập Mật khẩu cấp 2:"}
            </h3>
            <form onSubmit={handleLogin}>
              {authStep === "uid" ? (
                <input 
                  type="text" 
                  placeholder="Ví dụ: 12345678" 
                  value={loginUid} 
                  onChange={e => setLoginUid(e.target.value)} 
                  style={{ width: "200px", padding: "10px", marginBottom: "15px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "4px", fontSize: "14px", textAlign: "center" }} 
                />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                  <input 
                    type="password" 
                    placeholder="Mật khẩu bảo mật" 
                    value={level2Password} 
                    onChange={e => setLevel2Password(e.target.value)} 
                    style={{ width: "200px", padding: "10px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "4px", fontSize: "14px", textAlign: "center" }} 
                  />
                  <button type="button" onClick={() => { setAuthStep("uid"); setLevel2Password(""); setLoginError(""); }} style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}>Quay lại</button>
                </div>
              )}
              {loginError && <div style={{ color: "#ff3333", fontSize: "13px", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>{loginError}</div>}
              <button 
                type="submit" 
                disabled={isLoggingIn || (authStep === "uid" ? !loginUid : !level2Password)} 
                style={{ width: "100%", padding: "12px", background: "#ff9900", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", color: "#000", fontSize: "16px", transition: "0.2s" }}
              >
                {isLoggingIn ? "Đang kiểm tra..." : "Đăng Nhập"}
              </button>
            </form>

            <div style={{ marginTop: "20px", textAlign: "left", fontSize: "12px", color: "#aaaaaa", lineHeight: "1.6" }}>
              <p style={{ color: "#27ae60", fontWeight: "bold", margin: "0 0 5px 0", fontSize: "13px" }}>✅ ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:</p>
              <p style={{ margin: "0 0 5px 0" }}>1. Đăng ký tài khoản OKX dưới Link Ref của cộng đồng TLS1, mã ref: <strong style={{ color: "#00ffff", cursor: "pointer" }} onClick={() => { navigator.clipboard.writeText("HoanPhiTLS1"); alert("✅ Đã Copy Mã Ref!"); }}>HoanPhiTLS1</strong></p>
              <p style={{ margin: "0 0 15px 0" }}>2. Hoặc thực hiện chuyển Ref về TLS1 nếu đã có sẵn tài khoản OKX.</p>
              
              <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
                <button 
                  onClick={() => window.open("https://www.okx.com/join/HoanPhiTLS1", "_blank")}
                  style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid #555", color: "#58a6ff", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
                >
                  Đăng ký OKX (VIP)
                </button>
                <button 
                  onClick={() => window.open("https://t.me/traderlaso1/6758", "_blank")}
                  style={{ flex: 1, padding: "8px", background: "transparent", border: "1px solid #555", color: "#58a6ff", borderRadius: "4px", cursor: "pointer", fontSize: "13px", fontWeight: "bold" }}
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
        <div style={{ background: "#c0392b", color: "#fff", padding: "10px 16px", fontSize: "13px", fontWeight: "bold", textAlign: "center", zIndex: 9999, position: "fixed", top: 0, left: 0, right: 0 }}>
          {lockMessage}
        </div>
      )}

      <div className={`content-wrapper ${fadeClass}`}>
        {/* SIDEBAR - Nằm trọn vẹn bên trái từ mép trên cùng xuống */}
        <aside className="sidebar-left">
          <div className="sidebar-header">
            <div className="app-title">TRADER LÀ SỐ 1</div>
            <div className="app-subtitle">VIỆT NAM</div>
          </div>

          {/* Sidebar content - QUẢN LÝ VỐN & RỦI RO */}
          <div className="sidebar-content">
            {selectedAccount === "sub1" ? (
              <div className="group-box" style={{ position: "relative" }}>
                <span className="group-box-title">QUẢN LÝ VỐN & RỦI RO</span>
                <div style={{ position: "absolute", top: "-10px", right: "10px", display: "flex", gap: "4px", backgroundColor: "#252526", padding: "0 5px" }}>
                  <button 
                    onClick={() => setRisk(r => ({...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 40 : r.posVol}))}
                    style={{ padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "USDT" ? "#26a69a" : "#222", color: risk.volUnit === "USDT" ? "#fff" : "#888", cursor: "pointer" }}
                  >USDT</button>
                  <button 
                    onClick={() => setRisk(r => ({...r, volUnit: "LOT", posVol: r.volUnit === "USDT" ? 0.01 : r.posVol}))}
                    style={{ padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "LOT" ? "#26a69a" : "#222", color: risk.volUnit === "LOT" ? "#fff" : "#888", cursor: "pointer" }}
                  >LOT</button>
                </div>
                <div className="risk-grid">
                  <div className="risk-row">
                    <label>{risk.volUnit === "USDT" ? "Volume Size (USDT):" : "Volume Size (Lot):"}</label>
                    <input type="number" className="styled-input num" value={risk.posVol} onChange={e => setRisk(r => ({...r, posVol: e.target.value}))} min={risk.volUnit === "LOT" ? "0.01" : "1"} step={risk.volUnit === "LOT" ? "0.01" : "10"} />
                  </div>
                  <div className="risk-row">
                    <label>Mức chốt lời gốc M5 (%):</label>
                    <input type="number" className="styled-input num" value={risk.tpPct} onChange={e => setRisk(r => ({...r, tpPct: e.target.value}))} min="0.1" step="0.05" />
                  </div>
                  <div className="risk-row">
                    <label>Mức cắt lỗ gốc M5 (%):</label>
                    <input type="number" className="styled-input num" value={risk.slPct} onChange={e => setRisk(r => ({...r, slPct: e.target.value}))} min="0.1" step="0.05" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="group-box" style={{ position: "relative" }}>
                <span className="group-box-title">QUẢN LÝ VỐN & RỦI RO</span>
                <div style={{ position: "absolute", top: "-10px", right: "10px", display: "flex", gap: "4px", backgroundColor: "#252526", padding: "0 5px" }}>
                  <button 
                    onClick={() => setRisk(r => ({...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 40 : r.posVol}))}
                    style={{ padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "USDT" ? "#26a69a" : "#222", color: risk.volUnit === "USDT" ? "#fff" : "#888", cursor: "pointer" }}
                  >USDT</button>
                  <button 
                    onClick={() => setRisk(r => ({...r, volUnit: "LOT", posVol: r.volUnit === "USDT" ? 0.01 : r.posVol}))}
                    style={{ padding: "2px 8px", fontSize: "11px", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "LOT" ? "#26a69a" : "#222", color: risk.volUnit === "LOT" ? "#fff" : "#888", cursor: "pointer" }}
                  >LOT</button>
                </div>
                <div className="risk-grid">
                  <div className="risk-row">
                    <label>{risk.volUnit === "USDT" ? "Volume Size (USDT):" : "Volume Size (Lot):"}</label>
                    <input type="number" className="styled-input num" value={risk.posVol} onChange={e => setRisk(r => ({...r, posVol: e.target.value}))} min={risk.volUnit === "LOT" ? "0.01" : "1"} step={risk.volUnit === "LOT" ? "0.01" : "10"} />
                  </div>
                  <div className="risk-row">
                    <label>Tỷ lệ chốt lời Thuận Trend (R:R):</label>
                    <input type="number" className="styled-input num" value={risk.tpPct} onChange={e => setRisk(r => ({...r, tpPct: e.target.value}))} min="0.1" step="0.5" />
                  </div>
                  <div className="risk-row">
                    <label>Tỷ lệ chốt lời Ngược Trend (R:R):</label>
                    <input type="number" className="styled-input num" value={risk.slPct} onChange={e => setRisk(r => ({...r, slPct: e.target.value}))} min="0.1" step="0.5" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="sidebar-footer">
            <button onClick={handleStartBot} disabled={isRunning} className="btn-control btn-start">▶ BẮT ĐẦU CHẠY BOT</button>
            <button onClick={handleStopBot} disabled={!isRunning || isStoppingBot} className="btn-control btn-stop">
              {isStoppingBot ? "⏳ ĐANG DỪNG..." : "■ DỪNG CHẠY BOT"}
            </button>
            <button className="btn-settings" onClick={() => setShowSettings(true)}>⚙️ Cài Đặt</button>
          </div>
        </aside>

        {/* PHÂN VÙNG BÊN PHẢI (CHỨA TAB BOT + CHART NẾN + BẢNG VỊ THẾ) */}
        <div className="main-section">
          {/* TAB BAR CÁC BOT (TÀI KHOẢN) */}
          <div className="bot-tabs-bar">
            {[["sub1", "Bot EMA200"], ["sub2", "Bot SMC"]].map(([sub, label]) => (
              <button 
                key={sub}
                onClick={() => setSelectedAccount(sub)}
                style={{
                  background: selectedAccount === sub ? "#2d2d2d" : "transparent",
                  color: selectedAccount === sub ? "#ff9900" : "#a0a0a0",
                  border: "none", borderRight: "1px solid #333", borderBottom: selectedAccount === sub ? "2px solid #ff9900" : "2px solid transparent",
                  padding: "10px 20px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "0.2s"
                }}
              >
                {label}
              </button>
            ))}
            {/* Slot indicator - góc phải cùng hàng */}
            <div style={{ marginLeft: "auto", paddingRight: "12px", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap" }}>
              <span style={{ color: "#ccc", fontSize: "11px", fontWeight: "bold" }}>Slot:</span>
              <span style={{ color: slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50", fontSize: "11px", fontWeight: "bold" }}>
                {slotCount}/{MAX_SLOTS}
              </span>
              <span style={{ display: "flex", gap: "2px" }}>
                {Array.from({ length: 5 }).map((_, i) => {
                  const threshold = (i + 1) * 20;
                  const active = slotCount >= threshold - 19;
                  const barColor = slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50";
                  return <span key={i} style={{ color: active ? barColor : "#444", fontSize: "13px" }}>▮</span>;
                })}
              </span>
            </div>
          </div>

          {/* WORKSPACE PHẢI - hiện trước trên mobile */}
          <main className={`main-workspace ${layoutMode}`} style={{ '--chart-ratio': `${chartRatio}%` }}>
          <section className="pane-chart" style={{ position: "relative" }}>
            <div className="pane-titlebar" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 10px" }}>
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>📈</span>
              <select className="styled-select" style={{ width: "120px", fontSize: "12px", padding: "2px 6px" }} value={selectedCoin} onChange={e => setSelectedCoin(e.target.value)}>
                {COIN_LIST.map(c => <option key={c.value} value={c.value}>{c.label.replace("-SWAP", "")}</option>)}
              </select>
              <select className="styled-select" style={{ width: "60px", fontSize: "12px", padding: "2px 6px", fontWeight: "bold" }} value={selectedTf} onChange={e => setSelectedTf(e.target.value)}>
                {TF_LIST.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
            <div className="chart-wrapper" ref={chartContainerRef}
                 onWheel={() => setIsAutoFit(false)}
                 onTouchStart={() => setIsAutoFit(false)}
                 onMouseDown={() => setIsAutoFit(false)} />
            {/* Nút A và L overlay — clone TradingView */}
            <div style={{
              position: "absolute", bottom: "8px", right: "52px",
              display: "flex", gap: "4px", zIndex: 10
            }}>
              <button
                title="Auto (fits data to screen)"
                onClick={() => {
                  const next = !isAutoFit;
                  setIsAutoFit(next);
                  if (next) chartRef.current?.timeScale().fitContent();
                }}
                style={{
                  width: "24px", height: "24px",
                  background: isAutoFit ? "rgba(41,98,255,0.85)" : "rgba(30,30,46,0.85)",
                  color: isAutoFit ? "#fff" : "#d1d4dc",
                  border: isAutoFit ? "1px solid #2962ff" : "1px solid #444",
                  borderRadius: "3px",
                  fontSize: "11px", fontWeight: "bold", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1
                }}
              >A</button>
              <button
                title="Log scale"
                onClick={() => {
                  const next = !isLogScale;
                  setIsLogScale(next);
                  chartRef.current?.priceScale("right").applyOptions({ mode: next ? 1 : 0 });
                }}
                style={{
                  width: "24px", height: "24px",
                  background: isLogScale ? "rgba(41,98,255,0.85)" : "rgba(30,30,46,0.85)",
                  color: isLogScale ? "#fff" : "#d1d4dc",
                  border: isLogScale ? "1px solid #2962ff" : "1px solid #444",
                  borderRadius: "3px",
                  fontSize: "11px", fontWeight: "bold", cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  lineHeight: 1
                }}
              >L</button>
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
              <button className={`tab-btn ${activeTab === "history" ? "active" : ""}`} onClick={() => setActiveTab("history")}>
                📜 Lịch Sử Lệnh ({closedPositions.length})
              </button>
              <button className={`tab-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
                🖥 Logs
              </button>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "12px", paddingRight: "12px" }}>
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
                      <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Thời gian đóng</th>
                      <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cặp giao dịch (TF)</th>
                      <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Giá vào</th>
                      <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Giá đóng</th>
                      <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Ký quỹ</th>
                      <th style={{ padding: "6px 15px", textAlign: "right", fontSize: "15px", whiteSpace: "nowrap", minWidth: "120px" }}>PNL (USDT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {closedPositions.map((pos) => (
                      <tr key={pos.ticket_id} style={{ borderBottom: "1px solid #333" }}>
                        <td style={{ textAlign: "left", padding: "6px 10px", fontSize: "13px", color: "#aaa" }}>
                          {new Date(pos.closeTime).toLocaleString('vi-VN')}
                        </td>
                        <td style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", fontWeight: "bold", color: pos.posSide === "long" ? "#4caf50" : "#ff5252" }}>
                          {pos.instId.replace("-SWAP", "")} ({pos.tf})
                        </td>
                        <td style={{ padding: "6px 10px", fontSize: "14px" }}>{parseFloat(pos.entryPx).toFixed(4)}</td>
                        <td style={{ padding: "6px 10px", fontSize: "14px" }}>{parseFloat(pos.exitPx).toFixed(4)}</td>
                        <td style={{ padding: "6px 10px", fontSize: "14px" }}>{parseFloat(pos.pos).toFixed(2)}</td>
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
                      <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cặp giao dịch</th>
                      <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Giá vào lệnh</th>
                      <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Ký quỹ</th>
                      <th style={{ padding: "6px 10px", textAlign: "center", fontSize: "14px", whiteSpace: "nowrap" }}>PNL thả nổi</th>
                      {/* <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>TP | SL</th> */}
                      <th style={{ padding: "6px 10px", textAlign: "left", fontSize: "14px", whiteSpace: "nowrap" }}>TF trade</th>
                      <th style={{ textAlign: "center", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cắt lệnh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COIN_LIST.slice(0, 3).map((coin, i) => {
                      const posList = safePos.filter(p => p.instId === coin.value);
                      const isChecked = activePairs.includes(coin.value);
                      
                      if (posList.length === 0) {
                        return (
                          <tr key={coin.value} style={{ borderBottom: "1px solid #333" }}>
                            <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => togglePair(coin.value)}
                                  onClick={e => e.stopPropagation()}
                                  style={{ cursor: "pointer", width: "18px", height: "18px", flexShrink: 0 }}
                                />
                                <span style={{ color: "#aaa", fontSize: "14px" }}>{coin.label.replace("-SWAP", "")}</span>
                              </div>
                            </td>
                            <td></td><td></td><td></td>
                            <td style={{ padding: "6px 10px", textAlign: "left", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", gap: "5px" }}>
                                {["M5", "M15", "M30", "H1", "H2", "H4"].map(tf => {
                                  const coinTfs = Array.isArray(enabledTfs) ? enabledTfs : (enabledTfs[coin.value] || []);
                                  const isOn = coinTfs.includes(tf);
                                  const label = tf.replace("M", "");
                                  return (
                                    <span
                                      key={tf}
                                      onClick={() => handleTfToggle(coin.value, tf)}
                                      style={{
                                        cursor: "pointer", padding: "3px 6px", borderRadius: "3px",
                                        fontSize: "11px", fontWeight: "bold",
                                        background: isOn ? "#26a69a" : "#222", color: isOn ? "#fff" : "#888",
                                        border: isOn ? "1px solid #26a69a" : "1px solid #444",
                                        minWidth: "24px", textAlign: "center", display: "inline-block"
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
                        
                        return (
                          <tr key={`${coin.value}-${pos.ticket_id || ticketIndex}`} style={{ borderBottom: ticketIndex === posList.length - 1 ? "1px solid #333" : "1px solid rgba(255, 255, 255, 0.03)" }}>
                            <td style={{ textAlign: "left", padding: "6px 10px", whiteSpace: "nowrap" }}>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: 0 }}>
                                {ticketIndex === 0 ? (
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
                                <span style={{ fontSize: "14px" }}>
                                  <span style={{ color: "#fff" }}>{coin.label.replace("-SWAP", "")}</span>
                                  <span style={{ color: "#aaa", fontSize: "12px", marginLeft: "6px" }}>
                                    ({pos.tf ? pos.tf.toLowerCase() : `${isLong ? "Long" : "Short"} ${pos.lever || "100"}x`})
                                  </span>
                                  {/* {pos.ticket_id && <span style={{ display: "block", fontSize: "11px", color: "#888" }}>{pos.ticket_id}</span>} */}
                                </span>
                              </div>
                            </td>
                            <td style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>{pos.avgPx ? parseFloat(pos.avgPx).toLocaleString() : "0"}</td>
                            <td style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>{margin.toFixed(2)} $</td>
                            <td style={{ padding: "6px 10px", textAlign: "center", fontSize: "14px", whiteSpace: "nowrap" }}>
                              {(() => {
                                const roi = parseFloat(pos.roi || 0);
                                const color = roi >= 0 ? "#26a69a" : "#ef5350";
                                return (
                                  <span style={{ color }}>
                                    {upl >= 0 ? "+" : ""}{upl.toFixed(2)} USDT ({roi > 0 ? "+" : ""}{roi.toFixed(2)}%)
                                  </span>
                                );
                              })()}
                            </td>
                            <td style={{ padding: "6px 10px", textAlign: "left", whiteSpace: "nowrap" }}>
                              {ticketIndex === 0 && (
                                <div style={{ display: "flex", gap: "5px" }}>
                                  {["M5", "M15", "M30", "H1", "H2", "H4"].map(tf => {
                                    const coinTfs = Array.isArray(enabledTfs) ? enabledTfs : (enabledTfs[coin.value] || []);
                                    const isOn = coinTfs.includes(tf);
                                    const label = tf.replace("M", "");
                                    return (
                                      <span
                                        key={tf}
                                        onClick={() => handleTfToggle(coin.value, tf)}
                                        style={{
                                          cursor: "pointer", padding: "3px 6px", borderRadius: "3px",
                                          fontSize: "11px", fontWeight: "bold",
                                          background: isOn ? "#26a69a" : "#222", color: isOn ? "#fff" : "#888",
                                          border: isOn ? "1px solid #26a69a" : "1px solid #444",
                                          minWidth: "24px", textAlign: "center", display: "inline-block"
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
                                  borderRadius: "4px", padding: "6px 16px", cursor: "pointer", 
                                  fontSize: "13px", fontWeight: "bold" 
                                }}>
                                Đóng
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        </main>
        </div>
      </div>

      {/* SETTINGS MODAL — Clone 100% từ Desktop App */}
      {showSettings && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowSettings(false)}>
          <div className="modal-content settings-modal">
            {/* Header */}
            <div className="modal-header">
              <h3>⚙️ Cấu Hình Hệ Thống</h3>
              <button className="close-btn" onClick={() => setShowSettings(false)}>×</button>
            </div>

            {/* Tab Bar */}
            <div className="settings-tab-bar">
              <button className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`} onClick={() => setSettingsTab("strategy")}>
                ⚙️ Cấu Hình Chiến Thuật
              </button>
              <button className={`settings-tab-btn ${settingsTab === "api" ? "active" : ""}`} onClick={() => setSettingsTab("api")}>
                🔑 Cấu Hình API Key
              </button>
            </div>

            <div className="modal-body settings-body">

              {/* ===== TAB API KEY ===== */}
              {settingsTab === "api" && (
                <div>
                  {/* Chọn tài khoản */}
                  <div className="settings-row" style={{ marginBottom: "12px" }}>
                    <label>Chọn tài khoản đang cấu hình:</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "6px" }}>
                      <select className="styled-select" style={{ flex: 1 }} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
                        <option value="sub1">Tài khoản phụ 1</option>
                        <option value="sub2">Tài khoản phụ 2</option>
                      </select>
                      <button className="btn-add-acc" title="Thêm tài khoản">+</button>
                      <button className="btn-del-acc" title="Xóa tài khoản">−</button>
                    </div>
                  </div>

                  {/* Thông Tin API OKX */}
                  <div className="settings-group">
                    <div className="settings-group-title">Thông Tin API OKX</div>
                    <div className="form-group">
                      <label>Mã API (API Key):</label>
                      <input type="text" className="styled-input" value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="Nhập API Key..." />
                    </div>
                    <div className="form-group">
                      <label>Khóa Bí Mật (Secret):</label>
                      <input type="password" className="styled-input" value={secretKey} onChange={e => setSecretKey(e.target.value)} placeholder="Nhập Secret Key..." />
                    </div>
                    <div className="form-group">
                      <label>Cụm Mật Khẩu (Passphrase):</label>
                      <input type="password" className="styled-input" value={passphrase} onChange={e => setPassphrase(e.target.value)} placeholder="Nhập Passphrase..." />
                    </div>
                  </div>

                  {/* Lệnh Can Thiệp Nhanh */}
                  <div className="settings-group">
                    <div className="settings-group-title">Lệnh Can Thiệp Nhanh (Audit Hệ Thống)</div>
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <button className="btn-audit">♻️ Reset Vốn Gốc (Audit)</button>
                    </div>
                  </div>

                  {/* Mã Máy HWID */}
                  <div className="settings-group">
                    <div className="settings-group-title">Mã Máy (HWID) Cá Nhân</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <span style={{ color: "#888" }}>Mã Máy của bạn:</span>
                      <span className="hwid-value">WEB-DEVICE-{navigator.userAgent.length}-TLS1</span>
                    </div>
                  </div>
                </div>
              )}

              {/* ===== TAB CHIẾN THUẬT ===== */}
              {settingsTab === "strategy" && (
                <div>
                  
                  {selectedAccount === "sub1" ? (
                    <>
                      {/* Công Tắc Chiến Thuật EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Công Tắc Chiến Thuật</div>
                        <div className="toggle-grid">
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.main} onChange={v => setStrat(s => ({...s, main: v}))} />
                            <span className="toggle-name">Đánh Đa Khung EMA200</span>
                            <span className="toggle-desc">Chiến thuật Đa Khung EMA200 chính</span>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.xole} onChange={v => setStrat(s => ({...s, xole: v}))} />
                            <span className="toggle-name">Bắt Bẻ Xole</span>
                            <span className="toggle-desc">Chiến thuật bắt bẻ xu hướng Xole</span>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({...s, dynamicEma200Tp: v}))} />
                            <span className="toggle-name">Chốt lời bám EMA200</span>
                            <span className="toggle-desc">Chốt lời động bám theo trục EMA200</span>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.dynamicPingpongTp} onChange={v => setStrat(s => ({...s, dynamicPingpongTp: v}))} />
                            <span className="toggle-name">Chốt lời sóng Ping-Pong</span>
                            <span className="toggle-desc">Chốt lời ngắn hạn sóng nảy Ping-Pong</span>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.altcoinFollowBtc} onChange={v => setStrat(s => ({...s, altcoinFollowBtc: v}))} />
                            <span className="toggle-name">Altcoin đánh theo BTC</span>
                            <span className="toggle-desc">Altcoin tính điểm Limit bằng EMA200 BTC</span>
                          </div>
                        </div>
                      </div>

                      {/* Lớp Bảo Vệ Cục Bộ EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Bảo Vệ & Cắt Lệnh Tự Động</div>
                        <div className="toggle-grid">
                          {[
                            ["sidewaySafe", "Chốt sớm khi đi ngang (Sideway)", "Chốt chủ động khi giá đi ngang + ROI ≥ 20%"],
                            ["squeezeEscape", "Thoát sớm khi bị nén giá", "Thoát sớm khi khung bị nén tam giác"],
                            ["safeguardEntry", "Thoát hòa vốn khi giá hồi", "Thoát hòa khi lỗ sâu >70% SL rồi hồi về Entry"],
                            ["trailingSl", "Khóa lời động (Trailing SL)", "Trailing SL động — tự kéo chặn lãi theo sóng"],
                            ["maxRoi", "Chốt lời lớn (ROI ≥ 120%)", "Tự động chốt lời tối đa khi đạt mốc lợi nhuận cao"],
                            ["sidewayVap", "Cắt hòa khi vấp cản 2 lần", "Cắt hòa khi vấp trục cản EMA200 ≥ 2 lần"],
                            ["h4Flip", "Cắt lệnh khi H4 đảo chiều", "Đóng toàn bộ vị thế ngược chiều khi nến H4 đổi hướng"],
                          ].map(([key, name, desc]) => (
                            <div className="toggle-row" key={key}>
                              <ToggleSwitch checked={strat[key]} onChange={v => setStrat(s => ({...s, [key]: v}))} />
                              <span className="toggle-name">{name}</span>
                              <span className="toggle-desc">{desc}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Điểm Vào Lệnh (Entry Setup) EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Điểm Vào Lệnh (Entry Setup)</div>
                        <div className="risk-grid">
                          <div className="risk-row">
                            <label>Đón trước cản (%):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              step="0.01" 
                              value={entryCfg.entryOffset} 
                              onChange={e => setEntryCfg(prev => ({...prev, entryOffset: e.target.value}))} 
                            />
                          </div>
                          <div className="risk-row">
                            <label>Khoảng cách nhồi DCA (%):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              step="0.05" 
                              value={entryCfg.dcaGapPct} 
                              onChange={e => setEntryCfg(prev => ({...prev, dcaGapPct: e.target.value}))} 
                            />
                          </div>
                          {/* Ẩn chỉ số Độ chụm đa khung (%) theo yêu cầu */}
                          {/* <div className="risk-row">
                            <label>Độ chụm đa khung (%):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              step="0.01" 
                              value={entryCfg.confluencePct} 
                              onChange={e => setEntryCfg(prev => ({...prev, confluencePct: e.target.value}))} 
                            />
                          </div> */}
                          <div className="risk-row">
                            <label>Số nến xu hướng tối thiểu:</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              min="1" 
                              max="200" 
                              value={entryCfg.accumCandles} 
                              onChange={e => setEntryCfg(prev => ({...prev, accumCandles: e.target.value}))} 
                            />
                          </div>
                          <div className="risk-row" style={{ marginTop: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "bold" }}>Altcoin neo theo BTC:</span>
                            <ToggleSwitch 
                              checked={entryCfg.altcoinFollowBtc} 
                              onChange={v => setEntryCfg(prev => ({...prev, altcoinFollowBtc: v}))} 
                            />
                          </div>
                          {entryCfg.altcoinFollowBtc && (
                            <div className="risk-row">
                              <label>Hệ số nhạy ETH (Vol Mult):</label>
                              <input 
                                type="number" 
                                className="styled-input num" 
                                step="0.1" 
                                value={entryCfg.ethVolMult} 
                                onChange={e => setEntryCfg(prev => ({...prev, ethVolMult: e.target.value}))} 
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Hệ Số Nhân Đa Khung (TF Multipliers) EMA200 */}
                      <div className="settings-group">
                        <div className="settings-group-title">Hệ Số Nhân Đa Khung (TF Multipliers)</div>
                        <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                          <thead>
                            <tr style={{ color: "#aaa", borderBottom: "1px solid #444" }}>
                              <th style={{ padding: "6px 4px", textAlign: "left" }}>Khung</th>
                              <th style={{ padding: "6px 4px" }}>Hệ số đón trước</th>
                              <th style={{ padding: "6px 4px" }}>Hệ số Volume</th>
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
                              <tr key={tf} style={{ borderBottom: "1px solid #333" }}>
                                <td style={{ padding: "6px 4px", textAlign: "left", fontWeight: "bold", color: "#26a69a" }}>{tf}</td>
                                <td style={{ padding: "6px 4px", color: "#e0e0e0" }}>{offset}</td>
                                <td style={{ padding: "6px 4px", color: "#ff9900", fontWeight: "bold" }}>{vol}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* Chiến Thuật SMC */}
                      <div className="settings-group">
                        <div className="settings-group-title">Chiến Thuật Bắt Sóng SMC</div>
                        <div className="toggle-grid">
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.main} onChange={v => setStrat(s => ({...s, main: v}))} />
                            <span className="toggle-name">Đánh SMC Order Block</span>
                            <span className="toggle-desc">Chiến thuật bắt đỉnh đáy theo vùng Order Block</span>
                          </div>
                          <div className="toggle-row" style={{ marginTop: "10px" }}>
                            <span className="toggle-name" style={{ flex: 1, color: "#e0e0e0", fontSize: "12px" }}>Khung thời gian gốc:</span>
                            <select 
                              className="styled-select" 
                              value={strat.timeframeBase} 
                              onChange={e => setStrat(s => ({...s, timeframeBase: e.target.value}))}
                              style={{ width: "100px", background: "#1e1e1e", color: "#fff", border: "1px solid #555", borderRadius: "4px", padding: "4px" }}
                            >
                              <option value="15M">15M</option>
                              <option value="30M">30M</option>
                              <option value="1H">1H</option>
                              <option value="4H">4H</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Điểm Vào Lệnh SMC */}
                      <div className="settings-group">
                        <div className="settings-group-title">Điểm Vào Lệnh SMC (Order Block)</div>
                        <div className="risk-grid">
                          <div className="risk-row">
                            <label>Nguồn bắt cản (OB Source):</label>
                            <select 
                              className="styled-select" 
                              style={{ width: "120px", padding: "3px 6px", fontSize: "11px" }} 
                              value={smcEntryCfg.source} 
                              onChange={e => setSmcEntryCfg(s => ({...s, source: e.target.value}))}
                            >
                              <option value="ALL">Cả hai sóng</option>
                              <option value="SWING">Chỉ sóng lớn</option>
                              <option value="INTERNAL">Chỉ sóng nhỏ</option>
                            </select>
                          </div>
                          <div className="risk-row">
                            <label>Hướng vào lệnh:</label>
                            <select 
                              className="styled-select" 
                              style={{ width: "120px", padding: "3px 6px", fontSize: "11px" }} 
                              value={smcEntryCfg.dir} 
                              onChange={e => setSmcEntryCfg(s => ({...s, dir: e.target.value}))}
                            >
                              <option value="BOTH">Hai chiều</option>
                              <option value="LONG_ONLY">Chỉ Long</option>
                              <option value="SHORT_ONLY">Chỉ Short</option>
                            </select>
                          </div>
                          <div className="risk-row">
                            <label>Lọc lực nến cản (x ATR):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              step="0.1" 
                              value={smcEntryCfg.obVol} 
                              onChange={e => setSmcEntryCfg(s => ({...s, obVol: e.target.value}))} 
                            />
                          </div>
                          <div className="risk-row">
                            <label>Độ dài sóng lớn (Swing nến):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              min="10" 
                              max="200" 
                              value={smcEntryCfg.swingLength} 
                              onChange={e => setSmcEntryCfg(s => ({...s, swingLength: e.target.value}))} 
                            />
                          </div>
                          <div className="risk-row">
                            <label>Độ dài sóng nhỏ (Internal nến):</label>
                            <input 
                              type="number" 
                              className="styled-input num" 
                              min="1" 
                              max="50" 
                              value={smcEntryCfg.internalLength} 
                              onChange={e => setSmcEntryCfg(s => ({...s, internalLength: e.target.value}))} 
                            />
                          </div>
                          <div className="risk-row" style={{ marginTop: "4px" }}>
                            <span style={{ fontSize: "12px", color: "#e0e0e0", fontWeight: "bold" }}>Ép khớp Market khi lọt cản:</span>
                            <ToggleSwitch 
                              checked={smcEntryCfg.forceMarket} 
                              onChange={v => setSmcEntryCfg(s => ({...s, forceMarket: v}))} 
                            />
                          </div>
                          {smcEntryCfg.forceMarket && (
                            <div className="risk-row">
                              <label>Trượt giá Market tối đa (%):</label>
                              <input 
                                type="number" 
                                className="styled-input num" 
                                step="0.1" 
                                value={smcEntryCfg.maxSlippage} 
                                onChange={e => setSmcEntryCfg(s => ({...s, maxSlippage: e.target.value}))} 
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Đóng</button>
              {settingsTab === "strategy" && (
                <button 
                  className="btn-default" 
                  style={{
                    backgroundColor: "#333333", color: "#ff9900", border: "1px solid #ff9900",
                    borderRadius: "4px", padding: "6px 14px", fontSize: "12px", cursor: "pointer", fontWeight: "bold",
                    transition: "0.2s"
                  }}
                  onClick={() => {
                    if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình về MẶC ĐỊNH của app không?")) {
                      if (selectedAccount === "sub1") {
                        setRisk({ posVol: 40, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
                        setStrat({
                          main: true, xole: false, dynamicEma200Tp: true,
                          dynamicPingpongTp: false, altcoinFollowBtc: true,
                          sidewaySafe: true, squeezeEscape: false, safeguardEntry: true,
                          trailingSl: true, maxRoi: false, sidewayVap: false, h4Flip: false,
                        });
                        setEntryCfg({
                          entryOffset: "0.05",
                          dcaGapPct: "0.20",
                          confluencePct: "0.23",
                          accumCandles: 60,
                          altcoinFollowBtc: true,
                          ethVolMult: "1.30",
                        });
                      } else if (selectedAccount === "sub2") {
                        setRisk({ posVol: 40, tpPct: 5.0, slPct: 1.0, volUnit: "USDT" });
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
                      alert("🔄 Đã khôi phục cài đặt về mặc định của nhà sản xuất!");
                    }
                  }}
                >
                  🔄 KHÔI PHỤC MẶC ĐỊNH
                </button>
              )}
              <button className="btn-primary" disabled={isSavingConfig} onClick={async () => {
                setIsSavingConfig(true);
                if (settingsTab === "api") {
                  try {
                    await fetch(`/api/bot/credentials?strategy=${selectedAccount}&uid=${localStorage.getItem('tls1_uid') || loginUid}`, {
                      method: "POST", headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ api_key: apiKey, secret_key: secretKey, passphrase })
                    });
                    alert("💾 Đã lưu cấu hình API Key!");
                    addSystemLog(`🔑 [SYSTEM] Đã lưu cấu hình API Key cho tài khoản ${selectedAccount}`);
                  } catch { alert("Lỗi khi lưu API Key"); }
                } else {
                  await new Promise(resolve => setTimeout(resolve, 800)); // Hiệu ứng delay giả lập lưu cấu hình
                  alert("💾 Đã lưu cấu hình Chiến Thuật (Auto-Reload)!");
                  addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình Chiến Thuật cho tài khoản ${selectedAccount}`);
                }
                setIsSavingConfig(false);
                setShowSettings(false);
              }}>
                {isSavingConfig ? (
                  <><span className="spinner"></span> ĐANG LƯU...</>
                ) : (
                  settingsTab === "api" ? "💾 LƯU CẤU HÌNH API KEY" : "💾 LƯU CẤU HÌNH CHIẾN THUẬT"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
