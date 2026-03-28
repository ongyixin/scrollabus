-- =============================================
-- Scrollabus — Interactive Quizzes
-- Run in Supabase SQL Editor after schema.sql
-- =============================================

-- Quiz cards inserted into the feed, generated from user materials
create table if not exists quizzes (
  id uuid primary key default gen_random_uuid(),
  material_id uuid references materials(id) on delete cascade not null,
  question_type text not null check (question_type in ('multiple_choice', 'multiple_response', 'free_text')),
  question text not null,
  -- For multiple_choice / multiple_response: array of { "id": "a", "text": "..." }
  -- Null for free_text
  options jsonb,
  -- For multiple_choice: ["a"]
  -- For multiple_response: ["a", "c"]
  -- For free_text: { "text": "model answer..." }
  correct_answer jsonb not null,
  explanation text not null,
  created_at timestamptz default now()
);

-- One response per user per quiz
create table if not exists quiz_responses (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  -- Selected option IDs (array of strings) or { "text": "..." } for free_text
  answer jsonb not null,
  -- true/false for MCQ/MR (auto-graded), null for free_text (subjective)
  is_correct boolean,
  created_at timestamptz default now(),
  unique (quiz_id, user_id)
);

-- Persisted persona hint/explanation chat for a quiz
create table if not exists quiz_messages (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid references quizzes(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  -- null when role = 'user'; set to persona slug when role = 'persona'
  persona_slug text,
  role text not null check (role in ('user', 'persona')),
  body text not null,
  created_at timestamptz default now()
);

-- =============================================
-- ROW LEVEL SECURITY
-- =============================================

alter table quizzes enable row level security;
alter table quiz_responses enable row level security;
alter table quiz_messages enable row level security;

-- Quizzes: any authenticated user can read quizzes belonging to their own materials
create policy "quizzes_select_own_materials" on quizzes for select
  using (
    exists (
      select 1 from materials
      where materials.id = quizzes.material_id
        and materials.user_id = auth.uid()
    )
  );

-- Quizzes: only service role can insert (quiz generation happens server-side)
create policy "quizzes_insert_service" on quizzes for insert
  with check (true);

-- Quiz responses: users own their responses
create policy "quiz_responses_select_own" on quiz_responses for select
  using (auth.uid() = user_id);

create policy "quiz_responses_insert_own" on quiz_responses for insert
  with check (auth.uid() = user_id);

-- Allow upsert (update) for re-submissions (not currently used but safe to have)
create policy "quiz_responses_update_own" on quiz_responses for update
  using (auth.uid() = user_id);

-- Quiz messages: users own their chat history
create policy "quiz_messages_select_own" on quiz_messages for select
  using (auth.uid() = user_id);

create policy "quiz_messages_insert_own" on quiz_messages for insert
  with check (auth.uid() = user_id);

-- =============================================
-- INDEXES
-- =============================================

create index if not exists idx_quizzes_material_id on quizzes (material_id);
create index if not exists idx_quizzes_created_at on quizzes (created_at);
create index if not exists idx_quiz_responses_quiz_id on quiz_responses (quiz_id);
create index if not exists idx_quiz_responses_user_id on quiz_responses (user_id);
create index if not exists idx_quiz_messages_quiz_user on quiz_messages (quiz_id, user_id);
create index if not exists idx_quiz_messages_created_at on quiz_messages (created_at);
