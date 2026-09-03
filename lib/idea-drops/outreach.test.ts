import { describe, expect, it } from "vitest";
import { generateOutreachPack } from "./outreach";
import type { Evidence } from "@/types/idea-drop";

describe("generateOutreachPack", () => {
  const sampleEvidence: Evidence[] = [
    {
      platform: "github",
      url: "https://github.com/facebook/react/issues/1234",
      quote: "Managing this duplicate state across tabs is driving me insane.",
      date: "2026-08-01",
    },
    {
      platform: "hackernews",
      url: "https://news.ycombinator.com/item?id=999999",
      quote: "Why is there no simple command-line tool that handles this cleanly?",
      date: "2026-08-02",
    },
    {
      platform: "discourse",
      url: "https://meta.discourse.org/t/topic-slug/123",
      quote: "We waste hours every week doing this manually.",
      date: "2026-08-03",
    },
  ];

  it("generates platform-tailored outreach scripts with respectful etiquette", () => {
    const pack = generateOutreachPack({
      title: "Auto-sync state across browser tabs",
      category: "Developer Tools",
      problem: {
        summary: "Developers struggle to synchronize tab state without complex websockets.",
        whoFeelsIt: "Frontend engineers building multi-tab apps",
      },
      evidence: sampleEvidence,
    });

    expect(pack.items).toHaveLength(3);

    // GitHub item
    const gh = pack.items[0];
    expect(gh.platform).toBe("github");
    expect(gh.targetHandle).toBe("@facebook");
    expect(gh.templateBody).toContain("open prototype");
    expect(gh.etiquetteTip).toContain("Never paste sales pitches");

    // Hacker News item
    const hn = pack.items[1];
    expect(hn.platform).toBe("hackernews");
    expect(hn.templateBody).toContain("unvarnished feedback");
    expect(hn.etiquetteTip).toContain("HN community respects engineering rigor");

    // Advice
    expect(pack.launchAdvice).toContain("Send outreach to 3–5 original thread participants");
  });
});
