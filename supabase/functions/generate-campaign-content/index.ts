import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Campaign {
  id: string;
  name?: string; // FIX 1: Optional name field
  user_id: string;
  project_id: string;
  campaign_type: "video" | "image" | "mixed";
  videos_per_month: number;
  images_per_month: number;
  posts_per_week: number;
  format: string;
  tone: string;
  subject: string | null;
  ai_context: string | null;
  posting_hour: number | null;
  timezone: string | null;
  total_generated: number | null; // FIX 8: Track existing count
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  avatar_url: string | null; // FIX 2: Add avatar_url field
  theme_color: string | null;
  detected_language: string | null;
}

// ============================================================
// CONTENT DIVERSITY SYSTEM - Unique content every time
// ============================================================

// 12 Visual Scenes - Forces variety in image settings
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

// 8 Marketing Angles - Forces different persuasion approaches
const MARKETING_ANGLES = [
  { id: "social_proof", desc: "Show others already using/loving the product. Testimonial energy. FOMO trigger." },
  { id: "pain_point", desc: "Visualize the PROBLEM customers face. Make them feel the frustration. Then hint at solution." },
  { id: "transformation", desc: "Dramatic before/after. Show the life change. The glow-up. The upgrade." },
  { id: "authority", desc: "Expert positioning. Data, stats, credentials. Trust signals. Professional credibility." },
  { id: "urgency_scarcity", desc: "Limited time/quantity. Act now energy. Countdown vibes. Don't miss out." },
  { id: "lifestyle_aspiration", desc: "Dream life imagery. The person they want to become. Aspirational but attainable." },
  { id: "behind_scenes", desc: "Raw, authentic, unfiltered. Real process. Human touch. Transparency builds trust." },
  { id: "comparison", desc: "Us vs. old way. Better alternative. Clear advantages. Competitive positioning." },
];

// BANNED CLICHÉS - AI must avoid these overused concepts
const BANNED_CLICHES = [
  "laptop in café",
  "person smiling at phone",
  "entrepreneur in coffee shop",
  "woman with laptop",
  "man in suit with graph",
  "handshake business deal",
  "lightbulb idea concept",
  "rocket launch growth",
  "puzzle pieces fitting together",
  "sticky notes on glass wall",
  "team high-fiving",
  "person jumping with joy",
  "clock running out",
  "money tree growing",
  "superhero cape businessman",
];

// Get scene and angle based on post index (ensures variety)
function getContentDiversity(postIndex: number, totalPosts: number) {
  const sceneIndex = postIndex % VISUAL_SCENES.length;
  const angleIndex = postIndex % MARKETING_ANGLES.length;
  
  return {
    scene: VISUAL_SCENES[sceneIndex],
    angle: MARKETING_ANGLES[angleIndex],
    bannedList: BANNED_CLICHES.join(", "),
  };
}

