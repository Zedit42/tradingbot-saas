"use client";

import { useAccount, useConnect, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Wallet, ChevronDown, LogOut, Copy, Check } from "lucide-react";
import { useState } from "react";
import { shortenAddress } from "@/lib/utils";

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isConnected && address) {
    return (
      <div className="relative">
        <Button
          variant="secondary"
          onClick={() => setShowMenu(!showMenu)}
          className="gap-2"
        >
          <div className="h-2 w-2 rounded-full bg-green-500" />
          {shortenAddress(address)}
          <ChevronDown className="h-4 w-4" />
        </Button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-48 rounded-lg bg-gray-800 border border-gray-700 shadow-lg py-1 z-50">
            <button
              onClick={copyAddress}
              className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-2"
            >
              {copied ? (
                <Check className="h-4 w-4 text-green-400" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
              {copied ? "Copied!" : "Copy Address"}
            </button>
            <button
              onClick={() => {
                disconnect();
                setShowMenu(false);
              }}
              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <Button
        variant="primary"
        onClick={() => setShowMenu(!showMenu)}
        disabled={isPending}
        className="gap-2"
      >
        <Wallet className="h-4 w-4" />
        {isPending ? "Connecting..." : "Connect Wallet"}
      </Button>

      {showMenu && (
        <div className="absolute right-0 mt-2 w-56 rounded-lg bg-gray-800 border border-gray-700 shadow-lg py-2 z-50">
          <p className="px-4 py-2 text-xs text-gray-500 uppercase">
            Choose Wallet
          </p>
          {connectors.map((connector) => (
            <button
              key={connector.uid}
              onClick={() => {
                connect({ connector });
                setShowMenu(false);
              }}
              className="w-full px-4 py-3 text-left text-sm text-gray-300 hover:bg-gray-700 flex items-center gap-3"
            >
              <div className="h-8 w-8 rounded-lg bg-gray-700 flex items-center justify-center">
                <Wallet className="h-4 w-4" />
              </div>
              {connector.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
