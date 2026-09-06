"use client";

import React, { ReactNode } from "react";

interface ShineBorderProps {
  borderRadius?: number;
  borderWidth?: number;
  duration?: number;
  color?: string[];
  className?: string;
  children?: ReactNode;
}

export function ShineBorder({
  borderRadius = 16,
  borderWidth = 1.25,
  duration = 16,
  color = [
    "rgba(124, 58, 237, 0.55)",
    "rgba(56, 189, 248, 0.45)",
    "rgba(16, 185, 129, 0.35)",
    "rgba(139, 92, 246, 0.5)",
  ],
  className = "",
  children,
}: ShineBorderProps) {
  const gradientStops = color.join(", ");

  return (
    <div
      className={`shine-border ${className}`}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: `${borderRadius}px`,
      }}
    >
      <div
        aria-hidden="true"
        className="shine-border-glow"
        style={{
          position: "absolute",
          inset: "-150%",
          pointerEvents: "none",
          zIndex: 0,
          background: `conic-gradient(from 0deg, ${gradientStops}, ${color[0]})`,
          animation: `shine-rotate ${duration}s linear infinite`,
          opacity: 0.75,
        }}
      />
      <div
        className="shine-border-inner"
        style={{
          position: "relative",
          zIndex: 1,
          margin: `${borderWidth}px`,
          width: `calc(100% - ${borderWidth * 2}px)`,
          height: `calc(100% - ${borderWidth * 2}px)`,
          borderRadius: `${Math.max(0, borderRadius - borderWidth)}px`,
          background: "var(--surface)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
