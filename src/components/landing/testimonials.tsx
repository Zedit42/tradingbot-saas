"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

const testimonials = [
  {
    name: "Alex Chen",
    role: "Crypto Trader",
    avatar: "🧑‍💻",
    content: "The temporal arbitrage bot is insane. Made back my subscription fee in the first hour.",
    profit: "+$2,400",
  },
  {
    name: "Sarah Miller",
    role: "DeFi Developer",
    avatar: "👩‍💼",
    content: "Finally a trading bot that actually works. The Hyperliquid integration is flawless.",
    profit: "+$8,200",
  },
  {
    name: "Mike Johnson",
    role: "Full-time Trader",
    avatar: "👨‍💻",
    content: "I've tried dozens of bots. This is the only one I trust with real money. The security is top-notch.",
    profit: "+$15,000",
  },
  {
    name: "Emma Wilson",
    role: "Hedge Fund Analyst",
    avatar: "👩‍🔬",
    content: "The whale tracking feature gave me an edge I never had before. Game changer.",
    profit: "+$5,600",
  },
  {
    name: "David Park",
    role: "Software Engineer",
    avatar: "🧑‍🚀",
    content: "Clean UI, powerful features, actually profitable. What more could you ask for?",
    profit: "+$3,800",
  },
  {
    name: "Lisa Thompson",
    role: "Portfolio Manager",
    avatar: "👩‍💻",
    content: "The funding rate farming strategy is pure alpha. Consistent returns with minimal risk.",
    profit: "+$12,400",
  },
];

export function Testimonials() {
  return (
    <div className="relative overflow-hidden py-4">
      {/* Gradient masks */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-black to-transparent z-10" />
      <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-black to-transparent z-10" />

      {/* Scrolling container */}
      <motion.div
        className="flex gap-6"
        animate={{ x: [0, -1920] }}
        transition={{
          x: {
            repeat: Infinity,
            repeatType: "loop",
            duration: 30,
            ease: "linear",
          },
        }}
      >
        {[...testimonials, ...testimonials].map((testimonial, i) => (
          <div
            key={i}
            className="flex-shrink-0 w-[350px] p-6 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">{testimonial.avatar}</div>
              <div>
                <div className="font-semibold text-white">{testimonial.name}</div>
                <div className="text-sm text-gray-400">{testimonial.role}</div>
              </div>
              <div className="ml-auto text-green-400 font-bold">{testimonial.profit}</div>
            </div>
            <p className="text-gray-300 text-sm mb-3">{testimonial.content}</p>
            <div className="flex gap-1">
              {[...Array(5)].map((_, j) => (
                <Star key={j} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>
        ))}
      </motion.div>
    </div>
  );
}

export function LogoCloud() {
  const logos = [
    { name: "Polymarket", icon: "🔮" },
    { name: "Hyperliquid", icon: "💧" },
    { name: "Solana", icon: "◎" },
    { name: "Jupiter", icon: "🪐" },
    { name: "Raydium", icon: "☢️" },
    { name: "Orca", icon: "🐋" },
  ];

  return (
    <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
      {logos.map((logo) => (
        <div key={logo.name} className="flex items-center gap-2 text-gray-400">
          <span className="text-2xl">{logo.icon}</span>
          <span className="font-medium">{logo.name}</span>
        </div>
      ))}
    </div>
  );
}
