2# Markdown Context Loading Analysis

## Current Implementation Issues

### Problem Statement
The markdown context is being loaded but not properly integrated into the conversation window. The AI receives the context but doesn't utilize it effectively for natural conversation.

### Current Architecture
```
[localStorage] → [MarkdownLibraryService] → [loadRelevantContext()] → [OpenAI API]
                          ↓
                 [Default markdown files]
```

### Issues Identified
1. **Context Truncation**: Current max context length is 100,000 chars (~25k tokens), but only relevant sections are loaded
2. **Poor Context Selection**: Simple keyword matching algorithm may miss important context
3. **No Context Persistence**: Context isn't maintained across conversation turns
4. **Limited Token Budget**: OpenAI API has token limits that aren't properly managed
5. **No Streaming Context**: Context is loaded once per query, not maintained in conversation

## Proposed Solutions

### Option 1: Enhanced JavaScript Context Manager
**Approach**: Improve existing TypeScript implementation with better context management

```typescript
class ContextManager {
  private conversationContext: string[] = []
  private contextWindow: number = 8000 // tokens
  private contextIndex: Map<string, number> // relevance scores
  
  async buildContext(query: string): Promise<string> {
    // 1. Load core identity always
    // 2. Use embeddings for semantic search
    // 3. Maintain conversation history
    // 4. Sliding window for context
  }
}
```

**Pros**:
- Quick to implement
- Works in browser
- No additional dependencies

**Cons**:
- Limited by browser memory
- Slower processing
- No true semantic understanding

### Option 2: Rust-Based Context Processor
**Approach**: High-performance Rust WASM module for context processing

```rust
// markdown_processor/src/lib.rs
use wasm_bindgen::prelude::*;
use tantivy::{Index, Document, Field};
use qdrant_client::Qdrant;

#[wasm_bindgen]
pub struct MarkdownProcessor {
    index: Index,
    embeddings: Vec<f32>,
    context_window: usize,
}

#[wasm_bindgen]
impl MarkdownProcessor {
    pub fn new() -> Self {
        // Initialize Tantivy search index
        // Load pre-computed embeddings
    }
    
    pub fn load_markdown(&mut self, content: &str) {
        // Parse markdown with pulldown-cmark
        // Create searchable index with Tantivy
        // Generate embeddings with candle
    }
    
    pub fn get_relevant_context(&self, query: &str, max_tokens: u32) -> String {
        // Semantic search using embeddings
        // Ranked retrieval with BM25
        // Smart truncation to fit token limit
    }
}
```

**Implementation Steps**:
1. Create Rust WASM module with wasm-pack
2. Use Tantivy for full-text search
3. Use candle for local embeddings
4. Implement smart chunking and retrieval

**Pros**:
- 10-100x faster than JavaScript
- Advanced search capabilities
- Local embeddings (no API calls)
- Memory efficient
- Can handle large markdown libraries

**Cons**:
- More complex setup
- WASM bundle size (~2-5MB)
- Learning curve for Rust

### Option 3: Hybrid Edge Worker + Rust
**Approach**: Cloudflare Worker with Rust WASM for server-side processing

```typescript
// Edge Worker
export default {
  async fetch(request: Request) {
    const processor = await import('./markdown_processor_bg.wasm')
    const context = processor.process_context(query, markdownLibrary)
    return new Response(context)
  }
}
```

**Pros**:
- Server-side processing power
- Can use vector databases
- Larger context windows
- Better caching

**Cons**:
- Requires edge deployment
- Added latency
- Cost considerations

### Option 4: Vector Database Integration
**Approach**: Use Qdrant or Pinecone for semantic search

```typescript
class VectorContextManager {
  private qdrant: QdrantClient
  
  async initialize() {
    // Connect to Qdrant
    // Load markdown as vectors
  }
  
  async searchContext(query: string): Promise<string> {
    // Vector similarity search
    // Rerank results
    // Build context
  }
}
```

**Pros**:
- Best semantic search
- Scales to large documents
- Fast retrieval

**Cons**:
- Requires external service
- API costs
- Network latency

### Option 5: Local LLM Context Processor
**Approach**: Use ONNX Runtime with a small language model for context processing

```typescript
import * as ort from 'onnxruntime-web'

class LocalLLMProcessor {
  private session: ort.InferenceSession
  
  async initialize() {
    // Load ONNX model (e.g., MiniLM)
    this.session = await ort.InferenceSession.create('./minilm.onnx')
  }
  
  async processContext(markdown: string, query: string): Promise<string> {
    // Run local inference
    // Extract relevant sections
    // Summarize if needed
  }
}
```

**Pros**:
- Fully local processing
- Smart summarization
- Privacy-preserving

**Cons**:
- Model size (50-200MB)
- Slower on low-end devices
- Limited capabilities

## Recommended Solution: Rust WASM Module

### Why Rust WASM?
1. **Performance**: Orders of magnitude faster than JavaScript
2. **Memory Efficiency**: Better memory management for large documents
3. **Advanced Features**: Full-text search, embeddings, smart chunking
4. **Browser Compatible**: Runs directly in the browser
5. **Future-Proof**: Can be extended with more capabilities

### Implementation Plan

#### Phase 1: Basic Rust Module (Week 1)
```bash
# Setup
cargo new markdown_processor --lib
cd markdown_processor
cargo add wasm-bindgen pulldown-cmark serde_json

# Build
wasm-pack build --target web
```

#### Phase 2: Search & Indexing (Week 2)
- Integrate Tantivy for full-text search
- Implement BM25 ranking
- Add fuzzy matching

#### Phase 3: Embeddings & Semantic Search (Week 3)
- Add candle for local embeddings
- Implement vector similarity search
- Add reranking algorithms

