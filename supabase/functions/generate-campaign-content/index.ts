import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Campaign {
  id: string;
  user_id: string;
  project_id: string;
  campaign_type: "video" | "image" | "mixed";
  videos_per_month: number;
  images_per_month: number;
  posts_per_week: number;
  format: string;
  tone: string;
  subject: string | null;
  posting_hour: number | null;
  timezone: string | null;
}

interface Project {
  id: string;
  name: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  theme_color: string | null;
  detected_language: string | null;
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
        model: "google/gemini-2.5-flash-image",
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
      imageAsReel = false, 
      audioCategory = "upbeat" 
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
    
    console.log(`Image as Reel mode: ${imageAsReel}, Audio: ${audioCategory}`);

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

    console.log(`Generating content for campaign: ${campaign.name} (${campaign.campaign_type})`);
    console.log(`Project: ${project.name}, Language: ${project.detected_language || "en"}`);

    // Calculate how many posts to generate
    const totalVideos = campaign.campaign_type === "image" ? 0 : (campaign.videos_per_month || 4);
    const totalImages = campaign.campaign_type === "video" ? 0 : (campaign.images_per_month || 12);
    const totalPosts = totalVideos + totalImages;

    // Distribute posts over 30 days based on posts_per_week
    const postsPerWeek = campaign.posts_per_week || 3;
    const daysPerPost = Math.floor(7 / postsPerWeek);
    
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

      // Calculate scheduled date
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
    const langInstruction = languageInstructions[outputLanguage] || languageInstructions.en;

    const generatedPosts: any[] = [];
    let imagesGenerated = 0;

