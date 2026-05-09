
-- Mobileads public trials: 1 submission per IP
CREATE TABLE public.mobileads_trials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL UNIQUE,
  product_url text NOT NULL,
  result_images jsonb DEFAULT '[]'::jsonb,
  product_title text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

CREATE INDEX idx_mobileads_trials_ip_hash ON public.mobileads_trials(ip_hash);
CREATE INDEX idx_mobileads_trials_created_at ON public.mobileads_trials(created_at DESC);

ALTER TABLE public.mobileads_trials ENABLE ROW LEVEL SECURITY;

-- Service role only (edge function manages everything)
CREATE POLICY "Service role full access trials"
ON public.mobileads_trials FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');
