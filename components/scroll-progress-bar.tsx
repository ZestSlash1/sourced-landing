"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function ScrollProgressBar() {
  const pathname = usePathname() || "/";
  const barRef = useRef<HTMLDivElement>(null);

  // In browsers without native animation-timeline: scroll(), provide a zero-jank rAF fallback
  useEffect(() => {
    if (typeof window === "undefined" || pathname.startsWith("/admin")) {
      return;
    }

    // If browser supports CSS animation-timeline, let native CSS compositor handle it
    const hasCssScrollTimeline =
      typeof CSS !== "undefined" &&
      typeof CSS.supports === "function" &&
      CSS.supports("animation-timeline", "scroll()");

    if (hasCssScrollTimeline) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    let ticking = false;
    const bar = barRef.current;

    const updateFallbackProgress = () => {
      if (!bar) return;
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 0) {
        const progress = Math.min(1, Math.max(0, window.scrollY / scrollHeight));
        bar.style.transform = `scaleX(${progress})`;
      }
      ticking = false;
    };

    const onScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(updateFallbackProgress);
        ticking = true;
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    updateFallbackProgress();

    return () => {
      window.removeEventListener("scroll", onScroll);
    };
  }, [pathname]);

  if (pathname.startsWith("/admin")) {
    return null;
  }

  return (
    <div
      ref={barRef}
      className="scroll-progress-bar"
      role="progressbar"
      aria-hidden="true"
    />
  );
}
