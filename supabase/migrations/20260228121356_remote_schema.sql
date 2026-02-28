create extension if not exists "pg_cron" with schema "pg_catalog";

drop extension if exists "pg_net";

create extension if not exists "pg_net" with schema "public";


  create table "public"."ai_generation_configs" (
    "id" uuid not null default gen_random_uuid(),
    "platform_format_id" uuid not null,
    "generation_type" text not null,
    "system_prompt" text not null,
    "user_prompt_template" text not null,
    "model" text default 'claude-sonnet-4-20250514'::text,
    "max_tokens" integer default 1000,
    "temperature" numeric default 0.7,
    "variables" jsonb default '["brand", "topic", "tone", "cta", "duration"]'::jsonb,
    "language" text default 'en'::text,
    "is_active" boolean default true,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ai_generation_configs" enable row level security;


  create table "public"."api_pricing" (
    "id" uuid not null default gen_random_uuid(),
    "provider" text not null,
    "endpoint" text not null,
    "avatar_type" text,
    "quality" text,
    "cost_per_min" numeric(8,4),
    "cost_per_call" numeric(8,4),
    "billing_unit" text,
    "notes" text,
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."api_pricing" enable row level security;


  create table "public"."campaigns" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "project_id" uuid not null,
    "name" text not null,
    "campaign_type" text not null,
    "status" text not null default 'draft'::text,
    "videos_per_month" integer default 4,
    "images_per_month" integer default 12,
    "posts_per_week" integer default 3,
    "format" text default 'vertical'::text,
    "subject" text,
    "tone" text,
    "style" text,
    "ai_context" text,
    "total_generated" integer default 0,
    "total_published" integer default 0,
    "starts_at" timestamp with time zone default now(),
    "ends_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "posting_hour" integer default 10,
    "timezone" text default 'Europe/Paris'::text,
    "video_quality" text default 'standard'::text,
    "image_quality" text default 'standard'::text,
    "estimated_cost" integer default 0,
    "videos_per_day" integer default 1,
    "images_per_day" integer default 3,
    "include_logo" boolean default false,
    "include_url" boolean default false,
    "include_avatar" boolean default false,
    "include_text" boolean default false,
    "overlay_text" text,
    "image_as_reel" boolean default false,
    "audio_category" text default 'upbeat'::text,
    "clipmotion" boolean default false,
    "posting_minute" integer default 0,
    "instagram_enabled" boolean default true,
    "facebook_enabled" boolean default true,
    "linkedin_enabled" boolean default false,
    "tiktok_enabled" boolean default false,
    "youtube_enabled" boolean default false,
    "platform_format_id" uuid
      );


alter table "public"."campaigns" enable row level security;


  create table "public"."claude_usage_log" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "campaign_id" uuid,
    "platform_slug" text,
    "format_slug" text,
    "generation_type" text,
    "tokens_input" integer,
    "tokens_output" integer,
    "cost_usd" numeric(8,6),
    "generated_text" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."claude_usage_log" enable row level security;


  create table "public"."credit_transactions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "amount" integer not null,
    "type" text not null,
    "description" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."credit_transactions" enable row level security;


  create table "public"."credits" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "balance" integer not null default 10,
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."credits" enable row level security;


  create table "public"."generated_prompts" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "campaign_id" uuid,
    "ai_config_id" uuid,
    "prompt_type" text,
    "filled_prompt" text,
    "ai_output" text,
    "platform_slug" text,
    "format_slug" text,
    "variables" jsonb,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."generated_prompts" enable row level security;


  create table "public"."generations" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "project_id" uuid,
    "campaign_id" uuid,
    "type" text not null default 'video'::text,
    "video_mode" text default 'standard'::text,
    "status" text not null default 'pending'::text,
    "progress" integer not null default 0,
    "step" text default 'initializing'::text,
    "external_task_id" text,
    "prompt" text,
    "script" text,
    "media_url" text,
    "thumbnail_url" text,
    "audio_url" text,
    "duration" integer default 5,
    "model" text,
    "quality" text default '720p'::text,
    "format" text default 'vertical'::text,
    "estimated_cost" numeric(10,4) default 0,
    "actual_cost" numeric(10,4),
    "error_message" text,
    "retry_count" integer default 0,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "check_after" timestamp with time zone,
    "provider" text default 'openai'::text,
    "check_count" integer default 0
      );


alter table "public"."generations" enable row level security;


  create table "public"."heygen_avatars" (
    "id" uuid not null default gen_random_uuid(),
    "avatar_id" text not null,
    "avatar_name" text not null,
    "gender" text,
    "category" text default 'all'::text,
    "preview_image_url" text,
    "preview_video_url" text,
    "scenes" jsonb default '[]'::jsonb,
    "is_favorite" boolean default false,
    "last_used_at" timestamp with time zone,
    "cached_at" timestamp with time zone not null default now(),
    "user_id" uuid
      );


alter table "public"."heygen_avatars" enable row level security;


  create table "public"."linkedin_connections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "linkedin_id" text not null,
    "display_name" text not null,
    "avatar_url" text,
    "access_token" text not null,
    "refresh_token" text,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."linkedin_connections" enable row level security;


  create table "public"."meta_connections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "access_token" text not null,
    "expires_at" timestamp with time zone not null,
    "fb_user_id" text not null,
    "fb_user_name" text not null,
    "fb_picture_url" text,
    "instagram_id" text,
    "instagram_username" text,
    "page_id" text,
    "page_access_token" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."meta_connections" enable row level security;


  create table "public"."platform_formats" (
    "id" uuid not null default gen_random_uuid(),
    "platform_id" uuid not null,
    "format_slug" text not null,
    "label" text not null,
    "content_type" text not null,
    "aspect_ratio" text,
    "recommended_resolution" text,
    "max_duration_sec" integer,
    "max_text_chars" integer,
    "recommended_frequency" text,
    "notes" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."platform_formats" enable row level security;


  create table "public"."platforms" (
    "id" uuid not null default gen_random_uuid(),
    "slug" text not null,
    "name" text not null,
    "icon" text,
    "color" text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."platforms" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "display_name" text,
    "avatar_url" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."projects" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "name" text not null,
    "description" text,
    "url" text,
    "logo_url" text,
    "theme_color" text default '#F97316'::text,
    "instagram_enabled" boolean default true,
    "facebook_enabled" boolean default true,
    "posts_per_week" integer default 3,
    "automation_mode" text default 'semi_auto'::text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "linkedin_enabled" boolean default false,
    "tiktok_enabled" boolean default false,
    "detected_language" text default 'en'::text,
    "avatar_url" text,
    "ai_context_summary" text,
    "youtube_enabled" boolean default false,
    "scraped_data" jsonb,
    "scraped_markdown" text,
    "scraped_at" timestamp with time zone,
    "marketing_context" jsonb default '{}'::jsonb,
    "meta_page_id" text,
    "meta_instagram_id" text,
    "meta_instagram_username" text,
    "linkedin_page_url" text
      );


alter table "public"."projects" enable row level security;


  create table "public"."scheduled_posts" (
    "id" uuid not null default gen_random_uuid(),
    "project_id" uuid not null,
    "user_id" uuid not null,
    "content_type" text not null,
    "text_content" text,
    "media_url" text,
    "thumbnail_url" text,
    "scheduled_for" timestamp with time zone not null,
    "platforms" text[] default ARRAY['instagram'::text, 'facebook'::text],
    "status" text default 'draft'::text,
    "ai_prompt" text,
    "published_at" timestamp with time zone,
    "error_message" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "campaign_id" uuid,
    "external_post_id" text
      );


alter table "public"."scheduled_posts" enable row level security;


  create table "public"."subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "plan_id" text not null default 'starter'::text,
    "status" text not null default 'active'::text,
    "started_at" timestamp with time zone not null default now(),
    "renews_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "stripe_customer_id" text,
    "stripe_subscription_id" text
      );


