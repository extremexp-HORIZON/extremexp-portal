# Migration TODOs

This document outlines the remaining tasks to complete the migration from the old Flask/MongoDB server (`old-to-migrate-server-experiment`) to the new FastAPI/PostgreSQL server (`portal-server`).

## ⚠️ Missing Features (Review Required)

### DSL Conversion Endpoints

- **Goal:** Expose endpoints to retrieve and update the DSL representation of experiments and workflows.
- **External Service:** There is an external service (currently at `http://host.docker.internal:8866/api`) that performs the actual conversion (JSON <-> DSL).
  - **Note:** This service is NOT in `docker-compose.yaml`. We need to ensure it's accessible or mocked. I could not find its codebase on GitHub.
- **Tasks:**
  1. **Configuration:** Add `DSL_CONVERSION_URL` to environment variables (default to `http://localhost:8866/api`).
  2. **Implement Endpoints:**
      - **GET /experiments/{experiment_id}/dsl**:
        - Fetch experiment from DB.
        - Call external service `POST /experiment2dsl?name={name}` with JSON body.
        - Return DSL text.
      - **PUT /experiments/{experiment_id}/dsl**:
        - Receive DSL text in body.
        - Call external service `POST /dsl2experiment?name={name}` with DSL body.
        - Update experiment `steps` and `graphical_model` in DB with returned JSON.
      - **GET /workflows/{workflow_id}/dsl**:
        - Fetch workflow from DB.
        - Call external service `POST /workflow2dsl?name={name}` with JSON body.
        - Return DSL text.
      - **PUT /workflows/{workflow_id}/dsl**:
        - Receive DSL text in body.
        - Call external service `POST /dsl2workflow?name={name}` with DSL body.
        - Update workflow `graphical_model` in DB with returned JSON.
  3. **Implementation Details:**
      - Use `httpx` for async HTTP calls.
      - Ensure `name` query parameter is properly encoded (use `params` argument in `httpx`).
      - Handle errors from the external service gracefully.

## ❌ Removed features

- **File system synchronization for experiments and workflows**: another service will take care of this.
- **Experiment execution**: it was a PoC.
- **Experiment execution/conversion**: `/exp/execute/convert/<exp_id>` endpoint did seem unused.
