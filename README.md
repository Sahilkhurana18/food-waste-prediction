# Harvest Loop — Food Waste Prediction & Redistribution Platform

Semester 7 capstone: AI-powered food waste prediction, redistribution
matching, and impact tracking. This root folder ties together all three
services — see each subfolder's own README for details specific to it.

```
food-waste-prediction/
├── docker-compose.yml     # brings up everything together
├── frontend/               # React + Vite + Tailwind — 4 role dashboards
├── backend/                 # Node/Express + PostgreSQL (Prisma) — auth, matching, API
└── ml-service/               # FastAPI + scikit-learn/XGBoost — demand prediction
```

## Run everything

Requires only Docker Desktop.

```bash
cd food-waste-prediction
docker compose up --build
```

First build takes a few minutes (installs dependencies, trains the ML
model, generates the Prisma client, runs migrations). Subsequent starts
are much faster.

Once it's up:

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 (health check: `/health`) |
| ML service docs | http://localhost:8001/docs |
| Postgres | localhost:5432 (user/pass/db: `harvestloop`) |

Stop everything with `Ctrl+C`, or `docker compose down` (add `-v` to also
wipe the database volume and start fresh).

## Run without Docker (for development)

Each service can also run standalone — see:
- `frontend/README.md` — `npm install && npm run dev`
- `backend/README.md` — needs a local Postgres, then `npm run dev`
- `ml-service/README.md` — `pip install -r requirements.txt`, generate data, train, then `uvicorn`

## Current status

- ✅ Frontend: all four dashboards (Restaurant, NGO, Volunteer, Admin) built and interactive
- ✅ ML service: dataset generation, model comparison (Linear Regression / Random Forest / XGBoost), FastAPI `/predict` — tested end to end
- ✅ Backend: auth, restaurants, NGOs, matching algorithm, deliveries, admin routes, `/forecast` proxy to the ML service — verified against a live database
- ✅ Auth: login/register wired to the real backend, session persisted, dashboard routes gated by role (redirects to `/login` if signed out, to your own dashboard if signed in as the wrong role)
- ⬜ Data wiring — `frontend/src/data/mockData.js` still needs to be replaced with real `fetch` calls to the backend (forecast, donations, requests, deliveries, impact metrics)
- ⬜ Real-time notifications (WebSockets)
- ⬜ Route optimization for multi-stop pickups (OR-Tools)

## Suggested next step

Wire each dashboard's data to the real backend now that auth works:
use the `token` from `useAuth()` (see `frontend/src/context/AuthContext.jsx`)
with `authRequest()` in `frontend/src/lib/api.js` to replace the arrays in
`mockData.js`, starting with the Restaurant dashboard's forecast call and
donation list.
