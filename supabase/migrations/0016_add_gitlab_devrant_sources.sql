-- Adds Part 2 sources (sourced-ingest-volume-spec.md): GitLab Issues and
-- DevRant. Widens the raw_signals.source check constraint accordingly.
alter table raw_signals drop constraint if exists raw_signals_source_check;
alter table raw_signals add constraint raw_signals_source_check
  check (source in ('reddit', 'hackernews', 'stackexchange', 'github', 'devto', 'lobsters', 'gitlab', 'devrant'));
