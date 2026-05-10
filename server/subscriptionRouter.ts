/**
 * Subscription router — Stripe checkout, webhook, and status endpoints.
 */
import Stripe from "stripe";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { getDb } from "./db";
import { subscriptions } from "../drizzle/schema";
import { PLANS, type PlanSlug } from "./products";
import type { Request, Response } from "express";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "", {
  apiVersion: "2026-04-22.dahlia",
});

export const subscriptionRouter = router({
  /** Get current user's subscription (or null if none) */
  mySubscription: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return null;
    const rows = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.userId, ctx.user.id))
      .limit(1);
    return rows[0] ?? null;
  }),

  /** Create a Stripe Checkout session for a given plan */
  createCheckout: protectedProcedure
    .input(z.object({ plan: z.enum(["starter", "pro", "enterprise"]), origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const plan = PLANS.find((p) => p.slug === input.plan);
      if (!plan) throw new Error("Unknown plan");

      // Look up or create Stripe price by lookup key
      const prices = await stripe.prices.list({
        lookup_keys: [plan.stripePriceLookupKey],
        expand: ["data.product"],
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        // Auto-create product + price in Stripe if not yet created
        const product = await stripe.products.create({
          name: `Drywall Estimator — ${plan.name}`,
          metadata: { plan: plan.slug },
        });
        const price = await stripe.prices.create({
          product: product.id,
          unit_amount: plan.priceMonthlyCAD * 100,
          currency: "cad",
          recurring: { interval: "month" },
          lookup_key: plan.stripePriceLookupKey,
          transfer_lookup_key: true,
        });
        priceId = price.id;
      }

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        customer_email: ctx.user.email ?? undefined,
        allow_promotion_codes: true,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          customer_email: ctx.user.email ?? "",
          customer_name: ctx.user.name ?? "",
          plan: plan.slug,
        },
        success_url: `${input.origin}/app?subscribed=1`,
        cancel_url: `${input.origin}/#pricing`,
      });

      return { url: session.url };
    }),

  /** Create a Stripe billing portal session for managing subscription */
  createPortal: protectedProcedure
    .input(z.object({ origin: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database unavailable");
      const rows = await db
        .select()
        .from(subscriptions)
        .where(eq(subscriptions.userId, ctx.user.id))
        .limit(1);
      const sub = rows[0];
      if (!sub?.stripeCustomerId) throw new Error("No active subscription found");

      const session = await stripe.billingPortal.sessions.create({
        customer: sub.stripeCustomerId,
        return_url: `${input.origin}/app`,
      });
      return { url: session.url };
    }),
});

/** Express webhook handler — registered in server/_core/index.ts */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ?? "";

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(req.body as Buffer, sig ?? "", webhookSecret);
  } catch (err) {
    console.error("[Webhook] signature verification failed:", err);
    res.status(400).send("Webhook signature verification failed");
    return;
  }

  // Test event passthrough
  if (event.id.startsWith("evt_test_")) {
    console.log("[Webhook] Test event detected, returning verification response");
    res.json({ verified: true });
    return;
  }

  const db = await getDb();
  if (!db) {
    res.status(500).send("Database unavailable");
    return;
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = parseInt(session.metadata?.user_id ?? "0", 10);
        const plan = (session.metadata?.plan ?? "starter") as PlanSlug;
        if (!userId) break;

        // Retrieve subscription from Stripe
        const stripeSub = await stripe.subscriptions.retrieve(
          session.subscription as string
        );

        await db
          .insert(subscriptions)
          .values({
            userId,
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: stripeSub.id,
            plan,
            status: stripeSub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
            currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
          })
          .onDuplicateKeyUpdate({
            set: {
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: stripeSub.id,
              plan,
              status: stripeSub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
              currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
            },
          });
          console.log(`[Webhook] checkout.session.completed for user ${userId} plan ${plan}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        if (subId) {
          await db
            .update(subscriptions)
            .set({ status: "past_due" })
            .where(eq(subscriptions.stripeSubscriptionId, subId));
          console.log(`[Webhook] invoice.payment_failed → set past_due for sub ${subId}`);
        }
        break;
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = (invoice as any).subscription as string | null;
        if (subId) {
          // Retrieve fresh subscription to get accurate status + period
          const stripeSub = await stripe.subscriptions.retrieve(subId);
          await db
            .update(subscriptions)
            .set({
              status: stripeSub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
              currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
            })
            .where(eq(subscriptions.stripeSubscriptionId, subId));
          console.log(`[Webhook] invoice.paid → ${stripeSub.status} for sub ${subId}`);
        }
        break;
      }

      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const stripeSub = event.data.object as Stripe.Subscription;
        const rows = await db
          .select()
          .from(subscriptions)
          .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id))
          .limit(1);
        if (rows[0]) {
          await db
            .update(subscriptions)
            .set({
              status: stripeSub.status as "active" | "trialing" | "past_due" | "canceled" | "incomplete",
              currentPeriodEnd: new Date((stripeSub as any).current_period_end * 1000),
            })
            .where(eq(subscriptions.stripeSubscriptionId, stripeSub.id));
          console.log(`[Webhook] subscription ${stripeSub.id} → ${stripeSub.status}`);
        }
        break;
      }

      default:
        console.log(`[Webhook] unhandled event type: ${event.type}`);
    }
  } catch (err) {
    console.error("[Webhook] processing error:", err);
    res.status(500).send("Webhook processing error");
    return;
  }

  res.json({ received: true });
}
