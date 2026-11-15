const endpoint = "https://notac.aero/api/v1/notam/";
const cache = new Map();

class NotacError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

async function searchNotac(locations, apiKey) {
  const url = new URL(endpoint);
  url.searchParams.set("location", locations);
  url.searchParams.set("status", "active");
  const headers = {
    Authorization: `Bearer ${apiKey}`,
    Accept: "application/json",
  };
  const signal = AbortSignal.timeout(20000);
  const notices = new Map();
  let hasNext = true;

  try {
    for (let page = 1; hasNext; page++) {
      url.searchParams.set("page", String(page));
      const response = await fetch(url, { headers, signal, redirect: "error" });
      if (response.status === 401 || response.status === 403)
        throw new NotacError(502, "NOTAC rejected the server's API key.");
      if (response.status === 402)
        throw new NotacError(
          503,
          "The NOTAC account has run out of API credits.",
        );
      if (response.status === 429)
        throw new NotacError(
          503,
          "NOTAC is limiting requests. Try again shortly.",
        );
      if (!response.ok)
        throw new NotacError(502, `NOTAC returned HTTP ${response.status}.`);

      const data = await response.json();
      if (
        !Array.isArray(data?.results) ||
        (data.next !== null &&
          (typeof data.next !== "string" || !data.results.length))
      ) {
        throw new NotacError(502, "NOTAC returned an unexpected response.");
      }

      for (const notice of data.results) {
        if (typeof notice?.id !== "string" || typeof notice.text !== "string")
          throw new NotacError(502, "NOTAC returned an unreadable notice.");
        const id = notice.id.toLowerCase();
        notices.set(id, {
          _id: id,
          airport: notice.location?.icao_code || notice.location_code,
          reference: notice.number,
          text: notice.text,
          startsAt: notice.effective_start,
          endsAt: notice.effective_end,
          category: notice.category?.label,
          source: "NOTAC",
        });
      }
      hasNext = Boolean(data.next);
    }
  } catch (error) {
    if (error instanceof NotacError) throw error;
    if (signal.aborted)
      throw new NotacError(
        504,
        "The NOTAC request timed out. Try fewer airports or retry shortly.",
      );
    throw new NotacError(
      502,
      "Could not read a response from NOTAC. Try again shortly.",
    );
  }

  return { notices: [...notices.values()], fetchedAt: new Date().toISOString() };
}

function fetchActiveNotams(airports, apiKey) {
  const locations = [...airports].sort().join(",");
  const cached = cache.get(locations);
  if (cached && cached.expiresAt > Date.now()) return cached.promise;

  cache.delete(locations);
  if (cache.size >= 100) cache.delete(cache.keys().next().value);
  const entry = { expiresAt: Infinity };
  entry.promise = searchNotac(locations, apiKey).then(
    (result) => {
      entry.expiresAt = Date.now() + 60000;
      return result;
    },
    (error) => {
      if (cache.get(locations) === entry) cache.delete(locations);
      throw error;
    },
  );
  cache.set(locations, entry);
  return entry.promise;
}

module.exports = { fetchActiveNotams, NotacError };
