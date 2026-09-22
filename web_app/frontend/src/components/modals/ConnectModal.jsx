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
      <div className="modal-content" style={{ maxWidth: "450px", padding: "0" }}>
        {/* Modal Header */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #333", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: "18px", color: "#e0e0e0", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            🔗 KẾT NỐI TÀI KHOẢN OKX
          </h2>
          <button className="btn-close" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Tab Selection */}
        <div style={{ display: "flex", borderBottom: "1px solid #333" }}>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px",
              background: connectTab === "fast" ? "#2a2a2a" : "transparent",
              color: connectTab === "fast" ? "#fff" : "#888",
              border: "none",
              borderBottom: connectTab === "fast" ? "2px solid #58a6ff" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
            onClick={() => setConnectTab("fast")}
          >
            🚀 FAST CONNECT
          </button>
          <button
            type="button"
            style={{
              flex: 1,
              padding: "12px",
              background: connectTab === "apikey" ? "#2a2a2a" : "transparent",
              color: connectTab === "apikey" ? "#fff" : "#888",
              border: "none",
              borderBottom: connectTab === "apikey" ? "2px solid #58a6ff" : "2px solid transparent",
              cursor: "pointer",
              fontWeight: "bold",
              fontSize: "14px"
            }}
            onClick={() => setConnectTab("apikey")}
          >
            🔑 NHẬP API KEY
          </button>
        </div>

        {/* Tab Content */}
        <div style={{ padding: "20px" }}>
          {connectTab === "fast" && (
            <div style={{ textAlign: "center" }}>
              <p style={{ color: "#aaa", fontSize: "14px", marginBottom: "20px", lineHeight: "1.5" }}>
                Kết nối nhanh chóng và an toàn bằng OKX OAuth. Hệ thống sẽ tự động tạo kết nối API cho bạn (yêu cầu xác thực trên app OKX).
              </p>
              <button
                type="button"
                onClick={handleFastConnect}
                disabled={isConnecting}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#1e3a5f",
                  border: "1px solid #58a6ff",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: isConnecting ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "10px"
                }}
              >
                {isConnecting ? (
                  <><span className="spinner" style={{ width: "16px", height: "16px" }}></span> ĐANG KẾT NỐI...</>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="0" y="0" width="7" height="7" rx="1" />
                      <rect x="17" y="0" width="7" height="7" rx="1" />
                      <rect x="8.5" y="8.5" width="7" height="7" rx="1" />
                      <rect x="0" y="17" width="7" height="7" rx="1" />
                      <rect x="17" y="17" width="7" height="7" rx="1" />
                    </svg>
                    OKX FAST CONNECT
                  </>
                )}
              </button>
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
