import { store, setUser } from "./store/store.js";

let userId = "guest";

export function setCacheUser(id) {
  userId = id || "guest";
}

function savedResponse(key, weatherWarning) {
  try {
    const saved = JSON.parse(localStorage.getItem(key));
    if (saved)
      return weatherWarning
        ? { ...saved.data, cached: true, errors: [...(saved.data.errors || []), weatherWarning] }
        : saved.data;
  } catch {
    // Storage can be disabled or contain an unreadable entry.
  }
}

export async function api(path, options = {}) {
  const method = options.method || "GET";
  const cacheable = method === "GET" && !path.startsWith("/auth");
  const weather = cacheable && path.startsWith("/weather?");
  const key = `aeroefb:${userId}:${path}`;
  if (!navigator.onLine && method !== "GET")
    throw new Error(
      "You are offline. Saved information is available to read; reconnect to make changes.",
    );

  let response;
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (cacheable) {
      const saved = savedResponse(key, weather && "Connection unavailable. This is the last saved briefing.");
      if (saved !== undefined) return saved;
    }
    throw new Error(
      "Cannot reach the server. Start the server or reconnect, then try again.",
    );
  }

  if (!response.ok) {
    if (response.status === 401) {
      setCacheUser(null);
      store.dispatch(setUser(null));
    }
    if (weather && response.status >= 500) {
      const saved = savedResponse(key, "Live weather is unavailable. This is the last saved briefing.");
      if (saved !== undefined) return saved;
    }
    const data = await response.json().catch(() => null);
    const error = new Error(data?.message || `The request failed (HTTP ${response.status}).`);
    error.status = response.status;
    throw error;
  }
  const data = response.status === 204 ? null : await response.json();
  if (cacheable) {
    try {
      localStorage.setItem(key, JSON.stringify({ data }));
    } catch {
      /* A full cache does not stop normal use. */
    }
  }
  return data;
}
