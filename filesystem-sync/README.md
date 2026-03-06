# Filesystem-Sync Service

Synchronizes experiments and workflows between the filesystem and PostgreSQL database. The **filesystem is the source of truth**.

## Overview

This service watches for `.xxp` file changes in the workspace directory and keeps the PostgreSQL database in sync. It also listens to database changes (via PostgreSQL LISTEN/NOTIFY) and updates files accordingly.

## Features

- **Bidirectional sync**: File ↔ Database synchronization
- **Loop prevention**: Uses time-based event registry to prevent infinite sync loops
- **Conversion service**: Translates between DSL format (files) and JSON format (database)
- **Initial sync**: Reconciles filesystem and database on startup
- **Error handling**: Creates `.xxp.err` files when conversion fails
- **Path validation**: Prevents directory traversal attacks

## Filesystem Structure

```
/workspace/
└── <username>/
    ├── experiments/
    │   ├── Experiment-1.xxp
    │   ├── Experiment-1.xxp.err   # Created on conversion error
    │   └── ...
    └── workflows/
        ├── Workflow-1.xxp
        └── ...
```

## Usage

### Running Locally

```bash
# Install dependencies
cd filesystem-sync
uv sync

# Run the service
python -m filesystem_sync

# With options
python -m filesystem_sync --sync-mode=sync --log-level=DEBUG
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `--sync-mode` | Initial sync mode: `warn`, `sync`, `full` | From env or `warn` |
| `--log-level` | Logging level: `DEBUG`, `INFO`, `WARNING`, `ERROR` | From env or `INFO` |
| `--workspace` | Workspace directory path | From env or `/workspace` |

### Sync Modes

| Mode | Description |
|------|-------------|
| `warn` | Only log discrepancies between filesystem and database |
| `sync` | Sync filesystem to database (add missing, update existing) |
| `full` | Full reconciliation (also delete orphaned database records) |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WORKSPACE_PATH` | `/workspace` | Root directory for user files |
| `POSTGRES_HOST` | `localhost` | PostgreSQL host |
| `POSTGRES_PORT` | `5432` | PostgreSQL port |
| `POSTGRES_USER` | `postgres` | PostgreSQL username |
| `POSTGRES_PASSWORD` | `postgres` | PostgreSQL password |
| `POSTGRES_DB` | `extremexp` | PostgreSQL database name |
| `CONVERSION_SERVICE_URL` | `http://host.docker.internal:8866/api` | DSL conversion service |
| `EMF_SERVICE_URL` | `http://emf-cloud-service:8081/api/v2` | EMF cloud service |
| `SYNC_MODE` | `warn` | Initial sync mode |
| `LOG_LEVEL` | `INFO` | Logging level |
| `IGNORE_EXPIRY_SECONDS` | `6` | Event registry expiry time |
| `HTTP_TIMEOUT_SECONDS` | `30` | HTTP client timeout |

## Docker

### Build

```bash
docker build -t filesystem-sync ./filesystem-sync
```

### Run

```bash
docker run -v ./workspace:/workspace \
  -e POSTGRES_HOST=postgresql \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=extremexp \
  filesystem-sync
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           filesystem-sync                                │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │  File Watcher    │         │   DB Listener    │                      │
│  │  (watchdog)      │         │  (asyncpg LISTEN)│                      │
│  └────────┬─────────┘         └────────┬─────────┘                      │
│           │                            │                                 │
│           ▼                            ▼                                 │
│  ┌─────────────────────────────────────────────────────────────┐        │
│  │                   Event Registry                             │        │
│  │         (prevents infinite loops, 6s expiry)                 │        │
│  └─────────────────────────────────────────────────────────────┘        │
│           │                            │                                 │
│           ▼                            ▼                                 │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │ FileToDatabaseSync│        │ DatabaseToFileSync│                     │
│  └──────────────────┘         └──────────────────┘                      │
│           │                            │                                 │
│           ▼                            ▼                                 │
│  ┌──────────────────┐         ┌──────────────────┐                      │
│  │ DMS API          │◄───────►│  Repository      │                      │
│  │ (DSL ↔ JSON)     │         │  (SQLModel)      │                      │
│  └──────────────────┘         └──────────────────┘                      │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
         │                              │
         ▼                              ▼
┌──────────────────┐          ┌──────────────────┐
│   /workspace/    │          │   PostgreSQL     │
│  <user>/exp/*.xxp│          │  (experiments,   │
│  <user>/wf/*.xxp │          │   workflows)     │
└──────────────────┘          └──────────────────┘
```

## Module Structure

```
src/filesystem_sync/
├── __init__.py
├── __main__.py         # CLI entry point
├── app.py              # Application orchestration
├── config.py           # Configuration management
│
├── db/                 # Database layer
│   ├── connection.py   # Async SQLAlchemy engine
│   ├── models.py       # SQLModel models
│   ├── repository.py   # CRUD operations
│   └── listener.py     # PostgreSQL LISTEN/NOTIFY
│
├── filesystem/         # Filesystem layer
│   ├── operations.py   # Safe file read/write/delete
│   ├── watcher.py      # Watchdog observer
│   └── handlers.py     # File event handlers
│
├── conversion/         # DMS and EMF integration
│   ├── client.py       # HTTP client for the DMS API
│   ├── emf_client.py   # HTTP client for EMF Cloud
│   └── payloads.py     # DMS payload translation helpers
│
├── sync/               # Synchronization logic
│   ├── event_registry.py  # Loop prevention
│   ├── file_to_db.py      # File → Database sync
│   ├── db_to_file.py      # Database → File sync
│   └── initial.py         # Startup reconciliation
│
└── security/           # Security utilities
    └── path_validation.py  # Path traversal prevention
```

## Development

### Install Development Dependencies

```bash
uv sync --extra dev
```

### Run Tests

```bash
pytest
```

### Linting

```bash
ruff check src/
ruff format src/
```

## See Also

- [PLAN.md](PLAN.md) - Detailed implementation plan
- [TODO.md](TODO.md) - Outstanding tasks
