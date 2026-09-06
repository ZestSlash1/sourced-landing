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
  gradientColor = "rgba(138, 43, 226, 0.2)",
  gradientOpacity = 0.8,
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
      className={`magic-card relative overflow-hidden ${className}`}
      style={{
        ...style,
        position: "relative",
      }}
    >
      {/* Pointer Spotlight Overlay */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 transition-opacity duration-300"
        style={{
          opacity: position ? gradientOpacity : 0,
          background: position
            ? `radial-gradient(${gradientSize}px circle at ${position.x}px ${position.y}px, ${gradientColor}, rgba(0, 240, 255, 0.08) 40%, transparent 80%)`
            : "none",
        }}
      />
      {children}
    </div>
  );
}
