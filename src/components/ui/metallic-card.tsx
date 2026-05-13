"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface MetallicCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glowColor?: "green" | "blue" | "purple" | "gold";
  animated?: boolean;
}

const colorConfig = {
  green: {
    gradient: "linear-gradient(90deg, #22c55e, #34d399, #10b981, #22c55e)",
    glow: "0 0 30px rgba(34, 197, 94, 0.3)",
    glowHover: "0 0 50px rgba(34, 197, 94, 0.5)",
  },
  blue: {
    gradient: "linear-gradient(90deg, #3b82f6, #67e8f9, #06b6d4, #3b82f6)",
    glow: "0 0 30px rgba(59, 130, 246, 0.3)",
    glowHover: "0 0 50px rgba(59, 130, 246, 0.5)",
  },
  purple: {
    gradient: "linear-gradient(90deg, #a855f7, #f472b6, #c084fc, #a855f7)",
    glow: "0 0 30px rgba(168, 85, 247, 0.3)",
    glowHover: "0 0 50px rgba(168, 85, 247, 0.5)",
  },
  gold: {
    gradient: "linear-gradient(90deg, #eab308, #fcd34d, #f59e0b, #eab308)",
    glow: "0 0 30px rgba(234, 179, 8, 0.3)",
    glowHover: "0 0 50px rgba(234, 179, 8, 0.5)",
  },
};

const MetallicCard = React.forwardRef<HTMLDivElement, MetallicCardProps>(
  ({ className, glowColor = "green", animated = true, children, ...props }, ref) => {
    const config = colorConfig[glowColor];
    const [isHovered, setIsHovered] = React.useState(false);

    return (
      <div
        ref={ref}
        className={cn("relative group rounded-xl p-[2px] overflow-hidden", className)}
        style={{
          boxShadow: isHovered ? config.glowHover : config.glow,
          transition: "box-shadow 0.3s ease",
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        {...props}
      >
        {/* Animated gradient border */}
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: config.gradient,
            backgroundSize: "300% 100%",
            animation: animated ? "gradient-shift 3s linear infinite" : undefined,
          }}
        />

        {/* Inner content */}
        <div 
          className="relative rounded-[10px] h-full"
          style={{
            background: "linear-gradient(180deg, rgba(17, 17, 17, 0.95) 0%, rgba(10, 10, 10, 0.98) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Top shine line */}
          <div 
            className="absolute inset-x-0 top-0 h-[1px] rounded-t-[10px]"
            style={{
              background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)",
            }}
          />

          {/* Hover shine effect */}
          <div
            className="absolute inset-0 rounded-[10px] pointer-events-none overflow-hidden"
            style={{ opacity: isHovered ? 1 : 0, transition: "opacity 0.5s" }}
          >
            <div
              style={{
                position: "absolute",
                top: 0,
                left: "-100%",
                width: "50%",
                height: "100%",
                background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)",
                animation: isHovered ? "shine-move 1s ease-out forwards" : undefined,
              }}
            />
          </div>

          {/* Content */}
          <div className="relative z-10">{children}</div>
        </div>
      </div>
    );
  }
);
MetallicCard.displayName = "MetallicCard";

export { MetallicCard };
