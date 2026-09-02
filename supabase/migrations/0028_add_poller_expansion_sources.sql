-- Adds poller-expansion-spec.md's four new keyless/trivially-authed sources
-- (YouTube comments, Codeberg Issues, Discourse forums, Mastodon) to the
-- raw_signals.source check constraint.
alter table raw_signals drop constraint if exists raw_signals_source_check;
alter table raw_signals add constraint raw_signals_source_check
  check (source in (
    'reddit', 'hackernews', 'stackexchange', 'github', 'devto', 'lobsters',
    'gitlab', 'devrant', 'youtube', 'codeberg', 'discourse', 'mastodon'
  ));
