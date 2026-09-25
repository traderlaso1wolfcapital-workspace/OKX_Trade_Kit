import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { COIN_LIST, ADMIN_UID } from "./constants/tradeConfig";
import { renderLayoutIcon } from "./components/common/LayoutIcons";
import AppHeader from "./components/header/AppHeader";
import SidebarLeft from "./components/sidebar/SidebarLeft";
import SingleChartPane from "./components/chart/SingleChartPane";
import PositionsTable from "./components/positions/PositionsTable";
import LogsTerminal from "./components/terminal/LogsTerminal";
import HistoryTable from "./components/history/HistoryTable";
import SystemSettingsModal from "./components/modals/SystemSettingsModal";
import ConnectModal from "./components/modals/ConnectModal";
import LanguageSelector from "./components/common/LanguageSelector";
import { useTranslation } from "./i18n";
import { AddAccountModal, DeleteAccountModal } from "./components/modals/AccountPromptModals";
import useBotWebSocket from "./hooks/useBotWebSocket";
import "./App.css";

function App() {
  const { t } = useTranslation();
  // 1. Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(localStorage.getItem("tls1_auth") === "true");
  const [loginUid, setLoginUid] = useState("");
  const [okxUid, setOkxUid] = useState(() => localStorage.getItem("tls1_uid") || "");
  const [authStep, setAuthStep] = useState("uid");
  const [adminPassword, setAdminPassword] = useState("");
  const [adminConfirmPassword, setAdminConfirmPassword] = useState("");
  const [loginPassphrase, setLoginPassphrase] = useState("");
  const [lockMessage, setLockMessage] = useState("");
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [fastConnectStatus, setFastConnectStatus] = useState(null);
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

  const effectiveAccId = useMemo(() => {
    if (botAccountMap[activeBotTab] && accounts.some(a => a.id === botAccountMap[activeBotTab])) {
      return botAccountMap[activeBotTab];
    }
    return accounts.length > 0 ? accounts[0].id : "";
  }, [botAccountMap, activeBotTab, accounts]);

  const [selectedAccount, setSelectedAccount] = useState(effectiveAccId);

  const handleAssignAccountToActiveBot = useCallback((accId) => {
    setSelectedAccount(accId);
    setBotAccountMap(prev => {
      const next = { ...prev, [activeBotTab]: accId };
      localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
      return next;
    });

    if (accId) {
      const curUid = localStorage.getItem("tls1_uid") || loginUid || "default";
      fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${accId}&uid=${curUid}`)
        .then(r => r.ok ? r.json() : null)
        .then(d => {
          if (d) {
            setApiKey(d.api_key || "");
            setSecretKey(d.secret_key || "");
            setPassphrase(d.passphrase || "");
          }
        })
        .catch(() => {});
    }
  }, [activeBotTab, loginUid]);

  useEffect(() => {
    localStorage.setItem("tls1_active_bot_tab", activeBotTab);
    const assigned = botAccountMap[activeBotTab];
    if (assigned && accounts.some(a => a.id === assigned)) {
      setSelectedAccount(assigned);
    }
  }, [activeBotTab]);

  // 5. Real-time Bot Data via WebSocket (replaces HTTP polling for status, positions, balance)
  const currentUid = localStorage.getItem("tls1_uid") || loginUid;
  const {
    botStatus,
    setBotStatus,
    activeAccounts: wsActiveAccounts,
    positions,
    setPositions,
    closedPositions,
    setClosedPositions,
    refresh: refreshBotData,
  } = useBotWebSocket(currentUid, activeBotTab, effectiveAccId);

  const [httpActiveAccounts, setHttpActiveAccounts] = useState({});

  const mergedActiveAccounts = useMemo(() => {
    return { ...(httpActiveAccounts || {}), ...(wsActiveAccounts || {}) };
  }, [wsActiveAccounts, httpActiveAccounts]);

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
  const [chartRatio, setChartRatio] = useState(70); // Mặc định 30-70 (Biểu đồ 70% - Bảng vị thế 30%)
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
      window.dispatchEvent(new Event("resize"));
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

  // Bootstrap accounts & credentials unconditionally on mount
  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        const uidToUse = localStorage.getItem("tls1_uid") || loginUid || "default";
        const resAcc = await fetch(`/api/bot/accounts?uid=${uidToUse}`);
        let accList = [];
        if (resAcc.ok) {
          const data = await resAcc.json();
          if (Array.isArray(data) && data.length > 0) {
            accList = data;
            if (isMounted) {
              setAccounts(data);
              localStorage.setItem("tls1_accounts", JSON.stringify(data));
            }
          }
        }

        let targetAcc = "";
        try {
          const savedMap = JSON.parse(localStorage.getItem("tls1_bot_accounts") || "{}");
          if (savedMap[activeBotTab] && accList.some(a => a.id === savedMap[activeBotTab])) {
            targetAcc = savedMap[activeBotTab];
          }
        } catch { }
        if (!targetAcc && accList.length > 0) {
          targetAcc = accList[0].id;
        }

        if (targetAcc && isMounted) {
          setSelectedAccount(targetAcc);
          setBotAccountMap(prev => {
            const next = { ...prev, [activeBotTab]: targetAcc };
            localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
            return next;
          });
        }

        if (!targetAcc) {
          if (isMounted) {
            setApiKey("");
            setSecretKey("");
            setPassphrase("");
          }
        } else {
          const resCred = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${uidToUse}`);
          if (resCred.ok) {
            const credData = await resCred.json();
            if (isMounted) {
              setApiKey(credData.api_key || "");
              setSecretKey(credData.secret_key || "");
              setPassphrase(credData.passphrase || "");
              if (credData.okx_uid || credData.main_uid || credData.detected_uid) {
                const masterUid = credData.okx_uid || credData.main_uid || credData.detected_uid;
                setOkxUid(masterUid);
                localStorage.setItem("tls1_uid", masterUid);
                setLoginUid(masterUid);
              }
              setIsAuthenticated(true);
              localStorage.setItem("tls1_auth", "true");
            }
          }
        }
      } catch (e) {
        console.error("Auto bootstrap error:", e);
      }
    };
    bootstrap();
    return () => { isMounted = false; };
  }, [activeBotTab]);

  // Load account credentials
  useEffect(() => {
    const fetchCreds = async () => {
      try {
        const targetAcc = selectedAccount || effectiveAccId || activeBotTab;
        const uidToUse = currentUid || localStorage.getItem('tls1_uid') || 'default';
        const r = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${uidToUse}`);
        if (r.ok) {
          const d = await r.json();
          setApiKey(d.api_key || "");
          setSecretKey(d.secret_key || "");
          setPassphrase(d.passphrase || "");
          if (d.okx_uid || d.main_uid || d.detected_uid) {
            const masterUid = d.okx_uid || d.main_uid || d.detected_uid;
            setOkxUid(masterUid);
            localStorage.setItem("tls1_uid", masterUid);
            setLoginUid(masterUid);
          }
          if ((d.api_key || d.secret_key || d.passphrase) && !isAuthenticated) {
            setIsAuthenticated(true);
            localStorage.setItem("tls1_auth", "true");
          }
        }
      } catch { }
    };
    fetchCreds();
  }, [activeBotTab, selectedAccount, effectiveAccId, currentUid, showSettings]);

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
      .catch(() => { });
  }, [isAuthenticated, activeBotTab, currentUid]);

  // Load admin closed positions for backtest stats
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch(`/api/bot/closed_positions?strategy=${activeBotTab}&uid=${ADMIN_UID}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data)) setAdminClosedPositions(data);
      })
      .catch(() => { });
  }, [isAuthenticated, activeBotTab]);

  // Load accounts list
  useEffect(() => {
    const curUid = currentUid || localStorage.getItem('tls1_uid') || 'default';
    fetch(`/api/bot/accounts?uid=${curUid}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          setAccounts(data);
          localStorage.setItem("tls1_accounts", JSON.stringify(data));
        }
      })
      .catch(() => { });
  }, [currentUid]);

  // Start shadow bot in background
  useEffect(() => {
    if (!isAuthenticated || !currentUid) return;
    fetch(`/api/bot/shadow/start?uid=${currentUid}&strategy=${activeBotTab}`, { method: 'POST' }).catch(() => { });
  }, [isAuthenticated, activeBotTab, currentUid]);

  // 10. WebSocket Logs Terminal stream (with full multi-bot buffer, no line clipping!)
  useEffect(() => {
    let isMounted = true;
    let ws = null;

    const connectWS = () => {
      if (!isMounted) return;
      const safeUid = currentUid || localStorage.getItem('tls1_uid') || 'default';
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${safeUid}/${activeBotTab}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setLogs(prev => {
          if (prev.length <= 1 && (prev.length === 0 || prev[0] === "Đang kết nối với TLS1 Trading Web Terminal Server...")) {
            return [{ id: Date.now(), lines: [`✅ Đã kết nối với TLS1 Trading Web Terminal Server [${activeBotTab.toUpperCase()}]`] }];
          }
          return prev;
        });
      };

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
  }, [activeBotTab, currentUid]);

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
      const pathname = window.location.pathname.replace(/\/$/, "");
      if (pathname === "/okx-callback") {
        // Hỗ trợ cả query string (?code=...) và fragment hash (#code=...) trên mobile
        const search = window.location.search || window.location.hash.replace("#", "?");
        const urlParams = new URLSearchParams(search);
        const code = urlParams.get("code");
        const stateParam = urlParams.get("state");
        const errorParam = urlParams.get("error");
        const errorMsg = urlParams.get("error_msg");
        
        let callbackUid = currentUid;
        let callbackAcc = effectiveAccId;
        let callbackStrat = activeBotTab || "sub1";
        let callbackPwa = false;
        
        if (stateParam) {
           try {
              let base64 = stateParam.replace(/-/g, '+').replace(/_/g, '/');
              while (base64.length % 4) {
                base64 += '=';
              }
              const jsonString = atob(base64);
              const parsedState = JSON.parse(jsonString);
              
              if (parsedState.u) callbackUid = parsedState.u;
              if (parsedState.a) callbackAcc = parsedState.a;
              if (parsedState.s) callbackStrat = parsedState.s;
              if (parsedState.p) callbackPwa = parsedState.p;
           } catch (e) {
              console.error("Failed to parse state", e);
              // Attempt to recover from localStorage
              const savedState = localStorage.getItem("okx_oauth_state_raw");
              if (savedState) {
                 try {
                    const parsedState = JSON.parse(savedState);
                    if (parsedState.u) callbackUid = parsedState.u;
                    if (parsedState.a) callbackAcc = parsedState.a;
                    if (parsedState.s) callbackStrat = parsedState.s;
                    if (parsedState.p) callbackPwa = parsedState.p;
                 } catch(e2) {}
              } else {
                 setFastConnectStatus({ type: "error", msg: "Lỗi đọc dữ liệu trạng thái OKX. Vui lòng thử kết nối lại." });
              }
           }
        }

        if (errorParam) {
           setFastConnectStatus({ type: "error", msg: "OKX từ chối kết nối: " + (errorMsg || errorParam) });
           window.history.replaceState({}, document.title, "/");
           return;
        }

        if (code) {
           const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
          try {
            let acc = callbackAcc;
            const strat = callbackStrat;

            if (!acc) {
              acc = `sub_${Date.now()}`;
              const cleanName = "Tài khoản 1";
              const newAcc = { id: acc, name: cleanName };

              setAccounts(prev => {
                const next = [...prev, newAcc];
                localStorage.setItem("tls1_accounts", JSON.stringify(next));
                return next;
              });
              setSelectedAccount(acc);
              setBotAccountMap(prev => {
                const next = { ...prev, [strat]: acc };
                localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
                return next;
              });

              try {
                if (callbackUid) {
                  await fetch(`/api/bot/accounts?uid=${callbackUid}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ id: acc, name: cleanName })
                  });
                }
              } catch (e) { }
            }

            addSystemLog("⏳ [FAST CONNECT] Đang xác thực với OKX...");
            setFastConnectStatus({ type: "info", msg: "Đang xử lý cấp quyền từ OKX, vui lòng chờ..." });
            
            const res = await fetch("/api/auth/okx/callback", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                code,
                account_id: acc,
                uid: callbackUid || "",
                strategy: strat
              })
            });
            const data = await res.json();
            if (res.ok && data.status === "success") {
              const newUid = data.detected_uid || callbackUid;
              if (newUid && (!isAuthenticated || callbackUid !== newUid)) {
                 setIsAuthenticated(true);
                 setLoginUid(newUid);
                 localStorage.setItem("tls1_auth", "true");
                 localStorage.setItem("tls1_uid", newUid);
                 callbackUid = newUid;
              }

              if (data.accounts && Array.isArray(data.accounts)) {
                setAccounts(data.accounts);
                localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
              }
              const accDisplayName = data.detected_name || (accounts.find(a => a.id === acc)?.name) || "Tài khoản";
              
              const successMsg = (!isStandalone && callbackPwa) 
                 ? `✅ Kết nối thành công! Vui lòng ĐÓNG trang này (nhấn Xong/Done) để quay lại ứng dụng.`
                 : `Kết nối OKX Fast Connect thành công: [${accDisplayName}]!`;
              
              setFastConnectStatus({ type: "success", msg: successMsg });
              addSystemLog(`✅ [FAST CONNECT] Lấy API Key thành công cho tài khoản "${accDisplayName}"`);
              // Reload credentials
              const credRes = await fetch(`/api/bot/credentials?strategy=${strat}&account_id=${acc}&uid=${callbackUid}`);
              if (credRes.ok) {
                const credData = await credRes.json();
                setApiKey(credData.api_key || "");
                setSecretKey(credData.secret_key || "");
                setPassphrase(credData.passphrase || "");
              }
              refreshBotData();
            } else {
              setFastConnectStatus({ type: "error", msg: (data.message || "Lỗi máy chủ khi kết nối OKX") });
              addSystemLog("❌ [FAST CONNECT] Lỗi: " + (data.message || "Lỗi máy chủ"));
            }
          } catch (err) {
            setFastConnectStatus({ type: "error", msg: "Lỗi kết nối server: " + err.message });
          } finally {
            // Clean up URL
            window.history.replaceState({}, document.title, "/");
          }
        } else if (!code) {
          setFastConnectStatus({ type: "error", msg: "Không nhận được mã xác thực (code) từ OKX. Vui lòng thử lại." });
          window.history.replaceState({}, document.title, "/");
        }
      }
    };

    const pathname = window.location.pathname.replace(/\/$/, "");
    if (isAuthenticated || pathname === "/okx-callback") {
      handleCallback();
    }
  }, [isAuthenticated, currentUid, effectiveAccId, activeBotTab]);

  // Fast Connect OAuth State
  const [okxOAuthUrl, setOkxOAuthUrl] = useState("");
  const [okxOAuthState, setOkxOAuthState] = useState("");

  useEffect(() => {
    if (showConnectModal) {
      const clientId = "6038d061f79a421ea44b3d1777bbef5dBRWpzwlb";
      const redirectUri = encodeURIComponent("https://autotrader.fun/okx-callback");
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      const stateObj = { uid: currentUid, acc: effectiveAccId, strat: activeBotTab || "sub1", pwa: isStandalone };
      const stateJson = JSON.stringify(stateObj);
      const state = btoa(stateJson).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      setOkxOAuthState(state);
      localStorage.setItem("okx_oauth_state_raw", stateJson);
      setOkxOAuthUrl(`https://www.okx.com/vi/account/oauth?response_type=code&access_type=offline&client_id=${clientId}&redirect_uri=${redirectUri}&scope=fast_api&state=${state}&authLogout=1`);
    }
  }, [showConnectModal, currentUid, effectiveAccId, activeBotTab]);

  const handleFastConnectClick = () => {
    localStorage.setItem("okx_oauth_state", okxOAuthState);
  };


  const handleConnectApiKey = async (uid, inputApiKey, inputSecretKey, inputPassphrase) => {
    const cleanApiKey = inputApiKey?.trim() || "";
    const cleanSecretKey = inputSecretKey?.trim() || "";
    const cleanPassphrase = inputPassphrase?.trim() || "";

    if (!cleanApiKey || !cleanSecretKey || !cleanPassphrase) {
      setFastConnectStatus({ type: "error", msg: "Vui lòng nhập đầy đủ API Key, Secret Key và Passphrase!" });
      return;
    }

    try {
      let targetAcc = selectedAccount || effectiveAccId;
      if (!targetAcc) {
        targetAcc = `sub_${Date.now()}`;
      }

      const curUid = uid || currentUid || localStorage.getItem("tls1_uid") || "default";
      const res = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${curUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: cleanApiKey, secret_key: cleanSecretKey, passphrase: cleanPassphrase, okx_uid: curUid })
      });
      const data = await res.json();
      if (!res.ok) {
        setFastConnectStatus({ type: "error", msg: data.detail || "Không thể kết nối API Key" });
        return;
      }
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
      }
      setIsAuthenticated(true);
      localStorage.setItem("tls1_auth", "true");

      const savedUid = data.detected_uid || curUid;
      if (savedUid) {
        localStorage.setItem("tls1_uid", savedUid);
        setLoginUid(savedUid);
        setOkxUid(savedUid);
      }
      if (data.detected_name) {
        localStorage.setItem("tls1_last_detected_acc", data.detected_name);
      }

      setSelectedAccount(targetAcc);
      handleAssignAccountToActiveBot(targetAcc);

      setApiKey(cleanApiKey);
      setSecretKey(cleanSecretKey);
      setPassphrase(cleanPassphrase);
      
      const accDisplayName = data.detected_name || (data.accounts && data.accounts.find(a => a.id === targetAcc)?.name) || (accounts.find(a => a.id === targetAcc)?.name) || "Tài khoản";
      setFastConnectStatus({ type: "success", msg: `Kết nối API Key thành công cho [${accDisplayName}]!` });
      addSystemLog(`🔑 [SYSTEM] Đã kết nối API Key OKX cho tài khoản "${accDisplayName}"`);
      setShowConnectModal(false);
      refreshBotData();
    } catch (e) {
      setFastConnectStatus({ type: "error", msg: `Lỗi kết nối: ${e.message}` });
    }
  };

  // Bot Start / Stop Handlers
  const handleStartBotClick = () => {
    if (!isAuthenticated || !apiKey || !secretKey || !passphrase) {
      setShowConnectModal(true);
    } else {
      handleStartBot();
    }
  };

  const handleStartBot = async () => {
    if (isStartingBot || isStoppingBot) return;
    const currentAcc = effectiveAccId;
    if (!currentAcc || accounts.length === 0) {
      alert("⚠️ Vui lòng cấu hình API Key OKX trong phần Cài Đặt (hoặc Connect) trước khi chạy bot!");
      setShowSettings(true);
      setSettingsTab("api");
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
        addSystemLog(`🚀 [BOT] Đã khởi động ${activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot"} với tài khoản ${accounts.find(a => a.id === currentAcc)?.name || currentAcc}${cleanMsg}`);
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
    const targetAccountId = selectedAccount;
    if (!targetAccountId) {
      setShowDeleteAccountModal(false);
      return;
    }
    const isRunning = Object.values(mergedActiveAccounts || {}).includes(targetAccountId);
    if (isRunning) {
      const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === targetAccountId)?.[0];
      const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
      alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản!`);
      setShowDeleteAccountModal(false);
      return;
    }
    setIsDeletingAccount(true);
    await new Promise(resolve => setTimeout(resolve, 1200));

    const currentAcc = accounts.find(a => a.id === targetAccountId);
    const accName = currentAcc?.name || targetAccountId;

    // Luôn dọn sạch API Key hiển thị ở giao diện và chuyển vùng chọn về rỗng
    setApiKey("");
    setSecretKey("");
    setPassphrase("");
    setSelectedAccount("");

    if (accounts.length > 1) {
      const updatedList = accounts.filter(a => a.id !== targetAccountId);
      setAccounts(updatedList);
      localStorage.setItem("tls1_accounts", JSON.stringify(updatedList));
      setBotAccountMap(prev => {
        const next = { ...prev };
        for (const k in next) {
          if (next[k] === targetAccountId) next[k] = "";
        }
        localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
        return next;
      });
      setShowDeleteAccountModal(false);
      addSystemLog(`🗑️ [ACCOUNT] Đã xoá tài khoản: "${accName}"`);
    } else {
      setAccounts([]);
      localStorage.setItem("tls1_accounts", JSON.stringify([]));
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

  const handleDisconnectSpecificAccount = async (targetAccountId) => {
    if (!targetAccountId) return;
    const isRunning = Object.values(mergedActiveAccounts || {}).includes(targetAccountId);
    if (isRunning) {
      const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === targetAccountId)?.[0];
      const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
      alert(`⚠️ Không thể ngắt kết nối tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi ngắt kết nối!`);
      return;
    }
    const currentAcc = accounts.find(a => a.id === targetAccountId);
    const accName = currentAcc?.name || targetAccountId;
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt kết nối tài khoản OKX "${accName}" không?`)) {
      return;
    }

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
      addSystemLog(`🔌 [ACCOUNT] Đã ngắt kết nối tài khoản: "${accName}"`);
    } else {
      setApiKey("");
      setSecretKey("");
      setPassphrase("");
      setAccounts([]);
      localStorage.setItem("tls1_accounts", JSON.stringify([]));
      setSelectedAccount("");
      setBotAccountMap({});
      localStorage.setItem("tls1_bot_accounts", JSON.stringify({}));
      setIsAuthenticated(false);
      localStorage.removeItem("tls1_auth");
      addSystemLog(`🔌 [ACCOUNT] Đã ngắt kết nối tài khoản OKX cuối cùng`);
    }

    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      await fetch(`/api/bot/accounts/${targetAccountId}?uid=${curUid}`, { method: "DELETE" });
    } catch { }
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
    const cleanApiKey = apiKey?.trim() || "";
    const cleanSecretKey = secretKey?.trim() || "";
    const cleanPassphrase = passphrase?.trim() || "";

    if (!cleanApiKey || !cleanSecretKey || !cleanPassphrase) {
      alert("⚠️ Vui lòng nhập đầy đủ Mã API (API Key), Khóa Bí Mật (Secret) và Cụm Mật Khẩu (Passphrase)!");
      return;
    }

    if (!selectedAccount || accounts.length === 0) {
      alert("⚠️ Vui lòng chọn hoặc tạo tài khoản trước khi lưu API Key!");
      return;
    }
    let targetAcc = selectedAccount;

    setIsSavingConfig(true);
    await new Promise(resolve => setTimeout(resolve, 800));
    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      const res = await fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${targetAcc}&uid=${curUid}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: cleanApiKey, secret_key: cleanSecretKey, passphrase: cleanPassphrase, okx_uid: okxUid || curUid })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(`❌ Lỗi: ${data.detail || "Không thể lưu API Key"}`);
        setIsSavingConfig(false);
        return;
      }
      if (data.detected_uid) {
        localStorage.setItem("tls1_uid", data.detected_uid);
        setOkxUid(data.detected_uid);
        setLoginUid(data.detected_uid);
      }
      if (data.accounts && Array.isArray(data.accounts)) {
        setAccounts(data.accounts);
        localStorage.setItem("tls1_accounts", JSON.stringify(data.accounts));
      }
      setSelectedAccount(targetAcc);
      handleAssignAccountToActiveBot(targetAcc);
      setIsAuthenticated(true);
      localStorage.setItem("tls1_auth", "true");

      setApiKey(cleanApiKey);
      setSecretKey(cleanSecretKey);
      setPassphrase(cleanPassphrase);

      const curAccName = data.detected_name || (data.accounts && data.accounts.find(a => a.id === targetAcc)?.name) || accounts.find(a => a.id === targetAcc)?.name || targetAcc;
      alert(`Đã lưu cấu hình API Key cho [${curAccName}] thành công!`);
      addSystemLog(`🔑 [SYSTEM] Đã lưu cấu hình API Key cho tài khoản "${curAccName}"`);
      refreshBotData();
    } catch (e) {
      alert(`Lỗi kết nối khi lưu API Key: ${e.message}`);
    }
    setIsSavingConfig(false);
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

      const curBotName = activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot";
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
        alert(`✅ Đã khôi phục Cấu Hình Mặc Định cho EMA200 Bot thành công!${cancelMsg}`);
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định EMA200 Bot: Ký quỹ 1$, Lưới Đa Khung, Đồng pha BTC, XAU/BTC/ETH${cancelMsg}`);
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
        alert(`✅ Đã khôi phục Cấu Hình Mặc Định cho SMC Bot thành công!${cancelMsg}`);
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định SMC Bot${cancelMsg}`);
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

  const handleLogout = async () => {
    const curUid = okxUid || currentUid || localStorage.getItem("tls1_uid") || "default";
    try {
      await fetch(`/api/auth/logout?uid=${curUid}`, { method: "POST" });
    } catch { }
    localStorage.removeItem("tls1_auth");
    localStorage.removeItem("tls1_uid");
    localStorage.removeItem("tls1_accounts");
    localStorage.removeItem("tls1_bot_accounts");
    localStorage.removeItem("tls1_last_detected_acc");
    setAccounts([]);
    setSelectedAccount("");
    setApiKey("");
    setSecretKey("");
    setPassphrase("");
    setOkxUid("");
    setLoginUid("");
    setIsAuthenticated(false);
    setBotAccountMap({});
    window.location.reload();
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
          if (d?.active_accounts) setHttpActiveAccounts(d.active_accounts);
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
        const targetAcc = selectedAccount;
        if (!targetAcc) {
          setApiKey("");
          setSecretKey("");
          setPassphrase("");
          return;
        }
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
    
    // Thêm listener để tải lại thông tin credentials khi người dùng quay lại PWA từ Safari/OKX App
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchCreds();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => { 
      clearInterval(s); 
      clearInterval(p); 
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, activeBotTab, selectedAccount, botAccountMap, loginUid, effectiveAccId, fetchPositions]);


  // Render main UI directly instead of blocking with LoginModal

  const isRunning = overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING");

  return (
    <div className="app-container">
      {lockMessage && (
        <div style={{ background: "#c0392b", color: "#fff", padding: "10px 16px", fontSize: "14px", fontWeight: "bold", textAlign: "center", zIndex: 9999, position: "fixed", top: 0, left: 0, right: 0 }}>
          {lockMessage}
        </div>
      )}

      <ConnectModal
        isOpen={showConnectModal}
        onClose={() => setShowConnectModal(false)}
        handleFastConnectClick={handleFastConnectClick}
        okxOAuthUrl={okxOAuthUrl}
        onSaveApiKey={handleSaveApiKey}
        isAuthenticated={isAuthenticated}
        currentUid={okxUid || currentUid || localStorage.getItem("tls1_uid") || "523019992975987626"}
        accounts={accounts}
        selectedAccount={selectedAccount}
        activeBotTab={activeBotTab}
        onAssignAccount={handleAssignAccountToActiveBot}
        onCreateAccount={() => {
          setNewAccountInput("");
          setShowAddAccountModal(true);
        }}
        onDeleteAccount={() => {
          if (!selectedAccount || accounts.length === 0) {
            alert("⚠️ Vui lòng chọn tài khoản cần xoá!");
            return;
          }
          const isRunning = Object.values(mergedActiveAccounts || {}).includes(selectedAccount);
          if (isRunning) {
            const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === selectedAccount)?.[0];
            const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
            alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản để bảo vệ an toàn vốn!`);
            return;
          }
          setShowDeleteAccountModal(true);
        }}
        activeAccounts={mergedActiveAccounts}
        botAccountMap={botAccountMap}
        apiKey={apiKey}
        setApiKey={setApiKey}
        secretKey={secretKey}
        setSecretKey={setSecretKey}
        passphrase={passphrase}
        setPassphrase={setPassphrase}
        isSavingConfig={isSavingConfig}
        accountName={accounts.find(a => a.id === effectiveAccId)?.name || (accounts.length > 0 ? accounts[0].name : "") || localStorage.getItem("tls1_last_detected_acc") || ""}
        onDisconnectAccount={handleDisconnectSpecificAccount}
        onLogout={handleLogout}
      />

      <div className={`content-wrapper ${fadeClass}`}>
        {/* SIDEBAR LEFT */}
        <SidebarLeft
          activeBotTab={activeBotTab}
          effectiveAccId={effectiveAccId}
          accounts={accounts}
          botAccountMap={botAccountMap}
          activeAccounts={mergedActiveAccounts}
          onAssignAccount={handleAssignAccountToActiveBot}
          onOpenSettings={() => { setShowSettings(true); setSettingsTab("strategy"); }}
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
                  {t("starting_bot")}
                </button>
              ) : isStoppingBot ? (
                <button
                  disabled
                  className="btn-action-stop btn-action-loading"
                  style={{ width: "fit-content" }}
                >
                  <span className="spinner" style={{ width: "13px", height: "13px", margin: "0 8px 0 0", borderWidth: "2px" }}></span>
                  {t("stopping_bot")}
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
                  <span>{t("stop_bot")}</span>
                </button>
              ) : (
                <button
                  onClick={handleStartBotClick}
                  className="btn-action-start"
                  style={{ width: "fit-content" }}
                >
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="#ffffff" style={{ flexShrink: 0 }}>
                    <path d="M 2.5 1.5 C 2.5 0.9 3.2 0.5 3.7 0.8 L 10.5 5.3 C 11.0 5.6 11.0 6.4 10.5 6.7 L 3.7 11.2 C 3.2 11.5 2.5 11.1 2.5 10.5 Z" />
                  </svg>
                  <span>{t("start_bot")}</span>
                </button>
              )}
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="btn-connect-okx"
                  title="Connect"
                >
                  <span>Connect</span>
                </button>
                <LanguageSelector />
              </div>
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
                        {t("positions_tab")} ({safePos.length})
                      </button>
                      <button
                        className={`tab-btn ${activeTab === "logs" ? "active" : ""}`}
                        onClick={() => setActiveTab("logs")}
                      >
                        {t("logs_tab")}
                      </button>
                      <button
                        className={`tab-btn ${activeTab === "charts" ? "active" : ""}`}
                        onClick={() => {
                          setActiveTab("charts");
                          setTimeout(() => window.dispatchEvent(new Event("resize")), 40);
                        }}
                      >
                        {t("chart_tab")}
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
                        <p style={{ fontSize: "13px", marginBottom: "8px" }}>{t("chart_in_split_pane")}</p>
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
                          {t("view_positions_btn")}
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
        activeAccounts={mergedActiveAccounts}
        onCreateAccount={() => {
          setNewAccountInput("");
          setShowAddAccountModal(true);
        }}
        onDeleteAccount={() => {
          if (!selectedAccount || accounts.length === 0) {
            alert("⚠️ Vui lòng chọn tài khoản cần xoá!");
            return;
          }
          const isRunning = Object.values(mergedActiveAccounts || {}).includes(selectedAccount);
          if (isRunning) {
            const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === selectedAccount)?.[0];
            const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
            alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản để bảo vệ an toàn vốn!`);
            return;
          }
          setShowDeleteAccountModal(true);
        }}
        okxUid={okxUid}
        setOkxUid={setOkxUid}
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
        isAuthenticated={isAuthenticated}
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


      {/* FAST CONNECT OVERLAY */}
      {fastConnectStatus && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.75)",
            zIndex: 99999,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            color: "#fff",
            padding: "16px",
            textAlign: "center",
            backdropFilter: "blur(4px)",
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && fastConnectStatus.type !== "info") {
              setFastConnectStatus(null);
            }
          }}
        >
          <div
            style={{
              background: "#222222",
              padding: "24px 20px",
              borderRadius: "6px",
              maxWidth: "360px",
              width: "100%",
              border: `1px solid ${fastConnectStatus.type === "error" ? "rgba(239, 68, 68, 0.4)" : fastConnectStatus.type === "success" ? "rgba(38, 166, 154, 0.4)" : "#333333"}`,
              boxShadow: "0 10px 30px rgba(0, 0, 0, 0.6)",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                background:
                  fastConnectStatus.type === "error"
                    ? "rgba(239, 68, 68, 0.12)"
                    : fastConnectStatus.type === "success"
                    ? "rgba(38, 166, 154, 0.15)"
                    : "rgba(255, 153, 0, 0.12)",
                color:
                  fastConnectStatus.type === "error"
                    ? "#ef4444"
                    : fastConnectStatus.type === "success"
                    ? "#26a69a"
                    : "#ff9900",
                marginBottom: "12px",
                fontSize: "20px",
                fontWeight: "bold",
              }}
            >
              {fastConnectStatus.type === "error" ? "✕" : fastConnectStatus.type === "success" ? "✓" : "⏳"}
            </div>

            <h3
              style={{
                margin: "0 0 8px 0",
                fontSize: "15px",
                fontWeight: "700",
                color:
                  fastConnectStatus.type === "error"
                    ? "#ef4444"
                    : fastConnectStatus.type === "success"
                    ? "#26a69a"
                    : "#ffffff",
              }}
            >
              {fastConnectStatus.type === "error"
                ? "Lỗi Kết Nối"
                : fastConnectStatus.type === "success"
                ? "Thành Công"
                : "Đang Xử Lý..."}
            </h3>

            <p
              style={{
                fontSize: "13px",
                lineHeight: "1.5",
                color: "#cccccc",
                margin: "0 0 20px 0",
                wordBreak: "break-word",
              }}
            >
              {fastConnectStatus.msg}
            </p>

            {fastConnectStatus.type !== "info" && (
              <button
                type="button"
                onClick={() => setFastConnectStatus(null)}
                style={{
                  padding: "8px 20px",
                  background:
                    fastConnectStatus.type === "error"
                      ? "#333333"
                      : "#2e7d32",
                  color: "#ffffff",
                  border:
                    fastConnectStatus.type === "error"
                      ? "1px solid #555555"
                      : "1px solid #388e3c",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontWeight: "bold",
                  fontSize: "13px",
                  width: "100%",
                  transition: "all 0.18s ease",
                  boxShadow:
                    fastConnectStatus.type === "success"
                      ? "0 2px 8px rgba(46, 125, 50, 0.35)"
                      : "none",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.filter = "brightness(1.0)";
                }}
              >
                Đóng
              </button>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
