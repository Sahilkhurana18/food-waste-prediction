import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";

const router = Router();

function signToken(user) {
  return jwt.sign(
    { id: user.id, role: user.role, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * POST /auth/register
 * body: {
 *   name, email, password, role: "RESTAURANT" | "NGO" | "VOLUNTEER" | "ADMIN",
 *   profile: { name, latitude, longitude, address? , capacity? }  // required for RESTAURANT/NGO/VOLUNTEER
 * }
 */
router.post("/register", async (req, res) => {
  const { name, email, password, role, profile } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: "name, email, password, and role are required." });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      role,
      ...(role === "RESTAURANT" && {
        restaurant: {
          create: {
            name: profile?.name ?? name,
            latitude: profile?.latitude ?? 0,
            longitude: profile?.longitude ?? 0,
            address: profile?.address,
          },
        },
      }),
      ...(role === "NGO" && {
        ngo: {
          create: {
            name: profile?.name ?? name,
            latitude: profile?.latitude ?? 0,
            longitude: profile?.longitude ?? 0,
            capacity: profile?.capacity,
          },
        },
      }),
      ...(role === "VOLUNTEER" && {
        volunteer: {
          create: {
            name: profile?.name ?? name,
            latitude: profile?.latitude,
            longitude: profile?.longitude,
          },
        },
      }),
    },
    include: { restaurant: true, ngo: true, volunteer: true },
  });

  const token = signToken(user);
  res.status(201).json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

/**
 * POST /auth/login
 * body: { email, password }
 */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required." });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password." });
  }

  const token = signToken(user);
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

export default router;
