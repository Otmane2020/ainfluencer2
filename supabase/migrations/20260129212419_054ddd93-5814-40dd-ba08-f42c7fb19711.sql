-- Create generations table for tracking all generation jobs
CREATE TABLE public.generations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  
  -- Generation type and mode
  type TEXT NOT NULL DEFAULT 'video', -- image | video | reel | clipmotion | avatar
  video_mode TEXT DEFAULT 'standard', -- standard | clipmotion
  
  -- Status tracking
  status TEXT NOT NULL DEFAULT 'pending', -- pending | generating | processing | completed | failed
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  step TEXT DEFAULT 'initializing', -- initializing | script | image | video | voiceover | finalizing
  
  -- Task and result data
  external_task_id TEXT, -- CometAPI task ID or other provider ID
  prompt TEXT,
  script TEXT,
  media_url TEXT,
  thumbnail_url TEXT,
  audio_url TEXT,
  
  -- Metadata
  duration INTEGER DEFAULT 5,
  model TEXT,
  quality TEXT DEFAULT '720p',
  format TEXT DEFAULT 'reel',
  
  -- Cost tracking
  estimated_cost NUMERIC(10, 4) DEFAULT 0,
  actual_cost NUMERIC(10, 4),
  
  -- Error handling
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own generations" 
ON public.generations FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own generations" 
ON public.generations FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own generations" 
ON public.generations FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own generations" 
ON public.generations FOR DELETE 
USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER update_generations_updated_at
BEFORE UPDATE ON public.generations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for common queries
CREATE INDEX idx_generations_user_id ON public.generations(user_id);
CREATE INDEX idx_generations_status ON public.generations(status);
CREATE INDEX idx_generations_type ON public.generations(type);
CREATE INDEX idx_generations_created_at ON public.generations(created_at DESC);
CREATE INDEX idx_generations_external_task_id ON public.generations(external_task_id);

-- Enable realtime for live progress updates
ALTER PUBLICATION supabase_realtime ADD TABLE public.generations;