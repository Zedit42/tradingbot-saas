"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface TypewriterProps {
  words: string[];
  className?: string;
}

export function Typewriter({ words, className }: TypewriterProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [currentText, setCurrentText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = words[currentIndex];
    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentText.length < word.length) {
            setCurrentText(word.slice(0, currentText.length + 1));
          } else {
            setTimeout(() => setIsDeleting(true), 2000);
          }
        } else {
          if (currentText.length > 0) {
            setCurrentText(currentText.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex((prev) => (prev + 1) % words.length);
          }
        }
      },
      isDeleting ? 50 : 100
    );

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, currentIndex, words]);

  return (
    <span className={className}>
      {currentText}
      <motion.span
        animate={{ opacity: [1, 0] }}
        transition={{ duration: 0.5, repeat: Infinity, repeatType: "reverse" }}
        className="inline-block w-[3px] h-[1em] bg-green-400 ml-1 align-middle"
      />
    </span>
  );
}

interface GradientTextProps {
  children: React.ReactNode;
  className?: string;
  animate?: boolean;
}

export function GradientText({ children, className, animate = true }: GradientTextProps) {
  return (
    <motion.span
      className={`bg-gradient-to-r from-green-400 via-emerald-400 to-teal-400 bg-clip-text text-transparent ${className}`}
      style={animate ? { backgroundSize: "200% 200%" } : undefined}
      animate={animate ? { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] } : undefined}
      transition={animate ? { duration: 5, repeat: Infinity, ease: "linear" } : undefined}
    >
      {children}
    </motion.span>
  );
}

interface AnimatedCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  suffix = "",
  prefix = "",
  duration = 2,
  className,
}: AnimatedCounterProps) {
  const [count, setCount] = useState(0);
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    if (hasAnimated) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setHasAnimated(true);
          const startTime = Date.now();
          const endTime = startTime + duration * 1000;

          const animate = () => {
            const now = Date.now();
            const progress = Math.min((now - startTime) / (duration * 1000), 1);
            const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
            setCount(Math.floor(eased * value));

            if (now < endTime) {
              requestAnimationFrame(animate);
            } else {
              setCount(value);
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.5 }
    );

    const element = document.getElementById(`counter-${value}`);
    if (element) observer.observe(element);

    return () => observer.disconnect();
  }, [value, duration, hasAnimated]);

  return (
    <span id={`counter-${value}`} className={className}>
      {prefix}
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
}

export function FadeIn({ children, delay = 0, direction = "up", className }: FadeInProps) {
  const directions = {
    up: { y: 40, x: 0 },
    down: { y: -40, x: 0 },
    left: { x: 40, y: 0 },
    right: { x: -40, y: 0 },
  };

  return (
    <motion.div
      initial={{ opacity: 0, ...directions[direction] }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
