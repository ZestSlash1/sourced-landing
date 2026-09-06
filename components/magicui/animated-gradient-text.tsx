"use client";

import React, { ReactNode, CSSProperties } from "react";

interface AnimatedGradientTextProps {
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  badge?: boolean;
}

export function AnimatedGradientText({
  children,
  className = "",
  style = {},
  badge = false,
}: AnimatedGradientTextProps) {
  const gradientTextStyle: CSSProperties = {
    background: "linear-gradient(90deg, #ff0055, #ff7700, #ffea00, #00f0ff, #8a2be2, #ff00aa, #ff0055)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "rainbow-cycle 4s linear infinite",
    display: "inline-block",
    ...style,
  };

  if (badge) {
    return (
      <div
        className={`animated-gradient-text-badge inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${className}`}
        style={{
          borderColor: "rgba(255, 255, 255, 0.14)",
          background: "rgba(16, 18, 26, 0.85)",
          backdropFilter: "blur(8px)",
          boxShadow: "0 0 16px rgba(138, 43, 226, 0.2)",
        }}
      >
        <span className="animated-gradient-text" style={gradientTextStyle}>
          {children}
        </span>
      </div>
    );
  }

  return (
    <span className={`animated-gradient-text ${className}`} style={gradientTextStyle}>
      {children}
    </span>
  );
}
