import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { emitToUser } from "../lib/socket.js";

const router = Router();

async function getOwnVolunteer(userId) {
  return prisma.volunteer.findUnique({ where: { userId } });
}

// Shared include used whenever we need enough context to notify both sides.
const FULL_INCLUDE = {
  match: {
    include: {
      donation: { include: { restaurant: true } },
      ngo: true,
    },
  },
};

// GET /deliveries/available — unclaimed deliveries (no volunteer assigned yet)
router.get("/available", requireAuth, requireRole("VOLUNTEER"), async (req, res) => {
  const deliveries = await prisma.delivery.findMany({
    where: { volunteerId: null, status: "ASSIGNED" },
    include: FULL_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  res.json(deliveries);
});

// GET /deliveries/mine — this volunteer's claimed/active + past deliveries
router.get("/mine", requireAuth, requireRole("VOLUNTEER"), async (req, res) => {
  const volunteer = await getOwnVolunteer(req.user.id);
  if (!volunteer) return res.status(404).json({ error: "Volunteer profile not found." });

  const deliveries = await prisma.delivery.findMany({
    where: { volunteerId: volunteer.id },
    include: FULL_INCLUDE,
    orderBy: { createdAt: "desc" },
  });
  res.json(deliveries);
});

// POST /deliveries/:id/claim — a volunteer claims an unassigned delivery
router.post("/:id/claim", requireAuth, requireRole("VOLUNTEER"), async (req, res) => {
  const volunteer = await getOwnVolunteer(req.user.id);
  if (!volunteer) return res.status(404).json({ error: "Volunteer profile not found." });

  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id }, include: FULL_INCLUDE });
  if (!delivery) return res.status(404).json({ error: "Delivery not found." });
  if (delivery.volunteerId) return res.status(409).json({ error: "Delivery already claimed." });

  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: { volunteerId: volunteer.id },
  });

  emitToUser(delivery.match.ngo.userId, "delivery:claimed", {
    deliveryId: delivery.id,
    volunteerName: volunteer.name,
    foodName: delivery.match.donation.foodName,
  });

  res.json(updated);
});

// PATCH /deliveries/:id/status — advance PICKED_UP -> DELIVERED
router.patch("/:id/status", requireAuth, requireRole("VOLUNTEER"), async (req, res) => {
  const { status } = req.body; // "PICKED_UP" | "DELIVERED"
  if (!["PICKED_UP", "DELIVERED"].includes(status)) {
    return res.status(400).json({ error: 'status must be "PICKED_UP" or "DELIVERED".' });
  }

  const volunteer = await getOwnVolunteer(req.user.id);
  const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id }, include: FULL_INCLUDE });
  if (!delivery) return res.status(404).json({ error: "Delivery not found." });
  if (delivery.volunteerId !== volunteer?.id) {
    return res.status(403).json({ error: "This delivery is not assigned to you." });
  }

  const timestampField = status === "PICKED_UP" ? "pickupTime" : "deliveryTime";
  const updated = await prisma.delivery.update({
    where: { id: delivery.id },
    data: { status, [timestampField]: new Date() },
  });

  if (status === "DELIVERED") {
    await prisma.donation.updateMany({
      where: { match: { id: delivery.matchId } },
      data: { status: "DELIVERED" },
    });
  }

  const restaurantUserId = delivery.match.donation.restaurant.userId;
  const ngoUserId = delivery.match.ngo.userId;
  const foodName = delivery.match.donation.foodName;

  if (status === "PICKED_UP") {
    emitToUser(ngoUserId, "delivery:pickedUp", { deliveryId: delivery.id, foodName });
  } else {
    emitToUser(ngoUserId, "delivery:delivered", { deliveryId: delivery.id, foodName });
    emitToUser(restaurantUserId, "delivery:delivered", { deliveryId: delivery.id, foodName });
  }

  res.json(updated);
});

export default router;
