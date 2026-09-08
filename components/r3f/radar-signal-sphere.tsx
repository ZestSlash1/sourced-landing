"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

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
 * RadarFallback: Sleek static SVG/CSS 2D radar vector graphic used as
 * the Next.js dynamic loading fallback and when prefers-reduced-motion is active.
 */
export function RadarFallback({ className = "", style = {} }: RadarSignalSphereProps) {
  return (
    <div
      className={`radar-fallback relative w-full h-[360px] md:h-[400px] max-w-[420px] mx-auto flex items-center justify-center overflow-hidden rounded-2xl border border-violet-500/20 bg-[#08090e]/90 select-none shadow-[0_0_30px_rgba(124,58,237,0.1)] ${className}`}
      style={style}
      role="img"
      aria-label="Radar signal triangulation visualization"
    >
      {/* Background ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(124, 58, 237, 0.15) 0%, rgba(8, 9, 14, 0.9) 70%)",
        }}
      />

      {/* SVG Radar Graphic */}
      <svg
        viewBox="0 0 400 400"
        className="w-full h-full max-w-[380px] max-h-[380px] text-violet-400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id="radarSweep" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.0" />
          </radialGradient>
          <linearGradient id="beamGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a78bfa" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Concentric Range Rings */}
        <circle cx="200" cy="200" r="180" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="4 4" />
        <circle cx="200" cy="200" r="140" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" />
        <circle cx="200" cy="200" r="100" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="3 3" />
        <circle cx="200" cy="200" r="60" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" />
        <circle cx="200" cy="200" r="20" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.4" />

        {/* Tilted Orbital Ring Ellipses */}
        <ellipse cx="200" cy="200" rx="180" ry="70" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.2" transform="rotate(-25 200 200)" />
        <ellipse cx="200" cy="200" rx="180" ry="60" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.15" transform="rotate(35 200 200)" />

        {/* Crosshair Axes */}
        <line x1="20" y1="200" x2="380" y2="200" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="2 4" />
        <line x1="200" y1="20" x2="200" y2="380" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="2 4" />

        {/* Sweeping Radar Wedge */}
        <path
          d="M 200 200 L 327 73 A 180 180 0 0 0 200 20 Z"
          fill="url(#radarSweep)"
        />
        <line x1="200" y1="200" x2="327" y2="73" stroke="#c4b5fd" strokeWidth="1.5" strokeOpacity="0.7" />

        {/* Center Origin Node */}
        <circle cx="200" cy="200" r="4" fill="#a78bfa" />
        <circle cx="200" cy="200" r="8" fill="none" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.5" />

        {/* Signal Nodes with Pulsing Halos */}
        {/* Hacker News (Amber) */}
        <g transform="translate(285, 140)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#f59e0b" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="0" cy="0" r="4.5" fill="#f59e0b" />
          <rect x="12" y="-10" width="75" height="18" rx="4" fill="#10121a" stroke="#f59e0b" strokeWidth="0.75" strokeOpacity="0.6" />
          <text x="18" y="3" fill="#f59e0b" fontSize="9" fontFamily="monospace" fontWeight="600">HN // 41 sig</text>
        </g>

        {/* GitHub (Indigo) */}
        <g transform="translate(100, 255)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#818cf8" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="0" cy="0" r="4.5" fill="#818cf8" />
          <rect x="-86" y="-10" width="76" height="18" rx="4" fill="#10121a" stroke="#818cf8" strokeWidth="0.75" strokeOpacity="0.6" />
          <text x="-80" y="3" fill="#818cf8" fontSize="9" fontFamily="monospace" fontWeight="600">GH // 27 sig</text>
        </g>

        {/* App Store (Cyan) */}
        <g transform="translate(275, 275)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="0" cy="0" r="4.5" fill="#38bdf8" />
          <rect x="12" y="-10" width="78" height="18" rx="4" fill="#10121a" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.6" />
          <text x="18" y="3" fill="#38bdf8" fontSize="9" fontFamily="monospace" fontWeight="600">iOS // 33 sig</text>
        </g>

        {/* Discourse (Emerald) */}
        <g transform="translate(115, 125)">
          <circle cx="0" cy="0" r="10" fill="none" stroke="#10b981" strokeWidth="1" strokeOpacity="0.3" />
          <circle cx="0" cy="0" r="4.5" fill="#10b981" />
          <rect x="-90" y="-10" width="80" height="18" rx="4" fill="#10121a" stroke="#10b981" strokeWidth="0.75" strokeOpacity="0.6" />
          <text x="-84" y="3" fill="#10b981" fontSize="9" fontFamily="monospace" fontWeight="600">DSC // 19 sig</text>
        </g>
      </svg>

      {/* Telemetry Labels */}
      <div className="absolute top-3 left-4 text-[10px] font-mono tracking-widest text-violet-400/80">
        SYS.RADAR // TRIANGULATION
      </div>
      <div className="absolute top-3 right-4 text-[10px] font-mono tracking-wider text-emerald-400/90 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
        4 CHANNELS
      </div>
      <div className="absolute bottom-3 left-4 text-[9px] font-mono text-slate-400/70">
        LAT/LONG 3D MESH
      </div>
      <div className="absolute bottom-3 right-4 text-[9px] font-mono text-violet-400/70">
        REDUCED MOTION ACTIVE
      </div>
    </div>
  );
}

