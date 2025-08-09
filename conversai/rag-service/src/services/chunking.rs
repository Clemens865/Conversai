use serde::{Deserialize, Serialize};
use serde_json::json;
use tiktoken_rs::p50k_base;

use crate::services::markdown::MarkdownSection;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Chunk {
    pub content: String,
    pub section: String,
    pub tokens: usize,
    pub span: serde_json::Value,
    pub metadata: serde_json::Value,
}

pub fn chunk_sections(sections: &[MarkdownSection], max_tokens: usize, overlap_tokens: usize) -> Vec<Chunk> {
    let tokenizer = p50k_base().unwrap();
    let mut chunks = Vec::new();

    for section in sections {
        let tokens = tokenizer.encode_with_special_tokens(&section.content);
        let token_count = tokens.len();

        if token_count <= max_tokens {
            // Section fits in one chunk
            chunks.push(Chunk {
                content: section.content.clone(),
                section: section.heading_path.join(" > "),
                tokens: token_count,
                span: json!({
                    "start_char": section.start_offset,
                    "end_char": section.end_offset
                }),
                metadata: json!({
                    "heading_path": section.heading_path,
                    "level": section.level
                }),
            });
        } else {
            // Split section into multiple chunks
            let mut start = 0;
            while start < tokens.len() {
                let end = (start + max_tokens).min(tokens.len());
                
                // Try to find a sentence boundary near the end
                let chunk_tokens = &tokens[start..end];
                let chunk_text = tokenizer.decode(chunk_tokens.to_vec()).unwrap();
                
                // Calculate character offsets
                let char_start = if start == 0 {
                    section.start_offset
                } else {
                    section.start_offset + (start * 3) // Rough approximation
                };
                
                let char_end = if end == tokens.len() {
                    section.end_offset
                } else {
                    section.start_offset + (end * 3) // Rough approximation
                };

                chunks.push(Chunk {
                    content: chunk_text,
                    section: section.heading_path.join(" > "),
                    tokens: chunk_tokens.len(),
                    span: json!({
                        "start_char": char_start,
                        "end_char": char_end
                    }),
                    metadata: json!({
                        "heading_path": section.heading_path,
                        "level": section.level,
                        "chunk_index": chunks.len()
                    }),
                });

                // Move to next chunk with overlap
                if end < tokens.len() {
                    start = end - overlap_tokens;
                } else {
                    break;
                }
            }
        }
    }

    chunks
}

pub fn estimate_tokens(text: &str) -> usize {
    // Simple estimation: ~1 token per 4 characters
    text.len() / 4
}