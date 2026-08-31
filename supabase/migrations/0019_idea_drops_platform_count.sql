-- Cluster/draft platform provenance (sourced-pipeline-quality-spec.md Part
-- 4): set once at draft time from SignalCluster.platformCount /
-- .crossPlatform, so the admin pending-review queue and public idea pages
-- can distinguish single- vs multi-platform evidence without re-deriving it
-- from evidence[] (which an admin edit could otherwise drift from the
-- original cluster). Nullable — ideas drafted before this column existed
-- have no recorded value.
alter table idea_drops
  add column if not exists platform_count int,
  add column if not exists cross_platform boolean;
