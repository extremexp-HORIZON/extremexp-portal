FROM python:3.12-slim

WORKDIR /app

# Install uv for fast package management
RUN pip install --no-cache-dir uv

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

# Run the service
CMD ["python", "-m", "filesystem_sync"]
