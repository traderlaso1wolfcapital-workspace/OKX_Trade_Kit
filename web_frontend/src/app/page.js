'use client';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('../components/TradingChart'), {
  ssr: false,
});

export default function Home() {
  return (
    <div className="app-container">
      <div className="sidebar">
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', fontWeight: 'bold' }}>
          TLS1 Trading SaaS
        </div>
        <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button style={{ padding: '8px', background: 'var(--accent)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Khởi động Bot
          </button>
          <button style={{ padding: '8px', background: 'var(--down-color)', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            Dừng Bot
          </button>
        </div>
        <div style={{ flex: 1, padding: '16px', overflowY: 'auto' }}>
          <h4 style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>Tình trạng Vị thế</h4>
          {/* Position table placeholder */}
          <div style={{ color: 'var(--text-tertiary)', fontSize: '14px' }}>Chưa có vị thế nào...</div>
        </div>
      </div>
      
      <div className="main-content">
        <div className="top-nav">
          <span style={{ fontWeight: 'bold', marginRight: '16px' }}>XAU-USDT-SWAP</span>
          <span style={{ color: 'var(--up-color)', marginRight: '16px' }}>4,269.60</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>Chỉ báo Admin: Đang bật</span>
        </div>
        
        <div className="chart-area">
          <TradingChart />
        </div>
        
        <div className="logs-area">
          <div style={{ color: 'var(--text-secondary)', marginBottom: '4px' }}>Terminal Logs:</div>
          <div style={{ color: 'var(--text-primary)' }}>[SYSTEM] Bot started successfully.</div>
          <div style={{ color: 'var(--up-color)' }}>[TRADE] Found Order Block at 4260.00</div>
          <div style={{ color: 'var(--text-primary)' }}>[SYSTEM] Waiting for signals...</div>
        </div>
      </div>
    </div>
  );
}
