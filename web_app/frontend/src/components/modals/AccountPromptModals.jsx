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
