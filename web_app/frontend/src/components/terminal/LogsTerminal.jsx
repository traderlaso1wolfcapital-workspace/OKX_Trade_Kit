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
  isAuthenticated,
  selectedAccount,
  hasActiveAccount = false,
  accountsCount = 0,
  onResetCapital,
  positions = [],
  accountBalance = null,
  runningAccId = null,
  accounts = [],
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

  // 🎨 Định dạng màu sắc đồng nhất theo từng chủ đề cho Gốc, Tổng, PNL (không chia đậm/nhạt, Vol để màu xám chuẩn)
  const renderDashboardLine = (line) => {
    if (!line || typeof line !== "string") return line;

    const hasGoc = line.includes("Gốc:");
    const hasTong = line.includes("Tổng:");
    const hasPnl = line.includes("PNL:");

    if (!hasGoc && !hasTong && !hasPnl) {
      return line;
    }

    const parts = line.split("|");
    if (parts.length <= 1) return line;

    return parts.map((col, idx) => {
      let content = col;

      if (col.includes("Gốc:")) {
        // Gốc -> Đồng nhất sắc thái Cyan (#38bdf8)
        content = <span style={{ color: "#38bdf8" }}>{col}</span>;
      } else if (col.includes("Tổng:")) {
        // Tổng -> Đồng nhất sắc thái Xanh lá (#4ade80)
        content = <span style={{ color: "#4ade80" }}>{col}</span>;
      } else if (col.includes("PNL:")) {
        // PNL -> Đồng nhất sắc thái: Xanh ngọc nếu dương (#34d399), Đỏ san hô nếu âm (#f87171)
        const isNegative = col.includes("-");
        content = <span style={{ color: isNegative ? "#f87171" : "#34d399" }}>{col}</span>;
      }

      return (
        <React.Fragment key={idx}>
          {idx > 0 && <span style={{ color: "#475569" }}>|</span>}
          {content}
        </React.Fragment>
      );
    });
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
      const accQuery = selectedAccount ? `?account_id=${encodeURIComponent(selectedAccount)}` : "";
      const url = `${protocol}//${window.location.host}/ws/logs/${uid}/${activeBotTab}${accQuery}`;
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

        const isDashboardLine =
          line.startsWith("===") ||
          line.startsWith("---") ||
          line.includes("Thợ săn EMA200") ||
          line.includes("Quỹ E8") ||
          line.includes("Quỹ FX") ||
          line.includes("Mode:") ||
          line.includes("Gốc:") ||
          line.includes("Lợi nhuận") ||
          line.includes("Coin |") ||
          (line.includes("Coin") && line.includes("Price")) ||
          line.includes("Tình trạng vị thế") ||
          line.includes("HỆ THỐNG GIAO DỊCH QUỸ FX") ||
          line.includes("Tài khoản Quỹ :") ||
          line.includes("Số dư Quỹ     :") ||
          line.includes("Trạng thái Bot:") ||
          line.includes("╭─") || line.includes("├─") || line.includes("╰─") ||
          line.includes("Win Streak:") ||
          (line.includes("|") && (line.includes("▲") || line.includes("▼")));

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

        if (isDashboardLine) {
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
        } catch { }
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
  }, [isSelfManaged, activeBotTab, loginUid, selectedAccount]);

  // Phân rã dữ liệu: Bảng Dashboard cố định ở trên + Dải Event Logs ở dưới
  const { dashboardLines, eventLogs } = React.useMemo(() => {
    if (currentPlatform === "e8") {
      const propHeader = Array.isArray(propLogs?.dashboardLines) ? propLogs.dashboardLines : [];
      const okxDashboard = Array.isArray(okxLogs?.dashboardLines) ? okxLogs.dashboardLines : [];

      // 🛡️ Xây dựng Tình trạng vị thế chuẩn 100% từ TradeLocker E8:
      const propPosLines = ["✜ Tình trạng vị thế:"];
      const coins = ["XAU", "BTC", "ETH"];

      coins.forEach(c => {
        // 1. Kiểm tra vị thế thật đang mở trên TradeLocker
        const activePos = Array.isArray(positions)
          ? positions.find(p => !p.is_limit && (p.instId || p.coin || "").toUpperCase().includes(c))
          : null;

        // 2. Kiểm tra lệnh chờ Limit đang cắm trên TradeLocker
        const limitPos = Array.isArray(positions)
          ? positions.filter(p => p.is_limit && (p.instId || p.coin || "").toUpperCase().includes(c))
          : [];

        if (activePos) {
          const side = (activePos.posSide || activePos.side || "long").toUpperCase();
          const lot = activePos.lots || activePos.pos || 0.01;
          const upl = Number(activePos.upl || 0);
          const uplSign = upl >= 0 ? "+" : "";
          const uplRatio = activePos.uplRatio || `${uplSign}0.0%`;
          const avgPx = activePos.avgPx ? Number(activePos.avgPx).toLocaleString() : "0.0";
          const lastPx = activePos.lastPx ? Number(activePos.lastPx).toLocaleString() : avgPx;
          propPosLines.push(`    ${c} ╭─ Đã khớp ${side} - ký quỹ: ${lot} L (${uplSign}${upl.toFixed(2)}$ / ${uplRatio})`);
          propPosLines.push(`        ├─ Entry: ${avgPx} ⭢ Mark: ${lastPx}`);
          propPosLines.push(`        ╰─ Chưa có lệnh đóng ⭢ Win Streak: 0`);
        } else if (limitPos.length > 0) {
          const firstLim = limitPos[0];
          const limSide = (firstLim.posSide || firstLim.side || "long").toUpperCase();
          const limPx = firstLim.avgPx ? Number(firstLim.avgPx).toLocaleString() : "0.0";
          const limLot = firstLim.lots || firstLim.pos || 0.01;
          propPosLines.push(`    ${c} ╭─ Chưa có vị thế, đang chờ Limit: ${limSide} @${limPx} (${limLot} L)`);
          propPosLines.push(`        ╰─ Chưa có lệnh đóng ⭢ Win Streak: 0`);
        } else {
          propPosLines.push(`    ${c} ╭─ Chưa có vị thế`);
          propPosLines.push(`        ╰─ Chưa có lệnh đóng ⭢ Win Streak: 0`);
        }
      });

      // Tìm vị trí bắt đầu bảng nến đa khung từ OKX Dashboard
      let tableIndex = -1;
      for (let i = 0; i < okxDashboard.length; i++) {
        if (okxDashboard[i].includes("Coin |") || (okxDashboard[i].includes("Coin") && okxDashboard[i].includes("Price"))) {
          tableIndex = i - 1;
          break;
        }
      }

      let combinedDashboard = propHeader;
      if (propHeader.length > 0) {
        if (tableIndex !== -1 && tableIndex >= 0) {
          combinedDashboard = [...propHeader, ...propPosLines, ...okxDashboard.slice(tableIndex)];
        } else {
          combinedDashboard = [...propHeader, ...propPosLines, "=".repeat(78)];
        }
      }

      const pEvents = Array.isArray(propLogs?.eventLogs) ? propLogs.eventLogs : [];
      return {
        dashboardLines: combinedDashboard,
        eventLogs: pEvents,
      };
    }

    // Khi ở Sàn OKX:
    const raw = okxLogs || externalLogs || internalLogs;
    let rawDashboard = [];
    let rawEvents = [];
    if (raw) {
      if (typeof raw === "object" && !Array.isArray(raw)) {
        rawDashboard = Array.isArray(raw.dashboardLines) ? raw.dashboardLines : [];
        rawEvents = Array.isArray(raw.eventLogs) ? raw.eventLogs : [];
      } else if (Array.isArray(raw)) {
        if (raw.length > 0 && typeof raw[0] === "string") {
          rawDashboard = raw;
        } else if (raw.length > 0 && raw[0]?.lines) {
          rawDashboard = raw[0].lines || [];
          rawEvents = raw.slice(1).flatMap(b => b.lines || []);
        }
      }
    }

    // 🛡️ TÁCH BIỆT LOGS & VỊ THẾ TỪNG TÀI KHOẢN HOÀN TOÀN:
    // Nếu tài khoản đang xem KHÔNG PHẢI là tài khoản đang chạy live bot,
    // tự động tái tạo bảng Dashboard và lọc triệt để 100% Event Logs của tài khoản đang chọn:
    const isCurrentAccountRunning = Boolean(
      isOkxRunning || (
        runningAccId &&
        selectedAccount &&
        (
          selectedAccount === runningAccId ||
          (typeof runningAccId === "string" && selectedAccount.replace("#", "") === runningAccId.replace("#", "")) ||
          (Array.isArray(runningAccId) && runningAccId.some(r => r === selectedAccount || String(r).replace("#", "") === String(selectedAccount).replace("#", "")))
        )
      )
    );

    if (!isCurrentAccountRunning && selectedAccount) {
      const totalEq = Number(accountBalance?.totalEq ?? accountBalance?.availBal ?? accountBalance?.balance ?? 0);
      let totalPnl = 0;
      if (Array.isArray(positions)) {
        totalPnl = positions
          .filter(p => !p.is_child && !Boolean(p.is_limit))
          .reduce((sum, p) => sum + Number(p.upl || p.pnl || 0), 0);
      }
      const pnlSign = totalPnl >= 0 ? "+" : "";
      const pnlStr = `${pnlSign}${totalPnl.toFixed(2)}`;
      const nowStr = new Date().toLocaleTimeString("vi-VN", { hour12: false });

      const dbar = "=".repeat(78);
      const bar = "-".repeat(78);
      const r0 = " ⚡ Thợ săn EMA200  |   💰 Lợi nhuận    |   🏦 Tài khoản    |  🎯 Hiệu suất  ";
      const r1_c1 = `   ${nowStr.padStart(9).padEnd(15)}   `;
      const baseCap = (totalEq - totalPnl) > 0 ? (totalEq - totalPnl) : totalEq;
      const r1_c2 = ` Gốc: ${baseCap.toFixed(2).padStart(8)} $ `;
      const r1_c3 = ` Tổng: ${totalEq.toFixed(2).padStart(8)} $ `;
      const r1_c4 = ` Win: 100.0% / 0  `;
      const r1 = `${r1_c1.padEnd(21)}|${r1_c2.padEnd(19)}|${r1_c3.padEnd(19)}|${r1_c4.padEnd(16)}`;

      const r2_c1 = " Mode: Độc Lập TF    ";
      const r2_c2 = ` PNL: ${pnlStr.padStart(8)} $ `;
      const r2_c3 = ` Vol :     4.0 U `;
      const r2_c4 = " M/M: -- / --   ";
      const r2 = `${r2_c1.padEnd(21)}|${r2_c2.padEnd(19)}|${r2_c3.padEnd(19)}|${r2_c4.padEnd(16)}`;

      const tailoredHeader = [dbar, r0, bar, r1, r2, dbar, "✜ Tình trạng vị thế:"];

      const coins = ["XAU", "BTC", "ETH"];
      coins.forEach(c => {
        const matchPos = Array.isArray(positions)
          ? positions.find(p => (p.instId || p.symbol || "").toUpperCase().includes(c) && !p.is_child && !Boolean(p.is_limit))
          : null;
        if (matchPos) {
          const side = (matchPos.posSide || matchPos.side || "short").toUpperCase();
          const margin = Number(matchPos.margin || matchPos.initialMargin || 0).toFixed(2);
          const uplPct = Number(matchPos.uplRatio ? matchPos.uplRatio * 100 : (matchPos.roi || 0)).toFixed(1);
          const uplPctSign = Number(uplPct) >= 0 ? "+" : "";
          const entryPx = Number(matchPos.avgPx || matchPos.openPrice || 0).toLocaleString();
          const markPx = Number(matchPos.markPx || matchPos.last || matchPos.lastPx || entryPx).toLocaleString();
          const tfStr = matchPos.tf ? ` [${matchPos.tf.split(" ")[0].toLowerCase()}]` : "";
          tailoredHeader.push(`    ${c} ╭─ Đã khớp ${side}${tfStr} - ký quỹ: ${margin} U (${uplPctSign}${uplPct}%)`);
          tailoredHeader.push(`        ├─ Entry: ${entryPx} ⭢ Mark: ${markPx}`);
          tailoredHeader.push(`        ╰─ Chưa có lệnh đóng ⭢ Win Streak: 0`);
        } else {
          tailoredHeader.push(`    ${c} ╭─ Chưa có vị thế`);
          tailoredHeader.push(`        ╰─ Chưa có lệnh đóng ⭢ Win Streak: 0`);
        }
      });

      // Lấy bảng nến đa khung từ snapshot nếu có
      let tableIndex = -1;
      for (let i = 0; i < rawDashboard.length; i++) {
        if (rawDashboard[i].includes("Coin |") || (rawDashboard[i].includes("Coin") && rawDashboard[i].includes("Price"))) {
          tableIndex = i - 1;
          break;
        }
      }
      const finalDashboard = (tableIndex !== -1 && tableIndex >= 0)
        ? [...tailoredHeader, ...rawDashboard.slice(tableIndex)]
        : [...tailoredHeader, dbar];

      // 🛡️ LỌC TUYỆT ĐỐI EVENT LOGS: Loại bỏ 100% nhật ký lệnh của tài khoản khác
      const otherAccounts = (accounts || [])
        .map(a => a?.id || a?.name)
        .filter(id => id && id !== selectedAccount && id !== String(selectedAccount).replace("#", ""));

      const filteredEvents = rawEvents.filter(line => {
        if (typeof line !== "string") return false;
        for (const oId of otherAccounts) {
          const clean = String(oId).replace("#", "");
          if (line.includes(`#${clean}`) || line.includes(`[${oId}]`) || line.includes(`ACC:${oId}`)) {
            return false;
          }
        }
        return true;
      });

      const currentAccObj = (accounts || []).find(a => a.id === selectedAccount || a.name === selectedAccount);
      const currentAccLabel = currentAccObj?.name || (String(selectedAccount).startsWith("#") ? selectedAccount : `#${selectedAccount}`);

      const cleanEvents = [...filteredEvents];
      if (!isOkxRunning) {
        cleanEvents.unshift(`ℹ️ [HỆ THỐNG] Bot đang DỪNG trên tài khoản ${currentAccLabel}. Bấm [CHẠY BOT] để bắt đầu giao dịch.`);
      } else if (runningAccId && runningAccId !== selectedAccount) {
        cleanEvents.unshift(`ℹ️ [HỆ THỐNG] Tài khoản ${currentAccLabel} đang ở trạng thái CHỜ (Bot đang kích hoạt trên tài khoản khác). Bấm [CHẠY BOT] để chuyển bot sang tài khoản này.`);
      }

      return {
        dashboardLines: finalDashboard,
        eventLogs: cleanEvents
      };
    }

    return { dashboardLines: rawDashboard, eventLogs: rawEvents };
  }, [currentPlatform, propLogs, okxLogs, externalLogs, internalLogs, selectedAccount, runningAccId, positions, accountBalance, isOkxRunning, accounts]);

  // 🧹 Lọc bỏ dòng đường dẫn file hệ thống cục bộ bot_sub*.py (không cần thiết trên giao diện Web)
  const cleanDashboardLines = React.useMemo(() => {
    // 🛡️ Nếu ở sàn OKX mà chưa connect hoặc chưa chọn tài khoản trong dropdown -> TUYỆT ĐỐI KHÔNG HIỆN BẢNG THỢ SĂN EMA200
    if (currentPlatform === "okx" && (!hasActiveAccount || !selectedAccount || accountsCount === 0)) {
      return [];
    }
    return dashboardLines.filter(l =>
      !l.includes("bot_sub1.py") &&
      !l.includes("bot_sub2.py") &&
      !l.includes("bot_sub3.py") &&
      !l.includes("sys_bot_")
    );
  }, [dashboardLines, currentPlatform, hasActiveAccount, selectedAccount, accountsCount]);

  // Giữ vị trí cuộn đầu trang khi nạp Dashboard lần đầu
  const hasInitializedScrollRef = useRef(false);
  useEffect(() => {
    if (!hasInitializedScrollRef.current && cleanDashboardLines.length > 0 && terminalRef.current) {
      terminalRef.current.scrollTop = 0;
      hasInitializedScrollRef.current = true;
    }
  }, [cleanDashboardLines.length]);

  const handleCopy = () => {
    const parts = [];
    if (cleanDashboardLines.length > 0) parts.push(cleanDashboardLines.join("\n"));
    if (eventLogs.length > 0) parts.push("--- " + t("log_events_title", "NHẬT KÝ SỰ KIỆN TỨC THỜI") + " ---\n" + eventLogs.join("\n"));
    navigator.clipboard.writeText(parts.join("\n\n")).then(() => {
      alert(t("log_copied", "Đã sao chép toàn bộ logs vào Clipboard!"));
    });
  };

  const displayBotName = currentPlatform === "e8"
    ? "TRADELOCKER (QUỸ E8)"
    : (activeBotTab ? activeBotTab.toUpperCase() : "OKX BOT");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>
      {/* Nút Sao chép Logs nổi gọn gàng ở góc trên bên phải, chỉ để icon tinh gọn */}
      <button
        type="button"
        onClick={handleCopy}
        style={{
          position: "absolute",
          top: "8px",
          right: "12px",
          zIndex: 10,
          width: "28px",
          height: "28px",
          padding: 0,
          borderRadius: "5px",
          background: "rgba(255, 255, 255, 0.08)",
          backdropFilter: "blur(6px)",
          border: "1px solid rgba(255, 255, 255, 0.15)",
          color: "#cbd5e1",
          fontSize: "13px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "all 0.15s ease",
          opacity: 0.85,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.opacity = "1";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.16)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.opacity = "0.85";
          e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
        }}
        title={t("log_copy_tooltip", "Sao chép toàn bộ logs")}
        aria-label={t("log_copy_tooltip", "Sao chép toàn bộ logs")}
      >
        📋
      </button>

      {/* Nút Reset Vốn Gốc riêng của từng tài khoản, đặt ngay dưới nút Sao chép */}
      {onResetCapital && (
        <button
          type="button"
          onClick={() => onResetCapital && onResetCapital(selectedAccount)}
          style={{
            position: "absolute",
            top: "42px",
            right: "12px",
            zIndex: 10,
            width: "28px",
            height: "28px",
            padding: 0,
            borderRadius: "5px",
            background: "rgba(34, 197, 94, 0.12)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(34, 197, 94, 0.35)",
            color: "#22c55e",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            transition: "all 0.15s ease",
            opacity: 0.9,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = "1";
            e.currentTarget.style.background = "rgba(34, 197, 94, 0.22)";
            e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.6)";
            e.currentTarget.style.boxShadow = "0 0 10px rgba(34, 197, 94, 0.35)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = "0.9";
            e.currentTarget.style.background = "rgba(34, 197, 94, 0.12)";
            e.currentTarget.style.borderColor = "rgba(34, 197, 94, 0.35)";
            e.currentTarget.style.boxShadow = "none";
          }}
          title={t("reset_capital_tooltip", "Reset vốn gốc tài khoản này (lấy số dư thực tế làm vốn gốc mới)")}
          aria-label={t("reset_capital_tooltip", "Reset vốn gốc tài khoản này")}
        >
          {/* Icon vòng xoay màu xanh tinh gọn */}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-1.19" />
          </svg>
        </button>
      )}

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
        {currentPlatform === "okx" && (!hasActiveAccount || !selectedAccount || accountsCount === 0) ? (
          <div
            style={{
              margin: "12px 4px",
              padding: "16px 20px",
              backgroundColor: "rgba(255, 153, 0, 0.08)",
              border: "1px solid rgba(255, 153, 0, 0.25)",
              borderRadius: "6px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              maxWidth: "600px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#ff9900", fontWeight: "bold", fontSize: "12.5px" }}>
              <span>⚠️</span>
              <span>Chưa có tài khoản giao dịch nào được kết nối / chọn</span>
            </div>
            <p style={{ margin: 0, fontSize: "11.5px", color: "#cccccc", lineHeight: "1.5" }}>
              Vui lòng kết nối tài khoản (bấm nút <strong>Connect</strong>) và chọn tài khoản trong danh sách để xem bảng trạng thái vị thế và lệnh của Bot.
            </p>
          </div>
        ) : cleanDashboardLines.length === 0 && eventLogs.length === 0 ? (
          <div style={{ color: "#666", padding: "16px 0", fontStyle: "italic" }}>
            {t("log_waiting", "Đang đợi dữ liệu console từ bot {name}...").replace("{name}", displayBotName)}
          </div>
        ) : (
          <>
            {/* 1. KHU VỰC BẢNG TRẠNG THÁI DASHBOARD (CỐ ĐỊNH Ở TRÊN CÙNG - KHÔNG BAO GIỜ BỊ ĐẨY XUỐNG) */}
            {cleanDashboardLines.length > 0 && (
              <div
                className="log-dashboard-block"
                style={{
                  minWidth: "fit-content",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  WebkitTextSizeAdjust: "none",
                }}
              >
                {cleanDashboardLines.map((l, i) => (
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
                    {renderDashboardLine(l)}
                  </div>
                ))}
              </div>
            )}

            {/* 2. KHU VỰC NHẬT KÝ SỰ KIỆN TỨC THỜI (Ở DƯỚI BẢNG, KHÔNG BAO GIỜ LÀM NHẢY BẢNG) */}
            {eventLogs.length > 0 && (
              <div
                className="log-events-block"
                style={{
                  marginTop: cleanDashboardLines.length > 0 ? "14px" : "0",
                  paddingTop: cleanDashboardLines.length > 0 ? "10px" : "0",
                  borderTop: cleanDashboardLines.length > 0 ? "1px dashed rgba(255, 255, 255, 0.15)" : "none",
                  minWidth: "fit-content",
                  fontSize: "inherit",
                  letterSpacing: "inherit",
                  WebkitTextSizeAdjust: "none",
                }}
              >
                {cleanDashboardLines.length > 0 && (
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
