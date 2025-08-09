use sha2::{Digest, Sha256};

pub fn calculate_sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

pub fn truncate_text(text: &str, max_chars: usize) -> String {
    if text.len() <= max_chars {
        text.to_string()
    } else {
        let mut truncated = text.chars().take(max_chars - 3).collect::<String>();
        truncated.push_str("...");
        truncated
    }
}