import { useEffect, useRef, useState, useCallback } from "react";

export function useBotWebSocket(uid, strategy, accountId) {
  const [botStatus, setBotStatus] = useState(() => {
    try {
      const savedAccounts = JSON.parse(localStorage.getItem("tls1_active_accounts") || "{}");
      if (savedAccounts[strategy] || Object.keys(savedAccounts).some(k => k.startsWith(`${strategy}_`))) {
        return "RUNNING";
      }
    } catch {}
    return "STOPPED";
  });
  const [uptime, setUptime] = useState(0);
  const [activeAccounts, setActiveAccounts] = useState(() => {
    try {
      const savedAccounts = JSON.parse(localStorage.getItem("tls1_active_accounts") || "{}");
      return savedAccounts && typeof savedAccounts === "object" ? savedAccounts : {};
    } catch {
      return {};
    }
  });
  const [positions, setPositions] = useState([]);
  const [availBal, setAvailBal] = useState(null);
  const [closedPositions, setClosedPositions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const isMountedRef = useRef(true);
  const accountIdRef = useRef(accountId);

  useEffect(() => {
    accountIdRef.current = accountId;
  }, [accountId]);

  const connectWS = useCallback(() => {
    if (!uid) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/bot_data/${uid}/${strategy}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      ws.send(JSON.stringify({ action: "switch_account", account_id: accountIdRef.current || "" }));
    };

    ws.onmessage = (event) => {
      if (!isMountedRef.current) return;
      try {
        const data = JSON.parse(event.data);
        if (data.type === "bot_data") {
          if (data.status) {
            setBotStatus(data.status.status || "STOPPED");
            setUptime(data.status.uptime || 0);
            if (data.status.active_accounts) {
              setActiveAccounts(data.status.active_accounts);
            }
          }
          if (!accountIdRef.current) {
            setPositions([]);
            setClosedPositions([]);
            // preserve availBal
            return;
          }
          // Chống rò rỉ dữ liệu chéo tài khoản:
          // Nếu payload từ WebSocket không trùng khớp 100% với account_id đang chọn,
          // TUYỆT ĐỐI không ghi đè dữ liệu của account cũ vào account mới!
          if (String(data.account_id || "").trim() !== String(accountIdRef.current || "").trim()) {
            return;
          }
          if (Array.isArray(data.positions)) {
            setPositions(data.positions);
          }
          if (data.balance && data.balance.status === "success") {
            const bVal = Number(data.balance.totalEq ?? data.balance.balance ?? data.balance.availBal);
            if (!isNaN(bVal) && bVal > 0) {
              setAvailBal(bVal);
            }
          }
          if (Array.isArray(data.closed_positions)) {
            setClosedPositions(data.closed_positions);
          }
        }
      } catch (err) {
        console.warn("[useBotWebSocket] Parse message error:", err);
      }
    };

    ws.onclose = () => {
      if (!isMountedRef.current) return;
      setIsConnected(false);
      // Auto reconnect after 2.5s
      setTimeout(() => {
        if (isMountedRef.current) {
          connectWS();
        }
      }, 2500);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {}
    };
  }, [uid, strategy]);

  useEffect(() => {
    isMountedRef.current = true;
    connectWS();

    return () => {
      isMountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [connectWS]);

  // Handle switching account
  useEffect(() => {
    // Ngay khi đổi account: reset positions và closedPositions để tránh lưu vết lệnh của tài khoản trước
    setPositions([]);
    setClosedPositions([]);
    if (!accountId) {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ action: "switch_account", account_id: "" }));
      }
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "switch_account", account_id: accountId }));
    }
  }, [accountId]);

  const refresh = useCallback((targetAcc) => {
    const acc = targetAcc || accountId;
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "refresh", account_id: acc }));
    }
  }, [accountId]);

  return {
    botStatus,
    setBotStatus,
    uptime,
    activeAccounts,
    positions,
    setPositions,
    availBal,
    closedPositions,
    setClosedPositions,
    isConnected,
    refresh,
  };
}

export default useBotWebSocket;
