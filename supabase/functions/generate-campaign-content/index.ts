import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  validateAndBuildContext, 
  logContextValidation,
  type MarketingContext,
  type GenerationGuardInput 
} from "../_shared/generation-context-guard.ts";
import {
  createKieTask,
  checkKieTaskStatus,
  KIE_MODEL_NAMES,
} from "../_shared/kie-api-client.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// CONTENT DIVERSITY SYSTEM
// ============================================================

/**
 * Create a Date object with the correct UTC time for a given local hour/minute in a timezone.
 * Edge functions run in UTC, so setHours(10) = 10:00 UTC, not 10:00 Paris.
 * This function converts "10:00 Europe/Paris" → correct UTC ISO string.
 */
function buildScheduledDate(dayOffset: number, localHour: number, localMinute: number, timezone: string): string {
  const base = new Date();
  base.setUTCDate(base.getUTCDate() + dayOffset);
  // Build a date string in the target timezone, then let the TZ offset do the work
  // We construct "YYYY-MM-DD" from the offset date, then parse it in the target timezone
  const year = base.getUTCFullYear();
  const month = String(base.getUTCMonth() + 1).padStart(2, "0");
  const day = String(base.getUTCDate()).padStart(2, "0");
  const hour = String(localHour).padStart(2, "0");
  const minute = String(localMinute).padStart(2, "0");
  
  // Use Intl to get the UTC offset for the target timezone on that date
  try {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", hour12: false,
    });
    // Get the offset by comparing a known date in both timezones
    const testDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
    const parts = formatter.formatToParts(testDate);
    const tzPart = parts.find(p => p.type === "timeZoneName")?.value || "+0";
    // Parse offset like "GMT+2" or "GMT-5" or "GMT+5:30"
    const offsetMatch = tzPart.match(/GMT([+-]?)(\d{1,2})(?::(\d{2}))?/);
    let offsetMinutes = 0;
    if (offsetMatch) {
      const sign = offsetMatch[1] === "-" ? -1 : 1;
      offsetMinutes = sign * (parseInt(offsetMatch[2]) * 60 + parseInt(offsetMatch[3] || "0"));
    }
    // Subtract offset to convert local time to UTC
    const utcDate = new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`);
    utcDate.setUTCMinutes(utcDate.getUTCMinutes() - offsetMinutes);
    return utcDate.toISOString();
  } catch {
    // Fallback: assume UTC
    return new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`).toISOString();
  }
}

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
// IMAGE GENERATION
// ============================================================

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

