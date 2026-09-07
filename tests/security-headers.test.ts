import { describe, it, expect } from "vitest";
import nextConfig from "../next.config.mjs";

describe("HTTP Security Headers", () => {
  it("includes all recommended transport and isolation headers on /:path*", async () => {
    const headersConfig = await nextConfig.headers();
    const globalEntry = headersConfig.find((entry: any) => entry.source === "/:path*");

    expect(globalEntry).toBeDefined();
    const headersMap = new Map(globalEntry.headers.map((h: any) => [h.key, h.value]));

    // Transport Security (HSTS)
    expect(headersMap.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );

    // Isolation policies
    expect(headersMap.get("Cross-Origin-Opener-Policy")).toBe("same-origin-allow-popups");
    expect(headersMap.get("Cross-Origin-Resource-Policy")).toBe("same-origin");
    expect(headersMap.get("X-DNS-Prefetch-Control")).toBe("on");

    // Standard baseline headers
    expect(headersMap.get("X-Frame-Options")).toBe("DENY");
    expect(headersMap.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headersMap.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
  });
});
