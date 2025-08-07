'use client';

import { useState, useEffect } from 'react';
import { modeRegistry } from '@/lib/modes/registry';
import { ConversationMode } from '@/lib/modes/types';

interface SettingsPanelProps {
  currentMode: ConversationMode | null;
  onModeChange: (modeId: string) => void;
}

export default function SettingsPanel({ currentMode, onModeChange }: SettingsPanelProps) {
  const [availableModes, setAvailableModes] = useState<any[]>([]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    loadModes();
  }, []);

  const loadModes = async () => {
    const modes = await modeRegistry.getModeMetadata();
    setAvailableModes(modes);
  };

  const handleModeSwitch = async (modeId: string) => {
    if (modeId === currentMode?.id || isTransitioning) return;
    
    setIsTransitioning(true);
    
    try {
      // Switch mode in registry
      const success = await modeRegistry.switchMode(modeId);
      
      if (success) {
        // Notify parent component
        onModeChange(modeId);
      }
    } catch (error) {
      console.error('Error switching mode:', error);
      alert('Failed to switch mode. Please try again.');
    } finally {
      setTimeout(() => {
        setIsTransitioning(false);
      }, 1000);
    }
  };

  return (
    <div style={{ padding: '24px', overflowY: 'auto', height: '100%' }}>
      <h3 style={{
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: '16px',
        fontWeight: 500,
        letterSpacing: '0.5px',
        marginBottom: '20px'
      }}>Settings</h3>

      {/* AI Mode Selection */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{
          display: 'block',
          color: 'rgba(255, 255, 255, 0.7)',
          fontSize: '13px',
          marginBottom: '12px',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>AI Mode Selection</label>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {availableModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => handleModeSwitch(mode.id)}
              disabled={isTransitioning}
              style={{
                padding: '16px',
                background: currentMode?.id === mode.id 
                  ? 'rgba(255, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: currentMode?.id === mode.id
                  ? '2px solid rgba(255, 0, 0, 0.3)'
                  : '2px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left',
                opacity: isTransitioning ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (currentMode?.id !== mode.id && !isTransitioning) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentMode?.id !== mode.id && !isTransitioning) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                <span style={{ fontSize: '24px' }}>{mode.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: currentMode?.id === mode.id ? '#ff3333' : 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '4px'
                  }}>
                    {mode.name}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '8px',
                    lineHeight: 1.4
                  }}>
                    {mode.description}
                  </div>
                  
                  {/* Badges */}
                  {mode.badges && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {mode.badges.map((badge: string) => (
                        <span
                          key={badge}
                          style={{
                            padding: '3px 6px',
                            background: currentMode?.id === mode.id 
                              ? 'rgba(255, 0, 0, 0.2)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            color: currentMode?.id === mode.id 
                              ? '#ff3333' 
                              : 'rgba(255, 255, 255, 0.6)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px'
                          }}
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Strategic Approaches Info */}
      <div style={{
        marginBottom: '24px',
        padding: '12px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '8px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <h4 style={{
          fontSize: '12px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>Strategic Approaches</h4>
        <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '6px' }}>
            <strong style={{ color: '#ff3333' }}>Cloud-Based:</strong> Maximum quality, advanced features
          </div>
          <div>
            <strong style={{ color: '#ff3333' }}>Local-First:</strong> Privacy focused, instant response
          </div>
        </div>
      </div>

      {/* Current Mode Details */}
      {currentMode && (
        <div style={{ marginBottom: '24px' }}>
          <label style={{
            display: 'block',
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            marginBottom: '8px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>Current Mode Details</label>
          
          {/* Voice Provider */}
          <div style={{
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '8px'
          }}>
            <strong>Voice:</strong> {currentMode.features.voiceProvider}
          </div>
          
          {/* AI Model */}
          <div style={{
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '8px'
          }}>
            <strong>AI:</strong> {currentMode.features.aiModel}
          </div>
          
          {/* Storage */}
          <div style={{
            padding: '12px',
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '6px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.7)',
            marginBottom: '8px'
          }}>
            <strong>Storage:</strong> {currentMode.features.memoryType}
          </div>
          
          {/* Metrics */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginTop: '12px'
          }}>
            <div style={{
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                SPEED
              </div>
              <div style={{ fontSize: '14px', color: '#ff3333', fontWeight: 600 }}>
                {currentMode.getMetrics().latency}%
              </div>
            </div>
            <div style={{
              padding: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '6px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '2px' }}>
                PRIVACY
              </div>
              <div style={{ fontSize: '14px', color: '#ff3333', fontWeight: 600 }}>
                {currentMode.getMetrics().privacy}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Future Modes Preview */}
      <div style={{
        padding: '12px',
        background: 'rgba(255, 165, 0, 0.05)',
        border: '1px solid rgba(255, 165, 0, 0.2)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255, 165, 0, 0.9)'
      }}>
        <strong>Coming Soon:</strong> Gemini Ultra (Multimodal), Llama Local (100% Offline), OpenAI Realtime (Voice-to-Voice)
      </div>

      {/* Transition Overlay */}
      {isTransitioning && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{
              width: '60px',
              height: '60px',
              margin: '0 auto 20px',
              border: '3px solid rgba(255, 0, 0, 0.2)',
              borderTopColor: '#ff3333',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{
              color: '#ff3333',
              fontSize: '16px',
              letterSpacing: '2px',
              textTransform: 'uppercase'
            }}>
              Switching Mode...
            </p>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}