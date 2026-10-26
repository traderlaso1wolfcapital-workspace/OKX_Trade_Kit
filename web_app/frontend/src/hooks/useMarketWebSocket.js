import { useEffect, useRef } from "react";

// Convert timeframe string to OKX candle channel name
export const getOkxCandleChannel = (tf) => {
  if (!tf) return "candle1H";
  const str = String(tf).trim();
  const lower = str.toLowerCase();
  const map = {
    "1": "candle1m",
    "1m": "candle1m",
    "m1": "candle1m",
    "3": "candle3m",
    "3m": "candle3m",
    "m3": "candle3m",
    "5": "candle5m",
    "5m": "candle5m",
    "m5": "candle5m",
    "15": "candle15m",
    "15m": "candle15m",
    "m15": "candle15m",
    "30": "candle30m",
    "30m": "candle30m",
    "m30": "candle30m",
    "1h": "candle1H",
    "h1": "candle1H",
    "60": "candle1H",
    "60m": "candle1H",
    "2h": "candle2H",
    "h2": "candle2H",
    "120": "candle2H",
    "120m": "candle2H",
    "4h": "candle4H",
    "h4": "candle4H",
    "240": "candle4H",
    "240m": "candle4H",
    "6h": "candle6H",
    "h6": "candle6H",
    "12h": "candle12H",
    "h12": "candle12H",
    "1d": "candle1D",
    "d1": "candle1D",
    "d": "candle1D",
    "1w": "candle1W",
    "w1": "candle1W",
    "w": "candle1W",
    "1m_month": "candle1M",
  };
  return map[lower] || map[str] || "candle1H";
};

export function useMarketWebSocket(instId, tf, onCandleUpdate) {
  const wsRef = useRef(null);
  const onUpdateRef = useRef(onCandleUpdate);
  onUpdateRef.current = onCandleUpdate;

  useEffect(() => {
    // USDT.D is from TradingView, not OKX swap
    if (!instId || instId.includes("USDT.D") || instId.includes("USDTD")) {
      return;
    }

    let isMounted = true;
    let pingTimer = null;
    const channel = getOkxCandleChannel(tf);

    const connectOKX = () => {
      if (!isMounted) return;
      try {
        const ws = new WebSocket("wss://ws.okx.com:443/ws/v5/public");
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          // Subscribe to candle channel
          const subMsg = {
            op: "subscribe",
            args: [
              { channel: channel, instId: instId }
            ],
          };
          ws.send(JSON.stringify(subMsg));

          // Ping OKX every 20s to keep connection alive
          pingTimer = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send("ping");
            }
          }, 20000);
        };

        ws.onmessage = (event) => {
          if (event.data === "pong") return;
          try {
            const res = JSON.parse(event.data);
            if (res.event === "subscribe") return;
            if (res.data && res.data.length > 0 && res.arg && res.arg.channel === channel) {
              const c = res.data[0];
              const t = Math.floor(parseInt(c[0]) / 1000);
              const candle = {
                time: t,
                open: parseFloat(c[1]),
                high: parseFloat(c[2]),
                low: parseFloat(c[3]),
                close: parseFloat(c[4]),
                volume: parseFloat(c[5]) || 0,
                isClosed: c[8] === "1",
              };
              if (onUpdateRef.current) {
                onUpdateRef.current(candle);
              }
            }
          } catch {
            // Ignore parse errors
          }
        };

        ws.onclose = () => {
          if (pingTimer) clearInterval(pingTimer);
          if (isMounted) {
            setTimeout(connectOKX, 3000);
          }
        };

        ws.onerror = () => {
          try {
            ws.close();
          } catch {}
        };
      } catch (err) {
        console.warn("[useMarketWebSocket] Connect error:", err);
      }
    };

    connectOKX();

    return () => {
      isMounted = false;
      if (pingTimer) clearInterval(pingTimer);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
      }
    };
  }, [instId, tf]);
}

export default useMarketWebSocket;
