import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

// Generate image using Lovable AI
async function generateImage(prompt: string, supabase: any, brandName?: string): Promise<string | null> {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) return null;

  try {
    const enhancedPrompt = brandName 
      ? `${prompt} for ${brandName} brand. Ultra high resolution, professional quality.`
      : `${prompt}. Ultra high resolution, professional quality.`;

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

    if (!response.ok) return null;

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!imageData) return null;

    // Upload to storage
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

    const { error: uploadError } = await supabase.storage
      .from("media")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) return null;

    const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  } catch (error) {
    console.error("[generateImage] Error:", error);
    return null;
  }
}

// Generate video using CometAPI
async function generateVideo(prompt: string, supabase: any): Promise<string | null> {
  const COMETAPI_API_KEY = Deno.env.get("COMETAPI_API_KEY");
  if (!COMETAPI_API_KEY) return null;

  try {
    console.log("[generateVideo] Starting video generation...");
    
    // Create video task
    const createResponse = await fetch("https://api.cometapi.com/v1/video/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${COMETAPI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "kling-video",
        prompt: prompt,
        duration: 5,
        aspect_ratio: "9:16",
      }),
    });

    if (!createResponse.ok) return null;

    const createData = await createResponse.json();
    const taskId = createData.data?.task_id;
    if (!taskId) return null;

    // Poll for completion (max 5 minutes)
    const maxAttempts = 30;
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10s

      const statusResponse = await fetch(`https://api.cometapi.com/v1/video/status?task_id=${taskId}`, {
        headers: { Authorization: `Bearer ${COMETAPI_API_KEY}` },
      });

      if (!statusResponse.ok) continue;

      const statusData = await statusResponse.json();
      const status = statusData.data?.status?.toLowerCase();

      if (status === "completed" || status === "success") {
        const videoUrl = statusData.data?.video_url || statusData.data?.output?.video_url;
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

// Publish to Facebook
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

// Publish to Instagram
async function publishToInstagram(
  post: ScheduledPost,
  metaConnection: any
): Promise<{ success: boolean; error?: string }> {
  if (!metaConnection.instagram_id || !post.media_url) {
    return { success: false, error: "No Instagram ID or media" };
  }

  try {
    const accessToken = metaConnection.page_access_token || metaConnection.access_token;
    const isVideo = post.content_type === "video";

    // Step 1: Create media container
    const containerBody: any = {
      caption: post.text_content || "",
      access_token: accessToken,
    };

    if (isVideo) {
      containerBody.media_type = "REELS";
      containerBody.video_url = post.media_url;
    } else {
      containerBody.image_url = post.media_url;
    }

    const containerResponse = await fetch(
      `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(containerBody),
      }
    );

    if (!containerResponse.ok) {
      const errorData = await containerResponse.text();
      return { success: false, error: errorData };
    }

    const containerData = await containerResponse.json();

    // For videos, wait for processing
    if (isVideo) {
      const maxWait = 60;
      for (let i = 0; i < maxWait; i++) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        const statusRes = await fetch(
          `https://graph.facebook.com/v18.0/${containerData.id}?fields=status_code&access_token=${accessToken}`
        );
        const statusData = await statusRes.json();
        
        if (statusData.status_code === "FINISHED") break;
        if (statusData.status_code === "ERROR") {
          return { success: false, error: "Video processing failed" };
        }
      }
    }

    // Step 2: Publish
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

    if (!publishResponse.ok) {
      const errorData = await publishResponse.text();
      return { success: false, error: errorData };
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: String(error) };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[cron] Starting scheduled posts processing...");

    const now = new Date();
    let totalGenerated = 0;
    let totalPublished = 0;

    // STEP 1: Process ALL scheduled posts that are due (with or without campaign)
    const { data: duePosts, error: postsError } = await supabase
      .from("scheduled_posts")
      .select("*, projects(name, detected_language, description, logo_url, url)")
      .eq("status", "scheduled")
      .lte("scheduled_for", now.toISOString())
      .order("scheduled_for", { ascending: true })
      .limit(20) as { data: (ScheduledPost & { projects: any })[] | null; error: any };

    if (postsError) throw postsError;

    if (!duePosts?.length) {
      console.log("[cron] No scheduled posts due");
      return new Response(JSON.stringify({ message: "No posts due", generated: 0, published: 0 }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[cron] Found ${duePosts.length} posts due for processing`);

    for (const post of duePosts) {
      const brandName = post.projects?.name;
      console.log(`[cron] Processing post ${post.id} (${post.content_type})`);

      // STEP 1: Generate media if missing
      if (!post.media_url && post.ai_prompt) {
        if (post.content_type === "image") {
          console.log(`[cron] Generating image for post ${post.id}`);
          const imageUrl = await generateImage(post.ai_prompt, supabase, brandName);
          if (imageUrl) {
            await supabase.from("scheduled_posts").update({ media_url: imageUrl }).eq("id", post.id);
            post.media_url = imageUrl;
            totalGenerated++;
            console.log(`[cron] Image generated: ${imageUrl}`);
          } else {
            console.log(`[cron] Image generation failed for post ${post.id}`);
          }
        } else if (post.content_type === "video") {
          console.log(`[cron] Generating video for post ${post.id}`);
          const videoUrl = await generateVideo(post.ai_prompt, supabase);
          if (videoUrl) {
            await supabase.from("scheduled_posts").update({ media_url: videoUrl }).eq("id", post.id);
            post.media_url = videoUrl;
            totalGenerated++;
            console.log(`[cron] Video generated: ${videoUrl}`);
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