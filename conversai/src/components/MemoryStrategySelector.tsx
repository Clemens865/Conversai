'use client';

import { useState, useEffect } from 'react';

export type MemoryStrategy = 'hierarchical' | 'flat-cache' | 'agent-first' | 'predictive';

interface StrategyInfo {
  id: MemoryStrategy;
  name: string;
  description: string;
  icon: string;
  performance: {
    latency: string;
    accuracy: string;
    memory: string;
  };
}

const strategies: StrategyInfo[] = [
  {
    id: 'hierarchical',
    name: 'Hierarchical Memory',
    description: 'Multi-tier system with STM, WM, and LTM',
    icon: '🏗️',
    performance: {
      latency: '10-50ms',
      accuracy: '95%',
      memory: 'Optimized'
    }
  },
  {
    id: 'flat-cache',
    name: 'Flat Cache',
    description: 'Single tier with intelligent caching',
    icon: '💾',
    performance: {
      latency: '20-100ms',
      accuracy: '92%',
      memory: 'High'
    }
  },
  {
    id: 'agent-first',
    name: 'Agent-First',
    description: 'Distributed agent-based memory',
    icon: '🤖',
    performance: {
      latency: '30-150ms',
      accuracy: '97%',
      memory: 'Distributed'
    }
  },
  {
    id: 'predictive',
    name: 'Predictive Pipeline',
    description: 'Speculative execution with prompt trees',
    icon: '🔮',
    performance: {
      latency: '5-30ms',
      accuracy: '93%',
      memory: 'Variable'
    }
  }
];

interface MemoryStrategySelectorProps {
  currentStrategy: MemoryStrategy;
  onStrategyChange: (strategy: MemoryStrategy) => void;
  isMinimized?: boolean;
}

export default function MemoryStrategySelector({ 
  currentStrategy, 
  onStrategyChange,
  isMinimized = false
}: MemoryStrategySelectorProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [metrics, setMetrics] = useState({
    hitRate: 0,
    avgLatency: 0,
    memoryUsage: 0,
    predictions: 0
  });

  useEffect(() => {
    // Simulate real-time metrics updates
    const interval = setInterval(() => {
      setMetrics({
        hitRate: 85 + Math.random() * 10,
        avgLatency: 20 + Math.random() * 30,
        memoryUsage: 45 + Math.random() * 20,
        predictions: 70 + Math.random() * 20
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [currentStrategy]);

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
            {strategies.find(s => s.id === currentStrategy)?.icon}
          </span>
          <div>
            <div style={{ 
              fontSize: '11px', 
              color: '#ff3333',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              Memory Mode
            </div>
            <div style={{ 
              fontSize: '13px', 
              color: 'rgba(255, 255, 255, 0.8)'
            }}>
              {strategies.find(s => s.id === currentStrategy)?.name}
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
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '20px',
      width: '400px',
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
          Memory Strategy
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

      {/* Current Metrics */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '12px',
        marginBottom: '20px',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.02)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            HIT RATE
          </div>
          <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
            {metrics.hitRate.toFixed(1)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            AVG LATENCY
          </div>
          <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
            {metrics.avgLatency.toFixed(0)}ms
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            MEMORY USE
          </div>
          <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
            {metrics.memoryUsage.toFixed(0)}%
          </div>
        </div>
        <div>
          <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginBottom: '4px' }}>
            PREDICTIONS
          </div>
          <div style={{ fontSize: '18px', color: '#ff3333', fontWeight: 600 }}>
            {metrics.predictions.toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Strategy Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {strategies.map(strategy => (
          <button
            key={strategy.id}
            onClick={() => onStrategyChange(strategy.id)}
            style={{
              padding: '16px',
              background: currentStrategy === strategy.id 
                ? 'rgba(255, 0, 0, 0.1)' 
                : 'rgba(255, 255, 255, 0.02)',
              border: currentStrategy === strategy.id
                ? '1px solid rgba(255, 0, 0, 0.3)'
                : '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s',
              textAlign: 'left'
            }}
            onMouseEnter={(e) => {
              if (currentStrategy !== strategy.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }
            }}
            onMouseLeave={(e) => {
              if (currentStrategy !== strategy.id) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
              }
            }}
          >
            <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>{strategy.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: currentStrategy === strategy.id ? '#ff3333' : 'rgba(255, 255, 255, 0.9)',
                  marginBottom: '4px'
                }}>
                  {strategy.name}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.5)',
                  marginBottom: '8px'
                }}>
                  {strategy.description}
                </div>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '10px',
                  color: 'rgba(255, 255, 255, 0.4)'
                }}>
                  <span>⚡ {strategy.performance.latency}</span>
                  <span>🎯 {strategy.performance.accuracy}</span>
                  <span>💾 {strategy.performance.memory}</span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Info */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: 'rgba(255, 0, 0, 0.05)',
        border: '1px solid rgba(255, 0, 0, 0.1)',
        borderRadius: '8px',
        fontSize: '11px',
        color: 'rgba(255, 255, 255, 0.6)'
      }}>
        💡 Each strategy optimizes for different use cases. Experiment to find the best fit for your conversation style.
      </div>
    </div>
  );
}