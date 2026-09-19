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
  isRunning = false,
  onToggleMultiplyVolume,
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
                      onClick={() => setRisk((r) => {
                        const currentVal = r.posVol;
                        const savedPct = r.volUnit === "LOT" ? currentVal : r.volPct;
                        return { ...r, volUnit: "USDT", volPct: savedPct, posVol: r.volUsdt || 1 };
                      })}
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
                      onClick={() => setRisk((r) => {
                        const currentVal = r.posVol;
                        const savedUsdt = r.volUnit === "USDT" ? currentVal : r.volUsdt;
                        return { ...r, volUnit: "LOT", volUsdt: savedUsdt, posVol: r.volPct || 0.1 };
                      })}
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
                  onChange={(val) => setRisk((r) => {
                    if (r.volUnit === "USDT") return { ...r, posVol: val, volUsdt: val };
                    return { ...r, posVol: val, volPct: val };
                  })}
                  min={risk.volUnit === "LOT" ? 0.05 : 0.1}
                  step={risk.volUnit === "LOT" ? 0.05 : 0.1}
                  suffix={risk.volUnit === "USDT" ? "$" : "%"}
                />
              </div>
              <div
                className="risk-row"
                style={{
                  marginTop: "2px",
                  marginBottom: "4px",
                  justifyContent: "flex-start",
                  gap: "8px",
                  opacity: isRunning ? 0.6 : 1,
                }}
                title={isRunning ? "Vui lòng dừng bot để thay đổi thiết lập này" : ""}
              >
                <input
                  type="checkbox"
                  className="coin-toggle"
                  checked={risk.multiplyVolumeByTf ?? false}
                  disabled={isRunning}
                  onChange={(e) => {
                    if (isRunning) return;
                    if (onToggleMultiplyVolume) {
                      onToggleMultiplyVolume(e.target.checked);
                    } else {
                      setRisk((r) => ({ ...r, multiplyVolumeByTf: e.target.checked }));
                    }
                  }}
                  style={{ cursor: isRunning ? "not-allowed" : "pointer" }}
                />
                <span
                  style={{
                    fontSize: "11px",
                    color: risk.multiplyVolumeByTf ? "#26a69a" : "#888",
                    fontWeight: risk.multiplyVolumeByTf ? 600 : "normal",
                    cursor: isRunning ? "not-allowed" : "pointer",
                    userSelect: "none",
                    transition: "color 0.2s ease",
                  }}
                  onClick={() => {
                    if (isRunning) return;
                    const nextVal = !(risk.multiplyVolumeByTf ?? false);
                    if (onToggleMultiplyVolume) {
                      onToggleMultiplyVolume(nextVal);
                    } else {
                      setRisk((r) => ({ ...r, multiplyVolumeByTf: nextVal }));
                    }
                  }}
                >
                  nhân Hệ số Ký Quỹ (Vốn)
                </span>
                <button
                  type="button"
                  className="btn-help"
                  onClick={(e) => {
                    e.stopPropagation();
                    alert("BẬT: Khối lượng ký quỹ của từng khung thời gian sẽ nhân với Hệ số Ký Quỹ tương ứng (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0). Khung càng lớn vốn vào lệnh càng lớn theo bảng hệ số.\n\nTẮT: Cố định 1 mức ký quỹ cơ sở ban đầu cho tất cả các khung thời gian (mọi khung đều vào cùng 1 lượng vốn bằng nhau).");
                  }}
                  title="BẬT: Khối lượng ký quỹ nhân theo hệ số TF | TẮT: Cố định 1 mức vốn cho mọi khung."
                >
                  [?]
                </button>
              </div>
              {activeBotTab === "sub1" ? (
                <>
                  <div className="risk-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <label style={{ margin: 0 }}>Mức chốt lời gốc M5:</label>
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
                    />
                  </div>
                  <div className="risk-row">
                    <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <label style={{ margin: 0 }}>Mức cắt lỗ gốc M5:</label>
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
