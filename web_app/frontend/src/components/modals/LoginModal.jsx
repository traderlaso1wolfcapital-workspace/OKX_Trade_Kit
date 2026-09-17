import React from "react";

export default function LoginModal({
  authStep,
  setAuthStep,
  loginUid,
  setLoginUid,
  adminPassword,
  setAdminPassword,
  adminConfirmPassword,
  setAdminConfirmPassword,
  loginPassphrase,
  setLoginPassphrase,
  loginError,
  setLoginError,
  isLoggingIn,
  handleLogin,
  audioRef,
}) {
  return (
    <div className="app-container" style={{ justifyContent: "center", alignItems: "center" }}>
      <audio ref={audioRef} src="/media/ribhavagrawal-hit-by-a-wood-230542.mp3" preload="auto"></audio>

      <div
        className="login-box"
        style={{
          background: "#262626",
          padding: "0 0 20px 0",
          borderRadius: "8px",
          border: "1px solid #444",
          width: "400px",
          textAlign: "center",
          boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
          overflow: "hidden",
        }}
      >
        <div style={{ background: "#000", padding: "10px", borderBottom: "1px solid #444", marginBottom: "20px" }}>
          <img src="/media/banner.png" alt="TLS1 TRADING SYSTEM" style={{ width: "100%", height: "auto", objectFit: "contain" }} />
        </div>

        <div style={{ padding: "0 20px" }}>
          <h3 style={{ color: "#e0e0e0", marginBottom: "15px", fontSize: "16px" }}>
            {authStep === "uid"
              ? "Nhập OKX UID của bạn:"
              : authStep === "create_password"
              ? `Thiết Lập Mật Khẩu (${loginUid}):`
              : authStep === "require_password"
              ? `Nhập Mật Khẩu (${loginUid}):`
              : "Nhập Mật Khẩu Passphrase:"}
          </h3>
          <form onSubmit={handleLogin}>
            {authStep === "uid" ? (
              <input
                type="text"
                placeholder="Ví dụ: 12345678"
                value={loginUid}
                onChange={(e) => setLoginUid(e.target.value)}
                style={{
                  width: "260px",
                  padding: "10px",
                  marginBottom: "15px",
                  background: "#1e1e1e",
                  border: "1px solid #555",
                  color: "#fff",
                  borderRadius: "6px",
                  fontSize: "14px",
                  textAlign: "center",
                }}
              />
            ) : authStep === "create_password" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#00ffff", maxWidth: "340px", lineHeight: "1.4", textAlign: "center" }}>
                  🛡️ Lần đầu đăng nhập! Vui lòng đặt mật khẩu bảo vệ để đăng nhập an toàn trên mọi thiết bị.
                </div>
                <input
                  type="password"
                  placeholder="Mật khẩu mới (tối thiểu 4 ký tự)"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  style={{
                    width: "260px",
                    padding: "10px",
                    background: "#1e1e1e",
                    border: "1px solid #555",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                />
                <input
                  type="password"
                  placeholder="Xác nhận lại mật khẩu"
                  value={adminConfirmPassword}
                  onChange={(e) => setAdminConfirmPassword(e.target.value)}
                  style={{
                    width: "260px",
                    padding: "10px",
                    background: "#1e1e1e",
                    border: "1px solid #555",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("uid");
                    setAdminPassword("");
                    setAdminConfirmPassword("");
                    setLoginError("");
                  }}
                  style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Quay lại
                </button>
              </div>
            ) : authStep === "require_password" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <div style={{ fontSize: "12px", color: "#aaaaaa", marginBottom: "2px" }}>
                  Nhập mật khẩu tài khoản đã tạo để tiếp tục:
                </div>
                <input
                  type="password"
                  placeholder="Nhập mật khẩu của bạn"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  autoFocus
                  style={{
                    width: "260px",
                    padding: "10px",
                    background: "#1e1e1e",
                    border: "1px solid #555",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "14px",
                    textAlign: "center",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("uid");
                    setAdminPassword("");
                    setLoginError("");
                  }}
                  style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "13px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Quay lại
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", marginBottom: "15px" }}>
                <input
                  type="password"
                  placeholder="Mật khẩu Passphrase"
                  value={loginPassphrase}
                  onChange={(e) => setLoginPassphrase(e.target.value)}
                  style={{
                    width: "200px",
                    padding: "10px",
                    background: "#1e1e1e",
                    border: "1px solid #555",
                    color: "#fff",
                    borderRadius: "6px",
                    fontSize: "15px",
                    textAlign: "center",
                  }}
                />
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("uid");
                    setLoginPassphrase("");
                    setLoginError("");
                  }}
                  style={{ background: "transparent", border: "none", color: "#58a6ff", fontSize: "14px", cursor: "pointer", textDecoration: "underline" }}
                >
                  Quay lại
                </button>
              </div>
            )}
            {loginError && (
              <div style={{ color: "#ff3333", fontSize: "14px", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>
                {loginError}
              </div>
            )}
            <button
              type="submit"
              disabled={
                isLoggingIn ||
                (authStep === "uid"
                  ? !loginUid
                  : authStep === "create_password"
                  ? !adminPassword || !adminConfirmPassword
                  : authStep === "require_password"
                  ? !adminPassword
                  : !loginPassphrase)
              }
              style={{
                width: "100%",
                padding: "12px",
                background: "#ff9900",
                border: "none",
                borderRadius: "6px",
                fontWeight: "bold",
                cursor: "pointer",
                color: "#000",
                fontSize: "16px",
                transition: "0.2s",
              }}
            >
              {isLoggingIn
                ? "Đang kiểm tra..."
                : authStep === "create_password"
                ? "Thiết Lập Mật Khẩu & Đăng Nhập"
                : "Đăng Nhập"}
            </button>
          </form>

          <div style={{ marginTop: "20px", textAlign: "left", fontSize: "12px", color: "#aaaaaa", lineHeight: "1.6" }}>
            <p style={{ color: "#27ae60", fontWeight: "bold", margin: "0 0 5px 0", fontSize: "14px" }}>
              ✅ ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:
            </p>
            <p style={{ margin: "0 0 5px 0" }}>
              1. Đăng ký tài khoản OKX dưới Link Ref của cộng đồng TLS1, mã ref:{" "}
              <strong
                style={{ color: "#00ffff", cursor: "pointer" }}
                onClick={() => {
                  navigator.clipboard.writeText("HoanPhiTLS1");
                  alert("✅ Đã Copy Mã Ref!");
                }}
              >
                HoanPhiTLS1
              </strong>
            </p>
            <p style={{ margin: "0 0 15px 0" }}>2. Hoặc thực hiện chuyển Ref về TLS1 nếu đã có sẵn tài khoản OKX.</p>

            <div style={{ display: "flex", gap: "10px", marginBottom: "15px" }}>
              <button
                onClick={() => window.open("https://www.okx.com/join/HoanPhiTLS1", "_blank")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "transparent",
                  border: "1px solid #555",
                  color: "#58a6ff",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Đăng ký OKX (VIP)
              </button>
              <button
                onClick={() => window.open("https://t.me/traderlaso1/6758", "_blank")}
                style={{
                  flex: 1,
                  padding: "8px",
                  background: "transparent",
                  border: "1px solid #555",
                  color: "#58a6ff",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "bold",
                }}
              >
                Hướng dẫn chuyển Ref
              </button>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px",
                border: "1px solid #444",
                borderRadius: "6px",
                background: "#262626",
              }}
            >
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>Liên hệ Admin:</span>
              <div style={{ display: "flex", gap: "12px" }}>
                <img
                  src="/media/Telegram.png"
                  alt="Telegram"
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                  onClick={() => window.open("https://t.me/baotran_tls1", "_blank")}
                />
                <img
                  src="/media/Messenger.png"
                  alt="Messenger"
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                  onClick={() => window.open("https://www.facebook.com/baotran.tls1/", "_blank")}
                />
                <img
                  src="/media/zalo.png"
                  alt="Zalo"
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                  onClick={() => window.open("zalo://conversation?phone=84377333096", "_blank")}
                />
                <img
                  src="/media/Discord.png"
                  alt="Discord"
                  style={{ width: "24px", height: "24px", cursor: "pointer" }}
                  onClick={() => window.open("https://discord.gg/8NXaSCvZ6u", "_blank")}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
