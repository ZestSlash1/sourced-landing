"use client";

import React, { ReactNode, CSSProperties } from "react";
import Link from "next/link";

interface RainbowButtonProps {
  children?: ReactNode;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
}

export function RainbowButton({
  children,
  href,
  onClick,
  disabled = false,
  className = "",
  style = {},
}: RainbowButtonProps) {
  const content = (
    <span
      className="relative z-10 flex items-center justify-center gap-2 rounded-[inherit] px-6 py-3 font-semibold text-white transition-transform duration-200"
      style={{
        background: "rgba(16, 18, 26, 0.94)",
        borderRadius: "var(--r-sm, 8px)",
      }}
    >
      {children}
    </span>
  );

  const containerStyles: CSSProperties = {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "1.5px",
    borderRadius: "calc(var(--r-sm, 8px) + 1.5px)",
    background: "linear-gradient(90deg, #ff0055, #ff7700, #ffea00, #00f0ff, #8a2be2, #ff00aa, #ff0055)",
    backgroundSize: "200% 200%",
    animation: "rainbow-cycle 3s linear infinite",
    boxShadow: "0 0 20px rgba(138, 43, 226, 0.35), 0 0 40px rgba(0, 240, 255, 0.15)",
    textDecoration: "none",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.6 : 1,
    border: "none",
    ...style,
  };

  if (href) {
    return (
      <Link href={href} className={`rainbow-button ${className}`} style={containerStyles}>
        {content}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rainbow-button ${className}`}
      style={containerStyles}
    >
      {content}
    </button>
  );
}
