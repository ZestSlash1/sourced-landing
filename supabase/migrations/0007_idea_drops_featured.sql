-- featured: admin-curated flag for the logged-out / no-topics-selected feed
-- default (sourced-phase4-spec.md Part C1, "curated popular subset").
alter table idea_drops add column if not exists featured boolean not null default false;

create index if not exists idea_drops_featured_idx
  on idea_drops (featured, published_at desc)
  where status = 'published';
