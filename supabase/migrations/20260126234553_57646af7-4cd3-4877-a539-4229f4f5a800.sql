-- Create table for secure Meta OAuth connections
CREATE TABLE public.meta_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  fb_user_id TEXT NOT NULL,
  fb_user_name TEXT NOT NULL,
  fb_picture_url TEXT,
  instagram_id TEXT,
  instagram_username TEXT,
  page_id TEXT,
  page_access_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE public.meta_connections ENABLE ROW LEVEL SECURITY;

-- Users can only see their own connections
CREATE POLICY "Users can view their own Meta connection"
ON public.meta_connections FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own connection
CREATE POLICY "Users can create their own Meta connection"
ON public.meta_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own connection
CREATE POLICY "Users can update their own Meta connection"
ON public.meta_connections FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own connection
CREATE POLICY "Users can delete their own Meta connection"
ON public.meta_connections FOR DELETE
USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE TRIGGER update_meta_connections_updated_at
BEFORE UPDATE ON public.meta_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();