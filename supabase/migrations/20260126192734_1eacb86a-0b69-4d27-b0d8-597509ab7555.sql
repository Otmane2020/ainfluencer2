-- Ajouter colonnes LinkedIn et TikTok aux projets
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS linkedin_enabled boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS tiktok_enabled boolean DEFAULT false;