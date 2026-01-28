-- Add AI context fields to projects table
ALTER TABLE public.projects
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS ai_context_summary text;

-- Create a function to rebuild AI context summary from project fields
CREATE OR REPLACE FUNCTION public.rebuild_ai_context()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ai_context_summary := COALESCE(NEW.name, '') || ' | ' ||
    COALESCE(NEW.description, '') || ' | ' ||
    'Language: ' || COALESCE(NEW.detected_language, 'en') || ' | ' ||
    'URL: ' || COALESCE(NEW.url, '') || ' | ' ||
    'Logo: ' || COALESCE(NEW.logo_url, '') || ' | ' ||
    'Avatar: ' || COALESCE(NEW.avatar_url, '');
  RETURN NEW;
END;
$$;

-- Create trigger to auto-rebuild AI context on project updates
DROP TRIGGER IF EXISTS update_ai_context_trigger ON public.projects;
CREATE TRIGGER update_ai_context_trigger
BEFORE INSERT OR UPDATE ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.rebuild_ai_context();

-- Update existing projects to generate their AI context
UPDATE public.projects SET updated_at = now();