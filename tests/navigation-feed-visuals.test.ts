import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import FloatingNavbar from "@/components/floating-navbar";
import FeedBrowser, { FeedCardData } from "@/components/feed-browser";

describe("Navigation & Feed Visuals", () => {
  it("renders FloatingNavbar with dock items and CTA pill", () => {
    const html = renderToString(
      React.createElement(FloatingNavbar, { initialUserEmail: null })
    );
    expect(html).toContain("floating-nav");
    expect(html).toContain("nav-dock");
    expect(html).toContain("nav-cta-pill");
  });

  it("renders FeedBrowser with MagicCard spotlight wrappers", () => {
    const dummyItems: FeedCardData[] = [
      {
        id: "drop-1",
        slug: "client-ready-pl",
        title: "Client-ready P&L exports for solo bookkeepers",
        category: "Micro-SaaS",
        demandScore: 88,
        problemSummary: "Bookkeepers spend hours reformatting CSV exports.",
        tier: "free",
        kind: "full",
      },
    ];

    const html = renderToString(
      React.createElement(FeedBrowser, { items: dummyItems })
    );
    expect(html).toContain("magic-card");
    expect(html).toContain("Client-ready P&amp;L exports for solo bookkeepers");
  });
});
