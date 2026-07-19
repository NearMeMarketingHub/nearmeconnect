import Stripe from "stripe";

let stripeInstance: Stripe | null = null;

export function getStripe(): Stripe | null {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }
  
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    });
  }
  
  return stripeInstance;
}

export function isStripeConfigured(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

// ── One-time credit purchase ─────────────────────────────────────────────────

export interface CreateCheckoutSessionParams {
  companyId: string;
  companyName: string;
  userId: string;
  creditAmount: number;
  price: number;
  packageName: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createCheckoutSession(params: CreateCheckoutSessionParams): Promise<Stripe.Checkout.Session | null> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: params.packageName,
            description: `${params.creditAmount} credits for ${params.companyName}`,
          },
          unit_amount: Math.round(params.price * 100),
        },
        quantity: 1,
      },
    ],
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      companyId: params.companyId,
      userId: params.userId,
      creditAmount: params.creditAmount.toString(),
    },
    client_reference_id: params.companyId,
  });

  return session;
}

// ── SaaS subscription checkout ───────────────────────────────────────────────

const PLAN_DETAILS: Record<string, { name: string; price: number }> = {
  starter: { name: "Near Me Connect – Starter", price: 6900 },
  growth:  { name: "Near Me Connect – Growth",  price: 8900 },
  pro:     { name: "Near Me Connect – Pro",      price: 9900 },
};

export interface CreateSubscriptionCheckoutParams {
  pendingSignupId: string;
  saasTier: "starter" | "growth" | "pro";
  email: string;
  companyName: string;
  successUrl: string;
  cancelUrl: string;
}

export async function createSubscriptionCheckoutSession(
  params: CreateSubscriptionCheckoutParams
): Promise<Stripe.Checkout.Session> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  const plan = PLAN_DETAILS[params.saasTier];
  if (!plan) throw new Error(`Unknown plan: ${params.saasTier}`);

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: plan.name,
            description: `${params.companyName} – monthly subscription`,
          },
          unit_amount: plan.price,
          recurring: { interval: "month" },
        },
        quantity: 1,
      },
    ],
    mode: "subscription",
    customer_email: params.email,
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      signupType: "saas_subscription",
      pendingSignupId: params.pendingSignupId,
      saasTier: params.saasTier,
    },
  });

  return session;
}

// ── Stripe Billing Portal ────────────────────────────────────────────────────

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
): Promise<Stripe.BillingPortal.Session> {
  const stripe = getStripe();
  if (!stripe) throw new Error("Stripe is not configured");

  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
}

// ── Webhook event construction ───────────────────────────────────────────────

export async function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured");
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    throw new Error("Stripe webhook secret is not configured");
  }

  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}
