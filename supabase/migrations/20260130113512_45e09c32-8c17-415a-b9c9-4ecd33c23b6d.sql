-- Create linkedin_connections table for storing LinkedIn OAuth tokens
CREATE TABLE public.linkedin_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  linkedin_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.linkedin_connections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own LinkedIn connection"
  ON public.linkedin_connections FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own LinkedIn connection"
  ON public.linkedin_connections FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own LinkedIn connection"
  ON public.linkedin_connections FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own LinkedIn connection"
  ON public.linkedin_connections FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_linkedin_connections_updated_at
  BEFORE UPDATE ON public.linkedin_connections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();