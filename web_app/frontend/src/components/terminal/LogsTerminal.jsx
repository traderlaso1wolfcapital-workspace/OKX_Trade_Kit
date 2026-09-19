import React, { useEffect, useRef, useState } from "react";

export default function LogsTerminal({ logs: externalLogs, activeBotTab, loginUid, isAuthenticated }) {
  // Dual-mode: nếu App.jsx truyền logs prop sẵn → render từ nó (App tự quản lý WS)
  // Nếu truyền activeBotTab + isAuthenticated → tự kết nối WS riêng
  const isSelfManaged = !externalLogs && isAuthenticated && activeBotTab;

  const [internalLogs, setInternalLogs] = useState([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const terminalRef = useRef(null);
  const wsRef = useRef(null);
  const lastLogTimeRef = useRef(0);
  const logBlockIdRef = useRef(0);

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
        const now = Date.now();
        const lineText = e.data;

        setInternalLogs((prev) => {
          const isNewDashboardHeader =
            typeof lineText === "string" &&
            (lineText.includes("bot_sub1.py") ||
              lineText.includes("bot_sub2.py") ||
              lineText.includes("bot_sub3.py") ||
              lineText.includes("sys_bot_"));

          if (isNewDashboardHeader) {
            logBlockIdRef.current += 1;
            return [{ id: logBlockIdRef.current, lines: [lineText] }, ...prev.slice(0, 15)];
          }

          let newBlocks = [...prev];
          if (newBlocks.length === 0 || now - lastLogTimeRef.current > 1800) {
            logBlockIdRef.current += 1;
            newBlocks.unshift({ id: logBlockIdRef.current, lines: [lineText] });
          } else {
            const updatedLines = [...newBlocks[0].lines, lineText];
            newBlocks[0] = {
              ...newBlocks[0],
              lines: updatedLines.length > 400 ? updatedLines.slice(updatedLines.length - 400) : updatedLines,
            };
          }
          if (newBlocks.length > 20) newBlocks = newBlocks.slice(0, 20);
          return newBlocks;
        });
        lastLogTimeRef.current = now;
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

    setInternalLogs([]);
    lastLogTimeRef.current = 0;
    logBlockIdRef.current = 0;
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

  // Chọn nguồn logs: từ App.jsx (external) hoặc tự quản lý (internal)
  const logs = externalLogs || internalLogs;

  // Normalize logs: hỗ trợ cả format mảng string cũ và format block mới
  const normalizedLogs = React.useMemo(() => {
    if (!Array.isArray(logs) || logs.length === 0) return [];
    // Kiểm tra xem logs là mảng string hay mảng block {id, lines}
    if (typeof logs[0] === "string") {
      // Format cũ: mảng string → wrap thành 1 block
      return [{ id: 0, lines: logs }];
    }
    // Format mới: mảng block
    return logs;
  }, [logs]);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [normalizedLogs, autoScroll]);

  const handleClear = () => {
    if (isSelfManaged) {
      setInternalLogs([]);
    }
  };

  const handleCopy = () => {
    const allText = normalizedLogs
      .map((b) => (b.lines || []).join("\n"))
      .join("\n\n--------------------------------\n\n");
    navigator.clipboard.writeText(allText).then(() => {
      alert("Đã sao chép toàn bộ logs vào Clipboard!");
    });
  };

  const displayBotName = activeBotTab
    ? activeBotTab.toUpperCase()
    : "BOT";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", position: "relative" }}>

      {/* Vùng hiển thị Logs Terminal */}
      <div
        className="logs-terminal"
        ref={terminalRef}
        style={{
          flex: 1,
          overflowX: "auto",
          overflowY: "auto",
          padding: "8px 12px 36px 12px",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {normalizedLogs.length === 0 ? (
          <div style={{ color: "#666", padding: "16px 0", fontStyle: "italic" }}>
            Đang đợi dữ liệu console từ bot {displayBotName}...
          </div>
        ) : (
          normalizedLogs.map((block) => (
            <div key={block.id} className="log-block" style={{ marginBottom: "22px", minWidth: "fit-content" }}>
              {(block.lines || []).map((l, i) => (
                <div key={i} className="log-line" style={{ whiteSpace: "pre", minWidth: "fit-content" }}>
                  {l}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
