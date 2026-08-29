import "dotenv/config";
import http from "http";
import express from "express";
import cors from "cors";
import morgan from "morgan";

import authRoutes from "./routes/auth.routes.js";
import restaurantRoutes from "./routes/restaurants.routes.js";
import ngoRoutes from "./routes/ngos.routes.js";
import deliveryRoutes from "./routes/deliveries.routes.js";
import forecastRoutes from "./routes/forecast.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import { initSocket } from "./lib/socket.js";

// CORS_ORIGIN accepts a single origin or a comma-separated list, e.g.
// "http://localhost:3000,https://harvest-loop-frontend.onrender.com" — so
// local dev and a live deployment can both reach this API without
// redeploying every time you switch between them.
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : "*";

const app = express();

app.use(cors({ origin: allowedOrigins }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use("/auth", authRoutes);
app.use("/restaurants", restaurantRoutes);
app.use("/ngos", ngoRoutes);
app.use("/deliveries", deliveryRoutes);
app.use("/forecast", forecastRoutes);
app.use("/admin", adminRoutes);

// Fallback error handler — keeps unexpected errors from leaking stack traces.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error." });
});

const httpServer = http.createServer(app);
initSocket(httpServer, allowedOrigins);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Harvest Loop backend (HTTP + WebSocket) listening on port ${PORT}`);
});
