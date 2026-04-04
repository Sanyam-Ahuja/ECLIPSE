# CampuGrid Server — Production Dockerfile
FROM python:3.12-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    pkg-config \
    libssl-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /build
COPY pyproject.toml .
# Create a dummy src/app/__init__.py for hatchling build if needed, 
# but usually pip install -r or pip install . works.
# Since we use hatchling, we can just install the dependencies.
RUN pip install --no-cache-dir --prefix=/install .

# --- Final Production Image ---
FROM python:3.12-slim

WORKDIR /app

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY . .

# Environment defaults for Docker networking
ENV SERVER_HOST=0.0.0.0
ENV SERVER_PORT=8000
ENV REDIS_URL=redis://redis:6379/0
ENV DATABASE_URL=postgresql+asyncpg://campugrid:campugrid_dev_password@postgres:5432/campugrid
ENV MINIO_ENDPOINT=minio:9000

# Metadata
EXPOSE 8000

# Default command (overridden by docker-compose for workers/beat)
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
