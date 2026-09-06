"use client";

import React, { ReactNode, CSSProperties } from "react";

interface MarqueeProps {
  children?: ReactNode;
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  speed?: number; // seconds for full cycle
  gap?: string;
}

export function Marquee({
  children,
  className = "",
  reverse = false,
  pauseOnHover = false,
  speed = 28,
  gap = "16px",
}: MarqueeProps) {
  const [isPaused, setIsPaused] = React.useState(false);

  return (
    <div
      className={`marquee-container ${className}`}
      onMouseEnter={pauseOnHover ? () => setIsPaused(true) : undefined}
      onMouseLeave={pauseOnHover ? () => setIsPaused(false) : undefined}
      style={
        {
          "--marquee-gap": gap,
          display: "flex",
          flexDirection: "row",
          width: "100%",
          overflow: "hidden",
          position: "relative",
          userSelect: "none",
          gap,
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        } as CSSProperties
      }
    >
      <div
        className="marquee-content"
        style={{
          display: "flex",
          flexDirection: "row",
          flexShrink: 0,
          alignItems: "center",
          gap,
          minWidth: "100%",
          animation: `marquee ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="marquee-content"
        style={{
          display: "flex",
          flexDirection: "row",
          flexShrink: 0,
          alignItems: "center",
          gap,
          minWidth: "100%",
          animation: `marquee ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`,
          animationPlayState: isPaused ? "paused" : "running",
        }}
      >
        {children}
      </div>
    </div>
  );
}
