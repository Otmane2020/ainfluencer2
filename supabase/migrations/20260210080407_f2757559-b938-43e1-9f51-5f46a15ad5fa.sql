
-- Add per-project Meta page selection columns
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS meta_page_id TEXT,
ADD COLUMN IF NOT EXISTS meta_instagram_id TEXT,
ADD COLUMN IF NOT EXISTS meta_instagram_username TEXT;
