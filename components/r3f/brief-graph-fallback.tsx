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
      className={`brief-graph-fallback ${className}`}
      style={{
        position: "relative",
        width: "100%",
        maxWidth: 680,
        height: 380,
        margin: "24px auto 32px",
        overflow: "hidden",
        borderRadius: 16,
        border: "1px solid rgba(124, 58, 237, 0.25)",
        background: "radial-gradient(circle at 50% 50%, rgba(124, 58, 237, 0.08) 0%, rgba(16, 18, 26, 0.92) 80%)",
        userSelect: "none",
        boxShadow: "0 8px 32px rgba(0,0,0,0.4), inset 0 0 30px rgba(124, 58, 237, 0.06)",
        boxSizing: "border-box",
        ...style,
      }}
      role="img"
      aria-label="Solution signal convergence graph"
    >
      {/* Background ambient radial glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(circle at center, rgba(124, 58, 237, 0.16) 0%, rgba(8, 9, 14, 0.95) 75%)",
        }}
      />

      {/* SVG Convergence Schematic */}
      <svg
        viewBox="0 0 600 340"
        style={{ width: "100%", height: "100%" }}
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

        {/* Ambient Center Aura */}
        <circle cx={centerX} cy={centerY} r="120" fill="url(#centerAura)" />
        <circle cx={centerX} cy={centerY} r="85" fill="none" stroke="#7c3aed" strokeWidth="1" strokeOpacity="0.25" strokeDasharray="4 4" />
        <circle cx={centerX} cy={centerY} r="55" fill="none" stroke="#a78bfa" strokeWidth="1" strokeOpacity="0.3" />

        {/* Quadratic Bezier Convergence Paths */}
        {platforms.map((platform, idx) => {
          const pos = nodePositions[idx] || nodePositions[0];
          const color = PLATFORM_COLORS[platform] || "#a78bfa";

          return (
            <g key={`path-${platform}`}>
              <path
                d={`M ${pos.x} ${pos.y} Q ${pos.qx} ${pos.qy} ${centerX} ${centerY}`}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeOpacity="0.4"
                strokeDasharray="5 4"
              />
              <path
                d={`M ${pos.x} ${pos.y} Q ${pos.qx} ${pos.qy} ${centerX} ${centerY}`}
                fill="none"
                stroke="url(#curveGlow)"
                strokeWidth="0.8"
                strokeOpacity="0.75"
              />
              {/* Midpoint Packet Dot */}
              <circle
                cx={pos.x + (centerX - pos.x) * 0.45}
                cy={pos.y + (centerY - pos.y) * 0.45}
                r="3.5"
                fill="#ffffff"
                opacity="0.85"
              />
            </g>
          );
        })}

        {/* Central Synthesized Solution Crystal */}
        <g transform={`translate(${centerX}, ${centerY})`}>
          {/* Outer rotating coordinate diamond */}
          <polygon
            points="0,-48 48,0 0,48 -48,0"
            fill="#12131f"
            stroke="#8b5cf6"
            strokeWidth="1.5"
            strokeOpacity="0.8"
          />
          <polygon
            points="0,-36 36,0 0,36 -36,0"
            fill="none"
            stroke="#a78bfa"
            strokeWidth="1"
            strokeOpacity="0.5"
            strokeDasharray="2 3"
          />
          {/* Inner Glowing Nucleus Core */}
          <polygon
            points="0,-20 20,0 0,20 -20,0"
            fill="#7c3aed"
            stroke="#c4b5fd"
            strokeWidth="1.2"
          />

          {/* Solution Title Label Box */}
          <rect
            x="-80"
            y="-10"
            width="160"
            height="20"
            rx="5"
            fill="#0b0d14"
            stroke="#8b5cf6"
            strokeWidth="0.8"
            strokeOpacity="0.85"
          />
          <text
            x="0"
            y="4"
            textAnchor="middle"
            fill="#ffffff"
            fontSize="9.5"
            fontFamily="monospace"
            fontWeight="600"
          >
            {title.length > 28 ? `${title.slice(0, 26)}…` : title}
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
          const boxWidth = 96;
          const boxHeight = 26;
          const boxX = -boxWidth / 2;

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
          color: "rgba(167, 139, 250, 0.85)",
          pointerEvents: "none",
          textTransform: "uppercase",
        }}
      >
        <span
          className="motion-reduce:animate-none"
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#8b5cf6",
            display: "inline-block",
            boxShadow: "0 0 8px #8b5cf6",
          }}
        />
        SYS.GRAPH // SIGNAL CONVERGENCE
      </div>
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
      <div
        style={{
          position: "absolute",
          bottom: 14,
          left: 16,
          zIndex: 10,
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          fontSize: 9.5,
          color: "var(--ink-soft, #9496a6)",
          letterSpacing: "0.04em",
          pointerEvents: "none",
        }}
      >
        MULTI-SOURCE COMPLAINT CONVERGENCE
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 14,
          right: 16,
          zIndex: 10,
          fontFamily: "var(--mono, 'JetBrains Mono', monospace)",
          fontSize: 9.5,
          color: "rgba(167, 139, 250, 0.75)",
          letterSpacing: "0.04em",
          pointerEvents: "none",
        }}
      >
        SYS.SOLUTION // SYNTHESIZED
      </div>
    </div>
  );
}

export default BriefGraphFallback;
