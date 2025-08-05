# Learning Mode Architecture for ConversAI

## Overview

Learning Mode is an intelligent conversation feature that allows ConversAI to proactively learn about users through natural, adaptive questioning. When activated, the AI assistant engages in discovery conversations to build a comprehensive understanding of the user's life, preferences, and personality.

## Core Principles

1. **Natural Flow**: Questions feel conversational, not like a survey
2. **Adaptive Depth**: Follow-ups based on user engagement and comfort
3. **Respectful Boundaries**: Users can skip or redirect at any time
4. **Progressive Learning**: Start broad, go deeper over time
5. **Contextual Relevance**: Questions relate to ongoing conversations

## 1. System Architecture Components

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                    Learning Mode System                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Question      │  │   Session       │  │   Conflict      │ │
│  │   Generator     │  │   Manager       │  │   Detector      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│           │                     │                     │         │
│           ▼                     ▼                     ▼         │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Learning State Engine                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                              │                                   │
│                              ▼                                   │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │              Memory Integration Layer                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                 Existing Memory System                          │
├─────────────────────────────────────────────────────────────────┤
│  Categories  │  Embeddings  │  User Profiles  │  Persistence    │
└─────────────────────────────────────────────────────────────────┘
```

### Data Flow Architecture

```
User Input → Question Generator → Learning State Engine
                     ↓
             Session Manager → Conflict Detector
                     ↓
          Memory Integration Layer → Existing Memory System
                     ↓
              Updated User Profile
```

## 2. Component Specifications

### Question Generator
- **Purpose**: Generate contextually relevant questions based on current knowledge gaps
- **Input**: User profile, conversation context, learning objectives
- **Output**: Prioritized question with confidence score
- **Algorithm**: Knowledge graph analysis + semantic similarity + user engagement patterns

### Session Manager
- **Purpose**: Handle session lifecycle (start, pause, resume, end)
- **State**: Active questions, completion status, session metadata
- **Persistence**: Session snapshots with resumption context
- **Recovery**: Graceful handling of interrupted sessions

### Conflict Detector
- **Purpose**: Identify contradictions between new and existing information
- **Strategy**: Semantic contradiction analysis + confidence scoring
- **Resolution**: Present conflicts to user for clarification
- **Learning**: Update confidence scores based on resolution outcomes

### Learning State Engine
- **Purpose**: Central orchestration of learning process
- **Functions**: Progress tracking, adaptive strategy selection, completion detection
- **State**: Current knowledge map, learning objectives, session progress

## 3. State Management Approach

### Session State Structure
```json
{
  "sessionId": "uuid-v4",
  "userId": "user-identifier",
  "startTime": "2025-08-04T22:25:00Z",
  "lastActivity": "2025-08-04T22:30:00Z",
  "status": "active|paused|completed",
  "currentQuestion": {
    "id": "question-uuid",
    "text": "What are your primary work responsibilities?",
    "category": "professional",
    "priority": 0.8,
    "attempts": 1
  },
  "completedQuestions": [
    {
      "id": "question-uuid-1",
      "answer": "Software architect",
      "confidence": 0.9,
      "timestamp": "2025-08-04T22:26:00Z"
    }
  ],
  "knowledgeGaps": [
    {
      "category": "hobbies",
      "priority": 0.6,
      "questions": ["hobby-question-1", "hobby-question-2"]
    }
  ],
  "conflicts": [
    {
      "id": "conflict-uuid",
      "type": "contradiction",
      "newInfo": "Frontend developer",
      "existingInfo": "Backend developer",
      "confidence": 0.7,
      "status": "pending"
    }
  ]
}
```

### State Persistence Strategy
- **Active Session**: In-memory state with periodic checkpoints
- **Session Snapshots**: Full state serialization for resume capability
- **Incremental Updates**: Delta-based updates to reduce I/O overhead
- **Backup Strategy**: Redundant storage with conflict resolution

## 4. Memory System Integration Points

### Integration Architecture
```
Learning Mode ←→ Memory Integration Layer ←→ Existing Memory System
                        │
                        ├── Categories Mapping
                        ├── Embeddings Generation
                        ├── Profile Updates
                        └── Conflict Resolution
