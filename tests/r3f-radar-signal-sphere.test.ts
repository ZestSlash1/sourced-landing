import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { RadarSignalSphere, RadarFallback } from "../components/r3f/radar-signal-sphere";

describe("RadarSignalSphere", () => {
  it("exports RadarSignalSphere and RadarFallback components", () => {
    expect(typeof RadarSignalSphere).toBe("function");
    expect(typeof RadarFallback).toBe("function");
  });

  it("renders RadarFallback cleanly into markup for SSR and reduced motion", () => {
    const html = renderToString(React.createElement(RadarFallback));
    expect(html).toContain("radar-fallback");
    expect(html).toContain("<svg");
    // Verify ingest channels are represented
    expect(html).toContain("HN // 41 sig");
    expect(html).toContain("GH // 27 sig");
    expect(html).toContain("iOS // 33 sig");
    expect(html).toContain("DSC // 19 sig");
  });

  it("applies custom className and styles to RadarFallback", () => {
    const html = renderToString(
      React.createElement(RadarFallback, {
        className: "custom-radar-class",
        style: { opacity: 0.9 },
      })
    );
    expect(html).toContain("custom-radar-class");
    expect(html).toContain("opacity:0.9");
  });
});
