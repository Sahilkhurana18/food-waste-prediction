import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, Package, CheckCircle2 } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import MapView from "../components/MapView.jsx";
import TopBar from "../components/TopBar.jsx";
import { SectionHeading, StatusPill } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { authRequest } from "../lib/api.js";

const STEPS = [
  { key: "ASSIGNED", label: "Assigned" },
  { key: "PICKED_UP", label: "Picked up" },
  { key: "DELIVERED", label: "Delivered" },
];

function stepIndexFor(status) {
  return STEPS.findIndex((s) => s.key === status);
}

function routeLabel(delivery) {
  const from = delivery.match?.donation?.restaurant?.name || "Restaurant";
  const to = delivery.match?.ngo?.name || "NGO";
  return { from, to };
}

export default function VolunteerDashboard() {
  const { token, user } = useAuth();
  const { refreshSignal } = useNotifications();

  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const loadAll = useCallback(async () => {
    setLoadingInitial(true);
    setPageError(null);
    try {
      const [avail, mineList] = await Promise.all([
        authRequest("/deliveries/available", token),
        authRequest("/deliveries/mine", token),
      ]);
      setAvailable(avail);
      setMine(mineList);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  async function claim(id) {
    setBusyId(id);
    setPageError(null);
    try {
      await authRequest(`/deliveries/${id}/claim`, token, { method: "POST" });
      await loadAll();
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  async function advance(id, nextStatus) {
    setBusyId(id);
    setPageError(null);
    try {
      await authRequest(`/deliveries/${id}/status`, token, { method: "PATCH", body: { status: nextStatus } });
      await loadAll();
    } catch (err) {
      setPageError(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const active = mine.find((d) => d.status !== "DELIVERED");
  const history = mine.filter((d) => d.status === "DELIVERED");

  if (loadingInitial) {
    return (
      <DashboardLayout role="/volunteer">
        <p className="text-sm" style={{ color: "#8A8574" }}>
          Loading your dashboard…
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="/volunteer">
      <TopBar
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={user?.name || "Volunteer"}
        initials={(user?.name || "V").slice(0, 2).toUpperCase()}
      />

      {pageError && (
        <div className="ht-card p-3 mb-4 text-sm" style={{ color: "#9A3A24", borderColor: "#E8B9A8" }}>
          {pageError}
        </div>
      )}

      {/* Assigned pickup */}
      <div id="section-assigned">
      <SectionHeading>Your next pickup</SectionHeading>
      {!active ? (
        <div className="ht-card p-6 mb-8 text-center">
          <p className="text-sm" style={{ color: "#8A8574" }}>
            No active pickup — claim one from the list below.
          </p>
        </div>
      ) : (
        (() => {
          const { from, to } = routeLabel(active);
          const stepIdx = stepIndexFor(active.status);
          const nextStatus = active.status === "ASSIGNED" ? "PICKED_UP" : active.status === "PICKED_UP" ? "DELIVERED" : null;

          return (
            <div className="ht-hero p-6 mb-8">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                <div>
                  <p className="text-xs uppercase tracking-wide" style={{ color: "#F3D48A" }}>
                    Pickup route
                  </p>
                  <p className="ht-display text-2xl mt-2" style={{ fontWeight: 600 }}>
                    {from} <span style={{ color: "#B9C7BB" }}>→</span> {to}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-sm" style={{ color: "#B9C7BB" }}>
                    {typeof active.match?.distanceKm === "number" && (
                      <span className="flex items-center gap-1">
                        <MapPin size={14} /> {active.match.distanceKm} km
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Package size={14} /> {active.match?.quantity} meals
                    </span>
                  </div>
                </div>
                {nextStatus && (
                  <button
                    className="ht-btn-primary text-sm px-4 py-2"
                    onClick={() => advance(active.id, nextStatus)}
                    disabled={busyId === active.id}
                  >
                    {busyId === active.id ? "Updating…" : `Mark "${STEPS[stepIdx + 1].label}"`}
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 mt-6">
                {STEPS.map((step, i) => (
                  <React.Fragment key={step.key}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center text-xs ht-mono"
                        style={{
                          background: i <= stepIdx ? "#F3D48A" : "#23483A",
                          color: i <= stepIdx ? "#17352A" : "#B9C7BB",
                        }}
                      >
                        {i < stepIdx ? <CheckCircle2 size={14} /> : i + 1}
                      </div>
                      <span className="text-xs" style={{ color: i <= stepIdx ? "#F3D48A" : "#B9C7BB" }}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && <div className="flex-1 h-px" style={{ background: "#23483A" }} />}
                  </React.Fragment>
                ))}
              </div>

              <div className="rounded-xl overflow-hidden mt-4">
                <MapView
                  points={[
                    {
                      lat: active.match?.donation?.restaurant?.latitude,
                      lng: active.match?.donation?.restaurant?.longitude,
                      type: "restaurant",
                      label: from,
                    },
                    {
                      lat: active.match?.ngo?.latitude,
                      lng: active.match?.ngo?.longitude,
                      type: "ngo",
                      label: to,
                    },
                  ]}
                  line={[
                    { lat: active.match?.donation?.restaurant?.latitude, lng: active.match?.donation?.restaurant?.longitude },
                    { lat: active.match?.ngo?.latitude, lng: active.match?.ngo?.longitude },
                  ]}
                  height={200}
                />
              </div>
            </div>
          );
        })()
      )}

      </div>

      {/* Available pickups */}
      <div id="section-available">
      <SectionHeading>Available pickups nearby</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        {available.map((d) => {
          const { from, to } = routeLabel(d);
          return (
            <div key={d.id} className="ht-ticket p-4">
              <p className="ht-display text-base" style={{ fontWeight: 600 }}>
                {from} <span style={{ color: "#8A8574" }}>→</span> {to}
              </p>
              <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#8A8574" }}>
                {typeof d.match?.distanceKm === "number" && (
                  <span className="flex items-center gap-1">
                    <MapPin size={12} /> {d.match.distanceKm} km
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock size={12} /> {d.match?.donation?.foodName}
                </span>
              </div>
              <p className="ht-mono text-xl mt-3" style={{ fontWeight: 500 }}>
                {d.match?.quantity}{" "}
                <span className="text-sm" style={{ color: "#8A8574", fontFamily: "Inter, sans-serif" }}>
                  meals
                </span>
              </p>
              <button
                className="ht-btn-primary text-xs px-3 py-1.5 mt-3 w-full"
                onClick={() => claim(d.id)}
                disabled={busyId === d.id || Boolean(active)}
                title={active ? "Finish your current pickup first" : undefined}
              >
                {busyId === d.id ? "Claiming…" : "Claim pickup"}
              </button>
            </div>
          );
        })}
        {available.length === 0 && (
          <p className="text-sm col-span-full" style={{ color: "#8A8574" }}>
            No unclaimed pickups right now.
          </p>
        )}
      </div>

      </div>

      {/* History */}
      <div id="section-history">
      <SectionHeading>Completed deliveries</SectionHeading>
      <div className="ht-card divide-y" style={{ borderColor: "#DCD5C4" }}>
        {history.map((h) => {
          const { from, to } = routeLabel(h);
          return (
            <div key={h.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {from} → {to}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8A8574" }}>
                  {h.deliveryTime ? new Date(h.deliveryTime).toLocaleDateString() : "—"} · {h.match?.quantity} meals
                </p>
              </div>
              <StatusPill status="delivered" />
            </div>
          );
        })}
        {history.length === 0 && (
          <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
            No completed deliveries yet.
          </p>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
