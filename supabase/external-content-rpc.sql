-- =============================================
-- Scrollabus — External Content RPC
-- Run in Supabase SQL Editor after add_external_content.sql
-- =============================================

-- =============================================
-- get_external_content
-- Returns external social content filtered by platform
-- and/or interest tags, ordered by recency.
-- =============================================
create or replace function get_external_content(
  limit_count int default 20,
  platform_filter text default null,
  interest_keywords text[] default null,
  before_published_at timestamptz default null
)
returns table (
  id uuid,
  platform text,
  external_id text,
  title text,
  description text,
  thumbnail_url text,
  embed_url text,
  author_name text,
  author_avatar_url text,
  view_count bigint,
  like_count bigint,
  tags text[],
  duration_seconds int,
  published_at timestamptz,
  created_at timestamptz
)
language sql
security definer
set search_path = ''
as $$
  select
    ec.id,
    ec.platform,
    ec.external_id,
    ec.title,
    ec.description,
    ec.thumbnail_url,
    ec.embed_url,
    ec.author_name,
    ec.author_avatar_url,
    ec.view_count,
    ec.like_count,
    ec.tags,
    ec.duration_seconds,
    ec.published_at,
    ec.created_at
  from public.external_content ec
  where
    (platform_filter is null or ec.platform = platform_filter)
    and (before_published_at is null or ec.published_at < before_published_at)
    and (
      interest_keywords is null
      or interest_keywords = '{}'
      or exists (
        select 1
        from unnest(interest_keywords) kw
        where
          ec.title ilike '%' || kw || '%'
          or ec.description ilike '%' || kw || '%'
          or kw = any(ec.tags)
      )
    )
  order by ec.published_at desc nulls last, ec.created_at desc
  limit limit_count;
$$;

-- Grant execute to authenticated users
grant execute on function get_external_content(int, text, text[], timestamptz) to authenticated;
