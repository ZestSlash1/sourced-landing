import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Pricing Restyle Visuals", () => {
  const homeClientContent = fs.readFileSync(path.resolve("app/home-client.tsx"), "utf-8");
  const globalsCss = fs.readFileSync(path.resolve("app/globals.css"), "utf-8");

  it("includes cursor tracking on pricing cards", () => {
    expect(homeClientContent).toContain("--mx");
    expect(homeClientContent).toContain("--my");
  });

  it("includes most used badge on Builder plan", () => {
    expect(homeClientContent).toContain("most used");
  });

  it("defines plan-card radial-gradient styling in globals.css", () => {
    expect(globalsCss).toContain("radial-gradient(360px circle at var(--mx) var(--my)");
    expect(globalsCss).toContain(".plan-card");
  });
});
