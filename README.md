# Harvest Loop — Food Waste Prediction & Redistribution Platform



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


