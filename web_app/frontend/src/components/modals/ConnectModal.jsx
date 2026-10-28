import React, { useState, useEffect } from "react";
import { useTranslation } from "../../i18n";
import { ConfirmLogoutModal } from "./AccountPromptModals";
import TradeLockerTab from "./TradeLockerTab";
import { formatOkxAccountTag } from "../sidebar/SidebarLeft";

// 🔴 Biểu tượng chính thức sàn Vantage Markets
const VantageLogo = ({ size = 22 }) => (
  <img
    src="/vantage_logo.png"
    alt="Vantage"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      borderRadius: "4px",
      flexShrink: 0,
    }}
  />
);

// 🟡 Biểu tượng chính thức sàn Exness
const ExnessLogo = ({ size = 22 }) => (
  <img
    src="/exness_logo.png"
    alt="Exness"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      borderRadius: "4px",
      flexShrink: 0,
    }}
  />
);

// 🔷 Biểu tượng chính thức MetaTrader 5 (MT5)
const MT5Icon = ({ size = 20 }) => (
  <img
    src="/mt5_logo.png"
    alt="MT5"
    style={{
      width: `${size}px`,
      height: `${size}px`,
      objectFit: "contain",
      borderRadius: "4px",
      flexShrink: 0,
    }}
  />
);

// Danh mục các sàn Forex cá nhân giao dịch MT5
const MT5_BROKERS = [
  {
    key: "vantage",
    name: "Vantage Markets (MT5)",
    sub: "Khớp lệnh siêu tốc • Spread từ 0.0 pip",
    defaultServer: "VantageFX-Live",
    badgeText: "VANTAGE MT5",
    badgeColor: "#ff4d4f",
    badgeBg: "rgba(255, 59, 48, 0.2)",
    badgeBorder: "rgba(255, 59, 48, 0.4)",
    bannerTitle: "Vantage Markets • Khớp lệnh siêu tốc",
    firm: "Vantage",
    defaultFundSize: 1000,
    defaultRiskTrade: 20,
    defaultDailyLoss: 100,
    servers: [
      { value: "VantageFX-Live", label: "VantageFX-Live (Server Chính)" },
      { value: "VantageFX-Live 2", label: "VantageFX-Live 2" },
      { value: "VantageFX-Live 3", label: "VantageFX-Live 3" },
      { value: "VantageFX-Live 4", label: "VantageFX-Live 4" },
      { value: "VantageInternational-Live", label: "VantageInternational-Live" },
      { value: "VantageInternational-Live 2", label: "VantageInternational-Live 2" },
      { value: "VantageInternational-Live 3", label: "VantageInternational-Live 3" },
      { value: "VantageFX-Demo", label: "VantageFX-Demo (Tài khoản Demo)" },
      { value: "VantageInternational-Demo", label: "VantageInternational-Demo (Demo QT)" },
      { value: "Other-MT5", label: "Máy chủ khác (Tùy biến)..." },
    ],
    accentColor: "#ff3b30",
    badgeBg: "rgba(38, 166, 154, 0.12)",
    badgeBorder: "rgba(38, 166, 154, 0.3)",
    badgeColor: "#26a69a",
  },
  {
    key: "exness",
    name: "Exness (MT5)",
    sub: "Nạp rút tức thì 24/7 • Đòn bẩy không giới hạn",
    defaultServer: "Exness-MT5Real",
    badgeText: "EXNESS MT5",
    badgeColor: "#ffc700",
    badgeBg: "rgba(255, 199, 0, 0.2)",
    badgeBorder: "rgba(255, 199, 0, 0.4)",
    bannerTitle: "Exness • Nạp rút tức thì 24/7",
    firm: "Exness",
    defaultFundSize: 1000,
    defaultRiskTrade: 20,
    defaultDailyLoss: 100,
    servers: [
      { value: "Exness-MT5Real", label: "Exness-MT5Real (Server 1)" },
      { value: "Exness-MT5Real2", label: "Exness-MT5Real 2" },
      { value: "Exness-MT5Real3", label: "Exness-MT5Real 3" },
      { value: "Exness-MT5Real4", label: "Exness-MT5Real 4" },
      { value: "Exness-MT5Real5", label: "Exness-MT5Real 5" },
      { value: "Exness-MT5Real6", label: "Exness-MT5Real 6" },
      { value: "Exness-MT5Real7", label: "Exness-MT5Real 7" },
      { value: "Exness-MT5Real8", label: "Exness-MT5Real 8" },
      { value: "Exness-MT5Real9", label: "Exness-MT5Real 9" },
      { value: "Exness-MT5Real10", label: "Exness-MT5Real 10" },
      { value: "Exness-MT5Real11", label: "Exness-MT5Real 11" },
      { value: "Exness-MT5Real12", label: "Exness-MT5Real 12" },
      { value: "Exness-MT5Real14", label: "Exness-MT5Real 14" },
      { value: "Exness-MT5Real15", label: "Exness-MT5Real 15" },
      { value: "Exness-MT5Real16", label: "Exness-MT5Real 16" },
      { value: "Exness-MT5Real18", label: "Exness-MT5Real 18" },
      { value: "Exness-MT5Real20", label: "Exness-MT5Real 20" },
      { value: "Exness-MT5Trial", label: "Exness-MT5Trial (Tài khoản Thử nghiệm)" },
      { value: "Exness-MT5Trial2", label: "Exness-MT5Trial 2" },
      { value: "Other-MT5", label: "Máy chủ khác (Tùy biến)..." },
    ],
    accentColor: "#ffc700",
    badgeBg: "rgba(38, 166, 154, 0.12)",
    badgeBorder: "rgba(38, 166, 154, 0.3)",
    badgeColor: "#26a69a",
  },
];

