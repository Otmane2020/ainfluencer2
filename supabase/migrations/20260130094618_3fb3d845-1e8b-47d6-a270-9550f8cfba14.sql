-- Add quality tiers and per-day volume columns to campaigns table
ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS video_quality text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS image_quality text DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS estimated_cost integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS videos_per_day integer DEFAULT 1,
  ADD COLUMN IF NOT EXISTS images_per_day integer DEFAULT 3;

-- Add comment for clarity
COMMENT ON COLUMN public.campaigns.video_quality IS 'Quality tier: standard, pro, cinema';
COMMENT ON COLUMN public.campaigns.image_quality IS 'Quality tier: standard, pro, cinema';
COMMENT ON COLUMN public.campaigns.estimated_cost IS 'Total credits required for this campaign';
COMMENT ON COLUMN public.campaigns.videos_per_day IS 'Number of videos to generate per day';
COMMENT ON COLUMN public.campaigns.images_per_day IS 'Number of images to generate per day';