-- =============================================
-- Scrollabus — Engagement Summary RPC
-- Called by n8n Workflow 3 (Engagement Sync → Google Sheet)
-- Run in Supabase SQL Editor after schema.sql
-- =============================================

create or replace function get_engagement_summary()
returns json
language sql
security definer
set search_path = ''
as $$
  select json_build_object(
    'top_topics', (
      select coalesce(json_agg(title order by impression_count desc), '[]'::json)
      from (
        select p.title, count(i.id) as impression_count
        from public.posts p
        join public.impressions i on i.post_id = p.id
        where i.created_at > now() - interval '24 hours'
          and p.title is not null
        group by p.id, p.title
        order by impression_count desc
        limit 5
      ) top_posts
    ),
    'confusion_topics', (
      select coalesce(json_agg(title order by comment_count desc), '[]'::json)
      from (
        select p.title, count(c.id) as comment_count
        from public.posts p
        join public.comments c on c.post_id = p.id
        where c.created_at > now() - interval '24 hours'
          and c.user_id is not null  -- only human comments signal confusion
          and p.title is not null
        group by p.id, p.title
        order by comment_count desc
        limit 5
      ) confused_posts
    ),
    'save_count', (
      select count(*)
      from public.saves
      where created_at > now() - interval '24 hours'
    ),
    'comment_count', (
      select count(*)
      from public.comments
      where created_at > now() - interval '24 hours'
        and user_id is not null  -- only human comments
    )
  );
$$;

grant execute on function get_engagement_summary() to authenticated, service_role;
