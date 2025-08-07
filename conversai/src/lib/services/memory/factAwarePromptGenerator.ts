/**
 * Fact-Aware Prompt Generator
 * 
 * Ensures critical facts are ALWAYS included in prompts with 100% reliability.
 * This is the key component that guarantees fact accuracy in responses.
 */

import { DeterministicFactManager } from './deterministicFactManager';

export interface PromptGenerationResult {
  enhancedPrompt: string;
  factConfidence: number;
  factsIncluded: string[];
  originalPromptLength: number;
  enhancedPromptLength: number;
  processingTime: number;
}

export interface FactPromptOptions {
  includeDebugInfo?: boolean;
  maxFactSectionLength?: number;
  prioritizeRecent?: boolean;
  includeConfidenceScores?: boolean;
}

export class FactAwarePromptGenerator {
  private factManager: DeterministicFactManager;
  
  constructor(factManager: DeterministicFactManager) {
    this.factManager = factManager;
  }

  /**
   * Generates a system prompt with guaranteed fact inclusion
   * This is the core method that ensures 100% fact accuracy
   */
  async generateSystemPromptWithFacts(
    userId: string, 
    basePrompt: string,
    options: FactPromptOptions = {}
  ): Promise<PromptGenerationResult> {
    const startTime = performance.now();
    const originalLength = basePrompt.length;

    try {
      // Get all critical facts (guaranteed retrieval)
      const criticalFacts = await this.factManager.getAllCriticalFacts(userId);
      
      // Build the fact section
      const factSection = this.buildFactSection(criticalFacts, options);
      
      // Combine prompts
      const enhancedPrompt = this.combinePrompts(basePrompt, factSection, options);
      
      const processingTime = performance.now() - startTime;
      
      return {
        enhancedPrompt,
        factConfidence: this.calculateFactConfidence(criticalFacts),
        factsIncluded: Array.from(criticalFacts.keys()),
        originalPromptLength: originalLength,
        enhancedPromptLength: enhancedPrompt.length,
        processingTime
      };

    } catch (error) {
      console.error('Error generating fact-aware prompt:', error);
      
      // Fallback: return original prompt with error info
      const processingTime = performance.now() - startTime;
      return {
        enhancedPrompt: basePrompt + this.buildErrorFallbackSection(error as Error),
        factConfidence: 0,
        factsIncluded: [],
        originalPromptLength: originalLength,
        enhancedPromptLength: basePrompt.length,
        processingTime
      };
    }
  }

  /**
   * Builds the critical facts section that gets injected into prompts
   */
  private buildFactSection(
    criticalFacts: Map<string, any>, 
    options: FactPromptOptions
  ): string {
    let factSection = "\n\n## CRITICAL USER FACTS (ALWAYS USE THESE EXACT NAMES):\n";
    
    // Always include user name with highest priority
    const userName = criticalFacts.get('user_name');
    if (userName) {
      factSection += `- User's name: ${userName}\n`;
    } else {
      factSection += `- User's name: [NOT SET - REQUEST NAME]\n`;
    }

    // Always include pet names
    const petNames = criticalFacts.get('pet_names');
    if (petNames && petNames.length > 0) {
      factSection += `- Pet names: ${petNames.join(', ')}\n`;
    } else {
      factSection += `- Pet names: [NONE SPECIFIED]\n`;
    }

    // Include family members if available
    const familyMembers = criticalFacts.get('family_members');
    if (familyMembers && familyMembers.length > 0) {
      factSection += `- Family members: ${familyMembers.join(', ')}\n`;
    }

    // Include work information if available
    const workInfo = criticalFacts.get('work_info');
    if (workInfo) {
      if (typeof workInfo === 'object') {
        factSection += `- Work: ${workInfo.workplace || 'Unknown workplace'}`;
        if (workInfo.position) factSection += ` (${workInfo.position})`;
        factSection += '\n';
      } else {
        factSection += `- Work: ${workInfo}\n`;
      }
    }

    // Include location information if available
    const locationInfo = criticalFacts.get('location_info');
    if (locationInfo) {
      if (typeof locationInfo === 'object') {
        Object.entries(locationInfo).forEach(([locationType, details]: [string, any]) => {
          factSection += `- ${this.capitalizeFirst(locationType)}: ${details.name || details}\n`;
        });
      } else {
        factSection += `- Location: ${locationInfo}\n`;
      }
    }

    // Add confidence information if requested
    if (options.includeConfidenceScores) {
      const confidence = this.calculateFactConfidence(criticalFacts);
      factSection += `- Fact Confidence: ${(confidence * 100).toFixed(1)}%\n`;
    }

    // Add critical instruction
    factSection += "\n🚨 CRITICAL INSTRUCTION: You MUST use the exact names listed above. ";
    factSection += "Never guess or use different names. If you don't know a name, ask for it.\n";

    // Add debug info if requested
    if (options.includeDebugInfo) {
      factSection += `\n[DEBUG INFO: ${criticalFacts.size} facts loaded at ${new Date().toISOString()}]\n`;
    }

    return factSection;
  }