```

### Integration Specifications

#### Categories Integration
- **Mapping**: Learning categories to existing memory categories
- **Extension**: Dynamic category creation for new knowledge domains
- **Hierarchy**: Nested category support for complex knowledge structures

#### Embeddings Integration
- **Generation**: Real-time embedding creation for new knowledge
- **Similarity**: Semantic similarity search for related information
- **Clustering**: Automatic grouping of related knowledge points

#### Profile Updates
- **Merge Strategy**: Conflict-aware profile merging
- **Versioning**: Profile version tracking for rollback capability
- **Synchronization**: Real-time updates to user profile

## 5. Conflict Detection and Resolution Workflow

### Detection Algorithm
```
1. New Information Received
   ├── Extract semantic concepts
   ├── Search existing knowledge base
   ├── Calculate semantic similarity
   └── Identify potential conflicts

2. Conflict Analysis
   ├── Assess confidence scores
   ├── Evaluate information sources
   ├── Determine conflict severity
   └── Generate resolution strategy

3. Resolution Process
   ├── Present conflict to user
   ├── Collect clarification
   ├── Update knowledge base
   └── Learn from resolution
```

### Conflict Types
- **Direct Contradiction**: Explicitly opposing statements
- **Semantic Conflict**: Implied contradictions through context
- **Temporal Conflict**: Information that conflicts due to time changes
- **Source Conflict**: Different sources providing conflicting information

### Resolution Strategies
- **User Clarification**: Direct user input to resolve conflicts
- **Confidence Weighting**: Prefer higher confidence information
- **Temporal Precedence**: Prefer more recent information
- **Source Authority**: Prefer trusted information sources

## 6. Session Persistence Implementation

### Persistence Layers
```
┌─────────────────────────────────────────┐
│           Application Layer             │
├─────────────────────────────────────────┤
│        Session State Manager           │
├─────────────────────────────────────────┤
│       Persistence Abstraction          │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐  │
│  │   Memory    │  │   File System   │  │
│  │   Storage   │  │    Storage      │  │
│  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

### Storage Strategy
- **Hot State**: Active session data in memory
- **Warm State**: Recent session snapshots in file system
- **Cold State**: Historical session data in persistent storage
- **Recovery**: Multi-tier recovery with progressive fallback

### Session Lifecycle
```
1. Session Creation
   ├── Generate unique session ID
   ├── Initialize state structure
   ├── Create checkpoint
   └── Begin learning process

2. Session Execution
   ├── Process user responses
   ├── Update state incrementally
   ├── Create periodic checkpoints
   └── Handle interruptions gracefully

3. Session Pause/Resume
   ├── Serialize complete state
   ├── Store resumption context
   ├── Clear active memory
   └── Restore from checkpoint

4. Session Completion
   ├── Finalize learning outcomes
   ├── Update user profile
   ├── Archive session data
   └── Cleanup temporary state
```

## 7. Implementation Priorities

### Phase 1: Core Components (High Priority)
- Learning State Engine
- Basic Question Generator
- Session Manager with pause/resume
- Memory Integration Layer

### Phase 2: Advanced Features (Medium Priority)
- Conflict Detection and Resolution
- Adaptive Questioning Algorithm
- Advanced Session Persistence
- Performance Optimization

### Phase 3: Enhancement (Low Priority)
- Machine Learning Integration
- Advanced Analytics
- Multi-user Support
- External API Integration

## 8. Technical Specifications

### Performance Requirements
- **Response Time**: < 200ms for question generation
- **Session Size**: Support up to 1000 questions per session
- **Concurrent Sessions**: Support 100+ active sessions
- **Data Throughput**: Handle 10MB/session state data

### Scalability Considerations
- **Horizontal Scaling**: Stateless service design
- **Caching Strategy**: Multi-level caching for performance
- **Database Sharding**: User-based partitioning
- **API Rate Limiting**: Prevent abuse and ensure fairness

