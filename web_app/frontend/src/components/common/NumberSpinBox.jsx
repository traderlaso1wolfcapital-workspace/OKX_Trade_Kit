import React, { useRef } from "react";

export default function NumberSpinBox({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  suffix = "",
  width = "84px",
  disabled = false,
  disabledTitle = "Bot đang chạy - Dừng bot để chỉnh sửa ký quỹ",
}) {
  const inputRef = useRef(null);

  const handleStep = (delta) => {
    if (disabled) return;
    const cur = parseFloat(value || 0);
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    let next = parseFloat((cur + delta).toFixed(decimals));
    if (min !== undefined && next < min) next = min;
    if (max !== undefined && next > max) next = max;
    onChange(next.toString());
  };

  const handleChange = (e) => {
    if (disabled) return;
    onChange(e.target.value);
  };

  const handleBlur = (e) => {
    if (disabled) return;
    let val = parseFloat(e.target.value);
    if (isNaN(val)) val = 0;
    const stepStr = step.toString();
    const decimals = stepStr.includes(".") ? stepStr.split(".")[1].length : 0;
    if (min !== undefined && val < min) val = min;
    if (max !== undefined && val > max) val = max;
    onChange(parseFloat(val.toFixed(decimals)).toString());
  };

  const handleContainerClick = (e) => {
    if (disabled) return;
    if (e.target.closest(".spinbox-stepper")) return;
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div
      className={`spinbox-container ${disabled ? "disabled" : ""}`}
      onClick={handleContainerClick}
      style={{
        width,
        opacity: disabled ? 0.65 : 1,
        cursor: disabled ? "not-allowed" : "text",
      }}
      title={disabled ? disabledTitle : ""}
    >
      <input
        ref={inputRef}
        type="number"
        className="spinbox-input"
        value={value}
        disabled={disabled}
        onChange={handleChange}
        onBlur={handleBlur}
        min={min}
        max={max}
        step={step}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "ArrowUp") { e.preventDefault(); handleStep(step); }
          if (e.key === "ArrowDown") { e.preventDefault(); handleStep(-step); }
        }}
      />
      <span
        className="spinbox-suffix"
        style={{
          visibility: suffix ? "visible" : "hidden",
          pointerEvents: "none",
          userSelect: "none",
          cursor: "text",
        }}
        aria-hidden={!suffix}
      >
        {suffix || "%"}
      </span>
      <div className="spinbox-stepper" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          tabIndex={-1}
          className="spinbox-btn"
          disabled={disabled}
          onClick={() => handleStep(step)}
          title={disabled ? "" : "Tăng"}
        >
          ▲
        </button>
        <button
          type="button"
          tabIndex={-1}
          className="spinbox-btn"
          disabled={disabled}
          onClick={() => handleStep(-step)}
          title={disabled ? "" : "Giảm"}
        >
          ▼
        </button>
      </div>
    </div>
  );
}
