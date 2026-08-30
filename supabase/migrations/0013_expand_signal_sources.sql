-- Adds keyless bridge sources (Dev.to, Lobste.rs) so clustering has
-- cross-platform overlap to find: HN and StackExchange share complaint
-- intent but not prose, and every non-singleton cluster so far has been
-- single-platform. Dev.to/Lobsters share HN's natural-language complaint
-- register ("I'm frustrated that...", "why doesn't anyone build...").
-- Indie Hackers and Product Hunt were evaluated and skipped: IH is a
-- client-rendered SPA with no public JSON/RSS, and PH's GraphQL API requires
-- an OAuth token even for read-only queries — both fail the keyless
-- constraint.
alter table raw_signals drop constraint if exists raw_signals_source_check;
alter table raw_signals add constraint raw_signals_source_check
  check (source in ('reddit', 'hackernews', 'stackexchange', 'github', 'devto', 'lobsters'));
