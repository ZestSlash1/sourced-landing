"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
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
 * with a glowing core, halo pulse, and pure WebGL visuals.
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
          opacity={0.22}
          depthWrite={false}
        />
      </mesh>

      {/* Rotating orbit group */}
      <group ref={orbitGroupRef} rotation={[0, channel.initialAngle, 0]}>
        <group position={[1.8, 0, 0]}>
          {/* Core glowing sphere */}
          <mesh>
            <sphereGeometry args={[0.075, 16, 16]} />
            <meshBasicMaterial color={channel.color} />
          </mesh>

          {/* Pulsing halo sphere */}
          <mesh ref={haloRef}>
            <sphereGeometry args={[0.14, 16, 16]} />
            <meshBasicMaterial
              color={channel.color}
              transparent
              opacity={0.35}
              wireframe
              depthWrite={false}
            />
          </mesh>
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
            opacity={0.16}
          />
        </mesh>

        {/* Main Equator ring */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.79, 0.008, 16, 64]} />
          <meshBasicMaterial color="#a78bfa" transparent opacity={0.35} />
        </mesh>

        {/* Vertical longitude ring */}
        <mesh rotation={[0, 0, 0]}>
          <torusGeometry args={[1.79, 0.005, 16, 64]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.2} />
        </mesh>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[1.79, 0.005, 16, 64]} />
          <meshBasicMaterial color="#7c3aed" transparent opacity={0.2} />
        </mesh>

        {/* Sweeping Radar Beam */}
        <SweepingRadarBeam isInView={isInView} />

        {/* Orbiting Channel Ping Nodes */}
        {SIGNAL_CHANNELS.map((channel) => (
          <SignalPingNode
            key={channel.id}
            channel={channel}
            isInView={isInView}
          />
        ))}

        {/* Core telemetry crystal center */}
        <mesh>
          <octahedronGeometry args={[0.22, 0]} />
          <meshBasicMaterial
            color="#8b5cf6"
            wireframe
            transparent
            opacity={0.4}
          />
        </mesh>
      </group>
    </group>
  );
}

/**
 * RadarSignalSphere: Main exported component for Homepage Hero.
 */
export function RadarSignalSphere({
  className = "",
  style = {},
}: RadarSignalSphereProps) {
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

  return (
    <div
      ref={containerRef}
      className={`radar-sphere-wrap ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 440,
        height: 380,
        margin: "0 auto",
        borderRadius: 16,
        border: "1px solid rgba(124, 58, 237, 0.25)",
        background:
          "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.08) 0%, rgba(8, 9, 14, 0.92) 75%)",
        boxShadow:
          "0 0 35px rgba(124, 58, 237, 0.12), inset 0 0 30px rgba(0, 0, 0, 0.6)",
        overflow: "hidden",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {prefersReducedMotion || !isMounted ? (
        <RadarFallback
          style={{ width: "100%", height: "100%", border: "none", boxShadow: "none" }}
        />
      ) : (
        <>
          {/* Top-left HUD badge */}
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
            <span>SYS.RADAR // 3D SIGNAL SPHERE</span>
          </div>

          {/* Top-right HUD metric */}
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
            0.74 CLUSTER COSINE
          </div>

          {/* Bottom HUD status strip */}
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
              {SIGNAL_CHANNELS.map((ch) => (
                <span
                  key={ch.id}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 9.5,
                    fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                    color: ch.color,
                    fontWeight: 600,
                    letterSpacing: "0.02em",
                  }}
                >
                  <span
                    style={{
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      backgroundColor: ch.color,
                      display: "inline-block",
                      boxShadow: `0 0 6px ${ch.color}`,
                    }}
                  />
                  {ch.code}{" "}
                  <span style={{ opacity: 0.65, fontWeight: 400 }}>
                    {ch.count.replace(" signals", "")}
                  </span>
                </span>
              ))}
            </div>
            <span
              style={{
                fontSize: 9,
                fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
                color: "var(--ink-soft, #9496a6)",
                letterSpacing: "0.04em",
              }}
            >
              POINTER PARALLAX
            </span>
          </div>

          <Canvas
            dpr={[1, 1.5]}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            camera={{ position: [0, 0, 4.5], fov: 45 }}
            frameloop={isInView ? "always" : "never"}
            style={{ width: "100%", height: "100%" }}
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
