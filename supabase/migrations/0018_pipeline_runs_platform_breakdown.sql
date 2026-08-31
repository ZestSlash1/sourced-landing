-- Platform-count breakdown of clusters_passing_bar (sourced-pipeline-quality-
-- spec.md Part 4): MIN_CLUSTER_PLATFORMS dropped from 2 to 1, so
-- clusters_passing_bar alone no longer tells us how much of that is
-- single-platform vs cross-platform evidence. Tracked going forward instead
-- of requiring another one-off diagnostic script.
alter table pipeline_runs
  add column if not exists clusters_passing_bar_single_platform int not null default 0,
  add column if not exists clusters_passing_bar_multi_platform int not null default 0;
