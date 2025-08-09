use wasm_bindgen::prelude::*;
use pulldown_cmark::{Parser, Event, Tag, HeadingLevel};
use serde::{Serialize, Deserialize};
use std::collections::HashMap;

// Console logging for debugging
#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

macro_rules! console_log {
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct MarkdownSection {
    id: String,
    title: String,
    content: String,
    tags: Vec<String>,
    relevance: f32,
    category: String,
}

#[wasm_bindgen]
pub struct MarkdownProcessor {
    sections: Vec<MarkdownSection>,
    index: HashMap<String, Vec<usize>>, // word -> section indices
    max_context_length: usize,
}

#[wasm_bindgen]
impl MarkdownProcessor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        console_log!("🦀 Initializing Rust Markdown Processor");
        Self {
            sections: Vec::new(),
            index: HashMap::new(),
            max_context_length: 100000, // ~25k tokens
        }
    }
    
    pub fn clear(&mut self) {
        self.sections.clear();
        self.index.clear();
        console_log!("Cleared all sections and index");
    }
    
    pub fn load_markdown(&mut self, content: &str, category: &str) {
        let parser = Parser::new(content);
        let mut current_section = MarkdownSection {
            id: String::new(),
            title: String::new(),
            content: String::new(),
            tags: Vec::new(),
            relevance: 0.0,
            category: category.to_string(),
        };
        
        let mut in_heading = false;
        let mut heading_level = 1;
        
        for event in parser {
            match event {
                Event::Start(Tag::Heading(level, _, _)) => {
                    // Save previous section if it has content
                    if !current_section.content.is_empty() {
                        self.add_section(current_section.clone());
                    }
                    
                    // Start new section
                    current_section = MarkdownSection {
                        id: format!("{}_{}", category, self.sections.len()),
                        title: String::new(),
                        content: String::new(),
                        tags: Vec::new(),
                        relevance: 0.0,
                        category: category.to_string(),
                    };
                    
                    in_heading = true;
                    heading_level = match level {
                        HeadingLevel::H1 => 1,
                        HeadingLevel::H2 => 2,
                        HeadingLevel::H3 => 3,
                        HeadingLevel::H4 => 4,
                        HeadingLevel::H5 => 5,
                        HeadingLevel::H6 => 6,
                    };
                }
                Event::End(Tag::Heading(..)) => {
                    in_heading = false;
                }
                Event::Text(text) => {
                    if in_heading {
                        current_section.title = text.to_string();
                        // Extract tags from title (words that might be keywords)
                        current_section.tags = text.split_whitespace()
                            .filter(|w| w.len() > 3)
                            .map(|w| w.to_lowercase())
                            .collect();
                    } else {
                        current_section.content.push_str(&text);
                        current_section.content.push(' ');
                    }
                }
                Event::SoftBreak | Event::HardBreak => {
                    current_section.content.push('\n');
                }
                _ => {}
            }
        }
        
        // Don't forget the last section
        if !current_section.content.is_empty() || !current_section.title.is_empty() {
            self.add_section(current_section);
        }
        
        console_log!("Loaded {} sections from category '{}'", self.sections.len(), category);
    }
    
    fn add_section(&mut self, mut section: MarkdownSection) {
        let section_idx = self.sections.len();
        
        // Trim content
        section.content = section.content.trim().to_string();
        
        // Build inverted index for search
        let words = section.content.split_whitespace()
            .chain(section.title.split_whitespace());
            
        for word in words {
            let word_lower = word.to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect::<String>();
                
            if !word_lower.is_empty() {
                self.index.entry(word_lower)
                    .or_insert_with(Vec::new)
                    .push(section_idx);
            }
        }
        
        self.sections.push(section);
    }
    
    pub fn search(&mut self, query: &str, max_results: usize) -> String {
        console_log!("🔍 Searching for: {}", query);
        
        // Calculate relevance scores for each section
        let mut scores: Vec<(usize, f32)> = Vec::new();
        let query_words: Vec<String> = query.split_whitespace()
            .map(|w| w.to_lowercase()
                .chars()
                .filter(|c| c.is_alphanumeric())
                .collect())
            .filter(|w: &String| !w.is_empty())
            .collect();
        
        for (idx, section) in self.sections.iter().enumerate() {
            let mut score = 0.0;
            
            // Score based on word matches in index
            for word in &query_words {
                if let Some(indices) = self.index.get(word) {
                    if indices.contains(&idx) {
                        // Count frequency
                        let freq = indices.iter().filter(|&&i| i == idx).count() as f32;
                        score += freq;
                    }
                }
                
                // Title match gets huge bonus
                if section.title.to_lowercase().contains(word) {
                    score += 10.0;
                }
                
                // Tag match gets medium bonus
                for tag in &section.tags {
                    if tag.contains(word) {
                        score += 5.0;
                    }
                }
            }
            
            // Category priority (personal > context > knowledge)
            match section.category.as_str() {
                "personal" => score *= 2.0,
                "context" => score *= 1.5,
                _ => {}
            }
            
            if score > 0.0 {
                scores.push((idx, score));
            }
        }
        
        // Sort by relevance score
        scores.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        scores.truncate(max_results);
        
        // Always include core personal info if available
        let core_sections = ["personal_identity", "personal_background"];
        for core_id in &core_sections {
            if let Some(idx) = self.sections.iter().position(|s| s.id.contains(core_id)) {
                if !scores.iter().any(|(i, _)| *i == idx) {
                    scores.insert(0, (idx, 100.0)); // High priority
                }
            }
        }
        
        // Build context string
        let mut context = String::new();
        let mut total_length = 0;
        
        context.push_str("# RELEVANT CONTEXT\n\n");
        
        let scores_count = scores.len();
        for (idx, score) in scores {
            let section = &self.sections[idx];
            let section_text = format!(
                "## {} (Relevance: {:.1})\n{}\n\n",
                section.title,
                score,
                section.content
            );
            
            // Check if adding this section would exceed max length
            if total_length + section_text.len() > self.max_context_length {
                context.push_str("\n[Context truncated due to length limits]");
                break;
            }
            
            context.push_str(&section_text);
            total_length += section_text.len();
        }
        
        console_log!("✅ Built context with {} sections, {} chars", scores_count, total_length);
        context
    }
    
    pub fn get_full_context(&self) -> String {
        let mut context = String::new();
        let mut total_length = 0;
        
        // Group by category
        let mut by_category: HashMap<String, Vec<&MarkdownSection>> = HashMap::new();
        for section in &self.sections {
            by_category.entry(section.category.clone())
                .or_insert_with(Vec::new)
                .push(section);
        }
        
        // Output in priority order
        let categories = ["personal", "context", "knowledge"];
        
        for cat in &categories {
            if let Some(sections) = by_category.get(*cat) {
                context.push_str(&format!("\n# {} INFORMATION\n\n", cat.to_uppercase()));
                
                for section in sections {
                    let section_text = format!("## {}\n{}\n\n", section.title, section.content);
                    
                    if total_length + section_text.len() > self.max_context_length {
                        context.push_str("\n[Context truncated due to length limits]");
                        return context;
                    }
                    
                    context.push_str(&section_text);
                    total_length += section_text.len();
                }
            }
        }
        
        context
    }
    
    pub fn set_max_context_length(&mut self, length: usize) {
        self.max_context_length = length;
        console_log!("Set max context length to {} chars", length);
    }
    
    pub fn get_section_count(&self) -> usize {
        self.sections.len()
    }
    
    pub fn get_index_size(&self) -> usize {
        self.index.len()
    }
    
    // Export sections as JSON
    pub fn export_sections(&self) -> String {
        match serde_json::to_string(&self.sections) {
            Ok(json) => json,
            Err(e) => {
                console_log!("Error exporting sections: {}", e);
                "[]".to_string()
            }
        }
    }
    
    // Import sections from JSON
    pub fn import_sections(&mut self, json: &str) {
        match serde_json::from_str::<Vec<MarkdownSection>>(json) {
            Ok(sections) => {
                self.clear();
                for section in sections {
                    self.add_section(section);
                }
                console_log!("Imported {} sections", self.sections.len());
            }
            Err(e) => {
                console_log!("Error importing sections: {}", e);
            }
        }
    }
}
