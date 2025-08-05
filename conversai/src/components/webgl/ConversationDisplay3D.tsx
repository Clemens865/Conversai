'use client'

import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Text, Box, Plane, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { Message } from '@/types/conversation';
import { createHolographicTextMaterial, createKittMaterial } from './shaders/kittShaders';

interface ConversationDisplay3DProps {
  messages: Message[];
  performance?: 'high' | 'medium' | 'low';
  scannerActive?: boolean;
}

// Individual holographic message component
function HolographicMessage({ 
  message, 
  position, 
  index,
  scannerPosition 
}: { 
  message: Message;
  position: [number, number, number];
  index: number;
  scannerPosition: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const [isVisible, setIsVisible] = useState(false);

  // Create holographic text material
  const textMaterial = useMemo(() => {
    return new THREE.ShaderMaterial(createHolographicTextMaterial({
      isUser: { value: message.role === 'user' },
      textColor: { 
        value: message.role === 'user' 
          ? [0.937, 0.267, 0.267] // KITT red for user
          : [0.4, 0.8, 1.0]       // Blue for assistant
      }
    }));
  }, [message.role]);

  // Background panel material
  const panelMaterial = useMemo(() => {
    return new THREE.ShaderMaterial(createKittMaterial({
      opacity: { value: 0.1 },
      isHolographic: { value: true }
    }));
  }, []);

  // Animate message appearance
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, index * 100);
    
    return () => clearTimeout(timer);
  }, [index]);

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;
      materialRef.current.uniforms.scanLine.value = scannerPosition;
    }

    if (groupRef.current && isVisible) {
      // Gentle floating animation
      groupRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + index) * 0.02;
      groupRef.current.position.z = position[2] + Math.cos(state.clock.elapsedTime * 0.5 + index) * 0.01;
      
      // Scale in animation
      const targetScale = 1;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale), 
        0.05
      );
    }
  });

  // Split long messages into multiple lines
  const lines = useMemo(() => {
    const maxLength = 60;
    const words = message.content.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    words.forEach(word => {
      if (currentLine.length + word.length + 1 <= maxLength) {
        currentLine += (currentLine ? ' ' : '') + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    });
    
    if (currentLine) lines.push(currentLine);
    return lines.slice(0, 4); // Max 4 lines
  }, [message.content]);

  if (!isVisible) return null;

  return (
    <group ref={groupRef} position={position} scale={[0, 0, 0]}>
      {/* Background panel */}
      <Plane 
        args={[4, Math.max(1, lines.length * 0.3 + 0.4)]}
        position={[0, 0, -0.01]}
      >
        <shaderMaterial {...panelMaterial} attach="material" />
      </Plane>

      {/* Message text lines */}
      {lines.map((line, lineIndex) => (
        <Text
          key={lineIndex}
          position={[0, (lines.length - 1 - lineIndex * 2) * 0.15, 0]}
          fontSize={0.12}
          maxWidth={3.8}
          textAlign={message.role === 'user' ? 'right' : 'left'}
          anchorX={message.role === 'user' ? 'right' : 'left'}
          anchorY="middle"
          font="/fonts/RobotoMono-Regular.ttf"
        >
          {line}
          <shaderMaterial
            ref={lineIndex === 0 ? materialRef : undefined}
            {...textMaterial}
            attach="material"
          />
        </Text>
      ))}

      {/* User/Assistant label */}
      <Text
        position={[
          message.role === 'user' ? 1.8 : -1.8,
          -Math.max(0.5, lines.length * 0.15),
          0
        ]}
        fontSize={0.08}
        color={message.role === 'user' ? '#ef4444' : '#60a5fa'}
        anchorX={message.role === 'user' ? 'right' : 'left'}
        anchorY="top"
        font="/fonts/RobotoMono-Regular.ttf"
      >
        {message.role === 'user' ? 'USER' : 'K.I.T.T.'} • {new Date(message.timestamp).toLocaleTimeString()}
      </Text>
    </group>
  );
}