#### Phase 4: Integration (Week 4)
- Create TypeScript bindings
- Integrate with ConversAI
- Add caching layer

### Quick Start Implementation

```rust
// Cargo.toml
[package]
name = "markdown_processor"
version = "0.1.0"
edition = "2021"

[lib]
crate-type = ["cdylib"]

[dependencies]
wasm-bindgen = "0.2"
pulldown-cmark = "0.9"
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

[dependencies.web-sys]
version = "0.3"
features = ["console"]
```

```rust
// src/lib.rs
use wasm_bindgen::prelude::*;
use pulldown_cmark::{Parser, Event, Tag};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Serialize, Deserialize)]
pub struct MarkdownSection {
    id: String,
    title: String,
    content: String,
    tags: Vec<String>,
    relevance: f32,
}

#[wasm_bindgen]
pub struct MarkdownProcessor {
    sections: Vec<MarkdownSection>,
    index: HashMap<String, Vec<usize>>, // word -> section indices
}

#[wasm_bindgen]
impl MarkdownProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("Initializing Rust Markdown Processor");
        Self {
            sections: Vec::new(),
            index: HashMap::new(),
        }
    }
    
    pub fn load_markdown(&mut self, content: &str) {
        let parser = Parser::new(content);
        let mut current_section = MarkdownSection {
            id: String::new(),
            title: String::new(),
            content: String::new(),
            tags: Vec::new(),
            relevance: 0.0,
        };
        
        for event in parser {
            match event {
                Event::Start(Tag::Heading(level)) if level == 1 || level == 2 => {
                    if !current_section.content.is_empty() {
                        self.add_section(current_section.clone());
                    }
                    current_section = MarkdownSection {
                        id: format!("section_{}", self.sections.len()),
                        title: String::new(),
                        content: String::new(),
                        tags: Vec::new(),
                        relevance: 0.0,
                    };
                }
                Event::Text(text) => {
                    if current_section.title.is_empty() {
                        current_section.title = text.to_string();
                    } else {
                        current_section.content.push_str(&text);
                    }
                }
                _ => {}
            }
        }
        
        if !current_section.content.is_empty() {
            self.add_section(current_section);
        }
        
        console_log!("Loaded {} sections", self.sections.len());
    }
    
    fn add_section(&mut self, section: MarkdownSection) {
        let section_idx = self.sections.len();
        
        // Build inverted index
        for word in section.content.split_whitespace() {
            let word_lower = word.to_lowercase();
            self.index.entry(word_lower)
                .or_insert_with(Vec::new)
                .push(section_idx);
        }
        
        self.sections.push(section);
    }
    
    pub fn search(&mut self, query: &str, max_results: usize) -> String {
        console_log!("Searching for: {}", query);
        
        // Calculate relevance scores
        let mut scores: Vec<(usize, f32)> = Vec::new();
        let query_words: Vec<String> = query.split_whitespace()
            .map(|w| w.to_lowercase())
            .collect();
        
        for (idx, section) in self.sections.iter().enumerate() {
            let mut score = 0.0;
            
            for word in &query_words {
                if let Some(indices) = self.index.get(word) {
                    if indices.contains(&idx) {
                        score += 1.0;
                    }
                }
                
                // Title match bonus
                if section.title.to_lowercase().contains(word) {
                    score += 5.0;
                }
            }
            
            if score > 0.0 {
                scores.push((idx, score));
            }
        }
        
        // Sort by relevance
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scores.truncate(max_results);
        
        // Build context
        let mut context = String::new();
        for (idx, score) in scores {
            let section = &self.sections[idx];
            context.push_str(&format!("## {}\n{}\n\n", section.title, section.content));
        }
        
        context
    }
    
    pub fn get_full_context(&self) -> String {
        self.sections.iter()
            .map(|s| format!("## {}\n{}\n", s.title, s.content))
            .collect::<Vec<_>>()
            .join("\n")
    }
}
```

### Integration with ConversAI

```typescript
// conversai/src/lib/services/markdown/rust-processor.ts
import init, { MarkdownProcessor } from '../../../wasm/markdown_processor'

export class RustMarkdownService {
  private processor: MarkdownProcessor | null = null
  
  async initialize() {
    await init() // Initialize WASM
    this.processor = new MarkdownProcessor()
    
    // Load existing markdown from localStorage
    const stored = localStorage.getItem('markdown-library')
    if (stored) {
      const files = JSON.parse(stored)
      for (const file of files) {
        this.processor.load_markdown(file.content)
      }
    }
  }
  
  async getRelevantContext(query: string): Promise<string> {
    if (!this.processor) throw new Error('Processor not initialized')
    return this.processor.search(query, 5)
  }
  
  async getFullContext(): Promise<string> {
    if (!this.processor) throw new Error('Processor not initialized')
    return this.processor.get_full_context()
  }
}
```

## Next Steps

1. **Immediate**: Implement basic Rust WASM module for markdown processing
2. **Short-term**: Add semantic search capabilities with local embeddings
3. **Medium-term**: Integrate with conversation history for context continuity
4. **Long-term**: Add vector database support for scaling

## Performance Expectations

### JavaScript (Current)
- Load time: 200-500ms
- Search time: 50-100ms per query
- Memory usage: 50-100MB
- Max documents: ~100

### Rust WASM (Proposed)
- Load time: 20-50ms
- Search time: 1-5ms per query
- Memory usage: 10-20MB
- Max documents: ~10,000

## Conclusion

The Rust WASM approach offers the best balance of performance, features, and browser compatibility. It can handle large markdown libraries efficiently while providing advanced search capabilities that will make the AI responses much more contextually aware and natural.