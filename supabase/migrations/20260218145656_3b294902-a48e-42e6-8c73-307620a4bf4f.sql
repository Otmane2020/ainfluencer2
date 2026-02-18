-- Add per-campaign platform selection columns (default to true so existing campaigns target all platforms)
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS instagram_enabled boolean DEFAULT true;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS facebook_enabled boolean DEFAULT true;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS linkedin_enabled boolean DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS tiktok_enabled boolean DEFAULT false;
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS youtube_enabled boolean DEFAULT false;