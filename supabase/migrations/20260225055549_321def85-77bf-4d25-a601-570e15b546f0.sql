
-- API pricing reference table
CREATE TABLE public.api_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL,
  endpoint text NOT NULL,
  avatar_type text,
  quality text,
  cost_per_min numeric(8,4),
  cost_per_call numeric(8,4),
  billing_unit text,
  notes text,
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.api_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "API pricing is readable by everyone"
  ON public.api_pricing FOR SELECT USING (true);

-- Estimate HeyGen cost function
CREATE OR REPLACE FUNCTION public.estimate_heygen_cost(
  p_avatar_type text,
  p_duration_sec int,
  p_quality text DEFAULT 'iii'
)
RETURNS jsonb LANGUAGE plpgsql STABLE SET search_path TO 'public' AS $$
DECLARE
  v_rate numeric;
  v_duration_min numeric;
  v_cost numeric;
BEGIN
  SELECT cost_per_min INTO v_rate
  FROM api_pricing
  WHERE provider = 'heygen'
    AND endpoint = 'video_generate'
    AND avatar_type = p_avatar_type
    AND (quality = p_quality OR quality IS NULL)
  LIMIT 1;

  IF v_rate IS NULL THEN
    RETURN jsonb_build_object('error', 'Unknown avatar type');
  END IF;

  v_duration_min := p_duration_sec::numeric / 60.0;
  v_cost := v_duration_min * v_rate;

  RETURN jsonb_build_object(
    'avatar_type', p_avatar_type,
    'duration_sec', p_duration_sec,
    'duration_min', round(v_duration_min, 3),
    'rate_per_min', v_rate,
    'estimated_cost_usd', round(v_cost, 4),
    'videos_possible_with_20usd', floor(20.0 / NULLIF(v_cost, 0))
  );
END;
$$;
