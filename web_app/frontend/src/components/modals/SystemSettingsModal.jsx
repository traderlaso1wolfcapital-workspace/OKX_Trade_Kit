import React, { useState } from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import NumberSpinBox from '../common/NumberSpinBox';
import { COIN_LIST } from '../../constants/tradeConfig';
import { useTranslation } from '../../i18n';
import ReviewsTab from './ReviewsTab';

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
  activeAccounts = {},
  onCreateAccount,
  onDeleteAccount,
  okxUid,
  setOkxUid,
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
  onToggleMultiplyVolume,
  isAuthenticated = false,
  onStartSettingsTour,
}) {
  const { t } = useTranslation();
  const [showTransferGuide, setShowTransferGuide] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");

  const handleCopyText = (text, label) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopyNotice(label);
      setTimeout(() => setCopyNotice(""), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  if (!isOpen) return null;

  const getBotTitle = () => {
    if (activeBotTab === "sub1") return t("bot_ema200");
    if (activeBotTab === "sub2") return t("bot_smc");
    return t("bot_liquidation");
  };

  const botTitle = getBotTitle();
  const displayUid = okxUid || localStorage.getItem("tls1_uid") || loginUid || "";

  return (
    <div
      className="modal-overlay settings-modal-overlay"
      style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "max(82px, 9.2vh)",
        paddingBottom: "16px",
        boxSizing: "border-box",
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-content settings-modal"
        style={{
          maxHeight: "80vh",
        }}
      >
        <style>{`
          .connect-input {
            width: 100%;
            padding: 8px 10px;
            background: #181818 !important;
            border: 1px solid #333333 !important;
            color: #ffffff !important;
            border-radius: 4px !important;
            outline: none !important;
            font-size: 12.5px !important;
            box-sizing: border-box;
            transition: border-color 0.2s, box-shadow 0.2s;
            font-family: Consolas, monospace !important;
          }
          .connect-input:focus {
            border-color: #ff9900 !important;
            box-shadow: 0 0 0 2px rgba(255, 153, 0, 0.2) !important;
          }
          .connect-input::placeholder {
            font-family: Consolas, monospace !important;
            font-style: italic !important;
            font-size: 11px !important;
            color: #555555 !important;
            opacity: 0.75 !important;
          }
        `}</style>
        {/* Header Dialog */}
        <div className="modal-header">
          <h3>⚙️ {t("system_settings_title")} - {botTitle}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {typeof onStartSettingsTour === "function" && (
              <button
                type="button"
                className="btn-tour-settings"
                onClick={onStartSettingsTour}
                style={{
                  background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                  border: "1px solid #6366f1",
                  color: "#ffffff",
                  fontSize: "11px",
                  fontWeight: 700,
                  padding: "3px 9px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "4px",
                  boxShadow: "0 1px 6px rgba(79, 70, 229, 0.4)",
                  transition: "all 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.filter = "brightness(1.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.filter = "brightness(1.0)";
                }}
                title={t("guide_settings_tooltip", "Xem hướng dẫn chi tiết các cơ chế trong Cài Đặt (DCA, Cầu dao, Nến tích lũy)")}
              >
                {t("guide_btn", "Hướng Dẫn")}
              </button>
            )}
            <button className="close-btn" onClick={onClose} title={t("close_btn")}>×</button>
          </div>
        </div>

        {/* Tab Bar (InnerTabs) */}
        <div className="settings-tab-bar">
          <button
            className={`settings-tab-btn ${settingsTab === "strategy" ? "active" : ""}`}
            onClick={() => setSettingsTab("strategy")}
            data-tour="settings-strategy-tab"
          >
            ⚙️ {t("tab_strategy", "Chiến Thuật")}
          </button>
          <button
            className={`settings-tab-btn ${settingsTab === "system" || settingsTab === "support" ? "active" : ""}`}
            onClick={() => setSettingsTab("system")}
            data-tour="settings-support-tab"
          >
            🛠️ {t("tab_system", "Hỗ Trợ")}
          </button>
          <button
            className={`settings-tab-btn ${settingsTab === "reviews" ? "active" : ""}`}
            onClick={() => setSettingsTab("reviews")}
            data-tour="settings-reviews-tab"
          >
            ⭐ {t("tab_reviews", "Đánh Giá")}
          </button>
        </div>

        <div className="modal-body settings-body">
          {/* ===== TAB 1: CẤU HÌNH CHIẾN THUẬT (MẶC ĐỊNH) ===== */}
          {settingsTab === "strategy" && (
            <div className="settings-tab-content">
              <div className="settings-tab-scroll">
                {/* 1. THÊM MÃ GIAO DỊCH (Tách 2 phần: Trên là FX, Dưới là COIN, đệm tách dòng nhẹ) */}
                <div className="settings-group" data-tour="settings-watchlist">
                  <div className="settings-group-title" style={{ margin: 0 }}>{t("watchlist_title")}</div>
                  
                  {/* Nhóm FX / Kim loại / Hàng hóa (XAU, XAG, CL...) */}
                  <div className="coin-select-grid" style={{ marginTop: "8px" }}>
                    {COIN_LIST.filter(c => c.value !== "USDT.D" && (c.assetClass === "forex" || ["XAU", "XAG", "CL"].includes(c.label.replace("-USDT", "").replace("-SWAP", "")))).map(coin => {
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

                  {/* Khoảng đệm tách dòng nhẹ tinh tế giữa FX và Coin */}
                  <div style={{ height: "1px", background: "rgba(255, 255, 255, 0.08)", margin: "8px 0" }} />

                  {/* Nhóm Crypto Coins (BTC, ETH, SOL, XRP...) */}
                  <div className="coin-select-grid" style={{ marginTop: 0 }}>
                    {COIN_LIST.filter(c => c.value !== "USDT.D" && !(c.assetClass === "forex" || ["XAU", "XAG", "CL"].includes(c.label.replace("-USDT", "").replace("-SWAP", "")))).map(coin => {
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



                {/* ===== PHẦN CẤU HÌNH ĐẶC THÙ CHO TỪNG BOT ===== */}
                {activeBotTab === "sub1" && (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">{t("tactics_title")}</div>
                      <div className="tactics-toggles-layout" data-tour="settings-dca">
                        <div className="tactics-left-col">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.pyramidDca ?? false} onChange={v => setStrat(s => ({ ...s, pyramidDca: v, negativeDca: false, multiTfGrid: v ? false : s.multiTfGrid }))} />
                            <span className="toggle-name">{t("pyramid_dca")}</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Pyramid DCA): Nhồi vị thế có lãi theo bậc thang xu hướng. Bắt buộc mở lệnh đầu tiên tại khung lớn nhất được tích chọn (ví dụ H4). Chỉ khi lệnh khung lớn đã khớp và vị thế đang CÓ LÃI, bot mới mở khóa đặt tiếp Limit ở các khung nhỏ hơn liền kề (H4 -> H2 -> H1 -> M30 -> M15 -> M5). Tuyệt đối không nhồi khi vị thế đang âm.\n\n* Khi bật DCA Dương, bot sẽ tự động tắt DCA Âm và Lưới Đa Khung (Hedge).")} title="BẬT: Nhồi thêm vị thế khi đang có lãi theo bậc thang xu hướng từ khung lớn xuống nhỏ.">[?]</button>
                          </div>
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.negativeDca ?? false} onChange={v => setStrat(s => ({ ...s, negativeDca: v, pyramidDca: false, multiTfGrid: v ? false : s.multiTfGrid }))} />
                            <span className="toggle-name">{t("negative_dca")}</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Negative DCA): Trung bình giá khi vị thế gồng lỗ. Khi giá tiếp tục lùi về cản EMA200 của các khung lớn hơn, bot sẽ khớp thêm lệnh Limit để kéo giá vào lệnh bình quân (Average Entry). Đồng thời kích hoạt cơ chế Nâng cấp TF (Upgrade TF) để nới rộng biên độ TP/SL theo hệ số của khung lớn hơn vừa khớp.\n\n* Khi bật DCA Âm, bot sẽ tự động tắt DCA Dương và Lưới Đa Khung (Hedge).")} title="BẬT: Trung bình giá khi gồng lỗ và tự động nâng cấp biên độ TP/SL theo khung lớn.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.multiTfGrid ?? (!strat.pyramidDca && !strat.negativeDca)} onChange={v => {
                              if (v) {
                                setStrat(s => ({ ...s, multiTfGrid: true, pyramidDca: false, negativeDca: false }));
                              } else {
                                setStrat(s => ({ ...s, multiTfGrid: false }));
                              }
                            }} />
                            <span className="toggle-name">{t("multi_tf_grid")}</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Lưới Đa Khung - Hedge): Đặt đồng thời các lệnh Limit độc lập cho tất cả các khung thời gian được tích chọn (M5, M15, M30, H1, H2, H4). Mỗi lệnh được gán TP/SL riêng độc lập theo chế độ 'Chia' (Split Position) của OKX, cho phép đồng thời giữ cả Long và Short độc lập ở các khung khác nhau. Khớp lệnh ở khung nào thì chỉ đóng đúng khối lượng của khung đó khi chạm TP/SL, hoàn toàn không gộp vị thế.\n\n* Khi bật Lưới Đa Khung (Hedge), bot sẽ tự động tắt DCA Dương và DCA Âm.")} title="BẬT: Đặt Limit độc lập theo tab 'Chia' của OKX, mỗi TF tự chốt lời/cắt lỗ riêng biệt, hỗ trợ vị thế song song Long/Short.">[?]</button>
                          </div>
                        </div>
                        <div className="tactics-right-col" data-tour="settings-circuit-breaker">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.hedge ?? strat.xole} onChange={v => setStrat(s => ({ ...s, hedge: v, xole: v }))} />
                            <span className="toggle-name">{t("hedge_reversal")}</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Đảo Chiều EMA200 H4 >8%): Đánh sóng hồi đảo chiều khi thị trường rướn quá đà. Khi giá chạy cách xa đường EMA200 H4 vượt quá ngưỡng an toàn (> 8%):\n1. Cầu dao bảo vệ tự động kích hoạt: Khóa không rải thêm Limit thuận trend ở các khung nhỏ để tránh đu đỉnh/bắt đáy non.\n2. Mở lệnh Hedge ngược xu hướng nhằm bắt nhịp sóng hồi kỹ thuật hồi quy về vùng cân bằng EMA200 H2/H4.\n\nTẮT: Tắt cơ chế bắt sóng hồi và không tự động khóa lưới theo ngưỡng rướn 8%.")} title="BẬT: Bắt sóng hồi đảo chiều và kích hoạt cầu dao bảo vệ khi giá rướn cách EMA200 H4 > 8%.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={entryCfg.altcoinFollowBtc ?? false} onChange={v => setEntryCfg(prev => ({ ...prev, altcoinFollowBtc: v }))} />
                            <span className="toggle-name">{t("btc_macro_sync")}</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Đồng pha H4 BTC): Altcoin (ETH, SOL...) neo chặt hướng giao dịch theo H4 BTC (Đầu tàu). Nếu BTC đang xu hướng Long thì Altcoin chỉ được tìm điểm Long; nếu BTC Short thì chỉ tìm điểm Short. Đồng thời trần khung thời gian vào lệnh của Altcoin không được vượt quá khung thời gian cao nhất của BTC.\n\nTẮT: Cơ chế lọc theo BTC bị vô hiệu hóa. Từng coin và từng khung thời gian hoạt động độc lập 100% theo EMA200 của chính cặp coin đó.")} title="BẬT: Altcoin neo hướng & trần TF theo H4 BTC | TẮT: Từng coin và từng TF tự do hoạt động độc lập.">[?]</button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="settings-group">
                      <div className="settings-group-title">{t("ai_defense_title")}</div>
                      <div style={{ padding: "5px 0 10px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                        {t("under_development")}
                      </div>
                      {/* 🛡️ Mã nguồn Chốt lời bám EMA200 chuyển xuống khu vực AI Defense để phát triển tiếp
                      <div className="toggle-row" style={{ opacity: 0.6, pointerEvents: 'none' }}>
                        <ToggleSwitch checked={strat.dynamicEma200Tp} onChange={v => setStrat(s => ({ ...s, dynamicEma200Tp: v }))} />
                        <span className="toggle-name">{t("dynamic_ema200_tp")}</span>
                        <button className="btn-help" onClick={() => alert("BẬT (Dynamic EMA200 TP): Điểm chốt lời (TP) không cố định theo % mà liên tục bám động theo đường EMA200 của khung thời gian đối diện hoặc khung lớn hơn liền kề, giúp tối ưu hóa lợi nhuận tối đa theo toàn bộ con sóng hồi quy về cản.\n\nTẮT: Điểm TP cố định theo tỷ lệ % cài đặt ban đầu (nhân với hệ số TF).")} title="BẬT: TP tự động bám động theo đường EMA200 | TẮT: TP cố định theo % cài đặt.">[?]</button>
                      </div>
                      */}
                    </div>
                  </>
                )}

                {activeBotTab === "sub2" && (
                  <>
                    <div className="settings-group">
                      <div className="settings-group-title">{t("smc_strategy_title")}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                        <div className="toggle-row">
                          <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                          <span className="toggle-name">{t("smc_order_block")}</span>
                          <button className="btn-help" onClick={() => alert("Kích hoạt chiến lược Smart Money Concepts (SMC): Tự động quét vùng mất cân bằng cung cầu (Order Block / FVG) để đặt lệnh đón thanh khoản theo cấu trúc sóng thị trường.")} title="Kích hoạt chiến lược Smart Money Concepts (Order Block / FVG).">[?]</button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("base_tf")}</span>
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
                      <div className="settings-group-title">{t("smc_config_title")}</div>
                      <div className="entry-setup-list">
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("ob_source")}</span>
                          <select
                            className="styled-select"
                            style={{ width: "130px" }}
                            value={smcEntryCfg.source}
                            onChange={e => setSmcEntryCfg(s => ({ ...s, source: e.target.value }))}
                          >
                            <option value="ALL">{t("both_waves")}</option>
                            <option value="SWING">{t("swing_only")}</option>
                            <option value="INTERNAL">{t("internal_only")}</option>
                          </select>
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("entry_dir")}</span>
                          <select
                            className="styled-select"
                            style={{ width: "130px" }}
                            value={smcEntryCfg.dir}
                            onChange={e => setSmcEntryCfg(s => ({ ...s, dir: e.target.value }))}
                          >
                            <option value="BOTH">{t("both_directions")}</option>
                            <option value="LONG_ONLY">{t("long_only")}</option>
                            <option value="SHORT_ONLY">{t("short_only")}</option>
                          </select>
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("atr_vol_filter")}</span>
                          <NumberSpinBox
                            value={smcEntryCfg.obVol}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, obVol: val }))}
                            step={0.1}
                            min={0}
                            width="84px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("swing_length")}</span>
                          <NumberSpinBox
                            value={smcEntryCfg.swingLength}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, swingLength: val }))}
                            min={10}
                            max={200}
                            step={1}
                            width="84px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("internal_length")}</span>
                          <NumberSpinBox
                            value={smcEntryCfg.internalLength}
                            onChange={val => setSmcEntryCfg(s => ({ ...s, internalLength: val }))}
                            min={1}
                            max={50}
                            step={1}
                            width="84px"
                          />
                        </div>
                        <div className="entry-setup-row">
                          <span style={{ color: "#e0e0e0", fontSize: "12px", fontWeight: "bold" }}>{t("force_market")}</span>
                          <ToggleSwitch
                            checked={smcEntryCfg.forceMarket}
                            onChange={v => setSmcEntryCfg(s => ({ ...s, forceMarket: v }))}
                          />
                        </div>
                        {smcEntryCfg.forceMarket && (
                          <div className="entry-setup-row">
                            <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("max_slippage")}</span>
                            <NumberSpinBox
                              value={smcEntryCfg.maxSlippage}
                              onChange={val => setSmcEntryCfg(s => ({ ...s, maxSlippage: val }))}
                              step={0.1}
                              min={0}
                              suffix="%"
                              width="84px"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}

                {activeBotTab === "sub3" && (
                  <div className="settings-group">
                    <div className="settings-group-title">{t("liquidation_strategy_title")}</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      <div className="toggle-row">
                        <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                        <span className="toggle-name">{t("auto_liq_scan")}</span>
                        <button className="btn-help" onClick={() => alert("Kích hoạt chiến lược Săn Thanh Khoản (Liquidation Hunter): Quét các cụm thanh lý đòn bẩy lớn trên thị trường để tìm điểm quét râu đảo chiều.")} title="Kích hoạt chiến lược săn thanh lý Liquidation.">[?]</button>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "#e0e0e0", fontSize: "12px" }}>{t("liq_scan_tf")}</span>
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
                <div className="settings-group" data-tour="settings-entry-filters">
                  <div className="settings-group-title">{t("entry_setup_title")}</div>
                  <div className="entry-setup-list">
                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                         <span>{t("base_offset")}</span>
                        <button className="btn-help" onClick={() => alert("Độ lệch đệm (Base Offset %): Đặt lệnh Limit đón sớm hơn một khoảng % trước khi giá chạm đúng vào vạch EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi thị trường kịp phản ứng bật cản. Ở các khung thời gian lớn hơn, độ lệch này sẽ tự động nhân với Hệ số Vào Lệnh (Entry) của khung đó (ví dụ H4 x6.8 -> đệm 0.34%).")} title="Độ lệch đệm đón trước cản EMA200 để lệnh dễ khớp trước khi giá bật nảy.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.entryOffset}
                        onChange={val => setEntryCfg(prev => ({ ...prev, entryOffset: val }))}
                        step={0.01}
                        min={0}
                        max={0.3}
                        suffix="%"
                        width="84px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>{t("dca_gap")}</span>
                        <button className="btn-help" onClick={() => alert("Khoảng cách an toàn tối thiểu (Base Gap %): Ngưỡng cách biệt giá tối thiểu giữa 2 đường EMA200 liền kề để được rải lệnh Limit (mặc định 0.20% ở M5). Nếu 2 đường EMA200 quá sát nhau (nhỏ hơn khoảng cách này nhân với Hệ số Vào Lệnh), bot sẽ tự động bỏ qua khung nhỏ để dồn vào cản khung lớn hơn, tránh rải lệnh quá dày đặc.")} title="Khoảng cách an toàn tối thiểu giữa 2 đường EMA200 để tránh rải lệnh quá dày.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.dcaGapPct}
                        onChange={val => setEntryCfg(prev => ({ ...prev, dcaGapPct: val }))}
                        step={0.05}
                        min={0}
                        max={0.5}
                        suffix="%"
                        width="84px"
                      />
                    </div>

                    <div className="entry-setup-row">
                      <div className="entry-label-wrap">
                        <span>{t("accum_candles")}</span>
                        <button className="btn-help" onClick={() => alert("Bộ lọc nến tích lũy (Accumulation Candles): Số lượng nến đóng cửa liên tục nằm hoàn toàn về một phía của EMA200 (mặc định 60 nến). Đảm bảo thị trường đã tích lũy và xác nhận một xu hướng vững chắc trước khi mở lệnh đón cản, loại bỏ tín hiệu nhiễu khi giá đang sideway cắt qua cắt lại EMA200.")} title="Số nến liên tục cùng phía EMA200 để xác nhận xu hướng vững chắc trước khi vào lệnh.">[?]</button>
                      </div>
                      <NumberSpinBox
                        value={entryCfg.accumCandles}
                        onChange={val => setEntryCfg(prev => ({ ...prev, accumCandles: val }))}
                        min={12}
                        max={200}
                        step={1}
                        width="84px"
                      />
                    </div>

                    {entryCfg.altcoinFollowBtc && (
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>{t("eth_vol_mult")}</span>
                          <button className="btn-help" onClick={() => alert("Hệ số nhạy ETH (Vol Mult): Trọng số điều chỉnh khối lượng riêng cho ETH khi bật chế độ Đồng pha BTC. Giúp tự động cân đối quy mô vào lệnh của ETH tương quan với biên độ biến động của thị trường so với BTC.")} title="Hệ số điều chỉnh khối lượng cho ETH khi bật chế độ Đồng pha BTC.">[?]</button>
                        </div>
                        <NumberSpinBox
                          value={entryCfg.ethVolMult}
                          onChange={val => setEntryCfg(prev => ({ ...prev, ethVolMult: val }))}
                          step={0.1}
                          min={0}
                          width="84px"
                        />
                      </div>
                    )}
                    <div style={{ padding: "8px 0 2px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                      {t("entry_formula_note")}
                    </div>
                  </div>
                </div>

                {/* 4. Hệ Số Nhân Đa Khung (TF Multipliers) */}
                <div className="settings-group" data-tour="settings-tf-multipliers">
                  <div className="settings-group-title">{t("tf_multipliers_title")}</div>
                  <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#aaaaaa", borderBottom: "1px solid #333333" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>{t("th_tf")}</th>
                        <th style={{ padding: "6px 8px" }}>
                          {t("th_margin_factor")}
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
                          {t("th_entry_factor")}
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
              <div className="strat-actions-row" data-tour="settings-actions">
                <button type="button" className="btn-reset-strat" onClick={onResetDefaultStrat}>
                  {t("reset_default_btn")}
                </button>
                <button
                  type="button"
                  className="btn-save-strat"
                  disabled={isSavingConfig}
                  onClick={onSaveStratConfig}
                >
                  {isSavingConfig ? <><span className="spinner"></span> {t("saving_strat_btn")}</> : t("save_strat_btn")}
                </button>
              </div>
            </div>
          )}

          {/* ===== TAB 2: QUẢN TRỊ HỆ THỐNG / HỖ TRỢ ===== */}
          {(settingsTab === "system" || settingsTab === "support") && (
            <div className="settings-tab-content" data-tour="settings-support-tab-content" style={{ position: "relative" }}>
              {/* POPUP THÔNG BÁO COPY NHẸ NHÀNG */}
              {copyNotice && (
                <div
                  style={{
                    position: "absolute",
                    top: "10px",
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "rgba(22, 27, 34, 0.95)",
                    border: "1px solid rgba(46, 160, 67, 0.6)",
                    color: "#f0f6fc",
                    padding: "5px 16px",
                    borderRadius: "20px",
                    fontSize: "12px",
                    fontWeight: "500",
                    boxShadow: "0 4px 16px rgba(0, 0, 0, 0.5)",
                    zIndex: 1000,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "6px",
                    pointerEvents: "none",
                    backdropFilter: "blur(6px)",
                    whiteSpace: "nowrap",
                    animation: "fadeIn 0.15s ease",
                  }}
                >
                  <span style={{ color: "#3fb950", fontSize: "13px" }}>✓</span>
                  <span>{copyNotice}</span>
                </div>
              )}

              <div className="settings-tab-scroll" style={{ padding: "4px 8px 16px 8px" }}>

                {/* 1. ĐIỀU KIỆN ĐỂ SỬ DỤNG APP (BO VIỀN CẢ CỤM, BỎ ICON) */}
                <div
                  style={{
                    border: "1px solid #383838",
                    borderRadius: "8px",
                    background: "#1e1e1e",
                    padding: "14px 16px",
                    marginBottom: "16px",
                    textAlign: "left",
                    fontSize: "12px",
                    color: "#aaaaaa",
                    lineHeight: "1.6",
                  }}
                >
                  <p style={{ color: "#27ae60", fontWeight: "bold", margin: "0 0 6px 0", fontSize: "14px" }}>
                    ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:
                  </p>
                  <p style={{ margin: "0 0 6px 0" }}>
                    1. Đăng ký tài khoản OKX dưới Link giới thiệu của AutoTrader.fun
                  </p>
                  <p style={{ margin: "0 0 14px 0" }}>
                    2. Hoặc thực hiện chuyển Ref về AutoTrader.fun nếu đã có sẵn tài khoản OKX.
                  </p>

                  {/* 2 Nút giữ lại màu sắc nổi bật */}
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => window.open("https://okx.com/join/AutoTrader", "_blank")}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                        border: "1px solid #10b981",
                        color: "#ffffff",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; }}
                    >
                      Đăng ký OKX (VIP)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTransferGuide(!showTransferGuide)}
                      style={{
                        flex: 1,
                        padding: "9px 12px",
                        background: showTransferGuide ? "#2d3748" : "#1f2937",
                        border: "1px solid #3b82f6",
                        color: "#60a5fa",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: "bold",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                        transition: "all 0.15s ease",
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "#2d3748"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = showTransferGuide ? "#2d3748" : "#1f2937"; }}
                    >
                      Hướng dẫn chuyển Ref {showTransferGuide ? "▲" : "▼"}
                    </button>
                  </div>

                  {/* Chi tiết hướng dẫn chuyển Ref (Thu gọn / Mở rộng) */}
                  {showTransferGuide && (
                    <div
                      style={{
                        marginTop: "12px",
                        background: "#161b22",
                        border: "1px solid #30363d",
                        borderRadius: "6px",
                        padding: "12px 14px",
                        fontSize: "12px",
                        color: "#bbb",
                        lineHeight: "1.6",
                      }}
                    >
                      {/* Cách 1 */}
                      <div style={{ marginBottom: "12px", paddingBottom: "12px", borderBottom: "1px solid #2a2a2a" }}>
                        <strong style={{ color: "#26a69a", display: "block", marginBottom: "6px", fontSize: "13px" }}>
                          Cách 1: Chuyển Ref (Dành cho người dùng đã có tài khoản OKX)
                        </strong>
                        <div style={{ paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>
                            1. Truy cập link chuyển Ref:{" "}
                            <a
                              href="https://www.okx.com/ul/J6l2R5"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#58a6ff", textDecoration: "none" }}
                            >
                              https://www.okx.com/ul/J6l2R5
                            </a>
                          </div>
                          <div>2. Điền form yêu cầu:</div>
                          <ul style={{ margin: "2px 0 2px 18px", padding: 0 }}>
                            <li style={{ marginBottom: "4px" }}>
                              Mã mời (Referral code):{" "}
                              <strong
                                style={{
                                  color: "#00ffff",
                                  cursor: "pointer",
                                }}
                                onClick={() => handleCopyText("AutoTrader", "Đã copy Mã mời: AutoTrader")}
                                onTouchEnd={(e) => { e.preventDefault(); handleCopyText("AutoTrader", "Đã copy Mã mời: AutoTrader"); }}
                                title="Click hoặc chạm để copy Mã mời"
                              >
                                AutoTrader
                              </strong>
                            </li>
                            <li>
                              Lý do tham gia:{" "}
                              <span
                                style={{
                                  color: "#e6edf3",
                                  cursor: "pointer",
                                  fontStyle: "italic",
                                  display: "inline-block",
                                  marginTop: "3px",
                                }}
                                onClick={() =>
                                  handleCopyText(
                                    "I was invited by an affiliate but forgot to add the code when signing up",
                                    "Đã copy Lý do tham gia!"
                                  )
                                }
                                onTouchEnd={(e) => {
                                  e.preventDefault();
                                  handleCopyText(
                                    "I was invited by an affiliate but forgot to add the code when signing up",
                                    "Đã copy Lý do tham gia!"
                                  );
                                }}
                                title="Click hoặc chạm để copy Lý do"
                              >
                                "I was invited by an affiliate but forgot to add the code when signing up"
                              </span>
                            </li>
                          </ul>
                          <div>3. Nhấn Submit và chờ OKX duyệt kết quả.</div>
                        </div>
                      </div>

                      {/* Cách 2 */}
                      <div>
                        <strong style={{ color: "#26a69a", display: "block", marginBottom: "6px", fontSize: "13px" }}>
                          Cách 2: Xoá tài khoản cũ, tạo tài khoản mới
                        </strong>
                        <div style={{ paddingLeft: "14px", display: "flex", flexDirection: "column", gap: "4px" }}>
                          <div>
                            1. Đóng tài khoản cũ: Vào <strong>Thông tin tài khoản &gt; Bảo mật &gt; Đóng tài khoản</strong>.
                          </div>
                          <div>
                            2. Đăng ký tài khoản mới qua link:{" "}
                            <a
                              href="https://okx.com/join/AutoTrader"
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#58a6ff", textDecoration: "none" }}
                            >
                              https://okx.com/join/AutoTrader
                            </a>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                  {/* 2. LIÊN HỆ ADMIN (Y HỆT BẢN CŨ) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "10px 14px",
                      border: "1px solid #444",
                      borderRadius: "6px",
                      background: "#262626",
                      marginBottom: "20px",
                    }}
                  >
                    <span style={{ fontSize: "12px", fontWeight: "bold", color: "#eee" }}>Liên hệ Admin:</span>
                    <div style={{ display: "flex", gap: "12px" }}>
                      <img
                        src="/media/Telegram.png"
                        alt="Telegram"
                        title="Telegram Admin"
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                        onClick={() => window.open("https://t.me/baotran_tls1", "_blank")}
                      />
                      <img
                        src="/media/Messenger.png"
                        alt="Messenger"
                        title="Facebook Messenger"
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                        onClick={() => window.open("https://www.facebook.com/baotran.tls1/", "_blank")}
                      />
                      <img
                        src="/media/zalo.png"
                        alt="Zalo"
                        title="Zalo Admin"
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                        onClick={() => window.open("zalo://conversation?phone=84377333096", "_blank")}
                      />
                      <img
                        src="/media/Discord.png"
                        alt="Discord"
                        title="Discord Community"
                        style={{ width: "24px", height: "24px", cursor: "pointer" }}
                        onClick={() => window.open("https://discord.gg/8NXaSCvZ6u", "_blank")}
                      />
                    </div>
                  </div>

                {/* 3. PHẦN PHỤ KỸ THUẬT & CÔNG CỤ (ĐÁY TAB) */}
                <div style={{ borderTop: "1px solid #333", paddingTop: "14px" }}>
                  {/* Mã Máy HWID */}
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "14px", flexWrap: "wrap" }}>
                    <span style={{ color: "#888", fontSize: "12px" }}>{t("your_hwid")}</span>
                    <span
                      className="hwid-value"
                      style={{ color: "#00ffff", fontWeight: "bold", fontSize: "13px", cursor: "pointer", fontFamily: "Consolas, monospace" }}
                      title="Click để copy Mã Máy"
                      onClick={() => handleCopyText(hwid, "Đã copy Mã máy thiết bị (HWID)!")}
                      onTouchEnd={(e) => { e.preventDefault(); handleCopyText(hwid, "Đã copy Mã máy thiết bị (HWID)!"); }}
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
                      }}
                      title="Xem video Hướng Dẫn trên YouTube"
                    >
                      {t("guide_btn")}
                    </button>
                  </div>

                  {/* Lệnh Can Thiệp Nhanh */}
                  <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                    <button className="btn-audit" onClick={handleResetCapital}>
                      ♻️ {t("reset_audit_btn")}
                    </button>
                    {(Boolean(localStorage.getItem('tls1_uid') || loginUid) && (localStorage.getItem('tls1_uid') || loginUid).toLowerCase() === "admtls12021") && (
                      <button className="btn-audit" onClick={handleResetNen}>
                        ♻️ {t("reset_nen_btn")}
                      </button>
                    )}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* ===== TAB 3: ĐÁNH GIÁ (SHOPEE STYLE) ===== */}
          {settingsTab === "reviews" && (
            <div className="settings-tab-content" data-tour="settings-reviews-tab-content">
              <div className="settings-tab-scroll" style={{ padding: "12px 14px 20px 14px" }}>
                <ReviewsTab
                  apiKey={apiKey}
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  okxUid={okxUid}
                  hwid={hwid}
                />
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
