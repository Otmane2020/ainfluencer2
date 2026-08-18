import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TsTqynweuSksG3": "starter",
  "prod_TsTqUdBfAHdNCi": "pro",
  "prod_TsTqxdl9cpZNJg": "business",
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1SuiszEfti9t9nN9qEGnwrdT": "starter",
  "price_1Suit0Efti9t9nN9jKws1R3q": "pro",
  "price_1Suit1Efti9t9nN9F5g8iTGq": "business",
};

const PLAN_CREDITS: Record<string, number> = {
  starter: 190,
  pro: 490,
  business: 990,
};

// Legacy fixed-price packs remain recognized for old completed Checkout sessions.
const LEGACY_PRICE_TO_CREDITS: Record<string, number> = {
  "price_1Suit2Efti9t9nN9idG07kAf": 50,
  "price_1Suit3Efti9t9nN9vPGwwfWa": 100,
  "price_1Suit5Efti9t9nN9cjaee5yZ": 250,
  "price_1Suit5Efti9t9nN96jaDSp7j": 500,
  "price_1Suit6Efti9t9nN9ynTRmA7o": 1000,
};

const logStep = (step: string, details?: unknown) => {
  console.log(`[STRIPE-WEBHOOK] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

function planFromSubscription(subscription: Stripe.Subscription) {
  const price = subscription.items.data[0]?.price;
  const priceId = price?.id;
  const productId = typeof price?.product === "string" ? price.product : price?.product?.id;
  return {
    planId: (productId ? PRODUCT_TO_PLAN[productId] : undefined) || (priceId ? PRICE_TO_PLAN[priceId] : undefined) || null,
    priceId,
    productId,
  };
}

function subscriptionIdFromInvoice(invoice: Stripe.Invoice) {
  const raw = invoice as unknown as Record<string, any>;
  const direct = raw.subscription;
  if (typeof direct === "string") return direct;
  if (direct?.id) return String(direct.id);
  const nested = raw.parent?.subscription_details?.subscription;
  if (typeof nested === "string") return nested;
  if (nested?.id) return String(nested.id);
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } },
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey);
    const rawBody = await req.text();
    const signature = req.headers.get("stripe-signature");

    let event: Stripe.Event;
    if (webhookSecret && signature) {
      event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
    } else {
      event = JSON.parse(rawBody);
      logStep("WARNING: webhook secret missing; body was not signature-verified");
    }

    const ensureCreditWallet = async (userId: string) => {
      const { data } = await supabase.from("credits").select("id").eq("user_id", userId).maybeSingle();
      if (!data) {
        const { error } = await supabase.from("credits").insert({ user_id: userId, balance: 0 });
        if (error && !error.message.toLowerCase().includes("duplicate")) throw error;
      }
    };

    const grantCreditsOnce = async (
      userId: string,
      credits: number,
      transactionType: string,
      description: string,
      idempotencyKey: string,
    ) => {
      const marker = `${description} · ${idempotencyKey}`;
      const { data: existing } = await supabase
        .from("credit_transactions")
        .select("id")
        .eq("user_id", userId)
        .eq("description", marker)
        .limit(1)
        .maybeSingle();
      if (existing) {
        logStep("Credit grant already processed", { userId, idempotencyKey });
        return;
      }

      await ensureCreditWallet(userId);
      const { error: addError } = await supabase.rpc("add_credits", {
        p_user_id: userId,
        p_amount: credits,
      });
      if (addError) throw addError;

      const { error: txError } = await supabase.from("credit_transactions").insert({
        user_id: userId,
        amount: credits,
        type: transactionType,
        description: marker,
      });
      if (txError) throw txError;
      logStep("Credits granted", { userId, credits, idempotencyKey });
    };

    logStep("Processing event", { type: event.type, id: event.id });

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const metadata = session.metadata || {};
        const userId = metadata.user_id;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;

        if (session.mode === "subscription") {
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
          if (!subscriptionId || !userId) break;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const { planId } = planFromSubscription(subscription);
          if (!planId) throw new Error("Checkout completed for an unknown ClipMotion plan");

          const periodEnd = (subscription as unknown as Record<string, any>).current_period_end;
          const renewsAt = typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null;

          const { error } = await supabase.from("subscriptions").upsert({
            user_id: userId,
            plan_id: planId,
            status: "active",
            stripe_customer_id: customerId || null,
            stripe_subscription_id: subscriptionId,
            started_at: new Date().toISOString(),
            renews_at: renewsAt,
          }, { onConflict: "user_id" });
          if (error) throw error;
          // Monthly plan credits are granted only from invoice.paid below.
        } else if (session.mode === "payment" && userId) {
          const metadataCredits = metadata.credits ? Number(metadata.credits) : 0;
          let credits = Number.isFinite(metadataCredits) ? metadataCredits : 0;

          // Backwards compatibility for older Checkout sessions without metadata credits.
          if (!credits) {
            const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items.data.price"] });
            const priceId = fullSession.line_items?.data?.[0]?.price?.id;
            credits = priceId ? LEGACY_PRICE_TO_CREDITS[priceId] ?? 0 : 0;
          }

          if (credits > 0) {
            await grantCreditsOnce(
              userId,
              credits,
              "purchase",
              `Purchased ${credits} ClipMotion credits`,
              event.id,
            );
          }
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const billingReason = (invoice as unknown as Record<string, any>).billing_reason;
        if (billingReason !== "subscription_create" && billingReason !== "subscription_cycle") {
          logStep("Invoice paid without monthly credit refill", { billingReason });
          break;
        }

        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (!subscriptionId) break;
        const subscription = await stripe.subscriptions.retrieve(subscriptionId);
        const { planId } = planFromSubscription(subscription);
        if (!planId) break;

        let userId = subscription.metadata?.user_id || null;
        if (!userId) {
          const { data: dbSubscription } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_subscription_id", subscriptionId)
            .maybeSingle();
          userId = dbSubscription?.user_id || null;
        }
        if (!userId) throw new Error(`Could not resolve user for subscription ${subscriptionId}`);

        const credits = PLAN_CREDITS[planId];
        if (!credits) break;
        await grantCreditsOnce(
          userId,
          credits,
          "subscription_credit",
          `${planId} monthly allowance: ${credits} credits`,
          event.id,
        );
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { planId } = planFromSubscription(subscription);
        const status = subscription.status === "active"
          ? "active"
          : subscription.status === "past_due"
            ? "past_due"
            : subscription.status === "canceled"
              ? "canceled"
              : subscription.status;
        const periodEnd = (subscription as unknown as Record<string, any>).current_period_end;

        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan_id: planId || "starter",
            status,
            renews_at: typeof periodEnd === "number" ? new Date(periodEnd * 1000).toISOString() : null,
          })
          .eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { error } = await supabase
          .from("subscriptions")
          .update({ status: "canceled" })
          .eq("stripe_subscription_id", subscription.id);
        if (error) throw error;
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId = subscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          const { error } = await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("stripe_subscription_id", subscriptionId);
          if (error) throw error;
        }
        break;
      }

      default:
        break;
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message });
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
