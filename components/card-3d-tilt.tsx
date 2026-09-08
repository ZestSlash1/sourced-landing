"use client";

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  ReactNode,
  CSSProperties,
  HTMLAttributes,
} from "react";

export interface Card3DTiltProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
  className?: string;
  maxTilt?: number;
  glare?: boolean;
  scale?: number;
  perspective?: number;
  style?: CSSProperties;
}

export function Card3DTilt({
  children,
  className = "",
  maxTilt = 10,
  glare = true,
  scale = 1.02,
  perspective = 1000,
  style = {},
  ...restProps
}: Card3DTiltProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef<number | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } else {
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (prefersReducedMotion && cardRef.current) {
      cardRef.current.style.transform = "none";
      cardRef.current.style.transition = "none";
      if (glareRef.current) {
        glareRef.current.style.opacity = "0";
      }
    }
  }, [prefersReducedMotion]);

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (prefersReducedMotion || !cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;

      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        if (!cardRef.current) return;
        const normX = (px / rect.width) * 2 - 1;
        const normY = (py / rect.height) * 2 - 1;
        const rotX = -normY * maxTilt;
        const rotY = normX * maxTilt;

        cardRef.current.style.transition = "transform 0.1s ease-out";
        cardRef.current.style.transform = `perspective(${perspective}px) rotateX(${rotX.toFixed(2)}deg) rotateY(${rotY.toFixed(2)}deg) scale3d(${scale}, ${scale}, ${scale})`;

        if (glareRef.current && glare) {
          glareRef.current.style.transition = "opacity 0.2s ease-out";
          glareRef.current.style.opacity = "1";
          glareRef.current.style.background = `radial-gradient(circle at ${px.toFixed(1)}px ${py.toFixed(1)}px, rgba(255,255,255,0.12), transparent 70%)`;
        }
      });
    },
    [glare, maxTilt, perspective, prefersReducedMotion, scale]
  );

  const handlePointerLeave = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (!cardRef.current || prefersReducedMotion) return;

    cardRef.current.style.transition = "transform 0.5s ease-out, opacity 0.5s ease-out";
    cardRef.current.style.transform = `perspective(${perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;

    if (glareRef.current && glare) {
      glareRef.current.style.transition = "opacity 0.5s ease-out";
      glareRef.current.style.opacity = "0";
    }
  }, [glare, perspective, prefersReducedMotion]);

  const handlePointerEnter = useCallback(() => {
    if (prefersReducedMotion || !cardRef.current) return;
    cardRef.current.style.transition = "transform 0.15s ease-out";
  }, [prefersReducedMotion]);

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      onPointerCancel={handlePointerLeave}
      onPointerEnter={handlePointerEnter}
      className={`card-3d-tilt ${className}`.trim()}
      style={{
        position: "relative",
        transformStyle: "preserve-3d",
        willChange: "transform",
        overflow: "hidden",
        ...style,
      }}
      {...restProps}
    >
      {glare && !prefersReducedMotion && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="card-3d-glare"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            borderRadius: "inherit",
            zIndex: 3,
            opacity: 0,
            transition: "opacity 0.5s ease-out",
          }}
        />
      )}
      {children}
    </div>
  );
}

export default Card3DTilt;
