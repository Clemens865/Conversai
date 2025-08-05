'use client'

import React, { useRef, useMemo, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  Cylinder, 
  Sphere, 
  Box, 
  OrbitControls, 
  Effects, 
  Bloom,
  DepthOfField 
} from '@react-three/drei';
import * as THREE from 'three';
import { 
  createVoiceVisualizerMaterial, 
  createParticleMaterial,
  createKittMaterial 
} from './shaders/kittShaders';

interface VoiceVisualizer3DProps {
  audioLevel: number;
  isRecording: boolean;
  isSpeaking: boolean;
  audioData?: Float32Array;
  style?: 'bars' | 'sphere' | 'cylinder' | 'wave';
  performance?: 'high' | 'medium' | 'low';
}

// Individual 3D audio bar component
function AudioBar3D({ 
  position, 
  audioValue, 
  delay, 
  index 
}: { 
  position: [number, number, number];
  audioValue: number;
  delay: number;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    const mat = new THREE.ShaderMaterial(createVoiceVisualizerMaterial({
      audioData: { value: audioValue },
      delay: { value: delay }
    }));
    return mat;
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.globalAudioLevel.value = audioValue;
    }
    
    if (meshRef.current) {
      // Audio-reactive scaling
      const baseScale = 0.8;
      const audioScale = 1 + audioValue * 2;
      meshRef.current.scale.y = baseScale + audioScale;
      
      // Subtle rotation based on audio
      meshRef.current.rotation.y += audioValue * 0.01;
    }
  });

  return (
    <Cylinder
      ref={meshRef}
      args={[0.2, 0.2, 1, 8]}
      position={position}
    >
      <shaderMaterial
        ref={materialRef}
        {...material}
        attach="material"
      />
    </Cylinder>
  );
}

// Spherical voice visualizer
function SphereVisualizer({ 
  audioLevel, 
  audioData 
}: { 
  audioLevel: number; 
  audioData?: Float32Array; 
}) {
  const sphereRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial(createKittMaterial({
      audioLevel: { value: audioLevel }
    }));
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.audioLevel.value = audioLevel;
    }
    
    if (sphereRef.current) {
      // Audio-reactive scaling and morphing
      const scale = 1 + audioLevel * 0.5;
      sphereRef.current.scale.setScalar(scale);
      
      // Gentle rotation
      sphereRef.current.rotation.y += 0.005;
      sphereRef.current.rotation.x += 0.003;
    }
  });

  return (
    <Sphere ref={sphereRef} args={[1, 32, 32]}>
      <shaderMaterial
        ref={materialRef}
        {...material}
        attach="material"
      />
    </Sphere>
  );
}

// Particle system for ambient effects
function ParticleSystem({ 
  audioLevel, 
  count = 100,
  performance = 'high' 
}: { 
  audioLevel: number; 
  count?: number;
  performance?: string;
}) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Reduce particle count for lower performance
  const particleCount = useMemo(() => {
    if (performance === 'low') return Math.min(count, 50);
    if (performance === 'medium') return Math.min(count, 150);
    return count;
  }, [count, performance]);

  const { positions, sizes, alphas, colors } = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const alphas = new Float32Array(particleCount);
    const colors = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      // Spherical distribution
      const radius = 3 + Math.random() * 2;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      sizes[i] = Math.random() * 20 + 10;
      alphas[i] = Math.random() * 0.5 + 0.3;

      // KITT red color variations
      colors[i * 3] = 0.9 + Math.random() * 0.1;     // R
      colors[i * 3 + 1] = 0.2 + Math.random() * 0.3; // G
      colors[i * 3 + 2] = 0.2 + Math.random() * 0.3; // B
    }

    return { positions, sizes, alphas, colors };
  }, [particleCount]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial(createParticleMaterial({}));
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.audioLevel.value = audioLevel;
    }

    if (pointsRef.current) {
      pointsRef.current.rotation.y += 0.002;
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          count={particleCount}
          array={sizes}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-alpha"
          count={particleCount}
          array={alphas}
          itemSize={1}
        />
        <bufferAttribute
          attach="attributes-customColor"
          count={particleCount}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        {...material}
        attach="material"
      />
    </points>
  );
}

