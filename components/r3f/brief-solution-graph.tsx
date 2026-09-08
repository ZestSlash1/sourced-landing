"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
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

interface SignalNodeData {
  platform: string;
  color: string;
  start: [number, number, number];
  control: [number, number, number];
  quoteSnippet?: string;
  speed: number;
  offset: number;
}

const DEFAULT_PLATFORMS = ["GitHub", "Hacker News", "Discourse", "Dev.to"];

const PLATFORM_COLORS: Record<string, string> = {
  GitHub: "#818cf8",
  "Hacker News": "#f59e0b",
  Discourse: "#10b981",
  "Dev.to": "#ec4899",
  "App Store": "#38bdf8",
  Bluesky: "#0ea5e9",
  Reddit: "#f97316",
};

const DEFAULT_NODE_LAYOUTS: Array<{
  start: [number, number, number];
  control: [number, number, number];
}> = [
  { start: [-2.1, 1.15, 0.4], control: [-1.1, 1.45, 0.2] },
  { start: [2.1, 1.15, -0.3], control: [1.1, 1.45, 0.1] },
  { start: [-1.9, -1.15, -0.4], control: [-0.9, -1.35, -0.2] },
  { start: [1.9, -1.15, 0.5], control: [0.9, -1.35, 0.3] },
];

/**
 * BezierStream: Quadratic Bezier trajectory connecting an outer platform signal node
 * to the central Micro-SaaS crystal with an animated glowing telemetry particle packet.
 */
function BezierStream({
  data,
  isInView,
}: {
  data: SignalNodeData;
  isInView: boolean;
}) {
  const curve = useMemo(() => {
    return new THREE.QuadraticBezierCurve3(
      new THREE.Vector3(...data.start),
      new THREE.Vector3(...data.control),
      new THREE.Vector3(0, 0, 0)
    );
  }, [data.start, data.control]);

  const lineObject = useMemo(() => {
    const points = curve.getPoints(28);
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: data.color,
      transparent: true,
      opacity: 0.38,
    });
    return new THREE.Line(geometry, material);
  }, [curve, data.color]);

  useEffect(() => {
    return () => {
      lineObject.geometry.dispose();
      (lineObject.material as THREE.Material).dispose();
    };
  }, [lineObject]);

  const packetRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(data.offset);

  useFrame((_, delta) => {
    if (!isInView || !packetRef.current) return;
    progressRef.current = (progressRef.current + delta * data.speed) % 1;
    const pt = curve.getPoint(progressRef.current);
    packetRef.current.position.copy(pt);
  });

  return (
    <group>
      <primitive object={lineObject} />
      {/* Streaming telemetry particle packet */}
      <mesh ref={packetRef}>
        <sphereGeometry args={[0.045, 12, 12]} />
        <meshBasicMaterial color={data.color} />
      </mesh>
    </group>
  );
}

/**
 * PeripheralSignalNode: Outer platform signal orb with pulsing halo
 * and floating HTML metadata badge.
 */
