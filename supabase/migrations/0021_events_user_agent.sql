-- Adds the request's User-Agent to `events`, captured in middleware.ts
-- alongside the existing geo headers. Powers the device/browser breakdown on
-- /admin/analytics/live.

alter table events
  add column if not exists user_agent text;
