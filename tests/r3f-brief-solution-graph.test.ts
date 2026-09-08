import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { BriefSolutionGraph, BriefGraphFallback as ReexportedFallback } from "../components/r3f/brief-solution-graph";
import { BriefGraphFallback } from "../components/r3f/brief-graph-fallback";

describe("BriefSolutionGraph", () => {
  it("exports BriefSolutionGraph and BriefGraphFallback components", () => {
    expect(typeof BriefSolutionGraph).toBe("function");
    expect(typeof ReexportedFallback).toBe("function");
    expect(typeof BriefGraphFallback).toBe("function");
  });

  it("renders BriefGraphFallback cleanly with evidence platforms and demand score", () => {
    const mockEvidence = [
      { platform: "GitHub", quote: "Need an automated ledger" },
      { platform: "Hacker News", quote: "Bookkeepers waste 10hrs" },
      { platform: "Discourse", quote: "No direct solution exists" },
    ];
    const html = renderToString(
      React.createElement(BriefGraphFallback, {
        title: "Client-ready P&L exports",
        evidence: mockEvidence,
        demandScore: 88,
      })
    );

    expect(html).toContain("brief-graph-fallback");
    expect(html).toContain("<svg");
    expect(html).toContain("Client-ready P&amp;L exports");
    expect(html).toContain("88% DEMAND");
    expect(html).toContain("GitHub");
    expect(html).toContain("Hacker News");
    expect(html).toContain("Discourse");
    expect(html).toContain("motion-reduce:animate-none");
  });

  it("handles empty or default props gracefully in BriefGraphFallback", () => {
    const html = renderToString(React.createElement(BriefGraphFallback));
    expect(html).toContain("brief-graph-fallback");
    expect(html).toContain("<svg");
    expect(html).toContain("SOLUTION CORE");
  });

  it("applies custom className and style to BriefGraphFallback", () => {
    const html = renderToString(
      React.createElement(BriefGraphFallback, {
        className: "custom-graph-class",
        style: { zIndex: 10 },
      })
    );
    expect(html).toContain("custom-graph-class");
    expect(html).toContain("z-index:10");
  });

  it("re-exported BriefGraphFallback matches standalone implementation", () => {
    const props = {
      title: "Test Solution",
      demandScore: 92,
      evidence: [{ platform: "Reddit", quote: "Pain point" }],
    };
    const directHtml = renderToString(React.createElement(BriefGraphFallback, props));
    const reexportedHtml = renderToString(React.createElement(ReexportedFallback, props));
    expect(directHtml).toBe(reexportedHtml);
  });
});
