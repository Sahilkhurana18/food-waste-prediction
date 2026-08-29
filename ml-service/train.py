"""
Trains and compares demand-prediction models on data/food_demand.csv.

Baseline -> Random Forest -> XGBoost, evaluated with MAE / RMSE / R^2 on a
time-based holdout split (last 15% of days per restaurant, so the test set
is genuinely "future" relative to training, not a random shuffle).

Run:
    python train.py
Produces:
    models/model.joblib          (best-performing pipeline)
    models/metrics.json          (comparison table + which model won)
"""

import json
import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

FEATURES_NUMERIC = [
    "day_of_week", "is_weekend", "is_holiday", "month",
    "temperature", "rainfall", "special_event",
    "previous_day_sales", "previous_week_avg_sales", "avg_7day_sales",
]
FEATURES_CATEGORICAL = ["restaurant_id", "meal_type"]
TARGET = "quantity_sold"


def time_based_split(df, test_frac=0.15):
    df = df.sort_values("date")
    cutoff_idx = int(len(df) * (1 - test_frac))
    cutoff_date = df.iloc[cutoff_idx]["date"]
    train = df[df["date"] < cutoff_date]
    test = df[df["date"] >= cutoff_date]
    return train, test


def evaluate(model, X_test, y_test):
    preds = model.predict(X_test)
    mae = mean_absolute_error(y_test, preds)
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = r2_score(y_test, preds)
    return {"MAE": round(mae, 2), "RMSE": round(rmse, 2), "R2": round(r2, 3)}


def build_pipeline(estimator):
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), FEATURES_CATEGORICAL),
        ],
        remainder="passthrough",
    )
    return Pipeline(steps=[("preprocess", preprocessor), ("model", estimator)])


def main():
    df = pd.read_csv("data/food_demand.csv")
    feature_cols = FEATURES_CATEGORICAL + FEATURES_NUMERIC

    train_df, test_df = time_based_split(df)
    X_train, y_train = train_df[feature_cols], train_df[TARGET]
    X_test, y_test = test_df[feature_cols], test_df[TARGET]

    candidates = {
        "Linear Regression": build_pipeline(LinearRegression()),
        "Random Forest": build_pipeline(RandomForestRegressor(n_estimators=300, max_depth=10, random_state=42)),
        "XGBoost": build_pipeline(XGBRegressor(
            n_estimators=300, max_depth=5, learning_rate=0.05,
            subsample=0.9, colsample_bytree=0.9, random_state=42,
        )),
    }

    results = {}
    fitted = {}
    for name, pipe in candidates.items():
        pipe.fit(X_train, y_train)
        results[name] = evaluate(pipe, X_test, y_test)
        fitted[name] = pipe
        print(f"{name:<20} {results[name]}")

    best_name = min(results, key=lambda k: results[k]["MAE"])
    best_pipe = fitted[best_name]
    print(f"\nBest model by MAE: {best_name}")

    joblib.dump(best_pipe, "models/model.joblib")
    with open("models/metrics.json", "w") as f:
        json.dump({
            "comparison": results,
            "best_model": best_name,
            "feature_columns": feature_cols,
            "target": TARGET,
            "train_rows": len(train_df),
            "test_rows": len(test_df),
        }, f, indent=2)

    print("\nSaved models/model.joblib and models/metrics.json")


if __name__ == "__main__":
    main()
