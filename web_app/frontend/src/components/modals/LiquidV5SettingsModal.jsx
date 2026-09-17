import React from 'react';

export default function LiquidV5SettingsModal({
  isOpen,
  onClose,
  liquidV5Settings,
  setLiquidV5Settings,
  onApply
}) {
  if (!isOpen) return null;

  return (
    <div
      className="account-prompt-overlay"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        zIndex: 100000
      }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div
        className="tv-settings-modal"
        style={{
          width: '420px',
          background: '#1e222d',
          border: '1px solid #434651',
          borderRadius: '6px',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
          display: 'flex',
          flexDirection: 'column',
          color: '#d1d4dc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Trebuchet MS", Roboto, Ubuntu, sans-serif'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px 0' }}>
          <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Tiodev_TLS1 Charts_Liquid</h3>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#787b86', cursor: 'pointer', fontSize: '20px', padding: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: '24px', padding: '16px 20px 0', borderBottom: '1px solid #434651', fontSize: '14px', fontWeight: 500 }}>
          <div style={{ paddingBottom: '10px', color: '#d1d4dc', borderBottom: '2px solid #2962ff', cursor: 'pointer' }}>
            Inputs
          </div>
        </div>

        <div style={{ padding: '20px', maxHeight: '60vh', overflowY: 'auto' }}>
          {/* General Configuration */}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Higher Timeframe</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              value={liquidV5Settings.higherTF}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, higherTF: e.target.value })}
            >
              <option value="1H">1H</option>
              <option value="H4">4H</option>
              <option value="D">Daily</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>HTF Candle Size</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              value={liquidV5Settings.htfCandleSize}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, htfCandleSize: e.target.value })}
            >
              <option value="Big">Big</option>
              <option value="Normal">Normal</option>
              <option value="Small">Small</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Entry Mode</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              value={liquidV5Settings.entryMode}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, entryMode: e.target.value })}
            >
              <option value="FVGs">FVGs (Auto)</option>
              <option value="Order Blocks">Order Blocks</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="requireRet"
              checked={liquidV5Settings.requireRetracement}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, requireRetracement: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="requireRet" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Require Retracement</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="showHtfLine"
              checked={liquidV5Settings.showHTFCandleLines}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, showHTFCandleLines: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="showHtfLine" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show HTF Candle Lines</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>FVG Detection Sensitivity</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              value={liquidV5Settings.fvgDetectionSensitivity}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, fvgDetectionSensitivity: e.target.value })}
            >
              <option value="All">All</option>
              <option value="Extreme">Extreme</option>
              <option value="High">High</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="showFVG"
              checked={liquidV5Settings.showFVGs}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, showFVGs: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="showFVG" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show FVGs</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Swing Length</span>
            <input
              type="number"
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }}
              value={liquidV5Settings.swingLength}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, swingLength: parseInt(e.target.value, 10) || 35 })}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '32px' }}>
            <input
              type="checkbox"
              id="showOB"
              checked={liquidV5Settings.showOrderBlocks}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, showOrderBlocks: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="showOB" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Show Order Blocks</label>
          </div>

          {/* TP / SL */}
          <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>TP / SL</div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
            <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Enabled</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>TP / SL Method</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              value={liquidV5Settings.tpslMethod}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, tpslMethod: e.target.value })}
            >
              <option value="Dynamic">Dynamic</option>
              <option value="Fixed">Fixed</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Dynamic Risk</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              defaultValue="Highest"
            >
              <option value="Highest">Highest</option>
              <option value="Normal">Normal</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Fixed Take Profit %</span>
            <input
              type="number"
              step="0.1"
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }}
              value={liquidV5Settings.tpPercent}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, tpPercent: parseFloat(e.target.value) || 0.3 })}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '32px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Fixed Stop Loss %</span>
            <input
              type="number"
              step="0.1"
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none', boxSizing: 'border-box' }}
              value={liquidV5Settings.slPercent}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, slPercent: parseFloat(e.target.value) || 0.4 })}
            />
          </div>

          {/* BACKTESTING DASHBOARD */}
          <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>BACKTESTING DASHBOARD</div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="onlyWinrateEntry2"
              checked={liquidV5Settings.onlyWinrateEntry2}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, onlyWinrateEntry2: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="onlyWinrateEntry2" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Only winrate Entry2</label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input type="checkbox" defaultChecked style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }} />
            <label style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Enabled</label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>Position</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              defaultValue="Top Right"
            >
              <option value="Top Right">Top Right</option>
              <option value="Bottom Right">Bottom Right</option>
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
            <input
              type="checkbox"
              id="fillBackgrounds"
              checked={liquidV5Settings.fillBackgrounds}
              onChange={e => setLiquidV5Settings({ ...liquidV5Settings, fillBackgrounds: e.target.checked })}
              style={{ marginRight: '12px', accentColor: '#2962ff', width: '16px', height: '16px', cursor: 'pointer' }}
            />
            <label htmlFor="fillBackgrounds" style={{ color: '#d1d4dc', fontSize: '14px', cursor: 'pointer' }}>Fill Backgrounds</label>
          </div>

          {/* VISUALS */}
          <div style={{ color: '#787b86', fontSize: '12px', textTransform: 'uppercase', marginBottom: '16px' }}>VISUALS</div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
            <span style={{ color: '#d1d4dc', fontSize: '14px' }}>TP / SL Layout</span>
            <select
              style={{ background: '#131722', color: '#d1d4dc', border: '1px solid #434651', borderRadius: '4px', padding: '6px 8px', fontSize: '14px', width: '130px', outline: 'none' }}
              defaultValue="Default"
            >
              <option value="Default">Default</option>
              <option value="Compact">Compact</option>
            </select>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid #434651', alignItems: 'center' }}>
          <select style={{ background: 'transparent', border: 'none', color: '#d1d4dc', fontSize: '14px', outline: 'none', cursor: 'pointer' }}>
            <option>Defaults</option>
          </select>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              style={{ background: 'transparent', border: '1px solid #434651', color: '#d1d4dc', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              style={{ background: '#2962ff', border: 'none', color: '#fff', padding: '8px 20px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
              onClick={() => {
                onClose();
                if (onApply) onApply();
              }}
            >
              Ok
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
