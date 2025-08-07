// Client-side markdown library service using browser APIs
import matter from 'gray-matter'

export interface MarkdownFile {
  id: string
  category: string
  title: string
  tags: string[]
  content: string
  metadata: Record<string, any>
  lastModified: Date
}

export interface LibraryConfig {
  categories: string[]
  maxContextLength: number
}

export class MarkdownLibraryService {
  private config: LibraryConfig
  private cache: Map<string, MarkdownFile> = new Map()
  private index: Map<string, Set<string>> = new Map() // tag -> file IDs
  
  constructor(config?: Partial<LibraryConfig>) {
    this.config = {
      categories: ['personal', 'context', 'knowledge'],
      maxContextLength: 100000, // ~125K tokens
      ...config
    }
  }
  
  async initialize(): Promise<void> {
    // Load from localStorage or create defaults
    const stored = localStorage.getItem('markdown-library')
    
    if (stored) {
      const files = JSON.parse(stored) as MarkdownFile[]
      files.forEach(file => {
        this.cache.set(file.id, file)
        
        // Rebuild index
        for (const tag of file.tags) {
          if (!this.index.has(tag)) {
            this.index.set(tag, new Set())
          }
          this.index.get(tag)!.add(file.id)
        }
      })
    } else {
      // Create default files
      await this.createDefaultFiles()
    }
    
    console.log(`Loaded ${this.cache.size} markdown files from storage`)
  }
  
  private saveToStorage(): void {
    const files = Array.from(this.cache.values())
    localStorage.setItem('markdown-library', JSON.stringify(files))
  }
  
  async loadFullContext(): Promise<string> {
    const sections: string[] = []
    
    // Load in priority order: personal -> context -> knowledge
    const priorityOrder = ['personal', 'context', 'knowledge']
    
    for (const category of priorityOrder) {
      const categoryFiles = Array.from(this.cache.values())
        .filter(file => file.category === category)
        .sort((a, b) => {
          // Sort by priority in metadata, then by title
          const priorityA = a.metadata.priority || 999
          const priorityB = b.metadata.priority || 999
          return priorityA - priorityB || a.title.localeCompare(b.title)
        })
      
      if (categoryFiles.length > 0) {
        sections.push(`\n## ${category.toUpperCase()} INFORMATION\n`)
        
        for (const file of categoryFiles) {
          sections.push(`### ${file.title}\n${file.content}\n`)
        }
      }
    }
    
    const fullContext = sections.join('\n')
    
    // Truncate if too long
    if (fullContext.length > this.config.maxContextLength) {
      return fullContext.substring(0, this.config.maxContextLength) + '\n\n[Context truncated due to length]'
    }
    
    return fullContext
  }
  
  async loadRelevantContext(query: string): Promise<string> {
    const keywords = query.toLowerCase().split(/\s+/)
    const relevanceScores = new Map<string, number>()
    
    // Score each file based on keyword matches
    for (const [fileId, file] of this.cache.entries()) {
      let score = 0
      
      // Check title
      const titleLower = file.title.toLowerCase()
      for (const keyword of keywords) {
        if (titleLower.includes(keyword)) {
          score += 5
        }
      }
      
      // Check tags
      for (const tag of file.tags) {
        for (const keyword of keywords) {
          if (tag.toLowerCase().includes(keyword)) {
            score += 3
          }
        }
      }
      
      // Check content
      const contentLower = file.content.toLowerCase()
      for (const keyword of keywords) {
        const matches = (contentLower.match(new RegExp(keyword, 'g')) || []).length
        score += matches
      }
      
      if (score > 0) {
        relevanceScores.set(fileId, score)
      }
    }
    
    // Sort by relevance and build context
    const sortedFiles = Array.from(relevanceScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10) // Top 10 most relevant
      .map(([fileId]) => this.cache.get(fileId)!)
    
    // Always include core personal info
    const coreFiles = ['personal/identity', 'personal/background']
    for (const coreFile of coreFiles) {
      if (this.cache.has(coreFile) && !sortedFiles.find(f => f.id === coreFile)) {
        sortedFiles.unshift(this.cache.get(coreFile)!)
      }
    }
    
    // Build context
    const sections: string[] = ['## RELEVANT CONTEXT\n']
    
    for (const file of sortedFiles) {
      sections.push(`### ${file.title}\n${file.content}\n`)
    }
    
    return sections.join('\n')
  }
  