async function generateAndUploadImage(prompt: string, format: string, supabase: any): Promise<string | null> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  
  try {
    // Map format to aspect ratio for KIE
    let aspectRatio = "1:1";
    if (format === "reel" || format === "story") aspectRatio = "9:16";
    else if (format === "landscape") aspectRatio = "16:9";

    let size = "1024x1024";
    if (format === "reel" || format === "story") size = "768x1344";
    else if (format === "landscape") size = "1344x768";

    const enhancedPrompt = `${prompt}. Professional photography, high-end advertising style.`;
    console.log("[Image Gen] Generating:", enhancedPrompt.slice(0, 80) + "...");

    let imageBase64: string | null = null;

    // Stage 1: CometAPI (if available)
    if (COMETAPI_API_KEY) {
      const response = await fetch("https://api.cometapi.com/v1/images/generations", {
        method: "POST",
        headers: { "Authorization": `Bearer ${COMETAPI_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "flux-pro", prompt: enhancedPrompt, n: 1, size, response_format: "b64_json" }),
      });
      if (response.ok) {
        const data = await response.json();
        imageBase64 = data.data?.[0]?.b64_json;
        if (imageBase64) console.log("[Image Gen] CometAPI success");
      } else {
        console.warn("[Image Gen] CometAPI failed:", response.status);
      }
    }

    // Stage 2: KIE API - qwen-zimage (cheapest model, 0.8 credits)
    if (!imageBase64) {
      console.log("[Image Gen] Falling back to KIE qwen-zimage...");
      try {
        const sizeMap: Record<string, string> = {
          "1:1": "square_hd",
          "16:9": "landscape_16_9",
          "9:16": "portrait_16_9",
          "4:3": "landscape_4_3",
          "3:4": "portrait_4_3",
        };
        const taskResult = await createKieTask("qwen/text-to-image", {
          prompt: enhancedPrompt.slice(0, 2950),
          image_size: sizeMap[aspectRatio] || "square_hd",
        });

        if (taskResult.success && taskResult.taskId) {
          // Poll for result (max 30s)
          let attempts = 0;
          while (attempts < 30) {
            await new Promise(r => setTimeout(r, attempts < 10 ? 1000 : 2000));
            const status = await checkKieTaskStatus(taskResult.taskId);
            
            if (status.status === "completed") {
              const imageUrl = status.resultUrl || status.resultUrls?.[0];
              if (imageUrl) {
                const imgResponse = await fetch(imageUrl);
                if (imgResponse.ok) {
                  const imgBlob = await imgResponse.blob();
                  const imgArrayBuffer = await imgBlob.arrayBuffer();
                  imageBase64 = arrayBufferToBase64(imgArrayBuffer);
                  console.log("[Image Gen] KIE qwen-zimage success");
                }
              }
              break;
            }
            if (status.status === "failed") {
              console.warn("[Image Gen] KIE qwen-zimage failed:", status.error);
              break;
            }
            attempts++;
          }
        }
      } catch (kieErr) {
        console.warn("[Image Gen] KIE fallback error:", kieErr);
      }
    }

    // Stage 3: Nano Banana (Lovable AI) as last resort
    if (!imageBase64) {
      console.log("[Image Gen] Falling back to Nano Banana...");
      const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
      if (LOVABLE_API_KEY) {
        try {
          const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: enhancedPrompt }],
              modalities: ["image", "text"],
            }),
          });
          if (response.ok) {
            const data = await response.json();
            const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            if (imageData) {
              imageBase64 = imageData.replace(/^data:image\/\w+;base64,/, "");
              console.log("[Image Gen] Nano Banana fallback success");
            }
          }
        } catch (nbErr) {
          console.warn("[Image Gen] Nano Banana fallback error:", nbErr);
        }
      }
    }

    if (!imageBase64) {
      console.error("[Image Gen] All providers failed");
      return null;
    }

    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));
    const fileName = `campaign-gen/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    const { error: uploadError } = await supabase.storage.from("media").upload(fileName, imageBytes, { contentType: "image/png" });
    if (uploadError) { console.error("[Image Gen] Upload error:", uploadError); return null; }

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
// GENERATE A SINGLE POST (extracted for clarity)
// ============================================================

// ============================================================
// LINKEDIN VALUE-FIRST POST TYPES
// ============================================================

const LINKEDIN_POST_TYPES = [
  "STORY_DRIVEN: Tell a real-feeling story about someone's problem → discovery → result. First-person or close observer. Must feel authentic.",
  "VALUE_BREAKDOWN: Break down a specific tactic, framework, or process step-by-step. Teach something actionable.",
  "AUTHORITY_POSITIONING: Share a contrarian opinion, data insight, or hard-won lesson. Position as thought leader without bragging.",
  "SOFT_CONVERSION: Address a specific pain point, show empathy, then softly invite discussion. NO hard selling.",
  "CURIOSITY_HOOK: Open with something unexpected, then unpack it. Make them stop scrolling.",
  "BEHIND_THE_SCENES: Show real process, real numbers, real struggles. Raw and unfiltered.",
  "CONTRARIAN_TAKE: Challenge conventional wisdom in the industry. Be bold but backed by reasoning.",
  "MICRO_CASE_STUDY: One specific example, one specific result. Concrete, not abstract.",
];

const LINKEDIN_HOOK_STYLES = [
  "One-liner that challenges a common belief",
  "A specific number or stat that surprises",
  "A confession or vulnerable admission",
  "A bold claim followed by 'Here's why:'",
  "A question the reader can't scroll past",
  "A timestamp + vivid scene ('Last Tuesday at 2am...')",
  "A pattern interrupt ('Stop doing X. Seriously.')",
  "A relatable frustration stated plainly",
];

const LINKEDIN_CTA_STYLES = [
  "Ask a genuine question inviting comments",
  "Invite them to DM a keyword for a resource",
  "Ask 'What's your take?' or 'Agree or disagree?'",
  "Soft invite: 'If this resonates, let's connect'",
  "Challenge: 'Try this for 7 days and tell me what happens'",
  "Curiosity: 'I'm writing Part 2 about X — what should I cover?'",
];

async function generateLinkedInStoryPost(
  idx: number,
  campaign: any,
  project: any,
  contextGuard: any,
  totalTarget: number,
  supabase: any,
  OPENROUTER_API_KEY: string,
): Promise<any | null> {
  const lang = project.detected_language || "en";
  const mc = project.marketing_context || {};
  const services = (mc.services || mc.products || []).map((s: any) => typeof s === "string" ? s : s.name).filter(Boolean);
  const usp = mc.usp || mc.unique_selling_point || project.description || "";
  const audience = mc.target_audience || mc.audience || "";
  const randomSeed = Math.random().toString(36).slice(2, 8);

  const postType = LINKEDIN_POST_TYPES[idx % LINKEDIN_POST_TYPES.length];
  const hookStyle = LINKEDIN_HOOK_STYLES[idx % LINKEDIN_HOOK_STYLES.length];
  const ctaStyle = LINKEDIN_CTA_STYLES[idx % LINKEDIN_CTA_STYLES.length];

  console.log(`[Campaign] LinkedIn Value-First #${idx + 1}: Type: ${postType.slice(0, 30)}... | Hook: ${hookStyle.slice(0, 30)}...`);

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "system",
        content: `═══ 🚨 BRAND IDENTITY FIREWALL — READ THIS FIRST 🚨 ═══
You are writing EXCLUSIVELY for "${project.name}".
OFFICIAL PRODUCTS/SERVICES: ${services.length > 0 ? services.join(", ") : project.description || "see context below"}
⛔ You MUST ONLY mention products/services listed above. NEVER invent capabilities.

═══ YOUR ROLE ═══
You are a LinkedIn content strategist who follows the VALUE-FIRST philosophy:
- Lead with value before ANY mention of a product
- Diagnose before offering solutions
- Focus on starting conversations, not closing immediately
- Make the goal of the first impression: "I want to hear more from this person"
- Position LinkedIn as a trust platform, NOT a marketplace
- NO hype, NO fake urgency, NO aggressive CTAs
- Every post must feel like: "I understand your situation" NOT "Buy my solution"

${contextGuard.enhancedPrompt}

═══ BRAND CONTEXT ═══
BRAND NAME: ${project.name}
DESCRIPTION: ${project.description || "N/A"}
SERVICES/PRODUCTS: ${services.length > 0 ? services.join(", ") : "See description"}
UNIQUE SELLING POINT: ${usp}
TARGET AUDIENCE: ${audience}
${campaign.ai_context ? `CAMPAIGN BRIEF: ${campaign.ai_context}` : ""}
${project.url ? `WEBSITE: ${project.url}` : ""}

═══ POST ASSIGNMENT ═══
POST TYPE: ${postType}
HOOK STYLE: ${hookStyle}
CTA STYLE: ${ctaStyle}
UNIQUE SEED: ${randomSeed}

═══ WRITING RULES (NON-NEGOTIABLE) ═══

FORMAT:
- Strong curiosity-driven hook in FIRST LINE (this is 80% of the post's success)
- SHORT paragraphs: 1-2 lines MAX per paragraph
- Use line breaks generously (LinkedIn mobile = narrow screen)
- Conversational, builder-mindset tone
- 800-2000 characters total
- 3-5 relevant hashtags at end
- Language: ${lang}
${project.url ? `- If mentioning the brand, weave ${project.url} naturally (NOT as a pitch)` : ""}
${project.linkedin_page_url ? `- Reference ${project.linkedin_page_url} when organically relevant` : ""}

TONE:
- Write like a founder talking to another founder over coffee
- Be specific, not generic. Use real scenarios, numbers, timeframes
- Show expertise through insights, not claims
- Use "I", "we", personal anecdotes (even fictional ones that feel real)
- Occasional emoji is fine — but sparingly, not every line

ABSOLUTELY BANNED:
❌ "Let's hop on a call"
❌ "Quick 15 minutes"  
❌ "Limited spots"
❌ "DM me for more info" (as a hard sell)
❌ "In today's fast-paced world..."
❌ "Game-changer", "Synergy", "Leverage", "Disrupt"
❌ Generic motivational fluff with no substance
❌ Aggressive closing language
❌ "🚀🔥💯" emoji spam
❌ Talking about services the brand does NOT offer
❌ Corporate jargon or buzzwords

INSTEAD, END WITH:
- A genuine question that invites discussion
- A low-friction engagement ask (comment a word, share their experience)
- Curiosity that makes them want Part 2

OUTPUT: Return ONLY valid JSON:
{
  "textContent": "the complete LinkedIn post",
  "postType": "story|value_breakdown|authority|soft_conversion|curiosity|bts|contrarian|case_study"
}`
      }],
      temperature: 0.92,
    }),
  });

  const aiData = await aiResponse.json();
  const parsed = safeJsonParse(aiData.choices?.[0]?.message?.content);

  if (!parsed?.textContent) {
    console.warn(`[Campaign] LinkedIn Value-First #${idx + 1}: AI parsing failed`);
    return null;
  }

  // Distribute posts evenly across 30 days
  const daysSpan = 30;
  const gap = Math.max(1, Math.floor(daysSpan / totalTarget));
  const dayOffset = idx * gap;
  const postMinute = campaign.posting_minute ?? Math.floor(Math.random() * 30);
  const scheduledISO = buildScheduledDate(dayOffset, campaign.posting_hour || 10, postMinute, campaign.timezone || "Europe/Paris");

  // Generate a visual prompt for the accompanying image
  const imagePromptResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "system",
        content: `You are a visual art director for LinkedIn content. Create a PURE VISUAL image prompt.

BRAND: ${project.name}
${project.theme_color ? `BRAND COLOR: ${project.theme_color}` : ""}
${project.description ? `BUSINESS: ${project.description}` : ""}
POST TYPE: ${parsed.postType || "value_breakdown"}

CREATE a professional LinkedIn-appropriate visual prompt:
- SUBJECT: Professional, authentic-feeling scene related to the post topic
- STYLE: Editorial photography, NOT stock photo feeling
- LIGHTING: Natural, professional
- COMPOSITION: Square 1:1, clean, modern
- MOOD: Trustworthy, expert, approachable

CRITICAL: NO text, NO typography, NO words, NO brand names in the image.
Think like a photographer, not a graphic designer.
Avoid: handshakes, lightbulbs, puzzle pieces, generic stock imagery.

OUTPUT: Return ONLY the visual description as plain text.`
      }],
      temperature: 0.85,
    }),
  });

  let linkedInImagePrompt: string | null = null;
  try {
    const imgPromptData = await imagePromptResponse.json();
    linkedInImagePrompt = imgPromptData.choices?.[0]?.message?.content?.trim() || null;
    if (linkedInImagePrompt) {
      console.log(`[Campaign] LinkedIn Value-First #${idx + 1}: Visual prompt generated (${linkedInImagePrompt.length} chars)`);
    }
  } catch {
    console.warn(`[Campaign] LinkedIn Value-First #${idx + 1}: Image prompt generation failed`);
  }

  return {
    user_id: campaign.user_id,
    project_id: campaign.project_id,
    campaign_id: campaign.id,
    content_type: "image",
    scheduled_for: scheduledISO,
    ai_prompt: linkedInImagePrompt || `Professional LinkedIn visual for ${project.name}`,
    text_content: parsed.textContent,
    media_url: null,
    status: "scheduled",
    platforms: ["linkedin"],
  };
}

