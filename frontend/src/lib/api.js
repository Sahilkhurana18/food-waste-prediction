const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const ML_BASE_URL = import.meta.env.VITE_ML_SERVICE_URL || "http://localhost:8001";

/**
 * Core request helper. Runs in the browser (not inside the frontend's
 * Docker container), so "http://localhost:4000" correctly reaches the
 * backend's host-mapped port when running the whole stack via
 * docker compose on the same machine.
 */
export async function apiRequest(path, { method = "GET", body, token, headers = {} } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // No JSON body (e.g. a 204) — that's fine.
  }

  if (!res.ok) {
    const message = data?.error || `Request failed with status ${res.status}`;
    throw new Error(message);
  }
  return data;
}

export function registerUser(payload) {
  return apiRequest("/auth/register", { method: "POST", body: payload });
}

export function loginUser(payload) {
  return apiRequest("/auth/login", { method: "POST", body: payload });
}

/**
 * Convenience wrapper for authenticated calls, once other pages start
 * replacing mockData.js with real requests.
 */
export function authRequest(path, token, options = {}) {
  return apiRequest(path, { ...options, token });
}

/**
 * The ML service's /model-info is public (no auth) and served on a
 * different port, so it's fetched directly rather than through the
 * backend's apiRequest helper.
 */
export async function fetchModelInfo() {
  const res = await fetch(`${ML_BASE_URL}/model-info`);
  if (!res.ok) throw new Error(`ML service returned ${res.status}`);
  return res.json();
}