  async updateFile(fileId: string, content: string, metadata?: Record<string, any>): Promise<void> {
    const file = this.cache.get(fileId)
    if (!file) {
      throw new Error(`File ${fileId} not found`)
    }
    
    // Update file
    file.content = content
    file.metadata = { ...file.metadata, ...metadata }
    file.lastModified = new Date()
    
    // Save to storage
    this.saveToStorage()
  }
  
  async createFile(category: string, filename: string, content: string, metadata?: Record<string, any>): Promise<void> {
    if (!this.config.categories.includes(category)) {
      throw new Error(`Invalid category: ${category}`)
    }
    
    const fileId = `${category}/${filename.replace('.md', '')}`
    const file: MarkdownFile = {
      id: fileId,
      category,
      title: metadata?.title || filename.replace('.md', ''),
      tags: metadata?.tags || [],
      content,
      metadata: metadata || {},
      lastModified: new Date()
    }
    
    this.cache.set(fileId, file)
    
    // Update index
    for (const tag of file.tags) {
      if (!this.index.has(tag)) {
        this.index.set(tag, new Set())
      }
      this.index.get(tag)!.add(fileId)
    }
    
    // Save to storage
    this.saveToStorage()
  }
  
  private async createDefaultFiles(): Promise<void> {
    // Create default personal files
    await this.createFile('personal', 'identity', `
# Personal Identity

- **Name**: [Your name]
- **Age**: [Your age]
- **Location**: [Your location]
- **Occupation**: [Your occupation]

## About Me

[Add personal description here]
`, {
      title: 'Personal Identity',
      tags: ['identity', 'personal', 'core'],
      priority: 1
    })
    
    await this.createFile('personal', 'background', `
# Background & History

## Education

[Add education history]

## Career

[Add career history]

## Life Events

[Add significant life events]
`, {
      title: 'Background & History',
      tags: ['background', 'history', 'personal'],
      priority: 2
    })
    
    await this.createFile('personal', 'preferences', `
# Preferences & Interests

## Likes

- [Add things you like]

## Dislikes

- [Add things you dislike]

## Hobbies

- [Add your hobbies]

## Daily Routines

- [Add your routines]
`, {
      title: 'Preferences & Interests',
      tags: ['preferences', 'likes', 'hobbies'],
      priority: 3
    })
    
    await this.createFile('personal', 'relationships', `
# Relationships

## Family

[Add family members]

## Friends

[Add close friends]

## Pets

[Add pets if any]
`, {
      title: 'Relationships',
      tags: ['family', 'friends', 'relationships'],
      priority: 4
    })
    
    // Create context files
    await this.createFile('context', 'current-projects', `
# Current Projects

## Active Work

[Add current work projects]

## Personal Projects

[Add personal projects]
`, {
      title: 'Current Projects',
      tags: ['projects', 'current', 'work'],
      priority: 1
    })
    
    await this.createFile('context', 'goals', `
# Goals & Aspirations

## Short-term Goals (Next 6 months)

[Add short-term goals]

## Long-term Goals (1-5 years)

[Add long-term goals]

## Life Goals

[Add life goals]
`, {
      title: 'Goals & Aspirations',
      tags: ['goals', 'aspirations', 'future'],
      priority: 2
    })
    
    // Create knowledge files
    await this.createFile('knowledge', 'expertise', `
# Areas of Expertise

## Professional Skills

[Add professional skills]

## Technical Knowledge

[Add technical knowledge]

## Domain Expertise

[Add domain expertise]
`, {
      title: 'Areas of Expertise',
      tags: ['expertise', 'skills', 'knowledge'],
      priority: 1
    })
    
    console.log('Created default markdown files')
    this.saveToStorage()
  }
  
