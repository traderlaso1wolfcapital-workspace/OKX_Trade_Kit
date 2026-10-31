import React, { useState } from 'react';
import ToggleSwitch from '../common/ToggleSwitch';
import NumberSpinBox from '../common/NumberSpinBox';
import { COIN_LIST } from '../../constants/tradeConfig';
import { useTranslation } from '../../i18n';
import ReviewsTab from './ReviewsTab';

function getObFractionLabel(val) {
  const num = parseFloat(val);
  if (isNaN(num) || Math.abs(num) < 0.01) return "0 (Mép cản ngoài)";
  if (Math.abs(num - 0.2) < 0.05) return "+1/5 OB (Đón trước 20%)";
  if (Math.abs(num - 0.4) < 0.05) return "+2/5 OB (Đón trước 40%)";
  if (Math.abs(num - (-0.2)) < 0.05) return "-1/5 OB (Đón trong 20%)";
  if (Math.abs(num - (-0.4)) < 0.05) return "-2/5 OB (Đón trong 40%)";
  if (Math.abs(num - (-0.6)) < 0.05) return "-3/5 OB (Đón trong 60%)";
  if (Math.abs(num - (-0.8)) < 0.05) return "-4/5 OB (Đón trong 80%)";
  return (num > 0 ? "+" : "") + (num * 5).toFixed(1) + "/5 OB";
}

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
  activePairs = [],
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
              <div className="settings-tab-scroll" style={{ paddingBottom: "280px" }}>
                {/* 1. THÊM MÃ GIAO DỊCH (Tách 2 phần: Trên là FX, Dưới là COIN, đệm tách dòng nhẹ) */}
                <div className="settings-group" data-tour="settings-watchlist">
                  <div className="settings-group-title" style={{ margin: 0 }}>{t("watchlist_title")}</div>
                  
                  {/* Nhóm FX / Kim loại / Hàng hóa (XAU, XAG, CL...) */}
                  <div className="coin-select-grid" style={{ marginTop: "8px" }}>
                    {COIN_LIST.filter(c => c.value !== "USDT.D" && (c.assetClass === "forex" || ["XAU", "XAG", "CL"].includes(c.label.replace("-USDT", "").replace("-SWAP", "")))).map(coin => {
                      const isSelected = (watchlistCoins && watchlistCoins.includes(coin.value)) || (activePairs && activePairs.includes(coin.value));
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
                      const isSelected = (watchlistCoins && watchlistCoins.includes(coin.value)) || (activePairs && activePairs.includes(coin.value));
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
                      <div className="tactics-toggles-layout">
                        <div className="tactics-left-col">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={strat.main ?? true} onChange={v => setStrat(s => ({ ...s, main: v }))} />
                            <span className="toggle-name">{t("smc_order_block")}</span>
                            <button className="btn-help" onClick={() => alert("Kích hoạt chiến lược Smart Money Concepts (SMC): Tự động quét vùng mất cân bằng cung cầu (Order Block / FVG) để đặt lệnh đón thanh khoản theo cấu trúc sóng thị trường.")} title="Kích hoạt chiến lược Smart Money Concepts (Order Block / FVG).">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={strat.multiTfGrid ?? true} onChange={v => setStrat(s => ({ ...s, multiTfGrid: v }))} />
                            <span className="toggle-name">Lưới Đa Khung Độc Lập</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Lưới Đa Khung Độc Lập): Bot quét nến và tính toán Order Block độc lập trên từng khung thời gian được tích chọn ở cột TF trade (5m, 15m, 30m, 1H, 4H...). Mỗi TF tự đặt lệnh, chốt lời và cắt lỗ riêng biệt theo đúng cấu trúc sóng của khung giờ đó.")} title="BẬT: Chạy độc lập trên từng TF được tích ở cột TF trade.">[?]</button>
                          </div>
                        </div>
                        <div className="tactics-right-col">
                          <div className="toggle-row" style={{ marginBottom: '10px' }}>
                            <ToggleSwitch checked={smcEntryCfg.autoMitigation ?? true} onChange={v => setSmcEntryCfg(s => ({ ...s, autoMitigation: v }))} />
                            <span className="toggle-name">Tự Động Khử Cản (Mitigation)</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Khử cản): Khi giá đã đâm xuyên qua vùng Order Block (thủng râu cản), khối cản đó được coi là đã hấp thụ hết thanh khoản và tự động xóa bỏ, không gài lệnh trễ.")} title="BẬT: Tự động loại bỏ OB khi giá đâm xuyên qua.">[?]</button>
                          </div>
                          <div className="toggle-row">
                            <ToggleSwitch checked={smcEntryCfg.mergeOverlapping ?? true} onChange={v => setSmcEntryCfg(s => ({ ...s, mergeOverlapping: v }))} />
                            <span className="toggle-name">Gộp Cản Chồng Lấn</span>
                            <button className="btn-help" onClick={() => alert("BẬT (Gộp cản): Khi có 2 khối OB cùng chiều nằm đè lên nhau hoặc giao cắt nhau, hệ thống tự động gộp thành 1 vùng cản Zone duy nhất để tối ưu hóa điểm vào lệnh và bảo vệ vốn.")} title="BẬT: Tự động gộp các OB đè nhau thành 1 vùng Zone lớn.">[?]</button>
                          </div>
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
                {activeBotTab === "sub2" ? (
                  <div className="settings-group" data-tour="settings-entry-filters">
                    <div className="settings-group-title">Điểm Vào Lệnh (SMC Entry Setup)</div>
                    <div className="entry-setup-list">
                      {/* ĐÓN TRƯỚC MÉP CẢN OB (CHIA 5 PHẦN THÂN OB) */}
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>Đón trước mép cản OB:</span>
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(`Vị trí đón cản theo tỷ lệ thân OB (chia 5 phần):
- 0 (Mép ngoài): Đón đúng mép cản OB, chạm là khớp tức thì (Mặc định - Dễ khớp nhất).
- +1/5 OB, +2/5 OB: Đón sớm bên ngoài cản (20%, 40% chiều cao OB) để bắt sóng sớm.
- -1/5 OB, -2/5 OB: Đón sâu trong lòng cản (20%, 40% chiều cao OB) để có tỷ lệ R:R đẹp hơn.
- -3/5 OB, -4/5 OB: Đón cực sâu sát mép cắt lỗ (60%, 80% chiều cao OB).

* Ưu điểm: Tự động co giãn theo biên độ thực tế của từng khối OB và mọi khung thời gian (M5, 15m, 1H, 4H), không cần nhân hệ số % thủ công.`)}
                            title="Chọn vị trí đón cản theo tỷ lệ thân OB (chia làm 5 phần)."
                          >
                            [?]
                          </button>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {/* Styled Dropdown giống nút 'Theo OB ngược chiều ▼' */}
                          <div style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "0 10px",
                                height: "26px",
                                fontSize: "11px",
                                fontWeight: "bold",
                                borderRadius: "4px",
                                border: "1px solid #444",
                                background: "#222",
                                cursor: "pointer",
                                userSelect: "none",
                                whiteSpace: "nowrap",
                                boxSizing: "border-box",
                                transition: "all 0.15s ease",
                              }}
                            >
                              <span style={{ color: "#26a69a" }}>
                                {getObFractionLabel(smcEntryCfg.entryFraction ?? "0")}
                              </span>
                              <span style={{ fontSize: "8px", opacity: 0.95, color: "#26a69a" }}>▼</span>
                            </div>

                            <select
                              value={smcEntryCfg.entryFraction ?? "0"}
                              onChange={e => setSmcEntryCfg(s => ({ ...s, entryFraction: e.target.value }))}
                              style={{
                                position: "absolute",
                                top: 0,
                                left: 0,
                                width: "100%",
                                height: "100%",
                                opacity: 0,
                                cursor: "pointer",
                              }}
                            >
                              <option value="0.4" style={{ background: "#222", color: "#26a69a" }}>+2/5 OB (Đón trước ngoài cản 40%)</option>
                              <option value="0.2" style={{ background: "#222", color: "#26a69a" }}>+1/5 OB (Đón trước ngoài cản 20%)</option>
                              <option value="0" style={{ background: "#222", color: "#fff" }}>0 (Mép cản ngoài - Khớp nhanh nhất)</option>
                              <option value="-0.2" style={{ background: "#222", color: "#ffb74d" }}>-1/5 OB (Đón sâu trong cản 20%)</option>
                              <option value="-0.4" style={{ background: "#222", color: "#ffb74d" }}>-2/5 OB (Đón sâu trong cản 40%)</option>
                              <option value="-0.6" style={{ background: "#222", color: "#ef5350" }}>-3/5 OB (Đón sâu trong cản 60%)</option>
                              <option value="-0.8" style={{ background: "#222", color: "#ef5350" }}>-4/5 OB (Đón sâu trong cản 80%)</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* BỘ LỌC ĐỘ DÀY OB TỐI THIỂU */}
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>Độ dày OB tối thiểu (Base):</span>
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(`Độ dày OB tối thiểu cơ sở (Base Min OB Size): Lọc bỏ các khối Order Block có biên độ nhỏ hơn mức này (mặc định 0.30% ở M5).
- Ở các khung lớn hơn (M15, H1, H4...), độ dày này sẽ tự động nhân với Hệ số Đa Khung (ví dụ M15 x1.2 = 0.36%, H1 x2.0 = 0.60%, H4 x5.0 = 1.50%).
- Giúp loại trừ các vùng cản mỏng dính, đảm bảo khoảng cách Stop Loss đủ an toàn và tránh bị quét râu cắn SL sớm.`)}
                            title="Lọc bỏ OB nhỏ hơn N% giá để tránh SL quá ngắn (tự động nhân hệ số TF)."
                          >
                            [?]
                          </button>
                        </div>
                        <NumberSpinBox
                          value={smcEntryCfg.minObHeight ?? "0.30"}
                          onChange={val => setSmcEntryCfg(prev => ({ ...prev, minObHeight: val }))}
                          step={0.05}
                          min={0.05}
                          max={2.0}
                          suffix="%"
                          width="84px"
                        />
                      </div>

                      {/* BỘ GỘP & GIÃN CẢN TỐI THIỂU (GỘP CHUNG 1 DÒNG) */}
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                          <span>Khoảng cách gộp & giãn cản (Base):</span>
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(`Khoảng cách gộp & giãn cản cơ sở (Base Merge & Opposite Gap):
- Mặc định: 0.50% ở khung M5, tự động nhân hệ số TF cho các khung lớn hơn (M15 x1.2 = 0.60%, H1 x2.0 = 1.00%, H4 x5.0 = 2.50%).

1. Gộp cản cùng chiều: Các khối OB cùng màu cách nhau nhỏ hơn ngưỡng này sẽ tự động gộp thành 1 khối vững chắc duy nhất để SL dày dặn an toàn.
2. Giãn cản ngược chiều: Khi 2 cản xanh đỏ đối diện quá sát nhau, bot tự động lọc bỏ khối cản ở giữa khi phía sau vẫn còn cản cùng màu đỡ, giúp khoảng vào lệnh giữa 2 chiều rộng rãi và TP không bị ngắn.`)}
                            title="Tự động gộp OB cùng chiều sát nhau và lọc giãn cách OB ngược chiều để bảo vệ SL và TP tối ưu."
                          >
                            [?]
                          </button>
                        </div>
                        <NumberSpinBox
                          value={smcEntryCfg.mergeThreshold ?? "0.50"}
                          onChange={val => setSmcEntryCfg(prev => ({ ...prev, mergeThreshold: val, oppositeGap: val }))}
                          step={0.05}
                          min={0.1}
                          max={3.0}
                          suffix="%"
                          width="84px"
                        />
                      </div>

                      <div style={{ padding: "8px 0 2px 0", color: "#888", fontStyle: "italic", fontSize: "12px" }}>
                        * Các chỉ số Base được tính trên khung M5 và tự động nhân theo Hệ Số Đa Khung ở các khung lớn (M15, H1, H4...) để đảm bảo SL và TP tối ưu.
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="settings-group" data-tour="settings-entry-filters">
                    <div className="settings-group-title">{t("entry_setup_title")}</div>
                    <div className="entry-setup-list">
                      <div className="entry-setup-row">
                        <div className="entry-label-wrap">
                           <span>{t("base_offset")}</span>
                          <button className="btn-help" onClick={() => alert("Độ lệch đệm (Base Offset %): Đặt lệnh Limit đón sớm hơn một khoảng % trước khi giá chạm đúng vào vạch EMA200 (mặc định 0.05% ở M5), giúp lệnh dễ khớp trước khi thị trường kịp phản ứng bật cản. Ở các khung thời gian lớn hơn, độ lệch này sẽ tự động nhân với Hệ số nhân Entry/TP/SL của khung đó (ví dụ H4 x5.0 -> đệm 0.25%).")} title="Độ lệch đệm đón trước cản EMA200 để lệnh dễ khớp trước khi giá bật nảy.">[?]</button>
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
                          <button className="btn-help" onClick={() => alert("Khoảng cách an toàn tối thiểu (Base Gap %): Ngưỡng cách biệt giá tối thiểu giữa 2 đường EMA200 liền kề để được rải lệnh Limit (mặc định 0.20% ở M5). Nếu 2 đường EMA200 quá sát nhau, bot sẽ tự động bỏ qua khung nhỏ để dồn vào cản khung lớn hơn, tránh rải lệnh quá dày đặc.")} title="Khoảng cách an toàn tối thiểu giữa 2 đường EMA200 để tránh rải lệnh quá dày.">[?]</button>
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
                )}

                {/* 4. Hệ Số Nhân Đa Khung (TF Multipliers) */}
                <div className="settings-group" data-tour="settings-tf-multipliers">
                  <div className="settings-group-title">{t("tf_multipliers_title")}</div>
                  <table style={{ width: "100%", fontSize: "11px", textAlign: "center", borderCollapse: "collapse" }}>
                    <thead>
                      <tr style={{ color: "#aaaaaa", borderBottom: "1px solid #333333" }}>
                        <th style={{ padding: "6px 8px", textAlign: "left" }}>Khung thời gian</th>
                        <th style={{ padding: "6px 8px" }}>
                          Hệ số nhân (Multiplier)
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(`Hệ số Nhân Đa Khung áp dụng thống nhất cho tất cả các Bot:\n1. Khối lượng Ký quỹ (Vốn): Khi bật nhân hệ số TF, vốn ở các khung lớn sẽ được nhân tương ứng (M5 x1.0, M15 x1.2, M30 x1.5, H1 x2.0, H2 x3.0, H4 x5.0, D1 x8.0).\n2. Biên độ TP & SL: Mức TP/SL cơ sở của M5 sẽ được nhân tỷ lệ để mở rộng tương thích với biên độ nến khung lớn.`)}
                            title="Hệ số nhân theo từng khung thời gian."
                          >
                            [?]
                          </button>
                        </th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>
                          {activeBotTab === "sub2" ? "Độ dày OB tối thiểu" : "Vùng đệm đón cản"}
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(activeBotTab === "sub2"
                              ? `Độ dày OB tối thiểu cho từng khung thời gian = Độ dày Base (M5) x Hệ số nhân TF.\n- Các OB mỏng hơn ngưỡng này sẽ được tự động lọc bỏ để bảo vệ SL an toàn.`
                              : `Vùng đệm đón cản EMA200 cho từng khung thời gian = Base Offset x Hệ số nhân TF.`
                            )}
                            title="Ngưỡng độ dày tối thiểu tính tự động theo từng khung thời gian."
                          >
                            [?]
                          </button>
                        </th>
                        <th style={{ padding: "6px 8px", textAlign: "right" }}>
                          {activeBotTab === "sub2" ? "Khoảng cách gộp & giãn cản" : "Khoảng cách nhồi DCA"}
                          <button
                            type="button"
                            className="btn-help"
                            onClick={() => alert(activeBotTab === "sub2"
                              ? `Khoảng cách gộp cản cùng chiều và giãn cản ngược chiều = Base Merge & Gap x Hệ số nhân TF.\n- Các OB cùng chiều cách nhau < ngưỡng này sẽ gộp lại.\n- Các OB ngược chiều cách nhau < ngưỡng này sẽ tự động lọc cản kẹp giữa.`
                              : `Khoảng cách an toàn tối thiểu giữa các vạch EMA200 liền kề để nhồi lệnh DCA.`
                            )}
                            title="Khoảng cách gộp và giãn cản tính tự động theo từng khung thời gian."
                          >
                            [?]
                          </button>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[
                        ["M5",  1.0],
                        ["M15", 1.2],
                        ["M30", 1.5],
                        ["H1",  2.0],
                        ["H2",  3.0],
                        ["H4",  5.0],
                        ["D1",  8.0],
                      ].map(([tf, mult]) => {
                        const isSub2 = activeBotTab === "sub2";
                        const base1 = isSub2
                          ? (parseFloat(smcEntryCfg.minObHeight) || 0.30)
                          : (parseFloat(entryCfg.entryOffset) || 0.05);
                        const base2 = isSub2
                          ? (parseFloat(smcEntryCfg.mergeThreshold) || 0.50)
                          : (parseFloat(entryCfg.dcaGapPct) || 0.20);
                        const val1 = (base1 * mult).toFixed(2) + "%";
                        const val2 = (base2 * mult).toFixed(2) + "%";

                        return (
                          <tr key={tf} style={{ borderBottom: "1px solid #282828" }}>
                            <td style={{ padding: "6px 8px", textAlign: "left", color: "#e0e0e0" }}>{tf}</td>
                            <td style={{ padding: "6px 8px", color: "#26a69a", fontWeight: "bold" }}>{mult.toFixed(1)}x</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "#ff9900", fontWeight: "bold" }}>{val1}</td>
                            <td style={{ padding: "6px 8px", textAlign: "right", color: "#42a5f5", fontWeight: "bold" }}>{val2}</td>
                          </tr>
                        );
                      })}
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

          {/* ===== TAB 3: ĐÁNH GIÁ (SHOPEE STYLE) ===== */}
          {settingsTab === "reviews" && (
            <div className="settings-tab-content" data-tour="settings-reviews-tab-content">
              <div className="settings-tab-scroll" style={{ padding: "12px 14px 280px 14px" }}>
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