// Danh mục các Quỹ cấp vốn Prop Firm (E8, FTMO...)
const PROP_FIRMS = [
  {
    key: "e8",
    name: "Quỹ E8 Markets",
    sub: "Cấp vốn tới $200.000 • Chia sẻ lợi nhuận 80%",
    defaultServer: "E8",
    badgeText: "E8 MARKETS",
    badgeColor: "#00e676",
    badgeBg: "rgba(0, 230, 118, 0.2)",
    badgeBorder: "rgba(0, 230, 118, 0.4)",
    bannerTitle: "Quỹ E8 Markets • TradeLocker & MT5",
    firm: "E8",
    defaultFundSize: 5000,
    defaultRiskTrade: 25,
    defaultDailyLoss: 125,
    servers: [
      { value: "E8", label: "E8 (TradeLocker Demo - demo.tradelocker.com)" },
      { value: "E8-Live", label: "E8-Live (TradeLocker Live - live.tradelocker.com)" },
      { value: "E8Markets-Demo", label: "E8Markets-Demo (Tài khoản MT5 Demo)" },
      { value: "E8Markets-Live", label: "E8Markets-Live (Tài khoản MT5 Live/Funded)" },
      { value: "E8Markets-Server", label: "E8Markets-Server (Tài khoản MT5 Cầm Quỹ)" },
      { value: "E8Funding-Demo", label: "E8Funding-Demo (Tài khoản MT5 Funding)" },
      { value: "PurpleTrading-Demo", label: "PurpleTrading-Demo (Đối tác MT5 Demo)" },
      { value: "PurpleTrading-Live", label: "PurpleTrading-Live (Đối tác MT5 Live)" },
      { value: "Other-MT5", label: "Máy chủ khác (Tùy biến)..." },
    ],
    accentColor: "#00e676",
    badgeBg: "rgba(38, 166, 154, 0.12)",
    badgeBorder: "rgba(38, 166, 154, 0.3)",
    badgeColor: "#26a69a",
  },
  {
    key: "ftmo",
    name: "Quỹ FTMO",
    sub: "Quỹ số 1 toàn cầu • Chia sẻ lợi nhuận 90%",
    defaultServer: "FTMO-Demo",
    badgeText: "FTMO QUỸ",
    badgeColor: "#3b82f6",
    badgeBg: "rgba(59, 130, 246, 0.2)",
    badgeBorder: "rgba(59, 130, 246, 0.4)",
    bannerTitle: "Quỹ FTMO • Quỹ số 1 toàn cầu",
    firm: "FTMO",
    defaultFundSize: 10000,
    defaultRiskTrade: 50,
    defaultDailyLoss: 250,
    servers: [
      { value: "FTMO-Demo", label: "FTMO-Demo (Tài khoản Thi Quỹ MT5)" },
      { value: "FTMO-Server", label: "FTMO-Server (Tài khoản Cầm Quỹ MT5)" },
      { value: "FTMO-Server2", label: "FTMO-Server2 (Tài khoản Cầm Quỹ Server 2)" },
      { value: "FTMO-Server3", label: "FTMO-Server3 (Tài khoản Cầm Quỹ Server 3)" },
      { value: "Other-MT5", label: "Máy chủ khác (Tùy biến)..." },
    ],
    accentColor: "#3b82f6",
    badgeBg: "rgba(38, 166, 154, 0.12)",
    badgeBorder: "rgba(38, 166, 154, 0.3)",
    badgeColor: "#26a69a",
  },
];

