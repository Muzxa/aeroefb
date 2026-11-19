import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import {
  AirplaneIcon,
  AirplaneTiltIcon,
  ArrowRightIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  CaretRightIcon,
  ClockIcon,
  CloudIcon,
  MapTrifoldIcon,
  PathIcon,
  WindIcon,
} from "@phosphor-icons/react";

const airportNames = {
  OPLA: "Lahore",
  OPIS: "Islamabad",
  OPKC: "Karachi",
  OPPS: "Peshawar",
  OPFA: "Faisalabad",
  OPMT: "Multan",
  OPQT: "Quetta",
};
const tasks = [
  [
    "Aircraft & documents",
    "Review aircraft information",
    "/aircraft",
  ],
  ["Weather briefing", "Check current observations", "/weather"],
  ["NOTAM briefing", "Review airport notices", "/notams"],
  ["Weight & balance", "Calculate your loading", "/balance"],
  ["Fuel & route", "Review your flight plan", "/flights"],
];

export default function Dashboard({
  user,
  aircraft,
  flights,
  logbook,
  refresh,
  notify,
  online,
}) {
  const [weather, setWeather] = useState(null);
  const [weatherError, setWeatherError] = useState("");
  const [saving, setSaving] = useState(false);
  const next = flights
    .filter((f) => f.status === "Planned")
    .sort((a, b) =>
      `${a.date}${a.departureTime}`.localeCompare(
        `${b.date}${b.departureTime}`,
      ),
    )[0];
  const ids = next
    ? `${next.departure},${next.destination}`
    : user.homeAirport || "OPLA";
  useEffect(() => {
    let active = true;
    setWeather(null);
    setWeatherError("");
    api(`/weather?ids=${encodeURIComponent(ids)}`)
      .then((data) => {
        if (active) setWeather(data);
      })
      .catch((error) => {
        if (active) setWeatherError(error.message);
      });
    return () => {
      active = false;
    };
  }, [ids]);
  const total = logbook.reduce(
    (sum, entry) => sum + Number(entry.totalTime || 0),
    0,
  );
  const completed = next?.checklist?.filter(Boolean).length || 0;

  async function toggleTask(index) {
    if (saving) return;
    const checklist = [0, 1, 2, 3, 4].map((i) => Boolean(next.checklist?.[i]));
    checklist[index] = !checklist[index];
    setSaving(true);
    try {
      await api(`/flights/${next._id}`, {
        method: "PUT",
        body: { checklist },
      });
      await refresh();
    } catch (error) {
      notify(error.message, "error");
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <div className="page-heading dashboard-heading">
        <div>
          <h1>
            Your flight deck<span className="heading-dot">.</span>
          </h1>
          <p className="page-intro">
            Good to see you, {user.name.split(" ")[0]}.
          </p>
        </div>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <PathIcon />
          </span>
          <span className="stat-label">Planned flights</span>
          <strong>
            {flights
              .filter((f) => f.status === "Planned")
              .length.toString()
              .padStart(2, "0")}
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <ClockIcon />
          </span>
          <span className="stat-label">Total flight time</span>
          <strong>
            {total.toFixed(1)}
            <small> hrs</small>
          </strong>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <AirplaneIcon />
          </span>
          <span className="stat-label">Your aircraft</span>
          <strong>{aircraft.length.toString().padStart(2, "0")}</strong>
        </div>
        <div className="stat-card home-stat">
          <span className="stat-icon">
            <MapTrifoldIcon />
          </span>
          <span className="stat-label">Home airport</span>
          <strong>{user.homeAirport || "—"}</strong>
        </div>
      </div>
      <div className="flight-dashboard-grid">
        <section
          className="card next-flight-card"
          aria-labelledby="next-flight-title"
        >
          <div className="section-heading">
            <h2 id="next-flight-title">
              <AirplaneTiltIcon /> Current Flight
            </h2>
            {next && <span className="badge blue">{next.flightRules}</span>}
          </div>
          {next ? (
            <>
              <div className="flight-overview-details">
                <div className="route-airports">
                  <div>
                    <span className="eyebrow">DEPARTURE</span>
                    <strong>{next.departure}</strong>
                    <span>
                      {airportNames[next.departure] || "Departure airport"}
                    </span>
                  </div>
                  <ArrowRightIcon size={26} />
                  <div>
                    <span className="eyebrow">DESTINATION</span>
                    <strong>{next.destination}</strong>
                    <span>
                      {airportNames[next.destination] ||
                        "Destination airport"}
                    </span>
                  </div>
                </div>
                <div className="flight-meta">
                  <span>
                    <CalendarBlankIcon size={16} />
                    {new Date(`${next.date}T00:00:00`).toLocaleDateString(
                      "en-GB",
                      { day: "numeric", month: "short", year: "numeric" },
                    )}
                  </span>
                  <span>
                    <ClockIcon size={16} />
                    {next.departureTime} UTC
                  </span>
                </div>
                <div className="flight-numbers">
                  <div>
                    <span>Aircraft</span>
                    <strong>{next.aircraftRegistration}</strong>
                  </div>
                  <div>
                    <span>Altitude</span>
                    <strong>
                      {Number(next.altitude).toLocaleString()}{" "}
                      <small>ft</small>
                    </strong>
                  </div>
                  <div>
                    <span>Est. duration</span>
                    <strong>
                      {Number(next.duration).toFixed(1)} <small>hrs</small>
                    </strong>
                  </div>
                </div>
              </div>
              <div className="flight-card-footer">
                <Link to={`/flights?edit=${next._id}`} className="text-link">
                  View flight plan <ArrowRightIcon size={17} />
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <PathIcon size={40} />
              <h3>No active flight</h3>
              <p>
                {aircraft.length
                  ? "Create your first flight plan."
                  : "Add an aircraft, then create your first flight plan."}
              </p>
              <Link
                className="button secondary"
                to={aircraft.length ? "/flights?new=1" : "/aircraft"}
              >
                {aircraft.length ? "Plan a flight" : "Add an aircraft"}
                <ArrowRightIcon size={17} />
              </Link>
            </div>
          )}
        </section>
        <section
          className="card checklist-card"
          aria-labelledby="checklist-title"
        >
          <div className="section-heading">
            <h2 id="checklist-title">Pre-flight checklist</h2>
            <span className="checklist-count">
              {completed}
              <span>/5</span>
            </span>
          </div>
          <div
            className="checklist-progress"
            role="progressbar"
            aria-label="Pre-flight review progress"
            aria-valuenow={completed}
            aria-valuemin="0"
            aria-valuemax="5"
          >
            <span style={{ width: `${completed * 20}%` }} />
          </div>
          <div className="checklist-items">
            {tasks.map(([title, subtitle, url], index) => (
              <div className="checklist-item" key={title}>
                <input
                  type="checkbox"
                  id={`check-${index}`}
                  checked={Boolean(next?.checklist?.[index])}
                  disabled={!next || !online || saving}
                  onChange={() => toggleTask(index)}
                  aria-label={`Mark ${title} reviewed`}
                />
                <div>
                  <label htmlFor={`check-${index}`}>{title}</label>
                  <span>{subtitle}</span>
                </div>
                <Link
                  to={url}
                  className="icon-button"
                  aria-label={`Open ${title}`}
                >
                  <CaretRightIcon size={16} />
                </Link>
              </div>
            ))}
          </div>
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section className="card weather-preview">
          <div className="section-heading">
            <h2>
              <CloudIcon /> Airport weather
            </h2>
            <Link className="text-link" to="/weather">
              Full briefing <ArrowRightIcon size={17} />
            </Link>
          </div>
          <div className="weather-stations">
            {ids.split(",").map((id) => {
              const metar = weather?.metars?.find((m) => m.icaoId === id);
              const unavailable =
                weatherError || weather?.availability?.metars === "unavailable";
              return (
                <div className="weather-station" key={id}>
                  <div className="station-heading">
                    <div>
                      <strong>{id}</strong>
                      <span>{airportNames[id] || "Airport"}</span>
                    </div>
                    <span className={`badge ${metar ? "green" : ""}`}>
                      {metar
                        ? "METAR"
                        : unavailable
                          ? "Unavailable"
                          : weather
                            ? "No report"
                            : "Loading"}
                    </span>
                  </div>
                  {metar ? (
                    <>
                      <div className="station-temperature">
                        <CloudIcon size={33} />
                        <strong>
                          {metar.temp ?? "—"}
                          <small> °C</small>
                        </strong>
                      </div>
                      <div className="weather-details">
                        <span>
                          <WindIcon size={16} />
                          {metar.wdir === "VRB"
                            ? "VRB"
                            : `${metar.wdir ?? "—"}°`}{" "}
                          / {metar.wspd ?? "—"} kt
                        </span>
                        <span>Vis. {metar.visib ?? "—"} SM</span>
                      </div>
                      <small className="muted">
                        Observed{" "}
                        {new Date(
                          metar.reportTime || Number(metar.obsTime) * 1000,
                        ).toLocaleTimeString("en-GB", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "UTC",
                        })}{" "}
                        UTC
                      </small>
                    </>
                  ) : (
                    <p className="weather-unavailable">
                      {unavailable
                        ? "Live METAR service unavailable."
                        : weather
                          ? "No recent METAR reported."
                          : "Loading latest observation…"}
                      <Link to="/weather">Open briefing</Link>
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          <div className="panel-footnote">
            Source:{" "}
            <a
              href="https://aviationweather.gov/"
              target="_blank"
              rel="noreferrer"
            >
              Aviation Weather Center
            </a>
            {weather?.cached && <strong> · Saved briefing</strong>}
          </div>
        </section>
        <section className="card recent-flights">
          <div className="section-heading">
            <h2>
              <BookOpenTextIcon /> Recent logbook
            </h2>
            <Link className="text-link" to="/logbook">
              View logbook <ArrowRightIcon size={17} />
            </Link>
          </div>
          {logbook.length ? (
            <div className="recent-list">
              {[...logbook]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 3)
                .map((entry) => (
                  <Link to="/logbook" className="recent-row" key={entry._id}>
                    <span className="recent-plane">
                      <AirplaneTiltIcon size={20} />
                    </span>
                    <div>
                      <strong>
                        {entry.departure}
                        <ArrowRightIcon className="route-separator" size={14} />
                        {entry.destination}
                      </strong>
                      <span>
                        {entry.aircraftRegistration}{" "}
                        <span aria-hidden="true">·</span>{" "}
                        {new Date(`${entry.date}T00:00:00`).toLocaleDateString(
                          "en-GB",
                          { day: "numeric", month: "short" },
                        )}
                      </span>
                    </div>
                    <strong className="recent-hours">
                      {Number(entry.totalTime).toFixed(1)}
                      <small> hrs</small>
                    </strong>
                    <CaretRightIcon size={16} />
                  </Link>
                ))}
            </div>
          ) : (
            <div className="empty-state small">
              <p>No flights logged yet.</p>
              <Link to="/logbook" className="text-link">
                Add your first entry <ArrowRightIcon size={16} />
              </Link>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
