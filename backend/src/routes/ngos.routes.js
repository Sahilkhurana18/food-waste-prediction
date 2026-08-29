import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { scoreMatch } from "../utils/matching.js";
import { emitToUser, emitToRole } from "../lib/socket.js";

const router = Router();

async function getOwnNgo(userId) {
  return prisma.nGO.findUnique({ where: { userId } });
}

// GET /ngos/me
router.get("/me", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });
  res.json(ngo);
});

// GET /ngos/donations/available — nearby available donations, scored against this NGO's most urgent open request
router.get("/donations/available", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });

  const [donations, openRequest] = await Promise.all([
    prisma.donation.findMany({
      where: { status: "AVAILABLE" },
      include: { restaurant: true },
      orderBy: { expiresAt: "asc" },
    }),
    prisma.request.findFirst({
      where: { ngoId: ngo.id, status: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const scored = donations.map((d) => {
    const { score, distanceKm } = scoreMatch({
      donation: d,
      restaurant: d.restaurant,
      ngo,
      request: openRequest,
    });
    return { ...d, score, distanceKm };
  });

  scored.sort((a, b) => b.score - a.score);
  res.json(scored);
});

// POST /ngos/donations/:id/accept — claim a donation, creating a Match
router.post("/donations/:id/accept", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });

  const donation = await prisma.donation.findUnique({
    where: { id: req.params.id },
    include: { restaurant: true },
  });
  if (!donation) return res.status(404).json({ error: "Donation not found." });
  if (donation.status !== "AVAILABLE") {
    return res.status(409).json({ error: `Donation is already ${donation.status.toLowerCase()}.` });
  }

  const openRequest = await prisma.request.findFirst({
    where: { ngoId: ngo.id, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  const { score, distanceKm } = scoreMatch({ donation, restaurant: donation.restaurant, ngo, request: openRequest });

  const [match] = await prisma.$transaction([
    prisma.match.create({
      data: {
        donationId: donation.id,
        ngoId: ngo.id,
        requestId: openRequest?.id,
        quantity: donation.quantity,
        distanceKm,
        score,
      },
    }),
    prisma.donation.update({ where: { id: donation.id }, data: { status: "CLAIMED" } }),
    ...(openRequest ? [prisma.request.update({ where: { id: openRequest.id }, data: { status: "MATCHED" } })] : []),
  ]);

  // Every accepted match needs a delivery to be picked up by a volunteer.
  const delivery = await prisma.delivery.create({ data: { matchId: match.id } });

  emitToUser(donation.restaurant.userId, "donation:accepted", {
    donationId: donation.id,
    foodName: donation.foodName,
    ngoName: ngo.name,
  });
  emitToRole("VOLUNTEER", "delivery:new", {
    deliveryId: delivery.id,
    foodName: donation.foodName,
    restaurantName: donation.restaurant.name,
    ngoName: ngo.name,
  });

  res.status(201).json({ match, delivery });
});

// POST /ngos/requests — open a new food request
router.post("/requests", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });

  const { foodType, quantity, urgency } = req.body;
  if (!foodType || !quantity) {
    return res.status(400).json({ error: "foodType and quantity are required." });
  }

  const request = await prisma.request.create({
    data: { ngoId: ngo.id, foodType, quantity, urgency: urgency ?? "normal" },
  });
  res.status(201).json(request);
});

// GET /ngos/requests — this NGO's requests
router.get("/requests", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });

  const requests = await prisma.request.findMany({
    where: { ngoId: ngo.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(requests);
});

// GET /ngos/deliveries — incoming deliveries for this NGO's matches
router.get("/deliveries", requireAuth, requireRole("NGO"), async (req, res) => {
  const ngo = await getOwnNgo(req.user.id);
  if (!ngo) return res.status(404).json({ error: "NGO profile not found." });

  const deliveries = await prisma.delivery.findMany({
    where: { match: { ngoId: ngo.id } },
    include: { match: { include: { donation: true } }, volunteer: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(deliveries);
});

export default router;
