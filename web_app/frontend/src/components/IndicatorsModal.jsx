import React, { useState, useEffect } from "react";
import { runCoderCustomScript } from "../utils/indicatorEngine";

// Danh mục chỉ báo hệ thống mặc định (SYSTEM)
export const BUILTIN_INDICATORS = [
  {
    id: "liquid_v5",
    name: "TLS1 Charts_Liquid v5 (Order Blocks & FVG)",
    category: "system",
    type: "strategy",
    author: "TLS1 Official",
    boosts: "210 K",
    isEditorPick: true,
    description: "Hệ thống phát hiện dòng tiền thông minh SMC: Quét khoảng trống giá (Fair Value Gaps) và Khối lệnh tổ chức (Order Blocks) chuẩn TLS1.",
  },
  {
    id: "smc_ob",
    name: "SMC Order Block (Live từ Bot OKX)",
    category: "system",
    type: "strategy",
    author: "TLS1 Bot Engine",
    boosts: "250 K",
    isEditorPick: true,
    description: "Các khối Order Block (vùng cung cầu tổ chức) do Bot OKX nhận diện tự động và cập nhật trực tiếp theo thời gian thực.",
  },
  {
    id: "rsi",
    name: "Relative Strength Index (RSI 14)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "185 K",
    isEditorPick: true,
    description: "Chỉ số sức mạnh tương đối đo lường vùng quá mua (>70) và quá bán (<30) chuẩn TradingView.",
  },
  {
    id: "macd",
    name: "MACD (12, 26, 9)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "152 K",
    isEditorPick: true,
    description: "Chỉ báo phân kỳ hội tụ đường trung bình động kèm biểu đồ cột Histogram chuẩn TradingView.",
  },
  {
    id: "volume",
    name: "Volume (Khối lượng 20)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "165 K",
    isEditorPick: true,
    description: "Chỉ báo khối lượng giao dịch kết hợp đường trung bình khối lượng 20 chu kỳ.",
  },
  {
    id: "bollinger_bands",
    name: "Bollinger Bands (BB 20, 2)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "135 K",
    isEditorPick: false,
    description: "Dải biến động độ lệch chuẩn 2x (Upper, Basis MA20, Lower) chuẩn TradingView.",
  },
  {
    id: "ema_ribbon",
    name: "EMA Ribbon (20, 50, 200)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "98 K",
    isEditorPick: false,
    description: "Bộ 3 dải EMA đa khung thời gian nhận diện động lượng xu hướng ngắn, trung và dài hạn.",
  },
  {
    id: "supertrend",
    name: "SuperTrend (ATR 10, Multiplier 3)",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "115 K",
    isEditorPick: false,
    description: "Chỉ báo xu hướng động theo ATR chuyển pha Uptrend (Xanh) / Downtrend (Đỏ) chuẩn TradingView.",
  },
  {
    id: "ema200",
    name: "EMA 200 Trendline",
    category: "system",
    type: "indicator",
    author: "System",
    boosts: "105 K",
    isEditorPick: false,
    description: "Đường trung bình động lũy thừa chu kỳ 200 ngày nhận diện xu hướng chính.",
  },
];

// Danh mục chỉ báo cộng đồng (Để trống theo chỉ đạo CEO - người dùng đóng góp sẽ hiện ở đây)
export const COMMUNITY_SCRIPTS = [];

// Danh mục chỉ báo cá nhân mặc định (Để trống theo chỉ đạo CEO)
const DEFAULT_CODER_SCRIPTS = [];


