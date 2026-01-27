"use client";

import { useAccount } from "wagmi";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConnectWalletButton } from "@/components/wallet/connect-button";
import { Wallet, Plus, ExternalLink, Trash2 } from "lucide-react";
import { shortenAddress } from "@/lib/utils";

export default function WalletsPage() {
  const { address, isConnected, chain } = useAccount();

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Wallets</h1>
          <p className="text-gray-400 mt-1">Manage your connected wallets</p>
        </div>
        <ConnectWalletButton />
      </div>

      {/* Connected Wallets */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Wallets</CardTitle>
          <CardDescription>
            Wallets linked to your account for trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isConnected && address ? (
            <div className="space-y-4">
              {/* Current wallet */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <p className="font-mono text-white">{shortenAddress(address, 6)}</p>
                    <p className="text-sm text-gray-500">
                      {chain?.name || "Unknown Network"} • EVM
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
                    Active
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(`https://etherscan.io/address/${address}`, "_blank")}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="h-16 w-16 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-white mb-2">
                No wallets connected
              </h3>
              <p className="text-gray-500 mb-6">
                Connect a wallet to start using trading bots
              </p>
              <ConnectWalletButton />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Supported Chains */}
      <Card>
        <CardHeader>
          <CardTitle>Supported Networks</CardTitle>
          <CardDescription>
            Chains supported for trading
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { name: "Ethereum", color: "from-blue-500 to-purple-500" },
              { name: "Polygon", color: "from-purple-500 to-pink-500" },
              { name: "Arbitrum", color: "from-blue-400 to-cyan-400" },
              { name: "Base", color: "from-blue-600 to-blue-400" },
            ].map((chain) => (
              <div
                key={chain.name}
                className="p-4 rounded-lg border border-gray-800 hover:border-gray-700 transition text-center"
              >
                <div
                  className={`h-10 w-10 mx-auto rounded-full bg-gradient-to-br ${chain.color} mb-3`}
                />
                <p className="text-sm text-white">{chain.name}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Coming Soon: Solana */}
      <Card className="border-dashed border-gray-700">
        <CardContent className="py-8 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-400 text-sm mb-4">
            Coming Soon
          </div>
          <h3 className="text-lg font-medium text-white mb-2">
            Solana Wallet Support
          </h3>
          <p className="text-gray-500">
            Connect Phantom, Solflare, and other Solana wallets
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
