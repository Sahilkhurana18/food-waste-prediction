import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const router = Router();

// GET /admin/impact — headline sustainability metrics for the admin dashboard
router.get("/impact", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const [mealsAgg, restaurantCount, ngoCount, deliveredCount, wasteAgg] = await Promise.all([
    prisma.match.aggregate({ _sum: { quantity: true } }),
    prisma.restaurant.count(),
    prisma.nGO.count(),
    prisma.delivery.count({ where: { status: "DELIVERED" } }),
    prisma.foodRecord.aggregate({ _sum: { quantityWasted: true } }),
  ]);

  res.json({
    mealsRedistributed: mealsAgg._sum.quantity ?? 0,
    activeRestaurants: restaurantCount,
    ngoPartners: ngoCount,
    deliveriesCompleted: deliveredCount,
    foodWasteLoggedKg: wasteAgg._sum.quantityWasted ?? 0, // approximation: 1 serving ≈ 1kg placeholder
  });
});

// GET /admin/restaurants — leaderboard of donation activity
router.get("/restaurants", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    include: { _count: { select: { donations: true } } },
  });
  res.json(restaurants);
});

// GET /admin/ngos — leaderboard of request fulfillment
router.get("/ngos", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const ngos = await prisma.nGO.findMany({
    include: { _count: { select: { requests: true, matches: true } } },
  });
  res.json(ngos);
});

// GET /admin/impact/trend — meals redistributed per month, from real Match
// records. Uses a raw query because Prisma's groupBy can't truncate a
// timestamp to month on its own.
router.get("/impact/trend", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const rows = await prisma.$queryRaw`
    SELECT date_trunc('month', "createdAt") AS month, SUM(quantity)::int AS meals
    FROM "Match"
    GROUP BY month
    ORDER BY month ASC
  `;
  res.json(rows.map((r) => ({ month: r.month, meals: r.meals })));
});

export default router;
