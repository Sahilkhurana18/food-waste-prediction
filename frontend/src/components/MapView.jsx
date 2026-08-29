import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";

const COLORS = {
  restaurant: "#17352A",
  ngo: "#E2A73E",
  volunteer: "#3F5C2C",
  self: "#9A3A24",
};

function dotIcon(type) {
  const color = COLORS[type] || COLORS.restaurant;
  return L.divIcon({
    className: "",
    html: `<div style="width:14px;height:14px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.35);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

// Adjusts the view to fit whatever points are actually present, instead of
// a fixed zoom level. This matters a lot here because test/placeholder
// coordinates can end up thousands of km apart — a fixed zoom would either
// show empty ocean or crop out half the markers.
function FitToPoints({ points }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 13);
    } else if (points.length > 1) {
      const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
      map.fitBounds(bounds, { padding: [30, 30] });
    }
  }, [points, map]);

  return null;
}

/**
 * points: [{ lat, lng, type: "restaurant"|"ngo"|"volunteer"|"self", label }]
 * line: optional [{ lat, lng }, { lat, lng }] to draw a dashed route between two points
 *
 * Points with missing or (0,0) coordinates are dropped — (0,0) usually means
 * a test account was registered without real coordinates, and plotting it
 * would show a misleading pin in the Gulf of Guinea.
 */
export default function MapView({ points = [], line = null, height = 240 }) {
  const valid = points.filter(
    (p) => typeof p.lat === "number" && typeof p.lng === "number" && !(p.lat === 0 && p.lng === 0)
  );

  if (valid.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-xs rounded-xl text-center px-4"
        style={{ height, background: "#F2EEE1", color: "#8A8574" }}
      >
        No location data yet — add real coordinates to see the map.
      </div>
    );
  }

  const center = [valid[0].lat, valid[0].lng];
  const linePoints =
    line && line.every((p) => typeof p.lat === "number" && typeof p.lng === "number" && !(p.lat === 0 && p.lng === 0))
      ? line.map((p) => [p.lat, p.lng])
      : null;

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <MapContainer center={center} zoom={2} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <FitToPoints points={valid} />
        {valid.map((p, i) => (
          <Marker key={i} position={[p.lat, p.lng]} icon={dotIcon(p.type)}>
            <Popup>{p.label}</Popup>
          </Marker>
        ))}
        {linePoints && <Polyline positions={linePoints} color="#17352A" weight={2} dashArray="6 6" />}
      </MapContainer>
    </div>
  );
}
