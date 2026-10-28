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
import OnboardingTour from "./components/common/OnboardingTour";
import LanguageSelector from "./components/common/LanguageSelector";
import { useTranslation } from "./i18n";
import { getTourSteps } from "./i18n/tourData";
import { AddAccountModal, DeleteAccountModal, ConfirmStopBotModal, ApiPermissionErrorModal } from "./components/modals/AccountPromptModals";
import useBotWebSocket from "./hooks/useBotWebSocket";
import "./App.css";

const dedupeAccounts = (accList) => {
  if (!Array.isArray(accList)) return [];
  const seenIds = new Set();
  const seenOkxUids = new Set();
  return accList.filter(a => {
    const aid = a?.id;
    const aOkx = a?.okx_uid ? String(a.okx_uid).trim() : "";
    if (!aid || seenIds.has(aid)) return false;
    if (aOkx && seenOkxUids.has(aOkx)) return false;
    seenIds.add(aid);
    if (aOkx) seenOkxUids.add(aOkx);
    return true;
  });
};

function App() {
  const { lang, t } = useTranslation();
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
  const [connectModalTab, setConnectModalTab] = useState("fast");
  const [fastConnectStatus, setFastConnectStatus] = useState(null);
  const [showApiPermissionModal, setShowApiPermissionModal] = useState(false);
  const lastApiErrorPromptRef = useRef(0);
  const audioRef = useRef(null);
  const isHandlingCallbackRef = useRef(false);

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
        if (Array.isArray(parsed) && parsed.length > 0) return dedupeAccounts(parsed);
      }
    } catch { }
    return [];
  });

  const [botAccountMap, setBotAccountMap] = useState(() => {
    const saved = localStorage.getItem("tls1_bot_accounts");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          const curBot = localStorage.getItem("tls1_active_bot_tab") || "sub1";
          const curAcc = parsed[curBot];
          if (curAcc) {
            let changed = false;
            for (const b in parsed) {
              if (b !== curBot && parsed[b] === curAcc) {
                parsed[b] = "";
                changed = true;
              }
            }
            if (changed) {
              try { localStorage.setItem("tls1_bot_accounts", JSON.stringify(parsed)); } catch {}
            }
          }
          return parsed;
        }
      } catch { }
    }
    return {};
  });

  const [httpActiveAccounts, setHttpActiveAccounts] = useState({});
  const [wsActiveAccountsState, setWsActiveAccountsState] = useState({});

  const mergedActiveAccounts = useMemo(() => {
    return { ...(httpActiveAccounts || {}), ...(wsActiveAccountsState || {}) };
  }, [httpActiveAccounts, wsActiveAccountsState]);

  const [selectedAccount, setSelectedAccount] = useState(() => {
    try {
      const curBot = localStorage.getItem("tls1_active_bot_tab") || "sub1";
      const savedForBot = localStorage.getItem(`tls1_selected_account_${curBot}`);
      if (savedForBot) return savedForBot;
      const savedGlobal = localStorage.getItem("tls1_selected_account");
      if (savedGlobal) return savedGlobal;
    } catch {}
    return "";
  });

  const effectiveAccId = useMemo(() => {
    // 1. Ưu tiên tài khoản người dùng đang chọn (state hoặc localStorage) để xem vị thế & chart độc lập
    const targetCandidate = selectedAccount || localStorage.getItem(`tls1_selected_account_${activeBotTab}`) || localStorage.getItem("tls1_selected_account");
    if (targetCandidate && accounts.some(a => a.id === targetCandidate || a.name === targetCandidate)) {
      const matched = accounts.find(a => a.id === targetCandidate || a.name === targetCandidate);
      return matched ? matched.id : targetCandidate;
    }
    // 2. Fallback sang tài khoản đã gán trước đó trong botAccountMap
    if (botAccountMap[activeBotTab] && accounts.some(a => a.id === botAccountMap[activeBotTab])) {
      return botAccountMap[activeBotTab];
    }
    // 3. Fallback: Tài khoản đang chạy thực tế trên server ở tab hiện tại
    const runningAcc = mergedActiveAccounts[activeBotTab];
    if (runningAcc) {
      const matched = accounts.find(a => a.id === runningAcc || a.name === runningAcc);
      if (matched) return matched.id;
      return runningAcc;
    }
    return accounts[0]?.id || "";
  }, [selectedAccount, mergedActiveAccounts, activeBotTab, accounts, botAccountMap]);

  // 5. Real-time Bot Data via WebSocket (replaces HTTP polling for status, positions, balance)
  const currentUid = localStorage.getItem("tls1_uid") || loginUid || "";
  const {
    botStatus,
    setBotStatus,
    activeAccounts: wsActiveAccounts,
    positions: wsPositions,
    setPositions: setWsPositions,
    availBal,
    closedPositions,
    setClosedPositions,
    refresh: refreshBotData,
  } = useBotWebSocket(currentUid, activeBotTab, effectiveAccId);

  const [currentPlatform, setCurrentPlatform] = useState(() => localStorage.getItem("tls1_trading_platform") || "okx");
  const [propPositions, setPropPositions] = useState([]);
  const [propBotStatus, setPropBotStatus] = useState("STOPPED");
  const [isStartingPropBot, setIsStartingPropBot] = useState(false);
  const [isStoppingPropBot, setIsStoppingPropBot] = useState(false);
  const [overridePropBotRunning, setOverridePropBotRunning] = useState(null);
  const [propBotMap, setPropBotMap] = useState({});
  const [runningPropBots, setRunningPropBots] = useState({});
  const [propAccounts, setPropAccounts] = useState([]);
  const [activePropId, setActivePropId] = useState("");

  const fetchE8Accounts = useCallback(() => {
    const rawUid = localStorage.getItem("tls1_uid") || loginUid;
    const curUid = (rawUid && rawUid !== "undefined" && rawUid !== "null") ? rawUid : "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    fetch(`/api/tradelocker/accounts?uid=${encodeURIComponent(curUid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.status === "success" && Array.isArray(d.accounts)) {
          setPropAccounts(d.accounts);
          if (d.accounts.length > 0) {
            if (d.active_id) setActivePropId(d.active_id);
            if (d.bot_prop_map) setPropBotMap(d.bot_prop_map);
            if (d.running_prop_bots) setRunningPropBots(d.running_prop_bots);
          }
        }
      })
      .catch(() => {});
  }, [loginUid]);

  useEffect(() => {
    fetchE8Accounts();
    const handlePlatformChange = (e) => {
      if (e?.detail) setCurrentPlatform(e.detail);
    };
    const handlePropChange = (e) => {
      if (e?.detail) setActivePropId(e.detail);
      fetchE8Accounts();
    };
    window.addEventListener("tls1_platform_changed", handlePlatformChange);
    window.addEventListener("tls1_prop_account_changed", handlePropChange);
    const interval = setInterval(fetchE8Accounts, 15000);
    return () => {
      window.removeEventListener("tls1_platform_changed", handlePlatformChange);
      window.removeEventListener("tls1_prop_account_changed", handlePropChange);
      clearInterval(interval);
    };
  }, [fetchE8Accounts]);

  const handleSelectPropAccount = useCallback((accId) => {
    if (accId === "__connect__") {
      setShowConnectModal(true);
      setConnectModalTab("tradelocker");
      return;
    }
    const curUid = localStorage.getItem("tls1_uid") || loginUid || "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    fetch("/api/tradelocker/select_account", {
      method: "POST",
      headers,
      body: JSON.stringify({ uid: curUid, account_id: accId, strategy: activeBotTab })
    })
      .then((r) => r.json())
      .then((d) => {
        if (d && d.status === "success") {
          setActivePropId(accId);
          fetchE8Accounts();
          window.dispatchEvent(new CustomEvent("tls1_prop_account_changed", { detail: accId }));
        }
      })
      .catch(() => {});
  }, [loginUid, activeBotTab, fetchE8Accounts]);

  const handleSwitchPlatform = useCallback((platform) => {
    setCurrentPlatform(platform);
    try { localStorage.setItem("tls1_trading_platform", platform); } catch {}
    window.dispatchEvent(new CustomEvent("tls1_platform_changed", { detail: platform }));
  }, []);

  const handleSelectBotTab = useCallback((strat) => {
    setActiveBotTab(strat);
    try {
      localStorage.setItem("tls1_active_bot_tab", strat);
      if (effectiveAccId) {
        localStorage.setItem(`tls1_bot_strat_${effectiveAccId}`, strat);
      }
    } catch {}
  }, [effectiveAccId]);

  // Bảng vị thế: Tách riêng tuyệt đối giữa Sàn OKX và Quỹ FX, chống hoàn toàn giật/flicker
  const positions = useMemo(() => {
    return currentPlatform === "e8" ? propPositions : (wsPositions || []);
  }, [currentPlatform, propPositions, wsPositions]);

  const setPositions = useCallback((val) => {
    setWsPositions(val);
  }, [setWsPositions]);

  // Tài khoản đang chọn và Số dư thực tế tương ứng để đồng bộ vào Terminal Logs
  const currentAccountObj = useMemo(() => {
    return accounts?.find(a => a.id === effectiveAccId || a.name === effectiveAccId) || null;
  }, [accounts, effectiveAccId]);

  const accountBalance = useMemo(() => {
    const eq = Number(currentAccountObj?.totalEq ?? currentAccountObj?.equity ?? currentAccountObj?.balance ?? availBal ?? 0);
    const av = Number(availBal || currentAccountObj?.availBal || currentAccountObj?.balance || 0);
    return {
      availBal: av,
      totalEq: eq,
      balance: Number(currentAccountObj?.balance ?? eq)
    };
  }, [availBal, currentAccountObj]);

  // Cập nhật số dư realtime vào tài khoản và lưu cache localStorage
  useEffect(() => {
    if (availBal !== undefined && availBal !== null && effectiveAccId) {
      const bNum = Number(availBal);
      if (!isNaN(bNum)) {
        try {
          localStorage.setItem(`tls1_bal_${effectiveAccId}`, String(bNum));
        } catch {}
        setAccounts(prev => (prev || []).map(a => {
          if (a.id === effectiveAccId || a.name === effectiveAccId) {
            return { ...a, balance: bNum, totalEq: bNum, availBal: bNum };
          }
          return a;
        }));
      }
    }
  }, [availBal, effectiveAccId]);

  useEffect(() => {
    if (wsActiveAccounts && Object.keys(wsActiveAccounts).length > 0) {
      setWsActiveAccountsState(wsActiveAccounts);
    }
  }, [wsActiveAccounts]);

  const prevBotTabRef = useRef(activeBotTab);

  const handleAssignAccountToActiveBot = useCallback((accId) => {
    setSelectedAccount(accId);
    try {
      if (accId) {
        localStorage.setItem("tls1_selected_account", accId);
        localStorage.setItem(`tls1_selected_account_${activeBotTab}`, accId);
      } else {
        localStorage.removeItem("tls1_selected_account");
        localStorage.removeItem(`tls1_selected_account_${activeBotTab}`);
      }
    } catch {}

    // Tự động nạp cấu hình Ký quỹ / TP / SL riêng của tài khoản này từ localStorage
    if (accId) {
      try {
        const savedAccRisk = localStorage.getItem(`tls1_risk_${activeBotTab}_${accId}`);
        if (savedAccRisk) {
          const parsed = JSON.parse(savedAccRisk);
          if (parsed && typeof parsed === "object") {
            setRisk(parsed);
            prevRiskRef.current = parsed;
          }
        }
      } catch {}
    }

    // Tự động khôi phục chiến thuật bot mà tài khoản này đã chọn trước đó
    if (accId) {
      try {
        const savedStrat = localStorage.getItem(`tls1_bot_strat_${accId}`);
        if (savedStrat && ["sub1", "sub2", "sub3"].includes(savedStrat)) {
          setActiveBotTab(savedStrat);
        }
      } catch {}
    }

    // Nếu bot ở tab hiện tại CHƯA chạy, lưu gán vào botAccountMap
    // Nếu bot đang chạy, việc chọn tài khoản trong dropdown là để XEM (view) tài khoản phụ khác,
    // giữ nguyên mapping tài khoản đang chạy trên server
    const runningAcc = mergedActiveAccounts[activeBotTab];
    if (!runningAcc) {
      setBotAccountMap(prev => {
        const next = { ...prev };
        if (accId) {
          for (const b in next) {
            if (b !== activeBotTab && next[b] === accId) {
              next[b] = "";
            }
          }
        }
        next[activeBotTab] = accId;
        try { localStorage.setItem("tls1_bot_accounts", JSON.stringify(next)); } catch {}
        return next;
      });
    }

    if (accId) {
      const curUid = localStorage.getItem("tls1_uid") || loginUid;
      if (!curUid || curUid === "default") return;
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
    } else {
      setApiKey("");
      setSecretKey("");
      setPassphrase("");
      setPositions([]);
      setClosedPositions([]);
    }
  }, [activeBotTab, loginUid, mergedActiveAccounts, setPositions, setClosedPositions]);

  useEffect(() => {
    localStorage.setItem("tls1_active_bot_tab", activeBotTab);
    const isTabSwitch = prevBotTabRef.current !== activeBotTab;
    prevBotTabRef.current = activeBotTab;

    // Kiểm tra tài khoản đã chọn hiện tại (state hoặc localStorage) có hợp lệ không
    const savedForThisBot = localStorage.getItem(`tls1_selected_account_${activeBotTab}`);
    const savedGlobal = localStorage.getItem("tls1_selected_account");
    const currentCandidate = selectedAccount || savedForThisBot || savedGlobal;
    const isCandidateValid = currentCandidate && accounts.some(a => a.id === currentCandidate || a.name === currentCandidate);

    // Chỉ tự động điều chỉnh selectedAccount khi:
    // 1. Chuyển đổi tab bot VÀ tab mới chưa có tài khoản đã lưu hợp lệ
    // 2. Hoặc ban đầu chưa có tài khoản nào được chọn hợp lệ (!isCandidateValid)
    // Tuyệt đối KHÔNG ghi đè khi người dùng đang xem một tài khoản cụ thể (F5 giữ nguyên 100%)!
    if (!isCandidateValid || (isTabSwitch && !savedForThisBot)) {
      const runningAcc = mergedActiveAccounts[activeBotTab];
      let target = "";
      if (runningAcc) {
        const matched = accounts.find(a => a.id === runningAcc || a.name === runningAcc);
        target = matched ? matched.id : runningAcc;
      } else if (botAccountMap[activeBotTab] && accounts.some(a => a.id === botAccountMap[activeBotTab])) {
        target = botAccountMap[activeBotTab];
      } else if (accounts.length > 0) {
        target = accounts[0].id;
      }

      if (target) {
        setSelectedAccount(target);
        try {
          localStorage.setItem("tls1_selected_account", target);
          localStorage.setItem(`tls1_selected_account_${activeBotTab}`, target);
        } catch {}
        if (runningAcc && botAccountMap[activeBotTab] !== target) {
          setBotAccountMap(prev => {
            const next = { ...prev, [activeBotTab]: target };
            localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
            return next;
          });
        }
      } else {
        setSelectedAccount("");
        setPositions([]);
        setClosedPositions([]);
      }
    } else if (currentCandidate && selectedAccount !== currentCandidate) {
      setSelectedAccount(currentCandidate);
    }
  }, [activeBotTab, mergedActiveAccounts, accounts, selectedAccount]);

  const [adminClosedPositions, setAdminClosedPositions] = useState([]);
  const [isStartingBot, setIsStartingBot] = useState(false);
  const [isStoppingBot, setIsStoppingBot] = useState(false);
  const [overrideBotRunning, setOverrideBotRunning] = useState(null);

  const isPropRunning = overridePropBotRunning !== null ? overridePropBotRunning : (propBotStatus === "RUNNING");
  const isTargetOkxRunning = useMemo(() => {
    if (overrideBotRunning !== null) return overrideBotRunning;
    if (botStatus !== "RUNNING") return false;
    const runningAcc = mergedActiveAccounts[activeBotTab];
    if (!runningAcc) return false;
    const c1 = String(runningAcc).trim().replace(/^#/, "");
    const c2 = String(effectiveAccId || "").trim().replace(/^#/, "");
    const curObj = accounts.find(a => a.id === effectiveAccId || a.name === effectiveAccId);
    const c3 = String(curObj?.name || "").trim().replace(/^#/, "");
    return c1 === c2 || (c3 && c1 === c3);
  }, [overrideBotRunning, botStatus, mergedActiveAccounts, activeBotTab, effectiveAccId, accounts]);

  const isOkxRunning = isTargetOkxRunning;
  const isRunning = currentPlatform === "e8" ? isPropRunning : isTargetOkxRunning;

  // Tự động giải phóng cờ ép trạng thái khi WebSocket hoặc Server đã xác nhận đồng bộ
  useEffect(() => {
    if (overrideBotRunning === true && botStatus === "RUNNING") {
      setOverrideBotRunning(null);
    } else if (overrideBotRunning === false && (botStatus === "SHADOW" || botStatus === "STOPPED")) {
      setOverrideBotRunning(null);
    }
  }, [botStatus, overrideBotRunning]);

  useEffect(() => {
    if (overridePropBotRunning === true && propBotStatus === "RUNNING") {
      setOverridePropBotRunning(null);
    } else if (overridePropBotRunning === false && propBotStatus === "STOPPED") {
      setOverridePropBotRunning(null);
    }
  }, [propBotStatus, overridePropBotRunning]);

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

  const [activeChartIndex, setActiveChartIndex] = useState(() => {
    try {
      const saved = localStorage.getItem("tls1_active_chart_index");
      return saved !== null ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  });
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const layoutSelectorRef = useRef(null);
  const terminalRef = useRef(null);

  const updateChartConfig = (index, updates) => {
    let hasChanged = false;
    setChartsConfig(prev => {
      const next = [...prev];
      const cur = next[index] || {};
      if ((updates.coin && updates.coin !== cur.coin) || (updates.tf && updates.tf !== cur.tf)) {
        hasChanged = true;
      }
      next[index] = { ...cur, ...updates };
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

  // Sync exact viewport height for iOS Safari & Standalone PWA
  useEffect(() => {
    const updateRealHeight = () => {
      const isStandalone = window.navigator.standalone === true ||
        (window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: fullscreen)').matches));
      const h = isStandalone
        ? Math.max(window.screen.height, window.innerHeight, (document.documentElement ? document.documentElement.clientHeight : 0))
        : (window.innerHeight || (document.documentElement ? document.documentElement.clientHeight : 0));
      if (h && h > 300) {
        document.documentElement.style.setProperty('--real-app-height', `${h}px`);
      }
      if (isStandalone) {
        document.documentElement.classList.add('is-pwa-standalone');
        if (document.body) document.body.classList.add('is-pwa-standalone');
      } else {
        document.documentElement.classList.remove('is-pwa-standalone');
        if (document.body) document.body.classList.remove('is-pwa-standalone');
      }
    };
    updateRealHeight();
    window.addEventListener('resize', updateRealHeight);
    window.addEventListener('orientationchange', updateRealHeight);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateRealHeight);
    }
    return () => {
      window.removeEventListener('resize', updateRealHeight);
      window.removeEventListener('orientationchange', updateRealHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', updateRealHeight);
      }
    };
  }, []);

  // 7. Workspace Resizer & Split View Mode
  const [isSplitView, setIsSplitView] = useState(() => {
    return localStorage.getItem("tls1_split_view") !== "false";
  });
  const [chartRatio, setChartRatio] = useState(() => {
    const saved = localStorage.getItem("tls1_chart_ratio");
    if (saved) {
      const num = Number(saved);
      if (num >= 15 && num <= 85) return num;
    }
    return 70;
  });
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

  const handleSplitBtnPointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    const isTouch = e.type === "touchstart";
    const startY = isTouch ? e.touches[0].clientY : e.clientY;
    let hasMoved = false;

    if (!isSplitView) {
      toggleSplitView();
      return;
    }

    if (e.cancelable && isTouch) e.preventDefault();

    const doDrag = (dragEvent) => {
      const clientY = isTouch ? dragEvent.touches[0].clientY : dragEvent.clientY;
      const diffY = Math.abs(clientY - startY);
      if (!hasMoved && diffY >= 3) {
        hasMoved = true;
        document.body.classList.add("is-resizing");
        document.body.classList.add("is-resizing-vertical");
      }
      if (hasMoved) {
        if (isTouch && dragEvent.cancelable) dragEvent.preventDefault();
        const workspace = document.querySelector(".main-workspace");
        if (!workspace) return;
        const rect = workspace.getBoundingClientRect();
        let newRatio = ((clientY - rect.top) / rect.height) * 100;
        if (newRatio < 15) newRatio = 15;
        if (newRatio > 85) newRatio = 85;
        setChartRatio(newRatio);
        localStorage.setItem("tls1_chart_ratio", String(newRatio));
      }
    };

    const stopDrag = () => {
      if (hasMoved) {
        document.body.classList.remove("is-resizing");
        document.body.classList.remove("is-resizing-vertical");
        window.dispatchEvent(new Event("resize"));
      } else {
        toggleSplitView();
      }

      if (isTouch) {
        document.removeEventListener("touchmove", doDrag);
        document.removeEventListener("touchend", stopDrag);
        document.removeEventListener("touchcancel", stopDrag);
      } else {
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", doDrag, { passive: false });
      document.addEventListener("touchend", stopDrag);
      document.addEventListener("touchcancel", stopDrag);
    } else {
      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    }
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
      if (newRatio < 15) newRatio = 15;
      if (newRatio > 85) newRatio = 85;
      setChartRatio(newRatio);
      localStorage.setItem("tls1_chart_ratio", String(newRatio));
    };

    const stopDrag = () => {
      document.body.classList.remove("is-resizing");
      document.body.classList.remove("is-resizing-vertical");
      window.dispatchEvent(new Event("resize"));
      if (isTouch) {
        document.removeEventListener("touchmove", doDrag);
        document.removeEventListener("touchend", stopDrag);
        document.removeEventListener("touchcancel", stopDrag);
      } else {
        document.removeEventListener("mousemove", doDrag);
        document.removeEventListener("mouseup", stopDrag);
      }
    };

    if (isTouch) {
      document.addEventListener("touchmove", doDrag, { passive: false });
      document.addEventListener("touchend", stopDrag);
      document.addEventListener("touchcancel", stopDrag);
    } else {
      document.addEventListener("mousemove", doDrag);
      document.addEventListener("mouseup", stopDrag);
    }
  };

  // 8. Bottom Tabs (positions | logs | history)
  const [activeTab, setActiveTab] = useState("positions");

  // System Settings Modal State (Khai báo trước để tourSteps và tour handlers truy cập an toàn)
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTab, setSettingsTab] = useState("strategy");

  // Tour Hướng Dẫn cho Người Mới (19 bước liên tục từ ngoài vào trong Cài Đặt)
  const [showOnboardingTour, setShowOnboardingTour] = useState(false);
  const [tourInitialStep, setTourInitialStep] = useState(0);

  const handleStartFullTour = useCallback(() => {
    setShowSettings(false);
    setShowConnectModal(false);
    setTourInitialStep(0);
    setShowOnboardingTour(true);
  }, []);

  const handleStartSettingsTour = useCallback(() => {
    setShowConnectModal(false);
    setShowSettings(true);
    setSettingsTab("strategy");
    setTourInitialStep(13); // Bắt đầu từ Bước 14 (index 13: [data-tour="settings-watchlist"])
    setShowOnboardingTour(true);
  }, []);

  const handleCloseTour = useCallback(() => {
    setShowOnboardingTour(false);
    setShowSettings(false);
    setShowConnectModal(false);
  }, []);

  useEffect(() => {
    try {
      const hasCompleted = localStorage.getItem("autotrader_tour_completed_v1");
      if (!hasCompleted) {
        const timer = setTimeout(() => {
          handleStartFullTour();
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, [handleStartFullTour]);

  const tourSteps = useMemo(() => {
    return getTourSteps(lang, {
      setShowConnectModal,
      setShowSettings,
      setConnectModalTab,
      setSettingsTab,
      setActiveTab,
    });
  }, [lang, setShowConnectModal, setShowSettings, setConnectModalTab, setSettingsTab, setActiveTab]);

  const [logs, setLogs] = useState({
    dashboardLines: [],
    eventLogs: ["Đang kết nối với TLS1 Trading Web Terminal Server..."],
  });
  const [propLogs, setPropLogs] = useState({
    dashboardLines: [],
    eventLogs: ["Đang kết nối với máy chủ Quỹ FX (TradeLocker - E8)..."],
  });
  const stagingDashboardRef = useRef([]);
  const stagingTimerRef = useRef(null);
  const isStagingRef = useRef(false);
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
        const accParam = effectiveAccId ? `&account_id=${encodeURIComponent(effectiveAccId)}` : "";
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}${accParam}`, {
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
  }, [activeBotTab, currentUid, effectiveAccId]);

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
      const accParam = effectiveAccId ? `&account_id=${encodeURIComponent(effectiveAccId)}` : "";
      fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}${accParam}`, {
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

  // Close Position / Cancel Limit Order Handler
  const handleClosePosition = async (pos, coin) => {
    const coinName = (coin && coin.label) ? coin.label.replace("-SWAP", "") : (pos?.coin || "Position");
    const isLimitOrder = pos?.is_limit || String(pos?.ticket_id || "").startsWith("ord_");
    const confirmMsg = isLimitOrder 
      ? `Bạn có chắc chắn muốn HỦY LỆNH LIMIT ${coinName} không?`
      : `Bạn có chắc chắn muốn đóng vị thế ${coinName} không?`;
    if (!window.confirm(confirmMsg)) return;
    try {
      if (pos.platform === "tradelocker" || pos.is_prop) {
        const curUid = localStorage.getItem('tls1_uid') || currentUid || "default";
        const res = await fetch("/api/tradelocker/positions/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_id: pos.position_id || pos.ticket_id,
            uid: curUid,
            qty: pos.lots || parseFloat(pos.pos || 0),
            is_limit: Boolean(isLimitOrder)
          })
        });
        const data = await res.json();
        if (res.ok) {
          alert(isLimitOrder ? `✅ Đã hủy lệnh Limit Quỹ ${coinName} thành công!` : `✅ Đã đóng vị thế Quỹ ${coinName} thành công!`);
          fetchPropPositions();
        } else {
          alert(`❌ Lỗi khi đóng/hủy Quỹ: ` + (data.detail || data.message || "Lỗi máy chủ"));
        }
        return;
      }

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

  // 9. Risk & Strategy Settings State (Ưu tiên nạp từ localStorage theo từng tài khoản)
  const [risk, setRisk] = useState(() => {
    try {
      const active = localStorage.getItem("tls1_active_bot_tab") || "sub1";
      const selAcc = localStorage.getItem(`tls1_selected_account_${active}`) || localStorage.getItem("tls1_selected_account") || "";
      const savedAccRisk = selAcc ? localStorage.getItem(`tls1_risk_${active}_${selAcc}`) : null;
      if (savedAccRisk) {
        const parsed = JSON.parse(savedAccRisk);
        if (parsed && typeof parsed === "object") return parsed;
      }
      const savedVol = Number(localStorage.getItem(`tls1_risk_posVol_${active}_${selAcc}`) || localStorage.getItem(`tls1_risk_posVol_${active}`));
      const initVol = (savedVol && savedVol > 0) ? savedVol : 0.4;
      if (active === "sub2") {
        return { posVol: initVol, volUsdt: initVol, volPct: 0.1, tpPct: 5.0, slPct: 1.0, volUnit: "USDT", multiplyVolumeByTf: false };
      }
      return { posVol: initVol, volUsdt: initVol, volPct: 0.1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT", multiplyVolumeByTf: false };
    } catch {
      return { posVol: 0.4, volUsdt: 0.4, volPct: 0.1, tpPct: 0.80, slPct: 0.80, volUnit: "USDT", multiplyVolumeByTf: false };
    }
  });
  const hasLoadedConfigFromBackendRef = useRef(false);
  const prevRiskRef = useRef(null);
  const [isRiskCollapsed, setIsRiskCollapsed] = useState(false);
  const [strat, setStrat] = useState({
    main: true, pyramidDca: false, negativeDca: false, multiTfGrid: true, hedge: false, xole: false, dynamicEma200Tp: false,
    dynamicPingpongTp: false, altcoinFollowBtc: false,
    sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
    trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
    timeframeBase: "1H",
  });
  const [entryCfg, setEntryCfg] = useState({
    entryOffset: "0.05",
    dcaGapPct: "0.20",
    confluencePct: "0.23",
    accumCandles: 60,
    altcoinFollowBtc: false,
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

  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");

  const [showAddAccountModal, setShowAddAccountModal] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showStopBotModal, setShowStopBotModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState("");
  const [newAccountInput, setNewAccountInput] = useState("");
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);

  const addSystemLog = (msg, platform = null) => {
    const targetPlatform = platform || currentPlatform;
    if (targetPlatform === "e8") {
      setPropLogs(prev => {
        const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
        const updatedEvents = [msg, ...currentEvents];
        return {
          dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
          eventLogs: updatedEvents.slice(0, 60),
        };
      });
    } else {
      setLogs(prev => {
        const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
        const updatedEvents = [msg, ...currentEvents];
        return {
          dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
          eventLogs: updatedEvents.slice(0, 60),
        };
      });
    }
  };

  // Switch bot defaults
  useEffect(() => {
    setFadeClass("");
    setTimeout(() => setFadeClass("tab-fade"), 10);

    const savedVol = Number(localStorage.getItem(`tls1_risk_posVol_${activeBotTab}`));

    if (activeBotTab === "sub1") {
      const savedAccRisk = effectiveAccId ? localStorage.getItem(`tls1_risk_${activeBotTab}_${effectiveAccId}`) : null;
      if (savedAccRisk) {
        try {
          const parsed = JSON.parse(savedAccRisk);
          if (parsed && typeof parsed === "object") {
            setRisk(parsed);
            prevRiskRef.current = parsed;
            return;
          }
        } catch {}
      }
      setRisk((r) => {
        const curVol = (savedVol > 0) ? savedVol : (r.posVol > 0 ? r.posVol : 0.4);
        return {
          ...r,
          posVol: curVol,
          volUsdt: curVol,
          tpPct: r.tpPct || 0.80,
          slPct: r.slPct || 0.80,
          volUnit: r.volUnit || "USDT",
        };
      });
      setStrat({
        main: true, pyramidDca: false, negativeDca: false, hedge: false, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
      });
    } else if (activeBotTab === "sub2") {
      const savedAccRisk = effectiveAccId ? localStorage.getItem(`tls1_risk_${activeBotTab}_${effectiveAccId}`) : null;
      if (savedAccRisk) {
        try {
          const parsed = JSON.parse(savedAccRisk);
          if (parsed && typeof parsed === "object") {
            setRisk(parsed);
            prevRiskRef.current = parsed;
            return;
          }
        } catch {}
      }
      setRisk((r) => {
        const curVol = (savedVol > 0) ? savedVol : (r.posVol > 0 ? r.posVol : 0.4);
        return {
          ...r,
          posVol: curVol,
          volUsdt: curVol,
          tpPct: 5.0,
          slPct: 1.0,
          volUnit: r.volUnit || "USDT",
        };
      });
      setStrat({
        main: true, xole: false, dynamicEma200Tp: false,
        dynamicPingpongTp: false, altcoinFollowBtc: true,
        sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
        trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
        timeframeBase: "1H",
      });
    } else {
      setRisk((r) => {
        const curVol = (savedVol > 0) ? savedVol : (r.posVol > 0 ? r.posVol : 0.4);
        return {
          ...r,
          posVol: curVol,
          volUsdt: curVol,
          tpPct: r.tpPct || 1.0,
          slPct: r.slPct || 1.0,
          volUnit: r.volUnit || "USDT",
        };
      });
      setStrat({ main: true, timeframeBase: "1H" });
    }
  }, [activeBotTab, effectiveAccId]);

  // Sync Risk settings to backend & localStorage per account (đồng bộ ngay cả khi bot đang chạy cho TP/SL linh hoạt)
  useEffect(() => {
    if (!hasLoadedConfigFromBackendRef.current || !effectiveAccId) return;
    if (prevRiskRef.current && JSON.stringify(prevRiskRef.current) === JSON.stringify(risk)) return;
    prevRiskRef.current = risk;

    // Lưu ngay lập tức vào localStorage cho tài khoản cụ thể này
    try {
      localStorage.setItem(`tls1_risk_${activeBotTab}_${effectiveAccId}`, JSON.stringify(risk));
      localStorage.setItem(`tls1_risk_posVol_${activeBotTab}_${effectiveAccId}`, String(risk.posVol));
    } catch {}

    const timer = setTimeout(() => {
      try {
        const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
        const isSub2 = activeBotTab === "sub2";
        const accParam = effectiveAccId ? `&account_id=${encodeURIComponent(effectiveAccId)}` : "";
        fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${curUid}${accParam}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: Number(risk.posVol),
            scalping_tp_pct: Number(risk.tpPct) / 100,
            scalping_sl_pct: Number(risk.slPct) / 100,
            ob_rr_ratio_trend: isSub2 ? Number(risk.tpPct) : undefined,
            ob_rr_ratio_counter: isSub2 ? Number(risk.slPct) : undefined,
          }),
        }).then((res) => {
          if (res.ok) {
            const accName = accounts.find(a => a.id === effectiveAccId)?.name || effectiveAccId;
            if (isSub2) {
              addSystemLog(`⚙️ [SYSTEM] Cập nhật cấu hình SMC cho [${accName}]: Volume = ${risk.posVol} ${risk.volUnit} | Chốt lời Thuận = ${risk.tpPct}R | Chốt lời Ngược = ${risk.slPct}R`);
            } else {
              addSystemLog(`⚙️ [SYSTEM] Cập nhật cấu hình cho [${accName}]: Volume = ${risk.posVol} ${risk.volUnit} | Chốt lời = ${risk.tpPct}% | Cắt lỗ = ${risk.slPct}%`);
            }
          }
        });
      } catch {}
    }, 400);
    return () => clearTimeout(timer);
  }, [risk, activeBotTab, currentUid, effectiveAccId, accounts]);

  // Bootstrap accounts & credentials unconditionally on mount
  useEffect(() => {
    let isMounted = true;
    const bootstrap = async () => {
      try {
        const uidToUse = localStorage.getItem("tls1_uid") || loginUid;
        if (!uidToUse || uidToUse === "default") {
          if (isMounted) {
            setAccounts([]);
            setSelectedAccount("");
            setApiKey("");
            setSecretKey("");
            setPassphrase("");
            setPositions([]);
            setClosedPositions([]);
          }
          return;
        }
        const resAcc = await fetch(`/api/bot/accounts?uid=${uidToUse}`);
        let accList = [];
        if (resAcc.ok) {
          const data = await resAcc.json();
          if (Array.isArray(data)) {
            accList = data;
            if (isMounted) {
              const cleanData = dedupeAccounts(data);
              setAccounts(cleanData);
              localStorage.setItem("tls1_accounts", JSON.stringify(cleanData));
              if (cleanData.length === 0) {
                setIsAuthenticated(false);
                localStorage.removeItem("tls1_auth");
                localStorage.removeItem("tls1_last_detected_acc");
                localStorage.removeItem("tls1_account_name");
              }
            }
          }
        }

        let targetAcc = "";
        try {
          const resStat = await fetch(`/api/bot/status?strategy=${activeBotTab}&uid=${uidToUse}`);
          if (resStat.ok) {
            const statData = await resStat.json();
            if (statData?.active_accounts) {
              setHttpActiveAccounts(statData.active_accounts);
              const serverRunning = statData.active_accounts[activeBotTab];
              if (serverRunning) {
                const matched = accList.find(a => a.id === serverRunning || a.name === serverRunning);
                targetAcc = matched ? matched.id : serverRunning;
              }
            }
          }
        } catch { }

        if (!targetAcc) {
          try {
            const savedMap = JSON.parse(localStorage.getItem("tls1_bot_accounts") || "{}");
            if (savedMap[activeBotTab] && accList.some(a => a.id === savedMap[activeBotTab])) {
              targetAcc = savedMap[activeBotTab];
            }
          } catch { }
        }

        if (targetAcc && isMounted) {
          setSelectedAccount(targetAcc);
          setBotAccountMap(prev => {
            const next = { ...prev, [activeBotTab]: targetAcc };
            localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
            return next;
          });
        } else if (isMounted) {
          setSelectedAccount("");
        }

        if (!targetAcc) {
          if (isMounted) {
            setApiKey("");
            setSecretKey("");
            setPassphrase("");
            setPositions([]);
            setClosedPositions([]);
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
              if (credData.api_key || credData.secret_key || credData.passphrase) {
                setIsAuthenticated(true);
                localStorage.setItem("tls1_auth", "true");
              }
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
        const uidToUse = currentUid || localStorage.getItem('tls1_uid');
        if (!uidToUse || uidToUse === 'default') {
          setApiKey("");
          setSecretKey("");
          setPassphrase("");
          return;
        }
        const targetAcc = selectedAccount || effectiveAccId;
        if (!targetAcc) {
          setApiKey("");
          setSecretKey("");
          setPassphrase("");
          return;
        }
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
    const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
    if (!effectiveAccId) return;
    hasLoadedConfigFromBackendRef.current = false;
    fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${curUid}&account_id=${effectiveAccId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS);
        if (d.ENABLED_COINS) setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
        if (d.POSITION_VOLUME_HIGH_CONFIDENCE !== undefined && d.POSITION_VOLUME_HIGH_CONFIDENCE !== null) {
          const bVol = Number(d.POSITION_VOLUME_HIGH_CONFIDENCE);
          if (bVol > 0) {
            try {
              localStorage.setItem(`tls1_risk_posVol_${activeBotTab}_${effectiveAccId}`, String(bVol));
            } catch {}
          }
          const isSub2 = activeBotTab === "sub2";
          let parsedTp = isSub2 ? 5.0 : 0.80;
          let parsedSl = isSub2 ? 1.0 : 0.80;
          if (isSub2) {
            if (d.OB_RR_RATIO_TREND !== undefined) {
              parsedTp = Number(d.OB_RR_RATIO_TREND);
            } else if (d.SCALPING_TP_PCT) {
              const tpVal = Number((d.SCALPING_TP_PCT * 100).toFixed(2));
              parsedTp = (tpVal === 0.60 || tpVal === 1.5) ? 5.0 : tpVal;
            }
            if (d.OB_RR_RATIO_COUNTER !== undefined) {
              parsedSl = Number(d.OB_RR_RATIO_COUNTER);
            } else if (d.SCALPING_SL_PCT) {
              const slVal = Number((d.SCALPING_SL_PCT * 100).toFixed(2));
              parsedSl = (slVal === 0.60 || slVal === 1.5) ? 1.0 : slVal;
            }
          } else {
            parsedTp = d.SCALPING_TP_PCT ? Number((d.SCALPING_TP_PCT * 100).toFixed(2)) : 0.80;
            parsedSl = d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : 0.80;
          }
          const nextRisk = {
            posVol: bVol > 0 ? bVol : 0.4,
            volUsdt: bVol > 0 ? bVol : 0.4,
            volPct: 0.1,
            volUnit: d.VOL_UNIT || "USDT",
            tpPct: parsedTp,
            slPct: parsedSl,
            multiplyVolumeByTf: d.ENABLE_TF_VOLUME_MULTIPLIER !== undefined ? Boolean(d.ENABLE_TF_VOLUME_MULTIPLIER) : false,
          };
          prevRiskRef.current = nextRisk;
          setRisk(nextRisk);
          try {
            localStorage.setItem(`tls1_risk_${activeBotTab}_${effectiveAccId}`, JSON.stringify(nextRisk));
            localStorage.setItem(`tls1_risk_posVol_${activeBotTab}_${effectiveAccId}`, String(nextRisk.posVol));
          } catch {}
        }
        hasLoadedConfigFromBackendRef.current = true;
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
  }, [isAuthenticated, activeBotTab, currentUid, effectiveAccId]);

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
    const curUid = currentUid || localStorage.getItem('tls1_uid');
    if (!curUid || curUid === 'default') {
      setAccounts([]);
      return;
    }
    fetch(`/api/bot/accounts?uid=${curUid}`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (Array.isArray(data)) {
          const clean = dedupeAccounts(data);
          setAccounts(clean);
          localStorage.setItem("tls1_accounts", JSON.stringify(clean));
        }
      })
      .catch(() => { });
  }, [currentUid]);

  // Start shadow bot in background
  useEffect(() => {
    if (!isAuthenticated || !currentUid) return;
    fetch(`/api/bot/shadow/start?uid=${currentUid}&strategy=${activeBotTab}`, { method: 'POST' }).catch(() => { });
  }, [isAuthenticated, activeBotTab, currentUid]);

  // 10. WebSocket Logs Terminal stream (Double-buffered Dashboard + Bottom Event Stream)
  useEffect(() => {
    let isMounted = true;
    let ws = null;

    const connectWS = () => {
      if (!isMounted) return;
      const safeUid = currentUid || localStorage.getItem('tls1_uid');
      if (!safeUid || safeUid === 'default') {
        setLogs({
          dashboardLines: [],
          eventLogs: ["ℹ️ Vui lòng kết nối tài khoản OKX để bắt đầu sử dụng và xem logs bot."],
        });
        return;
      }
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/logs/${safeUid}/${activeBotTab}`);
      wsRef.current = ws;

      ws.onopen = () => {
        setLogs(prev => {
          const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
          return {
            dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
            eventLogs: [`✅ Đã kết nối với TLS1 Trading Web Terminal Server [${activeBotTab.toUpperCase()}]`, ...currentEvents].slice(0, 60),
          };
        });
      };

      ws.onmessage = (e) => {
        const text = e.data;
        if (typeof text !== 'string') return;
        const line = text.trimEnd();
        if (!line) return;

        // 🛡️ Lọc bỏ tuyệt đối các chuỗi / thẻ rác HTML từ Cloudflare (502/504 Bad Gateway)
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.startsWith("<") ||
          lowerLine.includes("<!doctype") ||
          lowerLine.includes("<html") ||
          lowerLine.includes("<body") ||
          lowerLine.includes("<head") ||
          lowerLine.includes("<script") ||
          lowerLine.includes("<style") ||
          lowerLine.includes("cloudflare") ||
          lowerLine.includes("cf-error") ||
          lowerLine.includes("ray id:") ||
          lowerLine.includes("502 bad gateway") ||
          lowerLine.includes("504 gateway") ||
          lowerLine.includes("window._cf_")
        ) {
          return;
        }

        // 🚨 Tự động kích hoạt Popup cảnh báo nếu sàn OKX báo lỗi 50123 (thiếu quyền Trade hoặc hết hạn 14 ngày)
        if (
          line.includes("50123") || 
          line.includes("This API Key does not have permission") ||
          line.includes("Thiếu quyền Giao dịch")
        ) {
          const now = Date.now();
          if (now - lastApiErrorPromptRef.current > 30000) {
            lastApiErrorPromptRef.current = now;
            setShowApiPermissionModal(true);
          }
        }

        // 🛡️ Lọc bảo vệ: Nếu là dòng log thuộc Quỹ FX TradeLocker -> nạp vào propLogs, không cho lẫn vào logs OKX
        const isTradeLockerLine = 
          line.includes("[TRADELOCKER") || 
          line.includes("TRADELOCKER E8 DISPATCH") || 
          line.includes("[DRY-RUN TradeLocker]") || 
          line.includes("[QUỸ FX]") ||
          line.includes("E8 DISPATCH");

        if (isTradeLockerLine) {
          setPropLogs(prev => {
            const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
            const nowStr = new Date().toLocaleTimeString("vi-VN", { hour12: false });
            const formattedLine = (line.startsWith("[") || line.startsWith("🏆") || line.startsWith("⚠️") || line.startsWith("🌑")) ? line : `[${nowStr}] ${line}`;
            return {
              dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
              eventLogs: [formattedLine, ...currentEvents].slice(0, 60),
            };
          });
          return;
        }

        const isHeader = line.includes("bot_sub1.py") || line.includes("bot_sub2.py") || line.includes("bot_sub3.py") || line.includes("sys_bot_sub") || line.includes("bot_core");

        // Nhận diện dòng sự kiện (Event log tức thời)
        const isEventLog = 
          line.startsWith("⏳") || 
          line.startsWith("🔒") || 
          line.startsWith("🚨") || 
          line.startsWith("🧹") || 
          line.startsWith("✅") || 
          line.startsWith("🚀") || 
          line.startsWith("💡") || 
          line.startsWith("⚠️") || 
          line.startsWith("🌑") || 
          line.startsWith("⚙️") || 
          line.startsWith("🔑") || 
          line.startsWith("🛑") || 
          line.startsWith("➕") || 
          line.startsWith("🗑️") || 
          line.startsWith("♻️") || 
          line.startsWith("🔄") || 
          line.startsWith("✧") ||
          line.startsWith("[TP/SL") || 
          line.startsWith("[LIMIT") || 
          line.startsWith("[CANCEL") || 
          line.startsWith("[ORDER") || 
          line.startsWith("[CLOSE") || 
          line.startsWith("[ERROR") || 
          line.startsWith("[INFO") || 
          line.startsWith("[SYSTEM") || 
          line.startsWith("[OKX") || 
          line.startsWith("[DRY-RUN") ||
          line.startsWith("[ATTACH");

        const isDashboardLine = 
          line.startsWith("===") || 
          line.startsWith("---") ||
          line.includes("Thợ săn EMA200") ||
          line.includes("Quỹ E8") ||
          line.includes("Quỹ FX") ||
          line.includes("Mode:") ||
          line.includes("Gốc:") ||
          line.includes("Lợi nhuận") ||
          line.includes("Coin |") ||
          (line.includes("Coin") && line.includes("Price")) ||
          line.includes("Tình trạng vị thế") ||
          line.includes("HỆ THỐNG GIAO DỊCH QUỸ FX") ||
          line.includes("Tài khoản Quỹ :") ||
          line.includes("Số dư Quỹ     :") ||
          line.includes("Trạng thái Bot:") ||
          line.includes("╭─") || line.includes("├─") || line.includes("╰─") ||
          line.includes("Win Streak:") ||
          (line.includes("|") && (line.includes("▲") || line.includes("▼")));

        if (isHeader) {
          // Khởi động chu kỳ gom Snapshot Dashboard mới (bộ đệm ngầm, KHÔNG xóa bảng đang hiển thị)
          isStagingRef.current = true;
          stagingDashboardRef.current = [line];

          if (stagingTimerRef.current) clearTimeout(stagingTimerRef.current);
          stagingTimerRef.current = setTimeout(() => {
            if (stagingDashboardRef.current.length >= 8) {
              setLogs(prev => ({
                dashboardLines: [...stagingDashboardRef.current],
                eventLogs: (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [],
              }));
            }
            stagingDashboardRef.current = [];
            isStagingRef.current = false;
          }, 4000);
          return;
        }

        if (isStagingRef.current && !isEventLog) {
          stagingDashboardRef.current.push(line);

          // Nhận diện vạch kết thúc của Dashboard: dòng ============ (độ dài >= 40) sau khi đã có nội dung bảng/vị thế
          const hasTableContent = stagingDashboardRef.current.some(l => l.includes("Coin") || l.includes("Price") || l.includes("Tình trạng vị thế") || l.includes("Chiến thuật") || l.includes("CHIẾN THUẬT"));
          const isBottomBar = line.startsWith("===") && line.length >= 40 && stagingDashboardRef.current.length >= 10 && hasTableContent;

          if (isBottomBar) {
            if (stagingTimerRef.current) clearTimeout(stagingTimerRef.current);
            const completedFrame = [...stagingDashboardRef.current];
            stagingDashboardRef.current = [];
            isStagingRef.current = false;

            // Cập nhật đè toàn bộ frame mới trong 1 tick duy nhất, triệt tiêu 100% nhấp nhả
            setLogs(prev => ({
              dashboardLines: completedFrame,
              eventLogs: (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [],
            }));
            return;
          }

          if (stagingTimerRef.current) clearTimeout(stagingTimerRef.current);
          stagingTimerRef.current = setTimeout(() => {
            if (stagingDashboardRef.current.length >= 8) {
              setLogs(prev => ({
                dashboardLines: [...stagingDashboardRef.current],
                eventLogs: (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [],
              }));
            }
            stagingDashboardRef.current = [];
            isStagingRef.current = false;
          }, 4000);
          return;
        }

        // 🛡️ Chặn triệt để: Nếu là dòng thuộc bảng Dashboard mà rơi ra ngoài chu kỳ staging -> TUYỆT ĐỐI không nạp vào Event Logs
        if (isDashboardLine) {
          return;
        }

        // Dòng sự kiện hoặc log phát sinh ngoài chu kỳ -> Nạp vào dải Event Logs ở đáy
        setLogs(prev => {
          const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
          const nowStr = new Date().toLocaleTimeString("vi-VN", { hour12: false });
          const formattedLine = (line.startsWith("[") || line.startsWith("⏳") || line.startsWith("⚙️"))
            ? line 
            : `[${nowStr}] ${line}`;

          const updatedEvents = [formattedLine, ...currentEvents];
          return {
            dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
            eventLogs: updatedEvents.slice(0, 60),
          };
        });
      };

      ws.onclose = () => {
        if (isMounted && wsRef.current === ws) {
          setTimeout(connectWS, 3000);
        }
      };
    };

    setLogs({ dashboardLines: [], eventLogs: [] });
    stagingDashboardRef.current = [];
    isStagingRef.current = false;
    if (stagingTimerRef.current) clearTimeout(stagingTimerRef.current);

    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    connectWS();

    return () => {
      isMounted = false;
      if (stagingTimerRef.current) clearTimeout(stagingTimerRef.current);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [activeBotTab, currentUid]);

  // 10b. Quỹ FX (TradeLocker) Logs Terminal Stream & Sync
  const propWsRef = useRef(null);

  const fetchPropLogs = useCallback(async () => {
    try {
      const safeUid = currentUid || localStorage.getItem('tls1_uid') || "default";
      const res = await fetch(`/api/tradelocker/logs?uid=${encodeURIComponent(safeUid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.status === "success") {
          setPropLogs(prev => ({
            dashboardLines: Array.isArray(data.dashboardLines) && data.dashboardLines.length > 0 ? data.dashboardLines : (prev ? prev.dashboardLines : []),
            eventLogs: Array.isArray(data.eventLogs) && data.eventLogs.length > 0 ? data.eventLogs : (prev ? prev.eventLogs : []),
          }));
        }
      }
    } catch {}
  }, [currentUid]);

  useEffect(() => {
    let isMounted = true;
    let ws = null;

    const connectPropWS = () => {
      if (!isMounted) return;
      const safeUid = currentUid || localStorage.getItem('tls1_uid') || "default";
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(`${protocol}//${window.location.host}/ws/tradelocker/logs/${safeUid}`);
      propWsRef.current = ws;

      ws.onopen = () => {
        fetchPropLogs();
      };

      ws.onmessage = (e) => {
        const text = e.data;
        if (typeof text !== 'string') return;
        const line = text.trimEnd();
        if (!line) return;

        // 🛡️ Lọc bỏ tuyệt đối các chuỗi / thẻ rác HTML từ Cloudflare (502/504 Bad Gateway)
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.startsWith("<") ||
          lowerLine.includes("<!doctype") ||
          lowerLine.includes("<html") ||
          lowerLine.includes("<body") ||
          lowerLine.includes("<head") ||
          lowerLine.includes("<script") ||
          lowerLine.includes("<style") ||
          lowerLine.includes("cloudflare") ||
          lowerLine.includes("cf-error") ||
          lowerLine.includes("ray id:") ||
          lowerLine.includes("502 bad gateway") ||
          lowerLine.includes("504 gateway") ||
          lowerLine.includes("window._cf_")
        ) {
          return;
        }

        if (
          line.startsWith("===") || 
          line.startsWith("---") ||
          line.includes("HỆ THỐNG GIAO DỊCH QUỸ FX") || 
          line.includes("Tài khoản Quỹ :") || 
          line.includes("Số dư Quỹ     :") ||
          line.includes("Trạng thái Bot:") ||
          line.includes("Kết nối API:")
        ) {
          fetchPropLogs();
          return;
        }

        setPropLogs(prev => {
          const currentEvents = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
          const nowStr = new Date().toLocaleTimeString("vi-VN", { hour12: false });
          const formattedLine = (line.startsWith("[") || line.startsWith("⏳") || line.startsWith("🏆") || line.startsWith("⚠️") || line.startsWith("🚀") || line.startsWith("🛑") || line.startsWith("🔑") || line.startsWith("🧹"))
            ? line 
            : `[${nowStr}] ${line}`;
          return {
            dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
            eventLogs: [formattedLine, ...currentEvents].slice(0, 60),
          };
        });
      };

      ws.onclose = () => {
        if (isMounted && propWsRef.current === ws) {
          setTimeout(connectPropWS, 3000);
        }
      };
    };

    fetchPropLogs();
    connectPropWS();

    const propPollInterval = setInterval(fetchPropLogs, 3500);

    return () => {
      isMounted = false;
      clearInterval(propPollInterval);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [currentUid, fetchPropLogs]);

  const handleToggleMultiplyVolume = async (val) => {
    const nextVal = Boolean(val);
    setRisk(r => ({ ...r, multiplyVolumeByTf: nextVal }));
    try {
      const accParam = effectiveAccId ? `&account_id=${encodeURIComponent(effectiveAccId)}` : "";
      await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${currentUid}${accParam}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          position_volume: risk.posVol,
          strategy_config: {
            ENABLE_TF_VOLUME_MULTIPLIER: nextVal
          }
        })
      });
      const accLabel = accounts.find(a => a.id === effectiveAccId)?.name || effectiveAccId;
      addSystemLog(`⚙️ [CẤU HÌNH] Đã lưu thiết lập Nhân hệ số Ký quỹ cho [${accLabel}]: ${nextVal ? "BẬT" : "TẮT"}`);
    } catch (err) {
      console.error("Lỗi cập nhật ENABLE_TF_VOLUME_MULTIPLIER:", err);
    }
  };

  // OKX Fast Connect Callback Interceptor
  useEffect(() => {
    const pathname = window.location.pathname.replace(/\/$/, "");
    const search = window.location.search || window.location.hash.replace("#", "?");
    const urlParams = new URLSearchParams(search);
    const code = urlParams.get("code");
    const errorParam = urlParams.get("error");
    const errorMsg = urlParams.get("error_msg");

    // Chỉ thực thi khi đúng là đang ở trang callback hoặc có mã code/error trả về từ OKX
    if (pathname !== "/okx-callback" && !code && !errorParam) {
      return;
    }

    if (isHandlingCallbackRef.current) return;
    isHandlingCallbackRef.current = true;

    // Ngay lập tức dọn sạch query param trên URL để ngăn chặn re-render kích hoạt lại
    window.history.replaceState({}, document.title, window.location.pathname.replace(/\/okx-callback\/?/, "/"));

    const handleCallback = async () => {
      const stateParam = urlParams.get("state");

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

          if (parsedState.uid || parsedState.u) callbackUid = parsedState.uid || parsedState.u;
          if (parsedState.acc || parsedState.a) callbackAcc = parsedState.acc || parsedState.a;
          if (parsedState.strat || parsedState.s) callbackStrat = parsedState.strat || parsedState.s;
          if (parsedState.pwa !== undefined || parsedState.p !== undefined) callbackPwa = parsedState.pwa !== undefined ? parsedState.pwa : parsedState.p;
        } catch (e) {
          console.error("Failed to parse state", e);
          const savedState = localStorage.getItem("okx_oauth_state_raw");
          if (savedState) {
            try {
              const parsedState = JSON.parse(savedState);
              if (parsedState.uid || parsedState.u) callbackUid = parsedState.uid || parsedState.u;
              if (parsedState.acc || parsedState.a) callbackAcc = parsedState.acc || parsedState.a;
              if (parsedState.strat || parsedState.s) callbackStrat = parsedState.strat || parsedState.s;
              if (parsedState.pwa !== undefined || parsedState.p !== undefined) callbackPwa = parsedState.pwa !== undefined ? parsedState.pwa : parsedState.p;
            } catch (e2) {}
          }
        }
      }

      if (errorParam) {
        setFastConnectStatus({ type: "error", msg: "OKX từ chối kết nối: " + (errorMsg || errorParam) });
        return;
      }

      if (code) {
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
        try {
          let acc = callbackAcc || "";
          const strat = callbackStrat;

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
              // Khử trùng lặp client
              const cleanAccs = dedupeAccounts(data.accounts);
              setAccounts(cleanAccs);
              localStorage.setItem("tls1_accounts", JSON.stringify(cleanAccs));

              // Tìm account ID thực tế (ưu tiên ID chính xác do backend trả về)
              const returnedAccId = data.account_id;
              const matchedAcc = (returnedAccId && cleanAccs.find(a => a.id === returnedAccId))
                || cleanAccs.find(a => a.name === data.detected_name)
                || (acc && cleanAccs.find(a => a.id === acc))
                || cleanAccs[cleanAccs.length - 1]
                || cleanAccs[0];
              if (matchedAcc) {
                setSelectedAccount(matchedAcc.id);
                setBotAccountMap(prev => {
                  const next = { ...prev, [strat]: matchedAcc.id };
                  localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
                  return next;
                });
                acc = matchedAcc.id;
              }
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
        }
      }
    };

    handleCallback();
  }, []);

  // Fast Connect OAuth State
  const [okxOAuthUrl, setOkxOAuthUrl] = useState("");
  const [okxOAuthState, setOkxOAuthState] = useState("");

  useEffect(() => {
    if (showConnectModal) {
      const clientId = "6038d061f79a421ea44b3d1777bbef5dBRWpzwlb";
      const redirectUri = encodeURIComponent("https://autotrader.fun/okx-callback");
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Để acc rỗng để backend tự động định danh theo OKX UID và detected_name, không ghi đè tài khoản đang chọn
      const stateObj = { uid: currentUid, acc: "", strat: activeBotTab || "sub1", pwa: isStandalone };
      const stateJson = JSON.stringify(stateObj);
      const state = btoa(stateJson).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      
      setOkxOAuthState(state);
      localStorage.setItem("okx_oauth_state_raw", stateJson);
      setOkxOAuthUrl(`https://www.okx.com/vi/account/oauth?response_type=code&access_type=offline&client_id=${clientId}&redirect_uri=${redirectUri}&scope=fast_api&state=${state}&authLogout=1`);
    }
  }, [showConnectModal, currentUid, activeBotTab]);

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

      const curUid = uid || currentUid || localStorage.getItem("tls1_uid") || "";
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
  const handleStartBotClick = async () => {
    const curPlatform = localStorage.getItem("tls1_trading_platform") || "okx";
    if (curPlatform === "e8") {
      // Kiểm tra xem đã có ít nhất 1 tài khoản Quỹ FX nào được kết nối hay chưa
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let hasPropAcc = false;
      try {
        const res = await fetch(`/api/tradelocker/accounts?uid=${encodeURIComponent(curUid)}`, { headers });
        if (res.ok) {
          const d = await res.json();
          if (d && d.status === "success" && Array.isArray(d.accounts) && d.accounts.length > 0) {
            hasPropAcc = true;
          }
        }
      } catch { }

      if (!hasPropAcc) {
        setConnectModalTab("tradelocker");
        setShowConnectModal(true);
      } else {
        handleStartPropBot();
      }
      return;
    }

    if (!isAuthenticated || !apiKey || !secretKey || !passphrase) {
      setConnectModalTab("fast");
      setShowConnectModal(true);
    } else {
      handleStartBot();
    }
  };

  const handleStartPropBot = async () => {
    if (isStartingPropBot || isStoppingPropBot) return;
    try {
      setIsStartingPropBot(true);
      const botUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      const r = await fetch(`/api/tradelocker/bot/start?uid=${encodeURIComponent(botUid)}&strategy=${activeBotTab}`, {
        method: "POST"
      });
      if (r.ok) {
        setOverridePropBotRunning(true);
        setPropBotStatus("RUNNING");
        addSystemLog(`🚀 [QUỸ FX] Đã khởi động ${activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot"} cho Quỹ TradeLocker.`);
        fetchPropPositions();
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsStartingPropBot(false);
      } else {
        let errMsg = "Không rõ nguyên nhân";
        try {
          const err = await r.json();
          errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err);
        } catch {
          errMsg = await r.text();
        }
        alert(`❌ Lỗi khởi động bot Quỹ: ${errMsg || r.statusText}`);
        setOverridePropBotRunning(null);
        setIsStartingPropBot(false);
      }
    } catch (e) {
      alert(`❌ Lỗi kết nối khi khởi động bot Quỹ: ${e?.message || e}`);
      setOverridePropBotRunning(null);
      setIsStartingPropBot(false);
    }
  };

  const handleStopPropBot = async () => {
    if (isStoppingPropBot || isStartingPropBot) return;
    try {
      setIsStoppingPropBot(true);
      const botUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      const r = await fetch(`/api/tradelocker/bot/stop?uid=${encodeURIComponent(botUid)}&strategy=${activeBotTab}`, {
        method: "POST"
      });
      if (r.ok) {
        setOverridePropBotRunning(false);
        setPropBotStatus("STOPPED");
        addSystemLog(`🛑 [QUỸ FX] Đã dừng ${activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot"} cho Quỹ TradeLocker.`);
        fetchPropPositions();
        await new Promise(resolve => setTimeout(resolve, 600));
        setIsStoppingPropBot(false);
      } else {
        let errMsg = "Không rõ nguyên nhân";
        try {
          const err = await r.json();
          errMsg = typeof err.detail === "string" ? err.detail : JSON.stringify(err.detail || err);
        } catch {
          errMsg = await r.text();
        }
        alert(`❌ Lỗi dừng bot Quỹ: ${errMsg || r.statusText}`);
        setOverridePropBotRunning(null);
        setIsStoppingPropBot(false);
      }
    } catch (e) {
      alert(`❌ Lỗi kết nối khi dừng bot Quỹ: ${e?.message || e}`);
      setOverridePropBotRunning(null);
      setIsStoppingPropBot(false);
    }
  };

  const handleStartBot = async () => {
    if (isStartingBot || isStoppingBot) return;
    let currentAcc = effectiveAccId;

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

    // 🛡️ KHÓA GIAO DỊCH TRÊN TÀI KHOẢN CHÍNH (MASTER ACCOUNT):
    const currentAccObj = accounts.find(a => a.id === currentAcc || a.name === currentAcc);
    const isMainAccount = currentAccObj?.is_main === true ||
                          currentAccObj?.name === "Tài khoản chính" ||
                          (currentAccObj?.name && currentAccObj.name.toLowerCase().startsWith("tài khoản chính"));

    if (isMainAccount) {
      alert(
        "🛡️ BẢO VỆ TÀI SẢN: Bot KHÔNG CHO PHÉP giao dịch trên Tài khoản chính!\n\n" +
        "Để đảm bảo an toàn vốn tuyệt đối, quý khách vui lòng:\n" +
        "1. Tạo Tài khoản phụ (Sub-account) trên sàn OKX.\n" +
        "2. Chuyển số vốn bạn muốn chạy bot vào Tài khoản phụ đó.\n" +
        "3. Kết nối API của Tài khoản phụ để Chạy Bot.\n\n" +
        "💡 Tài khoản chính chỉ dùng để quản lý vốn và xác thực bản quyền Ref."
      );
      setConnectModalTab("fast");
      setShowConnectModal(true);
      return;
    }

    // 🛡️ KHÓA ĐỘC QUYỀN SÀN OKX: 1 Tài khoản chỉ được chạy 1 phương pháp Bot duy nhất
    const runningBotStrat = Object.entries(mergedActiveAccounts || {}).find(([strat, id]) => {
      return strat !== activeBotTab && (id === currentAcc || String(id).replace(/^#/, "") === String(currentAcc).replace(/^#/, ""));
    });
    if (runningBotStrat) {
      const otherStrat = runningBotStrat[0];
      const otherBotName = otherStrat === "sub1" ? "EMA200 Bot" : otherStrat === "sub2" ? "SMC Bot" : "Liquidation Bot";
      const thisBotName = activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot";
      const accName = accounts.find(a => a.id === currentAcc)?.name || currentAcc;
      alert(`⚠️ Tài khoản OKX '${accName}' đang chạy độc quyền bởi ${otherBotName}!\n\nTheo nguyên tắc an toàn vốn, mỗi tài khoản chỉ được chạy duy nhất 1 phương pháp Bot.\n\nVui lòng chọn tài khoản phụ khác cho ${thisBotName} hoặc bấm DỪNG BOT bên ${otherBotName} trước khi khởi động!`);
      return;
    }

    // Kiểm tra xem chiến lược này có đang chạy trên tài khoản phụ khác không -> Xác nhận chuyển tài khoản
    const runningAccOnThisStrat = mergedActiveAccounts[activeBotTab];
    if (runningAccOnThisStrat) {
      const c1 = String(runningAccOnThisStrat).trim().replace(/^#/, "");
      const c2 = String(currentAcc).trim().replace(/^#/, "");
      const curObj = accounts.find(a => a.id === currentAcc || a.name === currentAcc);
      const c3 = String(curObj?.name || "").trim().replace(/^#/, "");
      if (c1 !== c2 && (!c3 || c1 !== c3)) {
        const runningObj = accounts.find(a => a.id === runningAccOnThisStrat || a.name === runningAccOnThisStrat);
        const runningName = runningObj?.name || runningAccOnThisStrat;
        const targetName = curObj?.name || currentAcc;
        const thisBotName = activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot";
        const confirmSwitch = window.confirm(
          `⚠️ ${thisBotName} hiện đang chạy trên tài khoản [${runningName}].\n\nBạn có chắc chắn muốn DỪNG bot trên [${runningName}] để CHUYỂN sang chạy trên [${targetName}] không?`
        );
        if (!confirmSwitch) return;
      }
    }

    // Kiểm tra xem đã có ít nhất 1 cặp giao dịch nào được cấu hình TF trade hay chưa
    let effectiveTfs = enabledTfs;
    let pairsWithTf = (activePairs || []).filter(pair => {
      const tfs = (effectiveTfs && typeof effectiveTfs === "object" && !Array.isArray(effectiveTfs)) ? (effectiveTfs[pair] || []) : [];
      return Array.isArray(tfs) && tfs.length > 0;
    });

    if (pairsWithTf.length === 0) {
      alert("⚠️ Vui lòng chọn ít nhất 1 khung thời gian (TF trade) để bắt đầu chạy bot!");
      return;
    }

    try {
      setIsStartingBot(true);
      const botUid = currentUid || localStorage.getItem("tls1_uid") || "default";

      // Tự động đồng bộ Ký quỹ cơ sở và Hệ số nhân cho tài khoản đang chọn trước khi Start bot
      try {
        try {
          localStorage.setItem(`tls1_risk_posVol_${activeBotTab}_${currentAcc}`, String(risk.posVol));
        } catch {}
        await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${botUid}&account_id=${encodeURIComponent(currentAcc)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: Number(risk.posVol),
            strategy_config: {
              ENABLE_TF_VOLUME_MULTIPLIER: Boolean(risk.multiplyVolumeByTf),
            },
          }),
        });
      } catch (e) {
        console.error("Lỗi đồng bộ cấu hình trước khi Start:", e);
      }

      const r = await fetch(`/api/bot/start?uid=${botUid}&strategy=${activeBotTab}&account_id=${currentAcc}`, { method: "POST" });
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
        const accLabel = accounts.find(a => a.id === currentAcc)?.name || currentAcc;
        addSystemLog(`🚀 [BOT] Đã khởi động ${activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot"} với tài khoản ${accLabel}${cleanMsg}`);
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
        if (errMsg.includes("BẢO VỆ TÀI SẢN") || errMsg.includes("Tài khoản chính")) {
          alert(errMsg);
          setConnectModalTab("fast");
          setShowConnectModal(true);
        } else if (errMsg.includes("liên hệ Admin") || errMsg.includes("kích hoạt") || errMsg.includes("bị khóa")) {
          alert("Vui lòng liên hệ Admin để kích hoạt.");
        } else if (r.status === 403 || errMsg.includes("chưa đăng ký dưới Link Ref") || errMsg.includes("chưa đăng ký dưới link") || errMsg.includes("chưa đăng ký")) {
          alert("UID tài khoản này của quý khách chưa đăng ký dưới Link Ref của AutoTrader.fun!");
          setShowSettings(true);
          setSettingsTab("system");
        } else {
          alert(`❌ Lỗi khởi động bot: ${errMsg || r.statusText}`);
        }
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
      const targetUid = currentUid || localStorage.getItem("tls1_uid") || "";
      if (!targetUid || targetUid === "default") {
        setIsStoppingBot(false);
        return;
      }
      const targetAcc = selectedAccount || effectiveAccId || "";
      const r = await fetch(`/api/bot/stop?strategy=${targetStrat}&uid=${targetUid}&account_id=${targetAcc}`, { method: "POST" });
      if (r.ok) {
        const resData = await r.json().catch(() => ({}));
        setOverrideBotRunning(false);
        if (setBotStatus) setBotStatus("SHADOW");
        setHttpActiveAccounts({});
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
    const targetAccountId = accountToDelete;
    if (!targetAccountId) {
      setShowDeleteAccountModal(false);
      return;
    }
    const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === targetAccountId)?.[0];
    let isRunningOnTarget = false;
    if (runningBot) {
      if (runningBot === activeBotTab) {
        isRunningOnTarget = (overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING"));
      } else {
        isRunningOnTarget = true;
      }
    }
    if (isRunningOnTarget) {
      const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
      alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản!`);
      setShowDeleteAccountModal(false);
      setAccountToDelete("");
      return;
    }
    setIsDeletingAccount(true);

    try {
      const currentAcc = accounts.find(a => a.id === targetAccountId);
      const accName = currentAcc?.name || targetAccountId;

      if (selectedAccount === targetAccountId) {
        setApiKey("");
        setSecretKey("");
        setPassphrase("");
        setSelectedAccount("");
        setPositions([]);
        setClosedPositions([]);
      }

      const remainingAccounts = accounts.filter(a => a.id !== targetAccountId);
      setAccounts(remainingAccounts);
      localStorage.setItem("tls1_accounts", JSON.stringify(remainingAccounts));

      setBotAccountMap(prev => {
        const next = { ...prev };
        for (const k in next) {
          if (next[k] === targetAccountId) next[k] = "";
        }
        localStorage.setItem("tls1_bot_accounts", JSON.stringify(next));
        return next;
      });

      if (remainingAccounts.length === 0) {
        localStorage.removeItem("tls1_last_detected_acc");
        localStorage.removeItem("tls1_account_name");
        setIsAuthenticated(false);
        localStorage.removeItem("tls1_auth");
        setLogs({ dashboardLines: [], eventLogs: ["🔌 Đã xoá tài khoản cuối cùng. Vui lòng kết nối để tiếp tục."] });
        addSystemLog(`🗑️ [ACCOUNT] Đã xoá tài khoản cuối cùng`);
      } else {
        setLogs({ dashboardLines: [], eventLogs: [`🗑️ [ACCOUNT] Đã xoá tài khoản: "${accName}". Đang chuyển sang tài khoản kế tiếp.`] });
        addSystemLog(`🗑️ [ACCOUNT] Đã xoá tài khoản: "${accName}"`);
      }

      const curUid = currentUid || localStorage.getItem("tls1_uid");
      if (curUid && curUid !== "default") {
        await fetch(`/api/bot/accounts/${targetAccountId}?uid=${curUid}`, { method: "DELETE" });
      }
    } catch (err) {
      console.error("Lỗi khi xóa tài khoản:", err);
    } finally {
      setShowDeleteAccountModal(false);
      setIsDeletingAccount(false);
      setAccountToDelete("");
    }
  };

  const handleDisconnectSpecificAccount = async (targetAccountId) => {
    if (!targetAccountId) return;
    const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === targetAccountId)?.[0];
    let isRunningOnTarget = false;
    if (runningBot) {
      if (runningBot === activeBotTab) {
        isRunningOnTarget = (overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING"));
      } else {
        isRunningOnTarget = true;
      }
    }
    if (isRunningOnTarget) {
      const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
      alert(`⚠️ Không thể ngắt kết nối tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi ngắt kết nối!`);
      return;
    }
    const currentAcc = accounts.find(a => a.id === targetAccountId);
    const accName = currentAcc?.name || targetAccountId;
    if (!window.confirm(`Bạn có chắc chắn muốn xóa (Delete) tài khoản OKX "${accName}" không?\n\n• Toàn bộ API Key liên kết của tài khoản này sẽ được xóa khỏi hệ thống.\n• Các lệnh chờ (Limit) chưa khớp sẽ được dọn dẹp.\n• Toàn bộ vị thế và TP/SL đã có trên sàn OKX vẫn được bảo lưu 100% an toàn.`)) {
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
      setLogs({ dashboardLines: [], eventLogs: [`🗑️ [ACCOUNT] Đã xóa tài khoản: "${accName}". Đang chuyển sang tài khoản ${nextAcc.name || nextAcc.id}.`] });
      addSystemLog(`🗑️ [ACCOUNT] Đã xóa tài khoản: "${accName}"`);
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
      setLogs({ dashboardLines: [], eventLogs: ["🔌 Đã ngắt kết nối toàn bộ tài khoản OKX."] });
      addSystemLog(`🔌 [ACCOUNT] Đã ngắt kết nối tài khoản OKX cuối cùng`);
    }

    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid");
      if (curUid && curUid !== "default") {
        await fetch(`/api/bot/accounts/${targetAccountId}?uid=${curUid}`, { method: "DELETE" });
      }
    } catch { }
  };

  useEffect(() => {
    setFadeClass("");
    setOverrideBotRunning(null);
    setTimeout(() => setFadeClass("tab-fade"), 10);

    if (activeBotTab === "sub1") {
      // Defaults for Bot EMA200
      setRisk({ posVol: 1, volUsdt: 1, volPct: 0.1, volUnit: "USDT", tpPct: 0.60, slPct: 0.60 });
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
      setRisk({ posVol: 1, tpPct: 5.0, slPct: 1.0, volUnit: "USDT" });
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
  const handleResetCapital = async (specifiedAcc = null) => {
    const isProp = currentPlatform === "e8";
    const targetAcc = specifiedAcc || selectedAccount || effectiveAccId || "";
    const promptMsg = isProp
      ? "Bạn có chắc chắn muốn Reset Vốn Gốc cho Quỹ FX (lấy số dư thực tế hiện tại làm mốc vốn mới)?"
      : `Bạn có chắc chắn muốn Reset Vốn Gốc cho tài khoản [${targetAcc || 'hiện tại'}] (hệ thống sẽ lấy số dư hiện tại từ OKX làm Vốn Gốc mới)?`;

    if (!window.confirm(promptMsg)) return;

    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      if (isProp) {
        const resp = await fetch(`/api/tradelocker/reset_capital?uid=${encodeURIComponent(curUid)}&account_id=${encodeURIComponent(targetAcc)}`, { method: "POST" });
        const data = await resp.json();
        if (resp.ok) {
          alert(data.message || `✅ Đã Reset Vốn Gốc Quỹ FX thành công! Vốn mới: $${Number(data.total_equity || 0).toLocaleString()}`);
          addSystemLog(`♻️ [QUỸ FX]: Đã Reset Vốn Gốc thành công! Mốc vốn mới: $${Number(data.total_equity || 0).toLocaleString()}`);
          if (typeof fetchPropLogs === "function") fetchPropLogs();
        } else {
          alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
        }
      } else {
        const resp = await fetch(`/api/bot/reset_capital?uid=${encodeURIComponent(curUid)}&strategy=${activeBotTab}&account_id=${encodeURIComponent(targetAcc)}`, { method: "POST" });
        const data = await resp.json();
        if (resp.ok) {
          const msg = data.message || `✅ Đã Reset Vốn Gốc thành công! Tổng vốn quét từ OKX: ${Number(data.total_equity || 0).toLocaleString()} USDT`;
          alert(msg);
          addSystemLog(`♻️ [HỆ THỐNG]: Đã Reset Vốn Gốc cho tài khoản [${targetAcc}] thành công! Tổng vốn quét từ sàn OKX: ${Number(data.total_equity || 0).toLocaleString()} USDT`);
          refreshBotData();
        } else {
          alert("❌ Lỗi: " + (data.detail || "Không rõ nguyên nhân"));
        }
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

  const handleSaveApiKey = async (customParams) => {
    const isCustom = customParams && typeof customParams === "object";
    let targetAcc = isCustom && customParams.accountId !== undefined ? customParams.accountId : selectedAccount;
    const cleanApiKey = (isCustom && customParams.apiKey !== undefined ? customParams.apiKey : apiKey)?.trim() || "";
    const cleanSecretKey = (isCustom && customParams.secretKey !== undefined ? customParams.secretKey : secretKey)?.trim() || "";
    const cleanPassphrase = (isCustom && customParams.passphrase !== undefined ? customParams.passphrase : passphrase)?.trim() || "";

    if (!cleanApiKey || !cleanSecretKey || !cleanPassphrase) {
      alert("⚠️ Vui lòng nhập đầy đủ Mã API (API Key), Khóa Bí Mật (Secret) và Cụm Mật Khẩu (Passphrase)!");
      return;
    }

    if (!targetAcc) {
      targetAcc = `sub_${Date.now()}`;
    }

    setIsSavingConfig(true);
    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "";
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
      setIsAuthenticated(true);
      localStorage.setItem("tls1_auth", "true");

      if (!isCustom) {
        setSelectedAccount(targetAcc);
        handleAssignAccountToActiveBot(targetAcc);
        setApiKey(cleanApiKey);
        setSecretKey(cleanSecretKey);
        setPassphrase(cleanPassphrase);
      }

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
          scalping_tp_pct: (risk.tpPct || 0.6) / 100,
          scalping_sl_pct: (risk.slPct || 0.6) / 100,
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
      const dcaMode = strat.pyramidDca ? "DCA Dương" : strat.negativeDca ? "DCA Âm" : "Lưới Đa Khung (Hedge)";
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
    if (!window.confirm("Bạn có chắc chắn muốn khôi phục toàn bộ cấu hình chiến thuật về MẶC ĐỊNH chuẩn (XAU, BTC, ETH - Ký quỹ 0.4$ - Chốt lời 0.8% - Cắt lỗ 0.8% - Lưới Đa Khung Hedge) không?")) return;

    setIsSavingConfig(true);
    try {
      const targetAcc = selectedAccount || effectiveAccId || "";
      if (activeBotTab === "sub1") {
        const defaultRisk = { posVol: 0.4, volUsdt: 0.4, volPct: 0.1, volUnit: "USDT", tpPct: 0.80, slPct: 0.80, multiplyVolumeByTf: false };
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
          altcoinFollowBtc: false,
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
          ALTCOIN_FOLLOW_BTC_EMA: false,
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
            position_volume: 0.4,
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
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định EMA200 Bot: Ký quỹ 0.4$, TP 0.8%, SL 0.8%, Lưới Đa Khung (Hedge), XAU/BTC/ETH${cancelMsg}`);
        refreshBotData();
      } else if (activeBotTab === "sub2") {
        setRisk({ posVol: 0.4, tpPct: 5.0, slPct: 1.0, volUnit: "USDT", multiplyVolumeByTf: false });
        setStrat({
          main: true, xole: false, dynamicEma200Tp: false,
          dynamicPingpongTp: false, altcoinFollowBtc: false,
          sidewaySafe: false, squeezeEscape: false, safeguardEntry: false,
          trailingSl: false, maxRoi: false, sidewayVap: false, h4Flip: false,
          timeframeBase: "1H",
        });
        const res = await fetch(`/api/bot/config?strategy=sub2&uid=${currentUid}&account_id=${targetAcc}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_volume: 0.4,
            scalping_tp_pct: 0.05,
            scalping_sl_pct: 0.01,
            ob_rr_ratio_trend: 5.0,
            ob_rr_ratio_counter: 1.0,
            strategy_config: { ENABLE_STRATEGY_MAIN: true, ENABLE_STRATEGY_SMC: true }
          })
        });
        let cancelMsg = "";
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          if (d?.canceled_count > 0) cancelMsg = ` (Đã hủy ${d.canceled_count} lệnh Limit cũ trên OKX)`;
        }
        alert(`✅ Đã khôi phục Cấu Hình Mặc Định cho SMC Bot thành công! (Thuận trend: 5.0R, Ngược trend: 1.0R)${cancelMsg}`);
        addSystemLog(`🔄 [HỆ THỐNG] Đã khôi phục Cấu Hình Mặc Định SMC Bot: Thuận 5.0R | Ngược 1.0R${cancelMsg}`);
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

  const handleLogout = async (targetUid) => {
    const curUid = targetUid || okxUid || currentUid || localStorage.getItem("tls1_uid") || "";
    if (curUid && curUid !== "default") {
      try {
        await fetch(`/api/auth/logout?uid=${curUid}`, { method: "POST" });
      } catch { }
    }
    localStorage.removeItem("tls1_auth");
    localStorage.removeItem("tls1_uid");
    localStorage.removeItem("tls1_accounts");
    localStorage.removeItem("tls1_bot_accounts");
    localStorage.removeItem("tls1_last_detected_acc");
    localStorage.removeItem("tls1_account_name");
    localStorage.removeItem("tls1_master_uid");
    localStorage.removeItem("tls1_login_uid");
    localStorage.removeItem("okx_oauth_state_raw");
    setAccounts([]);
    setSelectedAccount("");
    setApiKey("");
    setSecretKey("");
    setPassphrase("");
    setOkxUid("");
    setLoginUid("");
    setIsAuthenticated(false);
    setBotAccountMap({});
    setOverrideBotRunning(false);
    if (setBotStatus) setBotStatus("STOPPED");
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
        } else if (data.status === "error" && data.message && (data.message.includes("kích hoạt") || data.message.includes("Admin"))) {
          setLockMessage("⚠️ " + data.message);
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
  }, [logs, propLogs, currentPlatform]);

  const prevPropPosRef = useRef([]);
  const emptyConfirmCountRef = useRef(0);

  const fetchPropPositions = useCallback(async () => {
    try {
      const curUid = localStorage.getItem('tls1_uid') || loginUid || "default";
      const rProp = await fetch(`/api/tradelocker/positions?uid=${encodeURIComponent(curUid)}`);
      if (rProp.ok) {
        const propPos = await rProp.json();
        if (Array.isArray(propPos)) {
          // 🛡️ Chống flicker: Nếu trước đó đang có vị thế (>=1 lệnh) mà kết quả trả về đột ngột rỗng [],
          // xác nhận thêm 1 chu kỳ để tránh các nhịp glitch mạng chập chờn
          if (propPos.length === 0 && prevPropPosRef.current.length > 0 && emptyConfirmCountRef.current < 1) {
            emptyConfirmCountRef.current += 1;
            return;
          }
          emptyConfirmCountRef.current = 0;
          prevPropPosRef.current = propPos;
          setPropPositions(propPos);
        }
      }
    } catch { }
  }, [loginUid]);

  const fetchPropBotStatus = useCallback(async () => {
    try {
      const curUid = localStorage.getItem('tls1_uid') || loginUid || "default";
      const r = await fetch(`/api/tradelocker/bot/status?uid=${encodeURIComponent(curUid)}&strategy=${activeBotTab}`);
      if (r.ok) {
        const d = await r.json();
        setPropBotStatus(d.status || (d.is_running ? "RUNNING" : "STOPPED"));
        if (d.bot_prop_map) setPropBotMap(d.bot_prop_map);
        if (d.running_prop_bots) setRunningPropBots(d.running_prop_bots);
      }
    } catch { }
  }, [loginUid, activeBotTab]);

  const fetchPositions = useCallback(async () => {
    try {
      const curPlat = localStorage.getItem("tls1_trading_platform") || "okx";
      if (curPlat === "e8") {
        await fetchPropPositions();
        return;
      }

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
  }, [effectiveAccId, activeBotTab, loginUid, fetchPropPositions, setPositions, setClosedPositions]);

  // Listener khi chuyển đổi giữa SÀN OKX và QUỸ E8, hoặc đổi tài khoản Quỹ
  useEffect(() => {
    const onPlatformChanged = (e) => {
      const plat = e?.detail || localStorage.getItem("tls1_trading_platform") || "okx";
      setCurrentPlatform(plat);
      if (plat === "e8") {
        fetchPropPositions();
        fetchPropBotStatus();
      } else {
        fetchPositions();
      }
    };
    const onPropAccountChanged = () => {
      fetchPropPositions();
      fetchPropBotStatus();
    };
    window.addEventListener("tls1_platform_changed", onPlatformChanged);
    window.addEventListener("tls1_prop_account_changed", onPropAccountChanged);
    return () => {
      window.removeEventListener("tls1_platform_changed", onPlatformChanged);
      window.removeEventListener("tls1_prop_account_changed", onPropAccountChanged);
    };
  }, [fetchPositions, fetchPropPositions, fetchPropBotStatus]);

  // Polling chu kỳ cho Quỹ FX (cập nhật vị thế & trạng thái độc lập)
  useEffect(() => {
    fetchPropBotStatus();
    if (currentPlatform === "e8") {
      fetchPropPositions();
    }
    const interval = setInterval(() => {
      fetchPropBotStatus();
      if ((localStorage.getItem("tls1_trading_platform") || "okx") === "e8") {
        fetchPropPositions();
      }
    }, 2500);
    return () => clearInterval(interval);
  }, [currentPlatform, fetchPropBotStatus, fetchPropPositions]);

  // Periodic polling
  useEffect(() => {
    const isE8 = (localStorage.getItem("tls1_trading_platform") === "e8");
    if (!isAuthenticated && !isE8) return;
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
        if (!effectiveAccId) return;
        const accParam = effectiveAccId ? `&account_id=${encodeURIComponent(effectiveAccId)}` : "";
        const r = await fetch(`/api/bot/config?strategy=${activeBotTab}&uid=${localStorage.getItem('tls1_uid') || loginUid}${accParam}`);
        if (r.ok) {
          const d = await r.json();
          if (d.ENABLED_TFS) setEnabledTfs(d.ENABLED_TFS);
          if (d.ENABLED_COINS && Array.isArray(d.ENABLED_COINS) && d.ENABLED_COINS.length > 0) {
            setActivePairs(d.ENABLED_COINS.map(c => `${c}-USDT-SWAP`));
          }
          const bVol = (d.POSITION_VOLUME_HIGH_CONFIDENCE !== undefined && d.POSITION_VOLUME_HIGH_CONFIDENCE !== null) ? Number(d.POSITION_VOLUME_HIGH_CONFIDENCE) : null;
          if (bVol !== null && bVol > 0) {
            try {
              localStorage.setItem(`tls1_risk_posVol_${activeBotTab}_${effectiveAccId}`, String(bVol));
            } catch {}
          }
          const isSub2 = activeBotTab === "sub2";
          let parsedTp = isSub2 ? 5.0 : 0.80;
          let parsedSl = isSub2 ? 1.0 : 0.80;
          if (isSub2) {
            if (d.OB_RR_RATIO_TREND !== undefined) {
              parsedTp = Number(d.OB_RR_RATIO_TREND);
            } else if (d.SCALPING_TP_PCT) {
              const tpVal = Number((d.SCALPING_TP_PCT * 100).toFixed(2));
              parsedTp = (tpVal === 0.60 || tpVal === 1.5) ? 5.0 : tpVal;
            }
            if (d.OB_RR_RATIO_COUNTER !== undefined) {
              parsedSl = Number(d.OB_RR_RATIO_COUNTER);
            } else if (d.SCALPING_SL_PCT) {
              const slVal = Number((d.SCALPING_SL_PCT * 100).toFixed(2));
              parsedSl = (slVal === 0.60 || slVal === 1.5) ? 1.0 : slVal;
            }
          } else {
            parsedTp = d.SCALPING_TP_PCT ? Number((d.SCALPING_TP_PCT * 100).toFixed(2)) : 0.80;
            parsedSl = d.SCALPING_SL_PCT ? Number((d.SCALPING_SL_PCT * 100).toFixed(2)) : 0.80;
          }
          setRisk((r) => {
            const nextRisk = {
              ...r,
              posVol: (bVol !== null && bVol > 0) ? bVol : r.posVol,
              volUsdt: (bVol !== null && bVol > 0) ? bVol : r.volUsdt,
              tpPct: parsedTp,
              slPct: parsedSl,
              multiplyVolumeByTf: d.ENABLE_TF_VOLUME_MULTIPLIER !== undefined ? Boolean(d.ENABLE_TF_VOLUME_MULTIPLIER) : (r.multiplyVolumeByTf ?? false),
            };
            prevRiskRef.current = nextRisk;
            try {
              localStorage.setItem(`tls1_risk_${activeBotTab}_${effectiveAccId}`, JSON.stringify(nextRisk));
            } catch {}
            return nextRisk;
          });
          hasLoadedConfigFromBackendRef.current = true;
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
        activeTab={connectModalTab}
        onTabChange={setConnectModalTab}
        handleFastConnectClick={handleFastConnectClick}
        okxOAuthUrl={okxOAuthUrl}
        onSaveApiKey={handleSaveApiKey}
        isAuthenticated={isAuthenticated}
        currentUid={okxUid || currentUid || localStorage.getItem("tls1_uid") || ""}
        accounts={accounts}
        selectedAccount={selectedAccount}
        activeBotTab={activeBotTab}
        onAssignAccount={handleAssignAccountToActiveBot}
        onCreateAccount={() => {
          setNewAccountInput("");
          setShowAddAccountModal(true);
        }}
        onDeleteAccount={(accId) => {
          const targetId = accId || selectedAccount;
          if (!targetId || accounts.length === 0 || !accounts.some(a => a.id === targetId)) {
            alert("⚠️ Vui lòng chọn tài khoản cần xoá!");
            return;
          }
          const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, id]) => id === targetId)?.[0];
          let isRunningOnTarget = false;
          if (runningBot) {
            if (runningBot === activeBotTab) {
              isRunningOnTarget = (overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING"));
            } else {
              isRunningOnTarget = true;
            }
          }
          if (isRunningOnTarget) {
            const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
            alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản để bảo vệ an toàn vốn!`);
            return;
          }
          setAccountToDelete(targetId);
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
          onSelectBotTab={handleSelectBotTab}
          effectiveAccId={effectiveAccId}
          accounts={accounts}
          botAccountMap={botAccountMap}
          activeAccounts={mergedActiveAccounts}
          onAssignAccount={handleAssignAccountToActiveBot}
          onOpenSettings={() => { setShowSettings(true); setSettingsTab("strategy"); }}
          onStartTour={handleStartFullTour}
          isRiskCollapsed={isRiskCollapsed}
          setIsRiskCollapsed={setIsRiskCollapsed}
          onToggleRiskCollapse={() => setIsRiskCollapsed(!isRiskCollapsed)}
          risk={risk}
          setRisk={setRisk}
          isRunning={isRunning}
          isOkxRunning={isOkxRunning}
          isPropRunning={isPropRunning}
          propBotMap={propBotMap}
          runningPropBots={runningPropBots}
          onToggleMultiplyVolume={handleToggleMultiplyVolume}
          onOpenConnectModal={(tab) => { setShowConnectModal(true); if (tab) setConnectModalTab(tab); }}
          tradingPlatform={currentPlatform}
          propAccounts={propAccounts}
          activePropId={activePropId}
        />

        {/* MAIN SECTION */}
        <div className="main-section">
          {/* TOP HEADER */}
          <AppHeader
            accounts={accounts}
            effectiveAccId={effectiveAccId}
            onSelectAccount={handleAssignAccountToActiveBot}
            tradingPlatform={currentPlatform}
            onSwitchPlatform={handleSwitchPlatform}
            propAccounts={propAccounts}
            activePropId={activePropId}
            onSelectPropAccount={handleSelectPropAccount}
            isOkxRunning={isOkxRunning}
            isPropRunning={isPropRunning}
            activeAccounts={mergedActiveAccounts}
            onOpenConnectModal={(tab) => { setShowConnectModal(true); if (tab) setConnectModalTab(tab); }}
            activeBotTab={activeBotTab}
            accountBalance={accountBalance}
            slotCount={slotCount}
            maxSlots={100}
          />

          {/* BOT PANEL CARD */}
          <div className="bot-panel-card">
            {/* ACTION BAR: START / STOP BOT */}
            <div className="bot-action-bar" style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', boxSizing: 'border-box' }}>
              <div data-tour="action-bot" style={{ display: 'inline-flex', alignItems: 'center' }}>
                {(currentPlatform === "e8" ? isStartingPropBot : isStartingBot) ? (
                  <button
                    disabled
                    className="btn-action-start btn-action-loading"
                    style={{ width: "fit-content" }}
                  >
                    <span className="spinner" style={{ width: "13px", height: "13px", margin: "0 8px 0 0", borderWidth: "2px" }}></span>
                    {t("starting_bot")}
                  </button>
                ) : (currentPlatform === "e8" ? isStoppingPropBot : isStoppingBot) ? (
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
                    onClick={() => setShowStopBotModal(true)}
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
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <button
                  onClick={() => setShowConnectModal(true)}
                  className="btn-connect-okx"
                  data-tour="connect-okx"
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
                className={`main-workspace ${layoutMode} ${isSplitView ? "is-split-view" : "is-single-view"}`}
                style={isSplitView ? { '--chart-ratio': `${chartRatio}%` } : {}}
              >
                {/* 1. TOP SPLIT PANE (KHI BẬT CHẾ ĐỘ ⮃: BIỂU ĐỒ NẰM PHÍA TRÊN) */}
                {isSplitView && (
                  <>
                    <section className="pane-chart" style={{ position: "relative" }}>
                      <div className={`multi-chart-container layout-${chartLayout}`}>
                        {chartsConfig.slice(0, 4).map((cfg, idx) => (
                          <SingleChartPane
                            key={`split_chart_${idx}_${cfg.coin}_${cfg.tf}`}
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
                              try { localStorage.setItem("tls1_active_chart_index", idx); } catch {}
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
                  </>
                )}

                {/* 2. PANE TABS (BẢNG VỊ THẾ - LOGS - BIỂU ĐỒ) */}
                <section className="pane-tabs">
                  <div className="tab-bar-header" data-tour="bottom-tabs-bar">
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
                      onMouseDown={handleSplitBtnPointerDown}
                      onTouchStart={handleSplitBtnPointerDown}
                      onClick={(e) => e.preventDefault()}
                      title={isSplitView ? "Click: Thu gọn về Tab chung | Nắm kéo: Phân chia tỉ lệ biểu đồ và bảng" : "Tách Biểu Đồ lên trên và Bảng Vị Thế xuống dưới (Chia đôi màn hình)"}
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
                              key={`chart_${idx}_${cfg.coin}_${cfg.tf}`}
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
                                try { localStorage.setItem("tls1_active_chart_index", idx); } catch {}
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
                      <LogsTerminal 
                        logs={currentPlatform === "e8" ? propLogs : logs}
                        okxLogs={logs}
                        propLogs={propLogs}
                        currentPlatform={currentPlatform}
                        onSwitchPlatform={setCurrentPlatform}
                        isOkxRunning={isOkxRunning}
                        isPropRunning={isPropRunning}
                        activeBotTab={activeBotTab} 
                        selectedAccount={effectiveAccId}
                        hasActiveAccount={Boolean(effectiveAccId && accounts && accounts.length > 0 && accounts.some(a => a.id === effectiveAccId || a.name === effectiveAccId))}
                        accountsCount={accounts ? accounts.length : 0}
                        isAuthenticated={isAuthenticated}
                        onResetCapital={handleResetCapital}
                        positions={positions}
                        accountBalance={accountBalance}
                        runningAccId={mergedActiveAccounts[activeBotTab]}
                        accounts={accounts}
                      />
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
                        onRefreshPositions={fetchPositions}
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
          const runningBot = Object.entries(mergedActiveAccounts || {}).find(([strat, accId]) => accId === selectedAccount)?.[0];
          let isRunningOnTarget = false;
          if (runningBot) {
            if (runningBot === activeBotTab) {
              isRunningOnTarget = (overrideBotRunning !== null ? overrideBotRunning : (botStatus === "RUNNING"));
            } else {
              isRunningOnTarget = true;
            }
          }
          if (isRunningOnTarget) {
            const botName = runningBot === "sub1" ? "EMA200 Bot" : runningBot === "sub2" ? "SMC Bot" : "Liquidation Bot";
            alert(`⚠️ Không thể xoá tài khoản này vì ${botName} đang chạy giao dịch thực tế trên tài khoản này.\n\nVui lòng BẤM DỪNG BOT trước khi xoá tài khoản để bảo vệ an toàn vốn!`);
            return;
          }
          setAccountToDelete(selectedAccount);
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
        onStartSettingsTour={handleStartSettingsTour}
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
        onClose={() => {
          setShowDeleteAccountModal(false);
          setAccountToDelete("");
        }}
        accountName={accounts.find(a => a.id === accountToDelete)?.name || accountToDelete || "Tài khoản"}
        isMultiple={accounts.length > 1}
        isLoading={isDeletingAccount}
        onConfirm={confirmDeleteAccount}
      />

      <ConfirmStopBotModal
        isOpen={showStopBotModal}
        onClose={() => setShowStopBotModal(false)}
        botName={
          currentPlatform === "e8"
            ? `${activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot"} (Quỹ E8)`
            : (activeBotTab === "sub1" ? "EMA200 Bot" : activeBotTab === "sub2" ? "SMC Bot" : "Liquidation Bot")
        }
        accountName={
          currentPlatform === "e8"
            ? "Quỹ E8 (TradeLocker)"
            : (accounts.find(a => a.id === (selectedAccount || effectiveAccId))?.name || (selectedAccount || effectiveAccId || "Mặc định"))
        }
        isLoading={currentPlatform === "e8" ? isStoppingPropBot : isStoppingBot}
        onConfirm={async () => {
          if (currentPlatform === "e8") {
            await handleStopPropBot();
          } else {
            await handleStopBot();
          }
          setShowStopBotModal(false);
        }}
      />

      <ApiPermissionErrorModal
        isOpen={showApiPermissionModal}
        onClose={() => setShowApiPermissionModal(false)}
        accountName={accounts.find(a => a.id === (selectedAccount || effectiveAccId))?.name || (selectedAccount || effectiveAccId || "thanhbot")}
        onSwitchToFastConnect={() => {
          setShowApiPermissionModal(false);
          setConnectModalTab("fast");
          setShowConnectModal(true);
        }}
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

      {/* ONBOARDING TOUR CHO NGƯỜI MỚI (17 BƯỚC LIÊN TỤC TỪ NGOÀI VÀO TRONG CÀI ĐẶT) */}
      <OnboardingTour
        isOpen={showOnboardingTour}
        onClose={handleCloseTour}
        steps={tourSteps}
        initialStep={tourInitialStep}
      />

    </div>
  );
}

export default App;
