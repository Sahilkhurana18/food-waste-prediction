import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";

const ROLES = [
  { value: "RESTAURANT", label: "Restaurant" },
  { value: "NGO", label: "NGO" },
  { value: "VOLUNTEER", label: "Volunteer" },
  { value: "ADMIN", label: "Admin" },
];

export default function Register() {
  const { register, loading, error } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState("RESTAURANT");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [profile, setProfile] = useState({ name: "", latitude: "", longitude: "", address: "", capacity: "" });
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    try {
      const payload = {
        ...form,
        role,
        profile: {
          name: profile.name || form.name,
          latitude: profile.latitude ? Number(profile.latitude) : 0,
          longitude: profile.longitude ? Number(profile.longitude) : 0,
          ...(role === "RESTAURANT" && { address: profile.address }),
          ...(role === "NGO" && profile.capacity && { capacity: Number(profile.capacity) }),
        },
      };
      const data = await register(payload);
      navigate(ROLE_HOME[data.user.role] || "/restaurant");
    } catch (err) {
      setLocalError(err.message);
    }
  }

  return (
    <div className="ht-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Leaf size={22} color="#17352A" />
          <span className="ht-display text-xl" style={{ fontWeight: 600 }}>
            Harvest Loop
          </span>
        </div>

        <div className="ht-card p-6">
          <p className="ht-display text-lg mb-1" style={{ fontWeight: 600 }}>
            Create an account
          </p>
          <p className="text-sm mb-5" style={{ color: "#8A8574" }}>
            Join as a restaurant, NGO, or volunteer
          </p>

          <div className="flex gap-2 mb-4">
            {ROLES.map((r) => (
              <button
                key={r.value}
                type="button"
                className={`ht-toggle text-xs px-3 py-2 flex-1 ${role === r.value ? "on" : ""}`}
                onClick={() => setRole(r.value)}
              >
                {r.label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div>
              <label className="text-xs" style={{ color: "#6B6656" }}>
                Your name
              </label>
              <input
                className="ht-input w-full mt-1"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "#6B6656" }}>
                Email
              </label>
              <input
                className="ht-input w-full mt-1"
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="text-xs" style={{ color: "#6B6656" }}>
                Password
              </label>
              <input
                className="ht-input w-full mt-1"
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {role !== "ADMIN" && (
              <div className="border-t pt-3 mt-1" style={{ borderColor: "#DCD5C4" }}>
                <p className="text-xs mb-2" style={{ color: "#6B6656" }}>
                  {role === "RESTAURANT" ? "Restaurant details" : role === "NGO" ? "NGO details" : "Volunteer details"}
                </p>
                <div className="flex flex-col gap-3">
                  <input
                    className="ht-input w-full"
                    placeholder={role === "RESTAURANT" ? "Restaurant name" : role === "NGO" ? "NGO name" : "Display name"}
                    value={profile.name}
                    onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                  />
                  <div className="flex gap-3">
                    <input
                      className="ht-input flex-1"
                      placeholder="Latitude"
                      value={profile.latitude}
                      onChange={(e) => setProfile({ ...profile, latitude: e.target.value })}
                    />
                    <input
                      className="ht-input flex-1"
                      placeholder="Longitude"
                      value={profile.longitude}
                      onChange={(e) => setProfile({ ...profile, longitude: e.target.value })}
                    />
                  </div>
                  {role === "RESTAURANT" && (
                    <input
                      className="ht-input w-full"
                      placeholder="Address"
                      value={profile.address}
                      onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    />
                  )}
                  {role === "NGO" && (
                    <input
                      className="ht-input w-full"
                      placeholder="Capacity (meals/day, optional)"
                      value={profile.capacity}
                      onChange={(e) => setProfile({ ...profile, capacity: e.target.value })}
                    />
                  )}
                  <p className="text-xs" style={{ color: "#8A8574" }}>
                    Tip: right-click a spot on Google Maps to copy its coordinates.
                  </p>
                </div>
              </div>
            )}

            {(localError || error) && (
              <p className="text-xs" style={{ color: "#9A3A24" }}>
                {localError || error}
              </p>
            )}

            <button className="ht-btn-primary text-sm px-4 py-2.5 mt-1" disabled={loading}>
              {loading ? "Creating account…" : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#6B6656" }}>
          Already have an account?{" "}
          <Link to="/login" className="underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
