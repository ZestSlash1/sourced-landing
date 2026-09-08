"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { BriefGraphFallback, type BriefGraphFallbackProps } from "./brief-graph-fallback";

export { BriefGraphFallback, type BriefGraphFallbackProps };

export interface BriefSolutionGraphProps {
  title?: string;
  evidence?: Array<{ platform: string; quote?: string; title?: string; url?: string }>;
  demandScore?: number;
  className?: string;
  style?: React.CSSProperties;
}

interface PlatformSignal {
  platform: string;
  color: string;
  quoteSnippet?: string;
  position: [number, number, number];
  controlPoint: [number, number, number];
}

const DEFAULT_PLATFORMS: Array<{ platform: string; color: string }> = [
  { platform: "GitHub", color: "#818cf8" },
  { platform: "Hacker News", color: "#f59e0b" },
  { platform: "Discourse", color: "#10b981" },
  { platform: "App Store", color: "#38bdf8" },
];

const PLATFORM_COLOR_MAP: Record<string, string> = {
  GitHub: "#818cf8",
  "Hacker News": "#f59e0b",
  Discourse: "#10b981",
  "Dev.to": "#ec4899",
  "App Store": "#38bdf8",
  Bluesky: "#0ea5e9",
  Reddit: "#f97316",
};

/**
 * BezierStream: Draws a glowing quadratic bezier connection from a peripheral
 * signal node to the central solution nucleus, with an animated light packet flowing along it.
 */
