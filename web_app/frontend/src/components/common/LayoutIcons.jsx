import React from "react";

export const renderLayoutIcon = (type, w = 24, h = 24) => {
  if (type === "1") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="22" rx="2.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "2-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="3" width="10" height="22" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "2-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="22" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3" y="15" width="22" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  if (type === "3-col") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="2.5" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="10.75" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="19" y="3" width="6.5" height="22" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }
  if (type === "3-row") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="2.5" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="3" y="10.75" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
        <rect x="3" y="19" width="22" height="6.5" rx="1.2" stroke="currentColor" strokeWidth="1.1" />
      </svg>
    );
  }
  if (type === "4-grid") {
    return (
      <svg width={w} height={h} viewBox="0 0 28 28" fill="none">
        <rect x="3" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="3" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="3" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
        <rect x="15" y="15" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }
  return null;
};
