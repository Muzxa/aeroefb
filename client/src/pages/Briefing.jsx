import { useEffect, useState } from "react";
import {
  ArrowClockwiseIcon,
  CheckIcon,
  ClockIcon,
  CloudIcon,
  CompassIcon,
  InfoIcon,
  MagnifyingGlassIcon,
  SunIcon,
  WindIcon,
} from "@phosphor-icons/react";
import { api } from "../api";
import "./tools.css";

function getAirports(flight, airportsOnly = false) {
  if (!flight) return [];
  if (flight.importedRoute || airportsOnly) {
    const airports = (flight.importedRoute?.waypoints || [])
      .filter(({ type }) => type === "AIRPORT")
      .map(({ id }) => id);
    return [
      ...new Set(
        [flight.departure, flight.destination, flight.alternate, ...airports].filter(
          (id) => /^[A-Z]{4}$/.test(id),
        ),
      ),
    ];
  }
  const values = `${flight.departure || ""} ${flight.destination || ""} ${flight.alternate || ""} ${flight.route || ""}`;
  return [...new Set(values.toUpperCase().match(/\b[A-Z]{4}\b/g) || [])];
}

function dateLabel(value) {
  if (!value) return "Not specified";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleString("en-GB", {
        timeZone: "UTC",
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23",
      })} UTC`;
}

function stationOf(report) {
  return (
    report.icaoId || report.airport || report.stationId || report.station || ""
  );
}

export default function Briefing({
  mode = "weather",
  user,
  flights = [],
  notify,
  online = true,
}) {
  const [airportInput, setAirportInput] = useState(user?.homeAirport || "");
  const [flightId, setFlightId] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [notamLookup, setNotamLookup] = useState(null);
  const [notamBriefing, setNotamBriefing] = useState(null);
  const [notamLoading, setNotamLoading] = useState(false);
  const [notamError, setNotamError] = useState("");
  const [reviewingLive, setReviewingLive] = useState(false);
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  useEffect(() => {
    const homeAirport = user?.homeAirport || "";
    setAirportInput(homeAirport);
    setFlightId("");
    setWeather(null);
    setWeatherError("");
    setLoading(false);
    setNotamBriefing(null);
    setNotamError("");
    setNotamLookup(
      mode === "notams" && /^[A-Z]{4}$/.test(homeAirport)
        ? { airports: [homeAirport] }
        : null,
    );
    if (mode !== "weather" || !/^[A-Z]{4}$/.test(homeAirport)) return;

    let active = true;
    setLoading(true);
    api(`/weather?ids=${homeAirport}`)
      .then((data) => {
        if (active) setWeather(data);
      })
      .catch((error) => {
        if (active) setWeatherError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [mode, user?._id, user?.homeAirport]);

  useEffect(() => {
    if (mode !== "notams" || !notamLookup || !online) {
      setNotamLoading(false);
      return;
    }

    const controller = new AbortController();
    setNotamLoading(true);
    setNotamBriefing(null);
    setNotamError("");
    api("/notams/refresh", {
      method: "POST",
      body: notamLookup,
      signal: controller.signal,
    })
      .then((data) => {
        if (!controller.signal.aborted)
          setNotamBriefing({ ...data, airports: notamLookup.airports });
      })
      .catch((error) => {
        if (!controller.signal.aborted) setNotamError(error.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setNotamLoading(false);
      });
    return () => controller.abort();
  }, [mode, notamLookup, online]);

  const airports = [
    ...new Set(
      airportInput
        .toUpperCase()
        .split(/[\s,;]+/)
        .filter(Boolean),
    ),
  ];
  const briefingTime = weather ? new Date(weather.fetchedAt).getTime() : 0;
  const oldBriefing =
    weather &&
    Number.isFinite(briefingTime) &&
    Date.now() - briefingTime > 60 * 60 * 1000;
  const visibleNotams = (notamBriefing?.notices || []).filter(
    (item) => {
      const matchesReview =
        reviewFilter === "all" ||
        (reviewFilter === "reviewed" ? item.reviewed : !item.reviewed);
      const matchesSearch = `${item.airport} ${item.reference} ${item.text}`
        .toLowerCase()
        .includes(search.toLowerCase());
      return matchesReview && matchesSearch;
    },
  );
  const hasNotices = Boolean(notamBriefing?.notices.length);
  const briefingLoading = mode === "weather" ? loading : notamLoading;

  function selectFlight(value) {
    setFlightId(value);
    const flight = flights.find((item) => item._id === value);
    const codes = getAirports(flight, mode === "notams");
    setAirportInput(codes.join(", "));
    if (mode === "notams") lookupNotams(codes, Boolean(flight));
  }

  async function loadWeather(event) {
    event.preventDefault();
    if (
      !airports.length ||
      airports.length > 8 ||
      airports.some((id) => !/^[A-Z]{4}$/.test(id))
    ) {
      setWeatherError(
        "Enter one to eight four-letter ICAO airport codes, separated by commas.",
      );
      return;
    }
    setLoading(true);
    setWeatherError("");
    try {
      const data = await api(
        `/weather?ids=${encodeURIComponent(airports.join(","))}`,
      );
      setWeather(data);
    } catch (error) {
      setWeatherError(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function toggleReviewed(item) {
    setReviewingLive(true);
    try {
      const reviewed = !item.reviewed;
      await api(`/notams/live/${item._id}/review`, {
        method: "PUT",
        body: { reviewed },
      });
      setNotamBriefing((current) =>
        current && {
          ...current,
          notices: current.notices.map((notice) =>
            notice._id === item._id ? { ...notice, reviewed } : notice,
          ),
        },
      );
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setReviewingLive(false);
    }
  }

  function lookupNotams(codes, shouldFetch) {
    setNotamBriefing(null);
    setNotamError("");
    if (!shouldFetch) {
      setNotamLookup(null);
    } else if (
      !codes.length ||
      codes.length > 8 ||
      codes.some((code) => !/^[A-Z]{4}$/.test(code))
    ) {
      setNotamLookup(null);
      setNotamError("Enter one to eight four-letter ICAO airport codes.");
    } else {
      setNotamLookup({ airports: codes });
    }
  }

  function refreshNotams(event) {
    event.preventDefault();
    if (online && !notamLoading && !reviewingLive) lookupNotams(airports, true);
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>{mode === "weather" ? "Weather briefing" : "NOTAM briefing"}</h1>
        </div>
      </div>

      <section
        className="card briefing-controls"
        aria-label="Briefing airports"
      >
        {mode === "notams" && (
          <div className="section-heading">
            <h2>Build your briefing</h2>
          </div>
        )}
        <form onSubmit={mode === "weather" ? loadWeather : refreshNotams}>
          <div className={`form-grid briefing-search-grid ${mode === "notams" ? "notam-briefing-grid" : ""}`}>
            <div className="field">
              <label htmlFor={`${mode}-flight`}>Use a saved flight</label>
              <select
                id={`${mode}-flight`}
                value={flightId}
                onChange={(event) => selectFlight(event.target.value)}
                disabled={mode === "notams" && reviewingLive}
              >
                <option value="">Choose a flight</option>
                {flights.map((flight) => (
                  <option key={flight._id} value={flight._id}>
                    {flight.departure} → {flight.destination}
                    {flight.date
                      ? ` · ${String(flight.date).slice(0, 10)}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor={`${mode}-airports`}>Airports (ICAO codes)</label>
              <input
                id={`${mode}-airports`}
                value={airportInput}
                onChange={(event) => {
                  setAirportInput(event.target.value.toUpperCase());
                  setFlightId("");
                  if (mode === "notams") lookupNotams([], false);
                }}
                placeholder="e.g. OPLA, OPIS"
                disabled={mode === "notams" && reviewingLive}
              />
            </div>
            <button
              className={mode === "notams" ? "button notam-fetch" : "button secondary briefing-load"}
              type="submit"
              disabled={
                briefingLoading || (mode === "notams" && (reviewingLive || !online))
              }
            >
              <ArrowClockwiseIcon />{" "}
              {briefingLoading
                ? "Loading…"
                : mode === "weather"
                  ? "Get weather"
                  : "Get active NOTAMs"}
            </button>
          </div>
        </form>
      </section>

      {mode === "weather" ? (
        <>
          {weatherError && (
            <div className="tool-error" role="alert">
              {weatherError}
            </div>
          )}
          {loading && (
            <p className="muted" role="status">
              Requesting aviation weather…
            </p>
          )}
          {weather && (
            <>
              <div className="briefing-source-row">
                <p className="muted">
                  {typeof weather.source === "string"
                    ? weather.source
                    : "NOAA Aviation Weather Center"}{" "}
                  · Retrieved {dateLabel(weather.fetchedAt)}
                </p>
                <span
                  className={`badge ${online && !weather.cached && !oldBriefing ? "blue" : "amber"}`}
                >
                  {oldBriefing
                    ? "Briefing over 1 hour old"
                    : online && !weather.cached
                      ? "Check observation times"
                      : "Cached briefing"}
                </span>
              </div>
              {oldBriefing && (
                <div className="briefing-advisory" role="status">
                  <ClockIcon />
                  <p>
                    This briefing was saved over an hour ago. Request an updated
                    briefing and check each report’s observation time before
                    use.
                  </p>
                </div>
              )}
              {weather.errors?.length > 0 && (
                <div className="briefing-advisory" role="status">
                  <InfoIcon />
                  <div>
                    {weather.errors.map((error, index) => (
                      <p key={index}>
                        {typeof error === "string"
                          ? error
                          : error.message ||
                            "Some weather reports could not be retrieved."}
                      </p>
                    ))}
                  </div>
                </div>
              )}
              <div className="weather-station-grid">
                {[
                  ...new Set([
                    ...(weather.metars || []).map(stationOf),
                    ...(weather.tafs || []).map(stationOf),
                    ...(weather.requestedAirports || airports),
                  ]),
                ]
                  .filter(Boolean)
                  .map((airport) => {
                    const metar = (weather.metars || []).find(
                      (item) => stationOf(item) === airport,
                    );
                    const taf = (weather.tafs || []).find(
                      (item) => stationOf(item) === airport,
                    );
                    return (
                      <section className="card station-card" key={airport}>
                        <div className="section-heading">
                          <div className="station-title">
                            <span className="station-icon">
                              <CloudIcon />
                            </span>
                            <h2>{airport}</h2>
                          </div>
                          {metar?.fltCat && (
                            <span
                              className={`badge ${metar.fltCat === "VFR" ? "green" : "amber"}`}
                            >
                              {metar.fltCat}
                            </span>
                          )}
                        </div>
                        {metar ? (
                          <>
                            <p className="muted station-time">
                              Observed{" "}
                              {dateLabel(
                                metar.reportTime ||
                                  metar.observationTime ||
                                  (metar.obsTime ? metar.obsTime * 1000 : null),
                              )}
                            </p>
                            <div className="weather-readings">
                              <div>
                                <WindIcon />
                                <span>Wind</span>
                                <strong>
                                  {metar.wdir === "VRB"
                                    ? "Variable"
                                    : metar.wdir != null
                                      ? `${metar.wdir}°`
                                      : "—"}
                                  {metar.wspd != null
                                    ? ` / ${metar.wspd} kt`
                                    : ""}
                                  {metar.wgst ? ` G${metar.wgst}` : ""}
                                </strong>
                              </div>
                              <div>
                                <SunIcon />
                                <span>Temperature</span>
                                <strong>
                                  {metar.temp != null
                                    ? `${metar.temp} °C`
                                    : "—"}
                                </strong>
                              </div>
                              <div>
                                <CompassIcon />
                                <span>Visibility</span>
                                <strong>
                                  {metar.visib != null
                                    ? `${metar.visib} SM`
                                    : "—"}
                                </strong>
                              </div>
                            </div>
                            <h3 className="report-label">
                              METAR · OBSERVATION
                            </h3>
                            <pre className="aviation-report">
                              {metar.rawOb ||
                                metar.raw ||
                                metar.raw_text ||
                                "Raw observation unavailable."}
                            </pre>
                          </>
                        ) : (
                          <p className="muted missing-report">
                            No METAR observation returned for this airport.
                          </p>
                        )}
                        <h3 className="report-label">TAF · FORECAST</h3>
                        {taf ? (
                          <pre className="aviation-report">
                            {taf.rawTAF ||
                              taf.raw ||
                              taf.raw_text ||
                              "Raw forecast unavailable."}
                          </pre>
                        ) : (
                          <p className="muted missing-report">
                            No TAF forecast returned. Some airports do not issue
                            TAFs.
                          </p>
                        )}
                      </section>
                    );
                  })}
              </div>
            </>
          )}
          <p className="tool-footnote">
            Weather reports are time sensitive. Verify the report time and
            obtain an official flight briefing before departure.{" "}
            <a
              href="https://aviationweather.gov/"
              target="_blank"
              rel="noreferrer"
            >
              Open Aviation Weather Center{" "}
              <span className="sr-only">in a new tab</span>
            </a>
          </p>
        </>
      ) : (
        <>
          {online && !notamLookup && !notamError && !notamLoading && (
            <p className="muted">Enter an airport code to look up notices.</p>
          )}
          {notamError && (
            <div className="tool-error" role="alert">
              {notamError}
            </div>
          )}
          {notamLoading && (
            <p className="muted" role="status">
              Requesting active NOTAMs…
            </p>
          )}
          {notamBriefing && !hasNotices && (
            <p className="muted" role="status">
              No active notices for {notamBriefing.airports.join(", ")}
            </p>
          )}
          {hasNotices && (
            <div className="notam-toolbar">
              <div className="field notam-search">
                <label className="sr-only" htmlFor="notice-search">
                  Search notices
                </label>
                <MagnifyingGlassIcon />
                <input
                  id="notice-search"
                  placeholder="Search reference or notice text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <div className="field">
                <label className="sr-only" htmlFor="notice-status">
                  Review status
                </label>
                <select
                  id="notice-status"
                  value={reviewFilter}
                  onChange={(event) => setReviewFilter(event.target.value)}
                >
                  <option value="all">All review statuses</option>
                  <option value="unread">To review</option>
                  <option value="reviewed">Reviewed</option>
                </select>
              </div>
            </div>
          )}
          <div className="notice-list">
            {visibleNotams.map((item) => (
              <article key={item._id} className="card notice-card">
                <div className="notice-top">
                  <div className="notice-identification">
                    <span className="notice-airport">{item.airport}</span>
                    <h2>{item.reference}</h2>
                    <span className="badge">{item.category || "General"}</span>
                    {item.endsAt && new Date(item.endsAt).getTime() < Date.now() && (
                      <span className="badge amber">Expired</span>
                    )}
                    {new Date(item.startsAt).getTime() > Date.now() && (
                      <span className="badge blue">Upcoming</span>
                    )}
                  </div>
                  <span
                    className={`badge ${item.reviewed ? "green" : "amber"}`}
                  >
                    {item.reviewed ? "Reviewed" : "To review"}
                  </span>
                </div>
                <p className="notice-text">{item.text}</p>
                <div className="notice-validity">
                  <span>
                    <ClockIcon /> From {dateLabel(item.startsAt)}
                  </span>
                  <span>
                    {item.endsAt
                      ? `Until ${dateLabel(item.endsAt)}`
                      : "No end time supplied"}
                  </span>
                </div>
                <div className="notice-bottom">
                  <span
                    className="badge blue"
                  >
                    {item.source}
                  </span>
                  <div className="notice-actions">
                    <button
                      className="button ghost"
                      onClick={() => toggleReviewed(item)}
                      disabled={!online || reviewingLive}
                    >
                      <CheckIcon />{" "}
                      {item.reviewed ? "Mark unread" : "Mark reviewed"}
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {hasNotices && visibleNotams.length === 0 && (
              <p className="muted" role="status">No notices match your filters.</p>
            )}
          </div>
        </>
      )}

    </>
  );
}
