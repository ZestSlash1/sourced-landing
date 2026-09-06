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
  size = 150,
  duration = 12,
  delay = 0,
  colorFrom = "#8A2BE2",
  colorTo = "#00F0FF",
  className = "",
  borderWidth = 1.5,
}: BorderBeamProps) {
  return (
    <div
      aria-hidden="true"
      className={`border-beam pointer-events-none absolute inset-0 rounded-[inherit] ${className}`}
      style={{
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
