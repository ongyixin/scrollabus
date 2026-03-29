-- =============================================
-- Scrollabus — Telegram Study Companion
-- Run in Supabase SQL Editor after schema.sql
-- =============================================
-- Replaces Photon iMessage/SMS with Telegram bot companion.

alter table profiles
  add column if not exists telegram_chat_id text,
  add column if not exists telegram_username text,
  add column if not exists telegram_enabled boolean not null default false,
  add column if not exists telegram_link_token text;

-- Index for cron queries (find all opted-in users)
create index if not exists idx_profiles_telegram_enabled on profiles (telegram_enabled)
  where telegram_enabled = true;

-- Index for webhook lookups (find user by chat_id)
create unique index if not exists idx_profiles_telegram_chat_id on profiles (telegram_chat_id)
  where telegram_chat_id is not null;

-- Index for deep-link token lookups
create unique index if not exists idx_profiles_telegram_link_token on profiles (telegram_link_token)
  where telegram_link_token is not null;
