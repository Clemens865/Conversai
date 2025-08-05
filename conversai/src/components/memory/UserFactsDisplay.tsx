'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { User, MapPin, Heart, Calendar, Briefcase, Users, Pill, FolderOpen } from 'lucide-react';

interface UserFacts {
  name?: string;
  pets?: any[];
  locations?: Record<string, string>;
  relationships?: any[];
  preferences?: Record<string, string[]>;
  importantDates?: Record<string, string>;
  medical?: Record<string, string[]>;
  work?: Record<string, string>;
}

interface Category {
  id: string;
  name: string;
  type: string;
  fact_count: number;
  facts: any[];
  themes: string[];
}

export default function UserFactsDisplay() {
  const [facts, setFacts] = useState<UserFacts | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCategories, setShowCategories] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadUserFacts();
  }, []);

  const loadUserFacts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Load user profile
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name, profile_data')
        .eq('id', user.id)
        .single();

      if (profile) {
        const profileData = profile.profile_data || {};
        // Handle both old and new data structures
        const personalFacts = profileData.personalFacts || profileData.facts || {};
        
        setFacts({
          name: profile.name || profileData.name,
          pets: personalFacts.pets,
          locations: personalFacts.locations,
          relationships: personalFacts.relationships,
          preferences: personalFacts.preferences || profileData.preferences?.interests,
          importantDates: personalFacts.importantDates,
          medical: personalFacts.medical,
          work: personalFacts.work,
        });
      }

      // Load categories
      const { data: categoriesData } = await supabase
        .from('memory_categories')
        .select('*')
        .eq('user_id', user.id)
        .order('fact_count', { ascending: false });

      if (categoriesData) {
        setCategories(categoriesData);
      }
    } catch (error) {
      console.error('Error loading facts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ 
          color: 'rgba(255, 255, 255, 0.5)', 
          fontSize: '14px' 
        }}>Loading memory...</div>
      </div>
    );
  }

  if (!facts || Object.keys(facts).length === 0) {
    return (
      <div style={{ 
        height: '100%', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        textAlign: 'center',
        padding: '40px'
      }}>
        <p style={{ 
          color: 'rgba(255, 255, 255, 0.4)', 
          fontSize: '14px',
          lineHeight: 1.6
        }}>No facts stored yet.<br />Start talking to build your memory!</p>
      </div>
    );
  }

  return (
    <div style={{ 
      height: '100%',
      overflowY: 'auto',
      padding: '0'
    }}>
      <div style={{
        padding: '24px',
        borderBottom: '1px solid rgba(255, 255, 255, 0.05)'
      }}>
        <h3 style={{ 
          color: 'rgba(255, 255, 255, 0.9)', 
          fontSize: '16px',
          fontWeight: 500,
          letterSpacing: '0.5px',
          margin: 0
        }}>What I Remember</h3>
      </div>
      
      <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Name */}
        {facts.name && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
            <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px' }}>
              Name: {facts.name}
            </span>
          </div>
        )}

        {/* Pets */}
        {facts.pets && facts.pets.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>🐾</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Pets:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {facts.pets.map((pet, idx) => (
                <div key={idx} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {pet.name && `${pet.name}`}
                  {pet.species && ` (${pet.species})`}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Locations */}
        {facts.locations && Object.keys(facts.locations).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <MapPin style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Locations:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {Object.entries(facts.locations).map(([type, location]) => (
                <div key={type} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {type}: {location}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relationships */}
        {facts.relationships && facts.relationships.length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Users style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Relationships:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {facts.relationships.map((rel, idx) => (
                <div key={idx} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {rel.relationship}: {rel.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Preferences */}
        {facts.preferences && Object.keys(facts.preferences).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Heart style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Preferences:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {Object.entries(facts.preferences).map(([type, items]) => (
                <div key={type} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {type}: {Array.isArray(items) ? items.join(', ') : items}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Work */}
        {facts.work && Object.keys(facts.work).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Briefcase style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Work:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {Object.entries(facts.work).map(([key, value]) => (
                <div key={key} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {value}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Important Dates */}
        {facts.importantDates && Object.keys(facts.importantDates).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Calendar style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Important Dates:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {Object.entries(facts.importantDates).map(([type, date]) => (
                <div key={type} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {type}: {date}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Medical */}
        {facts.medical && Object.keys(facts.medical).length > 0 && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Pill style={{ width: '16px', height: '16px', color: 'rgba(255, 255, 255, 0.6)' }} />
              <span style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '14px', fontWeight: 500 }}>
                Medical:
              </span>
            </div>
            <div style={{ marginLeft: '24px' }}>
              {Object.entries(facts.medical).map(([type, items]) => (
                <div key={type} style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '13px' }}>
                  {type}: {Array.isArray(items) ? items.join(', ') : items}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Category View Toggle */}
        <div style={{ 
          marginTop: '20px', 
          paddingTop: '20px', 
          borderTop: '1px solid rgba(255, 255, 255, 0.05)' 
        }}>
          <button
            onClick={() => setShowCategories(!showCategories)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'rgba(255, 0, 0, 0.8)',
              fontSize: '13px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: 0,
              transition: 'color 0.3s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'rgba(255, 0, 0, 1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'rgba(255, 0, 0, 0.8)';
            }}
          >
            <FolderOpen style={{ width: '16px', height: '16px' }} />
            {showCategories ? 'Hide' : 'Show'} Memory Categories
          </button>
        </div>

        {/* Categories Display */}
        {showCategories && categories.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.8)', 
              fontSize: '13px', 
              fontWeight: 500,
              marginBottom: '12px'
            }}>
              Memory Organization:
            </div>
            {categories.map((category) => (
              <div key={category.id} style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                padding: '12px',
                marginBottom: '8px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px'
                }}>
                  <span style={{ 
                    color: 'rgba(255, 255, 255, 0.8)', 
                    fontSize: '13px', 
                    fontWeight: 500 
                  }}>{category.name}</span>
                  <span style={{ 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    fontSize: '11px' 
                  }}>{category.fact_count} facts</span>
                </div>
                {category.themes.length > 0 && (
                  <div style={{ 
                    color: 'rgba(255, 255, 255, 0.5)', 
                    fontSize: '11px' 
                  }}>
                    Themes: {category.themes.join(', ')}
                  </div>
                )}
                {category.facts && category.facts.length > 0 && (
                  <div style={{ 
                    marginTop: '8px', 
                    color: 'rgba(255, 255, 255, 0.4)', 
                    fontSize: '11px' 
                  }}>
                    {category.facts.slice(0, 2).map((fact: any, idx: number) => (
                      <div key={idx} style={{ 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        whiteSpace: 'nowrap' 
                      }}>
                        • {fact.type}: {typeof fact.value === 'object' ? JSON.stringify(fact.value) : fact.value}
                      </div>
                    ))}
                    {category.facts.length > 2 && (
                      <div style={{ color: 'rgba(255, 255, 255, 0.3)' }}>
                        ...and {category.facts.length - 2} more
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <div style={{ 
              color: 'rgba(255, 255, 255, 0.4)', 
              fontSize: '11px', 
              marginTop: '12px' 
            }}>
              Categories evolve as you share more information
            </div>
          </div>
        )}
      </div>
    </div>
  );
}