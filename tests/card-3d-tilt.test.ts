import { describe, it, expect } from "vitest";
import React from "react";
import { renderToString } from "react-dom/server";
import { Card3DTilt } from "../components/card-3d-tilt";

describe("Card3DTilt", () => {
  it("exports a valid React component function", () => {
    expect(typeof Card3DTilt).toBe("function");
  });

  it("renders children correctly into markup", () => {
    const html = renderToString(
      React.createElement(
        Card3DTilt,
        null,
        React.createElement("div", null, "Tilt Content")
      )
    );
    expect(html).toContain("Tilt Content");
    expect(html).toContain("card-3d-tilt");
  });

  it("supports custom className", () => {
    const html = renderToString(
      React.createElement(
        Card3DTilt,
        { className: "custom-tilt-card" },
        React.createElement("span", null, "Hello")
      )
    );
    expect(html).toContain("custom-tilt-card");
  });

  it("renders specular sheen glare overlay", () => {
    const html = renderToString(
      React.createElement(
        Card3DTilt,
        { glare: true },
        React.createElement("div", null, "Glare Test")
      )
    );
    expect(html).toContain("card-3d-glare");
  });

  it("omits glare overlay when glare is false", () => {
    const html = renderToString(
      React.createElement(
        Card3DTilt,
        { glare: false },
        React.createElement("div", null, "No Glare")
      )
    );
    expect(html).not.toContain("card-3d-glare");
  });
});
