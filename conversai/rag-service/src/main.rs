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
        .or_else(|_| env::var("DATABASE_URL"))
        .unwrap_or_else(|_| {
            info!("No database URL found in environment variables");
            info!("Looking for CONVERSAI_SUPABASE_DB_URL or DATABASE_URL");
            "postgresql://postgres:postgres@localhost:5432/conversai".to_string()
        });
    
    info!("Attempting to connect to database...");
    
    let pool = match PgPoolOptions::new()
        .max_connections(5)
        .acquire_timeout(std::time::Duration::from_secs(10))
        .connect(&database_url)
        .await {
            Ok(pool) => {
                info!("Successfully connected to database");
                pool
            },
            Err(e) => {
                eprintln!("Failed to connect to database: {}", e);
                eprintln!("Database URL pattern: postgres://user:pass@host:port/database");
                return Err(anyhow::anyhow!("Database connection failed: {}", e));
            }
        };

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
    let port_str = env::var("PORT").unwrap_or_else(|_| {
        info!("PORT environment variable not found, using default 3030");
        "3030".to_string()
    });
    
    let port: u16 = port_str.parse()
        .expect("PORT must be a valid number");
    
    info!("Starting server on port {}", port);
    
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