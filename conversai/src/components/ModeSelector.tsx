'use client';

import { useState, useEffect } from 'react';
import { modeRegistry } from '@/lib/modes/registry';

interface ModeSelectorProps {
  onModeChange?: (modeId: string) => void;
  isMinimized?: boolean;
}

export default function ModeSelector({ 
  onModeChange,
  isMinimized = true
}: ModeSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [currentModeId, setCurrentModeId] = useState<string | null>(null);
  const [availableModes, setAvailableModes] = useState<any[]>([]);
  const [performance, setPerformance] = useState({
    latency: 0,
    accuracy: 0,
    privacy: 0,
    cost: 0
  });

  useEffect(() => {
    // Load available modes
    loadModes();
    
    // Set initial mode
    const initialMode = modeRegistry.getCurrentModeId() || 'memory-hierarchical';
    setCurrentModeId(initialMode);
    
    // Listen for mode changes
    const handleModeChange = (modeId: string) => {
      setCurrentModeId(modeId);
      updatePerformance(modeId);
    };
    
    modeRegistry.addModeChangeListener(handleModeChange);
    
    return () => {
      modeRegistry.removeModeChangeListener(handleModeChange);
    };
  }, []);

  const loadModes = async () => {
    const modes = await modeRegistry.getModeMetadata();
    setAvailableModes(modes);
  };

  const updatePerformance = async (modeId: string) => {
    const mode = await modeRegistry.getMode(modeId);
    if (mode) {
      const metrics = mode.getMetrics();
      setPerformance({
        latency: metrics.latency,
        accuracy: metrics.accuracy,
        privacy: metrics.privacy,
        cost: metrics.cost
      });
    }
  };

  const handleModeSwitch = async (modeId: string) => {
    if (modeId === currentModeId || isTransitioning) return;
    
    setIsTransitioning(true);
    
    try {
      // Switch mode in registry
      const success = await modeRegistry.switchMode(modeId);
      
      if (success) {
        // Notify parent component
        onModeChange?.(modeId);
        
        // Update local state
        setCurrentModeId(modeId);
        updatePerformance(modeId);
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

  const currentMode = availableModes.find(m => m.id === currentModeId);

  if (isMinimized) {
    return (
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '12px',
        padding: '12px',
        cursor: 'pointer',
        transition: 'all 0.3s',
        zIndex: 1000
      }}
      onClick={() => setShowDetails(true)}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.5)';
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
        e.currentTarget.style.transform = 'scale(1)';
      }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '20px' }}>
            {currentMode?.icon || '⚡'}
          </span>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: '#ff3333',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              AI Mode
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              {currentMode?.name || 'Loading...'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!showDetails && !isMinimized) {
    return null;
  }

  return (
    <>
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

      {/* Main Selector */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '520px',
        maxHeight: '80vh',
        background: 'rgba(0, 0, 0, 0.98)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ff3333',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            AI Mode Selection
          </h3>
          <button
            onClick={() => setShowDetails(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              cursor: 'pointer',
              padding: '4px',
              fontSize: '18px'
            }}
          >
            ×
          </button>
        </div>

        {/* Performance Metrics */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '12px',
          marginBottom: '20px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              SPEED
            </div>
            <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
              {performance.latency}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              ACCURACY
            </div>
            <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
              {performance.accuracy}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              PRIVACY
            </div>
            <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
              {performance.privacy}%
            </div>
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
              COST
            </div>
            <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
              ${performance.cost}
            </div>
          </div>
        </div>

        {/* Mode Options */}
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          gap: '12px',
          marginBottom: '16px' 
        }}>
          {availableModes.map(mode => (
            <button
              key={mode.id}
              onClick={() => handleModeSwitch(mode.id)}
              disabled={isTransitioning || !mode.isLoaded}
              style={{
                padding: '20px',
                background: currentModeId === mode.id 
                  ? 'rgba(255, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: currentModeId === mode.id
                  ? '2px solid rgba(255, 0, 0, 0.3)'
                  : '2px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                cursor: isTransitioning || !mode.isLoaded ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left',
                opacity: isTransitioning || !mode.isLoaded ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (currentModeId !== mode.id && !isTransitioning && mode.isLoaded) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentModeId !== mode.id && !isTransitioning) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                <span style={{ fontSize: '32px' }}>{mode.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: currentModeId === mode.id ? '#ff3333' : 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '4px'
                  }}>
                    {mode.name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '12px',
                    lineHeight: 1.4
                  }}>
                    {mode.description}
                  </div>
                  
                  {/* Feature Grid */}
                  {mode.features && Object.keys(mode.features).length > 0 && (
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px',
                      marginBottom: '12px',
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.5)'
                    }}>
                      <div>🎤 {mode.features.voiceProvider}</div>
                      <div>🤖 {mode.features.aiModel}</div>
                      <div>💾 {mode.features.memoryType}</div>
                      <div>🔐 {mode.features.privacy}</div>
                    </div>
                  )}
                  
                  {/* Badges */}
                  {mode.badges && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {mode.badges.map((badge: string) => (
                        <span
                          key={badge}
                          style={{
                            padding: '4px 8px',
                            background: currentModeId === mode.id 
                              ? 'rgba(255, 0, 0, 0.2)' 
                              : 'rgba(255, 255, 255, 0.1)',
                            borderRadius: '4px',
                            fontSize: '10px',
                            color: currentModeId === mode.id 
                              ? '#ff3333' 
                              : 'rgba(255, 255, 255, 0.6)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
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

        {/* Strategic Approaches Section */}
        <div style={{
          marginBottom: '16px',
          padding: '16px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.05)'
        }}>
          <h4 style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'rgba(255, 255, 255, 0.8)',
            marginBottom: '12px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>Strategic Approaches</h4>
          <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', lineHeight: 1.6 }}>
            <div style={{ marginBottom: '8px' }}>
              <strong style={{ color: '#ff3333' }}>Cloud-Based:</strong> Maximum quality, advanced features, requires internet
            </div>
            <div>
              <strong style={{ color: '#ff3333' }}>Local-First:</strong> Privacy focused, instant response, works offline
            </div>
          </div>
        </div>

        {/* Add New Mode Button */}
        <button
          style={{
            width: '100%',
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '2px dashed rgba(255, 255, 255, 0.2)',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.3s',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.4)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
          }}
          onClick={() => alert('Add new mode feature coming soon!')}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>➕</span>
            <span style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Add Custom Mode
            </span>
          </div>
        </button>

        {/* Info */}
        <div style={{
          padding: '12px',
          background: 'rgba(255, 165, 0, 0.1)',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'rgba(255, 165, 0, 0.9)'
        }}>
          💡 Each mode is completely isolated with its own voice, AI, and storage systems. Add new modes easily!
        </div>
      </div>

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
}