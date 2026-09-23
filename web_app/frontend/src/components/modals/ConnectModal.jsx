import React, { useState } from "react";

export default function ConnectModal({
  isOpen,
  onClose,
  handleFastConnectClick,
  okxOAuthUrl,
  onSaveApiKey,
  isConnecting
}) {
  const [connectTab, setConnectTab] = useState("fast"); // 'fast' | 'apikey'
  
  // API Key Form State
  const [uid, setUid] = useState("");
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
    <div className="modal-overlay" style={{
      position: "fixed",
      top: 0, left: 0, right: 0, bottom: 0,
      background: "rgba(0, 0, 0, 0.7)",
      backdropFilter: "blur(12px)",
      WebkitBackdropFilter: "blur(12px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 9999,
      animation: "fadeIn 0.3s ease-out"
    }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(20px) scale(0.95); opacity: 0; } to { transform: translateY(0) scale(1); opacity: 1; } }
        @keyframes pulseGlow { 0% { box-shadow: 0 0 15px rgba(0, 255, 85, 0.3); } 50% { box-shadow: 0 0 30px rgba(0, 255, 85, 0.6); } 100% { box-shadow: 0 0 15px rgba(0, 255, 85, 0.3); } }
        .tab-btn { position: relative; flex: 1; padding: 14px; background: transparent; color: #888; border: none; cursor: pointer; font-weight: 600; font-size: 14px; letter-spacing: 0.5px; transition: all 0.3s ease; }
        .tab-btn.active { color: #fff; background: rgba(255, 255, 255, 0.05); }
        .tab-indicator { position: absolute; bottom: 0; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, #00ff55, #ffe600, #ff4400); transform-origin: left; animation: slideIn 0.3s ease; }
        @keyframes slideIn { from { transform: scaleX(0); } to { transform: scaleX(1); } }
        .input-field { width: 100%; padding: 12px 14px; background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); color: #fff; border-radius: 8px; outline: none; transition: all 0.2s; font-family: inherit; }
        .input-field:focus { border-color: rgba(0, 255, 85, 0.5); background: rgba(255, 255, 255, 0.08); box-shadow: 0 0 0 3px rgba(0, 255, 85, 0.1); }
      `}</style>
      
      <div style={{ 
        maxWidth: "400px", 
        width: "90%",
        background: "rgba(15, 15, 15, 0.85)",
        border: "1px solid rgba(255, 255, 255, 0.1)",
        borderRadius: "24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
        overflow: "hidden",
        animation: "slideUp 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
        display: "flex",
        flexDirection: "column",
        position: "relative"
      }}>
        
        {/* Header */}
        <div style={{ padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "700", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px", letterSpacing: "0.5px" }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#header-grad)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <defs>
                <linearGradient id="header-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00ff55" />
                  <stop offset="50%" stopColor="#ffe600" />
                  <stop offset="100%" stopColor="#ff4400" />
                </linearGradient>
              </defs>
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
            </svg>
            KẾT NỐI OKX
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#ff3b30",
              border: "none",
              color: "#fff",
              fontSize: "14px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              transition: "transform 0.2s, background 0.2s",
              boxShadow: "0 2px 8px rgba(255, 59, 48, 0.4)"
            }}
            onMouseOver={(e) => { e.currentTarget.style.transform = "scale(1.15)"; e.currentTarget.style.background = "#ff453a"; }}
            onMouseOut={(e) => { e.currentTarget.style.transform = "scale(1)"; e.currentTarget.style.background = "#ff3b30"; }}
            title="Đóng"
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: "rgba(0, 0, 0, 0.4)", borderBottom: "1px solid rgba(255, 255, 255, 0.06)" }}>
          <button className={`tab-btn ${connectTab === "fast" ? "active" : ""}`} onClick={() => setConnectTab("fast")}>
            FAST CONNECT
            {connectTab === "fast" && <div className="tab-indicator" />}
          </button>
          <button className={`tab-btn ${connectTab === "apikey" ? "active" : ""}`} onClick={() => setConnectTab("apikey")}>
            API KEY
            {connectTab === "apikey" && <div className="tab-indicator" />}
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: "24px", minHeight: "280px", display: "flex", flexDirection: "column" }}>
          
          {connectTab === "fast" && (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", gap: "24px" }}>
              <p style={{ color: "#a0a0a0", fontSize: "14px", margin: 0, lineHeight: "1.5" }}>
                Kết nối an toàn thông qua ứng dụng OKX mà không cần copy API Key thủ công.
              </p>
              
              <a
                href={okxOAuthUrl || "#"}
                onClick={(e) => {
                  if (isConnecting || !okxOAuthUrl) {
                    e.preventDefault();
                    return;
                  }
                  if (handleFastConnectClick) {
                    handleFastConnectClick();
                  }
                }}
                disabled={isConnecting}
                style={{
                  position: "relative",
                  width: "100%",
                  padding: "16px",
                  background: "linear-gradient(135deg, rgba(0, 255, 85, 0.15), rgba(255, 230, 0, 0.15))",
                  border: "1px solid rgba(0, 255, 85, 0.3)",
                  color: "#fff",
                  borderRadius: "14px",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "12px",
                  fontSize: "16px",
                  fontWeight: "700",
                  textDecoration: "none",
                  boxSizing: "border-box",
                  transition: "all 0.3s ease",
                  animation: !isConnecting ? "pulseGlow 3s infinite" : "none"
                }}
                onMouseOver={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(-2px)";
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 255, 85, 0.25), rgba(255, 230, 0, 0.25))";
                    e.currentTarget.style.boxShadow = "0 8px 20px rgba(0, 255, 85, 0.3)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.background = "linear-gradient(135deg, rgba(0, 255, 85, 0.15), rgba(255, 230, 0, 0.15))";
                    e.currentTarget.style.boxShadow = "none";
                  }
                }}
              >
                {isConnecting ? (
                  <span className="spinner" style={{ width: "20px", height: "20px", borderWidth: "2px" }}></span>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="url(#okx-btn-grad)">
                    <defs>
                      <linearGradient id="okx-btn-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#00ff55" />
                        <stop offset="50%" stopColor="#ffe600" />
                        <stop offset="100%" stopColor="#ff4400" />
                      </linearGradient>
                    </defs>
                    <rect x="0" y="0" width="7" height="7" rx="1" />
                    <rect x="17" y="0" width="7" height="7" rx="1" />
                    <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
                    <rect x="0" y="17" width="7" height="7" rx="1" />
                    <rect x="17" y="17" width="7" height="7" rx="1" />
                  </svg>
                )}
                <span>{isConnecting ? "Đang xử lý..." : "Kết Nối Ứng Dụng OKX"}</span>
              </a>
              
              <div style={{ fontSize: "12px", color: "#666", marginTop: "auto" }}>
                Yêu cầu tài khoản có quyền giao dịch
              </div>
            </div>
          )}

          {connectTab === "apikey" && (
            <form onSubmit={handleSubmitApiKey} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <p style={{ color: "#a0a0a0", fontSize: "13px", margin: 0, lineHeight: "1.4" }}>
                Nhập thủ công API Key của bạn (Yêu cầu quyền Read và Trade).
              </p>
              
              {errorMsg && (
                <div style={{ padding: "12px", background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.2)", color: "#ff453a", borderRadius: "8px", fontSize: "13px", display: "flex", alignItems: "center", gap: "8px" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>OKX UID:</label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="VD: 12345678"
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>API Key:</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Nhập API Key..."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>Khóa Bí Mật (Secret Key):</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Nhập Secret Key..."
                  className="input-field"
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#888", fontSize: "12px", marginBottom: "6px", fontWeight: "600" }}>Cụm Mật Khẩu (Passphrase):</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Nhập Passphrase..."
                  className="input-field"
                />
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                style={{
                  width: "100%",
                  padding: "14px",
                  background: "linear-gradient(90deg, rgba(40, 167, 69, 0.9), rgba(32, 201, 151, 0.9))",
                  border: "none",
                  color: "#fff",
                  borderRadius: "10px",
                  fontSize: "14px",
                  fontWeight: "700",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  marginTop: "8px",
                  transition: "transform 0.2s, box-shadow 0.2s",
                  boxShadow: "0 4px 15px rgba(40, 167, 69, 0.3)"
                }}
                onMouseOver={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow = "0 6px 20px rgba(40, 167, 69, 0.4)";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isConnecting) {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "0 4px 15px rgba(40, 167, 69, 0.3)";
                  }
                }}
              >
                {isConnecting ? "ĐANG XỬ LÝ..." : "LƯU & KẾT NỐI"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
