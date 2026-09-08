"use client";

import React from "react";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  borderWidth?: number;
}

export function BorderBeam({
  duration = 14,
  delay = 0,
  colorFrom = "rgba(138, 43, 226, 0.8)",
  colorTo = "rgba(6, 182, 212, 0.7)",
  className = "",
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`border-beam ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        overflow: "hidden",
        zIndex: 1,
      }}
    >
      <svg
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          borderRadius: "inherit",
          overflow: "visible",
        }}
      >
        <defs>
          <linearGradient id="borderBeamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={colorFrom} />
            <stop offset="100%" stopColor={colorTo} />
          </linearGradient>
        </defs>
        <rect
          width="100%"
          height="100%"
          rx="16"
          fill="none"
          stroke="url(#borderBeamGradient)"
          strokeWidth={borderWidth * 2}
          pathLength="100"
          strokeDasharray="22 78"
          strokeLinecap="round"
          style={{
            animation: `border-beam-dash ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
          }}
        />
      </svg>
    </div>
  );
}
