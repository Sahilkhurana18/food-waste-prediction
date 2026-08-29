import React from "react";
import Sidebar from "../components/Sidebar.jsx";

export default function DashboardLayout({ role, children }) {
  return (
    <div className="ht-root">
      <div className="flex min-h-screen">
        <Sidebar role={role} />
        <main className="flex-1 p-6 md:p-8 max-w-6xl">{children}</main>
      </div>
    </div>
  );
}
