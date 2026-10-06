-- Adds the App Store review poller's 'appstore' source to the
-- raw_signals.source check constraint. The poller shipped without this, so
-- every insert was rejected and the admin banner's App Store poll 502'd.
alter table raw_signals drop constraint if exists raw_signals_source_check;
alter table raw_signals add constraint raw_signals_source_check
  check (source in (
    'reddit', 'hackernews', 'stackexchange', 'github', 'devto', 'lobsters',
    'gitlab', 'devrant', 'youtube', 'codeberg', 'discourse', 'mastodon',
    'bluesky', 'appstore'
  ));
