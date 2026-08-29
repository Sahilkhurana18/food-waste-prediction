/**
 * Haversine distance between two lat/lng points, in kilometers.
 */
export function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const URGENCY_WEIGHT = { urgent: 1, normal: 0.6, low: 0.3 };

/**
 * Scores a donation against an NGO request per the plan's weighting:
 * 40% proximity, 30% urgency, 20% demand fit, 10% food compatibility.
 * Returns a 0-100 score plus the raw distance for storage on the Match row.
 *
 * This is intentionally a simple, explainable scoring function — a good
 * "greedy matching" baseline. Swap in OR-Tools / an LP solver later for
 * the "advanced version" the project plan describes.
 */
export function scoreMatch({ donation, restaurant, ngo, request }) {
  const dist = distanceKm(restaurant.latitude, restaurant.longitude, ngo.latitude, ngo.longitude);

  // Proximity: 100 at 0km, decays to 0 by 15km.
  const proximityScore = Math.max(0, 100 - (dist / 15) * 100);

  const urgencyScore = (URGENCY_WEIGHT[request?.urgency] ?? URGENCY_WEIGHT.normal) * 100;

  // Demand fit: how well the donation quantity matches what's requested.
  const demandScore = request
    ? Math.max(0, 100 - (Math.abs(donation.quantity - request.quantity) / Math.max(request.quantity, 1)) * 100)
    : 60; // no specific request to match against — neutral score

  // Food compatibility: simple substring check as a placeholder for a real
  // food-type taxonomy / dietary-compatibility rule set.
  const compatibilityScore = request
    ? donation.foodName.toLowerCase().includes(request.foodType.toLowerCase()) ||
      request.foodType.toLowerCase().includes(donation.foodName.toLowerCase())
      ? 100
      : 50
    : 70;

  const score =
    0.4 * proximityScore + 0.3 * urgencyScore + 0.2 * demandScore + 0.1 * compatibilityScore;

  return { score: Math.round(score * 10) / 10, distanceKm: Math.round(dist * 10) / 10 };
}

/**
 * Greedy matcher: for a given donation, finds the best-scoring eligible
 * NGO among candidates (each with their latest pending request, if any).
 */
export function findBestMatch({ donation, restaurant, candidates }) {
  let best = null;
  for (const candidate of candidates) {
    const { ngo, request } = candidate;
    const result = scoreMatch({ donation, restaurant, ngo, request });
    if (!best || result.score > best.score) {
      best = { ngo, request, ...result };
    }
  }
  return best;
}
