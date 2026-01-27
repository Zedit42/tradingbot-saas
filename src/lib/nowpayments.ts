/**
 * NOWPayments Integration
 * Docs: https://documenter.getpostman.com/view/7907941/2s93JusNJt
 * 
 * Supports 200+ cryptocurrencies across all major chains:
 * - EVM: ETH, USDC, USDT, MATIC, ARB, OP, etc.
 * - Solana: SOL, USDC
 * - Bitcoin, Litecoin, Dogecoin
 * - BNB Chain, Avalanche, etc.
 */

const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";

export const PLANS = {
  free: {
    name: "Free",
    priceUSD: 0,
  },
  pro: {
    name: "Pro",
    priceUSD: 29,
  },
  elite: {
    name: "Elite", 
    priceUSD: 99,
  },
} as const;

export type PlanType = keyof typeof PLANS;

// Preferred payment currencies (user can choose)
export const SUPPORTED_CURRENCIES = [
  { id: "eth", name: "Ethereum", chain: "EVM" },
  { id: "usdcerc20", name: "USDC (Ethereum)", chain: "EVM" },
  { id: "usdttrc20", name: "USDT (Tron)", chain: "Tron" },
  { id: "usdtbsc", name: "USDT (BSC)", chain: "BNB" },
  { id: "matic", name: "Polygon", chain: "Polygon" },
  { id: "sol", name: "Solana", chain: "Solana" },
  { id: "btc", name: "Bitcoin", chain: "Bitcoin" },
  { id: "ltc", name: "Litecoin", chain: "Litecoin" },
  { id: "bnbbsc", name: "BNB", chain: "BNB" },
  { id: "arb", name: "Arbitrum ETH", chain: "Arbitrum" },
];

interface CreatePaymentParams {
  priceAmount: number;
  payCurrency: string;
  orderId: string;
  orderDescription: string;
  successUrl?: string;
  cancelUrl?: string;
}

interface PaymentResponse {
  payment_id: string;
  payment_status: string;
  pay_address: string;
  pay_amount: number;
  pay_currency: string;
  price_amount: number;
  price_currency: string;
  order_id: string;
  order_description: string;
  created_at: string;
  expiration_estimate_date: string;
}

interface InvoiceResponse {
  id: string;
  invoice_url: string;
  order_id: string;
  order_description: string;
  price_amount: number;
  price_currency: string;
  created_at: string;
}

async function nowpaymentsRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = process.env.NOWPAYMENTS_API_KEY;
  
  if (!apiKey) {
    throw new Error("NOWPAYMENTS_API_KEY not configured");
  }

  const res = await fetch(`${NOWPAYMENTS_API}${endpoint}`, {
    ...options,
    headers: {
      "x-api-key": apiKey,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`NOWPayments error: ${error}`);
  }

  return res.json();
}

/**
 * Get minimum payment amount for a currency
 */
export async function getMinimumAmount(currency: string): Promise<number> {
  const data = await nowpaymentsRequest<{ min_amount: number }>(
    `/min-amount?currency_from=${currency}&currency_to=usd`
  );
  return data.min_amount;
}

/**
 * Get estimated price in crypto for USD amount
 */
export async function getEstimatedPrice(
  amountUSD: number,
  currency: string
): Promise<number> {
  const data = await nowpaymentsRequest<{ estimated_amount: number }>(
    `/estimate?amount=${amountUSD}&currency_from=usd&currency_to=${currency}`
  );
  return data.estimated_amount;
}

/**
 * Create a payment (direct wallet address)
 */
export async function createPayment(
  params: CreatePaymentParams
): Promise<PaymentResponse> {
  return nowpaymentsRequest<PaymentResponse>("/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: params.priceAmount,
      price_currency: "usd",
      pay_currency: params.payCurrency,
      order_id: params.orderId,
      order_description: params.orderDescription,
      ipn_callback_url: `${process.env.AUTH_URL}/api/crypto/webhook`,
    }),
  });
}

/**
 * Create an invoice (hosted checkout page - easier for users)
 */
export async function createInvoice(
  userId: string,
  plan: "pro" | "elite"
): Promise<InvoiceResponse> {
  const priceUSD = PLANS[plan].priceUSD;
  
  return nowpaymentsRequest<InvoiceResponse>("/invoice", {
    method: "POST",
    body: JSON.stringify({
      price_amount: priceUSD,
      price_currency: "usd",
      order_id: `${userId}_${plan}_${Date.now()}`,
      order_description: `TradingBot Pro - ${PLANS[plan].name} Plan (1 month)`,
      ipn_callback_url: `${process.env.AUTH_URL}/api/crypto/webhook`,
      success_url: `${process.env.AUTH_URL}/dashboard?success=true`,
      cancel_url: `${process.env.AUTH_URL}/dashboard?canceled=true`,
    }),
  });
}

/**
 * Get payment status
 */
export async function getPaymentStatus(
  paymentId: string
): Promise<PaymentResponse> {
  return nowpaymentsRequest<PaymentResponse>(`/payment/${paymentId}`);
}

/**
 * Verify IPN (webhook) signature
 */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const crypto = require("crypto");
  const ipnSecret = process.env.NOWPAYMENTS_IPN_SECRET;
  
  if (!ipnSecret) return false;
  
  const hmac = crypto
    .createHmac("sha512", ipnSecret)
    .update(JSON.stringify(JSON.parse(payload), Object.keys(JSON.parse(payload)).sort()))
    .digest("hex");
    
  return hmac === signature;
}