// Generate image using Lovable AI
async function generateImage(prompt: string, format: string, LOVABLE_API_KEY: string, supabase: any): Promise<string | null> {
  try {
    // Add format context to prompt
    let enhancedPrompt = prompt;
    if (format === "reel" || format === "story") {
      enhancedPrompt = `${prompt}. Style: vertical portrait format 9:16 aspect ratio. Ultra high resolution, professional quality.`;
    } else if (format === "landscape") {
      enhancedPrompt = `${prompt}. Style: horizontal landscape format 16:9 aspect ratio. Ultra high resolution, professional quality.`;
    } else {
      enhancedPrompt = `${prompt}. Style: square format 1:1 aspect ratio. Ultra high resolution, professional quality.`;
    }

    console.log("Generating image with prompt:", enhancedPrompt.slice(0, 100) + "...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-pro-image-preview",
        messages: [{ role: "user", content: enhancedPrompt }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      console.error("Image generation API error:", response.status);
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response");
      return null;
    }

    // Upload to Supabase storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, {
        contentType: "image/png",
        upsert: true,
      });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      return imageData; // Return base64 as fallback
    }

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    console.log("Image uploaded:", publicUrlData.publicUrl);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("Image generation error:", error);
    return null;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      campaignId, 
      platforms: selectedPlatforms, 
      // These can be overridden by request but will fall back to campaign DB values
      imageAsReel: requestImageAsReel,
      audioCategory: requestAudioCategory,
      includeLogo: requestIncludeLogo,
      includeUrl: requestIncludeUrl,
      includeAvatar: requestIncludeAvatar,
      includeText: requestIncludeText,
      overlayText: requestOverlayText,
      clipmotion: requestClipmotion,
      productDescription = null,
      format: requestFormat = null,
      tone: requestTone = null,
      subject: requestSubject = null,
    } = await req.json();

    if (!campaignId) {
      return new Response(
        JSON.stringify({ error: "Campaign ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Default platforms if not provided
    const targetPlatforms = selectedPlatforms && selectedPlatforms.length > 0 
      ? selectedPlatforms 
      : ["instagram", "facebook"];

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch campaign
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("*")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ error: "Campaign not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch project
    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", campaign.project_id)
      .single();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use request values if provided, otherwise fall back to campaign DB values
    const effectiveFormat = requestFormat || campaign.format || "reel";
    const effectiveTone = requestTone || campaign.tone || "professional";
    const effectiveSubject = requestSubject || campaign.subject || null;
    
    // Brand options - prioritize request values, fall back to campaign DB values
    const includeLogo = requestIncludeLogo !== undefined ? requestIncludeLogo : (campaign.include_logo || false);
    const includeUrl = requestIncludeUrl !== undefined ? requestIncludeUrl : (campaign.include_url || false);
    const includeAvatar = requestIncludeAvatar !== undefined ? requestIncludeAvatar : (campaign.include_avatar || false);
    const includeText = requestIncludeText !== undefined ? requestIncludeText : (campaign.include_text || false);
    const overlayText = requestOverlayText || campaign.overlay_text || "";
    
    // Content options - prioritize request values, fall back to campaign DB values
    const imageAsReel = requestImageAsReel !== undefined ? requestImageAsReel : (campaign.image_as_reel || false);
    const audioCategory = requestAudioCategory || campaign.audio_category || "upbeat";
    const clipmotion = requestClipmotion !== undefined ? requestClipmotion : (campaign.clipmotion || false);

    console.log(`Generating content for campaign on project: ${project.name} (type: ${campaign.campaign_type})`);
    console.log(`Project: ${project.name}, Language: ${project.detected_language || "en"}`);
    console.log(`Settings: format=${effectiveFormat}, tone=${effectiveTone}, subject=${effectiveSubject || "none"}`);
    console.log(`Image as Reel mode: ${imageAsReel}, Audio: ${audioCategory}, ClipMotion: ${clipmotion}`);
    console.log(`Brand options: logo=${includeLogo}, url=${includeUrl}, avatar=${includeAvatar}, text=${includeText}`);
    console.log(`Product to promote: ${productDescription ? productDescription.slice(0, 100) + "..." : campaign.ai_context || "Not specified"}`);
    // Calculate how many posts to generate
    const totalVideos = campaign.campaign_type === "image" ? 0 : (campaign.videos_per_month || 4);
    const totalImages = campaign.campaign_type === "video" ? 0 : (campaign.images_per_month || 12);
    const totalPosts = totalVideos + totalImages;

    // Distribute posts over 30 days
    const scheduledPosts: any[] = [];
    const now = new Date();
    
    // Create a mix of video and image posts
    let videoCount = 0;
    let imageCount = 0;
    
    for (let i = 0; i < totalPosts; i++) {
      // Determine content type for this post
      let contentType: "video" | "image";
      
      if (campaign.campaign_type === "video") {
        contentType = "video";
      } else if (campaign.campaign_type === "image") {
        contentType = "image";
      } else {
        // Mixed: alternate based on ratio
        const videoRatio = totalVideos / (totalVideos + totalImages);
        contentType = Math.random() < videoRatio && videoCount < totalVideos ? "video" : "image";
        if (contentType === "video" && videoCount >= totalVideos) contentType = "image";
        if (contentType === "image" && imageCount >= totalImages) contentType = "video";
      }

      if (contentType === "video") videoCount++;
      else imageCount++;

      // Calculate scheduled date - spread across the month
      const dayOffset = Math.floor(i * (30 / totalPosts));
      const scheduledDate = new Date(now);
      scheduledDate.setDate(scheduledDate.getDate() + dayOffset + 1); // Start tomorrow
      
      // Use campaign's posting_hour or default to 10am
      const postingHour = campaign.posting_hour ?? 10;
      // Add small random variance (-1 to +1 hour) to avoid all posts at exact same time
      const hourVariance = Math.floor(Math.random() * 3) - 1;
      const finalHour = Math.max(8, Math.min(20, postingHour + hourVariance));
      scheduledDate.setHours(finalHour, Math.floor(Math.random() * 60), 0, 0);

      scheduledPosts.push({
        contentType,
        scheduledFor: scheduledDate.toISOString(),
        index: i,
      });
    }
    // FIX 7: Rate limit protection - limit to prevent timeout
    // Edge functions have 60s timeout, each AI call ~3-5s, so limit to 15 posts per batch
    const MAX_BATCH_SIZE = 15;
    if (scheduledPosts.length > MAX_BATCH_SIZE) {
      console.log(`Trimming batch from ${scheduledPosts.length} to ${MAX_BATCH_SIZE} posts to prevent timeout`);
      scheduledPosts.length = MAX_BATCH_SIZE;
      videoCount = scheduledPosts.filter(p => p.contentType === "video").length;
      imageCount = scheduledPosts.filter(p => p.contentType === "image").length;
    }

    console.log(`Will generate ${scheduledPosts.length} posts (${videoCount} videos, ${imageCount} images)`);

    // Generate AI prompts for each post
    const outputLanguage = project.detected_language || "en";
    const languageInstructions: Record<string, string> = {
      en: "OUTPUT ONLY IN ENGLISH.",
      fr: "OUTPUT ONLY IN FRENCH. No English except brand names.",
      es: "OUTPUT ONLY IN SPANISH. No English except brand names.",
      de: "OUTPUT ONLY IN GERMAN. No English except brand names.",
      it: "OUTPUT ONLY IN ITALIAN. No English except brand names.",
      pt: "OUTPUT ONLY IN PORTUGUESE. No English except brand names.",
    };
    const languageNames: Record<string, string> = {
      en: "English",
      fr: "French",
      es: "Spanish",
      de: "German",
      it: "Italian",
      pt: "Portuguese",
    };
    const langInstruction = languageInstructions[outputLanguage] || languageInstructions.en;
    const languageName = languageNames[outputLanguage] || "English";

    const generatedPosts: any[] = [];
    let promptsGenerated = 0;

    // Generate prompts for all posts (fast)
    for (const post of scheduledPosts) {
      try {
        const isVideo = post.contentType === "video";
        
        // Get content diversity based on post index
        const diversity = getContentDiversity(post.index, scheduledPosts.length);
        console.log(`Post #${post.index + 1}: Scene="${diversity.scene.id}", Angle="${diversity.angle.id}"`);
        
        // Generate AI prompt using Lovable AI
        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: isVideo ? 
                  // VIDEO SCRIPT PROMPT with diversity
                  `You are an expert video script writer for ${project.name}. ${langInstruction}

🎬 MANDATORY CREATIVE DIRECTION FOR THIS POST:
- VISUAL SCENE: ${diversity.scene.desc}
- MARKETING ANGLE: ${diversity.angle.desc}

🚫 BANNED CLICHÉS (NEVER use these):
${diversity.bannedList}

PROJECT CONTEXT:
- Name: ${project.name}
- Description: ${project.description || "Not specified"}
- Website: ${project.url || "Not specified"}
- Brand colors: ${project.theme_color || "Not specified"}
${project.logo_url ? `- Logo URL: ${project.logo_url}` : ""}

${productDescription || campaign.ai_context ? `PRODUCT/SERVICE TO PROMOTE (CRITICAL - Focus on this!):
${productDescription || campaign.ai_context}

IMPORTANT: All content MUST specifically showcase and promote this product/service. Do not create generic content.` : ""}

CAMPAIGN SETTINGS:
- Tone: ${effectiveTone} (IMPORTANT: Adapt writing style to match this tone)
- Format: ${effectiveFormat}
${effectiveSubject ? `- Focus topic: ${effectiveSubject}` : ""}
${clipmotion ? `- Mode: CLIPMOTION (social-optimized, fast-paced, viral potential)` : ""}

BRAND ELEMENTS TO INCLUDE:
${includeLogo && project.logo_url ? `- Include logo placeholder: "[LOGO]" in intro/outro scenes` : ""}
${includeUrl && project.url ? `- Include website URL: ${project.url} in final scene` : ""}
${includeAvatar && project.avatar_url ? `- Include brand avatar/spokesperson in scenes` : ""}
${includeText && overlayText ? `- Include text overlay: "${overlayText}"` : ""}

TONE GUIDELINES (${effectiveTone}):
${effectiveTone === "casual" ? "- Use friendly, conversational language. Short punchy sentences. Emojis OK." : ""}
${effectiveTone === "professional" ? "- Use polished, business-appropriate language. Clear and authoritative." : ""}
${effectiveTone === "urgent" ? "- Create urgency. Use action words. Limited time messaging." : ""}
${effectiveTone === "luxurious" ? "- Use elegant, refined language. Emphasize quality and exclusivity." : ""}
${effectiveTone === "playful" ? "- Use fun, energetic language. Humor and creativity welcome." : ""}

${clipmotion ? `CLIPMOTION MODE - CRITICAL INSTRUCTIONS:
- Fast-paced editing with 1-2 second scene cuts
- Dynamic camera movements (zoom, pan, parallax)
- High energy opening hook in first 2 seconds
- Animated text overlay suggestions for each scene
- TikTok/Reels native aesthetic
- Maximum 5 scenes for punchy rhythm
- End with engagement hook (comment, share, follow)
` : ""}

VIDEO SCRIPT RULES:
- Write a compelling 15-30 second script with timestamped scenes
- Include voiceover text for each scene
- Focus on the brand's products/services/benefits
- Format: [0-3s] Scene description. Voiceover: "Text to speak"
- MUST use the visual scene and marketing angle provided above

Respond ONLY with valid JSON:
{
  "title": "Short descriptive title",
  "aiPrompt": "The complete video script with timestamps",
  "textContent": "Social media caption with hashtags (8-12 relevant hashtags)",
  "angle": "${diversity.angle.id}"
}` 
                  :
                  // IMAGE PROMPT with diversity
                  `You are an expert AI IMAGE prompt engineer creating UNIQUE, HIGH-IMPACT visuals. ${langInstruction}

🎨 MANDATORY CREATIVE DIRECTION FOR THIS POST:
- VISUAL SCENE: ${diversity.scene.desc}
- MARKETING ANGLE: ${diversity.angle.desc}

🚫 BANNED CLICHÉS (NEVER use these - they are overused and boring):
${diversity.bannedList}

CRITICAL: You are generating a prompt for STATIC IMAGE generation, NOT video.
ALL TEXT IN THE IMAGE MUST BE IN ${languageInstructions[outputLanguage]?.split(".")[0] || "the project language"}. NO ENGLISH TEXT.

FORBIDDEN:
- NO motion words: "moving", "walking", "talking", "animation", "video", "motion"
- NO time references: "then", "next", "after", "scene 1", "0-3s"
- NO English text in the image (unless brand name)
- NO generic stock photo compositions

REQUIRED - Build your prompt using the SCENE and ANGLE above:
- Subject: What is the main focus (must relate to ${diversity.angle.id} angle)
- Setting: MUST be "${diversity.scene.id}" style (${diversity.scene.desc})
- Lighting: Creative lighting that matches the scene mood
- Composition: How is it framed (close-up, wide shot, flat lay)
- Colors: Color palette aligned with brand (mention ${project.theme_color || "brand colors"})
- Style: Photography style (professional, editorial, lifestyle, product photography)
- Text overlay: Any text in the image MUST be in ${languageName || "the project's language"}, never English
- Quality: End with "Ultra high resolution, professional quality"

BRAND ELEMENTS TO INCLUDE IN IMAGE:
${includeLogo && project.logo_url ? `- Include brand logo in corner or watermark position` : ""}
${includeUrl && project.url ? `- Include website URL "${project.url}" as text overlay` : ""}
${includeText && overlayText ? `- Include text overlay: "${overlayText}"` : ""}

TONE/STYLE (${effectiveTone}):
${effectiveTone === "casual" ? "- Relaxed, approachable visuals. Natural settings." : ""}
${effectiveTone === "professional" ? "- Polished, corporate aesthetic. Clean lines." : ""}
${effectiveTone === "urgent" ? "- Bold colors, dynamic composition. Call-to-action emphasis." : ""}
${effectiveTone === "luxurious" ? "- Elegant, high-end aesthetic. Rich textures, premium feel." : ""}
${effectiveTone === "playful" ? "- Vibrant, energetic visuals. Fun compositions." : ""}

PROJECT CONTEXT:
- Brand: ${project.name}
- Description: ${project.description || "Not specified"}
- Website: ${project.url || "Not specified"}
- Brand color: ${project.theme_color || "#6366F1"}
- Language: ${outputLanguage.toUpperCase()} - All image text MUST be in this language

${productDescription || campaign.ai_context ? `PRODUCT/SERVICE TO PROMOTE (CRITICAL - Focus on this!):
${productDescription || campaign.ai_context}

IMPORTANT: The image MUST specifically showcase this product/service. Feature it prominently in the composition.` : ""}

CAMPAIGN SETTINGS:
- Tone: ${effectiveTone}
- Format: ${effectiveFormat}
${effectiveSubject ? `- Focus topic: ${effectiveSubject}` : ""}

Respond ONLY with valid JSON:
{
  "title": "Short descriptive title for this image concept",
  "aiPrompt": "The detailed STATIC IMAGE prompt using the ${diversity.scene.id} scene and ${diversity.angle.id} angle. Include instruction that any text must be in ${languageName}",
  "textContent": "Social media caption with hashtags (8-12 relevant hashtags) - MUST BE IN ${languageName.toUpperCase()}",
  "angle": "${diversity.angle.id}"
}`
              },
              {
                role: "user",
                content: `Generate UNIQUE ${isVideo ? "video script" : "image prompt"} #${post.index + 1} of ${scheduledPosts.length} for ${project.name}.

CRITICAL REQUIREMENTS:
1. MUST use visual scene: "${diversity.scene.id}" (${diversity.scene.desc})
2. MUST use marketing angle: "${diversity.angle.id}" (${diversity.angle.desc})
3. MUST avoid all banned clichés listed above
4. Be creative and unexpected - NO generic content`
              }
            ],
            temperature: 0.9, // Slightly lower for more consistent output
            max_tokens: 1024, // Ensure complete response
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI generation failed for post ${post.index + 1}:`, await aiResponse.text());
          // Use fallback prompt instead of skipping
          generatedPosts.push({
            user_id: campaign.user_id,
            project_id: campaign.project_id,
            campaign_id: campaign.id,
            content_type: post.contentType,
            scheduled_for: post.scheduledFor,
            ai_prompt: `Professional ${post.contentType === "video" ? "video" : "image"} for ${project.name}. ${diversity.scene.desc}. Style: ${effectiveTone}. High quality.`,
            text_content: `✨ ${project.name} #${diversity.angle.id} #marketing #content`,
            media_url: null,
            thumbnail_url: null,
            status: "scheduled",
            platforms: targetPlatforms,
          });
          promptsGenerated++;
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // FIX 4: Robust JSON parsing - handles Gemini text before/after JSON
        function safeJsonParse(text: string) {
          try {
            const start = text.indexOf("{");
            const end = text.lastIndexOf("}");
            if (start === -1 || end === -1) return null;
            return JSON.parse(text.slice(start, end + 1));
          } catch {
            return null;
          }
        }

        const parsed = safeJsonParse(content);
        if (!parsed) {
          console.error(`Failed to parse AI response for post ${post.index + 1}:`, content.slice(0, 200));
          // Use fallback instead of skipping
          generatedPosts.push({
            user_id: campaign.user_id,
            project_id: campaign.project_id,
            campaign_id: campaign.id,
            content_type: post.contentType,
            scheduled_for: post.scheduledFor,
            ai_prompt: `Professional ${post.contentType === "video" ? "video" : "image"} for ${project.name}. ${diversity.scene.desc}. Style: ${effectiveTone}. High quality marketing content.`,
            text_content: `✨ Discover ${project.name} #${diversity.angle.id} #marketing #business`,
            media_url: null,
            thumbnail_url: null,
            status: "scheduled",
            platforms: targetPlatforms,
          });
          promptsGenerated++;
          continue;
        }

        // FIX 5: Track imageAsReel mode explicitly
        const finalContentType = (imageAsReel && !isVideo) ? "video" : post.contentType;
        const isImageReel = imageAsReel && !isVideo;

        generatedPosts.push({
          user_id: campaign.user_id,
          project_id: campaign.project_id,
          campaign_id: campaign.id,
          content_type: finalContentType,
          scheduled_for: post.scheduledFor,
          ai_prompt: parsed.aiPrompt || parsed.title,
          text_content: parsed.textContent || "",
          media_url: null, // FIX 3: Media will be generated by cron job
          thumbnail_url: null,
          status: "scheduled",
          platforms: targetPlatforms, // FIX 6: DB column is text[], Supabase handles array properly
        });

        promptsGenerated++;
        console.log(`Generated ${post.contentType} prompt ${post.index + 1}/${scheduledPosts.length}`);
        
      } catch (error) {
        console.error(`Error generating post ${post.index + 1}:`, error);
      }
    }

    // Insert all generated posts
    if (generatedPosts.length > 0) {
      const { error: insertError } = await supabase
        .from("scheduled_posts")
        .insert(generatedPosts);

      if (insertError) {
        console.error("Error inserting scheduled posts:", insertError);
        throw insertError;
      }

      // FIX 8: Increment total_generated instead of overwriting
      const currentTotal = campaign.total_generated || 0;
      await supabase
        .from("campaigns")
        .update({ 
          total_generated: currentTotal + generatedPosts.length,
          status: "active"
        })
        .eq("id", campaignId);

      console.log(`Successfully created ${generatedPosts.length} scheduled posts`);
    }

    // Calculate remaining posts to generate
    const remainingPosts = totalPosts - generatedPosts.length;
    
    return new Response(
      JSON.stringify({ 
        success: true,
        generated: generatedPosts.length,
        videos: videoCount,
        images: imageCount,
        remaining: remainingPosts > 0 ? remainingPosts : 0,
        batchComplete: remainingPosts <= 0,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Campaign content generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate content";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
