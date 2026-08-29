import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { Bell } from "lucide-react";
import { useAuth } from "./AuthContext.jsx";
import { createSocket } from "../lib/socket.js";

const NotificationContext = createContext(null);

// Server only emits an event to sockets in the relevant room (by role or by
// user id), so whichever client receives one of these is always relevant —
// no client-side filtering needed.
const EVENT_MESSAGES = {
  "donation:new": (p) => `New surplus posted: ${p.foodName} from ${p.restaurantName}.`,
  "donation:accepted": (p) => `${p.ngoName} accepted your donation of ${p.foodName}.`,
  "delivery:new": (p) => `New pickup available: ${p.foodName} (${p.restaurantName} → ${p.ngoName}).`,
  "delivery:claimed": (p) => `${p.volunteerName} claimed the delivery for ${p.foodName}.`,
  "delivery:pickedUp": (p) => `${p.foodName} has been picked up.`,
  "delivery:delivered": (p) => `${p.foodName} was delivered — donation complete.`,
};

export function NotificationProvider({ children }) {
  const { token } = useAuth();
  const [toasts, setToasts] = useState([]);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!token) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const socket = createSocket(token);
    socketRef.current = socket;

    Object.entries(EVENT_MESSAGES).forEach(([event, formatMessage]) => {
      socket.on(event, (payload) => {
        pushToast(formatMessage(payload));
        setRefreshSignal((n) => n + 1);
      });
    });

    return () => {
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  function pushToast(message) {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 6000);
  }

  return (
    <NotificationContext.Provider value={{ refreshSignal }}>
      {children}
      <div
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          zIndex: 1000,
          maxWidth: 320,
        }}
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className="ht-card"
            style={{
              padding: "10px 14px",
              fontSize: 13,
              fontFamily: "Inter, sans-serif",
              boxShadow: "0 8px 24px rgba(23,53,42,0.18)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <Bell size={14} style={{ flexShrink: 0, marginTop: 2, color: "#17352A" }} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be used within a NotificationProvider");
  return ctx;
}
