import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Stripe price mappings (USD)
const PLAN_PRICES: Record<string, string> = {
  starter: "price_1SuiszEfti9t9nN9qEGnwrdT",
  pro: "price_1Suit0Efti9t9nN9jKws1R3q",
  business: "price_1Suit1Efti9t9nN9F5g8iTGq",
};

const CREDIT_PACK_PRICES: Record<string, { priceId: string; credits: number }> = {
  "pack-50": { priceId: "price_1Suit2Efti9t9nN9idG07kAf", credits: 50 },
  "pack-100": { priceId: "price_1Suit3Efti9t9nN9vPGwwfWa", credits: 100 },
  "pack-250": { priceId: "price_1Suit5Efti9t9nN9cjaee5yZ", credits: 250 },
  "pack-500": { priceId: "price_1Suit5Efti9t9nN96jaDSp7j", credits: 500 },
  "pack-1000": { priceId: "price_1Suit6Efti9t9nN9ynTRmA7o", credits: 1000 },
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    logStep("Function started");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const { type, planId, packId } = await req.json();
    logStep("Request params", { type, planId, packId });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
      
      // Check if they have a subscription that's NOT one of our products
      const existingSubs = await stripe.subscriptions.list({ 
        customer: customerId, 
        status: "active", 
        limit: 10 
      });
      
      // Cancel all orphan subscriptions (subscriptions not in our plan list)
      for (const sub of existingSubs.data) {
        const priceId = sub.items.data[0].price.id;
        if (!Object.values(PLAN_PRICES).includes(priceId)) {
          logStep("Canceling orphan subscription", { subscriptionId: sub.id, priceId });
          try {
            await stripe.subscriptions.cancel(sub.id);
            logStep("Successfully canceled orphan subscription", { subscriptionId: sub.id });
          } catch (cancelError) {
            logStep("Failed to cancel orphan subscription", { subscriptionId: sub.id, error: String(cancelError) });
          }
        }
      }
    }

    const origin = req.headers.get("origin") || "https://ainfluencer2.lovable.app";
    let session: Stripe.Checkout.Session;

    if (type === "subscription") {
      // Subscription checkout - for orphan subscriptions, use email only (creates new sub)
      const priceId = PLAN_PRICES[planId];
      if (!priceId) throw new Error(`Invalid plan: ${planId}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "subscription",
        success_url: `${origin}/settings?payment=success&plan=${planId}`,
        cancel_url: `${origin}/settings?payment=canceled`,
        metadata: {
          user_id: user.id,
          plan_id: planId,
          type: "subscription",
        },
        // Allow promotion codes for marketing
        allow_promotion_codes: true,
      });
      logStep("Subscription checkout session created", { sessionId: session.id });

    } else if (type === "credits") {
      // One-time credit pack purchase
      const pack = CREDIT_PACK_PRICES[packId];
      if (!pack) throw new Error(`Invalid pack: ${packId}`);

      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email,
        line_items: [{ price: pack.priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${origin}/settings?payment=success&credits=${pack.credits}`,
        cancel_url: `${origin}/settings?payment=canceled`,
        metadata: {
          user_id: user.id,
          pack_id: packId,
          credits: pack.credits.toString(),
          type: "credits",
        },
      });
      logStep("Credit pack checkout session created", { sessionId: session.id, credits: pack.credits });

    } else {
      throw new Error(`Invalid checkout type: ${type}`);
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
