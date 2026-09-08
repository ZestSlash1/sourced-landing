import React from "react";

export interface BriefGraphFallbackProps {
  title?: string;
  evidence?: Array<{ platform: string; quote?: string; title?: string; url?: string }>;
  demandScore?: number;
  className?: string;
  style?: React.CSSProperties;
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

/**
 * BriefGraphFallback: High-fidelity static SVG/CSS schematic showing multi-platform
 * complaint signals converging along curved bezier paths into a central solution crystal.
 * ZERO Three.js dependencies for clean code-splitting and prefers-reduced-motion fallback.
 */
export function BriefGraphFallback({
  title = "SOLUTION CORE",
  evidence = [],
  demandScore = 85,
  className = "",
  style = {},
}: BriefGraphFallbackProps) {
  // Extract unique platforms from evidence, up to 4, or fall back to defaults
  const platforms = React.useMemo(() => {
    const raw = Array.from(new Set(evidence.map((e) => e.platform).filter(Boolean)));
    if (raw.length === 0) return DEFAULT_PLATFORMS;
    if (raw.length < 4) {
      for (const p of DEFAULT_PLATFORMS) {
        if (!raw.includes(p) && raw.length < 4) raw.push(p);
      }
    }
    return raw.slice(0, 4);
  }, [evidence]);

  // Coordinates for 4 surrounding node positions on a 600x340 viewport
  const nodePositions = [
    { x: 90, y: 75, qx: 180, qy: 110 },   // Top-left
    { x: 90, y: 265, qx: 180, qy: 230 },  // Bottom-left
    { x: 510, y: 75, qx: 420, qy: 110 },  // Top-right
    { x: 510, y: 265, qx: 420, qy: 230 }, // Bottom-right
  ];

  const centerX = 300;
  const centerY = 170;

  return (
    <div
      className={`brief-graph-fallback relative w-full h-[360px] md:h-[400px] overflow-hidden rounded-2xl border border-violet-500/20 bg-[#08090e]/90 select-none shadow-[0_0_35px_rgba(124,58,237,0.1)] ${className}`}
      style={style}
      role="img"
      aria-label="Solution signal convergence graph"
    >
      {/* Background ambient radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at center, rgba(124, 58, 237, 0.16) 0%, rgba(8, 9, 14, 0.95) 75%)",
        }}
      />

      {/* SVG Convergence Schematic */}
      <svg
        viewBox="0 0 600 340"
        className="w-full h-full text-violet-400"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="curveGlow" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#a78bfa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#c4b5fd" stopOpacity="0.9" />
          </linearGradient>
          <radialGradient id="centerAura" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient coordinate grid / rings */}
        <circle cx={centerX} cy={centerY} r="140" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.15" strokeDasharray="3 4" />
        <circle cx={centerX} cy={centerY} r="95" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.2" />
        <circle cx={centerX} cy={centerY} r="50" fill="none" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.3" strokeDasharray="2 3" />
        <circle cx={centerX} cy={centerY} r="75" fill="url(#centerAura)" />

        {/* Converging Quadratic Bezier Curves */}
        {platforms.map((platform, idx) => {
          const pos = nodePositions[idx] || nodePositions[0];
          const color = PLATFORM_COLORS[platform] || "#a78bfa";
          return (
            <g key={platform}>
              {/* Ghost background line */}
              <path
                d={`M ${pos.x} ${pos.y} Q ${pos.qx} ${pos.qy} ${centerX} ${centerY}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.25"
                strokeDasharray="4 4"
              />
              {/* Primary active bezier stream */}
              <path
                d={`M ${pos.x} ${pos.y} Q ${pos.qx} ${pos.qy} ${centerX} ${centerY}`}
                fill="none"
                stroke={color}
                strokeWidth="1.2"
                strokeOpacity="0.6"
              />
              {/* In-flight packet particle */}
              <circle
                cx={pos.x + (centerX - pos.x) * 0.45}
                cy={pos.y + (centerY - pos.y) * 0.45}
                r="3"
                fill={color}
                opacity="0.85"
              />
            </g>
          );
        })}

        {/* Central Micro-SaaS Solution Node */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Outer rotating/pulsing aura ring */}
          <rect
            x="-65"
            y="-35"
            width="130"
            height="70"
            rx="12"
            fill="#10121a"
            stroke="#7c3aed"
            strokeWidth="1.5"
            strokeOpacity="0.75"
          />
          <rect
            x="-69"
            y="-39"
            width="138"
            height="78"
            rx="15"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="0.75"
            strokeOpacity="0.3"
            strokeDasharray="4 3"
          />
          {/* Central Label */}
          <text
            x="0"
            y="-8"
            textAnchor="middle"
            fill="#c4b5fd"
            fontSize="10"
            fontFamily="monospace"
            fontWeight="700"
            letterSpacing="1"
          >
            SOLUTION CORE
          </text>
          <text
            x="0"
            y="8"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="11"
            fontFamily="sans-serif"
            fontWeight="600"
          >
            {title.length > 32 ? `${title.slice(0, 30)}…` : title}
          </text>
          {/* Demand score pill inside core */}
          <rect
            x="-35"
            y="14"
            width="70"
            height="14"
            rx="7"
            fill="#7c3aed"
            fillOpacity="0.3"
            stroke="#8b5cf6"
            strokeWidth="0.75"
          />
          <text
            x="0"
            y="24"
            textAnchor="middle"
            fill="#a78bfa"
            fontSize="8.5"
            fontFamily="monospace"
            fontWeight="700"
          >
            {`${demandScore}% DEMAND`}
          </text>
        </g>

        {/* Peripheral Platform Nodes */}
        {platforms.map((platform, idx) => {
          const pos = nodePositions[idx] || nodePositions[0];
          const color = PLATFORM_COLORS[platform] || "#a78bfa";
          const isLeft = pos.x < centerX;
          const boxWidth = 96;
          const boxHeight = 26;
          const boxX = isLeft ? -boxWidth / 2 : -boxWidth / 2;

          return (
            <g key={`node-${platform}`} transform={`translate(${pos.x}, ${pos.y})`}>
              {/* Pulse ring */}
              <circle cx="0" cy="0" r="14" fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.35" />
              <circle cx="0" cy="0" r="4.5" fill={color} />
              {/* Chip label */}
              <g transform={`translate(0, ${pos.y < centerY ? -24 : 22})`}>
                <rect
                  x={boxX}
                  y="-11"
                  width={boxWidth}
                  height={boxHeight}
                  rx="6"
                  fill="#10121a"
                  stroke={color}
                  strokeWidth="0.8"
                  strokeOpacity="0.7"
                />
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={color}
                  fontSize="9.5"
                  fontFamily="monospace"
                  fontWeight="600"
                >
                  {platform}
                </text>
              </g>
            </g>
          );
        })}
      </svg>

      {/* Telemetry Overlays */}
      <div className="absolute top-3 left-4 text-[10px] font-mono tracking-widest text-violet-400/80 flex items-center gap-1.5 pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse motion-reduce:animate-none" />
        SYS.GRAPH // SIGNAL CONVERGENCE
      </div>
      <div className="absolute top-3 right-4 text-[10px] font-mono tracking-wider text-emerald-400/90 pointer-events-none">
        {`${demandScore}% DEMAND SCORE`}
      </div>
      <div className="absolute bottom-3 left-4 text-[9px] font-mono text-slate-400/70 pointer-events-none">
        MULTI-SOURCE COMPLAINT CONVERGENCE
      </div>
      <div className="absolute bottom-3 right-4 text-[9px] font-mono text-violet-400/70 pointer-events-none">
        SYS.SOLUTION // SYNTHESIZED
      </div>
    </div>
  );
}

export default BriefGraphFallback;
