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

-- =============================================
-- Scrollabus — Quiz Failure Hotspots RPC
-- Returns quiz questions with the highest failure rates across all users.
-- Used by the reactive content workflow to identify where students struggle most.
-- =============================================

create or replace function get_quiz_failure_hotspots(
  p_limit int default 5,
  p_min_attempts int default 2
)
returns json
language sql
security definer
set search_path = ''
as $$
  select coalesce(json_agg(row_to_json(h) order by h.failure_rate desc), '[]'::json)
  from (
    select
      q.id                                                        as quiz_id,
      q.question                                                  as question,
      q.question_type                                             as question_type,
      m.title                                                     as material_title,
      q.material_id                                               as material_id,
      count(r.id)                                                 as total_attempts,
      count(r.id) filter (where r.is_correct = false)            as wrong_count,
      round(
        count(r.id) filter (where r.is_correct = false)::numeric
        / nullif(count(r.id), 0) * 100
      , 1)                                                        as failure_rate,
      -- Collect a sample of wrong answers for the persona prompt
      array_agg(r.answer order by r.created_at desc) filter (
        where r.is_correct = false
      )                                                           as wrong_answers
    from public.quizzes q
    join public.materials m on m.id = q.material_id
    join public.quiz_responses r on r.quiz_id = q.id
    where r.is_correct is not null  -- exclude free-text (ungraded)
    group by q.id, q.question, q.question_type, m.title, q.material_id
    having count(r.id) >= p_min_attempts
    order by failure_rate desc
    limit p_limit
  ) h;
$$;

grant execute on function get_quiz_failure_hotspots(int, int) to authenticated, service_role;