async function generateSinglePost(
  idx: number,
  campaign: any,
  project: any,
  contextGuard: any,
  effectiveFormat: string,
  platforms: string[],
  totalTarget: number,
  supabase: any,
  OPENROUTER_API_KEY: string,
): Promise<any | null> {
  // Route to LinkedIn storytelling generator
  if (campaign.campaign_type === "linkedin_story") {
    return generateLinkedInStoryPost(idx, campaign, project, contextGuard, totalTarget, supabase, OPENROUTER_API_KEY);
  }

  const lang = project.detected_language || "en";
  const scene = VISUAL_SCENES[idx % VISUAL_SCENES.length];
  const angle = MARKETING_ANGLES[idx % MARKETING_ANGLES.length];
  const isVideo = campaign.campaign_type === "video" || (campaign.campaign_type === "mixed" && idx % 2 === 0);

  console.log(`[Campaign] Post ${idx + 1}: ${isVideo ? "VIDEO" : "IMAGE"} | Scene: ${scene.id} | Angle: ${angle.id}`);

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "system",
        content: `═══ 🚨 BRAND IDENTITY FIREWALL — READ THIS FIRST 🚨 ═══
You are writing EXCLUSIVELY for "${project.name}".
OFFICIAL DESCRIPTION: ${project.description || "N/A"}
OFFICIAL PRODUCTS/SERVICES: ${(() => { const mc = project.marketing_context || {}; const ps = mc.products_services || []; return ps.length > 0 ? ps.map((p: any) => p.name || p).join(", ") : project.description || "see context below"; })()}
⛔ You MUST ONLY mention products/services listed above. NEVER invent, extrapolate, or borrow features from other brands.
⛔ If a feature is NOT in the list above, do NOT mention it — even if it sounds related.
⛔ Do NOT mention: review management, customer support, chatbots, appointment booking, or ANY service not explicitly listed above.

${contextGuard.enhancedPrompt}

CURRENT TASK: Create a ${isVideo ? "video script concept" : "static image prompt"} for social media.

VISUAL SCENE TO USE: ${scene.desc}
MARKETING ANGLE TO APPLY: ${angle.desc}
FORMAT: ${effectiveFormat} (${effectiveFormat === "reel" || effectiveFormat === "story" ? "vertical 9:16" : effectiveFormat === "landscape" ? "horizontal 16:9" : "square 1:1"})

${campaign.include_logo ? "LOGO: Reserve clear space in bottom-right corner for brand logo placement." : ""}
${campaign.include_url ? `WEBSITE: Include URL ${project.url} in the design.` : ""}
${campaign.overlay_text ? `OVERLAY TEXT: "${campaign.overlay_text}" must appear prominently.` : ""}

DIVERSITY RULES:
- This is post #${idx + 1} in the campaign series - make it UNIQUE from previous posts
- DO NOT use these clichés: ${BANNED_CLICHES.join(", ")}
- Focus on REAL products/services from the brand context above
- Match the brand's tone and target audience

FOR aiPrompt (CRITICAL - VISUAL ONLY):
- Describe ONLY what the camera physically sees: subjects, objects, lighting, colors, textures, composition
- Think like a photographer describing a shot to a set designer
- NO text, NO typography, NO words, NO letters, NO brand names rendered in the image
- NO "headline says...", NO "text overlay reads...", NO "bold typography"
- The image must work perfectly WITHOUT any text

OUTPUT: Return ONLY valid JSON:
{
  "aiPrompt": "detailed VISUAL-ONLY description for AI image generation (subjects, lighting, colors, composition, mood - NO TEXT/TYPOGRAPHY)",
  "textContent": "engaging social media caption with hashtags (in ${lang})"
}`
      }],
      temperature: 0.92,
    }),
  });

  const aiData = await aiResponse.json();
  const parsed = safeJsonParse(aiData.choices?.[0]?.message?.content);
  
  if (!parsed?.aiPrompt) {
    console.warn(`[Campaign] Post ${idx + 1}: AI parsing failed, skipping`);
    return null;
  }

  // Media will be generated just-in-time by the cron job at publish time
  const mediaUrl = null;

  const dayOffset = Math.floor(idx * (30 / totalTarget));
  const postMinute = campaign.posting_minute ?? Math.floor(Math.random() * 60);
  const scheduledISO = buildScheduledDate(dayOffset, campaign.posting_hour || 10, postMinute, campaign.timezone || "Europe/Paris");

  return {
    user_id: campaign.user_id,
    project_id: campaign.project_id,
    campaign_id: campaign.id,
    content_type: isVideo ? "video" : "image",
    scheduled_for: scheduledISO,
    ai_prompt: parsed.aiPrompt,
    text_content: parsed.textContent || "",
    media_url: mediaUrl,
    status: "scheduled",
    platforms: platforms || campaign.platforms || ["instagram"],
  };
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
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const OPENROUTER_API_KEY = Deno.env.get("OPENROUTER_API_KEY");

    if (!OPENROUTER_API_KEY) throw new Error("OPENROUTER_API_KEY is not configured");

    // 1. Fetch Campaign & Project
    const { data: campaign, error: campaignError } = await supabase.from("campaigns").select("*").eq("id", campaignId).single();
    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ error: "Campaign not found" }), { 
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { data: project, error: projectError } = await supabase.from("projects").select("*").eq("id", campaign.project_id).single();
    if (projectError || !project) {
      return new Response(JSON.stringify({ error: "Project not found" }), { 
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } 
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

    // 3. Planning - BATCH SIZE = 2 (reduced to avoid edge function timeout)
    let totalTarget: number;
    if (campaign.campaign_type === "linkedin_story") {
      totalTarget = campaign.images_per_month || (campaign.posts_per_week || 2) * 4;
    } else {
      const totalVideos = campaign.campaign_type === "image" ? 0 : (campaign.videos_per_month || 4);
      const totalImages = campaign.campaign_type === "video" ? 0 : (campaign.images_per_month || 12);
      totalTarget = totalVideos + totalImages;
    }
    
    const { count } = await supabase.from("scheduled_posts").select("*", { count: "exact", head: true }).eq("campaign_id", campaignId);
    const alreadyDone = count || 0;
    const BATCH_SIZE = 2;
    const toGen = Math.min(Math.max(0, totalTarget - alreadyDone), BATCH_SIZE);

    console.log(`[Campaign] Target: ${totalTarget}, Already done: ${alreadyDone}, Batch: ${toGen}`);

    if (toGen <= 0) {
      return new Response(JSON.stringify({ 
        success: true, message: "Campaign generation complete", count: 0, batchComplete: true 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 4. Generate posts one by one, inserting each immediately
    const effectiveFormat = campaign.format || "reel";
    let generated = 0;

    for (let i = 0; i < toGen; i++) {
      const idx = alreadyDone + i;
      try {
        const post = await generateSinglePost(
          idx, campaign, project, contextGuard, effectiveFormat,
          platforms, totalTarget, supabase, OPENROUTER_API_KEY
        );

        if (post) {
          // Insert each post immediately so polling can see progress
          const { error: insertError } = await supabase.from("scheduled_posts").insert(post);
          if (insertError) {
            console.error(`[Campaign] Insert error post ${idx + 1}:`, insertError);
          } else {
            generated++;
            console.log(`[Campaign] Post ${idx + 1} saved (${generated}/${toGen})`);
          }
        } else {
          // Post generation failed (AI parsing, etc.) — insert error placeholder to avoid blocking chain
          console.warn(`[Campaign] Post ${idx + 1} failed, inserting error placeholder`);
          const errDayOffset = Math.floor(idx * (30 / totalTarget)) + 1;
          const errMinute = campaign.posting_minute ?? Math.floor(Math.random() * 60);
          const errScheduledISO = buildScheduledDate(errDayOffset, campaign.posting_hour || 10, errMinute, campaign.timezone || "Europe/Paris");
          await supabase.from("scheduled_posts").insert({
            user_id: campaign.user_id,
            project_id: campaign.project_id,
            campaign_id: campaign.id,
            content_type: "image",
            scheduled_for: errScheduledISO,
            ai_prompt: "Generation failed — retry later",
            text_content: "",
            media_url: null,
            status: "error",
            platforms: platforms || ["instagram"],
          });
          generated++; // Count toward batch to prevent infinite loops
        }
      } catch (postError) {
        console.error(`[Campaign] Post ${idx + 1} exception:`, postError);
        generated++; // Always advance to prevent stuck loops
      }
    }

    // 5. Update campaign totals
    const newTotal = alreadyDone + generated;
    await supabase.from("campaigns").update({ 
      total_generated: newTotal,
      status: "active" 
    }).eq("id", campaignId);

    console.log(`[Campaign] Batch done: ${generated} posts. Total: ${newTotal}/${totalTarget}`);

    // 6. Self-reinvoke if more posts remain — use waitUntil to survive shutdown
    const remaining = totalTarget - newTotal;
    if (remaining > 0) {
      console.log(`[Campaign] ${remaining} posts remaining, self-reinvoking via waitUntil...`);
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      
      const reinvokePromise = fetch(`${supabaseUrl}/functions/v1/generate-campaign-content`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${serviceRoleKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ campaignId, platforms, productDescription }),
      }).catch(err => console.error("[Campaign] Self-reinvoke error:", err));

      // Use EdgeRuntime.waitUntil so the fetch fires even during shutdown
      if (typeof (globalThis as any).EdgeRuntime !== "undefined" && (globalThis as any).EdgeRuntime.waitUntil) {
        (globalThis as any).EdgeRuntime.waitUntil(reinvokePromise);
      }
    }

    return new Response(JSON.stringify({ 
      success: true, count: generated, total: newTotal, target: totalTarget,
      batchComplete: newTotal >= totalTarget
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (e: unknown) {
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    console.error("[Campaign] Critical error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { 
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
