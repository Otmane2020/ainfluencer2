-- Add check_after column for delayed status checking strategy
-- This enables the CRON-based check system instead of aggressive polling

ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS check_after TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- Add provider column to track which API to call for status
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'openai';

-- Add check_count to limit max status checks per generation
ALTER TABLE public.generations 
ADD COLUMN IF NOT EXISTS check_count INTEGER DEFAULT 0;

-- Index for efficient CRON queries
CREATE INDEX IF NOT EXISTS idx_generations_check_after 
ON public.generations (check_after) 
WHERE status = 'processing' AND check_after IS NOT NULL;