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

const OkxLogo = ({ size = 14 }) => (
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

const E8Logo = ({ size = 14 }) => (
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

const FtmoLogo = ({ size = 14 }) => (
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
}) {
  const { t } = useTranslation();
  const [tradingPlatform, setTradingPlatform] = useState(() => localStorage.getItem("tls1_trading_platform") || "okx");
  const [e8Account, setE8Account] = useState(null);
  const [propAccounts, setPropAccounts] = useState([]);
  const [activePropId, setActivePropId] = useState("");
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
        if (d && d.status === "success" && Array.isArray(d.accounts) && d.accounts.length > 0) {
          setPropAccounts(d.accounts);
          if (d.active_id) {
            setActivePropId(d.active_id);
          }
          if (d.bot_prop_map) setLocalBotPropMap(d.bot_prop_map);
          if (d.running_prop_bots) setLocalRunningPropBots(d.running_prop_bots);
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
    if (isOkxRunning && (accId === effectiveAccId || accName === effectiveAccId)) {
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
    <aside className="sidebar-left">
      <div className="sidebar-header">
        <div className="app-title">TRADER LÀ SỐ 1</div>
        <div className="app-subtitle">VIỆT NAM</div>
      </div>

      <div className="sidebar-content">
        <div className="group-box" style={{ position: "relative", marginTop: "12px", paddingTop: "15px" }}>
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

          {/* HÀNG 1: DROPDOWN CHỌN SÀN / QUỸ TÍCH HỢP TOÀN BỘ TÀI KHOẢN KẾT NỐI, HƯỚNG DẪN VÀ CÀI ĐẶT */}
          {(() => {
            const currentOkxAcc = accounts.find((a) => a.id === effectiveAccId || a.name === effectiveAccId) || accounts[0];
            const currentPropAcc = propAccounts.find((a) => a.id === activePropId) || propAccounts[0];

            const isOkx = tradingPlatform === "okx";
            const displayPlatformName = isOkx ? "SÀN OKX" : `QUỸ ${(currentPropAcc?.firm || "E8").toUpperCase()}`;
            let displayAccountTag = "";
            if (isOkx) {
              if (currentOkxAcc) {
                displayAccountTag = formatOkxAccountTag(currentOkxAcc);
              }
            } else {
              if (currentPropAcc) {
                const rawTag = (currentPropAcc.account_id || currentPropAcc.id || "").toString();
                displayAccountTag = rawTag ? rawTag.replace(/^#/, "") : "";
              }
            }

            const okxRunningStrat = getOkxRunningBot(currentOkxAcc);
            const isThisOkxRunning = isOkx && (okxRunningStrat === activeBotTab || (!okxRunningStrat && isOkxRunning));
            const otherOkxRunningStrat = (isOkx && okxRunningStrat && okxRunningStrat !== activeBotTab) ? okxRunningStrat : null;

            const propRunningStrat = getPropRunningBot(currentPropAcc);
            const isThisPropRunning = !isOkx && (propRunningStrat === activeBotTab || (!propRunningStrat && isPropRunning && (currentPropAcc?.id === activePropId || propAccounts.length <= 1)));
            const otherPropRunningStrat = (!isOkx && propRunningStrat && propRunningStrat !== activeBotTab) ? propRunningStrat : null;

            return (
              <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "10px" }}>
                {/* Custom Dropdown Tích Hợp Nền Tảng & Toàn Bộ Tài Khoản Đã Kết Nối */}
                <div ref={platformDropdownRef} style={{ position: "relative", flex: 1, minWidth: 0 }}>
                  <button
                    type="button"
                    data-tour="platform-select"
                    onClick={() => setIsPlatformMenuOpen(!isPlatformMenuOpen)}
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
                      cursor: "pointer",
                      transition: "all 0.18s ease",
                      background: isOkx ? "rgba(18, 14, 6, 0.92)" : "rgba(8, 14, 26, 0.92)",
                      border: isOkx ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid rgba(59, 130, 246, 0.45)",
                      color: isOkx ? "#fbbf24" : "#60a5fa",
                      boxShadow: "inset 0 1px 4px rgba(0, 0, 0, 0.6)",
                      outline: "none",
                    }}
                    title="Chọn tài khoản giao dịch (Sàn OKX / Quỹ E8 / FTMO...)"
                  >
                    <div style={{ display: "inline-flex", alignItems: "center", gap: "5px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {isOkx ? (
                        <OkxLogo size={14} />
                      ) : (
                        (currentPropAcc?.firm || "").toLowerCase() === "ftmo" ? <FtmoLogo size={14} /> : <E8Logo size={14} />
                      )}
                      <span>{displayPlatformName}</span>
                      {displayAccountTag && (
                        <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px" }}>#{displayAccountTag}</span>
                      )}
                      {isOkx && (currentOkxAcc?.is_main || currentOkxAcc?.name === "Tài khoản chính" || (currentOkxAcc?.name && currentOkxAcc.name.toLowerCase().startsWith("tài khoản chính"))) && (
                        <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, background: "rgba(148, 163, 184, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title="Tài khoản chính (Chỉ dùng quản lý vốn & check Ref, không chạy bot)">
                          TK CHÍNH
                        </span>
                      )}
                      {isOkx && isThisOkxRunning && (
                        <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800, background: "rgba(74, 222, 128, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                          LIVE
                        </span>
                      )}
                      {isOkx && otherOkxRunningStrat && (
                        <span style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 800, background: "rgba(245, 158, 11, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title={`Tài khoản này đang chạy độc quyền bởi ${otherOkxRunningStrat === "sub1" ? "Bot EMA200" : otherOkxRunningStrat === "sub2" ? "Bot SMC" : "Bot Liquidation"}`}>
                          🔒 {otherOkxRunningStrat === "sub1" ? "EMA200" : otherOkxRunningStrat === "sub2" ? "SMC" : "LIQUIDATION"}
                        </span>
                      )}
                      {!isOkx && isThisPropRunning && (
                        <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800, background: "rgba(74, 222, 128, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                          LIVE
                        </span>
                      )}
                      {!isOkx && otherPropRunningStrat && (
                        <span style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 800, background: "rgba(245, 158, 11, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title={`Tài khoản này đang chạy độc quyền bởi ${otherPropRunningStrat === "sub1" ? "Bot EMA200" : otherPropRunningStrat === "sub2" ? "Bot SMC" : "Bot Liquidation"}`}>
                          🔒 {otherPropRunningStrat === "sub1" ? "EMA200" : otherPropRunningStrat === "sub2" ? "SMC" : "LIQUIDATION"}
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontSize: "9px",
                        color: isOkx ? "#fbbf24" : "#60a5fa",
                        transform: isPlatformMenuOpen ? "rotate(180deg)" : "none",
                        transition: "transform 0.2s ease",
                        flexShrink: 0,
                        marginLeft: "4px",
                      }}
                    >
                      ▼
                    </span>
                  </button>

                  {/* Popup Menu Danh Sách Lựa Chọn Tài Khoản Toàn Bộ Các Sàn & Quỹ */}
                  {isPlatformMenuOpen && (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 4px)",
                        left: 0,
                        minWidth: "220px",
                        maxWidth: "290px",
                        zIndex: 150,
                        background: "rgba(15, 23, 42, 0.98)",
                        backdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.15)",
                        borderRadius: "7px",
                        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 12px rgba(0, 0, 0, 0.5)",
                        padding: "5px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "3px",
                        maxHeight: "320px",
                        overflowY: "auto",
                      }}
                    >
                      {/* 1. DANH SÁCH TÀI KHOẢN OKX */}
                      {accounts.length > 0 ? (
                        accounts.map((acc) => {
                          const isSelected = isOkx && (acc.id === effectiveAccId || acc.name === effectiveAccId || (!effectiveAccId && accounts[0]?.id === acc.id));
                          const tag = formatOkxAccountTag(acc);
                          const accRunningStrat = getOkxRunningBot(acc);
                          const isThisAccRunning = accRunningStrat === activeBotTab || (!accRunningStrat && isOkxRunning && isSelected);
                          const otherAccRunning = (accRunningStrat && accRunningStrat !== activeBotTab) ? accRunningStrat : null;

                          return (
                            <button
                              key={acc.id}
                              type="button"
                              onClick={() => {
                                if (tradingPlatform !== "okx") handlePlatformSwitch("okx");
                                handleAccountSelect(acc.id);
                                setIsPlatformMenuOpen(false);
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
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                <OkxLogo size={13} />
                                <span>SÀN OKX</span>
                                <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px" }}>#{tag}</span>
                                {(acc.is_main || acc.name === "Tài khoản chính" || (acc.name && acc.name.toLowerCase().startsWith("tài khoản chính"))) && (
                                  <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, background: "rgba(148, 163, 184, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title="Tài khoản chính (Chỉ dùng quản lý vốn & check Ref, không chạy bot)">
                                    TK CHÍNH
                                  </span>
                                )}
                                {isThisAccRunning && (
                                  <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800, background: "rgba(74, 222, 128, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                                    LIVE
                                  </span>
                                )}
                                {otherAccRunning && (
                                  <span style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 800, background: "rgba(245, 158, 11, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title={`Đang chạy độc quyền bởi ${otherAccRunning === "sub1" ? "Bot EMA200" : otherAccRunning === "sub2" ? "Bot SMC" : "Bot Liquidation"}`}>
                                    🔒 {otherAccRunning === "sub1" ? "EMA200" : otherAccRunning === "sub2" ? "SMC" : "LIQUIDATION"}
                                  </span>
                                )}
                              </div>
                              {isSelected && <span style={{ fontSize: "11px", color: "#fbbf24", fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (tradingPlatform !== "okx") handlePlatformSwitch("okx");
                            setIsPlatformMenuOpen(false);
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
                            background: isOkx ? "rgba(18, 14, 6, 0.95)" : "transparent",
                            border: isOkx ? "1px solid rgba(245, 158, 11, 0.45)" : "1px solid transparent",
                            color: isOkx ? "#fbbf24" : "#cbd5e1",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <OkxLogo size={13} />
                            <span>SÀN OKX</span>
                          </div>
                          {isOkx && <span style={{ fontSize: "11px", color: "#fbbf24" }}>✓</span>}
                        </button>
                      )}

                      {/* 2. DANH SÁCH TÀI KHOẢN QUỸ FX */}
                      {propAccounts.length > 0 ? (
                        propAccounts.map((pAcc) => {
                          const isSelected = !isOkx && (pAcc.id === activePropId || (!activePropId && propAccounts[0]?.id === pAcc.id));
                          const firmUpper = (pAcc.firm || "E8").toUpperCase();
                          const rawTag = (pAcc.account_id || pAcc.id || "").toString();
                          const tag = rawTag.replace(/^#/, "");
                          const pRunningStrat = getPropRunningBot(pAcc);
                          const isThisPropAccRunning = pRunningStrat === activeBotTab || (!pRunningStrat && isPropRunning && (pAcc.id === activePropId || propAccounts.length <= 1));
                          const otherPAccRunning = (pRunningStrat && pRunningStrat !== activeBotTab) ? pRunningStrat : null;

                          return (
                            <button
                              key={pAcc.id}
                              type="button"
                              onClick={() => {
                                if (tradingPlatform !== "e8") handlePlatformSwitch("e8");
                                handleSelectPropAccount(pAcc.id);
                                setIsPlatformMenuOpen(false);
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
                                background: isSelected ? "rgba(8, 14, 26, 0.95)" : "transparent",
                                border: isSelected ? "1px solid rgba(59, 130, 246, 0.45)" : "1px solid transparent",
                                color: isSelected ? "#60a5fa" : "#cbd5e1",
                                textAlign: "left",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "rgba(59, 130, 246, 0.12)";
                                  e.currentTarget.style.color = "#93c5fd";
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSelected) {
                                  e.currentTarget.style.background = "transparent";
                                  e.currentTarget.style.color = "#cbd5e1";
                                }
                              }}
                            >
                              <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {firmUpper === "FTMO" ? <FtmoLogo size={13} /> : <E8Logo size={13} />}
                                <span>QUỸ {firmUpper}</span>
                                <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px" }}>#{tag}</span>
                                {isThisPropAccRunning && (
                                  <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800, background: "rgba(74, 222, 128, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                                    LIVE
                                  </span>
                                )}
                                {otherPAccRunning && (
                                  <span style={{ fontSize: "9px", color: "#f59e0b", fontWeight: 800, background: "rgba(245, 158, 11, 0.15)", padding: "1px 4px", borderRadius: "3px" }} title={`Tài khoản này đang chạy độc quyền bởi ${otherPAccRunning === "sub1" ? "Bot EMA200" : otherPAccRunning === "sub2" ? "Bot SMC" : "Bot Liquidation"}`}>
                                    🔒 {otherPAccRunning === "sub1" ? "EMA200" : otherPAccRunning === "sub2" ? "SMC" : "LIQUIDATION"}
                                  </span>
                                )}
                              </div>
                              {isSelected && <span style={{ fontSize: "11px", color: "#60a5fa", fontWeight: 700 }}>✓</span>}
                            </button>
                          );
                        })
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            if (tradingPlatform !== "e8") handlePlatformSwitch("e8");
                            setIsPlatformMenuOpen(false);
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
                            background: !isOkx ? "rgba(8, 14, 26, 0.95)" : "transparent",
                            border: !isOkx ? "1px solid rgba(59, 130, 246, 0.45)" : "1px solid transparent",
                            color: !isOkx ? "#60a5fa" : "#cbd5e1",
                            textAlign: "left",
                          }}
                        >
                          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}>
                            <E8Logo size={13} />
                            <span>QUỸ E8</span>
                          </div>
                          {!isOkx && <span style={{ fontSize: "11px", color: "#60a5fa" }}>✓</span>}
                        </button>
                      )}

                      {/* 3. NÚT KẾT NỐI THÊM TÀI KHOẢN MỚI */}
                      <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "3px 0" }} />
                      <button
                        type="button"
                        onClick={() => {
                          setIsPlatformMenuOpen(false);
                          onOpenConnectModal && onOpenConnectModal("fast");
                        }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "6px",
                          width: "100%",
                          padding: "6px 8px",
                          borderRadius: "5px",
                          fontSize: "11px",
                          fontWeight: 600,
                          cursor: "pointer",
                          background: "transparent",
                          border: "none",
                          color: "#26a69a",
                          textAlign: "left",
                          transition: "all 0.15s ease",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(38, 166, 154, 0.12)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                      >
                        <span style={{ fontSize: "13px", fontWeight: "bold" }}>+</span>
                        <span>Quản lý / Kết nối thêm tài khoản...</span>
                      </button>
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

                  {/* Nút xổ xuống: Cố định / nhân Hệ số Ký Quỹ (Vốn) */}
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
