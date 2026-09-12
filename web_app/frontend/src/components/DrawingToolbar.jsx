import React, { useState } from "react";

export const DRAWING_TOOLS = {
  CURSOR: "cursor",
  BRUSH: "brush",
  FIB: "fib",
  FIB_EXT: "fib_ext",
  LONG_POS: "long_pos",
  SHORT_POS: "short_pos",
  RECTANGLE: "rectangle",
  PATH: "path",
  TRENDLINE: "trendline",
  MEASURE: "measure",
};

export default function DrawingToolbar({
  activeTool,
  setActiveTool,
  onClearDrawings,
  hasDrawings = false
}) {
  const [tooltipState, setTooltipState] = useState(null);

  const handleMouseEnter = (e, text) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipState({
      text,
      top: rect.top + rect.height / 2,
      left: rect.right + 7,
    });
  };

  const handleMouseLeave = () => {
    setTooltipState(null);
  };

  const tools = [
    {
      id: DRAWING_TOOLS.CURSOR,
      name: "Cross",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
          <line x1="12" y1="3" x2="12" y2="10" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" />
          <line x1="12" y1="14" x2="12" y2="21" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" />
          <line x1="3" y1="12" x2="10" y2="12" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" />
          <line x1="14" y1="12" x2="21" y2="12" stroke="#2962ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.BRUSH,
      name: "Brush",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
          <path d="m15 5 4 4"/>
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.FIB,
      name: "Fib retracement",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="5" x2="20" y2="5" />
          <line x1="4" y1="10" x2="17.5" y2="10" />
          <circle cx="19" cy="10" r="1.5" />
          <line x1="4" y1="15" x2="20" y2="15" />
          <circle cx="5" cy="20" r="1.5" />
          <line x1="6.5" y1="20" x2="20" y2="20" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.FIB_EXT,
      name: "Trend-based fib extension",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="4" cy="10" r="1.5" />
          <circle cx="6" cy="5.5" r="1.5" />
          <circle cx="17" cy="4" r="1.5" />
          <line x1="4.5" y1="8.5" x2="5.5" y2="7" />
          <line x1="7.5" y1="5.3" x2="15.5" y2="4.2" />
          <line x1="4" y1="13.5" x2="20" y2="13.5" />
          <line x1="4" y1="17.5" x2="20" y2="17.5" />
          <line x1="4" y1="21.5" x2="20" y2="21.5" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.LONG_POS,
      name: "Long position",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="4.5" cy="6" r="1.5" />
          <line x1="6" y1="6" x2="20" y2="6" />
          <text x="12.5" y="14" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">L</text>
          <circle cx="4.5" cy="19" r="1.5" />
          <line x1="6" y1="19" x2="20" y2="19" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.SHORT_POS,
      name: "Short position",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="4.5" cy="6" r="1.5" />
          <line x1="6" y1="6" x2="20" y2="6" />
          <text x="12.5" y="14" fontSize="8" fill="currentColor" textAnchor="middle" fontWeight="bold" fontFamily="sans-serif">S</text>
          <circle cx="4.5" cy="19" r="1.5" />
          <line x1="6" y1="19" x2="20" y2="19" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.RECTANGLE,
      name: "Rectangle",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="4" y="5" width="16" height="14" rx="1" />
          <circle cx="4" cy="5" r="1.5" fill="currentColor" />
          <circle cx="20" cy="5" r="1.5" fill="currentColor" />
          <circle cx="20" cy="19" r="1.5" fill="currentColor" />
          <circle cx="4" cy="19" r="1.5" fill="currentColor" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.PATH,
      name: "Path",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="4" cy="18" r="1.5" />
          <circle cx="12" cy="13" r="1.5" />
          <line x1="5.5" y1="17" x2="10.5" y2="14" />
          <line x1="13.5" y1="12" x2="19" y2="6" />
          <polyline points="15 6 19 6 19 10" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.TRENDLINE,
      name: "Trend line",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="5" cy="19" r="1.8" />
          <circle cx="19" cy="5" r="1.8" />
          <line x1="6.5" y1="17.5" x2="17.5" y2="6.5" />
        </svg>
      )
    },
    {
      id: DRAWING_TOOLS.MEASURE,
      name: "Price range",
      icon: (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="5" x2="16.5" y2="5" />
          <circle cx="18" cy="5" r="1.5" />
          <circle cx="6" cy="19" r="1.5" />
          <line x1="7.5" y1="19" x2="20" y2="19" />
          <line x1="12" y1="19" x2="12" y2="6.5" />
          <polyline points="9 9.5 12 6 15 9.5" />
        </svg>
      )
    },
  ];

  return (
    <div className="chart-drawing-toolbar">
      <div className="drawing-toolbar-handle" title="TradingView Tools">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="#666">
          <circle cx="2.5" cy="2.5" r="1.2" />
          <circle cx="7.5" cy="2.5" r="1.2" />
          <circle cx="2.5" cy="7" r="1.2" />
          <circle cx="7.5" cy="7" r="1.2" />
          <circle cx="2.5" cy="11.5" r="1.2" />
          <circle cx="7.5" cy="11.5" r="1.2" />
        </svg>
      </div>

      <div className="drawing-toolbar-tools">
        {tools.map((t) => {
          const isActive = activeTool === t.id;
          return (
            <button
              key={t.id}
              className={`drawing-tool-btn ${isActive ? "active" : ""}`}
              onClick={() => setActiveTool(t.id)}
              onMouseEnter={(e) => handleMouseEnter(e, t.name)}
              onMouseLeave={handleMouseLeave}
            >
              {t.icon}
            </button>
          );
        })}
      </div>

      <div className="drawing-toolbar-divider" />

      <div className="drawing-toolbar-actions">
        <button
          className={`drawing-tool-btn danger ${hasDrawings ? "enabled" : "disabled"}`}
          onClick={onClearDrawings}
          onMouseEnter={(e) => handleMouseEnter(e, hasDrawings ? "Delete all drawings" : "No drawings to delete")}
          onMouseLeave={handleMouseLeave}
          disabled={!hasDrawings}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* Floating TradingView-style Tooltip Popup */}
      {tooltipState && (
        <div
          className="drawing-floating-tooltip"
          style={{
            position: "fixed",
            top: tooltipState.top,
            left: tooltipState.left,
            transform: "translateY(-50%)",
            zIndex: 999999,
          }}
        >
          {tooltipState.text}
        </div>
      )}
    </div>
  );
}
