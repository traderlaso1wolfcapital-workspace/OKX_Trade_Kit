import React, { useState, useEffect, useRef } from "react";
import NumberSpinBox from "../common/NumberSpinBox";
import { useTranslation } from "../../i18n";

const getTextWidth = (text, font = "600 12px 'Segoe UI', sans-serif") => {
  if (!text) return 60;
  try {
    const canvas = getTextWidth.canvas || (getTextWidth.canvas = document.createElement("canvas"));
    const context = canvas.getContext("2d");
    context.font = font;
    return Math.ceil(context.measureText(text).width);
  } catch {
    return text.length * 7.5;
  }
};

export const OkxLogo = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="#ffffff"
    style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
  >
    <rect x="3" y="3" width="5.4" height="5.4" rx="1.2" />
    <rect x="15.6" y="3" width="5.4" height="5.4" rx="1.2" />
    <rect x="9.3" y="9.3" width="5.4" height="5.4" rx="1.2" />
    <rect x="3" y="15.6" width="5.4" height="5.4" rx="1.2" />
    <rect x="15.6" y="15.6" width="5.4" height="5.4" rx="1.2" />
  </svg>
);

export const E8Logo = ({ size = 14 }) => (
  <img
    src="/e8_logo.png"
    alt="E8"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      flexShrink: 0,
      display: "inline-block",
      verticalAlign: "middle",
      borderRadius: "2px",
    }}
  />
);

export const FtmoLogo = ({ size = 14 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="#38bdf8"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ flexShrink: 0, display: "inline-block", verticalAlign: "middle" }}
  >
    <polygon points="12 2 2 7 12 12 22 7 12 2" fill="rgba(56, 189, 248, 0.2)" />
    <polyline points="2 17 12 22 22 17" />
    <polyline points="2 12 12 17 22 12" />
  </svg>
);

// Pattern 1: Bot EMA200 - Đường sóng trung bình động uốn lượn qua nến
export const PatternEMA200 = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <line x1="5.5" y1="4" x2="5.5" y2="16" stroke="#26a69a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <rect x="4" y="7" width="3" height="6" rx="0.5" fill="#26a69a" opacity="0.85" />
    <line x1="14.5" y1="4" x2="14.5" y2="16" stroke="#ef5350" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <rect x="13" y="6" width="3" height="6" rx="0.5" fill="#ef5350" opacity="0.85" />
    <path d="M1.5 15 C 6 15, 7.5 7.5, 12.5 7.5 C 15.5 7.5, 16.5 4.5, 18.5 4.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Pattern 2: Bot SMC - Vùng khối hộp Order Block nét đứt & phản ứng hồi quy
export const PatternSMC = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2.5" y="10" width="15" height="7.5" rx="1.5" fill="rgba(41, 98, 255, 0.2)" stroke="#3b82f6" strokeWidth="1.3" strokeDasharray="2.5 1.5" />
    <path d="M2.5 6 L 7.5 4 L 11 10 L 16.5 4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="10" r="1.8" fill="#f59e0b" />
  </svg>
);

