-- Add teaching_plan column to materials to persist Dify's pedagogical analysis.
-- Stores: { priority_personas, emphasis, first_review_concept, quiz_topic }
alter table materials
  add column if not exists teaching_plan jsonb;
