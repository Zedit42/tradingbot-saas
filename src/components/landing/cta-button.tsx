"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

interface CTAButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  size?: "sm" | "md" | "lg";
  variant?: "primary" | "secondary" | "outline";
  className?: string;
}

export function CTAButton({
  children,
  onClick,
  href,
  size = "md",
  variant = "primary",
  className = "",
}: CTAButtonProps) {
  const sizes = {
    sm: "px-4 py-2 text-sm",
    md: "px-6 py-3 text-base",
    lg: "px-8 py-4 text-lg",
  };

  const variants = {
    primary: "bg-gradient-to-r from-green-500 to-emerald-500 text-black font-semibold",
    secondary: "bg-white/10 text-white border border-white/20",
    outline: "bg-transparent text-green-400 border-2 border-green-500",
  };

  const Component = href ? motion.a : motion.button;

  return (
    <Component
      href={href}
      onClick={onClick}
      className={`
        relative group inline-flex items-center justify-center gap-2 rounded-full
        overflow-hidden transition-all duration-300
        ${sizes[size]} ${variants[variant]} ${className}
      `}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      {/* Animated background */}
      {variant === "primary" && (
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500"
          animate={{
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
          style={{ backgroundSize: "200% 200%" }}
        />
      )}

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 opacity-0 group-hover:opacity-100"
        initial={false}
        animate={{
          background: [
            "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.2) 50%, transparent 100%)",
          ],
          x: ["-100%", "100%"],
        }}
        transition={{ duration: 0.6, repeat: Infinity, repeatDelay: 1 }}
      />

      {/* Content */}
      <span className="relative z-10 flex items-center gap-2">
        {children}
        <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
      </span>

      {/* Glow effect */}
      {variant === "primary" && (
        <div className="absolute -inset-1 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full blur-lg opacity-40 group-hover:opacity-70 transition-opacity -z-10" />
      )}
    </Component>
  );
}

export function PulseButton({ children, href }: { children: React.ReactNode; href?: string }) {
  return (
    <div className="relative inline-block">
      {/* Pulse rings */}
      <motion.div
        className="absolute inset-0 rounded-full bg-green-500/30"
        animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
      <motion.div
        className="absolute inset-0 rounded-full bg-green-500/20"
        animate={{ scale: [1, 1.8], opacity: [0.3, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
      />

      <CTAButton href={href} size="lg" variant="primary">
        {children}
      </CTAButton>
    </div>
  );
}
