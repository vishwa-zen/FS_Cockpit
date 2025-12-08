# Copilot Instructions for FS Cockpit Backend

## Project Overview

- **FS Cockpit Backend** is a FastAPI-based backend service for IT operations, integrating with external platforms (Intune, Nextthink, ServiceNow).
- The main entry point is `app/main.py`. All API routes are under `app/api/routes/`.
- Services for external integrations are in `app/services/` and clients in `app/clients/`.
- Caching logic is in `app/cache/` (e.g., `memory_cache.py`).
- Configuration is managed via `app/config/settings.py` and `.env` files.
- Logging is handled in `app/logger/log.py`.

## Developer Workflows

- **Install dependencies:**
  ```bash
  pip3 install -r requirements.txt --upgrade
  ```
- **Run development server:**
  ```bash
  uvicorn app.main:app --reload --port 8000
  ```
- **Run production server:**
  ```bash
  gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000
  ```
- **Run tests:**
  ```bash
  pytest tests/
  ```

## Key Patterns & Conventions

- **API routes:** Organized by integration (`intune.py`, `nextthink.py`, `servicenow.py`, etc.) in `app/api/routes/`.
- **Service/Client separation:** Service files (`app/services/`) handle business logic; client files (`app/clients/`) manage external API calls.
- **Caching:** Use `app/cache/memory_cache.py` for in-memory caching.
- **Config:** Use `app/config/settings.py` for environment/configuration management. Sensitive values should be loaded from `.env`.
- **Logging:** Use `app/logger/log.py` for structured logging.
- **Middleware:** Custom middleware (auth, error handling, request ID) is in `app/middleware/`.
- **Schemas:** Pydantic models for request/response validation are in `app/schemas/`.

## Integration Points

- **Intune, Nextthink, ServiceNow:** Each has dedicated client/service/routes files. Example: `app/clients/intune_client.py`, `app/services/intune_service.py`, `app/api/routes/intune.py`.
- **Health Metrics:** Exposed via `app/api/routes/health_metrics.py` and implemented in `app/utils/health_metrics.py`.

## Testing

- Tests are in `tests/`. Use `pytest` for running tests.
- Example test files: `test_intune_service.py`, `test_servicenow_service.py`, `test_request_id.py`.

## Examples

- To add a new integration, create corresponding files in `clients/`, `services/`, and `api/routes/`.
- For new API endpoints, add to the appropriate file in `app/api/routes/` and update Pydantic schemas in `app/schemas/`.

---

**For questions or unclear conventions, check `README.md` or ask for clarification.**
