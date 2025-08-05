'use client'

import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { 
  OrbitControls, 
  PerspectiveCamera, 
  Box, 
  Plane, 
  Text,
  RoundedBox,
  Effects
} from '@react-three/drei';
import * as THREE from 'three';
import { Message } from '@/types/conversation';
import { createKittMaterial } from './shaders/kittShaders';
import VoiceVisualizer3D from './VoiceVisualizer3D';
import ConversationDisplay3D from './ConversationDisplay3D';

interface Dashboard3DProps {
  messages: Message[];
  isRecording: boolean;
  isSpeaking: boolean;
  audioLevel: number;
  audioData?: Float32Array;
  performance?: 'high' | 'medium' | 'low';
  onRecordingToggle: () => void;
  onStyleChange: (style: 'bars' | 'sphere' | 'cylinder' | 'wave') => void;
  conversationId: string | null;
}

// 3D Dashboard Panel Component
function DashboardPanel({ 
  position, 
  rotation = [0, 0, 0], 
  title, 
  children,
  width = 4,
  height = 3,
  color = '#ef4444'
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  title: string;
  children: React.ReactNode;
  width?: number;
  height?: number;
  color?: string;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const panelMaterial = React.useMemo(() => {
    return new THREE.ShaderMaterial(createKittMaterial({
      opacity: { value: 0.1 },
      isHolographic: { value: true }
    }));
  }, []);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
    }

    if (groupRef.current) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      {/* Panel background */}
      <RoundedBox args={[width, height, 0.1]} radius={0.1}>
        <shaderMaterial
          ref={materialRef}
          {...panelMaterial}
          attach="material"
        />
      </RoundedBox>

      {/* Panel border */}
      <Box args={[width + 0.05, height + 0.05, 0.05]} position={[0, 0, -0.05]}>
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </Box>

      {/* Title */}
      <Text
        position={[0, height/2 - 0.3, 0.1]}
        fontSize={0.15}
        color={color}
        anchorX="center"
        anchorY="middle"
        font="/fonts/RobotoMono-Regular.ttf"
      >
        {title}
      </Text>

      {/* Content area */}
      <group position={[0, -0.2, 0.1]}>
        {children}
      </group>
    </group>
  );
}

// Status indicator component
function StatusIndicator({ 
  label, 
  active, 
  position 
}: { 
  label: string; 
  active: boolean; 
  position: [number, number, number]; 
}) {
  const lightRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (lightRef.current && active) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5;
      lightRef.current.scale.setScalar(0.8 + pulse * 0.4);
    }
  });

  return (
    <group position={position}>
      <Box ref={lightRef} args={[0.1, 0.1, 0.1]}>
        <meshBasicMaterial 
          color={active ? '#00ff00' : '#666666'} 
          transparent 
          opacity={active ? 1 : 0.3}
        />
      </Box>
      <Text
        position={[0.3, 0, 0]}
        fontSize={0.08}
        color={active ? '#00ff00' : '#666666'}
        anchorX="left"
        anchorY="middle"
        font="/fonts/RobotoMono-Regular.ttf"
      >
        {label}
      </Text>
    </group>
  );
}

