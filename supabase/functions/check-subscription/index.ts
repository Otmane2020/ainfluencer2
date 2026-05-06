import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ============================================================
// STRICT PRODUCT/PRICE MAPPING (USD) - Only these grant valid subscriptions
// ============================================================

// Product IDs for ClipMotion subscription plans
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_Tts3Yrv7nyBmxi": "pro",
  "prod_USk3Zi3Hhs42nn": "business",
};

// Price IDs for ClipMotion subscription plans (fallback lookup)
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1Sw4JNEfti9t9nN9Z88uua20": "pro",
  "price_1TToZ8Efti9t9nN9kA3w0Myp": "business",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    
    let userId: string;
    let userEmail: string;
    
    // Use getClaims for JWT validation (more reliable than getUser)
    const { data: claimsData, error: claimsError } = await supabaseClient.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      // Fallback to getUser if getClaims fails
      const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      if (!userData.user?.email) throw new Error("User not authenticated or email not available");
      
      userId = userData.user.id;
      userEmail = userData.user.email;
      logStep("User authenticated via getUser", { userId, email: userEmail });
    } else {
      // Build user object from claims
      userId = claimsData.claims.sub as string;
      userEmail = claimsData.claims.email as string;
      logStep("User authenticated via getClaims", { userId, email: userEmail });
    }
    
    if (!userEmail) throw new Error("User email not available");

    // ============================================================
    // CHECK DATABASE FIRST for lifetime/manual grants (BEFORE any Stripe check)
    // ============================================================
    const { data: lifetimeGrant } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("stripe_customer_id", "lifetime_grant")
      .maybeSingle();

    if (lifetimeGrant) {
      logStep("LIFETIME GRANT found in database - skipping Stripe check", { 
        planId: lifetimeGrant.plan_id, 
        renewsAt: lifetimeGrant.renews_at,
        status: lifetimeGrant.status
      });
      
      // Ensure status is active for lifetime grants
      if (lifetimeGrant.status !== "active") {
        await supabaseClient
          .from("subscriptions")
          .update({ status: "active" })
          .eq("id", lifetimeGrant.id);
      }
      
      return new Response(JSON.stringify({
        subscribed: true,
        plan_id: lifetimeGrant.plan_id,
        status: "active",
        subscription_end: lifetimeGrant.renews_at,
        requires_checkout: false,
        lifetime: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }
    // ============================================================
    // CHECK DATABASE for active free Starter plan (no Stripe needed)
    // ============================================================
    const { data: freeStarter } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("plan_id", "starter")
      .eq("status", "active")
      .is("stripe_subscription_id", null)
      .maybeSingle();

    if (freeStarter) {
      logStep("Free Starter plan active in DB - skipping Stripe check");
      return new Response(JSON.stringify({
        subscribed: true,
        plan_id: "starter",
        status: "active",
        subscription_end: freeStarter.renews_at,
        requires_checkout: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const stripe = new Stripe(stripeKey);
    const customers = await stripe.customers.list({ email: userEmail, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found - user has no subscription");
      
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_id: "starter",
          status: "inactive",
          stripe_customer_id: null,
          stripe_subscription_id: null,
        }, { onConflict: "user_id" });

      return new Response(JSON.stringify({
        subscribed: false,
        plan_id: null,
        status: "no_subscription",
        subscription_end: null,
        requires_checkout: true,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    let planId: string | null = null;
    let subscriptionEnd: string | null = null;
    let hasValidSubscription = false;
    let stripeSubscriptionId: string | null = null;

    if (subscriptions.data.length > 0) {
      const subscription = subscriptions.data[0];
      stripeSubscriptionId = subscription.id;
      
      // Extract product and price IDs
      const priceId = subscription.items.data[0].price.id;
      const productId = subscription.items.data[0].price.product as string;
      
      logStep("Checking subscription validity", { subscriptionId: subscription.id, productId, priceId });

      // STRICT VALIDATION: Only recognize our ClipMotion products
      planId = PRODUCT_TO_PLAN[productId] || PRICE_TO_PLAN[priceId] || null;

      if (planId) {
        // Valid ClipMotion subscription found
        hasValidSubscription = true;
        
        // Safely handle the subscription end date
        const periodEnd = subscription.current_period_end;
        if (periodEnd && typeof periodEnd === 'number') {
          subscriptionEnd = new Date(periodEnd * 1000).toISOString();
        } else if (periodEnd) {
          subscriptionEnd = String(periodEnd);
        }
        
        logStep("Valid ClipMotion subscription found", { 
          subscriptionId: subscription.id, 
          planId, 
          productId,
          priceId,
          endDate: subscriptionEnd 
        });

        // Sync to database
        await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscriptionId,
            renews_at: subscriptionEnd,
          }, { onConflict: "user_id" });
      } else {
        // Subscription exists but is NOT a recognized ClipMotion product
        // This is an orphan subscription (e.g., from another product)
        logStep("ORPHAN SUBSCRIPTION DETECTED - Not a ClipMotion product", { 
          subscriptionId: subscription.id,
          productId,
          priceId,
          recognizedProducts: Object.keys(PRODUCT_TO_PLAN),
        });
        
        hasValidSubscription = false;
        planId = null;
        
        // Mark as inactive in database
        await supabaseClient
          .from("subscriptions")
          .upsert({
            user_id: userId,
            plan_id: "starter",
            status: "orphan",
            stripe_customer_id: customerId,
            stripe_subscription_id: stripeSubscriptionId,
          }, { onConflict: "user_id" });
      }
    } else {
      logStep("No active Stripe subscription found");
      
      // Update database to reflect no active subscription
      await supabaseClient
        .from("subscriptions")
        .upsert({
          user_id: userId,
          plan_id: "starter",
          status: "inactive",
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
        }, { onConflict: "user_id" });
    }

    return new Response(JSON.stringify({
      subscribed: hasValidSubscription,
      plan_id: planId,
      status: hasValidSubscription ? "active" : "no_valid_subscription",
      subscription_end: subscriptionEnd,
      requires_checkout: !hasValidSubscription,
    }), {
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
