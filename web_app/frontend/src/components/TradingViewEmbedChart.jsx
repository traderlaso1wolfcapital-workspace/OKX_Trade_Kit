import React, { useEffect, useRef, useState } from "react";

// Bảng ánh xạ mã coin từ OKX sang ký hiệu chuẩn của TradingView
const TV_SYMBOL_MAP = {
  "BTC-USDT-SWAP": "OKX:BTCUSDT.P",
  "ETH-USDT-SWAP": "OKX:ETHUSDT.P",
  "SOL-USDT-SWAP": "OKX:SOLUSDT.P",
  "XRP-USDT-SWAP": "OKX:XRPUSDT.P",
  "DOGE-USDT-SWAP": "OKX:DOGEUSDT.P",
  "SUI-USDT-SWAP": "OKX:SUIUSDT.P",
  "NEAR-USDT-SWAP": "OKX:NEARUSDT.P",
  "ADA-USDT-SWAP": "OKX:ADAUSDT.P",
  "LTC-USDT-SWAP": "OKX:LTCUSDT.P",
  "TRX-USDT-SWAP": "OKX:TRXUSDT.P",
  "HYPE-USDT-SWAP": "BINANCE:HYPEUSDT",
  "ZEC-USDT-SWAP": "OKX:ZECUSDT.P",
  "XAU-USDT-SWAP": "OKX:XAUUSDT.P",
  "CL-USDT-SWAP": "NYMEX:CL1!",
  "USDT.D": "CRYPTOCAP:USDT.D",
};

// Bảng ánh xạ khung thời gian sang chuẩn interval của TradingView
const TV_INTERVAL_MAP = {
  "1m": "1",
  "5m": "5",
  "15m": "15",
  "30m": "30",
  "1H": "60",
  "2H": "120",
  "4H": "240",
  "1D": "D",
};

export default function TradingViewEmbedChart({
  coin = "BTC-USDT-SWAP",
  tf = "15m",
  chartIndex = 0,
  isVisible = true,
}) {
  const containerId = `tv_embed_container_${chartIndex}`;
  const widgetRef = useRef(null);
  const [isTvScriptLoaded, setIsTvScriptLoaded] = useState(
    typeof window !== "undefined" && !!window.TradingView
  );

  // Đảm bảo script tv.js luôn sẵn sàng
  useEffect(() => {
    if (window.TradingView) {
      setIsTvScriptLoaded(true);
      return;
    }

    // Tự động nạp script nếu chưa có
    const existingScript = document.getElementById("tradingview-widget-script");
    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "tradingview-widget-script";
      script.type = "text/javascript";
      script.src = "https://s3.tradingview.com/tv.js";
      script.async = true;
      script.onload = () => setIsTvScriptLoaded(true);
      document.head.appendChild(script);
    } else {
      const interval = setInterval(() => {
        if (window.TradingView) {
          setIsTvScriptLoaded(true);
          clearInterval(interval);
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, []);

  // Khởi tạo và cập nhật Widget TradingView chính hãng
  useEffect(() => {
    if (!isVisible || !isTvScriptLoaded || !window.TradingView) return;

    const tvSymbol = TV_SYMBOL_MAP[coin] || `OKX:${coin.replace("-SWAP", "").replace("-", "")}.P`;
    const tvInterval = TV_INTERVAL_MAP[tf] || "15";

    const containerEl = document.getElementById(containerId);
    if (!containerEl) return;
    containerEl.innerHTML = "";

    try {
      widgetRef.current = new window.TradingView.widget({
        autosize: true,
        symbol: tvSymbol,
        interval: tvInterval,
        timezone: "Asia/Ho_Chi_Minh",
        theme: "dark",
        style: "1", // Nến Nhật chuẩn
        locale: "vi_VN",
        toolbar_bg: "#1e222d",
        enable_publishing: false,
        hide_side_toolbar: false, // BẬT 100% THANH CÔNG CỤ VẼ CHÍNH CHỦ TRADINGVIEW
        allow_symbol_change: true,
        save_image: true,
        container_id: containerId,
        studies: [], // Để người dùng tự do thêm indicator từ kho TradingView
        disabled_features: [
          "link_to_tradingview",
          "header_widget_dom_node",
          "logo",
          "branding"
        ],
        overrides: {
          "paneProperties.background": "#0c0c0c",
          "paneProperties.vertGridProperties.color": "rgba(42, 46, 57, 0.35)",
          "paneProperties.horzGridProperties.color": "rgba(42, 46, 57, 0.35)",
          "scalesProperties.textColor": "#787b86",
          "scalesProperties.lineColor": "#2a2e39",
        },
      });
    } catch (err) {
      console.warn("Lỗi khởi tạo TradingView Widget:", err);
    }

    return () => {
      if (containerEl) {
        containerEl.innerHTML = "";
      }
      widgetRef.current = null;
    };
  }, [coin, tf, isVisible, isTvScriptLoaded, containerId]);

  return (
    <div
      className="tradingview-embed-wrapper"
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        display: isVisible ? "block" : "none",
        backgroundColor: "#0c0c0c",
      }}
    >
      <div
        id={containerId}
        style={{
          width: "100%",
          height: "100%",
        }}
      />
    </div>
  );
}
