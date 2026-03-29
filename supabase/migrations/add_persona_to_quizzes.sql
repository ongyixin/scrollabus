-- Add persona_slug to quizzes so each quiz card is voiced by a specific persona.
-- Null means the quiz was generated before this migration (generic educator voice).
alter table quizzes
  add column if not exists persona_slug text references personas(slug) on delete set null;

create index if not exists idx_quizzes_persona_slug on quizzes (persona_slug);
