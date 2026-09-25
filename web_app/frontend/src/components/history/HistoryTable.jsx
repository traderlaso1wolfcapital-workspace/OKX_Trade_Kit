import React from "react";

export default function HistoryTable({ closedPositions = [] }) {
  return (
    <div
      className="positions-table-wrapper"
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
        overscrollBehavior: "contain",
      }}
    >
      <table className="positions-table" style={{ width: "100%", borderCollapse: "collapse", textAlign: "right" }}>
        <thead>
          <tr style={{ background: "#252526", borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Thời gian đóng</th>
            <th style={{ textAlign: "left", padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Cặp giao dịch (TF)</th>
            <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Giá vào</th>
            <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Giá đóng</th>
            <th style={{ padding: "6px 10px", fontSize: "14px", whiteSpace: "nowrap" }}>Ký quỹ</th>
            <th style={{ padding: "6px 15px", textAlign: "right", fontSize: "14px", whiteSpace: "nowrap", minWidth: "120px" }}>PNL (USDT)</th>
          </tr>
        </thead>
        <tbody>
          {closedPositions.map((pos, idx) => (
            <tr key={pos.ticket_id || idx} style={{ borderBottom: "1px solid #333" }}>
              <td style={{ textAlign: "left", padding: "6px 10px", fontSize: "13px", color: "#aaa" }}>
                {pos.closeTime ? new Date(pos.closeTime).toLocaleString("vi-VN") : "--"}
              </td>
              <td
                style={{
                  textAlign: "left",
                  padding: "6px 10px",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: pos.posSide === "long" ? "#4caf50" : "#ff5252",
                }}
              >
                {pos.instId ? pos.instId.replace("-SWAP", "") : ""} ({pos.tf || "1H"})
              </td>
              <td style={{ padding: "6px 10px", fontSize: "13px" }}>
                {pos.openPx ? parseFloat(pos.openPx).toFixed(2) : "--"}
              </td>
              <td style={{ padding: "6px 10px", fontSize: "13px" }}>
                {pos.closePx ? parseFloat(pos.closePx).toFixed(2) : "--"}
              </td>
              <td style={{ padding: "6px 10px", fontSize: "13px" }}>
                {pos.margin ? `${parseFloat(pos.margin).toFixed(2)} $` : "--"}
              </td>
              <td
                style={{
                  padding: "6px 15px",
                  textAlign: "right",
                  fontSize: "14px",
                  fontWeight: "bold",
                  color: parseFloat(pos.pnl || 0) >= 0 ? "#4caf50" : "#ff5252",
                }}
              >
                {parseFloat(pos.pnl || 0) >= 0 ? "+" : ""}
                {parseFloat(pos.pnl || 0).toFixed(4)} $
              </td>
            </tr>
          ))}
          {closedPositions.length === 0 && (
            <tr>
              <td colSpan="6" style={{ textAlign: "center", padding: "20px", color: "#888" }}>
                Chưa có dữ liệu lịch sử đóng lệnh.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
