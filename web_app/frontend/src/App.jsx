import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { COIN_LIST, ADMIN_UID } from "./constants/tradeConfig";
import { renderLayoutIcon } from "./components/common/LayoutIcons";
import AppHeader from "./components/header/AppHeader";
import SidebarLeft from "./components/sidebar/SidebarLeft";
import SingleChartPane from "./components/chart/SingleChartPane";
import PositionsTable from "./components/positions/PositionsTable";
import LogsTerminal from "./components/terminal/LogsTerminal";
import HistoryTable from "./components/history/HistoryTable";
import LoginModal from "./components/modals/LoginModal";
import SystemSettingsModal from "./components/modals/SystemSettingsModal";
import { AddAccountModal, DeleteAccountModal } from "./components/modals/AccountPromptModals";
import useBotWebSocket from "./hooks/useBotWebSocket";
import "./App.css";

function App() {
  // 1. Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("tls1_auth") === "true");
  const [loginUid, setLoginUid] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [authStep, setAuthStep] = useState("uid");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [loginPassphrase, setLoginPassphrase] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const audioRef = useRef(null);

  // 2. Hardware ID & Bot Slot
  const [hwid] = useState(() => {
    let saved = localStorage.getItem("tls1_hwid");
    if (!saved) {
      const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
      saved = `WEB-${rand}`;
      localStorage.setItem("tls1_hwid", saved);
    }
    return saved;
  });
  const [slotCount] = useState(() => [56, 57, 58][Math.floor(Math.random() * 3)]);

  // 3. Bot Tab (sub1: Bot EMA200, sub2: Bot SMC, sub3: Bot Liquidation)
  const [activeBotTab, setActiveBotTab] = useState(() => {
    return localStorage.getItem("tls1_active_bot_tab") || "sub1";
  });
  const [fadeClass, setFadeClass] = useState("tab-fade");

  // Theme Mode: "default" (Bản Gốc) vs "glass_pro" (Kính mờ #181920 Pro)
  const [themeMode, setThemeMode] = useState(() => {
    return localStorage.getItem("tls1_theme_mode") || "default";
  });

  const toggleTheme = () => {
    setThemeMode((prev) => {
      const next = prev === "glass_pro" ? "default" : "glass_pro";
      localStorage.setItem("tls1_theme_mode", next);
      return next;
    });
  };

  // 4. Accounts & Mapping
  const [accounts, setAccounts] = useState(() => {
    try {
      const cached = localStorage.getItem("tls1_accounts");
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return [];
  });

  const [botAccountMap, setBotAccountMap] = useState(() => {
    const saved = localStorage.getItem("tls1_bot_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Object.keys(parsed).length > 0) return parsed;
      } catch { }
    }
    const defaults = { sub1: "sub1_default", sub2: "sub2_default" };
    localStorage.setItem("tls1_bot_accounts", JSON.stringify(defaults));
    return defaults;
  });

  const availableAccountsForTab = useMemo(() => {
    return accounts.filter(acc => {
      return !Object.entries(botAccountMap).some(([bot, accountId]) => {
        return bot !== activeBotTab && accountId === acc.id;
      });
    });
  }, [accounts, botAccountMap, activeBotTab]);

  const effectiveAccId = useMemo(() => {
    if (botAccountMap[activeBotTab] && availableAccountsForTab.some(a => a.id === botAccountMap[activeBotTab])) {
      return botAccountMap[activeBotTab];
    }
    return availableAccountsForTab.length > 0 ? availableAccountsForTab[0].id : "";
  }, [botAccountMap, activeBotTab, availableAccountsForTab]);

  const [selectedAccount, setSelectedAccount] = useState(effectiveAccId);

  const handleAssignAccountToActiveBot = useCallback((accId) => {
    setSelectedAccount(accId);
    setBotAccountMap(prev => {
      const next = { ...prev, [activeBotTab]: accId };
      localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
      return next;
    });
  }, [activeBotTab]);

  useEffect(() => {
    setSelectedAccount(effectiveAccId);
    localStorage.setItem("tls1_active_bot_tab", activeBotTab);
  }, [activeBotTab, effectiveAccId]);

  // 5. Real-time Bot Data via WebSocket (replaces HTTP polling for status, positions, balance)
  const currentUid = localStorage.getItem("tls1_uid") || loginUid;
  const {
    botStatus,
    setBotStatus,
    positions,
    setPositions,
    closedPositions,
    setClosedPositions,
    refresh: refreshBotData,
  } = useBotWebSocket(currentUid, activeBotTab, effectiveAccId);

  const [adminClosedPositions, setAdminClosedPositions] = useState([]);
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [overrideBotRunning, setOverrideBotRunning] = useState(null);

  // Tự động giải phóng cờ ép trạng thái khi WebSocket hoặc Server đã xác nhận đồng bộ
  useEffect(() => {
    if (overrideBotRunning === true && botStatus === "RUNNING") {
      setOverrideBotRunning(null);
    } else if (overrideBotRunning === false && (botStatus === "SHADOW" || botStatus === "STOPPED")) {
      setOverrideBotRunning(null);
    }
  }, [botStatus, overrideBotRunning]);

  // 6. Multi-chart Layout & Configuration
  const getLayoutDefaults = (layout) => {
    if (layout === "1") return ["BTC-USDT-SWAP"];
    if (layout === "2-col" || layout === "2-row") return ["BTC-USDT-SWAP", "ETH-USDT-SWAP"];
    if (layout === "3-col" || layout === "3-row") return ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"];
    if (layout === "4-grid") return ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP", "USDT.D"];
    return ["BTC-USDT-SWAP"];
  };

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
          if (parsed[3]?.coin !== "USDT.D") parsed[3].coin = "USDT.D";
          return parsed;
        }
      }
    } catch { }
    const defaultCoins = getLayoutDefaults(layout);
    return [
      { id: 0, coin: defaultCoins[0] || "BTC-USDT-SWAP", tf: "1H" },
      { id: 1, coin: defaultCoins[1] || "ETH-USDT-SWAP", tf: "1H" },
      { id: 2, coin: defaultCoins[2] || "XAU-USDT-SWAP", tf: "1H" },
      { id: 3, coin: defaultCoins[3] || "USDT.D", tf: "1H" },
    ];
  });

  const [, setSelectedCoin] = useState("BTC-USDT-SWAP");
  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutSelectorRef = useRef(null);
  const terminalRef = useRef(null);

  const updateChartConfig = (index, updates) => {
    setChartsConfig(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updates };
      localStorage.setItem("tls1_charts_config", JSON.stringify(next));
      return next;
    });
    if (updates.coin) setSelectedCoin(updates.coin);
  };

  const handleSelectLayout = (layoutKey) => {
    setChartLayout(layoutKey);
    localStorage.setItem("tls1_chart_layout", layoutKey);
    setShowLayoutMenu(false);

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

  // Close layout menu on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (layoutSelectorRef.current && !layoutSelectorRef.current.contains(e.target)) {
        setShowLayoutMenu(false);
      }
    };
    if (showLayoutMenu) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showLayoutMenu]);

  // 7. Workspace Resizer & Split View Mode
  const [isSplitView, setIsSplitView] = useState(() => {
    return localStorage.getItem("tls1_split_view") === "true";
  });
  const [chartRatio, setChartRatio] = useState(50);
  const layoutMode = "vertical";

  const toggleSplitView = () => {
    setIsSplitView(prev => {
      const next = !prev;
      localStorage.setItem("tls1_split_view", next ? "true" : "false");
      if (next) {
        // Chuyển sang split view: nếu tab đang là charts thì chuyển về positions
        if (activeTab === "charts") setActiveTab("positions");
      }
      setTimeout(() => window.dispatchEvent(new Event("resize")), 50);
      return next;
    });
  };

  const startResizing = (e) => {
    if (e.cancelable) e.preventDefault();
    const isTouch = e.type === "touchstart";
    document.body.classList.add("is-resizing");
    document.body.classList.add("is-resizing-vertical");

    const doDrag = (dragEvent) => {
      if (isTouch && dragEvent.cancelable) dragEvent.preventDefault();
      const clientY = isTouch ? dragEvent.touches[0].clientY : dragEvent.clientY;
      const workspace = document.querySelector(".main-workspace");
      if (!workspace) return;
      const rect = workspace.getBoundingClientRect();
      let newRatio = ((clientY - rect.top) / rect.height) * 100;
      if (newRatio < 25) newRatio = 25;
      if (newRatio > 75) newRatio = 75;
      setChartRatio(newRatio);
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

  // 8. Bottom Tabs (positions | logs | history)
  const [activeTab, setActiveTab] = useState("positions");
  const [logs, setLogs] = useState(["Đang kết nối với TLS1 Trading Web Terminal Server..."]);
  const logBlockIdRef = useRef(0);
  const lastLogTimeRef = useRef(0);
  const wsRef = useRef(null);

  // Watchlist Coins & Active Pairs & TFs
  const [watchlistCoins, setWatchlistCoins] = useState(() => {
    try {
      const saved = localStorage.getItem(`tls1_watchlist_coins_${currentUid || "guest"}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch { }
    return ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"];
  });

  const [activePairs, setActivePairs] = useState(["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"]);
  const [enabledTfs, setEnabledTfs] = useState({});

  const safePos = useMemo(() => {
    return (Array.isArray(positions) ? positions : []).filter(p => !p.is_child);
  }, [positions]);

  const togglePair = useCallback((pair) => {
    setActivePairs(prev => {
      const updated = prev.includes(pair) ? prev.filter(p => p !== pair) : [...prev, pair];
      try {
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
  }, [activeBotTab, currentUid]);

  const handleToggleWatchlistCoin = (coinValue) => {
    const isCurrentlySelected = watchlistCoins.includes(coinValue);
    if (isCurrentlySelected) {
      const hasOpenPosition = safePos.some(p => p.instId === coinValue);
      if (hasOpenPosition) {
        const coinName = coinValue.replace("-USDT-SWAP", "").replace("-SWAP", "");
        alert(`⚠️ Không thể bỏ chọn [${coinName}] vì đang có vị thế mở trên sàn!\n\nQuy tắc an toàn: Vui lòng đóng hết lệnh của cặp này trước khi gỡ bỏ khỏi danh sách theo dõi.`);
        return;
      }
      const updated = watchlistCoins.filter(c => c !== coinValue);
      setWatchlistCoins(updated);
      try {
        localStorage.setItem(`tls1_watchlist_coins_${currentUid || "guest"}`, JSON.stringify(updated));
      } catch { }
      if (activePairs.includes(coinValue)) togglePair(coinValue);
    } else {
      const updated = [...watchlistCoins, coinValue];
      setWatchlistCoins(updated);
      try {
        localStorage.setItem(`tls1_watchlist_coins_${currentUid || "guest"}`, JSON.stringify(updated));
      } catch { }
      if (!activePairs.includes(coinValue)) {
        togglePair(coinValue);
      }
    }
  };

  const handleTfToggle = async (coin, tf) => {
    const isOldFormat = Array.isArray(enabledTfs);
    const safeDict = isOldFormat ? {} : { ...enabledTfs };
    if (!safeDict[coin]) safeDict[coin] = isOldFormat ? [...enabledTfs] : [];

    const currentTfs = safeDict[coin];
    const updatedCoinTfs = currentTfs.includes(tf) ? currentTfs.filter(t => t !== tf) : [...currentTfs, tf];
    const updatedTfs = { ...safeDict, [coin]: updatedCoinTfs };
    setEnabledTfs(updatedTfs);

    try {
      fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled_tfs: updatedTfs }),
      }).then(res => {
        if (res.ok) {
          const isOn = updatedCoinTfs.includes(tf);
          addSystemLog(`⚙️ [SYSTEM] Đã ${isOn ? 'BẬT' : 'TẮT'} khung thời gian ${tf} cho coin ${coin.replace("-USDT-SWAP", "")}`);
        }
      });
    } catch { }
  };

  // Close Position Handler
  const handleClosePosition = async (pos, coin) => {
    const coinName = coin.label.replace("-SWAP", "");
    if (!window.confirm(`Bạn có chắc chắn muốn đóng vị thế ${coinName} không?`)) return;
    try {
      const strat = selectedAccount || "sub1";
      const res = await fetch(`/api/bot/positions/close_ticket?uid=${currentUid}&strategy=${strat}`, {
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
        refreshBotData();
      } else {
        alert(`❌ Lỗi khi đóng vị thế ${coinName}: ` + (data.detail || data.message || "Lỗi máy chủ"));
      }
    } catch (e) {
      alert(`❌ Lỗi kết nối khi đóng vị thế ${coinName}: ` + e.message);
    }
  };

  // 9. Risk & Strategy Settings State
  const [risk, setRisk] = useState({ posVol: 1, volUsdt: 1, volPct: 0.1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT", multiplyVolumeByTf: false });
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const [strat, setStrat] = useState({
    main: true, pyramidDca: false, negativeDca: false, multiTfGrid: true, hedge: false, xole: false, dynamicEma200Tp: false,
    dynamicPingpongTp: false, altcoinFollowBtc: true,
    sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
    trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
    timeframeBase: "1H",
  });
  const [entryCfg, setEntryCfg] = useState({
    entryOffset: "0.05",
    dcaGapPct: "0.20",
    confluencePct: "0.23",
    accumCandles: 60,
    altcoinFollowBtc: true,
    ethVolMult: "1.30",
  });
  const [smcEntryCfg, setSmcEntryCfg] = useState({
    source: "ALL",
    dir: "BOTH",
    obVol: 2.0,
    swingLength: 50,
    internalLength: 5,
    forceMarket: true,
    maxSlippage: 0.8,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("strategy");
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [newAccountInput, setNewAccountInput] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const addSystemLog = (msg) => {
    setLogs(prev => {
      let newBlocks = [...prev];
      newBlocks.unshift({ id: Date.now() + Math.random(), lines: [msg] });
      if (newBlocks.length > 20) newBlocks = newBlocks.slice(0, 20);
      return newBlocks;
    });
  };

  // Switch bot defaults
  useEffect(() => {
    setFadeClass("");
    setTimeout(() => setFadeClass("tab-fade"), 10);

    if (activeBotTab === "sub1") {
      setRisk({ posVol: 1, volUsdt: 1, volPct: 0.1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
      setStrat({
        main: true, pyramidDca: false, negativeDca: false, hedge: false, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
    } else if (activeBotTab === "sub2") {
      setRisk({ posVol: 1, volUsdt: 1, volPct: 0.1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        timeframeBase: "1H",
      });
    } else {
      setRisk({ posVol: 1, volUsdt: 1, volPct: 0.1, tpPct: 1.0, slPct: 1.0, volUnit: "USDT" });
      setStrat({ main: true, timeframeBase: "1H" });
    }
  }, [activeBotTab]);

  // Sync Risk settings to backend (debounced)
  const isInitialRiskRender = useRef(true);
  useEffect(() => {
    if (isInitialRiskRender.current) {
      isInitialRiskRender.current = false;
      return;
    }
    const timer = setTimeout(() => {
      try {
        if (!currentUid) return;
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: Number(risk.posVol),
            scalping_tp_pct: Number(risk.tpPct) / 100,
            scalping_sl_pct: Number(risk.slPct) / 100
          }),
        }).then(res => {
          if (res.ok) {
            addSystemLog(`⚙️ [SYSTEM] Cập nhật cấu hình: Volume = ${risk.posVol} ${risk.volUnit} | Chốt lời = ${risk.tpPct}% | Cắt lỗ = ${risk.slPct}%`);
          }
        });
      } catch { }
    }, 500);
    return () => clearTimeout(timer);
  }, [risk, activeBotTab, currentUid]);

  // Load account credentials
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchCreds = async () => {
      try {
        const targetAcc = selectedAccount || effectiveAccId;
        if (!targetAcc) return;
        const r = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${currentUid}`);
        if (r.ok) {
          const d = await r.json();
          setApiKey(d.api_key || "");
          setSecretKey(d.secret_key || "");
          setPassphrase(d.passphrase || "");
        }
      } catch { }
    };
    fetchCreds();
  }, [isAuthenticated, activeBotTab, selectedAccount, effectiveAccId, currentUid]);

  // Load bot configuration (enabled TFs, coins)
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS);
        if (d.ENABLED_COINS) setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
        if (d.POSITION_VOLUME_HIGH_CONFIDENCE !== undefined && d.POSITION_VOLUME_HIGH_CONFIDENCE !== null) {
          setRisk(r => ({
            ...r,
            posVol: Number(d.POSITION_VOLUME_HIGH_CONFIDENCE),
            tpPct: d.SCALPING_TP_PCT ? Number((d.SCALPING_TP_PCT * 100).toFixed(2)) : r.tpPct,
            slPct: d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : r.slPct,
            multiplyVolumeByTf: d.ENABLE_TF_VOLUME_MULTIPLIER !== undefined ? Boolean(d.ENABLE_TF_VOLUME_MULTIPLIER) : r.multiplyVolumeByTf
          }));
        }
        if (d.ENABLE_STRATEGY_MAIN !== undefined || d.ENABLE_PYRAMID_DCA !== undefined || d.ENABLE_MULTITF_GRID !== undefined) {
          setStrat(s => ({
            ...s,
            main: activeBotTab === "sub1" ? true : (d.ENABLE_STRATEGY_MAIN !== undefined ? Boolean(d.ENABLE_STRATEGY_MAIN) : s.main),
            pyramidDca: d.ENABLE_PYRAMID_DCA !== undefined ? Boolean(d.ENABLE_PYRAMID_DCA) : s.pyramidDca,
            negativeDca: d.ENABLE_NEGATIVE_DCA !== undefined ? Boolean(d.ENABLE_NEGATIVE_DCA) : s.negativeDca,
            multiTfGrid: d.ENABLE_MULTITF_GRID !== undefined ? Boolean(d.ENABLE_MULTITF_GRID) : (!d.ENABLE_PYRAMID_DCA && !d.ENABLE_NEGATIVE_DCA),
            hedge: d.ENABLE_STRATEGY_HEDGE !== undefined ? Boolean(d.ENABLE_STRATEGY_HEDGE) : s.hedge,
            xole: d.ENABLE_STRATEGY_XOLE !== undefined ? Boolean(d.ENABLE_STRATEGY_XOLE) : s.xole,
            dynamicEma200Tp: d.ENABLE_DYNAMIC_EMA200_TP !== undefined ? Boolean(d.ENABLE_DYNAMIC_EMA200_TP) : s.dynamicEma200Tp,
            dynamicPingpongTp: d.ENABLE_DYNAMIC_PINGPONG_TP !== undefined ? Boolean(d.ENABLE_DYNAMIC_PINGPONG_TP) : s.dynamicPingpongTp,
            sidewaySafe: d.ENABLE_SIDEWAY_SAFE_EXIT !== undefined ? Boolean(d.ENABLE_SIDEWAY_SAFE_EXIT) : s.sidewaySafe,
            squeezeEscape: d.ENABLE_SQUEEZE_ESCAPE_EXIT !== undefined ? Boolean(d.ENABLE_SQUEEZE_ESCAPE_EXIT) : s.squeezeEscape,
            safeguardEntry: d.ENABLE_SAFEGUARD_ENTRY_EXIT !== undefined ? Boolean(d.ENABLE_SAFEGUARD_ENTRY_EXIT) : s.safeguardEntry,
            trailingSl: d.ENABLE_TRAILING_SL !== undefined ? Boolean(d.ENABLE_TRAILING_SL) : s.trailingSl,
            maxRoi: d.ENABLE_MAX_ROI_EXIT !== undefined ? Boolean(d.ENABLE_MAX_ROI_EXIT) : s.maxRoi,
            sidewayVap: d.ENABLE_SIDEWAY_VAP_EXIT !== undefined ? Boolean(d.ENABLE_SIDEWAY_VAP_EXIT) : s.sidewayVap,
            h4Flip: d.ENABLE_H4_FLIP_CLOSE !== undefined ? Boolean(d.ENABLE_H4_FLIP_CLOSE) : s.h4Flip,
          }));
        }
        if (d.ENTRY_OFFSET_PCT !== undefined) {
          setEntryCfg(e => ({
            ...e,
            entryOffset: String(d.ENTRY_OFFSET_PCT),
            dcaGapPct: String(d.DCA_GAP_PCT ?? e.dcaGapPct),
            confluencePct: String(d.CONFLUENCE_PCT ?? e.confluencePct),
            accumCandles: Number(d.ACCUM_CANDLES ?? e.accumCandles),
            altcoinFollowBtc: d.ALTCOIN_FOLLOW_BTC_EMA !== undefined ? Boolean(d.ALTCOIN_FOLLOW_BTC_EMA) : true,
          }));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, activeBotTab, currentUid]);

  // Load admin closed positions for backtest stats
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${ADMIN_UID}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setAdminClosedPositions(data);
      })
      .catch(() => {});
  }, [isAuthenticated, activeBotTab]);

  // Load accounts list
  useEffect(() => {
    if (!isAuthenticated || !currentUid) return;
    fetch(`/api/bot/accounts?uid=${currentUid}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setAccounts(data);
          localStorage.setItem("tls1_accounts", JSON.stringify(data));
        }
      })
      .catch(() => {});
  }, [isAuthenticated, currentUid]);

  // Start shadow bot in background
  useEffect(() => {
    if (!isAuthenticated || !currentUid) return;
    fetch(`/api/bot/shadow/start?uid=${currentUid}&strategy=${activeBotTab}`, { method: 'POST' }).catch(() => {});
  }, [isAuthenticated, activeBotTab, currentUid]);

  // 10. WebSocket Logs Terminal stream (with full multi-bot buffer, no line clipping!)
  useEffect(() => {
    if (!isAuthenticated) return;
    let isMounted = true;
    let ws = null;

    const connectWS = () => {
      if (!isMounted) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${currentUid}/${activeBotTab}`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        const text = e.data;
        if (typeof text !== 'string') return;
        const now = Date.now();

        setLogs(prev => {
          // New bot dashboard cycle detected: start fresh block
          if (text.includes("bot_sub1.py") || text.includes("bot_sub2.py") || text.includes("bot_sub3.py") || text.includes("sys_bot_sub")) {
            logBlockIdRef.current += 1;
            return [{ id: logBlockIdRef.current, lines: [text] }];
          }

          let newBlocks = [...prev];
          if (newBlocks.length === 0 || now - lastLogTimeRef.current > 1500) {
            logBlockIdRef.current += 1;
            newBlocks.unshift({ id: logBlockIdRef.current, lines: [text] });
          } else {
            newBlocks[0] = { ...newBlocks[0], lines: [...newBlocks[0].lines, text] };
            // Allow up to 350 lines in current block to preserve account balance & all coins!
            if (newBlocks[0].lines.length > 350) {
              newBlocks[0].lines = newBlocks[0].lines.slice(-350);
            }
          }
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
  }, [isAuthenticated, activeBotTab, currentUid]);

  const handleToggleMultiplyVolume = async (val) => {
    const nextVal = Boolean(val);
    setRisk(r => ({ ...r, multiplyVolumeByTf: nextVal }));
    try {
      await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_volume: risk.posVol,
          strategy_config: {
            ENABLE_TF_VOLUME_MULTIPLIER: nextVal
          }
        })
      });
      addSystemLog(`⚙️ [CẤU HÌNH] Đã lưu thiết lập Nhân hệ số Ký quỹ (Vốn): ${nextVal ? "BẬT" : "TẮT"}`);
    } catch (err) {
      console.error("Lỗi cập nhật ENABLE_TF_VOLUME_MULTIPLIER:", err);
    }
  };

  // OKX Fast Connect Callback Interceptor
  useEffect(() => {
    const handleCallback = async () => {
      if (window.location.pathname === "/okx-callback") {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get("code");
        if (code && currentUid) {
          try {
            const acc = effectiveAccId;
            const strat = activeBotTab || "sub1";
            
            addSystemLog("⏳ [FAST CONNECT] Đang xác thực với OKX...");
            const res = await fetch("/api/auth/okx/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                account_id: acc,
                uid: currentUid,
                strategy: strat
              })
            });
            const data = await res.json();
            if (res.ok && data.status === "success") {
              alert("✅ Kết nối OKX Fast Connect thành công!");
              addSystemLog("✅ [FAST CONNECT] Lấy API Key thành công và đã lưu vào cấu hình.");
              // Reload credentials
              const credRes = await fetch(`/api/bot/credentials?strategy=${strat}&account_id=${acc}&uid=${currentUid}`);
              if (credRes.ok) {
                const credData = await credRes.json();
                setApiKey(credData.api_key || "");
                setSecretKey(credData.secret_key || "");
                setPassphrase(credData.passphrase || "");
              }
            } else {
              alert("❌ Lỗi kết nối OKX: " + (data.message || "Lỗi máy chủ"));
              addSystemLog("❌ [FAST CONNECT] Lỗi: " + (data.message || "Lỗi máy chủ"));
            }
          } catch (err) {
            alert("❌ Lỗi kết nối server: " + err.message);
          } finally {
            // Clean up URL
            window.history.replaceState({}, document.title, "/");
          }
        } else if (!currentUid) {
          // If no user is logged in, just clear url or redirect
          window.history.replaceState({}, document.title, "/");
        }
      }
    };
    
    if (isAuthenticated) {
      handleCallback();
    }
  }, [isAuthenticated, currentUid, effectiveAccId, activeBotTab]);

  // Fast Connect Handler
  const handleFastConnect = () => {
    // Tích hợp OKX Fast Connect API (OAuth 2.0)
    const clientId = "6038d061f79a421ea44b3d1777bbef5dBRWpzwlb"; 
    const redirectUri = encodeURIComponent(window.location.origin + "/okx-callback");
    // Tạo state ngẫu nhiên chống CSRF, lưu vào sessionStorage để verify khi callback
    const state = Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    sessionStorage.setItem("okx_oauth_state", state);
    // URL đúng theo tài liệu OKX: /oauth/authorize (KHÔNG có /account/)
    // scope=trade cho phép đọc + giao dịch
    const okxOAuthUrl = `https://www.okx.com/account/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=trade&state=${state}`;
    
    // Trên mobile dùng window.location.href để OS bắt Universal Link và mở thẳng app OKX.
    // Trên desktop dùng window.open để mở tab mới, không làm mất trang hiện tại.
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // window.location.href kích hoạt Universal Link trên iOS/Android, mở thẳng app OKX
      window.location.href = okxOAuthUrl;
    } else {
      window.open(okxOAuthUrl, "_blank");
    }
  };

  // Bot Start / Stop Handlers
  const handleStartBot = async () => {
    if (isStartingBot || isStoppingBot) return;
    const currentAcc = effectiveAccId;
    if (!currentAcc) {
      alert("⚠️ Vui lòng tạo ít nhất 1 tài khoản (Bấm nút +) trước khi chạy bot!");
      return;
    }
    if (!apiKey || !secretKey || !passphrase) {
      alert(`⚠️ Vui lòng cấu hình API Key OKX cho tài khoản đang chọn (${accounts.find(a => a.id === currentAcc)?.name || currentAcc}) trước khi chạy bot!`);
      setShowSettings(true);
      setSettingsTab("api");
      return;
    }
    // Kiểm tra xem đã có ít nhất 1 cặp giao dịch nào được cấu hình TF trade hay chưa
    const pairsWithTf = (activePairs || []).filter(pair => {
      const tfs = (enabledTfs && typeof enabledTfs === "object" && !Array.isArray(enabledTfs)) ? (enabledTfs[pair] || []) : [];
      return Array.isArray(tfs) && tfs.length > 0;
    });

    if (pairsWithTf.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất 1 khung thời gian (TF trade) để bắt đầu chạy bot!");
      return;
    }

    try {
      setIsStartingBot(true);
      // Tự động đồng bộ Ký quỹ cơ sở và Hệ số nhân trước khi Start bot
      try {
        await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: risk.posVol,
            strategy_config: {
              ENABLE_TF_VOLUME_MULTIPLIER: Boolean(risk.multiplyVolumeByTf)
            }
          })
        });
      } catch (e) {
        console.error("Lỗi đồng bộ cấu hình trước khi Start:", e);
      }

      const r = await fetch(`/api/bot/start?uid=${currentUid}&strategy=${activeBotTab}&account_id=${currentAcc}`, { method: "POST" });
      if (r.ok) {
        let cleanMsg = "";
        try {
          const resData = await r.json();
          if (resData?.canceled_count > 0) {
            cleanMsg = ` (Đã dọn dẹp ${resData.canceled_count} lệnh Limit cũ trên sàn, bảo lưu 100% TP/SL)`;
          }
        } catch { }
        setOverrideBotRunning(true);
        if (setBotStatus) setBotStatus("RUNNING");
        addSystemLog(`🚀 [BOT] Đã khởi động ${activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot"} với tài khoản ${accounts.find(a => a.id === currentAcc)?.name || currentAcc}${cleanMsg}`);
        refreshBotData();
        // Giữ hiệu ứng loading tối thiểu 600ms mượt mà, sau đó khi tắt loading thì giao diện chuyển thẳng sang nút DỪNG BOT
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsStartingBot(false);
      } else {
        let errMsg = "Không rõ nguyên nhân";
        try {
          const err = await r.json();
          errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err);
        } catch {
          errMsg = await r.text();
        }
        alert(`❌ Lỗi khởi động bot: ${errMsg || r.statusText}`);
        setOverrideBotRunning(null);
        setIsStartingBot(false);
      }
    } catch (e) {
      alert(`❌ Lỗi kết nối khi khởi động bot: ${e?.message || e}`);
      setOverrideBotRunning(null);
      setIsStartingBot(false);
    }
  };

  const handleStopBot = async () => {
    if (isStoppingBot || isStartingBot) return;
    try {
      setIsStoppingBot(true);
      const targetStrat = activeBotTab || "sub1";
      const targetUid = currentUid || "default";
      const targetAcc = selectedAccount || effectiveAccId || "";
      const r = await fetch(`/api/bot/stop?strategy=${targetStrat}&uid=${targetUid}&account_id=${targetAcc}`, { method: "POST" });
      if (r.ok) {
        const resData = await r.json().catch(() => ({}));
        setOverrideBotRunning(false);
        if (setBotStatus) setBotStatus("SHADOW");
        const cancelCount = resData.canceled_count !== undefined ? ` (Đã hủy ${resData.canceled_count} lệnh Limit chưa khớp, bảo lưu 100% TP/SL)` : "";
        addSystemLog(`🛑 [BOT] Đã dừng bot thành công${cancelCount}.`);
        refreshBotData();
        // Giữ hiệu ứng loading tối thiểu 600ms mượt mà, sau đó khi tắt loading thì giao diện chuyển thẳng sang nút CHẠY BOT
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsStoppingBot(false);
      } else {
        let errMsg = "Không rõ nguyên nhân";
        try {
          const err = await r.json();
          errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err);
        } catch {
          errMsg = await r.text();
        }
        alert(`❌ Lỗi dừng bot: ${errMsg || r.statusText}`);
        setOverrideBotRunning(null);
        setIsStoppingBot(false);
      }
    } catch (e) {
      alert(`❌ Lỗi kết nối khi dừng bot: ${e?.message || e}`);
      setOverrideBotRunning(null);
      setIsStoppingBot(false);
    }
  };

  // Account creation & deletion
  const confirmCreateAccount = async () => {
    if (!newAccountInput || !newAccountInput.trim() || isCreatingAccount) return;
    const cleanName = newAccountInput.trim();
    if (accounts.some(a => a.name.toLowerCase() === cleanName.toLowerCase())) {
      alert(`Tài khoản "${cleanName}" đã tồn tại!`);
      return;
    }

    setIsCreatingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

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
    addSystemLog(`➕ [ACCOUNT] Đã tạo tài khoản mới: "${cleanName}"`);

    try {
      await fetch(`/api/bot/accounts?uid=${currentUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: newId, name: cleanName })
      });
    } catch { }
    setIsCreatingAccount(false);
  };

  const confirmDeleteAccount = async () => {
    if (isDeletingAccount) return;
    setIsDeletingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const targetAccountId = selectedAccount;
    const currentAcc = accounts.find(a => a.id === targetAccountId);
    const accName = currentAcc?.name || targetAccountId;

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
      setAccounts([]);
      localStorage.setItem("tls1_accounts", JSON.stringify([]));
      setSelectedAccount("");
      setBotAccountMap({});
      localStorage.setItem("tls1_bot_accounts", JSON.stringify({}));
      setShowDeleteAccountModal(false);
      addSystemLog(`🗑️ [ACCOUNT] Đã xoá tài khoản cuối cùng`);
    }

    try {
      await fetch(`/api/bot/accounts/${targetAccountId}?uid=${currentUid}`, { method: "DELETE" });
    } catch { }
    setIsDeletingAccount(false);
  };

  useEffect(() => {
    setFadeClass("");
    setOverrideBotRunning(null);
    setTimeout(() => setFadeClass("tab-fade"), 10);

    if (activeBotTab === "sub1") {
      // Defaults for Bot EMA200
      setRisk({ posVol: 1, volUsdt: 1, volPct: 0.1, volUnit: "USDT", tpPct: 0.80, slPct: 0.80 });
      setStrat({
        main: true, pyramidDca: false, negativeDca: false, hedge: false, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
      setEntryCfg(prev => ({
        ...prev,
        entryOffset: "0.05",
        dcaGapPct: "0.20",
        confluencePct: "0.23",
        accumCandles: 60,
        altcoinFollowBtc: true,
      }));
      setWatchlistCoins(["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"]);
    } else if (activeBotTab === "sub2") {
      // Defaults for Bot SMC
      setRisk({ posVol: 1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        timeframeBase: "1H",
      });
      setWatchlistCoins(["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"]);
    }
  }, [activeBotTab]);

  // Reset Capital & Nen
  const handleResetCapital = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn Reset Vốn Gốc (hệ thống sẽ lấy số dư hiện tại từ OKX làm Vốn Gốc mới)?")) return;
    try {
      const targetAcc = selectedAccount || effectiveAccId || "";
      const resp = await fetch(`/api/bot/reset_capital?uid=${currentUid}&strategy=${activeBotTab}&account_id=${targetAcc}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) {
        const msg = data.message || `✅ Đã Reset Vốn Gốc thành công! Tổng vốn quét từ OKX: ${Number(data.total_equity || 0).toLocaleString()} USDT`;
        alert(msg);
        addSystemLog(`♻️ [HỆ THỐNG]: Đã Reset Vốn Gốc thành công! Tổng vốn quét từ sàn OKX: ${Number(data.total_equity || 0).toLocaleString()} USDT`);
        refreshBotData();
      } else {
        alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
      }
    } catch (e) {
      alert("❌ Lỗi kết nối: " + e.message);
    }
  };

  const handleResetNen = async () => {
    if (currentUid.toLowerCase() !== "admtls12021") {
      alert("⚠️ Chức năng này chỉ dành riêng cho Quản trị viên (Admin)!");
      return;
    }
    if (!window.confirm("Bạn có chắc chắn muốn gửi lệnh Reset Đếm Nến đến Bot?")) return;
    try {
      const resp = await fetch(`/api/bot/reset_nen?uid=${currentUid}&strategy=${activeBotTab}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) alert("✅ Đã kích hoạt lệnh Reset Đếm Nến thành công!");
      else alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
    } catch (e) {
      alert("❌ Lỗi kết nối: " + e.message);
    }
  };

  const handleSaveApiKey = async () => {
    if (!selectedAccount) {
      alert("⚠️ Vui lòng tạo ít nhất 1 tài khoản (Bấm nút +) trước khi lưu API Key!");
      return;
    }
    setIsSavingConfig(true);
    await new Promise(resolve => setTimeout(resolve, 1200));
    try {
      const res = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${selectedAccount}&uid=${currentUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: apiKey, secret_key: secretKey, passphrase })
      });
      if (!res.ok) {
        const err = await res.json();
        alert(`❌ Lỗi: ${err.detail || "Không thể lưu API Key"}`);
        setIsSavingConfig(false);
        return;
      }
      handleAssignAccountToActiveBot(selectedAccount);
      const curAccName = accounts.find(a => a.id === selectedAccount)?.name || selectedAccount;
      alert(`Đã lưu cấu hình API Key cho [${curAccName}] thành công!`);
      addSystemLog(`🔑 [SYSTEM] Đã lưu cấu hình API Key cho tài khoản "${curAccName}"`);
      refreshBotData();
    } catch (e) {
      alert(`Lỗi kết nối khi lưu API Key: ${e.message}`);
    }
    setIsSavingConfig(false);
    setShowSettings(false);
  };

  const handleSaveStratConfig = async () => {
    setIsSavingConfig(true);
    try {
      const targetAcc = selectedAccount || effectiveAccId || "";
      const strategyConfig = {
        ENABLE_STRATEGY_MAIN: activeBotTab === "sub1" ? true : Boolean(strat.main),
        ENABLE_PYRAMID_DCA: Boolean(strat.pyramidDca),
        ENABLE_NEGATIVE_DCA: Boolean(strat.negativeDca),
        ENABLE_MULTITF_GRID: Boolean(strat.multiTfGrid ?? (!strat.pyramidDca && !strat.negativeDca)),
        ENABLE_STRATEGY_HEDGE: Boolean(strat.hedge),
        ENABLE_STRATEGY_XOLE: Boolean(strat.xole),
        ENABLE_DYNAMIC_EMA200_TP: Boolean(strat.dynamicEma200Tp),
        ENABLE_DYNAMIC_PINGPONG_TP: Boolean(strat.dynamicPingpongTp),
        ENABLE_SIDEWAY_SAFE_EXIT: Boolean(strat.sidewaySafe),
        ENABLE_SQUEEZE_ESCAPE_EXIT: Boolean(strat.squeezeEscape),
        ENABLE_SAFEGUARD_ENTRY_EXIT: Boolean(strat.safeguardEntry),
        ENABLE_TRAILING_SL: Boolean(strat.trailingSl),
        ENABLE_MAX_ROI_EXIT: Boolean(strat.maxRoi),
        ENABLE_SIDEWAY_VAP_EXIT: Boolean(strat.sidewayVap),
        ENABLE_H4_FLIP_CLOSE: Boolean(strat.h4Flip),
        ALTCOIN_FOLLOW_BTC_EMA: Boolean(entryCfg.altcoinFollowBtc),
        ENTRY_OFFSET_PCT: parseFloat(entryCfg.entryOffset) || 0.05,
        DCA_GAP_PCT: parseFloat(entryCfg.dcaGapPct) || 0.20,
        CONFLUENCE_PCT: parseFloat(entryCfg.confluencePct) || 0.23,
        ACCUM_CANDLES: parseInt(entryCfg.accumCandles) || 60,
        ETH_VOL_MULT: parseFloat(entryCfg.ethVolMult) || 1.30,
        ENABLE_TF_VOLUME_MULTIPLIER: Boolean(risk.multiplyVolumeByTf),
      };

      const res = await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}&account_id=${targetAcc}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_volume: risk.posVol,
          scalping_tp_pct: (risk.tpPct || 0.8) / 100,
          scalping_sl_pct: (risk.slPct || 0.8) / 100,
          strategy_config: strategyConfig
        })
      });

      let cancelMsg = "";
      if (res.ok) {
        const d = await res.json().catch(() => ({}));
        if (d?.canceled_count > 0) {
          cancelMsg = ` (Đã hủy ${d.canceled_count} lệnh Limit cũ trên OKX, bảo lưu 100% TP/SL)`;
        }
      } else {
        const err = await res.json();
        alert(`❌ Lỗi lưu cấu hình: ${err.detail || "Không rõ nguyên nhân"}`);
        setIsSavingConfig(false);
        return;
      }

      const curBotName = activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation";
      alert(`Đã lưu Cấu Hình Chiến Thuật cho [${curBotName}] thành công!${cancelMsg}`);
      const dcaMode = strat.pyramidDca ? "DCA Dương" : strat.negativeDca ? "DCA Âm" : "Lưới Đa Khung";
      addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình ${curBotName}: Chế độ = ${dcaMode}${cancelMsg}`);
      refreshBotData();
    } catch (e) {
      alert(`❌ Lỗi kết nối khi lưu cấu hình: ${e.message}`);
    } finally {
      setIsSavingConfig(false);
      setShowSettings(false);
    }
  };

  const handleResetDefaultStrat = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình chiến thuật về MẶC ĐỊNH chuẩn (XAU, BTC, ETH - Ký quỹ 1$ - Lưới Đa Khung - Đồng pha BTC) không?")) return;

    setIsSavingConfig(true);
    try {
      const targetAcc = selectedAccount || effectiveAccId || "";
      if (activeBotTab === "sub1") {
        const defaultRisk = { posVol: 1, volUsdt: 1, volPct: 0.1, volUnit: "USDT", tpPct: 0.80, slPct: 0.80, multiplyVolumeByTf: false };
        const defaultStrat = {
          main: true, pyramidDca: false, negativeDca: false, multiTfGrid: true, hedge: false, xole: false, dynamicEma200Tp: false,
          dynamicPingpongTp: false,
          sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
          trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        };
        const defaultEntryCfg = {
          entryOffset: "0.05",
          dcaGapPct: "0.20",
          confluencePct: "0.23",
          accumCandles: 60,
          altcoinFollowBtc: true,
          ethVolMult: "1.30",
        };
        const defaultCoins = ["XAU", "BTC", "ETH"];
        const defaultPairs = ["XAU-USDT-SWAP", "BTC-USDT-SWAP", "ETH-USDT-SWAP"];

        setRisk(defaultRisk);
        setStrat(defaultStrat);
        setEntryCfg(defaultEntryCfg);
        setActivePairs(defaultPairs);
        setWatchlistCoins(defaultPairs);
        const curUid = localStorage.getItem("tls1_uid") || currentUid || "guest";
        try {
          localStorage.setItem(`tls1_watchlist_coins_${curUid}`, JSON.stringify(defaultPairs));
        } catch { }

        const strategyConfig = {
          ENABLE_STRATEGY_MAIN: true,
          ENABLE_PYRAMID_DCA: false,
          ENABLE_NEGATIVE_DCA: false,
          ENABLE_MULTITF_GRID: true,
          ENABLE_STRATEGY_HEDGE: false,
          ENABLE_STRATEGY_XOLE: false,
          ENABLE_DYNAMIC_EMA200_TP: false,
          ENABLE_DYNAMIC_PINGPONG_TP: false,
          ENABLE_SIDEWAY_SAFE_EXIT: false,
          ENABLE_SQUEEZE_ESCAPE_EXIT: false,
          ENABLE_SAFEGUARD_ENTRY_EXIT: false,
          ENABLE_TRAILING_SL: false,
          ENABLE_MAX_ROI_EXIT: false,
          ENABLE_SIDEWAY_VAP_EXIT: false,
          ENABLE_H4_FLIP_CLOSE: false,
          ALTCOIN_FOLLOW_BTC_EMA: true,
          ENTRY_OFFSET_PCT: 0.05,
          DCA_GAP_PCT: 0.20,
          CONFLUENCE_PCT: 0.23,
          ACCUM_CANDLES: 60,
          ETH_VOL_MULT: 1.30,
          ENABLE_TF_VOLUME_MULTIPLIER: false,
        };

        const res = await fetch(`/api/bot/config?strategy=sub1&uid=${currentUid}&account_id=${targetAcc}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            enabled_coins: defaultCoins,
            position_volume: 1,
            scalping_tp_pct: 0.008,
            scalping_sl_pct: 0.008,
            strategy_config: strategyConfig
          })
        });

        let cancelMsg = "";
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d?.canceled_count > 0) {
            cancelMsg = ` (Đã hủy ${d.canceled_count} lệnh Limit cũ trên OKX, bảo lưu 100% TP/SL)`;
          }
        }
        alert(`✅ Đã khôi phục Cấu Hình Mặc Định cho Bot EMA200 thành công!${cancelMsg}`);
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định Bot EMA200: Ký quỹ 1$, Lưới Đa Khung, Đồng pha BTC, XAU/BTC/ETH${cancelMsg}`);
        refreshBotData();
      } else if (activeBotTab === "sub2") {
        setRisk({ posVol: 1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT", multiplyVolumeByTf: false });
        setStrat({
          main: true, xole: false, dynamicEma200Tp: false,
          dynamicPingpongTp: false, altcoinFollowBtc: true,
          sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
          trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
          timeframeBase: "1H",
        });
        const res = await fetch(`/api/bot/config?strategy=sub2&uid=${currentUid}&account_id=${targetAcc}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: 1,
            scalping_tp_pct: 0.015,
            scalping_sl_pct: 0.015,
            strategy_config: { ENABLE_STRATEGY_MAIN: true }
          })
        });
        let cancelMsg = "";
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d?.canceled_count > 0) cancelMsg = ` (Đã hủy ${d.canceled_count} lệnh Limit cũ trên OKX)`;
        }
        alert(`✅ Đã khôi phục Cấu Hình Mặc Định cho Bot SMC thành công!${cancelMsg}`);
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định Bot SMC${cancelMsg}`);
        refreshBotData();
      } else {
        setRisk({ posVol: 1, tpPct: 1.0, slPct: 1.0, volUnit: "USDT" });
        setStrat({ main: true, timeframeBase: "1H" });
      }
    } catch (e) {
      alert(`❌ Lỗi khôi phục mặc định: ${e.message}`);
    } finally {
      setIsSavingConfig(false);
      setShowSettings(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("tls1_auth");
    localStorage.removeItem("tls1_uid");
    window.location.reload();
  };

  // Login handler
  const handleLogin = async (e) => {
    e.preventDefault();
    if (audioRef.current) audioRef.current.play().catch(() => {});
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
      const pwdToSend = (authStep === "require_password" || authStep === "create_password") ? adminPassword : "";
      const payload = {
        uid: loginUid,
        password: pwdToSend,
        passphrase: authStep === "require_passphrase" ? loginPassphrase : ""
      };
      const res = await fetch(`/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === "success") {
        setIsAuthenticated(true);
        localStorage.setItem("tls1_auth", "true");
        localStorage.setItem("tls1_uid", loginUid);
        if (data.token) {
          localStorage.setItem("tls1_token", data.token);
        }
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
    } catch {
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
            // Bỏ giới hạn 20 dòng để hiển thị trọn vẹn Bảng SYS (Dashboard)
            if (newBlocks[0].lines.length > 500) {
              newBlocks[0].lines = newBlocks[0].lines.slice(newBlocks[0].lines.length - 500);
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

  const fetchPositions = useCallback(async () => {
    try {
      const acc = effectiveAccId;
      if (!acc) {
        setPositions([]);
        setClosedPositions([]);
        return;
      }
      const r = await fetch(`/api/bot/positions?strategy=${activeBotTab}&account_id=${acc}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
      if (r.ok) setPositions(await r.json());

      const r2 = await fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}&account_id=${acc}`);
      if (r2.ok) {
        setClosedPositions(await r2.json());
      }

      // Fetch admin data for backtest stats
      const rAdmin = await fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${ADMIN_UID}`);
      if (rAdmin.ok) {
        setAdminClosedPositions(await rAdmin.json());
      }
    } catch { }
  }, [effectiveAccId, activeBotTab, loginUid, setPositions, setClosedPositions]);

  // Periodic polling
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/bot/status?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) { 
          const d = await r.json(); 
          if (d?.status && setBotStatus) setBotStatus(d.status); 
        }
      } catch { }
    };
    const fetchConfig = async () => {
      try {
        const r = await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) {
          const d = await r.json();
          if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS);
          if (d.ENABLED_COINS && Array.isArray(d.ENABLED_COINS) && d.ENABLED_COINS.length > 0) {
            setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
          }
          setRisk(r => ({
            ...r,
            posVol: (d.POSITION_VOLUME_HIGH_CONFIDENCE !== undefined && d.POSITION_VOLUME_HIGH_CONFIDENCE !== null) ? Number(d.POSITION_VOLUME_HIGH_CONFIDENCE) : r.posVol,
            tpPct: d.SCALPING_TP_PCT ? Number((d.SCALPING_TP_PCT * 100).toFixed(2)) : r.tpPct,
            slPct: d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : r.slPct,
            multiplyVolumeByTf: d.ENABLE_TF_VOLUME_MULTIPLIER !== undefined ? Boolean(d.ENABLE_TF_VOLUME_MULTIPLIER) : (r.multiplyVolumeByTf ?? false),
          }));
        }
      } catch { }
    };
    const fetchCreds = async () => {
      try {
        const targetAcc = selectedAccount || effectiveAccId;
        if (!targetAcc) return;
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
  }, [isAuthenticated, activeBotTab, selectedAccount, botAccountMap, loginUid, effectiveAccId, fetchPositions]);


  if (!isAuthenticated) {
    return (
      <LoginModal
        isAuthenticated={isAuthenticated}
        audioRef={audioRef}
        authStep={authStep}
        setAuthStep={setAuthStep}
        loginUid={loginUid}
        setLoginUid={setLoginUid}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
        adminConfirmPassword={adminConfirmPassword}
        setAdminConfirmPassword={setAdminConfirmPassword}
        loginPassphrase={loginPassphrase}
        setLoginPassphrase={setLoginPassphrase}
        loginError={loginError}
        setLoginError={setLoginError}
        isLoggingIn={isLoggingIn}
        handleLogin={handleLogin}
      />
    );
  }

  const isRunning = overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING");

  return (
    <div className={`app-container ${themeMode === "glass_pro" ? "theme-glass-pro" : ""}`}>
      {lockMessage && (
        <div style={{ background: "#c0392b", color: "#fff", padding: "10px 16px", fontSize: "14px", fontWeight: "bold", textAlign: "center", zIndex: 9999, position: "fixed", top: 0, left: 0, right: 0 }}>
          {lockMessage}
        </div>
      )}

      <div className={`content-wrapper ${fadeClass}`}>
        {/* SIDEBAR LEFT */}
        <SidebarLeft
          activeBotTab={activeBotTab}
          effectiveAccId={effectiveAccId}
          accounts={accounts}
          botAccountMap={botAccountMap}
          onAssignAccount={handleAssignAccountToActiveBot}
          onOpenSettings={() => setShowSettings(true)}
          isRiskCollapsed={isRiskCollapsed}
          setIsRiskCollapsed={setIsRiskCollapsed}
          onToggleRiskCollapse={() => setIsRiskCollapsed(!isRiskCollapsed)}
          risk={risk}
          setRisk={setRisk}
          isRunning={isRunning}
          onToggleMultiplyVolume={handleToggleMultiplyVolume}
        />

        {/* MAIN SECTION */}
        <div className="main-section">
          {/* TOP HEADER */}
          <AppHeader
            activeBotTab={activeBotTab}
            onSelectBotTab={setActiveBotTab}
            slotCount={slotCount}
            maxSlots={100}
            themeMode={themeMode}
            onToggleTheme={toggleTheme}
          />

          {/* BOT PANEL CARD */}
          <div className="bot-panel-card">
            {/* ACTION BAR: START / STOP BOT */}
            <div className="bot-action-bar" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', boxSizing: 'border-box' }}>
              {isStartingBot ? (
                <button
                  disabled
                  className="btn-action-start btn-action-loading"
                  style={{ width: "fit-content" }}
                >
                  <span className="spinner" style={{ width: "13px", height: "13px", margin: "0 8px 0 0", borderWidth: "2px" }}></span>
                  ĐANG KHỞI ĐỘNG BOT...
                </button>
              ) : isStoppingBot ? (
                <button
                  disabled
                  className="btn-action-stop btn-action-loading"
                  style={{ width: "fit-content" }}
                >
                  <span className="spinner" style={{ width: "13px", height: "13px", margin: "0 8px 0 0", borderWidth: "2px" }}></span>
                  ĐANG DỪNG BOT...
                </button>
              ) : isRunning ? (
                <button
                  onClick={handleStopBot}
                  className="btn-action-stop"
                  style={{ width: "fit-content" }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="#ffffff" style={{ flexShrink: 0 }}>
                    <rect x="1" y="1" width="10" height="10" rx="1.5" />
                  </svg>
                  <span>DỪNG BOT</span>
                </button>
              ) : (
                <button
                  onClick={handleStartBot}
                  className="btn-action-start"
                  style={{ width: "fit-content" }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="#ffffff" style={{ flexShrink: 0 }}>
                    <path d="M 2.5 1.5 C 2.5 0.9 3.2 0.5 3.7 0.8 L 10.5 5.3 C 11.0 5.6 11.0 6.4 10.5 6.7 L 3.7 11.2 C 3.2 11.5 2.5 11.1 2.5 10.5 Z" />
                  </svg>
                  <span>CHẠY BOT</span>
                </button>
              )}
              <button
                onClick={handleFastConnect}
                className="btn-connect-okx"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                  <rect x="0" y="0" width="7" height="7" rx="1" />
                  <rect x="17" y="0" width="7" height="7" rx="1" />
                  <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
                  <rect x="0" y="17" width="7" height="7" rx="1" />
                  <rect x="17" y="17" width="7" height="7" rx="1" />
                </svg>
                <span>OKX Connect</span>
              </button>
            </div>

            {/* CHARTS & WORKSPACE CONTAINER */}
            <div className="chart-panel-card">
              <main
                className={`main-workspace ${layoutMode}`}
                style={isSplitView ? { '--chart-ratio': `${chartRatio}%` } : {}}
              >
                {/* 1. TOP SPLIT PANE (KHI BẬT CHẾ ĐỘ ⮃: BIỂU ĐỒ NẰM PHÍA TRÊN) */}
                {isSplitView && (
                  <>
                    <section className="pane-chart" style={{ position: "relative" }}>
                      <div className={`multi-chart-container layout-${chartLayout}`}>
                        {chartsConfig.slice(0, 4).map((cfg, idx) => (
                          <SingleChartPane
                            key={`split_chart_slot_${idx}`}
                            activeBotTab={activeBotTab}
                            adminClosedPositions={adminClosedPositions}
                            chartIndex={idx}
                            coin={cfg.coin}
                            tf={cfg.tf}
                            risk={risk}
                            enabledTfs={enabledTfs}
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

                    {/* Resizer thanh kéo giữa Biểu Đồ và Bảng Vị Thế */}
                    <div 
                      className={`resizer ${layoutMode === "vertical" ? "horizontal-resizer" : "vertical-resizer"}`}
                      onMouseDown={startResizing}
                      onTouchStart={startResizing}
                    />
                  </>
                )}

                {/* 2. PANE TABS (BẢNG VỊ THẾ - LOGS - BIỂU ĐỒ) */}
                <section className="pane-tabs">
                  <div className="tab-bar-header">
                    <div className="tab-buttons">
                      <button
                        className={`tab-btn ${activeTab === "positions" ? "active" : ""}`}
                        onClick={() => setActiveTab("positions")}
                      >
                        Bảng Vị Thế ({safePos.length})
                      </button>
                      <button
                        className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
                        onClick={() => setActiveTab("logs")}
                      >
                        Logs
                      </button>
                      <button
                        className={`tab-btn ${activeTab === "charts" ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab("charts");
                          setTimeout(() => window.dispatchEvent(new Event("resize")), 40);
                        }}
                      >
                        Biểu Đồ
                      </button>
                    </div>
                    <button
                      type="button"
                      className={`btn-tab-split ${isSplitView ? "active" : ""}`}
                      onClick={toggleSplitView}
                      title={isSplitView ? "Thu gọn về dạng Tab chung" : "Tách Biểu Đồ lên trên và Bảng Vị Thế xuống dưới (Chia đôi màn hình)"}
                    >
                      ⮃
                    </button>
                  </div>

                  <div className="tab-content">
                    {/* TAB BIỂU ĐỒ TRONG NỘI BỘ TAB (Chỉ mount khi không ở chế độ splitView) */}
                    {!isSplitView && (
                      <div
                        className="chart-tab-pane"
                        style={{
                          display: activeTab === "charts" ? "flex" : "none",
                          width: "100%",
                          height: "100%",
                          flex: 1,
                          flexDirection: "column",
                          overflow: "hidden",
                          position: "relative"
                        }}
                      >
                        <div className={`multi-chart-container layout-${chartLayout}`}>
                          {chartsConfig.slice(0, 4).map((cfg, idx) => (
                            <SingleChartPane
                              key={`chart_slot_${idx}`}
                              activeBotTab={activeBotTab}
                              adminClosedPositions={adminClosedPositions}
                              chartIndex={idx}
                              coin={cfg.coin}
                              tf={cfg.tf}
                              risk={risk}
                              enabledTfs={enabledTfs}
                              onChangeCoin={(newCoin) => updateChartConfig(idx, { coin: newCoin })}
                              onChangeTf={(newTf) => updateChartConfig(idx, { tf: newTf })}
                              isActive={activeChartIndex === idx}
                              onActivate={() => {
                                setActiveChartIndex(idx);
                                setSelectedCoin(cfg.coin);
                              }}
                              showToolbar={true}
                              layout={chartLayout}
                              isVisible={activeTab === "charts" && idx < getActiveChartsCount(chartLayout)}
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
                      </div>
                    )}

                    {/* Khi ở chế độ splitView mà người dùng bấm vào tab Biểu Đồ */}
                    {isSplitView && activeTab === "charts" && (
                      <div style={{ padding: "20px", textAlign: "center", color: "#888" }}>
                        <p style={{ fontSize: "13px", marginBottom: "8px" }}>Biểu đồ hiện đang được hiển thị ở khung trên.</p>
                        <button
                          className="btn-default"
                          onClick={() => setActiveTab("positions")}
                          style={{
                            background: "#333",
                            border: "1px solid #555",
                            color: "#ff9900",
                            padding: "6px 14px",
                            borderRadius: "4px",
                            cursor: "pointer",
                            fontSize: "12px",
                            fontWeight: "bold"
                          }}
                        >
                          Xem Bảng Vị Thế
                        </button>
                      </div>
                    )}

                    {/* 2. LOGS TERMINAL */}
                    {activeTab === "logs" && (
                      <LogsTerminal logs={logs} activeBotTab={activeBotTab} />
                    )}

                    {/* 3. LỊCH SỬ GIAO DỊCH */}
                    {activeTab === "history" && (
                      <HistoryTable closedPositions={closedPositions} />
                    )}

                    {/* 4. BẢNG VỊ THẾ */}
                    {activeTab === "positions" && (
                      <PositionsTable
                        watchlistCoins={watchlistCoins}
                        safePos={safePos}
                        positions={positions}
                        activePairs={activePairs}
                        enabledTfs={enabledTfs}
                        togglePair={togglePair}
                        handleTfToggle={handleTfToggle}
                        onSelectCoinForChart={(coinValue, mappedTf) => {
                          updateChartConfig(activeChartIndex, { coin: coinValue, tf: mappedTf });
                          if (!isSplitView) {
                            setActiveTab("charts");
                          }
                          setTimeout(() => window.dispatchEvent(new Event("resize")), 40);
                        }}
                        onCloseTicket={handleClosePosition}
                        coinList={COIN_LIST}
                      />
                    )}
                  </div>
                </section>
              </main>
            </div>
          </div>
        </div>
      </div>

      {/* SYSTEM SETTINGS MODAL */}
      <SystemSettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        activeBotTab={activeBotTab}
        isRunning={isRunning}
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onAssignAccount={handleAssignAccountToActiveBot}
        botAccountMap={botAccountMap}
        onCreateAccount={() => {
          setApiKey("");
          setSecretKey("");
          setPassphrase("");
          setNewAccountInput("");
          setShowAddAccountModal(true);
        }}
        onDeleteAccount={() => setShowDeleteAccountModal(true)}
        apiKey={apiKey}
        setApiKey={setApiKey}
        secretKey={secretKey}
        setSecretKey={setSecretKey}
        passphrase={passphrase}
        setPassphrase={setPassphrase}
        handleResetCapital={handleResetCapital}
        handleResetNen={handleResetNen}
        hwid={hwid}
        loginUid={currentUid}
        isSavingConfig={isSavingConfig}
        onSaveApiKey={handleSaveApiKey}
        watchlistCoins={watchlistCoins}
        onToggleWatchlistCoin={handleToggleWatchlistCoin}
        safePos={safePos}
        risk={risk}
        setRisk={setRisk}
        strat={strat}
        setStrat={setStrat}
        smcEntryCfg={smcEntryCfg}
        setSmcEntryCfg={setSmcEntryCfg}
        entryCfg={entryCfg}
        setEntryCfg={setEntryCfg}
        onResetDefaultStrat={handleResetDefaultStrat}
        onSaveStratConfig={handleSaveStratConfig}
        onLogout={handleLogout}
        onToggleMultiplyVolume={handleToggleMultiplyVolume}
      />


      {/* CREATE ACCOUNT MODAL */}
      <AddAccountModal
        isOpen={showAddAccountModal}
        onClose={() => { setShowAddAccountModal(false); setNewAccountInput(""); }}
        value={newAccountInput}
        onChange={setNewAccountInput}
        isLoading={isCreatingAccount}
        onConfirm={confirmCreateAccount}
      />

      {/* DELETE ACCOUNT MODAL */}
      <DeleteAccountModal
        isOpen={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        accountName={accounts.find(a => a.id === selectedAccount)?.name || selectedAccount}
        isMultiple={accounts.length > 1}
        isLoading={isDeletingAccount}
        onConfirm={confirmDeleteAccount}
      />


    </div>
  );
}

export default App;
