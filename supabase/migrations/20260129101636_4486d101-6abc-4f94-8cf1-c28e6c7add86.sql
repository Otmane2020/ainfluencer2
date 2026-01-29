-- Create youtube_connections table for storing YouTube OAuth tokens
CREATE TABLE public.youtube_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    channel_id TEXT NOT NULL,
    channel_name TEXT NOT NULL,
    channel_picture_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Create tiktok_connections table for storing TikTok OAuth tokens
CREATE TABLE public.tiktok_connections (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    open_id TEXT NOT NULL,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    access_token TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id)
);

-- Enable RLS on both tables
ALTER TABLE public.youtube_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tiktok_connections ENABLE ROW LEVEL SECURITY;

-- YouTube connections RLS policies
CREATE POLICY "Users can view their own YouTube connection"
ON public.youtube_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own YouTube connection"
ON public.youtube_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own YouTube connection"
ON public.youtube_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own YouTube connection"
ON public.youtube_connections FOR DELETE
USING (auth.uid() = user_id);

-- TikTok connections RLS policies
CREATE POLICY "Users can view their own TikTok connection"
ON public.tiktok_connections FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own TikTok connection"
ON public.tiktok_connections FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own TikTok connection"
ON public.tiktok_connections FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own TikTok connection"
ON public.tiktok_connections FOR DELETE
USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_youtube_connections_updated_at
BEFORE UPDATE ON public.youtube_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiktok_connections_updated_at
BEFORE UPDATE ON public.tiktok_connections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();