import { store, setUser } from "./store/store";

let userId = "guest";

export function setCacheUser(id) {
  userId = id || "guest";
}

// Only record lists and briefings are cached. Passwords and session cookies never are.
export async function api(path, options = {}) {
  const method = options.method || "GET";
  const cacheable = method === "GET" && !path.startsWith("/auth");
  const key = `aeroefb:${userId}:${path}`;
  let response;
  if (!navigator.onLine && method !== "GET")
    throw new Error(
      "You are offline. Saved information is available to read; reconnect to make changes.",
    );
  try {
    response = await fetch(`/api${path}`, {
      ...options,
      method,
      credentials: "include",
      headers: { "Content-Type": "application/json", ...options.headers },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    if (cacheable) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved)
          return path.startsWith("/weather")
            ? {
                ...saved.data,
                cached: true,
                errors: [
                  "Connection unavailable. This is the last saved briefing.",
                ],
              }
            : saved.data;
      } catch {
        /* Reading remains available when browser storage is disabled. */
      }
    }
    throw new Error(
      "Cannot reach the server. Start the server or reconnect, then try again.",
    );
  }
  const data = response.status === 204 ? null : await response.json();
  if (!response.ok) {
    if (response.status === 401) {
      userId = "guest";
      store.dispatch(setUser(null));
    }
    // A provider outage may use the last briefing, but authentication errors never use cached data.
    if (cacheable && path.startsWith("/weather") && response.status >= 500) {
      try {
        const saved = JSON.parse(localStorage.getItem(key));
        if (saved)
          return {
            ...saved.data,
            cached: true,
            errors: [
              "Live weather is unavailable. This is the last saved briefing.",
            ],
          };
      } catch {
        /* No saved briefing. */
      }
    }
    const error = new Error(
      data?.message || "The request could not be completed.",
    );
    error.status = response.status;
    throw error;
  }
  if (cacheable) {
    try {
      localStorage.setItem(
        key,
        JSON.stringify({ data, savedAt: new Date().toISOString() }),
      );
    } catch {
      /* A full cache does not stop normal use. */
    }
  }
  return data;
}
