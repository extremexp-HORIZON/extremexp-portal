# syntax=docker/dockerfile:1.7
FROM python:3.12-slim-trixie AS builder
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_SYSTEM_PYTHON=1
WORKDIR /app

# Install dependencies
RUN --mount=type=cache,target=/root/.cache/uv \
  --mount=type=bind,source=uv.lock,target=uv.lock \
  --mount=type=bind,source=pyproject.toml,target=pyproject.toml \
  uv sync --locked --no-install-project --no-editable

# Copy the project into the intermediate image
ADD . /app

# Sync the project
RUN --mount=type=cache,target=/root/.cache/uv \
  uv sync --locked --no-editable --compile-bytecode


FROM python:3.12-slim-trixie AS runtime

RUN groupadd --gid 1000 app && \
  useradd --uid 1000 --gid app --shell /bin/bash --create-home app
USER app
WORKDIR /app
ENV PYTHONUNBUFFERED=1
COPY --from=builder --chown=app:app /app/ /app/

EXPOSE 8000

CMD ["/app/.venv/bin/python", "main.py", "--host", "0.0.0.0", "--port", "8000"]
