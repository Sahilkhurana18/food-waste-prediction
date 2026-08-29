"""
FastAPI service that serves the trained demand-prediction model.

Run locally:
    uvicorn app.main:app --reload --port 8001
"""

import json
from datetime import date as date_cls
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

MODEL_PATH = Path("models/model.joblib")
METRICS_PATH = Path("models/metrics.json")

app = FastAPI(title="Harvest Loop — Demand Prediction Service", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten this to your frontend/backend origin(s) before deploying
    allow_methods=["*"],
    allow_headers=["*"],
)

_model = None
_metrics = None


@app.on_event("startup")
def load_model():
    global _model, _metrics
    if not MODEL_PATH.exists():
        raise RuntimeError(
            f"{MODEL_PATH} not found. Run `python data/generate_dataset.py` then `python train.py` first."
        )
    _model = joblib.load(MODEL_PATH)
    if METRICS_PATH.exists():
        _metrics = json.loads(METRICS_PATH.read_text())


class PredictRequest(BaseModel):
    restaurant_id: str = Field(..., examples=["R1"])
    meal_type: str = Field(..., examples=["dinner"])
    date: date_cls = Field(..., description="Date the prediction is for, YYYY-MM-DD")
    is_holiday: bool = False
    special_event: bool = False
    temperature: float = Field(..., description="Forecast temperature in Celsius")
    rainfall: float = Field(0.0, description="Forecast rainfall in mm")
    previous_day_sales: float = Field(..., description="Meals sold on the previous day for this meal type")
    previous_week_avg_sales: float = Field(..., description="Average meals sold over the previous week")
    avg_7day_sales: float = Field(..., description="7-day rolling average of meals sold")
    safety_margin_pct: float = Field(8.0, description="Buffer added on top of predicted demand when recommending prep quantity")


class PredictResponse(BaseModel):
    predicted_demand: int
    recommended_preparation: int
    expected_surplus: int
    model_used: str


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": _model is not None}


@app.get("/model-info")
def model_info():
    if _metrics is None:
        raise HTTPException(status_code=404, detail="No metrics.json found alongside the model.")
    return _metrics


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest):
    if _model is None:
        raise HTTPException(status_code=503, detail="Model not loaded.")

    row = pd.DataFrame([{
        "restaurant_id": req.restaurant_id,
        "meal_type": req.meal_type,
        "day_of_week": req.date.weekday(),
        "is_weekend": 1 if req.date.weekday() >= 5 else 0,
        "is_holiday": int(req.is_holiday),
        "month": req.date.month,
        "temperature": req.temperature,
        "rainfall": req.rainfall,
        "special_event": int(req.special_event),
        "previous_day_sales": req.previous_day_sales,
        "previous_week_avg_sales": req.previous_week_avg_sales,
        "avg_7day_sales": req.avg_7day_sales,
    }])

    predicted_demand = float(_model.predict(row)[0])
    predicted_demand = max(0, round(predicted_demand))
    recommended_prep = round(predicted_demand * (1 + req.safety_margin_pct / 100))
    expected_surplus = recommended_prep - predicted_demand

    best_model_name = _metrics["best_model"] if _metrics else "unknown"

    return PredictResponse(
        predicted_demand=predicted_demand,
        recommended_preparation=recommended_prep,
        expected_surplus=expected_surplus,
        model_used=best_model_name,
    )
