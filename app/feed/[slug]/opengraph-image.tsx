import { ImageResponse } from "next/og";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";

export const runtime = "nodejs";
export const alt = "Sourced Build Brief";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  const title = idea?.title || "Sourced Build Brief";
  const category = idea?.category || "Micro-SaaS";
  const score = idea?.demandScore ?? 85;

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "70px 80px",
          background: "#15161A",
          color: "#fff",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "10px",
                background: "#5B4FF7",
                color: "#fff",
                fontWeight: 900,
                fontSize: "24px",
              }}
            >
              ✓
            </div>
            <span style={{ fontSize: "28px", fontWeight: 700, letterSpacing: "-0.02em", color: "#F6F4EF" }}>
              Sourced
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "8px 18px",
              borderRadius: "100px",
              background: "rgba(91, 79, 247, 0.2)",
              border: "1px solid rgba(91, 79, 247, 0.4)",
              color: "#C6FF3D",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            <span>⚡ {score}% demand signal</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", maxWidth: "1000px" }}>
          <div style={{ display: "flex" }}>
            <span
              style={{
                display: "flex",
                fontSize: "18px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                color: "#8A80FF",
                fontWeight: 700,
              }}
            >
              {category} · Evidence-Backed Build Brief
            </span>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "52px",
              fontWeight: 800,
              lineHeight: 1.15,
              letterSpacing: "-0.03em",
              color: "#FFFFFF",
            }}
          >
            {title}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: "24px",
            borderTop: "1px solid rgba(255, 255, 255, 0.12)",
          }}
        >
          <div style={{ display: "flex", gap: "16px", fontSize: "20px", color: "rgba(255, 255, 255, 0.7)" }}>
            <span>Turnkey Prompts for Claude Code · Cursor · v0 · Bolt</span>
          </div>
          <div style={{ display: "flex", fontSize: "18px", color: "#C6FF3D", fontWeight: 600 }}>
            getsourced.dev
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
