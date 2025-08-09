use anyhow::Result;
use reqwest;
use serde::{Deserialize, Serialize};
use std::env;
use tracing::info;

#[derive(Debug, Serialize)]
struct EmbeddingRequest {
    input: Vec<String>,
    model: String,
}

#[derive(Debug, Deserialize)]
struct EmbeddingResponse {
    data: Vec<EmbeddingData>,
}

#[derive(Debug, Deserialize)]
struct EmbeddingData {
    embedding: Vec<f32>,
}

pub async fn get_embeddings(texts: &[&str]) -> Result<Vec<Vec<f32>>> {
    let api_key = env::var("OPENAI_API_KEY")?;
    let model = env::var("EMBEDDING_MODEL_NAME")
        .unwrap_or_else(|_| "text-embedding-ada-002".to_string());

    let client = reqwest::Client::new();
    
    // Batch texts for efficiency
    let mut all_embeddings = Vec::new();
    
    for chunk in texts.chunks(100) {
        let request = EmbeddingRequest {
            input: chunk.iter().map(|s| s.to_string()).collect(),
            model: model.clone(),
        };

        let response = client
            .post("https://api.openai.com/v1/embeddings")
            .header("Authorization", format!("Bearer {}", api_key))
            .json(&request)
            .send()
            .await?;

        let embedding_response: EmbeddingResponse = response.json().await?;
        
        for data in embedding_response.data {
            all_embeddings.push(data.embedding);
        }
    }

    info!("Generated {} embeddings", all_embeddings.len());
    Ok(all_embeddings)
}

pub fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b.iter()).map(|(x, y)| x * y).sum();
    let norm_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let norm_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    
    if norm_a == 0.0 || norm_b == 0.0 {
        0.0
    } else {
        dot_product / (norm_a * norm_b)
    }
}