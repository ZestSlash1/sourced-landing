"use client";

import React, { CSSProperties } from "react";

interface BorderBeamProps {
  size?: number;
  duration?: number;
  delay?: number;
  colorFrom?: string;
  colorTo?: string;
  className?: string;
  borderWidth?: number;
}

export function BorderBeam({
  size = 160,
  duration = 14,
  delay = 0,
  colorFrom = "rgba(138, 43, 226, 0.65)",
  colorTo = "rgba(6, 182, 212, 0.45)",
  className = "",
  borderWidth = 1.25,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`border-beam ${className}`}
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        borderRadius: "inherit",
        borderWidth: `${borderWidth}px`,
        borderStyle: "solid",
        borderColor: "transparent",
        maskImage: "linear-gradient(transparent, transparent), linear-gradient(#000, #000)",
        maskClip: "padding-box, border-box",
        maskComposite: "intersect",
        WebkitMaskComposite: "destination-out",
        overflow: "hidden",
      }}
    >
      <div
        style={
          {
            position: "absolute",
            aspectRatio: "1/1",
            width: `${size}px`,
            offsetPath: "rect(0 auto auto 0 round inherit)",
            animation: `border-beam ${duration}s linear infinite`,
            animationDelay: `${delay}s`,
            background: `linear-gradient(to left, ${colorFrom}, ${colorTo}, transparent)`,
            transform: "translate(-50%, -50%)",
            opacity: 0.9,
            filter: "blur(0.5px)",
          } as CSSProperties
        }
      />
    </div>
  );
}
