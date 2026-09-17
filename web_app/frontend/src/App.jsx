import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { COIN_LIST, TF_LIST, ADMIN_UID } from "./constants/tradeConfig";
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
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [loginUid, setLoginUid] = useState("12345678");
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
    uptime,
    availBal,
    positions,
    closedPositions,
    refresh: refreshBotData,
  } = useBotWebSocket(currentUid, activeBotTab, effectiveAccId);

  const [adminClosedPositions, setAdminClosedPositions] = useState([]);
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);

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

  const [activeChartIndex, setActiveChartIndex] = useState(0);
  const [selectedCoin, setSelectedCoin] = useState("BTC-USDT-SWAP");
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

  // 7. Workspace Resizer
  const [chartRatio, setChartRatio] = useState(50);
  const layoutMode = "vertical";

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

  const [activePairs, setActivePairs] = useState([]);
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
  const [risk, setRisk] = useState({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const [strat, setStrat] = useState({
    main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
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
      setRisk({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
      setStrat({
        main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
    } else if (activeBotTab === "sub2") {
      setRisk({ posVol: 1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: false,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        timeframeBase: "1H",
      });
    } else {
      setRisk({ posVol: 1, tpPct: 1.0, slPct: 1.0, volUnit: "USDT" });
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
            slPct: d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : r.slPct
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

  // Bot Start / Stop Handlers
  const handleStartBot = async () => {
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
    if (activePairs.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất 1 Cặp giao dịch và cấu hình TF trade!");
      return;
    }

    try {
      setIsStartingBot(true);
      const r = await fetch(`/api/bot/start?uid=${currentUid}&strategy=${activeBotTab}&account_id=${currentAcc}`, { method: "POST" });
      if (r.ok) {
        addSystemLog(`🚀 [BOT] Đã khởi động ${activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot"} với tài khoản ${accounts.find(a => a.id === currentAcc)?.name || currentAcc}`);
        refreshBotData();
      } else {
        const err = await r.json();
        alert(`❌ Lỗi khởi động bot: ${err.detail || "Không rõ nguyên nhân"}`);
      }
    } catch {
      alert("Lỗi kết nối khi khởi động bot!");
    } finally {
      setIsStartingBot(false);
    }
  };

  const handleStopBot = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn DỪNG CHẠY BOT không?")) return;
    try {
      setIsStoppingBot(true);
      const r = await fetch(`/api/bot/stop?strategy=${activeBotTab}&uid=${currentUid}`, { method: "POST" });
      if (r.ok) {
        addSystemLog(`🛑 [BOT] Đã gửi lệnh dừng bot.`);
        refreshBotData();
      }
    } catch {
      alert("Lỗi dừng bot!");
    } finally {
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

  // Reset Capital & Nen
  const handleResetCapital = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn Reset Vốn Gốc (hệ thống sẽ lấy số dư hiện tại từ OKX làm Vốn Gốc mới)?")) return;
    try {
      const resp = await fetch(`/api/bot/reset_capital?uid=${currentUid}&strategy=${activeBotTab}`, { method: "POST" });
      const data = await resp.json();
      if (resp.ok) alert("✅ Đã gửi lệnh Reset Vốn Gốc (Audit) đến Bot thành công!");
      else alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
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
    await new Promise(resolve => setTimeout(resolve, 1200));
    const curBotName = activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation";
    alert(`Đã lưu Cấu Hình Chiến Thuật cho [${curBotName}] thành công!`);
    addSystemLog(`⚙️ [SYSTEM] Đã cập nhật cấu hình Chiến Thuật cho ${curBotName}`);
    setIsSavingConfig(false);
    setShowSettings(false);
  };

  const handleResetDefaultStrat = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình chiến thuật về MẶC ĐỊNH của app không?")) {
      if (activeBotTab === "sub1") {
        setRisk({ posVol: 1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT" });
        setStrat({
          main: true, pyramidDca: true, hedge: true, xole: true, dynamicEma200Tp: false,
          dynamicPingpongTp: false, altcoinFollowBtc: true,
          sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
          trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        });
      } else if (activeBotTab === "sub2") {
        setRisk({ posVol: 1, tpPct: 1.5, slPct: 1.5, volUnit: "USDT" });
        setStrat({
          main: true, xole: false, dynamicEma200Tp: false,
          dynamicPingpongTp: false, altcoinFollowBtc: false,
          sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
          trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
          timeframeBase: "1H",
        });
      } else {
        setRisk({ posVol: 1, tpPct: 1.0, slPct: 1.0, volUnit: "USDT" });
        setStrat({ main: true, timeframeBase: "1H" });
      }
      alert("Đã khôi phục cài đặt về mặc định của nhà sản xuất!");
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

  // Periodic polling
  useEffect(() => {
    if (!isAuthenticated) return;
    const fetchStatus = async () => {
      try {
        const r = await fetch(`/api/bot/status?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}`);
        if (r.ok) { 
          const d = await r.json(); 
          setBotStatus(d.status); 
          setUptime(d.uptime);
          if (d.active_accounts) setActiveBotAccounts(d.active_accounts);
        }
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
  }, [isAuthenticated, activeBotTab, selectedAccount, botAccountMap, loginUid]);

  const fetchPositions = async () => {
    try {
      const acc = effectiveAccId;
      if (!acc) return;
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
  const safeEnabledTfs = Array.isArray(enabledTfs) ? enabledTfs : [];
  const isShadow = botStatus === "SHADOW";


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

  const isRunning = botStatus === "RUNNING";

  return (
    <div className="app-container">
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
          onToggleRiskCollapse={() => setIsRiskCollapsed(!isRiskCollapsed)}
          risk={risk}
          setRisk={setRisk}
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
                  disabled={isStartingBot}
                  className="btn-action-start"
                  style={{ width: "fit-content", alignSelf: "center" }}
                >
                  {isStartingBot ? '⏳ ĐANG KHỞI ĐỘNG...' : '▶ CHẠY BOT'}
                </button>
              )}
            </div>

            {/* CHARTS & WORKSPACE CONTAINER */}
            <div className="chart-panel-card">
              <main className={`main-workspace ${layoutMode}`} style={{ '--chart-ratio': `${chartRatio}%` }}>
                {/* PANE CHART */}
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

                {/* RESIZER BAR */}
                <div
                  className="resizer horizontal-resizer"
                  onMouseDown={startResizing}
                  onTouchStart={startResizing}
                />

                {/* PANE TABS (POSITIONS & LOGS) */}
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
                    </div>
                  </div>

                  <div className="tab-content">
                    {activeTab === "logs" ? (
                      <LogsTerminal logs={logs} activeBotTab={activeBotTab} />
                    ) : activeTab === "history" ? (
                      <HistoryTable closedPositions={closedPositions} />
                    ) : (
                      <PositionsTable
                        watchlistCoins={watchlistCoins}
                        safePos={safePos}
                        positions={positions}
                        activePairs={activePairs}
                        enabledTfs={enabledTfs}
                        onTogglePair={togglePair}
                        onTfToggle={handleTfToggle}
                        onSelectCoinForChart={(coinValue, mappedTf) => {
                          updateChartConfig(activeChartIndex, { coin: coinValue, tf: mappedTf });
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
        settingsTab={settingsTab}
        setSettingsTab={setSettingsTab}
        accounts={accounts}
        selectedAccount={selectedAccount}
        onAssignAccount={handleAssignAccountToActiveBot}
        botAccountMap={botAccountMap}
        onCreateAccount={() => { setNewAccountInput(""); setShowAddAccountModal(true); }}
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
