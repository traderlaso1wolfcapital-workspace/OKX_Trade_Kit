import React, { useState, useEffect } from "react";
import { runCoderCustomScript } from "../utils/indicatorEngine";

export const BUILTIN_INDICATORS = [
  {
    id: "ema200",
    name: "EMA 200 Trendline",
    category: "technicals",
    type: "indicator",
    description: "Đường trung bình động lũy thừa chu kỳ 200 ngày nhận diện xu hướng chính.",
  },
  {
    id: "ema_ribbon",
    name: "Multiple EMA Ribbon (20, 50, 200)",
    category: "technicals",
    type: "indicator",
    description: "Bộ 3 dải EMA đa khung thời gian nhận diện động lượng xu hướng ngắn, trung và dài hạn.",
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands (BB 20, 2)",
    category: "technicals",
    type: "indicator",
    description: "Dải biến động độ lệch chuẩn 2x đo lường biến động và biên dao động giá.",
  },
  {
    id: "supertrend",
    name: "SuperTrend (ATR 10, Multiplier 3)",
    category: "technicals",
    type: "indicator",
    description: "Chỉ báo xu hướng động theo ATR chuyển pha Uptrend (Xanh) / Downtrend (Đỏ).",
  },
  {
    id: "rsi",
    name: "Relative Strength Index (RSI 14)",
    category: "technicals",
    type: "indicator",
    description: "Chỉ số sức mạnh tương đối đo lường quá mua (>70) và quá bán (<30).",
  },
  {
    id: "macd",
    name: "MACD (12, 26, 9)",
    category: "technicals",
    type: "indicator",
    description: "Chỉ báo phân kỳ hội tụ đường trung bình động kèm biểu đồ cột Histogram.",
  },
  {
    id: "smc_ob",
    name: "Smart Money Concepts (SMC Order Blocks)",
    category: "smc",
    type: "strategy",
    description: "Hộp vùng khối lệnh (Order Block) cung cầu tự động tính toán từ máy chủ.",
  },
];

const DEFAULT_CODER_SCRIPTS = [
  {
    id: "custom_golden_cross",
    name: "Golden Cross (EMA 50 / 200)",
    code: `// TLS1 Script Engine - Coder Custom Indicator
// Tự do tính toán EMA, SMA, Highest, Lowest và gọi plot()
const ema50 = ema('close', 50);
const ema200 = ema('close', 200);

plot('EMA 50 (Fast)', ema50, { color: '#00e676', lineWidth: 2 });
plot('EMA 200 (Slow)', ema200, { color: '#ff5252', lineWidth: 2 });
`,
  },
  {
    id: "custom_donchian_channel",
    name: "Donchian Breakout Channel (20)",
    code: `// Coder: Kênh đỉnh/đáy Donchian 20 nến
const high20 = highest('high', 20);
const low20 = lowest('low', 20);

plot('Donchian Upper', high20, { color: '#2962ff', lineWidth: 1.5 });
plot('Donchian Lower', low20, { color: '#ff9800', lineWidth: 1.5 });
`,
  },
];

