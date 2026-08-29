import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToRole } from "../lib/socket.js";

const router = Router();

async function getOwnRestaurant(userId) {
  return prisma.restaurant.findUnique({ where: { userId } });
}

// GET /restaurants/me — the logged-in restaurant's own profile
router.get("/me", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });
  res.json(restaurant);
});

// GET /restaurants — list all (admin use)
router.get("/", requireAuth, requireRole("ADMIN"), async (req, res) => {
  const restaurants = await prisma.restaurant.findMany({
    include: { _count: { select: { donations: true } } },
  });
  res.json(restaurants);
});

// POST /restaurants/food-records — log a day's prepared/sold/wasted for a meal
router.post("/food-records", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });

  const { foodName, mealType, date, quantityPrepared, quantitySold } = req.body;
  if (!foodName || !mealType || !date || quantityPrepared == null || quantitySold == null) {
    return res.status(400).json({ error: "foodName, mealType, date, quantityPrepared, quantitySold are required." });
  }

  const record = await prisma.foodRecord.create({
    data: {
      restaurantId: restaurant.id,
      foodName,
      mealType,
      date: new Date(date),
      quantityPrepared,
      quantitySold,
      quantityWasted: Math.max(0, quantityPrepared - quantitySold),
    },
  });
  res.status(201).json(record);
});

// GET /restaurants/food-records — this restaurant's history, most recent first
router.get("/food-records", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });

  const records = await prisma.foodRecord.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { date: "desc" },
    take: 60,
  });
  res.json(records);
});

// POST /restaurants/donations — post today's surplus for redistribution
router.post("/donations", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });

  const { foodName, quantity, expiresAt } = req.body;
  if (!foodName || !quantity || !expiresAt) {
    return res.status(400).json({ error: "foodName, quantity, expiresAt are required." });
  }

  const donation = await prisma.donation.create({
    data: {
      restaurantId: restaurant.id,
      foodName,
      quantity,
      expiresAt: new Date(expiresAt),
    },
  });

  emitToRole("NGO", "donation:new", { donationId: donation.id, foodName: donation.foodName, restaurantName: restaurant.name });

  res.status(201).json(donation);
});

// GET /restaurants/donations — this restaurant's donation history
router.get("/donations", requireAuth, requireRole("RESTAURANT"), async (req, res) => {
  const restaurant = await getOwnRestaurant(req.user.id);
  if (!restaurant) return res.status(404).json({ error: "Restaurant profile not found." });

  const donations = await prisma.donation.findMany({
    where: { restaurantId: restaurant.id },
    orderBy: { createdAt: "desc" },
    include: { match: { include: { ngo: true, delivery: true } } },
  });
  res.json(donations);
});

export default router;
