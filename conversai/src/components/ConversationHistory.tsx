'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User } from '@supabase/supabase-js';

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
}

interface ConversationHistoryProps {
  user: User;
  currentConversationId: string;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export default function ConversationHistory({ 
  user, 
  currentConversationId,
  onSelectConversation,
  onNewConversation
}: ConversationHistoryProps) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Get conversations with message count
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          id,
          title,
          created_at,
          updated_at,
          messages (
            id,
            content,
            created_at
          )
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error loading conversations:', error);
        return;
      }

      // Process conversations to include message count and last message
      const processedConversations = data?.map((conv: any) => ({
        id: conv.id,
        title: conv.title || `Conversation ${new Date(conv.created_at).toLocaleDateString()}`,
        created_at: conv.created_at,
        updated_at: conv.updated_at,
        message_count: conv.messages?.length || 0,
        last_message: conv.messages?.[conv.messages.length - 1]?.content?.substring(0, 50) + '...' || ''
      })) || [];

      setConversations(processedConversations);
    } catch (error) {
      console.error('Error in loadConversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!confirm('Are you sure you want to delete this conversation?')) {
      return;
    }

    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      return;
    }

    // Remove from local state
    setConversations(prev => prev.filter(c => c.id !== conversationId));
    
    // If deleting current conversation, start a new one
    if (conversationId === currentConversationId) {
      onNewConversation();
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      background: 'rgba(255, 255, 255, 0.02)',
      borderRight: '1px solid rgba(255, 255, 255, 0.05)'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <h3 style={{
          fontSize: '14px',
          fontWeight: 600,
          color: 'rgba(255, 255, 255, 0.9)',
          letterSpacing: '0.5px',
          textTransform: 'uppercase'
        }}>History</h3>
        
        <button
          onClick={onNewConversation}
          style={{
            background: 'rgba(255, 0, 0, 0.1)',
            border: '1px solid rgba(255, 0, 0, 0.2)',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '12px',
            color: '#ff3333',
            cursor: 'pointer',
            transition: 'all 0.3s'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.15)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.3)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 0, 0, 0.2)';
          }}
        >
          New Chat
        </button>
      </div>

      {/* Conversations List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '12px'
      }}>
        {loading ? (
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '20px',
            color: 'rgba(255, 255, 255, 0.3)'
          }}>
            <div style={{
              display: 'inline-flex',
              gap: '8px'
            }}>
              {[...Array(3)].map((_, i) => (
                <div 
                  key={i}
                  style={{
                    width: '4px',
                    height: '16px',
                    background: 'rgba(255, 0, 0, 0.5)',
                    animation: `pulse 1.5s ease-in-out ${i * 0.15}s infinite`,
                    borderRadius: '2px'
                  }}
                />
              ))}
            </div>
          </div>
        ) : conversations.length === 0 ? (
          <p style={{
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.3)',
            fontSize: '13px',
            padding: '20px'
          }}>
            No conversations yet
          </p>
        ) : (
          conversations.map(conversation => (
            <div
              key={conversation.id}
              onClick={() => onSelectConversation(conversation.id)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                background: conversation.id === currentConversationId 
                  ? 'rgba(255, 0, 0, 0.05)' 
                  : 'rgba(255, 255, 255, 0.02)',
                border: conversation.id === currentConversationId
                  ? '1px solid rgba(255, 0, 0, 0.2)'
                  : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.3s',
                position: 'relative'
              }}
              onMouseEnter={(e) => {
                if (conversation.id !== currentConversationId) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }
              }}
              onMouseLeave={(e) => {
                if (conversation.id !== currentConversationId) {
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.05)';
                }
              }}
            >
              <h4 style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'rgba(255, 255, 255, 0.9)',
                marginBottom: '4px',
                paddingRight: '24px'
              }}>
                {conversation.title}
              </h4>
              
              {conversation.last_message && (
                <p style={{
                  fontSize: '11px',
                  color: 'rgba(255, 255, 255, 0.4)',
                  marginBottom: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  {conversation.last_message}
                </p>
              )}
              
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10px',
                color: 'rgba(255, 255, 255, 0.3)'
              }}>
                <span>{conversation.message_count} messages</span>
                <span>{new Date(conversation.updated_at).toLocaleDateString()}</span>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => deleteConversation(conversation.id, e)}
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'transparent',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.3)',
                  cursor: 'pointer',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.3s',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = '#ff3333';
                  e.currentTarget.style.background = 'rgba(255, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'rgba(255, 255, 255, 0.3)';
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14zM10 11v6M14 11v6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 0.3;
            transform: scaleY(0.8);
          }
          50% {
            opacity: 1;
            transform: scaleY(1);
          }
        }
      `}</style>
    </div>
  );
}