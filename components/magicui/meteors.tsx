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
    <div className={`meteors-container pointer-events-none absolute inset-0 overflow-hidden ${className}`}>
      {meteorStyles.map((style, idx) => (
        <span
          key={`meteor-${idx}`}
          className="meteor-streak pointer-events-none absolute h-0.5 w-0.5 rotate-[215deg] animate-[meteor_linear_infinite] rounded-[9999px] bg-slate-400 shadow-[0_0_0_1px_#ffffff10]"
          style={
            {
              ...style,
              position: "absolute",
              height: "2px",
              width: "2px",
              borderRadius: "9999px",
              background: "linear-gradient(90deg, #fff, #8A2BE2, transparent)",
              boxShadow: "0 0 8px rgba(138, 43, 226, 0.8)",
              animation: `meteor ${style.animationDuration} linear infinite`,
              animationDelay: style.animationDelay,
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
              width: "50px",
              height: "1px",
              background: "linear-gradient(90deg, rgba(138, 43, 226, 0.8), rgba(0, 240, 255, 0.4), transparent)",
            }}
          />
        </span>
      ))}
    </div>
  );
}
