// sourced-clustering-upgrade-spec.md Part 4: signal title/body is scraped,
// untrusted text from public forums. Applied before interpolating any signal
// text into the arbiter prompt so injected text in a scraped post can't
// forge a chat-template role/turn boundary or break out of the <signals>
// fence the prompt wraps it in.
const CHAT_TEMPLATE_MARKERS = /\[INST\]|\[\/INST\]|<\|im_start\|>|<\|im_end\|>|<\|system\|>/gi;
const FENCE_TOKENS = /<\/?(?:signals|rules|task|examples)\b/gi;
const ZERO_WIDTH_SPACE = "​";

export function sanitizeForPrompt(value: unknown): string {
  const json = JSON.stringify(value).replace(CHAT_TEMPLATE_MARKERS, "");
  return json.replace(FENCE_TOKENS, (tok) => `${tok[0]}${ZERO_WIDTH_SPACE}${tok.slice(1)}`);
}