alter table "public"."subscriptions" enable row level security;


  create table "public"."tiktok_connections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "open_id" text not null,
    "display_name" text not null,
    "avatar_url" text,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "project_id" uuid
      );


alter table "public"."tiktok_connections" enable row level security;


  create table "public"."user_budgets" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "monthly_budget_usd" numeric(10,2) default 20.00,
    "current_spend_usd" numeric(10,2) default 0.00,
    "alert_threshold_pct" integer default 80,
    "period_start" timestamp with time zone default date_trunc('month'::text, now()),
    "period_end" timestamp with time zone default (date_trunc('month'::text, now()) + '1 mon'::interval),
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."user_budgets" enable row level security;


  create table "public"."youtube_connections" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "channel_id" text not null,
    "channel_name" text not null,
    "channel_picture_url" text,
    "access_token" text not null,
    "refresh_token" text not null,
    "expires_at" timestamp with time zone not null,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "project_id" uuid
      );


alter table "public"."youtube_connections" enable row level security;

CREATE UNIQUE INDEX ai_generation_configs_pkey ON public.ai_generation_configs USING btree (id);

CREATE UNIQUE INDEX api_pricing_pkey ON public.api_pricing USING btree (id);

CREATE UNIQUE INDEX campaigns_pkey ON public.campaigns USING btree (id);

CREATE UNIQUE INDEX claude_usage_log_pkey ON public.claude_usage_log USING btree (id);

CREATE UNIQUE INDEX credit_transactions_pkey ON public.credit_transactions USING btree (id);

CREATE UNIQUE INDEX credits_pkey ON public.credits USING btree (id);

CREATE UNIQUE INDEX generated_prompts_pkey ON public.generated_prompts USING btree (id);

CREATE UNIQUE INDEX generations_pkey ON public.generations USING btree (id);

CREATE UNIQUE INDEX heygen_avatars_avatar_id_key ON public.heygen_avatars USING btree (avatar_id);

CREATE UNIQUE INDEX heygen_avatars_pkey ON public.heygen_avatars USING btree (id);

CREATE INDEX idx_generations_check_after ON public.generations USING btree (check_after) WHERE ((status = 'processing'::text) AND (check_after IS NOT NULL));

CREATE INDEX idx_generations_created_at ON public.generations USING btree (created_at DESC);

CREATE INDEX idx_generations_external_task_id ON public.generations USING btree (external_task_id);

CREATE INDEX idx_generations_status ON public.generations USING btree (status);

CREATE INDEX idx_generations_type ON public.generations USING btree (type);

CREATE INDEX idx_generations_user_id ON public.generations USING btree (user_id);

CREATE INDEX idx_heygen_avatars_category ON public.heygen_avatars USING btree (category);

CREATE INDEX idx_heygen_avatars_user_id ON public.heygen_avatars USING btree (user_id);

CREATE INDEX idx_projects_user_id ON public.projects USING btree (user_id);

CREATE INDEX idx_scheduled_posts_project_id ON public.scheduled_posts USING btree (project_id);

CREATE INDEX idx_scheduled_posts_scheduled_for ON public.scheduled_posts USING btree (scheduled_for);

CREATE INDEX idx_scheduled_posts_status ON public.scheduled_posts USING btree (status);

CREATE INDEX idx_scheduled_posts_user_id ON public.scheduled_posts USING btree (user_id);

CREATE INDEX idx_subscriptions_stripe_customer_id ON public.subscriptions USING btree (stripe_customer_id);

CREATE INDEX idx_subscriptions_stripe_subscription_id ON public.subscriptions USING btree (stripe_subscription_id);

CREATE UNIQUE INDEX idx_tiktok_connections_user_project ON public.tiktok_connections USING btree (user_id, project_id);

CREATE UNIQUE INDEX linkedin_connections_pkey ON public.linkedin_connections USING btree (id);

CREATE UNIQUE INDEX linkedin_connections_user_id_key ON public.linkedin_connections USING btree (user_id);

CREATE UNIQUE INDEX meta_connections_pkey ON public.meta_connections USING btree (id);

CREATE UNIQUE INDEX meta_connections_user_id_key ON public.meta_connections USING btree (user_id);

CREATE UNIQUE INDEX platform_formats_pkey ON public.platform_formats USING btree (id);

CREATE UNIQUE INDEX platform_formats_platform_id_format_slug_key ON public.platform_formats USING btree (platform_id, format_slug);

CREATE UNIQUE INDEX platforms_pkey ON public.platforms USING btree (id);

CREATE UNIQUE INDEX platforms_slug_key ON public.platforms USING btree (slug);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX profiles_user_id_key ON public.profiles USING btree (user_id);

CREATE UNIQUE INDEX projects_pkey ON public.projects USING btree (id);

CREATE UNIQUE INDEX scheduled_posts_pkey ON public.scheduled_posts USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON public.subscriptions USING btree (id);

CREATE UNIQUE INDEX tiktok_connections_pkey ON public.tiktok_connections USING btree (id);

CREATE UNIQUE INDEX tiktok_connections_user_id_key ON public.tiktok_connections USING btree (user_id);

CREATE UNIQUE INDEX unique_user_credits ON public.credits USING btree (user_id);

CREATE UNIQUE INDEX unique_user_subscription ON public.subscriptions USING btree (user_id);

