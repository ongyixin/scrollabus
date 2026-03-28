-- Add media_type and media_url columns to posts table
alter table posts
  add column if not exists media_type text
    check (media_type in ('text', 'image', 'audio', 'video'))
    not null default 'text',
  add column if not exists media_url text;

create index if not exists idx_posts_media_type on posts (media_type);
