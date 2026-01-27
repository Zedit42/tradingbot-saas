import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const bots = await prisma.bot.findMany({
    where: { userId: session.user.id },
    include: { wallet: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(bots);
}

export async function POST(req: Request) {
  const session = await auth();
  
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { walletId, type, name, config } = await req.json();

    // Verify wallet belongs to user
    const wallet = await prisma.wallet.findFirst({
      where: { id: walletId, userId: session.user.id },
    });

    if (!wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    const bot = await prisma.bot.create({
      data: {
        userId: session.user.id,
        walletId,
        type,
        name,
        config: JSON.stringify(config || {}),
      },
    });

    return NextResponse.json(bot);
  } catch (error) {
    console.error("Bot creation error:", error);
    return NextResponse.json({ error: "Failed to create bot" }, { status: 500 });
  }
}
