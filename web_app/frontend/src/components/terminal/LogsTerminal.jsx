import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "../../i18n";

export default function LogsTerminal({ 
  logs: externalLogs, 
  okxLogs,
  propLogs,
  currentPlatform = "okx",
  onSwitchPlatform,
  isOkxRunning = false,
  isPropRunning = false,
  activeBotTab, 
  loginUid, 
  isAuthenticated 
}) {
  // Dual-mode: nếu App.jsx truyền logs prop sẵn → render từ nó (App tự quản lý WS)
  // Nếu truyền activeBotTab + isAuthenticated → tự kết nối WS riêng
  const isSelfManaged = !externalLogs && !okxLogs && !propLogs && isAuthenticated && activeBotTab;

  const [internalLogs, setInternalLogs] = useState({ dashboardLines: [], eventLogs: [] });
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const stagingRef = useRef([]);
  const isStagingRef = useRef(false);
  const [fitStyles, setFitStyles] = useState({});
  const { lang, t } = useTranslation();

  const formatLogLine = (line) => {
    if (!line || lang === "vi") return line;
    let s = line;
    if (s.includes("Đang kết nối với TLS1 Trading Web Terminal Server")) {
      return t("log_connecting_server", "Connecting to TLS1 Trading Web Terminal Server...");
    }
    if (s.includes("Vui lòng kết nối tài khoản OKX để bắt đầu sử dụng và xem logs bot")) {
      return t("log_connect_okx_prompt", "ℹ️ Please connect OKX account to start using and view bot logs.");
    }
    if (s.includes("Đã kết nối với TLS1 Trading Web Terminal Server")) {
      const match = s.match(/\[(.*?)\]/);
      const tag = match ? ` [${match[1]}]` : "";
      return `✅ ${t("log_connected_server", "Connected to TLS1 Trading Web Terminal Server")}${tag}`;
    }
    if (s.includes("Đã gửi lệnh algo TP/SL bảo vệ cho")) {
      s = s.replace("Đã gửi lệnh algo TP/SL bảo vệ cho", t("log_algo_placed", "Algo TP/SL protection sent for"));
      s = s.replace("TP tại", t("log_tp_at", "TP at"));
      s = s.replace("SL tại", t("log_sl_at", "SL at"));
    }
    if (s.includes("Đặt lệnh LIMIT thành công")) {
      s = s.replace("Đặt lệnh LIMIT thành công", t("log_limit_success", "LIMIT order placed successfully"));
    }
    if (s.includes("Hủy lệnh LIMIT")) {
      s = s.replace("Hủy lệnh LIMIT", t("log_cancel_limit", "Cancelled LIMIT order"));
    }
    if (s.includes("Khớp lệnh")) {
      s = s.replace("Khớp lệnh", t("log_filled", "Order filled"));
    }
    return s;
  };

  // 📱 Tự động co dãn (Auto-Fit) kích thước chữ vừa khít 2 viền màn hình trên Mobile / iPhone Safari
  useEffect(() => {
    const el = terminalRef.current;
    if (!el) return;

    const updateFit = () => {
      const containerWidth = el.clientWidth;
      if (!containerWidth) return;

      if (containerWidth < 768) {
        // Trừ padding 2 bên (khoảng 8px)
        const usableWidth = Math.max(containerWidth - 8, 200);
        // Bảng dashboard chuẩn có độ rộng 78 ký tự ('=' * 78)
        // Usable width / 48.5 giúp 78 ký tự co dãn vừa khít 2 viền trái-phải và 87 ký tự không tràn
        const calculatedSize = usableWidth / 48.5;
        const fontSize = Math.max(6.8, Math.min(11.5, calculatedSize));
        const letterSpacing = usableWidth < 380 ? -0.34 : (usableWidth < 440 ? -0.26 : -0.2);

        setFitStyles({
          fontSize: `${fontSize.toFixed(2)}px`,
          letterSpacing: `${letterSpacing}px`,
        });
      } else {
        setFitStyles({});
      }
    };

    updateFit();
    const observer = new ResizeObserver(updateFit);
    observer.observe(el);
    window.addEventListener("resize", updateFit);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, []);

  // Self-managed WS mode (khi App.jsx không truyền logs)
  useEffect(() => {
    if (!isSelfManaged) return;
    let isMounted = true;
    let ws = null;

    const connectWS = () => {
      if (!isMounted) return;
      const uid = localStorage.getItem("tls1_uid") || loginUid;
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const url = `${protocol}//${window.location.host}/ws/logs/${uid}/${activeBotTab}`;
      ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        if (!e.data) return;
        const line = e.data.trimEnd();
        if (!line) return;

        // 🛡️ Lọc bỏ tuyệt đối các chuỗi / thẻ rác HTML từ Cloudflare (502/504 Bad Gateway)
        const lowerLine = line.toLowerCase();
        if (
          lowerLine.startsWith("<") ||
          lowerLine.includes("<!doctype") ||
          lowerLine.includes("<html") ||
          lowerLine.includes("<body") ||
          lowerLine.includes("<head") ||
          lowerLine.includes("<script") ||
          lowerLine.includes("<style") ||
          lowerLine.includes("cloudflare") ||
          lowerLine.includes("cf-error") ||
          lowerLine.includes("ray id:") ||
          lowerLine.includes("502 bad gateway") ||
          lowerLine.includes("504 gateway") ||
          lowerLine.includes("window._cf_")
        ) {
          return;
        }

        const isHeader = line.includes("bot_sub1.py") || line.includes("bot_sub2.py") || line.includes("bot_sub3.py") || line.includes("sys_bot_");

        const isEventLog = 
          line.startsWith("⏳") || line.startsWith("🔒") || line.startsWith("🚨") || 
          line.startsWith("🧹") || line.startsWith("✅") || line.startsWith("🚀") || 
          line.startsWith("💡") || line.startsWith("⚠️") || line.startsWith("🌑") || 
          line.startsWith("⚙️") || line.startsWith("🔑") || line.startsWith("🛑") || 
          line.startsWith("➕") || line.startsWith("🗑️") || line.startsWith("♻️") || 
          line.startsWith("🔄") || line.startsWith("✧") ||
          line.startsWith("[TP/SL") || line.startsWith("[LIMIT") || line.startsWith("[CANCEL") || 
          line.startsWith("[ORDER") || line.startsWith("[CLOSE") || line.startsWith("[ERROR") || 
          line.startsWith("[INFO") || line.startsWith("[SYSTEM") || line.startsWith("[OKX");

        if (isHeader) {
          isStagingRef.current = true;
          stagingRef.current = [line];
          return;
        }

        if (isStagingRef.current && !isEventLog) {
          stagingRef.current.push(line);
          const hasContent = stagingRef.current.some(l => l.includes("Coin") || l.includes("Price") || l.includes("Tình trạng vị thế"));
          if (line.startsWith("===") && line.length >= 40 && stagingRef.current.length >= 10 && hasContent) {
            const frame = [...stagingRef.current];
            stagingRef.current = [];
            isStagingRef.current = false;
            setInternalLogs(prev => ({
              dashboardLines: frame,
              eventLogs: (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [],
            }));
            return;
          }
          return;
        }

        setInternalLogs(prev => {
          const cur = (prev && Array.isArray(prev.eventLogs)) ? prev.eventLogs : [];
          const nowStr = new Date().toLocaleTimeString("vi-VN", { hour12: false });
          const fmt = (line.startsWith("[") || line.startsWith("⏳") || line.startsWith("⚙️")) ? line : `[${nowStr}] ${line}`;
          return {
            dashboardLines: (prev && Array.isArray(prev.dashboardLines)) ? prev.dashboardLines : [],
            eventLogs: [fmt, ...cur].slice(0, 60),
          };
        });
      };

      ws.onclose = () => {
        if (isMounted && wsRef.current === ws) {
          setTimeout(connectWS, 3000);
        }
      };

      ws.onerror = () => {
        try {
          ws.close();
        } catch {}
      };
    };

    setInternalLogs({ dashboardLines: [], eventLogs: [] });
    stagingRef.current = [];
    isStagingRef.current = false;
    if (wsRef.current) {
      wsRef.current.onclose = null;
      wsRef.current.close();
    }
    connectWS();

    return () => {
      isMounted = false;
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isSelfManaged, activeBotTab, loginUid]);

  // Lựa chọn nguồn log theo Kênh sàn/quỹ
  const activeRawLogs = React.useMemo(() => {
    if (currentPlatform === "e8") {
      return propLogs || externalLogs;
    }
    return okxLogs || externalLogs;
  }, [currentPlatform, propLogs, okxLogs, externalLogs]);

  // Phân rã dữ liệu: Bảng Dashboard cố định ở trên + Dải Event Logs ở dưới
  const { dashboardLines, eventLogs } = React.useMemo(() => {
    const raw = activeRawLogs || internalLogs;
    if (!raw) return { dashboardLines: [], eventLogs: [] };
    if (typeof raw === "object" && !Array.isArray(raw)) {
      return {
        dashboardLines: Array.isArray(raw.dashboardLines) ? raw.dashboardLines : [],
        eventLogs: Array.isArray(raw.eventLogs) ? raw.eventLogs : [],
      };
    }
    if (Array.isArray(raw)) {
      if (raw.length > 0 && typeof raw[0] === "string") {
        return { dashboardLines: raw, eventLogs: [] };
      }
      if (raw.length > 0 && raw[0]?.lines) {
        return {
          dashboardLines: raw[0].lines || [],
          eventLogs: raw.slice(1).flatMap(b => b.lines || []),
        };
      }
    }
    return { dashboardLines: [], eventLogs: [] };
  }, [activeRawLogs, internalLogs]);

  // Giữ vị trí cuộn đầu trang khi nạp Dashboard lần đầu
  const hasInitializedScrollRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedScrollRef.current && dashboardLines.length > 0 && terminalRef.current) {
      terminalRef.current.scrollTop = 0;
      hasInitializedScrollRef.current = true;
    }
  }, [dashboardLines.length]);

  const handleCopy = () => {
    const parts = [];
    if (dashboardLines.length > 0) parts.push(dashboardLines.join("\n"));
    if (eventLogs.length > 0) parts.push("--- " + t("log_events_title", "NHẬT KÝ SỰ KIỆN TỨC THỜI") + " ---\n" + eventLogs.join("\n"));
    navigator.clipboard.writeText(parts.join("\n\n")).then(() => {
      alert(t("log_copied", "Đã sao chép toàn bộ logs vào Clipboard!"));
    });
  };

  const displayBotName = currentPlatform === "e8"
    ? "TRADELOCKER (QUỸ FX)"
    : (activeBotTab ? activeBotTab.toUpperCase() : "OKX BOT");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* 🧭 THANH ĐIỀU HƯỚNG TÁCH BIỆT KÊNH LOGS (SÀN OKX / QUỸ FX) */}
      <div
        className="logs-terminal-nav"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "7px 12px",
          background: "rgba(15, 23, 42, 0.85)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          flexShrink: 0,
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ color: "#94a3b8", fontWeight: 700, fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            {t("log_channel_label", "Kênh Logs:")}
          </span>

          {/* Nút Tab Kênh Sàn OKX */}
          <button
            type="button"
            onClick={() => onSwitchPlatform && onSwitchPlatform("okx")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 11px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: currentPlatform === "okx" ? "rgba(59, 130, 246, 0.22)" : "rgba(255, 255, 255, 0.04)",
              border: currentPlatform === "okx" ? "1px solid #3b82f6" : "1px solid rgba(255, 255, 255, 0.1)",
              color: currentPlatform === "okx" ? "#60a5fa" : "#94a3b8",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isOkxRunning ? "#22c55e" : "#64748b",
                boxShadow: isOkxRunning ? "0 0 7px #22c55e" : "none",
              }}
            />
            <span>🌐 SÀN OKX</span>
            {isOkxRunning && <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800 }}>LIVE</span>}
          </button>

          {/* Nút Tab Kênh Quỹ FX (TradeLocker) */}
          <button
            type="button"
            onClick={() => onSwitchPlatform && onSwitchPlatform("e8")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              padding: "4px 11px",
              borderRadius: "6px",
              fontSize: "11px",
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: currentPlatform === "e8" ? "rgba(245, 158, 11, 0.22)" : "rgba(255, 255, 255, 0.04)",
              border: currentPlatform === "e8" ? "1px solid #f59e0b" : "1px solid rgba(255, 255, 255, 0.1)",
              color: currentPlatform === "e8" ? "#fbbf24" : "#94a3b8",
            }}
          >
            <span
              style={{
                width: "7px",
                height: "7px",
                borderRadius: "50%",
                background: isPropRunning ? "#22c55e" : "#64748b",
                boxShadow: isPropRunning ? "0 0 7px #22c55e" : "none",
              }}
            />
            <span>🏆 QUỸ FX (TRADELOCKER)</span>
            {isPropRunning && <span style={{ fontSize: "9px", color: "#4ade80", fontWeight: 800 }}>LIVE</span>}
          </button>
        </div>

        {/* Nút Sao chép Logs */}
        <button
          type="button"
          onClick={handleCopy}
          style={{
            padding: "4px 10px",
            borderRadius: "5px",
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#cbd5e1",
            fontSize: "11px",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            transition: "all 0.15s ease",
          }}
          title={t("log_copy_tooltip", "Sao chép toàn bộ logs của kênh đang chọn")}
        >
          📋 {t("log_copy_btn", "Sao chép")}
        </button>
      </div>

      {/* Vùng hiển thị Logs Terminal */}
      <div
        className="logs-terminal"
        ref={terminalRef}
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          WebkitTextSizeAdjust: "none",
          paddingBottom: "24px",
          ...fitStyles,
        }}
      >
        {dashboardLines.length === 0 && eventLogs.length === 0 ? (
          <div style={{ color: "#666", padding: "16px 0", fontStyle: "italic" }}>
            {t("log_waiting", "Đang đợi dữ liệu console từ bot {name}...").replace("{name}", displayBotName)}
          </div>
        ) : (
          <>
            {/* 1. KHU VỰC BẢNG TRẠNG THÁI DASHBOARD (CỐ ĐỊNH Ở TRÊN CÙNG - KHÔNG BAO GIỜ BỊ ĐẨY XUỐNG) */}
            {dashboardLines.length > 0 && (
              <div
                className="log-dashboard-block"
                style={{
                  minWidth: "fit-content",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  WebkitTextSizeAdjust: "none",
                }}
              >
                {dashboardLines.map((l, i) => (
                  <div
                    key={i}
                    className="log-line"
                    style={{
                      whiteSpace: "pre",
                      minWidth: "fit-content",
                      fontSize: "inherit",
                      letterSpacing: "inherit",
                      WebkitTextSizeAdjust: "none",
                    }}
                  >
                    {l}
                  </div>
                ))}
              </div>
            )}

            {/* 2. KHU VỰC NHẬT KÝ SỰ KIỆN TỨC THỜI (Ở DƯỚI BẢNG, KHÔNG BAO GIỜ LÀM NHẢY BẢNG) */}
            {eventLogs.length > 0 && (
              <div
                className="log-events-block"
                style={{
                  marginTop: dashboardLines.length > 0 ? "14px" : "0",
                  paddingTop: dashboardLines.length > 0 ? "10px" : "0",
                  borderTop: dashboardLines.length > 0 ? "1px dashed rgba(255, 255, 255, 0.15)" : "none",
                  minWidth: "fit-content",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  WebkitTextSizeAdjust: "none",
                }}
              >
                {dashboardLines.length > 0 && (
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "#f59e0b",
                      marginBottom: "6px",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      opacity: 0.9,
                    }}
                  >
                    <span>{t("log_events_title", "⚡ NHẬT KÝ SỰ KIỆN TỨC THỜI")} ({eventLogs.length})</span>
                    <span style={{ fontSize: "10px", color: "#888", fontWeight: "normal" }}>
                      {t("log_events_desc", "(Tin mới nhất ở trên cùng • Không làm nhảy bảng trên)")}
                    </span>
                  </div>
                )}
                {eventLogs.map((l, i) => (
                  <div
                    key={i}
                    className="log-line event-log-line"
                    style={{
                      whiteSpace: "pre",
                      minWidth: "fit-content",
                      fontSize: "inherit",
                      letterSpacing: "inherit",
                      WebkitTextSizeAdjust: "none",
                      color: (l.includes("⏳") || l.includes("TP/SL") || l.includes("🏆"))
                        ? "#fbbf24"
                        : (l.includes("🚨") || l.includes("Lỗi") || l.includes("ERROR") || l.includes("REJECT") || l.includes("THẤT BẠI"))
                        ? "#f87171"
                        : (l.includes("⚠️"))
                        ? "#fb923c"
                        : (l.includes("✅") || l.includes("SUCCESS") || l.includes("thành công") || l.includes("🔑"))
                        ? "#34d399"
                        : (l.includes("🚀") || l.includes("LIMIT") || l.includes("MARKET"))
                        ? "#38bdf8"
                        : (l.includes("🧹"))
                        ? "#c084fc"
                        : (l.includes("🌑"))
                        ? "#94a3b8"
                        : "#94a3b8",
                      lineHeight: "1.45",
                    }}
                  >
                    {formatLogLine(l)}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
