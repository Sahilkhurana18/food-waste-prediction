import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Clock, Plus, Truck } from "lucide-react";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import TopBar from "../components/TopBar.jsx";
import MapView from "../components/MapView.jsx";
import { SectionHeading, MetricCard, StatusPill } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { authRequest } from "../lib/api.js";

function deliveryStatusKey(delivery) {
  if (delivery.status === "DELIVERED") return "delivered";
  if (delivery.status === "PICKED_UP") return "in transit";
  return delivery.volunteerId ? "assigned" : "unassigned";
}

function isToday(dateStr) {
  return new Date(dateStr).toDateString() === new Date().toDateString();
}

export default function NgoDashboard() {
  const { token } = useAuth();
  const { refreshSignal } = useNotifications();

  const [ngo, setNgo] = useState(null);
  const [donations, setDonations] = useState([]);
  const [requests, setRequests] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [pageError, setPageError] = useState(null);
  const [acceptingId, setAcceptingId] = useState(null);

  const [showAdd, setShowAdd] = useState(false);
  const [newRequest, setNewRequest] = useState({ foodType: "", quantity: "", urgency: "normal" });

  const loadAll = useCallback(async () => {
    setLoadingInitial(true);
    setPageError(null);
    try {
      const [me, available, myRequests, myDeliveries] = await Promise.all([
        authRequest("/ngos/me", token),
        authRequest("/ngos/donations/available", token),
        authRequest("/ngos/requests", token),
        authRequest("/ngos/deliveries", token),
      ]);
      setNgo(me);
      setDonations(available);
      setRequests(myRequests);
      setDeliveries(myDeliveries);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  async function acceptDonation(id) {
    setAcceptingId(id);
    setPageError(null);
    try {
      await authRequest(`/ngos/donations/${id}/accept`, token, { method: "POST" });
      const [available, myDeliveries, myRequests] = await Promise.all([
        authRequest("/ngos/donations/available", token),
        authRequest("/ngos/deliveries", token),
        authRequest("/ngos/requests", token),
      ]);
      setDonations(available);
      setDeliveries(myDeliveries);
      setRequests(myRequests);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setAcceptingId(null);
    }
  }

  async function addRequest() {
    if (!newRequest.foodType.trim() || !newRequest.quantity) return;
    try {
      const created = await authRequest("/ngos/requests", token, {
        method: "POST",
        body: { foodType: newRequest.foodType.trim(), quantity: Number(newRequest.quantity), urgency: newRequest.urgency },
      });
      setRequests((prev) => [created, ...prev]);
      setNewRequest({ foodType: "", quantity: "", urgency: "normal" });
      setShowAdd(false);
    } catch (err) {
      setPageError(err.message);
    }
  }

  const mealsAcceptedToday = deliveries
    .filter((d) => isToday(d.createdAt))
    .reduce((sum, d) => sum + (d.match?.quantity || 0), 0);
  const pendingRequests = requests.filter((r) => r.status === "PENDING").length;
  const incomingDeliveries = deliveries.filter((d) => d.status !== "DELIVERED").length;
  const distances = deliveries.map((d) => d.match?.distanceKm).filter((x) => typeof x === "number");
  const avgDistance = distances.length ? (distances.reduce((a, b) => a + b, 0) / distances.length).toFixed(1) : "—";

  if (loadingInitial) {
    return (
      <DashboardLayout role="/ngo">
        <p className="text-sm" style={{ color: "#8A8574" }}>
          Loading your dashboard…
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="/ngo">
      <TopBar
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={ngo?.name || "Your organization"}
        initials={(ngo?.name || "N").slice(0, 2).toUpperCase()}
      />

      {pageError && (
        <div className="ht-card p-3 mb-4 text-sm" style={{ color: "#9A3A24", borderColor: "#E8B9A8" }}>
          {pageError}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <MetricCard label="Meals accepted today" value={mealsAcceptedToday} />
        <MetricCard label="Pending requests" value={pendingRequests} />
        <MetricCard label="Incoming deliveries" value={incomingDeliveries} />
        <MetricCard label="Avg pickup distance" value={avgDistance === "—" ? "—" : `${avgDistance} km`} />
      </div>

      {/* Map */}
      <div id="section-map" className="ht-card p-5 mb-6">
        <SectionHeading>Nearby surplus</SectionHeading>
        <MapView
          points={[
            ...(ngo ? [{ lat: ngo.latitude, lng: ngo.longitude, type: "self", label: `${ngo.name} (you)` }] : []),
            ...donations.map((d) => ({
              lat: d.restaurant?.latitude,
              lng: d.restaurant?.longitude,
              type: "restaurant",
              label: `${d.foodName} · ${d.restaurant?.name}`,
            })),
          ]}
        />
      </div>

      {/* Available donations */}
      <div id="section-available">
      <SectionHeading>Available donations nearby</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {donations.map((d) => (
          <div key={d.id} className="ht-ticket p-4">
            <div className="flex items-start justify-between">
              <p className="ht-display text-base" style={{ fontWeight: 600 }}>
                {d.foodName}
              </p>
              <span className="ht-stamp" style={{ color: "#3F5C2C" }}>
                Score {d.score}
              </span>
            </div>
            <p className="text-xs mt-1" style={{ color: "#8A8574" }}>
              {d.restaurant?.name}
            </p>
            <p className="ht-mono text-2xl mt-3" style={{ fontWeight: 500 }}>
              {d.quantity}
              <span className="text-sm ml-1" style={{ color: "#8A8574", fontFamily: "Inter, sans-serif" }}>
                servings
              </span>
            </p>
            <div className="flex items-center gap-3 mt-2 text-xs" style={{ color: "#8A8574" }}>
              <span className="flex items-center gap-1">
                <MapPin size={12} /> {d.distanceKm} km
              </span>
              <span className="flex items-center gap-1">
                <Clock size={12} /> till{" "}
                {new Date(d.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </span>
            </div>
            <button
              className="ht-btn-primary text-xs px-3 py-1.5 mt-3 w-full"
              onClick={() => acceptDonation(d.id)}
              disabled={acceptingId === d.id}
            >
              {acceptingId === d.id ? "Accepting…" : "Accept donation"}
            </button>
          </div>
        ))}
        {donations.length === 0 && (
          <p className="text-sm col-span-full" style={{ color: "#8A8574" }}>
            No surplus available nearby right now — check back shortly.
          </p>
        )}
      </div>

      </div>

      {/* Requests */}
      <div id="section-requests">
      <SectionHeading
        action={
          <button className="ht-btn-primary text-xs px-3 py-2 flex items-center gap-1.5" onClick={() => setShowAdd((v) => !v)}>
            <Plus size={14} /> New request
          </button>
        }
      >
        Your requests
      </SectionHeading>

      {showAdd && (
        <div className="ht-card p-4 mb-4 flex flex-col sm:flex-row gap-2.5">
          <input
            className="ht-input flex-1"
            placeholder="Food type, e.g. Cooked rice"
            value={newRequest.foodType}
            onChange={(e) => setNewRequest({ ...newRequest, foodType: e.target.value })}
          />
          <input
            className="ht-input sm:w-28"
            placeholder="Qty needed"
            type="number"
            min="1"
            value={newRequest.quantity}
            onChange={(e) => setNewRequest({ ...newRequest, quantity: e.target.value })}
          />
          <select
            className="ht-input sm:w-32"
            value={newRequest.urgency}
            onChange={(e) => setNewRequest({ ...newRequest, urgency: e.target.value })}
          >
            <option value="urgent">Urgent</option>
            <option value="normal">Normal</option>
            <option value="low">Low</option>
          </select>
          <button className="ht-btn-primary text-sm px-4 py-2" onClick={addRequest}>
            Add
          </button>
        </div>
      )}

      <div className="ht-card divide-y mb-8" style={{ borderColor: "#DCD5C4" }}>
        {requests.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm" style={{ fontWeight: 500 }}>
                {r.foodType}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#8A8574" }}>
                {r.quantity} servings needed
              </p>
            </div>
            <div className="flex items-center gap-2">
              {r.urgency === "urgent" && <StatusPill status="urgent" />}
              <StatusPill status={r.status.toLowerCase()} />
            </div>
          </div>
        ))}
        {requests.length === 0 && (
          <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
            No open requests — add one above when you need more food.
          </p>
        )}
      </div>

      </div>

      {/* Incoming deliveries */}
      <div id="section-deliveries">
      <SectionHeading>Incoming deliveries</SectionHeading>
      <div className="ht-card divide-y" style={{ borderColor: "#DCD5C4" }}>
        {deliveries.map((d) => (
          <div key={d.id} className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: "#EAF0E3", color: "#3F5C2C" }}>
                <Truck size={14} />
              </div>
              <div>
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {d.match?.donation?.foodName} · {d.match?.quantity} servings
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8A8574" }}>
                  {d.match?.donation?.restaurant?.name}
                  {d.volunteer ? ` · Volunteer: ${d.volunteer.name}` : " · Awaiting a volunteer"}
                </p>
              </div>
            </div>
            <StatusPill status={deliveryStatusKey(d)} />
          </div>
        ))}
        {deliveries.length === 0 && (
          <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
            No deliveries yet — accept a donation above to start one.
          </p>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
