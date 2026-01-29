-- Add column to store external platform post IDs for direct linking
ALTER TABLE public.scheduled_posts 
ADD COLUMN external_post_id text NULL;

-- Add comment for documentation
COMMENT ON COLUMN public.scheduled_posts.external_post_id IS 'The post ID returned by the platform (Facebook, Instagram, etc.) for direct linking';