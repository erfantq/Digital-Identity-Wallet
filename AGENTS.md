# Repository Guidelines

## Project Structure & Module Organization
The backend lives in `app/src`. Feature modules are split by domain: `auth/`, `did/`, `credential/`, plus shared code in `common/` and blockchain helpers in `blockchain/`. The application entrypoint is `app/src/main.py`, which wires routers, event subscriptions, and metrics. Database migrations live in `alembic/` with configuration in `alembic.ini`. Container files are at the repo root: `Dockerfile`, `docker-compose.yml`, and `DOCKER.md`.

## Build, Test, and Development Commands
Use a virtual environment and install dependencies with `pip install -r requirements.txt`. Run the API locally with `uvicorn app.src.main:app --reload`. Apply schema changes with `alembic upgrade head`. For containerized development, copy `.env.example` to `.env`, then run `docker compose up --build`. Helpful Docker commands:

```powershell
docker compose exec backend alembic upgrade head
docker compose logs -f backend
```

## Coding Style & Naming Conventions
Follow standard Python conventions: 4-space indentation, `snake_case` for functions and variables, `PascalCase` for classes, and descriptive module names such as `router.py`, `service.py`, and `repository.py`. Keep domain logic inside the matching feature package instead of adding cross-feature shortcuts. Prefer explicit imports from `app.src...` for shared modules. No formatter or linter config is committed yet, so keep changes PEP 8-aligned and group imports cleanly.

## Testing Guidelines
`pytest` is listed in feature requirements, but no repository-wide test suite is committed yet. Add new tests under a top-level `tests/` directory or alongside a feature as `test_*.py`. Focus on router behavior, service-layer rules, and migration-sensitive database paths. Run tests with `pytest` before opening a PR.

## Commit & Pull Request Guidelines
Recent commits use short, imperative summaries such as `add auth and did service.(backend logic only)`. Keep commit messages concise and specific to one change. Pull requests should describe the API or schema impact, list any migration or `.env` changes, and include example requests or response snippets when endpoints change. Link the related issue or task when one exists.

## Security & Configuration Tips
Do not commit real secrets from `.env`, wallet material, or event credentials. Use `.env.example` as the template, and treat Alembic migrations and auth changes as review-sensitive areas.
