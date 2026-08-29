"""
Generates a synthetic restaurant food-demand dataset.

This is SYNTHETIC data built from realistic rules (weekday/weekend effects,
holiday and rain effects, per-restaurant baseline demand, per-restaurant
over-preparation tendency, and random noise). It is a stand-in for real
point-of-sale history and should be clearly labeled as synthetic in any
academic report, per the project brief.

Run:
    python data/generate_dataset.py
Produces:
    data/food_demand.csv
"""

import numpy as np
import pandas as pd
from datetime import datetime, timedelta

RNG = np.random.default_rng(42)

RESTAURANTS = [
    {"id": "R1", "name": "Spice Route Kitchen", "base_demand": 95, "over_prep_tendency": 1.22},
    {"id": "R2", "name": "Green Leaf Cafe", "base_demand": 60, "over_prep_tendency": 1.15},
    {"id": "R3", "name": "Coastal Kitchen", "base_demand": 110, "over_prep_tendency": 1.30},
    {"id": "R4", "name": "Urban Tandoor", "base_demand": 75, "over_prep_tendency": 1.18},
    {"id": "R5", "name": "Campus Canteen", "base_demand": 140, "over_prep_tendency": 1.12},
]

MEAL_TYPES = ["lunch", "dinner"]

# Fixed set of holiday dates within the simulated window (India-ish public holidays,
# used only to exercise the is_holiday feature — not a real holiday calendar).
HOLIDAYS = {
    "2025-01-26", "2025-03-14", "2025-08-15", "2025-10-02",
    "2025-10-21", "2025-12-25", "2026-01-01", "2026-01-26",
}

START_DATE = datetime(2025, 1, 1)
N_DAYS = 450  # ~15 months of history


def weekday_multiplier(dow):
    # Mon=0 ... Sun=6. Weekends and Fridays run busier.
    return {0: 0.92, 1: 0.90, 2: 0.93, 3: 0.97, 4: 1.15, 5: 1.30, 6: 1.20}[dow]


def seasonal_temp(day_of_year):
    # Rough annual temperature curve (Delhi-like), plus daily noise.
    return 25 + 10 * np.sin((day_of_year / 365) * 2 * np.pi - 1.4) + RNG.normal(0, 2)


def simulate_restaurant(restaurant):
    rows = []
    prev_day_sold = {"lunch": restaurant["base_demand"] * 0.4, "dinner": restaurant["base_demand"] * 0.6}
    last_7_sold = {"lunch": [], "dinner": []}

    for i in range(N_DAYS):
        date = START_DATE + timedelta(days=i)
        date_str = date.strftime("%Y-%m-%d")
        dow = date.weekday()
        is_weekend = 1 if dow >= 5 else 0
        is_holiday = 1 if date_str in HOLIDAYS else 0
        month = date.month
        temperature = round(float(seasonal_temp(date.timetuple().tm_yday)), 1)
        rainfall = max(0.0, float(RNG.normal(2 if month in (7, 8, 9) else 0.4, 3)))
        special_event = 1 if RNG.random() < 0.03 else 0

        for meal in MEAL_TYPES:
            meal_share = 0.4 if meal == "lunch" else 0.6
            base = restaurant["base_demand"] * meal_share

            demand = base * weekday_multiplier(dow)
            if is_holiday:
                demand *= 1.28
            if special_event:
                demand *= 1.35
            if rainfall > 8:
                demand *= 0.85
            demand *= (1 + RNG.normal(0, 0.06))  # organic noise
            demand = max(5, demand)

            prepared = round(demand * restaurant["over_prep_tendency"] * (1 + RNG.normal(0, 0.03)))
            sold = round(min(prepared, demand))
            wasted = max(0, prepared - sold)

            prev_day = round(prev_day_sold[meal])
            week_hist = last_7_sold[meal][-7:]
            prev_week_avg = round(np.mean(week_hist), 1) if week_hist else prev_day
            avg_7day = round(np.mean(week_hist), 1) if len(week_hist) == 7 else prev_day

            rows.append({
                "date": date_str,
                "restaurant_id": restaurant["id"],
                "restaurant_name": restaurant["name"],
                "meal_type": meal,
                "day_of_week": dow,
                "is_weekend": is_weekend,
                "is_holiday": is_holiday,
                "month": month,
                "temperature": temperature,
                "rainfall": round(rainfall, 1),
                "special_event": special_event,
                "previous_day_sales": prev_day,
                "previous_week_avg_sales": prev_week_avg,
                "avg_7day_sales": avg_7day,
                "quantity_prepared": int(prepared),
                "quantity_sold": int(sold),
                "quantity_wasted": int(wasted),
            })

            prev_day_sold[meal] = sold
            last_7_sold[meal].append(sold)

    return rows


def main():
    all_rows = []
    for r in RESTAURANTS:
        all_rows.extend(simulate_restaurant(r))

    df = pd.DataFrame(all_rows).sort_values(["date", "restaurant_id", "meal_type"]).reset_index(drop=True)
    df.to_csv("data/food_demand.csv", index=False)
    print(f"Wrote {len(df)} rows to data/food_demand.csv")
    print(df.head(8).to_string(index=False))


if __name__ == "__main__":
    main()
