"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Bot, 
  TrendingUp, 
  Zap, 
  Play, 
  Pause, 
  Settings, 
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Grid3X3,
  PiggyBank,
  Percent,
  Fish
} from "lucide-react";

type BotType = "polymarket" | "hyperliquid" | "solana" | "grid" | "dca" | "funding" | "whale";

interface BotConfig {
  id: BotType;
  name: string;
  description: string;
  icon: typeof Bot;
  color: string;
  features: string[];
  status: "stopped" | "running" | "error";
  stats: {
    trades: number;
    pnl: number;
    winRate: number;
  };
}

const bots: BotConfig[] = [
  {
    id: "polymarket",
    name: "Polymarket Auto",
    description: "Prediction market trading with temporal arbitrage",
    icon: BarChart3,
    color: "purple",
    features: [
      "Temporal Arbitrage (CEX price lag)",
      "YES/NO Spread Detection",
      "Closing Soon Mispricing",
      "Auto Position Sizing"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "hyperliquid",
    name: "Hyperliquid Perps",
    description: "Perpetual futures with trend following",
    icon: TrendingUp,
    color: "blue",
    features: [
      "EMA Trend Following",
      "Funding Rate Signals",
      "Auto Stop-Loss & Take-Profit",
      "Up to 50x Leverage"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "solana",
    name: "Solana Memecoin",
    description: "High-speed memecoin trading on Solana",
    icon: Zap,
    color: "green",
    features: [
      "Pump.fun Integration",
      "Dip Buy Automation",
      "LP Farming",
      "Instant Alerts"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "grid",
    name: "Grid Bot",
    description: "Automated grid trading for sideways markets",
    icon: Grid3X3,
    color: "orange",
    features: [
      "Range-based Trading",
      "Auto Grid Placement",
      "Multi-pair Support",
      "Profit Compounding"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "dca",
    name: "DCA Bot",
    description: "Dollar cost averaging with smart timing",
    icon: PiggyBank,
    color: "pink",
    features: [
      "Scheduled Buys",
      "Dip Detection",
      "Multi-asset Support",
      "Long-term Growth"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "funding",
    name: "Funding Farmer",
    description: "Delta-neutral funding rate arbitrage",
    icon: Percent,
    color: "cyan",
    features: [
      "Funding Rate Tracking",
      "Delta-neutral Positions",
      "Auto Rebalancing",
      "Multi-exchange Support"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  },
  {
    id: "whale",
    name: "Whale Tracker",
    description: "Follow smart money with auto-trade signals",
    icon: Fish,
    color: "indigo",
    features: [
      "$100k+ Movement Detection",
      "Auto-trade on Signals",
      "Multi-wallet Tracking",
      "Risk Analysis"
    ],
    status: "stopped",
    stats: { trades: 0, pnl: 0, winRate: 0 }
  }
];

export default function BotsPage() {
  const [selectedBot, setSelectedBot] = useState<BotType | null>(null);
  const [botStatuses, setBotStatuses] = useState<Record<BotType, "stopped" | "running" | "error">>({
    polymarket: "stopped",
    hyperliquid: "stopped",
    solana: "stopped",
    grid: "stopped",
    dca: "stopped",
    funding: "stopped",
    whale: "stopped"
  });

  const toggleBot = (botId: BotType) => {
    setBotStatuses(prev => ({
      ...prev,
      [botId]: prev[botId] === "running" ? "stopped" : "running"
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "text-green-400 bg-green-500/10";
      case "error": return "text-red-400 bg-red-500/10";
      default: return "text-gray-400 bg-gray-500/10";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "running": return <CheckCircle2 className="h-4 w-4" />;
      case "error": return <AlertTriangle className="h-4 w-4" />;
      default: return <Pause className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Trading Bots</h1>
        <p className="text-gray-400 mt-1">Configure and manage your automated trading bots</p>
      </div>

      {/* Bot Cards */}
      <div className="grid gap-6">
        {bots.map((bot) => {
          const Icon = bot.icon;
          const status = botStatuses[bot.id];
          
          return (
            <Card 
              key={bot.id}
              className={`transition-all ${selectedBot === bot.id ? 'ring-2 ring-green-500' : ''}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-xl bg-${bot.color}-500/10 flex items-center justify-center`}>
                      <Icon className={`h-7 w-7 text-${bot.color}-400`} />
                    </div>
                    <div>
                      <CardTitle className="flex items-center gap-3">
                        {bot.name}
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${getStatusColor(status)}`}>
                          {getStatusIcon(status)}
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </CardTitle>
                      <CardDescription>{bot.description}</CardDescription>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedBot(selectedBot === bot.id ? null : bot.id)}
                    >
                      <Settings className="h-5 w-5" />
                    </Button>
                    <Button
                      variant={status === "running" ? "destructive" : "primary"}
                      onClick={() => toggleBot(bot.id)}
                      className="gap-2"
                    >
                      {status === "running" ? (
                        <>
                          <Pause className="h-4 w-4" />
                          Stop
                        </>
                      ) : (
                        <>
                          <Play className="h-4 w-4" />
                          Start
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500">Total Trades</p>
                    <p className="text-2xl font-bold text-white">{bot.stats.trades}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500">Total PnL</p>
                    <p className={`text-2xl font-bold ${bot.stats.pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {bot.stats.pnl >= 0 ? '+' : ''}${bot.stats.pnl.toFixed(2)}
                    </p>
                  </div>
                  <div className="p-4 rounded-lg bg-gray-800/50">
                    <p className="text-sm text-gray-500">Win Rate</p>
                    <p className="text-2xl font-bold text-white">{bot.stats.winRate}%</p>
                  </div>
                </div>

                {/* Features */}
                <div className="grid grid-cols-2 gap-2">
                  {bot.features.map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                      <span className="text-green-400">✓</span>
                      {feature}
                    </div>
                  ))}
                </div>

                {/* Config Panel */}
                {selectedBot === bot.id && (
                  <div className="mt-6 pt-6 border-t border-gray-800">
                    <h4 className="text-sm font-medium text-white mb-4">Configuration</h4>
                    
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Position Size ($)
                        </label>
                        <input
                          type="number"
                          defaultValue={25}
                          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Max Daily Trades
                        </label>
                        <input
                          type="number"
                          defaultValue={10}
                          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Stop Loss (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={5}
                          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-gray-400 block mb-2">
                          Take Profit (%)
                        </label>
                        <input
                          type="number"
                          defaultValue={15}
                          className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <Button variant="ghost" onClick={() => setSelectedBot(null)}>
                        Cancel
                      </Button>
                      <Button variant="primary">
                        Save Configuration
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Pro Upgrade Banner */}
      <Card className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-white mb-1">
                Upgrade to Pro for Live Trading
              </h3>
              <p className="text-gray-400">
                You're currently on the Free plan with paper trading only
              </p>
            </div>
            <Button variant="primary">
              Upgrade Now - $29/mo
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
