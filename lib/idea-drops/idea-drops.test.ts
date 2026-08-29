import { describe, expect, it } from "vitest";
import { scopeToTier } from "./scope-to-tier";
import { validateEvidence } from "./validate-evidence";
import { applyEvidenceGate, isPubliclyVisible } from "./publish-gate";
import type { Evidence, IdeaDrop } from "@/types/idea-drop";

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

function evidence(overrides: Partial<Evidence> = {}): Evidence {
  return {
    platform: "reddit",
    subforum: "r/SaaS",
    quote: "I waste hours reconciling invoices every month",
    url: "https://reddit.com/r/SaaS/comments/abc",
    date: daysAgo(10),
    ...overrides,
  };
}

/** A fully-populated, publishable drop gated at the builder tier. */
function ideaDrop(overrides: Partial<IdeaDrop> = {}): IdeaDrop {
  return {
    id: "sourced-2026-08-29-001",
    slug: "gst-invoice-reconciliation",
    title: "One-click GST invoice reconciliation for freelancers",
    category: "Micro-SaaS",
    demandScore: 88,
    tags: ["invoicing", "india", "freelance"],
    publishedAt: "2026-08-29",
    tier: "builder",
    problem: {
      summary: "Freelancers reconcile GST invoices by hand every quarter.",
      whoFeelsIt: "Indian solo freelancers filing their own GST returns",
    },
    evidence: [
      evidence(),
      evidence({ platform: "g2", subforum: "Zoho Books", url: "https://g2.com/x" }),
      evidence({ platform: "upwork", url: "https://upwork.com/j/1" }),
    ],
    whyNow: "GST e-invoicing thresholds dropped again this year.",
    buildBrief: {
      coreLoop: ["Upload invoices", "Auto-match to returns", "Export summary"],
      mvpScope: ["CSV upload", "Matching engine"],
      explicitlyCut: ["Multi-user teams"],
      dataModel: [{ name: "Invoice", fields: "id, amount, gstin, date" }],
    },
    matchedApis: [
      {
        name: "Open Exchange Rates",
        purpose: "Convert foreign-currency invoices to INR",
        freeTierLimit: "1000 req/month",
        sourceUrl: "https://openexchangerates.org/",
      },
    ],
    launchStack: [
      {
        layer: "hosting",
        tool: "Vercel",
        freeTierNote: "Hobby tier",
        sourceUrl: "https://vercel.com",
      },
    ],
    agentPrompts: {
      claudeCode: "Build a GST reconciliation tool...",
      cursorWindsurf: "Build a GST reconciliation tool...",
      v0Bolt: "Build a GST reconciliation tool...",
    },
    difficulty: {
      soloWeekendProject: true,
      estimatedHours: 18,
      skillFloor: "intermediate",
    },
    status: "published",
    ...overrides,
  };
}

/** Every key the spec requires to be absent from an under-tier payload. */
const GATED_KEYS = [
  "buildBrief",
  "matchedApis",
  "launchStack",
  "agentPrompts",
  "difficulty",
  "whyNow",
] as const;

describe("scopeToTier", () => {
  it("returns the full idea when the user tier meets the idea tier", () => {
    const idea = ideaDrop();
    expect(scopeToTier(idea, "builder")).toBe(idea);
  });

  it("returns the full idea when the user tier exceeds the idea tier", () => {
    const idea = ideaDrop();
    expect(scopeToTier(idea, "studio")).toBe(idea);
  });

  // Acceptance check 1: gated keys genuinely absent, verified via Object.keys().
  it("omits every gated key from an under-tier payload", () => {
    const scoped = scopeToTier(ideaDrop(), "free");
    const keys = Object.keys(scoped);

    for (const gated of GATED_KEYS) {
      expect(keys).not.toContain(gated);
    }
  });

  it("marks the under-tier payload locked and truncates evidence to one item", () => {
    const scoped = scopeToTier(ideaDrop(), "free");

    expect(scoped).toHaveProperty("locked", true);
    expect(scoped.evidence).toHaveLength(1);
    expect(scoped.evidence[0]).toEqual(ideaDrop().evidence[0]);
  });

  it("exposes exactly the teaser key set and nothing more", () => {
    const scoped = scopeToTier(ideaDrop(), "free");

    expect(Object.keys(scoped).sort()).toEqual(
      [
        "id",
        "slug",
        "title",
        "category",
        "demandScore",
        "tags",
        "publishedAt",
        "tier",
        "problem",
        "status",
        "evidence",
        "locked",
      ].sort(),
    );
  });

  it("gates a studio idea from a builder user", () => {
    const scoped = scopeToTier(ideaDrop({ tier: "studio" }), "builder");
    expect(scoped).toHaveProperty("locked", true);
  });
});

