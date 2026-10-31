import React from 'react';

export function AddAccountModal({
  isOpen,
  onClose,
  value,
  onChange,
  isLoading,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="account-prompt-card">
        <div className="account-prompt-title">➕ Tạo Tài Khoản Mới</div>
        <div style={{ color: "#aaa", fontSize: "12px", marginBottom: "12px", marginTop: "4px" }}>
          Nhập tên tài khoản bạn muốn tạo:
        </div>
        <input
          type="text"
          className="styled-input"
          placeholder="Ví dụ: Tài khoản phụ 2, Quỹ A, v.v..."
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={e => {
            if (e.key === "Enter") onConfirm();
            if (e.key === "Escape") onClose();
          }}
          autoFocus
          style={{
            width: "100%",
            padding: "8px 10px",
            fontSize: "13px",
            backgroundColor: "#1e1e1e",
            color: "#ffffff",
            border: "1px solid #555555",
            borderRadius: "4px",
            boxSizing: "border-box"
          }}
        />
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", marginTop: "16px" }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            style={{
              padding: "7px 15px",
              background: "#333333",
              border: "1px solid #555555",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              padding: "7px 18px",
              background: isLoading ? "#1e7e34" : "#28a745",
              border: "none",
              borderRadius: "4px",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: isLoading ? "wait" : "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "125px"
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang tạo...
              </>
            ) : (
              "Tạo Tài Khoản"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function DeleteAccountModal({
  isOpen,
  onClose,
  accountName,
  isMultiple,
  isLoading,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && !isLoading && onClose()}>
      <div className="account-prompt-card">
        <div className="account-prompt-title" style={{ color: "#ff4d4f" }}>🗑️ Xóa Tài Khoản</div>
        <div style={{ color: "#dddddd", fontSize: "13px", margin: "14px 0 6px 0", lineHeight: "1.5" }}>
          Bạn có chắc chắn muốn xóa tài khoản <strong style={{ color: "#ffffff" }}>"{accountName}"</strong>?
        </div>
        <div style={{ color: "#888888", fontSize: "12px", marginBottom: "16px", lineHeight: "1.4" }}>
          {isMultiple
            ? "Tài khoản này cùng toàn bộ API Key liên kết sẽ bị xóa khỏi hệ thống."
            : "Đây là tài khoản duy nhất. Xác nhận xóa sẽ làm sạch toàn bộ API Key và đưa tài khoản về mặc định ban đầu."}
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            style={{
              padding: "7px 15px",
              background: "#333333",
              border: "1px solid #555555",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              padding: "7px 18px",
              background: isLoading ? "#882222" : "#dc3545",
              border: "none",
              borderRadius: "4px",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: isLoading ? "wait" : "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "130px"
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang xóa...
              </>
            ) : (
              "Xác Nhận Xóa"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmLogoutModal({
  isOpen,
  onClose,
  uid,
  isLoading,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && !isLoading && onClose()}>
      <div className="account-prompt-card" style={{ maxWidth: "420px" }}>
        <div className="account-prompt-title" style={{ color: "#ff4d4f", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🚪</span> Xác Nhận Đăng Xuất
        </div>
        <div style={{ color: "#dddddd", fontSize: "13px", margin: "14px 0 10px 0", lineHeight: "1.5" }}>
          Bạn có chắc chắn muốn đăng xuất tài khoản <strong style={{ color: "#ffffff" }}>UID: {uid || "Hiện tại"}</strong> không?
        </div>
        <div style={{ 
          background: "rgba(255, 77, 79, 0.08)", 
          border: "1px solid rgba(255, 77, 79, 0.25)", 
          borderRadius: "6px", 
          padding: "10px 12px", 
          color: "#d0d0d0", 
          fontSize: "12px", 
          lineHeight: "1.6",
          marginBottom: "16px" 
        }}>
          <div style={{ color: "#ff7875", fontWeight: "bold", marginBottom: "4px" }}>⚠️ Thao tác này sẽ thực hiện:</div>
          <div>• <strong>Dừng toàn bộ Bot</strong> đang chạy thuộc UID này.</div>
          <div>• <strong>Xóa toàn bộ tài khoản</strong> & API Key đã kết nối trên máy.</div>
          <div>• Hủy toàn bộ lệnh Limit chờ; <strong style={{ color: "#52c41a" }}>vị thế & TP/SL đã có vẫn bảo lưu 100%</strong> trên sàn OKX.</div>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            style={{
              padding: "7px 15px",
              background: "#333333",
              border: "1px solid #555555",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              padding: "7px 18px",
              background: isLoading ? "#882222" : "#dc3545",
              border: "none",
              borderRadius: "4px",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: isLoading ? "wait" : "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "155px"
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang đăng xuất...
              </>
            ) : (
              "Xác Nhận Đăng Xuất"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ConfirmStopBotModal({
  isOpen,
  onClose,
  botName,
  accountName,
  isLoading,
  onConfirm
}) {
  if (!isOpen) return null;

  return (
    <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && !isLoading && onClose()}>
      <div className="account-prompt-card" style={{ maxWidth: "420px" }}>
        <div className="account-prompt-title" style={{ color: "#fa8c16", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🛑</span> Xác Nhận Dừng Bot
        </div>
        <div style={{ color: "#dddddd", fontSize: "13px", margin: "14px 0 10px 0", lineHeight: "1.5" }}>
          Bạn có chắc chắn muốn dừng <strong style={{ color: "#26a69a" }}>{botName}</strong> trên tài khoản <strong style={{ color: "#ffffff" }}>"{accountName}"</strong> không?
        </div>
        <div style={{ 
          background: "rgba(250, 140, 22, 0.08)", 
          border: "1px solid rgba(250, 140, 22, 0.25)", 
          borderRadius: "6px", 
          padding: "10px 12px", 
          color: "#d0d0d0", 
          fontSize: "12px", 
          lineHeight: "1.6",
          marginBottom: "16px" 
        }}>
          <div>• Bot sẽ dừng tính toán và ngưng vào thêm lệnh mới.</div>
          <div>• Tự động quét và <strong>hủy các lệnh Limit chờ khớp</strong> trên OKX.</div>
          <div style={{ color: "#52c41a" }}>• <strong>Bảo lưu 100%</strong> các vị thế đang mở và lệnh TP/SL đã đặt trên sàn.</div>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            style={{
              padding: "7px 15px",
              background: "#333333",
              border: "1px solid #555555",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: isLoading ? "not-allowed" : "pointer",
              fontSize: "12px",
              fontWeight: "bold",
              opacity: isLoading ? 0.6 : 1
            }}
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isLoading}
            onClick={onConfirm}
            style={{
              padding: "7px 18px",
              background: isLoading ? "#873800" : "#d46b08",
              border: "none",
              borderRadius: "4px",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: isLoading ? "wait" : "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              minWidth: "145px"
            }}
          >
            {isLoading ? (
              <>
                <span className="spinner" style={{ width: "12px", height: "12px", marginRight: "6px" }}></span> Đang dừng bot...
              </>
            ) : (
              "Xác Nhận Dừng"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ApiPermissionErrorModal({
  isOpen,
  onClose,
  accountName,
  onSwitchToFastConnect
}) {
  if (!isOpen) return null;

  return (
    <div className="account-prompt-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="account-prompt-card" style={{ maxWidth: "460px", width: "100%" }}>
        <div className="account-prompt-title" style={{ color: "#ff4d4f", display: "flex", alignItems: "center", gap: "8px" }}>
          <span>🚨</span> Lỗi Quyền API Key (Mã: 50123)
        </div>
        
        <div style={{ color: "#dddddd", fontSize: "13px", margin: "12px 0 8px 0", lineHeight: "1.5" }}>
          Sàn OKX từ chối đặt lệnh cho tài khoản <strong style={{ color: "#ffc107" }}>"{accountName || "Hiện tại"}"</strong> do API Key chưa đủ quyền giao dịch hoặc đã hết hạn.
        </div>

        <div style={{
          background: "rgba(255, 77, 79, 0.08)",
          border: "1px solid rgba(255, 77, 79, 0.25)",
          borderRadius: "6px",
          padding: "10px 12px",
          color: "#d0d0d0",
          fontSize: "12px",
          lineHeight: "1.6",
          marginBottom: "14px"
        }}>
          <div style={{ color: "#ff7875", fontWeight: "bold", marginBottom: "4px" }}>📌 3 Nguyên nhân chính (Phía cấu hình API Key):</div>
          <div>1. Khi tạo API Key thủ công chưa tick chọn quyền <strong>"Giao dịch" (Trade)</strong>.</div>
          <div>2. Không gán địa chỉ IP Whitelist nên OKX <strong>tự động khóa quyền Giao dịch sau 14 ngày</strong>.</div>
          <div>3. Hoặc địa chỉ IP mạng máy/điện thoại chạy bot bị thay đổi (lệch IP đã đăng ký).</div>
        </div>

        <div style={{
          background: "rgba(38, 166, 154, 0.08)",
          border: "1px solid rgba(38, 166, 154, 0.3)",
          borderRadius: "6px",
          padding: "10px 12px",
          color: "#d0d0d0",
          fontSize: "12px",
          lineHeight: "1.6",
          marginBottom: "16px"
        }}>
          <div style={{ color: "#26a69a", fontWeight: "bold", marginBottom: "4px" }}>💡 Cách xử lý nhanh nhất:</div>
          <div>Chuyển sang <strong>Fast Connect (Quét mã QR)</strong>: Hệ thống sẽ tự động cấp quyền Giao dịch vĩnh viễn, không lo lệch IP hay bị khóa sau 14 ngày!</div>
        </div>

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "7px 15px",
              background: "#333333",
              border: "1px solid #555555",
              borderRadius: "4px",
              color: "#cccccc",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold"
            }}
          >
            Đã Hiểu / Đóng
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onSwitchToFastConnect) onSwitchToFastConnect();
            }}
            style={{
              padding: "7px 18px",
              background: "#26a69a",
              border: "none",
              borderRadius: "4px",
              color: "#ffffff",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "12px",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            ⚡ Đổi sang Fast Connect
          </button>
        </div>
      </div>
    </div>
  );
}



export function VolumeRequirementModal({
  isOpen,
  onClose,
  uid,
  currentVolume = 0,
  requiredVolume = 20000,
  missingVolume = 20000,
  isUnderRef = true,
  hwid
}) {
  const [showTransferGuide, setShowTransferGuide] = React.useState(false);
  if (!isOpen) return null;

  const curVol = Number(currentVolume) || 0;
  const reqVol = Number(requiredVolume) || 20000;
  const missVol = Number(missingVolume) || Math.max(0, reqVol - curVol);
  const percent = Math.min(100, Math.max(0, (curVol / reqVol) * 100));
  const displayHwid = hwid || localStorage.getItem("tls1_hwid") || "WEB-K8LNRF";

  const copyToClipboard = (text, alertMsg) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text);
      } else {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      alert(alertMsg);
    } catch {
      prompt("Copy nội dung bên dưới:", text);
    }
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
        backgroundColor: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "max(82px, 9.2vh)",
        paddingBottom: "24px",
        zIndex: 99999,
        boxSizing: "border-box"
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="modal-content settings-modal"
        style={{
          width: "560px",
          maxWidth: "95vw",
          backgroundColor: "#1e1e1e",
          border: "1px solid #333333",
          borderRadius: "8px",
          boxShadow: "0 16px 48px rgba(0, 0, 0, 0.85)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "fadeIn 0.15s ease-out"
        }}
      >
        {/* Header Modal - Chuẩn 100% SystemSettingsModal */}
        <div
          className="modal-header"
          style={{
            backgroundColor: "#242424",
            borderBottom: "1px solid #333333",
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between"
          }}
        >
          <h3 style={{ fontSize: "13.5px", fontWeight: "bold", color: "#ffffff", margin: 0, display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ color: isUnderRef ? "#ffaa00" : "#ff4d4f" }}>{isUnderRef ? "⚡" : "⚠️"}</span>
            <span>{isUnderRef ? "Điều Kiện Volume 14 Ngày" : "Chưa Đăng Ký Link Ref"}</span>
            {isUnderRef && uid && (
              <span style={{ color: "#00ffff", fontSize: "12px", fontStyle: "italic", fontWeight: "normal", fontFamily: "Consolas, monospace", marginLeft: "4px" }}>
                (UID: {uid})
              </span>
            )}
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              type="button"
              onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U&list=PLdzvL_bHCpls&index=2", "_blank")}
              style={{
                background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
                border: "1px solid #6366f1",
                color: "#ffffff",
                fontSize: "11px",
                fontWeight: 700,
                padding: "3px 9px",
                borderRadius: "4px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                boxShadow: "0 1px 6px rgba(79, 70, 229, 0.4)"
              }}
            >
              Hướng Dẫn
            </button>
            <button
              className="close-btn"
              onClick={onClose}
              title="Đóng"
              style={{
                background: "transparent",
                border: "none",
                color: "#888888",
                fontSize: "20px",
                cursor: "pointer",
                lineHeight: 1,
                padding: 0
              }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: "16px", overflowY: "auto", maxHeight: "calc(80vh - 90px)" }}>
          
          {/* ============================================================== */}
          {/* TRƯỜNG HỢP 1: CHƯA THUỘC LINK REF (BẾ NGUYÊN GIAO DIỆN HỖ TRỢ) */}
          {/* ============================================================== */}
          {!isUnderRef ? (
            <div>
              <div
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  borderRadius: "6px",
                  padding: "10px 12px",
                  fontSize: "12.5px",
                  color: "#fca5a5",
                  marginBottom: "12px"
                }}
              >
                ⚠️ Tài khoản <strong style={{ color: "#ffffff", fontFamily: "Consolas, monospace" }}>UID: {uid || "Hiện tại"}</strong> chưa thuộc hệ thống Ref của AutoTrader.fun.
              </div>

              {/* Khung viền xám bên trong chuẩn như ảnh chụp */}
              <div
                style={{
                  border: "1px solid #383838",
                  borderRadius: "8px",
                  background: "#1e1e1e",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#aaaaaa",
                  lineHeight: "1.6"
                }}
              >
                <p style={{ color: "#27ae60", fontWeight: "bold", margin: "0 0 6px 0", fontSize: "14px" }}>
                  ĐIỀU KIỆN ĐỂ SỬ DỤNG APP:
                </p>
                <p style={{ margin: "0 0 6px 0" }}>
                  1. Đăng ký tài khoản OKX dưới Link giới thiệu của AutoTrader.fun
                </p>
                <p style={{ margin: "0 0 14px 0" }}>
                  2. Hoặc thực hiện chuyển Ref về AutoTrader.fun nếu đã có sẵn tài khoản OKX.
                </p>

                {/* 2 Nút giữ nguyên màu sắc nổi bật */}
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={() => window.open("https://okx.com/join/AutoTrader", "_blank")}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                      border: "1px solid #10b981",
                      color: "#ffffff",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(16, 185, 129, 0.25)"
                    }}
                  >
                    Đăng ký OKX (VIP)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowTransferGuide(!showTransferGuide)}
                    style={{
                      flex: 1,
                      padding: "9px 12px",
                      background: showTransferGuide ? "#2d3748" : "#1f2937",
                      border: "1px solid #3b82f6",
                      color: "#60a5fa",
                      borderRadius: "6px",
                      cursor: "pointer",
                      fontSize: "14px",
                      fontWeight: "bold",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "6px"
                    }}
                  >
                    Hướng dẫn chuyển Ref {showTransferGuide ? "▲" : "▼"}
                  </button>
                </div>

                {/* Chi tiết Hướng dẫn chuyển Ref */}
                {showTransferGuide && (
                  <div
                    style={{
                      marginTop: "12px",
                      background: "#161b22",
                      border: "1px solid #30363d",
                      borderRadius: "6px",
                      padding: "12px 14px",
                      fontSize: "12px",
                      color: "#bbbbbb",
                      lineHeight: "1.6"
                    }}
                  >
                    <div style={{ marginBottom: "10px", paddingBottom: "10px", borderBottom: "1px solid #2a2a2a" }}>
                      <strong style={{ color: "#26a69a", display: "block", marginBottom: "4px" }}>
                        Cách 1: Chuyển Ref (Tài khoản OKX đã có sẵn)
                      </strong>
                      <div>1. Truy cập link: <a href="https://www.okx.com/ul/J6l2R5" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff", textDecoration: "none" }}>https://www.okx.com/ul/J6l2R5</a></div>
                      <div>2. Điền form yêu cầu:</div>
                      <div style={{ paddingLeft: "12px", margin: "4px 0" }}>
                        • Mã mời: <strong style={{ color: "#00ffff", cursor: "pointer" }} onClick={() => copyToClipboard("AutoTrader", "Đã copy Mã mời: AutoTrader")}>AutoTrader</strong> (Bấm để copy)<br />
                        • Lý do: <em style={{ color: "#e6edf3", cursor: "pointer" }} onClick={() => copyToClipboard("I was invited by an affiliate but forgot to add the code when signing up", "Đã copy Lý do tham gia!")}>"I was invited by an affiliate but forgot to add the code when signing up"</em>
                      </div>
                      <div>3. Nhấn Submit và chờ OKX duyệt.</div>
                    </div>
                    <div>
                      <strong style={{ color: "#26a69a", display: "block", marginBottom: "4px" }}>
                        Cách 2: Đóng tài khoản cũ & Tạo tài khoản mới
                      </strong>
                      <div>1. Đóng tài khoản cũ: <strong>Thông tin tài khoản &gt; Bảo mật &gt; Đóng tài khoản</strong>.</div>
                      <div>2. Đăng ký tài khoản mới qua link: <a href="https://okx.com/join/AutoTrader" target="_blank" rel="noopener noreferrer" style={{ color: "#58a6ff" }}>https://okx.com/join/AutoTrader</a></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Thanh Liên hệ Admin (4 icon chính hãng chuẩn ảnh mẫu) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  border: "1px solid #444444",
                  borderRadius: "6px",
                  background: "#262626",
                  marginBottom: "16px"
                }}
              >
                <span style={{ fontSize: "12px", fontWeight: "bold", color: "#eeeeee" }}>Liên hệ Admin:</span>
                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                  <img
                    src="/media/Telegram.png"
                    alt="Telegram"
                    title="Telegram Admin"
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                    onClick={() => window.open("https://t.me/baotran_tls1", "_blank")}
                  />
                  <img
                    src="/media/Messenger.png"
                    alt="Messenger"
                    title="Facebook Messenger"
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                    onClick={() => window.open("https://www.facebook.com/baotran.tls1/", "_blank")}
                  />
                  <img
                    src="/media/zalo.png"
                    alt="Zalo"
                    title="Zalo Admin"
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                    onClick={() => window.open("zalo://conversation?phone=84377333096", "_blank")}
                  />
                  <img
                    src="/media/Discord.png"
                    alt="Discord"
                    title="Discord Community"
                    style={{ width: "24px", height: "24px", cursor: "pointer" }}
                    onClick={() => window.open("https://discord.gg/8NXaSCvZ6u", "_blank")}
                  />
                </div>
              </div>

              {/* Đáy Modal: Chỉ có Nút Đóng theo yêu cầu CEO (Đã bỏ nút Giao dịch OKX) */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid #333333",
                  paddingTop: "14px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#888888" }}>
                  <span>Mã Máy của bạn:</span>
                  <span style={{ color: "#00ffff", fontWeight: "bold", fontFamily: "Consolas, monospace", fontSize: "13px" }}>
                    {displayHwid}
                  </span>
                  <button
                    type="button"
                    onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U", "_blank")}
                    style={{
                      background: "#1e3a5f",
                      border: "1px solid #2563eb",
                      color: "#ffffff",
                      borderRadius: "4px",
                      padding: "2px 10px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Hướng Dẫn
                  </button>
                </div>
                <div>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: "#262626",
                      border: "1px solid #444444",
                      color: "#cccccc",
                      padding: "7px 24px",
                      borderRadius: "4px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* ============================================================== */
            /* TRƯỜNG HỢP 2: ĐÃ THUỘC REF NHƯNG CHƯA ĐỦ 20K VOLUME 14 NGÀY     */
            /* ============================================================== */
            <div>
              <div
                style={{
                  border: "1px solid #383838",
                  borderRadius: "8px",
                  background: "#1e1e1e",
                  padding: "14px 16px",
                  marginBottom: "16px",
                  textAlign: "left",
                  fontSize: "12px",
                  color: "#aaaaaa",
                  lineHeight: "1.6"
                }}
              >
                {/* 3 Ô Thống kê Volume */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                  <div style={{ background: "#161616", border: "1px solid #333333", borderRadius: "6px", padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#888888", marginBottom: "4px" }}>Volume Hiện Tại</div>
                    <div style={{ fontFamily: "Consolas, monospace", fontSize: "14px", fontWeight: "bold", color: "#00ffff" }}>
                      {curVol.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} $
                    </div>
                  </div>
                  <div style={{ background: "#161616", border: "1px solid #333333", borderRadius: "6px", padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#888888", marginBottom: "4px" }}>Volume Mục Tiêu</div>
                    <div style={{ fontFamily: "Consolas, monospace", fontSize: "14px", fontWeight: "bold", color: "#ffaa00" }}>
                      {reqVol.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} $
                    </div>
                  </div>
                  <div style={{ background: "#161616", border: "1px solid #333333", borderRadius: "6px", padding: "10px 8px", textAlign: "center" }}>
                    <div style={{ fontSize: "11px", color: "#888888", marginBottom: "4px" }}>Volume Còn Thiếu</div>
                    <div style={{ fontFamily: "Consolas, monospace", fontSize: "14px", fontWeight: "bold", color: missVol > 0 ? "#ff4d4f" : "#27ae60" }}>
                      {missVol.toLocaleString("en-US", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} $
                    </div>
                  </div>
                </div>

                {/* Thanh tiến độ 14 ngày */}
                <div style={{ background: "#161616", border: "1px solid #333333", borderRadius: "6px", padding: "10px 14px", marginBottom: "14px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11.5px", marginBottom: "6px" }}>
                    <span style={{ color: "#aaaaaa" }}>Tiến độ 14 ngày gần nhất</span>
                    <span style={{ color: "#27ae60", fontWeight: "bold", fontFamily: "Consolas, monospace" }}>{percent.toFixed(1)}%</span>
                  </div>
                  <div style={{ background: "#111111", height: "8px", borderRadius: "4px", overflow: "hidden", border: "1px solid #282828" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${percent}%`,
                        background: "linear-gradient(90deg, #00ffff 0%, #27ae60 100%)",
                        borderRadius: "4px",
                        transition: "width 0.3s ease"
                      }}
                    />
                  </div>
                </div>

                {/* Dòng nhắc nhở */}
                <div style={{ fontSize: "11.5px", color: "#888888", lineHeight: "1.6", marginBottom: "8px" }}>
                  <div>• Tự động tính gộp Volume cả tài khoản chính & phụ.</div>
                  <div>• Ngay khi đủ Volume trên OKX, Bot sẽ tự động mở khóa.</div>
                </div>

                {/* Công thức tính Volume */}
                <div
                  style={{
                    background: "#161616",
                    border: "1px dashed #383838",
                    borderRadius: "6px",
                    padding: "9px 12px",
                    fontSize: "11.5px",
                    color: "#bbbbbb",
                    marginTop: "10px",
                    lineHeight: "1.5"
                  }}
                >
                  💡 <strong style={{ color: "#00ffff" }}>Cách tính Volume:</strong> Volume = Ký quỹ &times; Đòn bẩy &times; 2 (tính cả mở & đóng lệnh).<br />
                  <em>Ví dụ: Chỉ cần 1 lệnh ký quỹ <strong style={{ color: "#ffffff" }}>100 $</strong> đòn bẩy <strong style={{ color: "#ffffff" }}>x100</strong> (mở 10,000 $ + đóng 10,000 $) là đã đạt đủ <strong style={{ color: "#27ae60" }}>20,000 $</strong> Volume!</em>
                </div>
              </div>

              {/* Đáy Modal: Mã Máy + Nút Đóng & Nút Giao Dịch OKX */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderTop: "1px solid #333333",
                  paddingTop: "14px"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "12px", color: "#888888" }}>
                  <span>Mã Máy của bạn:</span>
                  <span style={{ color: "#00ffff", fontWeight: "bold", fontFamily: "Consolas, monospace", fontSize: "13px" }}>
                    {displayHwid}
                  </span>
                  <button
                    type="button"
                    onClick={() => window.open("https://www.youtube.com/watch?v=4GfuqIcKf4U", "_blank")}
                    style={{
                      background: "#1e3a5f",
                      border: "1px solid #2563eb",
                      color: "#ffffff",
                      borderRadius: "4px",
                      padding: "2px 10px",
                      fontSize: "11px",
                      fontWeight: "bold",
                      cursor: "pointer"
                    }}
                  >
                    Hướng Dẫn
                  </button>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    type="button"
                    onClick={onClose}
                    style={{
                      background: "#262626",
                      border: "1px solid #444444",
                      color: "#cccccc",
                      padding: "7px 18px",
                      borderRadius: "4px",
                      fontSize: "12.5px",
                      fontWeight: 600,
                      cursor: "pointer"
                    }}
                  >
                    Đóng
                  </button>
                  <button
                    type="button"
                    onClick={() => window.open("https://www.okx.com/trade-swap", "_blank")}
                    style={{
                      background: "#0284c7",
                      border: "none",
                      color: "#ffffff",
                      padding: "7px 18px",
                      borderRadius: "4px",
                      fontSize: "12.5px",
                      fontWeight: "bold",
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      boxShadow: "0 2px 8px rgba(2, 132, 199, 0.35)"
                    }}
                  >
                    <span>Giao Dịch OKX</span>
                    <span>➔</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
