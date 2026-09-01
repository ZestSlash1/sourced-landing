"use client";

import { motion } from "framer-motion";
import type { ViewerLocation } from "@/lib/analytics/queries";

const RADIUS = 120;

/** Wireframe lattice, in lat/lng degrees, that gives the sphere its shape. */
const GRID: { lat: number; lng: number }[] = [];
for (let lat = -75; lat <= 75; lat += 15) {
  for (let lng = -180; lng < 180; lng += 20) {
    GRID.push({ lat, lng });
  }
}

function project(lat: number, lng: number): { x: number; y: number; z: number } {
  const latR = (lat * Math.PI) / 180;
  const lngR = (lng * Math.PI) / 180;
  return {
    x: RADIUS * Math.cos(latR) * Math.sin(lngR),
    y: -RADIUS * Math.sin(latR),
    z: RADIUS * Math.cos(latR) * Math.cos(lngR),
  };
}

function locationLabel(loc: ViewerLocation): string {
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  return loc.city ?? loc.country ?? `${loc.latitude.toFixed(1)}, ${loc.longitude.toFixed(1)}`;
}

/**
 * A CSS-only rotating dot-globe — no charting/3D library, just points placed
 * in 3D space (translate3d) inside a `transform-style: preserve-3d` parent
 * whose own rotateY is animated. The whole sphere rotates as one rigid body,
 * so every dot's position only needs computing once.
 */
export function ViewerGlobe({ locations }: { locations: ViewerLocation[] }) {
  const points = locations.slice(0, 80);

  return (
    <motion.div
      className="admin-card admin-globe-card"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 220, damping: 28, delay: 0.1 }}
      style={{ padding: "20px 22px" }}
    >
      <div style={{ perspective: 900, width: RADIUS * 2, height: RADIUS * 2, flexShrink: 0 }}>
        <div
          style={{
            position: "relative",
            width: "100%",
            height: "100%",
            transformStyle: "preserve-3d",
            animation: "globe-spin 40s linear infinite",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 32% 28%, rgba(138,128,255,0.32), rgba(91,79,247,0.06) 60%, transparent 76%)",
              border: "1px solid var(--line)",
            }}
          />
          {GRID.map((p, i) => {
            const { x, y, z } = project(p.lat, p.lng);
            return (
              <span
                key={i}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: 3,
                  height: 3,
                  margin: -1.5,
                  borderRadius: "50%",
                  background: "var(--ink-soft)",
                  opacity: 0.3,
                  transform: `translate3d(${x}px, ${y}px, ${z}px)`,
                }}
              />
            );
          })}
          {points.map((loc, i) => {
            const { x, y, z } = project(loc.latitude, loc.longitude);
            const size = Math.min(14, 7 + Math.log2(loc.count) * 2);
            return (
              <span
                key={i}
                title={`${locationLabel(loc)} · ${loc.count} view${loc.count === 1 ? "" : "s"}`}
                style={{
                  position: "absolute",
                  top: "50%",
                  left: "50%",
                  width: size,
                  height: size,
                  margin: -size / 2,
                  borderRadius: "50%",
                  background: "var(--violet)",
                  boxShadow: "0 0 0 5px rgba(91,79,247,0.22)",
                  animation: "globe-pulse 2.4s ease-in-out infinite",
                  animationDelay: `${(i % 6) * 0.35}s`,
                  transform: `translate3d(${x}px, ${y}px, ${z}px)`,
                }}
              />
            );
          })}
        </div>
      </div>

      <div>
        <h2 style={{ fontSize: 14.5, fontWeight: 600, margin: "0 0 4px" }}>Where people are viewing from</h2>
        <p className="mono" style={{ fontSize: 11.5, color: "var(--ink-soft)", margin: "0 0 14px" }}>
          Last 24 hours, located page views
        </p>

        {points.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--ink-soft)", margin: 0 }}>
            No located views yet. Geolocation is only available once this is deployed on Vercel.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {points.slice(0, 6).map((loc, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, gap: 12 }}>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {locationLabel(loc)}
                </span>
                <span className="mono" style={{ color: "var(--ink-soft)", flexShrink: 0 }}>
                  {loc.count.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
