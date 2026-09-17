import React from "react";

export default function ToggleSwitch({ checked, onChange, labelOn = "ON", labelOff = "OFF" }) {
  return (
    <label className="toggle-switch">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
      <span className="toggle-slider"></span>
      <span className="toggle-label">{checked ? labelOn : labelOff}</span>
    </label>
  );
}
