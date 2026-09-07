import { describe, it, expect } from "vitest";
import { verifySameOrigin } from "./csrf";

describe("CSRF & Origin Verification (verifySameOrigin)", () => {
  it("allows safe GET and HEAD methods automatically", () => {
    const getReq = new Request("https://www.getsourced.dev/api/newsletter", { method: "GET" });
    expect(verifySameOrigin(getReq).ok).toBe(true);

    const headReq = new Request("https://www.getsourced.dev/api/newsletter", { method: "HEAD" });
    expect(verifySameOrigin(headReq).ok).toBe(true);
  });

  it("allows POST requests where Origin matches Host", () => {
    const req = new Request("https://www.getsourced.dev/api/newsletter", {
      method: "POST",
      headers: {
        host: "www.getsourced.dev",
        origin: "https://www.getsourced.dev",
      },
    });
    expect(verifySameOrigin(req).ok).toBe(true);
  });

  it("allows POST requests when Sec-Fetch-Site is same-origin", () => {
    const req = new Request("https://www.getsourced.dev/api/newsletter", {
      method: "POST",
      headers: {
        host: "www.getsourced.dev",
        "sec-fetch-site": "same-origin",
      },
    });
    expect(verifySameOrigin(req).ok).toBe(true);
  });

  it("blocks POST requests from untrusted external origins", () => {
    const req = new Request("https://www.getsourced.dev/api/newsletter", {
      method: "POST",
      headers: {
        host: "www.getsourced.dev",
        origin: "https://malicious-attacker-site.com",
      },
    });
    const result = verifySameOrigin(req);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Origin mismatch");
  });

  it("blocks POST requests when Sec-Fetch-Site is cross-site", () => {
    const req = new Request("https://www.getsourced.dev/api/newsletter", {
      method: "POST",
      headers: {
        host: "www.getsourced.dev",
        "sec-fetch-site": "cross-site",
      },
    });
    const result = verifySameOrigin(req);
    expect(result.ok).toBe(false);
    expect(result.reason).toContain("Cross-site");
  });
});
