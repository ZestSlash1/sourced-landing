import type { Evidence } from "@/types/idea-drop";

export interface RawComplaint {
  platform: Evidence["platform"];
  subforum?: string;
  rawText: string;
  url: string;
  date: string;
  engagementRaw?: { type: string; value: number };
}