function PeripheralSignalNode({
  data,
  isInView,
}: {
  data: SignalNodeData;
  isInView: boolean;
}) {
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!isInView || !haloRef.current) return;
    const pulse = 1 + 0.28 * Math.sin(state.clock.getElapsedTime() * 3.5 + data.offset * 6);
    haloRef.current.scale.set(pulse, pulse, pulse);
  });

  return (
    <group position={data.start}>
      {/* Signal core orb */}
      <mesh>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial color={data.color} />
      </mesh>

      {/* Wireframe pulsing halo */}
      <mesh ref={haloRef}>
        <sphereGeometry args={[0.13, 16, 16]} />
        <meshBasicMaterial
          color={data.color}
          transparent
          opacity={0.3}
          wireframe
          depthWrite={false}
        />
      </mesh>

      {/* Floating 3D HUD Chip */}
      <Html
        distanceFactor={6.8}
        center
        position={[0, 0.26, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-mono tracking-wider whitespace-nowrap border shadow-lg backdrop-blur-md select-none"
          style={{
            backgroundColor: "rgba(16, 18, 26, 0.9)",
            borderColor: `${data.color}55`,
            color: data.color,
            boxShadow: `0 0 14px ${data.color}33`,
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full"
            style={{ backgroundColor: data.color }}
          />
          <span className="font-bold">{data.platform}</span>
          {data.quoteSnippet && (
            <span className="text-slate-400 opacity-80 text-[9px] max-w-[100px] truncate">
              · {data.quoteSnippet}
            </span>
          )}
        </div>
      </Html>
    </group>
  );
}

/**
 * SolutionCrystalCore: Central rotating icosahedron solution crystal
 * representing the synthesized Micro-SaaS nucleus.
 */
function SolutionCrystalCore({
  title,
  demandScore,
  isInView,
}: {
  title: string;
  demandScore: number;
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

      {/* Floating Central Solution Badge */}
      <Html
        distanceFactor={6.8}
        center
        position={[0, 0.85, 0]}
        style={{ pointerEvents: "none" }}
      >
        <div className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl border border-violet-500/40 bg-[#10121a]/95 text-center shadow-[0_0_20px_rgba(124,58,237,0.3)] backdrop-blur-md select-none">
          <span className="text-[9px] font-mono tracking-widest text-violet-400 font-bold uppercase">
            SOLUTION CORE
          </span>
          <span className="text-[11px] font-semibold text-white max-w-[160px] truncate leading-tight">
            {title}
          </span>
          <span className="text-[8.5px] font-mono text-emerald-400 font-bold tracking-wider">
            {`${demandScore}% DEMAND`}
          </span>
        </div>
      </Html>
    </group>
  );
}

/**
 * SolutionGraphScene: Decouples continuous ambient rotation from pointer parallax
 * via nested groups to prevent rotation stalling.
 */
function SolutionGraphScene({
  title,
  evidence,
  demandScore,
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

  // Prepare up to 4 signal nodes
  const nodesData: SignalNodeData[] = useMemo(() => {
    const rawPlatforms = Array.from(new Set(evidence.map((e) => e.platform).filter(Boolean)));
    const platforms = [...rawPlatforms];
    if (platforms.length === 0) {
      platforms.push(...DEFAULT_PLATFORMS);
    } else if (platforms.length < 4) {
      for (const p of DEFAULT_PLATFORMS) {
        if (!platforms.includes(p) && platforms.length < 4) platforms.push(p);
      }
    }
    const selectedPlatforms = platforms.slice(0, 4);

    return selectedPlatforms.map((platform, idx) => {
      const layout = DEFAULT_NODE_LAYOUTS[idx] || DEFAULT_NODE_LAYOUTS[0];
      const match = evidence.find((e) => e.platform === platform);
      return {
        platform,
        color: PLATFORM_COLORS[platform] || "#a78bfa",
        start: layout.start,
        control: layout.control,
        quoteSnippet: match?.quote ? match.quote.slice(0, 30) : undefined,
        speed: 0.4 + idx * 0.08,
        offset: idx * 0.25,
      };
    });
  }, [evidence]);

  useFrame((state, delta) => {
    if (!isInView) return;

    // 1. Uninterrupted continuous ambient spin on outer group
    if (outerSpinRef.current) {
      outerSpinRef.current.rotation.y += delta * 0.1;
    }

    // 2. Smoothed pointer parallax on inner group
    if (innerParallaxRef.current) {
      const targetX = -state.pointer.y * 0.3;
      const targetY = state.pointer.x * 0.4;

      pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, targetX, 0.05);
      pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, targetY, 0.05);

      innerParallaxRef.current.rotation.x = pointerTarget.current.x + 0.12;
      innerParallaxRef.current.rotation.y = pointerTarget.current.y;
    }
  });

  return (
    <group ref={innerParallaxRef}>
      <group ref={outerSpinRef}>
        {/* Central Micro-SaaS Nucleus */}
        <SolutionCrystalCore
          title={title}
          demandScore={demandScore}
          isInView={isInView}
        />

        {/* Ambient orbital rings */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.2, 0.006, 16, 64]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.15} />
        </mesh>

        {/* Outer Peripheral Signal Nodes & Ingress Bezier Streams */}
        {nodesData.map((node) => (
          <React.Fragment key={node.platform}>
            <BezierStream data={node} isInView={isInView} />
            <PeripheralSignalNode data={node} isInView={isInView} />
          </React.Fragment>
        ))}
      </group>
    </group>
  );
}

/**
 * BriefSolutionGraph: Interactive 3D WebGL Canvas showing multi-platform complaint
 * signal nodes converging along curved quadratic bezier lines with flowing particle
 * streams into a central rotating solution crystal.
 */
export function BriefSolutionGraph({
  title = "Solution Core",
  evidence = [],
  demandScore = 85,
  className = "",
  style = {},
}: BriefSolutionGraphProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // Lazy initialization for prefers-reduced-motion: reduce
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );

  useEffect(() => {
    setIsMounted(true);
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Viewport Observer: Persistent on outer container for 0% idle GPU off-screen
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
      className={`relative w-full h-[360px] md:h-[400px] overflow-hidden rounded-2xl border border-violet-500/20 bg-[#08090e]/85 shadow-[0_0_35px_rgba(124,58,237,0.12)] ${className}`}
      style={style}
    >
      {/* Background ambient glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(124, 58, 237, 0.14) 0%, rgba(8, 9, 14, 0.95) 75%)",
        }}
      />

      {/* Telemetry Overlays */}
      <div className="absolute top-3 left-4 z-10 text-[10px] font-mono tracking-widest text-violet-400/80 pointer-events-none flex items-center gap-1.5">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-ping motion-reduce:animate-none" />
        SYS.GRAPH // 3D SOLUTION CONVERGENCE
      </div>
      <div className="absolute top-3 right-4 z-10 text-[10px] font-mono tracking-wider text-emerald-400/90 pointer-events-none">
        {`${demandScore}% DEMAND SCORE`}
      </div>
      <div className="absolute bottom-3 left-4 z-10 text-[9px] font-mono text-slate-400/70 pointer-events-none">
        INTERACTIVE 3D // POINTER PARALLAX
      </div>
      <div className="absolute bottom-3 right-4 z-10 text-[9px] font-mono text-violet-400/70 pointer-events-none">
        SYS.SOLUTION // SYNTHESIZED
      </div>

      <Canvas
        dpr={[1, 1.5]}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        frameloop={isInView ? "always" : "never"}
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