    for (const post of scheduledPosts) {
      try {
        const isVideo = post.contentType === "video";
        
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
                  // VIDEO SCRIPT PROMPT
                  `You are an expert video script writer for ${project.name}. ${langInstruction}

PROJECT CONTEXT:
- Name: ${project.name}
- Description: ${project.description || "Not specified"}
- Website: ${project.url || "Not specified"}
- Brand colors: ${project.theme_color || "Not specified"}
${project.logo_url ? `- Logo URL: ${project.logo_url}` : ""}

CAMPAIGN SETTINGS:
- Tone: ${campaign.tone || "professional"}
- Format: ${campaign.format || "reel"}
${campaign.subject ? `- Focus topic: ${campaign.subject}` : ""}

VIDEO SCRIPT RULES:
- Write a compelling 15-30 second script with timestamped scenes
- Include voiceover text for each scene
- Focus on the brand's products/services/benefits
- Format: [0-3s] Scene description. Voiceover: "Text to speak"

Respond ONLY with valid JSON:
{
  "title": "Short descriptive title",
  "aiPrompt": "The complete video script with timestamps",
  "textContent": "Social media caption with hashtags (8-12 relevant hashtags)",
  "angle": "problem|benefit|emotion|proof|urgency"
}` 
                  : 
                  // IMAGE PROMPT - COMPLETELY SEPARATE AND EXPLICIT
                  `You are an expert AI IMAGE prompt engineer. ${langInstruction}

⚠️ CRITICAL: You are generating a prompt for STATIC IMAGE generation, NOT video.
Your output will be used by an AI image generator (like DALL-E or Midjourney).

FORBIDDEN (will cause generation failure):
❌ NO motion words: "moving", "walking", "talking", "animation", "video", "motion"
❌ NO time references: "then", "next", "after", "scene 1", "0-3s"
❌ NO sound references: "voiceover", "music", "speaking", "audio"
❌ NO video terms: "clip", "footage", "reel", "story", "montage"
❌ NO text overlays or UI elements in the image

REQUIRED (for successful image generation):
✅ Subject: What is the main focus (person, product, object)
✅ Setting: Where is this taking place (studio, office, outdoors)
✅ Lighting: Type of light (soft natural light, studio lighting, golden hour)
✅ Composition: How is it framed (close-up, wide shot, flat lay)
✅ Colors: Color palette aligned with brand (mention ${project.theme_color || "brand colors"})
✅ Style: Photography style (professional, editorial, lifestyle, product photography)
✅ Quality: End with "Ultra high resolution, professional quality"

PROJECT CONTEXT:
- Brand: ${project.name}
- Description: ${project.description || "Not specified"}
- Website: ${project.url || "Not specified"}
- Brand color: ${project.theme_color || "#6366F1"}

CAMPAIGN SETTINGS:
- Tone: ${campaign.tone || "professional"}
- Format: ${campaign.format || "reel"} (this affects aspect ratio only, NOT motion)
${campaign.subject ? `- Focus topic: ${campaign.subject}` : ""}

EXAMPLE GOOD IMAGE PROMPTS:
✅ "A professional flat lay composition on a clean white desk featuring a smartphone displaying the ClipMotion app interface, surrounded by creative tools like a stylus, notebook, and coffee cup. Soft natural lighting from a window, subtle shadows, brand purple (#6366F1) accent elements scattered around. Clean minimalist aesthetic, product photography style. Ultra high resolution, professional quality"

✅ "A confident content creator sitting at a modern desk with dual monitors showing video editing software, warm ambient lighting, shallow depth of field focusing on their satisfied expression, modern office with plants and RGB lighting in brand purple tones. Lifestyle photography, authentic and aspirational mood. Ultra high resolution, professional quality"

Respond ONLY with valid JSON:
{
  "title": "Short descriptive title for this image concept",
  "aiPrompt": "The detailed STATIC IMAGE prompt (no motion, no video, no animation)",
  "textContent": "Social media caption with hashtags (8-12 relevant hashtags)",
  "angle": "problem|benefit|emotion|proof|urgency"
}`
              },
              {
                role: "user",
                content: `Generate unique ${isVideo ? "video script" : "image prompt"} #${post.index + 1} for ${project.name}. Make it different from previous ones - explore different angles, products, or benefits.`
              }
            ],
            temperature: 0.8,
          }),
        });

        if (!aiResponse.ok) {
          console.error(`AI generation failed for post ${post.index + 1}:`, await aiResponse.text());
          continue;
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content || "";
        
        // Parse JSON response
        let parsed;
        try {
          // Extract JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        } catch (e) {
          console.error(`Failed to parse AI response for post ${post.index + 1}:`, content);
          continue;
        }

        if (!parsed) continue;

        // For image posts, actually generate the image
        let mediaUrl: string | null = null;
        if (!isVideo && parsed.aiPrompt) {
          console.log(`Generating image for post ${post.index + 1}...`);
          mediaUrl = await generateImage(parsed.aiPrompt, campaign.format || "reel", LOVABLE_API_KEY, supabase);
          if (mediaUrl) {
            imagesGenerated++;
            console.log(`Image ${imagesGenerated} generated successfully`);
          }
          // Add delay between image generations to avoid rate limiting
          await new Promise(r => setTimeout(r, 2000));
        }

        // When imageAsReel is enabled, mark image posts as "video" type for Reel posting
        const finalContentType = (imageAsReel && !isVideo) ? "video" : post.contentType;

        generatedPosts.push({
          user_id: campaign.user_id,
          project_id: campaign.project_id,
          campaign_id: campaign.id,
          content_type: finalContentType, // "video" if imageAsReel, otherwise original type
          scheduled_for: post.scheduledFor,
          ai_prompt: parsed.aiPrompt || parsed.title,
          text_content: parsed.textContent || "",
          media_url: mediaUrl, // Image URL - will be converted to reel during publishing
          status: "scheduled",
          platforms: targetPlatforms,
        });

        console.log(`Generated ${post.contentType} post ${post.index + 1}/${scheduledPosts.length}${mediaUrl ? " with image" : ""}`);
        
        // Small delay to avoid rate limiting
        await new Promise(r => setTimeout(r, 500));
        
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

      // Update campaign stats
      await supabase
        .from("campaigns")
        .update({ 
          total_generated: generatedPosts.length,
          status: "active"
        })
        .eq("id", campaignId);

      console.log(`Successfully created ${generatedPosts.length} scheduled posts (${imagesGenerated} images generated)`);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        generated: generatedPosts.length,
        videos: videoCount,
        images: imageCount,
        imagesGenerated,
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
