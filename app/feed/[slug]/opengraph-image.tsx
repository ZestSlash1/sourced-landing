import { ImageResponse } from "next/og";
import { getPublishedIdeaByIdOrSlug } from "@/lib/idea-drops/repository";
import { truncate } from "@/lib/seo";

export const runtime = "edge";
export const alt = "Sourced brief";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({ params }: { params: { slug: string } }) {
  const idea = await getPublishedIdeaByIdOrSlug(params.slug);
  const title = truncate(idea?.title ?? "Sourced", 90);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: "64px",
          background: "linear-gradient(135deg, #5B4FF7 0%, #8A80FF 100%)",
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 700, letterSpacing: "-0.02em" }}>Sourced</div>
          {idea ? (
            <div
              style={{
                display: "flex",
                background: "rgba(255,255,255,0.94)",
                color: "#15161A",
                fontSize: 20,
                fontWeight: 700,
                padding: "8px 20px",
                borderRadius: 999,
                textTransform: "uppercase",
                letterSpacing: "0.03em",
              }}
            >
              {idea.category}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ display: "flex", fontSize: 56, fontWeight: 700, lineHeight: 1.15, letterSpacing: "-0.02em" }}>
            {title}
          </div>
          {idea ? (
            <div style={{ display: "flex", fontSize: 24, fontWeight: 600, opacity: 0.9 }}>
              {idea.demandScore}% demand · Backed by real evidence
            </div>
          ) : null}
        </div>
      </div>
    ),
    { ...size },
  );
}
