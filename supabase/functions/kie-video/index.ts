import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

const KIE_API_BASE = "https://kie.ai/api";

function getKieHeaders(): Record<string, string> {
  const key = Deno.env.get("KIE_API_KEY");
  if (!key) throw new Error("KIE_API_KEY is not configured");
  return {
    "Authorization": `Bearer ${key}`,
    "Content-Type": "application/json",
  };
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
      const resp = await fetch(`${KIE_API_BASE}/v1/task/${taskId}`, {
        method: "GET",
        headers: getKieHeaders(),
      });

      if (!resp.ok) {
        return new Response(
          JSON.stringify({ success: false, error: `Status check failed: ${resp.status}` }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      const rawStatus = (data.status || data.data?.status || "pending").toLowerCase();
      const statusMap: Record<string, string> = {
        success: "completed", completed: "completed", succeed: "completed",
        failed: "failed", error: "failed",
        processing: "processing", running: "processing",
      };
      const result = data.result || data.data?.result || data.data;

      return new Response(
        JSON.stringify({
          success: true,
          status: statusMap[rawStatus] || "pending",
          videoUrl: result?.url || result?.video_url,
          duration: result?.duration,
          error: data.error || data.data?.error,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Create task ──
    if (action === "create" && req.method === "POST") {
      const body = await req.json();
      const { model, mode, prompt, imageUrl, videoUrl, duration = 5, resolution = "720p", withAudio = false, aspectRatio = "16:9" } = body;

      if (!model) return new Response(JSON.stringify({ success: false, error: "model is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!mode) return new Response(JSON.stringify({ success: false, error: "mode is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (mode === "text-to-video" && !prompt) return new Response(JSON.stringify({ success: false, error: "prompt is required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      const modelPath = model === "wan-2.6" ? "wan/2.6" : "kling/2.6";
      const endpoint = `${KIE_API_BASE}/v1/${modelPath}/${mode}`;

      const payload: Record<string, unknown> = { prompt: prompt || "", aspect_ratio: aspectRatio };
      if (imageUrl) payload.image_url = imageUrl;
      if (videoUrl) payload.video_url = videoUrl;
      payload.duration = `${duration}s`;
      if (model === "wan-2.6") payload.resolution = resolution;
      if (model === "kling-2.6") payload.with_audio = withAudio;

      console.log(`[KIE-Video] Creating: ${model} ${mode} | ${duration}s`);

      const resp = await fetch(endpoint, { method: "POST", headers: getKieHeaders(), body: JSON.stringify(payload) });

      if (!resp.ok) {
        const errText = await resp.text();
        console.error(`[KIE-Video] Error ${resp.status}:`, errText.slice(0, 300));
        return new Response(
          JSON.stringify({ success: false, error: `KIE API error: ${resp.status}` }),
          { status: resp.status === 429 ? 429 : 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const data = await resp.json();
      const taskId = data.task_id || data.data?.task_id;
      if (!taskId) return new Response(JSON.stringify({ success: false, error: "No task_id in response" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

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
            { id: "wan-2.6", name: "Wan 2.6", modes: ["text-to-video", "image-to-video", "video-to-video"], durations: [5, 10, 15], resolutions: ["720p", "1080p"] },
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
