import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { RadarSignalSphere, RadarFallback as ReexportedFallback } from "../components/r3f/radar-signal-sphere";
import { RadarFallback } from "../components/r3f/radar-fallback";

describe("RadarSignalSphere & RadarFallback", () => {
  it("exports RadarSignalSphere and re-exports RadarFallback components", () => {
    expect(typeof RadarSignalSphere).toBe("function");
    expect(typeof ReexportedFallback).toBe("function");
    expect(typeof RadarFallback).toBe("function");
  });

  it("renders RadarFallback cleanly into markup for SSR and reduced motion with neutral labels", () => {
    const html = renderToString(React.createElement(RadarFallback));
    expect(html).toContain("radar-fallback");
    expect(html).toContain("<svg");
    // Verify ingest channels are represented
    expect(html).toContain("HN // 41 sig");
    expect(html).toContain("GH // 27 sig");
    expect(html).toContain("iOS // 33 sig");
    expect(html).toContain("DSC // 19 sig");
    // Verify neutral active label & motion-reduce class
    expect(html).toContain("SYS.RADAR // ACTIVE");
    expect(html).toContain("motion-reduce:animate-none");
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

  it("re-exported RadarFallback matches standalone implementation", () => {
    const directHtml = renderToString(React.createElement(RadarFallback));
    const reexportedHtml = renderToString(React.createElement(ReexportedFallback));
    expect(directHtml).toBe(reexportedHtml);
  });
});
