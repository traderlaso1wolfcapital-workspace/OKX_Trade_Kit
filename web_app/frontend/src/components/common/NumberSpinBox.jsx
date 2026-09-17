import React from "react";

export default function NumberSpinBox({ value, onChange, min = 0, max, step = 1, suffix = "", width = "90px" }) {
  const handleStep = (delta) => {
    const cur = parseFloat(value || 0);
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    let next = parseFloat((cur + delta).toFixed(decimals));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next.toString());
  };

  return (
    <div className="spinbox-container" style={{ width }}>
      <input
        type="number"
        className="spinbox-input"
        value={value}
        onChange={e => onChange(e.target.value)}
        min={min}
        max={max}
        step={step}
        onKeyDown={e => {
          if (e.key === "ArrowUp") { e.preventDefault(); handleStep(step); }
          if (e.key === "ArrowDown") { e.preventDefault(); handleStep(-step); }
        }}
      />
      <span
        className="spinbox-suffix"
        style={{ visibility: suffix ? "visible" : "hidden" }}
        aria-hidden={!suffix}
      >
        {suffix || "%"}
      </span>
      <div className="spinbox-stepper">
        <button type="button" tabIndex={-1} className="spinbox-btn" onClick={() => handleStep(step)} title="Tăng">▲</button>
        <button type="button" tabIndex={-1} className="spinbox-btn" onClick={() => handleStep(-step)} title="Giảm">▼</button>
      </div>
    </div>
  );
}
