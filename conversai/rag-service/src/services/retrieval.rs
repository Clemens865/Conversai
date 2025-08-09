use anyhow::Result;
use sqlx::{PgPool, Row};
use std::collections::HashMap;
use tracing::info;

use crate::models::Chunk;
use crate::services::embedding::cosine_similarity;

#[derive(Debug, Clone)]
pub struct ChunkWithScore {
    pub chunk: Chunk,
    pub score: f32,
    pub source_uri: Option<String>,
}

pub async fn hybrid_search(
    pool: &PgPool,
    query_embedding: &[f32],
    query_text: &str,
    k: i32,
    filter_tags: Option<&Vec<String>>,
) -> Result<Vec<ChunkWithScore>> {
    // Use the hybrid_search function we defined in SQL
    let rows = sqlx::query(
        r#"
        SELECT 
            chunk_id,
            document_id,
            content,
            section,
            metadata,
            semantic_score,
            lexical_score,
            combined_score
        FROM hybrid_search($1::vector, $2, $3, $4)
        "#
    )
    .bind(query_embedding)
    .bind(query_text)
    .bind(k)
    .bind(filter_tags)
    .fetch_all(pool)
    .await?;

    let mut results = Vec::new();
    for row in rows {
        let chunk = Chunk {
            id: row.get("chunk_id"),
            document_id: row.get("document_id"),
            content: row.get("content"),
            content_tokens: None,
            section: row.get("section"),
            span: row.get("metadata"),
            metadata: row.get("metadata"),
            embedding: None,
            created_at: chrono::Utc::now(),
        };

        results.push(ChunkWithScore {
            chunk,
            score: row.get("combined_score"),
            source_uri: None,
        });
    }

    info!("Hybrid search returned {} results", results.len());
    Ok(results)
}

pub fn rerank_chunks(chunks: &[ChunkWithScore], query_embedding: &[f32], top_k: usize) -> Vec<ChunkWithScore> {
    let mut reranked = chunks.to_vec();
    
    // Simple cosine similarity reranking for now
    // In production, use a cross-encoder model
    if let Some(first_chunk) = chunks.first() {
        if let Some(ref embedding) = first_chunk.chunk.embedding {
            for chunk in &mut reranked {
                if let Some(ref chunk_embedding) = chunk.chunk.embedding {
                    chunk.score = cosine_similarity(query_embedding, chunk_embedding);
                }
            }
        }
    }

    // Sort by score descending
    reranked.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    // Enforce diversity: max 2 chunks per document
    let mut seen_docs = HashMap::new();
    let mut diverse_results = Vec::new();
    
    for chunk in reranked {
        let count = seen_docs.entry(chunk.chunk.document_id).or_insert(0);
        if *count < 2 {
            *count += 1;
            diverse_results.push(chunk);
            if diverse_results.len() >= top_k {
                break;
            }
        }
    }

    diverse_results
}

pub async fn get_document_source_uri(pool: &PgPool, document_id: uuid::Uuid) -> Result<String> {
    let source_uri: String = sqlx::query_scalar(
        "SELECT source_uri FROM documents WHERE id = $1"
    )
    .bind(document_id)
    .fetch_one(pool)
    .await?;

    Ok(source_uri)
}