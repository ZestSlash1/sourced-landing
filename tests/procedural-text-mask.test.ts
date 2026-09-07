import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { ProceduralTextMask } from "@/components/procedural-text-mask";

describe("ProceduralTextMask Component", () => {
  it("renders accessible text for SEO and screen readers", () => {
    const html = renderToString(
      React.createElement(ProceduralTextMask, { text: "triangulated." })
    );
    expect(html).toContain("triangulated.");
    expect(html).toContain("procedural-text-mask");
  });

  it("renders a decorative canvas element with aria-hidden for the mask stream", () => {
    const html = renderToString(
      React.createElement(ProceduralTextMask, { text: "triangulated." })
    );
    expect(html).toContain("<canvas");
    expect(html).toContain('aria-hidden="true"');
  });

  it("appends custom class names and passes through styling hooks", () => {
    const html = renderToString(
      React.createElement(ProceduralTextMask, {
        text: "triangulated.",
        className: "custom-hero-mask",
      })
    );
    expect(html).toContain("custom-hero-mask");
    expect(html).toContain("procedural-text-mask");
  });
});
