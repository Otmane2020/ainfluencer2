import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log("[run-campaigns-cron] Starting campaign execution check...");

    // Fetch all active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from("campaigns")
      .select("*, projects(name, detected_language, description)")
      .eq("status", "active");

    if (campaignsError) {
      console.error("Failed to fetch campaigns:", campaignsError);
      throw campaignsError;
    }

    if (!campaigns || campaigns.length === 0) {
      console.log("[run-campaigns-cron] No active campaigns found");
      return new Response(
        JSON.stringify({ message: "No active campaigns", processed: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[run-campaigns-cron] Found ${campaigns.length} active campaigns`);

    let postsPublished = 0;
    let postsGenerated = 0;
    const results: any[] = [];

    for (const campaign of campaigns) {
      try {
        console.log(`[run-campaigns-cron] Processing campaign: ${campaign.name}`);

        // Get current time in campaign's timezone
        const now = new Date();
        const currentHour = now.getUTCHours();
        
        // Check if it's time to post (within the campaign's posting hour)
        const postingHour = campaign.posting_hour ?? 10;
        
        // Allow a 1-hour window for cron execution flexibility
        const shouldProcess = Math.abs(currentHour - postingHour) <= 1;
        
        if (!shouldProcess) {
          console.log(`[run-campaigns-cron] Skipping ${campaign.name} - not posting time (current: ${currentHour}, target: ${postingHour})`);
          continue;
        }

        // Find scheduled posts due for publishing
        const { data: duePosts, error: postsError } = await supabase
          .from("scheduled_posts")
          .select("*")
          .eq("campaign_id", campaign.id)
          .eq("status", "scheduled")
          .lte("scheduled_for", now.toISOString())
          .order("scheduled_for", { ascending: true })
          .limit(5); // Process up to 5 posts per campaign per run

        if (postsError) {
          console.error(`Failed to fetch posts for campaign ${campaign.id}:`, postsError);
          continue;
        }

        if (!duePosts || duePosts.length === 0) {
          console.log(`[run-campaigns-cron] No due posts for campaign: ${campaign.name}`);
          
          // Check if campaign needs more content generated
          const { count } = await supabase
            .from("scheduled_posts")
            .select("*", { count: "exact", head: true })
            .eq("campaign_id", campaign.id)
            .eq("status", "scheduled");

          if ((count || 0) < 7) {
            console.log(`[run-campaigns-cron] Campaign ${campaign.name} has low content (${count} posts), triggering generation...`);
            // Could trigger content generation here if needed
          }
          continue;
        }

        console.log(`[run-campaigns-cron] Found ${duePosts.length} due posts for campaign: ${campaign.name}`);

        for (const post of duePosts) {
          try {
            // For image posts without media, try to generate the image first
            if (post.content_type === "image" && !post.media_url && post.ai_prompt) {
              console.log(`[run-campaigns-cron] Generating image for post ${post.id}...`);
              
              const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
              if (LOVABLE_API_KEY) {
                // Generate image
                const imgResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${LOVABLE_API_KEY}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    model: "google/gemini-2.5-flash-image",
                    messages: [{ role: "user", content: post.ai_prompt + ". Ultra high resolution, professional quality." }],
                    modalities: ["image", "text"],
                  }),
                });

                if (imgResponse.ok) {
                  const imgData = await imgResponse.json();
                  const imageData = imgData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
                  
                  if (imageData) {
                    // Upload to storage
                    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, "");
                    const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
                    const fileName = `images/${Date.now()}-${Math.random().toString(36).slice(2)}.png`;

                    const { error: uploadError } = await supabase.storage
                      .from("media")
                      .upload(fileName, imageBytes, {
                        contentType: "image/png",
                        upsert: true,
                      });

                    if (!uploadError) {
                      const { data: publicUrlData } = supabase.storage.from("media").getPublicUrl(fileName);
                      
                      // Update post with image URL
                      await supabase
                        .from("scheduled_posts")
                        .update({ media_url: publicUrlData.publicUrl })
                        .eq("id", post.id);
                      
                      console.log(`[run-campaigns-cron] Image generated for post ${post.id}`);
                      postsGenerated++;
                    }
                  }
                }
              }
            }

            // Get Meta connection for user
            const { data: metaConnection } = await supabase
              .from("meta_connections")
              .select("*")
              .eq("user_id", post.user_id)
              .single();

            if (!metaConnection) {
              console.log(`[run-campaigns-cron] No Meta connection for user ${post.user_id}, marking post as ready for manual publish`);
              
              // Mark as ready but not auto-published
              await supabase
                .from("scheduled_posts")
                .update({ 
                  status: "scheduled",
                  error_message: "Ready for manual publish - no Meta connection"
                })
                .eq("id", post.id);
              continue;
            }

            // Check if token is expired
            const tokenExpiry = new Date(metaConnection.expires_at);
            if (tokenExpiry < now) {
              console.log(`[run-campaigns-cron] Meta token expired for user ${post.user_id}`);
              await supabase
                .from("scheduled_posts")
                .update({ 
                  status: "scheduled",
                  error_message: "Meta token expired - reconnect required"
                })
                .eq("id", post.id);
              continue;
            }

            // Publish to platforms
            const platforms = post.platforms || ["instagram", "facebook"];
            const errors: string[] = [];
            
            for (const platform of platforms) {
              try {
                if (platform === "facebook" && metaConnection.page_access_token && metaConnection.page_id) {
                  // Publish to Facebook Page
                  let fbUrl = `https://graph.facebook.com/v18.0/${metaConnection.page_id}/`;
                  let fbBody: any = {};

                  if (post.media_url) {
                    // Photo post
                    fbUrl += "photos";
                    fbBody = {
                      url: post.media_url,
                      caption: post.text_content || "",
                      access_token: metaConnection.page_access_token,
                    };
                  } else {
                    // Text-only post
                    fbUrl += "feed";
                    fbBody = {
                      message: post.text_content || "",
                      access_token: metaConnection.page_access_token,
                    };
                  }

                  const fbResponse = await fetch(fbUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(fbBody),
                  });

                  if (!fbResponse.ok) {
                    const errorData = await fbResponse.text();
                    console.error(`Facebook publish error:`, errorData);
                    errors.push(`facebook: ${errorData}`);
                  } else {
                    console.log(`[run-campaigns-cron] Published to Facebook`);
                  }
                }

                if (platform === "instagram" && metaConnection.instagram_id && post.media_url) {
                  // Instagram requires media
                  const accessToken = metaConnection.page_access_token || metaConnection.access_token;
                  
                  // Step 1: Create media container
                  const containerResponse = await fetch(
                    `https://graph.facebook.com/v18.0/${metaConnection.instagram_id}/media`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        image_url: post.media_url,
                        caption: post.text_content || "",
                        access_token: accessToken,
                      }),
                    }
                  );

                  if (containerResponse.ok) {
                    const containerData = await containerResponse.json();
                    
                    // Step 2: Publish the container
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
                      console.error(`Instagram publish error:`, errorData);
                      errors.push(`instagram: ${errorData}`);
                    } else {
                      console.log(`[run-campaigns-cron] Published to Instagram`);
                    }
                  } else {
                    const errorData = await containerResponse.text();
                    console.error(`Instagram container error:`, errorData);
                    errors.push(`instagram: ${errorData}`);
                  }
                }
              } catch (platformError) {
                console.error(`Platform ${platform} error:`, platformError);
                errors.push(`${platform}: ${platformError}`);
              }
            }

            // Update post status
            if (errors.length === 0) {
              await supabase
                .from("scheduled_posts")
                .update({ 
                  status: "published",
                  published_at: now.toISOString(),
                  error_message: null,
                })
                .eq("id", post.id);
              
              postsPublished++;
            } else if (errors.length < platforms.length) {
              // Partial success
              await supabase
                .from("scheduled_posts")
                .update({ 
                  status: "published",
                  published_at: now.toISOString(),
                  error_message: `Partial: ${errors.join(", ")}`,
                })
                .eq("id", post.id);
              
              postsPublished++;
            } else {
              // All failed
              await supabase
                .from("scheduled_posts")
                .update({ 
                  status: "scheduled",
                  error_message: errors.join(", "),
                })
                .eq("id", post.id);
            }

          } catch (postError) {
            console.error(`Error processing post ${post.id}:`, postError);
          }
        }

        // Update campaign stats
        await supabase
          .from("campaigns")
          .update({ 
            total_published: (campaign.total_published || 0) + postsPublished,
          })
          .eq("id", campaign.id);

        results.push({
          campaignId: campaign.id,
          campaignName: campaign.name,
          postsProcessed: duePosts.length,
        });

      } catch (campaignError) {
        console.error(`Error processing campaign ${campaign.id}:`, campaignError);
      }
    }

    console.log(`[run-campaigns-cron] Completed. Published: ${postsPublished}, Generated: ${postsGenerated}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        campaignsProcessed: results.length,
        postsPublished,
        postsGenerated,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[run-campaigns-cron] Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
