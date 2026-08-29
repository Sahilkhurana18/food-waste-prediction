import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export const ROLE_HOME = {
  RESTAURANT: "/restaurant",
  NGO: "/ngo",
  VOLUNTEER: "/volunteer",
  ADMIN: "/admin",
};

export default function ProtectedRoute({ role, children }) {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={ROLE_HOME[user.role] || "/login"} replace />;

  return children;
}
