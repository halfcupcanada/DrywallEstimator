/**
 * Subscription plan definitions.
 * Prices are in CAD cents (Stripe uses smallest currency unit).
 * Create matching products/prices in the Stripe dashboard and paste the price IDs here.
 * For now we use lookup_key so the IDs can be set in Stripe without code changes.
 */

export type PlanSlug = "starter" | "pro" | "enterprise";

export interface Plan {
  slug: PlanSlug;
  name: string;
  tagline: string;
  priceMonthlyCAD: number; // display price in dollars
  stripePriceLookupKey: string; // set this in Stripe Price metadata
  features: string[];
  highlighted?: boolean;
}

export const PLANS: Plan[] = [
  {
    slug: "starter",
    name: "Starter",
    tagline: "Perfect for solo estimators",
    priceMonthlyCAD: 29,
    stripePriceLookupKey: "drywall_starter_monthly",
    features: [
      "1 user seat",
      "Unlimited projects",
      "Wall & room drawing",
      "Real-time material estimate",
      "Door/window deductions",
      "Email support",
    ],
  },
  {
    slug: "pro",
    name: "Pro",
    tagline: "For growing drywall crews",
    priceMonthlyCAD: 79,
    stripePriceLookupKey: "drywall_pro_monthly",
    highlighted: true,
    features: [
      "Up to 5 user seats",
      "Everything in Starter",
      "PDF estimate export",
      "Floor plan image overlay",
      "Scale calibration tool",
      "Priority support",
    ],
  },
  {
    slug: "enterprise",
    name: "Enterprise",
    tagline: "For large drywall companies",
    priceMonthlyCAD: 199,
    stripePriceLookupKey: "drywall_enterprise_monthly",
    features: [
      "Unlimited user seats",
      "Everything in Pro",
      "Custom branding",
      "Dedicated account manager",
      "API access",
      "SLA guarantee",
    ],
  },
];

export const getPlan = (slug: PlanSlug): Plan =>
  PLANS.find((p) => p.slug === slug) ?? PLANS[0];