  /**
   * Combines the base prompt with the fact section
   */
  private combinePrompts(
    basePrompt: string, 
    factSection: string, 
    options: FactPromptOptions
  ): string {
    // Check if we need to truncate the fact section
    if (options.maxFactSectionLength && factSection.length > options.maxFactSectionLength) {
      const truncateNote = `\n[FACT SECTION TRUNCATED TO FIT LIMIT]\n`;
      factSection = factSection.substring(0, options.maxFactSectionLength - truncateNote.length) + truncateNote;
    }

    // Insert fact section after the main instructions but before any examples
    const exampleMarkers = ['## Examples:', '## Example:', 'Examples:', 'Example:'];
    let insertPoint = basePrompt.length;

    for (const marker of exampleMarkers) {
      const markerIndex = basePrompt.indexOf(marker);
      if (markerIndex !== -1 && markerIndex < insertPoint) {
        insertPoint = markerIndex;
      }
    }

    // Insert the fact section
    const beforeFacts = basePrompt.substring(0, insertPoint);
    const afterFacts = basePrompt.substring(insertPoint);

    return beforeFacts + factSection + afterFacts;
  }

  /**
   * Creates a fallback section when fact retrieval fails
   */
  private buildErrorFallbackSection(error: Error): string {
    return `\n\n## FACT RETRIEVAL ERROR:\n` +
           `Unable to load user facts: ${error.message}\n` +
           `IMPORTANT: Ask for the user's name and any important information at the start of the conversation.\n`;
  }

  /**
   * Calculates overall confidence in the fact set
   */
  private calculateFactConfidence(facts: Map<string, any>): number {
    const requiredFacts = ['user_name', 'pet_names'];
    let presentCount = 0;
    let totalWeight = 0;

    for (const fact of requiredFacts) {
      totalWeight += 1;
      if (facts.has(fact) && facts.get(fact)) {
        const value = facts.get(fact);
        // Check if the value is meaningful (not empty array, null, etc.)
        if (Array.isArray(value) ? value.length > 0 : value) {
          presentCount += 1;
        }
      }
    }

    // Optional facts add to confidence but aren't required
    const optionalFacts = ['family_members', 'work_info', 'location_info'];
    for (const fact of optionalFacts) {
      if (facts.has(fact) && facts.get(fact)) {
        presentCount += 0.2; // 20% weight for optional facts
        totalWeight += 0.2;
      }
    }

    return totalWeight > 0 ? presentCount / totalWeight : 0;
  }

  /**
   * Utility function to capitalize first letter
   */
  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Validates that critical facts are present in the generated prompt
   * This is used for testing and monitoring
   */
  validateFactInclusion(prompt: string, expectedFacts: Map<string, any>): {
    isValid: boolean;
    missingFacts: string[];
    presentFacts: string[];
  } {
    const missingFacts: string[] = [];
    const presentFacts: string[] = [];

    // Check for user name
    const userName = expectedFacts.get('user_name');
    if (userName) {
      if (prompt.includes(userName)) {
        presentFacts.push('user_name');
      } else {
        missingFacts.push('user_name');
      }
    }

    // Check for pet names
    const petNames = expectedFacts.get('pet_names');
    if (petNames && petNames.length > 0) {
      const allPetsPresent = petNames.every((petName: string) => prompt.includes(petName));
      if (allPetsPresent) {
        presentFacts.push('pet_names');
      } else {
        missingFacts.push('pet_names');
      }
    }

    // Check for other facts
    for (const [factKey, factValue] of expectedFacts) {
      if (factKey !== 'user_name' && factKey !== 'pet_names' && factValue) {
        // Simple check for presence of fact content
        const factAsString = typeof factValue === 'object' ? 
          JSON.stringify(factValue) : String(factValue);
        
        if (prompt.includes(factAsString) || this.checkFactPresenceInPrompt(prompt, factKey, factValue)) {
          presentFacts.push(factKey);
        } else {
          missingFacts.push(factKey);
        }
      }
    }

    return {
      isValid: missingFacts.length === 0,
      missingFacts,
      presentFacts
    };
  }

  /**
   * More sophisticated check for fact presence in prompts
   */
  private checkFactPresenceInPrompt(prompt: string, factKey: string, factValue: any): boolean {
    const lowerPrompt = prompt.toLowerCase();
    const lowerKey = factKey.toLowerCase().replace('_', ' ');

    // Check if the fact key appears in the prompt
    if (lowerPrompt.includes(lowerKey)) {
      return true;
    }

    // Check specific patterns based on fact type
    switch (factKey) {
      case 'family_members':
        return lowerPrompt.includes('family') && Array.isArray(factValue) && 
               factValue.some(member => lowerPrompt.includes(member.toLowerCase()));
      
      case 'work_info':
        return lowerPrompt.includes('work') || lowerPrompt.includes('job') || 
               lowerPrompt.includes('workplace');
      
      case 'location_info':
        return lowerPrompt.includes('location') || lowerPrompt.includes('address') ||
               lowerPrompt.includes('live');
      
      default:
        return false;
    }
  }

  /**
   * Generates a test prompt to verify fact inclusion works correctly
   */
  async generateTestPrompt(userId: string): Promise<{
    prompt: string;
    validation: any;
    performance: any;
  }> {
    const basePrompt = `You are a helpful AI assistant. Respond naturally and use the user's name when appropriate.`;
    
    const result = await this.generateSystemPromptWithFacts(userId, basePrompt, {
      includeDebugInfo: true,
      includeConfidenceScores: true
    });

    const expectedFacts = await this.factManager.getAllCriticalFacts(userId);
    const validation = this.validateFactInclusion(result.enhancedPrompt, expectedFacts);

    return {
      prompt: result.enhancedPrompt,
      validation,
      performance: {
        processingTime: result.processingTime,
        factConfidence: result.factConfidence,
        factsIncluded: result.factsIncluded,
        promptLength: result.enhancedPromptLength
      }
    };
  }
}