import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/nowpayments";

interface IPNPayload {
  payment_id: number;
  payment_status: string;
  pay_address: string;
  price_amount: number;
  price_currency: string;
  pay_amount: number;
  pay_currency: string;
  order_id: string;
  order_description: string;
  purchase_id: string;
  outcome_amount: number;
  outcome_currency: string;
}

export async function POST(req: Request) {
  try {
    const body = await req.text();
    const headersList = await headers();
    const signature = headersList.get("x-nowpayments-sig");

    // Verify signature in production
    if (process.env.NODE_ENV === "production" && signature) {
      if (!verifyWebhookSignature(body, signature)) {
        console.error("Invalid webhook signature");
        return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
      }
    }

    const payload: IPNPayload = JSON.parse(body);
    
    console.log("📦 Crypto payment webhook:", {
      paymentId: payload.payment_id,
      status: payload.payment_status,
      orderId: payload.order_id,
      amount: `${payload.pay_amount} ${payload.pay_currency}`,
    });

    // Payment statuses: waiting, confirming, confirmed, sending, partially_paid, finished, failed, refunded, expired
    if (payload.payment_status === "finished" || payload.payment_status === "confirmed") {
      // Parse order_id: userId_plan_timestamp
      const [userId, plan] = payload.order_id.split("_");

      if (userId && (plan === "pro" || plan === "elite")) {
        // Update user's plan
        await prisma.user.update({
          where: { id: userId },
          data: {
            plan,
            // Store payment info for reference
            stripeCustomerId: `nowpay_${payload.payment_id}`, // Reusing field for crypto payment ID
          },
        });

        console.log(`✅ User ${userId} upgraded to ${plan} via crypto payment`);
      }
    } else if (payload.payment_status === "failed" || payload.payment_status === "expired") {
      console.log(`❌ Payment ${payload.payment_id} ${payload.payment_status}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Crypto webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
