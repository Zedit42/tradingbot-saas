"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { Bot, Zap, Shield, TrendingUp, BarChart3, CheckCircle, Copy, Users, Sparkles, ArrowRight, Play } from "lucide-react";

import { FallingPattern } from "@/components/ui/falling-pattern";
import { HeroSpline, FloatingSpline } from "@/components/landing/spline-scene";
import { Typewriter, GradientText, AnimatedCounter, FadeIn } from "@/components/landing/animated-text";
import { BentoGrid } from "@/components/landing/bento-grid";
import { Testimonials, LogoCloud } from "@/components/landing/testimonials";
import { CTAButton, PulseButton } from "@/components/landing/cta-button";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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

  const refCode = searchParams.get("ref");

  useEffect(() => {
    fetch("/api/waitlist")
      .then((res) => res.json())
      .then((data) => {
        if (data.total) {
          setStats({ total: data.total + 847, last24h: data.last24h });
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
        body: JSON.stringify({ email, referralCode: refCode || undefined, source: "landing" }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");

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

  if (status === "success") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md mx-auto"
      >
        <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 text-center backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
          >
            <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
          </motion.div>
          <h3 className="text-xl font-semibold mb-2">{message}</h3>
          {position && (
            <p className="text-gray-400 mb-4">
              You're <span className="text-green-400 font-bold">#{position}</span> in line
            </p>
          )}

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
              <Button onClick={copyReferralLink} variant="secondary" size="sm" className="shrink-0">
                {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">+10 priority for each friend who joins</p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <form onSubmit={handleSubmit} className="relative">
        <div className="flex gap-2 p-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex-1 bg-transparent px-4 py-2 text-white placeholder:text-gray-500 focus:outline-none"
          />
          <CTAButton size="md" variant="primary">
            {status === "loading" ? (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                className="h-5 w-5 border-2 border-black/30 border-t-black rounded-full"
              />
            ) : (
              "Join Waitlist"
            )}
          </CTAButton>
        </div>
      </form>

      {status === "error" && <p className="text-red-400 text-sm mt-2 text-center">{message}</p>}

      {refCode && (
        <p className="text-green-400/80 text-sm mt-2 flex items-center justify-center gap-1">
          <Users className="h-3 w-3" />
          You were referred! You'll get priority access.
        </p>
      )}

      <p className="text-gray-500 text-sm mt-3 text-center">
        Join {stats.total.toLocaleString()}+ traders on the waitlist
        {stats.last24h > 0 && <span> · {stats.last24h} joined today</span>}
      </p>
    </div>
  );
}

function WaitlistFormSkeleton() {
  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex gap-2 p-2 rounded-full bg-white/5 border border-white/10">
        <div className="flex-1 h-10 bg-gray-800/50 rounded-full animate-pulse" />
        <div className="w-32 h-10 bg-green-600/50 rounded-full animate-pulse" />
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Falling Pattern Background */}
      <div className="fixed inset-0 -z-10">
        <FallingPattern 
          color="#22c55e" 
          backgroundColor="#000000" 
          duration={120}
          blurIntensity="0.5em"
          density={1.5}
        />
      </div>

      {/* Navbar */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                <Bot className="h-6 w-6 text-black" />
              </div>
              <span className="text-xl font-bold">TradingBot Pro</span>
            </motion.div>

            <div className="hidden md:flex items-center gap-8">
              {["Features", "Bots", "Pricing", "Testimonials"].map((item, i) => (
                <motion.a
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="text-gray-400 hover:text-white transition-colors text-sm"
                >
                  {item}
                </motion.a>
              ))}
            </div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-3"
            >
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="#waitlist">
                <CTAButton size="sm">Get Early Access</CTAButton>
              </Link>
            </motion.div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="waitlist" className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <FadeIn delay={0.2}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-8"
            >
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Zap className="h-4 w-4" />
              </motion.div>
              Early Access — Limited Spots Available
            </motion.div>
          </FadeIn>

          <FadeIn delay={0.3}>
            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-bold mb-6 tracking-tight">
              <span className="text-white">Trade Smarter with</span>
              <br />
              <GradientText className="inline-block">
                <Typewriter words={["AI Bots", "Automation", "Alpha Signals", "Zero Effort"]} />
              </GradientText>
            </h1>
          </FadeIn>

          <FadeIn delay={0.4}>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
              Deploy battle-tested trading bots for Polymarket, Hyperliquid, and Solana.
              <br />
              <span className="text-white font-medium">Set it. Forget it. Profit.</span>
            </p>
          </FadeIn>

          <FadeIn delay={0.5}>
            <Suspense fallback={<WaitlistFormSkeleton />}>
              <WaitlistForm />
            </Suspense>
          </FadeIn>

          {/* Stats */}
          <FadeIn delay={0.6}>
            <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-20 pt-10 border-t border-white/10">
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-green-400">
                  $<AnimatedCounter value={2400000} suffix="" />+
                </div>
                <div className="text-gray-500 mt-1">Trading Volume</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-green-400">
                  <AnimatedCounter value={94} suffix="%" />
                </div>
                <div className="text-gray-500 mt-1">Win Rate</div>
              </div>
              <div>
                <div className="text-4xl sm:text-5xl font-bold text-green-400">24/7</div>
                <div className="text-gray-500 mt-1">Auto Trading</div>
              </div>
            </div>
          </FadeIn>

          {/* Scroll indicator */}
          <motion.div
            className="absolute bottom-10 left-1/2 -translate-x-1/2"
            animate={{ y: [0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <div className="w-6 h-10 rounded-full border-2 border-white/20 flex justify-center pt-2">
              <div className="w-1 h-2 bg-white/40 rounded-full" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Logo Cloud */}
      <section className="py-16 px-4 border-y border-white/5">
        <FadeIn>
          <p className="text-center text-gray-500 text-sm mb-8">INTEGRATED WITH THE BEST PLATFORMS</p>
          <LogoCloud />
        </FadeIn>
      </section>

      {/* Features Bento Grid */}
      <section id="features" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Everything You Need to <GradientText>Win</GradientText>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Powerful features designed for serious traders who want an edge
              </p>
            </div>
          </FadeIn>

          <BentoGrid />
        </div>
      </section>

      {/* Bots Section */}
      <section id="bots" className="py-24 px-4 bg-gradient-to-b from-transparent via-green-500/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Battle-Tested <GradientText>Trading Bots</GradientText>
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Each bot is designed for a specific market with proven strategies
              </p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                color: "purple",
                name: "Polymarket Auto",
                desc: "Prediction Market Trading",
                features: ["Temporal Arbitrage", "YES/NO Arbitrage", "Closing Soon Mispricing", "News Momentum"],
              },
              {
                icon: TrendingUp,
                color: "blue",
                name: "Hyperliquid Perps",
                desc: "Perpetual Futures Trading",
                features: ["Up to 50x Leverage", "EMA Trend Following", "Funding Rate Signals", "Auto SL/TP"],
              },
              {
                icon: Zap,
                color: "green",
                name: "Solana Memecoin",
                desc: "High-Speed Token Trading",
                features: ["Pump.fun Integration", "Dip Buy Automation", "LP Farming", "Instant Alerts"],
              },
            ].map((bot, i) => (
              <FadeIn key={bot.name} delay={i * 0.1}>
                <motion.div
                  whileHover={{ y: -8, transition: { duration: 0.2 } }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                  <Card className="relative bg-white/5 border-white/10 hover:border-green-500/50 transition-colors overflow-hidden">
                    <CardHeader>
                      <div
                        className={`h-14 w-14 rounded-2xl bg-${bot.color}-500/10 flex items-center justify-center mb-4`}
                      >
                        <bot.icon className={`h-7 w-7 text-${bot.color}-400`} />
                      </div>
                      <CardTitle className="text-xl">{bot.name}</CardTitle>
                      <CardDescription>{bot.desc}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3">
                        {bot.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Loved by <GradientText>Traders</GradientText>
              </h2>
              <p className="text-gray-400">See what our early users are saying</p>
            </div>
          </FadeIn>

          <Testimonials />
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <FadeIn>
            <div className="text-center mb-16">
              <h2 className="text-4xl sm:text-5xl font-bold mb-4">
                Simple <GradientText>Pricing</GradientText>
              </h2>
              <p className="text-gray-400">Start free, upgrade when you're ready</p>
            </div>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Free",
                price: "$0",
                desc: "Try before you buy",
                features: ["Paper Trading", "1 Bot", "Basic Analytics"],
                cta: "Join Waitlist",
                popular: false,
              },
              {
                name: "Pro",
                price: "$29",
                desc: "For serious traders",
                features: ["Live Trading", "All Bots", "1 Wallet", "Full Analytics", "Email Support"],
                cta: "Get Pro Access",
                popular: true,
              },
              {
                name: "Elite",
                price: "$99",
                desc: "Maximum power",
                features: ["Everything in Pro", "Unlimited Wallets", "Priority Signals", "Telegram Alerts", "1-on-1 Support"],
                cta: "Go Elite",
                popular: false,
              },
            ].map((plan, i) => (
              <FadeIn key={plan.name} delay={i * 0.1}>
                <motion.div whileHover={{ y: -4 }} className="relative">
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-black text-xs font-bold rounded-full">
                      Most Popular
                    </div>
                  )}
                  <Card
                    className={`bg-white/5 border-white/10 h-full ${plan.popular ? "border-green-500/50 shadow-lg shadow-green-500/10" : ""}`}
                  >
                    <CardHeader>
                      <CardTitle>{plan.name}</CardTitle>
                      <CardDescription>{plan.desc}</CardDescription>
                      <div className="text-4xl font-bold mt-4">
                        {plan.price}
                        {plan.price !== "$0" && <span className="text-lg text-gray-400">/mo</span>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature) => (
                          <li key={feature} className="flex items-center gap-2 text-sm text-gray-400">
                            <CheckCircle className="h-4 w-4 text-green-400 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                      <Link href="#waitlist" className="block">
                        <CTAButton
                          variant={plan.popular ? "primary" : "secondary"}
                          size="md"
                          className="w-full justify-center"
                        >
                          {plan.cta}
                        </CTAButton>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <FadeIn>
            <h2 className="text-4xl sm:text-6xl font-bold mb-6">
              Ready to <GradientText>Automate</GradientText> Your Trading?
            </h2>
            <p className="text-xl text-gray-400 mb-10">
              Join thousands of traders already on the waitlist
            </p>
            <PulseButton href="#waitlist">Get Early Access Now</PulseButton>
          </FadeIn>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
              <Bot className="h-5 w-5 text-black" />
            </div>
            <span className="font-semibold">TradingBot Pro</span>
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <Link href="#" className="hover:text-white transition">Terms</Link>
            <Link href="#" className="hover:text-white transition">Privacy</Link>
            <Link href="#" className="hover:text-white transition">Contact</Link>
          </div>
          <div className="text-gray-500 text-sm">© 2026 TradingBot Pro. Not financial advice.</div>
        </div>
      </footer>
    </div>
  );
}
