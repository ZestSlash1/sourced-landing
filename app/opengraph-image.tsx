import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Sourced — Real problems, sourced. Ready to build.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          padding: "80px",
          background: "linear-gradient(135deg, #5B4FF7 0%, #8A80FF 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 32, fontWeight: 700, letterSpacing: "-0.02em", marginBottom: 28 }}>
          Sourced
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 60,
            fontWeight: 700,
            lineHeight: 1.15,
            letterSpacing: "-0.02em",
            maxWidth: 920,
          }}
        >
          Real problems, sourced. Ready to build.
        </div>
        <div style={{ display: "flex", fontSize: 24, fontWeight: 500, opacity: 0.9, marginTop: 28, maxWidth: 820 }}>
          Validated startup ideas with proof someone will pay, and a build brief ready for Claude Code.
        </div>
      </div>
    ),
    { ...size },
  );
}
