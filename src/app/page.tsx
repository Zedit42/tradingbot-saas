"use client";

import Link from "next/link";
// import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Zap, Shield, TrendingUp, Wallet, BarChart3 } from "lucide-react";

// Simple animated background (3D scene disabled temporarily)
const HeroBackground = () => (
  <div className="absolute inset-0 overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-green-500/10 via-transparent to-transparent" />
    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
    <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
  </div>
);

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
            <div className="flex items-center gap-4">
              <Link href="#features" className="text-gray-400 hover:text-white transition">
                Features
              </Link>
              <Link href="#pricing" className="text-gray-400 hover:text-white transition">
                Pricing
              </Link>
              <Link href="/login">
                <Button variant="ghost">Login</Button>
              </Link>
              <Link href="/register">
                <Button variant="primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero with 3D Scene */}
      <section className="relative pt-32 pb-20 px-4 min-h-screen flex items-center">
        {/* Animated Background */}
        <HeroBackground />
        
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 text-sm mb-8">
            <Zap className="h-4 w-4" />
            Now with Temporal Arbitrage - 98% Win Rate
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
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button variant="primary" size="lg">
                Start Trading Free
              </Button>
            </Link>
            <Link href="#demo">
              <Button variant="outline" size="lg">
                Watch Demo
              </Button>
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 max-w-3xl mx-auto mt-16 pt-16 border-t border-gray-800">
            <div>
              <div className="text-4xl font-bold text-green-400">$2.4M+</div>
              <div className="text-gray-500">Trading Volume</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400">847</div>
              <div className="text-gray-500">Active Traders</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400">98%</div>
              <div className="text-gray-500">Arbitrage Win Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* Bots Section */}
      <section id="features" className="py-20 px-4 bg-gray-900/50">
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

      {/* How it Works */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Start Trading in 3 Steps
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Wallet className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Connect Wallet</h3>
              <p className="text-gray-400">Link your EVM or Solana wallet securely</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <Bot className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Choose Bot</h3>
              <p className="text-gray-400">Select a bot and configure your strategy</p>
            </div>
            <div className="text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="h-8 w-8 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Watch Profits</h3>
              <p className="text-gray-400">Bot trades 24/7 while you sleep</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4 bg-gray-900/50">
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
                <Link href="/register" className="block">
                  <Button variant="secondary" className="w-full">Get Started</Button>
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
                <Link href="/register" className="block">
                  <Button variant="primary" className="w-full">Start Pro Trial</Button>
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
                <Link href="/register" className="block">
                  <Button variant="secondary" className="w-full">Contact Sales</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to Automate Your Trading?
          </h2>
          <p className="text-gray-400 mb-8">
            Join 847+ traders already using our bots
          </p>
          <Link href="/register">
            <Button variant="primary" size="lg">
              Get Started Free
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
          <div className="text-gray-500 text-sm">
            © 2026 TradingBot Pro. Not financial advice.
          </div>
        </div>
      </footer>
    </div>
  );
}
