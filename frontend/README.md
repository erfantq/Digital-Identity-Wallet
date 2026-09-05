# Digital Identity Wallet — Frontend

React frontend for the university Digital Identity Wallet platform.

## Stack

- Vite + React (JavaScript)
- React Router
- Plain CSS design tokens (Stitch designs applied page-by-page)

## Setup

```powershell
cd frontend
copy .env.example .env
npm install
npm run dev
```

Set `VITE_API_BASE_URL` in `.env` (default: `http://localhost:8000`).

Ensure the FastAPI backend is running:

```powershell
uvicorn app.src.main:app --reload
```

## Routes (scaffold)

| Route | Role | Endpoints |
| --- | --- | --- |
| `/` | Public | — |
| `/login` | Public | `POST /auth/login` |
| `/verify` | Public | `POST /credentials/verify` |
| `/wallet` | Student / teacher / user | credentials + DID |
| `/admin` | Admin | register, issue, revoke, trust |

Placeholder pages declare their backend endpoints and await Stitch designs.

## Auth

- JWT stored in `localStorage` (`diw_access_token`)
- Login uses OAuth2 form encoding (`username` / `password`)
- Role-based redirects: admin → `/admin`, others → `/wallet`

## Async / on-chain UI

Use `StatusBadge` and helpers in `src/utils/chainStatus.js` when implementing screens. Never treat local API success as on-chain finality.
