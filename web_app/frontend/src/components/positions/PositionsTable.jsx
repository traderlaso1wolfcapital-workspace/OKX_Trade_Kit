import React, { useState } from "react";
import { COIN_LIST } from "../../constants/tradeConfig";
import { useTranslation } from "../../i18n";

export default function PositionsTable({
  currentPlatform = "okx",
  positions = [],
  safePos = [],
  activePairs = [],
  togglePair,
  watchlistCoins = [],
  enabledTfs = {},
  handleTfToggle,
  onSelectCoinForChart,
  updateChartConfig,
  activeChartIndex = 0,
  selectedAccount = "sub1",
  loginUid = "",
  onRefreshPositions,
  onCloseTicket,
}) {
  const { t } = useTranslation();
  const [closingTickets, setClosingTickets] = useState({});

  const handleCoinClick = (coinValue, tf = "1H") => {
    const rawCoin = coinValue || "BTC-USDT-SWAP";
    if (onSelectCoinForChart) {
      onSelectCoinForChart(rawCoin, tf, activeChartIndex);
    } else if (updateChartConfig) {
      updateChartConfig({ symbol: rawCoin, tf });
    }
  };

  const allCoinValues = new Set([...watchlistCoins, ...(activePairs || []), ...safePos.map((p) => p.instId)]);
  const displayCoins = Array.from(allCoinValues)
    .map((val) => {
      const found = COIN_LIST.find((c) => c.value === val);
      if (found) return found;
      return { label: val.replace("-SWAP", ""), value: val, maxLever: 50 };
    })
    .filter((c) => c.value !== "USDT.D");

  const getCoinObj = (instId) => {
    const found = displayCoins.find((c) => c.value === instId);
    if (found) return found;
    return { label: (instId || "").replace("-SWAP", ""), value: instId, maxLever: 50 };
  };

  const isLimitOrder = (p) =>
    Boolean(p.is_limit) ||
    String(p.ticket_id || "").startsWith("ord_") ||
    String(p.order_id || "").length > 0 ||
    String(p.status || "").toLowerCase().includes("pending");

  // 🔼 TẦNG 1: 100% các lệnh ĐÃ KHỚP (Active Positions) đang chạy, có số PNL xanh/đỏ và nút đỏ [Đóng], sắp xếp theo % PNL từ cao xuống thấp
  const filledParents = safePos
    .filter((p) => !p.is_child && !isLimitOrder(p))
    .sort((a, b) => parseFloat(b.roi || 0) - parseFloat(a.roi || 0));

  // 🔽 TẦNG 2: 100% các lệnh CHỜ KHỚP (Limit Orders), hiển thị chữ vàng Chờ khớp (Limit) và nút cam [Hủy]
  // Gom cùng cặp coin, và sắp xếp thứ tự theo ký quỹ thấp đến cao dần từ trên xuống dưới
  const limitOrders = safePos
    .filter((p) => !p.is_child && isLimitOrder(p))
    .sort((a, b) => {
      // 1. Gom cùng chủng loại (cùng cặp coin theo thứ tự danh mục COIN_LIST)
      const idxA = COIN_LIST.findIndex((c) => c.value === a.instId);
      const idxB = COIN_LIST.findIndex((c) => c.value === b.instId);
      const coinDiff = (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
      if (coinDiff !== 0) return coinDiff;

      // 2. Trong cùng cặp coin: sắp xếp thứ tự theo ký quỹ thấp đến cao dần từ trên xuống dưới
      const marginA = parseFloat(a.margin || 0);
      const marginB = parseFloat(b.margin || 0);
      if (marginA !== marginB) {
        return marginA - marginB; // Thấp ở trên, cao dần ở dưới
      }

      // 3. Nếu cùng ký quỹ: xếp theo giá
      return parseFloat(b.avgPx || 0) - parseFloat(a.avgPx || 0);
    });

  // ⚪ TẦNG 3: Các cặp coin đang đứng ngoài (chờ tín hiệu)
  const activeInstIds = new Set(safePos.map((p) => p.instId));
  const emptyCoins = displayCoins
    .filter((c) => !activeInstIds.has(c.value))
    .sort((a, b) => {
      const idxA = COIN_LIST.findIndex((c) => c.value === a.value);
      const idxB = COIN_LIST.findIndex((c) => c.value === b.value);
      return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
    });

  const handleClosePosition = async (coin, pos) => {
    const tId = pos?.ticket_id || pos?.position_id || pos?.order_id || `${pos?.instId}-${pos?.posSide}`;
    if (closingTickets[tId]) return; // Chống double-click
    setClosingTickets((prev) => ({ ...prev, [tId]: true }));

    if (onCloseTicket) {
      try {
        await onCloseTicket(pos, coin);
      } finally {
        setClosingTickets((prev) => {
          const next = { ...prev };
          delete next[tId];
          return next;
        });
      }
      return;
    }
    const coinName = coin?.label ? coin.label.replace("-SWAP", "") : (pos?.coin || "Position");
    const isLimit = isLimitOrder(pos);
    try {
      if (pos.platform === "tradelocker" || pos.is_prop || (localStorage.getItem("tls1_trading_platform") === "e8")) {
        const u = localStorage.getItem("tls1_uid") || loginUid || "default";
        const res = await fetch("/api/tradelocker/positions/close", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            position_id: pos.position_id || pos.ticket_id,
            uid: u,
            qty: pos.lots || parseFloat(pos.pos || 0),
            is_limit: Boolean(isLimit)
          }),
        });
        const data = await res.json();
        if (res.ok) {
          console.log(isLimit ? `✅ Đã hủy lệnh Limit ${coinName} thành công!` : `✅ Đã đóng vị thế ${coinName} thành công!`);
          if (onRefreshPositions) onRefreshPositions();
        } else {
          console.error("❌ " + (data.detail || data.message || "Lỗi đóng vị thế"));
        }
        return;
      }

      const u = localStorage.getItem("tls1_uid") || loginUid;
      const strat = selectedAccount || "sub1";
      const res = await fetch(`/api/bot/positions/close_ticket?uid=${u}&strategy=${strat}&account_id=${strat}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: pos.ticket_id,
          instId: pos.instId || `${coin.value}-SWAP`,
          posSide: pos.posSide,
          pos: pos.pos,
          upl: pos.upl,
          exitPx: pos.lastPx,
          is_limit: Boolean(isLimit),
        }),
      });
      const data = await res.json();
      if (res.ok) {
        console.log(isLimit ? `✅ Đã hủy lệnh Limit ${coinName} thành công!` : `✅ Đã đóng vị thế ${coinName} thành công!`);
        if (onRefreshPositions) onRefreshPositions();
      } else {
        console.error("❌ " + (data.detail || data.message || "Lỗi đóng vị thế"));
      }
    } catch (e) {
      console.error("❌ Lỗi kết nối: " + e.message);
    } finally {
      setClosingTickets((prev) => {
        const next = { ...prev };
        delete next[tId];
        return next;
      });
    }
  };

  const renderPosRow = (pos, index, isChild = false, isLast = true) => {
    const isLimit = isLimitOrder(pos);
    const isLong = (pos.posSide || pos.side || "long").toLowerCase() === "long" || (pos.posSide || pos.side || "").toLowerCase() === "buy";
    const upl = parseFloat(pos.upl || "0");
    const margin = parseFloat(pos.margin || "0");
    const isFxOrProp =
      (pos.is_prop ||
       pos.platform === "tradelocker" ||
       pos.platform === "mt5" ||
       (currentPlatform === "e8" && pos.platform !== "okx") ||
       (pos.lots !== undefined && pos.lots !== null && pos.platform !== "okx")) &&
      pos.platform !== "okx";
    const lotVal =
      pos.lots !== undefined && pos.lots !== null
        ? parseFloat(pos.lots)
        : parseFloat(pos.pos) || 0.01;
    const coin = getCoinObj(pos.instId);

    return (
      <tr
        key={`${pos.instId}-${pos.ticket_id || index}`}
        style={{
          borderBottom: isLast
            ? "1px solid #262626"
            : isChild
            ? "1px solid transparent"
            : "1px solid rgba(255, 255, 255, 0.03)",
          backgroundColor: isChild ? "rgba(255, 255, 255, 0.01)" : "transparent",
        }}
      >
        <td style={{ textAlign: "left", padding: "4px 6px", whiteSpace: "nowrap" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "2px",
              margin: 0,
              paddingLeft: isChild ? "20px" : "0px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              {!isChild ? (
                <img
                  src={`https://static.okx.com/cdn/oksupport/asset/currency/icon/${(coin.label || coin.value || "").replace("-USDT", "").replace("-SWAP", "").trim().toLowerCase()}.png`}
                  alt={coin.label}
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    objectFit: "contain",
                    flexShrink: 0,
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              ) : (
                <span style={{ color: "#555", fontSize: "11px", fontFamily: "monospace", width: "18px", textAlign: "center", flexShrink: 0 }}>
                  └─
                </span>
              )}
              <span
                style={{
                  color: isChild ? "rgba(255,255,255,0.4)" : "#fff",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: "400",
                }}
                onClick={() => {
                  const rawTf = pos.tf ? pos.tf.split(" ")[0].toUpperCase() : "1H";
                  let mappedTf = "1H";
                  if (rawTf.includes("1M") || rawTf.includes("M1")) mappedTf = "1m";
                  else if (rawTf.includes("5M") || rawTf.includes("M5")) mappedTf = "5m";
                  else if (rawTf.includes("15M") || rawTf.includes("M15")) mappedTf = "15m";
                  else if (rawTf.includes("30M") || rawTf.includes("M30")) mappedTf = "30m";
                  else if (rawTf.includes("1H") || rawTf.includes("H1")) mappedTf = "1H";
                  else if (rawTf.includes("2H") || rawTf.includes("H2")) mappedTf = "2H";
                  else if (rawTf.includes("4H") || rawTf.includes("H4")) mappedTf = "4H";
                  else if (rawTf.includes("1D") || rawTf.includes("D1")) mappedTf = "1D";
                  handleCoinClick(coin.value, mappedTf);
                }}
                title={t("click_to_view_chart")}
              >
                {(localStorage.getItem("tls1_trading_platform") || "okx") === "e8"
                  ? (pos.displayPair || coin.label.replace("-SWAP", "").replace("-USDT", "/USD"))
                  : coin.label.replace("-SWAP", "")}
              </span>

              {!isChild && !isLimit && (
                <span
                  style={{
                    fontSize: "12px",
                    color: isLong ? "#00c087" : "#ff4d4f",
                    fontWeight: "normal",
                    marginLeft: "4px",
                  }}
                >
                  {isLong ? "Long" : "Short"}
                </span>
              )}
            </div>

            {isLimit ? (
              <div style={{ color: "#f59e0b", fontSize: "11px", fontWeight: 400, marginLeft: isChild ? "26px" : "22px" }}>
                {isLong ? "Limit Long" : "Limit Short"} {pos.avgPx ? parseFloat(pos.avgPx).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0"}
              </div>
            ) : (
              <div style={{ color: "#888", fontSize: "11.5px", marginLeft: isChild ? "26px" : "22px" }}>
                {pos.avgPx
                  ? parseFloat(pos.avgPx).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "0.0"}{" "}
                ➔{" "}
                {pos.lastPx
                  ? parseFloat(pos.lastPx).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : pos.avgPx
                  ? parseFloat(pos.avgPx).toLocaleString("en-US", {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })
                  : "0.0"}
              </div>
            )}
          </div>
        </td>
        <td
          style={{
            textAlign: "center",
            padding: "4px 6px",
            fontSize: "13px",
            color: isChild ? "rgba(255,255,255,0.4)" : "#fff",
            whiteSpace: "nowrap",
            fontWeight: "400",
          }}
        >
          {isFxOrProp ? `${lotVal.toFixed(2)} L` : `${margin.toFixed(2)} $`}
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center", fontSize: "13px", whiteSpace: "nowrap" }}>
          {isLimit ? (
            <span style={{ color: "#f59e0b", fontSize: "12px", fontWeight: "bold" }}>
              Chờ khớp (Limit)
            </span>
          ) : (
            (() => {
              const roi = parseFloat(pos.roi || 0);
              const color = roi >= 0 ? "#00c087" : "#ff4d4f";
              return (
                <div
                  style={{
                    color,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "6px",
                  }}
                >
                  <span style={{ fontWeight: "400", fontSize: "14.2px" }}>
                    {upl >= 0 ? "+" : ""}
                    {upl.toFixed(2)} {isFxOrProp ? "USD" : "USDT"}
                  </span>
                  <span style={{ fontSize: "11.5px" }}>
                    ({roi > 0 ? "+" : ""}
                    {roi.toFixed(2)}%)
                  </span>
                </div>
              );
            })()
          )}
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
          {!isChild && (
            <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
              {["M5", "M15", "M30", "H1", "H2", "H4"].map((tf) => {
                const coinTfs = (enabledTfs && typeof enabledTfs === "object" && !Array.isArray(enabledTfs)) ? (enabledTfs[coin.value] || []) : [];
                const isOn = coinTfs.includes(tf);
                const label = tf.replace("M", "");
                return (
                  <span
                    key={tf}
                    className={`tf-badge ${isOn ? "on" : "off"}`}
                    onClick={() => handleTfToggle && handleTfToggle(coin.value, tf)}
                    style={{
                      cursor: "pointer",
                      padding: "0px",
                      borderRadius: "5px",
                      fontSize: "12.5px",
                      fontWeight: "bold",
                      background: isOn ? "#1d766b" : "#222222",
                      color: isOn ? "#f0f0f0" : "#aaaaaa",
                      border: isOn ? "1px solid #1d766b" : "1px solid #444444",
                      width: "29px",
                      height: "24px",
                      textAlign: "center",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {label}
                  </span>
                );
              })}
            </div>
          )}
        </td>
        <td style={{ textAlign: "center", padding: "4px 6px", whiteSpace: "nowrap" }}>
          {(() => {
            const tId = pos?.ticket_id || pos?.position_id || pos?.order_id || `${pos?.instId}-${pos?.posSide}`;
            const isClosing = Boolean(closingTickets[tId]);
            return (
              <button
                disabled={isClosing}
                onClick={() => handleClosePosition(coin, pos)}
                style={{
                  background: isClosing ? "#6b7280" : (isLimit ? "#d97706" : "#b32626"),
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  padding: "4px 14px",
                  cursor: isClosing ? "not-allowed" : "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                  opacity: isClosing ? 0.6 : 1,
                  transition: "all 0.2s ease",
                }}
              >
                {isClosing ? "..." : (isLimit ? "Hủy" : t("close_btn"))}
              </button>
            );
          })()}
        </td>
      </tr>
    );
  };

  const renderEmptyCoinRow = (coin) => {
    return (
      <tr key={`${coin.value}-empty`} style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.03)" }}>
        <td style={{ textAlign: "left", padding: "4px 6px", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", margin: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <img
                src={`https://static.okx.com/cdn/oksupport/asset/currency/icon/${(coin.label || coin.value || "").replace("-USDT", "").replace("-SWAP", "").trim().toLowerCase()}.png`}
                alt={coin.label}
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "50%",
                  objectFit: "contain",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span
                style={{ color: "#fff", fontSize: "13px", fontWeight: "400", cursor: "pointer" }}
                onClick={() => handleCoinClick(coin.value, "1H")}
                title={t("click_to_view_chart")}
              >
                {(localStorage.getItem("tls1_trading_platform") || "okx") === "e8"
                  ? coin.label.replace("-SWAP", "").replace("-USDT", "/USD")
                  : coin.label.replace("-SWAP", "")}
              </span>
            </div>
            <span style={{ color: "#666", fontSize: "11px", marginLeft: "24px", whiteSpace: "nowrap" }}>{t("waiting_signal")}</span>
          </div>
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center" }}>
          <span className="empty-dash" style={{ color: "#555", fontSize: "13px" }}>--</span>
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center" }}>
          <span className="empty-dash" style={{ color: "#555", fontSize: "13px" }}>--</span>
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center", whiteSpace: "nowrap" }}>
          <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
            {["M5", "M15", "M30", "H1", "H2", "H4"].map((tf) => {
              const coinTfs = (enabledTfs && typeof enabledTfs === "object" && !Array.isArray(enabledTfs)) ? (enabledTfs[coin.value] || []) : [];
              const isOn = coinTfs.includes(tf);
              const label = tf.replace("M", "");
              return (
                <span
                  key={tf}
                  className={`tf-badge ${isOn ? "on" : "off"}`}
                  onClick={() => handleTfToggle && handleTfToggle(coin.value, tf)}
                  style={{
                    cursor: "pointer",
                    padding: "0px",
                    borderRadius: "5px",
                    fontSize: "12.5px",
                    fontWeight: "bold",
                    background: isOn ? "#1d766b" : "#222222",
                    color: isOn ? "#f0f0f0" : "#aaaaaa",
                    border: isOn ? "1px solid #1d766b" : "1px solid #444444",
                    width: "29px",
                    height: "24px",
                    textAlign: "center",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  {label}
                </span>
              );
            })}
          </div>
        </td>
        <td style={{ padding: "4px 6px", textAlign: "center" }}>
          <span className="empty-dash" style={{ color: "#555", fontSize: "13px" }}>--</span>
        </td>
      </tr>
    );
  };

  return (
    <div
      className="positions-table-wrapper"
      data-tour="watchlist-pairs"
      style={{
        flex: 1,
        width: "100%",
        maxWidth: "100%",
        minWidth: 0,
        height: "100%",
        maxHeight: "100%",
        minHeight: 0,
        overflowX: "auto",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x pan-y",
        overscrollBehavior: "none",
      }}
    >
      <table className="positions-table">
        <thead>
          <tr style={{ background: "#252526" }}>
            <th style={{ textAlign: "left", whiteSpace: "nowrap" }}>{t("th_pair")}</th>
            <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>{t("th_margin")}</th>
            <th style={{ textAlign: "center", minWidth: "130px" }}>{t("th_pnl")}</th>
            <th style={{ textAlign: "center" }}>{t("th_tf_trade")}</th>
            <th style={{ textAlign: "center", whiteSpace: "nowrap" }}>{t("th_close")}</th>
          </tr>
        </thead>
        <tbody>
          {/* 🔼 TẦNG 1: 100% CÁC LỆNH ĐÃ KHỚP (ACTIVE POSITIONS) */}
          {filledParents.map((parent, pIdx) => {
            const children = (positions || []).filter((p) => p.is_child && p.parent_id === parent.ticket_id);
            const hasChildren = children.length > 0;
            return (
              <React.Fragment key={`filled-${parent.ticket_id || pIdx}`}>
                {renderPosRow(parent, pIdx, false, !hasChildren)}
                {children.map((child, cIdx) => 
                  renderPosRow(child, `${pIdx}-${cIdx}`, true, cIdx === children.length - 1)
                )}
              </React.Fragment>
            );
          })}

          {/* 🔽 TẦNG 2: 100% CÁC LỆNH CHỜ KHỚP (LIMIT ORDERS) */}
          {limitOrders.map((limitPos, lIdx) => 
            renderPosRow(limitPos, `limit-${limitPos.ticket_id || lIdx}`, false, true)
          )}

          {/* ⚪ TẦNG 3: CÁC CẶP COIN ĐỨNG NGOÀI (CHỜ TÍN HIỆU) */}
          {emptyCoins.map((coin) => renderEmptyCoinRow(coin))}
        </tbody>
      </table>
    </div>
  );
}
