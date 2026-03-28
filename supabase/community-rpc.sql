-- =============================================
-- Scrollabus — Community & Explore RPCs
-- Run in Supabase SQL Editor after schema.sql
-- =============================================

-- Add interests column if not already present (idempotent)
alter table profiles add column if not exists interests text[] default '{}';

-- =============================================
-- get_trending_posts
-- Returns posts ranked by engagement (saves + comments),
-- optionally filtered by interest keywords matched against
-- post title/body.
-- =============================================
create or replace function get_trending_posts(
  limit_count int default 20,
  interest_keywords text[] default null,
  exclude_user_id uuid default null
)
returns table (
  id uuid,
  material_id uuid,
  persona_id uuid,
  post_type text,
  title text,
  body text,
  source text,
  sort_order int,
  created_at timestamptz,
  save_count bigint,
  comment_count bigint,
  engagement_score bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    p.id,
    p.material_id,
    p.persona_id,
    p.post_type,
    p.title,
    p.body,
    p.source,
    p.sort_order,
    p.created_at,
    count(distinct s.user_id)  as save_count,
    count(distinct c.id)       as comment_count,
    count(distinct s.user_id) + count(distinct c.id) as engagement_score
  from public.posts p
  left join public.saves s    on s.post_id = p.id
  left join public.comments c on c.post_id = p.id
  -- exclude posts from the requesting user's own materials
  left join public.materials m on m.id = p.material_id
  where
    (exclude_user_id is null or m.user_id is distinct from exclude_user_id)
    and (
      interest_keywords is null
      or interest_keywords = '{}'
      or exists (
        select 1
        from unnest(interest_keywords) kw
        where
          p.title ilike '%' || kw || '%'
          or p.body  ilike '%' || kw || '%'
      )
    )
  group by p.id
  order by engagement_score desc, p.created_at desc
  limit limit_count;
$$;

-- =============================================
-- get_similar_users
-- Returns other users whose interests overlap
-- with the provided array, ordered by overlap count.
-- =============================================
create or replace function get_similar_users(
  user_interests text[],
  exclude_user_id uuid default null,
  limit_count int default 20
)
returns table (
  id uuid,
  display_name text,
  interests text[],
  overlap_count bigint
)
language sql
security definer
set search_path = ''
as $$
  select
    pr.id,
    pr.display_name,
    pr.interests,
    (
      select count(*)
      from unnest(pr.interests) i
      where i = any(user_interests)
    ) as overlap_count
  from public.profiles pr
  where
    (exclude_user_id is null or pr.id <> exclude_user_id)
    and pr.interests is not null
    and pr.interests <> '{}'
    and exists (
      select 1
      from unnest(pr.interests) i
      where i = any(user_interests)
    )
  order by overlap_count desc
  limit limit_count;
$$;

-- Grant execute to authenticated users
grant execute on function get_trending_posts(int, text[], uuid) to authenticated;
grant execute on function get_similar_users(text[], uuid, int) to authenticated;
