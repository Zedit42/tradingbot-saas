"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Wallet } from "lucide-react";

interface CryptoPayButtonProps {
  plan: "pro" | "elite";
  variant?: "primary" | "secondary";
  className?: string;
}

export function CryptoPayButton({ plan, variant = "primary", className }: CryptoPayButtonProps) {
  const [loading, setLoading] = useState(false);

  const handlePay = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/crypto/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await res.json();

      if (data.url) {
        // Redirect to NOWPayments hosted checkout
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to create payment");
      }
    } catch (error) {
      console.error("Payment error:", error);
      alert("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const price = plan === "pro" ? "$29" : "$99";
  const planName = plan.charAt(0).toUpperCase() + plan.slice(1);

  return (
    <Button
      variant={variant}
      onClick={handlePay}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing...
        </>
      ) : (
        <>
          <Wallet className="h-4 w-4" />
          Pay {price} with Crypto
        </>
      )}
    </Button>
  );
}
