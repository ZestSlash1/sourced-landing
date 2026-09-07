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

  it("renders with Magic UI elements and RGB layout", () => {
    const html = renderToString(
      React.createElement(HomeClient, {
        userEmail: null,
        proofBar: dummyProofBar,
      })
    );

    // Checks that Magic UI components are rendered on the homepage
    expect(html).toContain("marquee-container");
    expect(html).toContain("rainbow-button");
    expect(html).toContain("animated-gradient-text");
    expect(html).toContain("border-beam");
    expect(html).toContain("shine-border");
    expect(html).toContain("meteors-container");
    expect(html).toContain("procedural-text-mask");
  });
});