describe("validateEvidence", () => {
  it("accepts 3+ items across 2+ platforms with one within 90 days", () => {
    expect(validateEvidence(ideaDrop().evidence)).toEqual({ valid: true, errors: [] });
  });

  it("rejects fewer than 3 items", () => {
    const result = validateEvidence([evidence(), evidence({ platform: "g2" })]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Only 2 evidence item(s) — minimum 3 required");
  });

  it("rejects evidence from a single platform", () => {
    const result = validateEvidence([evidence(), evidence(), evidence()]);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Evidence spans only 1 platform(s) — minimum 2 required");
  });

  it("rejects evidence that is all older than 90 days", () => {
    const stale = [
      evidence({ date: daysAgo(120) }),
      evidence({ platform: "g2", date: daysAgo(200) }),
      evidence({ platform: "upwork", date: daysAgo(365) }),
    ];
    const result = validateEvidence(stale);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("No evidence dated within the last 90 days");
  });

  it("reports every failing rule at once", () => {
    expect(validateEvidence([evidence({ date: daysAgo(400) })]).errors).toHaveLength(3);
  });
});

describe("applyEvidenceGate", () => {
  // Acceptance check 2: 2 evidence items can never reach "published".
  it("blocks publish when there are only 2 evidence items", () => {
    const idea = ideaDrop({ evidence: [evidence(), evidence({ platform: "g2" })] });
    const gated = applyEvidenceGate(idea, "published");

    expect(gated.status).toBe("needs_evidence");
    expect(gated.validationErrors).toContain("Only 2 evidence item(s) — minimum 3 required");
  });

  // Acceptance check 3: 3 items all from Reddit cannot be published.
  it("blocks publish when all evidence is from one platform", () => {
    const idea = ideaDrop({ evidence: [evidence(), evidence(), evidence()] });

    expect(applyEvidenceGate(idea, "published").status).toBe("needs_evidence");
  });

  // Acceptance check 4: 2+ platforms but all >90 days old cannot be published.
  it("blocks publish when all evidence is older than 90 days", () => {
    const idea = ideaDrop({
      evidence: [
        evidence({ date: daysAgo(120) }),
        evidence({ platform: "g2", date: daysAgo(200) }),
        evidence({ platform: "upwork", date: daysAgo(365) }),
      ],
    });

    expect(applyEvidenceGate(idea, "published").status).toBe("needs_evidence");
  });

  it("allows a valid idea through to the requested status", () => {
    expect(applyEvidenceGate(ideaDrop(), "published").status).toBe("published");
    expect(applyEvidenceGate(ideaDrop(), "draft").status).toBe("draft");
  });

  it("clears validationErrors entirely once evidence becomes valid", () => {
    const repaired = applyEvidenceGate(
      ideaDrop({ validationErrors: ["stale error from a previous save"] }),
      "published",
    );

    expect(Object.keys(repaired)).not.toContain("validationErrors");
  });

  it("does not mutate the idea it is given", () => {
    const idea = ideaDrop({ evidence: [evidence()] });
    applyEvidenceGate(idea, "published");

    expect(idea.status).toBe("published");
    expect(idea.validationErrors).toBeUndefined();
  });
});

describe("isPubliclyVisible", () => {
  // Acceptance check 5: needs_evidence and draft never surface publicly.
  it("hides draft and needs_evidence, shows published", () => {
    expect(isPubliclyVisible(ideaDrop({ status: "published" }))).toBe(true);
    expect(isPubliclyVisible(ideaDrop({ status: "draft" }))).toBe(false);
    expect(isPubliclyVisible(ideaDrop({ status: "needs_evidence" }))).toBe(false);
  });
});
