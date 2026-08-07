'use client';
import dynamic from 'next/dynamic';

const TradingChart = dynamic(() => import('../../components/TradingChart'), {
  ssr: false,
});

export default function TradePage() {
  return (
    <div className="flex w-full h-full">
      {/* Left Toolbar */}
      <div className="w-12 border-r border-border bg-dark-surface flex flex-col items-center py-2 gap-4">
        <button className="text-xl hover:text-accent-blue transition-colors">↗</button>
        <button className="text-xl hover:text-accent-blue transition-colors">📏</button>
        <button className="text-xl hover:text-accent-blue transition-colors">🖌</button>
        <button className="text-xl hover:text-accent-blue transition-colors">📐</button>
        <button className="text-xl hover:text-accent-blue transition-colors">🎯</button>
      </div>

      {/* Center Chart Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Chart Header */}
        <div className="h-10 border-b border-border flex items-center px-4 gap-4 bg-dark-bg text-sm">
          <span className="font-bold text-lg">BTC-USDT-SWAP</span>
          <span className="text-accent-green font-semibold">64,250.00</span>
          
          <div className="w-px h-4 bg-border mx-2"></div>
          
          <div className="flex gap-2">
            <button className="hover:text-white text-text-secondary">1m</button>
            <button className="hover:text-white text-text-secondary">5m</button>
            <button className="hover:text-white text-text-secondary text-white font-bold">15m</button>
            <button className="hover:text-white text-text-secondary">1H</button>
            <button className="hover:text-white text-text-secondary">4H</button>
            <button className="hover:text-white text-text-secondary">D</button>
          </div>

          <div className="w-px h-4 bg-border mx-2"></div>

          <div className="flex gap-3">
            <button className="hover:text-accent-blue text-text-secondary">Indicators ▾</button>
            <span className="text-xs border border-border px-1 rounded text-accent-blue cursor-pointer">SMC</span>
            <span className="text-xs border border-border px-1 rounded text-accent-blue cursor-pointer">Liquidity</span>
          </div>
        </div>

        {/* Chart Container */}
        <div className="flex-1 relative">
          <TradingChart />
        </div>

        {/* Bottom Dock */}
        <div className="h-48 border-t border-border bg-dark-surface flex flex-col">
          <div className="flex gap-6 px-4 border-b border-border text-sm">
            <button className="py-2 border-b-2 border-accent-blue text-white">Positions (1)</button>
            <button className="py-2 border-b-2 border-transparent text-text-secondary hover:text-white">Open Orders (0)</button>
            <button className="py-2 border-b-2 border-transparent text-text-secondary hover:text-white">Order History</button>
            <button className="py-2 border-b-2 border-transparent text-text-secondary hover:text-white">Trade Journal</button>
            <button className="py-2 border-b-2 border-transparent text-text-secondary hover:text-white">Terminal Logs</button>
          </div>
          <div className="flex-1 p-2 text-xs overflow-y-auto font-mono text-text-secondary">
             <div>[SYSTEM] 10:45:00 - AI Engine detected Bullish Order Block at 64,150.</div>
             <div className="text-accent-green">[TRADE] 10:45:01 - Executed LONG 1.5 BTC @ 64,155.</div>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-80 border-l border-border bg-dark-panel flex flex-col flex-shrink-0">
        
        {/* Order Form */}
        <div className="p-4 border-b border-border">
          <div className="flex gap-2 mb-4">
            <button className="flex-1 bg-accent-green text-black font-bold py-2 rounded">LONG</button>
            <button className="flex-1 bg-accent-red text-white font-bold py-2 rounded">SHORT</button>
          </div>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between bg-dark-surface p-2 border border-border rounded">
              <span className="text-text-secondary">Order Type</span>
              <span>Limit</span>
            </div>
            <div className="flex justify-between bg-dark-surface p-2 border border-border rounded">
              <span className="text-text-secondary">Price</span>
              <span>64,150.00</span>
            </div>
            <div className="flex justify-between bg-dark-surface p-2 border border-border rounded">
              <span className="text-text-secondary">Amount</span>
              <span>1.5 BTC</span>
            </div>
          </div>
        </div>

        {/* AI Analysis Panel */}
        <div className="p-4 flex-1 overflow-y-auto">
          <h3 className="font-bold mb-3 text-sm flex items-center gap-2">🤖 AI Liquidity Analysis</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Market Phase</span>
              <span className="text-accent-blue font-semibold">Accumulation</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Confidence</span>
              <span className="text-accent-green font-semibold">94%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Nearest OB</span>
              <span>64,100.00</span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Liquidity Sweep</span>
              <span className="text-accent-red">64,050.00</span>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="font-bold mb-3 text-sm">Live Signals</h3>
            <div className="bg-dark-surface p-2 rounded border border-border mb-2 text-xs">
              <div className="flex justify-between font-bold">
                <span>BTC/USDT</span>
                <span className="text-accent-green">BUY</span>
              </div>
              <div className="text-text-secondary mt-1">Reason: FVG fill + Bullish Divergence on 15m.</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}