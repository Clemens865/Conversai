import init, { MarkdownProcessor } from '../../../wasm/markdown_processor/markdown_processor'

export class RustMarkdownService {
  private processor: MarkdownProcessor | null = null
  private initialized: boolean = false
  
  async initialize() {
    if (this.initialized) return
    
    console.log('🦀 Initializing Rust Markdown Service...')
    
    try {
      // Initialize WASM module
      await init()
      
      // Create processor instance
      this.processor = new MarkdownProcessor()
      
      // Load existing markdown from localStorage
      const stored = localStorage.getItem('markdown-library')
      if (stored) {
        const files = JSON.parse(stored)
        console.log(`Loading ${files.length} markdown files into Rust processor...`)
        
        for (const file of files) {
          if (file.content) {
            this.processor.load_markdown(file.content, file.category || 'general')
          }
        }
        
        console.log(`✅ Loaded ${this.processor.get_section_count()} sections`)
        console.log(`📚 Index contains ${this.processor.get_index_size()} unique terms`)
      } else {
        console.log('No existing markdown library found, starting fresh')
      }
      
      this.initialized = true
      console.log('🚀 Rust Markdown Service ready!')
    } catch (error) {
      console.error('Failed to initialize Rust Markdown Service:', error)
      throw error
    }
  }
  
  async loadMarkdown(content: string, category: string = 'general') {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    this.processor.load_markdown(content, category)
    console.log(`Loaded markdown into category '${category}'`)
  }
  
  async getRelevantContext(query: string, maxResults: number = 5): Promise<string> {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    console.log(`🔍 Searching for: "${query}" (max ${maxResults} results)`)
    const context = this.processor.search(query, maxResults)
    return context
  }
  
  async getFullContext(): Promise<string> {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    return this.processor.get_full_context()
  }
  
  setMaxContextLength(length: number) {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    this.processor.set_max_context_length(length)
  }
  
  getSectionCount(): number {
    if (!this.processor) {
      return 0
    }
    return this.processor.get_section_count()
  }
  
  getIndexSize(): number {
    if (!this.processor) {
      return 0
    }
    return this.processor.get_index_size()
  }
  
  exportSections(): string {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    return this.processor.export_sections()
  }
  
  importSections(json: string) {
    if (!this.processor) {
      throw new Error('Processor not initialized. Call initialize() first.')
    }
    
    this.processor.import_sections(json)
  }
  
  clear() {
    if (this.processor) {
      this.processor.clear()
      console.log('Cleared all markdown sections')
    }
  }
  
  // Helper method to update from localStorage
  async syncWithLocalStorage() {
    if (!this.processor) {
      await this.initialize()
    }
    
    const stored = localStorage.getItem('markdown-library')
    if (stored) {
      this.clear()
      const files = JSON.parse(stored)
      
      for (const file of files) {
        if (file.content) {
          this.processor!.load_markdown(file.content, file.category || 'general')
        }
      }
      
      console.log(`♻️ Synced ${this.processor!.get_section_count()} sections from localStorage`)
    }
  }
}