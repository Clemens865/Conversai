'use client';

import { useState, useEffect } from 'react';
import { localFirstStorage, LocalConversationState } from '@/lib/services/memory/localFirstStorage';

interface LocalMemoryDisplayProps {
  isOpen?: boolean;
  onClose?: () => void;
  embedded?: boolean;  // For embedding in sidebar
}

export default function LocalMemoryDisplay({ isOpen = false, onClose, embedded = false }: LocalMemoryDisplayProps) {
  const [conversations, setConversations] = useState<LocalConversationState[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<LocalConversationState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen || embedded) {
      loadConversations();
    }
  }, [isOpen, embedded]);

  const loadConversations = async () => {
    setLoading(true);
    try {
      // Load all conversations for the local user
      const userConversations = await localFirstStorage.getUserConversations('local-user');
      setConversations(userConversations);
      if (userConversations.length > 0 && !selectedConversation) {
        setSelectedConversation(userConversations[0]);
      }
    } catch (error) {
      console.error('Error loading conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportConversation = async (conv: LocalConversationState) => {
    try {
      const json = await localFirstStorage.exportConversation(conv.id);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `conversation-${conv.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error exporting conversation:', error);
    }
  };

  const deleteConversation = async (conv: LocalConversationState) => {
    if (!confirm('Delete this conversation? This cannot be undone.')) return;
    
    try {
      await localFirstStorage.deleteState(conv.id);
      loadConversations();
      setSelectedConversation(null);
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };

  if (!isOpen && !embedded) return null;

  // Embedded mode - simplified for sidebar
  if (embedded) {
    return (
      <div style={{ width: '100%', height: '100%' }}>
        <div style={{
          padding: '12px',
          background: 'rgba(0, 255, 0, 0.05)',
          border: '1px solid rgba(0, 255, 0, 0.2)',
          borderRadius: '8px',
          fontSize: '12px',
          color: 'rgba(0, 255, 0, 0.9)',
          marginBottom: '16px'
        }}>
          🔒 Local Storage Only
        </div>
        
        {loading ? (
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
            Loading conversations...
          </div>
        ) : conversations.length === 0 ? (
          <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
            No local conversations yet. Start talking to create one!
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '8px' }}>
              {conversations.length} conversation{conversations.length !== 1 ? 's' : ''} stored locally
            </div>
            {conversations.map((conv) => (
              <div
                key={conv.id}
                style={{
                  padding: '12px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '6px',
                  fontSize: '12px',
                  color: 'rgba(255, 255, 255, 0.8)'
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <strong>{conv.userProfile.name || 'Anonymous'}</strong> - {conv.currentState}
                </div>
                <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)' }}>
                  {conv.shortTermMemory.length} messages • {conv.userProfile.facts.length} facts
                </div>
                <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => exportConversation(conv)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '4px',
                      color: 'rgba(255, 255, 255, 0.7)',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Export
                  </button>
                  <button
                    onClick={() => deleteConversation(conv)}
                    style={{
                      padding: '4px 8px',
                      background: 'rgba(255, 0, 0, 0.05)',
                      border: '1px solid rgba(255, 0, 0, 0.2)',
                      borderRadius: '4px',
                      color: 'rgba(255, 0, 0, 0.7)',
                      fontSize: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Modal mode - full screen with sidebar
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
        maxWidth: '900px',
        maxHeight: '80vh',
        background: 'rgba(0, 0, 0, 0.95)',
        border: '1px solid rgba(255, 0, 0, 0.3)',
        borderRadius: '16px',
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Sidebar */}
        <div style={{
          width: '250px',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          padding: '24px',
          overflowY: 'auto'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: 600,
            color: '#ff3333',
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            🔒 Local Conversations
          </h3>
          
          {loading ? (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '12px' }}>
              No conversations yet
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => setSelectedConversation(conv)}
                  style={{
                    padding: '12px',
                    background: selectedConversation?.id === conv.id 
                      ? 'rgba(255, 0, 0, 0.1)' 
                      : 'rgba(255, 255, 255, 0.02)',
                    border: selectedConversation?.id === conv.id
                      ? '1px solid rgba(255, 0, 0, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.3s'
                  }}
                >
                  <div style={{
                    fontSize: '12px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    marginBottom: '4px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {conv.userProfile.name || 'Anonymous'} - {conv.currentState}
                  </div>
                  <div style={{
                    fontSize: '10px',
                    color: 'rgba(255, 255, 255, 0.5)'
                  }}>
                    {conv.shortTermMemory.length} messages • {conv.userProfile.facts.length} facts
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Content */}
        <div style={{
          flex: 1,
          padding: '24px',
          overflowY: 'auto',
          position: 'relative'
        }}>
          {onClose && (
            <button
              onClick={onClose}
              style={{
                position: 'absolute',
                top: '24px',
                right: '24px',
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
          )}

          {selectedConversation ? (
            <>
              <h2 style={{
                fontSize: '20px',
                fontWeight: 600,
                color: '#ff3333',
                marginBottom: '24px'
              }}>
                Conversation Details
              </h2>

              {/* User Profile */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '12px'
                }}>
                  👤 User Profile
                </h4>
                <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <div>Name: {selectedConversation.userProfile.name || 'Not set'}</div>
                  <div>State: {selectedConversation.currentState}</div>
                  <div>Interactions: {selectedConversation.metadata.interactionCount}</div>
                </div>
              </div>

              {/* Facts */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '12px'
                }}>
                  💡 Known Facts ({selectedConversation.userProfile.facts.length})
                </h4>
                {selectedConversation.userProfile.facts.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    No facts stored yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedConversation.userProfile.facts.map((fact, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        <div>{fact.fact}</div>
                        <div style={{
                          fontSize: '10px',
                          color: 'rgba(255, 255, 255, 0.5)',
                          marginTop: '4px'
                        }}>
                          Confidence: {Math.round(fact.confidence * 100)}% • 
                          {new Date(fact.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Messages */}
              <div style={{
                marginBottom: '24px',
                padding: '16px',
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <h4 style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: 'rgba(255, 255, 255, 0.8)',
                  marginBottom: '12px'
                }}>
                  💬 Recent Messages
                </h4>
                {selectedConversation.shortTermMemory.length === 0 ? (
                  <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.5)' }}>
                    No messages yet
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {selectedConversation.shortTermMemory.map((msg, index) => (
                      <div
                        key={index}
                        style={{
                          padding: '8px',
                          background: msg.role === 'user' 
                            ? 'rgba(255, 0, 0, 0.05)' 
                            : 'rgba(255, 255, 255, 0.02)',
                          borderRadius: '4px',
                          fontSize: '12px',
                          color: 'rgba(255, 255, 255, 0.8)'
                        }}
                      >
                        <div style={{
                          fontSize: '10px',
                          color: msg.role === 'user' ? '#ff3333' : 'rgba(255, 255, 255, 0.6)',
                          marginBottom: '4px',
                          fontWeight: 600
                        }}>
                          {msg.role.toUpperCase()}
                        </div>
                        <div>{msg.content}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div style={{
                display: 'flex',
                gap: '12px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => selectedConversation && exportConversation(selectedConversation)}
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
                >
                  📥 Export
                </button>
                
                <button
                  onClick={() => selectedConversation && deleteConversation(selectedConversation)}
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
                >
                  🗑️ Delete
                </button>
              </div>
            </>
          ) : (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'rgba(255, 255, 255, 0.5)'
            }}>
              Select a conversation to view details
            </div>
          )}

          {/* Privacy Notice */}
          <div style={{
            marginTop: '24px',
            padding: '16px',
            background: 'rgba(0, 255, 0, 0.05)',
            border: '1px solid rgba(0, 255, 0, 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
            color: 'rgba(0, 255, 0, 0.9)'
          }}>
            🔒 All data is stored locally in your browser using IndexedDB. 
            No conversation data is sent to any server. 
            You can export and delete your data at any time.
          </div>
        </div>
      </div>
    </div>
  );
}