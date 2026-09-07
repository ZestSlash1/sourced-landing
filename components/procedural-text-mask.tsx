"use client";

import React, { useEffect, useRef, useState, CSSProperties } from "react";

interface ProceduralTextMaskProps {
  text: string;
  className?: string;
  style?: CSSProperties;
  /** Primary accent tint for the telemetry particles (default violet/indigo) */
  glowColor?: string;
}

interface Particle {
  x: number;
  y: number;
  speed: number;
  char: string;
  color: string;
  size: number;
  alpha: number;
}

const SYMBOLS = ["0", "1", "λ", "⌁", "⚡", "+", "-", "•", "x", "a", "f", "9", "3", "7"];
const ACCENT_COLORS = [
  "rgba(196, 181, 253, ", // violet-300
  "rgba(167, 139, 250, ", // violet-400
  "rgba(124, 58, 237, ",  // violet-600
  "rgba(56, 189, 248, ",  // sky-400
  "rgba(99, 102, 241, ",  // indigo-500
  "rgba(16, 185, 129, ",  // emerald-500
];

export function ProceduralTextMask({
  text,
  className = "",
  style = {},
}: ProceduralTextMaskProps) {
  const containerRef = useRef<HTMLSpanElement | null>(null);
  const textRef = useRef<HTMLSpanElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    setIsClient(true);
    if (typeof window !== "undefined") {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      setReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
      mq.addEventListener("change", listener);
      return () => mq.removeEventListener("change", listener);
    }
  }, []);

  useEffect(() => {
    if (!isClient || reducedMotion) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    const textEl = textRef.current;
    if (!canvas || !container || !textEl) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animFrameId: number;
    let isVisible = true;
    let width = 0;
    let height = 0;
    let scanlineY = 0;
    let particles: Particle[] = [];

    function initParticles(w: number, h: number) {
      const count = Math.max(28, Math.floor(w * 0.45));
      particles = Array.from({ length: count }, () => {
        const baseColor = ACCENT_COLORS[Math.floor(Math.random() * ACCENT_COLORS.length)];
        return {
          x: Math.random() * w,
          y: Math.random() * h,
          speed: 0.4 + Math.random() * 1.6,
          char: SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
          color: baseColor,
          size: 9 + Math.random() * 7,
          alpha: 0.35 + Math.random() * 0.65,
        };
      });
    }

    function resize() {
      if (!canvas || !container || !textEl) return;
      const rect = container.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      width = Math.ceil(rect.width);
      height = Math.ceil(rect.height);

      if (width === 0 || height === 0) return;

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx!.scale(dpr, dpr);
      initParticles(width, height);
    }

    resize();
    const ro = new ResizeObserver(() => resize());
    ro.observe(container);

    // Pause when offscreen for battery and performance
    const io = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
      },
      { threshold: 0.05 }
    );
    io.observe(container);

    let lastTick = performance.now();

    function render(now: number) {
      animFrameId = requestAnimationFrame(render);
      if (!isVisible || width === 0 || height === 0) return;

      const dt = Math.min((now - lastTick) / 1000, 0.1);
      lastTick = now;

      // 1. Reset composite mode and clear canvas
      ctx!.globalCompositeOperation = "source-over";
      ctx!.clearRect(0, 0, width, height);

      // 2. Draw iridescent backdrop gradient with rich violet/sky depth
      const bgGrad = ctx!.createLinearGradient(0, 0, width, height);
      bgGrad.addColorStop(0, "rgba(124, 58, 237, 0.92)");   // violet-600
      bgGrad.addColorStop(0.35, "rgba(79, 70, 229, 0.95)"); // indigo-600
      bgGrad.addColorStop(0.7, "rgba(14, 165, 233, 0.92)");  // sky-500
      bgGrad.addColorStop(1, "rgba(168, 85, 247, 0.92)");   // purple-500
      ctx!.fillStyle = bgGrad;
      ctx!.fillRect(0, 0, width, height);

      // 3. Draw streaming particles / code glyphs with bright telemetry contrast
      ctx!.font = "700 11px 'JetBrains Mono', monospace";
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speed * 60 * dt;
        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
          p.char = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
          p.alpha = 0.5 + Math.random() * 0.5;
        }

        ctx!.fillStyle = `${p.color}${p.alpha})`;
        ctx!.fillText(p.char, p.x, p.y);
      }

      // 4. Draw periodic radar/scanline pulse
      scanlineY = (scanlineY + 38 * dt) % (height + 30);
      const scanGrad = ctx!.createLinearGradient(0, scanlineY - 16, 0, scanlineY + 16);
      scanGrad.addColorStop(0, "rgba(255, 255, 255, 0)");
      scanGrad.addColorStop(0.5, "rgba(255, 255, 255, 0.7)");
      scanGrad.addColorStop(1, "rgba(255, 255, 255, 0)");
      ctx!.fillStyle = scanGrad;
      ctx!.fillRect(0, scanlineY - 16, width, 32);

      // 5. MASK: Keep ONLY pixels within the text glyphs
      ctx!.globalCompositeOperation = "destination-in";

      // Compute exact font styles from the underlying text node
      const computed = window.getComputedStyle(textEl!);
      const fontSize = computed.fontSize || "48px";
      const fontWeight = computed.fontWeight || "700";
      const fontFamily = computed.fontFamily || "'Space Grotesk', sans-serif";
      const letterSpacing = computed.letterSpacing || "-0.02em";

      ctx!.font = `${fontWeight} ${fontSize} ${fontFamily}`;
      ctx!.textAlign = "center";
      ctx!.textBaseline = "middle";

      // Apply letter spacing if canvas supports it
      if ("letterSpacing" in ctx!) {
        (ctx as unknown as { letterSpacing: string }).letterSpacing = letterSpacing;
      }

      ctx!.fillStyle = "#000000";
      ctx!.fillText(text, width / 2, height / 2);
    }

    animFrameId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animFrameId);
      ro.disconnect();
      io.disconnect();
    };
  }, [isClient, reducedMotion, text]);

  return (
    <span
      ref={containerRef}
      className={`procedural-text-mask ${className}`}
      style={{
        position: "relative",
        display: "inline-block",
        verticalAlign: "baseline",
        lineHeight: "inherit",
        ...style,
      }}
    >
      {/* Underlying semantic text: always in DOM for accessibility, SEO, and sizing */}
      <span
        ref={textRef}
        className="accent"
        style={{
          display: "inline-block",
          opacity: isClient && !reducedMotion ? 0 : 1,
          userSelect: "text",
        }}
      >
        {text}
      </span>

      {/* Hardware-accelerated canvas text mask layer */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          display: reducedMotion ? "none" : "block",
        }}
      />
    </span>
  );
}
export default ProceduralTextMask;
