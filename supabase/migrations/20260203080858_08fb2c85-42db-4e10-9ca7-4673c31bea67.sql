-- Add project_id to youtube_connections for per-project YouTube accounts
ALTER TABLE public.youtube_connections 
ADD COLUMN project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE;

-- Drop the existing unique constraint on user_id
ALTER TABLE public.youtube_connections 
DROP CONSTRAINT IF EXISTS youtube_connections_user_id_key;

-- Create a new unique constraint on user_id + project_id
-- This allows multiple YouTube connections per user (one per project)
CREATE UNIQUE INDEX youtube_connections_user_project_idx 
ON public.youtube_connections(user_id, project_id) 
WHERE project_id IS NOT NULL;

-- Keep a separate unique constraint for global connections (project_id is NULL)
CREATE UNIQUE INDEX youtube_connections_user_global_idx 
ON public.youtube_connections(user_id) 
WHERE project_id IS NULL;

-- Update RLS policies to include project_id checks
DROP POLICY IF EXISTS "Users can view their own youtube connections" ON public.youtube_connections;
DROP POLICY IF EXISTS "Users can insert their own youtube connections" ON public.youtube_connections;
DROP POLICY IF EXISTS "Users can update their own youtube connections" ON public.youtube_connections;
DROP POLICY IF EXISTS "Users can delete their own youtube connections" ON public.youtube_connections;

CREATE POLICY "Users can view their own youtube connections" 
ON public.youtube_connections 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own youtube connections" 
ON public.youtube_connections 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own youtube connections" 
ON public.youtube_connections 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own youtube connections" 
ON public.youtube_connections 
FOR DELETE 
USING (auth.uid() = user_id);