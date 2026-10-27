import React from "react";
import { COIN_LIST } from "../../constants/tradeConfig";
import { useTranslation } from "../../i18n";

export default function PositionsTable({
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

  const handleCoinClick = (coinValue, tf = "1H") => {
    const rawCoin = coinValue || "BTC-USDT-SWAP";
    if (onSelectCoinForChart) {
      onSelectCoinForChart(rawCoin, tf);
    } else if (updateChartConfig) {
      updateChartConfig(activeChartIndex, { coin: rawCoin, tf });
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

  const getCoinRoi = (coinValue) => {
    const list = safePos.filter((p) => p.instId === coinValue);
    if (list.length === 0) return -999999999;
    return Math.max(...list.map((p) => parseFloat(p.roi || 0)));
  };

  const sortedCoins = [...displayCoins].sort((a, b) => {
    const roiA = getCoinRoi(a.value);
    const roiB = getCoinRoi(b.value);
    if (roiA !== roiB) return roiB - roiA; // % PNL cao nhất từ trên xuống dưới
    const idxA = COIN_LIST.findIndex((c) => c.value === a.value);
    const idxB = COIN_LIST.findIndex((c) => c.value === b.value);
    return (idxA >= 0 ? idxA : 999) - (idxB >= 0 ? idxB : 999);
  });

  const handleClosePosition = async (coin, pos) => {
    if (onCloseTicket) {
      onCloseTicket(pos, coin);
      return;
    }
    const coinName = coin?.label ? coin.label.replace("-SWAP", "") : (pos?.coin || "Position");
    const isLimitOrder = pos?.is_limit || String(pos?.ticket_id || "").startsWith("ord_");
    const confirmMsg = isLimitOrder 
      ? `Bạn có chắc chắn muốn HỦY LỆNH LIMIT ${coinName} không?`
      : t("close_pos_confirm").replace("{coin}", coinName);
    if (!window.confirm(confirmMsg)) return;
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
            is_limit: Boolean(isLimitOrder)
          }),
        });
        const data = await res.json();
        if (res.ok) {
          alert(isLimitOrder ? `✅ Đã hủy lệnh Limit ${coinName} thành công!` : ("✅ " + t("close_pos_success").replace("{coin}", coinName)));
          if (onRefreshPositions) onRefreshPositions();
        } else {
          alert("❌ " + t("close_pos_fail").replace("{coin}", coinName) + (data.detail || data.message || t("server_error")));
        }
        return;
      }

      const u = localStorage.getItem("tls1_uid") || loginUid;
      const strat = selectedAccount || "sub1";
      const res = await fetch(`/api/bot/positions/close_ticket?uid=${u}&strategy=${strat}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticket_id: pos.ticket_id,
          instId: pos.instId || `${coin.value}-SWAP`,
          posSide: pos.posSide,
          pos: pos.pos,
          upl: pos.upl,
          exitPx: pos.lastPx,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert("✅ " + t("close_pos_success").replace("{coin}", coinName));
        if (onRefreshPositions) onRefreshPositions();
      } else {
        alert("❌ " + t("close_pos_fail").replace("{coin}", coinName) + (data.detail || data.message || t("server_error")));
      }
    } catch (e) {
      alert("❌ " + t("close_pos_conn_fail").replace("{coin}", coinName) + e.message);
    }
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
          {sortedCoins.map((coin) => {
            const rawPosList = (Array.isArray(positions) ? positions : []).filter((p) => p.instId === coin.value);
            const parentList = rawPosList.filter((p) => !p.is_child).sort((a, b) => parseFloat(b.roi || 0) - parseFloat(a.roi || 0));
            const posList = [];
            parentList.forEach((parent) => {
              posList.push(parent);
              const children = rawPosList.filter((p) => p.is_child && p.parent_id === parent.ticket_id);
              posList.push(...children);
            });
            const isChecked = (activePairs || []).includes(coin.value);

            if (posList.length === 0) {
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
                            flexShrink: 0
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
            }

            return posList.map((pos, ticketIndex) => {
              const isLong = pos.posSide === "long";
              const upl = parseFloat(pos.upl || "0");
              const margin = parseFloat(pos.margin || "0");
              const isChild = pos.is_child;

              return (
                <tr
                  key={`${coin.value}-${pos.ticket_id || ticketIndex}`}
                  style={{
                    borderBottom:
                      ticketIndex === posList.length - 1
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
                              flexShrink: 0
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

                        {!isChild && (
                          <span
                            style={{
                              fontSize: "12px",
                              color: pos.is_limit ? "#f59e0b" : (isLong ? "#00c087" : "#ff4d4f"),
                              fontWeight: pos.is_limit ? "bold" : "normal",
                              marginLeft: "4px",
                            }}
                          >
                            {pos.is_limit ? (isLong ? "Limit Long" : "Limit Short") : (isLong ? "Long" : "Short")}
                          </span>
                        )}
                      </div>

                      {pos.is_limit ? (
                        <div style={{ color: "#f59e0b", fontSize: "11px", marginLeft: isChild ? "26px" : "22px" }}>
                          Limit @{pos.avgPx ? parseFloat(pos.avgPx).toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "0.0"} ⏱️ Chờ khớp
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
                    {margin.toFixed(2)} $
                  </td>
                  <td style={{ padding: "4px 6px", textAlign: "center", fontSize: "13px", whiteSpace: "nowrap" }}>
                    {pos.is_limit ? (
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
                              {upl.toFixed(2)} USDT
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
                    <button
                      onClick={() => handleClosePosition(coin, pos)}
                      style={{
                        background: pos.is_limit ? "#d97706" : "#b32626",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        padding: "4px 14px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "bold",
                      }}
                    >
                      {pos.is_limit ? "Hủy" : t("close_btn")}
                    </button>
                  </td>
                </tr>
              );
            });
          })}
        </tbody>
      </table>
    </div>
  );
}
