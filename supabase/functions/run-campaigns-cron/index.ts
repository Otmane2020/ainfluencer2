import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// ============================================================
// AUTOPOST ALWAYS USES SMART QUALITY FOR COST CONTROL
// Smart Image: flux-2-flex (1.50€)
// Smart Video: kling-video (9.90€)
// ============================================================

interface Campaign {
  id: string;
  name: string;
  status: string;
  posting_hour: number | null;
  user_id: string;
  project_id: string;
  total_published: number | null;
  total_generated: number | null;
  projects?: { name: string; detected_language: string | null; description: string | null; logo_url: string | null; url: string | null };
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
// SMART IMAGE GENERATION (via CometAPI - Flux 2 Flex)
// ============================================================

async function generateImage(prompt: string, supabase: any, brandName?: string, language?: string): Promise<string | null> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) {
    console.error("[generateImage] COMETAPI_API_KEY not configured");
    return null;
  }

  try {
    // Add language constraint for any text in the image
    const langPrefix = language && language !== "en" 
      ? `[LANGUAGE: All text in this image MUST be in ${language === "fr" ? "French" : language === "es" ? "Spanish" : language === "de" ? "German" : language === "it" ? "Italian" : language === "pt" ? "Portuguese" : "English"}. NO English text allowed.] `
      : "";
    
    const enhancedPrompt = brandName 
      ? `${langPrefix}${prompt} for ${brandName} brand. Ultra high resolution, professional quality.`
      : `${langPrefix}${prompt}. Ultra high resolution, professional quality.`;

    console.log("[generateImage] Using Smart Image (flux-2-flex) via CometAPI");

    const response = await fetch("https://api.cometapi.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "flux-2-flex", // Smart Image model
        prompt: enhancedPrompt,
        n: 1,
        size: "1024x1024",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[generateImage] CometAPI error:", response.status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;

    if (!imageUrl) {
      // If we get base64, upload to storage
      const base64 = data.data?.[0]?.b64_json;
      if (base64) {
        const imageBytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
        const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

        const { error: uploadError } = await supabase.storage
          .from("media")
          .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("[generateImage] Upload error:", uploadError);
          return null;
        }

        const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
        return publicUrlData.publicUrl;
      }
      return null;
    }

    // Download and re-upload to our storage for permanence
    const imgResponse = await fetch(imageUrl);
    const imgBlob = await imgResponse.blob();
    const arrayBuffer = await imgBlob.arrayBuffer();
    const imageBytes = new Uint8Array(arrayBuffer);
    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("[generateImage] Upload error:", uploadError);
      return imageUrl; // Return original URL as fallback
    }

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("[generateImage] Error:", error);
    return null;
  }
}

// ============================================================
// SMART VIDEO GENERATION (via CometAPI - Kling)
// ============================================================

async function generateVideo(prompt: string, supabase: any): Promise<string | null> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) {
    console.error("[generateVideo] COMETAPI_API_KEY not configured");
    return null;
  }

  try {
    console.log("[generateVideo] Using Smart Video (kling-video) via CometAPI...");
    
    // Create video task using FormData (CometAPI format)
    const formData = new FormData();
    formData.append("prompt", prompt);
    formData.append("model", "kling-video"); // Smart Video model
    formData.append("seconds", "5");
    formData.append("size", "720x1280"); // Portrait for Reels

    const createResponse = await fetch("https://api.cometapi.com/v1/videos", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
      },
      body: formData,
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      console.error("[generateVideo] Create error:", createResponse.status, errorText.slice(0, 200));
      return null;
    }

    const createData = await createResponse.json();
    const taskId = createData.id;
    if (!taskId) {
      console.error("[generateVideo] No task ID in response");
      return null;
    }

    console.log("[generateVideo] Task created:", taskId);

    // Poll for completion (max 5 minutes)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

      const statusResponse = await fetch(`https://api.cometapi.com/v1/videos/${taskId}`, {
        headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const videoData = statusData.data || statusData;
      const innerData = videoData.data || {};
      const status = (videoData.status || innerData.status || "").toLowerCase();

      console.log(`[generateVideo] Poll ${i + 1}/${maxAttempts}: status=${status}`);

      if (status === "completed" || status === "success" || status === "succeeded" || status === "done") {
        // CometAPI quirk: video URL sometimes in fail_reason
        let videoUrl = null;
        if (videoData.fail_reason && videoData.fail_reason.startsWith("http")) {
          videoUrl = videoData.fail_reason;
        } else {
          videoUrl = innerData.output_video || videoData.output_video || 
                     videoData.video_url || innerData.url || videoData.url;
        }

        if (videoUrl) {
          console.log("[generateVideo] Video ready:", videoUrl);
          return videoUrl;
        }
      } else if (status === "failed" || status === "error") {
        console.error("[generateVideo] Task failed");
        return null;
      }
    }

    console.log("[generateVideo] Timeout waiting for video");
    return null;
  } catch (error) {
    console.error("[generateVideo] Error:", error);
    return null;
  }
}

