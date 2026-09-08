"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import { RadarFallback, type RadarFallbackProps } from "./radar-fallback";

export { RadarFallback, type RadarFallbackProps };

export interface RadarSignalSphereProps {
  className?: string;
  style?: React.CSSProperties;
}

interface SignalChannel {
  id: string;
  name: string;
  code: string;
  color: string;
  count: string;
  tilt: [number, number, number];
  speed: number;
  initialAngle: number;
}

const SIGNAL_CHANNELS: SignalChannel[] = [
  {
    id: "github",
    name: "GitHub",
    code: "GH",
    color: "#818cf8", // Violet / Indigo
    count: "27 signals",
    tilt: [0.4, 0, 0.25],
    speed: 0.45,
    initialAngle: 0.5,
  },
  {
    id: "hn",
    name: "Hacker News",
    code: "HN",
    color: "#f59e0b", // Amber
    count: "41 signals",
    tilt: [-0.45, 0, 0.35],
    speed: 0.6,
    initialAngle: 2.2,
  },
  {
    id: "appstore",
    name: "App Store",
    code: "iOS",
    color: "#38bdf8", // Sky Cyan
    count: "33 signals",
    tilt: [0.6, 0, -0.4],
    speed: 0.5,
    initialAngle: 3.8,
  },
  {
    id: "discourse",
    name: "Discourse",
    code: "DSC",
    color: "#10b981", // Emerald
    count: "19 signals",
    tilt: [-0.3, 0, -0.55],
    speed: 0.55,
    initialAngle: 5.1,
  },
];

/**
 * SweepingRadarBeam: An equatorial rotating scan cone / beam slice around Y-axis.
 * Uses declarative <ringGeometry> JSX without manual memory allocation.
 */
function SweepingRadarBeam({ isInView }: { isInView: boolean }) {
  const beamGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!isInView || !beamGroupRef.current) return;
    beamGroupRef.current.rotation.y -= delta * 1.35;
  });

  return (
    <group ref={beamGroupRef}>
      {/* Declarative semi-transparent scan fan */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.1, 1.8, 32, 1, 0, Math.PI / 3]} />
        <meshBasicMaterial
          color="#a78bfa"
          transparent
          opacity={0.12}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>
      {/* Leading radar beam line */}
      <mesh position={[0.9, 0, 0]}>
        <boxGeometry args={[1.8, 0.015, 0.015]} />
        <meshBasicMaterial color="#c4b5fd" transparent opacity={0.65} />
      </mesh>
    </group>
  );
}

/**
 * SignalPingNode: Orbiting ping representing a Sourced ingestion channel
 * with a glowing core, halo pulse, and floating HTML data badge.
 */
function SignalPingNode({
  channel,
  isInView,
}: {
  channel: SignalChannel;
  isInView: boolean;
}) {
  const orbitGroupRef = useRef<THREE.Group>(null);
  const haloRef = useRef<THREE.Mesh>(null);

  useFrame((state, delta) => {
    if (!isInView) return;
    if (orbitGroupRef.current) {
      orbitGroupRef.current.rotation.y += delta * channel.speed;
    }
    if (haloRef.current) {
      const pulse = 1 + 0.3 * Math.sin(state.clock.getElapsedTime() * 4 + channel.initialAngle);
      haloRef.current.scale.set(pulse, pulse, pulse);
    }
  });

  return (
    <group rotation={channel.tilt}>
      {/* Stationary orbital guide track */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.8, 0.006, 16, 64]} />
        <meshBasicMaterial
          color={channel.color}
          transparent
          opacity={0.2}
          depthWrite={false}
        />
      </mesh>

      {/* Rotating orbit group */}
      <group ref={orbitGroupRef} rotation={[0, channel.initialAngle, 0]}>
        <group position={[1.8, 0, 0]}>
          {/* Core sphere */}
          <mesh>
            <sphereGeometry args={[0.065, 16, 16]} />
            <meshBasicMaterial color={channel.color} />
          </mesh>

          {/* Pulsing halo ring */}
          <mesh ref={haloRef}>
            <sphereGeometry args={[0.11, 16, 16]} />
            <meshBasicMaterial
              color={channel.color}
              transparent
              opacity={0.25}
              wireframe
              depthWrite={false}
            />
          </mesh>

          {/* Floating HTML telemetry badge */}
          <Html
            distanceFactor={7.5}
            center
            position={[0, 0.22, 0]}
            style={{ pointerEvents: "none" }}
          >
            <div
              className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono tracking-wider whitespace-nowrap border shadow-lg backdrop-blur-sm"
              style={{
                backgroundColor: "rgba(16, 18, 26, 0.88)",
                borderColor: `${channel.color}55`,
                color: channel.color,
                boxShadow: `0 0 12px ${channel.color}33`,
              }}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: channel.color }}
              />
              <span className="font-bold">{channel.code}</span>
              <span className="text-slate-400 opacity-80 text-[9px]">
                {channel.count}
              </span>
            </div>
          </Html>
        </group>
      </group>
    </group>
  );
}

