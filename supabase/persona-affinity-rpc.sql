-- =============================================
-- Scrollabus — Persona Affinity RPC
-- Computes a per-persona engagement score for a given user.
-- Used by the adaptive feed to bias content toward personas the student
-- has shown genuine interest in (likes, saves, dwell time, comments).
--
-- Score formula (per persona, for this user):
--   +3 per like on that persona's posts
--   +3 per save on that persona's posts
--   +1 per significant impression (dwell >= 2 000 ms) on that persona's posts
--   +2 per human comment the user left on that persona's posts
-- =============================================

create or replace function get_persona_affinity(p_user_id uuid)
returns table(
  persona_id    uuid,
  persona_slug  text,
  affinity_score float
)
language sql
security definer
set search_path = ''
as $$
  select
    p.id                                                     as persona_id,
    p.slug                                                   as persona_slug,
    coalesce(l.like_score,       0)
    + coalesce(s.save_score,     0)
    + coalesce(i.dwell_score,    0)
    + coalesce(c.comment_score,  0)                         as affinity_score
  from public.personas p

  -- Likes: +3 each
  left join (
    select po.persona_id, count(*) * 3.0 as like_score
    from public.likes lk
    join public.posts po on po.id = lk.post_id
    where lk.user_id = p_user_id
    group by po.persona_id
  ) l on l.persona_id = p.id

  -- Saves: +3 each
  left join (
    select po.persona_id, count(*) * 3.0 as save_score
    from public.saves sv
    join public.posts po on po.id = sv.post_id
    where sv.user_id = p_user_id
    group by po.persona_id
  ) s on s.persona_id = p.id

  -- Dwell impressions (>= 2 000 ms): +1 each
  left join (
    select po.persona_id, count(*) * 1.0 as dwell_score
    from public.impressions im
    join public.posts po on po.id = im.post_id
    where im.user_id = p_user_id
      and im.duration_ms >= 2000
    group by po.persona_id
  ) i on i.persona_id = p.id

  -- Human comments: +2 each
  left join (
    select po.persona_id, count(*) * 2.0 as comment_score
    from public.comments cm
    join public.posts po on po.id = cm.post_id
    where cm.user_id = p_user_id
    group by po.persona_id
  ) c on c.persona_id = p.id

  order by affinity_score desc;
$$;

grant execute on function get_persona_affinity(uuid) to authenticated, service_role;
