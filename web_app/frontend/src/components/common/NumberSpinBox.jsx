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

  const handleChange = (e) => {
    onChange(e.target.value);
  };

  const handleBlur = (e) => {
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = min !== undefined ? min : 0;
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    if (min !== undefined && val < min) val = min;
    if (max !== undefined && val > max) val = max;
    onChange(parseFloat(val.toFixed(decimals)).toString());
  };

  return (
    <div className="spinbox-container" style={{ width }}>
      <input
        type="number"
        className="spinbox-input"
        value={value}
        onChange={handleChange}
        onBlur={handleBlur}
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
