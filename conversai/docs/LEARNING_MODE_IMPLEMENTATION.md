# Learning Mode Implementation Guide

## Quick Start Implementation Plan

### Phase 1: Database Setup (Day 1)

1. **Create Migration File**
```sql
-- File: supabase/migrations/create_learning_mode_tables.sql
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
  embedding vector(1536),
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

-- Indexes
CREATE INDEX idx_user_facts_user_category ON user_facts(user_id, category);
CREATE INDEX idx_user_facts_embedding ON user_facts USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX idx_learning_sessions_active ON learning_sessions(user_id, is_active) WHERE is_active = true;
```

2. **Run Migration**
```bash
npx supabase db push
```

### Phase 2: Core Services (Day 2-3)

1. **Create Question Bank**
```typescript
// File: src/lib/services/learning/questionBank.ts
export const questionBank = {
  personal: [
    {
      id: 'personal_hobbies',
      question: "I'd love to get to know you better! What do you enjoy doing in your free time?",
      followUps: [
        {
          condition: 'mentions_activity',
          questions: [
            "That sounds interesting! How long have you been into {activity}?",
            "What got you started with {activity}?"
          ]
        }
      ],
      sensitivity: 'low'
    }
    // Add more questions...
  ],
  work: [
    // Work-related questions...
  ],
  // Other categories...
};
```

2. **Create Learning Mode Manager**
```typescript
// File: src/lib/services/learning/learningModeManager.ts
import { createClient } from '@/lib/supabase/client';
import { questionBank } from './questionBank';

export class LearningModeManager {
  private supabase = createClient();
  
  async startSession(userId: string) {
    // Implementation from architecture doc
  }
  
  async getNextQuestion() {
    // Implementation from architecture doc
  }
  
  async processResponse(response: string) {
    // Implementation from architecture doc
  }
}
```

3. **Create Fact Extractor**
```typescript
// File: src/lib/services/learning/factExtractor.ts
export class FactExtractor {
  async extract(text: string): Promise<UserFact[]> {
    // Simple pattern matching for MVP
    const facts: UserFact[] = [];
    
    // Extract hobbies
    const hobbyPatterns = [
      /I (?:enjoy|like|love) (\w+ing)/g,
      /my hobby is (\w+)/gi
    ];
    
    // Extract job info
    const jobPatterns = [
      /I(?:'m| am) a (\w+)/g,
      /work as a (\w+)/g
    ];
    
    // Pattern matching logic...
    
    return facts;
  }
}
```

### Phase 3: UI Integration (Day 4-5)

1. **Add Learning Mode Toggle to Interface**
```typescript
// Update: src/components/MinimalPureInterface.tsx
import { Brain } from 'lucide-react';
import { LearningModeManager } from '@/lib/services/learning/learningModeManager';

// Add to component:
const [isLearningMode, setIsLearningMode] = useState(false);
const learningManager = useRef(new LearningModeManager());

// Add toggle button in UI
<button
  onClick={toggleLearningMode}
  className="learning-mode-toggle"
  style={{
    position: 'fixed',
    bottom: '20px',
    left: '20px',
    background: isLearningMode ? '#60a5fa' : 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    padding: '12px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    cursor: 'pointer',
    transition: 'all 0.3s'
  }}
>
  <Brain size={20} className={isLearningMode ? 'animate-pulse' : ''} />
  <span>{isLearningMode ? 'Learning Mode Active' : 'Enable Learning Mode'}</span>
</button>
```

2. **Add Learning Mode Indicator**
```typescript
// Add visual indicator when active
{isLearningMode && (
  <div className="learning-mode-indicator" style={{
    position: 'fixed',
    top: '80px',
    right: '20px',
    background: 'rgba(96, 165, 250, 0.1)',
    border: '1px solid #60a5fa',
    borderRadius: '20px',
    padding: '8px 16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    <Brain size={16} className="animate-pulse" />
    <span>Learning about: {currentCategory}</span>
    <span>Facts learned: {factsLearned}</span>
  </div>
)}
```

### Phase 4: Conversation Integration (Day 6-7)

1. **Modify Message Processing**
```typescript
// In handleSendMessage function
if (isLearningMode) {
  // Process response for fact extraction
  const result = await learningManager.current.processResponse(userMessage);
  
  // Save extracted facts
  for (const fact of result.factsExtracted) {
    console.log('Learned:', fact);
  }
  
  // Add follow-up question if available
  if (result.followUpQuestion) {
    setTimeout(() => {
      setMessages(prev => [...prev, {
        id: crypto.randomUUID(),
        type: 'assistant',
        content: result.followUpQuestion,
        timestamp: new Date(),
        metadata: { learningMode: true }
      }]);
    }, 1000);
  }
}
```

2. **Add Skip Question Feature**
```typescript
// Add skip button for each learning mode message
{message.metadata?.learningMode && (
  <button
    onClick={() => skipQuestion()}
    className="skip-question-btn"
    style={{
      marginTop: '8px',
      opacity: 0.7,
      fontSize: '12px',
      color: '#60a5fa'
    }}
  >
    Skip this question →
  </button>
)}
```

### Phase 5: Testing & Refinement (Day 8-10)

1. **Create Test Script**
```javascript
// File: scripts/test-learning-mode.js
const { createClient } = require('@supabase/supabase-js');

async function testLearningMode() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
  
  // Test creating a learning session
  const { data: session } = await supabase
    .from('learning_sessions')
    .insert({
      user_id: 'test-user-id',
      state: { test: true }
    })
    .select()
    .single();
    
  console.log('Session created:', session);
  
  // Test saving facts
  const { data: fact } = await supabase
    .from('user_facts')
    .insert({
      user_id: 'test-user-id',
      category: 'personal',
      fact_key: 'hobby',
      fact_value: { value: 'photography' }
    })
    .select()
    .single();
    
  console.log('Fact saved:', fact);
}

testLearningMode();
```

## Implementation Checklist

### Database
- [ ] Create migration file
- [ ] Run migration
- [ ] Test table creation
- [ ] Verify indexes

### Backend Services
- [ ] Create question bank
- [ ] Implement LearningModeManager
- [ ] Build FactExtractor
- [ ] Add API endpoints
- [ ] Test fact extraction

### Frontend Integration
- [ ] Add Learning Mode toggle
- [ ] Create visual indicators
- [ ] Integrate with conversation flow
- [ ] Add skip functionality
- [ ] Test user experience

### Privacy & Control
- [ ] Add facts viewer
- [ ] Implement edit/delete
- [ ] Create export function
- [ ] Add privacy settings

### Testing
- [ ] Unit tests for services
- [ ] Integration tests
- [ ] User acceptance testing
- [ ] Performance testing

## Next Steps

1. Start with database setup
2. Build core services
3. Add minimal UI
4. Test with real conversations
5. Iterate based on feedback

Remember: Start simple, get it working, then enhance!