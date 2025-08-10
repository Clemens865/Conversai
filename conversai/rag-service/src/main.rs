use axum::{
    http::{Method, header},
    response::Json,
    routing::{get, post},
    Router,
};
use dotenv::dotenv;
use serde_json::json;
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
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .expose_headers([header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(health_check))
        .route("/api/ingest", post(ingest::handle_ingest))
        .route("/api/query", post(query::handle_query))
        .route("/api/feedback", post(handlers::feedback::handle_feedback))
        // Legacy routes for backward compatibility
        .route("/ingest", post(ingest::handle_ingest))
        .route("/query", post(query::handle_query))
        .route("/feedback", post(handlers::feedback::handle_feedback))
        .layer(cors)
        .with_state(pool);

    // Run server - use PORT env var from Railway or default to 3030
    let port: u16 = env::var("PORT")
        .unwrap_or_else(|_| "3030".to_string())
        .parse()
        .expect("PORT must be a number");
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    info!("RAG service listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "healthy",
        "service": "conversai-rag",
        "version": "1.0.0"
    }))
}