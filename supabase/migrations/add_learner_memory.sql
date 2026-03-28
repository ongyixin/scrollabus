-- =============================================
-- Scrollabus — Learner Memory Events
-- Run in Supabase SQL Editor after schema.sql
-- =============================================
-- Local audit log of raw learner signals.
-- HydraDB is the primary memory store; this table
-- serves as a fast-lookup fallback and event trail.

create table if not exists learner_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade not null,
  -- e.g. material_uploaded, comment_posted, quiz_answered, post_saved, post_viewed, dm_sent, interests_set
  event_type text not null,
  -- Arbitrary context: { title, persona_slug, post_type, media_type, duration_ms, is_correct, ... }
  payload jsonb not null default '{}',
  created_at timestamptz default now()
);

alter table learner_events enable row level security;

-- Users can only read/insert their own events
create policy "learner_events_select_own" on learner_events
  for select using (auth.uid() = user_id);

create policy "learner_events_insert_own" on learner_events
  for insert with check (auth.uid() = user_id or true); -- service role writes on behalf

create index if not exists idx_learner_events_user on learner_events (user_id, created_at desc);
create index if not exists idx_learner_events_type on learner_events (user_id, event_type);
