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
  return (
    <div
      className={`marquee-container relative flex w-full overflow-hidden ${className} ${
        pauseOnHover ? "hover:[&_.marquee-content]:[animation-play-state:paused]" : ""
      }`}
      style={
        {
          "--marquee-gap": gap,
          maskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage: "linear-gradient(to right, transparent, black 10%, black 90%, transparent)",
        } as CSSProperties
      }
    >
      <div
        className="marquee-content flex shrink-0 items-center justify-around gap-[var(--marquee-gap)]"
        style={{
          animation: `marquee ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`,
        }}
      >
        {children}
      </div>
      <div
        aria-hidden="true"
        className="marquee-content flex shrink-0 items-center justify-around gap-[var(--marquee-gap)]"
        style={{
          animation: `marquee ${speed}s linear infinite ${reverse ? "reverse" : "normal"}`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
