import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PLAN_PRICES: Record<string, string> = {
  starter: "price_1SuiszEfti9t9nN9qEGnwrdT",
  pro: "price_1Suit0Efti9t9nN9jKws1R3q",
  business: "price_1Suit1Efti9t9nN9F5g8iTGq",
};

const CREDIT_PACKS: Record<string, { credits: number; priceUsd: number }> = {
  "pack-100": { credits: 100, priceUsd: 10 },
  "pack-300": { credits: 300, priceUsd: 30 },
  "pack-700": { credits: 700, priceUsd: 70 },
  "pack-1500": { credits: 1500, priceUsd: 150 },
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[CREATE-CHECKOUT] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("No authorization header provided");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user?.email) throw new Error(authError?.message ?? "User not authenticated");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    const stripe = new Stripe(stripeKey);

    const body = await req.json();
    const { type, planId, packId, origin: bodyOrigin } = body ?? {};
    const origin = (bodyOrigin || req.headers.get("origin") || "https://www.clipmotion.ai").replace(/\/$/, "");

    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    const customerId = customers.data[0]?.id;

    if (customerId && type === "subscription") {
      const existingSubs = await stripe.subscriptions.list({ customer: customerId, status: "active", limit: 10 });
      for (const sub of existingSubs.data) {
        const priceId = sub.items.data[0]?.price?.id;
        if (priceId && !Object.values(PLAN_PRICES).includes(priceId)) {
          try {
            await stripe.subscriptions.cancel(sub.id);
            logStep("Canceled orphan subscription", { subscriptionId: sub.id, priceId });
          } catch (error) {
            logStep("Could not cancel orphan subscription", { subscriptionId: sub.id, error: String(error) });
          }
        }
      }
    }

    let session: Stripe.Checkout.Session;

    if (type === "subscription") {
      const priceId = PLAN_PRICES[planId];
      if (!priceId) throw new Error(`Invalid plan: ${planId}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/dashboard?payment=success&plan=${planId}`,
        cancel_url: `${origin}/choose-plan?payment=canceled`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          type: "subscription",
        },
        subscription_data: {
          metadata: {
            user_id: user.id,
            plan_id: planId,
          },
        },
        allow_promotion_codes: true,
      });
    } else if (type === "credits") {
      const pack = CREDIT_PACKS[packId];
      if (!pack) throw new Error(`Invalid credit pack: ${packId}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [
          {
            price_data: {
              currency: "usd",
              unit_amount: pack.priceUsd * 100,
              product_data: {
                name: `${pack.credits.toLocaleString("en-US")} ClipMotion credits`,
                description: "Generation credits for ClipMotion product visuals, motion clips and voiceovers",
              },
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/settings?payment=success&credits=${pack.credits}`,
        cancel_url: `${origin}/settings?payment=canceled`,
        metadata: {
          user_id: user.id,
          pack_id: packId,
          credits: String(pack.credits),
          type: "credits",
        },
      });
    } else {
      throw new Error(`Invalid checkout type: ${type}`);
    }

    logStep("Checkout created", { type, planId, packId, sessionId: session.id });
    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
