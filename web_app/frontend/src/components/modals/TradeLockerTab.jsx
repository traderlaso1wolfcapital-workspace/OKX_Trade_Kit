import React, { useState, useEffect } from "react";

export default function TradeLockerTab({ currentUid, t = (k) => k, initialSelectedId = null, onAccountsUpdated }) {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [accountsList, setAccountsList] = useState([]);
  const [activeId, setActiveId] = useState("");
  const [selectedId, setSelectedId] = useState(initialSelectedId || null);
  const [accountData, setAccountData] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Form states cho thêm Quỹ mới
  const [platform, setPlatform] = useState("mt5"); // 'mt5' (chính) | 'tradelocker' (phụ)
  const [mt5Login, setMt5Login] = useState("");
  const [mt5Password, setMt5Password] = useState("");
  const [mt5Server, setMt5Server] = useState("E8-Platform5");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [server, setServer] = useState("E8");
  const [environment, setEnvironment] = useState("https://demo.tradelocker.com");
  const [fundSize, setFundSize] = useState(5000);
  const [riskPerTrade, setRiskPerTrade] = useState(25);
  const [dailyDrawdownLimit, setDailyDrawdownLimit] = useState(125);
  const [dailyProfitCap, setDailyProfitCap] = useState(100);
  const [enabledSymbols, setEnabledSymbols] = useState(["XAU", "BTC", "ETH"]);
  const [isEnabled, setIsEnabled] = useState(true);

  const effectiveUid = currentUid || localStorage.getItem("tls1_uid") || "default";

  // 1. Tải danh sách tất cả các tài khoản Quỹ đã kết nối
  const fetchAccountsList = async (targetIdToSelect = null) => {
    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(`/api/tradelocker/accounts?uid=${encodeURIComponent(effectiveUid)}`, { headers });
      if (res.ok) {
        let data = null;
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
        } catch {}
        if (data && data.status === "success" && Array.isArray(data.accounts)) {
          setAccountsList(data.accounts);
          setActiveId(data.active_id || "");

          if (targetIdToSelect) {
            setSelectedId(targetIdToSelect);
          } else if (!selectedId || (selectedId !== "__new__" && !data.accounts.some((a) => a.id === selectedId))) {
            if (data.active_id && data.accounts.some((a) => a.id === data.active_id)) {
              setSelectedId(data.active_id);
            } else if (data.accounts.length > 0) {
              setSelectedId(data.accounts[0].id);
            } else {
              setSelectedId("__new__");
            }
          }
          if (onAccountsUpdated) onAccountsUpdated(data.accounts, data.active_id);
        }
      }
    } catch (e) {
      console.error("[TradeLockerTab] fetchAccountsList error:", e);
    }
  };

  // 2. Tải thông tin chi tiết của tài khoản Quỹ đang được chọn xem
  const fetchAccountDetail = async (accId) => {
    if (!accId || accId === "__new__") {
      setAccountData(null);
      setFetching(false);
      return;
    }
    setFetching(true);
    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch(
        `/api/tradelocker/account?uid=${encodeURIComponent(effectiveUid)}&account_id=${encodeURIComponent(accId)}`,
        { headers }
      );
      if (res.ok) {
        let data = null;
        try {
          const text = await res.text();
          data = text ? JSON.parse(text) : null;
        } catch {}
        if (data && data.is_connected && data.status === "success") {
          setAccountData(data);
          setFundSize(data.fund_size || 5000);
          setRiskPerTrade(data.risk_per_trade || 25);
          setDailyDrawdownLimit(data.daily_loss_limit || 125);
          setDailyProfitCap(data.daily_profit_cap || 100);
          setEnabledSymbols(data.enabled_symbols || ["XAU", "BTC", "ETH"]);
          setIsEnabled(data.is_enabled !== undefined ? data.is_enabled : true);
        } else {
          setAccountData(null);
        }
      }
    } catch (e) {
      console.error("[TradeLockerTab] fetchAccountDetail error:", e);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchAccountsList(initialSelectedId);
  }, [effectiveUid, initialSelectedId]);

  useEffect(() => {
    if (selectedId) {
      fetchAccountDetail(selectedId);
    }
  }, [selectedId, effectiveUid]);

  // Kết nối tài khoản Quỹ mới
  const handleConnect = async (e) => {
    if (e) e.preventDefault();
    if (platform === "mt5") {
      if (!mt5Login || !mt5Password) {
        setErrorMsg("Vui lòng nhập đầy đủ Số tài khoản (Login) và Mật khẩu của MT5!");
        return;
      }
    } else {
      if (!email || !password) {
        setErrorMsg("Vui lòng điền đầy đủ Email và Password của TradeLocker!");
        return;
      }
    }
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = {
        uid: effectiveUid,
        platform,
        login: platform === "mt5" ? mt5Login : undefined,
        email: platform === "mt5" ? `${mt5Login}@mt5` : email,
        password: platform === "mt5" ? mt5Password : password,
        server: platform === "mt5" ? mt5Server : server,
        environment: platform === "mt5" ? "mt5" : environment,
        fund_size: Number(fundSize) || 5000,
        risk_per_trade: Number(riskPerTrade) || 25,
        daily_drawdown_limit: Number(dailyDrawdownLimit) || 125,
        daily_profit_cap: Number(dailyProfitCap) || 100,
        enabled_symbols: enabledSymbols,
        is_enabled: isEnabled,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      let res;
      try {
        res = await fetch("/api/tradelocker/connect", {
          method: "POST",
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        if (fetchErr.name === "AbortError") {
          throw new Error("Kết nối đến máy chủ Quỹ bị quá thời gian (25s). Vui lòng thử lại!");
        }
        throw fetchErr;
      } finally {
        clearTimeout(timeoutId);
      }

      let data = null;
      let text = "";
      try {
        text = await res.text();
        data = text ? JSON.parse(text) : null;
      } catch (jsonErr) {
        data = null;
      }

      if (res.ok && data && data.status === "success") {
        setSuccessMsg(data.message || "Kết nối tài khoản Quỹ thành công!");
        setPassword("");
        const newAccId = data.id || `${server.toLowerCase()}_${data.account_id}`;
        await fetchAccountsList(newAccId);
        if (onAccountsUpdated) onAccountsUpdated();
      } else {
        const errorDetail =
          (data && (data.detail || data.message)) ||
          (text && text.length < 200 ? text : `Lỗi máy chủ (${res.status})`);
        setErrorMsg(errorDetail || "Kết nối thất bại. Vui lòng kiểm tra lại thông tin!");
      }
    } catch (err) {
      setErrorMsg("Lỗi khi kết nối đến máy chủ Quỹ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Chọn tài khoản này làm Quỹ active đang giao dịch
  const handleSelectActive = async (accId) => {
    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const res = await fetch("/api/tradelocker/select_account", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: effectiveUid, account_id: accId }),
      });
      if (res.ok) {
        setActiveId(accId);
        setSuccessMsg("Đã kích hoạt tài khoản Quỹ này cho bot!");
        fetchAccountsList(accId);
        window.dispatchEvent(new CustomEvent("tls1_prop_account_changed", { detail: accId }));
      }
    } catch (err) {
      setErrorMsg("Lỗi kích hoạt: " + err.message);
    }
  };

  // Lưu cấu hình quản trị rủi ro cho tài khoản đang chọn
  const handleUpdateConfig = async () => {
    if (!selectedId || selectedId === "__new__") return;
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);
    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const body = {
        uid: effectiveUid,
        account_id: selectedId,
        fund_size: Number(fundSize),
        risk_per_trade: Number(riskPerTrade),
        daily_drawdown_limit: Number(dailyDrawdownLimit),
        daily_profit_cap: Number(dailyProfitCap),
        enabled_symbols: enabledSymbols,
        is_enabled: isEnabled,
        fixed_lot: Number(accountData?.fixed_lot) || 0.01,
      };
      const res = await fetch("/api/tradelocker/config", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok && data.status === "success") {
        setSuccessMsg("Đã lưu cập nhật cài đặt Quỹ!");
        fetchAccountDetail(selectedId);
      } else {
        setErrorMsg(data.detail || data.message || "Lỗi lưu cấu hình");
      }
    } catch (err) {
      setErrorMsg("Lỗi mạng: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Xóa tài khoản Quỹ đang xem
  const handleDeleteAccount = async () => {
    if (!selectedId || selectedId === "__new__") return;
    const targetName = accountData?.name || `Quỹ #${accountData?.account_id}`;
    if (!window.confirm(`Bạn có chắc chắn muốn ngắt kết nối và xóa ${targetName}?`)) return;

    setLoading(true);
    try {
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      await fetch(
        `/api/tradelocker/disconnect?uid=${encodeURIComponent(effectiveUid)}&account_id=${encodeURIComponent(selectedId)}`,
        { method: "POST", headers }
      );
      setAccountData(null);
      setSuccessMsg(`Đã xóa ${targetName}.`);
      await fetchAccountsList();
    } catch (err) {
      setErrorMsg("Lỗi xóa tài khoản: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleSymbol = (sym) => {
    if (enabledSymbols.includes(sym)) {
      setEnabledSymbols(enabledSymbols.filter((s) => s !== sym));
    } else {
      setEnabledSymbols([...enabledSymbols, sym]);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {/* Alert Thông Báo */}
      {errorMsg && (
        <div style={{ padding: "10px 14px", backgroundColor: "rgba(255, 77, 79, 0.15)", border: "1px solid #ff4d4f", borderRadius: "5px", color: "#ff4d4f", fontSize: "12px", lineHeight: "1.4" }}>
          ⚠️ {errorMsg}
        </div>
      )}
      {successMsg && (
        <div style={{ padding: "10px 14px", backgroundColor: "rgba(0, 230, 118, 0.15)", border: "1px solid #00e676", borderRadius: "5px", color: "#00e676", fontSize: "12px", lineHeight: "1.4" }}>
          ✓ {successMsg}
        </div>
      )}

      {/* THANH CHỌN TÀI KHOẢN QUỸ (MULTI-PROP FIRM SWITCHER) */}
      {accountsList.length > 0 && (
        <div style={{ display: "flex", gap: "6px", alignItems: "center", overflowX: "auto", paddingBottom: "4px" }}>
          {accountsList.map((acc) => {
            const isSel = acc.id === selectedId;
            const isAct = acc.id === activeId || acc.is_active;
            return (
              <button
                key={acc.id}
                type="button"
                onClick={() => setSelectedId(acc.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "5px 10px",
                  borderRadius: "5px",
                  fontSize: "11px",
                  fontWeight: isSel ? "bold" : "normal",
                  backgroundColor: isSel ? "#1b281f" : "#1a1a1a",
                  border: isSel ? "1px solid #00e676" : "1px solid #333333",
                  color: isSel ? "#00e676" : "#aaaaaa",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {acc.server?.toUpperCase().includes("E8") ? (
                  <img src="/e8_logo.png" alt="E8" style={{ width: "13px", height: "13px", objectFit: "contain", borderRadius: "2px" }} />
                ) : acc.server?.toUpperCase().includes("5") ? (
                  <img src="/the5ers_logo.png" alt="The 5%ers" style={{ width: "14px", height: "14px", objectFit: "contain", borderRadius: "2px" }} />
                ) : acc.server?.toUpperCase().includes("FTMO") ? (
                  <img src="/ftmo_logo.png" alt="FTMO" style={{ width: "13px", height: "13px", objectFit: "contain", borderRadius: "2px" }} />
                ) : (
                  <span style={{ fontSize: "10px", fontWeight: "bold" }}>●</span>
                )}
                <span>{acc.name || `Quỹ ${acc.server} #${acc.account_id}`}</span>
                {isAct && (
                  <span style={{ fontSize: "8.5px", background: "#00e676", color: "#000", padding: "1px 4px", borderRadius: "2px", fontWeight: "bold" }}>
                    TRADE
                  </span>
                )}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => {
              setSelectedId("__new__");
              setAccountData(null);
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              padding: "5px 10px",
              borderRadius: "5px",
              fontSize: "11px",
              fontWeight: selectedId === "__new__" ? "bold" : "normal",
              backgroundColor: selectedId === "__new__" ? "#262014" : "#161616",
              border: selectedId === "__new__" ? "1px solid #ff9900" : "1px dashed #555555",
              color: selectedId === "__new__" ? "#ff9900" : "#888888",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.15s ease",
            }}
          >
            + Thêm Quỹ Mới
          </button>
        </div>
      )}

      {fetching ? (
        <div style={{ padding: "30px", textAlign: "center", color: "#888888", fontSize: "13px" }}>
          <span className="spinner" style={{ marginRight: "8px" }}></span> Đang tải thông tin tài khoản Quỹ...
        </div>
      ) : selectedId && selectedId !== "__new__" && accountData ? (
        /* TRƯỜNG HỢP 1: XEM CHI TIẾT & CẤU HÌNH TÀI KHOẢN ĐANG CHỌN */
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {/* Header Card: Thông tin tài khoản */}
          <div style={{ backgroundColor: "#151515", border: accountData.id === activeId ? "1px solid #00e676" : "1px solid #333333", borderRadius: "6px", padding: "14px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {accountData.id === activeId ? (
                    <span style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "3px", backgroundColor: "#00e676", color: "#000" }}>
                      ĐANG GIAO DỊCH
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSelectActive(accountData.id)}
                      style={{ fontSize: "10px", fontWeight: "bold", padding: "2px 6px", borderRadius: "3px", backgroundColor: "#222222", border: "1px solid #555", color: "#00e676", cursor: "pointer" }}
                      title="Chọn tài khoản này làm Quỹ nhận lệnh từ Bot"
                    >
                      Kích hoạt cho Bot
                    </button>
                  )}
                  <span style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", display: "inline-flex", alignItems: "center", gap: "6px" }}>
                    {accountData.server?.toUpperCase().includes("E8") && (
                      <img src="/e8_logo.png" alt="E8" style={{ width: "16px", height: "16px", objectFit: "contain", borderRadius: "2px" }} />
                    )}
                    {accountData.server?.toUpperCase().includes("5") && (
                      <img src="/the5ers_logo.png" alt="The 5%ers" style={{ width: "18px", height: "18px", objectFit: "contain", borderRadius: "2px" }} />
                    )}
                    {accountData.server?.toUpperCase().includes("FTMO") && (
                      <img src="/ftmo_logo.png" alt="FTMO" style={{ width: "16px", height: "16px", objectFit: "contain", borderRadius: "2px" }} />
                    )}
                    {accountData.name || `Quỹ ${accountData.server} TradeLocker`}
                  </span>
                </div>
                <div style={{ fontSize: "11px", color: "#888888", marginTop: "5px" }}>
                  ID: <strong style={{ color: "#ffffff" }}>{accountData.account_id}</strong> | Email: {accountData.email}
                </div>
              </div>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={loading}
                style={{ backgroundColor: "transparent", border: "1px solid #ff4d4f", color: "#ff4d4f", padding: "4px 10px", borderRadius: "4px", fontSize: "11px", cursor: "pointer", transition: "all 0.15s" }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.2)")}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                Xóa tài khoản
              </button>
            </div>

            {/* Bảng Số Dư & Vốn */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", backgroundColor: "#1e1e1e", padding: "10px", borderRadius: "4px" }}>
              <div>
                <div style={{ fontSize: "11px", color: "#888888" }}>Số dư (Balance):</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#00e676" }}>
                  ${Number(accountData.balance || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
              <div>
                <div style={{ fontSize: "11px", color: "#888888" }}>Vốn khả dụng (Equity):</div>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#ffffff" }}>
                  ${Number(accountData.equity || 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>

          {/* Bảng Giám Sát Mục Tiêu Quỹ */}
          <div style={{ backgroundColor: "#181818", border: "1px solid #2d2d2d", borderRadius: "6px", padding: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ fontSize: "12px", fontWeight: "bold", color: "#ff9900", borderBottom: "1px solid #282828", paddingBottom: "6px" }}>
              TIẾN ĐỘ THI QUỸ {accountData.server?.toUpperCase() || "E8 MARKETS"}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#aaaaaa" }}>Mục tiêu lợi nhuận (8%):</span>
              <span style={{ fontWeight: "bold", color: "#ffffff" }}>
                ${Number(accountData.profit || 0).toFixed(2)} / ${Number(accountData.profit_target || 400).toFixed(2)} US$
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#aaaaaa" }}>Lỗ tối đa tổng (Static 8%):</span>
              <span style={{ color: "#ffffff" }}>
                Ngưỡng vi phạm: <strong style={{ color: "#ff4d4f" }}>${Number(accountData.loss_level || 4600).toFixed(2)} US$</strong>
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#aaaaaa" }}>Lỗ tối đa trong ngày (2.5%):</span>
              <span style={{ fontWeight: "bold", color: "#ffb300" }}>
                Tối đa: -${Number(accountData.daily_loss_limit || 125).toFixed(2)} US$
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11.5px" }}>
              <span style={{ color: "#aaaaaa" }}>Trần lãi tối đa / ngày:</span>
              <span style={{ color: "#00e676", fontWeight: "bold" }}>
                ${Number(accountData.daily_profit_cap || 100).toFixed(2)} US$ / ngày
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* TRƯỜNG HỢP 2: FORM KẾT NỐI QUỸ MỚI */
        <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ backgroundColor: "#181818", border: "1px solid #2c2c2c", borderRadius: "6px", padding: "12px" }}>
            <p style={{ margin: "0 0 10px 0", fontSize: "12px", color: "#aaaaaa", lineHeight: "1.5" }}>
              Kết nối trực tiếp tài khoản <strong>Quỹ Prop Firm (E8 Markets, The 5%ers, FTMO...)</strong> của bạn. Bot sẽ dùng chung tín hiệu chiến lược hiện tại (SMC / EMA200) và tự động tính toán số Lot an toàn để giao dịch.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {/* CHỌN NỀN TẢNG GIAO DỊCH (MT5 LÀ CHÍNH, TRADELOCKER LÀ PHỤ) */}
              <div>
                <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "6px" }}>
                  Nền tảng giao dịch (Platform):
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
                  <button
                    type="button"
                    onClick={() => setPlatform("mt5")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "8px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      backgroundColor: platform === "mt5" ? "#142838" : "#141414",
                      border: platform === "mt5" ? "1px solid #1890ff" : "1px solid #333333",
                      color: platform === "mt5" ? "#40a9ff" : "#888888",
                      fontWeight: platform === "mt5" ? "bold" : "normal",
                      fontSize: "12px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🔵 MetaTrader 5 (MT5)</span>
                    </div>
                    <span style={{ fontSize: "9px", background: "#1890ff", color: "#ffffff", padding: "1px 5px", borderRadius: "2px", fontWeight: "bold" }}>
                      CHÍNH / KHUYÊN DÙNG
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPlatform("tradelocker")}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "4px",
                      padding: "8px 10px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      backgroundColor: platform === "tradelocker" ? "#14261c" : "#141414",
                      border: platform === "tradelocker" ? "1px solid #00e676" : "1px solid #333333",
                      color: platform === "tradelocker" ? "#00e676" : "#888888",
                      fontWeight: platform === "tradelocker" ? "bold" : "normal",
                      fontSize: "12px",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <span>🟢 TradeLocker</span>
                    </div>
                    <span style={{ fontSize: "9px", background: "#333333", color: "#aaaaaa", padding: "1px 5px", borderRadius: "2px" }}>
                      PHỤ / CLOUD WEB
                    </span>
                  </button>
                </div>
              </div>

              {/* NỘI DUNG FORM NỀN TẢNG MT5 */}
              {platform === "mt5" ? (
                <>
                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Chọn Quỹ & Máy chủ MT5 (Server):
                    </label>
                    <select
                      value={mt5Server}
                      onChange={(e) => setMt5Server(e.target.value)}
                      className="connect-input"
                      style={{ cursor: "pointer" }}
                    >
                      <optgroup label="E8 Markets (Khuyên dùng)">
                        <option value="E8-Platform5">E8 Markets (Platform 5 / MT5 - Classic Markets)</option>
                        <option value="E8Markets-Demo">E8 Markets (Demo Server MT5)</option>
                        <option value="E8Markets-Live">E8 Markets (Live / Funded MT5)</option>
                      </optgroup>
                      <optgroup label="FTMO & Quỹ Lớn Khác">
                        <option value="FTMO-MT5">FTMO (MetaTrader 5 Demo / Live)</option>
                        <option value="The5ers-MT5">The 5%ers (MetaTrader 5)</option>
                        <option value="FundingPips-MT5">Funding Pips (MetaTrader 5)</option>
                        <option value="Other-MT5">Máy chủ MT5 khác...</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Số tài khoản MT5 (Login / Account ID):
                    </label>
                    <input
                      type="text"
                      required
                      value={mt5Login}
                      onChange={(e) => setMt5Login(e.target.value)}
                      placeholder="Ví dụ: 2534591"
                      className="connect-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Mật khẩu MT5 (Password):
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={mt5Password}
                        onChange={(e) => setMt5Password(e.target.value)}
                        placeholder="Nhập mật khẩu giao dịch MT5"
                        className="connect-input"
                        style={{ paddingRight: "50px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          color: "#888888",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {showPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>
                  </div>

                  {/* BANNER HƯỚNG DẪN THÔNG MINH E8 MARKETS & MT5 */}
                  <div style={{
                    background: "rgba(24, 144, 255, 0.08)",
                    border: "1px solid rgba(24, 144, 255, 0.25)",
                    borderRadius: "5px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    color: "#b0d5f8",
                  }}>
                    <div style={{ color: "#40a9ff", fontWeight: "bold", marginBottom: "3px" }}>
                      💡 Lưu ý quan trọng từ Quỹ E8 Markets:
                    </div>
                    <div>• <strong>Tên gọi:</strong> Trên hệ thống E8, MT5 có thể hiển thị dưới tên <strong>"Platform 5"</strong> (do chính sách bản quyền MetaQuotes).</div>
                    <div>• <strong>Loại gói:</strong> MT5 khả dụng cho danh mục <strong>Classic Markets (Forex & CFD)</strong> tại Việt Nam / Quốc tế (không áp dụng cho IP Mỹ).</div>
                    <div>• <strong>Hỗ trợ đổi nền tảng:</strong> Nếu lúc mua bạn vô tình chọn nhầm Crypto/Perpetual, hãy mở Live Chat trên trang chủ E8 để yêu cầu hỗ trợ đổi sang MT5 miễn phí (khi tài khoản chưa mở lệnh).</div>
                  </div>
                </>
              ) : (
                <>
                  {/* NỘI DUNG FORM NỀN TẢNG TRADELOCKER */}
                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Chọn Quỹ & Máy chủ TradeLocker:
                    </label>
                    <select
                      value={server}
                      onChange={(e) => {
                        const val = e.target.value;
                        setServer(val);
                        if (val.includes("-Live")) {
                          setEnvironment("https://live.tradelocker.com");
                        } else {
                          setEnvironment("https://demo.tradelocker.com");
                        }
                      }}
                      className="connect-input"
                      style={{ cursor: "pointer" }}
                    >
                      <optgroup label="E8 Markets">
                        <option value="E8">E8 Markets (Demo - demo.tradelocker.com)</option>
                        <option value="E8-Live">E8 Markets (Live / Funded - live.tradelocker.com)</option>
                      </optgroup>
                      <optgroup label="The 5%ers">
                        <option value="The5ers">The 5%ers (Demo - demo.tradelocker.com)</option>
                        <option value="The5ers-Live">The 5%ers (Live / Funded - live.tradelocker.com)</option>
                      </optgroup>
                      <optgroup label="FTMO & Quỹ Khác">
                        <option value="FTMO">FTMO (TradeLocker Demo)</option>
                        <option value="FunderPro">FunderPro (TradeLocker)</option>
                        <option value="FundingPips">Funding Pips (TradeLocker)</option>
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Email đăng nhập TradeLocker:
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Ví dụ: your_email@gmail.com"
                      className="connect-input"
                    />
                  </div>

                  <div>
                    <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                      Mật khẩu TradeLocker (Password):
                    </label>
                    <div style={{ position: "relative" }}>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu TradeLocker"
                        className="connect-input"
                        style={{ paddingRight: "50px" }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          background: "transparent",
                          border: "none",
                          color: "#888888",
                          fontSize: "12px",
                          cursor: "pointer",
                        }}
                      >
                        {showPassword ? "Ẩn" : "Hiện"}
                      </button>
                    </div>
                  </div>

                  <div style={{
                    background: "rgba(0, 230, 118, 0.06)",
                    border: "1px solid rgba(0, 230, 118, 0.2)",
                    borderRadius: "5px",
                    padding: "8px 10px",
                    fontSize: "11px",
                    lineHeight: "1.5",
                    color: "#a7f3d0",
                  }}>
                    💡 TradeLocker là nền tảng Cloud hiện đại, phù hợp với các gói Crypto / Perpetuals hoặc trader muốn tự động hóa trên Web mà không cần cài phần mềm máy tính.
                  </div>
                </>
              )}

              {/* Quy mô quỹ & Ký quỹ rủi ro */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "4px" }}>
                <div>
                  <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                    Quy mô gói Quỹ:
                  </label>
                  <select
                    value={fundSize}
                    onChange={(e) => {
                      const size = Number(e.target.value);
                      setFundSize(size);
                      setRiskPerTrade(Math.round(size * 0.005));
                      setDailyDrawdownLimit(Math.round(size * 0.025));
                      setDailyProfitCap(Math.round(size * 0.02));
                    }}
                    className="connect-input"
                    style={{ cursor: "pointer" }}
                  >
                    <option value="5000">$5,000 USD (E8 Starter)</option>
                    <option value="10000">$10,000 USD</option>
                    <option value="25000">$25,000 USD</option>
                    <option value="50000">$50,000 USD</option>
                    <option value="100000">$100,000 USD</option>
                    <option value="200000">$200,000 USD</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: "11px", color: "#888888", display: "block", marginBottom: "4px" }}>
                    Rủi ro mỗi lệnh (USD):
                  </label>
                  <input
                    type="number"
                    value={riskPerTrade}
                    onChange={(e) => setRiskPerTrade(e.target.value)}
                    className="connect-input"
                    placeholder="25"
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              backgroundColor: "#2e7d32",
              color: "#ffffff",
              border: "none",
              borderRadius: "4px",
              padding: "10px 16px",
              fontSize: "13px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              transition: "all 0.15s ease",
              marginTop: "4px",
            }}
            onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#388e3c")}
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#2e7d32")}
          >
            {loading ? (
              <>
                <span className="spinner"></span> Đang xác thực với Quỹ...
              </>
            ) : (
              "KẾT NỐI VÀ KIỂM TRA TÀI KHOẢN QUỸ"
            )}
          </button>
        </form>
      )}
    </div>
  );
}
