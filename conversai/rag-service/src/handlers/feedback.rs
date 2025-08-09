use axum::{extract::State, http::StatusCode, Json};
use sqlx::PgPool;
use tracing::info;

use crate::models::FeedbackRequest;

pub async fn handle_feedback(
    State(_pool): State<PgPool>,
    Json(request): Json<FeedbackRequest>,
) -> StatusCode {
    // Log feedback for now, implement storage later
    info!(
        "Received feedback - Query: '{}', Useful: {}, Selected chunks: {:?}",
        request.query, request.useful, request.selected_chunk_ids
    );

    // TODO: Store feedback in database for future training/evaluation
    
    StatusCode::OK
}