CREATE UNIQUE INDEX user_budgets_pkey ON public.user_budgets USING btree (id);

CREATE UNIQUE INDEX user_budgets_user_id_key ON public.user_budgets USING btree (user_id);

CREATE UNIQUE INDEX youtube_connections_pkey ON public.youtube_connections USING btree (id);

CREATE UNIQUE INDEX youtube_connections_user_global_idx ON public.youtube_connections USING btree (user_id) WHERE (project_id IS NULL);

CREATE UNIQUE INDEX youtube_connections_user_project_idx ON public.youtube_connections USING btree (user_id, project_id) WHERE (project_id IS NOT NULL);

alter table "public"."ai_generation_configs" add constraint "ai_generation_configs_pkey" PRIMARY KEY using index "ai_generation_configs_pkey";

alter table "public"."api_pricing" add constraint "api_pricing_pkey" PRIMARY KEY using index "api_pricing_pkey";

alter table "public"."campaigns" add constraint "campaigns_pkey" PRIMARY KEY using index "campaigns_pkey";

alter table "public"."claude_usage_log" add constraint "claude_usage_log_pkey" PRIMARY KEY using index "claude_usage_log_pkey";

alter table "public"."credit_transactions" add constraint "credit_transactions_pkey" PRIMARY KEY using index "credit_transactions_pkey";

alter table "public"."credits" add constraint "credits_pkey" PRIMARY KEY using index "credits_pkey";

alter table "public"."generated_prompts" add constraint "generated_prompts_pkey" PRIMARY KEY using index "generated_prompts_pkey";

alter table "public"."generations" add constraint "generations_pkey" PRIMARY KEY using index "generations_pkey";

alter table "public"."heygen_avatars" add constraint "heygen_avatars_pkey" PRIMARY KEY using index "heygen_avatars_pkey";

alter table "public"."linkedin_connections" add constraint "linkedin_connections_pkey" PRIMARY KEY using index "linkedin_connections_pkey";

alter table "public"."meta_connections" add constraint "meta_connections_pkey" PRIMARY KEY using index "meta_connections_pkey";

alter table "public"."platform_formats" add constraint "platform_formats_pkey" PRIMARY KEY using index "platform_formats_pkey";

alter table "public"."platforms" add constraint "platforms_pkey" PRIMARY KEY using index "platforms_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."projects" add constraint "projects_pkey" PRIMARY KEY using index "projects_pkey";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_pkey" PRIMARY KEY using index "scheduled_posts_pkey";

alter table "public"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "public"."tiktok_connections" add constraint "tiktok_connections_pkey" PRIMARY KEY using index "tiktok_connections_pkey";

alter table "public"."user_budgets" add constraint "user_budgets_pkey" PRIMARY KEY using index "user_budgets_pkey";

alter table "public"."youtube_connections" add constraint "youtube_connections_pkey" PRIMARY KEY using index "youtube_connections_pkey";

alter table "public"."ai_generation_configs" add constraint "ai_generation_configs_generation_type_check" CHECK ((generation_type = ANY (ARRAY['video_prompt'::text, 'post_caption'::text, 'hook'::text, 'hashtags'::text, 'script'::text]))) not valid;

alter table "public"."ai_generation_configs" validate constraint "ai_generation_configs_generation_type_check";

alter table "public"."ai_generation_configs" add constraint "ai_generation_configs_platform_format_id_fkey" FOREIGN KEY (platform_format_id) REFERENCES public.platform_formats(id) ON DELETE CASCADE not valid;

alter table "public"."ai_generation_configs" validate constraint "ai_generation_configs_platform_format_id_fkey";

alter table "public"."campaigns" add constraint "campaigns_campaign_type_check" CHECK ((campaign_type = ANY (ARRAY['video'::text, 'image'::text, 'mixed'::text, 'linkedin_story'::text]))) not valid;

alter table "public"."campaigns" validate constraint "campaigns_campaign_type_check";

alter table "public"."campaigns" add constraint "campaigns_format_check" CHECK ((format = ANY (ARRAY['reel'::text, 'story'::text, 'landscape'::text, 'mix'::text]))) not valid;

alter table "public"."campaigns" validate constraint "campaigns_format_check";

alter table "public"."campaigns" add constraint "campaigns_platform_format_id_fkey" FOREIGN KEY (platform_format_id) REFERENCES public.platform_formats(id) ON DELETE SET NULL not valid;

alter table "public"."campaigns" validate constraint "campaigns_platform_format_id_fkey";

alter table "public"."campaigns" add constraint "campaigns_posting_hour_check" CHECK (((posting_hour >= 0) AND (posting_hour <= 23))) not valid;

alter table "public"."campaigns" validate constraint "campaigns_posting_hour_check";

alter table "public"."campaigns" add constraint "campaigns_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."campaigns" validate constraint "campaigns_project_id_fkey";

alter table "public"."campaigns" add constraint "campaigns_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'paused'::text, 'completed'::text]))) not valid;

alter table "public"."campaigns" validate constraint "campaigns_status_check";

alter table "public"."claude_usage_log" add constraint "claude_usage_log_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL not valid;

alter table "public"."claude_usage_log" validate constraint "claude_usage_log_campaign_id_fkey";

alter table "public"."credits" add constraint "unique_user_credits" UNIQUE using index "unique_user_credits";

alter table "public"."generated_prompts" add constraint "generated_prompts_ai_config_id_fkey" FOREIGN KEY (ai_config_id) REFERENCES public.ai_generation_configs(id) ON DELETE SET NULL not valid;

alter table "public"."generated_prompts" validate constraint "generated_prompts_ai_config_id_fkey";

alter table "public"."generated_prompts" add constraint "generated_prompts_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL not valid;

alter table "public"."generated_prompts" validate constraint "generated_prompts_campaign_id_fkey";

alter table "public"."generations" add constraint "generations_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE SET NULL not valid;

alter table "public"."generations" validate constraint "generations_campaign_id_fkey";

alter table "public"."generations" add constraint "generations_progress_check" CHECK (((progress >= 0) AND (progress <= 100))) not valid;

alter table "public"."generations" validate constraint "generations_progress_check";

alter table "public"."generations" add constraint "generations_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL not valid;

alter table "public"."generations" validate constraint "generations_project_id_fkey";

alter table "public"."heygen_avatars" add constraint "heygen_avatars_avatar_id_key" UNIQUE using index "heygen_avatars_avatar_id_key";

alter table "public"."linkedin_connections" add constraint "linkedin_connections_user_id_key" UNIQUE using index "linkedin_connections_user_id_key";

