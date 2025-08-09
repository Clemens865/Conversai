use axum::{
    extract::{Multipart, State},
    http::StatusCode,
    Json,
};
use bytes::Bytes;
use sha2::{Digest, Sha256};
use sqlx::PgPool;
use tracing::info;
use uuid::Uuid;

use crate::models::{Document, IngestRequest, IngestResponse};
use crate::services::{chunking, embedding, markdown};

pub async fn handle_ingest(
    State(pool): State<PgPool>,
    mut multipart: Multipart,
) -> Result<Json<IngestResponse>, StatusCode> {
    let mut file_data: Option<Bytes> = None;
    let mut filename: Option<String> = None;
    let mut tags: Vec<String> = Vec::new();

    // Parse multipart data
    while let Some(field) = multipart.next_field().await.unwrap() {
        let field_name = field.name().unwrap_or("").to_string();
        
        match field_name.as_str() {
            "file" => {
                filename = field.file_name().map(|s| s.to_string());
                file_data = Some(field.bytes().await.unwrap());
            }
            "tags" => {
                let text = field.text().await.unwrap();
                tags = text.split(',').map(|s| s.trim().to_string()).collect();
            }
            _ => {}
        }
    }

    let file_data = file_data.ok_or(StatusCode::BAD_REQUEST)?;
    let filename = filename.ok_or(StatusCode::BAD_REQUEST)?;

    // Calculate SHA256
    let mut hasher = Sha256::new();
    hasher.update(&file_data);
    let sha256 = format!("{:x}", hasher.finalize());

    // Check if document already exists
    let existing = sqlx::query_as::<_, Document>(
        "SELECT * FROM documents WHERE content_sha256 = $1"
    )
    .bind(&sha256)
    .fetch_optional(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let document_id = if let Some(doc) = existing {
        info!("Document already exists with ID: {}", doc.id);
        doc.id
    } else {
        // Upload to Supabase Storage (placeholder for now)
        let source_uri = format!("storage://{}", filename);

        // Insert document
        let doc = sqlx::query_as::<_, Document>(
            r#"
            INSERT INTO documents (source_type, source_uri, content_sha256, tags)
            VALUES ($1, $2, $3, $4)
            RETURNING *
            "#
        )
        .bind("md") // Assuming markdown for now
        .bind(&source_uri)
        .bind(&sha256)
        .bind(&tags)
        .fetch_one(&pool)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Parse markdown
        let content = String::from_utf8_lossy(&file_data);
        let sections = markdown::parse_markdown(&content);

        // Chunk sections
        let chunks = chunking::chunk_sections(&sections, 500, 50);

        // Get embeddings
        let texts: Vec<&str> = chunks.iter().map(|c| c.content.as_str()).collect();
        let embeddings = embedding::get_embeddings(&texts).await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Insert chunks
        for (chunk, embedding) in chunks.iter().zip(embeddings.iter()) {
            sqlx::query(
                r#"
                INSERT INTO chunks (document_id, content, content_tokens, section, span, metadata, embedding)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                "#
            )
            .bind(doc.id)
            .bind(&chunk.content)
            .bind(chunk.tokens as i32)
            .bind(&chunk.section)
            .bind(&chunk.span)
            .bind(&chunk.metadata)
            .bind(embedding)
            .execute(&pool)
            .await
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }

        info!("Ingested document {} with {} chunks", doc.id, chunks.len());
        doc.id
    };

    // Get chunk count
    let chunk_count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM chunks WHERE document_id = $1"
    )
    .bind(document_id)
    .fetch_one(&pool)
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(IngestResponse {
        document_id,
        chunks_count: chunk_count as usize,
        tokens_estimate: chunk_count as usize * 400, // Rough estimate
        warnings: vec![],
    }))
}