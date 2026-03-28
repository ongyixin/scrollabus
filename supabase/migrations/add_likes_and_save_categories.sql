-- =============================================
-- Scrollabus — Likes & Save Categories
-- Run in Supabase SQL Editor after schema.sql
-- =============================================

-- Post likes
create table if not exists likes (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id)
);

-- User-defined save categories (e.g. "Favorites", "Exam Prep")
create table if not exists save_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text not null,
  created_at timestamptz default now(),
  unique(user_id, name)
);

-- Many-to-many: a saved post can belong to multiple categories
create table if not exists save_category_memberships (
  user_id uuid references profiles(id) on delete cascade,
  post_id uuid references posts(id) on delete cascade,
  category_id uuid references save_categories(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (user_id, post_id, category_id)
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table likes enable row level security;
alter table save_categories enable row level security;
alter table save_category_memberships enable row level security;

-- Likes: users own their likes
create policy "likes_select_own" on likes for select using (auth.uid() = user_id);
create policy "likes_insert_own" on likes for insert with check (auth.uid() = user_id);
create policy "likes_delete_own" on likes for delete using (auth.uid() = user_id);

-- Save categories: users own their categories
create policy "save_categories_select_own" on save_categories for select using (auth.uid() = user_id);
create policy "save_categories_insert_own" on save_categories for insert with check (auth.uid() = user_id);
create policy "save_categories_update_own" on save_categories for update using (auth.uid() = user_id);
create policy "save_categories_delete_own" on save_categories for delete using (auth.uid() = user_id);

-- Save category memberships: users own their memberships
create policy "save_category_memberships_select_own" on save_category_memberships for select using (auth.uid() = user_id);
create policy "save_category_memberships_insert_own" on save_category_memberships for insert with check (auth.uid() = user_id);
create policy "save_category_memberships_delete_own" on save_category_memberships for delete using (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_likes_user_id on likes (user_id);
create index if not exists idx_likes_post_id on likes (post_id);
create index if not exists idx_save_categories_user_id on save_categories (user_id);
create index if not exists idx_save_category_memberships_user_post on save_category_memberships (user_id, post_id);
create index if not exists idx_save_category_memberships_category on save_category_memberships (category_id);