// Toàn bộ các nhà môi giới & Quỹ hỗ trợ popup kết nối trực tiếp
const ALL_CONNECT_PROVIDERS = [...MT5_BROKERS, ...PROP_FIRMS];

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
  activeTab: externalTab,
  onTabChange: externalOnTabChange,
}) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState("fast"); // 'fast' | 'apikey'
  const connectTab = externalTab !== undefined ? externalTab : internalTab;

  const handleTabSwitch = (newTab) => {
    setInternalTab(newTab);
    if (externalOnTabChange) externalOnTabChange(newTab);
  };

  const [modalAccountId, setModalAccountId] = useState("");
  const [localApiKey, setLocalApiKey] = useState("");
  const [localSecretKey, setLocalSecretKey] = useState("");
  const [localPassphrase, setLocalPassphrase] = useState("");
  const [showConfirmLogout, setShowConfirmLogout] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [propAccounts, setPropAccounts] = useState([]);
  const [activePropId, setActivePropId] = useState("");
  const [selectedPropId, setSelectedPropId] = useState(null);

  // MT5 Broker Modal States (Vantage, Exness)
  const [mt5BrokerModal, setMt5BrokerModal] = useState(null); // 'vantage' | 'exness' | null
  const [mt5LoginVal, setMt5LoginVal] = useState("");
  const [mt5PassVal, setMt5PassVal] = useState("");
  const [mt5ServerVal, setMt5ServerVal] = useState("VantageFX-Live");
  const [mt5CustomServer, setMt5CustomServer] = useState("");
  const [mt5ShowPass, setMt5ShowPass] = useState(false);
  const [mt5SavePass, setMt5SavePass] = useState(true);
  const [mt5FundSize, setMt5FundSize] = useState(1000);
  const [mt5RiskTrade, setMt5RiskTrade] = useState(20);
  const [mt5DailyLoss, setMt5DailyLoss] = useState(100);
  const [mt5Connecting, setMt5Connecting] = useState(false);
  const [mt5Error, setMt5Error] = useState("");
  const [mt5Success, setMt5Success] = useState("");

  const handleOpenMt5Modal = (brokerKey, existingAccount = null) => {
    setMt5BrokerModal(brokerKey);
    setMt5Error("");
    setMt5Success("");
    setMt5ShowPass(false);
    const brokerCfg = ALL_CONNECT_PROVIDERS.find((b) => b.key === brokerKey) || ALL_CONNECT_PROVIDERS[0];
    const defaultSrv = brokerCfg.defaultServer || "VantageFX-Live";
    const defaultFund = brokerCfg.defaultFundSize || 1000;
    const defaultRisk = brokerCfg.defaultRiskTrade || 20;
    const defaultLoss = brokerCfg.defaultDailyLoss || 100;

    if (existingAccount) {
      setMt5LoginVal(existingAccount.account_id || existingAccount.acc_num || "");
      setMt5PassVal(existingAccount.password || "");
      const isKnownServer = (brokerCfg.servers || []).some((s) => s.value === existingAccount.server);
      if (isKnownServer) {
        setMt5ServerVal(existingAccount.server);
        setMt5CustomServer("");
      } else if (existingAccount.server) {
        setMt5ServerVal("Other-MT5");
        setMt5CustomServer(existingAccount.server);
      } else {
        setMt5ServerVal(defaultSrv);
        setMt5CustomServer("");
      }
      setMt5FundSize(existingAccount.fund_size || defaultFund);
      setMt5RiskTrade(existingAccount.risk_per_trade || defaultRisk);
      setMt5DailyLoss(existingAccount.daily_drawdown_limit || defaultLoss);
    } else {
      setMt5LoginVal("");
      setMt5PassVal("");
      setMt5ServerVal(defaultSrv);
      setMt5CustomServer("");
      setMt5FundSize(defaultFund);
      setMt5RiskTrade(defaultRisk);
      setMt5DailyLoss(defaultLoss);
    }
  };

  const handleMt5Submit = async (e) => {
    if (e) e.preventDefault();
    if (!mt5LoginVal.trim() || !mt5PassVal) {
      setMt5Error("Vui lòng nhập đầy đủ Số tài khoản (Login / ID) và Mật khẩu!");
      return;
    }
    const finalServer = mt5ServerVal === "Other-MT5" ? (mt5CustomServer.trim() || "MetaQuotes-Demo") : mt5ServerVal;
    setMt5Error("");
    setMt5Success("");
    setMt5Connecting(true);

    try {
      const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
      const token = localStorage.getItem("tls1_jwt_token");
      const headers = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      const brokerCfg = ALL_CONNECT_PROVIDERS.find((b) => b.key === mt5BrokerModal) || ALL_CONNECT_PROVIDERS[0];
      const brokerFirm = brokerCfg.firm || (mt5BrokerModal === "vantage" ? "Vantage" : mt5BrokerModal === "exness" ? "Exness" : "MT5");
      const isTradeLockerServer = finalServer === "E8" || finalServer === "E8-Live";
      const platformType = isTradeLockerServer ? "tradelocker" : "mt5";
      const envUrl = finalServer === "E8-Live" ? "https://live.tradelocker.com" : (isTradeLockerServer ? "https://demo.tradelocker.com" : "mt5");

      const body = {
        uid: curUid,
        platform: platformType,
        login: mt5LoginVal.trim(),
        email: isTradeLockerServer
          ? (mt5LoginVal.includes("@") ? mt5LoginVal.trim() : `${mt5LoginVal.trim()}@tradelocker.com`)
          : `${mt5LoginVal.trim()}@mt5`,
        password: mt5PassVal,
        server: finalServer,
        firm: brokerFirm,
        environment: envUrl,
        fund_size: Number(mt5FundSize) || (brokerCfg.defaultFundSize || 1000),
        risk_per_trade: Number(mt5RiskTrade) || (brokerCfg.defaultRiskTrade || 20),
        daily_drawdown_limit: Number(mt5DailyLoss) || (brokerCfg.defaultDailyLoss || 100),
        daily_profit_cap: 100,
        enabled_symbols: ["XAU", "BTC", "ETH"],
        is_enabled: true,
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch("/api/tradelocker/connect", {
        method: "POST",
        headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const data = await res.json().catch(() => null);
      if (res.ok && data && data.status === "success") {
        setMt5Success(`✓ Đăng nhập ${brokerCfg.name} thành công! Số dư: $${Number(data.balance || mt5FundSize).toLocaleString("vi-VN")} USD`);
        fetchPropAccounts();
        window.dispatchEvent(new CustomEvent("tls1_prop_account_changed", { detail: data.account_id }));
        setTimeout(() => {
          setMt5BrokerModal(null);
        }, 1200);
      } else {
        setMt5Error(data?.detail || "Không thể kết nối tài khoản. Vui lòng kiểm tra lại Login, Password và Server.");
      }
    } catch (err) {
      setMt5Error("Lỗi kết nối máy chủ hoặc quá thời gian chờ.");
    } finally {
      setMt5Connecting(false);
    }
  };

  const fetchPropAccounts = () => {
    const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/tradelocker/accounts?uid=${encodeURIComponent(curUid)}`, { headers })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d && d.status === "success" && Array.isArray(d.accounts)) {
          setPropAccounts(d.accounts);
          setActivePropId(d.active_id || "");
        } else {
          setPropAccounts([]);
        }
      })
      .catch(() => {});
  };

  const handleDeletePropAccount = (accId) => {
    const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
    const token = localStorage.getItem("tls1_jwt_token");
    const headers = token ? { Authorization: `Bearer ${token}` } : {};
    fetch(`/api/tradelocker/disconnect?uid=${encodeURIComponent(curUid)}&account_id=${encodeURIComponent(accId)}`, {
      method: "POST",
      headers,
    })
      .then(() => {
        setPropAccounts((prev) => prev.filter((a) => a.id !== accId));
        window.dispatchEvent(new CustomEvent("tls1_prop_account_changed", { detail: "" }));
      })
      .catch(() => {});
  };

  const [okxBalances, setOkxBalances] = useState({});

  const fetchOkxBalances = () => {
    const curUid = currentUid || localStorage.getItem("tls1_uid") || "default";
    if (!accounts || accounts.length === 0 || !curUid || curUid === "default") return;
    accounts.forEach((acc) => {
      const aid = acc.id || acc.account_id;
      if (!aid) return;
      fetch(`/api/bot/balance?uid=${encodeURIComponent(curUid)}&account_id=${encodeURIComponent(aid)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data && data.status === "success" && data.availBal !== undefined) {
            setOkxBalances((prev) => ({ ...prev, [aid]: Number(data.availBal) }));
          }
        })
        .catch(() => {});
    });
  };

  // Khi mở modal: luôn làm mới trạng thái chọn tài khoản và trắng 3 ô nhập, đồng thời tải trạng thái các Quỹ & số dư OKX
  useEffect(() => {
    if (!isOpen) return;
    setModalAccountId("");
    setLocalApiKey("");
    setLocalSecretKey("");
    setLocalPassphrase("");
    fetchPropAccounts();
    fetchOkxBalances();
  }, [isOpen, currentUid, connectTab]);

  const handleSelectAccount = (accId) => {
    setModalAccountId(accId);
    if (!accId) {
      setLocalApiKey("");
      setLocalSecretKey("");
      setLocalPassphrase("");
      return;
    }
    const curUid = currentUid || localStorage.getItem("tls1_uid");
    if (!curUid || curUid === "default") return;
    fetch(`/api/bot/credentials?strategy=${activeBotTab}&account_id=${accId}&uid=${curUid}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setLocalApiKey(d.api_key || "");
          setLocalSecretKey(d.secret_key || "");
          setLocalPassphrase(d.passphrase || "");
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    if (modalAccountId && !accounts.some(a => a.id === modalAccountId)) {
      setModalAccountId("");
      setLocalApiKey("");
      setLocalSecretKey("");
      setLocalPassphrase("");
    }
  }, [accounts, modalAccountId]);

  if (!isOpen) return null;

  const getBotTitle = () => {
    if (activeBotTab === "sub1") return t("bot_ema200") || "EMA200 Bot";
    if (activeBotTab === "sub2") return t("bot_smc") || "SMC Bot";
    return t("bot_liquidation") || "Liquidation Bot";
  };
  const botTitle = getBotTitle();
  const effectiveUid = isAuthenticated ? (currentUid || localStorage.getItem("tls1_uid") || "") : "";
  const isConnected = !!(isAuthenticated && effectiveUid);
  const isPropTab = connectTab === "tradelocker";
  const activePropAcc = propAccounts.find(a => a.id === activePropId) || (propAccounts.length > 0 ? propAccounts[0] : null);
  const isPropConnected = Boolean(activePropAcc || propAccounts.length > 0);

  return (
    <div
      className="modal-overlay connect-modal-overlay"
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
        alignItems: "flex-start",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px",
        paddingTop: "max(92px, 10.5vh)",
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
          .connect-cards-scroll::-webkit-scrollbar {
            width: 5px;
          }
          .connect-cards-scroll::-webkit-scrollbar-track {
            background: #141414;
            border-radius: 4px;
          }
          .connect-cards-scroll::-webkit-scrollbar-thumb {
            background: #383838;
            border-radius: 4px;
          }
          .connect-cards-scroll::-webkit-scrollbar-thumb:hover {
            background: #505050;
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
            box-shadow: 0 4px 14px rgba(0, 0, 0, 0.4), 0 0 12px rgba(255, 153, 0, 0.25);
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
            onClick={() => handleTabSwitch("fast")}
            data-tour="connect-fast-tab"
          >
            {t("fast_connect")}
          </button>
          <button
            type="button"
            className={`connect-tab-btn ${connectTab === "apikey" ? "active" : ""}`}
            onClick={() => handleTabSwitch("apikey")}
            data-tour="connect-apikey-tab"
          >
            {t("apikey_connect")}
          </button>
          <button
            type="button"
            className={`connect-tab-btn ${connectTab === "tradelocker" ? "active" : ""}`}
            onClick={() => handleTabSwitch("tradelocker")}
            data-tour="connect-tradelocker-tab"
            style={connectTab === "tradelocker" ? { borderTopColor: "#00e676", color: "#00e676" } : {}}
          >
            Quỹ FX Connect
          </button>
        </div>

        {/* Modal Body */}
        <div
          className="connect-cards-scroll"
          style={{
            padding: "16px 18px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
            backgroundColor: "#1e1e1e",
            overflowY: "auto",
            maxHeight: "calc(90vh - 100px)",
          }}
        >
          {/* TAB 1: FAST CONNECT */}
          {connectTab === "fast" && (
            <div data-tour="connect-fast-content" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <p style={{ color: "#aaaaaa", fontSize: "12px", margin: 0, lineHeight: "1.5" }}>
                {t("fast_connect_desc")}
              </p>

              {/* UNIFIED SCROLL CONTAINER: TÍNH CẢ PHẦN 3 THẺ SẮP HỖ TRỢ CHUNG VÀO CON LĂN */}
              <div
                className="connect-cards-scroll"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "10px",
                  maxHeight: "390px",
                  overflowY: "auto",
                  padding: "6px 8px 6px 4px",
                }}
              >
                {/* PHÂN KHU 1: CRYPTO */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "4px 0 2px 0" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#888888", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    Crypto
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#2e2e2e" }}></div>
                </div>

                {/* 1. THẺ HỢP NHẤT SÀN OKX (DUY NHẤT 1 THẺ) */}
                <div
                  className="connect-card"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0px",
                    cursor: "default",
                    padding: "12px 14px",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                  title="Thẻ sàn OKX"
                >
                  {/* Header: Logo OKX + Tiêu đề + Nút [Mở App ➔] */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                    }}
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
                      <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                        {t("okx_connect_title")}
                        {accounts && accounts.length > 0 && (
                          <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(38, 166, 154, 0.15)", color: "#26a69a", fontWeight: "bold" }}>
                            {accounts.length} TK
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
                        {t("okx_connect_sub")}
                      </div>
                    </div>

                    {/* Action Badge [Mở App ➔] */}
                    <span
                      className="connect-action-badge"
                      onClick={() => {
                        if (isConnecting) return;
                        if (!okxOAuthUrl) return;
                        if (handleFastConnectClick) handleFastConnectClick();
                        window.location.href = okxOAuthUrl;
                      }}
                      style={{
                        fontSize: "11px",
                        fontWeight: "700",
                        color: "#26a69a",
                        background: "rgba(38, 166, 154, 0.12)",
                        border: "1px solid rgba(38, 166, 154, 0.3)",
                        padding: "4px 9px",
                        borderRadius: "4px",
                        whiteSpace: "nowrap",
                        transition: "all 0.18s ease",
                        cursor: isConnecting ? "not-allowed" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                      title="Bấm vào để kết nối thêm tài khoản OKX"
                    >
                      {isConnecting ? t("saving_btn") : "Kết Nối ➔"}
                    </span>
                  </div>

                  {/* Danh sách các tài khoản OKX đã kết nối */}
                  {accounts && accounts.length > 0 && (
                    <div
                      style={{
                        marginTop: "10px",
                        paddingTop: "8px",
                        borderTop: "1px solid #2d2d2d",
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                        width: "100%",
                      }}
                    >
                      {accounts.map((acc, idx) => {
                        const raw = formatOkxAccountTag(acc);
                        return (
                          <div
                            key={acc.id || idx}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "4px 8px 4px 6px",
                              background: "rgba(255, 255, 255, 0.02)",
                              borderRadius: "4px",
                              border: "1px solid rgba(255, 255, 255, 0.05)",
                            }}
                          >
                            {/* Dòng chữ màu xanh nghiêng Đã Connect #Bot-m15 - 4.935,71 USDT */}
                            <span
                              style={{
                                fontSize: "11px",
                                fontStyle: "italic",
                                color: "#4ade80",
                                fontWeight: "600",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "5px",
                              }}
                            >
                              <span
                                style={{
                                  width: "5px",
                                  height: "5px",
                                  borderRadius: "50%",
                                  background: "#4ade80",
                                  display: "inline-block",
                                  boxShadow: "0 0 6px #4ade80",
                                }}
                              ></span>
                              {`Đã Connect #${raw}${(() => {
                                const b = okxBalances[acc.id] ?? acc.balance ?? acc.equity ?? acc.availBal ?? null;
                                return (b !== null && !isNaN(Number(b)))
                                  ? ` - ${Number(b).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`
                                  : "";
                              })()}`}
                            </span>

                            {/* Nút Delete size nhỏ vừa phải kích thước chữ này */}
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onDisconnectAccount) onDisconnectAccount(acc.id);
                              }}
                              style={{
                                fontSize: "10px",
                                fontWeight: "600",
                                color: "#ff4d4f",
                                background: "rgba(255, 77, 79, 0.08)",
                                border: "1px solid rgba(255, 77, 79, 0.45)",
                                padding: "2px 8px",
                                borderRadius: "3px",
                                whiteSpace: "nowrap",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                userSelect: "none",
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                                lineHeight: "1.2",
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.22)";
                                e.currentTarget.style.borderColor = "#ff4d4f";
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.08)";
                                e.currentTarget.style.borderColor = "rgba(255, 77, 79, 0.45)";
                              }}
                              title={`Đăng xuất tài khoản #${raw}`}
                            >
                              Đăng Xuất
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* PHÂN KHU 2: FOREX */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 2px 0" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#888888", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    Forex
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#2e2e2e" }}></div>
                </div>

                {/* 2. THẺ HỢP NHẤT SÀN FOREX MT5 CÁ NHÂN (Vantage Markets, Exness...) */}
                {MT5_BROKERS.map((broker) => {
                  const connectedAccs = (propAccounts || []).filter((a) => {
                    const text = (a.firm || a.server || a.name || "").toLowerCase();
                    return text.includes(broker.key);
                  });

                  return (
                    <div
                      key={broker.key}
                      className="connect-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0px",
                        cursor: "default",
                        padding: "12px 14px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                      title={`Thẻ sàn ${broker.name}`}
                    >
                      {/* Header Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          width: "100%",
                        }}
                      >
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
                          {broker.key === "vantage" ? <VantageLogo size={24} /> : <ExnessLogo size={24} />}
                        </div>

                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                            {broker.name}
                            {connectedAccs.length > 0 && (
                              <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(38, 166, 154, 0.15)", color: "#26a69a", fontWeight: "bold" }}>
                                {connectedAccs.length} TK
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
                            {broker.sub}
                          </div>
                        </div>

                        <span
                          className="connect-action-badge"
                          onClick={() => handleOpenMt5Modal(broker.key)}
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#26a69a",
                            background: "rgba(38, 166, 154, 0.12)",
                            border: "1px solid rgba(38, 166, 154, 0.3)",
                            padding: "4px 9px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                          title={`Kết nối thêm tài khoản MT5 ${broker.name}`}
                        >
                          Kết Nối ➔
                        </span>
                      </div>

                      {/* Danh sách các tài khoản MT5 đã kết nối của sàn này */}
                      {connectedAccs.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "8px",
                            borderTop: "1px solid #2d2d2d",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            width: "100%",
                          }}
                        >
                          {connectedAccs.map((pAcc) => {
                            const accNum = pAcc.account_id || pAcc.id;
                            const balStr = pAcc.balance !== undefined && pAcc.balance !== null
                              ? ` - ${Number(pAcc.balance).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                              : "";
                            return (
                              <div
                                key={pAcc.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "4px 8px 4px 6px",
                                  background: "rgba(255, 255, 255, 0.02)",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                }}
                              >
                                {/* Dòng chữ màu xanh nghiêng */}
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontStyle: "italic",
                                    color: "#4ade80",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "5px",
                                      height: "5px",
                                      borderRadius: "50%",
                                      background: "#4ade80",
                                      display: "inline-block",
                                      boxShadow: "0 0 6px #4ade80",
                                    }}
                                  ></span>
                                  {`Đã Connect #${accNum}${balStr}`}
                                </span>

                                {/* Nút Delete size nhỏ vừa phải */}
                                <span
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePropAccount(pAcc.id);
                                  }}
                                  style={{
                                    fontSize: "10px",
                                    fontWeight: "600",
                                    color: "#ff4d4f",
                                    background: "rgba(255, 77, 79, 0.08)",
                                    border: "1px solid rgba(255, 77, 79, 0.45)",
                                    padding: "2px 8px",
                                    borderRadius: "3px",
                                    whiteSpace: "nowrap",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    userSelect: "none",
                                    cursor: "pointer",
                                    transition: "all 0.15s ease",
                                    lineHeight: "1.2",
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.22)";
                                    e.currentTarget.style.borderColor = "#ff4d4f";
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.08)";
                                    e.currentTarget.style.borderColor = "rgba(255, 77, 79, 0.45)";
                                  }}
                                  title={`Đăng xuất tài khoản MT5 #${accNum}`}
                                >
                                  Đăng Xuất
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* PHÂN KHU 3: QUỸ PROP FIRM */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", margin: "10px 0 2px 0" }}>
                  <span style={{ fontSize: "11px", fontWeight: "700", color: "#888888", letterSpacing: "0.6px", textTransform: "uppercase" }}>
                    Quỹ Prop Firm
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#2e2e2e" }}></div>
                </div>

                {/* 3. THẺ HỢP NHẤT QUỸ FX & PROP FIRM (E8 Markets, FTMO...) */}
                {PROP_FIRMS.map((firm) => {
                  const connectedAccs = (propAccounts || []).filter((a) =>
                    (a.firm || a.server || a.name || "").toLowerCase().includes(firm.key)
                  );

                  return (
                    <div
                      key={firm.key}
                      className="connect-card"
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "0px",
                        cursor: "default",
                        padding: "12px 14px",
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                      title={`Thẻ sàn ${firm.name}`}
                    >
                      {/* Header Row */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          width: "100%",
                        }}
                      >
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
                          {firm.key === "e8" ? (
                            <img src="/e8_logo.png" alt="E8" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                          ) : firm.key === "the5ers" ? (
                            <img src="/the5ers_logo.png" alt="The 5%ers" style={{ width: "28px", height: "28px", objectFit: "contain", borderRadius: "3px" }} />
                          ) : (
                            <img src="/ftmo_logo.png" alt="FTMO" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "3px" }} />
                          )}
                        </div>

                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff", display: "flex", alignItems: "center", gap: "6px" }}>
                            {firm.name}
                            {connectedAccs.length > 0 && (
                              <span style={{ fontSize: "9px", padding: "1px 5px", borderRadius: "3px", background: "rgba(38, 166, 154, 0.15)", color: "#26a69a", fontWeight: "bold" }}>
                                {connectedAccs.length} TK
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: "11px", color: "#888888", marginTop: "2px" }}>
                            {firm.sub}
                          </div>
                        </div>

                        <span
                          className="connect-action-badge"
                          onClick={() => handleOpenMt5Modal(firm.key)}
                          style={{
                            fontSize: "11px",
                            fontWeight: "700",
                            color: "#26a69a",
                            background: "rgba(38, 166, 154, 0.12)",
                            border: "1px solid rgba(38, 166, 154, 0.3)",
                            padding: "4px 9px",
                            borderRadius: "4px",
                            whiteSpace: "nowrap",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "4px",
                            cursor: "pointer",
                            transition: "all 0.18s ease",
                          }}
                          title={`Kết nối thêm tài khoản ${firm.name}`}
                        >
                          Kết Nối ➔
                        </span>
                      </div>

                      {/* Danh sách các tài khoản Quỹ đã kết nối */}
                      {connectedAccs.length > 0 && (
                        <div
                          style={{
                            marginTop: "10px",
                            paddingTop: "8px",
                            borderTop: "1px solid #2d2d2d",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                            width: "100%",
                          }}
                        >
                          {connectedAccs.map((pAcc) => {
                            const accNum = pAcc.account_id || pAcc.id;
                            const balStr = pAcc.balance !== undefined && pAcc.balance !== null
                              ? ` - ${Number(pAcc.balance).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                              : "";
                            return (
                              <div
                                key={pAcc.id}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "space-between",
                                  padding: "4px 8px 4px 6px",
                                  background: "rgba(255, 255, 255, 0.02)",
                                  borderRadius: "4px",
                                  border: "1px solid rgba(255, 255, 255, 0.05)",
                                }}
                              >
                                {/* Dòng chữ màu xanh nghiêng */}
                                <span
                                  style={{
                                    fontSize: "11px",
                                    fontStyle: "italic",
                                    color: "#4ade80",
                                    fontWeight: "600",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "5px",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "5px",
                                      height: "5px",
                                      borderRadius: "50%",
                                      background: "#4ade80",
                                      display: "inline-block",
                                      boxShadow: "0 0 6px #4ade80",
                                    }}
                                  ></span>
                                  {`Đã Connect #${accNum}${balStr}`}
                                </span>

                                {/* Cài đặt ⚙ & Delete */}
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>

                                  <span
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeletePropAccount(pAcc.id);
                                    }}
                                    style={{
                                      fontSize: "10px",
                                      fontWeight: "600",
                                      color: "#ff4d4f",
                                      background: "rgba(255, 77, 79, 0.08)",
                                      border: "1px solid rgba(255, 77, 79, 0.45)",
                                      padding: "2px 8px",
                                      borderRadius: "3px",
                                      whiteSpace: "nowrap",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      userSelect: "none",
                                      cursor: "pointer",
                                      lineHeight: "1.2",
                                    }}
                                    title="Đăng xuất tài khoản Quỹ này"
                                  >
                                    Đăng Xuất
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Các Quỹ khác ngoài E8, The 5%ers, FTMO (nếu có kết nối) */}
                {(propAccounts || [])
                  .filter((a) => {
                    const firmLower = (a.firm || a.server || a.name || "").toLowerCase();
                    return !firmLower.includes("e8") && !firmLower.includes("the5ers") && !firmLower.includes("ftmo") && !firmLower.includes("vantage") && !firmLower.includes("exness");
                  })
                  .map((pAcc) => {
                    const isActive = pAcc.id === activePropId;
                    return (
                      <div
                        key={pAcc.id}
                        className="connect-card"
                        style={{ cursor: "pointer" }}
                        onClick={() => {
                          setSelectedPropId(pAcc.id);
                          handleTabSwitch("tradelocker");
                        }}
                      >
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
                          <span style={{ fontSize: "12px", fontWeight: "bold", color: "#00e676" }}>FX</span>
                        </div>
                        <div style={{ flex: 1, textAlign: "left" }}>
                          <div style={{ fontSize: "13px", fontWeight: "600", color: "#ffffff" }}>
                            {pAcc.name || `Quỹ ${pAcc.firm || "E8"} Connect`}
                          </div>
                          <div style={{ fontSize: "11px", fontStyle: "italic", color: "#4ade80", marginTop: "2px", fontWeight: "600" }}>
                            {(() => {
                              const accNum = pAcc.account_id || pAcc.id;
                              const balStr = pAcc.balance !== undefined && pAcc.balance !== null
                                ? ` - $${Number(pAcc.balance).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD`
                                : "";
                              return `Đã Connect #${accNum}${balStr}`;
                            })()}
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPropId(pAcc.id);
                              handleTabSwitch("tradelocker");
                            }}
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#26a69a",
                              background: "rgba(38, 166, 154, 0.12)",
                              border: "1px solid rgba(38, 166, 154, 0.3)",
                              padding: "4px 9px",
                              borderRadius: "4px",
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              cursor: "pointer",
                              transition: "all 0.18s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(38, 166, 154, 0.25)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(38, 166, 154, 0.12)";
                            }}
                            title="Cài đặt thông số Quỹ (Lots, Cầu dao)"
                          >
                            Cài đặt ⚙
                          </span>
                          <span
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePropAccount(pAcc.id);
                            }}
                            style={{
                              fontSize: "11px",
                              fontWeight: "700",
                              color: "#ff4d4f",
                              background: "rgba(255, 77, 79, 0.08)",
                              border: "1px solid #ff4d4f",
                              padding: "4px 12px",
                              borderRadius: "4px",
                              whiteSpace: "nowrap",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              userSelect: "none",
                              cursor: "pointer",
                              transition: "all 0.18s ease",
                            }}
                            onMouseOver={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.22)";
                            }}
                            onMouseOut={(e) => {
                              e.currentTarget.style.backgroundColor = "rgba(255, 77, 79, 0.08)";
                            }}
                            title="Đăng xuất tài khoản Quỹ này"
                          >
                            Đăng Xuất
                          </span>
                        </div>
                      </div>
                    );
                  })}


                {/* Divider for Multi-exchange & Web3 ready */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", margin: "4px 0" }}>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
                  <span style={{ fontSize: "10.5px", color: "#888888", fontWeight: "bold", letterSpacing: "0.5px" }}>
                    {t("coming_soon_section")}
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "#333333" }}></div>
                </div>

                {/* Quỹ The 5%ers (Sắp hỗ trợ) */}
                <div className="connect-card disabled" title="Tính năng đang được tích hợp thêm">
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
                    <img
                      src="/the5ers_logo.png"
                      alt="The 5%ers"
                      style={{ width: "26px", height: "26px", objectFit: "contain", borderRadius: "4px", opacity: 0.75 }}
                    />
                  </div>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontSize: "13px", fontWeight: "600", color: "#cccccc" }}>Quỹ The 5%ers (TradeLocker)</div>
                    <div style={{ fontSize: "11px", color: "#666666" }}>TradeLocker API • Tự động tính Lots & Cầu dao</div>
                  </div>
                  <span style={{ fontSize: "10.5px", color: "#777777", background: "#181818", border: "1px solid #2a2a2a", padding: "3px 7px", borderRadius: "4px" }}>
                    {t("coming_soon")}
                  </span>
                </div>

                {/* 3. Binance Connect Card (Coming Soon) */}
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

                {/* 4. Bybit Connect Card (Coming Soon) */}
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

                {/* 5. OKX Web3 Wallet / Crypto Wallet Card (Coming Soon) */}
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
            <div data-tour="connect-apikey-content" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {/* Chọn tài khoản gán cho bot */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                <label style={{ color: "#e0e0e0", fontSize: "11.5px", fontWeight: "bold", whiteSpace: "nowrap" }}>
                  Quản lý tài khoản:
                </label>
                <div style={{ display: "flex", gap: "5px", alignItems: "center" }}>
                  <select
                    className="styled-select"
                    style={{ minWidth: "160px", maxWidth: "210px", background: "#2d2d2d", border: "1px solid #555555", color: "#e0e0e0", padding: "4px 8px", borderRadius: "4px", fontSize: "11.5px" }}
                    value={modalAccountId || ""}
                    onChange={e => handleSelectAccount(e.target.value)}
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
                          const cleanAccId = String(acc.id || "").trim().replace(/^#/, "");
                          const cleanAccName = String(acc.name || "").trim().replace(/^#/, "");
                          let runningBotKey = null;
                          if (activeAccounts) {
                            const directStrat = activeAccounts[acc.id] || activeAccounts[cleanAccId] || (cleanAccName && activeAccounts[cleanAccName]);
                            if (directStrat && typeof directStrat === "string" && ["sub1", "sub2", "sub3"].includes(directStrat)) {
                              runningBotKey = directStrat;
                            } else {
                              for (const [key, val] of Object.entries(activeAccounts)) {
                                const stratMatch = key.startsWith("sub1") ? "sub1" : key.startsWith("sub2") ? "sub2" : key.startsWith("sub3") ? "sub3" : null;
                                if (stratMatch) {
                                  if (val === acc.id || val === cleanAccId || (cleanAccName && val === cleanAccName)) {
                                    runningBotKey = stratMatch;
                                    break;
                                  }
                                  if (Array.isArray(val) && val.some(v => v === acc.id || v === cleanAccId || (cleanAccName && v === cleanAccName))) {
                                    runningBotKey = stratMatch;
                                    break;
                                  }
                                }
                              }
                            }
                          }
                          const isThisBotAccount = (acc.id === modalAccountId || acc.id === botAccountMap?.[activeBotTab]);
                          const assignedOtherBot = !isThisBotAccount && Object.entries(botAccountMap || {}).find(([bot, accId]) => bot !== activeBotTab && accId === acc.id)?.[0];

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
                      setModalAccountId("");
                      setLocalApiKey("");
                      setLocalSecretKey("");
                      setLocalPassphrase("");
                      if (onCreateAccount) onCreateAccount();
                    }}
                    style={{ backgroundColor: "#28a745", color: "white", fontSize: "15px", fontWeight: "bold", borderRadius: "4px", width: "28px", height: "26px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    title={t("create_account_tooltip") || "Thêm tài khoản mới"}
                  >+</button>
                  <button
                    type="button"
                    disabled={!modalAccountId || accounts.length === 0}
                    onClick={() => {
                      if (!modalAccountId) return;
                      if (onDisconnectAccount) {
                        onDisconnectAccount(modalAccountId);
                      } else if (onDeleteAccount) {
                        onDeleteAccount(modalAccountId);
                      }
                    }}
                    style={{
                      backgroundColor: (!modalAccountId || accounts.length === 0) ? "#444444" : "#dc3545",
                      color: (!modalAccountId || accounts.length === 0) ? "#888888" : "white",
                      fontSize: "15px",
                      fontWeight: "bold",
                      borderRadius: "4px",
                      width: "28px",
                      height: "26px",
                      border: "none",
                      cursor: (!modalAccountId || accounts.length === 0) ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: (!modalAccountId || accounts.length === 0) ? 0.5 : 1,
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
                      value={localApiKey}
                      onChange={e => setLocalApiKey(e.target.value)}
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
                      value={localSecretKey}
                      onChange={e => setLocalSecretKey(e.target.value)}
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
                      value={localPassphrase}
                      onChange={e => setLocalPassphrase(e.target.value)}
                      placeholder="Nhập Passphrase..."
                    />
                  </div>
                </div>
              </div>

              {/* Nút Lưu API Key */}
              <button
                type="button"
                disabled={isSavingConfig || isConnecting}
                onClick={() => {
                  if (onSaveApiKey) {
                    onSaveApiKey({
                      accountId: modalAccountId,
                      apiKey: localApiKey,
                      secretKey: localSecretKey,
                      passphrase: localPassphrase,
                    });
                  }
                }}
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

          {/* TAB 3: TRADELOCKER / E8 MARKETS PROP FIRM */}
          {connectTab === "tradelocker" && (
            <div data-tour="connect-tradelocker-content" style={{ display: "flex", flexDirection: "column", width: "100%" }}>
              <TradeLockerTab
                currentUid={effectiveUid}
                t={t}
                initialSelectedId={selectedPropId}
                activeBotTab={activeBotTab}
                onAccountsUpdated={fetchPropAccounts}
              />
            </div>
          )}

          {/* Footer đã được loại bỏ hoàn toàn nút Đăng Xuất lớn thừa thãi, chuyển về nút Đăng Xuất riêng trên từng thẻ tài khoản */}
        </div>
      </div>

      {/* CONFIRM LOGOUT MODAL (YES/NO) */}
      <ConfirmLogoutModal
        isOpen={showConfirmLogout}
        onClose={() => setShowConfirmLogout(false)}
        uid={effectiveUid}
        isLoading={isLoggingOut}
        onConfirm={async () => {
          setIsLoggingOut(true);
          try {
            if (onLogout) await onLogout(effectiveUid);
          } finally {
            setIsLoggingOut(false);
            setShowConfirmLogout(false);
          }
        }}
      />

      {/* 🔷 CLASSIC MT5 LOGIN DIALOG (CHUẨN 100% GIAO DIỆN METATRADER 5) */}
      {mt5BrokerModal && (() => {
        const currentBroker = ALL_CONNECT_PROVIDERS.find((b) => b.key === mt5BrokerModal) || ALL_CONNECT_PROVIDERS[0];
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: "rgba(0, 0, 0, 0.78)",
              backdropFilter: "blur(6px)",
              WebkitBackdropFilter: "blur(6px)",
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "center",
              zIndex: 10005,
              padding: "16px",
              paddingTop: "max(92px, 10.5vh)",
              boxSizing: "border-box",
            }}
            onClick={() => {
              if (!mt5Connecting) setMt5BrokerModal(null);
            }}
          >
            <div
              style={{
                width: "100%",
                maxWidth: "460px",
                minHeight: "520px",
                backgroundColor: "#202020",
                border: "1px solid #3d3d3d",
                borderRadius: "8px",
                boxShadow: "0 24px 60px rgba(0, 0, 0, 0.95), 0 0 1px 1px rgba(255, 255, 255, 0.08)",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                animation: "modalFadeIn 0.15s ease-out",
                fontFamily: '"Segoe UI", -apple-system, BlinkMacSystemFont, "Roboto", sans-serif',
              }}
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const isPropFirm = currentBroker.key === "e8" || currentBroker.key === "ftmo";
                const isTradeLockerServer = mt5ServerVal === "E8" || mt5ServerVal === "E8-Live";

                return (
                  <>
                    {/* Modal Title Bar */}
                    <div
                      style={{
                        backgroundColor: "#181818",
                        borderBottom: "1px solid #333333",
                        padding: "10px 16px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <MT5Icon size={20} />
                        <span style={{ fontSize: "13px", fontWeight: "bold", color: "#ffffff", letterSpacing: "0.3px" }}>
                          {isPropFirm ? "Kết Nối Tài Khoản Quỹ (Prop Firm)" : "Đăng Nhập Tài Khoản MT5"}
                        </span>
                        <span
                          style={{
                            fontSize: "10px",
                            fontWeight: "bold",
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: currentBroker.badgeBg || "rgba(38, 166, 154, 0.2)",
                            color: currentBroker.badgeColor || "#26a69a",
                            border: `1px solid ${currentBroker.badgeBorder || "rgba(38, 166, 154, 0.4)"}`,
                          }}
                        >
                          {currentBroker.badgeText || currentBroker.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (!mt5Connecting) setMt5BrokerModal(null);
                        }}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#888888",
                          fontSize: "18px",
                          cursor: "pointer",
                          lineHeight: 1,
                          padding: "2px",
                          transition: "color 0.15s",
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.color = "#ffffff")}
                        onMouseOut={(e) => (e.currentTarget.style.color = "#888888")}
                        title="Đóng"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Sub-header Banner */}
                    <div
                      style={{
                        padding: "10px 16px",
                        background: "linear-gradient(90deg, #162436 0%, #1a1a1a 100%)",
                        borderBottom: "1px solid #2a2a2a",
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          background: "#000000",
                          borderRadius: "6px",
                          border: "1px solid #333333",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}
                      >
                        {mt5BrokerModal === "vantage" ? (
                          <VantageLogo size={24} />
                        ) : mt5BrokerModal === "exness" ? (
                          <ExnessLogo size={24} />
                        ) : mt5BrokerModal === "e8" ? (
                          <img src="/e8_logo.png" alt="E8" style={{ width: "22px", height: "22px", objectFit: "contain" }} />
                        ) : (
                          <img src="/ftmo_logo.png" alt="FTMO" style={{ width: "24px", height: "24px", objectFit: "contain", borderRadius: "3px" }} />
                        )}
                      </div>
                      <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontSize: "12.5px", fontWeight: "bold", color: "#ffffff" }}>
                          {currentBroker.bannerTitle || `${currentBroker.name} • Kết nối tài khoản`}
                        </div>
                        <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "1px" }}>
                          {isPropFirm
                            ? "Nhập Email/Tài khoản và mật khẩu do Quỹ cấp để bot giao dịch"
                            : "Nhập số tài khoản MT5 & mật khẩu do sàn cấp để bot giao dịch"}
                        </div>
                      </div>
                    </div>

                    {/* Form Body (Chuẩn hóa 3 ô nhập liệu theo TradeLocker & MT5) */}
                    <form onSubmit={handleMt5Submit} style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: "14px", flex: 1, boxSizing: "border-box" }}>
                      {/* Dòng 1: Login / Email / ID */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "bold", color: "#cccccc", marginBottom: "4px" }}>
                          {isPropFirm ? "Email / Đăng nhập (Login):" : "Số tài khoản MT5 (Login / ID):"}
                        </label>
                        <input
                          type="text"
                          className="connect-input"
                          style={{
                            fontSize: "13px",
                            fontWeight: "600",
                            letterSpacing: "0.5px",
                            padding: "8px 10px",
                          }}
                          value={mt5LoginVal}
                          onChange={(e) => setMt5LoginVal(e.target.value)}
                          placeholder={
                            isPropFirm
                              ? "Nhập Email đăng ký hoặc ID tài khoản Quỹ cấp..."
                              : "Nhập số tài khoản MT5 sàn cấp (ví dụ: 1083921)..."
                          }
                          autoFocus
                        />
                      </div>

                      {/* Dòng 2: Password */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "bold", color: "#cccccc", marginBottom: "4px" }}>
                          Mật khẩu giao dịch (Password):
                        </label>
                        <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                          <input
                            type={mt5ShowPass ? "text" : "password"}
                            className="connect-input"
                            style={{
                              fontSize: "13px",
                              padding: "8px 36px 8px 10px",
                            }}
                            value={mt5PassVal}
                            onChange={(e) => setMt5PassVal(e.target.value)}
                            placeholder={isPropFirm ? "Mật khẩu tài khoản Quỹ cấp..." : "Mật khẩu giao dịch MT5 do sàn cấp..."}
                          />
                          <button
                            type="button"
                            onClick={() => setMt5ShowPass(!mt5ShowPass)}
                            style={{
                              position: "absolute",
                              right: "8px",
                              background: "transparent",
                              border: "none",
                              color: mt5ShowPass ? "#00e676" : "#888888",
                              fontSize: "13px",
                              cursor: "pointer",
                              padding: "4px",
                            }}
                            title={mt5ShowPass ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                          >
                            {mt5ShowPass ? "👁" : "👁‍🗨"}
                          </button>
                        </div>
                      </div>

                      {/* Dòng 3: Server */}
                      <div>
                        <label style={{ display: "block", fontSize: "11.5px", fontWeight: "bold", color: "#cccccc", marginBottom: "4px" }}>
                          {isPropFirm ? "Máy chủ Quỹ (Server):" : "Máy chủ sàn MT5 (Server):"}
                        </label>
                        <select
                          className="styled-select"
                          style={{
                            width: "100%",
                            background: "#181818",
                            border: "1px solid #333333",
                            color: "#ffffff",
                            padding: "8px 10px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "500",
                            outline: "none",
                          }}
                          value={mt5ServerVal}
                          onChange={(e) => setMt5ServerVal(e.target.value)}
                        >
                          {currentBroker.servers.map((srv) => (
                            <option key={srv.value} value={srv.value} style={{ background: "#222222", color: "#ffffff" }}>
                              {srv.label}
                            </option>
                          ))}
                        </select>

                        {mt5ServerVal === "Other-MT5" && (
                          <input
                            type="text"
                            className="connect-input"
                            style={{ marginTop: "6px", fontSize: "12px" }}
                            placeholder="Nhập tên server chính xác do sàn/quỹ cung cấp..."
                            value={mt5CustomServer}
                            onChange={(e) => setMt5CustomServer(e.target.value)}
                          />
                        )}

                        {/* Thẻ Ghi Chú Nền Tảng (TradeLocker / MT5) */}
                        {isTradeLockerServer ? (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              background: "rgba(38, 166, 154, 0.08)",
                              border: "1px solid rgba(38, 166, 154, 0.25)",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              fontSize: "11px",
                              color: "#26a69a",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>🌐 Nền tảng: <strong>TradeLocker</strong></span>
                              <span style={{ color: "#555" }}>•</span>
                              <span style={{ color: "#aaaaaa" }}>Đồng bộ Webtrader</span>
                            </div>
                            <a
                              href={mt5ServerVal === "E8-Live" ? "https://live.tradelocker.com" : "https://demo.tradelocker.com"}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ color: "#26a69a", textDecoration: "underline", fontWeight: "bold" }}
                            >
                              {mt5ServerVal === "E8-Live" ? "live.tradelocker.com ↗" : "demo.tradelocker.com ↗"}
                            </a>
                          </div>
                        ) : (
                          <div
                            style={{
                              marginTop: "8px",
                              padding: "8px 12px",
                              background: "rgba(25, 118, 210, 0.08)",
                              border: "1px solid rgba(25, 118, 210, 0.25)",
                              borderRadius: "4px",
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              fontSize: "11px",
                              color: "#64b5f6",
                            }}
                          >
                            <MT5Icon size={14} />
                            <span>
                              Nền tảng: <strong>MetaTrader 5 (MT5)</strong> • Khớp lệnh & theo dõi thời gian thực trên App MT5
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Checkbox Save Password (Chuẩn MT5) */}
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "2px" }}>
                        <input
                          type="checkbox"
                          id="mt5-save-password-check"
                          checked={mt5SavePass}
                          onChange={(e) => setMt5SavePass(e.target.checked)}
                          style={{ cursor: "pointer", accentColor: "#1976d2", width: "14px", height: "14px" }}
                        />
                        <label
                          htmlFor="mt5-save-password-check"
                          style={{ fontSize: "11.5px", color: "#aaaaaa", cursor: "pointer", userSelect: "none" }}
                        >
                          Lưu mật khẩu (Save password)
                        </label>
                      </div>

                      {/* Error & Success Alerts */}
                      {mt5Error && (
                        <div
                          style={{
                            backgroundColor: "rgba(255, 77, 79, 0.12)",
                            border: "1px solid rgba(255, 77, 79, 0.4)",
                            color: "#ff7875",
                            fontSize: "11.5px",
                            padding: "8px 10px",
                            borderRadius: "4px",
                            lineHeight: "1.4",
                          }}
                        >
                          {mt5Error}
                        </div>
                      )}
                      {mt5Success && (
                        <div
                          style={{
                            backgroundColor: "rgba(0, 230, 118, 0.12)",
                            border: "1px solid rgba(0, 230, 118, 0.4)",
                            color: "#00e676",
                            fontSize: "11.5px",
                            padding: "8px 10px",
                            borderRadius: "4px",
                            lineHeight: "1.4",
                            fontWeight: "bold",
                          }}
                        >
                          {mt5Success}
                        </div>
                      )}

                      {/* Action Buttons (OK / Cancel) */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          gap: "10px",
                          marginTop: "auto",
                          paddingTop: "14px",
                          borderTop: "1px solid #333333",
                        }}
                      >
                        <button
                          type="button"
                          disabled={mt5Connecting}
                          onClick={() => setMt5BrokerModal(null)}
                          style={{
                            background: "#2a2a2a",
                            border: "1px solid #444444",
                            color: "#cccccc",
                            padding: "8px 16px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "600",
                            cursor: mt5Connecting ? "not-allowed" : "pointer",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => {
                            if (!mt5Connecting) e.currentTarget.style.backgroundColor = "#333333";
                          }}
                          onMouseOut={(e) => {
                            if (!mt5Connecting) e.currentTarget.style.backgroundColor = "#2a2a2a";
                          }}
                        >
                          Hủy (Cancel)
                        </button>

                        <button
                          type="submit"
                          disabled={mt5Connecting}
                          style={{
                            background: "linear-gradient(180deg, #1976d2 0%, #1565c0 100%)",
                            border: "1px solid #1e88e5",
                            color: "#ffffff",
                            padding: "8px 20px",
                            borderRadius: "4px",
                            fontSize: "12px",
                            fontWeight: "bold",
                            cursor: mt5Connecting ? "not-allowed" : "pointer",
                            boxShadow: "0 2px 8px rgba(25, 118, 210, 0.4)",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "6px",
                            transition: "all 0.15s",
                          }}
                          onMouseOver={(e) => {
                            if (!mt5Connecting) e.currentTarget.style.boxShadow = "0 4px 14px rgba(25, 118, 210, 0.6)";
                          }}
                          onMouseOut={(e) => {
                            if (!mt5Connecting) e.currentTarget.style.boxShadow = "0 2px 8px rgba(25, 118, 210, 0.4)";
                          }}
                        >
                          {mt5Connecting ? (
                            <>
                              <span className="spinner" style={{ width: "12px", height: "12px", borderWidth: "2px" }}></span>
                              {isPropFirm ? "Đang kết nối Quỹ..." : "Đang kết nối MT5..."}
                            </>
                          ) : (
                            isPropFirm ? "KẾT NỐI QUỸ (OK)" : "ĐĂNG NHẬP MT5 (OK)"
                          )}
                        </button>
                      </div>
                    </form>
                  </>
                );
              })()}
            </div>
          </div>
        );
      })()}
    </div>
  );
}
