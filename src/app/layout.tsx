import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TradingBot Pro - Automated Crypto Trading",
  description: "Deploy battle-tested trading bots for Polymarket, Hyperliquid, and Solana. Set it. Forget it. Profit.",
  keywords: ["crypto trading", "trading bot", "polymarket", "hyperliquid", "solana", "automated trading"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased bg-black`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
