
-- ═══════════════════════════════════════════
-- 1. PLATFORMS
-- ═══════════════════════════════════════════
CREATE TABLE public.platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  icon text,
  color text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.platforms ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platforms are readable by everyone" ON public.platforms FOR SELECT USING (true);

-- ═══════════════════════════════════════════
-- 2. PLATFORM_FORMATS
-- ═══════════════════════════════════════════
CREATE TABLE public.platform_formats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.platforms(id) ON DELETE CASCADE,
  format_slug text NOT NULL,
  label text NOT NULL,
  content_type text NOT NULL CHECK (content_type IN ('video','image','text','carousel','live','article')),
  aspect_ratio text,
  recommended_resolution text,
  max_duration_sec int,
  max_text_chars int,
  recommended_frequency text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(platform_id, format_slug)
);
ALTER TABLE public.platform_formats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Platform formats are readable by everyone" ON public.platform_formats FOR SELECT USING (true);

-- ═══════════════════════════════════════════
-- 3. AI_GENERATION_CONFIGS (prompt templates per platform/format)
-- ═══════════════════════════════════════════
CREATE TABLE public.ai_generation_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_format_id uuid NOT NULL REFERENCES public.platform_formats(id) ON DELETE CASCADE,
  generation_type text NOT NULL CHECK (generation_type IN ('video_prompt','post_caption','hook','hashtags','script')),
  system_prompt text NOT NULL,
  user_prompt_template text NOT NULL,
  model text DEFAULT 'claude-sonnet-4-20250514',
  max_tokens int DEFAULT 1000,
  temperature numeric DEFAULT 0.7,
  variables jsonb DEFAULT '["brand","topic","tone","cta","duration"]'::jsonb,
  language text DEFAULT 'en',
  is_active boolean DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.ai_generation_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "AI configs are readable by everyone" ON public.ai_generation_configs FOR SELECT USING (true);

-- ═══════════════════════════════════════════
-- 4. CLAUDE_USAGE_LOG
-- ═══════════════════════════════════════════
CREATE TABLE public.claude_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  platform_slug text,
  format_slug text,
  generation_type text,
  tokens_input int,
  tokens_output int,
  cost_usd numeric(8,6),
  generated_text text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.claude_usage_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own claude usage" ON public.claude_usage_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own claude usage" ON public.claude_usage_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- 5. USER_BUDGETS
-- ═══════════════════════════════════════════
CREATE TABLE public.user_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  monthly_budget_usd numeric(10,2) DEFAULT 20.00,
  current_spend_usd numeric(10,2) DEFAULT 0.00,
  alert_threshold_pct int DEFAULT 80,
  period_start timestamptz DEFAULT date_trunc('month', now()),
  period_end timestamptz DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.user_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own budget" ON public.user_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own budget" ON public.user_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own budget" ON public.user_budgets FOR UPDATE USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- 6. GENERATED_PROMPTS (history of all AI generations)
-- ═══════════════════════════════════════════
CREATE TABLE public.generated_prompts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL,
  ai_config_id uuid REFERENCES public.ai_generation_configs(id) ON DELETE SET NULL,
  prompt_type text,
  filled_prompt text,
  ai_output text,
  platform_slug text,
  format_slug text,
  variables jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.generated_prompts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own prompts" ON public.generated_prompts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own prompts" ON public.generated_prompts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ═══════════════════════════════════════════
-- 7. Add platform_format_id to campaigns
-- ═══════════════════════════════════════════
ALTER TABLE public.campaigns ADD COLUMN IF NOT EXISTS platform_format_id uuid REFERENCES public.platform_formats(id) ON DELETE SET NULL;

-- ═══════════════════════════════════════════
-- 8. DB FUNCTION: get_ai_config
-- ═══════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.get_ai_config(
  p_platform text, p_format text, p_type text
)
RETURNS TABLE (
  config_id uuid, system_prompt text, user_prompt_template text,
  model text, max_tokens int, temperature numeric, variables jsonb
) LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT 
    c.id, c.system_prompt, c.user_prompt_template,
    c.model, c.max_tokens, c.temperature, c.variables
  FROM ai_generation_configs c
  JOIN platform_formats pf ON pf.id = c.platform_format_id
  JOIN platforms p ON p.id = pf.platform_id
  WHERE p.slug = p_platform
    AND pf.format_slug = p_format
    AND c.generation_type = p_type
    AND c.is_active = true
  LIMIT 1;
$$;

-- ═══════════════════════════════════════════
-- 9. SEED: Platforms
-- ═══════════════════════════════════════════
INSERT INTO public.platforms (slug, name, icon, color) VALUES
  ('instagram', 'Instagram', 'instagram', '#E4405F'),
  ('facebook', 'Facebook', 'facebook', '#1877F2'),
  ('tiktok', 'TikTok', 'tiktok', '#000000'),
  ('linkedin', 'LinkedIn', 'linkedin', '#0A66C2'),
  ('youtube', 'YouTube', 'youtube', '#FF0000');

