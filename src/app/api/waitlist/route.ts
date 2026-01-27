import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const waitlistSchema = z.object({
  email: z.string().email("Invalid email address"),
  referralCode: z.string().optional(),
  source: z.string().optional(),
});

// Rate limiting map (in-memory, resets on restart)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 3; // requests per window
const RATE_WINDOW = 60 * 60 * 1000; // 1 hour

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_WINDOW });
    return false;
  }
  
  if (record.count >= RATE_LIMIT) {
    return true;
  }
  
  record.count++;
  return false;
}

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || 
               request.headers.get("x-real-ip") || 
               "unknown";
    
    // Check rate limit
    if (isRateLimited(ip)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }
    
    const body = await request.json();
    const result = waitlistSchema.safeParse(body);
    
    if (!result.success) {
      return NextResponse.json(
        { error: result.error.issues[0].message },
        { status: 400 }
      );
    }
    
    const { email, referralCode, source } = result.data;
    const userAgent = request.headers.get("user-agent") || undefined;
    
    // Check if email already exists
    const existing = await prisma.waitlist.findUnique({
      where: { email },
    });
    
    if (existing) {
      // Return their referral code instead of error (better UX)
      return NextResponse.json({
        success: true,
        message: "You're already on the list!",
        referralCode: existing.referralCode,
        position: await getPosition(existing.id),
        alreadyJoined: true,
      });
    }
    
    // Handle referral bonus
    let priority = 0;
    if (referralCode) {
      const referrer = await prisma.waitlist.findUnique({
        where: { referralCode },
      });
      
      if (referrer) {
        // Boost referrer's priority
        await prisma.waitlist.update({
          where: { id: referrer.id },
          data: { 
            referralCount: { increment: 1 },
            priority: { increment: 10 },
          },
        });
        // New user gets small boost for being referred
        priority = 5;
      }
    }
    
    // Create waitlist entry
    const entry = await prisma.waitlist.create({
      data: {
        email,
        referredBy: referralCode || undefined,
        priority,
        source: source || "landing",
        ipAddress: ip !== "unknown" ? ip : undefined,
        userAgent,
      },
    });
    
    // Get position
    const position = await getPosition(entry.id);
    
    return NextResponse.json({
      success: true,
      message: "You're on the list!",
      referralCode: entry.referralCode,
      position,
    });
    
  } catch (error) {
    console.error("Waitlist error:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}

// Get position in waitlist (considering priority)
async function getPosition(entryId: string): Promise<number> {
  const entry = await prisma.waitlist.findUnique({
    where: { id: entryId },
  });
  
  if (!entry) return 0;
  
  // Count people ahead (higher priority OR same priority but earlier)
  const ahead = await prisma.waitlist.count({
    where: {
      status: "waiting",
      OR: [
        { priority: { gt: entry.priority } },
        {
          priority: entry.priority,
          createdAt: { lt: entry.createdAt },
        },
      ],
    },
  });
  
  return ahead + 1;
}

// GET - Get waitlist stats (public)
export async function GET() {
  const total = await prisma.waitlist.count();
  const recent = await prisma.waitlist.count({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
  });
  
  return NextResponse.json({
    total,
    last24h: recent,
  });
}
