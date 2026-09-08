import React from "react";

export interface RadarFallbackProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * RadarFallback: Sleek static SVG/CSS 2D radar vector graphic used as
 * the Next.js dynamic loading fallback and when prefers-reduced-motion is active.
 * Contains ZERO Three.js dependencies for optimal bundle code-splitting.
 */
export function RadarFallback({ className = "", style = {} }: RadarFallbackProps) {
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
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse motion-reduce:animate-none" />
        4 CHANNELS
      </div>
      <div className="absolute bottom-3 left-4 text-[9px] font-mono text-slate-400/70">
        LAT/LONG 3D MESH
      </div>
      <div className="absolute bottom-3 right-4 text-[9px] font-mono text-violet-400/70">
        SYS.RADAR // ACTIVE
      </div>
    </div>
  );
}

export default RadarFallback;
