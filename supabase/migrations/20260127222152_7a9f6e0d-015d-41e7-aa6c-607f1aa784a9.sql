-- Add posting hour and timezone to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS posting_hour integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS timezone text DEFAULT 'Europe/Paris';

-- Add constraint for valid hour range
ALTER TABLE public.campaigns 
ADD CONSTRAINT campaigns_posting_hour_check CHECK (posting_hour >= 0 AND posting_hour <= 23);