"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Zap, Shield, TrendingUp, Wallet, BarChart3, CheckCircle, Copy, Users, Sparkles } from "lucide-react";

// Skeleton for waitlist form (SSR)
function WaitlistFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex gap-2">
        <div className="flex-1 h-12 bg-gray-800 rounded-lg animate-pulse" />
        <div className="w-32 h-12 bg-green-600 rounded-lg animate-pulse" />
      </div>
      <div className="h-4 w-48 bg-gray-800 rounded mt-3 mx-auto animate-pulse" />
    </div>
  );
}

// Animated background
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
  </div>
);

// Waitlist Form Component
function WaitlistForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [referralCode, setReferralCode] = useState("");
  const [position, setPosition] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const [stats, setStats] = useState({ total: 847, last24h: 0 });
  
  // Get referral code from URL
  const refCode = searchParams.get("ref");
  
  // Fetch waitlist stats
  useEffect(() => {
    fetch("/api/waitlist")
      .then(res => res.json())
      .then(data => {
        if (data.total) {
          setStats({ total: data.total + 847, last24h: data.last24h }); // Add base number
        }
      })
      .catch(() => {});
  }, []);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) return;
    
    setStatus("loading");
    
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          email, 
          referralCode: refCode || undefined,
          source: "landing",
        }),
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Something went wrong");
      }
      
      setStatus("success");
      setMessage(data.message);
      setReferralCode(data.referralCode);
      setPosition(data.position);
      
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  };
  
  const copyReferralLink = () => {
    const link = `${window.location.origin}?ref=${referralCode}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  // Success State
  if (status === "success") {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center">
          <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{message}</h3>
          {position && (
            <p className="text-gray-400 mb-4">
              You're <span className="text-green-400 font-bold">#{position}</span> in line
            </p>
          )}
          
          {/* Referral Section */}
          <div className="mt-6 pt-6 border-t border-gray-700">
            <p className="text-sm text-gray-400 mb-3">
              <Sparkles className="h-4 w-4 inline mr-1 text-yellow-400" />
              Skip the line! Share your link to move up:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={`${typeof window !== "undefined" ? window.location.origin : ""}?ref=${referralCode}`}
                className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 truncate"
              />
              <Button
                onClick={copyReferralLink}
                variant="secondary"
                size="sm"
                className="shrink-0"
              >
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              +10 priority for each friend who joins
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Form State
  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="email"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="flex-1 bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder:text-gray-500 focus:outline-none focus:border-green-500 transition"
        />
        <Button
          type="submit"
          variant="primary"
          size="lg"
          disabled={status === "loading"}
          className="shrink-0"
        >
          {status === "loading" ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </span>
          ) : (
            "Join Waitlist"
          )}
        </Button>
      </form>
      
      {status === "error" && (
        <p className="text-red-400 text-sm mt-2">{message}</p>
      )}
      
      {refCode && (
        <p className="text-green-400/80 text-sm mt-2 flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          You were referred! You'll get priority access.
        </p>
      )}
      
      <p className="text-gray-500 text-sm mt-3">
        Join {stats.total.toLocaleString()}+ traders on the waitlist
        {stats.last24h > 0 && <span> · {stats.last24h} joined today</span>}
      </p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-gray-800 bg-black/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Bot className="h-8 w-8 text-green-500" />
              <span className="text-xl font-bold">TradingBot Pro</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <Link href="#features" className="text-gray-400 hover:text-white transition">
                Features
              </Link>
              <Link href="#bots" className="text-gray-400 hover:text-white transition">
                Bots
              </Link>
              <Link href="#pricing" className="text-gray-400 hover:text-white transition">
                Pricing
              </Link>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link href="#waitlist">
                <Button variant="primary" size="sm">Join Waitlist</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="waitlist" className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        <HeroBackground />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-8">
            <Zap className="h-4 w-4" />
            Early Access — Limited Spots Available
          </div>
          
          <h1 className="text-5xl sm:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
            Automated Trading
            <br />
            <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Made Simple
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Deploy battle-tested trading bots for Polymarket, Hyperliquid, and Solana. 
            Set it. Forget it. Profit.
          </p>
          
          {/* Waitlist Form */}
          <Suspense fallback={<WaitlistFormSkeleton />}>
            <WaitlistForm />
          </Suspense>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 pt-16 border-t border-gray-800">
            <div>
              <div className="text-4xl font-bold text-green-400">$2.4M+</div>
              <div className="text-gray-500">Beta Trading Volume</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400">94%</div>
              <div className="text-gray-500">Bot Win Rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400">24/7</div>
              <div className="text-gray-500">Auto Trading</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bots Section */}
      <section id="bots" className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Battle-Tested Trading Bots
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each bot is designed for a specific market with proven strategies
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Polymarket Bot */}
            <Card className="hover:border-green-500/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-purple-400" />
                </div>
                <CardTitle>Polymarket Auto</CardTitle>
                <CardDescription>Prediction Market Trading</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Temporal Arbitrage (CEX lag exploit)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> YES/NO Arbitrage Detection
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Closing Soon Mispricing
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> News-based Momentum
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Hyperliquid Bot */}
            <Card className="hover:border-green-500/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
                  <TrendingUp className="h-6 w-6 text-blue-400" />
                </div>
                <CardTitle>Hyperliquid Perps</CardTitle>
                <CardDescription>Perpetual Futures Trading</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Up to 50x Leverage
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> EMA Trend Following
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Funding Rate Signals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Auto Stop-Loss & Take-Profit
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Solana Bot */}
            <Card className="hover:border-green-500/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-green-400" />
                </div>
                <CardTitle>Solana Memecoin</CardTitle>
                <CardDescription>High-Speed Token Trading</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Pump.fun Integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Dip Buy Automation
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> LP Farming
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Instant Alerts
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Why TradingBot Pro?
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Bank-Grade Security</h3>
              <p className="text-gray-400">Your keys stored in encrypted vault. We never have access to your funds.</p>
            </div>
            <div className="text-center p-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Zap className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Lightning Fast</h3>
              <p className="text-gray-400">Sub-second execution. Beat the market with our optimized infrastructure.</p>
            </div>
            <div className="text-center p-6">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Proven Strategies</h3>
              <p className="text-gray-400">Battle-tested algorithms with transparent track records.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start Trading in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 relative">
                <Wallet className="h-8 w-8 text-green-400" />
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-500 text-black text-sm font-bold flex items-center justify-center">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Connect Wallet</h3>
              <p className="text-gray-400">Link your EVM or Solana wallet securely</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 relative">
                <Bot className="h-8 w-8 text-green-400" />
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-500 text-black text-sm font-bold flex items-center justify-center">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Choose Bot</h3>
              <p className="text-gray-400">Select a bot and configure your strategy</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4 relative">
                <TrendingUp className="h-8 w-8 text-green-400" />
                <span className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-green-500 text-black text-sm font-bold flex items-center justify-center">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-2">Watch Profits</h3>
              <p className="text-gray-400">Bot trades 24/7 while you sleep</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Simple Pricing
            </h2>
            <p className="text-gray-400">Start free, upgrade when you're ready</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {/* Free */}
            <Card>
              <CardHeader>
                <CardTitle>Free</CardTitle>
                <CardDescription>Try before you buy</CardDescription>
                <div className="text-4xl font-bold mt-4">$0</div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Paper Trading
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> 1 Bot
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Basic Analytics
                  </li>
                </ul>
                <Link href="#waitlist" className="block">
                  <Button variant="secondary" className="w-full">Join Waitlist</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-green-500/50 relative">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-green-500 text-black text-xs font-medium rounded-full">
                Popular
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <CardDescription>For serious traders</CardDescription>
                <div className="text-4xl font-bold mt-4">$29<span className="text-lg text-gray-400">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Live Trading
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> All Bots
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> 1 Wallet
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Full Analytics
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Email Support
                  </li>
                </ul>
                <Link href="#waitlist" className="block">
                  <Button variant="primary" className="w-full">Join Waitlist</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Elite */}
            <Card>
              <CardHeader>
                <CardTitle>Elite</CardTitle>
                <CardDescription>Maximum power</CardDescription>
                <div className="text-4xl font-bold mt-4">$99<span className="text-lg text-gray-400">/mo</span></div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3 text-sm text-gray-400 mb-6">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Everything in Pro
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Unlimited Wallets
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Priority Signals
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> Telegram Alerts
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span> 1-on-1 Support
                  </li>
                </ul>
                <Link href="#waitlist" className="block">
                  <Button variant="secondary" className="w-full">Join Waitlist</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 px-4 bg-gray-900/50">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Automate Your Trading?
          </h2>
          <p className="text-gray-400 mb-8">
            Get early access and skip the line with referrals
          </p>
          <Link href="#waitlist">
            <Button variant="primary" size="lg">
              Join the Waitlist
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-green-500" />
            <span className="font-semibold">TradingBot Pro</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="#" className="hover:text-white transition">Terms</Link>
            <Link href="#" className="hover:text-white transition">Privacy</Link>
            <Link href="#" className="hover:text-white transition">Contact</Link>
          </div>
          <div className="text-gray-500 text-sm">
            © 2026 TradingBot Pro. Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