// ============================================================
// REEL GENERATION (Image + Background Music via Lovable AI)
// Uses Gemini for image + royalty-free music - NO video conversion
// ============================================================

async function generateReel(prompt: string, supabase: any, brandName?: string, language?: string): Promise<{ imageUrl: string; musicUrl: string } | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  if (!LOVABLE_API_KEY) {
    console.error("[generateReel] LOVABLE_API_KEY not configured");
    return null;
  }

  try {
    // Build enhanced prompt for vertical reel format
    let enhancedPrompt = prompt;
    if (brandName) {
      enhancedPrompt = `${prompt} for ${brandName} brand`;
    }
    
    // Add language constraint
    const langMap: Record<string, string> = {
      fr: "French", es: "Spanish", de: "German", it: "Italian", pt: "Portuguese"
    };
    const langName = langMap[language || ""] || "English";
    if (language && language !== "en") {
      enhancedPrompt = `[All text MUST be in ${langName}] ${enhancedPrompt}`;
    }
    
    enhancedPrompt += ". Vertical portrait format 9:16, perfect for Instagram Reels, eye-catching, professional quality, vibrant colors, social media optimized, ultra high resolution.";

    console.log("[generateReel] Generating image with Lovable AI (Gemini)...");
    
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
      const status = response.status;
      const errorText = await response.text();
      console.error("[generateReel] Lovable AI error:", status, errorText.slice(0, 200));
      return null;
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("[generateReel] No image in response");
      return null;
    }

    // Upload to Supabase storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `images/reel-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    let finalImageUrl: string;
    if (uploadError) {
      console.error("[generateReel] Upload error, using base64:", uploadError);
      finalImageUrl = imageData; // Fallback to base64
    } else {
      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
      finalImageUrl = publicUrlData.publicUrl;
    }

    // Select random background music track
    const musicTracks = [
      "https://assets.mixkit.co/music/preview/mixkit-tech-house-vibes-130.mp3",
      "https://assets.mixkit.co/music/preview/mixkit-hip-hop-02-738.mp3",
      "https://assets.mixkit.co/music/preview/mixkit-sleepy-cat-135.mp3",
      "https://assets.mixkit.co/music/preview/mixkit-spirit-of-the-explorer-723.mp3",
    ];
    const musicUrl = musicTracks[Math.floor(Math.random() * musicTracks.length)];

    console.log("[generateReel] Success! Image:", finalImageUrl.slice(0, 50), "Music:", musicUrl);
    return { imageUrl: finalImageUrl, musicUrl };
  } catch (error) {
    console.error("[generateReel] Error:", error);
    return null;
  }
}

// ============================================================
// PUBLISH TO FACEBOOK
// ============================================================

