import React, { useState, useEffect } from "react";
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
  onToggleMultiplyVolume,
  onOpenConnectModal,
}) {
  const { t } = useTranslation();
  const [tradingPlatform, setTradingPlatform] = useState(() => localStorage.getItem("tls1_trading_platform") || "okx");
  const [e8Account, setE8Account] = useState(null);
  const [propAccounts, setPropAccounts] = useState([]);
  const [activePropId, setActivePropId] = useState("");
  const [e8Lot, setE8Lot] = useState(() => Number(localStorage.getItem("tls1_e8_lot")) || 0.03);
  const [e8RiskUsd, setE8RiskUsd] = useState(() => Number(localStorage.getItem("tls1_e8_risk_usd")) || 25);
  const [e8DailyLoss, setE8DailyLoss] = useState(() => Number(localStorage.getItem("tls1_e8_daily_loss")) || 125);

  const updateE8Config = (newRisk, newDailyLoss) => {
    const rVal = newRisk !== undefined ? newRisk : e8RiskUsd;
    const dlVal = newDailyLoss !== undefined ? newDailyLoss : e8DailyLoss;
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
        }
      })
      .catch(() => {});
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
      body: JSON.stringify({ uid: curUid, account_id: accId })
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

          {/* HÀNG 1: NGANG HÀNG NÚT SÀN/QUỸ, HƯỚNG DẪN VÀ CÀI ĐẶT */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginBottom: "8px" }}>
            {/* Dropdown Nền Tảng: SÀN OKX / QUỸ E8 */}
            <select
              data-tour="platform-select"
              value={tradingPlatform}
              onChange={(e) => handlePlatformSwitch(e.target.value)}
              disabled={isRunning}
              className="styled-select"
              style={{
                flex: 1,
                minWidth: 0,
                height: "30px",
                backgroundColor: "#181818",
                border: "1px solid #383838",
                borderRadius: "5px",
                padding: "4px 8px",
                fontSize: "12px",
                fontWeight: "bold",
                color: "#ffffff",
                cursor: isRunning ? "not-allowed" : "pointer",
                outline: "none",
                transition: "all 0.15s ease",
              }}
              title={isRunning ? "🔒 Bot đang chạy - Vui lòng DỪNG BOT để đổi sàn!" : "Chọn nền tảng giao dịch"}
            >
              <option value="okx" style={{ background: "#1e1e1e", color: "#ffffff" }}>Sàn OKX</option>
              <option value="e8" style={{ background: "#1e1e1e", color: "#ffffff" }}>Quỹ FX</option>
            </select>

            {/* 1. Nút Hướng Dẫn (nổi bật, đặt trước Cài Đặt, kích thước chuẩn bằng nút Cài Đặt) */}
            <button
              type="button"
              className="btn-tour-guide"
              data-tour="tour-btn"
              onClick={onStartTour}
              style={{
                height: "30px",
                whiteSpace: "nowrap",
                flexShrink: 0,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "5px",
                padding: "0 14px",
                fontSize: "13px",
                fontWeight: 700,
                borderRadius: "6px",
                cursor: "pointer",
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                border: "1px solid #6366f1",
                color: "#ffffff",
                boxShadow: "0 2px 8px rgba(79, 70, 229, 0.4)",
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
              <span
                style={{
                  width: "6px",
                  height: "6px",
                  borderRadius: "50%",
                  backgroundColor: "#34d399",
                  boxShadow: "0 0 6px #34d399",
                  display: "inline-block",
                }}
              />
            </button>

            {/* 2. Nút Cài Đặt */}
            <button
              type="button"
              className="btn-chart-settings"
              data-tour="settings-btn"
              style={{
                height: "30px",
                padding: "0 14px",
                fontSize: "13px",
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

          {/* HÀNG 2: CHỌN TÀI KHOẢN (NGANG HÀNG ĐẸP MẮT THEO BẢN VẼ CHIẾN THUẬT - ẢNH 3) */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "10px",
              marginBottom: "10px",
              flexWrap: "nowrap",
            }}
          >
            <span
              style={{
                color: "#e0e0e0",
                fontSize: "12px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                display: "flex",
                alignItems: "center",
                gap: "4px",
                flexShrink: 0,
              }}
            >
              {isRunning && <span title="Bot đang chạy - Tài khoản bị khóa" style={{ color: "#ff9900", fontSize: "12px" }}>🔒</span>}
              Chọn tài khoản:
            </span>

            {tradingPlatform === "e8" ? (
              propAccounts.length > 0 ? (
                /* Luôn hiển thị Dropdown Select tài khoản Quỹ FX */
                <select
                  className="styled-select"
                  data-tour="account-select"
                  disabled={isRunning}
                  style={{
                    width: "auto",
                    maxWidth: "100%",
                    flexShrink: 0,
                    background: isRunning ? "#1a1a1a" : "#2d2d2d",
                    border: isRunning ? "1px solid #444444" : "1px solid #555555",
                    color: isRunning ? "#888888" : "#ffffff",
                    padding: "4px 22px 4px 8px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    height: "30px",
                    outline: "none",
                    cursor: isRunning ? "not-allowed" : "pointer",
                    opacity: isRunning ? 0.65 : 1,
                    transition: "all 0.2s ease",
                    textAlign: "right",
                    textAlignLast: "right",
                    direction: "ltr",
                  }}
                  value={activePropId || (propAccounts[0] && propAccounts[0].id) || ""}
                  onChange={(e) => {
                    if (e.target.value === "__connect__") {
                      onOpenConnectModal && onOpenConnectModal("tradelocker");
                    } else {
                      handleSelectPropAccount(e.target.value);
                    }
                  }}
                  title={isRunning ? "🔒 Bot đang chạy - Vui lòng DỪNG BOT để đổi Quỹ!" : "Chọn tài khoản Quỹ để giao dịch"}
                >
                  {propAccounts.map((acc) => (
                    <option
                      key={acc.id}
                      value={acc.id}
                      style={{
                        background: "#1e1e1e",
                        color: "#ffffff",
                        textAlign: "right",
                        padding: "6px 18px 6px 10px",
                      }}
                    >
                      {acc.name || `Quỹ ${acc.firm} #${acc.account_id}`} (${Number(acc.balance || 0).toLocaleString()})
                    </option>
                  ))}
                  <option
                    value="__connect__"
                    style={{
                      background: "#1e1e1e",
                      color: "#00e676",
                      textAlign: "right",
                      padding: "6px 18px 6px 10px",
                    }}
                  >
                    + Kết nối thêm Quỹ mới...
                  </option>
                </select>
              ) : (
                /* Chưa có tài khoản Quỹ */
                <div
                  onClick={() => onOpenConnectModal && onOpenConnectModal("tradelocker")}
                  style={{
                    width: "auto",
                    minWidth: "140px",
                    height: "30px",
                    borderRadius: "4px",
                    border: "1px solid #3a3a3a",
                    backgroundColor: "#202020",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: "0 10px",
                    fontSize: "11.5px",
                    color: "#cccccc",
                    fontWeight: "bold",
                    boxSizing: "border-box",
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    gap: "5px",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = "#2a2a2a";
                    e.currentTarget.style.borderColor = "#555555";
                    e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = "#202020";
                    e.currentTarget.style.borderColor = "#3a3a3a";
                    e.currentTarget.style.color = "#cccccc";
                  }}
                  title="Nhấp để kết nối tài khoản Quỹ FX (E8, The 5%ers, FTMO...)"
                >
                  <span style={{ fontSize: "12px", color: "#888888" }}>🔗</span>
                  <span>+ Kết Nối Quỹ FX</span>
                </div>
              )
            ) : (
              <select
                className="styled-select"
                data-tour="account-select"
                disabled={isRunning}
                style={{
                  width: "auto",
                  maxWidth: "100%",
                  flexShrink: 0,
                  background: isRunning ? "#1a1a1a" : "#2d2d2d",
                  border: isRunning ? "1px solid #444444" : "1px solid #555555",
                  color: isRunning ? "#888888" : "#e0e0e0",
                  padding: "4px 22px 4px 8px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  height: "30px",
                  outline: "none",
                  cursor: isRunning ? "not-allowed" : "pointer",
                  opacity: isRunning ? 0.65 : 1,
                  transition: "all 0.2s ease",
                  textAlign: "right",
                  textAlignLast: "right",
                  direction: "ltr",
                }}
                value={effectiveAccId}
                onChange={(e) => handleAccountSelect(e.target.value)}
                title={isRunning ? "🔒 Bot đang chạy - Vui lòng DỪNG BOT để chọn tài khoản khác!" : "Chọn tài khoản giao dịch"}
              >
                {!effectiveAccId && (
                  <option
                    value=""
                    style={{
                      color: "#888888",
                      textAlign: "right",
                      padding: "6px 18px 6px 10px",
                    }}
                  >
                    {accounts.length === 0 ? "chưa có tài khoản" : "chọn tài khoản"}
                  </option>
                )}
                {effectiveAccId && !accounts.some((a) => a.id === effectiveAccId || a.name === effectiveAccId) && (
                  <option
                    value={effectiveAccId}
                    style={{
                      textAlign: "right",
                      padding: "6px 18px 6px 10px",
                    }}
                  >
                    {effectiveAccId} {isRunning ? "🔒" : ""}
                  </option>
                )}
                {accounts.map((acc) => {
                  const runningBotKey = Object.entries(activeAccounts || {}).find(([strat, accId]) => accId === acc.id || accId === acc.name)?.[0];
                  const isRunningThisBot = isRunning && (acc.id === effectiveAccId || acc.name === effectiveAccId || runningBotKey === activeBotTab);
                  const isRunningOnOtherBot = runningBotKey && runningBotKey !== activeBotTab;
                  const assignedOtherBot = Object.entries(botAccountMap || {}).find(([bot, accId]) => bot !== activeBotTab && (accId === acc.id || accId === acc.name))?.[0];

                  const getTargetBotName = (key) => {
                    if (key === "sub1") return t("bot_ema200");
                    if (key === "sub2") return t("bot_smc");
                    return t("bot_liquidation");
                  };

                  let labelSuffix = "";
                  if (isRunningThisBot) {
                    labelSuffix = " 🔒";
                  } else if (isRunningOnOtherBot) {
                    labelSuffix = ` (${t("running_on_bot")} ${getTargetBotName(runningBotKey)})`;
                  } else if (assignedOtherBot) {
                    labelSuffix = ` (${t("assigned_on_bot")} ${getTargetBotName(assignedOtherBot)})`;
                  }

                  return (
                    <option
                      key={acc.id}
                      value={acc.id}
                      disabled={isRunningOnOtherBot}
                      style={{
                        textAlign: "right",
                        padding: "6px 18px 6px 10px",
                      }}
                    >
                      {acc.name}{labelSuffix}
                    </option>
                  );
                })}
              </select>
            )}
          </div>

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
                      <span className="risk-mult-text" style={{ color: risk.multiplyVolumeByTf ? "#26a69a" : "#888" }}>
                        {risk.multiplyVolumeByTf ? t("multiply_tf") : t("fixed")}
                      </span>
                      <span className="risk-mult-arrow" style={{ fontSize: "7px", opacity: 0.7, color: risk.multiplyVolumeByTf ? "#26a69a" : "#888" }}>▼</span>
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
