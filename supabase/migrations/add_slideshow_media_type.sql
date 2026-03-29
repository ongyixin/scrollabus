-- Add 'slideshow' to the media_type check constraint on posts.
-- Slideshow posts store a JSON payload in media_url containing frame image URLs,
-- an audio voiceover URL, and a frame duration.

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_media_type_check;

ALTER TABLE posts
  ADD CONSTRAINT posts_media_type_check
  CHECK (media_type IN ('text', 'image', 'audio', 'video', 'slideshow'));
