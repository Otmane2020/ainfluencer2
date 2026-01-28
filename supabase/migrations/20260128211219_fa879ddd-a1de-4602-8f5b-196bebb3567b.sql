-- First drop the existing foreign key if it exists (without CASCADE)
ALTER TABLE public.scheduled_posts 
DROP CONSTRAINT IF EXISTS scheduled_posts_campaign_id_fkey;

-- Add the foreign key constraint with ON DELETE CASCADE
-- This will automatically delete posts when their campaign is deleted
ALTER TABLE public.scheduled_posts
ADD CONSTRAINT scheduled_posts_campaign_id_fkey 
FOREIGN KEY (campaign_id) 
REFERENCES public.campaigns(id) 
ON DELETE CASCADE;