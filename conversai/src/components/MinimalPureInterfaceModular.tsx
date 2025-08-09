'use client';

import React, { useState, useRef, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import ConversationHistory from './ConversationHistory';
import ModeSelector from './ModeSelector';
import SettingsPanel from './SettingsPanel';
import PromptTreeVisualizer from './PromptTreeVisualizer';
import UserFactsDisplay from './memory/UserFactsDisplay';
import LocalMemoryDisplay from './LocalMemoryDisplay';
import { modeRegistry, registerAllModes } from '@/lib/modes/registry';
import { ConversationMode } from '@/lib/modes/types';
import { ClaudeLocalFirstMode } from '@/lib/modes/claude-local-first';
import { ClaudeLocalFirstVoice } from '@/lib/modes/claude-local-first/voice';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface MinimalPureInterfaceModularProps {
  user: User;
}

export default function MinimalPureInterfaceModular({ user }: MinimalPureInterfaceModularProps) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusText, setStatusText] = useState('initializing');
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [animationActive, setAnimationActive] = useState(false);
  const [currentMode, setCurrentMode] = useState<ConversationMode | null>(null);
  const [showPromptTree, setShowPromptTree] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [activeSidebarPanel, setActiveSidebarPanel] = useState<'history' | 'memory' | 'settings' | 'templates' | null>(null);
  
  const conversationIdRef = useRef<string>('');
  const recordingStartTimeRef = useRef<number>(0);

  // Initialize mode system and load default mode
  useEffect(() => {
    const initializeModes = async () => {
      // Register all available modes
      await registerAllModes();
      
      // Initialize default mode
      const defaultModeId = 'claude-local-first';
      await modeRegistry.switchMode(defaultModeId);
      
      const mode = modeRegistry.getCurrentMode();
      if (mode) {
        setCurrentMode(mode);
        setStatusText('listening');
        
        // For Claude Local-First mode, try to load existing conversation
        if (mode.id === 'claude-local-first') {
          try {
            const { localFirstStorage } = await import('@/lib/services/memory/localFirstStorage');
            await localFirstStorage.initialize();
            const conversations = await localFirstStorage.getUserConversations('local-user');
            
            if (conversations.length > 0) {
              // Use the most recent conversation
              const mostRecent = conversations.sort((a, b) => 
                b.metadata.updated.getTime() - a.metadata.updated.getTime()
              )[0];
              conversationIdRef.current = mostRecent.id;
              console.log('Continuing existing conversation:', conversationIdRef.current);
              
              // Set greeting with user's name if available
              const userName = mostRecent.userProfile.name;
              setMessages([{
                id: '1',
                type: 'assistant',
                content: userName 
                  ? `Welcome back, ${userName}! I remember our previous conversations. How can I help you today?`
                  : getGreetingForMode(mode.id),
                timestamp: new Date()
              }]);
            } else {
              // No existing conversations, create new
              conversationIdRef.current = crypto.randomUUID();
              console.log('New conversation started:', conversationIdRef.current);
              setMessages([{
                id: '1',
                type: 'assistant',
                content: getGreetingForMode(mode.id),
                timestamp: new Date()
              }]);
            }
          } catch (error) {
            console.error('Error loading existing conversations:', error);
            conversationIdRef.current = crypto.randomUUID();
            setMessages([{
              id: '1',
              type: 'assistant',
              content: getGreetingForMode(mode.id),
              timestamp: new Date()
            }]);
          }
        } else {
          // Other modes - create new conversation
          conversationIdRef.current = crypto.randomUUID();
          console.log('New conversation started:', conversationIdRef.current);
          setMessages([{
            id: '1',
            type: 'assistant',
            content: getGreetingForMode(mode.id),
            timestamp: new Date()
          }]);
        }
      }
    };
    
    initializeModes();
  }, [user]);

  const getGreetingForMode = (modeId: string): string => {
    switch (modeId) {
      case 'memory-hierarchical':
        return `Hello ${user.email?.split('@')[0] || 'there'}! I'm using advanced memory systems to remember our conversations. How can I assist you today?`;
      case 'claude-local-first':
        return `Hello! I'm now using the Claude Local-First approach. Your conversations are more private, and I'll respond instantly. How can I help you today?`;
      default:
        return `Hello ${user.email?.split('@')[0] || 'there'}. I'm ready to assist you. How can I help today?`;
    }
  };

  // Handle mode changes
  const handleModeChange = async (modeId: string) => {
    console.log('Switching to mode:', modeId);
    
    // Get the new mode
    const mode = modeRegistry.getCurrentMode();
    if (mode) {
      setCurrentMode(mode);
      
      // For Claude Local-First mode, try to continue existing conversation
      if (mode.id === 'claude-local-first') {
        try {
          const { localFirstStorage } = await import('@/lib/services/memory/localFirstStorage');
          await localFirstStorage.initialize();
          const conversations = await localFirstStorage.getUserConversations('local-user');
          
          if (conversations.length > 0) {
            // Use the most recent conversation
            const mostRecent = conversations.sort((a, b) => 
              b.metadata.updated.getTime() - a.metadata.updated.getTime()
            )[0];
            conversationIdRef.current = mostRecent.id;
            console.log('Continuing existing conversation:', conversationIdRef.current);
            
            // Set greeting with user's name if available
            const userName = mostRecent.userProfile.name;
            setMessages([{
              id: '1',
              type: 'assistant',
              content: userName 
                ? `Welcome back, ${userName}! I've switched to the Claude Local-First mode and still remember you.`
                : getGreetingForMode(modeId),
              timestamp: new Date()
            }]);
          } else {
            // No existing conversations, create new
            conversationIdRef.current = crypto.randomUUID();
            setMessages([{
              id: '1',
              type: 'assistant',
              content: getGreetingForMode(modeId),
              timestamp: new Date()
            }]);
          }
        } catch (error) {
          console.error('Error loading existing conversations:', error);
          conversationIdRef.current = crypto.randomUUID();
          setMessages([{
            id: '1',
            type: 'assistant',
            content: getGreetingForMode(modeId),
            timestamp: new Date()
          }]);
        }
      } else {
        // Other modes - create new conversation
        conversationIdRef.current = crypto.randomUUID();
        setMessages([{
          id: '1',
          type: 'assistant',
          content: getGreetingForMode(modeId),
          timestamp: new Date()
        }]);
      }
      
      setStatusText('listening');
    }
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
    if (!currentMode) {
      console.error('No mode selected');
      return;
    }
    
    try {
      setIsListening(true);
      setStatusText('listening');
      setAnimationActive(true);
      recordingStartTimeRef.current = Date.now();
      
      // Special handling for modes with transcript callbacks
      if (currentMode.id === 'claude-local-first') {
        const voice = currentMode.voice as ClaudeLocalFirstVoice;
        
        // Set up transcript callback
        voice.setTranscriptCallback(async (transcript: string) => {
          setIsListening(false);
          setStatusText('processing');
          setAnimationActive(false);
          
          // Process the transcript
          await processTranscript(transcript);
        });
        
        await voice.startRecording();
      } else if (currentMode.id === 'markdown-library') {
        // Markdown Library mode uses Web Speech API
        const voice = currentMode.voice as any;
        
        if (voice.setTranscriptCallback) {
          voice.setTranscriptCallback(async (transcript: string) => {
            setIsListening(false);
            setStatusText('processing');
            setAnimationActive(false);
            
            // Process the transcript through the mode
            const mode = currentMode as any;
            if (mode.processTranscript) {
              await mode.processTranscript(transcript);
              setStatusText('listening');
            }
          });
        }
        
        await voice.startRecording();
      } else {
        // Standard recording for other modes
        await currentMode.voice.startRecording();
      }
    } catch (error) {
      console.error('Error starting recording:', error);
      setIsListening(false);
      setStatusText('listening');
      setAnimationActive(false);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  const stopRecording = async () => {
    if (!currentMode || !isListening) return;
    
    const recordingDuration = Date.now() - recordingStartTimeRef.current;
    
    // Ensure minimum recording duration (500ms) for non-Claude modes
    if (currentMode.id !== 'claude-local-first' && recordingDuration < 500) {
      console.log('Recording too short:', recordingDuration, 'ms');
      alert('Please hold the button longer and speak clearly.');
      currentMode.voice.stopRecording();
      setIsListening(false);
      setStatusText('listening');
      setAnimationActive(false);
      return;
    }
    
    currentMode.voice.stopRecording();
    
    // For non-Claude modes, process the audio
    if (currentMode.id !== 'claude-local-first') {
      setIsListening(false);
      setStatusText('processing');
      setAnimationActive(false);
      
      // Get audio blob and process
      const audioBlob = (currentMode.voice as any).getAudioBlob?.();
      if (audioBlob) {
        await processAudio(audioBlob);
      }
    }
  };

  const processTranscript = async (transcript: string) => {
    if (!currentMode) return;
    
    setIsProcessing(true);
    
    try {
      // Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        type: 'user',
        content: transcript,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Process with current mode
      let result;
      if (currentMode.id === 'claude-local-first') {
        // Use special method for Claude mode
        result = await (currentMode as ClaudeLocalFirstMode).processTranscript(
          transcript,
          conversationIdRef.current
        );
      } else {
        // Use standard text processing
        result = await currentMode.processText(transcript, conversationIdRef.current);
      }
      
      // Add assistant response
      if (result.response) {
        setStatusText('responding');
        setAnimationActive(true);
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: result.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // For Claude mode, speech synthesis is handled internally
        if (currentMode.id !== 'claude-local-first' && result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.onended = () => {
            setStatusText('listening');
            setAnimationActive(false);
          };
          await audio.play();
        } else if (currentMode.id === 'claude-local-first') {
          // Wait for synthesis to complete
          setTimeout(() => {
            setStatusText('listening');
            setAnimationActive(false);
          }, 500);
        } else {
          // No audio, reset after a delay
          setTimeout(() => {
            setStatusText('listening');
            setAnimationActive(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error processing transcript:', error);
      setStatusText('listening');
      setAnimationActive(false);
      alert('Failed to process your message. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processAudio = async (audioBlob: Blob) => {
    if (!currentMode) return;
    
    setIsProcessing(true);
    
    try {
      // Process with current mode
      const result = await currentMode.processAudio(audioBlob, conversationIdRef.current);
      
      // Add user message
      if (result.transcript) {
        const userMessage: Message = {
          id: `user-${Date.now()}`,
          type: 'user',
          content: result.transcript,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, userMessage]);
      }
      
      // Add assistant response
      if (result.response) {
        setStatusText('responding');
        setAnimationActive(true);
        
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}`,
          type: 'assistant',
          content: result.response,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Play audio if available
        if (result.audioUrl) {
          const audio = new Audio(result.audioUrl);
          audio.onended = () => {
            setStatusText('listening');
            setAnimationActive(false);
          };
          await audio.play();
        } else {
          // No audio, reset after a delay
          setTimeout(() => {
            setStatusText('listening');
            setAnimationActive(false);
          }, 2000);
        }
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      setStatusText('listening');
      setAnimationActive(false);
      alert('Failed to process audio. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const sendTextMessage = async () => {
    if (!inputValue.trim() || !currentMode) return;
    
    const text = inputValue;
    setInputValue('');
    
    await processTranscript(text);
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

  // Handle conversation selection
  const handleSelectConversation = async (conversationId: string) => {
    if (!currentMode) return;
    
    try {
      // Load messages for selected conversation
      const messages = await currentMode.storage.getConversationHistory(conversationId);
      
      // Convert to UI format
      const formattedMessages: Message[] = messages.map((msg: any) => ({
        id: msg.id,
        type: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.timestamp
      }));
      
      // Add initial greeting if no messages
      if (formattedMessages.length === 0) {
        formattedMessages.push({
          id: '1',
          type: 'assistant',
          content: getGreetingForMode(currentMode.id),
          timestamp: new Date()
        });
      }
      
      setMessages(formattedMessages);
      conversationIdRef.current = conversationId;
    } catch (error) {
      console.error('Error loading conversation:', error);
    }
  };

  const handleNewConversation = () => {
    conversationIdRef.current = crypto.randomUUID();
    setMessages([{
      id: '1',
      type: 'assistant',
      content: currentMode ? getGreetingForMode(currentMode.id) : 'Hello! How can I help you?',
      timestamp: new Date()
    }]);
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
        {/* Sidebar */}
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
            borderRight: sidebarExpanded ? '1px solid rgba(255, 255, 255, 0.03)' : 'none',
            width: sidebarExpanded ? '80px' : 'auto',
            minWidth: sidebarExpanded ? '80px' : 'auto'
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

            {/* Memory button */}
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

            {/* Settings button */}
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
                  {currentMode?.id === 'claude-local-first' ? (
                    <LocalMemoryDisplay 
                      isOpen={true}
                      embedded={true}
                      onClose={() => setActiveSidebarPanel(null)}
                    />
                  ) : (
                    <UserFactsDisplay />
                  )}
                </div>
              )}

              {/* Settings Panel */}
              {activeSidebarPanel === 'settings' && (
                <SettingsPanel
                  currentMode={currentMode}
                  onModeChange={handleModeChange}
                />
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
      
      {/* Mode Selector - Hidden since it's now in Settings */}
      {/* <ModeSelector
        onModeChange={handleModeChange}
        isMinimized={true}
      /> */}
      
      {/* Mode Metrics Display */}
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
        alignItems: 'center',
        gap: '20px',
        transition: 'left 0.3s ease'
      }}>
        <span>Mode: {currentMode?.name || 'Loading...'}</span>
        {currentMode && (
          <>
            <span>Latency: {currentMode.getMetrics().latency}%</span>
            <span>Privacy: {currentMode.getMetrics().privacy}%</span>
            <span style={{ 
              color: 'rgba(255, 255, 255, 0.5)', 
              fontSize: '10px',
              marginLeft: '8px'
            }}>
              ⚙️ Switch modes in Settings
            </span>
          </>
        )}
      </div>
    </div>
  );
}