async function publishToFacebook(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string }> {
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

    return { success: true };
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

    // For videos, wait for processing
    if (isVideo) {
      console.log("[Instagram] Waiting for video processing...");
      const maxWait = 60;
      for (let i = 0; i < maxWait; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusRes = await fetch(
          `https://graph.facebook.com/v18.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
        );
        const statusText = await statusRes.text();
        const statusData = JSON.parse(statusText);
        
        console.log(`[Instagram] Processing status (${i + 1}/${maxWait}): ${statusData.status_code}`);
        
        if (statusData.status_code === "FINISHED") break;
        if (statusData.status_code === "ERROR") {
          return { success: false, error: "Video processing failed at Instagram" };
        }
      }
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

    console.log("[cron] Starting AutoPost processing (Smart Quality)...");

    const now = new Date();
    let totalGenerated = 0;
    let totalPublished = 0;

    // Process all due posts (scheduled or draft with past scheduled_for)
    const { data: duePosts, error: postsError } = await supabase
      .from("scheduled_posts")
      .select("*, projects(name, detected_language, description, logo_url, url)")
      .in("status", ["scheduled", "draft"])
      .lte("scheduled_for", now.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(20) as { data: (ScheduledPost & { projects: any })[] | null; error: any };

    if (postsError) throw postsError;

    if (!duePosts?.length) {
      console.log("[cron] No posts due for processing");
      return new Response(JSON.stringify({ message: "No posts due", generated: 0, published: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cron] Found ${duePosts.length} posts due for processing`);

    for (const post of duePosts) {
      const brandName = post.projects?.name;
      const projectLanguage = post.projects?.detected_language || "en";
      console.log(`[cron] Processing post ${post.id} (${post.content_type}) - language: ${projectLanguage}`);

      // STEP 1: Generate media if missing (using Smart quality)
      if (!post.media_url && post.ai_prompt) {
        // Check if this is an "Image as Reel" post:
        // - content_type is "video" 
        // - BUT the ai_prompt doesn't contain video markers (timestamps, voiceover)
        const isImageAsReel = post.content_type === "video" && 
          !post.ai_prompt.includes("[0-") && 
          !post.ai_prompt.toLowerCase().includes("voiceover") &&
          !post.ai_prompt.toLowerCase().includes("scene ");
        
        if (isImageAsReel) {
          // Image as Reel: Use Lovable AI Gemini for image + background music
          // NO CometAPI video conversion - just static image posted as Instagram photo
          console.log(`[cron] Generating Reel (Gemini image + music) for post ${post.id} in ${projectLanguage}`);
          
          const reelResult = await generateReel(post.ai_prompt, supabase, brandName, projectLanguage);
          if (reelResult) {
            // Store the image URL - Instagram will display as photo/carousel
            // Music URL is available for client-side playback if needed
            await supabase.from("scheduled_posts").update({ 
              media_url: reelResult.imageUrl,
              thumbnail_url: reelResult.imageUrl,
            }).eq("id", post.id);
            post.media_url = reelResult.imageUrl;
            totalGenerated++;
            console.log(`[cron] Reel image generated: ${reelResult.imageUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Reel generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "image") {
          console.log(`[cron] Generating Smart Image for post ${post.id} in ${projectLanguage}`);
          const imageUrl = await generateImage(post.ai_prompt, supabase, brandName, projectLanguage);
          if (imageUrl) {
            await supabase.from("scheduled_posts").update({ media_url: imageUrl }).eq("id", post.id);
            post.media_url = imageUrl;
            totalGenerated++;
            console.log(`[cron] Smart Image generated: ${imageUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Image generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "video") {
          console.log(`[cron] Generating Smart Video for post ${post.id}`);
          const videoUrl = await generateVideo(post.ai_prompt, supabase);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ media_url: videoUrl }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Smart Video generated: ${videoUrl.slice(0, 50)}...`);
          } else {
            console.log(`[cron] Video generation failed for post ${post.id}`);
          }
        }
      }

      // STEP 2: Publish to platforms
      const { data: metaConnection } = await supabase
        .from("meta_connections")
        .select("*")
        .eq("user_id", post.user_id)
        .single();

      if (!metaConnection) {
        console.log(`[cron] No Meta connection for user ${post.user_id}`);
        await supabase.from("scheduled_posts").update({
          error_message: "No Meta connection - manual publish required",
        }).eq("id", post.id);
        continue;
      }

      // Check token expiry
      if (new Date(metaConnection.expires_at) < now) {
        console.log(`[cron] Meta token expired for user ${post.user_id}`);
        await supabase.from("scheduled_posts").update({
          error_message: "Meta token expired - reconnect required",
        }).eq("id", post.id);
        continue;
      }

      const platforms = post.platforms || ["instagram", "facebook"];
      const errors: string[] = [];

      for (const platform of platforms) {
        if (platform === "facebook") {
          const result = await publishToFacebook(post, metaConnection);
          if (!result.success) {
            errors.push(`FB: ${result.error}`);
            console.log(`[cron] Facebook publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Facebook successfully`);
          }
        }

        if (platform === "instagram") {
          const result = await publishToInstagram(post, metaConnection);
          if (!result.success) {
            errors.push(`IG: ${result.error}`);
            console.log(`[cron] Instagram publish failed: ${result.error}`);
          } else {
            console.log(`[cron] Published to Instagram successfully`);
          }
        }
      }

      // Update post status
      if (errors.length === 0) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: null,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} published successfully`);
      } else if (errors.length < platforms.length) {
        await supabase.from("scheduled_posts").update({
          status: "published",
          published_at: now.toISOString(),
          error_message: `Partial: ${errors.join(", ")}`,
        }).eq("id", post.id);
        totalPublished++;
        console.log(`[cron] Post ${post.id} partially published`);
      } else {
        await supabase.from("scheduled_posts").update({
          error_message: errors.join(", "),
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
