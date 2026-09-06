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
    background: "linear-gradient(120deg, #F8FAFC 0%, #DDD6FE 30%, #BAE6FD 65%, #F8FAFC 100%)",
    backgroundSize: "200% auto",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    animation: "rainbow-cycle 8s ease-in-out infinite",
    display: "inline-block",
    ...style,
  };

  if (badge) {
    return (
      <div
        className={`animated-gradient-text-badge ${className}`}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          borderRadius: "999px",
          border: "1px solid rgba(255, 255, 255, 0.14)",
          padding: "6px 14px",
          fontSize: "12px",
          fontWeight: 600,
          background: "rgba(16, 18, 26, 0.85)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          boxShadow: "0 0 16px rgba(124, 58, 237, 0.16)",
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
