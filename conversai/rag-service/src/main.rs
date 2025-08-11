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

    // Database connection - make it optional for health checks
    let database_url = env::var("CONVERSAI_SUPABASE_DB_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .unwrap_or_else(|_| {
            info!("WARNING: No database URL found in environment variables");
            info!("Looking for CONVERSAI_SUPABASE_DB_URL or DATABASE_URL");
            info!("Service will start with limited functionality (health check only)");
            "".to_string()
        });
    
    // Try to connect to database if URL is provided
    let pool = if !database_url.is_empty() {
        info!("Attempting to connect to database...");
        
        match PgPoolOptions::new()
            .max_connections(5)
            .acquire_timeout(std::time::Duration::from_secs(10))
            .connect(&database_url)
            .await {
                Ok(pool) => {
                    info!("Successfully connected to database");
                    Some(pool)
                },
                Err(e) => {
                    eprintln!("WARNING: Failed to connect to database: {}", e);
                    eprintln!("Service starting in health-check-only mode");
                    eprintln!("Add CONVERSAI_SUPABASE_DB_URL or DATABASE_URL to enable full functionality");
                    None
                }
            }
    } else {
        info!("No database URL provided - starting in health-check-only mode");
        None
    };
    
    // For now, if no database is available, we'll still fail but with better error message
    let pool = match pool {
        Some(p) => p,
        None => {
            // Allow service to start for health checks only
            info!("Starting service in health-check-only mode");
            info!("Database endpoints will not be functional");
            // Create a minimal connection pool that will fail if actually used
            PgPoolOptions::new()
                .max_connections(1)
                .connect("postgresql://localhost/dummy")
                .await
                .unwrap_or_else(|_| {
                    // Return a pool that exists but isn't connected
                    // This allows the service to start and respond to health checks
                    sqlx::postgres::PgPool::connect_lazy("postgresql://localhost/dummy")
                        .expect("Failed to create lazy pool")
                })
        }
    };

    // Build our application with routes
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS, Method::PUT, Method::DELETE])
        .allow_headers([
            header::CONTENT_TYPE,
            header::AUTHORIZATION,
            header::ACCEPT,
            header::ORIGIN,
            header::ACCESS_CONTROL_REQUEST_METHOD,
            header::ACCESS_CONTROL_REQUEST_HEADERS,
        ])
        .expose_headers([header::CONTENT_TYPE])
        .max_age(std::time::Duration::from_secs(3600));

    let app = Router::new()
        .route("/", get(root_handler))
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
    
    println!("🚀 Starting server on port {}", port);
    info!("Starting server on port {}", port);
    
    // Bind to all interfaces (0.0.0.0) for Railway
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("🎯 Binding to address: {}", addr);
    info!("RAG service listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr)
        .await
        .expect("Failed to bind to address");
    
    println!("✅ Server successfully bound to {}:{}", "0.0.0.0", port);
    println!("🔗 Health check available at: http://0.0.0.0:{}/health", port);
    
    axum::serve(listener, app).await?;

    Ok(())
}

async fn root_handler() -> Json<serde_json::Value> {
    Json(json!({
        "name": "ConversAI RAG Service",
        "status": "online",
        "endpoints": {
            "health": "/health",
            "ingest": "/api/ingest",
            "query": "/api/query",
            "feedback": "/api/feedback"
        },
        "documentation": "https://github.com/yourusername/conversai",
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

async fn health_check() -> Json<serde_json::Value> {
    let db_connected = env::var("CONVERSAI_SUPABASE_DB_URL")
        .or_else(|_| env::var("DATABASE_URL"))
        .is_ok();
    
    Json(json!({
        "status": "healthy",
        "service": "conversai-rag",
        "version": "1.0.1",
        "database_configured": db_connected,
        "mode": if db_connected { "full" } else { "health-check-only" },
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}