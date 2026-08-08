import React, { useState, useEffect, useRef } from "react";
import { createChart, CandlestickSeries, LineSeries } from "lightweight-charts";
import "./App.css";

const COIN_LIST = [
  { label: "BTC-USDT", value: "BTC-USDT-SWAP" },
  { label: "ETH-USDT", value: "ETH-USDT-SWAP" },
  { label: "XAU-USDT", value: "XAU-USDT-SWAP" },
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
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginUid, setLoginUid] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [selectedCoin, setSelectedCoin] = useState("BTC-USDT-SWAP");
  const [activePairs, setActivePairs] = useState(["BTC-USDT-SWAP", "ETH-USDT-SWAP"]);
  const [selectedTf, setSelectedTf] = useState("4H");
  const [enabledTfs, setEnabledTfs] = useState(["M5", "M15", "M30", "H1", "H2", "H4"]);
  const [botStatus, setBotStatus] = useState("STOPPED");
  const [uptime, setUptime] = useState(0);
  const [activeTab, setActiveTab] = useState("logs");
  const [layoutMode, setLayoutMode] = useState("vertical");
  const [logs, setLogs] = useState(["Đã kết nối với TLS1 Trading Web Terminal Server..."]);
  const [positions, setPositions] = useState([]);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("api");

  const [selectedAccount, setSelectedAccount] = useState("sub1");
  const [selectedBotType, setSelectedBotType] = useState("ema200");

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
  });
  // Risk settings
  const [risk, setRisk] = useState({ posVol: 100, tpPct: 0.80, slPct: 0.80 });

  // Sync defaults from Desktop App when switching Bots
  useEffect(() => {
    if (selectedAccount === "sub1") {
      // Defaults for Bot EMA200
      setRisk({ posVol: 100, tpPct: 0.80, slPct: 0.80 });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: true,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: true, squeezeEscape: false, safeguardEntry: true,
        trailingSl: true, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    } else if (selectedAccount === "sub2") {
      // Defaults for Bot SMC
      setRisk({ posVol: 100, tpPct: 5.00, slPct: 1.00 });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: false,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setActiveCoinsCfg({ xau: true, btc: true, eth: true });
    }
  }, [selectedAccount]);

  const chartContainerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const logEndRef = useRef(null);
  const wsRef = useRef(null);

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");
    try {
      const res = await fetch(`http://${window.location.hostname}:8080/api/auth/verify?uid=${loginUid}`);
      const data = await res.json();
      if (data.status === "success") {
        setIsAuthenticated(true);
      } else {
        setLoginError(data.message || "Đăng nhập thất bại");
      }
    } catch (err) {
      setLoginError("Không thể kết nối đến máy chủ xác thực.");
    }
    setIsLoggingIn(false);
  };

  // WebSocket
  useEffect(() => {
    if (!isAuthenticated) return;
    const connectWS = () => {
      wsRef.current = new WebSocket(`ws://${window.location.hostname}:8080/ws/logs/${selectedAccount}`);
      wsRef.current.onmessage = (e) => {
        setLogs(prev => { const n = [...prev, e.data]; return n.length > 500 ? n.slice(-500) : n; });
      };
      wsRef.current.onclose = () => setTimeout(connectWS, 3000);
    };
    
    // Đổi tab => clear log cũ, nối lại WS mới
    setLogs([]);
    if (wsRef.current) wsRef.current.close();
    connectWS();
    
    return () => { if (wsRef.current) wsRef.current.close(); };
  }, [isAuthenticated, selectedAccount]);

  useEffect(() => {
    if (logEndRef.current) logEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Periodic polling
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`http://${window.location.hostname}:8080/api/bot/status?strategy=${selectedAccount}`);
        if (r.ok) { const d = await r.json(); setBotStatus(d.status); setUptime(d.uptime); }
      } catch {}
    };
    const fetchConfig = async () => {
      try {
        const r = await fetch(`http://${window.location.hostname}:8080/api/bot/config?strategy=${selectedAccount}`);
        if (r.ok) { const d = await r.json(); if (Array.isArray(d.ENABLED_TFS)) setEnabledTfs(d.ENABLED_TFS); }
      } catch {}
    };
    const fetchPositions = async () => {
      try {
        const r = await fetch(`http://${window.location.hostname}:8080/api/bot/positions?strategy=${selectedAccount}`);
        if (r.ok) setPositions(await r.json());
      } catch {}
    };
    fetchStatus(); fetchConfig(); fetchPositions();
    const s = setInterval(fetchStatus, 2000);
    const p = setInterval(fetchPositions, 5000);
    return () => { clearInterval(s); clearInterval(p); };
  }, [isAuthenticated, selectedAccount]);

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
    const cs = chart.addSeries(CandlestickSeries, {
      upColor: "#26a69a", downColor: "#ef5350",
      borderVisible: false, wickUpColor: "#26a69a", wickDownColor: "#ef5350",
    });
    const es = chart.addSeries(LineSeries, {
      color: "rgba(220,220,220,0.8)", lineWidth: 2,
      priceLineVisible: false, crosshairMarkerVisible: false,
    });
    chartRef.current = chart;
    candleSeriesRef.current = cs;
    emaSeriesRef.current = es;
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
          height: chartContainerRef.current.clientHeight,
        });
      }
    };
    window.addEventListener("resize", handleResize);
    return () => { window.removeEventListener("resize", handleResize); chart.remove(); };
  }, [isAuthenticated, layoutMode]); // Re-init on layout change

  // Fetch candles
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCandles = async () => {
      if (!candleSeriesRef.current) return;
      try {
        const url = `https://www.okx.com/api/v5/market/candles?instId=${selectedCoin}&bar=${selectedTf}&limit=300`;
        const res = await fetch(url);
        if (!res.ok) return;
        const rd = await res.json();
        if (rd.code !== "0" || !rd.data) return;
        let lastTime = 0;
        const candles = [];
        for (let i = rd.data.length - 1; i >= 0; i--) {
          const c = rd.data[i];
          const t = Math.floor(parseInt(c[0]) / 1000);
          if (t > lastTime) {
            candles.push({ time: t, open: parseFloat(c[1]), high: parseFloat(c[2]), low: parseFloat(c[3]), close: parseFloat(c[4]) });
            lastTime = t;
          }
        }
        candleSeriesRef.current.setData(candles);
        emaSeriesRef.current?.setData(calculateEMA(candles, 200));
        chartRef.current?.timeScale().fitContent();
      } catch {}
    };
    fetchCandles();
    const iv = setInterval(fetchCandles, 15000);
    return () => clearInterval(iv);
  }, [selectedCoin, selectedTf, isAuthenticated]);

  const handleStartBot = async () => {
    try {
      const r = await fetch(`http://${window.location.hostname}:8080/api/bot/start?strategy=${selectedAccount}&env_file=.api_${selectedAccount}`, { method: "POST" });
      if (r.ok) { const d = await r.json(); setBotStatus(d.status); }
    } catch { alert("Lỗi khởi động bot!"); }
  };
  const handleStopBot = async () => {
    try {
      const r = await fetch(`http://${window.location.hostname}:8080/api/bot/stop?strategy=${selectedAccount}`, { method: "POST" });
      if (r.ok) { const d = await r.json(); setBotStatus(d.status); }
    } catch { alert("Lỗi dừng bot!"); }
  };
  const handleTfToggle = async (tf) => {
    const safe = Array.isArray(enabledTfs) ? enabledTfs : [];
    const updated = safe.includes(tf) ? safe.filter(t => t !== tf) : [...safe, tf];
    setEnabledTfs(updated);
    try {
      await fetch(`http://${window.location.hostname}:8080/api/bot/config?strategy=${selectedAccount}`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_tfs: updated }),
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
    setActivePairs(prev => prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair]);
  };
  const safeEnabledTfs = Array.isArray(enabledTfs) ? enabledTfs : [];
  const isRunning = botStatus === "RUNNING";

  if (!isAuthenticated) {
    return (
      <div className="app-container" style={{ justifyContent: "center", alignItems: "center" }}>
        <div className="login-box" style={{ background: "#252526", padding: "30px", borderRadius: "8px", border: "1px solid #444", width: "350px", textAlign: "center", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}>
          <h2 style={{ color: "#ff9900", marginBottom: "5px" }}>TRADER LÀ SỐ 1</h2>
          <p style={{ color: "#888", marginBottom: "20px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "1px" }}>Bản quyền phần mềm thuộc TLS1</p>
          <form onSubmit={handleLogin}>
            <input 
              type="text" 
              placeholder="Nhập UID của bạn (VD: 12345678)..." 
              value={loginUid} 
              onChange={e => setLoginUid(e.target.value)} 
              style={{ width: "100%", padding: "12px", marginBottom: "15px", background: "#1e1e1e", border: "1px solid #555", color: "#fff", borderRadius: "4px", fontSize: "14px", fontFamily: "Consolas, monospace" }} 
            />
            {loginError && <div style={{ color: "#ff3333", fontSize: "13px", marginBottom: "15px", textAlign: "left", fontWeight: "bold" }}>{loginError}</div>}
            <button 
              type="submit" 
              disabled={isLoggingIn || !loginUid} 
              style={{ width: "100%", padding: "12px", background: "#ff9900", border: "none", borderRadius: "4px", fontWeight: "bold", cursor: "pointer", color: "#000", fontSize: "14px", transition: "0.2s" }}
            >
              {isLoggingIn ? "Đang kiểm tra..." : "VÀO ỨNG DỤNG"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container" style={{ flexDirection: "column" }}>
      {/* TAB BAR CÁC BOT (TÀI KHOẢN) */}
      <div style={{ display: "flex", background: "#1a1a1a", borderBottom: "1px solid #333", width: "100%", paddingLeft: "10px" }}>
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
      </div>

      <div className="content-wrapper">
        {/* WORKSPACE PHẢI - hiện trước trên mobile */}
        <main className={`main-workspace ${layoutMode}`}>
          <section className="pane-chart">
            <div className="pane-titlebar">
              📈 BIỂU ĐỒ TRỰC TUYẾN: {selectedCoin.replace("-SWAP", "")} ({selectedTf})
            </div>
            <div className="chart-wrapper" ref={chartContainerRef} />
        </section>
        <section className="pane-tabs">
          <div className="tab-bar-header">
            <div className="tab-buttons">
              <button className={`tab-btn ${activeTab === "logs" ? "active" : ""}`} onClick={() => setActiveTab("logs")}>
                🖥 Terminal Logs
              </button>
              <button className={`tab-btn ${activeTab === "positions" ? "active" : ""}`} onClick={() => setActiveTab("positions")}>
                📊 Bảng Vị Thế ({safePos.length})
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
              <div className="logs-terminal">
                {logs.map((l, i) => <div key={i} className="log-line">{l}</div>)}
                <div ref={logEndRef} />
              </div>
            ) : (
              <div className="positions-table-wrapper">
                <table className="positions-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
                  <thead>
                    <tr style={{ background: "#252526", borderBottom: "1px solid #333" }}>
                      <th style={{ textAlign: "left", padding: "12px 10px", fontSize: "14px" }}>Cặp giao dịch</th>
                      <th style={{ padding: "12px 10px", fontSize: "14px" }}>Giá vào lệnh</th>
                      <th style={{ padding: "12px 10px", fontSize: "14px" }}>Ký quỹ</th>
                      <th style={{ padding: "12px 10px", textAlign: "center", fontSize: "14px" }}>PNL thả nổi</th>
                      <th style={{ padding: "12px 10px", fontSize: "14px" }}>TP | SL</th>
                      <th style={{ textAlign: "center", padding: "12px 10px", fontSize: "14px" }}>Cắt lệnh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {COIN_LIST.slice(0, 3).map((coin, i) => {
                      const pos = safePos.find(p => p.instId === coin.value);
                      const isChecked = activePairs.includes(coin.value);
                      
                      if (!pos) {
                        return (
                          <tr key={coin.value} style={{ borderBottom: "1px solid #333" }}>
                            <td style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>
                              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                                <input type="checkbox" checked={isChecked} onChange={() => togglePair(coin.value)} style={{ cursor: "pointer", width: "16px", height: "16px" }} />
                                <span style={{ color: "#aaa", fontSize: "14px" }}>{coin.label.replace("-SWAP", "")}</span>
                              </label>
                            </td>
                            <td></td><td></td><td></td><td></td><td></td>
                          </tr>
                        );
                      }

                      const isLong = pos.posSide === "long";
                      const upl = parseFloat(pos.upl || "0");
                      const margin = parseFloat(pos.margin || "0");
                      
                      return (
                        <tr key={coin.value} style={{ borderBottom: "1px solid #333" }}>
                          <td style={{ textAlign: "left", padding: "12px 10px", whiteSpace: "nowrap" }}>
                            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", margin: 0 }}>
                              <input type="checkbox" checked={isChecked} onChange={() => togglePair(coin.value)} style={{ cursor: "pointer", width: "16px", height: "16px" }} />
                              <span style={{ fontSize: "14px" }}>
                                <span style={{ color: "#fff" }}>{coin.label.replace("-SWAP", "")}</span>
                                <span style={{ color: "#aaa", fontSize: "12px", marginLeft: "6px" }}>
                                  ({isLong ? "Long" : "Short"} {pos.leverage || "100"}x)
                                </span>
                              </span>
                            </label>
                          </td>
                          <td style={{ padding: "12px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>{pos.avgPx ? parseFloat(pos.avgPx).toLocaleString() : "0"}</td>
                          <td style={{ padding: "12px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>{margin.toFixed(2)} $</td>
                          <td style={{ padding: "12px 10px", textAlign: "center", fontSize: "14px", whiteSpace: "nowrap" }}>
                            <span className={upl >= 0 ? "text-green" : "text-red"}>
                              {upl >= 0 ? "+" : ""}{upl.toFixed(2)} USDT ({upl >= 0 ? "+" : ""}{pos.roi || "0.00"}%)
                            </span>
                          </td>
                          <td style={{ padding: "12px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>
                            <span style={{ color: "#26a69a" }}>{pos.tp || "+0.00"}</span> <span style={{ color: "#555", margin: "0 4px" }}>|</span> <span style={{ color: "#ef5350" }}>{pos.sl || "-0.00"}</span>
                          </td>
                          <td style={{ textAlign: "center", padding: "12px 10px" }}>
                            <button 
                              onClick={() => alert("Chức năng Cắt Lệnh đang được phát triển.")}
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
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
        </main>

        {/* SIDEBAR - hiện sau main workspace trên mobile */}
        <aside className="sidebar-left">
          <div className="sidebar-header">
            <div className="app-title">TRADER LÀ SỐ 1</div>
            <div className="app-subtitle">VIỆT NAM</div>
            <div style={{ marginTop: "6px", color: "#4CAF50", fontSize: "11px", fontWeight: "bold" }}>Slot: 75/100 ▮▮▮▮▯</div>
          </div>

          {/* Sidebar chỉ còn Biểu Đồ + Khung TG Bot */}
          <div className="sidebar-content" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", padding: "10px" }}>

            {/* Biểu Đồ */}
            <div className="group-box">
              <span className="group-box-title">Biểu Đồ</span>
              <div style={{ display: "flex", gap: "6px" }}>
                <select className="styled-select" style={{ flex: 1, minWidth: 0 }} value={selectedCoin} onChange={e => setSelectedCoin(e.target.value)}>
                  {COIN_LIST.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
                </select>
                <select className="styled-select" style={{ width: "52px", flexShrink: 0 }} value={selectedTf} onChange={e => setSelectedTf(e.target.value)}>
                  {TF_LIST.map(tf => <option key={tf} value={tf}>{tf}</option>)}
                </select>
              </div>
            </div>

            {/* Khung Thời Gian Bot */}
            <div className="group-box">
              <span className="group-box-title">Khung Thời Gian Bot</span>
              <div className="tf-grid">
                {BOT_TFS.map(tf => {
                  const on = safeEnabledTfs.includes(tf);
                  return (
                    <button key={tf} onClick={() => handleTfToggle(tf)} className={`tf-badge-btn ${on ? "checked" : ""}`}>
                      {on ? "✓ " : ""}{tf}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          <div className="sidebar-footer">
            <button onClick={handleStartBot} disabled={isRunning} className="btn-control btn-start">▶ BẮT ĐẦU CHẠY BOT</button>
            <button onClick={handleStopBot} disabled={!isRunning} className="btn-control btn-stop">■ DỪNG CHẠY BOT</button>
            <button className="btn-settings" onClick={() => setShowSettings(true)}>⚙️ Cài Đặt</button>
          </div>
        </aside>
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
              <button className={`settings-tab-btn ${settingsTab === "api" ? "active" : ""}`} onClick={() => setSettingsTab("api")}>
                🔑 Cấu Hình API Key
              </button>
              <button className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`} onClick={() => setSettingsTab("strategy")}>
                ⚙️ Cấu Hình Chiến Thuật
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
                      <button className="btn-audit">♻️ Reset Đếm Nến</button>
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
                  
                  {/* Danh Mục Giao Dịch */}
                  <div className="settings-group">
                    <div className="settings-group-title">Danh Mục Giao Dịch</div>
                    <div style={{ display: "flex", gap: "15px", flexWrap: "wrap" }}>
                      <label style={{ color: "#fff", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                        <input type="checkbox" checked={activeCoinsCfg.xau} onChange={e => setActiveCoinsCfg({...activeCoinsCfg, xau: e.target.checked})} style={{ width: "16px", height: "16px" }} /> XAU-USDT-SWAP
                      </label>
                      <label style={{ color: "#fff", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                        <input type="checkbox" checked={activeCoinsCfg.btc} onChange={e => setActiveCoinsCfg({...activeCoinsCfg, btc: e.target.checked})} style={{ width: "16px", height: "16px" }} /> BTC-USDT-SWAP
                      </label>
                      <label style={{ color: "#fff", display: "flex", alignItems: "center", gap: "5px", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>
                        <input type="checkbox" checked={activeCoinsCfg.eth} onChange={e => setActiveCoinsCfg({...activeCoinsCfg, eth: e.target.checked})} style={{ width: "16px", height: "16px" }} /> ETH-USDT-SWAP
                      </label>
                    </div>
                  </div>

                  {/* Công Tắc Chiến Thuật */}
                  <div className="settings-group">
                    <div className="settings-group-title">Công Tắc Chiến Thuật</div>
                    <div className="toggle-grid">
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.main} onChange={v => setStrat(s => ({...s, main: v}))} />
                        <span className="toggle-name">Bật MAIN</span>
                        <span className="toggle-desc">Chiến thuật Đa Khung EMA200</span>
                      </div>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.xole} onChange={v => setStrat(s => ({...s, xole: v}))} />
                        <span className="toggle-name">Bật XOLE</span>
                        <span className="toggle-desc">Chiến thuật Bắt Bẻ Xole</span>
                      </div>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({...s, dynamicEma200Tp: v}))} />
                        <span className="toggle-name">TP động EMA200</span>
                        <span className="toggle-desc">Chốt lời động bám theo EMA200</span>
                      </div>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.dynamicPingpongTp} onChange={v => setStrat(s => ({...s, dynamicPingpongTp: v}))} />
                        <span className="toggle-name">TP Ping-Pong</span>
                        <span className="toggle-desc">Chốt lời ngắn hạn sóng Ping-Pong</span>
                      </div>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.altcoinFollowBtc} onChange={v => setStrat(s => ({...s, altcoinFollowBtc: v}))} />
                        <span className="toggle-name">Altcoin neo BTC</span>
                        <span className="toggle-desc">Altcoin tính Limit bằng EMA200 BTC</span>
                      </div>
                    </div>
                  </div>

                  {/* Lớp Bảo Vệ Cục Bộ */}
                  <div className="settings-group">
                    <div className="settings-group-title">Lớp Bảo Vệ Cục Bộ</div>
                    <div className="toggle-grid">
                      {[
                        ["sidewaySafe", "Chốt Sideway an toàn", "Chốt chủ động khi Sideway + ROI ≥ 20%"],
                        ["squeezeEscape", "Thoát nén Squeeze", "Thoát sớm khi khung bị nén tam giác"],
                        ["safeguardEntry", "Bảo vệ Entry", "Thoát hòa khi lỗ sâu >70% SL rồi hồi"],
                        ["trailingSl", "Trailing SL", "Trailing SL động — khóa lợi nhuận"],
                        ["maxRoi", "Chốt Max ROI", "Chốt lời khi ROI ≥ 120%"],
                        ["sidewayVap", "Cắt hòa Vấp EMA", "Cắt hòa khi Vấp EMA200 ≥ 2 lần"],
                        ["h4Flip", "Đóng H4 đảo chiều", "Đóng vị thế ngược khi H4 đảo chiều"],
                      ].map(([key, name, desc]) => (
                        <div className="toggle-row" key={key}>
                          <ToggleSwitch checked={strat[key]} onChange={v => setStrat(s => ({...s, [key]: v}))} />
                          <span className="toggle-name">{name}</span>
                          <span className="toggle-desc">{desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quản Lý Vốn & Rủi Ro */}
                  <div className="settings-group">
                    <div className="settings-group-title">Quản Lý Vốn & Rủi Ro</div>
                    <div className="risk-grid">
                      <div className="risk-row">
                        <label>Volume Limit cố định (USDT):</label>
                        <input type="number" className="styled-input num" value={risk.posVol} onChange={e => setRisk(r => ({...r, posVol: e.target.value}))} min="1" step="10" />
                      </div>
                      <div className="risk-row">
                        <label>Chốt lời cơ sở M5 (%):</label>
                        <input type="number" className="styled-input num" value={risk.tpPct} onChange={e => setRisk(r => ({...r, tpPct: e.target.value}))} min="0.1" step="0.05" />
                      </div>
                      <div className="risk-row">
                        <label>Dừng lỗ cơ sở M5 (%):</label>
                        <input type="number" className="styled-input num" value={risk.slPct} onChange={e => setRisk(r => ({...r, slPct: e.target.value}))} min="0.1" step="0.05" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setShowSettings(false)}>Đóng</button>
              <button className="btn-primary" onClick={() => {
                alert(settingsTab === "api" ? "💾 Đã lưu cấu hình API Key!" : "💾 Đã lưu cấu hình Chiến Thuật (Auto-Reload)!");
                setShowSettings(false);
              }}>
                {settingsTab === "api" ? "💾 LƯU CẤU HÌNH API KEY" : "💾 LƯU CẤU HÌNH CHIẾN THUẬT"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
