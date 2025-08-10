use axum::{
    http::{Method, header},
    response::Json,
    routing::get,
    Router,
};
use serde_json::json;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Initialize basic logging
    println!("Starting minimal RAG service for health check testing...");
    
    // Build minimal app with just health check
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST, Method::OPTIONS])
        .allow_headers([header::CONTENT_TYPE, header::AUTHORIZATION])
        .expose_headers([header::CONTENT_TYPE]);

    let app = Router::new()
        .route("/health", get(health_check))
        .layer(cors);

    // Get port from environment
    let port_str = env::var("PORT").unwrap_or_else(|_| {
        println!("PORT not found, using 3030");
        "3030".to_string()
    });
    
    let port: u16 = port_str.parse()
        .expect("PORT must be a valid number");
    
    println!("Starting minimal server on port {}", port);
    
    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    println!("Minimal RAG service listening on {}", addr);
    
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn health_check() -> Json<serde_json::Value> {
    Json(json!({
        "status": "healthy",
        "service": "conversai-rag-minimal",
        "version": "1.0.0",
        "note": "Database connection not required for health check"
    }))
}