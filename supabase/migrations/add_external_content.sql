-- =============================================
-- Scrollabus — External Social Content
-- Run in Supabase SQL Editor after schema.sql
-- =============================================

-- Curated channels/accounts to pull content from
create table if not exists curated_channels (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  channel_id text not null,
  channel_name text,
  tags text[] default '{}',
  is_active boolean default true,
  created_at timestamptz default now(),
  unique(platform, channel_id)
);

-- External social media content ingested via n8n
create table if not exists external_content (
  id uuid primary key default gen_random_uuid(),
  platform text not null check (platform in ('youtube', 'tiktok', 'instagram')),
  external_id text not null,
  title text,
  description text,
  thumbnail_url text,
  embed_url text not null,
  author_name text,
  author_avatar_url text,
  view_count bigint default 0,
  like_count bigint default 0,
  tags text[] default '{}',
  duration_seconds int,
  published_at timestamptz,
  fetched_at timestamptz default now(),
  created_at timestamptz default now(),
  unique(platform, external_id)
);

-- Indexes
create index if not exists idx_external_content_platform on external_content(platform);
create index if not exists idx_external_content_tags on external_content using gin(tags);
create index if not exists idx_external_content_published on external_content(published_at desc);
create index if not exists idx_curated_channels_platform on curated_channels(platform, is_active);

-- RLS
alter table curated_channels enable row level security;
alter table external_content enable row level security;

-- Curated channels: authenticated users can read, service role manages
create policy "curated_channels_select_authenticated"
  on curated_channels for select using (auth.role() = 'authenticated');
create policy "curated_channels_insert_service"
  on curated_channels for insert with check (true);
create policy "curated_channels_update_service"
  on curated_channels for update using (true);

-- External content: authenticated users can read, service role (n8n) inserts
create policy "external_content_select_authenticated"
  on external_content for select using (auth.role() = 'authenticated');
create policy "external_content_insert_service"
  on external_content for insert with check (true);
create policy "external_content_update_service"
  on external_content for update using (true);
