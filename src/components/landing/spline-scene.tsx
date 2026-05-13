"use client";

import { Suspense, lazy, useState } from "react";
import { motion } from "framer-motion";

// Lazy load Spline to avoid SSR issues
const Spline = lazy(() => import("@splinetool/react-spline"));

// Curated Spline scenes for trading/crypto theme
export const SPLINE_SCENES = {
  // Abstract gradient blob - perfect for hero
  gradientBlob: "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode",
  // Floating geometric shapes
  abstractShapes: "https://prod.spline.design/aHEF1GfKS03H2xKa/scene.splinecode",
  // 3D Robot/AI character
  robot: "https://prod.spline.design/xbQxKhRuYMb1lU-U/scene.splinecode",
  // Floating crystals
  crystals: "https://prod.spline.design/Pmj6dqOJsNfCvKqM/scene.splinecode",
  // Keyboard 3D
  keyboard: "https://prod.spline.design/rJi4d2EUqSCfJIbn/scene.splinecode",
} as const;

interface SplineSceneProps {
  scene?: keyof typeof SPLINE_SCENES | string;
  className?: string;
  fallback?: React.ReactNode;
}

// Loading skeleton with glow effect
function SplineLoader() {
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <motion.div
        className="relative"
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-64 h-64 rounded-full bg-gradient-to-r from-green-500/20 via-emerald-500/20 to-teal-500/20 blur-3xl" />
      </motion.div>
      <motion.div
        className="absolute w-32 h-32 rounded-full bg-green-500/30 blur-2xl"
        animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </div>
  );
}

export function SplineScene({ scene = "gradientBlob", className = "", fallback }: SplineSceneProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Get scene URL
  const sceneUrl = scene in SPLINE_SCENES 
    ? SPLINE_SCENES[scene as keyof typeof SPLINE_SCENES] 
    : scene;

  if (hasError) {
    return fallback || <SplineLoader />;
  }

  return (
    <div className={`relative ${className}`}>
      {!isLoaded && <SplineLoader />}
      <Suspense fallback={<SplineLoader />}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: isLoaded ? 1 : 0 }}
          transition={{ duration: 1 }}
          className="w-full h-full"
        >
          <Spline
            scene={sceneUrl}
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            style={{ width: "100%", height: "100%" }}
          />
        </motion.div>
      </Suspense>
    </div>
  );
}

// Hero-specific Spline with overlay
export function HeroSpline() {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-transparent to-black/80 z-10" />
      
      {/* Spline scene */}
      <SplineScene 
        scene="gradientBlob" 
        className="w-full h-full opacity-70"
        fallback={
          <div className="absolute inset-0">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
          </div>
        }
      />
    </div>
  );
}

// Interactive floating element
export function FloatingSpline({ scene = "robot" }: { scene?: keyof typeof SPLINE_SCENES }) {
  return (
    <motion.div
      className="w-full h-[400px] md:h-[500px]"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8 }}
    >
      <SplineScene scene={scene} className="w-full h-full" />
    </motion.div>
  );
}
