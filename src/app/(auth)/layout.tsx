import Link from "next/link";
import { Bot } from "lucide-react";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header */}
      <header className="p-6">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <Bot className="h-8 w-8 text-green-500" />
          <span className="text-xl font-bold text-white">TradingBot Pro</span>
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4">
        {children}
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-gray-500 text-sm">
        © 2026 TradingBot Pro. Not financial advice.
      </footer>
    </div>
  );
}