alter table "public"."meta_connections" add constraint "meta_connections_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."meta_connections" validate constraint "meta_connections_user_id_fkey";

alter table "public"."meta_connections" add constraint "meta_connections_user_id_key" UNIQUE using index "meta_connections_user_id_key";

alter table "public"."platform_formats" add constraint "platform_formats_content_type_check" CHECK ((content_type = ANY (ARRAY['video'::text, 'image'::text, 'text'::text, 'carousel'::text, 'live'::text, 'article'::text]))) not valid;

alter table "public"."platform_formats" validate constraint "platform_formats_content_type_check";

alter table "public"."platform_formats" add constraint "platform_formats_platform_id_fkey" FOREIGN KEY (platform_id) REFERENCES public.platforms(id) ON DELETE CASCADE not valid;

alter table "public"."platform_formats" validate constraint "platform_formats_platform_id_fkey";

alter table "public"."platform_formats" add constraint "platform_formats_platform_id_format_slug_key" UNIQUE using index "platform_formats_platform_id_format_slug_key";

alter table "public"."platforms" add constraint "platforms_slug_key" UNIQUE using index "platforms_slug_key";

alter table "public"."profiles" add constraint "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."profiles" validate constraint "profiles_user_id_fkey";

alter table "public"."profiles" add constraint "profiles_user_id_key" UNIQUE using index "profiles_user_id_key";

alter table "public"."projects" add constraint "projects_automation_mode_check" CHECK ((automation_mode = ANY (ARRAY['manual'::text, 'semi_auto'::text, 'full_auto'::text]))) not valid;

alter table "public"."projects" validate constraint "projects_automation_mode_check";

alter table "public"."projects" add constraint "projects_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."projects" validate constraint "projects_user_id_fkey";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_campaign_id_fkey" FOREIGN KEY (campaign_id) REFERENCES public.campaigns(id) ON DELETE CASCADE not valid;

alter table "public"."scheduled_posts" validate constraint "scheduled_posts_campaign_id_fkey";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_content_type_check" CHECK ((content_type = ANY (ARRAY['text'::text, 'image'::text, 'video'::text, 'mixed'::text]))) not valid;

alter table "public"."scheduled_posts" validate constraint "scheduled_posts_content_type_check";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."scheduled_posts" validate constraint "scheduled_posts_project_id_fkey";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'pending_approval'::text, 'scheduled'::text, 'published'::text, 'failed'::text]))) not valid;

alter table "public"."scheduled_posts" validate constraint "scheduled_posts_status_check";

alter table "public"."scheduled_posts" add constraint "scheduled_posts_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."scheduled_posts" validate constraint "scheduled_posts_user_id_fkey";

alter table "public"."subscriptions" add constraint "unique_user_subscription" UNIQUE using index "unique_user_subscription";

alter table "public"."tiktok_connections" add constraint "tiktok_connections_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."tiktok_connections" validate constraint "tiktok_connections_project_id_fkey";

alter table "public"."tiktok_connections" add constraint "tiktok_connections_user_id_key" UNIQUE using index "tiktok_connections_user_id_key";

alter table "public"."user_budgets" add constraint "user_budgets_user_id_key" UNIQUE using index "user_budgets_user_id_key";

alter table "public"."youtube_connections" add constraint "youtube_connections_project_id_fkey" FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE not valid;

alter table "public"."youtube_connections" validate constraint "youtube_connections_project_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.add_credits(p_user_id uuid, p_amount integer)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    -- Upsert credits
    INSERT INTO public.credits (user_id, balance)
    VALUES (p_user_id, p_amount)
    ON CONFLICT (user_id)
    DO UPDATE SET balance = credits.balance + p_amount, updated_at = now();
END;
$function$
;

