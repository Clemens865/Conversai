'use client'

import React, { useState } from 'react';
import { Message } from '@/types/conversation';

// Demo component to showcase the 3D WebGL features
export default function WebGLDemo() {
  const [currentDemo, setCurrentDemo] = useState<'visualizer' | 'conversation' | 'dashboard'>('visualizer');
  
  // Mock data for demonstration
  const mockMessages: Message[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello K.I.T.T., can you help me understand quantum computing?',
      timestamp: new Date()
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Certainly! Quantum computing harnesses quantum mechanical phenomena like superposition and entanglement to process information in ways that classical computers cannot.',
      timestamp: new Date()
    },
    {
      id: '3',
      role: 'user',
      content: 'That sounds fascinating. How does it differ from regular computing?',
      timestamp: new Date()
    }
  ];

  const mockAudioData = new Float32Array(64).map((_, i) => 
    Math.sin(i * 0.1) * Math.random() * 0.5
  );

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-red-500 mb-4 tracking-wider">
            K.I.T.T. 3D WEBGL VOICE INTERFACE
          </h1>
          <p className="text-gray-300 mb-6">
            Advanced 3D visualization system with holographic displays and real-time audio analysis
          </p>
          
          {/* Demo Navigation */}
          <div className="flex justify-center space-x-4 mb-8">
            {(['visualizer', 'conversation', 'dashboard'] as const).map((demo) => (
              <button
                key={demo}
                onClick={() => setCurrentDemo(demo)}
                className={`px-6 py-2 font-mono text-sm rounded ${
                  currentDemo === demo
                    ? 'bg-red-500 text-white'
                    : 'bg-gray-800 text-red-400 border border-red-500 hover:bg-red-500/20'
                }`}
              >
                {demo.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Live Demo Area */}
          <div className="bg-gray-900 rounded-lg p-6 border border-red-900/50">
            <h2 className="text-xl font-bold text-red-400 mb-4">LIVE DEMO</h2>
            
            {currentDemo === 'visualizer' && (
              <div className="space-y-4">
                <div className="h-64 bg-black rounded border border-red-500/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-red-400 mb-2">🎵 3D Voice Visualizer</div>
                    <div className="text-sm text-gray-400">
                      Real-time audio bars, spherical waveforms, and particle effects
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  <p>• Audio-reactive 3D geometry</p>
                  <p>• Multiple visualization styles (bars, sphere, wave)</p>
                  <p>• Real-time frequency analysis</p>
                  <p>• Particle system ambient effects</p>
                </div>
              </div>
            )}
            
            {currentDemo === 'conversation' && (
              <div className="space-y-4">
                <div className="h-64 bg-black rounded border border-red-500/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-red-400 mb-2">💬 Holographic Chat</div>
                    <div className="text-sm text-gray-400">
                      Floating conversation panels with scanner effects
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  <p>• Holographic message panels</p>
                  <p>• Scanner line animation</p>
                  <p>• Smooth transitions and floating effects</p>
                  <p>• RGB chromatic aberration for sci-fi look</p>
                </div>
              </div>
            )}
            
            {currentDemo === 'dashboard' && (
              <div className="space-y-4">
                <div className="h-64 bg-black rounded border border-red-500/30 flex items-center justify-center">
                  <div className="text-center">
                    <div className="text-red-400 mb-2">🚀 3D Command Center</div>
                    <div className="text-sm text-gray-400">
                      Multi-panel 3D dashboard with orbital controls
                    </div>
                  </div>
                </div>
                <div className="text-sm text-gray-300">
                  <p>• Multiple 3D panels in space</p>
                  <p>• Orbital camera controls</p>
                  <p>• Interactive status indicators</p>
                  <p>• Real-time system monitoring</p>
                </div>
              </div>
            )}
          </div>

          {/* Features & Technical Details */}
          <div className="bg-gray-900 rounded-lg p-6 border border-red-900/50">
            <h2 className="text-xl font-bold text-red-400 mb-4">TECHNICAL FEATURES</h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="text-red-300 font-semibold mb-2">🔧 WebGL Detection & Fallbacks</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Automatic WebGL capability assessment</li>
                  <li>• Performance-based quality adjustment</li>
                  <li>• Graceful fallback to 2D KITT interface</li>
                  <li>• Mobile optimization and LOD system</li>
                </ul>
              </div>

              <div>
                <h3 className="text-red-300 font-semibold mb-2">🎨 Custom Shaders</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• KITT scanner animation shader</li>
                  <li>• Holographic interference effects</li>
                  <li>• Audio-reactive vertex displacement</li>
                  <li>• Particle system with SIMD optimization</li>
                </ul>
              </div>

              <div>
                <h3 className="text-red-300 font-semibold mb-2">⚡ Performance Optimization</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Real-time FPS monitoring</li>
                  <li>• Dynamic quality adjustment</li>
                  <li>• Reduced geometry on mobile</li>
                  <li>• Efficient particle culling</li>
                </ul>
              </div>

              <div>
                <h3 className="text-red-300 font-semibold mb-2">🎵 Audio Integration</h3>
                <ul className="text-sm text-gray-300 space-y-1">
                  <li>• Real-time frequency analysis</li>
                  <li>• Multi-band audio separation</li>
                  <li>• Voice activity detection</li>
                  <li>• Smooth animation interpolation</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Component Architecture */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6 border border-red-900/50">
          <h2 className="text-xl font-bold text-red-400 mb-4">COMPONENT ARCHITECTURE</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-black rounded p-4 border border-red-500/30">
              <h3 className="text-red-300 font-semibold mb-2">Core Components</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• VoiceInterface3D</li>
                <li>• VoiceVisualizer3D</li>
                <li>• ConversationDisplay3D</li>
                <li>• Dashboard3D</li>
              </ul>
            </div>
            
            <div className="bg-black rounded p-4 border border-red-500/30">
              <h3 className="text-red-300 font-semibold mb-2">Utilities</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• webglDetection.ts</li>
                <li>• kittShaders.ts</li>
                <li>• withWebGLFallback HOC</li>
                <li>• Performance monitoring</li>
              </ul>
            </div>
            
            <div className="bg-black rounded p-4 border border-red-500/30">
              <h3 className="text-red-300 font-semibold mb-2">Integration</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Existing VoicePipeline</li>
                <li>• Supabase authentication</li>
                <li>• Deepgram/ElevenLabs API</li>
                <li>• KITT theme consistency</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Installation Instructions */}
        <div className="mt-8 bg-gray-900 rounded-lg p-6 border border-red-900/50">
          <h2 className="text-xl font-bold text-red-400 mb-4">INSTALLATION & USAGE</h2>
          
          <div className="bg-black rounded p-4 font-mono text-sm">
            <div className="text-green-400 mb-2"># Dependencies are already added to package.json</div>
            <div className="text-gray-300 mb-4">npm install</div>
            
            <div className="text-green-400 mb-2"># Import and use the 3D interface</div>
            <div className="text-gray-300 mb-2">import VoiceInterface3D from '@/components/VoiceInterface3D'</div>
            <div className="text-gray-300 mb-4">import Dashboard3D from '@/components/webgl/Dashboard3D'</div>
            
            <div className="text-green-400 mb-2"># The component automatically detects WebGL support</div>
            <div className="text-gray-300">// Falls back to 2D KITT interface if WebGL unavailable</div>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-red-300 font-semibold mb-2">Features Completed ✅</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>✅ 3D voice visualizer with multiple styles</li>
                <li>✅ Holographic conversation display</li>
                <li>✅ Particle systems for ambient effects</li>
                <li>✅ Custom KITT-themed shaders</li>
                <li>✅ 3D perspective dashboard</li>
                <li>✅ WebGL detection & fallbacks</li>
                <li>✅ Mobile performance optimization</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-red-300 font-semibold mb-2">Performance Features</h3>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Automatic quality adjustment</li>
                <li>• Mobile-specific optimizations</li>
                <li>• Real-time FPS monitoring</li>
                <li>• Efficient particle culling</li>
                <li>• Progressive geometry loading</li>
                <li>• Shader complexity scaling</li>
                <li>• Memory usage optimization</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm">
          <p>3D WebGL Voice Interface System • Built with Three.js, React Three Fiber & Custom Shaders</p>
          <p>Fully integrated with existing VoicePipeline, Supabase, and KITT theming</p>
        </div>
      </div>
    </div>
  );
}