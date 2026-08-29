-- Adds the 'pending_review' status for auto-drafted ideas (sourced-phase4-spec.md
-- Part A3/A4): ingest drafts land here, not 'draft', so they're visibly
-- distinct from hand-authored work-in-progress and show up in the admin
-- pending-ideas queue. Approve flips to 'published' via the existing
-- PATCH /api/admin/ideas/[id] route; reject flips back to 'draft'.

alter table idea_drops drop constraint if exists idea_drops_status_check;
alter table idea_drops add constraint idea_drops_status_check
  check (status in ('draft', 'needs_evidence', 'published', 'pending_review'));

-- Tracks which raw_signals a drafted idea was generated from, so the admin
-- review queue can show source links inline (A4) without re-deriving them
-- from the evidence blob. Null for hand-authored ideas.
alter table idea_drops add column if not exists source_signal_ids uuid[];