### Security Requirements
- **Data Encryption**: End-to-end encryption for sensitive data
- **Access Control**: Role-based access to learning data
- **Audit Logging**: Complete audit trail for all operations
- **Privacy Protection**: GDPR-compliant data handling

## 9. Question Bank Design

### Question Categories and Examples

```typescript
interface QuestionTemplate {
  id: string;
  category: string;
  subcategory?: string;
  question: string;
  followUps: FollowUp[];
  sensitivity: 'low' | 'medium' | 'high';
  requiredContext?: string[];
}

const questionBank = {
  personal: [
    {
      id: 'personal_hobbies',
      question: "I'd love to get to know you better! What do you enjoy doing in your free time?",
      followUps: [
        {
          condition: 'mentions_activity',
          questions: [
            "That sounds interesting! How long have you been into {activity}?",
            "What got you started with {activity}?",
            "Do you have any favorite {activity} memories?"
          ]
        }
      ],
      sensitivity: 'low'
    },
    {
      id: 'personal_routine',
      question: "Everyone has their own rhythm - are you more of a morning person or a night owl?",
      followUps: [
        {
          condition: 'morning_person',
          questions: ["What's your favorite part about mornings?"]
        },
        {
          condition: 'night_person',
          questions: ["What do you like to do in the late hours?"]
        }
      ],
      sensitivity: 'low'
    }
  ],
  
  work: [
    {
      id: 'work_current',
      question: "What kind of work do you do? I'm curious about your professional life.",
      followUps: [
        {
          condition: 'mentions_job',
          questions: [
            "How do you like working in {field}?",
            "What's the most rewarding part of your job?",
            "What challenges do you face in your work?"
          ]
        }
      ],
      sensitivity: 'medium'
    },
    {
      id: 'work_aspirations',
      question: "Where do you see your career heading? Any exciting goals on the horizon?",
      sensitivity: 'medium'
    }
  ],
  
  family: [
    {
      id: 'family_general',
      question: "If you're comfortable sharing, do you have family nearby?",
      followUps: [
        {
          condition: 'positive_response',
          questions: ["That's nice! Do you get to see them often?"]
        },
        {
          condition: 'negative_response',
          questions: ["I understand. Let's talk about something else!"]
        }
      ],
      sensitivity: 'high'
    }
  ],
  
  preferences: [
    {
      id: 'pref_food',
      question: "Are you a foodie? What kind of cuisine do you enjoy most?",
      followUps: [
        {
          condition: 'mentions_cuisine',
          questions: [
            "Do you have a favorite {cuisine} dish?",
            "Do you like cooking {cuisine} food yourself?"
          ]
        }
      ],
      sensitivity: 'low'
    },
    {
      id: 'pref_entertainment',
      question: "When you want to relax, do you prefer watching something, reading, or maybe gaming?",
      sensitivity: 'low'
    }
  ],
  
  interests: [
    {
      id: 'interest_learning',
      question: "Is there something new you've been wanting to learn or explore?",
      followUps: [
        {
          condition: 'mentions_topic',
          questions: [
            "What draws you to {topic}?",
            "Have you taken any steps toward learning {topic}?"
          ]
        }
      ],
      sensitivity: 'low'
    },
    {
      id: 'interest_travel',
      question: "Do you enjoy traveling? Any memorable trips or dream destinations?",
      sensitivity: 'low'
    }
  ]
};
```

## 10. Natural Conversation Examples

### Example 1: Hobby Discovery Flow
```
AI: "I'd love to get to know you better! What do you enjoy doing in your free time?"
User: "I really enjoy hiking and taking photos"
AI: "That's a wonderful combination! Do you take your camera on your hikes? I imagine you must capture some beautiful landscapes."
User: "Yes! I especially love photographing wildlife and sunrises"
AI: "Wildlife photography requires so much patience! Have you had any particularly memorable encounters while shooting?"
User: "Once I waited 3 hours to photograph a family of foxes"
AI: "That's incredible dedication! Was it worth the wait? I'd love to hear about it."

[System learns: hobbies=hiking,photography; interests=wildlife,nature; traits=patient,dedicated]
```

