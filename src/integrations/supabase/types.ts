export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string
          details: Json | null
          id: string
          target_user_id: string | null
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string
          details?: Json | null
          id?: string
          target_user_id?: string | null
        }
        Relationships: []
      }
      ai_generation_configs: {
        Row: {
          created_at: string
          generation_type: string
          id: string
          is_active: boolean | null
          language: string | null
          max_tokens: number | null
          model: string | null
          platform_format_id: string
          system_prompt: string
          temperature: number | null
          user_prompt_template: string
          variables: Json | null
        }
        Insert: {
          created_at?: string
          generation_type: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_tokens?: number | null
          model?: string | null
          platform_format_id: string
          system_prompt: string
          temperature?: number | null
          user_prompt_template: string
          variables?: Json | null
        }
        Update: {
          created_at?: string
          generation_type?: string
          id?: string
          is_active?: boolean | null
          language?: string | null
          max_tokens?: number | null
          model?: string | null
          platform_format_id?: string
          system_prompt?: string
          temperature?: number | null
          user_prompt_template?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generation_configs_platform_format_id_fkey"
            columns: ["platform_format_id"]
            isOneToOne: false
            referencedRelation: "platform_formats"
            referencedColumns: ["id"]
          },
        ]
      }
      api_pricing: {
        Row: {
          avatar_type: string | null
          billing_unit: string | null
          cost_per_call: number | null
          cost_per_min: number | null
          endpoint: string
          id: string
          notes: string | null
          provider: string
          quality: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_type?: string | null
          billing_unit?: string | null
          cost_per_call?: number | null
          cost_per_min?: number | null
          endpoint: string
          id?: string
          notes?: string | null
          provider: string
          quality?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_type?: string | null
          billing_unit?: string | null
          cost_per_call?: number | null
          cost_per_min?: number | null
          endpoint?: string
          id?: string
          notes?: string | null
          provider?: string
          quality?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          ai_context: string | null
          audio_category: string | null
          campaign_type: string
          clipmotion: boolean | null
          created_at: string
          ends_at: string | null
          estimated_cost: number | null
          facebook_enabled: boolean | null
          format: string | null
          id: string
          image_as_reel: boolean | null
          image_quality: string | null
          images_per_day: number | null
          images_per_month: number | null
          include_avatar: boolean | null
          include_logo: boolean | null
          include_text: boolean | null
          include_url: boolean | null
          instagram_enabled: boolean | null
          linkedin_enabled: boolean | null
          name: string
          overlay_text: string | null
          platform_format_id: string | null
          posting_hour: number | null
          posting_minute: number | null
          posts_per_week: number | null
          project_id: string
          starts_at: string | null
          status: string
          style: string | null
          subject: string | null
          tiktok_enabled: boolean | null
          timezone: string | null
          tone: string | null
          total_generated: number | null
          total_published: number | null
          updated_at: string
          user_id: string
          video_quality: string | null
          videos_per_day: number | null
          videos_per_month: number | null
          youtube_enabled: boolean | null
        }
        Insert: {
          ai_context?: string | null
          audio_category?: string | null
          campaign_type: string
          clipmotion?: boolean | null
          created_at?: string
          ends_at?: string | null
          estimated_cost?: number | null
          facebook_enabled?: boolean | null
          format?: string | null
          id?: string
          image_as_reel?: boolean | null
          image_quality?: string | null
          images_per_day?: number | null
          images_per_month?: number | null
          include_avatar?: boolean | null
          include_logo?: boolean | null
          include_text?: boolean | null
          include_url?: boolean | null
          instagram_enabled?: boolean | null
          linkedin_enabled?: boolean | null
          name: string
          overlay_text?: string | null
          platform_format_id?: string | null
          posting_hour?: number | null
          posting_minute?: number | null
          posts_per_week?: number | null
          project_id: string
          starts_at?: string | null
          status?: string
          style?: string | null
          subject?: string | null
          tiktok_enabled?: boolean | null
          timezone?: string | null
          tone?: string | null
          total_generated?: number | null
          total_published?: number | null
          updated_at?: string
          user_id: string
          video_quality?: string | null
          videos_per_day?: number | null
          videos_per_month?: number | null
          youtube_enabled?: boolean | null
        }
        Update: {
          ai_context?: string | null
          audio_category?: string | null
          campaign_type?: string
          clipmotion?: boolean | null
          created_at?: string
          ends_at?: string | null
          estimated_cost?: number | null
          facebook_enabled?: boolean | null
          format?: string | null
          id?: string
          image_as_reel?: boolean | null
          image_quality?: string | null
          images_per_day?: number | null
          images_per_month?: number | null
          include_avatar?: boolean | null
          include_logo?: boolean | null
          include_text?: boolean | null
          include_url?: boolean | null
          instagram_enabled?: boolean | null
          linkedin_enabled?: boolean | null
          name?: string
          overlay_text?: string | null
          platform_format_id?: string | null
          posting_hour?: number | null
          posting_minute?: number | null
          posts_per_week?: number | null
          project_id?: string
          starts_at?: string | null
          status?: string
          style?: string | null
          subject?: string | null
          tiktok_enabled?: boolean | null
          timezone?: string | null
          tone?: string | null
          total_generated?: number | null
          total_published?: number | null
          updated_at?: string
          user_id?: string
          video_quality?: string | null
          videos_per_day?: number | null
          videos_per_month?: number | null
          youtube_enabled?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_platform_format_id_fkey"
            columns: ["platform_format_id"]
            isOneToOne: false
            referencedRelation: "platform_formats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      claude_usage_log: {
        Row: {
          campaign_id: string | null
          cost_usd: number | null
          created_at: string
          format_slug: string | null
          generated_text: string | null
          generation_type: string | null
          id: string
          platform_slug: string | null
          tokens_input: number | null
          tokens_output: number | null
          user_id: string
        }
        Insert: {
          campaign_id?: string | null
          cost_usd?: number | null
          created_at?: string
          format_slug?: string | null
          generated_text?: string | null
          generation_type?: string | null
          id?: string
          platform_slug?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id: string
        }
        Update: {
          campaign_id?: string | null
          cost_usd?: number | null
          created_at?: string
          format_slug?: string | null
          generated_text?: string | null
          generation_type?: string | null
          id?: string
          platform_slug?: string | null
          tokens_input?: number | null
          tokens_output?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "claude_usage_log_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_transactions: {
        Row: {
          amount: number
          created_at: string
          description: string | null
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description?: string | null
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string | null
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      credits: {
        Row: {
          balance: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      generated_prompts: {
        Row: {
          ai_config_id: string | null
          ai_output: string | null
          campaign_id: string | null
          created_at: string
          filled_prompt: string | null
          format_slug: string | null
          id: string
          platform_slug: string | null
          prompt_type: string | null
          user_id: string
          variables: Json | null
        }
        Insert: {
          ai_config_id?: string | null
          ai_output?: string | null
          campaign_id?: string | null
          created_at?: string
          filled_prompt?: string | null
          format_slug?: string | null
          id?: string
          platform_slug?: string | null
          prompt_type?: string | null
          user_id: string
          variables?: Json | null
        }
        Update: {
          ai_config_id?: string | null
          ai_output?: string | null
          campaign_id?: string | null
          created_at?: string
          filled_prompt?: string | null
          format_slug?: string | null
          id?: string
          platform_slug?: string | null
          prompt_type?: string | null
          user_id?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "generated_prompts_ai_config_id_fkey"
            columns: ["ai_config_id"]
            isOneToOne: false
            referencedRelation: "ai_generation_configs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_prompts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      generations: {
        Row: {
          actual_cost: number | null
          audio_url: string | null
          campaign_id: string | null
          check_after: string | null
          check_count: number | null
          completed_at: string | null
          created_at: string
          duration: number | null
          error_message: string | null
          estimated_cost: number | null
          external_task_id: string | null
          format: string | null
          id: string
          media_url: string | null
          model: string | null
          progress: number
          project_id: string | null
          prompt: string | null
          provider: string | null
          quality: string | null
          retry_count: number | null
          script: string | null
          started_at: string | null
          status: string
          step: string | null
          thumbnail_url: string | null
          type: string
          updated_at: string
          user_id: string
          video_mode: string | null
        }
        Insert: {
          actual_cost?: number | null
          audio_url?: string | null
          campaign_id?: string | null
          check_after?: string | null
          check_count?: number | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          external_task_id?: string | null
          format?: string | null
          id?: string
          media_url?: string | null
          model?: string | null
          progress?: number
          project_id?: string | null
          prompt?: string | null
          provider?: string | null
          quality?: string | null
          retry_count?: number | null
          script?: string | null
          started_at?: string | null
          status?: string
          step?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          user_id: string
          video_mode?: string | null
        }
        Update: {
          actual_cost?: number | null
          audio_url?: string | null
          campaign_id?: string | null
          check_after?: string | null
          check_count?: number | null
          completed_at?: string | null
          created_at?: string
          duration?: number | null
          error_message?: string | null
          estimated_cost?: number | null
          external_task_id?: string | null
          format?: string | null
          id?: string
          media_url?: string | null
          model?: string | null
          progress?: number
          project_id?: string | null
          prompt?: string | null
          provider?: string | null
          quality?: string | null
          retry_count?: number | null
          script?: string | null
          started_at?: string | null
          status?: string
          step?: string | null
          thumbnail_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          video_mode?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "generations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      heygen_avatars: {
        Row: {
          avatar_id: string
          avatar_name: string
          cached_at: string
          category: string | null
          gender: string | null
          id: string
          is_favorite: boolean | null
          last_used_at: string | null
          preview_image_url: string | null
          preview_video_url: string | null
          scenes: Json | null
          user_id: string | null
        }
        Insert: {
          avatar_id: string
          avatar_name: string
          cached_at?: string
          category?: string | null
          gender?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          preview_image_url?: string | null
          preview_video_url?: string | null
          scenes?: Json | null
          user_id?: string | null
        }
        Update: {
          avatar_id?: string
          avatar_name?: string
          cached_at?: string
          category?: string | null
          gender?: string | null
          id?: string
          is_favorite?: boolean | null
          last_used_at?: string | null
          preview_image_url?: string | null
          preview_video_url?: string | null
          scenes?: Json | null
          user_id?: string | null
        }
        Relationships: []
      }
      linkedin_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          display_name: string
          expires_at: string
          id: string
          linkedin_id: string
          refresh_token: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          expires_at: string
          id?: string
          linkedin_id: string
          refresh_token?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          expires_at?: string
          id?: string
          linkedin_id?: string
          refresh_token?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      meta_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string
          fb_picture_url: string | null
          fb_user_id: string
          fb_user_name: string
          id: string
          instagram_id: string | null
          instagram_username: string | null
          page_access_token: string | null
          page_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at: string
          fb_picture_url?: string | null
          fb_user_id: string
          fb_user_name: string
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          page_access_token?: string | null
          page_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string
          fb_picture_url?: string | null
          fb_user_id?: string
          fb_user_name?: string
          id?: string
          instagram_id?: string | null
          instagram_username?: string | null
          page_access_token?: string | null
          page_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_formats: {
        Row: {
          aspect_ratio: string | null
          content_type: string
          created_at: string
          format_slug: string
          id: string
          label: string
          max_duration_sec: number | null
          max_text_chars: number | null
          notes: string | null
          platform_id: string
          recommended_frequency: string | null
          recommended_resolution: string | null
        }
        Insert: {
          aspect_ratio?: string | null
          content_type: string
          created_at?: string
          format_slug: string
          id?: string
          label: string
          max_duration_sec?: number | null
          max_text_chars?: number | null
          notes?: string | null
          platform_id: string
          recommended_frequency?: string | null
          recommended_resolution?: string | null
        }
        Update: {
          aspect_ratio?: string | null
          content_type?: string
          created_at?: string
          format_slug?: string
          id?: string
          label?: string
          max_duration_sec?: number | null
          max_text_chars?: number | null
          notes?: string | null
          platform_id?: string
          recommended_frequency?: string | null
          recommended_resolution?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "platform_formats_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      platforms: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          ai_context_summary: string | null
          automation_mode: string | null
          avatar_url: string | null
          created_at: string
          description: string | null
          detected_language: string | null
          facebook_enabled: boolean | null
          id: string
          instagram_enabled: boolean | null
          linkedin_enabled: boolean | null
          linkedin_page_url: string | null
          logo_url: string | null
          marketing_context: Json | null
          meta_instagram_id: string | null
          meta_instagram_username: string | null
          meta_page_id: string | null
          name: string
          posts_per_week: number | null
          scraped_at: string | null
          scraped_data: Json | null
          scraped_markdown: string | null
          theme_color: string | null
          tiktok_enabled: boolean | null
          updated_at: string
          url: string | null
          user_id: string
          youtube_enabled: boolean | null
        }
        Insert: {
          ai_context_summary?: string | null
          automation_mode?: string | null
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          detected_language?: string | null
          facebook_enabled?: boolean | null
          id?: string
          instagram_enabled?: boolean | null
          linkedin_enabled?: boolean | null
          linkedin_page_url?: string | null
          logo_url?: string | null
          marketing_context?: Json | null
          meta_instagram_id?: string | null
          meta_instagram_username?: string | null
          meta_page_id?: string | null
          name: string
          posts_per_week?: number | null
          scraped_at?: string | null
          scraped_data?: Json | null
          scraped_markdown?: string | null
          theme_color?: string | null
          tiktok_enabled?: boolean | null
          updated_at?: string
          url?: string | null
          user_id: string
          youtube_enabled?: boolean | null
        }
        Update: {
          ai_context_summary?: string | null
          automation_mode?: string | null
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          detected_language?: string | null
          facebook_enabled?: boolean | null
          id?: string
          instagram_enabled?: boolean | null
          linkedin_enabled?: boolean | null
          linkedin_page_url?: string | null
          logo_url?: string | null
          marketing_context?: Json | null
          meta_instagram_id?: string | null
          meta_instagram_username?: string | null
          meta_page_id?: string | null
          name?: string
          posts_per_week?: number | null
          scraped_at?: string | null
          scraped_data?: Json | null
          scraped_markdown?: string | null
          theme_color?: string | null
          tiktok_enabled?: boolean | null
          updated_at?: string
          url?: string | null
          user_id?: string
          youtube_enabled?: boolean | null
        }
        Relationships: []
      }
      scheduled_posts: {
        Row: {
          ai_prompt: string | null
          campaign_id: string | null
          character_archetype: string | null
          content_type: string
          created_at: string
          error_message: string | null
          external_post_id: string | null
          hook_style: string | null
          id: string
          media_url: string | null
          narrative_structure: string | null
          platforms: string[] | null
          project_id: string
          published_at: string | null
          scheduled_for: string
          status: string | null
          text_content: string | null
          thumbnail_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_prompt?: string | null
          campaign_id?: string | null
          character_archetype?: string | null
          content_type: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          hook_style?: string | null
          id?: string
          media_url?: string | null
          narrative_structure?: string | null
          platforms?: string[] | null
          project_id: string
          published_at?: string | null
          scheduled_for: string
          status?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_prompt?: string | null
          campaign_id?: string | null
          character_archetype?: string | null
          content_type?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          hook_style?: string | null
          id?: string
          media_url?: string | null
          narrative_structure?: string | null
          platforms?: string[] | null
          project_id?: string
          published_at?: string | null
          scheduled_for?: string
          status?: string | null
          text_content?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      store_connections: {
        Row: {
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          created_at: string
          id: string
          last_sync_at: string | null
          metadata: Json | null
          platform: string
          project_id: string | null
          shop_name: string
          status: string
          store_url: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          platform: string
          project_id?: string | null
          shop_name: string
          status?: string
          store_url: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          created_at?: string
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          platform?: string
          project_id?: string | null
          shop_name?: string
          status?: string
          store_url?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      store_products: {
        Row: {
          connection_id: string
          currency: string | null
          description: string | null
          external_id: string
          id: string
          image_urls: Json | null
          imported_at: string
          price: number | null
          primary_image_url: string | null
          product_url: string | null
          raw: Json | null
          title: string
          updated_at: string
          user_id: string
          variants: Json | null
        }
        Insert: {
          connection_id: string
          currency?: string | null
          description?: string | null
          external_id: string
          id?: string
          image_urls?: Json | null
          imported_at?: string
          price?: number | null
          primary_image_url?: string | null
          product_url?: string | null
          raw?: Json | null
          title: string
          updated_at?: string
          user_id: string
          variants?: Json | null
        }
        Update: {
          connection_id?: string
          currency?: string | null
          description?: string | null
          external_id?: string
          id?: string
          image_urls?: Json | null
          imported_at?: string
          price?: number | null
          primary_image_url?: string | null
          product_url?: string | null
          raw?: Json | null
          title?: string
          updated_at?: string
          user_id?: string
          variants?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "store_products_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "store_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          id: string
          plan_id: string
          renews_at: string | null
          started_at: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan_id?: string
          renews_at?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan_id?: string
          renews_at?: string | null
          started_at?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      support_messages: {
        Row: {
          attachments: Json | null
          author_user_id: string | null
          body_html: string | null
          body_text: string | null
          cc: string | null
          created_at: string
          direction: string
          external_message_id: string | null
          from_email: string | null
          from_name: string | null
          id: string
          in_reply_to: string | null
          ticket_id: string
          to_email: string | null
        }
        Insert: {
          attachments?: Json | null
          author_user_id?: string | null
          body_html?: string | null
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction: string
          external_message_id?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          ticket_id: string
          to_email?: string | null
        }
        Update: {
          attachments?: Json | null
          author_user_id?: string | null
          body_html?: string | null
          body_text?: string | null
          cc?: string | null
          created_at?: string
          direction?: string
          external_message_id?: string | null
          from_email?: string | null
          from_name?: string | null
          id?: string
          in_reply_to?: string | null
          ticket_id?: string
          to_email?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          created_at: string
          email: string
          external_thread_id: string | null
          id: string
          last_message_at: string
          priority: string
          status: string
          subject: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          email: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          email?: string
          external_thread_id?: string | null
          id?: string
          last_message_at?: string
          priority?: string
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      tiktok_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          display_name: string
          expires_at: string
          id: string
          open_id: string
          project_id: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          avatar_url?: string | null
          created_at?: string
          display_name: string
          expires_at: string
          id?: string
          open_id: string
          project_id?: string | null
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          avatar_url?: string | null
          created_at?: string
          display_name?: string
          expires_at?: string
          id?: string
          open_id?: string
          project_id?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tiktok_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      user_budgets: {
        Row: {
          alert_threshold_pct: number | null
          created_at: string
          current_spend_usd: number | null
          id: string
          monthly_budget_usd: number | null
          period_end: string | null
          period_start: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_threshold_pct?: number | null
          created_at?: string
          current_spend_usd?: number | null
          id?: string
          monthly_budget_usd?: number | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_threshold_pct?: number | null
          created_at?: string
          current_spend_usd?: number | null
          id?: string
          monthly_budget_usd?: number | null
          period_end?: string | null
          period_start?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      youtube_connections: {
        Row: {
          access_token: string
          channel_id: string
          channel_name: string
          channel_picture_url: string | null
          created_at: string
          expires_at: string
          id: string
          project_id: string | null
          refresh_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          channel_id: string
          channel_name: string
          channel_picture_url?: string | null
          created_at?: string
          expires_at: string
          id?: string
          project_id?: string | null
          refresh_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          channel_id?: string
          channel_name?: string
          channel_picture_url?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          project_id?: string | null
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "youtube_connections_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      add_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: undefined
      }
      deduct_credits: {
        Args: { p_amount: number; p_user_id: string }
        Returns: boolean
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      estimate_heygen_cost: {
        Args: {
          p_avatar_type: string
          p_duration_sec: number
          p_quality?: string
        }
        Returns: Json
      }
      get_ai_config: {
        Args: { p_format: string; p_platform: string; p_type: string }
        Returns: {
          config_id: string
          max_tokens: number
          model: string
          system_prompt: string
          temperature: number
          user_prompt_template: string
          variables: Json
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "support" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "support", "user"],
    },
  },
} as const
