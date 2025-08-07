'use client';

import { useState, useEffect } from 'react';
import { factBasedMemoryClient, Fact, FactCategory } from '@/lib/services/memory/factBasedMemorySupabase';
import { createClient } from '@/lib/supabase/client';

interface FactMemoryDisplayProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export default function FactMemoryDisplay({ isOpen = false, onClose }: FactMemoryDisplayProps) {
  const [facts, setFacts] = useState<Fact[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<FactCategory | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadUserFacts();
    }
  }, [isOpen]);

  const loadUserFacts = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        const userFacts = await factBasedMemoryClient.getAllUserFacts(user.id);
        setFacts(userFacts);
      }
    } catch (error) {
      console.error('Error loading facts:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredFacts = facts.filter(fact => {
    const matchesCategory = selectedCategory === 'all' || fact.category === selectedCategory;
    const matchesSearch = !searchTerm || 
      fact.value.toLowerCase().includes(searchTerm.toLowerCase()) ||
      fact.key.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const factsByCategory = facts.reduce((acc, fact) => {
    acc[fact.category] = (acc[fact.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryIcon = (category: FactCategory) => {
    const icons: Record<FactCategory, string> = {
      [FactCategory.IDENTITY]: '👤',
      [FactCategory.LOCATION]: '📍',
      [FactCategory.RELATIONSHIPS]: '❤️',
      [FactCategory.PREFERENCES]: '⭐',
      [FactCategory.ACTIVITIES]: '🎯',
      [FactCategory.HISTORY]: '📅',
      [FactCategory.GOALS]: '🎯',
      [FactCategory.CONTEXT]: '💭'
    };
    return icons[category] || '📝';
  };

  const formatFactKey = (key: string) => {
    // Convert keys like "user.name" to "Name"
    // Convert "pet.cat.holly" to "Pet: Cat Holly"
    const parts = key.split('.');
    if (parts[0] === 'user') {
      return parts.slice(1).map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
    }
    return parts.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(': ');
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(10px)'
    }}>
      <div style={{
        width: '90%',
        maxWidth: '800px',
        maxHeight: '80vh',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '16px',
        padding: '24px',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: 600,
            color: '#ff3333',
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            🧠 Fact-Based Memory
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.6)',
              fontSize: '24px',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <div style={{
            padding: '16px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '8px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '24px', color: '#ff3333', fontWeight: 'bold' }}>
              {facts.length}
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)' }}>
              Total Facts
            </div>
          </div>
          {Object.entries(factsByCategory).map(([category, count]) => (
            <div key={category} style={{
              padding: '16px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              textAlign: 'center',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onClick={() => setSelectedCategory(category as FactCategory)}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
            >
              <div style={{ fontSize: '20px' }}>
                {getCategoryIcon(category as FactCategory)}
              </div>
              <div style={{ fontSize: '16px', color: '#ff3333', fontWeight: 'bold' }}>
                {count}
              </div>
              <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.6)', textTransform: 'capitalize' }}>
                {category}
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as FactCategory | 'all')}
            style={{
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px'
            }}
          >
            <option value="all">All Categories</option>
            {Object.values(FactCategory).map(cat => (
              <option key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </option>
            ))}
          </select>
          
          <input
            type="text"
            placeholder="Search facts..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              padding: '8px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Facts List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            Loading facts...
          </div>
        ) : filteredFacts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255, 255, 255, 0.6)' }}>
            {facts.length === 0 ? 'No facts stored yet. Start a conversation!' : 'No facts match your filter.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {filteredFacts.map(fact => (
              <div
                key={fact.id}
                style={{
                  padding: '16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '8px',
                  transition: 'all 0.3s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'start', gap: '12px' }}>
                  <span style={{ fontSize: '20px' }}>
                    {getCategoryIcon(fact.category)}
                  </span>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{
                        fontSize: '12px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        textTransform: 'uppercase'
                      }}>
                        {formatFactKey(fact.key)}
                      </span>
                      <span style={{
                        fontSize: '10px',
                        padding: '2px 6px',
                        background: fact.confidence > 0.8 ? 'rgba(0, 255, 0, 0.2)' : 'rgba(255, 165, 0, 0.2)',
                        borderRadius: '4px',
                        color: fact.confidence > 0.8 ? 'rgba(0, 255, 0, 0.9)' : 'rgba(255, 165, 0, 0.9)'
                      }}>
                        {Math.round(fact.confidence * 100)}% confident
                      </span>
                    </div>
                    <div style={{
                      fontSize: '16px',
                      color: 'rgba(255, 255, 255, 0.9)',
                      marginBottom: '8px'
                    }}>
                      {fact.value}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontStyle: 'italic'
                    }}>
                      From: "{fact.rawText}"
                    </div>
                    <div style={{
                      display: 'flex',
                      gap: '16px',
                      marginTop: '8px',
                      fontSize: '10px',
                      color: 'rgba(255, 255, 255, 0.4)'
                    }}>
                      <span>Accessed: {fact.accessCount} times</span>
                      <span>Updated: {new Date(fact.updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div style={{
          marginTop: '24px',
          padding: '16px',
          background: 'rgba(255, 165, 0, 0.1)',
          border: '1px solid rgba(255, 165, 0, 0.3)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(255, 165, 0, 0.9)'
        }}>
          💡 This fact-based memory system stores structured information from your conversations. 
          Facts with higher confidence scores override older ones with the same key. 
          The system learns and improves over time!
        </div>

        {/* Debug Actions */}
        <div style={{
          marginTop: '16px',
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={async () => {
              if (confirm('This will clear all facts from memory. Are you sure?')) {
                if (userId) {
                  await factBasedMemoryClient.clearUserFacts(userId);
                  loadUserFacts();
                }
              }
            }}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 0, 0, 0.1)',
              border: '1px solid rgba(255, 0, 0, 0.3)',
              borderRadius: '6px',
              color: '#ff3333',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
            }}
          >
            Clear All Facts
          </button>
          
          <button
            onClick={loadUserFacts}
            style={{
              padding: '8px 16px',
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'rgba(255, 255, 255, 0.8)',
              fontSize: '12px',
              cursor: 'pointer',
              transition: 'all 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
            }}
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}