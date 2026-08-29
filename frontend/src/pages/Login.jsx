import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Leaf } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";
import { ROLE_HOME } from "../components/ProtectedRoute.jsx";

export default function Login() {
  const { login, loading, error } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [localError, setLocalError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setLocalError(null);
    try {
      const data = await login(form.email, form.password);
      navigate(ROLE_HOME[data.user.role] || "/restaurant");
    } catch (err) {
      setLocalError(err.message);
    }
  }

  return (
    <div className="ht-root min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Leaf size={22} color="#17352A" />
          <span className="ht-display text-xl" style={{ fontWeight: 600 }}>
            Harvest Loop
          </span>
        </div>

        <div className="ht-card p-6">
          <p className="ht-display text-lg mb-1" style={{ fontWeight: 600 }}>
            Welcome back
          </p>
          <p className="text-sm mb-5" style={{ color: "#8A8574" }}>
            Log in to your dashboard
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
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
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {(localError || error) && (
              <p className="text-xs" style={{ color: "#9A3A24" }}>
                {localError || error}
              </p>
            )}

            <button className="ht-btn-primary text-sm px-4 py-2.5 mt-1" disabled={loading}>
              {loading ? "Logging in…" : "Log in"}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "#6B6656" }}>
          Don't have an account?{" "}
          <Link to="/register" className="underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
