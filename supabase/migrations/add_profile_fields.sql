-- =============================================
-- Add bio + avatar_url to profiles table
-- Run in Supabase SQL Editor
-- =============================================

alter table profiles add column if not exists bio text;
alter table profiles add column if not exists avatar_url text;

-- =============================================
-- Storage bucket for profile avatars
-- Step 1: Create the bucket in Supabase Dashboard
--   → Storage → New bucket → Name: "avatars" → Public: ON
-- Step 2: Run these RLS policies on storage.objects:
-- =============================================

create policy "Public avatar read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "Auth users upload own avatar" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth users update own avatar" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "Auth users delete own avatar" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
