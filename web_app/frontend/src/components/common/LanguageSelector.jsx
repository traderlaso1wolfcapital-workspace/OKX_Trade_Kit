import React, { useState, useRef, useEffect } from "react";

const LANGUAGES = [
  { code: "en", label: "English" },
  { code: "vi", label: "Tiếng Việt" },
  { code: "fr", label: "Français" },
  { code: "zh", label: "简体中文" },
  { code: "ko", label: "한국어" },
  { code: "es", label: "Español" },
];

export default function LanguageSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(() => {
    return localStorage.getItem("tls1_app_language") || "vi";
  });
  const containerRef = useRef(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  const handleSelect = (code) => {
    setCurrentLang(code);
    localStorage.setItem("tls1_app_language", code);
    window.dispatchEvent(new CustomEvent("tls1_language_changed", { detail: code }));
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} style={{ position: "relative", display: "inline-block" }}>
      {/* Globe Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        title="Ngôn ngữ / Language"
        style={{
          width: "28px",
          height: "28px",
          minHeight: "28px",
          borderRadius: "4px",
          background: isOpen ? "#2a2a2a" : "#222222",
          border: isOpen ? "1px solid #ff9900" : "1px solid #444444",
          color: isOpen ? "#ff9900" : "#ffffff",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.18s ease",
          padding: 0,
          boxShadow: isOpen ? "0 0 8px rgba(255, 153, 0, 0.25)" : "none",
        }}
        onMouseOver={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "#2a2a2a";
            e.currentTarget.style.borderColor = "#666666";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.transform = "translateY(-1px)";
          }
        }}
        onMouseOut={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "#222222";
            e.currentTarget.style.borderColor = "#444444";
            e.currentTarget.style.color = "#ffffff";
            e.currentTarget.style.transform = "none";
          }
        }}
      >
        <svg
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="2" y1="12" x2="22" y2="12" />
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
        </svg>
      </button>

      {/* Dropdown Menu (Theme Obsidian Dark Charcoal) */}
      {isOpen && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 5px)",
            right: 0,
            minWidth: "145px",
            background: "#1e1e1e",
            border: "1px solid #333333",
            borderRadius: "6px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.7), 0 2px 6px rgba(0,0,0,0.4)",
            padding: "5px 0",
            zIndex: 1000,
            animation: "fadeIn 0.15s ease-out",
          }}
        >
          <div
            style={{
              padding: "4px 12px 6px",
              fontSize: "11px",
              fontWeight: "normal",
              color: "#888888",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              userSelect: "none",
              borderBottom: "1px solid #2a2a2a",
              marginBottom: "4px",
            }}
          >
            Language
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {LANGUAGES.map((lang) => {
              const isSelected = currentLang === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => handleSelect(lang.code)}
                  style={{
                    padding: "7px 12px",
                    fontSize: "12.5px",
                    fontWeight: "normal",
                    color: isSelected ? "#00c087" : "#d1d4dc",
                    backgroundColor: isSelected ? "rgba(0, 192, 135, 0.08)" : "transparent",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? "rgba(0, 192, 135, 0.15)" : "#2a2a2a";
                    if (!isSelected) e.currentTarget.style.color = "#ffffff";
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = isSelected ? "rgba(0, 192, 135, 0.08)" : "transparent";
                    if (!isSelected) e.currentTarget.style.color = "#d1d4dc";
                  }}
                >
                  <span>{lang.label}</span>
                  {isSelected && (
                    <span style={{ fontSize: "12px", color: "#00c087", fontWeight: "normal" }}>✓</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
