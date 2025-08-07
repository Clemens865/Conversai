'use client';

import { useState, useEffect } from 'react';

export type ConversationApproach = 'memory-hierarchical' | 'claude-local-first';

interface ApproachInfo {
  id: ConversationApproach;
  name: string;
  description: string;
  icon: string;
  features: {
    voiceProvider: string;
    aiModel: string;
    memoryType: string;
    privacy: string;
  };
  badges: string[];
}

const approaches: ApproachInfo[] = [
  {
    id: 'memory-hierarchical',
    name: 'Memory Mode',
    description: 'Hierarchical memory with Supabase, ElevenLabs & GPT-4',
    icon: '🧠',
    features: {
      voiceProvider: 'ElevenLabs + Deepgram',
      aiModel: 'GPT-4',
      memoryType: 'Vector + Hierarchical',
      privacy: 'Cloud-based'
    },
    badges: ['Premium Voice', 'Advanced Memory', 'Cloud Sync']
  },
  {
    id: 'claude-local-first',
    name: 'Claude Local-First',
    description: 'Privacy-focused with browser-native voice & Claude AI',
    icon: '🔒',
    features: {
      voiceProvider: 'Web Speech API',
      aiModel: 'Claude 3 Opus',
      memoryType: 'FSM + IndexedDB',
      privacy: 'Local-first'
    },
    badges: ['Privacy', 'Instant Voice', 'Offline Ready']
  }
];

interface ApproachSelectorProps {
  currentApproach: ConversationApproach;
  onApproachChange: (approach: ConversationApproach) => void;
  isMinimized?: boolean;
}

export default function ApproachSelector({ 
  currentApproach, 
  onApproachChange,
  isMinimized = false
}: ApproachSelectorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [performance, setPerformance] = useState({
    latency: 0,
    accuracy: 0,
    privacy: 0,
    cost: 0
  });

  useEffect(() => {
    // Update performance metrics based on approach
    if (currentApproach === 'memory-hierarchical') {
      setPerformance({
        latency: 65,
        accuracy: 92,
        privacy: 40,
        cost: 85
      });
    } else {
      setPerformance({
        latency: 95,
        accuracy: 88,
        privacy: 95,
        cost: 30
      });
    }
  }, [currentApproach]);

  const handleApproachChange = async (approach: ConversationApproach) => {
    if (approach === currentApproach || isTransitioning) return;
    
    setIsTransitioning(true);
    
    // Show transition UI
    setTimeout(() => {
      onApproachChange(approach);
      setIsTransitioning(false);
    }, 1000);
  };

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
            {approaches.find(a => a.id === currentApproach)?.icon}
          </span>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: '#ff3333',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              AI Approach
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              {approaches.find(a => a.id === currentApproach)?.name}
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
              Switching Approach...
            </p>
          </div>
        </div>
      )}

      {/* Main Selector */}
      <div style={{
        position: 'fixed',
        bottom: '20px',
        left: '20px',
        width: '480px',
        background: 'rgba(0, 0, 0, 0.98)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        zIndex: 1000,
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.8)'
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
            AI Approach Selection
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

        {/* Performance Comparison */}
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

        {/* Approach Options */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {approaches.map(approach => (
            <button
              key={approach.id}
              onClick={() => handleApproachChange(approach.id)}
              disabled={isTransitioning}
              style={{
                padding: '20px',
                background: currentApproach === approach.id 
                  ? 'rgba(255, 0, 0, 0.1)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: currentApproach === approach.id
                  ? '2px solid rgba(255, 0, 0, 0.3)'
                  : '2px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                cursor: isTransitioning ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s',
                textAlign: 'left',
                opacity: isTransitioning ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (currentApproach !== approach.id && !isTransitioning) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (currentApproach !== approach.id && !isTransitioning) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'start', gap: '16px' }}>
                <span style={{ fontSize: '32px' }}>{approach.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: currentApproach === approach.id ? '#ff3333' : 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '4px'
                  }}>
                    {approach.name}
                  </div>
                  <div style={{
                    fontSize: '13px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    marginBottom: '12px',
                    lineHeight: 1.4
                  }}>
                    {approach.description}
                  </div>
                  
                  {/* Feature Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px',
                    marginBottom: '12px',
                    fontSize: '11px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    <div>🎤 {approach.features.voiceProvider}</div>
                    <div>🤖 {approach.features.aiModel}</div>
                    <div>💾 {approach.features.memoryType}</div>
                    <div>🔐 {approach.features.privacy}</div>
                  </div>
                  
                  {/* Badges */}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {approach.badges.map(badge => (
                      <span
                        key={badge}
                        style={{
                          padding: '4px 8px',
                          background: currentApproach === approach.id 
                            ? 'rgba(255, 0, 0, 0.2)' 
                            : 'rgba(255, 255, 255, 0.1)',
                          borderRadius: '4px',
                          fontSize: '10px',
                          color: currentApproach === approach.id 
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
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Warning */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'rgba(255, 165, 0, 0.1)',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '11px',
          color: 'rgba(255, 165, 0, 0.9)'
        }}>
          ⚠️ Switching approaches will save your current conversation and start fresh with the new system.
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