### Example 2: Professional Life
```
AI: "What kind of work do you do? I'm curious about your professional life."
User: "I'm a software engineer, mostly working on web applications"
AI: "That's great! The web development world moves so fast. What technologies are you working with these days?"
User: "Mainly React and Node.js, but I'm learning Rust on the side"
AI: "Rust is fascinating! What made you interested in learning it? Is it for a specific project or just general curiosity?"
User: "I want to build more performant backend services"
AI: "Performance optimization is so satisfying. Are you working on any personal projects with Rust, or is this more for future work applications?"

[System learns: job=software_engineer; skills=React,Node.js,Rust; interests=performance,backend]
```

### Example 3: Handling Boundaries
```
AI: "If you're comfortable sharing, do you have family nearby?"
User: "I'd rather not talk about family"
AI: "Of course, I completely understand! Let me ask you something different - have you discovered any great restaurants or cafes lately?"
User: "Actually yes, there's this amazing Thai place that opened downtown"
AI: "Oh nice! I love Thai food. What's your go-to dish there?"

[System learns: boundaries=family_topics; preferences=Thai_food; local_knowledge=downtown_area]
```

## 11. Implementation in ConversAI

### Database Schema Extensions

```sql
-- Add to existing Supabase schema
CREATE TABLE user_facts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(50),
  fact_key VARCHAR(100) NOT NULL,
  fact_value JSONB NOT NULL,
  confidence FLOAT DEFAULT 1.0,
  source VARCHAR(50) DEFAULT 'learning_mode',
  learned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_confirmed TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}',
  embedding vector(1536), -- for semantic search
  UNIQUE(user_id, fact_key)
);

CREATE TABLE learning_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,
  state JSONB NOT NULL DEFAULT '{}',
  facts_learned INTEGER DEFAULT 0,
  categories_explored TEXT[] DEFAULT '{}',
  completion_rate FLOAT DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

-- Indexes for performance
CREATE INDEX idx_user_facts_user_category ON user_facts(user_id, category);
CREATE INDEX idx_user_facts_embedding ON user_facts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_learning_sessions_active ON learning_sessions(user_id, is_active) WHERE is_active = true;
```

### Integration with Existing Components

```typescript
// Extend MinimalPureInterface.tsx
import { LearningModeManager } from '@/lib/services/learning/learningModeManager';

export default function MinimalPureInterface({ user }: MinimalPureInterfaceProps) {
  const [isLearningMode, setIsLearningMode] = useState(false);
  const [learningSession, setLearningSession] = useState<LearningSession | null>(null);
  const learningManager = useRef(new LearningModeManager());

  const toggleLearningMode = async () => {
    if (!isLearningMode) {
      const session = await learningManager.current.startSession(user.id);
      setLearningSession(session);
      setIsLearningMode(true);
      
      // Get first question
      const question = await learningManager.current.getNextQuestion();
      if (question) {
        // Add to conversation
        setMessages(prev => [...prev, {
          id: crypto.randomUUID(),
          type: 'assistant',
          content: question.text,
          timestamp: new Date(),
          metadata: { learningMode: true, questionId: question.id }
        }]);
      }
    } else {
      await learningManager.current.endSession();
      setIsLearningMode(false);
      setLearningSession(null);
    }
  };

  // Add visual indicator
  return (
    <>
      {isLearningMode && (
        <div className="learning-mode-indicator">
          <Brain className="animate-pulse" />
          <span>Learning Mode Active</span>
          <button onClick={toggleLearningMode}>Exit</button>
        </div>
      )}
      {/* Rest of the interface */}
    </>
  );
}
```

### Learning Mode Service

