-- Create storage bucket for videos and avatars
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Public read access for media"
ON storage.objects FOR SELECT
USING (bucket_id = 'media');

-- Allow authenticated uploads
CREATE POLICY "Authenticated users can upload media"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'media');

-- Allow users to update their uploads
CREATE POLICY "Users can update their media"
ON storage.objects FOR UPDATE
USING (bucket_id = 'media');

-- Allow users to delete their media
CREATE POLICY "Users can delete their media"
ON storage.objects FOR DELETE
USING (bucket_id = 'media');