"use client";

import { useRef, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { 
  Float, 
  useGLTF, 
  Environment, 
  PresentationControls,
  ContactShadows,
  Html
} from "@react-three/drei";
import { motion } from "framer-motion";
import * as THREE from "three";

// Placeholder 3D element - will be replaced with custom model
function TradingBot() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.3;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.8) * 0.1;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <mesh ref={meshRef} castShadow>
        {/* Main body - Robot/Bot shape */}
        <boxGeometry args={[1.5, 2, 1]} />
        <meshStandardMaterial 
          color="#10b981" 
          metalness={0.8} 
          roughness={0.2}
          emissive="#10b981"
          emissiveIntensity={0.2}
        />
      </mesh>
      
      {/* Head */}
      <mesh position={[0, 1.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.8, 0.8]} />
        <meshStandardMaterial 
          color="#1f2937" 
          metalness={0.9} 
          roughness={0.1}
        />
      </mesh>
      
      {/* Eyes - glowing */}
      <mesh position={[-0.3, 1.4, 0.45]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#22c55e" 
          emissive="#22c55e"
          emissiveIntensity={2}
        />
      </mesh>
      <mesh position={[0.3, 1.4, 0.45]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial 
          color="#22c55e" 
          emissive="#22c55e"
          emissiveIntensity={2}
        />
      </mesh>
      
      {/* Antenna */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.4, 8]} />
        <meshStandardMaterial color="#6b7280" metalness={0.9} />
      </mesh>
      <mesh position={[0, 2.3, 0]}>
        <sphereGeometry args={[0.1, 16, 16]} />
        <meshStandardMaterial 
          color="#22c55e" 
          emissive="#22c55e"
          emissiveIntensity={3}
        />
      </mesh>
    </Float>
  );
}

// Custom 3D Model Loader - for when Yiğit sends a model
interface ModelProps {
  url: string;
  scale?: number;
}

export function CustomModel({ url, scale = 1 }: ModelProps) {
  const { scene } = useGLTF(url);
  const ref = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
    }
  });

  return (
    <Float speed={2} rotationIntensity={0.3} floatIntensity={0.5}>
      <primitive 
        ref={ref}
        object={scene} 
        scale={scale} 
        castShadow 
        receiveShadow 
      />
    </Float>
  );
}

// Floating particles effect
function Particles() {
  const count = 50;
  const ref = useRef<THREE.Points>(null);

  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count * 3; i++) {
    positions[i] = (Math.random() - 0.5) * 10;
  }

  useFrame((state) => {
    if (ref.current) {
      ref.current.rotation.y = state.clock.elapsedTime * 0.05;
    }
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.05}
        color="#22c55e"
        transparent
        opacity={0.6}
        sizeAttenuation
      />
    </points>
  );
}

// Loading fallback
function Loader() {
  return (
    <Html center>
      <div className="text-green-400 animate-pulse">Loading...</div>
    </Html>
  );
}

// Main 3D Scene Component
interface HeroSceneProps {
  modelUrl?: string;
  modelScale?: number;
}

export function HeroScene({ modelUrl, modelScale = 1 }: HeroSceneProps) {
  return (
    <motion.div 
      className="absolute inset-0 z-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
      >
        <Suspense fallback={<Loader />}>
          {/* Lighting */}
          <ambientLight intensity={0.4} />
          <spotLight 
            position={[10, 10, 10]} 
            angle={0.3} 
            penumbra={1} 
            intensity={1}
            castShadow
          />
          <pointLight position={[-10, -10, -10]} intensity={0.5} color="#22c55e" />
          
          {/* Controls */}
          <PresentationControls
            global
            rotation={[0, 0, 0]}
            polar={[-0.4, 0.4]}
            azimuth={[-0.4, 0.4]}
            config={{ mass: 2, tension: 400 }}
            snap={{ mass: 4, tension: 400 }}
          >
            {/* 3D Model or placeholder */}
            {modelUrl ? (
              <CustomModel url={modelUrl} scale={modelScale} />
            ) : (
              <TradingBot />
            )}
          </PresentationControls>
          
          {/* Effects */}
          <Particles />
          <ContactShadows 
            position={[0, -2, 0]} 
            opacity={0.4} 
            scale={10} 
            blur={2} 
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </motion.div>
  );
}

export default HeroScene;
