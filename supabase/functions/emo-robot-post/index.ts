/**
 * emo-robot-post — Edge Function Supabase
 * Appelée chaque jour à 10h par pg_cron.
 * Poste la prochaine vidéo en attente sur TikTok pour @emorobotfrancais.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const EMO_USER_EMAIL = "benyahya.otmane@gmail.com";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

serve(async (req) => {
  try {
    console.log("[emo-robot-post] Démarrage...");

    // 1. Trouver l'user_id de benyahya.otmane@gmail.com
    const { data: users, error: userError } = await supabase
      .from("auth.users")
      .select("id")
      .eq("email", EMO_USER_EMAIL)
      .limit(1);

    // auth.users n'est pas accessible via from() — on utilise l'API admin
    const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
    const emoUser = authUsers?.find((u) => u.email === EMO_USER_EMAIL);

    if (!emoUser) {
      console.error("[emo-robot-post] Utilisateur non trouvé:", EMO_USER_EMAIL);
      return new Response(JSON.stringify({ error: "User not found" }), { status: 404 });
    }

    const userId = emoUser.id;
    console.log("[emo-robot-post] User ID:", userId);

    // 2. Récupérer la connexion TikTok de cet utilisateur
    const { data: tiktokConn, error: connError } = await supabase
      .from("tiktok_connections")
      .select("access_token, open_id, expires_at")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!tiktokConn) {
      console.error("[emo-robot-post] Pas de connexion TikTok pour:", EMO_USER_EMAIL);
      return new Response(JSON.stringify({ error: "No TikTok connection" }), { status: 400 });
    }

    // Vérifier si le token est encore valide
    if (new Date(tiktokConn.expires_at) < new Date()) {
      console.error("[emo-robot-post] Token TikTok expiré — reconnecte-toi sur clipmotion.ai");
      return new Response(JSON.stringify({ error: "Token expired" }), { status: 401 });
    }

    // 3. Prendre la prochaine vidéo à poster
    const now = new Date().toISOString();
    const { data: video, error: videoError } = await supabase
      .from("emo_robot_queue")
      .select("*")
      .eq("status", "pending")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (!video) {
      console.log("[emo-robot-post] Aucune vidéo à poster aujourd'hui.");
      return new Response(JSON.stringify({ message: "Nothing to post" }), { status: 200 });
    }

    console.log("[emo-robot-post] Vidéo à poster:", video.id, video.video_url.slice(-40));

    // 4. Poster sur TikTok via API v2
    const caption = (video.caption || "").slice(0, 2200);

    const tiktokRes = await fetch(
      "https://open.tiktokapis.com/v2/post/publish/video/init/",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${tiktokConn.access_token}`,
          "Content-Type": "application/json; charset=UTF-8",
        },
        body: JSON.stringify({
          post_info: {
            title: caption,
            privacy_level: "PUBLIC_TO_EVERYONE",
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
          },
          source_info: {
            source: "PULL_FROM_URL",
            video_url: video.video_url,
          },
        }),
      }
    );

    const tiktokData = await tiktokRes.json();
    console.log("[emo-robot-post] Réponse TikTok:", JSON.stringify(tiktokData));

    if (!tiktokRes.ok || tiktokData.error?.code !== "ok") {
      const errMsg = tiktokData.error?.message || JSON.stringify(tiktokData);
      await supabase
        .from("emo_robot_queue")
        .update({ status: "failed", error_msg: errMsg })
        .eq("id", video.id);

      console.error("[emo-robot-post] Erreur TikTok:", errMsg);
      return new Response(JSON.stringify({ error: errMsg }), { status: 500 });
    }

    // 5. Marquer comme postée
    await supabase
      .from("emo_robot_queue")
      .update({ status: "posted", posted_at: new Date().toISOString() })
      .eq("id", video.id);

    console.log("[emo-robot-post] Vidéo postée avec succès ! publish_id:", tiktokData.data?.publish_id);

    return new Response(
      JSON.stringify({ success: true, publish_id: tiktokData.data?.publish_id }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("[emo-robot-post] Erreur inattendue:", err);
    return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
  }
});