-- ═══════════════════════════════════════════
-- 10. SEED: Platform Formats
-- ═══════════════════════════════════════════
-- INSTAGRAM
INSERT INTO public.platform_formats (platform_id, format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
SELECT p.id, v.format_slug, v.label, v.content_type, v.aspect_ratio, v.recommended_resolution, v.max_duration_sec, v.max_text_chars, v.recommended_frequency, v.notes
FROM public.platforms p,
(VALUES
  ('reel', 'Reel', 'video', '9:16', '1080x1920', 90, 2200, '5-7x/week', 'Hook in first 3s, subtitles required'),
  ('story', 'Story', 'video', '9:16', '1080x1920', 15, 500, '1-3x/day', 'Stickers, polls, interactive'),
  ('feed', 'Feed Post', 'video', '1:1', '1080x1080', 60, 2200, '3-5x/week', 'Carousel max 10 slides'),
  ('carousel', 'Carousel', 'carousel', '1:1', '1080x1080', NULL, 2200, '2-3x/week', 'First slide = visual hook')
) AS v(format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
WHERE p.slug = 'instagram';

-- FACEBOOK
INSERT INTO public.platform_formats (platform_id, format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
SELECT p.id, v.format_slug, v.label, v.content_type, v.aspect_ratio, v.recommended_resolution, v.max_duration_sec, v.max_text_chars, v.recommended_frequency, v.notes
FROM public.platforms p,
(VALUES
  ('reel', 'Reel', 'video', '9:16', '1080x1920', 90, 2200, '3-5x/week', 'Subtitles required'),
  ('story', 'Story', 'video', '9:16', '1080x1920', 20, 500, '1-2x/day', 'CTA link'),
  ('feed', 'Feed Post', 'video', '4:5', '1080x1350', 240, 5000, '3-5x/week', 'Native post > link post'),
  ('live', 'Live', 'live', '16:9', '1280x720', NULL, 5000, '1x/week', 'Announce 48h before')
) AS v(format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
WHERE p.slug = 'facebook';

-- TIKTOK
INSERT INTO public.platform_formats (platform_id, format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
SELECT p.id, v.format_slug, v.label, v.content_type, v.aspect_ratio, v.recommended_resolution, v.max_duration_sec, v.max_text_chars, v.recommended_frequency, v.notes
FROM public.platforms p,
(VALUES
  ('short', 'Short Video', 'video', '9:16', '1080x1920', 60, 150, '1-4x/day', '7-15s best completion rate'),
  ('long', 'Long Video', 'video', '9:16', '1080x1920', 600, 300, '3x/week', 'Storytelling format'),
  ('carousel', 'Carousel', 'carousel', '9:16', '1080x1920', NULL, 300, '2x/week', 'Educational swipeable')
) AS v(format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
WHERE p.slug = 'tiktok';

-- LINKEDIN
INSERT INTO public.platform_formats (platform_id, format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
SELECT p.id, v.format_slug, v.label, v.content_type, v.aspect_ratio, v.recommended_resolution, v.max_duration_sec, v.max_text_chars, v.recommended_frequency, v.notes
FROM public.platforms p,
(VALUES
  ('text_post', 'Text Post', 'text', NULL, NULL, NULL, 3000, '3-5x/week', 'Hook in first 2 lines before see more'),
  ('video', 'Native Video', 'video', '1:1', '1080x1080', 600, 3000, '2x/week', 'Silent-friendly with subtitles'),
  ('carousel_pdf', 'Carousel PDF', 'carousel', '1:1', '1080x1080', NULL, 3000, '1-2x/week', 'High organic reach'),
  ('article', 'Article', 'article', NULL, NULL, NULL, 10000, '1x/week', 'LinkedIn SEO 800-2000 words')
) AS v(format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
WHERE p.slug = 'linkedin';

-- YOUTUBE
INSERT INTO public.platform_formats (platform_id, format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
SELECT p.id, v.format_slug, v.label, v.content_type, v.aspect_ratio, v.recommended_resolution, v.max_duration_sec, v.max_text_chars, v.recommended_frequency, v.notes
FROM public.platforms p,
(VALUES
  ('short', 'Short', 'video', '9:16', '1080x1920', 60, 100, '3-5x/week', 'Hook 0-3s, loop optimized'),
  ('long', 'Long Video', 'video', '16:9', '1920x1080', NULL, 5000, '1-2x/week', 'SEO title + chapters'),
  ('premiere', 'Premiere', 'video', '16:9', '1920x1080', NULL, 5000, '1x/week', 'Live chat anticipation')
) AS v(format_slug, label, content_type, aspect_ratio, recommended_resolution, max_duration_sec, max_text_chars, recommended_frequency, notes)
WHERE p.slug = 'youtube';
