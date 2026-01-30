-- Function to clean project name (remove SEO suffixes)
CREATE OR REPLACE FUNCTION public.clean_project_name()
RETURNS TRIGGER AS $$
BEGIN
  -- Extract brand name by splitting on common SEO separators
  -- Handles: "Brand – SEO Title", "Brand | Tagline", "Brand - Description"
  NEW.name := TRIM(
    SPLIT_PART(
      SPLIT_PART(
        SPLIT_PART(NEW.name, ' – ', 1),  -- em dash
        ' | ', 1),                         -- pipe
      ' - ', 1)                            -- hyphen with spaces
  );
  
  -- Ensure name is not empty and limit to 50 chars
  IF NEW.name = '' OR NEW.name IS NULL THEN
    NEW.name := 'Untitled Project';
  END IF;
  
  NEW.name := LEFT(NEW.name, 50);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger to clean names on insert and update
DROP TRIGGER IF EXISTS clean_project_name_trigger ON public.projects;
CREATE TRIGGER clean_project_name_trigger
BEFORE INSERT OR UPDATE OF name ON public.projects
FOR EACH ROW
EXECUTE FUNCTION public.clean_project_name();