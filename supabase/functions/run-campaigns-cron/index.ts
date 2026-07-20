import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { 
  validateAndBuildContext, 
  logContextValidation,
  type MarketingContext 
} from "../_shared/generation-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Valid plans for AutoPost access
const AUTOPOST_VALID_PLANS = ["pro", "business"];
const AUTOPOST_VALID_PRODUCTS = [
  "prod_TsR9BN6zNpq8Rp", // Pro
  "prod_TsR93v9Am93N8O", // Business
];

// ============================================================
// SUBSCRIPTION VERIFICATION FOR AUTOPOST
// ============================================================
async function verifyAutoPostAccess(
  userId: string,
  userEmail: string | null,
  supabase: any
): Promise<{ valid: boolean; error?: string }> {
  try {
    // Check for lifetime grant first
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("plan_id, stripe_customer_id, status")
      .eq("user_id", userId)
      .maybeSingle();

    if (subscription?.stripe_customer_id === "lifetime_grant") {
      console.log(`[AUTOPOST-ACCESS] Lifetime grant for ${userId}`);
      return { valid: true };
    }

    // Check local subscription record
    if (subscription && AUTOPOST_VALID_PLANS.includes(subscription.plan_id) && subscription.status === "active") {
      console.log(`[AUTOPOST-ACCESS] Local subscription valid: ${subscription.plan_id}`);
      return { valid: true };
    }

    // Fallback: Verify with Stripe if email available
    if (userEmail) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (stripeKey) {
        try {
          const stripe = new Stripe(stripeKey);
          const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
          
          if (customers.data.length > 0) {
            const subscriptions = await stripe.subscriptions.list({
              customer: customers.data[0].id,
              status: "active",
              limit: 1,
            });

            if (subscriptions.data.length > 0) {
              const sub = subscriptions.data[0];
              const hasValidProduct = sub.items.data.some((item: any) => {
                const productId = typeof item.price.product === "string" 
                  ? item.price.product 
                  : item.price.product.id;
                return AUTOPOST_VALID_PRODUCTS.includes(productId);
              });

              if (hasValidProduct) {
                console.log(`[AUTOPOST-ACCESS] Stripe verified for ${userEmail}`);
                return { valid: true };
              }
            }
          }
        } catch (stripeError) {
          console.error("[AUTOPOST-ACCESS] Stripe check failed:", stripeError);
        }
      }
    }

    return { valid: false, error: "AutoPost requires Pro or Business plan" };
  } catch (error) {
    console.error("[AUTOPOST-ACCESS] Error:", error);
    return { valid: false, error: "Subscription check failed" };
  }
}

// ============================================================
// AUTOPOST QUALITY CONFIGURATION
// Uses quality tiers: standard (Fast), pro (Medium), cinema (High)
// ============================================================

const IMAGE_QUALITY_CONFIG = {
  standard: { model: "google/gemini-2.5-flash-image", provider: "lovable", cost: 1 },
  pro: { model: "google/gemini-3-pro-image-preview", provider: "lovable", cost: 3 },
  cinema: { model: "google/gemini-3-pro-image-preview", provider: "lovable", cost: 5 },
};

// Sora 2 valid durations: 4, 8, 12 seconds only
const VIDEO_QUALITY_CONFIG = {
  standard: { duration: 4, resolution: "720x1280", cost: 5 },
  pro: { duration: 8, resolution: "1080x1920", cost: 10 },
  cinema: { duration: 12, resolution: "1080x1920", cost: 20 },
};

interface Campaign {
  id: string;
  name: string;
  status: string;
  posting_hour: number | null;
  user_id: string;
  project_id: string;
  total_published: number | null;
  total_generated: number | null;
  image_quality?: string | null;
  video_quality?: string | null;
  projects?: { 
    name: string; 
    detected_language: string | null; 
    description: string | null; 
    logo_url: string | null; 
    url: string | null;
    theme_color: string | null;
    marketing_context: any;
    ai_context_summary: string | null;
    scraped_markdown: string | null;
    avatar_url: string | null;
  };
}

interface ProjectContext {
  id?: string;
  name: string;
  detected_language: string | null;
  description: string | null;
  logo_url: string | null;
  url: string | null;
  theme_color: string | null;
  marketing_context: MarketingContext | null;
  ai_context_summary: string | null;
  scraped_markdown: string | null;
  avatar_url: string | null;
  meta_page_id?: string | null;
  meta_instagram_id?: string | null;
}

interface ScheduledPost {
  id: string;
  user_id: string;
  content_type: string;
  media_url: string | null;
  ai_prompt: string | null;
  text_content: string | null;
  platforms: string[] | null;
  campaign_id: string | null;
  project_id: string;
}

// ============================================================
// IMAGE GENERATION – Multi-provider fallback chain
// Lovable AI → OpenAI DALL-E → Gemini Direct → Kling Direct → Replicate FLUX
// ============================================================

async function uploadBase64ToStorage(base64: string, supabase: any): Promise<string | null> {
  const clean = base64.replace(/^data:image\/\w+;base64,/, "");
  const bytes = Uint8Array.from(atob(clean), (c) => c.charCodeAt(0));
  const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
  const { error } = await supabase.storage.from("media").upload(path, bytes, { contentType: "image/png", upsert: true });
  if (error) {
    console.error("[upload] error:", error);
    return null;
  }
  const { data } = supabase.storage.from("media").getPublicUrl(path);
  return data.publicUrl;
}

async function uploadUrlToStorage(url: string, supabase: any): Promise<string | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return url; // fallback to original URL
    const buf = new Uint8Array(await resp.arrayBuffer());
    const ext = url.includes(".webp") ? "webp" : "png";
    const path = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, buf, { contentType: `image/${ext}`, upsert: true });
    if (error) return url;
    const { data } = supabase.storage.from("media").getPublicUrl(path);
    return data.publicUrl;
  } catch { return url; }
}

async function tryLovableAI(prompt: string, _model: string): Promise<string | null> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return null;
  
  // Try Gemini image generation via chat completions (primary)
  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ 
      model: "google/gemini-3-pro-image-preview", 
      messages: [{ role: "user", content: prompt.slice(0, 3000) }], 
      modalities: ["image", "text"] 
    }),
  });
  if (!resp.ok) { 
    const errText = await resp.text().catch(() => "");
    console.error(`[Lovable-Gemini3] ${resp.status} ${errText}`); 
    // Try flash image as fallback
    const resp2 = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: "google/gemini-2.5-flash-image", 
        messages: [{ role: "user", content: prompt.slice(0, 3000) }], 
        modalities: ["image", "text"] 
      }),
    });
    if (!resp2.ok) { console.error(`[Lovable-Gemini2.5] ${resp2.status}`); return null; }
    const data2 = await resp2.json();
    const imgUrl2 = data2.choices?.[0]?.message?.images?.[0]?.image_url?.url 
      || data2.choices?.[0]?.message?.content?.[0]?.image_url?.url;
    if (imgUrl2) { console.log("[Lovable] ✅ Image generated via gemini-2.5-flash-image"); return imgUrl2; }
    return null;
  }
  const data = await resp.json();
  const imgUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url 
    || data.choices?.[0]?.message?.content?.[0]?.image_url?.url;
  if (imgUrl) { console.log("[Lovable] ✅ Image generated via gemini-3-pro-image-preview"); return imgUrl; }
  return null;
}

