import React, { useState } from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import NumberSpinBox from '../common/NumberSpinBox';
import { COIN_LIST } from '../../constants/tradeConfig';

export default function SystemSettingsModal({
  isOpen,
  onClose,
  activeBotTab,
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
  onLogout
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
            🔑 Cấu Hình API Key
          </button>
          <button className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`} onClick={() => setSettingsTab("strategy")}>
            ⚙️ Cấu Hình Chiến Thuật
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
                  {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "LƯU CẤU HÌNH API KEY"}
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
                  <div className="settings-group-title">QUẢN LÝ VỐN & RỦI RO</div>
                  <div className="entry-setup-list">
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap" style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span>Ký quỹ:</span>
                        <div style={{ display: "flex", gap: "2px" }}>
                          <button
                            type="button"
                            onClick={() => setRisk(r => ({ ...r, volUnit: "USDT", posVol: r.volUnit === "LOT" ? 1 : r.posVol }))}
                            style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "USDT" ? "#26a69a" : "#222", color: risk.volUnit === "USDT" ? "#fff" : "#888", cursor: "pointer" }}
                          >USDT</button>
                          <button
                            type="button"
                            onClick={() => setRisk(r => ({ ...r, volUnit: "LOT", posVol: r.volUnit === "USDT" ? 0.01 : r.posVol }))}
                            style={{ padding: "1px 6px", fontSize: "10px", fontWeight: "bold", borderRadius: "4px", border: "1px solid #444", background: risk.volUnit === "LOT" ? "#26a69a" : "#222", color: risk.volUnit === "LOT" ? "#fff" : "#888", cursor: "pointer" }}
                          >% VỐN</button>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <NumberSpinBox
                          value={risk.posVol}
                          onChange={val => setRisk(r => ({ ...r, posVol: val }))}
                          min={risk.volUnit === "LOT" ? 0.01 : 1}
                          step={risk.volUnit === "LOT" ? 0.01 : 10}
                          suffix={risk.volUnit === "USDT" ? "$" : "%"}
                          width="95px"
                        />
                      </div>
                    </div>
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Mức chốt lời gốc M5:</span>
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
                  </div>
                </div>

                {/* ===== PHẦN CẤU HÌNH ĐẶC THÙ CHO TỪNG BOT ===== */}
                {activeBotTab === "sub1" && (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">Công Tắc Chiến Thuật</div>
                      <div className="tactics-toggles-layout">
                        <div className="toggle-row tactics-left-col">
                          <ToggleSwitch checked={strat.pyramidDca ?? true} onChange={v => setStrat(s => ({ ...s, pyramidDca: v }))} />
                          <span className="toggle-name">Chế độ: DCA Dương (Mới)</span>
                          <button className="btn-help" onClick={() => alert("BẬT: Nhồi lệnh thuận xu hướng từ H4->M5. TẮT: DCA âm từ M5->H4 (Mặc định).")} title="BẬT: Nhồi lệnh thuận xu hướng từ H4->M5. TẮT: DCA âm từ M5->H4 (Mặc định).">[?]</button>
                        </div>
                        <div className="tactics-right-col">
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.hedge ?? strat.xole} onChange={v => setStrat(s => ({ ...s, hedge: v, xole: v }))} />
                            <span className="toggle-name">Đánh Sóng Đảo Chiều (Hedge)</span>
                            <button className="btn-help" onClick={() => alert("Bật/Tắt chiến thuật HEDGE đánh sóng đảo chiều khi giá cách EMA200 H4 > 8%")} title="Bật/Tắt chiến thuật HEDGE đánh sóng đảo chiều khi giá cách EMA200 H4 > 8%">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({ ...s, dynamicEma200Tp: v }))} />
                            <span className="toggle-name">Chốt lời bám EMA200</span>
                            <button className="btn-help" onClick={() => alert("Chốt lời động bám theo trục EMA200 của khung thời gian nhỏ hơn liền kề.")} title="Chốt lời động bám theo trục EMA200 của khung thời gian nhỏ hơn liền kề.">[?]</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">Bảo Vệ & Cắt Lệnh Tự Động</div>
                      <div className="toggle-grid">
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.safeguardEntry} onChange={v => setStrat(s => ({ ...s, safeguardEntry: v }))} />
                          <span className="toggle-name">Thoát hòa vốn khi giá hồi</span>
                          <button className="btn-help" onClick={() => alert("Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry.")} title="Thoát hòa khi lỗ sâu >70% SL rồi giá hồi về Entry.">[?]</button>
                        </div>
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.trailingSl} onChange={v => setStrat(s => ({ ...s, trailingSl: v }))} />
                          <span className="toggle-name">Khóa lời động (Trailing SL)</span>
                          <button className="btn-help" onClick={() => alert("Trailing SL động — tự kéo chặn lãi theo sóng khi ROI tăng dần.")} title="Trailing SL động — tự kéo chặn lãi theo sóng khi ROI tăng dần.">[?]</button>
                        </div>
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.maxRoi} onChange={v => setStrat(s => ({ ...s, maxRoi: v }))} />
                          <span className="toggle-name">Chốt lời lớn (ROI ≥ 120%)</span>
                          <button className="btn-help" onClick={() => alert("Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng).")} title="Chốt lời tối đa khi ROI >= 120% (Lợi nhuận Vàng).">[?]</button>
                        </div>
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.h4Flip} onChange={v => setStrat(s => ({ ...s, h4Flip: v }))} />
                          <span className="toggle-name">Cắt lệnh khi H4 đảo chiều</span>
                          <button className="btn-help" onClick={() => alert("Đóng toàn bộ vị thế ngược chiều khi nến H4 đổi hướng (tích lũy >= 60).")} title="Đóng toàn bộ vị thế ngược chiều khi nến H4 đổi hướng (tích lũy >= 60).">[?]</button>
                        </div>
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
                          <button className="btn-help" onClick={() => alert("Kích hoạt thuật toán nhận diện Order Block và tự động giao dịch SMC.")}>[?]</button>
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
                        <button className="btn-help" onClick={() => alert("Kích hoạt thuật toán săn thanh khoản các cụm lệnh Liquidation.")}>[?]</button>
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
                        <button className="btn-help" onClick={() => alert("Đệm đón trước (VD: 0.05%) trừ lùi vào vị trí đặt Limit để dễ khớp trước vạch cản.")}>[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.entryOffset}
                        onChange={val => setEntryCfg(prev => ({ ...prev, entryOffset: val }))}
                        step={0.01}
                        min={0}
                        suffix="%"
                        width="95px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Khoảng cách nhồi DCA:</span>
                        <button className="btn-help" onClick={() => alert("Khoảng cách tối thiểu giữa 2 trục EMA200 liền kề (VD: 0.20%) để rải limit. Dưới mức này sẽ gộp lệnh.")}>[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.dcaGapPct}
                        onChange={val => setEntryCfg(prev => ({ ...prev, dcaGapPct: val }))}
                        step={0.05}
                        min={0}
                        suffix="%"
                        width="95px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>Số nến xu hướng tối thiểu:</span>
                        <button className="btn-help" onClick={() => alert("Số nến tối thiểu phải duy trì xu hướng liên tục để xác nhận tín hiệu vào lệnh.")}>[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.accumCandles}
                        onChange={val => setEntryCfg(prev => ({ ...prev, accumCandles: val }))}
                        min={1}
                        max={200}
                        step={1}
                        width="95px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span style={{ fontWeight: "bold", color: "#ffffff" }}>Đồng pha BTC & Lọc Vĩ mô:</span>
                      </div>
                      <ToggleSwitch
                        checked={entryCfg.altcoinFollowBtc}
                        onChange={v => setEntryCfg(prev => ({ ...prev, altcoinFollowBtc: v }))}
                      />
                    </div>

                    {entryCfg.altcoinFollowBtc && (
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>Hệ số nhạy ETH (Vol Mult):</span>
                          <button className="btn-help" onClick={() => alert("Hệ số nhân Volume cho ETH khi đánh theo BTC.")}>[?]</button>
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
                  </div>
                </div>

                {/* 4. Hệ Số Nhân Đa Khung (TF Multipliers) */}
                <div className="settings-group">
                  <div className="settings-group-title">Hệ Số Nhân Đa Khung (TF Multipliers)</div>
                  <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#aaaaaa", borderBottom: "1px solid #333333" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Khung</th>
                        <th style={{ padding: "6px 8px" }}>Hệ số đón trước</th>
                        <th style={{ padding: "6px 8px" }}>Hệ số Volume</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["M5", "1.0x", "1.0x"],
                        ["M15", "1.5x", "1.2x"],
                        ["M30", "2.3x", "1.5x"],
                        ["H1", "3.3x", "2.0x"],
                        ["H2", "4.7x", "3.0x"],
                        ["H4", "6.8x", "5.0x"],
                      ].map(([tf, offset, vol]) => (
                        <tr key={tf} style={{ borderBottom: "1px solid #282828" }}>
                          <td style={{ padding: "6px 8px", textAlign: "left", fontWeight: "bold", color: "#26a69a" }}>{tf}</td>
                          <td style={{ padding: "6px 8px", color: "#e0e0e0" }}>{offset}</td>
                          <td style={{ padding: "6px 8px", color: "#ff9900", fontWeight: "bold" }}>{vol}</td>
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
                  {isSavingConfig ? <><span className="spinner"></span> ĐANG LƯU...</> : "LƯU CẤU HÌNH CHIẾN THUẬT (AUTO-RELOAD)"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
