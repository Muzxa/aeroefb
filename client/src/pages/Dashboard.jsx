import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import Icon from "../components/Icon";
import RouteMap from "../components/RouteMap";

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
    "aircraft",
    "Aircraft & documents",
    "Review aircraft information",
    "/aircraft",
  ],
  ["cloud", "Weather briefing", "Check current observations", "/weather"],
  ["notam", "NOTAM briefing", "Review airport notices", "/notams"],
  ["balance", "Weight & balance", "Calculate your loading", "/balance"],
  ["compass", "Fuel & route", "Review your flight plan", "/flights"],
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
        body: { ...next, checklist },
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
          <p className="eyebrow">A LITTLE PREPARATION. A BETTER FLIGHT.</p>
          <h1>
            Your flight deck<span className="heading-dot">.</span>
          </h1>
          <p className="page-intro">
            Good to see you, {user.name.split(" ")[0]}. Let’s get your next
            flight in order.
          </p>
        </div>
        <Link className="button" to="/flights?new=1">
          <Icon name="plus" size={19} /> New flight plan
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="route" />
          </span>
          <span className="stat-label">Planned flights</span>
          <strong>
            {flights
              .filter((f) => f.status === "Planned")
              .length.toString()
              .padStart(2, "0")}
          </strong>
          <span className="stat-detail">Your upcoming journeys</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="clock" />
          </span>
          <span className="stat-label">Total flight time</span>
          <strong>
            {total.toFixed(1)}
            <small> hrs</small>
          </strong>
          <span className="stat-detail">Recorded in your logbook</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            <Icon name="aircraft" />
          </span>
          <span className="stat-label">Your aircraft</span>
          <strong>{aircraft.length.toString().padStart(2, "0")}</strong>
          <span className="stat-detail">Profiles in your hangar</span>
        </div>
        <div className="stat-card home-stat">
          <span className="stat-icon">
            <Icon name="map" />
          </span>
          <span className="stat-label">Home airport</span>
          <strong>{user.homeAirport || "—"}</strong>
          <span className="stat-detail">
            {airportNames[user.homeAirport] || "Set in your pilot profile"}
          </span>
        </div>
      </div>
      <div className="flight-dashboard-grid">
        <section
          className="card next-flight-card"
          aria-labelledby="next-flight-title"
        >
          <div className="section-heading">
            <h2 id="next-flight-title">
              <Icon name="plane" /> Your next flight
            </h2>
            <span className="badge blue">
              {next ? next.flightRules : "Flight planning"}
            </span>
          </div>
          {next ? (
            <>
              <div className="flight-overview">
                <div className="flight-overview-details">
                  <div className="route-airports">
                    <div>
                      <span className="eyebrow">DEPARTURE</span>
                      <strong>{next.departure}</strong>
                      <span>
                        {airportNames[next.departure] || "Departure airport"}
                      </span>
                    </div>
                    <Icon name="arrow" size={26} />
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
                      <Icon name="calendar" size={16} />
                      {new Date(`${next.date}T00:00:00`).toLocaleDateString(
                        "en-GB",
                        { day: "numeric", month: "short", year: "numeric" },
                      )}
                    </span>
                    <span>
                      <Icon name="clock" size={16} />
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
                <RouteMap
                  departure={next.departure}
                  destination={next.destination}
                />
              </div>
              <div className="flight-card-footer">
                <span>
                  <span className="status-dot" /> Plan saved{" "}
                  <span className="muted">· Review before flight</span>
                </span>
                <Link to={`/flights?edit=${next._id}`} className="text-link">
                  View flight plan <Icon name="arrow" size={17} />
                </Link>
              </div>
            </>
          ) : (
            <div className="empty-state">
              <Icon name="route" size={40} />
              <h3>Your next adventure starts here.</h3>
              <p>Add an aircraft, then create your first flight plan.</p>
              <Link
                className="button secondary"
                to={aircraft.length ? "/flights?new=1" : "/aircraft"}
              >
                {aircraft.length ? "Plan a flight" : "Add an aircraft"}
                <Icon name="arrow" size={17} />
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
          <p className="muted checklist-intro">
            A few checks before you take off.
          </p>
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
            {tasks.map(([icon, title, subtitle, url], index) => (
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
                  <Icon name="chevron" size={16} />
                </Link>
              </div>
            ))}
          </div>
          <p className="checklist-note">
            <Icon name="info" size={14} /> Personal review list; not an
            airworthiness check.
          </p>
        </section>
      </div>
      <div className="dashboard-bottom-grid">
        <section className="card weather-preview">
          <div className="section-heading">
            <h2>
              <Icon name="cloud" /> Airport weather
            </h2>
            <Link className="text-link" to="/weather">
              Full briefing <Icon name="arrow" size={17} />
            </Link>
          </div>
          <p className="panel-description">
            Latest available airport observations.
          </p>
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
                        <Icon name="cloud" size={33} />
                        <strong>
                          {metar.temp ?? "—"}
                          <small> °C</small>
                        </strong>
                      </div>
                      <div className="weather-details">
                        <span>
                          <Icon name="wind" size={16} />
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
              <Icon name="book" /> Recent logbook
            </h2>
            <Link className="text-link" to="/logbook">
              View logbook <Icon name="arrow" size={17} />
            </Link>
          </div>
          <p className="panel-description">
            A record of the places you’ve been.
          </p>
          {logbook.length ? (
            <div className="recent-list">
              {[...logbook]
                .sort((a, b) => b.date.localeCompare(a.date))
                .slice(0, 3)
                .map((entry) => (
                  <Link to="/logbook" className="recent-row" key={entry._id}>
                    <span className="recent-plane">
                      <Icon name="plane" size={20} />
                    </span>
                    <div>
                      <strong>
                        {entry.departure}
                        <span className="route-separator">→</span>
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
                    <Icon name="chevron" size={16} />
                  </Link>
                ))}
            </div>
          ) : (
            <div className="empty-state small">
              <p>No flights logged yet.</p>
              <Link to="/logbook" className="text-link">
                Add your first entry <Icon name="arrow" size={16} />
              </Link>
            </div>
          )}
          <div className="dashboard-logbook-note">
            <Icon name="compass" size={17} />
            <span>Every flight tells a story. Keep yours.</span>
          </div>
        </section>
      </div>
      <div className="workspace-note">
        <Icon name="shield" size={17} />
        <span>
          Built for preparation. This student project is not an approved source
          for operational flight decisions.
        </span>
        <span className="workspace-note-brand">AeroEFB / 01</span>
      </div>
    </>
  );
}
