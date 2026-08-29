import { Routes, Route, Navigate } from "react-router-dom";
import RestaurantDashboard from "./pages/RestaurantDashboard.jsx";
import NgoDashboard from "./pages/NgoDashboard.jsx";
import VolunteerDashboard from "./pages/VolunteerDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/restaurant"
        element={
          <ProtectedRoute role="RESTAURANT">
            <RestaurantDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/ngo"
        element={
          <ProtectedRoute role="NGO">
            <NgoDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/volunteer"
        element={
          <ProtectedRoute role="VOLUNTEER">
            <VolunteerDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
