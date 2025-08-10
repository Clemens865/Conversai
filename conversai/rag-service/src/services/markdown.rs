use pulldown_cmark::{Event, Parser, Tag};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MarkdownSection {
    pub content: String,
    pub heading_path: Vec<String>,
    pub level: usize,
    pub start_offset: usize,
    pub end_offset: usize,
}

pub fn parse_markdown(content: &str) -> Vec<MarkdownSection> {
    let parser = Parser::new(content);
    let mut sections = Vec::new();
    let mut current_heading_path = Vec::new();
    let mut current_content = String::new();
    let mut current_level = 0;
    let mut start_offset = 0;
    let mut in_code_block = false;

    for (event, range) in parser.into_offset_iter() {
        match event {
            Event::Start(Tag::Heading(level, _, _)) => {
                // Save previous section if it has content
                if !current_content.trim().is_empty() {
                    sections.push(MarkdownSection {
                        content: current_content.clone(),
                        heading_path: current_heading_path.clone(),
                        level: current_level,
                        start_offset,
                        end_offset: range.start,
                    });
                }
                
                current_content.clear();
                current_level = level as usize;
                start_offset = range.start;
                
                // Update heading path
                while current_heading_path.len() >= current_level {
                    current_heading_path.pop();
                }
            }
            Event::End(Tag::Heading(..)) => {
                // Heading text will be added as regular text
            }
            Event::Text(text) => {
                if current_level > 0 && current_heading_path.len() < current_level {
                    // This is heading text
                    current_heading_path.push(text.to_string());
                }
                current_content.push_str(&text);
                current_content.push(' ');
            }
            Event::Code(code) => {
                current_content.push_str("`");
                current_content.push_str(&code);
                current_content.push_str("`");
                current_content.push(' ');
            }
            Event::Start(Tag::CodeBlock(_)) => {
                in_code_block = true;
                current_content.push_str("```\n");
            }
            Event::End(Tag::CodeBlock(_)) => {
                in_code_block = false;
                current_content.push_str("```\n");
            }
            Event::SoftBreak | Event::HardBreak => {
                if !in_code_block {
                    current_content.push(' ');
                } else {
                    current_content.push('\n');
                }
            }
            _ => {}
        }
    }

    // Save final section
    if !current_content.trim().is_empty() {
        sections.push(MarkdownSection {
            content: current_content,
            heading_path: current_heading_path,
            level: current_level,
            start_offset,
            end_offset: content.len(),
        });
    }

    sections
}