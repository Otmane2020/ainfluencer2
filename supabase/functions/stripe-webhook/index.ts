import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Product IDs for ClipMotion subscription plans
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TsTqynweuSksG3": "starter",
  "prod_TsTqUdBfAHdNCi": "pro",
  "prod_TsTqxdl9cpZNJg": "business",
};

// Price IDs for ClipMotion subscription plans (must match create-checkout)
const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SuiszEfti9t9nN9qEGnwrdT": "starter",
  "price_1Suit0Efti9t9nN9jKws1R3q": "pro",
  "price_1Suit1Efti9t9nN9F5g8iTGq": "business",
};

// Credit pack mappings (must match create-checkout)
const PRICE_TO_CREDITS: Record<string, number> = {
  "price_1Suit2Efti9t9nN9idG07kAf": 50,
  "price_1Suit3Efti9t9nN9vPGwwfWa": 100,
  "price_1Suit5Efti9t9nN9cjaee5yZ": 250,
  "price_1Suit5Efti9t9nN96jaDSp7j": 500,
  "price_1Suit6Efti9t9nN9ynTRmA7o": 1000,
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey);
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;

    // Verify webhook signature if secret is set - MUST use async version in Deno
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
      logStep("Webhook signature verified");
    } else {
      event = JSON.parse(body);
      logStep("No webhook secret, parsing body directly");
    }

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const userId = metadata.user_id;
        const customerId = session.customer as string;

        logStep("Checkout completed", { userId, customerId, mode: session.mode });

        if (session.mode === "subscription") {
          // Handle subscription
          const subscriptionId = session.subscription as string;
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;
          const productId = subscription.items.data[0].price.product as string;
          
          // Try product ID first, then price ID, fallback to starter
          const planId = PRODUCT_TO_PLAN[productId] || PRICE_TO_PLAN[priceId] || "starter";
          
          // Safely handle period end date
          let renewsAt: string | null = null;
          try {
            const periodEnd = subscription.current_period_end;
            if (periodEnd && typeof periodEnd === 'number') {
              renewsAt = new Date(periodEnd * 1000).toISOString();
            } else if (periodEnd) {
              renewsAt = String(periodEnd);
            }
          } catch (dateErr) {
            logStep("Warning: could not parse period end date", { error: String(dateErr) });
          }

          // Update or insert subscription
          const { error } = await supabase
            .from("subscriptions")
            .upsert({
              user_id: userId,
              plan_id: planId,
              status: "active",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              started_at: new Date().toISOString(),
              renews_at: renewsAt,
            }, { onConflict: "user_id" });

          if (error) logStep("Error updating subscription", { error: error.message });
          else logStep("Subscription activated", { planId, productId, priceId, subscriptionId, renewsAt });

        } else if (session.mode === "payment") {
          // Handle one-time credit purchase
          const priceId = session.line_items?.data[0]?.price?.id;
          const credits = metadata.credits ? parseInt(metadata.credits) : (priceId ? PRICE_TO_CREDITS[priceId] : 0);

          if (credits > 0 && userId) {
            // Add credits using RPC function
            const { error } = await supabase.rpc("add_credits", {
              p_user_id: userId,
              p_amount: credits,
            });

            if (error) logStep("Error adding credits", { error: error.message });
            else {
              // Log transaction
              await supabase.from("credit_transactions").insert({
                user_id: userId,
                amount: credits,
                type: "purchase",
                description: `Purchased ${credits} credits via Stripe`,
              });
              logStep("Credits added", { credits, userId });
            }
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0].price.id;
        const planId = PRICE_TO_PLAN[priceId] || "starter";

        const status = subscription.status === "active" ? "active" : 
                       subscription.status === "past_due" ? "past_due" : 
                       subscription.status === "canceled" ? "canceled" : subscription.status;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId,
            status: status,
            renews_at: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) logStep("Error updating subscription", { error: error.message });
        else logStep("Subscription updated", { subscriptionId: subscription.id, planId, status });
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            status: "canceled",
            plan_id: "starter", // Downgrade to starter
          })
          .eq("stripe_subscription_id", subscription.id);

        if (error) logStep("Error canceling subscription", { error: error.message });
        else logStep("Subscription canceled", { subscriptionId: subscription.id });
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);

          if (error) logStep("Error updating subscription to past_due", { error: error.message });
          else logStep("Subscription marked as past_due", { subscriptionId });
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
