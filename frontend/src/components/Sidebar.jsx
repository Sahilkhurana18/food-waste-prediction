import React from "react";
import { useNavigate } from "react-router-dom";
import {
  Leaf,
  ChefHat,
  HeartHandshake,
  Bike,
  ShieldCheck,
  LayoutGrid,
  Package,
  History,
  NotebookPen,
  ClipboardList,
  Truck,
  LogOut,
  Map as MapIcon,
} from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const ROLES = [
  { to: "/restaurant", label: "Restaurant", icon: ChefHat },
  { to: "/ngo", label: "NGO", icon: HeartHandshake },
  { to: "/volunteer", label: "Volunteer", icon: Bike },
  { to: "/admin", label: "Admin", icon: ShieldCheck },
];

// Each entry's `id` must match a `id="..."` on that page's section wrapper —
// clicking scrolls to it instead of navigating, since every dashboard is a
// single scrollable page rather than separate sub-routes.
const SECONDARY_NAV = {
  "/restaurant": [
    { label: "Forecast", icon: LayoutGrid, id: "section-forecast" },
    { label: "Food records", icon: NotebookPen, id: "section-records" },
    { label: "Surplus", icon: Package, id: "section-surplus" },
    { label: "History", icon: History, id: "section-history" },
  ],
  "/ngo": [
    { label: "Available donations", icon: Package, id: "section-available" },
    { label: "Map", icon: MapIcon, id: "section-map" },
    { label: "Your requests", icon: ClipboardList, id: "section-requests" },
    { label: "Deliveries", icon: Truck, id: "section-deliveries" },
  ],
  "/volunteer": [
    { label: "Assigned pickup", icon: Truck, id: "section-assigned" },
    { label: "Available pickups", icon: Package, id: "section-available" },
    { label: "History", icon: History, id: "section-history" },
  ],
  "/admin": [
    { label: "Overview", icon: LayoutGrid, id: "section-overview" },
    { label: "Restaurants", icon: ChefHat, id: "section-restaurants" },
    { label: "NGOs", icon: HeartHandshake, id: "section-ngos" },
  ],
};

function scrollToSection(id) {
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

export default function Sidebar({ role }) {
  const secondary = SECONDARY_NAV[role] || [];
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <aside className="ht-sidebar w-56 flex-shrink-0 flex-col p-5 hidden md:flex">
      <div className="flex items-center gap-2 mb-8">
        <Leaf size={20} color="#F3D48A" />
        <span className="ht-display text-lg" style={{ fontWeight: 600 }}>
          Harvest Loop
        </span>
      </div>

      <div className="flex items-center gap-2 mb-8 px-3">
        {(() => {
          const current = ROLES.find((r) => r.to === role);
          const Icon = current?.icon || Leaf;
          return (
            <>
              <Icon size={16} color="#F3D48A" />
              <span className="text-sm" style={{ color: "#F3D48A", fontWeight: 500 }}>
                {current?.label || "Dashboard"}
              </span>
            </>
          );
        })()}
      </div>

      <p className="text-xs uppercase tracking-wide mb-2 px-3" style={{ color: "#7E8C80" }}>
        {role === "/restaurant" && "Restaurant portal"}
        {role === "/ngo" && "NGO portal"}
        {role === "/volunteer" && "Volunteer portal"}
        {role === "/admin" && "Admin portal"}
      </p>
      <nav className="flex flex-col gap-1 text-sm">
        {secondary.map((item) => {
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToSection(item.id);
              }}
              className="ht-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer"
            >
              <Icon size={16} /> {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-auto pt-6">
        {user && (
          <div className="px-3 mb-2">
            <p className="text-sm truncate" style={{ fontWeight: 500 }}>
              {user.name}
            </p>
            <p className="text-xs truncate" style={{ color: "#7E8C80" }}>
              {user.email}
            </p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="ht-nav-item flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm w-full"
        >
          <LogOut size={16} /> Log out
        </button>
      </div>
    </aside>
  );
}
