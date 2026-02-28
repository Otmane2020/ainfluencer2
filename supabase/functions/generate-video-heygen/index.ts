import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const HEYGEN_BASE = "https://api.heygen.com";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const HEYGEN_API_KEY = Deno.env.get("HEYGEN_API_KEY");
    if (!HEYGEN_API_KEY) {
      return new Response(JSON.stringify({ error: "HEYGEN_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Auth check
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json();
    const { action } = body;

    // ============================================================
    // ACTION: create — Start a HeyGen avatar video generation
    // ============================================================
    if (action === "create") {
      const {
        script,
        avatarId = "Daisy-inskirt-20220818",
        voiceId,
        duration,
        credits = 100,
        projectId,
        aspectRatio = "9:16",
      } = body;

      if (!script) {
        return new Response(JSON.stringify({ error: "Script is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Deduct credits
      const { data: deducted } = await supabase.rpc("deduct_credits", {
        p_user_id: userId,
        p_amount: credits,
      });
      if (!deducted) {
        return new Response(JSON.stringify({ error: "Insufficient credits", code: "INSUFFICIENT_CREDITS" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Log credit transaction
      await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: -credits,
        type: "heygen_video",
        description: `HeyGen avatar video (${duration || 30}s)`,
      });

      // Create generation record
      const { data: gen, error: genErr } = await supabase
        .from("generations")
        .insert({
          user_id: userId,
          project_id: projectId || null,
          type: "video",
          video_mode: "heygen",
          status: "processing",
          step: "heygen_rendering",
          progress: 10,
          prompt: script,
          script,
          model: `heygen-avatar`,
          provider: "heygen",
          quality: "1080p",
          format: aspectRatio === "16:9" ? "landscape" : "vertical",
          duration: duration || 30,
          estimated_cost: credits,
        })
        .select("id")
        .single();

      if (genErr) throw genErr;
      const generationId = gen.id;

      // Call HeyGen V2 API
      const dimension = aspectRatio === "16:9"
        ? { width: 1920, height: 1080 }
        : { width: 1080, height: 1920 };

      const heygenPayload: any = {
        video_inputs: [
          {
            character: {
              type: "avatar",
              avatar_id: avatarId,
              avatar_style: "normal",
            },
            voice: voiceId
              ? { type: "text", voice_id: voiceId, input_text: script }
              : { type: "text", voice_id: "f38a635bee7a4d1f9b0a654a31d050d2", input_text: script },
            background: {
              type: "color",
              value: "#000000",
            },
          },
        ],
        dimension,
        test: false,
      };

      const heygenRes = await fetch(`${HEYGEN_BASE}/v2/video/generate`, {
        method: "POST",
        headers: {
          "X-Api-Key": HEYGEN_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(heygenPayload),
      });

      const heygenData = await heygenRes.json();
      console.log("[HeyGen] Create response:", JSON.stringify(heygenData));

      if (!heygenRes.ok || heygenData.error) {
        // Refund credits on failure
        await supabase.rpc("add_credits", { p_user_id: userId, p_amount: credits });
        await supabase.from("credit_transactions").insert({
          user_id: userId,
          amount: credits,
          type: "refund",
          description: `HeyGen video failed: ${heygenData.error?.message || heygenRes.status}`,
        });
        await supabase.from("generations").update({
          status: "failed",
          error_message: heygenData.error?.message || `HeyGen API error ${heygenRes.status}`,
        }).eq("id", generationId);

        return new Response(JSON.stringify({ error: heygenData.error?.message || "HeyGen API error" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const videoId = heygenData.data?.video_id;

      // Update generation with external task ID
      await supabase.from("generations").update({
        external_task_id: videoId,
        progress: 20,
        step: "heygen_processing",
      }).eq("id", generationId);

      return new Response(JSON.stringify({
        success: true,
        generationId,
        videoId,
        status: "processing",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: status — Check HeyGen video status
    // ============================================================
    if (action === "status") {
      const { videoId, generationId } = body;
      if (!videoId) {
        return new Response(JSON.stringify({ error: "videoId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const statusRes = await fetch(`${HEYGEN_BASE}/v1/video_status.get?video_id=${videoId}`, {
        headers: { "X-Api-Key": HEYGEN_API_KEY },
      });
      const statusData = await statusRes.json();
      console.log("[HeyGen] Status:", JSON.stringify(statusData));

      const videoStatus = statusData.data?.status;
      const videoUrl = statusData.data?.video_url;
      const thumbnailUrl = statusData.data?.thumbnail_url;

      // Calculate simulated progress based on elapsed time (HeyGen doesn't provide granular progress)
      let estimatedProgress = 0;
      if (generationId) {
        const { data: genRow } = await supabase
          .from("generations")
          .select("created_at, duration")
          .eq("id", generationId)
          .single();

        if (genRow) {
          const elapsedSec = (Date.now() - new Date(genRow.created_at).getTime()) / 1000;
          const expectedDuration = Math.max((genRow.duration || 30) * 4, 60); // ~4x real duration for render
          estimatedProgress = Math.min(85, Math.round((elapsedSec / expectedDuration) * 85) + 10);
        }

        if (videoStatus === "completed" && videoUrl) {
          // Download video and upload to our storage
          const videoRes = await fetch(videoUrl);
          const videoBlob = await videoRes.arrayBuffer();
          const storagePath = `videos/heygen-${generationId}.mp4`;
          await supabase.storage.from("media").upload(storagePath, videoBlob, {
            contentType: "video/mp4",
            upsert: true,
          });
          const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(storagePath);

          await supabase.from("generations").update({
            status: "completed",
            progress: 100,
            media_url: publicUrlData.publicUrl,
            thumbnail_url: thumbnailUrl || null,
            completed_at: new Date().toISOString(),
          }).eq("id", generationId);
          estimatedProgress = 100;
        } else if (videoStatus === "failed") {
          // Refund on failure
          const { data: genData } = await supabase
            .from("generations")
            .select("estimated_cost, user_id")
            .eq("id", generationId)
            .single();
          if (genData) {
            const refundAmount = genData.estimated_cost || 100;
            await supabase.rpc("add_credits", { p_user_id: genData.user_id, p_amount: refundAmount });
            await supabase.from("credit_transactions").insert({
              user_id: genData.user_id,
              amount: refundAmount,
              type: "refund",
              description: "HeyGen video generation failed",
            });
          }
          await supabase.from("generations").update({
            status: "failed",
            error_message: statusData.data?.error || "HeyGen rendering failed",
          }).eq("id", generationId);
          estimatedProgress = 0;
        } else if (videoStatus === "processing") {
          await supabase.from("generations").update({
            progress: estimatedProgress,
          }).eq("id", generationId);
        }
      }

      return new Response(JSON.stringify({
        status: videoStatus,
        videoUrl,
        thumbnailUrl,
        progress: estimatedProgress,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: avatars — List available HeyGen avatars
    // ============================================================
    if (action === "avatars") {
      const avatarRes = await fetch(`${HEYGEN_BASE}/v2/avatars`, {
        headers: { "X-Api-Key": HEYGEN_API_KEY },
      });
      const avatarData = await avatarRes.json();

      return new Response(JSON.stringify({
        avatars: avatarData.data?.avatars || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: cache-avatars — Store avatars in DB for fast loading
    // ============================================================
    if (action === "cache-avatars") {
      const { avatars: avatarList } = body;
      if (!avatarList || !Array.isArray(avatarList)) {
        return new Response(JSON.stringify({ error: "avatars array required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Upsert public avatars (user_id = null)
      for (const a of avatarList.slice(0, 100)) {
        await supabase.from("heygen_avatars").upsert({
          avatar_id: a.avatar_id,
          avatar_name: a.avatar_name,
          gender: a.gender || null,
          category: a.category || "all",
          preview_image_url: a.preview_image_url || null,
          preview_video_url: a.preview_video_url || null,
          scenes: a.scenes || [],
          cached_at: new Date().toISOString(),
          user_id: null,
        }, { onConflict: "avatar_id" });
      }

      return new Response(JSON.stringify({ success: true, cached: avatarList.length }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================================
    // ACTION: voices — List available HeyGen voices
    // ============================================================
    if (action === "voices") {
      const voiceRes = await fetch(`${HEYGEN_BASE}/v2/voices`, {
        headers: { "X-Api-Key": HEYGEN_API_KEY },
      });
      const voiceData = await voiceRes.json();

      return new Response(JSON.stringify({
        voices: voiceData.data?.voices || [],
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: create, status, avatars, voices, cache-avatars" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[HeyGen] Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
