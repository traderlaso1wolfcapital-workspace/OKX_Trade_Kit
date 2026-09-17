import React from "react";
import NumberSpinBox from "../common/NumberSpinBox";

export default function SidebarLeft({
  activeBotTab,
  accounts = [],
  effectiveAccId,
  botAccountMap = {},
  handleAssignAccountToActiveBot,
  onOpenSettings,
  isRiskCollapsed,
  setIsRiskCollapsed,
  risk,
  setRisk,
}) {
  const getBotLabel = () => {
    if (activeBotTab === "sub1") return "Bot EMA200";
    if (activeBotTab === "sub2") return "Bot SMC";
    return "Bot Liquidation";
  };

  return (
    <aside className="sidebar-left">
      <div className="sidebar-header">
        <div className="app-title">TRADER LÀ SỐ 1</div>
        <div className="app-subtitle">VIỆT NAM</div>
      </div>

      <div className="sidebar-content">
        <div className="group-box" style={{ position: "relative", marginTop: "12px", paddingTop: "15px" }}>
          <span className="group-box-title" style={{ color: "#ffffff", fontSize: "13px", fontWeight: "bold" }}>
            Tài khoản ({getBotLabel()}):
          </span>

          <div
            style={{
              position: "absolute",
              top: "-10px",
              right: "8px",
              display: "flex",
              alignItems: "center",
              gap: "5px",
              backgroundColor: "#252526",
              padding: "0 4px",
            }}
          >
            <button
              onClick={() => setIsRiskCollapsed(!isRiskCollapsed)}
              style={{ background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: "10px", padding: "0 2px" }}
              title={isRiskCollapsed ? "Mở rộng cấu hình vốn" : "Thu gọn cấu hình vốn"}
            >
              {isRiskCollapsed ? "▼" : "▲"}
            </button>
          </div>

          <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "10px" }}>
            <select
              className="styled-select"
              style={{
                flex: 1,
                minWidth: 0,
                background: "#2a2a2a",
                border: "1px solid #444",
                color: "#fff",
                padding: "4px 8px",
                borderRadius: "4px",
                fontSize: "12px",
                outline: "none",
                height: "28px",
              }}
              value={effectiveAccId}
              onChange={(e) => handleAssignAccountToActiveBot(e.target.value)}
            >
              {accounts.length === 0 && <option value="">(Chưa có tài khoản)</option>}
              {accounts.map((acc) => {
                const isUsedByOtherBot = Object.entries(botAccountMap).some(([bot, accountId]) => {
                  return bot !== activeBotTab && accountId === acc.id;
                });
                return (
                  <option key={acc.id} value={acc.id} disabled={isUsedByOtherBot}>
                    {acc.name} {isUsedByOtherBot ? "(Đang chạy)" : ""}
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
              ⚙ Cài Đặt
            </button>
          </div>

          {!isRiskCollapsed && (
            <div className="risk-grid">
              <div className="risk-row">
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1 }}>
                  <label style={{ flex: "none" }}>Ký quỹ:</label>
                  <div style={{ display: "flex", gap: "2px" }}>
                    <button
                      type="button"
                      onClick={() => setRisk((r) => ({ ...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 1 : r.posVol }))}
                      style={{
                        padding: "1px 6px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: risk.volUnit === "USDT" ? "#26a69a" : "#222",
                        color: risk.volUnit === "USDT" ? "#fff" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      USDT
                    </button>
                    <button
                      type="button"
                      onClick={() => setRisk((r) => ({ ...r, volUnit: "LOT", posVol: r.volUnit === "USDT" ? 0.01 : r.posVol }))}
                      style={{
                        padding: "1px 6px",
                        fontSize: "10px",
                        fontWeight: "bold",
                        borderRadius: "4px",
                        border: "1px solid #444",
                        background: risk.volUnit === "LOT" ? "#26a69a" : "#222",
                        color: risk.volUnit === "LOT" ? "#fff" : "#888",
                        cursor: "pointer",
                      }}
                    >
                      % VỐN
                    </button>
                  </div>
                </div>
                <NumberSpinBox
                  value={risk.posVol}
                  onChange={(val) => setRisk((r) => ({ ...r, posVol: val }))}
                  min={risk.volUnit === "LOT" ? 0.01 : 1}
                  step={risk.volUnit === "LOT" ? 0.01 : 10}
                  suffix={risk.volUnit === "USDT" ? "$" : "%"}
                />
              </div>
              {activeBotTab === "sub1" ? (
                <>
                  <div className="risk-row">
                    <label>Mức chốt lời gốc M5:</label>
                    <NumberSpinBox
                      value={risk.tpPct}
                      onChange={(val) => setRisk((r) => ({ ...r, tpPct: val }))}
                      min={0.1}
                      step={0.05}
                      suffix="%"
                    />
                  </div>
                  <div className="risk-row">
                    <label>Mức cắt lỗ gốc M5:</label>
                    <NumberSpinBox
                      value={risk.slPct}
                      onChange={(val) => setRisk((r) => ({ ...r, slPct: val }))}
                      min={0.1}
                      step={0.05}
                      suffix="%"
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
