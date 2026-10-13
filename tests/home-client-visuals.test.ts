import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import HomeClient from "@/app/home-client";
import type { ProofBarData } from "@/app/proof-bar";

describe("Homepage Visual Overhaul Integration", () => {
  const dummyProofBar: ProofBarData = {
    signalsTracked: 2470,
    clustersEvaluated: 110,
    clustersPassedThisRun: 6,
    minClusterSize: 3,
    nearMiss: [],
  };

  it("renders the brief preview and preserves pricing and source components", () => {
    const html = renderToString(
      React.createElement(HomeClient, {
        userEmail: null,
        proofBar: dummyProofBar,
      })
    );

    expect(html).toContain("marquee-container");
    expect(html).toContain("rainbow-button");
    expect(html).toContain("obsidian-discover-button");
    expect(html).toContain('href="/feed"');
    expect(html).toContain("obsidian-split");
    expect(html).toContain("brief-workbench");
    expect(html).toContain("border-beam");
    expect(html).toContain("shine-border");
    expect(html).toContain("hero-pipeline-wrap");
    expect(html).toContain("pipeline-labels");
  });
});
