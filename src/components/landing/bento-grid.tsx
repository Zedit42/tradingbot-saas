"use client";

import { motion } from "framer-motion";
import { Bot, Zap, Shield, TrendingUp, BarChart3, Clock } from "lucide-react";
import { MetallicCard } from "@/components/ui/metallic-card";

const features = [
  {
    icon: Bot,
    title: "AI-Powered Bots",
    description: "Machine learning models trained on millions of trades",
    className: "md:col-span-2 md:row-span-2",
    glowColor: "green" as const,
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Sub-100ms execution",
    className: "md:col-span-1",
    glowColor: "gold" as const,
  },
  {
    icon: Shield,
    title: "Bank-Grade Security",
    description: "Encrypted key vault",
    className: "md:col-span-1",
    glowColor: "blue" as const,
  },
  {
    icon: TrendingUp,
    title: "Proven Strategies",
    description: "94% win rate on arbitrage",
    className: "md:col-span-1",
    glowColor: "purple" as const,
  },
  {
    icon: Clock,
    title: "24/7 Trading",
    description: "Never miss an opportunity",
    className: "md:col-span-1",
    glowColor: "green" as const,
  },
  {
    icon: BarChart3,
    title: "Real-time Analytics",
    description: "Track every trade with detailed insights and P&L breakdowns",
    className: "md:col-span-2",
    glowColor: "blue" as const,
  },
];

export function BentoGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 max-w-6xl mx-auto">
      {features.map((feature, i) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.1 }}
          whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
          className={feature.className}
        >
          <MetallicCard glowColor={feature.glowColor} className="h-full">
            <div className="p-6 h-full flex flex-col">
              <div className="h-12 w-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300">
                <feature.icon className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          </MetallicCard>
        </motion.div>
      ))}
    </div>
  );
}
