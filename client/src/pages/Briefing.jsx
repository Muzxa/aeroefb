import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import { api } from "../api";
import "./tools.css";

function getAirports(flight) {
  if (!flight) return [];
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

function utcInputDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 16);
}

function stationOf(report) {
  return (
    report.icaoId || report.airport || report.stationId || report.station || ""
  );
}

const blankNotice = {
  airport: "",
  reference: "",
  text: "",
  startsAt: "",
  endsAt: "",
  category: "Aerodrome",
  source: "Manual import",
  reviewed: false,
};

export default function Briefing({
  mode = "weather",
  user,
  flights = [],
  notams = [],
  refresh,
  notify,
  online = true,
}) {
  const [airportInput, setAirportInput] = useState(
    mode === "weather" ? user?.homeAirport || "" : "",
  );
  const [flightId, setFlightId] = useState("");
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(false);
  const [weatherError, setWeatherError] = useState("");
  const [search, setSearch] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");
  const [editor, setEditor] = useState("");
  const [notice, setNotice] = useState(blankNotice);
  const [editingId, setEditingId] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    const homeAirport = user?.homeAirport || "";
    setAirportInput(mode === "weather" ? homeAirport : "");
    setFlightId("");
    setWeather(null);
    setWeatherError("");
    setLoading(false);
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
  const visibleNotams = notams.filter((item) => {
    const matchesAirport =
      airports.length === 0 || airports.includes(item.airport);
    const matchesReview =
      reviewFilter === "all" ||
      (reviewFilter === "reviewed" ? item.reviewed : !item.reviewed);
    const matchesSearch = `${item.airport} ${item.reference} ${item.text}`
      .toLowerCase()
      .includes(search.toLowerCase());
    return matchesAirport && matchesReview && matchesSearch;
  });

  function selectFlight(value) {
    setFlightId(value);
    const flight = flights.find((item) => item._id === value);
    setAirportInput(getAirports(flight).join(", "));
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

  function openEditor(item, title) {
    setEditingId(item?._id || "");
    setNotice(
      item
        ? {
            ...item,
            startsAt: utcInputDate(item.startsAt),
            endsAt: utcInputDate(item.endsAt),
          }
        : {
            ...blankNotice,
            airport: airports.length === 1 ? airports[0] : "",
          },
    );
    setFormError("");
    setEditor(title);
  }

  function changeNotice(event) {
    const { name, value, type, checked } = event.target;
    setNotice({ ...notice, [name]: type === "checkbox" ? checked : value });
  }

  async function saveNotice(event) {
    event.preventDefault();
    if (
      notice.startsAt &&
      notice.endsAt &&
      new Date(`${notice.endsAt}Z`) <= new Date(`${notice.startsAt}Z`)
    ) {
      setFormError("The end time must be after the start time.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      const body = {
        ...notice,
        airport: notice.airport.trim().toUpperCase(),
        startsAt: notice.startsAt
          ? new Date(`${notice.startsAt}Z`).toISOString()
          : null,
        endsAt: notice.endsAt
          ? new Date(`${notice.endsAt}Z`).toISOString()
          : null,
      };
      await api(editingId ? `/notams/${editingId}` : "/notams", {
        method: editingId ? "PUT" : "POST",
        body,
      });
      setEditor("");
      notify(editingId ? "Notice updated." : "Notice saved to your briefing.");
      try {
        await refresh();
      } catch (error) {
        notify(
          `The notice was saved, but the list could not be refreshed. ${error.message}`,
          "error",
        );
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleReviewed(item) {
    try {
      await api(`/notams/${item._id}`, {
        method: "PUT",
        body: { reviewed: !item.reviewed },
      });
      await refresh();
      notify(
        item.reviewed
          ? "Notice marked as unread."
          : "Notice marked as reviewed.",
      );
    } catch (error) {
      notify(error.message, "error");
    }
  }

  async function deleteNotice() {
    setSaving(true);
    try {
      await api(`/notams/${deleting._id}`, { method: "DELETE" });
      setDeleting(null);
      notify("Notice removed.");
      try {
        await refresh();
      } catch (error) {
        notify(
          `The notice was removed, but the list could not be refreshed. ${error.message}`,
          "error",
        );
      }
    } catch (error) {
      setFormError(error.message);
    } finally {
      setSaving(false);
    }
  }

  async function refreshNotams() {
    setLoading(true);
    try {
      const result = await api("/notams/refresh", {
        method: "POST",
        body: { airports },
      });
      notify(
        result.message || "NOTAM refresh completed.",
        result.configured === false ? "info" : "success",
      );
      await refresh();
    } catch (error) {
      notify(error.message, error.status === 503 ? "info" : "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">FLIGHT PREPARATION</p>
          <h1>{mode === "weather" ? "Weather briefing" : "NOTAM briefing"}</h1>
          <p className="page-intro">
            {mode === "weather"
              ? "A clear picture of conditions along your route."
              : "Keep the operational details that matter in one place."}
          </p>
        </div>
        {mode === "notams" && (
          <button
            className="button"
            onClick={() => openEditor(null, "Add a notice")}
            disabled={!online}
          >
            <Icon name="plus" /> Add notice
          </button>
        )}
      </div>

      <section
        className="card briefing-controls"
        aria-label="Briefing airports"
      >
        <div className="section-heading">
          <h2>Build your briefing</h2>
          <span className="badge blue">ICAO airport codes</span>
        </div>
        <form
          onSubmit={
            mode === "weather" ? loadWeather : (event) => event.preventDefault()
          }
        >
          <div className="form-grid briefing-search-grid">
            <div className="field">
              <label htmlFor={`${mode}-flight`}>Use a saved flight</label>
              <select
                id={`${mode}-flight`}
                value={flightId}
                onChange={(event) => selectFlight(event.target.value)}
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
              <label htmlFor={`${mode}-airports`}>Airports</label>
              <input
                id={`${mode}-airports`}
                value={airportInput}
                onChange={(event) => {
                  setAirportInput(event.target.value.toUpperCase());
                  setFlightId("");
                }}
                placeholder="e.g. OPLA, OPIS"
                aria-describedby={`${mode}-airport-help`}
              />
            </div>
            <button
              className="button secondary briefing-load"
              type={mode === "weather" ? "submit" : "button"}
              onClick={mode === "notams" ? refreshNotams : undefined}
              disabled={loading || (mode === "notams" && !online)}
            >
              <Icon name="refresh" />{" "}
              {loading
                ? "Loading…"
                : mode === "weather"
                  ? "Get weather"
                  : "Live feed status"}
            </button>
          </div>
          <p className="muted field-help" id={`${mode}-airport-help`}>
            {mode === "weather"
              ? "Enter four-letter airport codes. METAR observations and TAF forecasts are requested from NOAA Aviation Weather Center."
              : "A saved flight includes departure, destination, alternate and four-letter airport codes in its route. Leave blank to show every saved notice."}
          </p>
        </form>
      </section>

      {!online && (
        <div className="briefing-advisory" role="status">
          <Icon name="info" />
          <p>
            You are offline. Previously loaded information may be available from
            your browser cache. Check the saved time; conditions and notices can
            change.
          </p>
        </div>
      )}

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
          {!weather && !loading && (
            <section className="card empty-state briefing-empty">
              <Icon name="cloud" />
              <h2>Your weather, all together</h2>
              <p>
                Select a saved flight or enter airport codes to retrieve current
                METAR reports and available TAF forecasts.
              </p>
            </section>
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
                  <Icon name="clock" />
                  <p>
                    This briefing was saved over an hour ago. Request an updated
                    briefing and check each report’s observation time before
                    use.
                  </p>
                </div>
              )}
              {weather.errors?.length > 0 && (
                <div className="briefing-advisory" role="status">
                  <Icon name="info" />
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
                              <Icon name="cloud" />
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
                                <Icon name="wind" />
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
                                <Icon name="sun" />
                                <span>Temperature</span>
                                <strong>
                                  {metar.temp != null
                                    ? `${metar.temp} °C`
                                    : "—"}
                                </strong>
                              </div>
                              <div>
                                <Icon name="compass" />
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
          <div className="notam-overview">
            <div>
              <strong>{visibleNotams.length}</strong>
              <span>notices in this briefing</span>
            </div>
            <div>
              <strong>
                {visibleNotams.filter((item) => !item.reviewed).length}
              </strong>
              <span>to review</span>
            </div>
            <div>
              <Icon name="notam" />
              <span>Review source and validity before use</span>
            </div>
          </div>
          <div className="briefing-advisory">
            <Icon name="info" />
            <p>
              Live retrieval is not integrated in this version. Import notices
              from an official briefing service, such as{" "}
              <a
                href="https://notams.aim.faa.gov/notamSearch/"
                target="_blank"
                rel="noreferrer"
              >
                FAA NOTAM Search <span className="sr-only">in a new tab</span>
              </a>{" "}
              or your local AIS. Training examples are clearly marked.
            </p>
          </div>
          <div className="notam-toolbar">
            <div className="field notam-search">
              <label className="sr-only" htmlFor="notice-search">
                Search saved notices
              </label>
              <Icon name="search" />
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
            <button
              className="button secondary"
              onClick={() => openEditor(null, "Import an official notice")}
              disabled={!online}
            >
              <Icon name="download" /> Import notice
            </button>
          </div>
          <div className="notice-list">
            {visibleNotams.map((item) => (
              <article key={item._id} className="card notice-card">
                <div className="notice-top">
                  <div className="notice-identification">
                    <span className="notice-airport">{item.airport}</span>
                    <h2>{item.reference}</h2>
                    <span className="badge">{item.category || "General"}</span>
                    {new Date(item.endsAt).getTime() < Date.now() && (
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
                    <Icon name="clock" /> From {dateLabel(item.startsAt)}
                  </span>
                  <span>Until {dateLabel(item.endsAt)}</span>
                </div>
                <div className="notice-bottom">
                  <span
                    className={`badge ${item.source === "Training example" ? "amber" : "blue"}`}
                  >
                    {item.source || "Manual import"}
                  </span>
                  <div className="notice-actions">
                    <button
                      className="button ghost"
                      onClick={() => toggleReviewed(item)}
                      disabled={!online}
                    >
                      <Icon name="check" />{" "}
                      {item.reviewed ? "Mark unread" : "Mark reviewed"}
                    </button>
                    <button
                      className="button ghost"
                      onClick={() => openEditor(item, "Edit notice")}
                      disabled={!online}
                      aria-label={`Edit ${item.reference}`}
                    >
                      <Icon name="edit" /> Edit
                    </button>
                    <button
                      className="button ghost notice-delete"
                      onClick={() => {
                        setFormError("");
                        setDeleting(item);
                      }}
                      disabled={!online}
                      aria-label={`Delete ${item.reference}`}
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              </article>
            ))}
            {visibleNotams.length === 0 && (
              <section className="card empty-state briefing-empty">
                <Icon name="notam" />
                <h2>No matching notices</h2>
                <p>
                  Change your filters or import an official notice to start your
                  briefing.
                </p>
              </section>
            )}
          </div>
        </>
      )}

      {editor && (
        <Modal title={editor} onClose={() => setEditor("")}>
          <form onSubmit={saveNotice}>
            <p className="muted modal-intro">
              Copy the complete notice from its official source. Times below use
              UTC.
            </p>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="notice-airport">Airport ICAO</label>
                <input
                  id="notice-airport"
                  name="airport"
                  value={notice.airport}
                  onChange={changeNotice}
                  required
                  pattern="[A-Za-z]{4}"
                  maxLength="4"
                  placeholder="OPLA"
                />
              </div>
              <div className="field">
                <label htmlFor="notice-reference">Notice reference</label>
                <input
                  id="notice-reference"
                  name="reference"
                  value={notice.reference}
                  onChange={changeNotice}
                  required
                  maxLength="60"
                  placeholder="A0123/26"
                />
              </div>
              <div className="field">
                <label htmlFor="notice-start">Valid from (UTC)</label>
                <input
                  id="notice-start"
                  type="datetime-local"
                  name="startsAt"
                  value={notice.startsAt}
                  onChange={changeNotice}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="notice-end">Valid until (UTC)</label>
                <input
                  id="notice-end"
                  type="datetime-local"
                  name="endsAt"
                  value={notice.endsAt}
                  onChange={changeNotice}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="notice-category">Category</label>
                <select
                  id="notice-category"
                  name="category"
                  value={notice.category}
                  onChange={changeNotice}
                >
                  <option>General</option>
                  <option>Aerodrome</option>
                  <option>Runway</option>
                  <option>Airspace</option>
                  <option>Navigation</option>
                  <option>Other</option>
                  {![
                    "General",
                    "Aerodrome",
                    "Runway",
                    "Airspace",
                    "Navigation",
                    "Other",
                  ].includes(notice.category) && (
                    <option>{notice.category}</option>
                  )}
                </select>
              </div>
              <div className="field">
                <label htmlFor="notice-source">Source</label>
                <input
                  id="notice-source"
                  name="source"
                  value={notice.source}
                  onChange={changeNotice}
                  required
                  maxLength="160"
                />
              </div>
              <div className="field full-width">
                <label htmlFor="notice-text">Complete notice text</label>
                <textarea
                  id="notice-text"
                  name="text"
                  value={notice.text}
                  onChange={changeNotice}
                  rows="6"
                  required
                  maxLength="8000"
                  placeholder="Paste the complete NOTAM here…"
                />
              </div>
            </div>
            <label className="tool-checkbox">
              <input
                type="checkbox"
                name="reviewed"
                checked={notice.reviewed}
                onChange={changeNotice}
              />{" "}
              I have reviewed this notice
            </label>
            {formError && (
              <p className="tool-error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                onClick={() => setEditor("")}
              >
                Cancel
              </button>
              <button className="button" disabled={saving || !online}>
                {saving ? "Saving…" : "Save notice"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal title="Remove this notice?" onClose={() => setDeleting(null)}>
          <p>
            This will remove {deleting.reference} at {deleting.airport} from
            your saved briefing.
          </p>
          {formError && (
            <p className="tool-error" role="alert">
              {formError}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              onClick={() => setDeleting(null)}
            >
              Keep notice
            </button>
            <button
              className="button"
              onClick={deleteNotice}
              disabled={saving || !online}
            >
              {saving ? "Removing…" : "Remove notice"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
