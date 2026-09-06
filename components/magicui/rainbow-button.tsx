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
      className="rainbow-button-inner"
      style={{
        position: "relative",
        zIndex: 1,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "8px",
        borderRadius: "var(--r-sm, 8px)",
        padding: "11px 22px",
        fontWeight: 600,
        fontSize: "14px",
        color: "#FFFFFF",
        background: "rgba(14, 16, 24, 0.95)",
        transition: "background 0.18s ease, transform 0.18s ease",
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
    padding: "1.25px",
    borderRadius: "calc(var(--r-sm, 8px) + 1.25px)",
    background: "linear-gradient(135deg, rgba(124, 58, 237, 0.85) 0%, rgba(99, 102, 241, 0.8) 35%, rgba(56, 189, 248, 0.7) 70%, rgba(139, 92, 246, 0.85) 100%)",
    backgroundSize: "200% 200%",
    animation: "rainbow-cycle 8s ease-in-out infinite",
    boxShadow: "0 0 16px rgba(124, 58, 237, 0.22), 0 2px 8px rgba(0, 0, 0, 0.4)",
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
