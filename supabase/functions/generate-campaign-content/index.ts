import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  validateAndBuildContext, 
  logContextValidation,
  type MarketingContext,
  type GenerationGuardInput 
} from "../_shared/generation-context-guard.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// CONTENT DIVERSITY SYSTEM
// ============================================================

const VISUAL_SCENES = [
  { id: "neon_night", desc: "Neon-lit urban night scene, vibrant city lights, modern nightlife aesthetic" },
  { id: "golden_hour", desc: "Golden hour outdoor setting, warm sunlight, natural beauty, optimistic mood" },
  { id: "minimal_studio", desc: "Clean white studio, minimal props, product-focused, high-end photography" },
  { id: "urban_street", desc: "Busy urban street, diverse crowd, real city life, authentic documentary style" },
  { id: "luxury_interior", desc: "Upscale interior space, elegant furnishings, rich textures, premium feel" },
  { id: "nature_outdoor", desc: "Natural outdoor environment, greenery, fresh air, wellness vibes" },
  { id: "home_cozy", desc: "Cozy home setting, comfortable atmosphere, relatable everyday life" },
  { id: "industrial_modern", desc: "Industrial modern space, exposed brick, metal accents, trendy startup vibes" },
  { id: "beach_coastal", desc: "Beach or coastal setting, ocean views, vacation energy, freedom feeling" },
  { id: "rooftop_skyline", desc: "Rooftop with city skyline, success imagery, aspirational urban lifestyle" },
  { id: "artsy_creative", desc: "Artistic creative space, colorful, eclectic, unique personality" },
  { id: "tech_futuristic", desc: "Sleek tech environment, screens, futuristic aesthetic, innovation feel" },
];

const MARKETING_ANGLES = [
  { id: "social_proof", desc: "Show others already using/loving the product. Testimonial energy. FOMO trigger." },
  { id: "pain_point", desc: "Visualize the PROBLEM customers face. frustration focus." },
  { id: "transformation", desc: "Dramatic before/after. Show the life change. The upgrade." },
  { id: "authority", desc: "Expert positioning. Data, stats, credentials. Trust signals." },
  { id: "urgency_scarcity", desc: "Limited time/quantity. Act now energy. Countdown vibes." },
  { id: "lifestyle_aspiration", desc: "Dream life imagery. The person they want to become." },
  { id: "behind_scenes", desc: "Raw, authentic, unfiltered. Real process. Human touch." },
  { id: "comparison", desc: "Us vs. old way. Better alternative. Clear advantages." },
];

const BANNED_CLICHES = ["laptop in café", "person smiling at phone", "man in suit with graph", "rocket launch growth"];

// ============================================================
// CORE FUNCTIONS
// ============================================================