  // Import from biography
  async importFromBiography(biographyText: string): Promise<void> {
    // Parse biography into sections
    const sections = this.parseBiographySections(biographyText)
    
    // Update or create files based on parsed sections
    for (const [category, content] of Object.entries(sections)) {
      const fileId = `personal/${category}`
      
      if (this.cache.has(fileId)) {
        await this.updateFile(fileId, content, {
          importedAt: new Date().toISOString(),
          source: 'biography'
        })
      } else {
        await this.createFile('personal', category, content, {
          title: category.charAt(0).toUpperCase() + category.slice(1),
          tags: [category, 'imported', 'biography'],
          importedAt: new Date().toISOString(),
          source: 'biography'
        })
      }
    }
  }
  
  private parseBiographySections(text: string): Record<string, string> {
    const sections: Record<string, string> = {
      identity: '',
      background: '',
      preferences: '',
      relationships: ''
    }
    
    // Extract identity information
    const nameMatch = text.match(/(?:name is|I am|My name is)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i)
    const ageMatch = text.match(/(\d+)\s*(?:years old|Jahre alt)/i)
    const locationMatch = text.match(/(?:live in|from|in)\s+([A-Z][a-z]+(?:,?\s+[A-Z][a-z]+)*)/i)
    const jobMatch = text.match(/(?:work as|job is|I am a|profession)\s+([a-zA-Z\s]+?)(?:\.|,|;|\s+and|\s+at)/i)
    
    sections.identity = `# Personal Identity

- **Name**: ${nameMatch ? nameMatch[1] : '[Not specified]'}
- **Age**: ${ageMatch ? ageMatch[1] : '[Not specified]'}
- **Location**: ${locationMatch ? locationMatch[1] : '[Not specified]'}
- **Occupation**: ${jobMatch ? jobMatch[1].trim() : '[Not specified]'}

## About Me
${text.substring(0, 200)}...
`
    
    // Extract background
    const educationMatch = text.match(/(?:studied|education|university|degree).*?(?:\.|;)/gi)
    const careerMatch = text.match(/(?:worked|career|job|company).*?(?:\.|;)/gi)
    
    sections.background = `# Background & History

## Education
${educationMatch ? educationMatch.join('\n') : '[Not specified]'}

## Career
${careerMatch ? careerMatch.join('\n') : '[Not specified]'}
`
    
    // Extract preferences
    const likesMatch = text.match(/(?:like|love|enjoy|favorite).*?(?:\.|;)/gi)
    const hobbiesMatch = text.match(/(?:hobby|hobbies|free time|enjoy).*?(?:\.|;)/gi)
    
    sections.preferences = `# Preferences & Interests

## Likes
${likesMatch ? likesMatch.map(l => `- ${l}`).join('\n') : '- [Not specified]'}

## Hobbies
${hobbiesMatch ? hobbiesMatch.map(h => `- ${h}`).join('\n') : '- [Not specified]'}
`
    
    // Extract relationships
    const familyMatch = text.match(/(?:family|wife|husband|children|kids|parents).*?(?:\.|;)/gi)
    const petsMatch = text.match(/(?:pet|pets|cat|cats|dog|dogs).*?(?:\.|;)/gi)
    
    sections.relationships = `# Relationships

## Family
${familyMatch ? familyMatch.join('\n') : '[Not specified]'}

## Pets
${petsMatch ? petsMatch.join('\n') : '[Not specified]'}
`
    
    return sections
  }
  
  // Export all files
  exportLibrary(): string {
    const files = Array.from(this.cache.values())
    return JSON.stringify(files, null, 2)
  }
  
  // Import library
  importLibrary(jsonData: string): void {
    try {
      const files = JSON.parse(jsonData) as MarkdownFile[]
      
      // Clear existing
      this.cache.clear()
      this.index.clear()
      
      // Import files
      files.forEach(file => {
        this.cache.set(file.id, file)
        
        // Rebuild index
        for (const tag of file.tags) {
          if (!this.index.has(tag)) {
            this.index.set(tag, new Set())
          }
          this.index.get(tag)!.add(file.id)
        }
      })
      
      this.saveToStorage()
      console.log(`Imported ${files.length} files`)
    } catch (error) {
      throw new Error('Invalid library data')
    }
  }
}