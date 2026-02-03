import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

/* ===================== CORS ===================== */
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

/* ===================== CONSTANTS ===================== */
const DID_API_BASE = "https://api.d-id.com";

// Default Pro Avatar presenter with natural body movements
const DEFAULT_PRESENTER_ID = "amy-Aq6OmGZnMt";

/* ===================== TYPES ===================== */
interface DIDClipCreateRequest {
  audioUrl?: string;
  text?: string;
  presenterId?: string;
  voiceId?: string;
}

interface DIDClipResponse {
  id: string;
  status: string;
  result_url?: string;
  error?: { kind: string; description: string };
}

/* ===================== SERVER ===================== */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "create";

    const D_ID_API_KEY = Deno.env.get("D_ID_API_KEY");

    if (!D_ID_API_KEY) {
      console.error("[D-ID] API key missing");
      return new Response(
        JSON.stringify({
          success: false,
          error: "D-ID API key not configured",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const authHeader = `Basic ${btoa(D_ID_API_KEY + ":")}`;

    /* ---------- LIST PRESENTERS ---------- */
    if (action === "presenters") {
      console.log("[D-ID] Fetching available presenters...");

      const response = await fetch(`${DID_API_BASE}/clips/presenters`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      const responseText = await response.text();
      console.log("[D-ID] Presenters response:", response.status);

      if (!response.ok) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `Failed to fetch presenters: ${response.status}`,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const presenters = JSON.parse(responseText);
      return new Response(
        JSON.stringify({
          success: true,
          presenters: presenters.clips_presenters || [],
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------- CREATE CLIP (Pro Avatar with body movements) ---------- */
    if (action === "create" && req.method === "POST") {
      const { audioUrl, text, presenterId, voiceId } = (await req.json()) as DIDClipCreateRequest;

      if (!audioUrl && !text) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Either audioUrl or text is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const selectedPresenterId = presenterId || DEFAULT_PRESENTER_ID;

      console.log("[D-ID] Creating clip with Pro Avatar...", {
        presenterId: selectedPresenterId,
        hasAudio: !!audioUrl,
        hasText: !!text,
      });

      // Build the script object based on input
      const script: Record<string, unknown> = audioUrl
        ? {
            type: "audio",
            audio_url: audioUrl,
          }
        : {
            type: "text",
            input: text,
            provider: {
              type: "elevenlabs",
              voice_id: voiceId || "21m00Tcm4TlvDq8ikWAM", // Default ElevenLabs voice
            },
          };

      const requestBody = {
        presenter_id: selectedPresenterId,
        script,
        config: {
          result_format: "mp4",
        },
      };

      console.log("[D-ID] Clips request body:", JSON.stringify(requestBody));

      const response = await fetch(`${DID_API_BASE}/clips`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      const responseText = await response.text();
      console.log("[D-ID] Response status:", response.status);
      console.log("[D-ID] Response body:", responseText);

      if (!response.ok) {
        console.error("[D-ID] API error:", response.status, responseText);

        let errorMsg = `D-ID API error: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          if (errorData.description) {
            errorMsg = errorData.description;
          } else if (errorData.message) {
            errorMsg = errorData.message;
          } else if (errorData.error?.description) {
            errorMsg = errorData.error.description;
          }
        } catch {
          errorMsg = responseText || errorMsg;
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: errorMsg,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = JSON.parse(responseText) as DIDClipResponse;
      console.log("[D-ID] Clip created:", result.id, "Status:", result.status);

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status: mapDIDStatus(result.status),
          videoUrl: result.result_url || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    /* ---------- STATUS ---------- */
    if (action === "status") {
      const taskId = url.searchParams.get("taskId");
      if (!taskId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "taskId is required",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      console.log(`[D-ID] Checking status for clip: ${taskId}`);

      const response = await fetch(`${DID_API_BASE}/clips/${taskId}`, {
        method: "GET",
        headers: {
          Authorization: authHeader,
        },
      });

      const responseText = await response.text();
      console.log("[D-ID] Status response:", response.status, responseText);

      if (!response.ok) {
        console.error("[D-ID] Status check failed:", response.status);

        if (response.status === 404) {
          return new Response(
            JSON.stringify({
              success: false,
              error: `Clip ${taskId} not found`,
            }),
            {
              status: 404,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            },
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: `D-ID API error: ${response.status}`,
          }),
          {
            status: response.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      const result = JSON.parse(responseText) as DIDClipResponse;
      const status = mapDIDStatus(result.status);

      console.log("[D-ID] Clip status:", result.status, "->", status);

      return new Response(
        JSON.stringify({
          success: true,
          taskId: result.id,
          status,
          didStatus: result.status,
          videoUrl: result.result_url || null,
          error: result.error?.description || null,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: `Unknown action: ${action}. Use 'create', 'status', or 'presenters'`,
      }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("[D-ID Server Error]:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});

/* ===================== HELPERS ===================== */
function mapDIDStatus(didStatus: string): string {
  switch (didStatus?.toLowerCase()) {
    case "created":
    case "started":
      return "queued";
    case "pending":
    case "processing":
      return "in_progress";
    case "done":
      return "completed";
    case "error":
    case "rejected":
      return "failed";
    default:
      return "queued";
  }
}
