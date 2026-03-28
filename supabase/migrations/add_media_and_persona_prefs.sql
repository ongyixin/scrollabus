-- Migration: add media fields to posts + persona preferences to profiles
-- Run in Supabase SQL Editor

-- Add media_type and media_url to posts table
alter table posts
  add column if not exists media_type text check (media_type in ('text', 'image', 'video', 'audio')) not null default 'text',
  add column if not exists media_url text;

-- Add enabled_personas preference to profiles (defaults to all six enabled)
alter table profiles
  add column if not exists enabled_personas text[] default '{lecture-bestie,exam-gremlin,problem-grinder,doodle-prof,meme-lord,study-bard}';

-- Index for filtering posts by media type in the feed
create index if not exists idx_posts_media_type on posts (media_type);
