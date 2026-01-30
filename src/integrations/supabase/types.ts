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
      campaigns: {
        Row: {
          ai_context: string | null
          campaign_type: string
          created_at: string
          ends_at: string | null
          estimated_cost: number | null
          format: string | null
          id: string
          image_quality: string | null
          images_per_day: number | null
          images_per_month: number | null
          name: string
          posting_hour: number | null
          posts_per_week: number | null
          project_id: string
          starts_at: string | null
          status: string
          style: string | null
          subject: string | null
          timezone: string | null
          tone: string | null
          total_generated: number | null
          total_published: number | null
          updated_at: string
          user_id: string
          video_quality: string | null
          videos_per_day: number | null
          videos_per_month: number | null
        }
        Insert: {
          ai_context?: string | null
          campaign_type: string
          created_at?: string
          ends_at?: string | null
          estimated_cost?: number | null
          format?: string | null
          id?: string
          image_quality?: string | null
          images_per_day?: number | null
          images_per_month?: number | null
          name: string
          posting_hour?: number | null
          posts_per_week?: number | null
          project_id: string
          starts_at?: string | null
          status?: string
          style?: string | null
          subject?: string | null
          timezone?: string | null
          tone?: string | null
          total_generated?: number | null
          total_published?: number | null
          updated_at?: string
          user_id: string
          video_quality?: string | null
          videos_per_day?: number | null
          videos_per_month?: number | null
        }
        Update: {
          ai_context?: string | null
          campaign_type?: string
          created_at?: string
          ends_at?: string | null
          estimated_cost?: number | null
          format?: string | null
          id?: string
          image_quality?: string | null
          images_per_day?: number | null
          images_per_month?: number | null
          name?: string
          posting_hour?: number | null
          posts_per_week?: number | null
          project_id?: string
          starts_at?: string | null
          status?: string
          style?: string | null
          subject?: string | null
          timezone?: string | null
          tone?: string | null
          total_generated?: number | null
          total_published?: number | null
          updated_at?: string
          user_id?: string
          video_quality?: string | null
          videos_per_day?: number | null
          videos_per_month?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      generations: {
        Row: {
          actual_cost: number | null
          audio_url: string | null
          campaign_id: string | null
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
          logo_url: string | null
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
          logo_url?: string | null
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
          logo_url?: string | null
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
          content_type: string
          created_at: string
          error_message: string | null
          external_post_id: string | null
          id: string
          media_url: string | null
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
          content_type: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_url?: string | null
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
          content_type?: string
          created_at?: string
          error_message?: string | null
          external_post_id?: string | null
          id?: string
          media_url?: string | null
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
      tiktok_connections: {
        Row: {
          access_token: string
          avatar_url: string | null
          created_at: string
          display_name: string
          expires_at: string
          id: string
          open_id: string
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
          refresh_token?: string
          updated_at?: string
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
          refresh_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
