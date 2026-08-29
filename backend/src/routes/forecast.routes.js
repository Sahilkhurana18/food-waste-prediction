import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8001";

/**
 * POST /forecast
 * body: {
 *   mealType, date, isHoliday?, specialEvent?, temperature, rainfall?,
 *   safetyMarginPct?
 * }
 *
 * Looks up the restaurant's own recent FoodRecord history to fill in
 * previous_day_sales / previous_week_avg_sales / avg_7day_sales, then
 * calls the ML service's /predict endpoint. Falls back to caller-supplied
 * values if there isn't enough history yet (e.g. a brand-new restaurant).
 */
router.post("/", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await prisma.restaurant.findUnique({ where: { userId: req.user.id } });
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });

  const { mealType, date, isHoliday, specialEvent, temperature, rainfall, safetyMarginPct } = req.body;
  if (!mealType || !date || temperature == null) {
    return res.status(400).json({ error: "mealType, date, and temperature are required." });
  }

  const recentRecords = await prisma.foodRecord.findMany({
    where: { restaurantId: restaurant.id, mealType },
    orderBy: { date: "desc" },
    take: 7,
  });

  const previousDaySales = recentRecords[0]?.quantitySold ?? req.body.previousDaySales ?? 0;
  const last7 = recentRecords.map((r) => r.quantitySold);
  const avg7day = last7.length ? last7.reduce((a, b) => a + b, 0) / last7.length : req.body.avg7daySales ?? previousDaySales;
  const previousWeekAvg = avg7day; // simple stand-in until a full week-over-week query is added

  const payload = {
    restaurant_id: restaurant.id,
    meal_type: mealType,
    date,
    is_holiday: Boolean(isHoliday),
    special_event: Boolean(specialEvent),
    temperature,
    rainfall: rainfall ?? 0,
    previous_day_sales: previousDaySales,
    previous_week_avg_sales: previousWeekAvg,
    avg_7day_sales: avg7day,
    safety_margin_pct: safetyMarginPct ?? 8,
  };

  try {
    const mlRes = await fetch(`${ML_SERVICE_URL}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!mlRes.ok) {
      const detail = await mlRes.text();
      return res.status(502).json({ error: "ML service returned an error.", detail });
    }

    const prediction = await mlRes.json();
    res.json({ ...prediction, basedOn: { previousDaySales, previousWeekAvg, avg7day, historyDays: recentRecords.length } });
  } catch (err) {
    res.status(502).json({ error: "Could not reach the ML service.", detail: err.message });
  }
});

export default router;
