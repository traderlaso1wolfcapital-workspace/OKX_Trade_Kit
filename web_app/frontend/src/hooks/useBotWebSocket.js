import { useEffect, useRef, useState, useCallback } from "react";

export function useBotWebSocket(uid, strategy, accountId) {
  const [botStatus, setBotStatus] = useState("STOPPED");
  const [uptime, setUptime] = useState(0);
  const [activeAccounts, setActiveAccounts] = useState({});
  const [positions, setPositions] = useState([]);
  const [availBal, setAvailBal] = useState(0);
  const [closedPositions, setClosedPositions] = useState([]);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef(null);
  const isMountedRef = useRef(true);

  const connectWS = useCallback(() => {
    if (!uid) return;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const url = `${protocol}//${window.location.host}/ws/bot_data/${uid}/${strategy}`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMountedRef.current) return;
      setIsConnected(true);
      if (accountId) {
        ws.send(JSON.stringify({ action: "switch_account", account_id: accountId }));
      }
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
          if (Array.isArray(data.positions)) {
            setPositions(data.positions);
          }
          if (data.balance && data.balance.status === "success") {
            setAvailBal(data.balance.availBal || 0);
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
  }, [uid, strategy, accountId]);

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
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && accountId) {
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
    isConnected,
    refresh,
  };
}

export default useBotWebSocket;