/**
 * SweepingRadarBeam: An equatorial rotating scan cone / beam slice around Y-axis.
 */
function SweepingRadarBeam({ isInView }: { isInView: boolean }) {
  const beamGroupRef = useRef<THREE.Group>(null);

  useFrame((_, delta) => {
    if (!isInView || !beamGroupRef.current) return;
    beamGroupRef.current.rotation.y -= delta * 1.35;
  });

  // Sector wedge in the XZ plane
  const sectorGeometry = useMemo(() => {
    return new THREE.RingGeometry(0.1, 1.8, 32, 1, 0, Math.PI / 3);
  }, []);

  return (
    <group ref={beamGroupRef}>
      {/* Semi-transparent scan fan */}
      <mesh geometry={sectorGeometry} rotation={[-Math.PI / 2, 0, 0]}>
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
 * RadarSphereScene: Inside the Canvas, manages coordinates, camera parallax,
 * sweep beam, and channel orbits.
 */
function RadarSphereScene({ isInView }: { isInView: boolean }) {
  const sceneRef = useRef<THREE.Group>(null);
  const pointerTarget = useRef({ x: 0, y: 0 });

  useFrame((state, delta) => {
    if (!isInView || !sceneRef.current) return;

    // Smooth cursor-follow rotation via lerp
    const targetX = -state.pointer.y * 0.35;
    const targetY = state.pointer.x * 0.45;

    pointerTarget.current.x = THREE.MathUtils.lerp(pointerTarget.current.x, targetX, 0.05);
    pointerTarget.current.y = THREE.MathUtils.lerp(pointerTarget.current.y, targetY, 0.05);

    sceneRef.current.rotation.x = pointerTarget.current.x + 0.18; // slightly pitched down
    sceneRef.current.rotation.y += delta * 0.12 + (pointerTarget.current.y - sceneRef.current.rotation.y) * 0.05;
  });

  return (
    <group ref={sceneRef}>
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
  );
}

/**
 * RadarSignalSphere: Interactive 3D WebGL Canvas component with latitude/longitude
 * coordinate rings, pulsing equator sweep, orbiting signal pings, pointer parallax,
 * and viewport observer.
 */
export function RadarSignalSphere({
  className = "",
  style = {},
}: RadarSignalSphereProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInView, setIsInView] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect prefers-reduced-motion: reduce
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

  // Viewport Observer: Pauses rendering loop when out of view (0% GPU consumption)
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

  if (prefersReducedMotion) {
    return <RadarFallback className={className} style={style} />;
  }

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-[360px] md:h-[400px] max-w-[420px] mx-auto overflow-hidden rounded-2xl border border-violet-500/20 bg-[#08090e]/80 shadow-[0_0_35px_rgba(124,58,237,0.12)] ${className}`}
      style={style}
    >
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
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
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
    </div>
  );
}

export default RadarSignalSphere;
