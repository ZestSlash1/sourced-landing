import { completeJson } from "@/lib/llm/anthropic";
import type { IdeaDrop } from "@/types/idea-drop";

type AgentPrompts = IdeaDrop["agentPrompts"];

const SYSTEM_PROMPT = `You write build briefs for AI coding agents. Given a
validated micro-SaaS idea, produce three differently-shaped prompts from the
same underlying idea. Return ONLY a JSON object, no preamble, no markdown
fences, matching exactly:
{"claudeCode": string, "cursorWindsurf": string, "v0Bolt": string}

- claudeCode: a full spec-style prompt (400-800 words) — problem statement,
  core loop, data model, explicit scope cuts, matched APIs with purpose, and
  launch stack. Written as something pasteable into a CLAUDE.md or an
  /init-style kickoff message.
- cursorWindsurf: the same content compressed to 150-250 words — front-load
  the core loop and data model, trim rationale/why-now framing.
- v0Bolt: UI-scaffold-first — describe screens/components and layout before
  business logic, since these tools generate UI fastest from a visual/
  structural description up front.`;

export async function generateAgentPrompts(
  idea: Pick<IdeaDrop, "title" | "problem" | "buildBrief" | "matchedApis" | "launchStack">
): Promise<AgentPrompts> {
  const user = JSON.stringify({
    title: idea.title,
    problem: idea.problem,
    buildBrief: idea.buildBrief,
    matchedApis: idea.matchedApis,
    launchStack: idea.launchStack,
  });

  return completeJson<AgentPrompts>({ system: SYSTEM_PROMPT, user, maxTokens: 4096 });
}