// Scanner line effect
function ScannerLine({ 
  isActive, 
  onPositionUpdate 
}: { 
  isActive: boolean;
  onPositionUpdate: (position: number) => void;
}) {
  const lineRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial(createKittMaterial({
      opacity: { value: 0.8 },
      isScanning: { value: true }
    }));
  }, []);

  useFrame((state) => {
    if (lineRef.current && isActive) {
      // Scanner movement
      const scanRange = 6;
      const position = Math.sin(state.clock.elapsedTime * 2) * scanRange;
      lineRef.current.position.y = position;
      onPositionUpdate(position);
      
      // Update material
      if (materialRef.current) {
        materialRef.current.uniforms.time.value = state.clock.elapsedTime;
        materialRef.current.uniforms.scannerPosition.value = position;
      }
    }
  });

  if (!isActive) return null;

  return (
    <Box ref={lineRef} args={[8, 0.05, 0.1]} position={[0, 0, 0]}>
      <shaderMaterial
        ref={materialRef}
        {...material}
        attach="material"
      />
    </Box>
  );
}

// Main 3D conversation scene
function ConversationScene({ 
  messages, 
  performance = 'high',
  scannerActive = false 
}: ConversationDisplay3DProps) {
  const { camera } = useThree();
  const [scannerPosition, setScannerPosition] = useState(0);

  // Calculate message positions in 3D space
  const messagePositions = useMemo(() => {
    return messages.map((message, index) => {
      const ySpacing = -1.5;
      const xOffset = message.role === 'user' ? 2 : -2;
      const zVariation = (index % 3 - 1) * 0.5; // Slight depth variation
      
      return [
        xOffset,
        index * ySpacing,
        zVariation
      ] as [number, number, number];
    });
  }, [messages]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (messages.length > 0) {
      const latestY = (messages.length - 1) * -1.5;
      camera.position.y = latestY + 2;
    }
  }, [messages.length, camera]);

  // Limit visible messages for performance
  const visibleMessages = useMemo(() => {
    const maxVisible = performance === 'low' ? 5 : performance === 'medium' ? 10 : 20;
    return messages.slice(-maxVisible);
  }, [messages, performance]);

  return (
    <>
      {/* Lighting setup */}
      <ambientLight intensity={0.3} />
      <pointLight 
        position={[5, 5, 5]} 
        intensity={0.8} 
        color="#ef4444" 
      />
      <pointLight 
        position={[-5, 0, 5]} 
        intensity={0.5} 
        color="#60a5fa" 
      />

      {/* Holographic grid background */}
      <gridHelper 
        args={[20, 20, '#ef4444', '#333333']} 
        position={[0, -10, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {/* Message display */}
      {visibleMessages.map((message, index) => {
        const originalIndex = messages.indexOf(message);
        const position = messagePositions[originalIndex];
        
        return position ? (
          <HolographicMessage
            key={message.id}
            message={message}
            position={position}
            index={index}
            scannerPosition={scannerPosition}
          />
        ) : null;
      })}

      {/* Scanner line */}
      <ScannerLine 
        isActive={scannerActive}
        onPositionUpdate={setScannerPosition}
      />

      {/* Holographic borders */}
      <Box args={[10, 0.05, 0.05]} position={[0, 3, 0]}>
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </Box>
      <Box args={[10, 0.05, 0.05]} position={[0, -15, 0]}>
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </Box>
      <Box args={[0.05, 20, 0.05]} position={[-5, -6, 0]}>
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </Box>
      <Box args={[0.05, 20, 0.05]} position={[5, -6, 0]}>
        <meshBasicMaterial color="#ef4444" transparent opacity={0.5} />
      </Box>
    </>
  );
}

// Main component
export default function ConversationDisplay3D(props: ConversationDisplay3DProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
      className="w-full h-full bg-black relative overflow-hidden rounded-lg border border-red-900/50"
      style={{ minHeight: '600px' }}
    >
      <Canvas
        camera={{ 
          position: [0, 2, 8], 
          fov: 60 
        }}
        gl={{ 
          antialias: props.performance !== 'low',
          alpha: true,
          powerPreference: 'high-performance'
        }}
        dpr={props.performance === 'low' ? 1 : window.devicePixelRatio}
      >
        <ConversationScene {...props} />
        
        {/* Camera controls */}
        <OrbitControls 
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          maxPolarAngle={Math.PI / 2}
          minDistance={3}
          maxDistance={15}
          target={[0, -5, 0]}
        />
      </Canvas>

      {/* 3D view indicator */}
      <div className="absolute top-4 left-4 text-red-400 font-mono text-sm bg-black/50 px-2 py-1 rounded">
        HOLOGRAPHIC VIEW
      </div>

      {/* Navigation hint */}
      <div className="absolute bottom-4 right-4 text-red-400/60 font-mono text-xs bg-black/50 px-2 py-1 rounded">
        DRAG TO ORBIT • SCROLL TO ZOOM
      </div>
    </div>
  );
}