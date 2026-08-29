import { ImageResponse } from "next/og";

export const runtime = "edge";
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#5B4FF7",
          borderRadius: 40,
          color: "#fff",
          fontFamily: "sans-serif",
          fontSize: 100,
          fontWeight: 700,
        }}
      >
        S
      </div>
    ),
    { ...size },
  );
}
