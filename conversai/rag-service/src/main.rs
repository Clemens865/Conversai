use axum::{
    extract::Multipart,
    http::StatusCode,
    routing::{get, post},
    Json, Router,
};
use dotenv::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tracing::{info, Level};
use tracing_subscriber;

mod handlers;
mod models;
mod services;
mod utils;

use handlers::{ingest, query};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables
    dotenv().ok();
    
    // Initialize tracing
    tracing_subscriber::fmt()
        .with_max_level(Level::INFO)
        .init();

    // Database connection
    let database_url = env::var("CONVERSAI_SUPABASE_DB_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/conversai".to_string());
    
    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await?;

    info!("Connected to database");

    // Build our application with routes
    let app = Router::new()
        .route("/health", get(health_check))
        .route("/ingest", post(ingest::handle_ingest))
        .route("/query", post(query::handle_query))
        .route("/feedback", post(handlers::feedback::handle_feedback))
        .layer(
            CorsLayer::new()
                .allow_origin(Any)
                .allow_methods(Any)
                .allow_headers(Any),
        )
        .with_state(pool);

    // Run server
    let addr = SocketAddr::from(([0, 0, 0, 0], 3030));
    info!("RAG service listening on {}", addr);
    
    axum::Server::bind(&addr)
        .serve(app.into_make_service())
        .await?;

    Ok(())
}

async fn health_check() -> StatusCode {
    StatusCode::OK
}