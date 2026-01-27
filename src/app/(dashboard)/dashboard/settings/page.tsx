"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Loader2,
  Check
} from "lucide-react";

export default function SettingsPage() {
  const { data: session } = useSession();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 1000));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-8 max-w-3xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 mt-1">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-gray-400" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Name</label>
            <input
              type="text"
              defaultValue={session?.user?.name || ""}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">Email</label>
            <input
              type="email"
              defaultValue={session?.user?.email || ""}
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
              disabled
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-gray-400" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>How you receive updates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { label: "Trade Alerts", description: "Get notified when a trade is executed" },
            { label: "Daily Summary", description: "Receive daily PnL summaries" },
            { label: "Bot Status", description: "Alerts when bots start, stop, or error" },
            { label: "Marketing", description: "News and feature updates" },
          ].map((item, idx) => (
            <div key={idx} className="flex items-center justify-between">
              <div>
                <p className="text-white">{item.label}</p>
                <p className="text-sm text-gray-500">{item.description}</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked={idx < 3} className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:bg-green-500 after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-full" />
              </label>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-gray-400" />
            <CardTitle>Subscription</CardTitle>
          </div>
          <CardDescription>Manage your plan</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg bg-gray-800/50 border border-gray-700">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-semibold text-white">Free Plan</span>
                <span className="px-2 py-0.5 rounded-full bg-gray-700 text-gray-300 text-xs">
                  Current
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Paper trading only, 1 bot</p>
            </div>
            <Button variant="primary">
              Upgrade to Pro
            </Button>
          </div>

          <div className="mt-4 p-4 rounded-lg border border-dashed border-gray-700">
            <p className="text-sm text-gray-400">
              <strong className="text-white">Pro Plan - $29/mo</strong>
              <br />
              Live trading, all bots, full analytics, email support
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-400" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Protect your account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm text-gray-400 block mb-2">Current Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <div>
            <label className="text-sm text-gray-400 block mb-2">New Password</label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 text-white"
            />
          </div>
          <Button variant="secondary">
            Update Password
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={saving}
          className="gap-2"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : saved ? (
            <>
              <Check className="h-4 w-4" />
              Saved!
            </>
          ) : (
            "Save Changes"
          )}
        </Button>
      </div>
    </div>
  );
}
