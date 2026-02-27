
-- Cache table for HeyGen avatars with categories and scenes
CREATE TABLE public.heygen_avatars (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  avatar_id TEXT NOT NULL UNIQUE,
  avatar_name TEXT NOT NULL,
  gender TEXT,
  category TEXT DEFAULT 'all',
  preview_image_url TEXT,
  preview_video_url TEXT,
  scenes JSONB DEFAULT '[]'::jsonb,
  is_favorite BOOLEAN DEFAULT false,
  last_used_at TIMESTAMPTZ,
  cached_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID
);

-- Index for fast lookups
CREATE INDEX idx_heygen_avatars_category ON public.heygen_avatars (category);
CREATE INDEX idx_heygen_avatars_user_id ON public.heygen_avatars (user_id);

-- Enable RLS
ALTER TABLE public.heygen_avatars ENABLE ROW LEVEL SECURITY;

-- Public avatars (no user_id) are readable by all authenticated users
CREATE POLICY "Authenticated users can read public avatars"
ON public.heygen_avatars FOR SELECT
USING (user_id IS NULL AND auth.role() = 'authenticated');

-- Users can read their own favorites/recently used
CREATE POLICY "Users can read their own avatars"
ON public.heygen_avatars FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own avatar records
CREATE POLICY "Users can insert their own avatars"
ON public.heygen_avatars FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own avatar records
CREATE POLICY "Users can update their own avatars"
ON public.heygen_avatars FOR UPDATE
USING (auth.uid() = user_id);

-- Service role can manage all (for edge function caching)
CREATE POLICY "Service role full access"
ON public.heygen_avatars FOR ALL
USING (auth.role() = 'service_role');
