-- =============================================
-- Scrollabus — Photon Study Companion
-- Run in Supabase SQL Editor after schema.sql
-- =============================================
-- Adds phone number and study companion opt-in to profiles.
-- Required for Photon iMessage/SMS outbound nudges.

alter table profiles
  add column if not exists phone_number text,
  add column if not exists photon_enabled boolean not null default false;

-- Index to efficiently query users opted into study companion
create index if not exists idx_profiles_photon_enabled on profiles (photon_enabled)
  where photon_enabled = true;