function BezierStream({
  start,
  control,
  end,
  color,
  isInView,
  speed = 0.5,
  offset = 0,
}: {
  start: [number, number, number];
  control: [number, number, number];
  end: [number, number, number];
  color: string;
  isInView: boolean;
  speed?: number;
  offset?: number;
}) {
  const packetRef = useRef<THREE.Mesh>(null);

  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...start),
      new THREE.Vector3(...control),
      new THREE.Vector3(...end)
    );
  }, [start, control, end]);

  const lineGeometry = useMemo(() => {
    const points = curve.getPoints(36);
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [curve]);

  const lineObject = useMemo(() => {
    const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.35 });
    return new THREE.Line(lineGeometry, mat);
  }, [lineGeometry, color]);

  useEffect(() => {
    return () => {
      lineGeometry.dispose();
      (lineObject.material as THREE.Material).dispose();
    };
  }, [lineGeometry, lineObject]);

  useFrame((state) => {
    if (!isInView || !packetRef.current) return;
    const t = (state.clock.getElapsedTime() * speed + offset) % 1;
    const point = curve.getPoint(t);
    packetRef.current.position.set(point.x, point.y, point.z);
    const scale = 0.8 + 0.4 * Math.sin(t * Math.PI);
    packetRef.current.scale.set(scale, scale, scale);
  });

  return (
    <group>
      {/* Curved connection line */}
      <primitive object={lineObject} />

      {/* Flowing animated light packet */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

/**
 * PeripheralSignalNode: Outer node representing a complaint source with glowing halos.
 */
function PeripheralSignalNode({
  data,
  isInView,
}: {
  data: PlatformSignal;
  isInView: boolean;
}) {
  const pulseRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isInView || !pulseRef.current) return;
    const pulse = 1 + 0.25 * Math.sin(state.clock.getElapsedTime() * 3.5 + data.position[0]);
    pulseRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group position={data.position}>
      {/* Solid core sphere */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={data.color} />
      </mesh>

      {/* Pulsing wireframe halo */}
      <mesh ref={pulseRef}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.3}
          wireframe
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/**
 * SolutionCrystalCore: Central rotating icosahedron solution crystal
 * representing the synthesized Micro-SaaS nucleus.
 */
function SolutionCrystalCore({
  isInView,
}: {
  isInView: boolean;
}) {
  const crystalRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!isInView) return;
    if (crystalRef.current) {
      crystalRef.current.rotation.x += delta * 0.25;
      crystalRef.current.rotation.y += delta * 0.35;
    }
    if (innerRef.current) {
      innerRef.current.rotation.x -= delta * 0.4;
      innerRef.current.rotation.z += delta * 0.3;
      const pulse = 1 + 0.15 * Math.sin(state.clock.getElapsedTime() * 4);
      innerRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Outer wireframe crystallized icosahedron */}
      <mesh ref={crystalRef}>
        <icosahedronGeometry args={[0.55, 0]} />
        <meshBasicMaterial
          color="#8b5cf6"
          wireframe
          transparent
          opacity={0.65}
        />
      </mesh>

      {/* Inner glowing nucleus crystal */}
      <mesh ref={innerRef}>
        <octahedronGeometry args={[0.26, 0]} />
        <meshBasicMaterial color="#c4b5fd" />
      </mesh>

      {/* Concentric coordinate ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.9, 0.008, 16, 48]} />
        <meshBasicMaterial color="#7c3aed" transparent opacity={0.3} />
      </mesh>
    </group>
  );
}

/**
 * SolutionGraphScene: Decouples continuous ambient rotation from pointer parallax
 * via nested groups to prevent rotation stalling.
 */
function SolutionGraphScene({
  evidence,
  isInView,
}: {
  title: string;
  evidence: Array<{ platform: string; quote?: string; title?: string; url?: string }>;
  demandScore: number;
  isInView: boolean;
}) {
  const outerSpinRef = useRef<THREE.Group>(null);
  const innerParallaxRef = useRef<THREE.Group>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });

  // Map evidence or fall back to default platforms symmetrically around center
  const signals: PlatformSignal[] = useMemo(() => {
    const rawPlatforms = Array.from(new Set(evidence.map((e) => e.platform).filter(Boolean)));
    const selected: Array<{ platform: string; color: string; quote?: string }> = [];

    for (const p of rawPlatforms) {
      const match = evidence.find((e) => e.platform === p);
      selected.push({
        platform: p,
        color: PLATFORM_COLOR_MAP[p] || "#a78bfa",
        quote: match?.quote || match?.title,
      });
      if (selected.length === 4) break;
    }

    // Pad with defaults if less than 3
    if (selected.length < 3) {
      for (const def of DEFAULT_PLATFORMS) {
        if (!selected.some((s) => s.platform === def.platform)) {
          selected.push(def);
          if (selected.length === 4) break;
        }
      }
    }

    // 4 symmetric quadrant coordinates on XY plane
    const baseCoords: Array<{
      pos: [number, number, number];
      ctrl: [number, number, number];
    }> = [
      { pos: [-2.1, 1.2, 0], ctrl: [-1.0, 0.4, 0.4] },   // Top-left
      { pos: [-2.1, -1.2, 0], ctrl: [-1.0, -0.4, -0.3] }, // Bottom-left
      { pos: [2.1, 1.2, 0], ctrl: [1.0, 0.4, -0.4] },     // Top-right
      { pos: [2.1, -1.2, 0], ctrl: [1.0, -0.4, 0.3] },    // Bottom-right
    ];

    return selected.map((item, idx) => {
      const coord = baseCoords[idx] || baseCoords[0];
      return {
        platform: item.platform,
        color: item.color,
        quoteSnippet: item.quote ? (item.quote.length > 40 ? `${item.quote.slice(0, 38)}…` : item.quote) : undefined,
        position: coord.pos,
        controlPoint: coord.ctrl,
      };
    });
  }, [evidence]);

  useFrame((state, delta) => {
    if (!isInView) return;

    // 1. Continuous slow ambient rotation of the entire node network
    if (outerSpinRef.current) {
      outerSpinRef.current.rotation.y += delta * 0.15;
    }

    // 2. Smoothed pointer parallax on the inner group
    if (innerParallaxRef.current) {
      const targetX = -state.pointer.y * 0.25;
      const targetY = state.pointer.x * 0.35;

      pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, targetX, 0.05);
      pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, targetY, 0.05);

      innerParallaxRef.current.rotation.x = pointerTarget.current.x + 0.1;
      innerParallaxRef.current.rotation.y = pointerTarget.current.y;
    }
  });

  return (
    <group ref={innerParallaxRef}>
      <group ref={outerSpinRef}>
        {/* Central synthesized micro-SaaS crystal core */}
        <SolutionCrystalCore isInView={isInView} />

        {/* Outer complaint signal nodes and bezier convergence streams */}
        {signals.map((sig, idx) => (
          <group key={sig.platform + idx}>
            <PeripheralSignalNode data={sig} isInView={isInView} />
            <BezierStream
              start={sig.position}
              control={sig.controlPoint}
              end={[0, 0, 0]}
              color={sig.color}
              isInView={isInView}
              speed={0.45}
              offset={idx * 0.25}
            />
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * BriefSolutionGraph: Interactive 3D WebGL component for Drop Detail Pages.
 */
export function BriefSolutionGraph({
  title = "Micro-SaaS Solution",
  evidence = [],
  demandScore = 85,
  className = "",
  style = {},
}: BriefSolutionGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;

    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    if (!containerRef.current || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { threshold: 0.05 }
    );

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Extract platforms for HUD bottom legend
  const platforms = useMemo(() => {
    const raw = Array.from(new Set(evidence.map((e) => e.platform).filter(Boolean)));
    if (raw.length === 0) return ["GitHub", "Hacker News", "Discourse"];
    return raw.slice(0, 4);
  }, [evidence]);

  // Fallback if SSR or reduced-motion
  if (!isMounted || prefersReducedMotion) {
    return (
      <BriefGraphFallback
        title={title}
        evidence={evidence}
        demandScore={demandScore}
        className={className}
        style={style}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className={`brief-graph-wrap ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 680,
        height: 380,
        margin: "24px auto 32px",
        borderRadius: 16,
        border: "1px solid rgba(124, 58, 237, 0.25)",
        background:
          "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.08) 0%, rgba(16, 18, 26, 0.92) 80%)",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 30px rgba(124, 58, 237, 0.06)",
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {/* Top-left Telemetry Overlay */}
      <div
        style={{
          position: "absolute",
          top: 14,
          left: 16,
          zIndex: 10,
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          fontSize: 10,
          letterSpacing: "0.06em",
          color: "rgba(167, 139, 250, 0.9)",
          pointerEvents: "none",
          textTransform: "uppercase",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#10b981",
            display: "inline-block",
            boxShadow: "0 0 8px #10b981",
          }}
        />
        <span>SYS.CONVERGENCE // 3D SIGNAL GRAPH</span>
      </div>

      {/* Top-right Demand Metric */}
      <div
        style={{
          position: "absolute",
          top: 14,
          right: 16,
          zIndex: 10,
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          fontSize: 10,
          letterSpacing: "0.04em",
          color: "var(--lime, #10b981)",
          fontWeight: 600,
          pointerEvents: "none",
          textTransform: "uppercase",
        }}
      >
        {`${demandScore}% DEMAND SCORE`}
      </div>

      {/* Bottom Status Strip */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 16,
          right: 16,
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          pointerEvents: "none",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {platforms.map((p) => {
            const color = PLATFORM_COLOR_MAP[p] || "#a78bfa";
            return (
              <span
                key={p}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 9.5,
                  fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                  color,
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    backgroundColor: color,
                    display: "inline-block",
                    boxShadow: `0 0 6px ${color}`,
                  }}
                />
                {p}
              </span>
            );
          })}
        </div>
        <span
          style={{
            fontSize: 9,
            fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
            color: "var(--ink-soft, #9496a6)",
            letterSpacing: "0.04em",
            maxWidth: 220,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          → {title}
        </span>
      </div>

      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        frameloop={isInView ? "always" : "never"}
        style={{ width: "100%", height: "100%" }}
      >
        <ambientLight intensity={0.7} />
        <pointLight position={[5, 5, 5]} intensity={0.9} />
        <SolutionGraphScene
          title={title}
          evidence={evidence}
          demandScore={demandScore}
          isInView={isInView}
        />
      </Canvas>
    </div>
  );
}

export default BriefSolutionGraph;
