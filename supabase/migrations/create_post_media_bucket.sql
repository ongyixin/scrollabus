-- =============================================
-- Create post-media Storage bucket
-- Run in Supabase SQL Editor (requires service role)
-- =============================================

insert into storage.buckets (id, name, public)
values ('post-media', 'post-media', true)
on conflict (id) do nothing;

-- Allow public read access
create policy "Public read access"
  on storage.objects for select
  using (bucket_id = 'post-media');

-- Allow service role (n8n) to upload
create policy "Service role upload"
  on storage.objects for insert
  with check (bucket_id = 'post-media');

-- Allow service role to update/upsert
create policy "Service role update"
  on storage.objects for update
  using (bucket_id = 'post-media');
