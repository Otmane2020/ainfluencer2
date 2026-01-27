-- Add language column to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS detected_language TEXT DEFAULT 'en';

-- Add comment for clarity
COMMENT ON COLUMN public.projects.detected_language IS 'Language detected from Firecrawl scraping (en, fr, es, de, etc.)';