async function tryOpenAIDalle(prompt: string): Promise<string | null> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) return null;
  const resp = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "dall-e-3", prompt: prompt.slice(0, 4000), n: 1, size: "1024x1024", quality: "hd" }),
  });
  if (!resp.ok) { console.error(`[DALL-E] ${resp.status}`); return null; }
  const data = await resp.json();
  return data.data?.[0]?.url || null;
}

async function tryGeminiDirect(prompt: string): Promise<string | null> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) return null;
  const models = ["gemini-2.0-flash-exp"];
  for (const model of models) {
    try {
      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
        }),
      });
      if (!resp.ok) continue;
      const data = await resp.json();
      const parts = data.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        if (part.inlineData?.mimeType?.startsWith("image/")) {
          return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }
    } catch { continue; }
  }
  return null;
}

// Kling JWT helper (same as generate-video-kling)
function klingBase64Url(input: Uint8Array | string): string {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function generateKlingJWT(accessKeyId: string, accessKeySecret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = klingBase64Url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = klingBase64Url(JSON.stringify({ iss: accessKeyId, exp: now + 1800, nbf: now - 5 }));
  const data = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(accessKeySecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return `${data}.${klingBase64Url(new Uint8Array(signature))}`;
}

async function tryKlingDirect(prompt: string): Promise<string | null> {
  const ak = Deno.env.get("KLING_API_KEY");
  const sk = Deno.env.get("KLING_API_SECRET");
  if (!ak || !sk) { console.log("[Kling] Missing KLING_API_KEY or KLING_API_SECRET"); return null; }
  
  const jwt = await generateKlingJWT(ak, sk);
  const resp = await fetch("https://api.klingai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "kling-v1", prompt: prompt.slice(0, 2500), n: 1, aspect_ratio: "1:1" }),
  });
  if (!resp.ok) { console.error(`[Kling] ${resp.status} ${await resp.text().catch(() => "")}`); return null; }
  const data = await resp.json();
  const taskId = data.data?.task_id;
  if (!taskId) { console.error("[Kling] No task_id in response"); return null; }
  console.log(`[Kling] Image task created: ${taskId}`);
  
  // Poll up to 2 min
  for (let i = 0; i < 24; i++) {
    await new Promise(r => setTimeout(r, 5000));
    const freshJwt = await generateKlingJWT(ak, sk);
    const sr = await fetch(`https://api.klingai.com/v1/images/generations/${taskId}`, {
      headers: { Authorization: `Bearer ${freshJwt}` },
    });
    if (!sr.ok) continue;
    const sd = await sr.json();
    if (sd.data?.task_status === "succeed") {
      console.log("[Kling] Image generation succeeded ✅");
      return sd.data?.task_result?.images?.[0]?.url || null;
    }
    if (sd.data?.task_status === "failed") { console.error("[Kling] Image generation failed"); return null; }
  }
  return null;
}

async function tryReplicateFlux(prompt: string): Promise<string | null> {
  const key = Deno.env.get("REPLICATE_API_KEY");
  if (!key) return null;
  const resp = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      version: "5a43415e8f84b1e2f48b42a1e3a869e3c1c4b966f0aaa877c80bfaca5e0471bf",
      input: { prompt: prompt.slice(0, 2000), aspect_ratio: "1:1", output_format: "png" },
    }),
  });
  if (!resp.ok) { console.error(`[Replicate] ${resp.status}`); return null; }
  const pred = await resp.json();
  const getUrl = pred.urls?.get;
  if (!getUrl) return null;
  for (let i = 0; i < 60; i++) {
    await new Promise(r => setTimeout(r, 3000));
    const sr = await fetch(getUrl, { headers: { Authorization: `Bearer ${key}` } });
    if (!sr.ok) continue;
    const sd = await sr.json();
    if (sd.status === "succeeded") return sd.output?.[0] || null;
    if (sd.status === "failed") return null;
  }
  return null;
}

