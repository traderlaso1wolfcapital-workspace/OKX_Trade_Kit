import React, { useState, useEffect } from "react";
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
  accounts = [],
  selectedAccount = "",
  activeBotTab = "sub1",
  onAssignAccount,
  onCreateAccount,
  onDeleteAccount,
  activeAccounts = {},
  botAccountMap = {},
  apiKey = "",
  setApiKey,
  secretKey = "",
  setSecretKey,
  passphrase = "",
  setPassphrase,
  isSavingConfig = false,
  accountName = "",
  onDisconnectAccount,
  onLogout,
}) {
  const { t } = useTranslation();
  const [connectTab, setConnectTab] = useState("fast"); // 'fast' | 'apikey'

  useEffect(() => {
    if (!isOpen) return;
    if (!selectedAccount) {
      if (setApiKey) setApiKey("");
      if (setSecretKey) setSecretKey("");
      if (setPassphrase) setPassphrase("");
      return;
    }
    const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
    fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${selectedAccount}&uid=${curUid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          if (setApiKey && d.api_key !== undefined) setApiKey(d.api_key || "");
          if (setSecretKey && d.secret_key !== undefined) setSecretKey(d.secret_key || "");
          if (setPassphrase && d.passphrase !== undefined) setPassphrase(d.passphrase || "");
        }
      })
      .catch(() => {});
  }, [isOpen, selectedAccount, activeBotTab]);

  if (!isOpen) return null;

  const getBotTitle = () => {
    if (activeBotTab === "sub1") return t("bot_ema200") || "EMA200 Bot";
    if (activeBotTab === "sub2") return t("bot_smc") || "SMC Bot";
    return t("bot_liquidation") || "Liquidation Bot";
  };
  const botTitle = getBotTitle();

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
          maxWidth: "460px",
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
          .connect-card:hover:not(.disabled) .connect-action-badge:not(.connected) {
            background-color: #26a69a !important;
            color: #ffffff !important;
            border-color: #26a69a !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(38, 166, 154, 0.35);
          }
          .connect-card:hover:not(.disabled) .connect-action-badge.connected {
            background-color: #388e3c !important;
            border-color: #43a047 !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(56, 142, 60, 0.45);
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
            font-size: 12.5px;
            box-sizing: border-box;
            transition: border-color 0.2s;
            font-family: Consolas, monospace;
          }
          .connect-input:focus {
            border-color: #ff9900;
            box-shadow: 0 0 0 2px rgba(255, 153, 0, 0.2);
          }
          .connect-input::placeholder {
            font-family: Consolas, monospace;
            font-style: italic;
            font-size: 11px;
            color: #555555;
            opacity: 0.75;
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
                {/* 1. OKX App Connect Cards (hỗ trợ hiển thị từng cụm tài khoản đã kết nối) */}
                {isAuthenticated && accounts.length > 0 ? (
                  accounts.map((acc, idx) => (
                    <div
                      key={acc.id || idx}
                      onClick={() => {
                        if (isConnecting) return;
                        if (!okxOAuthUrl) return;
                        if (handleFastConnectClick) handleFastConnectClick();
                        window.location.href = okxOAuthUrl;
                      }}
                      className="connect-card"
                      style={{ opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? "not-allowed" : "pointer" }}
                      title="Bấm vào đây để kết nối thêm tài khoản OKX mới"
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
                        <div
                          style={{
                            fontSize: "10px",
                            fontStyle: "italic",
                            color: "#4ade80",
                            marginTop: "2px",
                            fontWeight: "600",
                          }}
                        >
                          {`Đã Connect ${acc.name || accountName || "Tài khoản OKX"}`}
                        </div>
                      </div>

                      {/* Connect + text action (hoà trộn nhẹ nhàng vào vùng tổng, bấm để connect thêm tài khoản) */}
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: "600",
                          color: "#888888",
                          padding: "4px 8px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "3px",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                          cursor: "pointer",
                          transition: "color 0.18s ease",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "#ff9900")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "#888888")}
                        title="Bấm vào để kết nối thêm tài khoản khác"
                      >
                        Connect +
                      </span>
                    </div>
                  ))
                ) : (
                  <div
                    onClick={() => {
                      if (isConnecting) return;
                      if (!okxOAuthUrl) return;
                      if (handleFastConnectClick) handleFastConnectClick();
                      window.location.href = okxOAuthUrl;
                    }}
                    className="connect-card"
                    style={{ opacity: isConnecting ? 0.7 : 1, cursor: isConnecting ? "not-allowed" : "pointer" }}
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
                )}

                {/* Divider for Multi-exchange & Web3 ready */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
                  <span style={{ fontSize: "10.5px", color: "#888888", fontWeight: "bold", letterSpacing: "0.5px" }}>
                    {t("coming_soon_section")}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
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

          {/* TAB 2: CẤU HÌNH API KEY (Tài khoản gán cho bot & Cụm Thông Tin API OKX) */}
          {connectTab === "apikey" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Chọn tài khoản gán cho bot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <label style={{ color: "#e0e0e0", fontSize: "11.5px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Quản lý tài khoản:
                </label>
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <select
                    className="styled-select"
                    style={{ minWidth: "160px", maxWidth: "210px", background: "#2d2d2d", border: "1px solid #555555", color: "#e0e0e0", padding: "4px 8px", borderRadius: "4px", fontSize: "11.5px" }}
                    value={selectedAccount || ""}
                    onChange={e => {
                      const val = e.target.value;
                      if (onAssignAccount) onAssignAccount(val);
                      if (!val) {
                        if (setApiKey) setApiKey("");
                        if (setSecretKey) setSecretKey("");
                        if (setPassphrase) setPassphrase("");
                      }
                    }}
                  >
                    {accounts.length === 0 ? (
                      <option value="" style={{ color: "#888888" }}>
                        chưa có tài khoản
                      </option>
                    ) : (
                      <>
                        <option value="" style={{ color: "#888888" }}>
                          chọn tài khoản
                        </option>
                        {accounts.map(acc => {
                          const runningBotKey = Object.entries(activeAccounts || {}).find(([strat, accId]) => accId === acc.id)?.[0];
                          const assignedOtherBot = Object.entries(botAccountMap || {}).find(([bot, accId]) => bot !== activeBotTab && accId === acc.id)?.[0];

                          const getTargetBotName = (key) => {
                            if (key === "sub1") return t("bot_ema200") || "EMA200 Bot";
                            if (key === "sub2") return t("bot_smc") || "SMC Bot";
                            return t("bot_liquidation") || "Liquidation Bot";
                          };

                          let statusBadge = "";
                          if (runningBotKey) {
                            statusBadge = `(${t("running_on_bot")} ${getTargetBotName(runningBotKey)})`;
                          } else if (assignedOtherBot) {
                            statusBadge = `(${t("assigned_on_bot")} ${getTargetBotName(assignedOtherBot)})`;
                          }

                          return (
                            <option key={acc.id} value={acc.id}>
                              {acc.name} {statusBadge}
                            </option>
                          );
                        })}
                      </>
                    )}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      if (setApiKey) setApiKey("");
                      if (setSecretKey) setSecretKey("");
                      if (setPassphrase) setPassphrase("");
                      if (onCreateAccount) onCreateAccount();
                    }}
                    style={{ backgroundColor: "#28a745", color: "white", fontSize: "15px", fontWeight: "bold", borderRadius: "4px", width: "28px", height: "26px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title={t("create_account_tooltip") || "Thêm tài khoản mới"}
                  >+</button>
                  <button
                    type="button"
                    disabled={!selectedAccount || accounts.length === 0}
                    onClick={onDeleteAccount}
                    style={{
                      backgroundColor: (!selectedAccount || accounts.length === 0) ? "#444444" : "#dc3545",
                      color: (!selectedAccount || accounts.length === 0) ? "#888888" : "white",
                      fontSize: "15px",
                      fontWeight: "bold",
                      borderRadius: "4px",
                      width: "28px",
                      height: "26px",
                      border: "none",
                      cursor: (!selectedAccount || accounts.length === 0) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: (!selectedAccount || accounts.length === 0) ? 0.5 : 1,
                    }}
                    title={t("delete_account_tooltip") || "Xoá tài khoản đang chọn"}
                  >−</button>
                </div>
              </div>

              {/* Thông Tin API Key */}
              <div className="settings-group" style={{ background: "rgba(255, 255, 255, 0.02)", border: "1px solid #333333", borderRadius: "6px", padding: "10px 12px" }}>
                <div style={{ fontSize: "11px", fontWeight: "bold", color: "#aaaaaa", marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  THÔNG TIN API KEY
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ width: "90px", color: "#aaaaaa", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
                      {t("apikey_label")}
                    </label>
                    <input
                      type="text"
                      className="connect-input"
                      style={{ flex: 1 }}
                      value={apiKey}
                      onChange={e => setApiKey && setApiKey(e.target.value)}
                      placeholder="Nhập API Key..."
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ width: "90px", color: "#aaaaaa", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
                      {t("secret_label")}
                    </label>
                    <input
                      type="password"
                      className="connect-input"
                      style={{ flex: 1 }}
                      value={secretKey}
                      onChange={e => setSecretKey && setSecretKey(e.target.value)}
                      placeholder="Nhập Secret Key..."
                    />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <label style={{ width: "90px", color: "#aaaaaa", fontSize: "11px", fontWeight: "bold", flexShrink: 0 }}>
                      {t("passphrase_label")}
                    </label>
                    <input
                      type="password"
                      className="connect-input"
                      style={{ flex: 1 }}
                      value={passphrase}
                      onChange={e => setPassphrase && setPassphrase(e.target.value)}
                      placeholder="Nhập Passphrase..."
                    />
                  </div>
                </div>
              </div>

              {/* Nút Lưu API Key */}
              <button
                type="button"
                disabled={isSavingConfig || isConnecting}
                onClick={onSaveApiKey}
                style={{
                  width: "100%",
                  padding: "9px 18px",
                  backgroundColor: (isSavingConfig || isConnecting) ? "#3a3a3a" : "#2e7d32",
                  border: "none",
                  color: (isSavingConfig || isConnecting) ? "#888888" : "#ffffff",
                  borderRadius: "4px",
                  fontSize: "13px",
                  fontWeight: "bold",
                  cursor: (isSavingConfig || isConnecting) ? "not-allowed" : "pointer",
                  marginTop: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  transition: "all 0.18s ease",
                }}
                onMouseOver={(e) => {
                  if (!isSavingConfig && !isConnecting) {
                    e.currentTarget.style.backgroundColor = "#388e3c";
                  }
                }}
                onMouseOut={(e) => {
                  if (!isSavingConfig && !isConnecting) {
                    e.currentTarget.style.backgroundColor = "#2e7d32";
                  }
                }}
              >
                {isSavingConfig ? <><span className="spinner"></span> {t("saving_strat_btn") || "Đang lưu..."}</> : (t("save_apikey_btn") || "Lưu API Key")}
              </button>
            </div>
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
                  UID: <strong style={{ color: "#ffffff" }}>{currentUid || localStorage.getItem("tls1_uid") || "523019992975987626"}</strong>
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (onLogout) await onLogout();
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
