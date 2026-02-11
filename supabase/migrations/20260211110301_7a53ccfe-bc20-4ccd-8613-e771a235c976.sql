
-- Add project_id to tiktok_connections
ALTER TABLE public.tiktok_connections
ADD COLUMN project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE;

-- Create composite unique index (user can have one TikTok per project)
CREATE UNIQUE INDEX idx_tiktok_connections_user_project
ON public.tiktok_connections (user_id, project_id);