async function generateAndUploadImage(prompt: string, format: string, LOVABLE_API_KEY: string, supabase: any): Promise<string | null> {
  try {
    let aspect = "1:1";
    if (format === "reel" || format === "story") aspect = "9:16";
    else if (format === "landscape") aspect = "16:9";

    const enhancedPrompt = `${prompt}. Professional photography, high-end advertising style, aspect ratio ${aspect}.`;
    console.log("[Image Gen] Generating with prompt:", enhancedPrompt.slice(0, 100) + "...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image"],
      }),
    });

    if (!response.ok) {
      console.error("[Image Gen] API error:", response.status);
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) {
      console.error("[Image Gen] No image in response");
      return null;
    }

    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `campaign-gen/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage.from("media").upload(fileName, imageBytes, { contentType: "image/png" });
    if (uploadError) {
      console.error("[Image Gen] Upload error:", uploadError);
      return null;
    }

    const publicUrl = supabase.storage.from("media").getPublicUrl(fileName).data.publicUrl;
    console.log("[Image Gen] Uploaded:", publicUrl);
    return publicUrl;
  } catch (e) {
    console.error("[Image Gen] Failed:", e);
    return null;
  }
}

function safeJsonParse(text: string) {
  try {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    return start !== -1 && end !== -1 ? JSON.parse(text.slice(start, end + 1)) : null;
  } catch { return null; }
}

// ============================================================
// SERVER HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const input = await req.json();
    const { campaignId, platforms, productDescription } = input;

    if (!campaignId) {
      return new Response(JSON.stringify({ error: "Campaign ID is required" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // 1. Fetch Campaign & Project
    const { data: campaign, error: campaignError } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", campaign.project_id).single();
    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { 
        status: 404, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log(`[Campaign] Generating for: ${project.name} (type: ${campaign.campaign_type})`);

    // 2. Context Guard
    const contextGuard = validateAndBuildContext({
      projectId: project.id,
      projectName: project.name,
      projectDescription: project.description,
      projectUrl: project.url,
      logoUrl: project.logo_url,
      avatarUrl: project.avatar_url,
      themeColor: project.theme_color,
      detectedLanguage: project.detected_language || "en",
      marketingContext: project.marketing_context as MarketingContext,
      aiContextSummary: project.ai_context_summary,
      scrapedMarkdown: project.scraped_markdown,
      generationPrompt: productDescription || campaign.ai_context || project.description || `Content for ${project.name}`,
      generationType: "image",
      includeLogo: campaign.include_logo || false,
      includeUrl: campaign.include_url || false,
      includeText: campaign.include_text || false,
      overlayText: campaign.overlay_text || "",
    });
    logContextValidation(contextGuard, "CampaignGeneration");

    // 3. Planning
    const totalVideos = campaign.campaign_type === "image" ? 0 : (campaign.videos_per_month || 4);
    const totalImages = campaign.campaign_type === "video" ? 0 : (campaign.images_per_month || 12);
    const totalTarget = totalVideos + totalImages;
    
    const { count } = await supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId);
    const alreadyDone = count || 0;
    const toGen = Math.min(Math.max(0, totalTarget - alreadyDone), 10); // Batch limit 10

    console.log(`[Campaign] Target: ${totalTarget}, Already done: ${alreadyDone}, To generate: ${toGen}`);

    if (toGen <= 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Campaign generation complete",
        count: 0,
        batchComplete: true 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const generatedPosts = [];
    const lang = project.detected_language || "en";
    const effectiveFormat = campaign.format || "reel";

    for (let i = 0; i < toGen; i++) {
      const idx = alreadyDone + i;
      const scene = VISUAL_SCENES[idx % VISUAL_SCENES.length];
      const angle = MARKETING_ANGLES[idx % MARKETING_ANGLES.length];
      const isVideo = campaign.campaign_type === "video" || (campaign.campaign_type === "mixed" && idx % 2 === 0);

      console.log(`[Campaign] Post ${idx + 1}: ${isVideo ? "VIDEO" : "IMAGE"} | Scene: ${scene.id} | Angle: ${angle.id}`);

      // 4. AI Prompting
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Authorization": `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [{
            role: "system",
            content: `You are a marketing expert for ${project.name}. Output language: ${lang.toUpperCase()}.
            
${contextGuard.brandContext}

TASK: Create a ${isVideo ? "video script concept" : "static image prompt"} for social media.

VISUAL SCENE: ${scene.desc}
MARKETING ANGLE: ${angle.desc}
FORMAT: ${effectiveFormat} (${effectiveFormat === "reel" || effectiveFormat === "story" ? "vertical 9:16" : effectiveFormat === "landscape" ? "horizontal 16:9" : "square 1:1"})

${campaign.include_logo ? "Include space for logo placement in bottom-right corner." : ""}
${campaign.include_url ? `Include website URL: ${project.url}` : ""}

BANNED CLICHÉS (DO NOT USE): ${BANNED_CLICHES.join(", ")}

Return ONLY valid JSON:
{
  "aiPrompt": "detailed visual description for AI image generation",
  "textContent": "engaging social media caption with hashtags (in ${lang})"
}`
          }],
          temperature: 0.85,
        }),
      });

      const aiData = await aiResponse.json();
      const parsed = safeJsonParse(aiData.choices?.[0]?.message?.content);
      
      if (!parsed?.aiPrompt) {
        console.warn(`[Campaign] Post ${idx + 1}: AI parsing failed, using fallback`);
        continue;
      }

      // 5. Image Generation (for non-video posts)
      let mediaUrl = null;
      if (!isVideo) {
        mediaUrl = await generateAndUploadImage(parsed.aiPrompt, effectiveFormat, LOVABLE_API_KEY, supabase);
      }

      // 6. Scheduling
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + Math.floor(idx * (30 / totalTarget)) + 1);
      scheduledDate.setHours(campaign.posting_hour || 10, Math.floor(Math.random() * 60));

      generatedPosts.push({
        user_id: campaign.user_id,
        project_id: campaign.project_id,
        campaign_id: campaign.id,
        content_type: isVideo ? "video" : "image",
        scheduled_for: scheduledDate.toISOString(),
        ai_prompt: parsed.aiPrompt,
        text_content: parsed.textContent || "",
        media_url: mediaUrl,
        status: "scheduled",
        platforms: platforms || campaign.platforms || ["instagram"],
      });
    }

    // 7. Database Sync
    if (generatedPosts.length > 0) {
      const { error: insertError } = await supabase.from("scheduled_posts").insert(generatedPosts);
      if (insertError) {
        console.error("[Campaign] Insert error:", insertError);
        throw new Error("Failed to save posts");
      }

      await supabase.from("campaigns").update({ 
        total_generated: alreadyDone + generatedPosts.length,
        status: "active" 
      }).eq("id", campaignId);
    }

    const newTotal = alreadyDone + generatedPosts.length;
    console.log(`[Campaign] Generated ${generatedPosts.length} posts. Total: ${newTotal}/${totalTarget}`);

    return new Response(JSON.stringify({ 
      success: true, 
      count: generatedPosts.length,
      total: newTotal,
      target: totalTarget,
      batchComplete: newTotal >= totalTarget
    }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[Campaign] Critical error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
