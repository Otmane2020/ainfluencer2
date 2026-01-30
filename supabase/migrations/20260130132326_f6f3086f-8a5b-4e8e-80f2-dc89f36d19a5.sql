-- Add youtube_enabled column to projects table
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS youtube_enabled boolean DEFAULT false;