export default function IndicatorsModal({
  isOpen,
  onClose,
  activeIndicators = [],
  onToggleIndicator,
  _customScripts = [],
  onUpdateCustomScripts,
  candles = [],
  initialCategory = "system",
}) {
  const [searchQuery, setSearchQuery] = useState("");
  // Các Danh mục: 'active' | 'favorites' | 'system' | 'community' | 'my_scripts' | 'source_code'
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [typeFilter, setTypeFilter] = useState("all"); // 'all' | 'indicator' | 'strategy'
  const [selectedInfoScript, setSelectedInfoScript] = useState(null); // Script đang xem chi tiết mô tả

  useEffect(() => {
    if (isOpen) {
      setSelectedCategory(initialCategory || "system");
    }
  }, [isOpen, initialCategory]);

  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem("tls1_fav_indicators");
      return saved
        ? JSON.parse(saved)
        : [
            "liquid_v5",
            "rsi",
            "macd",
            "comm_fair_value_gap_luxalgo",
            "comm_market_structure_break_ob",
          ];
    } catch {
      return ["liquid_v5", "rsi", "macd"];
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
  const [scriptStatus, setScriptStatus] = useState(null);

  // Đồng bộ custom scripts ra component cha và localStorage
  useEffect(() => {
    if (onUpdateCustomScripts) {
      onUpdateCustomScripts(coderScripts);
    }
    try {
      localStorage.setItem("tls1_coder_scripts", JSON.stringify(coderScripts));
    } catch {}
  }, [coderScripts, onUpdateCustomScripts]);

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem("tls1_fav_indicators", JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Chia sẻ hoặc đặt riêng tư script trong My Scripts
  const toggleShareScript = (scriptId, e) => {
    e.stopPropagation();
    setCoderScripts((prev) =>
      prev.map((s) => {
        if (s.id === scriptId) {
          const nextShared = !s.isShared;
          return { ...s, isShared: nextShared };
        }
        return s;
      })
    );
  };

  // Mở mã nguồn của Script trong tab Source Code để xem & lập trình
  const handleInspectSourceCode = (script, e) => {
    e.stopPropagation();
    if (!script) return;
    const existing = coderScripts.find((s) => s.id === script.id);
    if (!existing) {
      const newCustom = {
        id: script.id,
        name: script.name,
        code: script.code || `// Source code for ${script.name}\n`,
        author: script.author || "Tài khoản của tôi",
        isShared: false,
        boosts: "0",
        type: script.type || "indicator",
      };
      setCoderScripts((prev) => [newCustom, ...prev]);
    }
    setActiveScriptId(script.id);
    setScriptCode(script.code || "");
    setScriptName(script.name);
    setSelectedCategory("source_code");
    setScriptStatus({
      success: true,
      message: `Đã nạp mã nguồn "${script.name}" vào bộ soạn thảo Source Code!`,
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
      name: `Chỉ báo tự viết #${coderScripts.length + 1}`,
      author: "Tài khoản của tôi",
      isShared: false,
      boosts: "0",
      type: "indicator",
      code: `// TLS1 Script Engine\nconst fast = sma('close', 10);\nplot('SMA 10', fast, { color: '#00bcd4', lineWidth: 2 });\n`,
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

  const handleDeleteScript = (targetId) => {
    const idToDelete = targetId || activeScriptId;
    if (coderScripts.length <= 1) {
      alert("Cần giữ lại ít nhất một script mẫu!");
      return;
    }
    const updated = coderScripts.filter((s) => s.id !== idToDelete);
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
    if (onToggleIndicator) {
      onToggleIndicator(activeScriptId);
    }
  };

  if (!isOpen) return null;

  // Chuẩn bị danh mục theo Tab
  let currentCategoryList = [];
  if (selectedCategory === "active") {
    // Chỉ hiển thị các chỉ báo hiện đang được bật trên biểu đồ
    const all = [...BUILTIN_INDICATORS, ...COMMUNITY_SCRIPTS, ...coderScripts];
    currentCategoryList = all.filter((item) => activeIndicators.includes(item.id));
  } else if (selectedCategory === "favorites") {
    const myWithMeta = coderScripts.map((s) => ({
      ...s,
      category: "my_scripts",
      author: s.author || "Tài khoản của tôi",
      boosts: s.boosts || "0",
      type: s.type || "indicator",
    }));
    const all = [...BUILTIN_INDICATORS, ...COMMUNITY_SCRIPTS, ...myWithMeta];
    currentCategoryList = all.filter((item) => favorites.includes(item.id));
  } else if (selectedCategory === "system") {
    currentCategoryList = BUILTIN_INDICATORS;
  } else if (selectedCategory === "community") {
    // Chỉ báo cộng đồng gốc + các script được người dùng bật "Chia sẻ"
    const sharedCustomScripts = coderScripts
      .filter((s) => s.isShared)
      .map((s) => ({
        ...s,
        category: "community",
        author: s.author || "Tài khoản của tôi",
        boosts: s.boosts || "1",
        type: s.type || "indicator",
      }));
    currentCategoryList = [...COMMUNITY_SCRIPTS, ...sharedCustomScripts];
  } else if (selectedCategory === "my_scripts") {
    currentCategoryList = coderScripts.map((s) => ({
      ...s,
      category: "my_scripts",
      author: s.author || "Tài khoản của tôi",
      boosts: s.boosts || "0",
      type: s.type || "indicator",
    }));
  }

  // Lọc theo search và type
  const filteredList = currentCategoryList.filter((ind) => {
    if (typeFilter !== "all" && ind.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = ind.name && ind.name.toLowerCase().includes(q);
      const matchAuthor = ind.author && ind.author.toLowerCase().includes(q);
      const matchDesc = ind.description && ind.description.toLowerCase().includes(q);
      return matchName || matchAuthor || matchDesc;
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
            placeholder="Tìm kiếm chỉ báo, tên tác giả, chiến thuật..."
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
            {/* 0. Đang kích hoạt (Active) */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "active" ? "active" : ""}`}
              onClick={() => setSelectedCategory("active")}
            >
              <span className="tv-tab-icon" style={{ color: "#00e676" }}>✓</span>
              <span>Đang bật ({activeIndicators.length})</span>
            </button>

            {/* 1. Favorites */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "favorites" ? "active" : ""}`}
              onClick={() => setSelectedCategory("favorites")}
            >
              <span className="tv-tab-icon" style={{ color: "#ffd700" }}>★</span>
              <span>Favorites</span>
            </button>

            {/* 2. System */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "system" ? "active" : ""}`}
              onClick={() => setSelectedCategory("system")}
            >
              <span className="tv-tab-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="3" width="7" height="7" />
                  <rect x="14" y="3" width="7" height="7" />
                  <rect x="14" y="14" width="7" height="7" />
                  <rect x="3" y="14" width="7" height="7" />
                </svg>
              </span>
              <span>System</span>
            </button>

            {/* 3. Community */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "community" ? "active" : ""}`}
              onClick={() => setSelectedCategory("community")}
            >
              <span className="tv-tab-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                  <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                </svg>
              </span>
              <span>Community</span>
            </button>

            {/* 4. My Scripts */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "my_scripts" ? "active" : ""}`}
              onClick={() => setSelectedCategory("my_scripts")}
            >
              <span className="tv-tab-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span>My Scripts</span>
            </button>

            {/* 5. Source Code */}
            <button
              className={`tv-sidebar-tab ${selectedCategory === "source_code" ? "active" : ""}`}
              onClick={() => setSelectedCategory("source_code")}
            >
              <span className="tv-tab-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="16 18 22 12 16 6" />
                  <polyline points="8 6 2 12 8 18" />
                </svg>
              </span>
              <span>Source Code</span>
            </button>
          </div>


          {/* Right Main Content */}
          <div className="tv-modal-content">
            {selectedCategory === "source_code" ? (
              /* TAB DÀNH CHO CODER TỰ VIẾT HOẶC CHỈNH SỬA SCRIPT */
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
                          {s.name} {s.isShared ? "(🌐 Chia sẻ)" : "(🔒 Riêng tư)"}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      className="coder-script-name-input"
                      value={scriptName}
                      onChange={(e) => setScriptName(e.target.value)}
                      placeholder="Tên chỉ báo..."
                    />
                  </div>

                  <div className="coder-editor-actions">
                    <button className="tv-action-btn secondary" onClick={handleCreateNewScript} title="Tạo mới script">
                      + New
                    </button>
                    <button className="tv-action-btn secondary" onClick={handleSaveScript} title="Lưu script">
                      Save
                    </button>
                    <button className="tv-action-btn danger" onClick={() => handleDeleteScript()} title="Xóa script này">
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
                  <span>Hàm Hỗ Trợ:</span>
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
              /* DANH SÁCH CHỈ BÁO FAVORITES / SYSTEM / COMMUNITY / MY SCRIPTS */
              <div className="indicators-list-panel">
                {/* Header thanh công cụ dành riêng cho My Scripts */}
                {selectedCategory === "my_scripts" && (
                  <div className="my-scripts-toolbar">
                    <span className="my-scripts-toolbar-text">
                      Chỉ báo cá nhân của tài khoản này. Bạn có thể bấm <strong>"Chia sẻ"</strong> để đưa lên mục Cộng đồng hoặc giữ <strong>"Riêng tư"</strong>.
                    </span>
                    <button
                      className="tv-action-btn secondary my-scripts-new-btn"
                      onClick={() => {
                        handleCreateNewScript();
                        setSelectedCategory("source_code");
                      }}
                    >
                      + Viết chỉ báo mới
                    </button>
                  </div>
                )}

                {/* Filter Chips: All / Indicators / Strategies */}
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

                {/* List Table Container Chuẩn TradingView */}
                <div className="tv-indicators-scroll">
                  {filteredList.length === 0 ? (
                    <div className="tv-empty-results" style={{ padding: "40px 20px", textAlign: "center", color: "#888" }}>
                      {selectedCategory === "active"
                        ? "Hiện không có chỉ báo nào đang bật trên biểu đồ."
                        : selectedCategory === "community"
                        ? "Chưa có chỉ báo cộng đồng nào được chia sẻ."
                        : selectedCategory === "my_scripts"
                        ? "Bạn chưa tạo chỉ báo cá nhân nào. Hãy sang tab Source Code để viết hoặc nạp script đầu tiên."
                        : selectedCategory === "favorites"
                        ? "Chưa có chỉ báo yêu thích. Bấm biểu tượng ngôi sao ★ trên chỉ báo để thêm vào đây."
                        : "Không tìm thấy chỉ báo phù hợp trong mục này."}
                    </div>
                  ) : (
                    filteredList.map((ind) => {
                      const isActive = activeIndicators.includes(ind.id);
                      const isFav = favorites.includes(ind.id);
                      const isMyScript = ind.category === "my_scripts" || selectedCategory === "my_scripts";

                      return (
                        <div
                          key={ind.id}
                          className={`tv-indicator-table-row ${isActive ? "active" : ""}`}
                          onClick={() => onToggleIndicator(ind.id)}
                        >
                          {/* Col 1: Star Favorite Button */}
                          <button
                            className={`tv-star-btn ${isFav ? "favorited" : ""}`}
                            onClick={(e) => toggleFavorite(ind.id, e)}
                            title={isFav ? "Remove from Favorites" : "Add to Favorites"}
                          >
                            {isFav ? "★" : "☆"}
                          </button>

                          {/* Col 2: Indicator Title + EP Badge + Share Badge */}
                          <div className="tv-cell-title">
                            <span className="tv-row-script-name" title={ind.name}>
                              {ind.name}
                            </span>
                            {ind.isEditorPick && (
                              <span className="tv-ep-badge" title="Editor's Pick">
                                EP
                              </span>
                            )}
                            {isMyScript && (
                              <button
                                className={`tv-share-badge ${ind.isShared ? "shared" : "private"}`}
                                onClick={(e) => toggleShareScript(ind.id, e)}
                                title={
                                  ind.isShared
                                    ? "Đang chia sẻ ra Cộng đồng (Bấm để chuyển về Riêng tư)"
                                    : "Chỉ tài khoản bạn thấy (Bấm để chia sẻ ra Cộng đồng)"
                                }
                              >
                                {ind.isShared ? "🌐 Đã chia sẻ" : "🔒 Riêng tư"}
                              </button>
                            )}
                          </div>

                          {/* Col 3: Author Link */}
                          <div className="tv-cell-author">
                            <span
                              className="tv-author-link"
                              title={`Tác giả: ${ind.author}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSearchQuery(ind.author);
                              }}
                            >
                              {ind.author}
                            </span>
                          </div>

                          {/* Col 4: Boosts / Likes Count */}
                          <div className="tv-cell-boosts">{ind.boosts || "0"}</div>

                          {/* Col 5: Actions (View Code {} / Doc / Delete / Add) */}
                          <div className="tv-cell-actions">
                            {ind.code && (
                              <button
                                className="tv-icon-action-btn"
                                onClick={(e) => handleInspectSourceCode(ind, e)}
                                title="Xem & chỉnh sửa mã nguồn script"
                              >
                                {"{}"}
                              </button>
                            )}
                            {ind.description && (
                              <button
                                className="tv-icon-action-btn"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedInfoScript(selectedInfoScript?.id === ind.id ? null : ind);
                                }}
                                title="Chi tiết mô tả"
                              >
                                📄
                              </button>
                            )}
                            {isMyScript && (
                              <button
                                className="tv-icon-action-btn danger-hover"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (confirm(`Xóa chỉ báo "${ind.name}"?`)) {
                                    handleDeleteScript(ind.id);
                                  }
                                }}
                                title="Xóa chỉ báo này"
                              >
                                🗑️
                              </button>
                            )}
                            <button
                              className={`tv-row-apply-pill ${isActive ? "active" : ""}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleIndicator(ind.id);
                              }}
                              title={isActive ? "Tắt khỏi biểu đồ" : "Thêm vào biểu đồ"}
                            >
                              {isActive ? "✓" : "+"}
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover mô tả chi tiết nếu bấm vào icon 📄 */}
                {selectedInfoScript && (
                  <div className="tv-info-popover">
                    <div className="tv-info-header">
                      <strong>{selectedInfoScript.name}</strong>
                      <button onClick={() => setSelectedInfoScript(null)}>✕</button>
                    </div>
                    <div className="tv-info-desc">{selectedInfoScript.description}</div>
                    <div className="tv-info-author">
                      Tác giả: <span className="tv-author-link">{selectedInfoScript.author}</span> • {selectedInfoScript.boosts || 0} boosts
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="tv-modal-footer">
          <div className="tv-footer-stats">
            <button
              type="button"
              className="tv-active-switch-btn"
              onClick={() => setSelectedCategory("active")}
              title="Bấm vào đây để mở danh sách các chỉ báo đang bật"
              style={{
                background: "none",
                border: "none",
                color: "#d1d4dc",
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: "4px",
                display: "inline-flex",
                alignItems: "center",
                gap: "5px",
                fontSize: "12px",
              }}
            >
              <span>Đang kích hoạt:</span>
              <span className="highlight-text" style={{ background: "rgba(0, 230, 118, 0.15)", color: "#00e676", padding: "1px 6px", borderRadius: "10px", fontWeight: "bold" }}>
                {activeIndicators.length}
              </span>
              <span>chỉ báo trên biểu đồ (Bấm để quản lý)</span>
            </button>
          </div>
          <button className="tv-action-btn primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
