import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DeleteResult {
  postId: string;
  dbDeleted: boolean;
  facebookDeleted: boolean;
  instagramDeleted: boolean;
  error?: string;
}

// Delete post from Facebook using Graph API
async function deleteFromFacebook(
  postId: string, 
  accessToken: string
): Promise<{ success: boolean; error?: string }> {
  try {
    console.log(`[delete-post] Attempting to delete Facebook post: ${postId}`);
    
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${postId}`,
      {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      }
    );

    const data = await response.json();
    
    if (response.ok && data.success) {
      console.log(`[delete-post] Successfully deleted Facebook post: ${postId}`);
      return { success: true };
    } else {
      const errorMsg = data.error?.message || "Unknown Facebook error";
      console.error(`[delete-post] Facebook delete failed:`, data);
      return { success: false, error: errorMsg };
    }
  } catch (err) {
    const error = err as Error;
    console.error(`[delete-post] Facebook delete error:`, error);
    return { success: false, error: error.message };
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Validate user
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: authError } = await supabase.auth.getClaims(token);
    if (authError || !claims?.claims) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.claims.sub as string;

    // Parse request body
    const { postId, postIds, deleteFromPlatforms = true } = await req.json();

    // Support both single and batch delete
    const idsToDelete = postIds || (postId ? [postId] : []);

    if (!idsToDelete.length) {
      return new Response(
        JSON.stringify({ error: "postId or postIds required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[delete-post] User ${userId} deleting posts:`, idsToDelete);

    // Fetch posts to check for external_post_id (Facebook/Instagram)
    const { data: postsToDelete, error: fetchError } = await supabase
      .from("scheduled_posts")
      .select("id, external_post_id, platforms, status")
      .in("id", idsToDelete)
      .eq("user_id", userId);

    if (fetchError) {
      console.error("[delete-post] Fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results: DeleteResult[] = [];

    // Get Meta connection for user (for Facebook/Instagram deletion)
    let metaConnection: { page_access_token: string | null; access_token: string } | null = null;
    
    if (deleteFromPlatforms) {
      const { data: metaData } = await supabaseAdmin
        .from("meta_connections")
        .select("page_access_token, access_token")
        .eq("user_id", userId)
        .maybeSingle();
      
      metaConnection = metaData;
    }

    // Process each post
    for (const post of postsToDelete || []) {
      const result: DeleteResult = {
        postId: post.id,
        dbDeleted: false,
        facebookDeleted: false,
        instagramDeleted: false,
      };

      // Try to delete from Facebook/Instagram if published and has external_post_id
      if (
        deleteFromPlatforms &&
        post.status === "published" &&
        post.external_post_id &&
        metaConnection
      ) {
        const accessToken = metaConnection.page_access_token || metaConnection.access_token;
        
        // Check if post was on Facebook
        if (post.platforms?.includes("facebook") || post.platforms?.includes("instagram")) {
          const fbResult = await deleteFromFacebook(post.external_post_id, accessToken);
          result.facebookDeleted = fbResult.success;
          if (!fbResult.success) {
            result.error = fbResult.error;
            console.log(`[delete-post] Note: Facebook deletion failed for ${post.id}: ${fbResult.error}`);
          }
        }
      }

      results.push(result);
    }

    // Delete posts from database (RLS ensures user can only delete their own)
    const { data, error } = await supabase
      .from("scheduled_posts")
      .delete()
      .in("id", idsToDelete)
      .eq("user_id", userId)
      .select("id");

    if (error) {
      console.error("[delete-post] Database delete error:", error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark db deletion successful for all
    const deletedIds = data?.map(p => p.id) || [];
    results.forEach(r => {
      r.dbDeleted = deletedIds.includes(r.postId);
    });

    console.log(`[delete-post] Successfully deleted ${data?.length || 0} posts from database`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        deleted: data?.length || 0,
        deletedIds,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error("[delete-post] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});