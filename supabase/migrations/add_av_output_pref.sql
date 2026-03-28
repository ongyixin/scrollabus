-- Add user preference for whether to generate audio and video content
alter table profiles
  add column if not exists enable_av_output boolean not null default true;
