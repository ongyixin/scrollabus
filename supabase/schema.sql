-- =============================================
-- Scrollabus — Supabase Schema
-- Run in Supabase SQL Editor
-- =============================================

-- Enable UUID extension
create extension if not exists "pgcrypto";

-- =============================================
-- TABLES
-- =============================================

-- Profiles (extends auth.users)
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  onboarding_completed boolean not null default false,
  interests text[] default '{}',
  created_at timestamptz default now()
);

-- AI study influencer personas (seeded)
create table if not exists personas (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  avatar_url text,
  system_prompt text not null,
  description text,
  accent_color text not null default '#C9B8E8',
  role_tag text not null default 'Study Guide',
  emoji text not null default '📚',
  created_at timestamptz default now()
);

-- Uploaded study materials
create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text not null,
  raw_text text not null,
  source_type text check (source_type in ('pdf', 'text', 'link')) default 'text',
  created_at timestamptz default now()
);

-- Feed posts (AI-generated from materials)
create table if not exists posts (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materials(id) on delete set null,
  persona_id uuid references personas(id) on delete set null,
  post_type text check (post_type in ('concept', 'example', 'trap', 'review', 'recap')) not null default 'concept',
  title text,
  body text not null,
  media_type text check (media_type in ('text', 'image', 'audio', 'video')) not null default 'text',
  media_url text,
  source text check (source in ('n8n', 'creao')) not null default 'n8n',
  sort_order int default 0,
  created_at timestamptz default now()
);

-- Comments (human or AI persona)
create table if not exists comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete set null,
  persona_id uuid references personas(id) on delete set null,
  body text not null,
  parent_comment_id uuid references comments(id) on delete set null,
  created_at timestamptz default now(),
  constraint comment_author_check check (
    (user_id is not null and persona_id is null) or
    (user_id is null and persona_id is not null)
  )
);

-- Saved posts
create table if not exists saves (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- View impressions (feed ranking + Creao engagement data)
create table if not exists impressions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  duration_ms int,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table profiles enable row level security;
alter table materials enable row level security;
alter table posts enable row level security;
alter table comments enable row level security;
alter table saves enable row level security;
alter table impressions enable row level security;
-- personas is public read
alter table personas enable row level security;

-- Profiles: users can read/update their own
create policy "profiles_select_own" on profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles for update using (auth.uid() = id);

-- Personas: anyone authenticated can read
create policy "personas_select_all" on personas for select using (true);

-- Materials: users own their materials
create policy "materials_select_own" on materials for select using (auth.uid() = user_id);
create policy "materials_insert_own" on materials for insert with check (auth.uid() = user_id);

-- Posts: all authenticated users can read posts
create policy "posts_select_authenticated" on posts for select using (auth.role() = 'authenticated');
-- Service role can insert (n8n/API routes use service role)
create policy "posts_insert_service" on posts for insert with check (true);

-- Comments: authenticated users can read and insert their own
create policy "comments_select_authenticated" on comments for select using (auth.role() = 'authenticated');
create policy "comments_insert_own" on comments for insert with check (
  auth.uid() = user_id or persona_id is not null
);

-- Saves: users own their saves
create policy "saves_select_own" on saves for select using (auth.uid() = user_id);
create policy "saves_insert_own" on saves for insert with check (auth.uid() = user_id);
create policy "saves_delete_own" on saves for delete using (auth.uid() = user_id);

-- Impressions: users own their impressions
create policy "impressions_insert_own" on impressions for insert with check (auth.uid() = user_id);

-- =============================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- =============================================

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer set search_path = '';

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_posts_created_at on posts (created_at desc);
create index if not exists idx_posts_material_id on posts (material_id);
create index if not exists idx_posts_persona_id on posts (persona_id);
create index if not exists idx_comments_post_id on comments (post_id);
create index if not exists idx_saves_user_id on saves (user_id);
create index if not exists idx_impressions_user_post on impressions (user_id, post_id);
