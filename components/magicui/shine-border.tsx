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
  borderWidth = 1.5,
  duration = 10,
  color = ["#ff0055", "#ff7700", "#00f0ff", "#8a2be2", "#ff0077"],
  className = "",
  children,
}: ShineBorderProps) {
  const gradientStops = color.join(", ");

  return (
    <div
      className={`shine-border relative overflow-hidden ${className}`}
      style={{
        borderRadius: `${borderRadius}px`,
        position: "relative",
      }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[150%] z-0"
        style={{
          background: `conic-gradient(from 0deg, ${gradientStops}, ${color[0]})`,
          animation: `shine-rotate ${duration}s linear infinite`,
          opacity: 0.85,
        }}
      />
      <div
        className="relative z-10 h-full w-full"
        style={{
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
