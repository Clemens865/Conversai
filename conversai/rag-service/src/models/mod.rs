use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: Uuid,
    pub source_type: String,
    pub source_uri: String,
    pub content_sha256: String,
    pub document_version: i32,
    pub tags: Option<Vec<String>>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Chunk {
    pub id: Uuid,
    pub document_id: Uuid,
    pub content: String,
    pub content_tokens: Option<i32>,
    pub section: Option<String>,
    pub span: Option<serde_json::Value>,
    pub metadata: Option<serde_json::Value>,
    pub embedding: Option<Vec<f32>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Fact {
    pub id: Uuid,
    pub subject: String,
    pub predicate: String,
    pub object: serde_json::Value,
    pub certainty: f32,
    pub source_uri: Option<String>,
    pub tags: Option<Vec<String>>,
    pub embedding: Option<Vec<f32>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestRequest {
    pub url: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IngestResponse {
    pub document_id: Uuid,
    pub chunks_count: usize,
    pub tokens_estimate: usize,
    pub warnings: Vec<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryRequest {
    pub query: String,
    pub filters: Option<QueryFilters>,
    pub k: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryFilters {
    pub tags: Option<Vec<String>>,
    pub document_ids: Option<Vec<Uuid>>,
    pub date_range: Option<(DateTime<Utc>, DateTime<Utc>)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryResponse {
    pub context: Vec<ChunkWithScore>,
    pub citations: Vec<Citation>,
    pub diagnostics: QueryDiagnostics,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChunkWithScore {
    pub chunk: Chunk,
    pub score: f32,
    pub source_uri: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Citation {
    pub document_id: Uuid,
    pub source_uri: String,
    pub section: Option<String>,
    pub page: Option<i32>,
    pub span: Option<(usize, usize)>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct QueryDiagnostics {
    pub ann_k: usize,
    pub lexical_k: usize,
    pub reranker: Option<String>,
    pub query_time_ms: u64,
    pub embedding_time_ms: u64,
    pub rerank_time_ms: u64,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct FeedbackRequest {
    pub query: String,
    pub selected_chunk_ids: Vec<Uuid>,
    pub useful: bool,
}