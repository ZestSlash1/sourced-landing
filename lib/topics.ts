/**
 * Fixed, curated topic list (sourced-phase4-spec.md Decision #4). Shared by
 * the signup/account topic picker, the ingest classification step, and the
 * feed's topic filter — keep this the single source of truth so all three
 * stay in sync when the list expands later.
 */
export const TOPICS = [
  "E-commerce",
  "Marketplaces (Etsy/Shopify/Amazon)",
  "Freelance & Client Tools",
  "Dev Tools",
  "Content/Creator Tools",
  "B2B SaaS/CRM",
] as const;

export type Topic = (typeof TOPICS)[number];

export function isTopic(value: string): value is Topic {
  return (TOPICS as readonly string[]).includes(value);
}
