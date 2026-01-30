-- Add scraped_data column to projects table to store Firecrawl data
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS scraped_data jsonb DEFAULT NULL;

-- Add scraped_markdown column for the markdown content summary
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS scraped_markdown text DEFAULT NULL;

-- Add scraped_at timestamp to track when the data was scraped
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS scraped_at timestamp with time zone DEFAULT NULL;

-- Update the rebuild_ai_context trigger to include scraped data
CREATE OR REPLACE FUNCTION public.rebuild_ai_context()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ai_context_summary := COALESCE(NEW.name, '') || ' | ' ||
    COALESCE(NEW.description, '') || ' | ' ||
    'Language: ' || COALESCE(NEW.detected_language, 'en') || ' | ' ||
    'URL: ' || COALESCE(NEW.url, '') || ' | ' ||
    'Logo: ' || COALESCE(NEW.logo_url, '') || ' | ' ||
    'Avatar: ' || COALESCE(NEW.avatar_url, '') || ' | ' ||
    'Scraped: ' || COALESCE(LEFT(NEW.scraped_markdown, 500), '');
  RETURN NEW;
END;
$function$;

-- Add comment for documentation
COMMENT ON COLUMN public.projects.scraped_data IS 'JSON data from Firecrawl scrape including branding, colors, services';
COMMENT ON COLUMN public.projects.scraped_markdown IS 'Markdown content summary from website scrape';
COMMENT ON COLUMN public.projects.scraped_at IS 'Timestamp of last website scrape';