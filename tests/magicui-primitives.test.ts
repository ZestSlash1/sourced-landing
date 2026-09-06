import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { BorderBeam } from "@/components/magicui/border-beam";
import { ShineBorder } from "@/components/magicui/shine-border";
import { MagicCard } from "@/components/magicui/magic-card";
import { RainbowButton } from "@/components/magicui/rainbow-button";
import { AnimatedGradientText } from "@/components/magicui/animated-gradient-text";
import { Marquee } from "@/components/magicui/marquee";
import { Meteors } from "@/components/magicui/meteors";

describe("Magic UI Primitives Suite", () => {
  it("renders BorderBeam component with customizable size and styles", () => {
    const html = renderToString(React.createElement(BorderBeam, { size: 100, duration: 8 }));
    expect(html).toContain("border-beam");
  });

  it("renders ShineBorder around children", () => {
    const html = renderToString(
      React.createElement(
        ShineBorder,
        { borderRadius: 16 },
        React.createElement("div", null, "Card Content")
      )
    );
    expect(html).toContain("shine-border");
    expect(html).toContain("Card Content");
  });

  it("renders MagicCard with children and spotlight container", () => {
    const html = renderToString(
      React.createElement(
        MagicCard,
        null,
        React.createElement("div", null, "Interactive Idea")
      )
    );
    expect(html).toContain("magic-card");
    expect(html).toContain("Interactive Idea");
  });

  it("renders RainbowButton with children", () => {
    const html = renderToString(
      React.createElement(RainbowButton, null, "Unlock All Drops")
    );
    expect(html).toContain("rainbow-button");
    expect(html).toContain("Unlock All Drops");
  });

  it("renders AnimatedGradientText with shimmer gradient", () => {
    const html = renderToString(
      React.createElement(AnimatedGradientText, null, "Weekly Drop 04")
    );
    expect(html).toContain("animated-gradient-text");
    expect(html).toContain("Weekly Drop 04");
  });

  it("renders Marquee with seamless duplicated tracks", () => {
    const html = renderToString(
      React.createElement(
        Marquee,
        { pauseOnHover: true },
        React.createElement("span", null, "Open Exchange Rates"),
        React.createElement("span", null, "REST Countries")
      )
    );
    expect(html).toContain("marquee-content");
    expect(html).toContain("Open Exchange Rates");
  });

  it("renders Meteors with specified count", () => {
    const html = renderToString(React.createElement(Meteors, { number: 15 }));
    expect(html).toContain("meteor-streak");
  });
});
