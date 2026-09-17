import React from "react";

console.log("AppHeader loaded! Force HMR");
export default function AppHeader({
  activeBotTab,
  onSelectBotTab,
  slotCount = 10,
  maxSlots = 100,
}) {
  return (
    <header className="bot-tabs-bar">
      <div className="bot-tabs-group">
        {[
          ["sub1", "Bot EMA200"],
          ["sub2", "Bot SMC"],
          ["sub3", "Bot Liquidation"],
        ].map(([sub, label]) => (
          <button
            key={sub}
            className={`bot-tab ${activeBotTab === sub ? "active" : ""}`}
            onClick={() => onSelectBotTab(sub)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Slot indicator & Nút Join Cộng đồng */}
      <div className="header-right-tools">
        <a
          href="https://discord.gg/8NXaSCvZ6u"
          target="_blank"
          rel="noopener noreferrer"
          className="btn-join-community"
          title="Tham gia cộng đồng Discord Trader TLS1"
        >
          <svg width="16" height="16" viewBox="0 0 127.14 96.36" fill="currentColor">
            <path d="M107.7 8.07A105.15 105.15 0 0 0 81.47 0a72.06 72.06 0 0 0-3.36 6.83A97.68 97.68 0 0 0 49 6.83 72.37 72.37 0 0 0 45.64 0a105.89 105.89 0 0 0-26.25 8.09C2.79 32.65-1.73 56.6 2.05 80A105.73 105.73 0 0 0 34.6 96.36a77.7 77.7 0 0 0 7-11.41 68.42 68.42 0 0 1-10.85-5.18c.91-.66 1.8-1.34 2.66-2a75.57 75.57 0 0 0 60.32 0c.87.66 1.75 1.34 2.66 2a68.42 68.42 0 0 1-10.87 5.19 77 77 0 0 0 7 11.41A105.49 105.49 0 0 0 125.09 80c4.15-26.15-.98-49.49-17.39-71.93ZM42.56 65.3c-5.36 0-9.82-4.9-9.82-10.88s4.36-10.88 9.82-10.88 9.9 4.9 9.82 10.88c0 6-4.46 10.88-9.82 10.88Zm41.92 0c-5.36 0-9.82-4.9-9.82-10.88s4.36-10.88 9.82-10.88 9.9 4.9 9.82 10.88c0 6-4.46 10.88-9.82 10.88Z" />
          </svg>
        </a>
        <div className="slot-indicator-wrap">
          <span style={{ color: "#ccc", fontSize: "11px", fontWeight: "bold" }}>Slot:</span>
          <span
            style={{
              color: slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50",
              fontSize: "11px",
              fontWeight: "bold",
            }}
          >
            {slotCount}/{maxSlots}
          </span>
          <span style={{ display: "inline-flex", gap: "2px", alignItems: "center", marginLeft: "2px" }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const threshold = (i + 1) * 20;
              const active = slotCount >= threshold - 19;
              const barColor = slotCount >= 100 ? "#ff3333" : slotCount >= 80 ? "#ffaa00" : "#4caf50";
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: "3px",
                    height: "10px",
                    backgroundColor: active ? barColor : "#3a3a3a",
                    borderRadius: "1px",
                  }}
                />
              );
            })}
          </span>
        </div>
      </div>
    </header>
  );
}
