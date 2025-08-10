# Build stage
FROM rust:latest as builder

WORKDIR /app

# Copy manifests from the rag-service directory (Railway builds from repo root)
COPY conversai/rag-service/Cargo.toml conversai/rag-service/Cargo.lock ./

# Copy source code from the rag-service directory
COPY conversai/rag-service/src ./src

# Build for release
RUN cargo build --release

# Runtime stage
FROM debian:bookworm-slim

# Install OpenSSL and CA certificates (required for HTTPS)
RUN apt-get update && apt-get install -y \
    ca-certificates \
    libssl3 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy the binary from builder
COPY --from=builder /app/target/release/conversai-rag /app/conversai-rag

# Create a non-root user
RUN useradd -m -u 1001 appuser && chown -R appuser:appuser /app
USER appuser

# Railway will dynamically assign PORT env var
# No need to EXPOSE a specific port

# Set environment variables (will be overridden by deployment platform)
ENV RUST_LOG=info

# Run the binary
CMD ["./conversai-rag"]