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
