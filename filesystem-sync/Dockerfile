FROM python:3.12-slim

WORKDIR /app

# Install curl for health checks and uv for fast package management
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv

# Copy project files
COPY pyproject.toml README.md ./
COPY src/ src/

# Install dependencies using uv
RUN uv pip install --system -e .

# Create workspace directory (will be mounted in production)
RUN mkdir -p /workspace

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV WORKSPACE_PATH=/workspace

# Expose health check port
EXPOSE 8080

# Run the service
CMD ["python", "-m", "filesystem_sync"]
