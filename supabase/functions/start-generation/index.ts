import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// GENERATION PROGRESS TRACKING
// Pattern: Create history BEFORE starting generation
// ============================================================

interface StartGenerationRequest {
  type: "video" | "image" | "reel" | "clipmotion" | "avatar";
  projectId?: string;
  campaignId?: string;
  prompt: string;
  script?: string;
  duration?: number;
  model?: string;
  quality?: string;
  format?: string;
  videoMode?: "standard" | "clipmotion";
  estimatedCost?: number;
}

interface UpdateProgressRequest {
  generationId: string;
  status?: "pending" | "generating" | "processing" | "completed" | "failed";
  progress?: number;
  step?: "initializing" | "script" | "image" | "video" | "voiceover" | "finalizing";
  externalTaskId?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  audioUrl?: string;
  errorMessage?: string;
  actualCost?: number;
}

// Calculate estimated cost based on model and duration
function calculateEstimatedCost(model: string, duration: number): number {
  const costPerSecond: Record<string, number> = {
    "sora-2": 0.15,      // ~$1.20 for 8s
    "veo-2": 0.05,       // ~$0.40 for 8s
    "kling-video": 0.04, // ~$0.35 for 8s
    "minimax-video-01": 0.04, // ~$0.30 for 8s
    "smart-video": 0.05,
    "high-video": 0.12,
    "cinema-video": 0.20,
  };
  
  const rate = costPerSecond[model] || 0.05;
  return rate * duration;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } });

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") || "start";
    const authHeader = req.headers.get("Authorization");

    // Get user from auth header
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUser = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseUser.auth.getUser(token);
    
    if (userError || !userData.user) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData.user.id;

    // ============================================================
    // ACTION: START - Create generation record BEFORE generating
    // ============================================================
    if (action === "start") {
      const body: StartGenerationRequest = await req.json();
      
      const estimatedCost = body.estimatedCost || calculateEstimatedCost(body.model || "smart-video", body.duration || 8);

      const { data: generation, error: insertError } = await supabaseAdmin
        .from("generations")
        .insert({
          user_id: userId,
          project_id: body.projectId || null,
          campaign_id: body.campaignId || null,
          type: body.type,
          video_mode: body.videoMode || "standard",
          status: "pending",
          progress: 0,
          step: "initializing",
          prompt: body.prompt,
          script: body.script,
          duration: body.duration || 8,
          model: body.model || "smart-video",
          quality: body.quality || "720p",
          format: body.format || "reel",
          estimated_cost: estimatedCost,
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("[START-GENERATION] Insert error:", insertError);
        throw new Error(`Failed to create generation record: ${insertError.message}`);
      }

      console.log(`[START-GENERATION] Created generation ${generation.id} for user ${userId}`);

      return new Response(
        JSON.stringify({
          success: true,
          generationId: generation.id,
          status: "pending",
          progress: 0,
          step: "initializing",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // ACTION: UPDATE - Update progress at each step
    // ============================================================
    if (action === "update") {
      const body: UpdateProgressRequest = await req.json();
      
      if (!body.generationId) {
        throw new Error("generationId is required");
      }

      const updateData: Record<string, unknown> = {};
      
      if (body.status !== undefined) updateData.status = body.status;
      if (body.progress !== undefined) updateData.progress = body.progress;
      if (body.step !== undefined) updateData.step = body.step;
      if (body.externalTaskId !== undefined) updateData.external_task_id = body.externalTaskId;
      if (body.mediaUrl !== undefined) updateData.media_url = body.mediaUrl;
      if (body.thumbnailUrl !== undefined) updateData.thumbnail_url = body.thumbnailUrl;
      if (body.audioUrl !== undefined) updateData.audio_url = body.audioUrl;
      if (body.errorMessage !== undefined) updateData.error_message = body.errorMessage;
      if (body.actualCost !== undefined) updateData.actual_cost = body.actualCost;
      
      // Set completed_at when status is completed or failed
      if (body.status === "completed" || body.status === "failed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { data: updated, error: updateError } = await supabaseAdmin
        .from("generations")
        .update(updateData)
        .eq("id", body.generationId)
        .eq("user_id", userId) // Ensure user owns this generation
        .select()
        .single();

      if (updateError) {
        console.error("[UPDATE-GENERATION] Update error:", updateError);
        throw new Error(`Failed to update generation: ${updateError.message}`);
      }

      console.log(`[UPDATE-GENERATION] Updated ${body.generationId}: status=${body.status}, progress=${body.progress}%, step=${body.step}`);

      return new Response(
        JSON.stringify({
          success: true,
          generationId: updated.id,
          status: updated.status,
          progress: updated.progress,
          step: updated.step,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // ACTION: STATUS - Get current generation status
    // ============================================================
    if (action === "status") {
      const generationId = url.searchParams.get("generationId");
      
      if (!generationId) {
        throw new Error("generationId is required");
      }

      const { data: generation, error: fetchError } = await supabaseAdmin
        .from("generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", userId)
        .single();

      if (fetchError) {
        throw new Error(`Generation not found: ${fetchError.message}`);
      }

      return new Response(
        JSON.stringify({
          success: true,
          generation,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // ACTION: LIST - Get all generations for user
    // ============================================================
    if (action === "list") {
      const type = url.searchParams.get("type");
      const status = url.searchParams.get("status");
      const limit = parseInt(url.searchParams.get("limit") || "50");
      const offset = parseInt(url.searchParams.get("offset") || "0");

      let query = supabaseAdmin
        .from("generations")
        .select("*", { count: "exact" })
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (type) query = query.eq("type", type);
      if (status) query = query.eq("status", status);

      const { data: generations, error: listError, count } = await query;

      if (listError) {
        throw new Error(`Failed to list generations: ${listError.message}`);
      }

      // Also get active generations (not completed/failed) for real-time progress
      const { data: activeGenerations } = await supabaseAdmin
        .from("generations")
        .select("*")
        .eq("user_id", userId)
        .not("status", "in", '("completed","failed")')
        .order("created_at", { ascending: false });

      return new Response(
        JSON.stringify({
          success: true,
          generations,
          activeGenerations: activeGenerations || [],
          total: count,
          limit,
          offset,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================================
    // ACTION: RETRY - Retry a failed generation
    // ============================================================
    if (action === "retry") {
      const body = await req.json();
      const generationId = body.generationId;

      if (!generationId) {
        throw new Error("generationId is required");
      }

      // Get original generation
      const { data: original, error: fetchError } = await supabaseAdmin
        .from("generations")
        .select("*")
        .eq("id", generationId)
        .eq("user_id", userId)
        .single();

      if (fetchError || !original) {
        throw new Error("Generation not found");
      }

      // Reset for retry
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("generations")
        .update({
          status: "pending",
          progress: 0,
          step: "initializing",
          error_message: null,
          retry_count: (original.retry_count || 0) + 1,
          started_at: new Date().toISOString(),
          completed_at: null,
        })
        .eq("id", generationId)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Failed to retry generation: ${updateError.message}`);
      }

      console.log(`[RETRY-GENERATION] Retrying ${generationId}, attempt ${updated.retry_count}`);

      return new Response(
        JSON.stringify({
          success: true,
          generationId: updated.id,
          retryCount: updated.retry_count,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (error) {
    console.error("[START-GENERATION] Error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