CREATE OR REPLACE FUNCTION public.clean_project_name()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.deduct_credits(p_user_id uuid, p_amount integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    current_balance INTEGER;
BEGIN
    -- Get current balance
    SELECT balance INTO current_balance
    FROM public.credits
    WHERE user_id = p_user_id
    FOR UPDATE;
    
    -- Check if sufficient credits
    IF current_balance IS NULL OR current_balance < p_amount THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct credits
    UPDATE public.credits
    SET balance = balance - p_amount, updated_at = now()
    WHERE user_id = p_user_id;
    
    RETURN TRUE;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.estimate_heygen_cost(p_avatar_type text, p_duration_sec integer, p_quality text DEFAULT 'iii'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;

CREATE OR REPLACE FUNCTION public.get_ai_config(p_platform text, p_format text, p_type text)
 RETURNS TABLE(config_id uuid, system_prompt text, user_prompt_template text, model text, max_tokens integer, temperature numeric, variables jsonb)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
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
$function$
;

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
$function$
;

CREATE OR REPLACE FUNCTION public.rls_auto_enable()
 RETURNS event_trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'pg_catalog'
AS $function$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$function$
;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

grant delete on table "public"."ai_generation_configs" to "anon";

grant insert on table "public"."ai_generation_configs" to "anon";

grant references on table "public"."ai_generation_configs" to "anon";

grant select on table "public"."ai_generation_configs" to "anon";

grant trigger on table "public"."ai_generation_configs" to "anon";

grant truncate on table "public"."ai_generation_configs" to "anon";

grant update on table "public"."ai_generation_configs" to "anon";

grant delete on table "public"."ai_generation_configs" to "authenticated";

grant insert on table "public"."ai_generation_configs" to "authenticated";

grant references on table "public"."ai_generation_configs" to "authenticated";

grant select on table "public"."ai_generation_configs" to "authenticated";

grant trigger on table "public"."ai_generation_configs" to "authenticated";

grant truncate on table "public"."ai_generation_configs" to "authenticated";

grant update on table "public"."ai_generation_configs" to "authenticated";

grant delete on table "public"."ai_generation_configs" to "service_role";

grant insert on table "public"."ai_generation_configs" to "service_role";

grant references on table "public"."ai_generation_configs" to "service_role";

grant select on table "public"."ai_generation_configs" to "service_role";

grant trigger on table "public"."ai_generation_configs" to "service_role";

grant truncate on table "public"."ai_generation_configs" to "service_role";

grant update on table "public"."ai_generation_configs" to "service_role";

grant delete on table "public"."api_pricing" to "anon";

grant insert on table "public"."api_pricing" to "anon";

grant references on table "public"."api_pricing" to "anon";

grant select on table "public"."api_pricing" to "anon";

grant trigger on table "public"."api_pricing" to "anon";

grant truncate on table "public"."api_pricing" to "anon";

grant update on table "public"."api_pricing" to "anon";

grant delete on table "public"."api_pricing" to "authenticated";

grant insert on table "public"."api_pricing" to "authenticated";

grant references on table "public"."api_pricing" to "authenticated";

grant select on table "public"."api_pricing" to "authenticated";

grant trigger on table "public"."api_pricing" to "authenticated";

grant truncate on table "public"."api_pricing" to "authenticated";

grant update on table "public"."api_pricing" to "authenticated";

grant delete on table "public"."api_pricing" to "service_role";

grant insert on table "public"."api_pricing" to "service_role";

grant references on table "public"."api_pricing" to "service_role";

grant select on table "public"."api_pricing" to "service_role";

grant trigger on table "public"."api_pricing" to "service_role";

grant truncate on table "public"."api_pricing" to "service_role";

grant update on table "public"."api_pricing" to "service_role";

grant delete on table "public"."campaigns" to "anon";

grant insert on table "public"."campaigns" to "anon";

grant references on table "public"."campaigns" to "anon";

grant select on table "public"."campaigns" to "anon";

grant trigger on table "public"."campaigns" to "anon";

grant truncate on table "public"."campaigns" to "anon";

grant update on table "public"."campaigns" to "anon";

grant delete on table "public"."campaigns" to "authenticated";

grant insert on table "public"."campaigns" to "authenticated";

grant references on table "public"."campaigns" to "authenticated";

grant select on table "public"."campaigns" to "authenticated";

grant trigger on table "public"."campaigns" to "authenticated";

grant truncate on table "public"."campaigns" to "authenticated";

grant update on table "public"."campaigns" to "authenticated";

grant delete on table "public"."campaigns" to "service_role";

grant insert on table "public"."campaigns" to "service_role";

grant references on table "public"."campaigns" to "service_role";

grant select on table "public"."campaigns" to "service_role";

grant trigger on table "public"."campaigns" to "service_role";

grant truncate on table "public"."campaigns" to "service_role";

grant update on table "public"."campaigns" to "service_role";

grant delete on table "public"."claude_usage_log" to "anon";

grant insert on table "public"."claude_usage_log" to "anon";

grant references on table "public"."claude_usage_log" to "anon";

grant select on table "public"."claude_usage_log" to "anon";

grant trigger on table "public"."claude_usage_log" to "anon";

grant truncate on table "public"."claude_usage_log" to "anon";

grant update on table "public"."claude_usage_log" to "anon";

grant delete on table "public"."claude_usage_log" to "authenticated";

grant insert on table "public"."claude_usage_log" to "authenticated";

grant references on table "public"."claude_usage_log" to "authenticated";

grant select on table "public"."claude_usage_log" to "authenticated";

grant trigger on table "public"."claude_usage_log" to "authenticated";

grant truncate on table "public"."claude_usage_log" to "authenticated";

grant update on table "public"."claude_usage_log" to "authenticated";

grant delete on table "public"."claude_usage_log" to "service_role";

grant insert on table "public"."claude_usage_log" to "service_role";

grant references on table "public"."claude_usage_log" to "service_role";

grant select on table "public"."claude_usage_log" to "service_role";

grant trigger on table "public"."claude_usage_log" to "service_role";

grant truncate on table "public"."claude_usage_log" to "service_role";

grant update on table "public"."claude_usage_log" to "service_role";

grant delete on table "public"."credit_transactions" to "anon";

grant insert on table "public"."credit_transactions" to "anon";

grant references on table "public"."credit_transactions" to "anon";

grant select on table "public"."credit_transactions" to "anon";

grant trigger on table "public"."credit_transactions" to "anon";

grant truncate on table "public"."credit_transactions" to "anon";

grant update on table "public"."credit_transactions" to "anon";

grant delete on table "public"."credit_transactions" to "authenticated";

grant insert on table "public"."credit_transactions" to "authenticated";

grant references on table "public"."credit_transactions" to "authenticated";

grant select on table "public"."credit_transactions" to "authenticated";

grant trigger on table "public"."credit_transactions" to "authenticated";

grant truncate on table "public"."credit_transactions" to "authenticated";

grant update on table "public"."credit_transactions" to "authenticated";

grant delete on table "public"."credit_transactions" to "service_role";

grant insert on table "public"."credit_transactions" to "service_role";

grant references on table "public"."credit_transactions" to "service_role";

grant select on table "public"."credit_transactions" to "service_role";

grant trigger on table "public"."credit_transactions" to "service_role";

grant truncate on table "public"."credit_transactions" to "service_role";

grant update on table "public"."credit_transactions" to "service_role";

grant delete on table "public"."credits" to "anon";

grant insert on table "public"."credits" to "anon";

grant references on table "public"."credits" to "anon";

grant select on table "public"."credits" to "anon";

grant trigger on table "public"."credits" to "anon";

grant truncate on table "public"."credits" to "anon";

grant update on table "public"."credits" to "anon";

grant delete on table "public"."credits" to "authenticated";

grant insert on table "public"."credits" to "authenticated";

grant references on table "public"."credits" to "authenticated";

grant select on table "public"."credits" to "authenticated";

grant trigger on table "public"."credits" to "authenticated";

grant truncate on table "public"."credits" to "authenticated";

grant update on table "public"."credits" to "authenticated";

grant delete on table "public"."credits" to "service_role";

grant insert on table "public"."credits" to "service_role";

grant references on table "public"."credits" to "service_role";

grant select on table "public"."credits" to "service_role";

grant trigger on table "public"."credits" to "service_role";

grant truncate on table "public"."credits" to "service_role";

grant update on table "public"."credits" to "service_role";

grant delete on table "public"."generated_prompts" to "anon";

grant insert on table "public"."generated_prompts" to "anon";

grant references on table "public"."generated_prompts" to "anon";

grant select on table "public"."generated_prompts" to "anon";

grant trigger on table "public"."generated_prompts" to "anon";

grant truncate on table "public"."generated_prompts" to "anon";

grant update on table "public"."generated_prompts" to "anon";

grant delete on table "public"."generated_prompts" to "authenticated";

grant insert on table "public"."generated_prompts" to "authenticated";

grant references on table "public"."generated_prompts" to "authenticated";

grant select on table "public"."generated_prompts" to "authenticated";

grant trigger on table "public"."generated_prompts" to "authenticated";

grant truncate on table "public"."generated_prompts" to "authenticated";

grant update on table "public"."generated_prompts" to "authenticated";

grant delete on table "public"."generated_prompts" to "service_role";

grant insert on table "public"."generated_prompts" to "service_role";

grant references on table "public"."generated_prompts" to "service_role";

grant select on table "public"."generated_prompts" to "service_role";

grant trigger on table "public"."generated_prompts" to "service_role";

grant truncate on table "public"."generated_prompts" to "service_role";

grant update on table "public"."generated_prompts" to "service_role";

grant delete on table "public"."generations" to "anon";

grant insert on table "public"."generations" to "anon";

grant references on table "public"."generations" to "anon";

grant select on table "public"."generations" to "anon";

grant trigger on table "public"."generations" to "anon";

grant truncate on table "public"."generations" to "anon";

grant update on table "public"."generations" to "anon";

grant delete on table "public"."generations" to "authenticated";

grant insert on table "public"."generations" to "authenticated";

grant references on table "public"."generations" to "authenticated";

grant select on table "public"."generations" to "authenticated";

grant trigger on table "public"."generations" to "authenticated";

grant truncate on table "public"."generations" to "authenticated";

grant update on table "public"."generations" to "authenticated";

grant delete on table "public"."generations" to "service_role";

grant insert on table "public"."generations" to "service_role";

grant references on table "public"."generations" to "service_role";

grant select on table "public"."generations" to "service_role";

grant trigger on table "public"."generations" to "service_role";

grant truncate on table "public"."generations" to "service_role";

grant update on table "public"."generations" to "service_role";

grant delete on table "public"."heygen_avatars" to "anon";

grant insert on table "public"."heygen_avatars" to "anon";

grant references on table "public"."heygen_avatars" to "anon";

grant select on table "public"."heygen_avatars" to "anon";

grant trigger on table "public"."heygen_avatars" to "anon";

grant truncate on table "public"."heygen_avatars" to "anon";

grant update on table "public"."heygen_avatars" to "anon";

grant delete on table "public"."heygen_avatars" to "authenticated";

grant insert on table "public"."heygen_avatars" to "authenticated";

grant references on table "public"."heygen_avatars" to "authenticated";

grant select on table "public"."heygen_avatars" to "authenticated";

grant trigger on table "public"."heygen_avatars" to "authenticated";

grant truncate on table "public"."heygen_avatars" to "authenticated";

grant update on table "public"."heygen_avatars" to "authenticated";

grant delete on table "public"."heygen_avatars" to "service_role";

grant insert on table "public"."heygen_avatars" to "service_role";

grant references on table "public"."heygen_avatars" to "service_role";

grant select on table "public"."heygen_avatars" to "service_role";

grant trigger on table "public"."heygen_avatars" to "service_role";

grant truncate on table "public"."heygen_avatars" to "service_role";

grant update on table "public"."heygen_avatars" to "service_role";

grant delete on table "public"."linkedin_connections" to "anon";

grant insert on table "public"."linkedin_connections" to "anon";

grant references on table "public"."linkedin_connections" to "anon";

grant select on table "public"."linkedin_connections" to "anon";

grant trigger on table "public"."linkedin_connections" to "anon";

grant truncate on table "public"."linkedin_connections" to "anon";

grant update on table "public"."linkedin_connections" to "anon";

grant delete on table "public"."linkedin_connections" to "authenticated";

grant insert on table "public"."linkedin_connections" to "authenticated";

grant references on table "public"."linkedin_connections" to "authenticated";

grant select on table "public"."linkedin_connections" to "authenticated";

grant trigger on table "public"."linkedin_connections" to "authenticated";

grant truncate on table "public"."linkedin_connections" to "authenticated";

grant update on table "public"."linkedin_connections" to "authenticated";

grant delete on table "public"."linkedin_connections" to "service_role";

grant insert on table "public"."linkedin_connections" to "service_role";

grant references on table "public"."linkedin_connections" to "service_role";

grant select on table "public"."linkedin_connections" to "service_role";

grant trigger on table "public"."linkedin_connections" to "service_role";

grant truncate on table "public"."linkedin_connections" to "service_role";

grant update on table "public"."linkedin_connections" to "service_role";

grant delete on table "public"."meta_connections" to "anon";

grant insert on table "public"."meta_connections" to "anon";

grant references on table "public"."meta_connections" to "anon";

grant select on table "public"."meta_connections" to "anon";

grant trigger on table "public"."meta_connections" to "anon";

grant truncate on table "public"."meta_connections" to "anon";

grant update on table "public"."meta_connections" to "anon";

grant delete on table "public"."meta_connections" to "authenticated";

grant insert on table "public"."meta_connections" to "authenticated";

grant references on table "public"."meta_connections" to "authenticated";

grant select on table "public"."meta_connections" to "authenticated";

grant trigger on table "public"."meta_connections" to "authenticated";

grant truncate on table "public"."meta_connections" to "authenticated";

grant update on table "public"."meta_connections" to "authenticated";

grant delete on table "public"."meta_connections" to "service_role";

grant insert on table "public"."meta_connections" to "service_role";

grant references on table "public"."meta_connections" to "service_role";

grant select on table "public"."meta_connections" to "service_role";

grant trigger on table "public"."meta_connections" to "service_role";

grant truncate on table "public"."meta_connections" to "service_role";

grant update on table "public"."meta_connections" to "service_role";

grant delete on table "public"."platform_formats" to "anon";

grant insert on table "public"."platform_formats" to "anon";

grant references on table "public"."platform_formats" to "anon";

grant select on table "public"."platform_formats" to "anon";

grant trigger on table "public"."platform_formats" to "anon";

grant truncate on table "public"."platform_formats" to "anon";

grant update on table "public"."platform_formats" to "anon";

grant delete on table "public"."platform_formats" to "authenticated";

grant insert on table "public"."platform_formats" to "authenticated";

grant references on table "public"."platform_formats" to "authenticated";

grant select on table "public"."platform_formats" to "authenticated";

grant trigger on table "public"."platform_formats" to "authenticated";

grant truncate on table "public"."platform_formats" to "authenticated";

grant update on table "public"."platform_formats" to "authenticated";

grant delete on table "public"."platform_formats" to "service_role";

grant insert on table "public"."platform_formats" to "service_role";

grant references on table "public"."platform_formats" to "service_role";

grant select on table "public"."platform_formats" to "service_role";

grant trigger on table "public"."platform_formats" to "service_role";

grant truncate on table "public"."platform_formats" to "service_role";

grant update on table "public"."platform_formats" to "service_role";

grant delete on table "public"."platforms" to "anon";

grant insert on table "public"."platforms" to "anon";

grant references on table "public"."platforms" to "anon";

grant select on table "public"."platforms" to "anon";

grant trigger on table "public"."platforms" to "anon";

grant truncate on table "public"."platforms" to "anon";

grant update on table "public"."platforms" to "anon";

grant delete on table "public"."platforms" to "authenticated";

grant insert on table "public"."platforms" to "authenticated";

grant references on table "public"."platforms" to "authenticated";

grant select on table "public"."platforms" to "authenticated";

grant trigger on table "public"."platforms" to "authenticated";

grant truncate on table "public"."platforms" to "authenticated";

grant update on table "public"."platforms" to "authenticated";

grant delete on table "public"."platforms" to "service_role";

grant insert on table "public"."platforms" to "service_role";

grant references on table "public"."platforms" to "service_role";

grant select on table "public"."platforms" to "service_role";

grant trigger on table "public"."platforms" to "service_role";

grant truncate on table "public"."platforms" to "service_role";

grant update on table "public"."platforms" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."projects" to "anon";

grant insert on table "public"."projects" to "anon";

grant references on table "public"."projects" to "anon";

grant select on table "public"."projects" to "anon";

grant trigger on table "public"."projects" to "anon";

grant truncate on table "public"."projects" to "anon";

grant update on table "public"."projects" to "anon";

grant delete on table "public"."projects" to "authenticated";

grant insert on table "public"."projects" to "authenticated";

grant references on table "public"."projects" to "authenticated";

grant select on table "public"."projects" to "authenticated";

grant trigger on table "public"."projects" to "authenticated";

grant truncate on table "public"."projects" to "authenticated";

grant update on table "public"."projects" to "authenticated";

grant delete on table "public"."projects" to "service_role";

grant insert on table "public"."projects" to "service_role";

grant references on table "public"."projects" to "service_role";

grant select on table "public"."projects" to "service_role";

grant trigger on table "public"."projects" to "service_role";

grant truncate on table "public"."projects" to "service_role";

grant update on table "public"."projects" to "service_role";

grant delete on table "public"."scheduled_posts" to "anon";

grant insert on table "public"."scheduled_posts" to "anon";

grant references on table "public"."scheduled_posts" to "anon";

grant select on table "public"."scheduled_posts" to "anon";

grant trigger on table "public"."scheduled_posts" to "anon";

grant truncate on table "public"."scheduled_posts" to "anon";

grant update on table "public"."scheduled_posts" to "anon";

grant delete on table "public"."scheduled_posts" to "authenticated";

grant insert on table "public"."scheduled_posts" to "authenticated";

grant references on table "public"."scheduled_posts" to "authenticated";

grant select on table "public"."scheduled_posts" to "authenticated";

grant trigger on table "public"."scheduled_posts" to "authenticated";

grant truncate on table "public"."scheduled_posts" to "authenticated";

grant update on table "public"."scheduled_posts" to "authenticated";

grant delete on table "public"."scheduled_posts" to "service_role";

grant insert on table "public"."scheduled_posts" to "service_role";

grant references on table "public"."scheduled_posts" to "service_role";

grant select on table "public"."scheduled_posts" to "service_role";

grant trigger on table "public"."scheduled_posts" to "service_role";

grant truncate on table "public"."scheduled_posts" to "service_role";

grant update on table "public"."scheduled_posts" to "service_role";

grant delete on table "public"."subscriptions" to "anon";

grant insert on table "public"."subscriptions" to "anon";

grant references on table "public"."subscriptions" to "anon";

grant select on table "public"."subscriptions" to "anon";

grant trigger on table "public"."subscriptions" to "anon";

grant truncate on table "public"."subscriptions" to "anon";

grant update on table "public"."subscriptions" to "anon";

grant delete on table "public"."subscriptions" to "authenticated";

grant insert on table "public"."subscriptions" to "authenticated";

grant references on table "public"."subscriptions" to "authenticated";

grant select on table "public"."subscriptions" to "authenticated";

grant trigger on table "public"."subscriptions" to "authenticated";

grant truncate on table "public"."subscriptions" to "authenticated";

grant update on table "public"."subscriptions" to "authenticated";

grant delete on table "public"."subscriptions" to "service_role";

grant insert on table "public"."subscriptions" to "service_role";

grant references on table "public"."subscriptions" to "service_role";

grant select on table "public"."subscriptions" to "service_role";

grant trigger on table "public"."subscriptions" to "service_role";

grant truncate on table "public"."subscriptions" to "service_role";

grant update on table "public"."subscriptions" to "service_role";

grant delete on table "public"."tiktok_connections" to "anon";

grant insert on table "public"."tiktok_connections" to "anon";

grant references on table "public"."tiktok_connections" to "anon";

grant select on table "public"."tiktok_connections" to "anon";

grant trigger on table "public"."tiktok_connections" to "anon";

grant truncate on table "public"."tiktok_connections" to "anon";

grant update on table "public"."tiktok_connections" to "anon";

grant delete on table "public"."tiktok_connections" to "authenticated";

grant insert on table "public"."tiktok_connections" to "authenticated";

grant references on table "public"."tiktok_connections" to "authenticated";

grant select on table "public"."tiktok_connections" to "authenticated";

grant trigger on table "public"."tiktok_connections" to "authenticated";

grant truncate on table "public"."tiktok_connections" to "authenticated";

grant update on table "public"."tiktok_connections" to "authenticated";

grant delete on table "public"."tiktok_connections" to "service_role";

grant insert on table "public"."tiktok_connections" to "service_role";

grant references on table "public"."tiktok_connections" to "service_role";

grant select on table "public"."tiktok_connections" to "service_role";

grant trigger on table "public"."tiktok_connections" to "service_role";

grant truncate on table "public"."tiktok_connections" to "service_role";

grant update on table "public"."tiktok_connections" to "service_role";

grant delete on table "public"."user_budgets" to "anon";

grant insert on table "public"."user_budgets" to "anon";

grant references on table "public"."user_budgets" to "anon";

grant select on table "public"."user_budgets" to "anon";

grant trigger on table "public"."user_budgets" to "anon";

grant truncate on table "public"."user_budgets" to "anon";

grant update on table "public"."user_budgets" to "anon";

grant delete on table "public"."user_budgets" to "authenticated";

grant insert on table "public"."user_budgets" to "authenticated";

grant references on table "public"."user_budgets" to "authenticated";

grant select on table "public"."user_budgets" to "authenticated";

grant trigger on table "public"."user_budgets" to "authenticated";

grant truncate on table "public"."user_budgets" to "authenticated";

grant update on table "public"."user_budgets" to "authenticated";

grant delete on table "public"."user_budgets" to "service_role";

grant insert on table "public"."user_budgets" to "service_role";

grant references on table "public"."user_budgets" to "service_role";

grant select on table "public"."user_budgets" to "service_role";

grant trigger on table "public"."user_budgets" to "service_role";

grant truncate on table "public"."user_budgets" to "service_role";

grant update on table "public"."user_budgets" to "service_role";

grant delete on table "public"."youtube_connections" to "anon";

grant insert on table "public"."youtube_connections" to "anon";

grant references on table "public"."youtube_connections" to "anon";

grant select on table "public"."youtube_connections" to "anon";

grant trigger on table "public"."youtube_connections" to "anon";

grant truncate on table "public"."youtube_connections" to "anon";

grant update on table "public"."youtube_connections" to "anon";

grant delete on table "public"."youtube_connections" to "authenticated";

grant insert on table "public"."youtube_connections" to "authenticated";

grant references on table "public"."youtube_connections" to "authenticated";

grant select on table "public"."youtube_connections" to "authenticated";

grant trigger on table "public"."youtube_connections" to "authenticated";

grant truncate on table "public"."youtube_connections" to "authenticated";

grant update on table "public"."youtube_connections" to "authenticated";

grant delete on table "public"."youtube_connections" to "service_role";

grant insert on table "public"."youtube_connections" to "service_role";

grant references on table "public"."youtube_connections" to "service_role";

grant select on table "public"."youtube_connections" to "service_role";

grant trigger on table "public"."youtube_connections" to "service_role";

grant truncate on table "public"."youtube_connections" to "service_role";

grant update on table "public"."youtube_connections" to "service_role";


  create policy "AI configs are readable by everyone"
  on "public"."ai_generation_configs"
  as permissive
  for select
  to public
using (true);



  create policy "API pricing is readable by everyone"
  on "public"."api_pricing"
  as permissive
  for select
  to public
using (true);



  create policy "Users can create their own campaigns"
  on "public"."campaigns"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own campaigns"
  on "public"."campaigns"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own campaigns"
  on "public"."campaigns"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own campaigns"
  on "public"."campaigns"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own claude usage"
  on "public"."claude_usage_log"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own claude usage"
  on "public"."claude_usage_log"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own credit transactions"
  on "public"."credit_transactions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own credit transactions"
  on "public"."credit_transactions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own credits"
  on "public"."credits"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own credits"
  on "public"."credits"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own credits"
  on "public"."credits"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own prompts"
  on "public"."generated_prompts"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can view their own prompts"
  on "public"."generated_prompts"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own generations"
  on "public"."generations"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own generations"
  on "public"."generations"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own generations"
  on "public"."generations"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own generations"
  on "public"."generations"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Authenticated users can read public avatars"
  on "public"."heygen_avatars"
  as permissive
  for select
  to public
using (((user_id IS NULL) AND (auth.role() = 'authenticated'::text)));



  create policy "Service role full access"
  on "public"."heygen_avatars"
  as permissive
  for all
  to public
using ((auth.role() = 'service_role'::text));



  create policy "Users can insert their own avatars"
  on "public"."heygen_avatars"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can read their own avatars"
  on "public"."heygen_avatars"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own avatars"
  on "public"."heygen_avatars"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own LinkedIn connection"
  on "public"."linkedin_connections"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own LinkedIn connection"
  on "public"."linkedin_connections"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own LinkedIn connection"
  on "public"."linkedin_connections"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own LinkedIn connection"
  on "public"."linkedin_connections"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own Meta connection"
  on "public"."meta_connections"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own Meta connection"
  on "public"."meta_connections"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own Meta connection"
  on "public"."meta_connections"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own Meta connection"
  on "public"."meta_connections"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Platform formats are readable by everyone"
  on "public"."platform_formats"
  as permissive
  for select
  to public
using (true);



  create policy "Platforms are readable by everyone"
  on "public"."platforms"
  as permissive
  for select
  to public
using (true);



  create policy "Users can insert their own profile"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own profile"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own profile"
  on "public"."profiles"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own projects"
  on "public"."projects"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own projects"
  on "public"."projects"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own projects"
  on "public"."projects"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own projects"
  on "public"."projects"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own scheduled posts"
  on "public"."scheduled_posts"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own scheduled posts"
  on "public"."scheduled_posts"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own scheduled posts"
  on "public"."scheduled_posts"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own scheduled posts"
  on "public"."scheduled_posts"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own subscription"
  on "public"."subscriptions"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own subscription"
  on "public"."subscriptions"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own subscription"
  on "public"."subscriptions"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own TikTok connection"
  on "public"."tiktok_connections"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own TikTok connection"
  on "public"."tiktok_connections"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own TikTok connection"
  on "public"."tiktok_connections"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own TikTok connection"
  on "public"."tiktok_connections"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own budget"
  on "public"."user_budgets"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own budget"
  on "public"."user_budgets"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own budget"
  on "public"."user_budgets"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can create their own YouTube connection"
  on "public"."youtube_connections"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can delete their own YouTube connection"
  on "public"."youtube_connections"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can delete their own youtube connections"
  on "public"."youtube_connections"
  as permissive
  for delete
  to public
using ((auth.uid() = user_id));



  create policy "Users can insert their own youtube connections"
  on "public"."youtube_connections"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "Users can update their own YouTube connection"
  on "public"."youtube_connections"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can update their own youtube connections"
  on "public"."youtube_connections"
  as permissive
  for update
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own YouTube connection"
  on "public"."youtube_connections"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));



  create policy "Users can view their own youtube connections"
  on "public"."youtube_connections"
  as permissive
  for select
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON public.campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_credits_updated_at BEFORE UPDATE ON public.credits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_generations_updated_at BEFORE UPDATE ON public.generations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_linkedin_connections_updated_at BEFORE UPDATE ON public.linkedin_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_meta_connections_updated_at BEFORE UPDATE ON public.meta_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER clean_project_name_trigger BEFORE INSERT OR UPDATE OF name ON public.projects FOR EACH ROW EXECUTE FUNCTION public.clean_project_name();

CREATE TRIGGER update_ai_context_trigger BEFORE INSERT OR UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.rebuild_ai_context();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_scheduled_posts_updated_at BEFORE UPDATE ON public.scheduled_posts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subscriptions_updated_at BEFORE UPDATE ON public.subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tiktok_connections_updated_at BEFORE UPDATE ON public.tiktok_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_youtube_connections_updated_at BEFORE UPDATE ON public.youtube_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


  create policy "Authenticated users can upload media"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check ((bucket_id = 'media'::text));



  create policy "Public read access for media"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'media'::text));



  create policy "Users can delete their media"
  on "storage"."objects"
  as permissive
  for delete
  to public
using ((bucket_id = 'media'::text));



  create policy "Users can update their media"
  on "storage"."objects"
  as permissive
  for update
  to public
using ((bucket_id = 'media'::text));



