-- Update default format from 'reel' to 'vertical' in campaigns table
ALTER TABLE public.campaigns ALTER COLUMN format SET DEFAULT 'vertical';

-- Update default format from 'reel' to 'vertical' in generations table  
ALTER TABLE public.generations ALTER COLUMN format SET DEFAULT 'vertical';

-- Update existing data to use 'vertical' instead of 'reel'
UPDATE public.campaigns SET format = 'vertical' WHERE format = 'reel';
UPDATE public.generations SET format = 'vertical' WHERE format = 'reel';