async function generateImage(
  prompt: string, 
  supabase: any, 
  project: ProjectContext,
  quality: string = "pro"
): Promise<string | null> {
  const config = IMAGE_QUALITY_CONFIG[quality as keyof typeof IMAGE_QUALITY_CONFIG] || IMAGE_QUALITY_CONFIG.pro;

  // Build advertising-grade prompt
  let imagePrompt = prompt;
  const isGenericAngle = prompt.length < 200 && !prompt.toLowerCase().includes("image") && !prompt.toLowerCase().includes("visual") && !prompt.toLowerCase().includes("photo");
  
  if (isGenericAngle && project.description) {
    const brandDesc = project.description || project.name;
    const brandColor = project.theme_color || "#2563EB";
    const lang = project.detected_language || "en";
    const langMap: Record<string, string> = { fr: "French", en: "English", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese" };
    const langName = langMap[lang] || "English";
    
    imagePrompt = `Create a premium advertisement visual for "${project.name}".
=== SCENE ===
${brandDesc}
Visual concept: ${prompt}.
iPhone or laptop mockup showing a modern app interface on a clean desk.
Soft natural studio lighting, depth of field, Apple-style product photography.
Minimalist composition, one clear focal point.
=== STYLE ===
Modern SaaS marketing ad — like Apple, Stripe, or Notion campaigns.
Color palette: ${brandColor} as dominant brand accent.
Professional, premium, startup aesthetic. Perfect for LinkedIn / Facebook Ads.
=== TEXT ===
Allow clean marketing typography: a short slogan or CTA (3-5 words max) in ${langName}.
Large bold modern sans-serif, high contrast, mobile-readable.
Image must be 90% visual, 10% text maximum.
=== FORMAT ===
1:1 square, ultra high resolution.
=== BANNED ===
Generic clip-art, stock photo clichés, walls of text, fake dashboard data.
${lang !== "en" ? `Do NOT use English text — all text must be in ${langName}.` : ""}`;
  }

  // Shared context guard
  const contextGuard = validateAndBuildContext({
    projectName: project.name,
    projectDescription: project.description || undefined,
    projectUrl: project.url || undefined,
    logoUrl: project.logo_url || undefined,
    avatarUrl: project.avatar_url || undefined,
    themeColor: project.theme_color || undefined,
    detectedLanguage: project.detected_language || "en",
    marketingContext: project.marketing_context,
    aiContextSummary: project.ai_context_summary || undefined,
    scrapedMarkdown: project.scraped_markdown || undefined,
    generationPrompt: `${imagePrompt}. Ultra high resolution, professional quality, 1:1 square format.`,
    generationType: "image",
  });
  logContextValidation(contextGuard, "CRON-IMAGE");
  const finalPrompt = contextGuard.enhancedPrompt;

  // ── Fallback chain ──
  const providers = [
    { name: "Lovable AI", fn: () => tryLovableAI(finalPrompt, config.model) },
    { name: "OpenAI DALL-E", fn: () => tryOpenAIDalle(finalPrompt) },
    { name: "Gemini Direct", fn: () => tryGeminiDirect(finalPrompt) },
    { name: "Kling Direct", fn: () => tryKlingDirect(finalPrompt) },
    { name: "Replicate FLUX", fn: () => tryReplicateFlux(finalPrompt) },
  ];

  for (const provider of providers) {
    try {
      console.log(`[generateImage] Trying ${provider.name}...`);
      const result = await provider.fn();
      if (!result) continue;

      // Upload to storage
      let publicUrl: string | null;
      if (result.startsWith("data:")) {
        publicUrl = await uploadBase64ToStorage(result, supabase);
      } else {
        publicUrl = await uploadUrlToStorage(result, supabase);
      }

      if (publicUrl) {
        console.log(`[generateImage] ✅ Success via ${provider.name}`);
        return publicUrl;
      }
    } catch (err) {
      console.error(`[generateImage] ${provider.name} failed:`, err);
    }
  }

  console.error("[generateImage] All providers exhausted");
  return null;
}

// ============================================================
// VIDEO GENERATION (via OpenAI Sora 2 API)
// ============================================================

function cleanPromptForSora(rawPrompt: string): string {
  let cleaned = rawPrompt;
  
  // Remove emojis and special Unicode characters
  cleaned = cleaned.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F000}-\u{1F02F}]|[\u{1F0A0}-\u{1F0FF}]/gu, "");
  
  // Remove common formatting patterns
  cleaned = cleaned.replace(/^🎬.*$/gm, "");
  cleaned = cleaned.replace(/^━+$/gm, "");
  cleaned = cleaned.replace(/^\[.*?\]$/gm, "");
  cleaned = cleaned.replace(/^Visual:\s*/gm, "");
  cleaned = cleaned.replace(/^Voiceover:\s*/gm, "");
  cleaned = cleaned.replace(/^#\w+/gm, "");
  
  // Remove excessive whitespace
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/^\s+|\s+$/gm, "");
  
  // Extract meaningful lines
  const lines = cleaned.split("\n").filter(line => {
    const trimmed = line.trim();
    if (trimmed.length < 10) return false;
    if (/^["']/.test(trimmed)) return false;
    return true;
  });
  
  const essentialLines = lines.slice(0, 4).join(" ");
  cleaned = essentialLines.replace(/\s+/g, " ").trim().slice(0, 500);
  
  return cleaned || "Professional promotional video with smooth camera movements.";
}

async function generateVideo(
  prompt: string, 
  supabase: any,
  project: ProjectContext,
  quality: string = "pro"
): Promise<string | null> {
  const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
  if (!OPENAI_API_KEY) {
    console.error("[generateVideo] OPENAI_API_KEY not configured");
    return null;
  }

  const config = VIDEO_QUALITY_CONFIG[quality as keyof typeof VIDEO_QUALITY_CONFIG] || VIDEO_QUALITY_CONFIG.pro;

  try {
    const [width, height] = config.resolution.split("x").map(Number);
    const aspectRatio = width > height ? "16:9" : "9:16";
    const size = aspectRatio === "9:16" ? "720x1280" : "1280x720";
    const model = quality === "cinema" ? "sora-2-pro" : "sora-2";
    
    // Use shared context guard for consistent brand injection
    const contextGuard = validateAndBuildContext({
      projectName: project.name,
      projectDescription: project.description || undefined,
      projectUrl: project.url || undefined,
      logoUrl: project.logo_url || undefined,
      avatarUrl: project.avatar_url || undefined,
      themeColor: project.theme_color || undefined,
      detectedLanguage: project.detected_language || "en",
      marketingContext: project.marketing_context,
      aiContextSummary: project.ai_context_summary || undefined,
      scrapedMarkdown: project.scraped_markdown || undefined,
      generationPrompt: `${prompt}. Vertical 9:16 portrait format, perfect for Instagram Reels.`,
      generationType: "video",
    });

    logContextValidation(contextGuard, "CRON-VIDEO");
    
    // Clean prompt for Sora (removes emojis, timestamps, etc.)
    const cleanedPrompt = cleanPromptForSora(contextGuard.enhancedPrompt);
    
    console.log(`[generateVideo] Using ${model} (${config.duration}s, ${size}) via OpenAI Sora`);
    console.log(`[generateVideo] Prompt: ${cleanedPrompt.slice(0, 200)}...`);

    // Create video task via OpenAI Sora API (multipart/form-data)
    const formData = new FormData();
    formData.append("model", model);
    formData.append("prompt", cleanedPrompt);
    formData.append("seconds", String(Math.min(config.duration, model === "sora-2-pro" ? 20 : 12)));
    formData.append("size", size);

    const response = await fetch("https://api.openai.com/v1/videos", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generateVideo] OpenAI Sora error:", response.status, errorText.slice(0, 300));
      return null;
    }

    const data = await response.json();
    const taskId = data.task?.id || data.id;
    
    if (!taskId) {
      console.error("[generateVideo] No task ID in response:", JSON.stringify(data).slice(0, 200));
      return null;
    }

    console.log("[generateVideo] Sora task created:", taskId);

    // Poll for completion (max 5 minutes - Sora typically takes 1-3 min)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

      const statusResponse = await fetch(`https://api.openai.com/v1/videos/${taskId}`, {
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
      });

      if (!statusResponse.ok) {
        console.log(`[generateVideo] Status check ${i + 1} failed: ${statusResponse.status}`);
        continue;
      }

      const statusData = await statusResponse.json();
      const status = (statusData.status || statusData.task?.status_name || "").toLowerCase();

      console.log(`[generateVideo] Poll ${i + 1}/${maxAttempts}: status=${status}`);

      if (status === "completed" || status === "succeeded" || status === "done") {
        // Get video URL from response
        const videoUrl = statusData.output?.video || statusData.video_url || statusData.url || 
                        statusData.works?.[0]?.resource?.resource;

        if (videoUrl) {
          console.log("[generateVideo] Video ready, downloading...");
          
          // Download and upload to Supabase storage
          const videoResponse = await fetch(videoUrl);
          if (!videoResponse.ok) {
            console.log("[generateVideo] Download failed, using original URL");
            return videoUrl;
          }

          const videoBuffer = await videoResponse.arrayBuffer();
          const videoBytes = new Uint8Array(videoBuffer);
          const videoPath = `videos/sora-${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

          const { error: uploadError } = await supabase.storage
            .from("media")
            .upload(videoPath, videoBytes, { contentType: "video/mp4", upsert: true });

          if (uploadError) {
            console.error("[generateVideo] Upload error:", uploadError);
            return videoUrl; // Return original URL as fallback
          }

          const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(videoPath);
          console.log(`[generateVideo] ✅ Sora ${model} video uploaded`);
          return publicUrlData.publicUrl;
        }
      } else if (status === "failed" || status === "error") {
        const errorMsg = statusData.error?.message || statusData.error || "Unknown error";
        console.error("[generateVideo] Task failed:", errorMsg);
        return null;
      }
    }

    console.log("[generateVideo] Timeout waiting for Sora video");
    return null;
  } catch (error) {
    console.error("[generateVideo] Error:", error);
    return null;
  }
}

// ============================================================
// REEL GENERATION (Uses same video generator with reel-specific prompt)
// ============================================================

async function generateReel(
  prompt: string, 
  supabase: any, 
  project: ProjectContext,
  quality: string = "pro"
): Promise<string | null> {
  // Reel uses the same video generator with a reel-specific prompt
  const reelPrompt = `${prompt} Vertical 9:16 portrait format, perfect for Instagram Reels and TikTok, eye-catching motion, professional quality, vibrant colors.`;
  
  // Create a modified project context for the reel
  const reelProject: ProjectContext = {
    ...project,
  };
  
  return generateVideo(reelPrompt, supabase, reelProject, quality);
}

// ============================================================
// PUBLISH TO FACEBOOK
// ============================================================

async function publishToFacebook(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string; postId?: string }> {
  if (!metaConnection.page_access_token || !metaConnection.page_id) {
    return { success: false, error: "No page access" };
  }

  try {
    let fbUrl = `https://graph.facebook.com/v18.0/${metaConnection.page_id}/`;
    let fbBody: any = {};

    if (post.media_url) {
      if (post.content_type === "video") {
        fbUrl += "videos";
        fbBody = {
          file_url: post.media_url,
          description: post.text_content || "",
          access_token: metaConnection.page_access_token,
        };
      } else {
        fbUrl += "photos";
        fbBody = {
          url: post.media_url,
          caption: post.text_content || "",
          access_token: metaConnection.page_access_token,
        };
      }
    } else {
      fbUrl += "feed";
      fbBody = {
        message: post.text_content || "",
        access_token: metaConnection.page_access_token,
      };
    }

    const response = await fetch(fbUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fbBody),
    });

    if (!response.ok) {
      const errorData = await response.text();
      return { success: false, error: errorData };
    }

    // Extract Facebook post ID from response
    try {
      const resData = await response.json();
      const postId = resData.post_id || resData.id || null;
      return { success: true, postId };
    } catch {
      return { success: true };
    }
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

// ============================================================
// PUBLISH TO INSTAGRAM
// ============================================================

async function publishToInstagram(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string }> {
  // Instagram REQUIRES media - no text-only posts allowed
  if (!metaConnection.instagram_id) {
    console.log("[Instagram] No instagram_id in connection");
    return { success: false, error: "No Instagram Business account connected" };
  }

  if (!post.media_url) {
    console.log("[Instagram] No media_url - Instagram requires media");
    return { success: false, error: "Instagram requires media (image or video)" };
  }

  try {
    const accessToken = metaConnection.page_access_token || metaConnection.access_token;
    if (!accessToken) {
      return { success: false, error: "No access token available" };
    }

    // Check if this is a video file (mp4, mov, etc.)
    const isVideoFile = post.media_url.match(/\.(mp4|mov|avi|webm)$/i);
    
    // Determine if we should publish as a Reel
    // - True video files (actual videos)
    // - Image as Reel posts now have video files too (converted from image)
    const isVideo = post.content_type === "video" && isVideoFile;
    
    console.log(`[Instagram] Publishing ${isVideo ? "video/reel" : "image"} to ${metaConnection.instagram_id}`);

    // Step 1: Create media container
    const containerBody: any = {
      caption: post.text_content || "",
      access_token: accessToken,
    };

    if (isVideo) {
      containerBody.media_type = "REELS";
      containerBody.video_url = post.media_url;
      containerBody.share_to_feed = true;
    } else {
      // For images
      containerBody.image_url = post.media_url;
    }

    console.log("[Instagram] Creating media container...");
    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    const containerText = await containerResponse.text();
    console.log("[Instagram] Container response:", containerResponse.status, containerText.slice(0, 200));

    if (!containerResponse.ok) {
      // Parse error for better messaging
      try {
        const errorJson = JSON.parse(containerText);
        const errorMsg = errorJson.error?.message || containerText;
        return { success: false, error: `Container failed: ${errorMsg}` };
      } catch {
        return { success: false, error: `Container failed (${containerResponse.status}): ${containerText.slice(0, 100)}` };
      }
    }

    const containerData = JSON.parse(containerText);
    if (!containerData.id) {
      return { success: false, error: "No container ID returned" };
    }

    // Wait for container to be ready (required for both images and videos)
    // Instagram error 9007 occurs when trying to publish before container is ready
    console.log("[Instagram] Waiting for media container to be ready...");
    
    // Increased timeouts for more reliable publishing
    const maxWait = isVideo ? 60 : 20; // Increased from 10 to 20 for images
    const waitInterval = isVideo ? 5000 : 2000; // 5s for videos, 2s for images
    
    // Add initial wait before first status check (Instagram needs time to start processing)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    let containerReady = false;
    for (let i = 0; i < maxWait; i++) {
      await new Promise(resolve => setTimeout(resolve, waitInterval));
      
      const statusRes = await fetch(
        `https://graph.facebook.com/v18.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
      );
      const statusText = await statusRes.text();
      
      try {
        const statusData = JSON.parse(statusText);
        const statusCode = statusData.status_code || "UNKNOWN";
        
        console.log(`[Instagram] Processing status (${i + 1}/${maxWait}): ${statusCode}`);
        
        if (statusCode === "FINISHED") {
          console.log("[Instagram] Container ready!");
          containerReady = true;
          break;
        }
        if (statusCode === "ERROR") {
          return { success: false, error: "Media processing failed at Instagram" };
        }
        // For images, IN_PROGRESS is also acceptable after several retries
        if (!isVideo && statusCode === "IN_PROGRESS" && i >= 8) {
          console.log("[Instagram] Image still processing after 8 attempts, attempting publish...");
          containerReady = true; // Try anyway
          break;
        }
      } catch (parseError) {
        console.log(`[Instagram] Status check parse error, continuing...`);
      }
    }
    
    // If container never finished, try publishing anyway as a fallback
    // Instagram sometimes has delays in reporting FINISHED status
    if (!containerReady) {
      console.log("[Instagram] Container timeout - attempting publish anyway (fallback)...");
    }

    // Step 2: Publish the container
    console.log("[Instagram] Publishing container...");
    const publishResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media_publish`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: accessToken,
        }),
      }
    );

    const publishText = await publishResponse.text();
    console.log("[Instagram] Publish response:", publishResponse.status, publishText.slice(0, 200));

    if (!publishResponse.ok) {
      try {
        const errorJson = JSON.parse(publishText);
        const errorMsg = errorJson.error?.message || publishText;
        return { success: false, error: `Publish failed: ${errorMsg}` };
      } catch {
        return { success: false, error: `Publish failed (${publishResponse.status}): ${publishText.slice(0, 100)}` };
      }
    }

    console.log("[Instagram] ✅ Published successfully!");
    return { success: true };
  } catch (error) {
    console.error("[Instagram] Exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// PUBLISH TO LINKEDIN
// ============================================================

// Upload image to LinkedIn and return the image URN
async function uploadImageToLinkedIn(
  imageUrl: string,
  accessToken: string,
  author: string,
): Promise<string | null> {
  try {
    // Step 1: Get image as binary (support both URL and base64)
    let imageBytes: Uint8Array;
    if (imageUrl.startsWith("data:")) {
      console.log("[LinkedIn] Converting base64 image for upload...");
      const base64Data = imageUrl.split(",")[1];
      const binaryStr = atob(base64Data);
      imageBytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) {
        imageBytes[i] = binaryStr.charCodeAt(i);
      }
    } else {
      console.log("[LinkedIn] Downloading image for upload...");
      const imgRes = await fetch(imageUrl);
      if (!imgRes.ok) {
        console.error("[LinkedIn] Failed to download image:", imgRes.status);
        return null;
      }
      imageBytes = new Uint8Array(await imgRes.arrayBuffer());
    }
    console.log(`[LinkedIn] Image ready: ${imageBytes.length} bytes`);

    // Step 2: Initialize upload
    const initRes = await fetch(
      "https://api.linkedin.com/rest/images?action=initializeUpload",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          "LinkedIn-Version": "202602",
          "X-Restli-Protocol-Version": "2.0.0",
        },
        body: JSON.stringify({
          initializeUploadRequest: { owner: author },
        }),
      }
    );

    if (!initRes.ok) {
      const errText = await initRes.text();
      console.error("[LinkedIn] initializeUpload failed:", initRes.status, errText.slice(0, 200));
      return null;
    }

    const initData = await initRes.json();
    const uploadUrl = initData.value?.uploadUrl;
    const imageUrn = initData.value?.image;

    if (!uploadUrl || !imageUrn) {
      console.error("[LinkedIn] Missing uploadUrl or image URN from initializeUpload");
      return null;
    }

    console.log("[LinkedIn] Upload URL obtained, uploading binary...");

    // Step 3: Upload binary
    const uploadRes = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/octet-stream",
      },
      body: imageBytes,
    });

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error("[LinkedIn] Binary upload failed:", uploadRes.status, errText.slice(0, 200));
      return null;
    }

    console.log("[LinkedIn] ✅ Image uploaded successfully:", imageUrn);
    return imageUrn;
  } catch (error) {
    console.error("[LinkedIn] Image upload exception:", error);
    return null;
  }
}

