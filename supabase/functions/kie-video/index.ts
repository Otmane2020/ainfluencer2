import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const KIE_API_BASE = "https://api.kie.ai/api";

function getKieHeaders(): Record<string, string> {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) throw new Error("KIE_API_KEY is not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

// Map internal model/mode combos to KIE Market API model names
function getKieModelName(model: string, mode: string): string {
  const modelMap: Record<string, Record<string, string>> = {
    "wan-2.6": {
      "text-to-video": "wan/2-6-text-to-video",
      "image-to-video": "wan/2-6-image-to-video",
    },
    "kling-2.6": {
      "text-to-video": "kling-2.6/text-to-video",
      "image-to-video": "kling-2.6/image-to-video",
    },
  };
  return modelMap[model]?.[mode] || `${model}/${mode}`;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    // ── Status check ──
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        return new Response(
          JSON.stringify({ success: false, error: "taskId is required" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log(`[KIE-Video] Checking status: ${taskId}`);
      const resp = await fetch(
        `${KIE_API_BASE}/v1/jobs/recordInfo?taskId=${encodeURIComponent(taskId)}`,
        { method: "GET", headers: getKieHeaders() }
      );

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Status check failed: ${resp.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      const taskData = data.data;

      if (!taskData) {
        return new Response(
          JSON.stringify({ success: false, error: "No task data in response" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Map KIE states to our internal states
      const stateMap: Record<string, string> = {
        waiting: "pending",
        queuing: "pending",
        generating: "processing",
        success: "completed",
        fail: "failed",
      };

      // Parse resultJson for video URL
      let videoUrl: string | undefined;
      if (taskData.state === "success" && taskData.resultJson) {
        try {
          const resultData = typeof taskData.resultJson === "string"
            ? JSON.parse(taskData.resultJson)
            : taskData.resultJson;
          videoUrl = resultData.resultUrls?.[0] || resultData.url || resultData.video_url;
        } catch (e) {
          console.error("[KIE-Video] Failed to parse resultJson:", e);
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          status: stateMap[taskData.state] || "pending",
          videoUrl,
          error: taskData.failMsg || undefined,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create task ──
    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const { model, mode, prompt, imageUrl, duration = 5, resolution = "720p", withAudio = false, aspectRatio = "16:9" } = body;

      if (!model) return new Response(JSON.stringify({ success: false, error: "model is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!mode) return new Response(JSON.stringify({ success: false, error: "mode is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (mode === "text-to-video" && !prompt) return new Response(JSON.stringify({ success: false, error: "prompt is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const kieModelName = getKieModelName(model, mode);

      // Build input payload
      const input: Record<string, unknown> = {
        prompt: prompt || "",
        aspect_ratio: aspectRatio,
        duration: String(duration),
      };

      if (imageUrl) input.image_url = imageUrl;
      if (model === "wan-2.6") input.resolution = resolution;
      if (model === "kling-2.6") input.sound = withAudio;

      console.log(`[KIE-Video] Creating: ${kieModelName} | ${duration}s`);

      const resp = await fetch(`${KIE_API_BASE}/v1/jobs/createTask`, {
        method: "POST",
        headers: getKieHeaders(),
        body: JSON.stringify({ model: kieModelName, input }),
      });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[KIE-Video] Error ${resp.status}:`, errText.slice(0, 300));
        return new Response(
          JSON.stringify({ success: false, error: `KIE API error: ${resp.status}` }),
          { status: resp.status === 429 ? 429 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      const taskId = data.data?.taskId;
      if (!taskId) return new Response(JSON.stringify({ success: false, error: "No taskId in response" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      console.log(`[KIE-Video] Task created: ${taskId}`);
      return new Response(
        JSON.stringify({ success: true, taskId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── List models ──
    if (action === "models") {
      return new Response(
        JSON.stringify({
          success: true,
          models: [
            { id: "wan-2.6", name: "Wan 2.6", modes: ["text-to-video", "image-to-video"], durations: [5, 10, 15], resolutions: ["720p", "1080p"] },
            { id: "kling-2.6", name: "Kling 2.6", modes: ["text-to-video", "image-to-video"], durations: [5, 10], supportsAudio: true },
          ],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: `Unknown action: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[KIE-Video] Error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
