-- Add posting_minute column to campaigns table
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS posting_minute integer DEFAULT 0;