async function publishToLinkedIn(
  post: ScheduledPost,
  linkedinConnection: any,
  project?: any,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!linkedinConnection.access_token || !linkedinConnection.linkedin_id) {
    return { success: false, error: "No LinkedIn access token or profile ID" };
  }

  try {
    const author = `urn:li:person:${linkedinConnection.linkedin_id}`;
    let caption = post.text_content || "";

    // Append website URL if available and not already in caption
    if (project?.url && !caption.includes(project.url)) {
      caption += `\n\n🔗 ${project.url}`;
    }

    // Build the post body
    const postBody: any = {
      author,
      commentary: caption,
      visibility: "PUBLIC",
      distribution: {
        feedDistribution: "MAIN_FEED",
        targetEntities: [],
        thirdPartyDistributionChannels: [],
      },
      lifecycleState: "PUBLISHED",
    };

    // If post has a media URL (image), upload it to LinkedIn and attach
    if (post.media_url) {
      const imageUrn = await uploadImageToLinkedIn(
        post.media_url,
        linkedinConnection.access_token,
        author,
      );
      if (imageUrn) {
        postBody.content = {
          media: {
            id: imageUrn,
            title: project?.name || "",
          },
        };
        console.log("[LinkedIn] Image attached to post");
      } else {
        console.warn("[LinkedIn] Image upload failed, posting text-only");
      }
    }

    console.log(`[LinkedIn] Publishing to ${linkedinConnection.display_name} (${linkedinConnection.linkedin_id})`);

    const response = await fetch("https://api.linkedin.com/rest/posts", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${linkedinConnection.access_token}`,
        "Content-Type": "application/json",
        "LinkedIn-Version": "202602",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify(postBody),
    });

    if (response.status === 201) {
      const postId = response.headers.get("x-restli-id") || undefined;
      console.log(`[LinkedIn] ✅ Published successfully! Post ID: ${postId || "N/A"}`);
      return { success: true, postId };
    }

    const errorText = await response.text();
    console.error(`[LinkedIn] Publish failed (${response.status}):`, errorText.slice(0, 300));
    return { success: false, error: `LinkedIn API error (${response.status}): ${errorText.slice(0, 150)}` };
  } catch (error) {
    console.error("[LinkedIn] Exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// TIKTOK AUTO-PUBLISH (video only — TikTok API requires video)
// ============================================================
async function publishToTikTok(
  post: ScheduledPost,
  tiktokConnection: any,
): Promise<{ success: boolean; postId?: string; error?: string }> {
  if (!tiktokConnection?.access_token || !tiktokConnection?.open_id) {
    return { success: false, error: "No TikTok access token or open_id" };
  }

  // TikTok only supports video posts
  if (!post.media_url) {
    return { success: false, error: "TikTok requires a video — no media URL" };
  }

  try {
    const accessToken = tiktokConnection.access_token;
    console.log(`[TikTok] Initializing upload for post ${post.id}...`);

    const initRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          post_info: {
            title: (post.text_content || "").slice(0, 150),
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_stitch: false,
            disable_comment: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: post.media_url,
          },
        }),
      }
    );

    const initData = await initRes.json();

    if (initData.error?.code) {
      console.error("[TikTok] Error:", initData.error);
      return { success: false, error: initData.error.message || "TikTok API error" };
    }

    const publishId = initData.data?.publish_id;
    console.log(`[TikTok] ✅ Upload initiated: ${publishId}`);
    return { success: true, postId: publishId };
  } catch (error) {
    console.error("[TikTok] Exception:", error);
    return { success: false, error: String(error) };
  }
}

// ============================================================
// MAIN CRON HANDLER
// ============================================================

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body for optional params
    let campaignId: string | null = null;
    let forceRun = false;
    let publishPostId: string | null = null;
    let platformFilter: string | null = null;
    
    try {
      const body = await req.json();
      campaignId = body.campaignId || null;
      forceRun = body.forceRun === true;
      publishPostId = body.publishPostId || null;
      platformFilter = body.platformFilter || null;
    } catch {
      // No body or invalid JSON - that's fine for cron calls
    }

    console.log(`[cron] Starting AutoPost processing ${forceRun ? "(FORCED)" : "(Quality Tiers)"}...`);
    if (campaignId) {
      console.log(`[cron] Targeting campaign: ${campaignId}`);
    }

    const now = new Date();
    let totalGenerated = 0;
    let totalPublished = 0;

    // Build query for due posts - fetch FULL project context for generation
    let postsQuery = supabase
      .from("scheduled_posts")
      .select("*, projects(id, name, detected_language, description, logo_url, url, theme_color, marketing_context, ai_context_summary, scraped_markdown, avatar_url, meta_page_id, meta_instagram_id)")
      .order("scheduled_for", { ascending: true })
      .limit(20);

    // Single post publish mode (from "Publish Now" button)
    if (publishPostId) {
      postsQuery = postsQuery.eq("id", publishPostId);
      console.log(`[cron] Single post publish: ${publishPostId}, platform: ${platformFilter}`);
    } else {
      postsQuery = postsQuery.in("status", ["scheduled", "draft"]);
      
      // If forceRun with campaignId, get ONLY TODAY's posts for that campaign
      if (forceRun && campaignId) {
        postsQuery = postsQuery.eq("campaign_id", campaignId);
        
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const endOfToday = new Date();
        endOfToday.setUTCHours(23, 59, 59, 999);
        
        postsQuery = postsQuery
          .gte("scheduled_for", startOfToday.toISOString())
          .lte("scheduled_for", endOfToday.toISOString());
        
        console.log(`[cron] ForceRun: filtering posts between ${startOfToday.toISOString()} and ${endOfToday.toISOString()}`);
      } else {
        postsQuery = postsQuery.lte("scheduled_for", now.toISOString());
      }
    }

    const { data: duePosts, error: postsError } = await postsQuery as { 
      data: (ScheduledPost & { projects: ProjectContext | null })[] | null; 
      error: any 
    };

    if (postsError) throw postsError;

    if (!duePosts?.length) {
      console.log("[cron] No posts due for processing");
      return new Response(JSON.stringify({ message: "No posts due", generated: 0, published: 0, processed: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cron] Found ${duePosts.length} posts due for processing`);

    for (const post of duePosts) {
      // Build project context for generation functions
      const projectContext: ProjectContext = {
        id: post.projects?.id,
        name: post.projects?.name || "Brand",
        detected_language: post.projects?.detected_language || "en",
        description: post.projects?.description || null,
        logo_url: post.projects?.logo_url || null,
        url: post.projects?.url || null,
        theme_color: post.projects?.theme_color || null,
        marketing_context: post.projects?.marketing_context || null,
        ai_context_summary: post.projects?.ai_context_summary || null,
        scraped_markdown: post.projects?.scraped_markdown || null,
        avatar_url: post.projects?.avatar_url || null,
        meta_page_id: post.projects?.meta_page_id || null,
        meta_instagram_id: post.projects?.meta_instagram_id || null,
      };
      
      console.log(`[cron] Processing post ${post.id} (${post.content_type}) - project: ${projectContext.name} | language: ${projectContext.detected_language}`);

      // ============================================================
      // SUBSCRIPTION CHECK: Only Pro/Business can use AutoPost
      // ============================================================
      const { data: userData } = await supabase.auth.admin.getUserById(post.user_id);
      const userEmail = userData?.user?.email || null;
      
      const accessCheck = await verifyAutoPostAccess(post.user_id, userEmail, supabase);
      
      if (!accessCheck.valid) {
        console.log(`[cron] User ${post.user_id} denied: ${accessCheck.error}`);
        await supabase.from("scheduled_posts").update({
          error_message: accessCheck.error || "AutoPost requires Pro or Business plan",
          status: "draft", // Reset to draft so user sees it
        }).eq("id", post.id);
        continue;
      }

      // Fetch campaign quality settings if linked
      let imageQuality = "pro"; // Default to Medium
      let videoQuality = "pro"; // Default to Medium
      
      if (post.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("image_quality, video_quality")
          .eq("id", post.campaign_id)
          .single();
        
        if (campaign) {
          imageQuality = campaign.image_quality || "pro";
          videoQuality = campaign.video_quality || "pro";
        }
      }

      // STEP 1: Generate media if missing (using quality tiers)
      // LinkedIn posts also get images for professional visual impact
      if (!post.media_url && post.ai_prompt) {
        // Check if this is an "Image as Reel" post:
        // - content_type is "video" 
        // - BUT the ai_prompt doesn't contain video markers (timestamps, voiceover)
        const isImageAsReel = post.content_type === "video" && 
          !post.ai_prompt.includes("[0-") && 
          !post.ai_prompt.toLowerCase().includes("voiceover") &&
          !post.ai_prompt.toLowerCase().includes("scene ");
        
        if (isImageAsReel) {
          // Reel: Use Nano Banana Video for real MP4
          console.log(`[cron] Generating Reel (${videoQuality}) for post ${post.id} - ${projectContext.name}`);
          
          const videoUrl = await generateReel(post.ai_prompt, supabase, projectContext, videoQuality);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ 
              media_url: videoUrl,
              thumbnail_url: videoUrl,
            }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Reel MP4 generated: ${videoUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Reel generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "image") {
          console.log(`[cron] Generating Image (${imageQuality}) for post ${post.id} - ${projectContext.name}`);
          const imageUrl = await generateImage(post.ai_prompt, supabase, projectContext, imageQuality);
          if (imageUrl) {
            await supabase.from("scheduled_posts").update({ media_url: imageUrl }).eq("id", post.id);
            post.media_url = imageUrl;
            totalGenerated++;
            console.log(`[cron] Image generated: ${imageUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Image generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "video") {
          console.log(`[cron] Generating Video (${videoQuality}) for post ${post.id} - ${projectContext.name}`);
          const videoUrl = await generateVideo(post.ai_prompt, supabase, projectContext, videoQuality);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ media_url: videoUrl }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Video generated: ${videoUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Video generation failed for post ${post.id}`);
          }
        }
      }

      // STEP 2: Publish to platforms
      let platforms = post.platforms || ["instagram", "facebook"];
      
      // If platformFilter is set (single-post publish mode), only publish to that platform
      if (publishPostId && platformFilter) {
        platforms = platforms.filter((p: string) => p === platformFilter);
        console.log(`[cron] Platform filter applied: ${platformFilter} (from ${post.platforms?.join(",")})`);
      }
      
      // Fetch Meta connection only if needed
      let metaConnection: any = null;
      const needsMeta = platforms.includes("facebook") || platforms.includes("instagram");
      
      if (needsMeta) {
        const { data } = await supabase
          .from("meta_connections")
          .select("*")
          .eq("user_id", post.user_id)
          .single();
        metaConnection = data;
      }

      // Fetch LinkedIn connection only if needed
      let linkedinConnection: any = null;
      const needsLinkedIn = platforms.includes("linkedin");
      
      if (needsLinkedIn) {
        const { data } = await supabase
          .from("linkedin_connections")
          .select("*")
          .eq("user_id", post.user_id)
          .single();
        linkedinConnection = data;
      }

      // Fetch TikTok connection only if needed (scoped per project)
      let tiktokConnection: any = null;
      const needsTikTok = platforms.includes("tiktok");
      
      if (needsTikTok) {
        const { data } = await supabase
          .from("tiktok_connections")
          .select("*")
          .eq("user_id", post.user_id)
          .eq("project_id", post.project_id)
          .single();
        tiktokConnection = data;
      }

      // Check if we have at least one valid connection
      if (needsMeta && !metaConnection && !needsLinkedIn && !needsTikTok) {
        console.log(`[cron] No Meta connection for user ${post.user_id}`);
        await supabase.from("scheduled_posts").update({
          error_message: "No Meta connection - manual publish required",
        }).eq("id", post.id);
        continue;
      }

      if (needsMeta && metaConnection && new Date(metaConnection.expires_at) < now) {
        console.log(`[cron] Meta token expired for user ${post.user_id}`);
        metaConnection = null;
      }

      if (needsLinkedIn && linkedinConnection && new Date(linkedinConnection.expires_at) < now) {
        console.log(`[cron] LinkedIn token expired for user ${post.user_id}`);
        linkedinConnection = null;
      }

      if (needsTikTok && tiktokConnection && new Date(tiktokConnection.expires_at) < now) {
        console.log(`[cron] TikTok token expired for user ${post.user_id}`);
        tiktokConnection = null;
      }

      // If no connections at all are valid, skip
      if (!metaConnection && !linkedinConnection && !tiktokConnection) {
        await supabase.from("scheduled_posts").update({
          error_message: "No valid social connections - tokens expired or missing",
        }).eq("id", post.id);
        continue;
      }

      // ============================================================
      // PROJECT-SPECIFIC META OVERRIDE
      // Override global connection with per-project page/IG IDs
      // ============================================================
      if (metaConnection) {
        const projectMetaPageId = projectContext.meta_page_id;
        const projectMetaInstagramId = projectContext.meta_instagram_id;

        if (projectMetaPageId && projectMetaPageId !== metaConnection.page_id) {
          console.log(`[cron] Overriding page_id: ${metaConnection.page_id} → ${projectMetaPageId} (project: ${projectContext.name})`);
          metaConnection.page_id = projectMetaPageId;

          try {
            const pageTokenRes = await fetch(
              `https://graph.facebook.com/v18.0/${projectMetaPageId}?fields=access_token&access_token=${metaConnection.access_token}`
            );
            if (pageTokenRes.ok) {
              const pageTokenData = await pageTokenRes.json();
              if (pageTokenData.access_token) {
                metaConnection.page_access_token = pageTokenData.access_token;
                console.log(`[cron] ✅ Fetched page access token for ${projectMetaPageId}`);
              }
            } else {
              console.error(`[cron] Failed to fetch page token for ${projectMetaPageId}: ${pageTokenRes.status}`);
            }
          } catch (tokenErr) {
            console.error(`[cron] Error fetching page token:`, tokenErr);
          }
        }

        if (projectMetaInstagramId && projectMetaInstagramId !== metaConnection.instagram_id) {
          console.log(`[cron] Overriding instagram_id: ${metaConnection.instagram_id} → ${projectMetaInstagramId} (project: ${projectContext.name})`);
          metaConnection.instagram_id = projectMetaInstagramId;
        }
      }

      // Convert base64 media to public URL before publishing
      if (post.media_url?.startsWith("data:")) {
        console.log(`[cron] Converting base64 media to storage URL...`);
        const publicUrl = await uploadBase64ToStorage(post.media_url, supabase);
        if (publicUrl) {
          await supabase.from("scheduled_posts").update({ media_url: publicUrl }).eq("id", post.id);
          post.media_url = publicUrl;
          console.log(`[cron] Base64 converted to: ${publicUrl.slice(0, 60)}...`);
        } else {
          console.error(`[cron] Failed to convert base64 media to storage URL`);
        }
      }

      const errors: string[] = [];
      const publishResults: { platform: string; success: boolean; postId?: string }[] = [];

      for (const platform of platforms) {
        // ============================================================
        // RATE LIMIT: 1.5s delay between API calls
        // ============================================================
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (platform === "facebook" && metaConnection) {
          const result = await publishToFacebook(post, metaConnection);
          publishResults.push({ platform: "facebook", success: result.success, postId: result.postId });
          if (!result.success) {
            errors.push(`FB: ${result.error}`);
            console.log(`[cron] Facebook publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Facebook successfully (postId: ${result.postId || "unknown"})`);
          }
        }

        if (platform === "instagram" && metaConnection) {
          const result = await publishToInstagram(post, metaConnection);
          publishResults.push({ platform: "instagram", success: result.success });
          if (!result.success) {
            errors.push(`IG: ${result.error}`);
            console.log(`[cron] Instagram publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Instagram successfully`);
          }
        }

        if (platform === "linkedin") {
          if (linkedinConnection) {
            const result = await publishToLinkedIn(post, linkedinConnection, projectContext);
            publishResults.push({ platform: "linkedin", success: result.success, postId: result.postId });
            if (!result.success) {
              errors.push(`LI: ${result.error}`);
              console.log(`[cron] LinkedIn publish failed: ${result.error}`);
            } else {
              console.log(`[cron] Published to LinkedIn successfully`);
            }
          } else {
            errors.push("LI: No LinkedIn connection");
            publishResults.push({ platform: "linkedin", success: false });
            console.log(`[cron] No LinkedIn connection for user ${post.user_id}`);
          }
        }

        if (platform === "tiktok") {
          if (tiktokConnection) {
            // TikTok ONLY supports video — auto-convert image posts to video
            let tiktokPost = { ...post };
            if (post.content_type === "image") {
              // If we have an image URL, convert image→video via KIE Kling
              // If no media at all, generate image first then convert
              let sourceImageUrl = post.media_url;
              
              if (!sourceImageUrl && post.ai_prompt) {
                console.log(`[cron] TikTok: no media — generating image first...`);
                sourceImageUrl = await generateImage(post.ai_prompt, supabase, projectContext, imageQuality);
                if (sourceImageUrl) {
                  await supabase.from("scheduled_posts").update({ media_url: sourceImageUrl }).eq("id", post.id);
                  post.media_url = sourceImageUrl;
                  totalGenerated++;
                }
              }

              if (sourceImageUrl) {
                console.log(`[cron] TikTok: converting image→video via KIE Kling...`);
                try {
                  const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
                  if (KIE_API_KEY) {
                    // Use KIE Kling image-to-video (faster than Sora)
                    const taskRes = await fetch("https://api.kie.ai/v1/jobs/createTask", {
                      method: "POST",
                      headers: { "Content-Type": "application/json", Authorization: `Bearer ${KIE_API_KEY}` },
                      body: JSON.stringify({
                        modelName: "kling/image-to-video",
                        input: {
                          prompt: (post.text_content || post.ai_prompt || "Smooth cinematic motion").slice(0, 500),
                          image_url: sourceImageUrl,
                          duration: "5",
                          aspect_ratio: "9:16",
                        },
                      }),
                    });

                    if (taskRes.ok) {
                      const taskData = await taskRes.json();
                      const taskId = taskData.data?.taskId || taskData.taskId;
                      
                      if (taskId) {
                        // Poll for completion (max 90s — Kling is usually 30-60s)
                        for (let attempt = 0; attempt < 18; attempt++) {
                          await new Promise(r => setTimeout(r, 5000));
                          const statusRes = await fetch(`https://api.kie.ai/v1/jobs/recordInfo?taskId=${taskId}`, {
                            headers: { Authorization: `Bearer ${KIE_API_KEY}` },
                          });
                          if (statusRes.ok) {
                            const statusData = await statusRes.json();
                            const status = statusData.data?.status || statusData.status;
                            if (status === "completed" || status === "done" || status === "SUCCESS") {
                              const videoUrl = statusData.data?.output?.video_url || statusData.data?.resultUrl || 
                                statusData.data?.works?.[0]?.resource?.resource;
                              if (videoUrl) {
                                // Upload to storage
                                const vidRes = await fetch(videoUrl);
                                if (vidRes.ok) {
                                  const vidBuf = new Uint8Array(await vidRes.arrayBuffer());
                                  const vidPath = `videos/tiktok-kling-${Date.now()}.mp4`;
                                  const { error: upErr } = await supabase.storage.from("media").upload(vidPath, vidBuf, { contentType: "video/mp4" });
                                  if (!upErr) {
                                    const { data: pubUrl } = supabase.storage.from("media").getPublicUrl(vidPath);
                                    tiktokPost.media_url = pubUrl.publicUrl;
                                    tiktokPost.content_type = "video";
                                    console.log(`[cron] TikTok: image→video via Kling ✅`);
                                  }
                                }
                                break;
                              }
                            } else if (status === "failed" || status === "FAILED") {
                              console.error(`[cron] TikTok Kling task failed`);
                              break;
                            }
                          }
                        }
                      }
                    }
                  }
                  
                  // If Kling didn't work, skip TikTok for this post
                  if (tiktokPost.content_type !== "video") {
                    console.log(`[cron] TikTok: image→video conversion failed, skipping`);
                    errors.push("TT: Failed to convert image to video for TikTok");
                    publishResults.push({ platform: "tiktok", success: false });
                    continue;
                  }
                } catch (convErr) {
                  console.error(`[cron] TikTok image→video error:`, convErr);
                  errors.push(`TT: Image conversion error: ${String(convErr)}`);
                  publishResults.push({ platform: "tiktok", success: false });
                  continue;
                }
              } else {
                console.log(`[cron] TikTok: no image available, skipping`);
                errors.push("TT: No image to convert to video");
                publishResults.push({ platform: "tiktok", success: false });
                continue;
              }
            }
            const result = await publishToTikTok(tiktokPost, tiktokConnection);
            publishResults.push({ platform: "tiktok", success: result.success, postId: result.postId });
            if (!result.success) {
              errors.push(`TT: ${result.error}`);
              console.log(`[cron] TikTok publish failed: ${result.error}`);
            } else {
              console.log(`[cron] Published to TikTok successfully`);
            }
          } else {
            errors.push("TT: No TikTok connection for this project");
            publishResults.push({ platform: "tiktok", success: false });
            console.log(`[cron] No TikTok connection for user ${post.user_id} / project ${post.project_id}`);
          }
        }
      }

      // Determine which platforms actually succeeded
      const succeededPlatforms = publishResults
        .filter(r => r.success)
        .map(r => r.platform);

      // In single-post mode, don't update DB status (caller handles it)
      if (publishPostId) {
        const linkedinResult = publishResults.find(r => r.platform === "linkedin");
        console.log(`[cron] Single post publish done. Results: ${JSON.stringify(publishResults)}`);
        return new Response(
          JSON.stringify({ 
            success: true, 
            linkedinSuccess: linkedinResult?.success ?? false,
            linkedinError: errors.find(e => e.startsWith("LI:")) || null,
            succeededPlatforms,
            errors,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Update post status (normal cron mode)
      if (errors.length === 0) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: null,
          platforms: succeededPlatforms,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} published successfully to: ${succeededPlatforms.join(", ")}`);
      } else if (errors.length < platforms.length) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: `Partial: ${errors.join(", ")}`,
          platforms: succeededPlatforms,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} partially published to: ${succeededPlatforms.join(", ")}`);
      } else {
        await supabase.from("scheduled_posts").update({
          error_message: errors.join(", "),
          platforms: [],
        }).eq("id", post.id);
        console.log(`[cron] Post ${post.id} publish failed: ${errors.join(", ")}`);
      }

      // Update campaign stats if linked
      if (post.campaign_id) {
        const { data: campaign } = await supabase
          .from("campaigns")
          .select("total_published, total_generated")
          .eq("id", post.campaign_id)
          .single();

        if (campaign) {
          await supabase.from("campaigns").update({
            total_published: (campaign.total_published || 0) + (errors.length < platforms.length ? 1 : 0),
            total_generated: (campaign.total_generated || 0) + (post.media_url ? 1 : 0),
          }).eq("id", post.campaign_id);
        }
      }
    }

    console.log(`[cron] Done. Generated: ${totalGenerated}, Published: ${totalPublished}`);

    return new Response(
      JSON.stringify({ success: true, processed: duePosts.length, generated: totalGenerated, published: totalPublished }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
