-- Add brand options columns to campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS include_logo boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS include_url boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS include_avatar boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS include_text boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS overlay_text text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS image_as_reel boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS audio_category text DEFAULT 'upbeat',
ADD COLUMN IF NOT EXISTS clipmotion boolean DEFAULT false;