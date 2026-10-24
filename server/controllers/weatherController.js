const { badRequest } = require("../middleware/validation");

const cache = new Map();

async function fetchProduct(product, ids) {
  const url = `https://aviationweather.gov/api/data/${product}?format=json&ids=${encodeURIComponent(ids)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent": "AeroEFB-Student-Project/1.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(10000),
  });
  if (response.status === 204) return [];
  if (!response.ok)
    throw new Error(
      `The weather provider returned HTTP ${response.status} for ${product.toUpperCase()}.`,
    );
  const data = await response.json();
  if (!Array.isArray(data))
    throw new Error(
      `The provider returned an unexpected ${product.toUpperCase()} response.`,
    );
  return data;
}

exports.get = async (req, res) => {
  if (typeof req.query.ids !== "string")
    throw badRequest("Provide airport ICAO codes, for example ids=OPLA,OPIS.");
  const airports = [
    ...new Set(
      req.query.ids
        .toUpperCase()
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    ),
  ];
  if (
    !airports.length ||
    airports.length > 8 ||
    airports.some((value) => !/^[A-Z]{4}$/.test(value))
  ) {
    throw badRequest("Enter between one and eight four-letter ICAO codes.");
  }
  const key = airports.sort().join(",");
  const cached = cache.get(key);
  if (cached && Date.now() - cached.time < 180000)
    return res.json({ ...cached.data, cached: true });

  const results = await Promise.allSettled([
    fetchProduct("metar", key),
    fetchProduct("taf", key),
  ]);
  const data = {
    metars: results[0].status === "fulfilled" ? results[0].value : [],
    tafs: results[1].status === "fulfilled" ? results[1].value : [],
    requestedAirports: airports,
    fetchedAt: new Date().toISOString(),
    source: "Aviation Weather Center",
    sourceUrl: "https://aviationweather.gov/data/metar/",
    availability: {},
    errors: [],
    cached: false,
  };
  for (let index = 0; index < results.length; index++) {
    const field = index === 0 ? "metars" : "tafs";
    const result = results[index];
    data.availability[field] =
      result.status === "rejected"
        ? "unavailable"
        : result.value.length
          ? "available"
          : "no-data";
    if (result.status === "rejected") {
      data.errors.push(
        result.reason.name === "TimeoutError"
          ? `${field.toUpperCase()} request timed out. Try again shortly.`
          : result.reason.message,
      );
    }
  }
  if (data.errors.length === 2)
    return res.status(502).json({
      ...data,
      message:
        "The weather service could not be reached. No live weather is available.",
    });
  if (cache.size > 100) cache.clear();
  if (data.errors.length === 0) cache.set(key, { time: Date.now(), data });
  res.json(data);
};