export default function IndicatorsModal({
  isOpen,
  onClose,
  activeIndicators = [],
  onToggleIndicator,
  customScripts = [],
  onUpdateCustomScripts,
  candles = [],
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("technicals"); // 'favorites' | 'scripts' | 'technicals' | 'smc' | 'community'
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'indicator' | 'strategy'
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("tls1_fav_indicators");
      return saved ? JSON.parse(saved) : ["ema200", "ema_ribbon", "smc_ob"];
    } catch {
      return ["ema200", "ema_ribbon", "smc_ob"];
    }
  });

  // Script editor state dành cho coder
  const [coderScripts, setCoderScripts] = useState(() => {
    try {
      const saved = localStorage.getItem("tls1_coder_scripts");
      return saved ? JSON.parse(saved) : DEFAULT_CODER_SCRIPTS;
    } catch {
      return DEFAULT_CODER_SCRIPTS;
    }
  });
  const [activeScriptId, setActiveScriptId] = useState(() => {
    return (coderScripts[0] && coderScripts[0].id) || "custom_golden_cross";
  });
  const [scriptCode, setScriptCode] = useState(() => {
    return (coderScripts[0] && coderScripts[0].code) || "";
  });
  const [scriptName, setScriptName] = useState(() => {
    return (coderScripts[0] && coderScripts[0].name) || "New Indicator";
  });
  const [scriptStatus, setScriptStatus] = useState(null); // { success: bool, message: string }

  // Đồng bộ custom scripts ra component cha
  useEffect(() => {
    if (onUpdateCustomScripts) {
      onUpdateCustomScripts(coderScripts);
    }
    localStorage.setItem("tls1_coder_scripts", JSON.stringify(coderScripts));
  }, [coderScripts]);

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem("tls1_fav_indicators", JSON.stringify(next));
      return next;
    });
  };

  // Coder Scripting Actions
  const handleSelectScript = (sId) => {
    const found = coderScripts.find((s) => s.id === sId);
    if (found) {
      setActiveScriptId(found.id);
      setScriptCode(found.code);
      setScriptName(found.name);
      setScriptStatus(null);
    }
  };

  const handleCreateNewScript = () => {
    const newId = `custom_script_${Date.now()}`;
    const newScript = {
      id: newId,
      name: `Custom Script #${coderScripts.length + 1}`,
      code: `// TLS1 Coder Script Engine\nconst fast = sma('close', 10);\nplot('SMA 10', fast, { color: '#00bcd4', lineWidth: 2 });\n`,
    };
    const updated = [...coderScripts, newScript];
    setCoderScripts(updated);
    setActiveScriptId(newId);
    setScriptCode(newScript.code);
    setScriptName(newScript.name);
    setScriptStatus({ success: true, message: "Đã tạo bản thảo script mới!" });
  };

  const handleSaveScript = () => {
    const updated = coderScripts.map((s) => {
      if (s.id === activeScriptId) {
        return { ...s, name: scriptName, code: scriptCode };
      }
      return s;
    });
    setCoderScripts(updated);
    setScriptStatus({ success: true, message: "Đã lưu script thành công!" });
  };

  const handleDeleteScript = () => {
    if (coderScripts.length <= 1) {
      alert("Cần giữ lại ít nhất một script mẫu!");
      return;
    }
    const updated = coderScripts.filter((s) => s.id !== activeScriptId);
    setCoderScripts(updated);
    if (updated.length > 0) {
      setActiveScriptId(updated[0].id);
      setScriptCode(updated[0].code);
      setScriptName(updated[0].name);
    }
    setScriptStatus({ success: true, message: "Đã xóa script!" });
  };

  const handleTestAndApplyScript = () => {
    handleSaveScript();
    const testRes = runCoderCustomScript(scriptCode, candles);
    if (!testRes.success) {
      setScriptStatus({ success: false, message: `Lỗi code: ${testRes.error}` });
      return;
    }
    setScriptStatus({
      success: true,
      message: `Biên dịch thành công! Đã tạo ${testRes.plots.length} đồ thị plot.`,
    });
    // Bật/tắt indicator script này trên chart
    if (onToggleIndicator) {
      onToggleIndicator(activeScriptId);
    }
  };

  if (!isOpen) return null;

  // Lọc danh sách indicators
  const filteredList = BUILTIN_INDICATORS.filter((ind) => {
    // 1. Theo category tab
    if (selectedCategory === "favorites" && !favorites.includes(ind.id)) return false;
    if (selectedCategory === "technicals" && ind.category !== "technicals") return false;
    if (selectedCategory === "smc" && ind.category !== "smc") return false;
    if (selectedCategory === "community") return false; // Hiện chưa có community cloud

    // 2. Theo filter chip (All / Indicator / Strategy)
    if (typeFilter !== "all" && ind.type !== typeFilter) return false;

    // 3. Theo search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ind.name.toLowerCase().includes(q);
      const matchDesc = ind.description.toLowerCase().includes(q);
      return matchName || matchDesc;
    }
    return true;
  });

  return (
    <div className="tv-modal-overlay" onClick={onClose}>
      <div className="tv-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="tv-modal-header">
          <div className="tv-modal-title">Indicators, metrics, and strategies</div>
          <button className="tv-modal-close-btn" onClick={onClose} title="Close">
            ✕
          </button>
        </div>

        {/* Search Bar */}
        <div className="tv-modal-search-box">
          <svg className="tv-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            className="tv-search-input"
            placeholder="Search indicators, metrics & scripts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            autoFocus
          />
          {searchQuery && (
            <button className="tv-search-clear" onClick={() => setSearchQuery("")}>
              ✕
            </button>
          )}
        </div>

        {/* Body Split */}
        <div className="tv-modal-body">
          {/* Left Categories Sidebar */}
          <div className="tv-modal-sidebar">
            <button
              className={`tv-sidebar-tab ${selectedCategory === "favorites" ? "active" : ""}`}
              onClick={() => setSelectedCategory("favorites")}
            >
              <span className="tv-tab-icon">★</span>
              <span>Favorites</span>
              <span className="tv-tab-count">{favorites.length}</span>
            </button>

            <button
              className={`tv-sidebar-tab ${selectedCategory === "scripts" ? "active" : ""}`}
              onClick={() => setSelectedCategory("scripts")}
            >
              <span className="tv-tab-icon">{"</>"}</span>
              <span>My scripts (Coder)</span>
              <span className="tv-tab-badge">PRO</span>
            </button>

            <button
              className={`tv-sidebar-tab ${selectedCategory === "technicals" ? "active" : ""}`}
              onClick={() => setSelectedCategory("technicals")}
            >
              <span className="tv-tab-icon">⚡</span>
              <span>Technicals</span>
            </button>

            <button
              className={`tv-sidebar-tab ${selectedCategory === "smc" ? "active" : ""}`}
              onClick={() => setSelectedCategory("smc")}
            >
              <span className="tv-tab-icon">📊</span>
              <span>SMC & Price Action</span>
            </button>

            <button
              className={`tv-sidebar-tab ${selectedCategory === "community" ? "active" : ""}`}
              onClick={() => setSelectedCategory("community")}
            >
              <span className="tv-tab-icon">🌐</span>
              <span>Community Scripts</span>
            </button>
          </div>

          {/* Right Main Content */}
          <div className="tv-modal-content">
            {selectedCategory === "scripts" ? (
              /* TAB DÀNH RIÊNG CHO CODER TỰ VIẾT INDICATOR */
              <div className="coder-editor-panel">
                <div className="coder-editor-top">
                  <div className="coder-script-select-group">
                    <select
                      className="styled-select"
                      style={{ minWidth: "180px", height: "28px", fontSize: "12px" }}
                      value={activeScriptId}
                      onChange={(e) => handleSelectScript(e.target.value)}
                    >
                      {coderScripts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="coder-script-name-input"
                      value={scriptName}
                      onChange={(e) => setScriptName(e.target.value)}
                      placeholder="Script name"
                    />
                  </div>

                  <div className="coder-editor-actions">
                    <button className="tv-action-btn secondary" onClick={handleCreateNewScript} title="Tạo mới script">
                      + New
                    </button>
                    <button className="tv-action-btn secondary" onClick={handleSaveScript} title="Lưu script">
                      Save
                    </button>
                    <button className="tv-action-btn danger" onClick={handleDeleteScript} title="Xóa script này">
                      Delete
                    </button>
                    <button
                      className={`tv-action-btn primary ${activeIndicators.includes(activeScriptId) ? "active" : ""}`}
                      onClick={handleTestAndApplyScript}
                    >
                      {activeIndicators.includes(activeScriptId) ? "✓ Active on Chart" : "▶ Apply to Chart"}
                    </button>
                  </div>
                </div>

                {/* API Quick Reference */}
                <div className="coder-api-hints">
                  <span>API Hỗ Trợ:</span>
                  <code>ema(src, len)</code>
                  <code>sma(src, len)</code>
                  <code>highest(src, len)</code>
                  <code>lowest(src, len)</code>
                  <code>plot(name, data, options)</code>
                </div>

                {/* Editor Textarea */}
                <div className="coder-code-wrapper">
                  <textarea
                    className="coder-code-textarea"
                    value={scriptCode}
                    onChange={(e) => setScriptCode(e.target.value)}
                    placeholder="// Viết mã Javascript tính toán chỉ báo ở đây..."
                    spellCheck="false"
                  />
                </div>

                {/* Status Bar */}
                {scriptStatus && (
                  <div className={`coder-status-bar ${scriptStatus.success ? "success" : "error"}`}>
                    {scriptStatus.success ? "✓ " : "⚠ "}
                    {scriptStatus.message}
                  </div>
                )}
              </div>
            ) : (
              /* TAB HIỂN THỊ DANH SÁCH CHỈ BÁO TIÊU CHUẨN */
              <div className="indicators-list-panel">
                {/* Filter Chips */}
                <div className="tv-filter-chips">
                  <button
                    className={`tv-chip ${typeFilter === "all" ? "active" : ""}`}
                    onClick={() => setTypeFilter("all")}
                  >
                    All
                  </button>
                  <button
                    className={`tv-chip ${typeFilter === "indicator" ? "active" : ""}`}
                    onClick={() => setTypeFilter("indicator")}
                  >
                    Indicators
                  </button>
                  <button
                    className={`tv-chip ${typeFilter === "strategy" ? "active" : ""}`}
                    onClick={() => setTypeFilter("strategy")}
                  >
                    Strategies
                  </button>
                </div>

                {/* List Container */}
                <div className="tv-indicators-scroll">
                  {filteredList.length === 0 ? (
                    <div className="tv-empty-results">
                      Không tìm thấy chỉ báo phù hợp với từ khóa "{searchQuery}"
                    </div>
                  ) : (
                    filteredList.map((ind) => {
                      const isActive = activeIndicators.includes(ind.id);
                      const isFav = favorites.includes(ind.id);

                      return (
                        <div
                          key={ind.id}
                          className={`tv-indicator-row ${isActive ? "active" : ""}`}
                          onClick={() => onToggleIndicator(ind.id)}
                        >
                          <button
                            className={`tv-star-btn ${isFav ? "favorited" : ""}`}
                            onClick={(e) => toggleFavorite(ind.id, e)}
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            ★
                          </button>

                          <div className="tv-indicator-info">
                            <div className="tv-indicator-name">
                              {ind.name}
                              <span className={`tv-type-tag ${ind.type}`}>
                                {ind.type === "strategy" ? "STRATEGY" : "INDICATOR"}
                              </span>
                            </div>
                            <div className="tv-indicator-desc">{ind.description}</div>
                          </div>

                          <button
                            className={`tv-toggle-apply-btn ${isActive ? "active" : ""}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleIndicator(ind.id);
                            }}
                          >
                            {isActive ? "Active" : "+ Add"}
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="tv-modal-footer">
          <div className="tv-footer-stats">
            Đang hiển thị: <span className="highlight-text">{activeIndicators.length}</span> chỉ báo trên biểu đồ
          </div>
          <button className="tv-action-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