```typescript
// New file: src/lib/services/learning/learningModeManager.ts
import { supabase } from '@/lib/supabase/client';
import { questionBank } from './questionBank';
import { FactExtractor } from './factExtractor';

export class LearningModeManager {
  private currentSession: LearningSession | null = null;
  private factExtractor = new FactExtractor();
  
  async startSession(userId: string): Promise<LearningSession> {
    // Check for existing active session
    const { data: existingSession } = await supabase
      .from('learning_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .single();
    
    if (existingSession) {
      this.currentSession = existingSession;
      return existingSession;
    }
    
    // Create new session
    const { data: newSession } = await supabase
      .from('learning_sessions')
      .insert({
        user_id: userId,
        state: {
          askedQuestions: [],
          currentCategory: null,
          knowledgeGaps: this.identifyKnowledgeGaps(userId)
        }
      })
      .select()
      .single();
    
    this.currentSession = newSession;
    return newSession;
  }
  
  async getNextQuestion(): Promise<Question | null> {
    if (!this.currentSession) return null;
    
    // Smart question selection logic
    const gaps = this.currentSession.state.knowledgeGaps;
    const asked = this.currentSession.state.askedQuestions;
    
    // Find best question based on:
    // 1. Knowledge gaps
    // 2. User engagement
    // 3. Category diversity
    // 4. Question dependencies
    
    const candidates = this.filterQuestions(questionBank, asked, gaps);
    return this.selectBestQuestion(candidates);
  }
  
  async processResponse(response: string): Promise<ProcessedResponse> {
    const facts = await this.factExtractor.extract(response);
    
    // Save facts to database
    for (const fact of facts) {
      await this.saveFact(fact);
    }
    
    // Update session state
    await this.updateSessionState({
      factsLearned: facts.length,
      lastResponse: response
    });
    
    // Get follow-up question
    const followUp = await this.getFollowUpQuestion(response, facts);
    
    return {
      factsExtracted: facts,
      followUpQuestion: followUp,
      shouldContinue: this.assessEngagement(response)
    };
  }
}
```

## 12. UI/UX Design

### Visual Indicators
- **Learning Mode Badge**: Pulsing brain icon when active
- **Progress Bar**: Shows category completion
- **Skip Button**: Always visible for boundary respect
- **Fact Counter**: Real-time display of facts learned

### Conversation UI Modifications
```css
/* Learning mode styles */
.learning-mode-active {
  .message-assistant {
    border-left: 3px solid #60a5fa; /* Blue accent for learning questions */
  }
  
  .learning-indicator {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(96, 165, 250, 0.1);
    border: 1px solid #60a5fa;
    padding: 8px 16px;
    border-radius: 20px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .skip-question-btn {
    opacity: 0.7;
    transition: opacity 0.2s;
    
    &:hover {
      opacity: 1;
    }
  }
}
```

## 13. Privacy and User Control

### User Rights Dashboard
```typescript
// Component for managing learned facts
export function UserFactsManager() {
  const [facts, setFacts] = useState<UserFact[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  
  return (
    <div className="facts-manager">
      <h2>What I've Learned About You</h2>
      
      {categories.map(category => (
        <CategorySection key={category}>
          <h3>{category}</h3>
          {facts.filter(f => f.category === category).map(fact => (
            <FactItem key={fact.id}>
              <span>{fact.fact_key}: {fact.fact_value}</span>
              <button onClick={() => editFact(fact.id)}>Edit</button>
              <button onClick={() => deleteFact(fact.id)}>Delete</button>
            </FactItem>
          ))}
        </CategorySection>
      ))}
      
      <div className="actions">
        <button onClick={exportFacts}>Export My Data</button>
        <button onClick={clearAllFacts}>Clear All Facts</button>
      </div>
    </div>
  );
}
```

## 14. Success Metrics and Analytics

### Key Performance Indicators
1. **Engagement Rate**: % of users who activate Learning Mode
2. **Session Duration**: Average time spent in Learning Mode
3. **Facts Per Session**: Average number of facts learned
4. **Question Effectiveness**: Response rate per question type
5. **User Satisfaction**: Post-session feedback scores

### Analytics Implementation
```typescript
// Track learning mode events
analytics.track('learning_mode_started', {
  userId: user.id,
  sessionId: session.id,
  timestamp: new Date()
});

analytics.track('fact_learned', {
  userId: user.id,
  category: fact.category,
  confidence: fact.confidence
});

analytics.track('question_skipped', {
  userId: user.id,
  questionId: question.id,
  category: question.category
});
```