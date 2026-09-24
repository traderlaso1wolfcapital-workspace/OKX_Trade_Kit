import React, { useState } from "react";
import { useTranslation } from "../../i18n";

export default function ConnectModal({
  isOpen,
  onClose,
  handleFastConnectClick,
  okxOAuthUrl,
  onSaveApiKey,
  isConnecting = false,
  isAuthenticated = false,
  currentUid = "",
  onLogout,
}) {
  const { t } = useTranslation();
  const [connectTab, setConnectTab] = useState("fast"); // 'fast' | 'apikey'

  // API Key Form State
  const [uid, setUid] = useState(currentUid || "");
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSubmitApiKey = async (e) => {
    e.preventDefault();
    if (!uid || !apiKey || !secretKey || !passphrase) {
      setErrorMsg("Vui lòng điền đầy đủ các thông tin!");
      return;
    }
    setErrorMsg("");
    await onSaveApiKey(uid, apiKey, secretKey, passphrase);
  };

  return (
    <div
      className="modal-overlay"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        boxSizing: "border-box",
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "440px",
          backgroundColor: "#1e1e1e",
          border: "1px solid #333333",
          borderRadius: "6px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.85)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          position: "relative",
          animation: "modalFadeIn 0.15s ease-out",
          fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`
          @keyframes modalFadeIn {
            from { opacity: 0; transform: scale(0.96) translateY(6px); }
            to { opacity: 1; transform: scale(1) translateY(0); }
          }
          .connect-tab-btn {
            background-color: #121212;
            color: #888888;
            border: 1px solid #2d2d2d;
            border-bottom: none;
            border-top-left-radius: 5px;
            border-top-right-radius: 5px;
            padding: 8px 18px;
            margin-right: 4px;
            font-size: 13px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.15s ease;
            outline: none;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: inherit;
          }
          .connect-tab-btn:hover:not(.active) {
            background-color: #1a1a1a;
            color: #cccccc;
          }
          .connect-tab-btn.active {
            background-color: #222222;
            color: #ff9900;
            border-top: 3px solid #ff9900;
            border-left: 1px solid #333333;
            border-right: 1px solid #333333;
            border-bottom: 1px solid #222222;
            margin-bottom: -1px;
            padding-top: 6px;
          }
          .connect-card {
            background-color: #222222;
            border: 1px solid #333333;
            border-radius: 6px;
            padding: 12px 14px;
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            color: inherit;
            cursor: pointer;
            transition: all 0.2s cubic-bezier(0.2, 0, 0, 1);
            box-sizing: border-box;
            width: 100%;
          }
          .connect-card:hover:not(.disabled) {
            background-color: #262626;
            border-color: #ff9900;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
          }
          .connect-card:active:not(.disabled) {
            transform: translateY(0);
          }
          .connect-card:hover:not(.disabled) .connect-action-badge {
            background-color: #26a69a !important;
            color: #ffffff !important;
            border-color: #26a69a !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(38, 166, 154, 0.35);
          }
          .connect-card.disabled {
            background-color: #1a1a1a;
            border: 1px dashed #333333;
            opacity: 0.5;
            cursor: not-allowed;
          }
          .connect-input {
            width: 100%;
            padding: 8px 10px;
            background: #181818;
            border: 1px solid #333333;
            color: #ffffff;
            border-radius: 4px;
            outline: none;
            font-size: 13px;
            box-sizing: border-box;
            transition: border-color 0.2s;
            font-family: inherit;
          }
          .connect-input:focus {
            border-color: #ff9900;
            box-shadow: 0 0 0 2px rgba(255, 153, 0, 0.2);
          }
        `}</style>

        {/* Modal Header */}
        <div
          style={{
            backgroundColor: "#242424",
            borderBottom: "1px solid #333333",
            padding: "10px 16px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <h3
              style={{
                fontSize: "13px",
                fontWeight: "bold",
                color: "#ffffff",
                margin: 0,
                letterSpacing: "0.3px",
              }}
            >
              {t("connect_title")}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#888888",
              fontSize: "20px",
              cursor: "pointer",
              lineHeight: 1,
              padding: 0,
              transition: "color 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.color = "#ffffff")}
            onMouseOut={(e) => (e.currentTarget.style.color = "#888888")}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Navigation Tabs (Giống 100% Cài Đặt Hệ Thống) */}
        <div
          style={{
            display: "flex",
            backgroundColor: "#121212",
            borderBottom: "1px solid #3d3d3d",
            padding: "8px 14px 0 14px",
          }}
        >
          <button
            type="button"
            className={`connect-tab-btn ${connectTab === "fast" ? "active" : ""}`}
            onClick={() => setConnectTab("fast")}
          >
            {t("fast_connect")}
          </button>
          <button
            type="button"
            className={`connect-tab-btn ${connectTab === "apikey" ? "active" : ""}`}
            onClick={() => setConnectTab("apikey")}
          >
            {t("apikey_connect")}
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "14px", backgroundColor: "#1e1e1e" }}>
          {/* TAB 1: FAST CONNECT */}
          {connectTab === "fast" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ color: "#aaaaaa", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
                {t("fast_connect_desc")}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "9px" }}>
                {/* 1. OKX App Connect Card */}
                <div
                  onClick={(e) => {
                    if (isConnecting || !okxOAuthUrl) return;
                    if (handleFastConnectClick) handleFastConnectClick();
                    // Always use window.location.href to stay inside PWA and prevent Safari popup blocking
                    window.location.href = okxOAuthUrl;
                  }}
                  className="connect-card"
                  style={{ opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? 'not-allowed' : 'pointer' }}
                >
                  {/* Authentic OKX Logo Box */}
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "#000000",
                      border: "1px solid #333333",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    {isConnecting ? (
                      <span className="spinner" style={{ width: "16px", height: "16px", borderWidth: "2px" }}></span>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="#ffffff">
                        <rect x="2" y="2" width="6" height="6" rx="1" />
                        <rect x="16" y="2" width="6" height="6" rx="1" />
                        <rect x="9" y="9" width="6" height="6" rx="1" />
                        <rect x="2" y="16" width="6" height="6" rx="1" />
                        <rect x="16" y="16" width="6" height="6" rx="1" />
                      </svg>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>
                      {isConnecting ? t("saving_btn") : t("okx_connect_title")}
                    </div>
                    <div style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
                      {t("okx_connect_sub")}
                    </div>
                  </div>

                  {/* Action Badge */}
                  <span
                    className="connect-action-badge"
                    style={{
                      fontSize: "11px",
                      fontWeight: "700",
                      color: "#26a69a",
                      background: "rgba(38, 166, 154, 0.12)",
                      border: "1px solid rgba(38, 166, 154, 0.3)",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      whiteSpace: "nowrap",
                      transition: "all 0.18s ease",
                    }}
                  >
                    {t("open_app")}
                  </span>
                </div>

                {/* Divider for Multi-exchange & Web3 ready */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
                  <span style={{ fontSize: "10.5px", color: "#888888", fontWeight: "bold", letterSpacing: "0.5px" }}>
                    {t("coming_soon_section")}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
                </div>

                {/* Manual Link Fallback for iOS PWA */}
                <div style={{ marginTop: "4px", marginBottom: "8px", background: "#1a1a1a", padding: "10px", borderRadius: "6px", border: "1px dashed #333" }}>
                  <label style={{ display: "block", color: "#aaaaaa", fontSize: "11.5px", marginBottom: "6px", fontWeight: "bold" }}>
                    Dán Link Safari (nếu bị lỗi trình duyệt)
                  </label>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <input
                      type="text"
                      placeholder="Dán link bắt đầu bằng https://..."
                      className="connect-input"
                      id="manualCodeInput"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const val = document.getElementById("manualCodeInput").value.trim();
                        if (!val) return;
                        if (val.includes("code=")) {
                           let searchPart = val;
                           if (val.includes("?")) {
                             searchPart = val.substring(val.indexOf("?"));
                           } else if (!val.startsWith("?")) {
                             searchPart = "?" + val;
                           }
                           window.location.href = "/okx-callback" + searchPart;
                        } else {
                           alert("Link không chứa mã code. Vui lòng copy toàn bộ link trang bị lỗi.");
                        }
                      }}
                      style={{
                        padding: "0 12px",
                        backgroundColor: "#2e7d32",
                        border: "none",
                        color: "#fff",
                        borderRadius: "4px",
                        cursor: "pointer",
                        fontWeight: "bold",
                        fontSize: "12px",
                        whiteSpace: "nowrap"
                      }}
                    >
                      Xác nhận
                    </button>
                  </div>
                </div>

                {/* 2. Binance Connect Card (Coming Soon) */}
                <div className="connect-card disabled" title="Tính năng đang được phát triển">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "#000000",
                      border: "1px solid #333333",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="#F0B90B">
                      <path d="M16.624 13.92l2.717 2.716-7.353 7.353-7.352-7.352 2.717-2.717 4.636 4.66 4.635-4.66zm4.637-4.636L24 12l-2.715 2.716L18.568 12l2.693-2.716zm-9.272 0l2.716 2.692-2.717 2.717L9.272 12l2.716-2.715zm-9.273 0L5.41 12l-2.692 2.692L0 12l2.716-2.716zM11.99.01l7.352 7.33-2.717 2.715-4.636-4.636-4.635 4.66-4.636-4.636L4.66 7.318 11.99.01z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#cccccc" }}>{t("binance_connect")}</div>
                    <div style={{ fontSize: "11px", color: "#666666" }}>{t("binance_desc")}</div>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#777777", background: "#181818", border: "1px solid #2a2a2a", padding: "3px 7px", borderRadius: "4px" }}>
                    {t("coming_soon")}
                  </span>
                </div>

                {/* 3. Bybit Connect Card (Coming Soon) */}
                <div className="connect-card disabled" title="Tính năng đang được phát triển">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "#000000",
                      border: "1px solid #333333",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="26" height="13" viewBox="0 0 70 24" fill="none">
                      <path d="M5 4h7.5c2.4 0 4.1 1.4 4.1 3.6 0 1.5-.9 2.7-2.2 3.2 1.6.5 2.6 1.9 2.6 3.6 0 2.4-1.8 3.8-4.4 3.8H5V4zm4 5.9h3.3c.9 0 1.6-.5 1.6-1.4 0-.8-.7-1.4-1.6-1.4H9V9.9zm0 5.8h3.5c1 0 1.8-.6 1.8-1.5 0-1-.8-1.5-1.8-1.5H9v3z" fill="#ffffff" />
                      <path d="M18.8 4.2h4.5l2.8 6.2 2.8-6.2h4.5l-5.3 10V20h-4v-5.8l-5.3-10z" fill="#ffffff" />
                      <path d="M35.5 4h7.5c2.4 0 4.1 1.4 4.1 3.6 0 1.5-.9 2.7-2.2 3.2 1.6.5 2.6 1.9 2.6 3.6 0 2.4-1.8 3.8-4.4 3.8h-7.6V4zm4 5.9h3.3c.9 0 1.6-.5 1.6-1.4 0-.8-.7-1.4-1.6-1.4h-3.3V9.9zm0 5.8h3.5c1 0 1.8-.6 1.8-1.5 0-1-.8-1.5-1.8-1.5h-3.5v3z" fill="#ffffff" />
                      <rect x="50.2" y="4.2" width="4.4" height="15.8" rx="0.5" fill="#f7a600" />
                      <path d="M57 4.2h11.2v3.6h-3.6V20h-4V7.8H57V4.2z" fill="#ffffff" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#cccccc" }}>{t("bybit_connect")}</div>
                    <div style={{ fontSize: "11px", color: "#666666" }}>{t("bybit_desc")}</div>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#777777", background: "#181818", border: "1px solid #2a2a2a", padding: "3px 7px", borderRadius: "4px" }}>
                    {t("coming_soon")}
                  </span>
                </div>

                {/* 4. OKX Web3 Wallet / Crypto Wallet Card (Coming Soon) */}
                <div className="connect-card disabled" title="Tính năng đang được phát triển">
                  <div
                    style={{
                      width: "36px",
                      height: "36px",
                      background: "#161616",
                      border: "1px solid #333333",
                      borderRadius: "6px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
                      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
                      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
                    </svg>
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#cccccc" }}>{t("wallet_connect")}</div>
                    <div style={{ fontSize: "11px", color: "#666666" }}>{t("wallet_desc")}</div>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#777777", background: "#181818", border: "1px solid #2a2a2a", padding: "3px 7px", borderRadius: "4px" }}>
                    {t("coming_soon")}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MANUAL API KEY FORM */}
          {connectTab === "apikey" && (
            <form onSubmit={handleSubmitApiKey} style={{ display: "flex", flexDirection: "column", gap: "11px" }}>
              <p style={{ color: "#aaaaaa", fontSize: "12px", margin: 0 }}>
                {t("apikey_connect_desc")}
              </p>

              {errorMsg && (
                <div
                  style={{
                    background: "rgba(220, 53, 69, 0.15)",
                    border: "1px solid #dc3545",
                    color: "#ff6b6b",
                    padding: "8px 12px",
                    borderRadius: "4px",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <span>⚠️</span>
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label style={{ display: "block", color: "#aaaaaa", fontSize: "11.5px", marginBottom: "4px", fontWeight: "bold" }}>
                  {t("uid_label")}
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="VD: 523019992975987626"
                  className="connect-input"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#aaaaaa", fontSize: "11.5px", marginBottom: "4px", fontWeight: "bold" }}>
                  {t("apikey_label")}
                </label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Nhập API Key..."
                  className="connect-input"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#aaaaaa", fontSize: "11.5px", marginBottom: "4px", fontWeight: "bold" }}>
                  {t("secret_label")}
                </label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Nhập Secret Key..."
                  className="connect-input"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#aaaaaa", fontSize: "11.5px", marginBottom: "4px", fontWeight: "bold" }}>
                  {t("passphrase_label")}
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Nhập Passphrase..."
                  className="connect-input"
                />
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                style={{
                  width: "100%",
                  padding: "10px 18px",
                  backgroundColor: isConnecting ? "#3a3a3a" : "#2e7d32",
                  border: "none",
                  color: "#ffffff",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  marginTop: "6px",
                  transition: "all 0.18s ease",
                  boxShadow: "none",
                }}
                onMouseOver={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.backgroundColor = "#388e3c";
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.backgroundColor = "#2e7d32";
                    e.currentTarget.style.transform = "none";
                  }
                }}
                onMouseDown={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(1px)";
                  }
                }}
                onMouseUp={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                  }
                }}
              >
                {isConnecting ? t("saving_btn") : t("save_connect_btn")}
              </button>
            </form>
          )}

          {/* FOOTER: THÔNG TIN TÀI KHOẢN & NÚT ĐĂNG XUẤT */}
          {isAuthenticated && (
            <div
              style={{
                marginTop: "4px",
                paddingTop: "12px",
                borderTop: "1px solid #333333",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "#888888" }}>
                <span
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#26a69a",
                    display: "inline-block",
                    boxShadow: "0 0 6px #26a69a",
                  }}
                ></span>
                <span>
                  UID: <strong style={{ color: "#ffffff" }}>{currentUid || t("connected")}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  onClose();
                }}
                style={{
                  backgroundColor: "transparent",
                  border: "1px solid #ff4d4f",
                  color: "#ff4d4f",
                  padding: "4px 12px",
                  borderRadius: "4px",
                  fontSize: "11.5px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.15)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                }}
              >
                {t("logout")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
