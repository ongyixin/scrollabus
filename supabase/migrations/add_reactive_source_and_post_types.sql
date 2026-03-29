-- Extend posts.source to include 'reactive' (persona-generated remedial content)
-- and 'pulse' (persona community update posts).
alter table posts
  drop constraint if exists posts_source_check;

alter table posts
  add constraint posts_source_check
    check (source in ('n8n', 'creao', 'reactive', 'pulse'));

-- Extend posts.post_type to include 'pulse' for community update posts.
alter table posts
  drop constraint if exists posts_post_type_check;

alter table posts
  add constraint posts_post_type_check
    check (post_type in ('concept', 'example', 'trap', 'review', 'recap', 'pulse'));
