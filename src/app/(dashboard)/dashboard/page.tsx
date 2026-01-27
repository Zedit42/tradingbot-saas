import { auth } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bot, TrendingUp, Wallet, DollarSign, ArrowUpRight, ArrowDownRight, Play, Pause } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, {session?.user?.name?.split(" ")[0] || "Trader"}
        </h1>
        <p className="text-gray-400 mt-1">Here's your trading overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Balance</p>
                <p className="text-2xl font-bold text-white">$0.00</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total PnL</p>
                <p className="text-2xl font-bold text-green-400">+$0.00</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Active Bots</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Bot className="h-6 w-6 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Connected Wallets</p>
                <p className="text-2xl font-bold text-white">0</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Wallet className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Bots */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-green-400" />
              Your Bots
            </CardTitle>
            <CardDescription>Manage your trading bots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <Bot className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="mb-4">No bots configured yet</p>
              <Link href="/dashboard/bots">
                <Button variant="primary">Create Bot</Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Recent Trades */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Recent Trades
            </CardTitle>
            <CardDescription>Your latest trading activity</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No trades yet</p>
              <p className="text-sm mt-2">Connect a wallet and start a bot to begin trading</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Bots */}
      <Card>
        <CardHeader>
          <CardTitle>Available Trading Bots</CardTitle>
          <CardDescription>Choose a bot to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-4">
            {/* Polymarket Bot */}
            <div className="p-4 rounded-lg border border-gray-800 hover:border-purple-500/50 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Bot className="h-5 w-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Polymarket Auto</h3>
                  <p className="text-xs text-gray-500">Prediction Markets</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Temporal arbitrage with 98% win rate on crypto prediction markets.
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                Configure
              </Button>
            </div>

            {/* Hyperliquid Bot */}
            <div className="p-4 rounded-lg border border-gray-800 hover:border-blue-500/50 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Hyperliquid Perps</h3>
                  <p className="text-xs text-gray-500">Futures Trading</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                EMA trend following with up to 50x leverage on perpetual futures.
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                Configure
              </Button>
            </div>

            {/* Solana Bot */}
            <div className="p-4 rounded-lg border border-gray-800 hover:border-green-500/50 transition">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-green-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Solana Memecoin</h3>
                  <p className="text-xs text-gray-500">Token Trading</p>
                </div>
              </div>
              <p className="text-sm text-gray-400 mb-4">
                Automated dip buying and pump.fun plays on Solana memecoins.
              </p>
              <Button variant="secondary" size="sm" className="w-full">
                Configure
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
