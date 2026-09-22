import React, { useState, useRef, useEffect } from "react";

console.log("AppHeader loaded! Force HMR");

// Pattern 1: Bot EMA200 - Đường sóng trung bình động uốn lượn qua nến
const PatternEMA200 = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <line x1="5.5" y1="4" x2="5.5" y2="16" stroke="#26a69a" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <rect x="4" y="7" width="3" height="6" rx="0.5" fill="#26a69a" opacity="0.85" />
    <line x1="14.5" y1="4" x2="14.5" y2="16" stroke="#ef5350" strokeWidth="1.2" strokeLinecap="round" opacity="0.7" />
    <rect x="13" y="6" width="3" height="6" rx="0.5" fill="#ef5350" opacity="0.85" />
    <path d="M1.5 15 C 6 15, 7.5 7.5, 12.5 7.5 C 15.5 7.5, 16.5 4.5, 18.5 4.5" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

// Pattern 2: Bot SMC - Vùng khối hộp Order Block nét đứt & phản ứng hồi quy
const PatternSMC = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <rect x="2.5" y="10" width="15" height="7.5" rx="1.5" fill="rgba(41, 98, 255, 0.2)" stroke="#3b82f6" strokeWidth="1.3" strokeDasharray="2.5 1.5" />
    <path d="M2.5 6 L 7.5 4 L 11 10 L 16.5 4" stroke="#60a5fa" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="11" cy="10" r="1.8" fill="#f59e0b" />
  </svg>
);

// Pattern 3: Bot Liquidation - Quét râu thanh khoản xuyên cản & đảo chiều
const PatternLiquidation = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" style={{ flexShrink: 0 }}>
    <line x1="1.5" y1="8.5" x2="18.5" y2="8.5" stroke="#94a3b8" strokeWidth="1.2" strokeDasharray="2 1.5" opacity="0.6" />
    <line x1="10" y1="2" x2="10" y2="18" stroke="#f43f5e" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="8" y="11" width="4" height="5" rx="0.6" fill="#f43f5e" />
    <path d="M14 4.5 L 10 1.5 L 6 4.5" stroke="#fb7185" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BOT_OPTIONS = [
  {
    id: "sub1",
    name: "Bot EMA200",
    desc: "Lưới Đa Khung & Trailing Limit",
    pattern: <PatternEMA200 />,
  },
  {
    id: "sub2",
    name: "Bot SMC",
    desc: "Order Block & Mitigation Box",
    pattern: <PatternSMC />,
  },
  {
    id: "sub3",
    name: "Bot Liquidation",
    desc: "Quét Thanh Khoản & Stop Hunt",
    pattern: <PatternLiquidation />,
  },
];

export default function AppHeader({
  activeBotTab,
  onSelectBotTab,
  slotCount = 10,
  maxSlots = 100,
  themeMode = "default",
  onToggleTheme,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const currentBot = BOT_OPTIONS.find((b) => b.id === activeBotTab) || BOT_OPTIONS[0];

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, []);

  return (
    <header className="bot-tabs-bar">
      <div className="bot-tabs-group" ref={dropdownRef} style={{ position: "relative" }}>
        {/* Command Capsule Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            padding: "5px 12px 5px 10px",
            background: "linear-gradient(180deg, #242630 0%, #15161c 100%)",
            border: isOpen ? "1px solid #f59e0b" : "1px solid #3e4451",
            borderRadius: "6px",
            cursor: "pointer",
            boxShadow: isOpen 
              ? "0 0 10px rgba(245, 158, 11, 0.25), inset 0 1px 0 rgba(255,255,255,0.08)"
              : "0 2px 6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.06)",
            transition: "all 0.18s ease",
            outline: "none",
            userSelect: "none"
          }}
        >
          {/* Pattern đại diện chiến lược */}
          <span style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {currentBot.pattern}
          </span>

          {/* Tên Bot căn giữa chuẩn */}
          <span
            style={{
              fontSize: "13.5px",
              fontWeight: 800,
              color: "#ffffff",
              letterSpacing: "0.2px",
              textAlign: "center"
            }}
          >
            {currentBot.name}
          </span>

          {/* Pure SVG Dropdown Arrow */}
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke={isOpen ? "#f59e0b" : "#8e9297"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              marginLeft: "2px",
              transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform 0.18s ease"
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Custom Popover Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 5px)",
              left: 0,
              minWidth: "230px",
              backgroundColor: "#181920",
              border: "1px solid #3a3c48",
              borderRadius: "6px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.65), 0 2px 6px rgba(0,0,0,0.4)",
              zIndex: 1000,
              padding: "4px",
              display: "flex",
              flexDirection: "column",
              gap: "2px"
            }}
          >
            {BOT_OPTIONS.map((bot) => {
              const isActive = bot.id === activeBotTab;
              return (
                <div
                  key={bot.id}
                  onClick={() => {
                    onSelectBotTab(bot.id);
                    setIsOpen(false);
                  }}
                  style={{
                    padding: "8px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    backgroundColor: isActive ? "rgba(245, 158, 11, 0.12)" : "transparent",
                    borderLeft: isActive ? "3px solid #f59e0b" : "3px solid transparent",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "background-color 0.15s ease"
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.05)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                  }}
                >
                  {/* Pattern trong dropdown */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {bot.pattern}
                  </div>

                  {/* Tên và tóm tắt bot căn giữa */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, textAlign: "center", gap: "2px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: isActive ? 800 : 600,
                        color: isActive ? "#ffffff" : "#d1d4dc"
                      }}
                    >
                      {bot.name}
                    </span>
                    <span style={{ fontSize: "9.5px", color: "#8a8f9d" }}>
                      {bot.desc}
                    </span>
                  </div>

                  {/* Dấu checkmark nếu active */}
                  <div style={{ width: "14px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {isActive && (
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Slot indicator & Nút Join Cộng đồng & Nút Chuyển Theme */}
      <div className="header-right-tools" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        {/* Nút chuyển đổi nhanh Bản Gốc / Kính Mờ #181920 */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            title={themeMode === "glass_pro" ? "Đang xem: Kính mờ #181920 (Bấm để quay về Bản Gốc)" : "Đang xem: Bản Gốc (Bấm để xem Kính mờ #181920)"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              padding: "3px 8px",
              borderRadius: "4px",
              backgroundColor: themeMode === "glass_pro" ? "#1d1f2c" : "#222",
              border: themeMode === "glass_pro" ? "1px solid #33374b" : "1px solid #444",
              color: themeMode === "glass_pro" ? "#ffb74d" : "#888888",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: 600,
              transition: "all 0.18s ease"
            }}
          >
            {themeMode === "glass_pro" ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffb74d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            ) : (
              <span style={{ width: "5px", height: "5px", borderRadius: "50%", backgroundColor: "#666666" }} />
            )}
            <span>{themeMode === "glass_pro" ? "Kính Mờ" : "Bản Gốc"}</span>
          </button>
        )}

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
