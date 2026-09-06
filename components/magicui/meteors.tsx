"use client";

import React, { useMemo, CSSProperties } from "react";

interface MeteorsProps {
  number?: number;
  className?: string;
}

export function Meteors({ number = 20, className = "" }: MeteorsProps) {
  // Deterministic values for SSR hydration consistency
  const meteorStyles = useMemo(() => {
    return Array.from({ length: number }).map((_, i) => {
      const top = (i * 13) % 100;
      const left = (i * 29 + 10) % 100;
      const delay = ((i * 0.4) % 3) + 0.2;
      const duration = ((i * 0.3) % 4) + 3;

      return {
        top: `${top}%`,
        left: `${left}%`,
        animationDelay: `${delay}s`,
        animationDuration: `${duration}s`,
      };
    });
  }, [number]);

  return (
    <div
      className={`meteors-container ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {meteorStyles.map((style, idx) => (
        <span
          key={`meteor-${idx}`}
          className="meteor-streak"
          style={
            {
              ...style,
              position: "absolute",
              pointerEvents: "none",
              height: "2px",
              width: "2px",
              borderRadius: "9999px",
              background: "linear-gradient(90deg, rgba(255, 255, 255, 0.9), rgba(167, 139, 250, 0.7), transparent)",
              boxShadow: "0 0 6px rgba(124, 58, 237, 0.5)",
              transform: "rotate(215deg)",
              animation: `meteor ${style.animationDuration}s linear infinite`,
              animationDelay: `${style.animationDelay}s`,
            } as CSSProperties
          }
        >
          {/* Meteor Tail */}
          <span
            aria-hidden="true"
            style={{
              position: "absolute",
              top: "50%",
              transform: "translateY(-50%)",
              width: "42px",
              height: "1px",
              background: "linear-gradient(90deg, rgba(167, 139, 250, 0.5), rgba(56, 189, 248, 0.25), transparent)",
            }}
          />
        </span>
      ))}
    </div>
  );
}
