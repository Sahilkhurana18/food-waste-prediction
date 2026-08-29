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

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
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
initSocket(httpServer, process.env.CORS_ORIGIN);

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`Harvest Loop backend (HTTP + WebSocket) listening on port ${PORT}`);
});