// Main control button
function ControlButton({ 
  position, 
  isRecording, 
  onClick,
  disabled 
}: {
  position: [number, number, number];
  isRecording: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const buttonRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  useFrame((state) => {
    if (buttonRef.current) {
      if (isRecording) {
        const pulse = Math.sin(state.clock.elapsedTime * 6) * 0.1 + 1;
        buttonRef.current.scale.setScalar(pulse);
      } else {
        buttonRef.current.scale.setScalar(hovered ? 1.1 : 1);
      }
    }
  });

  return (
    <group position={position}>
      <Box
        ref={buttonRef}
        args={[0.8, 0.8, 0.2]}
        onClick={disabled ? undefined : onClick}
        onPointerOver={() => !disabled && setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <meshBasicMaterial 
          color={isRecording ? '#ff0000' : disabled ? '#333333' : '#ef4444'} 
          transparent 
          opacity={disabled ? 0.3 : 1}
        />
      </Box>
      
      {/* Button icon */}
      <Box args={[0.3, 0.3, 0.1]} position={[0, 0, 0.15]}>
        <meshBasicMaterial 
          color={isRecording ? '#ffffff' : '#000000'} 
        />
      </Box>
    </group>
  );
}

// 3D Dashboard Scene
function Dashboard3DScene({ 
  messages,
  isRecording,
  isSpeaking,
  audioLevel,
  audioData,
  performance = 'high',
  onRecordingToggle,
  conversationId
}: Dashboard3DProps) {
  const { camera, scene } = useThree();
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fixed' | 'follow'>('orbit');
  
  // Set up initial camera position
  useEffect(() => {
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  // Camera animation based on mode
  useFrame((state) => {
    switch (cameraMode) {
      case 'orbit':
        camera.position.x = Math.cos(state.clock.elapsedTime * 0.2) * 12;
        camera.position.z = Math.sin(state.clock.elapsedTime * 0.2) * 12;
        camera.lookAt(0, 0, 0);
        break;
      case 'follow':
        // Follow the audio activity
        const targetY = audioLevel * 3;
        camera.position.y += (targetY - camera.position.y) * 0.05;
        break;
      // 'fixed' mode does nothing
    }
  });

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={1} color="#ef4444" />
      <pointLight position={[-10, 5, 5]} intensity={0.5} color="#60a5fa" />
      <pointLight position={[0, -5, 10]} intensity={0.3} color="#ffffff" />

      {/* Central Voice Visualizer Panel */}
      <DashboardPanel
        position={[0, 0, 0]}
        title="VOICE ANALYSIS"
        width={6}
        height={4}
      >
        <group scale={[0.8, 0.8, 0.8]}>
          <VoiceVisualizer3D
            audioLevel={audioLevel}
            isRecording={isRecording}
            isSpeaking={isSpeaking}
            audioData={audioData}
            style="bars"
            performance={performance}
          />
        </group>
      </DashboardPanel>

      {/* Left Panel - Conversation Display */}
      <DashboardPanel
        position={[-7, 0, 0]}
        rotation={[0, Math.PI / 6, 0]}
        title="CONVERSATION LOG"
        width={5}
        height={6}
      >
        <group scale={[0.6, 0.6, 0.6]}>
          <ConversationDisplay3D
            messages={messages}
            performance={performance}
            scannerActive={isRecording}
          />
        </group>
      </DashboardPanel>

      {/* Right Panel - System Status */}
      <DashboardPanel
        position={[7, 0, 0]}
        rotation={[0, -Math.PI / 6, 0]}
        title="SYSTEM STATUS"
        width={4}
        height={5}
      >
        <StatusIndicator
          label="MICROPHONE"
          active={isRecording}
          position={[0, 1, 0]}
        />
        <StatusIndicator
          label="PROCESSING"
          active={isSpeaking}
          position={[0, 0.5, 0]}
        />
        <StatusIndicator
          label="DATABASE"
          active={!!conversationId}
          position={[0, 0, 0]}
        />
        <StatusIndicator
          label="NEURAL NET"
          active={audioLevel > 0.1}
          position={[0, -0.5, 0]}
        />
      </DashboardPanel>

      {/* Bottom Panel - Controls */}
      <DashboardPanel
        position={[0, -4, 0]}
        title="CONTROL INTERFACE"
        width={8}
        height={2}
      >
        <ControlButton
          position={[0, 0, 0]}
          isRecording={isRecording}
          onClick={onRecordingToggle}
          disabled={!conversationId}
        />
        
        <Text
          position={[0, -0.7, 0]}
          fontSize={0.1}
          color="#ef4444"
          anchorX="center"
          anchorY="middle"
          font="/fonts/RobotoMono-Regular.ttf"
        >
          {isRecording ? 'RECORDING ACTIVE' : 'CLICK TO RECORD'}
        </Text>
      </DashboardPanel>

      {/* Top Panel - Audio Metrics */}
      <DashboardPanel
        position={[0, 4, 0]}
        title="AUDIO METRICS"
        width={6}
        height={1.5}
      >
        <Text
          position={[-2, 0, 0]}
          fontSize={0.08}
          color="#00ff00"
          anchorX="left"
          anchorY="middle"
          font="/fonts/RobotoMono-Regular.ttf"
        >
          LEVEL: {Math.round(audioLevel * 100)}%
        </Text>
        
        <Text
          position={[2, 0, 0]}
          fontSize={0.08}
          color="#00ff00"
          anchorX="right"
          anchorY="middle"
          font="/fonts/RobotoMono-Regular.ttf"
        >
          FREQ: {audioData?.length || 0} BINS
        </Text>
      </DashboardPanel>

      {/* Holographic grid floor */}
      <Plane 
        args={[30, 30]} 
        rotation={[-Math.PI / 2, 0, 0]} 
        position={[0, -6, 0]}
      >
        <meshBasicMaterial 
          color="#ef4444" 
          transparent 
          opacity={0.1} 
          wireframe 
        />
      </Plane>

      {/* Camera mode controls (invisible clickable areas) */}
      <Box 
        args={[1, 1, 1]} 
        position={[-10, 6, 0]}
        onClick={() => setCameraMode('orbit')}
        visible={false}
      />
      <Box 
        args={[1, 1, 1]} 
        position={[0, 6, 0]}
        onClick={() => setCameraMode('fixed')}
        visible={false}
      />
      <Box 
        args={[1, 1, 1]} 
        position={[10, 6, 0]}
        onClick={() => setCameraMode('follow')}
        visible={false}
      />
    </>
  );
}

// Main Dashboard3D Component
export default function Dashboard3D(props: Dashboard3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [cameraMode, setCameraMode] = useState<'orbit' | 'fixed' | 'follow'>('orbit');

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black relative overflow-hidden rounded-lg border border-red-900/50"
      style={{ minHeight: '800px' }}
    >
      <Canvas
        camera={{ 
          position: [0, 5, 10], 
          fov: 75 
        }}
        gl={{ 
          antialias: props.performance !== 'low',
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={props.performance === 'low' ? 1 : Math.min(window.devicePixelRatio, 2)}
      >
        <Dashboard3DScene {...props} />
        
        {/* Manual camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={5}
          maxDistance={25}
        />
      </Canvas>

      {/* Camera mode controls overlay */}
      <div className="absolute top-4 left-4 space-y-2">
        <div className="text-red-400 font-mono text-sm bg-black/50 px-2 py-1 rounded">
          3D COMMAND CENTER
        </div>
        <div className="flex space-x-1">
          {(['orbit', 'fixed', 'follow'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setCameraMode(mode)}
              className={`px-2 py-1 text-xs font-mono rounded ${
                cameraMode === mode
                  ? 'bg-red-500 text-white'
                  : 'bg-black/50 text-red-400 border border-red-500'
              }`}
            >
              {mode.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Performance indicator */}
      <div className="absolute top-4 right-4 text-red-400/60 font-mono text-xs bg-black/50 px-2 py-1 rounded">
        PERFORMANCE: {props.performance?.toUpperCase()}
      </div>

      {/* Controls help */}
      <div className="absolute bottom-4 right-4 text-red-400/60 font-mono text-xs bg-black/50 px-2 py-1 rounded">
        DRAG TO ORBIT • SCROLL TO ZOOM • CLICK PANELS TO INTERACT
      </div>
    </div>
  );
}