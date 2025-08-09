use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use std::time::Instant;
use tracing::info;

use crate::models::{
    ChunkWithScore, Citation, QueryDiagnostics, QueryRequest, QueryResponse,
};
use crate::services::{embedding, retrieval};

pub async fn handle_query(
    State(pool): State<PgPool>,
    Json(request): Json<QueryRequest>,
) -> Result<Json<QueryResponse>, StatusCode> {
    let start = Instant::now();
    
    // Get query embedding
    let embedding_start = Instant::now();
    let query_embedding = embedding::get_embeddings(&[&request.query]).await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .into_iter()
        .next()
        .ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    let embedding_time = embedding_start.elapsed();

    // Perform hybrid search
    let k = request.k.unwrap_or(10);
    let chunks = retrieval::hybrid_search(
        &pool,
        &query_embedding,
        &request.query,
        k,
        request.filters.as_ref().and_then(|f| f.tags.as_ref()),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // Rerank results
    let rerank_start = Instant::now();
    let reranked = retrieval::rerank_chunks(&chunks, &query_embedding, 8);
    let rerank_time = rerank_start.elapsed();

    // Convert to response format
    let context: Vec<ChunkWithScore> = reranked
        .iter()
        .map(|c| ChunkWithScore {
            chunk: c.chunk.clone(),
            score: c.score,
            source_uri: c.source_uri.clone().unwrap_or_default(),
        })
        .collect();

    // Extract citations
    let citations: Vec<Citation> = reranked
        .iter()
        .map(|c| {
            let span = c.chunk.span.as_ref().and_then(|s| {
                let start = s.get("start_char").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                let end = s.get("end_char").and_then(|v| v.as_u64()).unwrap_or(0) as usize;
                Some((start, end))
            });

            Citation {
                document_id: c.chunk.document_id,
                source_uri: c.source_uri.clone().unwrap_or_default(),
                section: c.chunk.section.clone(),
                page: c.chunk.span.as_ref()
                    .and_then(|s| s.get("page"))
                    .and_then(|v| v.as_i64())
                    .map(|p| p as i32),
                span,
            }
        })
        .collect();

    let query_time = start.elapsed();

    info!(
        "Query processed in {:?} with {} results",
        query_time,
        context.len()
    );

    Ok(Json(QueryResponse {
        context,
        citations,
        diagnostics: QueryDiagnostics {
            ann_k: k as usize * 2,
            lexical_k: k as usize * 2,
            reranker: Some("cosine".to_string()),
            query_time_ms: query_time.as_millis() as u64,
            embedding_time_ms: embedding_time.as_millis() as u64,
            rerank_time_ms: rerank_time.as_millis() as u64,
        },
    }))
}