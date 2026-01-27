import Link from "next/link";
import { Bot, LayoutDashboard, Wallet, Settings, LogOut, Bell, Trophy, Send } from "lucide-react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-black flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 p-6 flex flex-col">
        <Link href="/" className="flex items-center gap-2 mb-8">
          <Bot className="h-8 w-8 text-green-500" />
          <span className="text-xl font-bold text-white">TradingBot</span>
        </Link>

        <nav className="flex-1 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <LayoutDashboard className="h-5 w-5" />
            Dashboard
          </Link>
          <Link
            href="/dashboard/bots"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Bot className="h-5 w-5" />
            Bots
          </Link>
          <Link
            href="/dashboard/wallets"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Wallet className="h-5 w-5" />
            Wallets
          </Link>
          
          {/* New Features */}
          <div className="my-4 border-t border-gray-800" />
          
          <Link
            href="/dashboard/alerts"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Bell className="h-5 w-5" />
            Price Alerts
            <span className="ml-auto text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">New</span>
          </Link>
          <Link
            href="/dashboard/leaderboard"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Trophy className="h-5 w-5" />
            Leaderboard
            <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded">🔥</span>
          </Link>
          
          <div className="my-4 border-t border-gray-800" />
          
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition"
          >
            <Settings className="h-5 w-5" />
            Settings
          </Link>
        </nav>

        <div className="border-t border-gray-800 pt-4">
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="h-8 w-8 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-green-400 text-sm font-medium">
                {session.user?.name?.[0] || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-white truncate">{session.user?.name}</p>
              <p className="text-xs text-gray-500 truncate">{session.user?.email}</p>
            </div>
          </div>
          <Link
            href="/api/auth/signout"
            className="flex items-center gap-3 px-4 py-3 rounded-lg text-gray-400 hover:text-red-400 hover:bg-gray-800 transition mt-2"
          >
            <LogOut className="h-5 w-5" />
            Sign out
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-8 overflow-auto">
        {children}
      </main>
    </div>
  );
}
