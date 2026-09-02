export interface ProviderClassifyInput {
  title: string | null;
  body: string;
  platform: string;
}

export interface ProviderClassifyResult {
  isComplaint: boolean;
  problemStatement: string | null;
  domain: string | null;
  confidence: number;
  tokens: number;
}

// omniroute-drafts-and-ollama-lockin-spec.md: draft generation is a transport
// swap, not a content change — both draft providers take the exact same
// pre-built prompt string (lib/ingest/draft-model.ts owns building it) and
// return the raw completion text for draft-model.ts to parse. Unlike
// classification, there's no shared JSON-parsing contract to centralize here
// since only one caller (draft-model.ts) ever consumes the output.
export interface ProviderDraftResult {
  content: string;
  model: string;
  tokens: number;
}
