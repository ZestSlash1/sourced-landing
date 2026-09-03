import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import robots from "./robots";

describe("robots", () => {
  it("allows crawlable public pages and disallows private routes", () => {
    const config = robots();
    expect(config.rules).toBeDefined();

    const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
    expect(rules.userAgent).toBe("*");
    expect(rules.allow).toContain("/");
    expect(rules.allow).toContain("/feed");
    expect(rules.allow).toContain("/methodology");
    expect(rules.allow).toContain("/signals");
    expect(rules.disallow).toContain("/admin/*");
    expect(rules.disallow).toContain("/api/*");
    expect(rules.disallow).toContain("/account/*");
    expect(config.sitemap).toBe("https://www.getsourced.dev/sitemap.xml");
  });
});
