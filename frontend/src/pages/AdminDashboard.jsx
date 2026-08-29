import React, { useState, useEffect, useCallback } from "react";
import { ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import TopBar from "../components/TopBar.jsx";
import MapView from "../components/MapView.jsx";
import { SectionHeading, MetricCard } from "../components/ui.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { authRequest, fetchModelInfo } from "../lib/api.js";

export default function AdminDashboard() {
  const { token } = useAuth();
  const { refreshSignal } = useNotifications();

  const [impact, setImpact] = useState(null);
  const [trend, setTrend] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [ngos, setNgos] = useState([]);
  const [modelInfo, setModelInfo] = useState(null);
  const [modelInfoError, setModelInfoError] = useState(null);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [pageError, setPageError] = useState(null);

  const loadAll = useCallback(async () => {
    setLoadingInitial(true);
    setPageError(null);
    try {
      const [impactData, trendData, restaurantsData, ngosData] = await Promise.all([
        authRequest("/admin/impact", token),
        authRequest("/admin/impact/trend", token),
        authRequest("/admin/restaurants", token),
        authRequest("/admin/ngos", token),
      ]);
      setImpact(impactData);
      setTrend(trendData);
      setRestaurants(restaurantsData);
      setNgos(ngosData);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoadingInitial(false);
    }

    // Separate try/catch: the ML service is a different origin and might be
    // down independently of the backend, so its failure shouldn't block
    // the rest of the page from rendering.
    try {
      const info = await fetchModelInfo();
      setModelInfo(info);
    } catch (err) {
      setModelInfoError(err.message);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  const metrics = impact
    ? [
        { label: "Meals redistributed", value: impact.mealsRedistributed },
        { label: "Food waste logged", value: `${impact.foodWasteLoggedKg} kg` },
        { label: "Active restaurants", value: impact.activeRestaurants },
        { label: "NGO partners", value: impact.ngoPartners },
        { label: "Deliveries completed", value: impact.deliveriesCompleted },
      ]
    : [];

  const trendData = trend.map((t) => ({
    month: new Date(t.month).toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
    meals: t.meals,
  }));

  const donationsPerRestaurant = restaurants
    .map((r) => ({ name: r.name, donations: r._count?.donations ?? 0 }))
    .sort((a, b) => b.donations - a.donations)
    .slice(0, 8);

  const modelComparison = modelInfo
    ? Object.entries(modelInfo.comparison).map(([model, m]) => ({ model, mae: m.MAE }))
    : [];

  const mapPoints = [
    ...restaurants
      .filter((r) => typeof r.latitude === "number" && typeof r.longitude === "number")
      .map((r) => ({ lat: r.latitude, lng: r.longitude, type: "restaurant", label: `${r.name} (restaurant)` })),
    ...ngos
      .filter((n) => typeof n.latitude === "number" && typeof n.longitude === "number")
      .map((n) => ({ lat: n.latitude, lng: n.longitude, type: "ngo", label: `${n.name} (NGO)` })),
  ];

  if (loadingInitial) {
    return (
      <DashboardLayout role="/admin">
        <p className="text-sm" style={{ color: "#8A8574" }}>
          Loading platform overview…
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="/admin">
      <TopBar eyebrow="Platform overview" title="Sustainability impact" location="All cities" initials="AD" />

      {pageError && (
        <div className="ht-card p-3 mb-4 text-sm" style={{ color: "#9A3A24", borderColor: "#E8B9A8" }}>
          {pageError}
        </div>
      )}

      <div id="section-overview" className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {metrics.map((m) => (
          <MetricCard key={m.label} label={m.label} value={m.value} />
        ))}
      </div>

      {/* Network map */}
      <div className="ht-card p-5 mb-6">
        <SectionHeading>Network map</SectionHeading>
        <MapView points={mapPoints} height={280} zoom={10} />
      </div>

      {/* Trend, over the real Match history */}
      <div className="ht-card p-5 mb-6">
        <SectionHeading>Meals redistributed over time</SectionHeading>
        {trendData.length === 0 ? (
          <p className="text-sm py-8 text-center" style={{ color: "#8A8574" }}>
            No matches yet — this fills in once donations start getting accepted.
          </p>
        ) : (
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={trendData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid stroke="#EBE6D9" vertical={false} />
                <XAxis dataKey="month" tick={{ fill: "#8A8574", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#8A8574", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ background: "#FBF9F3", border: "1px solid #DCD5C4", borderRadius: 8, fontSize: 12 }} />
                <Line dataKey="meals" stroke="#17352A" strokeWidth={2} dot={{ r: 3, fill: "#17352A" }} name="Meals" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
        <div className="ht-card p-5 lg:col-span-3">
          <SectionHeading>Donations by restaurant</SectionHeading>
          {donationsPerRestaurant.length === 0 ? (
            <p className="text-sm py-8 text-center" style={{ color: "#8A8574" }}>
              No donations logged yet.
            </p>
          ) : (
            <div style={{ width: "100%", height: 220 }}>
              <ResponsiveContainer>
                <BarChart data={donationsPerRestaurant} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#EBE6D9" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: "#8A8574", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#8A8574", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip contentStyle={{ background: "#FBF9F3", border: "1px solid #DCD5C4", borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="donations" fill="#17352A" radius={[4, 4, 0, 0]} name="Donations" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="ht-card p-5 lg:col-span-2">
          <SectionHeading>Demand model comparison</SectionHeading>
          {modelInfoError ? (
            <p className="text-sm py-8 text-center" style={{ color: "#8A8574" }}>
              Couldn't reach the ML service ({modelInfoError}).
            </p>
          ) : (
            <>
              <div style={{ width: "100%", height: 220 }}>
                <ResponsiveContainer>
                  <BarChart data={modelComparison} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <CartesianGrid stroke="#EBE6D9" vertical={false} />
                    <XAxis dataKey="model" tick={{ fill: "#8A8574", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "#8A8574", fontSize: 11 }}
                      axisLine={false}
                      tickLine={false}
                      label={{ value: "MAE", angle: -90, position: "insideLeft", fill: "#8A8574", fontSize: 11 }}
                    />
                    <Tooltip contentStyle={{ background: "#FBF9F3", border: "1px solid #DCD5C4", borderRadius: 8, fontSize: 12 }} />
                    <Bar dataKey="mae" fill="#E2A73E" radius={[4, 4, 0, 0]} name="MAE" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {modelInfo && (
                <p className="text-xs mt-2" style={{ color: "#8A8574" }}>
                  Lower MAE is better. Currently serving: <strong>{modelInfo.best_model}</strong>.
                </p>
              )}
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div id="section-restaurants">
          <SectionHeading>Restaurants</SectionHeading>
          <div className="ht-card divide-y" style={{ borderColor: "#DCD5C4" }}>
            {restaurants.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-4 py-3">
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {r.name}
                </p>
                <p className="ht-mono text-sm" style={{ fontWeight: 500 }}>
                  {r._count?.donations ?? 0} donations
                </p>
              </div>
            ))}
            {restaurants.length === 0 && (
              <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
                No restaurants registered yet.
              </p>
            )}
          </div>
        </div>

        <div id="section-ngos">
          <SectionHeading>NGO partners</SectionHeading>
          <div className="ht-card divide-y" style={{ borderColor: "#DCD5C4" }}>
            {ngos.map((n) => (
              <div key={n.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm" style={{ fontWeight: 500 }}>
                    {n.name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#8A8574" }}>
                    {n._count?.requests ?? 0} requests
                  </p>
                </div>
                <p className="ht-mono text-sm" style={{ fontWeight: 500 }}>
                  {n._count?.matches ?? 0} matched
                </p>
              </div>
            ))}
            {ngos.length === 0 && (
              <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
                No NGOs registered yet.
              </p>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
