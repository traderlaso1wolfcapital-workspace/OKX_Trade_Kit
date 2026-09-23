import React, { useState } from "react";

export default function ConnectModal({
  isOpen,
  onClose,
  handleFastConnect,
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
    <div className="modal-overlay">
      <div className="modal-content" style={{ 
        maxWidth: "420px", 
        width: "100%",
        padding: "0",
        background: "linear-gradient(#0a0a0a, #0a0a0a) padding-box, linear-gradient(135deg, #00ff55, #ffe600, #ff4400) border-box",
        border: "1px solid transparent",
        borderRadius: "20px",
        boxShadow: "0 30px 60px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset",
        overflow: "hidden"
      }}>
        {/* Modal Header */}
        <div style={{ padding: "20px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "16px", fontWeight: "600", color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: "10px", letterSpacing: "0.5px" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="url(#header-grad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              background: "rgba(255, 59, 48, 0.15)",
              border: "1px solid rgba(255, 59, 48, 0.3)",
              color: "#ff453a",
              fontSize: "12px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "28px",
              height: "28px",
              borderRadius: "50%",
              transition: "all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)"
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(255, 59, 48, 0.9)";
              e.currentTarget.style.color = "#fff";
              e.currentTarget.style.transform = "scale(1.1)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 59, 48, 0.15)";
              e.currentTarget.style.color = "#ff453a";
              e.currentTarget.style.transform = "scale(1)";
            }}
          >
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        {/* Tab Selection */}
        <div style={{ display: "flex", borderBottom: "1px solid rgba(255,255,255,0.08)", background: "rgba(0,0,0,0.2)" }}>
          <button
            type="button"
            style={{
              position: "relative",
              flex: 1,
              padding: "16px",
              background: connectTab === "fast" ? "rgba(255,255,255,0.03)" : "transparent",
              color: connectTab === "fast" ? "#fff" : "#666",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              letterSpacing: "1px",
              transition: "all 0.2s"
            }}
            onClick={() => setConnectTab("fast")}
          >
            FAST CONNECT
            {connectTab === "fast" && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(to right, #00ff55, #ffe600, #ff4400)" }} />
            )}
          </button>
          <button
            type="button"
            style={{
              position: "relative",
              flex: 1,
              padding: "16px",
              background: connectTab === "apikey" ? "rgba(255,255,255,0.03)" : "transparent",
              color: connectTab === "apikey" ? "#fff" : "#666",
              border: "none",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              letterSpacing: "1px",
              transition: "all 0.2s"
            }}
            onClick={() => setConnectTab("apikey")}
          >
            API KEY
            {connectTab === "apikey" && (
              <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: "2px", background: "linear-gradient(to right, #00ff55, #ffe600, #ff4400)" }} />
            )}
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "20px" }}>
          {connectTab === "fast" && (
            <div style={{ textAlign: "center", padding: "60px 10px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
              
              {/* Background ambient glow for the whole section */}
              <div style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "200px",
                height: "200px",
                background: "radial-gradient(circle, rgba(255,230,0,0.12) 0%, rgba(0,0,0,0) 70%)",
                filter: "blur(20px)",
                pointerEvents: "none"
              }}></div>

              <div style={{
                display: "inline-flex",
                padding: "16px",
                background: "linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.01))",
                borderRadius: "36px",
                boxShadow: "0 15px 35px rgba(0, 0, 0, 0.6), inset 0 1px 2px rgba(255, 255, 255, 0.2)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                position: "relative",
                backdropFilter: "blur(10px)"
              }}>
                {/* Intense glow just behind the button */}
                <div style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  transform: "translate(-50%, -50%)",
                  width: "100%",
                  height: "100%",
                  background: "radial-gradient(circle, rgba(255,230,0,0.25) 0%, rgba(0,0,0,0) 70%)",
                  filter: "blur(12px)",
                  zIndex: 0,
                  pointerEvents: "none"
                }}></div>

                <button
                  type="button"
                  onClick={handleFastConnect}
                  disabled={isConnecting}
                  title="Click to Connect with OKX App"
                  style={{
                    position: "relative",
                    zIndex: 1,
                    width: "72px",
                    height: "72px",
                    background: "linear-gradient(#000, #000) padding-box, linear-gradient(135deg, rgba(0,255,85,0.4), rgba(255,230,0,0.4), rgba(255,68,0,0.4)) border-box",
                    border: "1.5px solid transparent",
                    color: "#fff",
                    borderRadius: "22px",
                    cursor: isConnecting ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxShadow: "0 8px 25px rgba(0, 0, 0, 0.6), inset 0 2px 10px rgba(255, 255, 255, 0.1)",
                    transition: "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
                  }}
                  onMouseOver={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.transform = "translateY(-5px) scale(1.08)";
                      e.currentTarget.style.boxShadow = "0 15px 35px rgba(0, 0, 0, 0.8), inset 0 2px 10px rgba(255, 255, 255, 0.2)";
                      e.currentTarget.style.background = "linear-gradient(#0f0f0f, #0f0f0f) padding-box, linear-gradient(135deg, #00ff55, #ffe600, #ff4400) border-box";
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.transform = "translateY(0) scale(1)";
                      e.currentTarget.style.boxShadow = "0 8px 25px rgba(0, 0, 0, 0.6), inset 0 2px 10px rgba(255, 255, 255, 0.1)";
                      e.currentTarget.style.background = "linear-gradient(#000, #000) padding-box, linear-gradient(135deg, rgba(0,255,85,0.4), rgba(255,230,0,0.4), rgba(255,68,0,0.4)) border-box";
                    }
                  }}
                  onMouseDown={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.transform = "translateY(2px) scale(0.95)";
                      e.currentTarget.style.boxShadow = "0 4px 15px rgba(0, 0, 0, 0.4), inset 0 1px 5px rgba(255, 255, 255, 0.05)";
                    }
                  }}
                  onMouseUp={(e) => {
                    if (!isConnecting) {
                      e.currentTarget.style.transform = "translateY(-5px) scale(1.08)";
                      e.currentTarget.style.boxShadow = "0 15px 35px rgba(0, 0, 0, 0.8), inset 0 2px 10px rgba(255, 255, 255, 0.2)";
                    }
                  }}
                >
                  {isConnecting ? (
                    <span className="spinner" style={{ width: "30px", height: "30px", borderWidth: "3px" }}></span>
                  ) : (
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="url(#okx-grad)">
                      <defs>
                        <linearGradient id="okx-grad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                </button>
              </div>
            </div>
          )}

          {connectTab === "apikey" && (
            <form onSubmit={handleSubmitApiKey} style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
              <p style={{ color: "#aaa", fontSize: "13px", marginBottom: "5px", lineHeight: "1.4" }}>
                Nhập thông tin API Key OKX của bạn (cần phân quyền Read và Trade). Hệ thống sẽ quét kiểm tra ref và tài khoản phụ.
              </p>
              
              {errorMsg && (
                <div style={{ padding: "10px", background: "#3d1c1c", color: "#ff6b6b", borderRadius: "4px", fontSize: "13px", textAlign: "center" }}>
                  {errorMsg}
                </div>
              )}

              <div>
                <label style={{ display: "block", color: "#ccc", fontSize: "12px", marginBottom: "5px" }}>OKX UID:</label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value)}
                  placeholder="VD: 12345678"
                  style={{ width: "100%", padding: "10px", background: "#1e1e1e", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", fontSize: "12px", marginBottom: "5px" }}>API Key:</label>
                <input
                  type="text"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Nhập API Key..."
                  style={{ width: "100%", padding: "10px", background: "#1e1e1e", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", fontSize: "12px", marginBottom: "5px" }}>Khóa Bí Mật (Secret Key):</label>
                <input
                  type="password"
                  value={secretKey}
                  onChange={(e) => setSecretKey(e.target.value)}
                  placeholder="Nhập Secret Key..."
                  style={{ width: "100%", padding: "10px", background: "#1e1e1e", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", color: "#ccc", fontSize: "12px", marginBottom: "5px" }}>Cụm Mật Khẩu (Passphrase):</label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="Nhập Passphrase..."
                  style={{ width: "100%", padding: "10px", background: "#1e1e1e", border: "1px solid #444", color: "#fff", borderRadius: "4px" }}
                />
              </div>

              <button
                type="submit"
                disabled={isConnecting}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#28a745",
                  border: "none",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "15px",
                  fontWeight: "bold",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  marginTop: "10px"
                }}
              >
                {isConnecting ? "ĐANG KIỂM TRA..." : "LƯU VÀ KẾT NỐI"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
