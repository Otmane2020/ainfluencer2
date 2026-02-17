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

const LINKEDIN_STORY_ANGLES = [
  "A founder discovers a hidden problem in their industry and realizes the current tools are outdated",
  "A customer's unexpected feedback reveals a much bigger opportunity than initially thought",
  "A painful failure that taught a critical business lesson — and led to a breakthrough",
  "Why the 'obvious' solution in this market actually makes things worse for most businesses",
  "How a small change in approach delivered 10x better results than the industry standard",
  "The moment a business leader realized their competitors were already ahead — and what they did next",
  "A behind-the-scenes look at how the product/service was built to solve a real frustration",
  "The counterintuitive strategy that's working right now while everyone else follows the crowd",
  "A conversation with a skeptic that ended with them becoming the biggest advocate",
  "What most people get wrong about this industry — and the data that proves it",
  "The 3 signals that show your business is falling behind without you even noticing",
  "How AI is changing the rules — and why early movers are winning big",
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
  const storyAngle = LINKEDIN_STORY_ANGLES[idx % LINKEDIN_STORY_ANGLES.length];

  console.log(`[Campaign] LinkedIn Story #${idx + 1}: Angle: ${storyAngle.slice(0, 50)}...`);

  const aiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "system",
        content: `You are a LinkedIn storytelling expert for ${project.name}.

${contextGuard.enhancedPrompt}

TASK: Write a compelling LinkedIn storytelling post.

STORY ANGLE: ${storyAngle}

STORYTELLING RULES:
- Write in FIRST PERSON as if the founder/team is telling the story
- Start with a HOOK — a surprising statement, a question, or a scene-setting moment
- Use SHORT paragraphs (1-3 lines max) for LinkedIn readability
- Include a TURNING POINT — the moment of realization or discovery
- End with an INSIGHT or lesson that resonates with the reader
- Add a subtle but clear CALL TO ACTION (visit website, try the product, comment)
- Include 3-5 relevant hashtags at the end
- The story must relate to the REAL products/services of ${project.name}
- Language: ${lang}
- Length: 800-1500 characters (optimal LinkedIn length)
- DO NOT use generic corporate speak — be authentic, human, vulnerable
- This is post #${idx + 1} in the series — make each story UNIQUE

${campaign.ai_context ? `BUSINESS CONTEXT: The business offers: ${campaign.ai_context}` : ""}
${project.url ? `WEBSITE: ${project.url} — always include this link in the CTA` : ""}
${project.linkedin_page_url ? `LINKEDIN PAGE: ${project.linkedin_page_url} — mention or tag this page when relevant` : ""}
${project.logo_url ? `BRAND LOGO: ${project.logo_url}` : ""}


OUTPUT: Return ONLY valid JSON:
{
  "textContent": "the complete LinkedIn story post with line breaks, hashtags, and CTA"
}`
      }],
      temperature: 0.95,
    }),
  });

  const aiData = await aiResponse.json();
  const parsed = safeJsonParse(aiData.choices?.[0]?.message?.content);

  if (!parsed?.textContent) {
    console.warn(`[Campaign] LinkedIn Story #${idx + 1}: AI parsing failed`);
    return null;
  }

  // Schedule on Tuesdays (2) and Fridays (5)
  const publishDays = [2, 5]; // Tuesday, Friday
  const scheduledDate = new Date();
  // Find the next valid publish day
  let daysAdded = 0;
  let postsScheduled = 0;
  while (postsScheduled <= idx) {
    daysAdded++;
    const candidate = new Date(scheduledDate);
    candidate.setDate(candidate.getDate() + daysAdded);
    if (publishDays.includes(candidate.getDay())) {
      postsScheduled++;
    }
  }
  scheduledDate.setDate(scheduledDate.getDate() + daysAdded);
  scheduledDate.setHours(campaign.posting_hour || 10, Math.floor(Math.random() * 30));

  // Generate a professional LinkedIn image prompt for visual impact
  const imagePromptResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${OPENROUTER_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [{
        role: "system",
        content: `You are a LinkedIn visual content expert. Create a professional, eye-catching image prompt for a LinkedIn post.

BRAND: ${project.name}
${project.url ? `WEBSITE: ${project.url}` : ""}
${project.logo_url ? `LOGO: ${project.logo_url}` : ""}
${project.theme_color ? `BRAND COLOR: ${project.theme_color}` : ""}
${project.description ? `DESCRIPTION: ${project.description}` : ""}

STORY CONTEXT: ${storyAngle}
POST CONTENT PREVIEW: ${parsed.textContent.slice(0, 300)}

CREATE a detailed image prompt that:
- Is PROFESSIONAL and CORPORATE-quality (LinkedIn aesthetic)
- Uses clean, modern design with the brand's color palette (${project.theme_color || "#2563EB"})
- Features a compelling visual that supports the story's message
- Includes bold, readable typography with a key quote or stat from the post
- Has a polished, editorial feel — think Harvard Business Review or Forbes
- Square 1:1 format optimized for LinkedIn feed
- NO generic stock photo vibes — make it UNIQUE and BRANDED
- Reserve bottom 15% for brand logo placement
- Use professional lighting, subtle gradients, and premium textures
- Include the brand name "${project.name}" prominently

BANNED: generic office photos, handshake images, lightbulb ideas, puzzle pieces

OUTPUT: Return ONLY the image prompt as plain text, no JSON, no quotes.`
      }],
      temperature: 0.85,
    }),
  });

  let linkedInImagePrompt: string | null = null;
  try {
    const imgPromptData = await imagePromptResponse.json();
    linkedInImagePrompt = imgPromptData.choices?.[0]?.message?.content?.trim() || null;
    if (linkedInImagePrompt) {
      console.log(`[Campaign] LinkedIn Story #${idx + 1}: Image prompt generated (${linkedInImagePrompt.length} chars)`);
    }
  } catch {
    console.warn(`[Campaign] LinkedIn Story #${idx + 1}: Image prompt generation failed`);
  }

  return {
    user_id: campaign.user_id,
    project_id: campaign.project_id,
    campaign_id: campaign.id,
    content_type: "image",
    scheduled_for: scheduledDate.toISOString(),
    ai_prompt: linkedInImagePrompt || storyAngle,
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
        content: `You are a marketing expert for ${project.name}. 

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

OUTPUT: Return ONLY valid JSON:
{
  "aiPrompt": "detailed visual description for AI image generation (include colors, composition, subjects, mood)",
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

  const scheduledDate = new Date();
  scheduledDate.setDate(scheduledDate.getDate() + Math.floor(idx * (30 / totalTarget)) + 1);
  scheduledDate.setHours(campaign.posting_hour || 10, Math.floor(Math.random() * 60));

  return {
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
          const scheduledDate = new Date();
          scheduledDate.setDate(scheduledDate.getDate() + Math.floor(idx * (30 / totalTarget)) + 1);
          scheduledDate.setHours(campaign.posting_hour || 10, Math.floor(Math.random() * 60));
          await supabase.from("scheduled_posts").insert({
            user_id: campaign.user_id,
            project_id: campaign.project_id,
            campaign_id: campaign.id,
            content_type: "image",
            scheduled_for: scheduledDate.toISOString(),
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
