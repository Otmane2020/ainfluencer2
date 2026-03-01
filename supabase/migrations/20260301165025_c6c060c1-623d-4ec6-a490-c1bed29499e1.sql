
-- Drop existing FK and re-add with CASCADE
ALTER TABLE scheduled_posts
  DROP CONSTRAINT IF EXISTS scheduled_posts_campaign_id_fkey;

ALTER TABLE scheduled_posts
  ADD CONSTRAINT scheduled_posts_campaign_id_fkey
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE;
