-- =============================================
-- Add custom persona support to personas table
-- =============================================

-- Add new columns to personas table
alter table personas
  add column if not exists created_by uuid references profiles(id) on delete set null,
  add column if not exists is_public boolean not null default false,
  add column if not exists tone text,
  add column if not exists teaching_style text;

-- Index for fast lookup of user-created personas
create index if not exists idx_personas_created_by on personas (created_by);

-- Index for browsing public community personas
create index if not exists idx_personas_is_public on personas (is_public) where is_public = true;

-- =============================================
-- Update RLS policies
-- =============================================

-- Drop the old blanket select policy
drop policy if exists "personas_select_all" on personas;

-- New select policy:
-- Anyone can see: default personas (created_by is null) + public custom personas + their own private personas
create policy "personas_select_visible" on personas
  for select using (
    created_by is null
    or is_public = true
    or created_by = auth.uid()
  );

-- Insert: authenticated users can insert their own custom personas
create policy "personas_insert_own" on personas
  for insert with check (
    auth.uid() is not null
    and created_by = auth.uid()
  );

-- Update: users can only update their own custom personas (not system defaults)
create policy "personas_update_own" on personas
  for update using (
    created_by = auth.uid()
  ) with check (
    created_by = auth.uid()
  );

-- Delete: users can only delete their own custom personas
create policy "personas_delete_own" on personas
  for delete using (
    created_by = auth.uid()
  );
