import React from "react";
import { MapPin } from "lucide-react";

export default function TopBar({ eyebrow, title, location, initials }) {
  return (
    <div className="flex items-center justify-between mb-7">
      <div>
        <p className="text-xs uppercase tracking-wide" style={{ color: "#8A8574" }}>
          {eyebrow}
        </p>
        <h1 className="ht-display text-2xl mt-0.5" style={{ fontWeight: 600 }}>
          {title}
        </h1>
      </div>
      <div className="flex items-center gap-3">
        {location && (
          <div
            className="flex items-center gap-1 text-xs px-2.5 py-1 rounded-full"
            style={{ background: "#FBF9F3", border: "1px solid #DCD5C4", color: "#6B6656" }}
          >
            <MapPin size={12} /> {location}
          </div>
        )}
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm ht-mono"
          style={{ background: "#17352A", color: "#F3D48A" }}
        >
          {initials}
        </div>
      </div>
    </div>
  );
}
