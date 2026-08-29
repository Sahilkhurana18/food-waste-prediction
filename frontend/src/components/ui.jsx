import React from "react";
import { STATUS_STYLE } from "../data/mockData.js";

export function StatusPill({ status }) {
  const s = STATUS_STYLE[status] || STATUS_STYLE.pending;
  return (
    <span
      className="text-xs px-2.5 py-1 rounded-full ht-mono"
      style={{ background: s.bg, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

export function MetricCard({ label, value }) {
  return (
    <div className="ht-card p-4">
      <p className="text-xs" style={{ color: "#8A8574" }}>
        {label}
      </p>
      <p className="ht-display ht-mono text-2xl mt-1" style={{ fontWeight: 600 }}>
        {value}
      </p>
    </div>
  );
}

export function SectionHeading({ children, action }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <p className="ht-display text-base" style={{ fontWeight: 600 }}>
        {children}
      </p>
      {action}
    </div>
  );
}
