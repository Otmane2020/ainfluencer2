-- Add marketing_context column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS marketing_context JSONB DEFAULT '{}';

-- Update the rebuild_ai_context trigger function to include marketing context
CREATE OR REPLACE FUNCTION public.rebuild_ai_context()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.ai_context_summary := 
    'BRAND: ' || COALESCE(NEW.name, '') || E'\n' ||
    'DESCRIPTION: ' || COALESCE(NEW.description, '') || E'\n' ||
    'LANGUAGE: ' || COALESCE(NEW.detected_language, 'en') || E'\n' ||
    'WEBSITE: ' || COALESCE(NEW.url, '') || E'\n' ||
    'LOGO: ' || COALESCE(NEW.logo_url, '') || E'\n' ||
    'AVATAR: ' || COALESCE(NEW.avatar_url, '') || E'\n' ||
    'SCRAPED CONTENT: ' || COALESCE(LEFT(NEW.scraped_markdown, 1000), '') || E'\n' ||
    'MARKETING CONTEXT: ' || COALESCE(NEW.marketing_context::text, '{}');
  RETURN NEW;
END;
$function$;