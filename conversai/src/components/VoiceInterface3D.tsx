'use client'

import React, { useState, useRef, useEffect } from 'react';
import { Message } from '@/types/conversation';
import { VoicePipeline } from '@/lib/services/voice/voicePipeline';
import { useAuth } from '@/contexts/AuthContext';
import { useWebGLCapabilities, withWebGLFallback } from '@/lib/utils/webglDetection';
import VoiceVisualizer3D from './webgl/VoiceVisualizer3D';
import ConversationDisplay3D from './webgl/ConversationDisplay3D';
import VoiceInterfaceKITT from './VoiceInterfaceKITT';

interface VoiceInterface3DProps {
  onNewMessage: (message: Message) => void;
  isRecording: boolean;
  setIsRecording: (recording: boolean) => void;
  conversationId: string | null;
  messages: Message[];
}

function VoiceInterface3DComponent({ 
  onNewMessage, 
  isRecording, 
  setIsRecording,
  conversationId,
  messages
}: VoiceInterface3DProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [currentTranscript, setCurrentTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);
  const [audioData, setAudioData] = useState<Float32Array>();
  const [view3D, setView3D] = useState(true);
  const [visualizerStyle, setVisualizerStyle] = useState<'bars' | 'sphere' | 'cylinder' | 'wave'>('bars');
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const voicePipelineRef = useRef<VoicePipeline | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const { user } = useAuth();
  const capabilities = useWebGLCapabilities();

  // Performance settings based on WebGL capabilities
  const performanceLevel = capabilities?.performance || 'medium';

  useEffect(() => {
    // Initialize voice pipeline when component mounts and we have necessary data
    if (user && conversationId && !voicePipelineRef.current) {
      const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
      const elevenLabsApiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      const openAIApiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;

      if (deepgramApiKey && elevenLabsApiKey && openAIApiKey) {
        voicePipelineRef.current = new VoicePipeline({
          deepgramApiKey,
          elevenLabsApiKey,
          openAIApiKey,
          userId: user.id,
          conversationId,
          preferredVoice: 'rachel',
        });
      } else {
        setError('Missing API keys. Please check your environment variables.');
      }
    }
  }, [user, conversationId]);

  // Audio analysis for real-time visualization
  const analyzeAudio = () => {
    if (analyserRef.current && isRecording) {
      const bufferLength = analyserRef.current.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const audioDataFloat = new Float32Array(bufferLength);
      
      analyserRef.current.getByteFrequencyData(dataArray);
      analyserRef.current.getFloatFrequencyData(audioDataFloat);
      
      // Calculate average audio level
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setAudioLevel(average / 255);
      
      // Set audio data for 3D visualization
      setAudioData(audioDataFloat);
      
      animationRef.current = requestAnimationFrame(analyzeAudio);
    }
  };

  const startRecording = async () => {
    try {
      setError(null);
      
      if (!voicePipelineRef.current) {
        setError('Voice pipeline not initialized');
        return;
      }

      // Get microphone permission and stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        } 
      });
      streamRef.current = stream;

      // Set up audio analyzer for 3D visualization
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512; // Higher resolution for 3D
      analyserRef.current.smoothingTimeConstant = 0.8;
      source.connect(analyserRef.current);

      // Start analyzing audio levels
      analyzeAudio();

      // Start live transcription
      await voicePipelineRef.current.startListening(
        (transcript, isFinal) => {
          if (isFinal) {
            setCurrentTranscript('');
          } else {
            setCurrentTranscript(transcript);
          }
        },
        (response) => {
          // AI response is being generated
          setIsProcessing(true);
          setIsSpeaking(true);
          
          // Create assistant message
          const assistantMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: response,
            timestamp: new Date()
          };
          onNewMessage(assistantMessage);
          
          // Simulate speaking animation
          setTimeout(() => {
            setIsSpeaking(false);
            setIsProcessing(false);
          }, response.length * 50); // Rough estimate of speaking time
        },
        (error) => {
          console.error('Voice pipeline error:', error);
          setError(error.message);
          setIsProcessing(false);
          setIsSpeaking(false);
        }
      );

      // Set up MediaRecorder to capture audio chunks
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && voicePipelineRef.current) {
          // Convert blob to ArrayBuffer and send to Deepgram
          const arrayBuffer = await event.data.arrayBuffer();
          voicePipelineRef.current.sendAudioChunk(arrayBuffer);
        }
      };

      // Start recording with 100ms chunks for low latency
      mediaRecorder.start(100);
      setIsRecording(true);

    } catch (error: any) {
      console.error('Error accessing microphone:', error);
      setError('Unable to access microphone. Please check your permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (voicePipelineRef.current) {
      voicePipelineRef.current.stop();
    }

    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    setIsRecording(false);
    setCurrentTranscript('');
    setIsProcessing(false);
    setAudioLevel(0);
    setAudioData(undefined);
  };

  // Show user's speech in real-time
  useEffect(() => {
    if (currentTranscript) {
      const userMessage: Message = {
        id: `temp-${Date.now()}`,
        role: 'user',
        content: currentTranscript,
        timestamp: new Date()
      };
      onNewMessage(userMessage);
    }
  }, [currentTranscript]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  if (!capabilities?.recommend3D) {
    return (
      <div className="bg-black rounded-lg p-4 border border-red-900/50">
        <p className="text-red-400 text-center mb-4">
          3D mode requires WebGL support. Falling back to 2D interface.
        </p>
        <VoiceInterfaceKITT
          onNewMessage={onNewMessage}
          isRecording={isRecording}
          setIsRecording={setIsRecording}
          conversationId={conversationId}
        />
      </div>
    );
  }

  return (
    <div className="bg-black rounded-lg shadow-2xl border border-red-900/50 overflow-hidden">
      {/* Header with controls */}
      <div className="p-4 border-b border-red-900/50">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-red-500 tracking-wider">
            K.I.T.T. 3D INTERFACE
          </h2>
          
          <div className="flex space-x-2">
            {/* View toggle */}
            <button
              onClick={() => setView3D(!view3D)}
              className="px-3 py-1 text-xs font-mono text-red-400 border border-red-500 rounded hover:bg-red-500/20"
            >
              {view3D ? '3D' : '2D'}
            </button>
            
            {/* Visualizer style */}
            <select
              value={visualizerStyle}
              onChange={(e) => setVisualizerStyle(e.target.value as any)}
              className="px-2 py-1 text-xs font-mono bg-black text-red-400 border border-red-500 rounded"
            >
              <option value="bars">BARS</option>
              <option value="sphere">SPHERE</option>
              <option value="cylinder">CYLINDER</option>
              <option value="wave">WAVE</option>
            </select>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-900/20 border border-red-500 text-red-400 rounded-md text-sm">
            {error}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0">
        {/* Voice Visualizer */}
        <div className="h-[400px] border-r border-red-900/50">
          {view3D ? (
            <VoiceVisualizer3D
              audioLevel={audioLevel}
              isRecording={isRecording}
              isSpeaking={isSpeaking}
              audioData={audioData}
              style={visualizerStyle}
              performance={performanceLevel === 'none' ? undefined : performanceLevel}
            />
          ) : (
            <div className="h-full flex items-center justify-center bg-gray-900">
              <p className="text-red-400 font-mono">2D FALLBACK MODE</p>
            </div>
          )}
        </div>

        {/* Conversation Display */}
        <div className="h-[400px]">
          {view3D ? (
            <ConversationDisplay3D
              messages={messages}
              performance={performanceLevel === 'none' ? undefined : performanceLevel}
              scannerActive={isRecording || isProcessing}
            />
          ) : (
            <div className="h-full overflow-y-auto p-4 space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`p-2 rounded text-sm ${
                    message.role === 'user'
                      ? 'bg-red-900/20 text-red-300 ml-8'
                      : 'bg-gray-800 text-gray-300 mr-8'
                  }`}
                >
                  <p className="font-mono">{message.content}</p>
                  <p className="text-xs opacity-60 mt-1">
                    {message.role.toUpperCase()} • {new Date(message.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Control Panel */}
      <div className="p-4 border-t border-red-900/50">
        <div className="flex flex-col items-center space-y-4">
          {/* Main Control Button */}
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || !conversationId}
            className={`
              relative w-20 h-20 rounded-full transition-all duration-300
              ${isRecording 
                ? 'bg-red-600 shadow-[0_0_30px_rgba(239,68,68,0.8)]' 
                : 'bg-gray-800 hover:bg-gray-700 border-2 border-red-500'
              }
              ${isProcessing || !conversationId ? 'opacity-50 cursor-not-allowed' : ''}
              flex items-center justify-center group
            `}
          >
            <div className="absolute inset-0 rounded-full bg-red-500 opacity-20 animate-ping" 
                 style={{ display: isRecording ? 'block' : 'none' }} />
            
            {isRecording ? (
              <div className="w-8 h-8 bg-white rounded-sm" />
            ) : (
              <svg className="w-10 h-10 text-red-500 group-hover:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z" />
                <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z" />
              </svg>
            )}
          </button>
          
          <p className="text-sm text-red-400 font-mono tracking-wider text-center">
            {isRecording ? 'RECORDING... CLICK TO STOP' : 
             isProcessing ? 'PROCESSING...' :
             isSpeaking ? 'K.I.T.T. SPEAKING...' :
             'CLICK TO ACTIVATE'}
          </p>

          {/* Current transcript display */}
          {currentTranscript && (
            <div className="w-full max-w-md p-2 bg-red-900/20 border border-red-500 rounded-md">
              <p className="text-sm text-red-300 font-mono italic text-center">
                "{currentTranscript}"
              </p>
            </div>
          )}

          {/* Status indicators */}
          <div className="flex space-x-6 text-xs font-mono">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className={isRecording ? 'text-red-400' : 'text-gray-500'}>MIC</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-gray-600'}`} />
              <span className={isProcessing ? 'text-yellow-400' : 'text-gray-500'}>CPU</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${view3D ? 'bg-blue-500' : 'bg-gray-600'}`} />
              <span className={view3D ? 'text-blue-400' : 'text-gray-500'}>3D</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${conversationId ? 'bg-green-500' : 'bg-red-500'}`} />
              <span className={conversationId ? 'text-green-400' : 'text-red-400'}>LINK</span>
            </div>
          </div>

          {/* Performance indicator */}
          <div className="text-xs font-mono text-gray-500">
            PERFORMANCE: {performanceLevel.toUpperCase()} | WEBGL: {capabilities?.webgl2 ? '2.0' : capabilities?.webgl1 ? '1.0' : 'NONE'}
          </div>
        </div>
      </div>
    </div>
  );
}

// Export with WebGL fallback to KITT interface
export default withWebGLFallback(
  VoiceInterface3DComponent,
  VoiceInterfaceKITT,
  'low'
);