// Main visualizer scene
function VisualizerScene({ 
  audioLevel, 
  isRecording, 
  isSpeaking, 
  audioData, 
  style = 'bars',
  performance = 'high' 
}: VoiceVisualizer3DProps) {
  const { camera } = useThree();

  // Generate audio bars data
  const barsData = useMemo(() => {
    const barCount = performance === 'low' ? 16 : performance === 'medium' ? 32 : 64;
    return Array.from({ length: barCount }, (_, i) => {
      const angle = (i / barCount) * Math.PI * 2;
      const radius = 2;
      return {
        position: [
          Math.cos(angle) * radius,
          0,
          Math.sin(angle) * radius
        ] as [number, number, number],
        audioValue: audioData ? audioData[i] || 0 : audioLevel * Math.random(),
        delay: i * 0.1,
        index: i
      };
    });
  }, [audioData, audioLevel, performance]);

  useFrame((state) => {
    // Camera orbit when not speaking/recording
    if (!isRecording && !isSpeaking) {
      camera.position.x = Math.cos(state.clock.elapsedTime * 0.2) * 8;
      camera.position.z = Math.sin(state.clock.elapsedTime * 0.2) * 8;
      camera.lookAt(0, 0, 0);
    }
  });

  return (
    <>
      {/* Ambient lighting */}
      <ambientLight intensity={0.2} />
      <pointLight 
        position={[10, 10, 10]} 
        intensity={1} 
        color="#ef4444" 
      />
      <pointLight 
        position={[-10, -10, -10]} 
        intensity={0.5} 
        color="#ffffff" 
      />

      {/* Main visualizer based on style */}
      {style === 'bars' && barsData.map((bar, i) => (
        <AudioBar3D key={i} {...bar} />
      ))}
      
      {style === 'sphere' && (
        <SphereVisualizer audioLevel={audioLevel} audioData={audioData} />
      )}

      {/* Particle system */}
      <ParticleSystem 
        audioLevel={audioLevel} 
        count={performance === 'low' ? 50 : 100}
        performance={performance}
      />

      {/* Scanner effect plane */}
      {isRecording && (
        <Box args={[10, 0.1, 10]} position={[0, -2, 0]}>
          <meshBasicMaterial 
            color="#ef4444" 
            transparent 
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </Box>
      )}

      {/* Post-processing effects for high performance */}
      {performance === 'high' && (
        <Effects disableGamma>
          <Bloom 
            intensity={1.5} 
            kernelSize={3} 
            luminanceThreshold={0.1} 
            luminanceSmoothing={0.4} 
          />
          <DepthOfField 
            focusDistance={0.02} 
            focalLength={0.05} 
            bokehScale={8} 
          />
        </Effects>
      )}
    </>
  );
}

// Main component with performance monitoring
export default function VoiceVisualizer3D(props: VoiceVisualizer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const frameRateRef = useRef<number>(60);

  // Performance monitoring
  useEffect(() => {
    let frameCount = 0;
    let lastTime = performance.now();

    const monitor = () => {
      frameCount++;
      const currentTime = performance.now();
      
      if (currentTime - lastTime >= 1000) {
        frameRateRef.current = Math.round((frameCount * 1000) / (currentTime - lastTime));
        frameCount = 0;
        lastTime = currentTime;
      }
      
      requestAnimationFrame(monitor);
    };

    monitor();
  }, []);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black relative overflow-hidden rounded-lg"
      style={{ minHeight: '400px' }}
    >
      <Canvas
        camera={{ 
          position: [5, 5, 5], 
          fov: 60 
        }}
        gl={{ 
          antialias: props.performance !== 'low',
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={props.performance === 'low' ? 1 : window.devicePixelRatio}
      >
        <VisualizerScene {...props} />
        
        {/* Optional orbit controls */}
        <OrbitControls 
          enablePan={false}
          enableZoom={false}
          enableRotate={true}
          autoRotate={!props.isRecording && !props.isSpeaking}
          autoRotateSpeed={0.5}
        />
      </Canvas>
      
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs font-mono text-red-400 bg-black/50 px-2 py-1 rounded">
          FPS: {frameRateRef.current}
        </div>
      )}
    </div>
  );
}