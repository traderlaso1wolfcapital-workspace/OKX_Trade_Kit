import React, { useState, useEffect, useRef, useCallback } from "react";
import { DRAWING_TOOLS } from "./DrawingToolbar";

export default function DrawingCanvasOverlay({
  chart,
  series,
  coin,
  activeTool,
  setActiveTool,
  onDrawingsCountChange,
  clearTrigger
}) {
  const svgRef = useRef(null);
  const [drawings, setDrawings] = useState([]);
  const [currentShape, setCurrentShape] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [, setRenderTick] = useState(0);

  // 1. Tự động tải nét vẽ từ localStorage theo từng coin
  useEffect(() => {
    if (!coin) return;
    try {
      const saved = localStorage.getItem(`tls1_drawings_${coin}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setDrawings(parsed);
          if (onDrawingsCountChange) onDrawingsCountChange(parsed.length);
        }
      } else {
        setDrawings([]);
        if (onDrawingsCountChange) onDrawingsCountChange(0);
      }
    } catch {
      setDrawings([]);
      if (onDrawingsCountChange) onDrawingsCountChange(0);
    }
    setSelectedId(null);
    setCurrentShape(null);
  }, [coin, onDrawingsCountChange]);

  // 2. Lưu nét vẽ vào localStorage khi có thay đổi
  const saveDrawings = useCallback((newDrawings) => {
    setDrawings(newDrawings);
    if (onDrawingsCountChange) onDrawingsCountChange(newDrawings.length);
    if (coin) {
      try {
        localStorage.setItem(`tls1_drawings_${coin}`, JSON.stringify(newDrawings));
      } catch {}
    }
  }, [coin, onDrawingsCountChange]);

  // 3. Xử lý xóa nét vẽ từ ngoài
  useEffect(() => {
    if (clearTrigger > 0) {
      saveDrawings([]);
      setSelectedId(null);
      setCurrentShape(null);
    }
  }, [clearTrigger, saveDrawings]);

  // 4. Lắng nghe biểu đồ zoom / pan để ép vẽ lại bám chặt theo nến và mức giá
  useEffect(() => {
    if (!chart) return;
    const handleRangeChange = () => {
      setRenderTick(t => (t + 1) % 10000);
    };

    try {
      chart.timeScale().subscribeVisibleLogicalRangeChange(handleRangeChange);
      chart.timeScale().subscribeVisibleTimeRangeChange(handleRangeChange);
    } catch {}

    return () => {
      try {
        chart.timeScale().unsubscribeVisibleLogicalRangeChange(handleRangeChange);
        chart.timeScale().unsubscribeVisibleTimeRangeChange(handleRangeChange);
      } catch {}
    };
  }, [chart]);

  // 5. Hàm chuyển đổi tọa độ: Screen (x, y) <-> Chart Data (time, price)
  const getCoordinatesFromEvent = (e) => {
    if (!chart || !series || !svgRef.current) return null;
    const rect = svgRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    try {
      const time = chart.timeScale().coordinateToTime(x);
      const price = series.coordinateToPrice(y);
      return { x, y, time, price };
    } catch {
      return null;
    }
  };

  const toScreenCoord = (point) => {
    if (!chart || !series || !point) return null;
    try {
      const x = chart.timeScale().timeToCoordinate(point.time);
      const y = series.priceToCoordinate(point.price);
      if (x === null || y === null) return null;
      return { x, y };
    } catch {
      return null;
    }
  };

  // 6. Xử lý Mouse Events để vẽ
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Chỉ nhận chuột trái
    if (activeTool === DRAWING_TOOLS.CURSOR) return;

    const coords = getCoordinatesFromEvent(e);
    if (!coords || !coords.time || coords.price === null) return;

    const point = { time: coords.time, price: coords.price };

    if (activeTool === DRAWING_TOOLS.HLINE || activeTool === DRAWING_TOOLS.HRAY) {
      const newHLine = {
        id: (activeTool === DRAWING_TOOLS.HRAY ? "hray_" : "hline_") + Date.now(),
        type: activeTool,
        point,
        price: coords.price,
        color: "#f39c12"
      };
      saveDrawings([...drawings, newHLine]);
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.PRICE_NOTE) {
      const newNote = {
        id: "pricenote_" + Date.now(),
        type: DRAWING_TOOLS.PRICE_NOTE,
        point,
        price: coords.price,
        color: "#2962ff"
      };
      saveDrawings([...drawings, newNote]);
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.MARKER) {
      const newMarker = {
        id: "marker_" + Date.now(),
        type: DRAWING_TOOLS.MARKER,
        point,
        color: "#ff5252"
      };
      saveDrawings([...drawings, newMarker]);
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.CALLOUT) {
      const text = window.prompt("Enter Callout Text:", "Signal / Key Level");
      if (text && text.trim()) {
        const newCallout = {
          id: "callout_" + Date.now(),
          type: DRAWING_TOOLS.CALLOUT,
          point,
          text: text.trim(),
          color: "#ffd600"
        };
        saveDrawings([...drawings, newCallout]);
      }
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.TEXT) {
      const text = window.prompt("Enter Text Note:", "Key Level");
      if (text && text.trim()) {
        const newText = {
          id: "text_" + Date.now(),
          type: DRAWING_TOOLS.TEXT,
          point,
          text: text.trim(),
          color: "#fff"
        };
        saveDrawings([...drawings, newText]);
      }
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.LONG_POS) {
      const slDist = coords.price * 0.01;
      const tpDist = coords.price * 0.02;
      const newPos = {
        id: "pos_" + Date.now(),
        type: DRAWING_TOOLS.LONG_POS,
        entry: point,
        tpPrice: coords.price + tpDist,
        slPrice: coords.price - slDist,
        durationBars: 20
      };
      saveDrawings([...drawings, newPos]);
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.SHORT_POS) {
      const slDist = coords.price * 0.01;
      const tpDist = coords.price * 0.02;
      const newPos = {
        id: "pos_" + Date.now(),
        type: DRAWING_TOOLS.SHORT_POS,
        entry: point,
        tpPrice: coords.price - tpDist,
        slPrice: coords.price + slDist,
        durationBars: 20
      };
      saveDrawings([...drawings, newPos]);
      setActiveTool(DRAWING_TOOLS.CURSOR);
      return;
    }

    if (activeTool === DRAWING_TOOLS.BRUSH) {
      setCurrentShape({
        id: "brush_" + Date.now(),
        type: DRAWING_TOOLS.BRUSH,
        points: [point],
        color: "#e040fb"
      });
      return;
    }

    // Các công cụ 2 điểm kéo (Trendline, Arrow, Rectangle, Circle, Fib, Fib Ext, Measure, Parallel Channel, Elliott Wave, Volume Profile, Path)
    let shapeColor = "#2962ff";
    if (activeTool === DRAWING_TOOLS.RECTANGLE) shapeColor = "#26a69a";
    else if (activeTool === DRAWING_TOOLS.MEASURE) shapeColor = "#00bcd4";
    else if (activeTool === DRAWING_TOOLS.ARROW) shapeColor = "#ff9800";
    else if (activeTool === DRAWING_TOOLS.CIRCLE) shapeColor = "#ab47bc";
    else if (activeTool === DRAWING_TOOLS.FIB_EXT) shapeColor = "#00e676";
    else if (activeTool === DRAWING_TOOLS.PARALLEL_CHANNEL) shapeColor = "#29b6f6";

    setCurrentShape({
      id: `${activeTool}_${Date.now()}`,
      type: activeTool,
      p1: point,
      p2: point,
      color: shapeColor
    });
  };

  const handleMouseMove = (e) => {
    if (!currentShape) return;
    const coords = getCoordinatesFromEvent(e);
    if (!coords || !coords.time || coords.price === null) return;

    const point = { time: coords.time, price: coords.price };

    if (currentShape.type === DRAWING_TOOLS.BRUSH) {
      setCurrentShape(prev => ({
        ...prev,
        points: [...prev.points, point]
      }));
    } else {
      setCurrentShape(prev => ({
        ...prev,
        p2: point
      }));
    }
  };

  const handleMouseUp = () => {
    if (!currentShape) return;

    if (currentShape.type === DRAWING_TOOLS.BRUSH) {
      if (currentShape.points.length > 1) {
        saveDrawings([...drawings, currentShape]);
      }
    } else if (currentShape.p1 && currentShape.p2) {
      saveDrawings([...drawings, currentShape]);
    }

    setCurrentShape(null);
    setActiveTool(DRAWING_TOOLS.CURSOR);
  };

  // 7. Xử lý phím Delete để xóa hình vẽ đang chọn
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        const filtered = drawings.filter(d => d.id !== selectedId);
        saveDrawings(filtered);
        setSelectedId(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedId, drawings, saveDrawings]);

  // 8. Render các phần tử SVG
  const renderShape = (shape, _isPreview = false) => {
    const isSelected = selectedId === shape.id;
    const strokeWidth = isSelected ? 2.5 : 1.5;

    // --- HORIZONTAL LINE ---
    if (shape.type === DRAWING_TOOLS.HLINE) {
      if (!series) return null;
      const y = series.priceToCoordinate(shape.price);
      if (y === null) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line
            x1={0}
            y1={y}
            x2="100%"
            y2={y}
            stroke={shape.color || "#f39c12"}
            strokeWidth={strokeWidth}
            strokeDasharray="4 3"
          />
          {/* Nhãn giá bên góc phải */}
          <rect x="calc(100% - 68px)" y={y - 10} width="66" height="20" rx="3" fill="#1e1e1e" stroke={shape.color || "#f39c12"} strokeWidth="1" />
          <text x="calc(100% - 35px)" y={y + 4} fontSize="11" fill="#fff" textAnchor="middle" fontWeight="bold">
            {shape.price.toFixed(2)}
          </text>
        </g>
      );
    }

    // --- TRENDLINE ---
    if (shape.type === DRAWING_TOOLS.TRENDLINE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line
            x1={s1.x}
            y1={s1.y}
            x2={s2.x}
            y2={s2.y}
            stroke={shape.color || "#2962ff"}
            strokeWidth={strokeWidth}
          />
          <circle cx={s1.x} cy={s1.y} r={3} fill="#fff" stroke={shape.color || "#2962ff"} strokeWidth="1.5" />
          <circle cx={s2.x} cy={s2.y} r={3} fill="#fff" stroke={shape.color || "#2962ff"} strokeWidth="1.5" />
        </g>
      );
    }

    // --- RECTANGLE (VÙNG CẢN / OB) ---
    if (shape.type === DRAWING_TOOLS.RECTANGLE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const x = Math.min(s1.x, s2.x);
      const y = Math.min(s1.y, s2.y);
      const width = Math.abs(s2.x - s1.x);
      const height = Math.abs(s2.y - s1.y);
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <rect
            x={x}
            y={y}
            width={width}
            height={height}
            fill="rgba(38, 166, 154, 0.18)"
            stroke={shape.color || "#26a69a"}
            strokeWidth={strokeWidth}
            rx={2}
          />
          <circle cx={s1.x} cy={s1.y} r={2.5} fill="#fff" />
          <circle cx={s2.x} cy={s2.y} r={2.5} fill="#fff" />
        </g>
      );
    }

    // --- FIBONACCI RETRACEMENT (Chuẩn TradingView như Ảnh 5) ---
    if (shape.type === DRAWING_TOOLS.FIB) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const minX = Math.min(s1.x, s2.x);
      const maxX = Math.max(s1.x, s2.x);
      const width = Math.max(maxX - minX, 120);
      const leftX = minX;
      const rightX = minX + width;

      const pLow = Math.min(shape.p1.price, shape.p2.price);
      const pHigh = Math.max(shape.p1.price, shape.p2.price);
      const pDiff = pHigh - pLow;

      const levels = [
        { ratio: 1.0, color: "#e74c3c", label: "1" },
        { ratio: 0.786, color: "#2ecc71", label: "0.786" },
        { ratio: 0.618, color: "#2ecc71", label: "0.618" },
        { ratio: 0.5, color: "#e74c3c", label: "0.5" },
        { ratio: 0.382, color: "#e74c3c", label: "0.382" },
        { ratio: 0.236, color: "#e67e22", label: "0.236" },
        { ratio: 0, color: "#e74c3c", label: "0" },
        { ratio: -0.32, color: "#e67e22", label: "-0.32" }
      ];

      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          {levels.map((lvl) => {
            const lvlPrice = pLow + (pDiff * lvl.ratio);
            const y = series.priceToCoordinate(lvlPrice);
            if (y === null) return null;
            return (
              <g key={lvl.ratio}>
                <line x1={leftX} y1={y} x2={rightX} y2={y} stroke={lvl.color} strokeWidth={1} />
                <text x={rightX + 6} y={y + 3.5} fontSize="11" fill={lvl.color} fontWeight="500" fontFamily="sans-serif">
                  {lvl.label}
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    // --- VỊ THẾ LONG / SHORT (Chuẩn TradingView như Ảnh 5) ---
    if (shape.type === DRAWING_TOOLS.LONG_POS || shape.type === DRAWING_TOOLS.SHORT_POS) {
      const sEntry = toScreenCoord(shape.entry);
      if (!sEntry || !series) return null;

      const yEntry = sEntry.y;
      const yTp = series.priceToCoordinate(shape.tpPrice);
      const ySl = series.priceToCoordinate(shape.slPrice);
      if (yTp === null || ySl === null) return null;

      const boxW = 110;
      const startX = sEntry.x;
      const endX = startX + boxW;

      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          {/* Target Zone (Teal / Muted Green) */}
          <rect
            x={startX}
            y={Math.min(yEntry, yTp)}
            width={boxW}
            height={Math.abs(yTp - yEntry)}
            fill="rgba(16, 48, 44, 0.82)"
            stroke="rgba(46, 204, 113, 0.35)"
            strokeWidth="1"
          />
          {/* Stoploss Zone (Maroon / Muted Red) */}
          <rect
            x={startX}
            y={Math.min(yEntry, ySl)}
            width={boxW}
            height={Math.abs(ySl - yEntry)}
            fill="rgba(56, 18, 22, 0.82)"
            stroke="rgba(231, 76, 60, 0.35)"
            strokeWidth="1"
          />
          {/* Entry Line */}
          <line x1={startX} y1={yEntry} x2={endX} y2={yEntry} stroke="rgba(210, 215, 225, 0.65)" strokeWidth="1" />
        </g>
      );
    }

    // --- CỌ VẼ TỰ DO (BRUSH) ---
    if (shape.type === DRAWING_TOOLS.BRUSH) {
      const screenPoints = (shape.points || []).map(p => toScreenCoord(p)).filter(Boolean);
      if (screenPoints.length < 2) return null;
      const d = screenPoints.reduce((acc, p, idx) => `${acc} ${idx === 0 ? "M" : "L"} ${p.x} ${p.y}`, "");
      return (
        <path
          key={shape.id}
          d={d}
          fill="none"
          stroke={shape.color || "#e040fb"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          onClick={() => setSelectedId(shape.id)}
          style={{ cursor: "pointer", pointerEvents: "all" }}
        />
      );
    }

    // --- THƯỚC ĐO (MEASURE) ---
    if (shape.type === DRAWING_TOOLS.MEASURE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const priceDiff = shape.p2.price - shape.p1.price;
      const pctDiff = ((priceDiff / shape.p1.price) * 100).toFixed(2);
      const isUp = priceDiff >= 0;
      const color = isUp ? "#26a69a" : "#ef5350";

      const x = Math.min(s1.x, s2.x);
      const y = Math.min(s1.y, s2.y);
      const width = Math.abs(s2.x - s1.x);
      const height = Math.abs(s2.y - s1.y);

      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <rect x={x} y={y} width={width} height={height} fill={isUp ? "rgba(38, 166, 154, 0.12)" : "rgba(239, 83, 80, 0.12)"} stroke={color} strokeWidth="1" strokeDasharray="3 3" />
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={color} strokeWidth="1.5" />
          {/* Tooltip hiển thị % và giá */}
          <rect x={s2.x + 8} y={s2.y - 12} width="95" height="24" rx="3" fill="#1e1e1e" stroke={color} strokeWidth="1" />
          <text x={s2.x + 14} y={s2.y + 4} fontSize="11" fill="#fff" fontWeight="bold">
            {isUp ? "+" : ""}{pctDiff}% ({priceDiff > 0 ? "+" : ""}{priceDiff.toFixed(2)})
          </text>
        </g>
      );
    }

    // --- VĂN BẢN (TEXT) ---
    if (shape.type === DRAWING_TOOLS.TEXT) {
      const s = toScreenCoord(shape.point);
      if (!s) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <rect x={s.x - 4} y={s.y - 14} width={shape.text.length * 8 + 12} height="20" rx="3" fill="rgba(20, 20, 20, 0.85)" stroke={isSelected ? "#2962ff" : "rgba(255,255,255,0.2)"} strokeWidth="1" />
          <text x={s.x + 2} y={s.y} fontSize="12" fill={shape.color || "#fff"} fontWeight="500">
            {shape.text}
          </text>
        </g>
      );
    }

    // --- HORIZONTAL RAY ---
    if (shape.type === DRAWING_TOOLS.HRAY) {
      const s = toScreenCoord(shape.point);
      if (!s) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line x1={s.x} y1={s.y} x2="100%" y2={s.y} stroke={shape.color || "#f39c12"} strokeWidth={strokeWidth} strokeDasharray="5 3" />
          <circle cx={s.x} cy={s.y} r={3} fill="#fff" stroke={shape.color || "#f39c12"} strokeWidth="1.5" />
          <rect x="calc(100% - 68px)" y={s.y - 10} width="66" height="20" rx="3" fill="#1e1e1e" stroke={shape.color || "#f39c12"} strokeWidth="1" />
          <text x="calc(100% - 35px)" y={s.y + 4} fontSize="11" fill="#fff" textAnchor="middle" fontWeight="bold">
            {shape.price.toFixed(2)}
          </text>
        </g>
      );
    }

    // --- ARROW ---
    if (shape.type === DRAWING_TOOLS.ARROW) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const angle = Math.atan2(s2.y - s1.y, s2.x - s1.x);
      const arrowLen = 10;
      const a1x = s2.x - arrowLen * Math.cos(angle - Math.PI / 6);
      const a1y = s2.y - arrowLen * Math.sin(angle - Math.PI / 6);
      const a2x = s2.x - arrowLen * Math.cos(angle + Math.PI / 6);
      const a2y = s2.y - arrowLen * Math.sin(angle + Math.PI / 6);
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={shape.color || "#ff9800"} strokeWidth={strokeWidth} />
          <polygon points={`${s2.x},${s2.y} ${a1x},${a1y} ${a2x},${a2y}`} fill={shape.color || "#ff9800"} />
          <circle cx={s1.x} cy={s1.y} r={3} fill="#fff" stroke={shape.color || "#ff9800"} strokeWidth="1.5" />
        </g>
      );
    }

    // --- CIRCLE ---
    if (shape.type === DRAWING_TOOLS.CIRCLE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const r = Math.hypot(s2.x - s1.x, s2.y - s1.y);
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <circle cx={s1.x} cy={s1.y} r={r} fill="rgba(171, 71, 188, 0.12)" stroke={shape.color || "#ab47bc"} strokeWidth={strokeWidth} />
          <circle cx={s1.x} cy={s1.y} r={2.5} fill="#fff" />
          <circle cx={s2.x} cy={s2.y} r={2.5} fill="#fff" />
        </g>
      );
    }

    // --- TREND-BASED FIB EXTENSION (Chuẩn TradingView như Ảnh 5) ---
    if (shape.type === DRAWING_TOOLS.FIB_EXT) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const dx = Math.max(Math.abs(s2.x - s1.x), 50);
      const s3 = { x: s2.x + dx * 0.45, y: s2.y + Math.abs(s2.y - s1.y) * 0.85 };
      const rightX = s3.x + 75;

      const pLow = Math.min(shape.p1.price, shape.p2.price);
      const pHigh = Math.max(shape.p1.price, shape.p2.price);
      const pDiff = pHigh - pLow;

      const extLevels = [
        { ratio: 1.618, color: "#2ecc71", label: "1.618" },
        { ratio: 1.272, color: "#2ecc71", label: "1.272" },
        { ratio: 1.0, color: "#e74c3c", label: "1" },
        { ratio: 0.786, color: "#e74c3c", label: "0.786" },
        { ratio: 0.618, color: "#e74c3c", label: "0.618" },
        { ratio: 0, color: "#e74c3c", label: "0" },
      ];

      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          {/* Red dashed zigzag connecting lines (s1 -> s2 -> s3) */}
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke="#e74c3c" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={s2.x} y1={s2.y} x2={s3.x} y2={s3.y} stroke="#e74c3c" strokeWidth={1} strokeDasharray="4 4" />

          {/* Extension levels extending to right */}
          {extLevels.map((lvl) => {
            const lvlPrice = pLow + (pDiff * lvl.ratio);
            const y = series.priceToCoordinate(lvlPrice);
            if (y === null) return null;
            return (
              <g key={lvl.ratio}>
                <line x1={s2.x} y1={y} x2={rightX} y2={y} stroke={lvl.color} strokeWidth={1} />
                <text x={s2.x - 6} y={y + 3.5} fontSize="10.5" fill={lvl.color} textAnchor="end" fontWeight="500" fontFamily="sans-serif">
                  {lvl.label} ({lvlPrice.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })})
                </text>
              </g>
            );
          })}
        </g>
      );
    }

    // --- PARALLEL CHANNEL ---
    if (shape.type === DRAWING_TOOLS.PARALLEL_CHANNEL) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const dy = 35;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line x1={s1.x} y1={s1.y - dy} x2={s2.x} y2={s2.y - dy} stroke={shape.color || "#29b6f6"} strokeWidth={strokeWidth} />
          <line x1={s1.x} y1={s1.y} x2={s2.x} y2={s2.y} stroke={shape.color || "#29b6f6"} strokeWidth={1} strokeDasharray="3 3" />
          <line x1={s1.x} y1={s1.y + dy} x2={s2.x} y2={s2.y + dy} stroke={shape.color || "#29b6f6"} strokeWidth={strokeWidth} />
          <polygon
            points={`${s1.x},${s1.y - dy} ${s2.x},${s2.y - dy} ${s2.x},${s2.y + dy} ${s1.x},${s1.y + dy}`}
            fill="rgba(41, 182, 246, 0.08)"
          />
        </g>
      );
    }

    // --- ELLIOTT WAVE (1-5) ---
    if (shape.type === DRAWING_TOOLS.ELLIOTT_WAVE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const dx = (s2.x - s1.x) / 4;
      const dy = (s2.y - s1.y);
      const p0 = { x: s1.x, y: s1.y };
      const p1 = { x: s1.x + dx, y: s1.y + dy * 0.45 };
      const p2 = { x: s1.x + dx * 2, y: s1.y + dy * 0.2 };
      const p3 = { x: s1.x + dx * 3, y: s1.y + dy * 0.85 };
      const p4 = { x: s2.x, y: s2.y };
      const pts = [p0, p1, p2, p3, p4];
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <polyline points={`${p0.x},${p0.y} ${p1.x},${p1.y} ${p2.x},${p2.y} ${p3.x},${p3.y} ${p4.x},${p4.y}`} fill="none" stroke="#e040fb" strokeWidth={strokeWidth} />
          {pts.map((pt, i) => (
            <g key={i}>
              <circle cx={pt.x} cy={pt.y} r={3} fill="#fff" stroke="#e040fb" strokeWidth="1.5" />
              <text x={pt.x} y={pt.y - 6} fontSize="10" fill="#e040fb" textAnchor="middle" fontWeight="bold">({i + 1})</text>
            </g>
          ))}
        </g>
      );
    }

    // --- PATH ---
    if (shape.type === DRAWING_TOOLS.PATH) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const midX = (s1.x + s2.x) / 2;
      const midY = (s1.y + s2.y) / 2 + 20;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <polyline points={`${s1.x},${s1.y} ${midX},${midY} ${s2.x},${s2.y}`} fill="none" stroke="#26a69a" strokeWidth={strokeWidth} />
          <circle cx={s1.x} cy={s1.y} r={3} fill="#fff" stroke="#26a69a" strokeWidth="1.5" />
          <circle cx={midX} cy={midY} r={3} fill="#fff" stroke="#26a69a" strokeWidth="1.5" />
          <circle cx={s2.x} cy={s2.y} r={3} fill="#fff" stroke="#26a69a" strokeWidth="1.5" />
        </g>
      );
    }

    // --- PRICE NOTE ---
    if (shape.type === DRAWING_TOOLS.PRICE_NOTE) {
      const s = toScreenCoord(shape.point);
      if (!s) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line x1={s.x} y1={s.y} x2={s.x + 16} y2={s.y - 14} stroke="#2962ff" strokeWidth="1.5" />
          <rect x={s.x + 16} y={s.y - 24} width="72" height="20" rx="3" fill="#1e222d" stroke="#2962ff" strokeWidth="1" />
          <text x={s.x + 52} y={s.y - 10} fontSize="10.5" fill="#fff" textAnchor="middle" fontWeight="bold">
            ${shape.price.toFixed(2)}
          </text>
        </g>
      );
    }

    // --- CALLOUT ---
    if (shape.type === DRAWING_TOOLS.CALLOUT) {
      const s = toScreenCoord(shape.point);
      if (!s) return null;
      const w = Math.max(shape.text.length * 8 + 16, 60);
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <line x1={s.x} y1={s.y} x2={s.x + 14} y2={s.y - 16} stroke="#ffd600" strokeWidth="1.5" />
          <rect x={s.x + 14} y={s.y - 32} width={w} height="24" rx="4" fill="#1e222d" stroke="#ffd600" strokeWidth="1" />
          <text x={s.x + 22} y={s.y - 16} fontSize="11" fill="#fff" fontWeight="500">
            {shape.text}
          </text>
        </g>
      );
    }

    // --- MARKER ---
    if (shape.type === DRAWING_TOOLS.MARKER) {
      const s = toScreenCoord(shape.point);
      if (!s) return null;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <circle cx={s.x} cy={s.y} r={5} fill="#ff5252" stroke="#fff" strokeWidth="1.5" />
          <circle cx={s.x} cy={s.y} r={1.5} fill="#fff" />
        </g>
      );
    }

    // --- VOLUME PROFILE ---
    if (shape.type === DRAWING_TOOLS.VOLUME_PROFILE) {
      const s1 = toScreenCoord(shape.p1);
      const s2 = toScreenCoord(shape.p2);
      if (!s1 || !s2) return null;
      const x = Math.min(s1.x, s2.x);
      const y = Math.min(s1.y, s2.y);
      const w = Math.abs(s2.x - s1.x);
      const h = Math.abs(s2.y - s1.y);
      const bars = 8;
      const barH = h / bars;
      return (
        <g key={shape.id} onClick={() => setSelectedId(shape.id)} style={{ cursor: "pointer", pointerEvents: "all" }}>
          <rect x={x} y={y} width={w} height={h} fill="rgba(41, 98, 255, 0.05)" stroke="#2962ff" strokeWidth="1" strokeDasharray="3 3" />
          {Array.from({ length: bars }).map((_, i) => {
            const bw = (w * 0.2) + ((Math.sin(i * 1.2) + 1) * 0.35 * w);
            return (
              <rect
                key={i}
                x={x}
                y={y + i * barH + 1}
                width={bw}
                height={Math.max(barH - 2, 2)}
                fill={i % 2 === 0 ? "rgba(38, 166, 154, 0.45)" : "rgba(239, 83, 80, 0.45)"}
              />
            );
          })}
        </g>
      );
    }

    return null;
  };

  const isInteracting = activeTool !== DRAWING_TOOLS.CURSOR || Boolean(currentShape);

  return (
    <svg
      ref={svgRef}
      className="chart-drawing-overlay-svg"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        zIndex: 5,
        pointerEvents: isInteracting ? "all" : "none",
        cursor: isInteracting ? "crosshair" : "default"
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 1. Các nét vẽ đã hoàn tất */}
      {drawings.map(shape => renderShape(shape))}

      {/* 2. Nét vẽ đang kéo (Preview) */}
      {currentShape && renderShape(currentShape, true)}
    </svg>
  );
}
