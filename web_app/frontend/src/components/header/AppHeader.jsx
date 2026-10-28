import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "../../i18n";
import { OkxLogo, E8Logo, FtmoLogo, formatOkxAccountTag } from "../sidebar/SidebarLeft";

export default function AppHeader({
  accounts = [],
  effectiveAccId,
  onSelectAccount,
  tradingPlatform = "okx",
  onSwitchPlatform,
  propAccounts = [],
  activePropId = "",
  onSelectPropAccount,
  isOkxRunning = false,
  isPropRunning = false,
  activeAccounts = {},
  onOpenConnectModal,
  activeBotTab = "sub1",
  accountBalance = null,
  slotCount = 10,
  maxSlots = 100,
}) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  const isOkx = tradingPlatform === "okx";
  const currentOkxAcc = accounts.find((a) => a.id === effectiveAccId || a.name === effectiveAccId) || accounts[0];
  const currentPropAcc = propAccounts.find((a) => a.id === activePropId) || propAccounts[0];

  const validOkxAccounts = (accounts || []).filter((acc) => {
    const rawTag = formatOkxAccountTag(acc);
    return Boolean(rawTag && rawTag.trim().length > 0 && rawTag.toLowerCase() !== "okx");
  });

  const validPropAccounts = (propAccounts || []).filter((pAcc) => {
    const rawTag = (pAcc.account_id || pAcc.id || "").toString().replace(/^#/, "").trim();
    return Boolean(rawTag && rawTag.length > 0);
  });

  const getPropFirmName = (firm) => {
    const f = (firm || "E8").toString().trim();
    if (f.toLowerCase().includes("vantage")) return "Vantage Markets";
    if (f.toLowerCase().includes("exness")) return "Exness";
    if (f.toLowerCase().includes("e8")) return "E8 Markets";
    if (f.toLowerCase().includes("ftmo")) return "FTMO";
    return f.toUpperCase();
  };

  const renderAccountLogo = (firm) => {
    const f = (firm || "").toLowerCase();
    if (f.includes("vantage")) {
      return <img src="/vantage_logo.png" alt="Vantage" style={{ width: "14px", height: "14px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} />;
    }
    if (f.includes("exness")) {
      return <img src="/exness_logo.png" alt="Exness" style={{ width: "14px", height: "14px", objectFit: "contain", borderRadius: "3px", flexShrink: 0 }} />;
    }
    if (f.includes("ftmo")) return <FtmoLogo size={14} />;
    return <E8Logo size={14} />;
  };

  const getAccountTheme = (platform, firm = "") => {
    let name = "OKX";
    let logo = <OkxLogo size={14} />;

    if (platform === "okx") {
      name = "OKX";
      logo = <OkxLogo size={14} />;
    } else {
      const f = (firm || "").toLowerCase();
      name = getPropFirmName(firm) || "E8 Markets";
      if (f.includes("vantage")) {
        logo = renderAccountLogo("vantage");
      } else if (f.includes("exness")) {
        logo = renderAccountLogo("exness");
      } else if (f.includes("ftmo")) {
        logo = renderAccountLogo("ftmo");
      } else {
        logo = renderAccountLogo("e8");
      }
    }

    // 💎 ĐỒNG BỘ 100% VỀ MỘT HỆ MÀU XANH CYAN PRESTIGE (#38bdf8):
    // Giúp toàn bộ thẻ tài khoản có cùng phong cách thanh lịch, chữ nổi bật tối đa.
    // Thẻ được chọn có nền sáng và dải viền trái sáng rực rỡ kèm dấu tích V.
    return {
      name,
      logo,
      color: "#38bdf8",
      brightColor: "#38bdf8",
      dimColor: "rgba(56, 189, 248, 0.35)",
      bg: "transparent",
      bgHover: "rgba(56, 189, 248, 0.08)",
      bgActive: "rgba(56, 189, 248, 0.14)",
      borderColor: "rgba(255, 255, 255, 0.08)",
      borderActive: "rgba(56, 189, 248, 0.70)",
      shadowActive: "0 0 10px rgba(56, 189, 248, 0.22), inset 0 0 8px rgba(56, 189, 248, 0.08)",
    };
  };

  const displayPlatformName = isOkx ? "OKX" : getPropFirmName(currentPropAcc?.firm || currentPropAcc?.server);
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

  const isThisOkxRunning = isOkx && isOkxRunning;
  const isThisPropRunning = !isOkx && isPropRunning;

  const formatBalance = (val) => {
    if (val === undefined || val === null || isNaN(Number(val))) return "";
    const num = Number(val);
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const getOkxBalance = (acc) => {
    let bal = acc?.totalEq ?? acc?.balance ?? acc?.equity ?? acc?.availBal;
    if ((bal === undefined || bal === null || Number(bal) === 0) && acc?.id) {
      const cached = localStorage.getItem(`tls1_bal_${acc.id}`);
      if (cached && Number(cached) > 0) {
        bal = Number(cached);
      }
    }
    if ((bal === undefined || bal === null || Number(bal) === 0) && acc?.id === effectiveAccId) {
      if (accountBalance?.totalEq && Number(accountBalance.totalEq) > 0) {
        bal = accountBalance.totalEq;
      } else if (accountBalance?.balance && Number(accountBalance.balance) > 0) {
        bal = accountBalance.balance;
      } else if (accountBalance?.availBal && Number(accountBalance.availBal) > 0) {
        bal = accountBalance.availBal;
      }
    }
    return bal !== undefined && bal !== null ? formatBalance(bal) : "";
  };

  const getPropBalance = (pAcc) => {
    let bal = pAcc?.balance ?? pAcc?.equity ?? pAcc?.fund_size;
    if (bal === undefined || bal === null) {
      const cached = localStorage.getItem(`tls1_bal_${pAcc?.id}`);
      if (cached) bal = Number(cached);
    }
    return bal !== undefined && bal !== null ? formatBalance(bal) : "";
  };

  const activeBalanceStr = isOkx ? getOkxBalance(currentOkxAcc) : getPropBalance(currentPropAcc);

  return (
    <header className="bot-tabs-bar">
      <div className="bot-tabs-group" data-tour="account-selector" ref={dropdownRef} style={{ position: "relative" }}>
        {/* Command Capsule Button - GIỮ NGUYÊN 100% STYLE THIẾT KẾ & HIỆU ỨNG */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "5px 12px 5px 10px",
            background: "linear-gradient(180deg, #242630 0%, #15161c 100%)",
            border: isOpen ? "1px solid #38bdf8" : "1px solid #3e4451",
            borderRadius: "6px",
            cursor: "pointer",
            boxShadow: isOpen 
              ? "0 0 10px rgba(56, 189, 248, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
              : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition: "all 0.18s ease",
            outline: "none",
            userSelect: "none"
          }}
          title="Chọn tài khoản giao dịch (Crypto / Forex / Prop Firm...)"
        >
          {/* Logo đại diện sàn hoặc quỹ */}
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {isOkx ? (
              <OkxLogo size={14} />
            ) : (
              renderAccountLogo(currentPropAcc?.firm || currentPropAcc?.server || "")
            )}
          </span>

          {/* Tên Sàn/Quỹ + Mã Tag tài khoản + Số dư */}
          <span
            style={{
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "0.2px",
              textAlign: "center",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>{displayPlatformName}</span>
            {displayAccountTag && (
              <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "12px" }}>#{displayAccountTag}</span>
            )}
            {activeBalanceStr && (
              <span
                style={{
                  color: "#4ade80",
                  fontWeight: 600,
                  fontSize: "11px",
                  fontFamily: "'Roboto Mono', 'SF Pro Text', -apple-system, monospace",
                  fontVariantNumeric: "tabular-nums",
                  background: "rgba(74, 222, 128, 0.10)",
                  padding: "1px 5px",
                  borderRadius: "4px",
                  border: "1px solid rgba(74, 222, 128, 0.22)",
                  letterSpacing: "-0.2px"
                }}
              >
                {activeBalanceStr}
              </span>
            )}
          </span>

          {/* Badges: TK CHÍNH / LIVE */}
          {isOkx && (currentOkxAcc?.is_main || currentOkxAcc?.name === "Tài khoản chính" || (currentOkxAcc?.name && currentOkxAcc.name.toLowerCase().startsWith("tài khoản chính"))) && (
            <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, background: "rgba(148, 163, 184, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
              TK CHÍNH
            </span>
          )}
          {/* Cụm tín hiệu LIVE (chấm đỏ trên) + Mũi tên dropdown (dưới) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: ((isOkx && isThisOkxRunning) || (!isOkx && isThisPropRunning)) ? "2px" : "0px",
              marginLeft: "3px",
              height: "22px",
              flexShrink: 0
            }}
          >
            {((isOkx && isThisOkxRunning) || (!isOkx && isThisPropRunning)) && (
              <span
                title="Bot đang chạy"
                style={{
                  width: "5px",
                  height: "5px",
                  backgroundColor: "#ef4444",
                  borderRadius: "50%",
                  boxShadow: "0 0 5px #ef4444, 0 0 8px rgba(239, 68, 68, 0.7)",
                  display: "block"
                }}
              />
            )}
            <svg
              width="10"
              height="10"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isOpen ? "#38bdf8" : "#9ca3af"}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                transition: "transform 0.18s ease"
              }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </div>
        </button>

        {/* Custom Popover Dropdown Menu - GIỮ NGUYÊN 100% STYLE MENU HEADER */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 5px)",
              left: 0,
              minWidth: "260px",
              maxWidth: "380px",
              backgroundColor: "#181920",
              border: "1px solid #3a3c48",
              borderRadius: "6px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.4)",
              zIndex: 1000,
              padding: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "3px",
              maxHeight: "360px",
              overflowY: "auto",
            }}
          >
            {/* DANH SÁCH THẺ TÀI KHOẢN ĐÃ KẾT NỐI (CHỈ HIỆN KHI CÓ MÃ #XXXX) */}
            {validOkxAccounts.map((acc) => {
              const isSelected = isOkx && (acc.id === effectiveAccId || acc.name === effectiveAccId || (!effectiveAccId && accounts[0]?.id === acc.id));
              const tag = formatOkxAccountTag(acc);
              const accBal = getOkxBalance(acc);
              const isAccMain = Boolean(acc.is_main || acc.name === "Tài khoản chính" || (acc.name && acc.name.toLowerCase().startsWith("tài khoản chính")));
              const isThisAccRunning = !isAccMain && Boolean(
                Object.entries(activeAccounts || {}).some(([strat, runningId]) => {
                  if (!runningId) return false;
                  const c1 = String(runningId).trim().replace(/^#/, "");
                  const c2 = String(acc.id || "").trim().replace(/^#/, "");
                  const c3 = String(acc.name || "").trim().replace(/^#/, "");
                  return c1 === c2 || (c3 && c1 === c3);
                }) || acc.is_running
              );
              const theme = getAccountTheme("okx");

              return (
                <div
                  key={acc.id}
                  onClick={() => {
                    if (onSwitchPlatform && tradingPlatform !== "okx") onSwitchPlatform("okx");
                    if (onSelectAccount) onSelectAccount(acc.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? theme.bgActive : "transparent",
                    borderLeft: `3.5px solid ${isSelected ? theme.brightColor : theme.dimColor}`,
                    borderTop: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    borderRight: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    borderBottom: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    boxShadow: isSelected ? theme.shadowActive : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.bgHover;
                      e.currentTarget.style.borderLeftColor = theme.brightColor;
                      e.currentTarget.style.borderTopColor = theme.borderActive;
                      e.currentTarget.style.borderRightColor = theme.borderActive;
                      e.currentTarget.style.borderBottomColor = theme.borderActive;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderLeftColor = theme.dimColor;
                      e.currentTarget.style.borderTopColor = theme.borderColor;
                      e.currentTarget.style.borderRightColor = theme.borderColor;
                      e.currentTarget.style.borderBottomColor = theme.borderColor;
                    }
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {theme.logo}
                    <span style={{ fontSize: "12.5px", fontWeight: isSelected ? 800 : 700, color: "#ffffff" }}>
                      {theme.name}
                    </span>
                    <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px" }}>#{tag}</span>
                    {accBal && (
                      <span
                        style={{
                          color: "#4ade80",
                          fontWeight: 600,
                          fontSize: "11px",
                          fontFamily: "'Roboto Mono', 'SF Pro Text', -apple-system, monospace",
                          fontVariantNumeric: "tabular-nums",
                          background: "rgba(74, 222, 128, 0.10)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          border: "1px solid rgba(74, 222, 128, 0.22)",
                          letterSpacing: "-0.2px"
                        }}
                      >
                        {accBal}
                      </span>
                    )}
                    {isAccMain && (
                      <span style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, background: "rgba(148, 163, 184, 0.15)", padding: "1px 4px", borderRadius: "3px" }}>
                        TK CHÍNH
                      </span>
                    )}
                    {isThisAccRunning && (
                      <span
                        title="Bot đang chạy"
                        style={{
                          width: "6px",
                          height: "6px",
                          backgroundColor: "#ef4444",
                          borderRadius: "50%",
                          boxShadow: "0 0 6px #ef4444, 0 0 10px rgba(239, 68, 68, 0.6)",
                          transform: "translateY(-3px)",
                          flexShrink: 0,
                          display: "inline-block"
                        }}
                      />
                    )}
                  </div>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}

            {validPropAccounts.map((pAcc) => {
              const isSelected = !isOkx && (pAcc.id === activePropId || (!activePropId && propAccounts[0]?.id === pAcc.id));
              const rawTag = (pAcc.account_id || pAcc.id || "").toString();
              const tag = rawTag.replace(/^#/, "");
              const propBal = getPropBalance(pAcc);
              const isThisPropAccRunning = isPropRunning || pAcc.is_bot_running;
              const theme = getAccountTheme("prop", pAcc.firm || pAcc.server);

              return (
                <div
                  key={pAcc.id}
                  onClick={() => {
                    if (onSwitchPlatform && tradingPlatform !== "e8") onSwitchPlatform("e8");
                    if (onSelectPropAccount) onSelectPropAccount(pAcc.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "5px",
                    cursor: "pointer",
                    backgroundColor: isSelected ? theme.bgActive : "transparent",
                    borderLeft: `3.5px solid ${isSelected ? theme.brightColor : theme.dimColor}`,
                    borderTop: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    borderRight: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    borderBottom: isSelected ? `1px solid ${theme.borderActive}` : `1px solid ${theme.borderColor}`,
                    boxShadow: isSelected ? theme.shadowActive : "none",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "8px",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = theme.bgHover;
                      e.currentTarget.style.borderLeftColor = theme.brightColor;
                      e.currentTarget.style.borderTopColor = theme.borderActive;
                      e.currentTarget.style.borderRightColor = theme.borderActive;
                      e.currentTarget.style.borderBottomColor = theme.borderActive;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "transparent";
                      e.currentTarget.style.borderLeftColor = theme.dimColor;
                      e.currentTarget.style.borderTopColor = theme.borderColor;
                      e.currentTarget.style.borderRightColor = theme.borderColor;
                      e.currentTarget.style.borderBottomColor = theme.borderColor;
                    }
                  }}
                >
                  <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {theme.logo}
                    <span style={{ fontSize: "12.5px", fontWeight: isSelected ? 800 : 700, color: "#ffffff" }}>
                      {theme.name}
                    </span>
                    <span style={{ color: "#9ca3af", fontWeight: 400, fontSize: "11px" }}>#{tag}</span>
                    {propBal && (
                      <span
                        style={{
                          color: "#4ade80",
                          fontWeight: 600,
                          fontSize: "11px",
                          fontFamily: "'Roboto Mono', 'SF Pro Text', -apple-system, monospace",
                          fontVariantNumeric: "tabular-nums",
                          background: "rgba(74, 222, 128, 0.10)",
                          padding: "1px 5px",
                          borderRadius: "4px",
                          border: "1px solid rgba(74, 222, 128, 0.22)",
                          letterSpacing: "-0.2px"
                        }}
                      >
                        {propBal}
                      </span>
                    )}
                    {isThisPropAccRunning && (
                      <span
                        title="Bot đang chạy"
                        style={{
                          width: "6px",
                          height: "6px",
                          backgroundColor: "#ef4444",
                          borderRadius: "50%",
                          boxShadow: "0 0 6px #ef4444, 0 0 10px rgba(239, 68, 68, 0.6)",
                          transform: "translateY(-3px)",
                          flexShrink: 0,
                          display: "inline-block"
                        }}
                      />
                    )}
                  </div>
                  {isSelected && (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme.color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </div>
              );
            })}

            {validOkxAccounts.length === 0 && validPropAccounts.length === 0 && (
              <div style={{ padding: "10px", fontSize: "11.5px", color: "#9ca3af", textAlign: "center" }}>
                Chưa có tài khoản có mã thẻ (#xxxx)
              </div>
            )}

            {/* 3. NÚT KẾT NỐI THÊM TÀI KHOẢN MỚI */}
            <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.1)", margin: "4px 0" }} />
            <div
              onClick={() => {
                setIsOpen(false);
                if (onOpenConnectModal) onOpenConnectModal("fast");
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "8px 10px",
                borderRadius: "4px",
                fontSize: "11.5px",
                fontWeight: 600,
                cursor: "pointer",
                color: "#26a69a",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(38, 166, 154, 0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
            >
              <span style={{ fontSize: "14px", fontWeight: "bold" }}>+</span>
              <span>Quản lý / Kết nối thêm tài khoản...</span>
            </div>
          </div>
        )}
      </div>

      {/* Slot indicator & Nút Join Cộng đồng */}
      <div className="header-right-tools" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
          <span
            style={{
              color: slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            {slotCount}/{maxSlots}
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
                    borderRadius: "1px",
                  }}
                />
              );
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
