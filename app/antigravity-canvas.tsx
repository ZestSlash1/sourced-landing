"use client";

import { useEffect, useRef } from "react";

type ParticleColor = "brandViolet" | "deepViolet" | "neutral";

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseVy: number;
  baseVx: number;
  radius: number;
  baseAlpha: number;
  colorType: ParticleColor;
  phase: number;
}

export default function AntigravityCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animId: number;
    let width = 0;
    let height = 0;
    let dpr = 1;

    // Smooth cursor interpolation
    const mouse = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
      radius: 170,
      active: false,
    };

    let particles: Particle[] = [];
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function initParticles(w: number, h: number) {
      // Density-based count: ~70 on 1080p, ~30 on mobile screens
      const count = Math.min(85, Math.max(28, Math.floor((w * h) / 24000)));
      particles = [];

      for (let i = 0; i < count; i++) {
        const rand = Math.random();
        let colorType: ParticleColor = "brandViolet";
        if (rand < 0.5) {
          colorType = "brandViolet";
        } else if (rand < 0.78) {
          colorType = "deepViolet";
        } else {
          colorType = "neutral";
        }

        const baseVy = -(0.22 + Math.random() * 0.42); // gentle microgravity upward drift
        const baseVx = (Math.random() - 0.5) * 0.18;

        particles.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: baseVx,
          vy: baseVy,
          baseVx,
          baseVy,
          radius: Math.random() * 1.6 + 1.2,
          baseAlpha: Math.random() * 0.35 + 0.18,
          colorType,
          phase: Math.random() * Math.PI * 2,
        });
      }
    }

    function resize() {
      if (!canvas) return;
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (particles.length === 0) {
        initParticles(width, height);
      }
    }

    resize();
    window.addEventListener("resize", resize, { passive: true });

    function onMouseMove(e: MouseEvent) {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.active = true;
    }

    function onMouseLeave() {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
      mouse.active = false;
    }

    window.addEventListener("mousemove", onMouseMove, { passive: true });
    document.addEventListener("mouseleave", onMouseLeave);

    let lastTime = performance.now();

    function render(currentTime: number) {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Smooth cursor lerp
      if (mouse.active) {
        mouse.x += (mouse.targetX - mouse.x) * 0.18;
        mouse.y += (mouse.targetY - mouse.y) * 0.18;
      } else {
        mouse.x = -1000;
        mouse.y = -1000;
      }

      ctx!.clearRect(0, 0, width, height);

      const maxConnectDist = 82;
      const maxConnectDistSq = maxConnectDist * maxConnectDist;
      const mouseRadiusSq = mouse.radius * mouse.radius;

      // 1. Draw connection filaments between nearby particles (triangulation motif)
      ctx!.lineWidth = 0.75;
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p2.x - p1.x;
          const dy = p2.y - p1.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxConnectDistSq) {
            const dist = Math.sqrt(distSq);
            const alpha = (1 - dist / maxConnectDist) * 0.16;
            ctx!.strokeStyle = `rgba(91, 79, 247, ${alpha.toFixed(3)})`;
            ctx!.beginPath();
            ctx!.moveTo(p1.x, p1.y);
            ctx!.lineTo(p2.x, p2.y);
            ctx!.stroke();
          }
        }
      }

      // 2. Update & draw particles
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        if (!prefersReducedMotion) {
          // Subtle organic sway
          p.phase += dt * 1.4;
          const sway = Math.sin(p.phase) * 0.14;

          // Cursor repulsion / antigravity field
          const dx = p.x - mouse.x;
          const dy = p.y - mouse.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < mouseRadiusSq && mouse.active) {
            const dist = Math.sqrt(distSq) || 1;
            const force = (1 - dist / mouse.radius) * 3.6;
            const pushX = (dx / dist) * force;
            const pushY = (dy / dist) * force;
            p.vx += pushX * 0.22;
            p.vy += pushY * 0.22;
          }

          // Damping & drift restoration
          p.vx = p.vx * 0.94 + (p.baseVx + sway) * 0.06;
          p.vy = p.vy * 0.94 + p.baseVy * 0.06;

          p.x += p.vx;
          p.y += p.vy;

          // Wrap bounds smoothly
          if (p.y < -20) {
            p.y = height + 20;
            p.x = Math.random() * width;
          } else if (p.y > height + 20) {
            p.y = -20;
            p.x = Math.random() * width;
          }
          if (p.x < -20) p.x = width + 20;
          else if (p.x > width + 20) p.x = -20;
        }

        // Draw particle dot
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.radius, 0, Math.PI * 2);

        if (p.colorType === "brandViolet") {
          ctx!.fillStyle = `rgba(91, 79, 247, ${p.baseAlpha.toFixed(2)})`;
        } else if (p.colorType === "deepViolet") {
          ctx!.fillStyle = `rgba(66, 56, 216, ${p.baseAlpha.toFixed(2)})`;
        } else {
          ctx!.fillStyle = `rgba(21, 22, 26, ${(p.baseAlpha * 0.55).toFixed(2)})`;
        }
        ctx!.fill();
      }

      if (!prefersReducedMotion) {
        animId = requestAnimationFrame(render);
      }
    }

    // Handle tab visibility to save CPU/battery
    function onVisibilityChange() {
      if (document.hidden) {
        cancelAnimationFrame(animId);
      } else if (!prefersReducedMotion) {
        lastTime = performance.now();
        animId = requestAnimationFrame(render);
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseleave", onMouseLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="antigravity-bg"
    />
  );
}
