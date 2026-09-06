"use client";

import React, { useRef, useState, useCallback, ReactNode, CSSProperties } from "react";

interface MagicCardProps {
  children?: ReactNode;
  className?: string;
  gradientSize?: number;
  gradientColor?: string;
  gradientOpacity?: number;
  style?: CSSProperties;
  onClick?: () => void;
}

export function MagicCard({
  children,
  className = "",
  gradientSize = 260,
  gradientColor = "rgba(124, 58, 237, 0.12)",
  gradientOpacity = 0.65,
  style = {},
  onClick,
}: MagicCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    setPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  }, []);

  const handleMouseLeave = useCallback(() => {
    setPosition(null);
  }, []);

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      className={`magic-card ${className}`}
      style={{
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Pointer Spotlight Overlay */}
      <div
        aria-hidden="true"
        className="magic-card-spotlight"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          zIndex: 2,
          borderRadius: "inherit",
          transition: "opacity 0.24s ease",
          opacity: position ? gradientOpacity : 0,
          background: position
            ? `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${gradientColor}, rgba(56, 189, 248, 0.04) 40%, transparent 80%)`
            : "none",
        }}
      />
      {children}
    </div>
  );
}
