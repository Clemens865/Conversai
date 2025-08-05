'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import ConversationHistory from './ConversationHistory';
import MemoryStrategySelector, { MemoryStrategy } from './MemoryStrategySelector';
import PromptTreeVisualizer from './PromptTreeVisualizer';
import UserFactsDisplay from './memory/UserFactsDisplay';
import { createClient } from '@/lib/supabase/client';
import { memoryManager, MemoryItem, PromptTreeNode } from '@/lib/services/memory/multiTierMemory';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MinimalPureInterfaceProps {
  user: User;
}

export default function MinimalPureInterface({ user }: MinimalPureInterfaceProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('listening');
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'assistant',
      content: `Hello ${user.email?.split('@')[0] || 'there'}. I'm ready to assist you. How can I help you today?`,
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [animationActive, setAnimationActive] = useState(false);
  const [memoryStrategy, setMemoryStrategy] = useState<MemoryStrategy>('hierarchical');
  const [promptTree, setPromptTree] = useState<PromptTreeNode | null>(null);
  const [memoryMetrics, setMemoryMetrics] = useState(memoryManager.getMetrics());
  const [showPromptTree, setShowPromptTree] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<'history' | 'memory' | 'settings' | 'templates' | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const conversationIdRef = useRef<string>('');
  const recordingStartTimeRef = useRef<number>(0);
  const supabase = createClient();

  // Initialize conversationId with proper UUID and memory system
  useEffect(() => {
    conversationIdRef.current = crypto.randomUUID();
    console.log('New conversation started:', conversationIdRef.current);
    console.log('User:', user.email);
    
    // Initialize memory manager and load user profile
    const initializeSystem = async () => {
      await memoryManager.initialize();
      console.log('Memory manager initialized');
      
      // Load user profile to personalize greeting
      try {
        const response = await fetch('/api/user/profile');
        if (response.ok) {
          const profile = await response.json();
          setUserProfile(profile);
          
          // Create personalized greeting based on profile
          const greeting = profile.name 
            ? `Hello ${profile.name}! I remember you. How can I assist you today?`
            : `Hello ${user.email?.split('@')[0] || 'there'}. I'm ready to assist you. How can I help you today?`;
          
          setMessages([{
            id: '1',
            type: 'assistant',
            content: greeting,
            timestamp: new Date()
          }]);
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
        // Fallback greeting
        setMessages([{
          id: '1',
          type: 'assistant',
          content: `Hello ${user.email?.split('@')[0] || 'there'}. I'm ready to assist you. How can I help you today?`,
          timestamp: new Date()
        }]);
      }
    };
    
    initializeSystem();
    
    // Subscribe to memory metrics
    const metricsInterval = setInterval(() => {
      setMemoryMetrics(memoryManager.getMetrics());
    }, 2000);
    
    return () => clearInterval(metricsInterval);
  }, [user]);

  // Handle conversation selection
  const handleSelectConversation = async (conversationId: string) => {
    try {
      // Load messages for selected conversation
      const { data: messages, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading messages:', error);
        return;
      }

      // Convert database messages to UI format
      const formattedMessages: Message[] = messages?.map((msg: any) => ({
        id: msg.id,
        type: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: new Date(msg.created_at)
      })) || [];

      // Add initial greeting if no messages
      if (formattedMessages.length === 0) {
        formattedMessages.push({
          id: '1',
          type: 'assistant',
          content: `Hello ${user.email?.split('@')[0] || 'there'}. How can I assist you today?`,
          timestamp: new Date()
        });
      }

      setMessages(formattedMessages);
      conversationIdRef.current = conversationId;
    } catch (error) {
      console.error('Error in handleSelectConversation:', error);
    }
  };

  // Handle new conversation
  const handleNewConversation = () => {
    conversationIdRef.current = crypto.randomUUID();
    setMessages([{
      id: '1',
      type: 'assistant',
      content: `Hello ${user.email?.split('@')[0] || 'there'}. What would you like to talk about?`,
      timestamp: new Date()
    }]);
    console.log('Started new conversation:', conversationIdRef.current);
  };

  // Voice modulator animation
  useEffect(() => {
    let animationId: number;
    
    const animate = () => {
      if (animationActive) {
        const leftSegments = document.querySelectorAll('#left .voice-segment');
        const centerSegments = document.querySelectorAll('#center .voice-segment');
        const rightSegments = document.querySelectorAll('#right .voice-segment');
        
        const time = Date.now() / 200;
        const centerHeight = Math.floor(Math.sin(time) * 3 + 6);
        const leftHeight = Math.floor(Math.sin(time - 0.5) * 2 + 4);
        const rightHeight = Math.floor(Math.sin(time + 0.5) * 2 + 4);
        
        leftSegments.forEach((segment, i) => {
          segment.classList.toggle('active', i < leftHeight);
        });
        centerSegments.forEach((segment, i) => {
          segment.classList.toggle('active', i < centerHeight);
        });
        rightSegments.forEach((segment, i) => {
          segment.classList.toggle('active', i < rightHeight);
        });
      } else {
        // Clear all active states when not animating
        document.querySelectorAll('.voice-segment').forEach(segment => {
          segment.classList.remove('active');
        });
      }
      
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
    
    return () => {
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
    };
  }, [animationActive]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Use a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus' 
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('Recording stopped. Total chunks:', audioChunksRef.current.length);
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('Audio blob size:', audioBlob.size, 'bytes');
        console.log('Conversation ID:', conversationIdRef.current);
        
        if (audioBlob.size === 0) {
          console.error('No audio data recorded');
          alert('No audio was recorded. Please check your microphone permissions.');
          return;
        }
        
        await processAudio(audioBlob);
      };

      // Record in chunks for better reliability
      mediaRecorder.start(100); // 100ms chunks
      recordingStartTimeRef.current = Date.now();
      setIsListening(true);
      setStatusText('listening');
      setAnimationActive(true);
      console.log('Recording started with MIME type:', mimeType);
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      const recordingDuration = Date.now() - recordingStartTimeRef.current;
      
      // Ensure minimum recording duration (500ms)
      if (recordingDuration < 500) {
        console.log('Recording too short:', recordingDuration, 'ms');
        alert('Please hold the button longer and speak clearly.');
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        setIsListening(false);
        setStatusText('listening');
        setAnimationActive(false);
        return;
      }
      
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsListening(false);
      setStatusText('processing');
      setAnimationActive(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    const formData = new FormData();
    formData.append('audio', audioBlob);
    formData.append('conversationId', conversationIdRef.current);

    try {
      const response = await fetch('/api/voice/process', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        // Show specific error message from server
        const errorMessage = data.error || 'Voice processing failed';
        console.error('Server error:', errorMessage);
        alert(errorMessage);
        throw new Error(errorMessage);
      }
      
      // Add user message
      if (data.transcript) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: data.transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
        
        // Store in multi-tier memory
        const memoryItem: MemoryItem = {
          id: userMessage.id,
          content: userMessage.content,
          metadata: {
            timestamp: userMessage.timestamp,
            conversationId: conversationIdRef.current,
            userId: user.id,
            accessCount: 1,
            lastAccessed: new Date(),
            source: 'user'
          }
        };
        await memoryManager.store(memoryItem);
      }

      // Add assistant response
      if (data.response) {
        setStatusText('responding');
        setAnimationActive(true);
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: data.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Store assistant response in memory
        const assistantMemoryItem: MemoryItem = {
          id: assistantMessage.id,
          content: assistantMessage.content,
          metadata: {
            timestamp: assistantMessage.timestamp,
            conversationId: conversationIdRef.current,
            userId: user.id,
            accessCount: 1,
            lastAccessed: new Date(),
            source: 'assistant'
          }
        };
        await memoryManager.store(assistantMemoryItem);
        
        // Generate prompt tree predictions
        const context = messages.slice(-5).map(msg => ({
          id: msg.id,
          content: msg.content,
          metadata: {
            timestamp: msg.timestamp,
            conversationId: conversationIdRef.current,
            userId: user.id,
            accessCount: 1,
            lastAccessed: new Date(),
            source: msg.type as 'user' | 'assistant'
          }
        }));
        
        const tree = await memoryManager.predictNext(context);
        setPromptTree(tree);

        // Play audio if available
        if (data.audio) {
          const audio = new Audio(`data:audio/mp3;base64,${data.audio}`);
          audio.onended = () => {
            setStatusText('listening');
            setAnimationActive(false);
          };
          await audio.play();
        } else {
          // If no audio, reset after a delay
          setTimeout(() => {
            setStatusText('listening');
            setAnimationActive(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error processing voice:', error);
      setStatusText('listening');
      setAnimationActive(false);
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextMessage = async () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setStatusText('thinking');

    // Simulate AI response
    setTimeout(() => {
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        type: 'assistant',
        content: "I understand your message. Let me help you with that.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setStatusText('listening');
    }, 1500);
  };
  
  const handleMemoryStrategyChange = async (strategy: MemoryStrategy) => {
    setMemoryStrategy(strategy);
    await memoryManager.switchStrategy(strategy);
    console.log('Switched to memory strategy:', strategy);
  };

  const toggleRecording = () => {
    if (isListening) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleSidebarButtonClick = (panel: 'history' | 'memory' | 'settings' | 'templates') => {
    if (activeSidebarPanel === panel) {
      // Close if clicking the same button
      setSidebarExpanded(false);
      setActiveSidebarPanel(null);
    } else {
      // Open new panel
      setSidebarExpanded(true);
      setActiveSidebarPanel(panel);
    }
  };

  return (
    <div style={{ 
      position: 'relative',
      width: '100%',
      height: '100vh',
      background: '#000',
      color: '#fff',
      overflow: 'hidden',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Helvetica Neue", sans-serif'
    }}>
      {/* Background gradient */}
      <div style={{ 
        position: 'absolute',
        inset: 0,
        background: 'radial-gradient(circle at center, #0a0a0a 0%, #000 70%)',
        zIndex: 0
      }} />

      {/* Ambient particles */}
      <div className="particle" style={{ left: '10%', animation: 'float 20s linear infinite' }}></div>
      <div className="particle" style={{ left: '30%', animation: 'float 25s linear infinite 5s' }}></div>
      <div className="particle" style={{ left: '50%', animation: 'float 22s linear infinite 10s' }}></div>
      <div className="particle" style={{ left: '70%', animation: 'float 28s linear infinite 15s' }}></div>
      <div className="particle" style={{ left: '90%', animation: 'float 24s linear infinite 20s' }}></div>

      {/* Main layout container */}
      <div style={{ 
        position: 'relative',
        zIndex: 1,
        width: '100%',
        height: '100vh',
        display: 'grid',
        gridTemplateColumns: sidebarExpanded ? '400px 1fr 400px' : '80px 1fr 400px',
        gap: 0,
        transition: 'grid-template-columns 0.3s ease'
      }}>
        {/* Sidebar - Icons only by default, expands to show content */}
        <aside style={{ 
          background: 'rgba(255, 255, 255, 0.02)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          display: sidebarExpanded ? 'grid' : 'flex',
          gridTemplateColumns: sidebarExpanded ? '80px 1fr' : undefined,
          flexDirection: sidebarExpanded ? undefined : 'column',
          alignItems: sidebarExpanded ? undefined : 'center',
          padding: sidebarExpanded ? '0' : '24px 0',
          gap: sidebarExpanded ? '0' : '20px',
          height: '100vh',
          transition: 'all 0.3s ease'
        }}>
          {/* Icon buttons column */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '24px 0',
            gap: '20px',
            background: sidebarExpanded ? 'rgba(255, 255, 255, 0.01)' : 'transparent',
            borderRight: sidebarExpanded ? '1px solid rgba(255, 255, 255, 0.03)' : 'none'
          }}>
            {/* History button */}
            <button 
              className="sidebar-button"
              onClick={() => handleSidebarButtonClick('history')}
              style={{
                background: activeSidebarPanel === 'history' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: activeSidebarPanel === 'history' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="tooltip">Chat History</span>
            </button>

            <div className="sidebar-divider" />

            {/* Feature buttons */}
            <button 
              className="sidebar-button"
              onClick={() => handleSidebarButtonClick('templates')}
              style={{
                background: activeSidebarPanel === 'templates' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: activeSidebarPanel === 'templates' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="tooltip">Templates</span>
            </button>

            <button 
              className="sidebar-button"
              onClick={() => handleSidebarButtonClick('memory')}
              style={{
                background: activeSidebarPanel === 'memory' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: activeSidebarPanel === 'memory' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="tooltip">Memory</span>
            </button>

            <button 
              className="sidebar-button"
              onClick={() => handleSidebarButtonClick('settings')}
              style={{
                background: activeSidebarPanel === 'settings' ? 'rgba(255, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.03)',
                borderColor: activeSidebarPanel === 'settings' ? 'rgba(255, 0, 0, 0.3)' : 'rgba(255, 255, 255, 0.08)'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span className="tooltip">Settings</span>
            </button>
          </div>

          {/* Expandable panel content */}
          {sidebarExpanded && activeSidebarPanel && (
            <div style={{
              flex: 1,
              overflow: 'hidden',
              background: 'rgba(255, 255, 255, 0.01)'
            }}>
              {/* History Panel */}
              {activeSidebarPanel === 'history' && (
                <ConversationHistory
                  user={user}
                  currentConversationId={conversationIdRef.current}
                  onSelectConversation={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                />
              )}

              {/* Memory Panel */}
              {activeSidebarPanel === 'memory' && (
                <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
                  <h3 style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '20px'
                  }}>Memory</h3>
                  <UserFactsDisplay />
                </div>
              )}

              {/* Templates Panel */}
              {activeSidebarPanel === 'templates' && (
                <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
                  <h3 style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '20px'
                  }}>Templates</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Email Assistant</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Help with writing professional emails</div>
                    </button>
                    <button style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Code Review</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Analyze and improve your code</div>
                    </button>
                    <button style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '12px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '13px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.3s'
                    }}>
                      <div style={{ fontWeight: 500, marginBottom: '4px' }}>Creative Writing</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>Stories, poems, and creative content</div>
                    </button>
                  </div>
                </div>
              )}

              {/* Settings Panel */}
              {activeSidebarPanel === 'settings' && (
                <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
                  <h3 style={{
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontSize: '16px',
                    fontWeight: 500,
                    letterSpacing: '0.5px',
                    marginBottom: '20px'
                  }}>Settings</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                      <label style={{
                        display: 'block',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '13px',
                        marginBottom: '8px'
                      }}>Voice Speed</label>
                      <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        defaultValue="1"
                        style={{
                          width: '100%',
                          background: 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{
                            width: '16px',
                            height: '16px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '4px'
                          }}
                        />
                        Auto-play responses
                      </label>
                    </div>
                    <div>
                      <label style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: 'rgba(255, 255, 255, 0.7)',
                        fontSize: '13px',
                        cursor: 'pointer'
                      }}>
                        <input
                          type="checkbox"
                          defaultChecked
                          style={{
                            width: '16px',
                            height: '16px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            borderRadius: '4px'
                          }}
                        />
                        Remember conversations
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>

        {/* Center area with voice interface */}
        <main style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}>
          <div style={{ textAlign: 'center' }}>
            {/* KITT Voice Modulator */}
            <div style={{ 
              display: 'inline-flex',
              gap: '40px',
              padding: '60px',
              position: 'relative'
            }}>
              {/* Left Column */}
              <div className="voice-column" id="left" style={{ 
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '4px',
                alignItems: 'center'
              }}>
                {[...Array(10)].map((_, i) => (
                  <div key={`left-${i}`} className="voice-segment" />
                ))}
              </div>
              
              {/* Center Column */}
              <div className="voice-column" id="center" style={{ 
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '4px',
                alignItems: 'center'
              }}>
                {[...Array(10)].map((_, i) => (
                  <div key={`center-${i}`} className="voice-segment" />
                ))}
              </div>
              
              {/* Right Column */}
              <div className="voice-column" id="right" style={{ 
                display: 'flex',
                flexDirection: 'column-reverse',
                gap: '4px',
                alignItems: 'center'
              }}>
                {[...Array(10)].map((_, i) => (
                  <div key={`right-${i}`} className="voice-segment" />
                ))}
              </div>
            </div>

            {/* Status */}
            <div 
              className={`status ${animationActive ? 'active' : ''}`}
              style={{ 
                marginTop: '40px',
                fontSize: '14px',
                fontWeight: 300,
                letterSpacing: '2px',
                textTransform: 'uppercase',
                color: animationActive ? 'rgba(255, 255, 255, 0.8)' : 'rgba(255, 255, 255, 0.3)',
                transition: 'all 0.3s'
              }}
            >
              {statusText}
            </div>

            {/* Voice control button */}
            <button 
              className={`voice-control ${isListening ? 'active' : ''}`}
              onClick={toggleRecording}
              disabled={isProcessing}
              style={{ 
                marginTop: '40px',
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: isListening ? 'rgba(255, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: isListening ? '2px solid rgba(255, 0, 0, 0.3)' : '2px solid rgba(255, 255, 255, 0.08)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.3s',
                position: 'relative',
                overflow: 'hidden'
              }}
            >
              <svg width="32" height="32" viewBox="0 0 20 20" fill={isListening ? '#ff3333' : 'rgba(255, 255, 255, 0.6)'}>
                <path d="M10 3a3 3 0 00-3 3v4a3 3 0 006 0V6a3 3 0 00-3-3z"/>
                <path d="M3.055 11H5a5 5 0 0010 0h1.945a7 7 0 11-13.89 0z"/>
              </svg>
            </button>
          </div>
        </main>

        {/* Right chat area */}
        <aside style={{ 
          background: 'rgba(255, 255, 255, 0.02)',
          borderLeft: '1px solid rgba(255, 255, 255, 0.05)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh'
        }}>
          <div style={{ 
            padding: '24px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <h2 style={{ 
              fontSize: '16px',
              fontWeight: 500,
              color: 'rgba(255, 255, 255, 0.9)',
              letterSpacing: '0.5px'
            }}>Conversation</h2>
          </div>

          <div 
            className="chat-messages"
            style={{ 
              flex: 1,
              overflowY: 'auto',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            {messages.map((message) => (
              <div 
                key={message.id} 
                className={`message ${message.type}`}
                style={{
                  alignSelf: message.type === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  opacity: 0,
                  animation: 'fadeIn 0.5s ease-out forwards'
                }}
              >
                <div 
                  className="message-content"
                  style={{
                    background: message.type === 'user' 
                      ? 'rgba(255, 0, 0, 0.05)' 
                      : 'rgba(255, 255, 255, 0.03)',
                    border: message.type === 'user'
                      ? '1px solid rgba(255, 0, 0, 0.1)'
                      : '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '16px',
                    padding: '12px 16px',
                    fontSize: '14px',
                    lineHeight: 1.6
                  }}
                >
                  {message.content}
                </div>
                <div 
                  className="message-time"
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.3)',
                    marginTop: '6px',
                    padding: '0 4px',
                    textAlign: message.type === 'user' ? 'right' : 'left'
                  }}
                >
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            ))}
          </div>

          <div style={{ 
            padding: '20px',
            borderTop: '1px solid rgba(255, 255, 255, 0.05)'
          }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && sendTextMessage()}
                placeholder="Type your message..."
                className="chat-input-field"
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '12px 16px',
                  color: '#fff',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'all 0.3s'
                }}
              />
              <button
                onClick={sendTextMessage}
                className="send-button"
                style={{
                  width: '40px',
                  height: '40px',
                  background: 'rgba(255, 0, 0, 0.1)',
                  border: '1px solid rgba(255, 0, 0, 0.2)',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.3s'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#ff3333">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                </svg>
              </button>
            </div>
          </div>
        </aside>
      </div>

      <style jsx>{`
        .sidebar-button {
          width: 48px;
          height: 48px;
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s;
          position: relative;
          overflow: hidden;
        }

        .sidebar-button svg {
          width: 24px;
          height: 24px;
          fill: none;
          stroke: rgba(255, 255, 255, 0.5);
          stroke-width: 1.5;
          transition: stroke 0.3s;
        }

        .sidebar-button:hover {
          background: rgba(255, 255, 255, 0.06);
          border-color: rgba(255, 255, 255, 0.15);
          transform: translateY(-2px);
        }

        .sidebar-button:hover svg {
          stroke: rgba(255, 255, 255, 0.8);
        }

        .sidebar-button.active {
          background: rgba(255, 0, 0, 0.1);
          border-color: rgba(255, 0, 0, 0.3);
        }

        .sidebar-button.active svg {
          stroke: #ff3333;
        }

        .tooltip {
          position: absolute;
          left: 100%;
          margin-left: 12px;
          background: rgba(0, 0, 0, 0.9);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 8px 12px;
          font-size: 12px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.3s;
          z-index: 10;
        }

        .sidebar-button:hover .tooltip {
          opacity: 1;
        }

        .sidebar-divider {
          width: 32px;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 12px 0;
        }

        .voice-segment {
          width: 8px;
          height: 20px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 4px;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .voice-segment::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to top, #ff0000, #ff3333);
          opacity: 0;
          transform: scaleY(0);
          transform-origin: bottom;
          transition: all 0.15s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .voice-segment.active::before {
          opacity: 1;
          transform: scaleY(1);
        }

        .voice-segment.active {
          box-shadow: 
            0 0 20px rgba(255, 0, 0, 0.8),
            inset 0 0 10px rgba(255, 255, 255, 0.2);
        }

        .voice-control::before {
          content: '';
          position: absolute;
          inset: -2px;
          border-radius: 50%;
          background: conic-gradient(
            from 0deg,
            transparent,
            rgba(255, 0, 0, 0.3),
            transparent
          );
          opacity: 0;
          transition: opacity 0.3s;
          animation: rotate 3s linear infinite;
        }

        @keyframes rotate {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .voice-control:hover {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
          transform: scale(1.05);
        }

        .voice-control:hover::before {
          opacity: 1;
        }

        .voice-control.active {
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 0 0 rgba(255, 0, 0, 0.4);
          }
          50% {
            box-shadow: 0 0 0 20px rgba(255, 0, 0, 0);
          }
        }

        .voice-control:hover svg {
          fill: rgba(255, 255, 255, 0.8) !important;
        }

        .voice-control.active svg {
          fill: #ff3333 !important;
        }

        .chat-messages::-webkit-scrollbar {
          width: 6px;
        }

        .chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .chat-messages::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
        }

        .chat-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .chat-input-field::placeholder {
          color: rgba(255, 255, 255, 0.3);
        }

        .chat-input-field:focus {
          background: rgba(255, 255, 255, 0.05) !important;
          border-color: rgba(255, 255, 255, 0.15) !important;
        }

        .send-button:hover {
          background: rgba(255, 0, 0, 0.15) !important;
          border-color: rgba(255, 0, 0, 0.3) !important;
        }

        /* Ambient particles */
        .particle {
          position: absolute;
          width: 1px;
          height: 1px;
          background: rgba(255, 255, 255, 0.3);
          border-radius: 50%;
          pointer-events: none;
        }

        @keyframes float {
          0% {
            transform: translateY(100vh) translateX(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100vh) translateX(50px);
            opacity: 0;
          }
        }
      `}</style>
      
      {/* Memory Strategy Selector */}
      <MemoryStrategySelector
        currentStrategy={memoryStrategy}
        onStrategyChange={handleMemoryStrategyChange}
        isMinimized={true}
      />
      
      {/* Prompt Tree Visualizer */}
      {showPromptTree && (
        <PromptTreeVisualizer
          tree={promptTree}
          onNodeSelect={(node) => {
            console.log('Selected prediction:', node);
            // Could auto-fill input with selected prediction
          }}
          isMinimized={false}
        />
      )}
      
      {/* Memory Metrics Display */}
      <div style={{
        position: 'fixed',
        top: '20px',
        left: sidebarExpanded ? '420px' : '100px',
        background: 'rgba(0, 0, 0, 0.9)',
        border: '1px solid rgba(255, 0, 0, 0.2)',
        borderRadius: '8px',
        padding: '8px 16px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.7)',
        display: 'flex',
        gap: '20px',
        transition: 'left 0.3s ease'
      }}>
        <span>STM: {memoryMetrics.itemsInSTM} items</span>
        <span>Hit Rate: {memoryMetrics.hitRate.toFixed(1)}%</span>
        <span>Latency: {memoryMetrics.avgLatency.toFixed(0)}ms</span>
        <span>Trees: {memoryMetrics.activePromptTrees}</span>
      </div>
      
      {/* User Profile Indicator */}
      {userProfile && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '440px',
          background: 'rgba(0, 255, 0, 0.1)',
          border: '1px solid rgba(0, 255, 0, 0.3)',
          borderRadius: '8px',
          padding: '8px 16px',
          fontSize: '12px',
          color: 'rgba(0, 255, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '16px' }}>🧠</span>
          <span>
            {userProfile.name ? `Remembering: ${userProfile.name}` : 'Learning about you...'}
            {userProfile.factsCount > 0 && ` (${userProfile.factsCount} facts)`}
          </span>
        </div>
      )}
    </div>
  );
}