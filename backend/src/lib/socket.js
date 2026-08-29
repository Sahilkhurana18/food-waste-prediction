import { Server } from "socket.io";
import jwt from "jsonwebtoken";

let io = null;

/**
 * Every authenticated socket joins two rooms:
 *   - `role:<ROLE>`   — for broadcasts like "a new donation was posted"
 *   - `user:<userId>` — for messages meant for one specific account
 *
 * Route handlers call emitToRole / emitToUser after a state change, so the
 * relevant dashboards can show a toast and silently refetch their data.
 */
export function initSocket(httpServer, corsOrigin) {
  io = new Server(httpServer, {
    cors: { origin: corsOrigin || "*" },
  });

  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Missing auth token"));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid or expired token"));
    }
  });

  io.on("connection", (socket) => {
    const { id, role } = socket.user;
    socket.join(`user:${id}`);
    socket.join(`role:${role}`);
  });

  return io;
}

export function emitToUser(userId, event, payload) {
  if (!userId) return;
  io?.to(`user:${userId}`).emit(event, payload);
}

export function emitToRole(role, event, payload) {
  io?.to(`role:${role}`).emit(event, payload);
}
