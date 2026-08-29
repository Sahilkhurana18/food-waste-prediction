import { io } from "socket.io-client";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export function createSocket(token) {
  return io(BASE_URL, { auth: { token } });
}
