# Harvest Loop — Backend

Node.js + Express + PostgreSQL (via Prisma) backend for the capstone.
Handles auth, restaurants, NGOs, donations, requests, matching, deliveries,
and proxies demand forecasts to the FastAPI ML service.

## Project structure

```
backend/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
│       └── 20260823120000_init/migration.sql
├── src/
│   ├── index.js               # app entry point
│   ├── lib/prisma.js
│   ├── middleware/auth.js      # JWT verification + role guard
│   ├── utils/matching.js       # haversine distance + match scoring
│   └── routes/
│       ├── auth.routes.js
│       ├── restaurants.routes.js
│       ├── ngos.routes.js
│       ├── deliveries.routes.js
│       ├── forecast.routes.js
│       └── admin.routes.js
├── .env.example
├── Dockerfile
├── docker-compose.yml          # backend + Postgres
└── package.json
```

## Data model

Mirrors the schema from the project plan: `User` (with a `role`) owns one
of `Restaurant` / `NGO` / `Volunteer`. Restaurants log `FoodRecord`s and
post `Donation`s. NGOs post `Request`s and accept donations, which creates
a `Match` (scored by the matching algorithm). Every accepted `Match` gets
a `Delivery` that a volunteer can claim and move through
`ASSIGNED → PICKED_UP → DELIVERED`.

## Run locally (no Docker)

Requires Node 20+ and a running PostgreSQL instance (local or Docker).

```bash
cd backend
cp .env.example .env        # then edit DATABASE_URL / JWT_SECRET as needed
npm install
npx prisma migrate deploy    # applies the included initial migration
npm run dev
```

Server listens on `http://localhost:4000` (see `PORT` in `.env`).

## Run with Docker (backend + Postgres)

```bash
cd backend
docker compose up --build
```

This starts Postgres and the backend together; the backend automatically
runs `prisma migrate deploy` on startup, so the schema is created on first
boot. API is reachable at `http://localhost:4000`.

Note: the first `docker build` needs internet access to download Prisma's
query engine binaries from `binaries.prisma.sh` — this works from a normal
network, it just isn't reachable from this sandboxed environment where the
code was authored.

## Running the full stack together

You now have three folders: `frontend/`, `ml-service/`, `backend/`. To run
everything with one command, put them as siblings and create one root
`docker-compose.yml` that references all three, e.g.:

```yaml
services:
  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: harvestloop
      POSTGRES_PASSWORD: harvestloop
      POSTGRES_DB: harvestloop
    ports: ["5432:5432"]

  ml-service:
    build: ./ml-service
    ports: ["8001:8001"]

  backend:
    build: ./backend
    environment:
      DATABASE_URL: "postgresql://harvestloop:harvestloop@db:5432/harvestloop?schema=public"
      JWT_SECRET: "change-this"
      ML_SERVICE_URL: "http://ml-service:8001"
      CORS_ORIGIN: "http://localhost:5173"
    ports: ["4000:4000"]
    depends_on: [db, ml-service]

  frontend:
    build: ./frontend
    ports: ["3000:80"]
    depends_on: [backend]
```

(Adjust folder names to match wherever you place them relative to this
compose file.)

## Auth

- `POST /auth/register` — `{ name, email, password, role, profile }`.
  `role` is `RESTAURANT` | `NGO` | `VOLUNTEER` | `ADMIN`. `profile` supplies
  the role-specific fields (`name`, `latitude`, `longitude`, etc.) — get
  real coordinates from a geocoding call on the frontend, or a map picker.
- `POST /auth/login` — `{ email, password }` → `{ token, user }`
- All other routes require `Authorization: Bearer <token>`.

## Key endpoints

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/restaurants/food-records` | RESTAURANT | Log a day's prepared/sold |
| POST | `/restaurants/donations` | RESTAURANT | Post surplus for redistribution |
| GET | `/ngos/donations/available` | NGO | Browse + score nearby donations |
| POST | `/ngos/donations/:id/accept` | NGO | Accept a donation → creates a Match + Delivery |
| POST | `/ngos/requests` | NGO | Open a food request |
| GET | `/deliveries/available` | VOLUNTEER | Unclaimed deliveries |
| POST | `/deliveries/:id/claim` | VOLUNTEER | Claim a delivery |
| PATCH | `/deliveries/:id/status` | VOLUNTEER | Advance to PICKED_UP / DELIVERED |
| POST | `/forecast` | RESTAURANT | Proxies to the ML service's `/predict`, using this restaurant's own recent history |
| GET | `/admin/impact` | ADMIN | Platform-wide metrics for the Admin dashboard |

## What I verified without a live database

Prisma's query engine binaries download from `binaries.prisma.sh`, which
wasn't reachable in the sandbox this was built in — so `prisma generate`
and a full request/response test against a live Postgres couldn't be run
here. What *was* verified:

- Every source file passes `node --check` (no syntax errors)
- The matching algorithm (`src/utils/matching.js`) was run directly with
  realistic Delhi coordinates — a nearby NGO with a matching urgent
  request scored 88.8 vs. 58.2 for a distant one, confirming the scoring
  weights behave as intended

Run `npx prisma generate` and `npm run dev` on your machine (which has
normal internet access) to bring the database-backed routes online — if
anything doesn't match up, send me the error and I'll fix it.

## Next steps

- Wire the frontend's `mockData.js` calls over to these endpoints
- Add input validation (e.g. zod) on request bodies
- Add rate limiting / helmet for basic hardening before any real deployment
- Consider a scheduled job (cron or a simple script) that retrains the ML
  model periodically and only promotes it if it beats the current one —
  see the ML service README for why this matters
