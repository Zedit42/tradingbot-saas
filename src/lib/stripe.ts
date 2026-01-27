import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-01-27.acacia",
  typescript: true,
});

// Price IDs - Create these in Stripe Dashboard
export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    priceId: null,
    features: ["Paper Trading", "1 Bot", "Basic Analytics"],
  },
  pro: {
    name: "Pro",
    price: 29,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    features: ["Live Trading", "All Bots", "1 Wallet", "Full Analytics", "Email Support"],
  },
  elite: {
    name: "Elite",
    price: 99,
    priceId: process.env.STRIPE_ELITE_PRICE_ID,
    features: ["Everything in Pro", "Unlimited Wallets", "Priority Signals", "Telegram Alerts", "1-on-1 Support"],
  },
} as const;

export type PlanType = keyof typeof PLANS;

export async function createCheckoutSession(
  userId: string,
  email: string,
  plan: "pro" | "elite"
) {
  const priceId = PLANS[plan].priceId;
  
  if (!priceId) {
    throw new Error("Price ID not configured");
  }

  const session = await stripe.checkout.sessions.create({
    customer_email: email,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${process.env.AUTH_URL}/dashboard?success=true`,
    cancel_url: `${process.env.AUTH_URL}/dashboard?canceled=true`,
    metadata: {
      userId,
      plan,
    },
  });

  return session;
}

export async function createPortalSession(customerId: string) {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${process.env.AUTH_URL}/dashboard/settings`,
  });

  return session;
}
