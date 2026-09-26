import React from "react";
import NumberSpinBox from "../common/NumberSpinBox";
import { useTranslation } from "../../i18n";

export default function SidebarLeft({
  activeBotTab,
  accounts = [],
  effectiveAccId,
  botAccountMap = {},
  activeAccounts = {},
  onAssignAccount,
  handleAssignAccountToActiveBot,
  onOpenSettings,
  isRiskCollapsed = false,
  setIsRiskCollapsed,
  onToggleRiskCollapse,
  risk,
  setRisk,
  isRunning = false,
  onToggleMultiplyVolume,
}) {
  const { t } = useTranslation();

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

          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
            <select
              className="styled-select"
              disabled={isRunning}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                outline: "none",
                height: "28px",
                cursor: isRunning ? "not-allowed" : "pointer",
                opacity: isRunning ? 0.65 : 1,
                color: isRunning ? "#a0a5ab" : "#ffffff",
                WebkitTextFillColor: isRunning ? "#a0a5ab" : "#ffffff",
                backgroundColor: isRunning ? "#131313" : "#1a1a1a",
                borderColor: isRunning ? "#2c2c2c" : "#3d3d3d",
                transition: "all 0.2s ease",
              }}
              value={effectiveAccId}
              onChange={(e) => handleAccountSelect(e.target.value)}
              title={isRunning ? "🔒 Bot đang chạy - Vui lòng DỪNG BOT để chọn tài khoản khác!" : "Chọn tài khoản giao dịch"}
            >
              {!effectiveAccId && (
                <option value="">{accounts.length === 0 ? t("no_account") : "(Chọn tài khoản)"}</option>
              )}
              {effectiveAccId && !accounts.some((a) => a.id === effectiveAccId || a.name === effectiveAccId) && (
                <option value={effectiveAccId}>
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
                  <option key={acc.id} value={acc.id} disabled={isRunningOnOtherBot}>
                    {acc.name}{labelSuffix}
                  </option>
                );
              })}
            </select>
            <button
              type="button"
              className="btn-chart-settings"
              style={{ height: "28px", whiteSpace: "nowrap", flexShrink: 0 }}
              onClick={onOpenSettings}
              title="Cài đặt hệ thống & API Key"
            >
              ⚙ {t("settings")}
            </button>
          </div>

          {!isRiskCollapsed && (
            <div className="risk-grid">
              <div
                className="risk-row"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "4px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "4px", flexWrap: "nowrap" }}>
                  <label style={{ margin: 0, whiteSpace: "nowrap", fontSize: "11.5px", color: "#fff", fontWeight: "bold" }}>{t("margin_label")}</label>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <button
                      type="button"
                      className={`risk-unit-btn ${risk.volUnit === "USDT" ? "active" : ""}`}
                      onClick={() => setRisk((r) => {
                        const currentVal = r.posVol;
                        const savedPct = r.volUnit === "LOT" ? currentVal : r.volPct;
                        return { ...r, volUnit: "USDT", volPct: savedPct, posVol: r.volUsdt || 1 };
                      })}
                      style={{
                        padding: "1px 5px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        lineHeight: "1.1",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: risk.volUnit === "USDT" ? "#26a69a" : "#222",
                        color: risk.volUnit === "USDT" ? "#fff" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "inline-block", transform: "translateY(1px)" }}>USDT</span>
                    </button>
                    <button
                      type="button"
                      className={`risk-unit-btn ${risk.volUnit === "LOT" ? "active" : ""}`}
                      onClick={() => setRisk((r) => {
                        const currentVal = r.posVol;
                        const savedUsdt = r.volUnit === "USDT" ? currentVal : r.volUsdt;
                        return { ...r, volUnit: "LOT", volUsdt: savedUsdt, posVol: r.volPct || 0.1 };
                      })}
                      style={{
                        padding: "1px 5px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        lineHeight: "1.1",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: risk.volUnit === "LOT" ? "#26a69a" : "#222",
                        color: risk.volUnit === "LOT" ? "#fff" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      <span style={{ display: "inline-block", transform: "translateY(1px)" }}>{t("capital_percent")}</span>
                    </button>
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

                <NumberSpinBox
                  value={risk.posVol}
                  onChange={(val) => setRisk((r) => {
                    if (r.volUnit === "USDT") return { ...r, posVol: val, volUsdt: val };
                    return { ...r, posVol: val, volPct: val };
                  })}
                  min={risk.volUnit === "LOT" ? 0.05 : 0.1}
                  step={risk.volUnit === "LOT" ? 0.05 : 0.1}
                  suffix={risk.volUnit === "USDT" ? "$" : "%"}
                  width="84px"
                />
              </div>
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
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