// Pattern 3: Bot Liquidation - Quét râu thanh khoản xuyên cản & đảo chiều
export const PatternLiquidation = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <line x1="1.5" y1="8.5" x2="18.5" y2="8.5" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.6" />
    <line x1="10" y1="2" x2="10" y2="18" stroke="#f43f5e" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="8" y="11" width="4" height="5" rx="0.6" fill="#f43f5e" />
    <path d="M14 4.5 L 10 1.5 L 6 4.5" stroke="#fb7185" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const formatOkxAccountTag = (account) => {
  if (!account) return "";
  const name = (account.name || "").trim();
  const apiLabel = (account.api_label || account.label || "").trim();

  // 1. Kiểm tra api_label trước (nếu có lưu)
  if (apiLabel) {
    if (apiLabel.includes("TLS1_")) {
      const digits = apiLabel.replace(/.*TLS1_/, "").replace(/\D/g, "");
      if (digits.length >= 4) return digits.slice(-4);
      if (digits.length > 0) return digits;
    }
    return apiLabel.replace(/^#/, "");
  }

  // 2. Nếu tên chứa mã Fast API dạng TLS1_1790574999 -> lấy 4 số cuối của mã API
  if (name.includes("TLS1_")) {
    const digits = name.replace(/.*TLS1_/, "").replace(/\D/g, "");
    if (digits.length >= 4) return digits.slice(-4);
    if (digits.length > 0) return digits;
  }

  // 3. Nếu tên là dạng "Tài khoản chính (7626)" hoặc "Tài khoản phụ (4999)" -> lấy trong ngoặc đơn
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch && parenMatch[1]) {
    return parenMatch[1].replace(/^#/, "");
  }

  // 4. Nếu tên là tên gợi nhớ người dùng tự đặt (như "Bot-m15", "Scalp-5m", "#4999")
  if (name && !name.toLowerCase().startsWith("tài khoản ") && name !== "sub1" && name !== "sub2" && name !== "sub3") {
    return name.replace(/^#/, "");
  }

  // 5. Fallback về 4 số cuối UID
  if (account.okx_uid) {
    return account.okx_uid.slice(-4);
  }

  return name ? name.replace(/^#/, "") : "OKX";
};

export default function SidebarLeft({
  activeBotTab,
  onSelectBotTab,
  accounts = [],
  effectiveAccId,
  botAccountMap = {},
  activeAccounts = {},
  onAssignAccount,
  handleAssignAccountToActiveBot,
  onOpenSettings,
  onStartTour,
  isRiskCollapsed = false,
  setIsRiskCollapsed,
  onToggleRiskCollapse,
  risk,
  setRisk,
  isRunning = false,
  isOkxRunning = false,
  isPropRunning = false,
  propBotMap = {},
  runningPropBots = {},
  onToggleMultiplyVolume,
  onOpenConnectModal,
  tradingPlatform: propTradingPlatform,
  propAccounts: passedPropAccounts,
  activePropId: passedActivePropId,
  e8Account: passedE8Account,
}) {
  const { t } = useTranslation();
  const [isBotMenuOpen, setIsBotMenuOpen] = useState(false);
  const botDropdownRef = useRef(null);

  const BOT_OPTIONS = [
    {
      id: "sub1",
      name: t("bot_ema200", "EMA200 Bot"),
      desc: t("desc_ema200", "Chiến thuật bám trend EMA200 đa khung"),
      pattern: <PatternEMA200 />,
    },
    {
      id: "sub2",
      name: t("bot_smc", "SMC Bot"),
      desc: t("desc_smc", "Bắt phản ứng Order Block & Dòng tiền"),
      pattern: <PatternSMC />,
    },
    {
      id: "sub3",
      name: t("bot_liquidation", "Liquidation Bot"),
      desc: t("desc_liquidation", "Quét râu thanh khoản & Đảo chiều"),
      pattern: <PatternLiquidation />,
    },
  ];

  const currentBot = BOT_OPTIONS.find((b) => b.id === activeBotTab) || BOT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (botDropdownRef.current && !botDropdownRef.current.contains(e.target)) {
        setIsBotMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const [tradingPlatform, setTradingPlatform] = useState(() => propTradingPlatform || localStorage.getItem("tls1_trading_platform") || "okx");
  useEffect(() => {
    if (propTradingPlatform) setTradingPlatform(propTradingPlatform);
  }, [propTradingPlatform]);

  const [e8Account, setE8Account] = useState(passedE8Account || null);
  const [propAccounts, setPropAccounts] = useState(passedPropAccounts || []);
  const [activePropId, setActivePropId] = useState(passedActivePropId || "");

  useEffect(() => {
    if (passedPropAccounts && passedPropAccounts.length > 0) setPropAccounts(passedPropAccounts);
  }, [passedPropAccounts]);

  useEffect(() => {
    if (passedActivePropId) setActivePropId(passedActivePropId);
  }, [passedActivePropId]);

  useEffect(() => {
    if (passedE8Account) setE8Account(passedE8Account);
  }, [passedE8Account]);
  const [localBotPropMap, setLocalBotPropMap] = useState({});
  const [localRunningPropBots, setLocalRunningPropBots] = useState({});
  const [e8Lot, setE8Lot] = useState(() => {
    const saved = localStorage.getItem("tls1_e8_lot");
    if (!saved || saved === "0.03" || Number(saved) === 0.03) {
      try { localStorage.setItem("tls1_e8_lot", "0.01"); } catch {}
      return 0.01;
    }
    return Number(saved) || 0.01;
  });
  const [e8RiskUsd, setE8RiskUsd] = useState(() => Number(localStorage.getItem("tls1_e8_risk_usd")) || 25);
  const [e8DailyLoss, setE8DailyLoss] = useState(() => Number(localStorage.getItem("tls1_e8_daily_loss")) || 125);

  const updateE8Config = (newRisk, newDailyLoss, newLot) => {
    const rVal = newRisk !== undefined ? newRisk : e8RiskUsd;
    const dlVal = newDailyLoss !== undefined ? newDailyLoss : e8DailyLoss;
    const lotVal = newLot !== undefined ? newLot : e8Lot;
    const curUid = localStorage.getItem("tls1_uid") || "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    };
    fetch("/api/tradelocker/config", {
      method: "POST",
      headers,
      body: JSON.stringify({
        uid: curUid,
        account_id: activePropId || undefined,
        risk_per_trade: Number(rVal),
        daily_drawdown_limit: Number(dlVal),
        fund_size: e8Account?.fund_size || 5000,
        daily_profit_cap: e8Account?.daily_profit_cap || 100,
        fixed_lot: Number(lotVal) || 0.01,
        is_enabled: true
      })
    }).catch(() => {});
  };

  const fetchE8Account = () => {
    const rawUid = localStorage.getItem("tls1_uid");
    const curUid = (rawUid && rawUid !== "undefined" && rawUid !== "null") ? rawUid : "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};

    // 1. Tải danh sách tất cả các tài khoản Quỹ đã kết nối
    fetch(`/api/tradelocker/accounts?uid=${encodeURIComponent(curUid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.status === "success" && Array.isArray(d.accounts)) {
          setPropAccounts(d.accounts);
          if (d.accounts.length > 0) {
            if (d.active_id) {
              setActivePropId(d.active_id);
            }
            if (d.bot_prop_map) setLocalBotPropMap(d.bot_prop_map);
            if (d.running_prop_bots) setLocalRunningPropBots(d.running_prop_bots);
          } else {
            setActivePropId("");
            setE8Account(null);
            if (tradingPlatform !== "okx") {
              handlePlatformSwitch("okx");
            }
          }
        }
      })
      .catch(() => {});

    // 2. Tải chi tiết tài khoản Quỹ đang active
    fetch(`/api/tradelocker/account?uid=${encodeURIComponent(curUid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.is_connected && d.status === "success") {
          setE8Account(d);
          setPropAccounts((prev) => {
            if (!prev || prev.length === 0) {
              return [{
                id: d.account_id ? `prop_${(d.server || 'e8').toLowerCase()}_${d.account_id}` : 'default',
                account_id: d.account_id,
                name: d.name || `${d.server || 'E8'} Demo #${d.account_id}`,
                firm: d.server || 'E8',
                server: d.server || 'E8',
                balance: d.balance || 5000,
                equity: d.equity || 5000
              }];
            }
            return prev;
          });
          if (d.risk_per_trade) {
            setE8RiskUsd(Number(d.risk_per_trade));
            localStorage.setItem("tls1_e8_risk_usd", d.risk_per_trade);
          }
          if (d.daily_loss_limit) {
            setE8DailyLoss(Number(d.daily_loss_limit));
            localStorage.setItem("tls1_e8_daily_loss", d.daily_loss_limit);
          }
          if (d.fixed_lot) {
            setE8Lot(Number(d.fixed_lot));
            localStorage.setItem("tls1_e8_lot", d.fixed_lot);
          }
        }
      })
      .catch(() => {});
  };

  const effectiveBotMap = (propBotMap && Object.keys(propBotMap).length > 0) ? propBotMap : localBotPropMap;
  const effectiveRunningBots = (runningPropBots && Object.keys(runningPropBots).length > 0) ? runningPropBots : localRunningPropBots;

  const getOkxRunningBot = (acc) => {
    if (!acc) return null;
    const accId = String(acc.id || "").trim();
    const accName = String(acc.name || "").trim();
    const cleanAccName = accName.replace(/^#/, "").toLowerCase();

    for (const st of ["sub1", "sub2", "sub3"]) {
      const runningTarget = activeAccounts ? activeAccounts[st] : null;
      if (runningTarget) {
        const targetStr = String(runningTarget).trim();
        const cleanTarget = targetStr.replace(/^#/, "").toLowerCase();
        if (
          targetStr === accId ||
          targetStr === accName ||
          (cleanTarget && (cleanTarget === cleanAccName || cleanTarget === accId.toLowerCase()))
        ) {
          return st;
        }
      }
    }
    if (isOkxRunning && (!activeAccounts || !activeAccounts[activeBotTab]) && (accId === effectiveAccId || accName === effectiveAccId)) {
      return activeBotTab;
    }
    return null;
  };

  const getPropRunningBot = (pAcc) => {
    if (!pAcc) return null;
    const pId = pAcc.id;
    const pAccId = pAcc.account_id ? String(pAcc.account_id) : "";
    for (const st of ["sub1", "sub2", "sub3"]) {
      if (effectiveRunningBots[st]) {
        const mapped = effectiveBotMap[st];
        if (mapped && (mapped === pId || mapped === pAccId || `prop_${(pAcc.firm || "e8").toLowerCase()}_${mapped}` === pId)) {
          return st;
        }
      }
    }
    return null;
  };

  const handleSelectPropAccount = (accId) => {
    if (accId === "__connect__") {
      onOpenConnectModal && onOpenConnectModal("tradelocker");
      return;
    }
    const curUid = localStorage.getItem("tls1_uid") || "default";
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
          fetchE8Account();
          window.dispatchEvent(new CustomEvent("tls1_prop_account_changed", { detail: accId }));
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchE8Account();
    const handleAccountChange = () => fetchE8Account();
    window.addEventListener("tls1_prop_account_changed", handleAccountChange);
    const interval = setInterval(fetchE8Account, 15000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("tls1_prop_account_changed", handleAccountChange);
    };
  }, []);

  const [isPlatformMenuOpen, setIsPlatformMenuOpen] = useState(false);
  const platformDropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (platformDropdownRef.current && !platformDropdownRef.current.contains(e.target)) {
        setIsPlatformMenuOpen(false);
      }
    };
    if (isPlatformMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isPlatformMenuOpen]);

  useEffect(() => {
    const handlePlatformChange = (e) => {
      if (e.detail && (e.detail === "okx" || e.detail === "e8")) {
        setTradingPlatform(e.detail);
      }
    };
    window.addEventListener("tls1_platform_changed", handlePlatformChange);
    return () => window.removeEventListener("tls1_platform_changed", handlePlatformChange);
  }, []);

  const handlePlatformSwitch = (platform) => {
    setTradingPlatform(platform);
    localStorage.setItem("tls1_trading_platform", platform);
    window.dispatchEvent(new CustomEvent("tls1_platform_changed", { detail: platform }));
  };

  const handleToggle = () => {
    if (typeof onToggleRiskCollapse === "function") {
      onToggleRiskCollapse();
    } else if (typeof setIsRiskCollapsed === "function") {
      setIsRiskCollapsed(!isRiskCollapsed);
    }
  };

  const handleAccountSelect = (accId) => {
    if (typeof onAssignAccount === "function") {
      onAssignAccount(accId);
    } else if (typeof handleAssignAccountToActiveBot === "function") {
      handleAssignAccountToActiveBot(accId);
    }
  };

  const getBotLabel = () => {
    if (activeBotTab === "sub1") return t("bot_ema200");
    if (activeBotTab === "sub2") return t("bot_smc");
    return t("bot_liquidation");
  };

  return (
    <aside
      className="sidebar-left"
      style={{
        position: "relative",
        zIndex: isBotMenuOpen ? 250 : 1,
        overflow: isBotMenuOpen ? "visible" : undefined,
      }}
    >
      <div className="sidebar-header">
        <div className="app-title">TRADER LÀ SỐ 1</div>
        <div className="app-subtitle">VIỆT NAM</div>
      </div>

      <div
        className="sidebar-content"
        style={{
          overflow: isBotMenuOpen ? "visible" : undefined,
        }}
      >
        <div
          className="group-box"
          style={{
            position: "relative",
            marginTop: "12px",
            paddingTop: "15px",
            overflow: "visible",
            zIndex: isBotMenuOpen ? 250 : 1,
          }}
        >
          <span
            className="group-box-title"
            style={{
              display: "none",
              color: "#ffffff",
              fontSize: "12.5px",
              fontWeight: "bold",
              textTransform: "none",
              alignItems: "center",
              gap: "4px",
            }}
          >
          </span>

          <div
            className="group-box-actions"
            style={{
              position: "absolute",
              top: "-10px",
              left: "50%",
              transform: "translateX(-50%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 6px",
              backgroundColor: "var(--sidebar-bg, #252526)",
              zIndex: 2,
            }}
          >
            <button
              type="button"
              className="btn-group-box-collapse"
              onClick={handleToggle}
              style={{
                background: "transparent",
                border: "none",
                color: "#aaa",
                cursor: "pointer",
                fontSize: "12px",
                padding: "2px 4px",
                lineHeight: 1,
              }}
              title={isRiskCollapsed ? "Mở rộng cấu hình tài khoản" : "Thu gọn cấu hình tài khoản"}
            >
              {isRiskCollapsed ? "▼" : "▲"}
            </button>
          </div>

          {/* HÀNG 1: DROPDOWN CHỌN CHIẾN THUẬT BOT (EMA200 / SMC / LIQUIDATION), HƯỚNG DẪN VÀ CÀI ĐẶT */}
          {(() => {
            const isOkx = tradingPlatform === "okx";
            const isCurrentBotRunning = isOkx ? Boolean(isOkxRunning || isRunning) : Boolean(isPropRunning || isRunning);

            return (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px" }}>
                {/* Custom Dropdown Lựa Chọn Chiến Thuật Bot - TỰ ĐỘNG KHÓA KHI ĐANG CHẠY BOT */}
                <div ref={botDropdownRef} style={{ position: "relative", flex: 1, minWidth: 0, zIndex: isBotMenuOpen ? 300 : 1 }}>
                  <button
                    type="button"
                    data-tour="bot-selector"
                    disabled={isCurrentBotRunning}
                    onClick={() => {
                      if (!isCurrentBotRunning) {
                        setIsBotMenuOpen(!isBotMenuOpen);
                      }
                    }}
                    style={{
                      width: "100%",
                      height: "30px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: "6px",
                      padding: "0 8px 0 10px",
                      borderRadius: "6px",
                      fontSize: "12px",
                      fontWeight: 700,
                      cursor: isCurrentBotRunning ? "not-allowed" : "pointer",
                      transition: "all 0.18s ease",
                      background: isCurrentBotRunning ? "rgba(24, 18, 8, 0.96)" : "rgba(18, 14, 6, 0.92)",
                      border: isCurrentBotRunning
                        ? "1px solid rgba(245, 158, 11, 0.35)"
                        : (isBotMenuOpen ? "1px solid rgba(245, 158, 11, 0.85)" : "1px solid rgba(245, 158, 11, 0.45)"),
                      color: isCurrentBotRunning ? "#d97706" : "#fbbf24",
                      boxShadow: isBotMenuOpen
                        ? "0 0 8px rgba(245, 158, 11, 0.3), inset 0 1px 4px rgba(0, 0, 0, 0.6)"
                        : "inset 0 1px 4px rgba(0, 0, 0, 0.6)",
                      outline: "none",
                      opacity: isCurrentBotRunning ? 0.92 : 1,
                    }}
                    title={isCurrentBotRunning ? "🔒 Bot đang chạy - Vui lòng dừng bot để thay đổi chiến thuật" : "Chọn chiến thuật bot (EMA200 Bot / SMC Bot / Liquidation Bot)"}
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                        {currentBot.pattern}
                      </span>
                      <span>{currentBot.name}</span>
                    </div>
                    {isCurrentBotRunning ? (
                      <span style={{ fontSize: "11px", color: "#f59e0b", flexShrink: 0, marginLeft: "4px" }} title="Đã khóa chiến thuật khi đang chạy bot">
                        🔒
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "9px",
                          color: "#fbbf24",
                          flexShrink: 0,
                          marginLeft: "4px",
                          userSelect: "none",
                        }}
                      >
                        {isBotMenuOpen ? "▼" : "▲"}
                      </span>
                    )}
                  </button>

                  {/* Popup Menu Lựa Chọn Chiến Thuật Bot - CƠ CHẾ DROPUP LẬT LÊN TRÊN */}
                  {isBotMenuOpen && !isCurrentBotRunning && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: "calc(100% + 6px)",
                        left: 0,
                        minWidth: "220px",
                        maxWidth: "290px",
                        maxHeight: "260px",
                        overflowY: "auto",
                        scrollbarWidth: "thin",
                        scrollbarColor: "rgba(245, 158, 11, 0.4) transparent",
                        zIndex: 9999,
                        background: "rgba(15, 23, 42, 0.98)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "7px",
                        boxShadow: "0 -10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 0, 0, 0.5)",
                        padding: "5px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                      }}
                    >
                      {BOT_OPTIONS.map((bot) => {
                        const isSelected = bot.id === activeBotTab;
                        return (
                          <button
                            key={bot.id}
                            type="button"
                            onClick={() => {
                              if (typeof onSelectBotTab === "function") {
                                onSelectBotTab(bot.id);
                              }
                              setIsBotMenuOpen(false);
                            }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              width: "100%",
                              padding: "6px 8px",
                              borderRadius: "5px",
                              fontSize: "11px",
                              fontWeight: 700,
                              cursor: "pointer",
                              transition: "all 0.15s ease",
                              background: isSelected ? "rgba(18, 14, 6, 0.95)" : "transparent",
                              border: isSelected ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid transparent",
                              color: isSelected ? "#fbbf24" : "#cbd5e1",
                              textAlign: "left",
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "rgba(245, 158, 11, 0.12)";
                                e.currentTarget.style.color = "#fde68a";
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = "transparent";
                                e.currentTarget.style.color = "#cbd5e1";
                              }
                            }}
                          >
                            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", flexShrink: 0 }}>
                                {bot.pattern}
                              </span>
                              <div style={{ display: "flex", flexDirection: "column" }}>
                                <span style={{ fontSize: "11.5px", fontWeight: isSelected ? 800 : 600 }}>{bot.name}</span>
                                <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 400 }}>{bot.desc}</span>
                              </div>
                            </div>
                            {isSelected && <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>✓</span>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

            {/* 1. Nút Hướng Dẫn (nhỏ gọn, tinh tế, không chấm xanh) */}
            <button
              type="button"
              className="btn-tour-guide"
              data-tour="tour-btn"
              onClick={onStartTour}
              style={{
                height: "28px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 8px",
                fontSize: "11.5px",
                fontWeight: 700,
                borderRadius: "5px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                border: "1px solid #6366f1",
                color: "#ffffff",
                boxShadow: "0 2px 6px rgba(79, 70, 229, 0.3)",
                transition: "all 0.18s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.filter = "brightness(1.15)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.filter = "brightness(1.0)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
              title={t("guide_tooltip", "Khám phá toàn bộ hệ thống bot cho người mới (19 bước từ A đến Z)")}
            >
              <span>{t("guide_btn", "Hướng Dẫn")}</span>
            </button>

            {/* 2. Nút Cài Đặt */}
            <button
              type="button"
              className="btn-chart-settings"
              data-tour="settings-btn"
              style={{
                height: "28px",
                padding: "0 10px",
                fontSize: "12px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              onClick={onOpenSettings}
              title="Cài đặt hệ thống & API Key"
            >
              ⚙ {t("settings")}
            </button>
          </div>
        );
      })()}

          {!isRiskCollapsed && (
            <div className="risk-grid">
              {/* 1. HÀNG KÝ QUỸ */}
              <div
                className="risk-row"
                data-tour="margin-config"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
                  <label style={{ margin: 0, whiteSpace: "nowrap", fontSize: "11.5px", color: "#fff", fontWeight: "bold" }}>
                    {tradingPlatform === "e8" ? "Khối lượng:" : t("margin_label")}
                  </label>
                  <div style={{ display: "flex", gap: "2px" }}>
                    {tradingPlatform === "e8" ? (
                      <button
                        type="button"
                        className="risk-unit-btn active"
                        style={{
                          padding: "1px 5px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          lineHeight: "1.1",
                          borderRadius: "4px",
                          border: "1px solid #444",
                          background: "#26a69a",
                          color: "#fff",
                          cursor: "default",
                        }}
                      >
                        <span style={{ display: "inline-block", transform: "translateY(1px)" }}>LOT</span>
                      </button>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isRunning}
                          className={`risk-unit-btn ${risk.volUnit === "USDT" ? "active" : ""}`}
                          onClick={() => {
                            if (isRunning) return;
                            setRisk((r) => {
                              const currentVal = r.posVol;
                              const savedPct = r.volUnit === "LOT" ? currentVal : r.volPct;
                              return { ...r, volUnit: "USDT", volPct: savedPct, posVol: r.volUsdt || 1 };
                            });
                          }}
                          style={{
                            padding: "1px 5px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            lineHeight: "1.1",
                            borderRadius: "4px",
                            border: "1px solid #444",
                            background: risk.volUnit === "USDT" ? "#26a69a" : "#222",
                            color: risk.volUnit === "USDT" ? "#fff" : "#888",
                            cursor: isRunning ? "not-allowed" : "pointer",
                            opacity: isRunning ? 0.7 : 1,
                          }}
                          title={isRunning ? "Bot đang chạy - Dừng bot để đổi loại ký quỹ" : ""}
                        >
                          <span style={{ display: "inline-block", transform: "translateY(1px)" }}>USDT</span>
                        </button>
                        <button
                          type="button"
                          disabled={isRunning}
                          className={`risk-unit-btn ${risk.volUnit === "LOT" ? "active" : ""}`}
                          onClick={() => {
                            if (isRunning) return;
                            setRisk((r) => {
                              const currentVal = r.posVol;
                              const savedUsdt = r.volUnit === "USDT" ? currentVal : r.volUsdt;
                              return { ...r, volUnit: "LOT", volUsdt: savedUsdt, posVol: r.volPct || 0.1 };
                            });
                          }}
                          style={{
                            padding: "1px 5px",
                            fontSize: "10px",
                            fontWeight: "bold",
                            lineHeight: "1.1",
                            borderRadius: "4px",
                            border: "1px solid #444",
                            background: risk.volUnit === "LOT" ? "#26a69a" : "#222",
                            color: risk.volUnit === "LOT" ? "#fff" : "#888",
                            cursor: isRunning ? "not-allowed" : "pointer",
                            opacity: isRunning ? 0.7 : 1,
                          }}
                          title={isRunning ? "Bot đang chạy - Dừng bot để đổi loại ký quỹ" : ""}
                        >
                          <span style={{ display: "inline-block", transform: "translateY(1px)" }}>{t("capital_percent")}</span>
                        </button>
                      </>
                    )}
                  </div>

                  {/* Nút xổ xuống: Cố định / nhân Hệ số Ký Quỹ (Vốn) - Chỉ hiển thị ở Sàn Coin OKX, Quỹ FX mặc định cố định theo Lot */}
                  {tradingPlatform !== "e8" && (
                    <div
                      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
                      title={
                        isRunning
                          ? "Vui lòng dừng bot để thay đổi thiết lập này"
                          : risk.multiplyVolumeByTf
                          ? "Đang BẬT: Khối lượng ký quỹ nhân theo hệ số TF (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0)"
                          : "Đang TẮT: Cố định 1 mức ký quỹ cơ sở ban đầu cho tất cả các khung thời gian"
                      }
                    >
                      <div
                        className={`risk-mult-badge ${risk.multiplyVolumeByTf ? "active" : ""}`}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          padding: "1px 5px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          borderRadius: "4px",
                          border: "1px solid #444",
                          background: "#222",
                          cursor: isRunning ? "not-allowed" : "pointer",
                          userSelect: "none",
                          whiteSpace: "nowrap",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <span className="risk-mult-text" style={{ color: risk.multiplyVolumeByTf ? "#26a69a" : "#dddddd" }}>
                          {risk.multiplyVolumeByTf ? t("multiply_tf") : t("fixed")}
                        </span>
                        <span className="risk-mult-arrow" style={{ fontSize: "8px", opacity: 0.95, color: risk.multiplyVolumeByTf ? "#26a69a" : "#ffffff" }}>▼</span>
                      </div>

                      <select
                        value={risk.multiplyVolumeByTf ? "multiply" : "fixed"}
                        disabled={isRunning}
                        onChange={(e) => {
                          if (isRunning) return;
                          const nextVal = e.target.value === "multiply";
                          if (onToggleMultiplyVolume) {
                            onToggleMultiplyVolume(nextVal);
                          } else {
                            setRisk((r) => ({ ...r, multiplyVolumeByTf: nextVal }));
                          }
                        }}
                        style={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          opacity: 0,
                          cursor: isRunning ? "not-allowed" : "pointer",
                        }}
                      >
                        <option value="fixed" style={{ background: "#222", color: "#fff" }}>{t("fixed")}</option>
                        <option value="multiply" style={{ background: "#222", color: "#26a69a" }}>{t("multiply_margin_tf")}</option>
                      </select>
                    </div>
                  )}
                </div>

                {tradingPlatform === "e8" ? (
                  <NumberSpinBox
                    value={e8Lot}
                    disabled={isRunning}
                    onChange={(val) => {
                      if (isRunning) return;
                      setE8Lot(val);
                      localStorage.setItem("tls1_e8_lot", val);
                      updateE8Config(undefined, undefined, val);
                    }}
                    min={0.01}
                    max={10.0}
                    step={0.01}
                    suffix="L"
                    width="84px"
                  />
                ) : (
                  <NumberSpinBox
                    value={risk.posVol}
                    disabled={isRunning}
                    onChange={(val) => {
                      if (isRunning) return;
                      setRisk((r) => {
                        const numVal = Number(val) || val;
                        const updated = (r.volUnit === "USDT") ? { ...r, posVol: numVal, volUsdt: numVal } : { ...r, posVol: numVal, volPct: numVal };
                        try {
                          localStorage.setItem(`tls1_risk_posVol_${activeBotTab}`, String(numVal));
                        } catch {}
                        return updated;
                      });
                    }}
                    min={risk.volUnit === "LOT" ? 0.05 : 0.1}
                    step={risk.volUnit === "LOT" ? 0.05 : 0.1}
                    suffix={risk.volUnit === "USDT" ? "$" : "%"}
                    width="84px"
                  />
                )}
              </div>

              {/* 2. HÀNG TP & SL GỐC M5 (DÙNG CHUNG CẢ OKX VÀ E8) */}
              <div data-tour="tpsl-config" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {activeBotTab === "sub1" ? (
                  <>
                    <div className="risk-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <label style={{ margin: 0 }}>{t("tp_m5_label")}</label>
                        <button
                          type="button"
                          className="btn-help"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Tỷ lệ % chốt lời cơ sở tính trên khung M5. Khi khớp lệnh ở các khung lớn hơn (M15, H1, H4...), mức chốt lời sẽ tự động nhân với Hệ số Ký Quỹ của khung đó (ví dụ M5 0.5% * H1 x2.0 = TP 1.0%).");
                          }}
                          title="Tỷ lệ % chốt lời cơ sở M5 (nhân hệ số TF ở các khung lớn)."
                        >
                          [?]
                        </button>
                      </div>
                      <NumberSpinBox
                        value={risk.tpPct}
                        onChange={(val) => setRisk((r) => ({ ...r, tpPct: val }))}
                        min={0.1}
                        step={0.05}
                        suffix="%"
                        width="84px"
                      />
                    </div>
                    <div className="risk-row">
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <label style={{ margin: 0 }}>{t("sl_m5_label")}</label>
                        <button
                          type="button"
                          className="btn-help"
                          onClick={(e) => {
                            e.stopPropagation();
                            alert("Tỷ lệ % cắt lỗ an toàn cơ sở tính trên khung M5. Khi khớp lệnh ở các khung lớn hơn, mức cắt lỗ sẽ tự động nhân với Hệ số Ký Quỹ tương ứng để tương thích với biên độ nến khung lớn.");
                          }}
                          title="Tỷ lệ % cắt lỗ cơ sở M5 (nhân hệ số TF ở các khung lớn)."
                        >
                          [?]
                        </button>
                      </div>
                      <NumberSpinBox
                        value={risk.slPct}
                        onChange={(val) => setRisk((r) => ({ ...r, slPct: val }))}
                        min={0.1}
                        step={0.05}
                        suffix="%"
                        width="84px"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="risk-row">
                      <label>Tỷ lệ chốt lời Thuận Trend:</label>
                      <NumberSpinBox
                        value={risk.tpPct}
                        onChange={(val) => setRisk((r) => ({ ...r, tpPct: val }))}
                        min={0.1}
                        step={0.5}
                        suffix="R"
                        width="84px"
                      />
                    </div>
                    <div className="risk-row">
                      <label>Tỷ lệ chốt lời Ngược Trend:</label>
                      <NumberSpinBox
                        value={risk.slPct}
                        onChange={(val) => setRisk((r) => ({ ...r, slPct: val }))}
                        min={0.1}
                        step={0.5}
                        suffix="R"
                        width="84px"
                      />
                    </div>
                  </>
                )}


              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
