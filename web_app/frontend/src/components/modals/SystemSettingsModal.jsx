import React from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import NumberSpinBox from '../common/NumberSpinBox';
import { COIN_LIST } from '../../constants/tradeConfig';

export default function SystemSettingsModal({
  isOpen,
  onClose,
  activeBotTab,
  isRunning = false,
  settingsTab,
  setSettingsTab,
  accounts,
  selectedAccount,
  onAssignAccount,
  botAccountMap,
  onCreateAccount,
  onDeleteAccount,
  apiKey,
  setApiKey,
  secretKey,
  setSecretKey,
  passphrase,
  setPassphrase,
  handleResetCapital,
  handleResetNen,
  hwid,
  loginUid,
  isSavingConfig,
  onSaveApiKey,
  watchlistCoins,
  onToggleWatchlistCoin,
  safePos = [],
  risk,
  setRisk,
  strat,
  setStrat,
  smcEntryCfg,
  setSmcEntryCfg,
  entryCfg,
  setEntryCfg,
  onResetDefaultStrat,
  onSaveStratConfig,
  onLogout,
  onToggleMultiplyVolume
}) {
  if (!isOpen) return null;

  const botTitle = activeBotTab === "sub1" ? "Bot EMA200" : activeBotTab === "sub2" ? "Bot SMC" : "Bot Liquidation";

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-content settings-modal">
        {/* Header Dialog */}
        <div className="modal-header">
          <h3>⚙️ Cấu Hình Hệ Thống - {botTitle}</h3>
          <button className="close-btn" onClick={onClose} title="Đóng">×</button>
        </div>

        {/* Tab Bar (InnerTabs) */}
        <div className="settings-tab-bar">
          <button className={`settings-tab-btn ${settingsTab === "api" ? "active" : ""}`} onClick={() => setSettingsTab("api")}>
            🔑 API Key
          </button>
          <button className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`} onClick={() => setSettingsTab("strategy")}>
            ⚙️ Chiến Thuật
          </button>
        </div>

        <div className="modal-body settings-body">
          {/* ===== TAB 1: CẤU HÌNH API KEY ===== */}
          {settingsTab === "api" && (
            <div className="settings-tab-content">
              <div className="settings-tab-scroll">
                {/* Chọn tài khoản */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginBottom: "14px" }}>
                  <label style={{ color: "#e0e0e0", fontSize: "12px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                    Tài khoản gán cho [{botTitle}]:
                  </label>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                    <select
                      className="styled-select"
                      style={{ minWidth: "200px", background: "#2d2d2d", border: "1px solid #555555", color: "#e0e0e0", padding: "5px 10px", borderRadius: "4px", fontSize: "12px" }}
                      value={selectedAccount}
                      onChange={e => onAssignAccount(e.target.value)}
                    >
                      {accounts.length === 0 && <option value="">(Bấm nút + để tạo tài khoản)</option>}
                      {accounts.map(acc => {
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
                      style={{ backgroundColor: "#28a745", color: "white", fontSize: "16px", fontWeight: "bold", borderRadius: "4px", width: "32px", height: "28px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Tạo Tài Khoản Mới"
                      onClick={onCreateAccount}
                    >+</button>
                    <button
                      style={{ backgroundColor: "#dc3545", color: "white", fontSize: "16px", fontWeight: "bold", borderRadius: "4px", width: "32px", height: "28px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                      title="Xóa Tài Khoản"
                      onClick={onDeleteAccount}
                    >−</button>
                  </div>
                </div>

                {/* Thông Tin API OKX */}
                <div className="settings-group">
                  <div className="settings-group-title">Thông Tin API OKX</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "4px" }}>
                    <div className="settings-form-row">
                      <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Mã API (API Key):</label>
                      <input
                        type="text"
                        className="styled-input"
                        style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                        value={apiKey}
                        onChange={e => setApiKey(e.target.value)}
                        placeholder="Nhập API Key..."
                      />
                    </div>
                    <div className="settings-form-row">
                      <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Khóa Bí Mật (Secret):</label>
                      <input
                        type="password"
                        className="styled-input"
                        style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                        value={secretKey}
                        onChange={e => setSecretKey(e.target.value)}
                        placeholder="Nhập Secret Key..."
                      />
                    </div>
                    <div className="settings-form-row">
                      <label style={{ minWidth: "150px", color: "#e0e0e0", fontSize: "12px" }}>Cụm Mật Khẩu (Pass):</label>
                      <input
                        type="password"
                        className="styled-input"
                        style={{ flex: 1, backgroundColor: "#252525", color: "#ffffff", border: "1px solid #444444", borderRadius: "4px", padding: "5px 8px", fontFamily: "Consolas, monospace" }}
                        value={passphrase}
                        onChange={e => setPassphrase(e.target.value)}
                        placeholder="Nhập Passphrase..."
                      />
                    </div>
                  </div>
                </div>

                {/* Lệnh Can Thiệp Nhanh */}
                <div className="settings-group">
                  <div className="settings-group-title">Lệnh Can Thiệp Nhanh (Audit Hệ Thống)</div>
                  <div style={{ display: "flex", gap: "14px", flexWrap: "wrap", marginTop: "4px" }}>
                    <button className="btn-audit" onClick={handleResetCapital}>
                      ♻️ Reset Vốn Gốc (Audit)
                    </button>
                    {(Boolean(localStorage.getItem('tls1_uid') || loginUid) && (localStorage.getItem('tls1_uid') || loginUid).toLowerCase() === "admtls12021") && (
                      <button className="btn-audit" onClick={handleResetNen}>
                        ♻️ Reset Đếm Nến
                      </button>
                    )}
                  </div>
                </div>

                {/* Mã Máy HWID */}
                <div className="settings-group">
                  <div className="settings-group-title">Mã Máy (HWID) Cá Nhân</div>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "4px", flexWrap: "wrap" }}>
                    <span style={{ color: "#aaaaaa", fontSize: "12px" }}>Mã Máy của bạn:</span>
                    <span
                      className="hwid-value"
                      style={{ color: "#00ffff", fontWeight: "bold", fontSize: "13px", cursor: "pointer", fontFamily: "Consolas, monospace" }}
                      title="Click để copy Mã Máy"
                      onClick={() => {
                        navigator.clipboard.writeText(hwid);
                        alert("✅ Đã Copy Mã Máy: " + hwid);
                      }}
                    >
                      {hwid}
                    </span>
                    <button
                      type="button"
                      onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U&list=PLdzvL_bHCpls&index=2", "_blank", "noopener,noreferrer")}
                      style={{
                        background: "#1e3a5f",
                        border: "1px solid #2563eb",
                        color: "#ffffff",
                        borderRadius: "4px",
                        padding: "2px 10px",
                        fontSize: "11px",
                        fontWeight: "bold",
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        transition: "all 0.15s ease"
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#2563eb"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "#1e3a5f"; }}
                      title="Xem video Hướng Dẫn trên YouTube"
                    >
                      Hướng dẫn
                    </button>
                  </div>
                </div>
              </div>

              {/* Nút Lưu API Key */}
              <div className="api-actions-row">
                <button type="button" className="btn-logout-strat" onClick={onLogout}>
                  Đăng Xuất
                </button>
                <button
                  type="button"
                  className="btn-save-strat"
                  disabled={isSavingConfig}
                  onClick={onSaveApiKey}
                >
                  {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "Lưu API Key"}
                </button>
              </div>
            </div>
          )}

          {/* ===== TAB 2: CẤU HÌNH CHIẾN THUẬT ===== */}
          {settingsTab === "strategy" && (
            <div className="settings-tab-content">
              <div className="settings-tab-scroll">
                {/* 1. THÊM MÃ GIAO DỊCH */}
                <div className="settings-group">
                  <div className="settings-group-title" style={{ margin: 0 }}>THÊM MÃ GIAO DỊCH</div>
                  <div className="coin-select-grid">
                    {COIN_LIST.filter(c => c.value !== "USDT.D").map(coin => {
                      const isSelected = watchlistCoins.includes(coin.value);
                      const hasPos = safePos.some(p => p.instId === coin.value);
                      const coinSymbol = coin.label.replace("-USDT", "").replace("-SWAP", "");
                      return (
                        <div
                          key={coin.value}
                          className={`coin-select-card ${isSelected ? "selected" : ""}`}
                          onClick={() => onToggleWatchlistCoin(coin.value)}
                          title={hasPos ? `${coinSymbol}: Đang có vị thế mở (bắt buộc đóng lệnh trước khi bỏ chọn)` : isSelected ? `Click để bỏ chọn ${coinSymbol}` : `Click để thêm ${coinSymbol} ra ngoài Bảng Vị Thế`}
                        >
                          <span className="coin-select-symbol">{coinSymbol}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* 2. QUẢN LÝ VỐN & RỦI RO */}
                <div className="settings-group">
                  <div className="settings-group-title">QUẢN LÝ VỐN</div>
                  <div className="entry-setup-list">
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap" style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "nowrap" }}>
                        <span>Ký quỹ:</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button
                            type="button"
                            className={`risk-unit-btn ${risk.volUnit === "USDT" ? "active" : ""}`}
                            onClick={() => setRisk(r => {
                              const currentVal = r.posVol;
                              const savedPct = r.volUnit === "LOT" ? currentVal : r.volPct;
                              return { ...r, volUnit: "USDT", volPct: savedPct, posVol: r.volUsdt || 1 };
                            })}
                            style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "3px", border: "1px solid #444", background: risk.volUnit === "USDT" ? "#26a69a" : "#222", color: risk.volUnit === "USDT" ? "#fff" : "#888", cursor: "pointer" }}
                          >USDT</button>
                          <button
                            type="button"
                            className={`risk-unit-btn ${risk.volUnit === "LOT" ? "active" : ""}`}
                            onClick={() => setRisk(r => {
                              const currentVal = r.posVol;
                              const savedUsdt = r.volUnit === "USDT" ? currentVal : r.volUsdt;
                              return { ...r, volUnit: "LOT", volUsdt: savedUsdt, posVol: r.volPct || 0.1 };
                            })}
                            style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "3px", border: "1px solid #444", background: risk.volUnit === "LOT" ? "#26a69a" : "#222", color: risk.volUnit === "LOT" ? "#fff" : "#888", cursor: "pointer" }}
                          >% VỐN</button>
                        </div>

                        {/* Nút xổ xuống: Cố định / nhân Hệ số Ký Quỹ (Vốn) */}
                        <div
                          style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
                          title={
                            isRunning
                              ? "Vui lòng dừng bot để thay đổi thiết lập này"
                              : risk.multiplyVolumeByTf
                              ? "Đang BẬT: Khối lượng ký quỹ nhân theo hệ số TF (M5 x1.0, M15 x1.2... H4 x5.0)"
                              : "Đang TẮT: Cố định 1 mức ký quỹ cơ sở ban đầu cho tất cả các khung thời gian"
                          }
                        >
                          <div
                            className={`risk-mult-badge ${risk.multiplyVolumeByTf ? "active" : ""}`}
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "3px",
                              padding: "1px 6px",
                              fontSize: "10px",
                              fontWeight: 600,
                              borderRadius: "3px",
                              border: "1px solid #444",
                              background: "#222",
                              cursor: isRunning ? "not-allowed" : "pointer",
                              userSelect: "none",
                              whiteSpace: "nowrap",
                              transition: "all 0.15s ease",
                            }}
                          >
                            <span className="risk-mult-text" style={{ color: risk.multiplyVolumeByTf ? "#26a69a" : "#888" }}>
                              {risk.multiplyVolumeByTf ? "nhân Hệ số" : "Cố định"}
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
                                setRisk(r => ({ ...r, multiplyVolumeByTf: nextVal }));
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
                            <option value="fixed" style={{ background: "#222", color: "#fff" }}>Cố định</option>
                            <option value="multiply" style={{ background: "#222", color: "#26a69a" }}>nhân Hệ số Ký Quỹ (Vốn)</option>
                          </select>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <NumberSpinBox
                          value={risk.posVol}
                          onChange={val => setRisk(r => {
                            if (r.volUnit === "USDT") return { ...r, posVol: val, volUsdt: val };
                            return { ...r, posVol: val, volPct: val };
                          })}
                          min={risk.volUnit === "LOT" ? 0.05 : 0.1}
                          step={risk.volUnit === "LOT" ? 0.05 : 0.1}
                          suffix={risk.volUnit === "USDT" ? "$" : "%"}
                          width="95px"
                        />
                      </div>
                    </div>
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Mức chốt lời gốc M5:</span>
                        <button type="button" className="btn-help" onClick={() => alert("Tỷ lệ % chốt lời cơ sở tính trên khung M5 (mặc định 0.5%). Khi khớp lệnh ở các khung lớn hơn (M15, H1, H4...), mức chốt lời sẽ tự động nhân với Hệ số Ký Quỹ (Vốn) của khung đó (ví dụ M5 0.5% * H1 x2.0 = TP 1.0%).")} title="Tỷ lệ % chốt lời cơ sở M5 (nhân với Hệ số Ký Quỹ ở các khung lớn).">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={risk.tpPct}
                        onChange={val => setRisk(r => ({ ...r, tpPct: val }))}
                        min={0.1}
                        step={0.05}
                        suffix="%"
                        width="95px"
                      />
                    </div>
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Mức cắt lỗ gốc M5:</span>
                        <button type="button" className="btn-help" onClick={() => alert("Tỷ lệ % cắt lỗ an toàn cơ sở tính trên khung M5 (mặc định 0.5%). Khi khớp lệnh ở các khung lớn hơn, mức cắt lỗ sẽ tự động nhân với Hệ số Ký Quỹ (Vốn) tương ứng để tương thích với biên độ nến khung lớn (ví dụ H1 x2.0 -> SL 1.0%).")} title="Tỷ lệ % cắt lỗ cơ sở M5 (nhân với Hệ số Ký Quỹ ở các khung lớn).">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={risk.slPct}
                        onChange={val => setRisk(r => ({ ...r, slPct: val }))}
                        min={0.1}
                        step={0.05}
                        suffix="%"
                        width="95px"
                      />
                    </div>
                    <div style={{ padding: "8px 0 2px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                      * Chỉ số trên sẽ nhân với Hệ số Ký Quỹ (Vốn)
                    </div>
                  </div>
                </div>

                {/* ===== PHẦN CẤU HÌNH ĐẶC THÙ CHO TỪNG BOT ===== */}
                {activeBotTab === "sub1" && (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">Công Tắc Chiến Thuật</div>
                      <div className="tactics-toggles-layout">
                        <div className="tactics-left-col">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.pyramidDca ?? false} onChange={v => setStrat(s => ({ ...s, pyramidDca: v, negativeDca: false, multiTfGrid: v ? false : s.multiTfGrid }))} />
                            <span className="toggle-name">DCA Dương</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Pyramid DCA): Nhồi vị thế có lãi theo bậc thang xu hướng. Bắt buộc mở lệnh đầu tiên tại khung lớn nhất được tích chọn (ví dụ H4). Chỉ khi lệnh khung lớn đã khớp và vị thế đang CÓ LÃI, bot mới mở khóa đặt tiếp Limit ở các khung nhỏ hơn liền kề (H4 -> H2 -> H1 -> M30 -> M15 -> M5). Tuyệt đối không nhồi khi vị thế đang âm.\n\n* Khi bật DCA Dương, bot sẽ tự động tắt DCA Âm và Lưới Đa Khung.")} title="BẬT: Nhồi thêm vị thế khi đang có lãi theo bậc thang xu hướng từ khung lớn xuống nhỏ.">[?]</button>
                          </div>
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.negativeDca ?? false} onChange={v => setStrat(s => ({ ...s, negativeDca: v, pyramidDca: false, multiTfGrid: v ? false : s.multiTfGrid }))} />
                            <span className="toggle-name">DCA Âm</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Negative DCA): Trung bình giá khi vị thế gồng lỗ. Khi giá tiếp tục lùi về cản EMA200 của các khung lớn hơn, bot sẽ khớp thêm lệnh Limit để kéo giá vào lệnh bình quân (Average Entry). Đồng thời kích hoạt cơ chế Nâng cấp TF (Upgrade TF) để nới rộng biên độ TP/SL theo hệ số của khung lớn hơn vừa khớp.\n\n* Khi bật DCA Âm, bot sẽ tự động tắt DCA Dương và Lưới Đa Khung.")} title="BẬT: Trung bình giá khi gồng lỗ và tự động nâng cấp biên độ TP/SL theo khung lớn.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.multiTfGrid ?? (!strat.pyramidDca && !strat.negativeDca)} onChange={v => {
                              if (v) {
                                setStrat(s => ({ ...s, multiTfGrid: true, pyramidDca: false, negativeDca: false }));
                              } else {
                                setStrat(s => ({ ...s, multiTfGrid: false }));
                              }
                            }} />
                            <span className="toggle-name">Lưới Đa Khung</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Multi-TF Split Grid): Đặt đồng thời các lệnh Limit độc lập cho tất cả các khung thời gian được tích chọn (M5, M15, M30, H1, H2, H4). Mỗi lệnh được gán TP/SL riêng độc lập theo chế độ 'Chia' (Split Position) của OKX. Khớp lệnh ở khung nào thì chỉ đóng đúng khối lượng của khung đó khi chạm TP/SL, hoàn toàn không gộp vị thế.\n\n* Khi bật Lưới Đa Khung, bot sẽ tự động tắt DCA Dương và DCA Âm.")} title="BẬT: Đặt Limit độc lập theo tab 'Chia' của OKX, mỗi TF tự chốt lời/cắt lỗ riêng biệt.">[?]</button>
                          </div>
                        </div>
                        <div className="tactics-right-col">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.hedge ?? strat.xole} onChange={v => setStrat(s => ({ ...s, hedge: v, xole: v }))} />
                            <span className="toggle-name">Đánh Sóng Đảo Chiều (Hedge)</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Hedge Reversal): Đánh sóng hồi đảo chiều khi thị trường rướn quá đà. Khi giá chạy cách xa đường EMA200 H4 vượt quá ngưỡng an toàn (> 8%):\n1. Cầu dao bảo vệ tự động kích hoạt: Khóa không rải thêm Limit thuận trend ở các khung nhỏ để tránh đu đỉnh/bắt đáy non.\n2. Mở lệnh Hedge ngược xu hướng nhằm bắt nhịp sóng hồi kỹ thuật hồi quy về vùng cân bằng EMA200 H2/H4.\n\nTẮT: Tắt cơ chế bắt sóng hồi và không tự động khóa lưới theo ngưỡng rướn 8%.")} title="BẬT: Bắt sóng hồi đảo chiều và kích hoạt cầu dao bảo vệ khi giá rướn cách EMA200 H4 > 8%.">[?]</button>
                          </div>
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({ ...s, dynamicEma200Tp: v }))} />
                            <span className="toggle-name">Chốt lời bám EMA200</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Dynamic EMA200 TP): Điểm chốt lời (TP) không cố định theo % mà liên tục bám động theo đường EMA200 của khung thời gian đối diện hoặc khung lớn hơn liền kề, giúp tối ưu hóa lợi nhuận tối đa theo toàn bộ con sóng hồi quy về cản.\n\nTẮT: Điểm TP cố định theo tỷ lệ % cài đặt ban đầu (nhân với hệ số TF).")} title="BẬT: TP tự động bám động theo đường EMA200 | TẮT: TP cố định theo % cài đặt.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={entryCfg.altcoinFollowBtc ?? false} onChange={v => setEntryCfg(prev => ({ ...prev, altcoinFollowBtc: v }))} />
                            <span className="toggle-name">Đồng pha BTC & Lọc Vĩ mô</span>
                            <button className="btn-help" onClick={() => alert("BẬT: Altcoin (ETH, SOL...) neo chặt hướng giao dịch theo BTC (Đầu tàu). Nếu BTC đang xu hướng Long thì Altcoin chỉ được tìm điểm Long; nếu BTC Short thì chỉ tìm điểm Short. Đồng thời trần khung thời gian vào lệnh của Altcoin không được vượt quá khung thời gian cao nhất của BTC.\n\nTẮT: Cơ chế lọc theo BTC bị vô hiệu hóa. Từng coin và từng khung thời gian hoạt động độc lập 100% theo EMA200 của chính cặp coin đó.")} title="BẬT: Altcoin neo hướng & trần TF theo BTC | TẮT: Từng coin và từng TF tự do hoạt động độc lập.">[?]</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Phòng Thủ Vị Thế Tự Động Hoá AI</div>
                      <div style={{ padding: "10px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                        Tính năng đang phát triển..
                      </div>
                    </div>
                  </>
                )}

                {activeBotTab === "sub2" && (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">Chiến Thuật Bắt Sóng SMC</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                          <span className="toggle-name">Đánh SMC Order Block</span>
                          <button className="btn-help" onClick={() => alert("Kích hoạt chiến lược Smart Money Concepts (SMC): Tự động quét vùng mất cân bằng cung cầu (Order Block / FVG) để đặt lệnh đón thanh khoản theo cấu trúc sóng thị trường.")} title="Kích hoạt chiến lược Smart Money Concepts (Order Block / FVG).">[?]</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Khung thời gian gốc (Base TF):</span>
                          <select
                            className="styled-select"
                            value={strat.timeframeBase || "1H"}
                            onChange={e => setStrat(s => ({ ...s, timeframeBase: e.target.value }))}
                            style={{ width: "90px" }}
                          >
                            <option value="5m">5m</option>
                            <option value="15m">15m</option>
                            <option value="30m">30m</option>
                            <option value="1H">1H</option>
                            <option value="2H">2H</option>
                            <option value="4H">4H</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Cấu Hình Bắt Sóng SMC</div>
                      <div className="entry-setup-list">
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Nguồn bắt cản (OB Source):</span>
                          <select
                            className="styled-select"
                            style={{ width: "130px" }}
                            value={smcEntryCfg.source}
                            onChange={e => setSmcEntryCfg(s => ({ ...s, source: e.target.value }))}
                          >
                            <option value="ALL">Cả hai sóng</option>
                            <option value="SWING">Chỉ sóng lớn</option>
                            <option value="INTERNAL">Chỉ sóng nhỏ</option>
                          </select>
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Hướng vào lệnh:</span>
                          <select
                            className="styled-select"
                            style={{ width: "130px" }}
                            value={smcEntryCfg.dir}
                            onChange={e => setSmcEntryCfg(s => ({ ...s, dir: e.target.value }))}
                          >
                            <option value="BOTH">Hai chiều</option>
                            <option value="LONG_ONLY">Chỉ Long</option>
                            <option value="SHORT_ONLY">Chỉ Short</option>
                          </select>
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Lọc lực nến cản (x ATR):</span>
                          <NumberSpinBox
                            value={smcEntryCfg.obVol}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, obVol: val }))}
                            step={0.1}
                            min={0}
                            width="95px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Độ dài sóng lớn (Swing nến):</span>
                          <NumberSpinBox
                            value={smcEntryCfg.swingLength}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, swingLength: val }))}
                            min={10}
                            max={200}
                            step={1}
                            width="95px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Độ dài sóng nhỏ (Internal nến):</span>
                          <NumberSpinBox
                            value={smcEntryCfg.internalLength}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, internalLength: val }))}
                            min={1}
                            max={50}
                            step={1}
                            width="95px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px", fontWeight: "bold" }}>Ép khớp Market khi lọt cản:</span>
                          <ToggleSwitch
                            checked={smcEntryCfg.forceMarket}
                            onChange={v => setSmcEntryCfg(s => ({ ...s, forceMarket: v }))}
                          />
                        </div>
                        {smcEntryCfg.forceMarket && (
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Trượt giá Market tối đa:</span>
                            <NumberSpinBox
                              value={smcEntryCfg.maxSlippage}
                              onChange={val => setSmcEntryCfg(s => ({ ...s, maxSlippage: val }))}
                              step={0.1}
                              min={0}
                              suffix="%"
                              width="95px"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeBotTab === "sub3" && (
                  <div className="settings-group">
                    <div className="settings-group-title">Chiến Thuật Bắt Thanh Khoản (Liquidation)</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                        <span className="toggle-name">Quét Thanh Khoản Tự Động</span>
                        <button className="btn-help" onClick={() => alert("Kích hoạt chiến lược Săn Thanh Khoản (Liquidation Hunter): Quét các cụm thanh lý đòn bẩy lớn trên thị trường để tìm điểm quét râu đảo chiều.")} title="Kích hoạt chiến lược săn thanh lý Liquidation.">[?]</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#e0e0e0", fontSize: "12px" }}>Khung quét thanh khoản:</span>
                        <select
                          className="styled-select"
                          value={strat.timeframeBase || "1H"}
                          onChange={e => setStrat(s => ({ ...s, timeframeBase: e.target.value }))}
                          style={{ width: "90px" }}
                        >
                          <option value="5m">5m</option>
                          <option value="15m">15m</option>
                          <option value="30m">30m</option>
                          <option value="1H">1H</option>
                          <option value="4H">4H</option>
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Điểm Vào Lệnh (Entry Setup) */}
                <div className="settings-group">
                  <div className="settings-group-title">Điểm Vào Lệnh (Entry Setup)</div>
                  <div className="entry-setup-list">
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Đón trước cản:</span>
                        <button className="btn-help" onClick={() => alert("Độ lệch đệm (Base Offset %): Đặt lệnh Limit đón sớm hơn một khoảng % trước khi giá chạm đúng vào vạch EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi thị trường kịp phản ứng bật cản. Ở các khung thời gian lớn hơn, độ lệch này sẽ tự động nhân với Hệ số Vào Lệnh (Entry) của khung đó (ví dụ H4 x6.8 -> đệm 0.34%).")} title="Độ lệch đệm đón trước cản EMA200 để lệnh dễ khớp trước khi giá bật nảy.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.entryOffset}
                        onChange={val => setEntryCfg(prev => ({ ...prev, entryOffset: val }))}
                        step={0.01}
                        min={0}
                        max={0.3}
                        suffix="%"
                        width="95px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Khoảng cách nhồi DCA:</span>
                        <button className="btn-help" onClick={() => alert("Khoảng cách an toàn tối thiểu (Base Gap %): Ngưỡng cách biệt giá tối thiểu giữa 2 đường EMA200 liền kề để được rải lệnh Limit (mặc định 0.20% ở M5). Nếu 2 đường EMA200 quá sát nhau (nhỏ hơn khoảng cách này nhân với Hệ số Vào Lệnh), bot sẽ tự động bỏ qua khung nhỏ để dồn vào cản khung lớn hơn, tránh rải lệnh quá dày đặc.")} title="Khoảng cách an toàn tối thiểu giữa 2 đường EMA200 để tránh rải lệnh quá dày.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.dcaGapPct}
                        onChange={val => setEntryCfg(prev => ({ ...prev, dcaGapPct: val }))}
                        step={0.05}
                        min={0}
                        max={0.5}
                        suffix="%"
                        width="95px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Số nến xu hướng tối thiểu:</span>
                        <button className="btn-help" onClick={() => alert("Bộ lọc nến tích lũy (Accumulation Candles): Số lượng nến đóng cửa liên tục nằm hoàn toàn về một phía của EMA200 (mặc định 60 nến). Đảm bảo thị trường đã tích lũy và xác nhận một xu hướng vững chắc trước khi mở lệnh đón cản, loại bỏ tín hiệu nhiễu khi giá đang sideway cắt qua cắt lại EMA200.")} title="Số nến liên tục cùng phía EMA200 để xác nhận xu hướng vững chắc trước khi vào lệnh.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.accumCandles}
                        onChange={val => setEntryCfg(prev => ({ ...prev, accumCandles: val }))}
                        min={12}
                        max={200}
                        step={1}
                        width="95px"
                      />
                    </div>



                    {entryCfg.altcoinFollowBtc && (
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>Hệ số nhạy ETH (Vol Mult):</span>
                          <button className="btn-help" onClick={() => alert("Hệ số nhạy ETH (Vol Mult): Trọng số điều chỉnh khối lượng riêng cho ETH khi bật chế độ Đồng pha BTC. Giúp tự động cân đối quy mô vào lệnh của ETH tương quan với biên độ biến động của thị trường so với BTC.")} title="Hệ số điều chỉnh khối lượng cho ETH khi bật chế độ Đồng pha BTC.">[?]</button>
                        </div>
                        <NumberSpinBox
                          value={entryCfg.ethVolMult}
                          onChange={val => setEntryCfg(prev => ({ ...prev, ethVolMult: val }))}
                          step={0.1}
                          min={0}
                          width="95px"
                        />
                      </div>
                    )}
                    <div style={{ padding: "8px 0 2px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                      * Chỉ số trên sẽ nhân với Hệ số Vào Lệnh (Entry)
                    </div>
                  </div>
                </div>

                {/* 4. Hệ Số Nhân Đa Khung (TF Multipliers) */}
                <div className="settings-group">
                  <div className="settings-group-title">Hệ Số Nhân Đa Khung (TF Multipliers)</div>
                  <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#aaaaaa", borderBottom: "1px solid #333333" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Khung</th>
                        <th style={{ padding: "6px 8px" }}>
                          Hệ số Ký Quỹ (Vốn)
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert("Hệ số Ký Quỹ (Vốn) theo Khung Thời Gian:\n1. Tỷ lệ nhân khối lượng vào lệnh: Khi bật 'nhân Hệ số Ký Quỹ (Vốn)', khối lượng ký quỹ ở các khung M15, M30, H1, H2, H4 sẽ được nhân tương ứng theo hệ số này (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0).\n2. Hệ số nhân TP và SL: Mức TP và SL cơ sở của khung M5 sẽ được nhân với hệ số này để mở rộng biên độ tương ứng cho từng khung thời gian.")}
                            title="Hệ số nhân khối lượng vốn và biên độ TP/SL cho từng khung thời gian."
                          >
                            [?]
                          </button>
                        </th>
                        <th style={{ padding: "6px 8px" }}>
                          Hệ số Vào Lệnh (Entry)
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert("Hệ số Vào Lệnh (Entry) theo Khung Thời Gian:\n- Dùng để nhân tỷ lệ với thông số 'Đón trước cản' (Base Offset %) và 'Khoảng cách nhồi DCA' (Base Gap %).\n- Giúp khung thời gian càng lớn thì vùng đệm đón cản và khoảng cách giữa các tầng Limit càng rộng, phù hợp với biên độ nến của khung đó.")}
                            title="Hệ số nhân vùng đệm đón cản và khoảng cách tối thiểu giữa các đường EMA200."
                          >
                            [?]
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["M5",  "1.0x", "1.0x"],
                        ["M15", "1.2x", "1.5x"],
                        ["M30", "1.5x", "2.3x"],
                        ["H1",  "2.0x", "3.3x"],
                        ["H2",  "3.0x", "4.7x"],
                        ["H4",  "5.0x", "6.8x"],
                      ].map(([tf, vol, offset]) => (
                        <tr key={tf} style={{ borderBottom: "1px solid #282828" }}>
                          <td style={{ padding: "6px 8px", textAlign: "left", color: "#e0e0e0" }}>{tf}</td>
                          <td style={{ padding: "6px 8px", color: "#26a69a", fontWeight: "bold" }}>{vol}</td>
                          <td style={{ padding: "6px 8px", color: "#ff9900", fontWeight: "bold" }}>{offset}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Hàng nút điều khiển Tab 2 */}
              <div className="strat-actions-row">
                <button type="button" className="btn-reset-strat" onClick={onResetDefaultStrat}>
                  KHÔI PHỤC MẶC ĐỊNH
                </button>
                <button
                  type="button"
                  className="btn-save-strat"
                  disabled={isSavingConfig}
                  onClick={onSaveStratConfig}
                >
                  {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "Lưu Chiến Thuật"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
