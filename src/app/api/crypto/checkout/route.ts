import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createInvoice } from "@/lib/nowpayments";

export async function POST(req: Request) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { plan } = await req.json();

    if (plan !== "pro" && plan !== "elite") {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Create NOWPayments invoice (hosted checkout)
    const invoice = await createInvoice(session.user.id, plan);

    return NextResponse.json({ 
      url: invoice.invoice_url,
      invoiceId: invoice.id,
    });
  } catch (error) {
    console.error("Crypto checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    );
  }
}
