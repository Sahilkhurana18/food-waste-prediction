import React, { useState, useEffect, useCallback } from "react";
import { Plus, Clock, ArrowUpRight, ChefHat, NotebookPen } from "lucide-react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";
import DashboardLayout from "../layouts/DashboardLayout.jsx";
import TopBar from "../components/TopBar.jsx";
import { SectionHeading } from "../components/ui.jsx";
import { STATUS_STYLE } from "../data/mockData.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useNotifications } from "../context/NotificationContext.jsx";
import { authRequest } from "../lib/api.js";

function tomorrowISO() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Turns raw FoodRecord rows (one per meal type per day) into one bar/line
// point per day, summed across meal types, oldest -> newest, last 7 days.
function buildChartData(records) {
  const byDate = {};
  for (const r of records) {
    const day = r.date.slice(0, 10);
    if (!byDate[day]) byDate[day] = { day, prepared: 0, sold: 0 };
    byDate[day].prepared += r.quantityPrepared;
    byDate[day].sold += r.quantitySold;
  }
  return Object.values(byDate)
    .sort((a, b) => a.day.localeCompare(b.day))
    .slice(-7)
    .map((d) => ({ ...d, day: d.day.slice(5) })); // MM-DD label
}

export default function RestaurantDashboard() {
  const { token } = useAuth();
  const { refreshSignal } = useNotifications();

  const [restaurant, setRestaurant] = useState(null);
  const [records, setRecords] = useState([]);
  const [donations, setDonations] = useState([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [pageError, setPageError] = useState(null);

  const [forecastForm, setForecastForm] = useState({
    mealType: "dinner",
    date: tomorrowISO(),
    temperature: 30,
    rainfall: 0,
    isHoliday: false,
    specialEvent: false,
    safetyMarginPct: 8,
  });
  const [forecast, setForecast] = useState(null);
  const [forecastLoading, setForecastLoading] = useState(false);
  const [forecastError, setForecastError] = useState(null);

  const [showAddDonation, setShowAddDonation] = useState(false);
  const [newDonation, setNewDonation] = useState({ foodName: "", quantity: "", expiresAt: "" });

  const [showLogRecord, setShowLogRecord] = useState(false);
  const [newRecord, setNewRecord] = useState({
    foodName: "",
    mealType: "dinner",
    date: todayISO(),
    quantityPrepared: "",
    quantitySold: "",
  });

  const loadAll = useCallback(async () => {
    setLoadingInitial(true);
    setPageError(null);
    try {
      const [me, foodRecords, myDonations] = await Promise.all([
        authRequest("/restaurants/me", token),
        authRequest("/restaurants/food-records", token),
        authRequest("/restaurants/donations", token),
      ]);
      setRestaurant(me);
      setRecords(foodRecords);
      setDonations(myDonations);
    } catch (err) {
      setPageError(err.message);
    } finally {
      setLoadingInitial(false);
    }
  }, [token]);

  useEffect(() => {
    loadAll();
  }, [loadAll, refreshSignal]);

  const runForecast = useCallback(
    async (form) => {
      setForecastLoading(true);
      setForecastError(null);
      try {
        const result = await authRequest("/forecast", token, {
          method: "POST",
          body: {
            mealType: form.mealType,
            date: form.date,
            isHoliday: form.isHoliday,
            specialEvent: form.specialEvent,
            temperature: Number(form.temperature),
            rainfall: Number(form.rainfall),
            safetyMarginPct: Number(form.safetyMarginPct),
          },
        });
        setForecast(result);
      } catch (err) {
        setForecastError(err.message);
      } finally {
        setForecastLoading(false);
      }
    },
    [token]
  );

  // Run once after the initial data load finishes.
  useEffect(() => {
    if (!loadingInitial) runForecast(forecastForm);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingInitial]);

  async function addDonation() {
    if (!newDonation.foodName.trim() || !newDonation.quantity || !newDonation.expiresAt) return;
    try {
      const created = await authRequest("/restaurants/donations", token, {
        method: "POST",
        body: {
          foodName: newDonation.foodName.trim(),
          quantity: Number(newDonation.quantity),
          expiresAt: new Date(newDonation.expiresAt).toISOString(),
        },
      });
      setDonations((prev) => [created, ...prev]);
      setNewDonation({ foodName: "", quantity: "", expiresAt: "" });
      setShowAddDonation(false);
    } catch (err) {
      setPageError(err.message);
    }
  }

  async function addRecord() {
    const { foodName, mealType, date, quantityPrepared, quantitySold } = newRecord;
    if (!foodName.trim() || !quantityPrepared || !quantitySold) return;
    try {
      await authRequest("/restaurants/food-records", token, {
        method: "POST",
        body: {
          foodName: foodName.trim(),
          mealType,
          date,
          quantityPrepared: Number(quantityPrepared),
          quantitySold: Number(quantitySold),
        },
      });
      const fresh = await authRequest("/restaurants/food-records", token);
      setRecords(fresh);
      setNewRecord({ foodName: "", mealType: "dinner", date: todayISO(), quantityPrepared: "", quantitySold: "" });
      setShowLogRecord(false);
      runForecast(forecastForm); // history changed, so the forecast should refresh too
    } catch (err) {
      setPageError(err.message);
    }
  }

  const chartData = buildChartData(records);
  const openTickets = donations.filter((d) => d.status === "AVAILABLE" || d.status === "CLAIMED");
  const history = donations.filter((d) => d.match);

  if (loadingInitial) {
    return (
      <DashboardLayout role="/restaurant">
        <p className="text-sm" style={{ color: "#8A8574" }}>
          Loading your dashboard…
        </p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout role="/restaurant">
      <TopBar
        eyebrow={new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        title={restaurant?.name || "Your restaurant"}
        location={restaurant?.address || undefined}
        initials={(restaurant?.name || "R").slice(0, 2).toUpperCase()}
      />

      {pageError && (
        <div className="ht-card p-3 mb-4 text-sm" style={{ color: "#9A3A24", borderColor: "#E8B9A8" }}>
          {pageError}
        </div>
      )}

      {/* Hero: forecast result */}
      <div id="section-forecast" className="ht-hero p-6 mb-6 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
          <p className="text-xs uppercase tracking-wide" style={{ color: "#F3D48A" }}>
            {forecastForm.date === tomorrowISO() ? "Tomorrow's call" : `Call for ${forecastForm.date}`}
          </p>

          {forecastLoading && (
            <p className="text-sm mt-3" style={{ color: "#B9C7BB" }}>
              Running the model…
            </p>
          )}
          {forecastError && (
            <p className="text-sm mt-3" style={{ color: "#F3D48A" }}>
              Couldn't reach the forecast service: {forecastError}
            </p>
          )}

          {forecast && !forecastLoading && (
            <>
              <p className="ht-display ht-mono text-5xl mt-2" style={{ fontWeight: 600 }}>
                {forecast.recommended_preparation}
              </p>
              <p className="text-sm mt-1" style={{ color: "#B9C7BB" }}>
                meals to prepare · model: {forecast.model_used}
              </p>

              <div className="flex gap-6 mt-6">
                <div>
                  <p className="ht-mono text-xl" style={{ fontWeight: 500 }}>
                    {forecast.predicted_demand}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#B9C7BB" }}>
                    predicted demand
                  </p>
                </div>
                <div>
                  <p className="ht-mono text-xl" style={{ fontWeight: 500 }}>
                    {forecast.expected_surplus}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#B9C7BB" }}>
                    expected surplus
                  </p>
                </div>
                {forecast.basedOn && (
                  <div>
                    <p className="ht-mono text-xl" style={{ fontWeight: 500, color: "#F3D48A" }}>
                      {forecast.basedOn.historyDays}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#B9C7BB" }}>
                      days of history used
                    </p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="lg:col-span-3 rounded-xl p-4" style={{ background: "#0F281F" }}>
          <p className="text-xs mb-1" style={{ color: "#B9C7BB" }}>
            Your logged history · prepared vs sold
          </p>
          {chartData.length === 0 ? (
            <p className="text-sm mt-8 text-center" style={{ color: "#7E8C80" }}>
              No food records logged yet — add one below to start building your forecast history.
            </p>
          ) : (
            <div style={{ width: "100%", height: 160 }}>
              <ResponsiveContainer>
                <ComposedChart data={chartData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid stroke="#1F3F32" vertical={false} />
                  <XAxis dataKey="day" tick={{ fill: "#B9C7BB", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#B9C7BB", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#17352A", border: "1px solid #23483A", borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: "#F3D48A" }}
                  />
                  <Bar dataKey="prepared" fill="#23483A" radius={[4, 4, 0, 0]} name="Prepared" />
                  <Line dataKey="sold" stroke="#F3D48A" strokeWidth={2} dot={{ r: 3, fill: "#F3D48A" }} name="Sold" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Forecast inputs — real ML model features, not a fake slider */}
      <div className="ht-card p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <ChefHat size={16} />
          <p className="ht-display text-base" style={{ fontWeight: 600 }}>
            Run the numbers
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
          <div>
            <label className="text-xs block mb-1" style={{ color: "#6B6656" }}>
              Meal
            </label>
            <select
              className="ht-input w-full"
              value={forecastForm.mealType}
              onChange={(e) => setForecastForm({ ...forecastForm, mealType: e.target.value })}
            >
              <option value="lunch">Lunch</option>
              <option value="dinner">Dinner</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#6B6656" }}>
              Date
            </label>
            <input
              type="date"
              className="ht-input w-full"
              value={forecastForm.date}
              onChange={(e) => setForecastForm({ ...forecastForm, date: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#6B6656" }}>
              Temp (°C)
            </label>
            <input
              type="number"
              className="ht-input w-full"
              value={forecastForm.temperature}
              onChange={(e) => setForecastForm({ ...forecastForm, temperature: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs block mb-1" style={{ color: "#6B6656" }}>
              Rain (mm)
            </label>
            <input
              type="number"
              className="ht-input w-full"
              value={forecastForm.rainfall}
              onChange={(e) => setForecastForm({ ...forecastForm, rainfall: e.target.value })}
            />
          </div>
          <button
            className={`ht-toggle text-xs px-3 py-2 ${forecastForm.isHoliday ? "on" : ""}`}
            onClick={() => setForecastForm({ ...forecastForm, isHoliday: !forecastForm.isHoliday })}
          >
            Holiday
          </button>
          <button
            className={`ht-toggle text-xs px-3 py-2 ${forecastForm.specialEvent ? "on" : ""}`}
            onClick={() => setForecastForm({ ...forecastForm, specialEvent: !forecastForm.specialEvent })}
          >
            Special event
          </button>
        </div>
        <button
          className="ht-btn-primary text-sm px-4 py-2 mt-4"
          onClick={() => runForecast(forecastForm)}
          disabled={forecastLoading}
        >
          {forecastLoading ? "Running…" : "Run forecast"}
        </button>
      </div>

      {/* Log a food record — feeds the model's history */}
      <div id="section-records">
      <SectionHeading
        action={
          <button
            className="ht-btn-ghost text-xs px-3 py-2 flex items-center gap-1.5"
            onClick={() => setShowLogRecord((v) => !v)}
          >
            <NotebookPen size={14} /> Log today's numbers
          </button>
        }
      >
        Food record history
      </SectionHeading>

      {showLogRecord && (
        <div className="ht-card p-4 mb-6 grid grid-cols-2 sm:grid-cols-5 gap-2.5 items-end">
          <input
            className="ht-input col-span-2"
            placeholder="Item, e.g. Rice + dal"
            value={newRecord.foodName}
            onChange={(e) => setNewRecord({ ...newRecord, foodName: e.target.value })}
          />
          <select
            className="ht-input"
            value={newRecord.mealType}
            onChange={(e) => setNewRecord({ ...newRecord, mealType: e.target.value })}
          >
            <option value="lunch">Lunch</option>
            <option value="dinner">Dinner</option>
          </select>
          <input
            type="date"
            className="ht-input"
            value={newRecord.date}
            onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
          />
          <input
            type="number"
            className="ht-input"
            placeholder="Prepared"
            value={newRecord.quantityPrepared}
            onChange={(e) => setNewRecord({ ...newRecord, quantityPrepared: e.target.value })}
          />
          <input
            type="number"
            className="ht-input"
            placeholder="Sold"
            value={newRecord.quantitySold}
            onChange={(e) => setNewRecord({ ...newRecord, quantitySold: e.target.value })}
          />
          <button className="ht-btn-primary text-sm px-4 py-2 col-span-2 sm:col-span-1" onClick={addRecord}>
            Save
          </button>
        </div>
      )}

      </div>

      {/* Surplus ticket rail */}
      <div id="section-surplus">
      <SectionHeading
        action={
          <button
            className="ht-btn-primary text-xs px-3 py-2 flex items-center gap-1.5"
            onClick={() => setShowAddDonation((v) => !v)}
          >
            <Plus size={14} /> Add surplus item
          </button>
        }
      >
        Today's surplus
      </SectionHeading>

      {showAddDonation && (
        <div className="ht-card p-4 mb-4 flex flex-col sm:flex-row gap-2.5">
          <input
            className="ht-input flex-1"
            placeholder="Item, e.g. Paneer tikka"
            value={newDonation.foodName}
            onChange={(e) => setNewDonation({ ...newDonation, foodName: e.target.value })}
          />
          <input
            className="ht-input sm:w-28"
            placeholder="Qty"
            type="number"
            min="1"
            value={newDonation.quantity}
            onChange={(e) => setNewDonation({ ...newDonation, quantity: e.target.value })}
          />
          <input
            className="ht-input sm:w-52"
            type="datetime-local"
            value={newDonation.expiresAt}
            onChange={(e) => setNewDonation({ ...newDonation, expiresAt: e.target.value })}
          />
          <button className="ht-btn-primary text-sm px-4 py-2" onClick={addDonation}>
            Add
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {openTickets.map((t) => {
          const s = STATUS_STYLE[t.status.toLowerCase()] || STATUS_STYLE.available;
          return (
            <div key={t.id} className="ht-ticket p-4">
              <div className="flex items-start justify-between">
                <p className="ht-display text-base" style={{ fontWeight: 600 }}>
                  {t.foodName}
                </p>
                <span className="ht-stamp" style={{ color: s.fg }}>
                  {s.label}
                </span>
              </div>
              <p className="ht-mono text-2xl mt-3" style={{ fontWeight: 500 }}>
                {t.quantity}
                <span className="text-sm ml-1" style={{ color: "#8A8574", fontFamily: "Inter, sans-serif" }}>
                  servings
                </span>
              </p>
              <div className="flex items-center gap-1.5 mt-2 text-xs" style={{ color: "#8A8574" }}>
                <Clock size={12} /> Available until{" "}
                {new Date(t.expiresAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
              </div>
              {t.status === "AVAILABLE" && (
                <p className="text-xs mt-3 text-center flex items-center justify-center gap-1" style={{ color: "#8A8574" }}>
                  Waiting for an NGO to accept <ArrowUpRight size={12} />
                </p>
              )}
            </div>
          );
        })}
        {openTickets.length === 0 && (
          <p className="text-sm col-span-full" style={{ color: "#8A8574" }}>
            No open surplus right now — add one above when you have extra food.
          </p>
        )}
      </div>

      </div>

      {/* Donation history */}
      <div id="section-history">
      <SectionHeading>Donation history</SectionHeading>
      <div className="ht-card divide-y" style={{ borderColor: "#DCD5C4" }}>
        {history.map((h) => {
          const deliveryStatus = h.match?.delivery?.status;
          const label = deliveryStatus === "DELIVERED" ? "delivered" : deliveryStatus === "PICKED_UP" ? "in transit" : "claimed";
          const s = STATUS_STYLE[label];
          return (
            <div key={h.id} className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-sm" style={{ fontWeight: 500 }}>
                  {h.foodName} · {h.quantity} servings
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#8A8574" }}>
                  {h.match?.ngo?.name || "Matched"} · {new Date(h.createdAt).toLocaleDateString()}
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full ht-mono" style={{ background: s.bg, color: s.fg }}>
                {s.label}
              </span>
            </div>
          );
        })}
        {history.length === 0 && (
          <p className="text-sm px-4 py-3" style={{ color: "#8A8574" }}>
            No donations claimed yet.
          </p>
        )}
      </div>
      </div>
    </DashboardLayout>
  );
}
