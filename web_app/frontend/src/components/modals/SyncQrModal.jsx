import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";

export default function SyncQrModal({ isOpen, onClose, account, uid }) {
  const [qrUrl, setQrUrl] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(120);
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const generateNewCode = async () => {
    if (!uid || !account?.id) return;
    setIsLoading(true);
    setCopied(false);
    try {
      const res = await fetch("/api/auth/sync/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid, account_id: account.id }),
      });
      if (res.ok) {
        const data = await res.json();
        const code = data.code || "";
        setPairingCode(code);
        setTimeLeft(120);

        // Sinh link QR: quét bằng camera sẽ tự động mở trang web kèm mã ghép đôi
        const syncUrl = `${window.location.origin}/?sync_code=${encodeURIComponent(code)}`;
        const qrImg = await QRCode.toDataURL(syncUrl, {
          width: 240,
          margin: 2,
          color: {
            dark: "#0f172a",
            light: "#ffffff",
          },
        });
        setQrUrl(qrImg);
      }
    } catch (err) {
      console.error("Lỗi tạo mã QR đồng bộ:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      generateNewCode();
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setQrUrl("");
      setPairingCode("");
    }
  }, [isOpen, account?.id, uid]);

  useEffect(() => {
    if (!isOpen || timeLeft <= 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [isOpen, timeLeft]);

  const handleCopyCode = () => {
    if (!pairingCode) return;
    navigator.clipboard?.writeText(pairingCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const rawName = String(account?.name || account?.id || "").replace(/^#/, "");
  const isExpired = timeLeft <= 0;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 10000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: "360px",
          maxWidth: "94vw",
          background: "#18181b",
          border: "1px solid #334155",
          borderRadius: "12px",
          padding: "20px 22px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.7)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "14px",
          boxSizing: "border-box",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>🔗</span>
            <span style={{ fontSize: "14px", fontWeight: "700", color: "#f8fafc" }}>
              Đồng Bộ Thiết Bị (#{rawName})
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "#94a3b8",
              fontSize: "18px",
              cursor: "pointer",
              padding: "0 4px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Khung QR Code */}
        <div
          style={{
            position: "relative",
            width: "220px",
            height: "220px",
            background: "#ffffff",
            borderRadius: "10px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            border: isExpired ? "2px solid #ef4444" : "2px solid #38bdf8",
            boxShadow: isExpired ? "0 0 15px rgba(239, 68, 68, 0.2)" : "0 0 15px rgba(56, 189, 248, 0.25)",
            filter: isExpired ? "grayscale(100%) opacity(30%)" : "none",
            transition: "all 0.3s ease",
          }}
        >
          {isLoading ? (
            <span style={{ color: "#0f172a", fontSize: "13px", fontWeight: "600" }}>Đang tạo mã QR...</span>
          ) : qrUrl ? (
            <img src={qrUrl} alt="QR Code Đồng Bộ" style={{ width: "100%", height: "100%", display: "block" }} />
          ) : null}

          {/* Lớp phủ khi hết hạn */}
          {isExpired && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(15, 23, 42, 0.85)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
              }}
            >
              <span style={{ color: "#ef4444", fontSize: "12px", fontWeight: "700" }}>MÃ ĐÃ HẾT HẠN</span>
              <button
                type="button"
                onClick={generateNewCode}
                style={{
                  background: "#38bdf8",
                  border: "none",
                  color: "#0f172a",
                  fontSize: "12px",
                  fontWeight: "700",
                  padding: "6px 12px",
                  borderRadius: "6px",
                  cursor: "pointer",
                }}
              >
                🔄 Lấy mã mới
              </button>
            </div>
          )}
        </div>

        {/* Mã Ghép Đôi 6 số */}
        <div style={{ width: "100%", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: "600", textTransform: "uppercase" }}>
            HOẶC NHẬP MÃ GHÉP ĐÔI 6 SỐ
          </span>
          <div
            onClick={handleCopyCode}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              background: "#090d16",
              border: "1px solid #1e293b",
              borderRadius: "8px",
              padding: "8px 16px",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            title="Click để sao chép mã 6 số"
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "24px",
                fontWeight: "800",
                letterSpacing: "4px",
                color: isExpired ? "#64748b" : "#38bdf8",
              }}
            >
              {pairingCode ? `${pairingCode.slice(0, 3)} - ${pairingCode.slice(3)}` : "------"}
            </span>
            <span style={{ fontSize: "12px", color: copied ? "#4ade80" : "#64748b" }}>
              {copied ? "✓ Đã chép" : "📋"}
            </span>
          </div>
        </div>

        {/* Thanh đếm ngược 120s */}
        <div style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "11px" }}>
          <span style={{ color: "#94a3b8" }}>
            Hiệu lực: <strong style={{ color: timeLeft <= 30 ? "#ef4444" : "#f1f5f9" }}>{timeLeft}s</strong>
          </span>
          <button
            type="button"
            onClick={generateNewCode}
            style={{
              background: "transparent",
              border: "none",
              color: "#38bdf8",
              cursor: "pointer",
              fontSize: "11px",
              fontWeight: "600",
              textDecoration: "underline",
            }}
          >
            Tạo mã mới ngay
          </button>
        </div>

        {/* Hướng dẫn ngắn gọn */}
        <div
          style={{
            width: "100%",
            background: "rgba(56, 189, 248, 0.05)",
            border: "1px dashed rgba(56, 189, 248, 0.25)",
            borderRadius: "6px",
            padding: "8px 10px",
            fontSize: "10.5px",
            color: "#cbd5e1",
            lineHeight: "1.4",
            textAlign: "center",
          }}
        >
          Mở <strong>autotrader.fun</strong> trên máy 2 &gt; Bấm <strong>Connect</strong> &gt; Tab <strong>Đăng Nhập</strong> &gt; Quét QR hoặc gõ mã 6 số này.
        </div>
      </div>
    </div>
  );
}

