# Harvest Loop — Demand Prediction Service

The ML component of the capstone: predicts expected meals sold for a given
restaurant/meal/day, then derives a recommended preparation quantity with
a safety margin. Served as a small FastAPI microservice so the Node/Express
backend (and eventually the frontend) can call it over HTTP, per the
"React → Node → Python ML API" architecture from the project plan.

## What's in here

```
ml-service/
├── data/
│   └── generate_dataset.py   # builds a synthetic dataset from realistic rules
├── train.py                   # trains + compares 3 models, saves the best one
├── app/
│   └── main.py                 # FastAPI app serving /predict
├── models/                     # model.joblib + metrics.json land here after training
├── requirements.txt
├── Dockerfile
└── .dockerignore
```

## About the dataset

`data/generate_dataset.py` generates a **synthetic** dataset for 5 restaurants
over ~15 months (two meal periods per day), built from explicit rules:
weekday/weekend multipliers, a holiday boost, a rain penalty, a random
"special event" boost, and per-restaurant baseline demand and
over-preparation tendencies, plus random noise on top.

**This is synthetic data, not real point-of-sale history — label it as such
in your report.** When real data becomes available (from participating
restaurants, or a public food-service dataset), swap it in with the same
column names and everything downstream keeps working unchanged.

Features used (matching the plan's feature list):
`day_of_week, is_weekend, is_holiday, month, temperature, rainfall,
restaurant_id, meal_type, previous_day_sales, previous_week_avg_sales,
avg_7day_sales, special_event` → target: `quantity_sold`.

## Model comparison — actual results

Trained on a **time-based split** (test set = last 15% of days, so the
model is genuinely evaluated on "future" data, not a random shuffle):

| Model              | MAE  | RMSE | R²    |
|---------------------|------|------|-------|
| Linear Regression    | 3.77 | 5.16 | 0.936 |
| Random Forest         | 2.53 | 3.48 | 0.971 |
| XGBoost                | 2.53 | 3.52 | 0.970 |

These are real numbers from a training run on the generated synthetic
dataset (not placeholders) — regenerate them yourself any time by running
the training steps below. On this dataset, Random Forest and XGBoost are
effectively tied and both clearly beat the linear baseline; `train.py`
automatically selects the lower-MAE model and saves it. Expect the exact
numbers to shift slightly on real data.

## Run locally (no Docker)

Requires Python 3.11+.

```bash
cd ml-service
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

python data/generate_dataset.py   # writes data/food_demand.csv
python train.py                    # writes models/model.joblib + metrics.json

uvicorn app.main:app --reload --port 8001
```

Visit `http://localhost:8001/docs` for the interactive Swagger UI, or test
directly:

```bash
curl -X POST http://localhost:8001/predict \
  -H "Content-Type: application/json" \
  -d '{
    "restaurant_id": "R1",
    "meal_type": "dinner",
    "date": "2026-08-24",
    "is_holiday": false,
    "special_event": false,
    "temperature": 31.5,
    "rainfall": 1.2,
    "previous_day_sales": 88,
    "previous_week_avg_sales": 84,
    "avg_7day_sales": 85
  }'
```

Response:

```json
{
  "predicted_demand": 75,
  "recommended_preparation": 81,
  "expected_surplus": 6,
  "model_used": "Random Forest"
}
```

## Run with Docker

```bash
cd ml-service
docker build -t harvest-loop-ml .
docker run -p 8001:8001 harvest-loop-ml
```

The Dockerfile generates the dataset and trains the model **at build time**,
so the image comes up ready to serve. For a real deployment, you'd swap
that step for copying in a pre-trained `model.joblib` (or a real dataset)
rather than retraining on every build.

## Endpoints

- `GET /health` — liveness check, confirms the model is loaded
- `GET /model-info` — the full metrics.json (comparison table, best model, feature list)
- `POST /predict` — the main endpoint, see example above

## Wiring this into the rest of the stack

- The Node/Express backend should call `POST /predict` (e.g.
  `http://ml-service:8001/predict` if both run in the same Docker Compose
  network) rather than the frontend calling it directly — keeps the ML
  service internal and lets Node handle auth, persistence, and combining
  the prediction with donation/matching logic.
- `previous_day_sales`, `previous_week_avg_sales`, and `avg_7day_sales`
  need to come from real historical `food_records` once the database
  exists — for now they're supplied directly in the request.
- To add this service to the frontend's `docker-compose.yml`, add it as
  another `services:` entry alongside `frontend`, and add a bridge network
  so containers can reach each other by service name.