/**
 * RadarSphereScene: Decouples continuous ambient rotation from smoothed pointer parallax
 * via nested groups to prevent rotation stalling.
 */
function RadarSphereScene({ isInView }: { isInView: boolean }) {
  const outerSpinRef = useRef<THREE.Group>(null);
  const innerParallaxRef = useRef<THREE.Group>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!isInView) return;

    // 1. Continuous uninterrupted ambient planetary spin on outer group
    if (outerSpinRef.current) {
      outerSpinRef.current.rotation.y += delta * 0.12;
    }

    // 2. Smoothed pointer parallax on inner group (never stalls continuous spin)
    if (innerParallaxRef.current) {
      const targetX = -state.pointer.y * 0.35;
      const targetY = state.pointer.x * 0.45;

      pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, targetX, 0.05);
      pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, targetY, 0.05);

      innerParallaxRef.current.rotation.x = pointerTarget.current.x + 0.18; // slight pitch down
      innerParallaxRef.current.rotation.y = pointerTarget.current.y;
    }
  });

  return (
    <group ref={innerParallaxRef}>
      <group ref={outerSpinRef}>
        {/* Outer wireframe sphere */}
        <mesh>
          <sphereGeometry args={[1.8, 24, 24]} />
          <meshBasicMaterial
            wireframe
            color="#7c3aed"
            transparent
            opacity={0.15}
          />
        </mesh>

        {/* Main Equator ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.012, 16, 64]} />
          <meshBasicMaterial color="#8b5cf6" transparent opacity={0.35} />
        </mesh>

        {/* Concentric internal radar range rings on equator */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.008, 16, 48]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.22} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.6, 0.006, 16, 48]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.2} />
        </mesh>

        {/* Upper & lower latitude rings */}
        <mesh position={[0, 0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.007, 16, 48]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.18} />
        </mesh>
        <mesh position={[0, -0.85, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.58, 0.007, 16, 48]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.18} />
        </mesh>

        {/* Polar axis core line */}
        <mesh>
          <cylinderGeometry args={[0.008, 0.008, 3.8, 8]} />
          <meshBasicMaterial color="#6d28d9" transparent opacity={0.3} />
        </mesh>

        {/* Center Core Node */}
        <mesh>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#a78bfa" />
        </mesh>

        {/* Sweeping Radar Beam */}
        <SweepingRadarBeam isInView={isInView} />

        {/* Real Ingestion Channel Pings */}
        {SIGNAL_CHANNELS.map((channel) => (
          <SignalPingNode
            key={channel.id}
            channel={channel}
            isInView={isInView}
          />
        ))}
      </group>
    </group>
  );
}

/**
 * RadarSignalSphere: Interactive 3D WebGL Canvas component with latitude/longitude
 * coordinate rings, pulsing equator sweep, orbiting signal pings, pointer parallax,
 * and persistent viewport observer.
 */
export function RadarSignalSphere({
  className = "",
  style = {},
}: RadarSignalSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);

  // Lazy initialization for prefers-reduced-motion: reduce
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() =>
    typeof window !== "undefined" && Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mq.matches);

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  // Viewport Observer: Persistent on outer container, pauses rendering loop when out of view (0% GPU)
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

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[360px] md:h-[400px] max-w-[420px] mx-auto overflow-hidden rounded-2xl border border-violet-500/20 bg-[#08090e]/80 shadow-[0_0_35px_rgba(124,58,237,0.12)] ${className}`}
      style={style}
    >
      {prefersReducedMotion ? (
        <RadarFallback className="w-full h-full border-0 shadow-none" />
      ) : (
        <>
          {/* Ambient background glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle at center, rgba(124, 58, 237, 0.12) 0%, rgba(8, 9, 14, 0.95) 75%)",
            }}
          />

          {/* Top/Bottom HUD Overlays */}
          <div className="absolute top-3 left-4 z-10 text-[10px] font-mono tracking-widest text-violet-400/80 pointer-events-none flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping motion-reduce:animate-none" />
            SYS.RADAR // 3D SIGNAL SPHERE
          </div>
          <div className="absolute top-3 right-4 z-10 text-[10px] font-mono tracking-wider text-emerald-400/90 pointer-events-none">
            0.82 CLUSTER COSINE
          </div>
          <div className="absolute bottom-3 left-4 z-10 text-[9px] font-mono text-slate-400/70 pointer-events-none">
            INTERACTIVE 3D // POINTER PARALLAX
          </div>
          <div className="absolute bottom-3 right-4 z-10 text-[9px] font-mono text-violet-400/70 pointer-events-none">
            4 LIVE INGEST CHANNELS
          </div>

          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: [0, 0, 4.5], fov: 45 }}
            frameloop={isInView ? "always" : "never"}
          >
            <ambientLight intensity={0.6} />
            <pointLight position={[5, 5, 5]} intensity={0.8} />
            <RadarSphereScene isInView={isInView} />
          </Canvas>
        </>
      )}
    </div>
  );
}

export default RadarSignalSphere;
