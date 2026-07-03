# Docker Guide

## Build and run

1. Create a local environment file:

```powershell
Copy-Item .env.example .env
```

2. Build and start the stack:

```powershell
docker compose up --build
```

## Service URLs

- Backend: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- RabbitMQ Management UI: http://localhost:15672
  Default login: `guest` / `guest`

## Postgres

- Host: `localhost`
- Port: `5432`

## Run migrations

```powershell
docker compose exec backend alembic upgrade head
```

## View backend logs

```powershell
docker compose logs -f backend
```

## Stop the stack

```powershell
docker compose down
```

## Stop and remove volumes

```powershell
docker compose down -v
```
