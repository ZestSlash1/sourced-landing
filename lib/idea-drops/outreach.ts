import type { Evidence, IdeaDrop } from "@/types/idea-drop";

export interface OutreachItem {
  id: string;
  platform: string;
  threadUrl: string;
  quoteExcerpt: string;
  targetHandle: string;
  templateSubject?: string;
  templateBody: string;
  etiquetteTip: string;
  channelRationale: string;
}

export interface OutreachPack {
  items: OutreachItem[];
  launchAdvice: string;
  etiquetteSummary: string;
}

function extractTargetHandle(url: string, platform: string): string {
  try {
    const u = new URL(url);
    if (platform === "github") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts.length >= 2) return `@${parts[0]}`;
    } else if (platform === "reddit") {
      const match = u.pathname.match(/\/comments\/([^/]+)/);
      if (match) return `Thread OP`;
    } else if (platform === "twitter" || platform === "bluesky" || platform === "mastodon") {
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0]) return `@${parts[0]}`;
    }
  } catch {
    // fallback
  }
  return "Thread Contributor";
}

export function generateOutreachPack(
  idea: Pick<IdeaDrop, "title" | "category" | "problem" | "evidence">
): OutreachPack {
  const items: OutreachItem[] = idea.evidence.map((ev, index) => {
    const platform = ev.platform.toLowerCase();
    const handle = extractTargetHandle(ev.url, platform);
    const shortTitle = idea.title.replace(/^One-click /i, "").replace(/^Auto-flag /i, "");
    const excerpt = ev.quote.length > 80 ? `${ev.quote.slice(0, 77)}...` : ev.quote;

    let templateSubject = `Regarding: ${shortTitle}`;
    let templateBody = "";
    let etiquetteTip = "";
    let channelRationale = "";

    if (platform === "github") {
      templateSubject = `Lightweight solution for: ${shortTitle}`;
      templateBody = `Hey ${handle} & everyone on this issue,\n\nSaw this discussion regarding "${excerpt}". I ran into this exact friction in my own workflow, so I built a focused open prototype that handles this directly:\n[Insert Demo / Repo URL]\n\nIt specifically solves ${idea.problem.summary.toLowerCase()}\n\nIf anyone is still facing this and has 2 minutes to test whether it covers your setup, I would deeply appreciate any technical feedback.`;
      etiquetteTip = "Never paste sales pitches in GitHub issues. Frame it as an open contribution or working tool addressing the issue.";
      channelRationale = "High technical intent — developers watching this issue are actively blocked by this limitation.";
    } else if (platform === "hackernews") {
      templateSubject = `Quick note re: HN thread on ${shortTitle}`;
      templateBody = `Saw your comment on HN regarding "${excerpt}".\n\nI was frustrated by the same issue and built a dedicated micro-tool for it: [Insert URL].\n\nIt takes a minimal approach: ${idea.problem.summary.toLowerCase()}\n\nWould genuinely love your unvarnished feedback if you have a second to look.`;
      etiquetteTip = "Be humble, direct, and invite criticism. HN community respects engineering rigor over marketing fluff.";
      channelRationale = "HN commenters appreciate lean, single-purpose tools that respect privacy and simplicity.";
    } else if (platform === "discourse") {
      templateSubject = `Workaround for ${shortTitle}`;
      templateBody = `Hey ${handle},\n\nWas reading through this thread where you mentioned "${excerpt}".\n\nSince existing setups didn't have an easy native fix, I put together a quick tool that automates the workflow: [Insert URL].\n\nHope this saves someone on the forum some time! Happy to customize it if anyone needs specific tweaks.`;
      etiquetteTip = "Answer the forum thread constructively. Link your tool as a helpful workaround rather than hard-selling.";
      channelRationale = "Niche community users frequently bookmark and share useful third-party forum fixes.";
    } else if (platform === "devrant" || platform === "lobsters") {
      templateSubject = `Fixed the rant: ${shortTitle}`;
      templateBody = `Hey ${handle} — read your post about "${excerpt}". Felt that pain in my bones.\n\nDecided to actually solve it instead of just being mad at it: [Insert URL]. Built it specifically to address ${idea.problem.summary.toLowerCase()}.\n\nTry it out if you want to save yourself the headache!`;
      etiquetteTip = "Match the candid, developer-to-developer peer tone of the platform.";
      channelRationale = "High emotional resonance — developers who vent about tooling love when someone actually fixes the annoyance.";
    } else {
      templateSubject = `Feedback on: ${shortTitle}`;
      templateBody = `Hi ${handle},\n\nCame across your post mentioning "${excerpt}".\n\nI just shipped a tool designed specifically for ${idea.problem.whoFeelsIt.toLowerCase()}:\n[Insert URL]\n\nIt does one thing really well: ${idea.problem.summary.toLowerCase()}.\n\nWould love to offer you early access in exchange for your honest thoughts!`;
      etiquetteTip = "Keep it under 4 sentences. Focus on how it reclaims their time.";
      channelRationale = "Direct practitioner who expressed acute, unprompted frustration.";
    }

    return {
      id: `outreach-${index}-${platform}`,
      platform: ev.platform,
      threadUrl: ev.url,
      quoteExcerpt: ev.quote,
      targetHandle: handle,
      templateSubject,
      templateBody,
      etiquetteTip,
      channelRationale,
    };
  });

  return {
    items,
    launchAdvice:
      "Send outreach to 3–5 original thread participants as soon as your MVP is deployed. Their feedback validates product-market fit before you run any paid ads or broad public launches.",
    etiquetteSummary:
      "Always lead with value. Offer free sandbox or beta access. Never spam multiple comments on the same thread.",
  };
}
