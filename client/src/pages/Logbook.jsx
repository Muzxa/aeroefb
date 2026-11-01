import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import "./records.css";

const timeFields = ["totalTime", "pic", "sic", "ifr", "night"];

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function csvCell(value) {
  let text = String(value ?? "");
  if (/^\s*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export default function Logbook({
  logbook = [],
  flights = [],
  aircraft = [],
  refresh,
  notify,
  online,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [year, setYear] = useState("All years");
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [pageMessage, setPageMessage] = useState("");
  const [expanded, setExpanded] = useState(null);

  function openForm(entry, flight) {
    const selected = aircraft.find((item) => item._id === flight?.aircraftId);
    setError("");
    setForm(
      entry
        ? { ...entry }
        : {
            date: flight?.date || new Date().toLocaleDateString("en-CA"),
            departure: flight?.departure || "",
            destination: flight?.destination || "",
            aircraftRegistration: flight?.aircraftRegistration || "",
            aircraftType: selected?.model || "",
            totalTime: flight?.duration || 1,
            pic: flight?.duration || 1,
            sic: 0,
            ifr: 0,
            night: 0,
            approaches: 0,
            landings: 1,
            notes: "",
            flightId: flight?._id || null,
          },
    );
  }

  useEffect(() => {
    const id = searchParams.get("flight");
    if (!id) return;
    const flight = flights.find((item) => item._id === id);
    if (!flight) return;
    const entry = logbook.find((item) => item.flightId === id);
    if (entry) {
      openForm(entry);
      setPageMessage(
        "This flight is already logged. You can update its existing entry.",
      );
    } else {
      openForm(null, flight);
    }
    setSearchParams({}, { replace: true });
  }, [searchParams, flights, logbook, aircraft]);

  const years = [...new Set(logbook.map((entry) => entry.date.slice(0, 4)))]
    .sort()
    .reverse();
  const visibleEntries = logbook
    .filter((entry) => {
      const matches =
        `${entry.departure} ${entry.destination} ${entry.aircraftRegistration} ${entry.aircraftType} ${entry.notes}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matches && (year === "All years" || entry.date.startsWith(year));
    })
    .sort((a, b) => b.date.localeCompare(a.date));

  const expandedEntry = logbook.find((entry) => entry._id === expanded);
  const totals = {
    totalTime: 0,
    pic: 0,
    sic: 0,
    ifr: 0,
    night: 0,
    approaches: 0,
    landings: 0,
  };
  logbook.forEach((entry) => {
    Object.keys(totals).forEach((key) => {
      totals[key] += Number(entry[key]) || 0;
    });
  });

  function change(event) {
    const { name, value } = event.target;
    setForm({
      ...form,
      [name]: ["departure", "destination", "aircraftRegistration"].includes(
        name,
      )
        ? value.toUpperCase()
        : value,
    });
  }

  function chooseAircraft(event) {
    const selected = aircraft.find((item) => item._id === event.target.value);
    if (selected)
      setForm({
        ...form,
        aircraftRegistration: selected.registration,
        aircraftType: selected.model,
      });
  }

  async function save(event) {
    event.preventDefault();
    if (!online || saving) return;
    setError("");
    const values = { ...form };
    [...timeFields, "approaches", "landings"].forEach((key) => {
      values[key] = Number(values[key]);
    });
    if (values.pic + values.sic > values.totalTime + 0.0001) {
      setError("PIC and SIC time together cannot exceed total flight time.");
      return;
    }
    if (values.ifr > values.totalTime || values.night > values.totalTime) {
      setError(
        "IFR and night time must each be no greater than total flight time.",
      );
      return;
    }
    setSaving(true);
    try {
      await api(form._id ? `/logbook/${form._id}` : "/logbook", {
        method: form._id ? "PUT" : "POST",
        body: values,
      });
      let message = form._id
        ? "Logbook entry updated."
        : "Flight added to your logbook.";
      let warning = false;
      const linkedFlight = flights.find((item) => item._id === form.flightId);
      if (!form._id && linkedFlight && linkedFlight.status !== "Completed") {
        try {
          await api(`/flights/${linkedFlight._id}`, {
            method: "PUT",
            body: { ...linkedFlight, status: "Completed" },
          });
        } catch (err) {
          message = `Entry saved. The flight status could not be updated: ${err.message}`;
          warning = true;
        }
      }
      setForm(null);
      try {
        await refresh();
      } catch (err) {
        message += ` The list could not refresh: ${err.message}`;
        warning = true;
      }
      notify(message, warning ? "error" : "success");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!online || saving) return;
    setSaving(true);
    setError("");
    try {
      await api(`/logbook/${deleting._id}`, { method: "DELETE" });
      setDeleting(null);
      try {
        await refresh();
        notify("Logbook entry deleted.");
      } catch (err) {
        notify(
          `Logbook entry deleted. The list could not refresh: ${err.message}`,
          "error",
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function exportCsv() {
    const columns = [
      "Date",
      "Departure",
      "Destination",
      "Registration",
      "Aircraft type",
      "Total hours",
      "PIC hours",
      "SIC hours",
      "IFR hours",
      "Night hours",
      "Approaches",
      "Landings",
      "Notes",
    ];
    const rows = visibleEntries.map((entry) => [
      entry.date,
      entry.departure,
      entry.destination,
      entry.aircraftRegistration,
      entry.aircraftType,
      entry.totalTime,
      entry.pic,
      entry.sic,
      entry.ifr,
      entry.night,
      entry.approaches,
      entry.landings,
      entry.notes,
    ]);
    const csv = [columns, ...rows]
      .map((row) => row.map(csvCell).join(","))
      .join("\r\n");
    const url = URL.createObjectURL(
      new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "aeroefb-logbook.csv";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    notify(
      `${visibleEntries.length} logbook ${visibleEntries.length === 1 ? "entry" : "entries"} exported.`,
    );
  }

  function timeInput(name, label, min = 0) {
    return (
      <div className="field" key={name}>
        <label htmlFor={`log-${name}`}>{label}</label>
        <input
          id={`log-${name}`}
          name={name}
          type="number"
          min={min}
          max="48"
          step="any"
          value={form[name]}
          onChange={change}
          required
        />
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">EVERY FLIGHT COUNTS</p>
          <h1>Pilot logbook</h1>
          <p className="page-intro">Your experience, one flight at a time.</p>
        </div>
        <div className="record-heading-actions">
          <button
            className="button secondary"
            onClick={exportCsv}
            disabled={visibleEntries.length === 0}
          >
            <Icon name="download" /> Export CSV
          </button>
          <button
            className="button"
            disabled={!online}
            onClick={() => openForm()}
          >
            <Icon name="plus" /> Add flight
          </button>
        </div>
      </div>
      {!online && (
        <p className="record-notice" role="status">
          <Icon name="info" /> Your saved logbook is available offline,
          including CSV export. Reconnect to make changes.
        </p>
      )}
      {pageMessage && (
        <p className="record-notice" role="status">
          <Icon name="info" /> {pageMessage}
          <button
            className="icon-button"
            aria-label="Dismiss logbook notice"
            onClick={() => setPageMessage("")}
          >
            <Icon name="close" />
          </button>
        </p>
      )}
      <div className="logbook-totals">
        <div className="card logbook-total">
          <span className="logbook-total-icon">
            <Icon name="clock" />
          </span>
          <p>Total flight time</p>
          <strong>
            {totals.totalTime.toFixed(1)} <span>h</span>
          </strong>
          <span className="muted">{logbook.length} flights recorded</span>
        </div>
        <div className="card logbook-total">
          <span className="logbook-total-icon">
            <Icon name="user" />
          </span>
          <p>Pilot in command</p>
          <strong>
            {totals.pic.toFixed(1)} <span>h</span>
          </strong>
          <span className="muted">
            {totals.sic.toFixed(1)} h second in command
          </span>
        </div>
        <div className="card logbook-total">
          <span className="logbook-total-icon">
            <Icon name="compass" />
          </span>
          <p>Instrument time</p>
          <strong>
            {totals.ifr.toFixed(1)} <span>h</span>
          </strong>
          <span className="muted">{totals.approaches} approaches</span>
        </div>
        <div className="card logbook-total">
          <span className="logbook-total-icon">
            <Icon name="plane" />
          </span>
          <p>Landings</p>
          <strong>{totals.landings}</strong>
          <span className="muted">{totals.night.toFixed(1)} h night time</span>
        </div>
      </div>
      <section
        className="card logbook-records"
        aria-labelledby="logbook-records-heading"
      >
        <div className="section-heading">
          <div>
            <h2 id="logbook-records-heading">Flight history</h2>
            <p className="muted">Times shown in decimal hours.</p>
          </div>
          <span className="badge">
            {visibleEntries.length}{" "}
            {visibleEntries.length === 1 ? "entry" : "entries"}
          </span>
        </div>
        <div className="record-toolbar">
          <div className="record-search">
            <Icon name="search" />
            <label className="record-sr-only" htmlFor="logbook-search">
              Search logbook
            </label>
            <input
              id="logbook-search"
              type="search"
              placeholder="Search route, aircraft or notes"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
          <div className="record-filter">
            <label htmlFor="logbook-year">Year</label>
            <select
              id="logbook-year"
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option>All years</option>
              {years.map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </div>
        </div>
        {visibleEntries.length === 0 ? (
          <div className="empty-state">
            <Icon name="book" />
            <h2>
              {search || year !== "All years"
                ? "No matching flights"
                : "A new chapter starts here"}
            </h2>
            <p>
              {search || year !== "All years"
                ? "Try another search or select all years."
                : "Log a completed flight to start tracking your flying experience."}
            </p>
            {!search && year === "All years" && (
              <button
                className="button"
                disabled={!online}
                onClick={() => openForm()}
              >
                <Icon name="plus" /> Add your first flight
              </button>
            )}
          </div>
        ) : (
          <>
            <div
              className="table-wrap"
              tabIndex="0"
              role="region"
              aria-label="Flight history table. Scroll horizontally to see all columns."
            >
              <table className="data-table logbook-table">
                <caption className="record-sr-only">
                  Saved flights with total, PIC, SIC, IFR and night hours,
                  approaches and landings
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Date</th>
                    <th scope="col">Route / aircraft</th>
                    <th scope="col">Total</th>
                    <th scope="col">PIC</th>
                    <th scope="col">SIC</th>
                    <th scope="col">IFR</th>
                    <th scope="col">Night</th>
                    <th scope="col">App.</th>
                    <th scope="col">Ldg.</th>
                    <th scope="col">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((entry) => (
                    <tr key={entry._id}>
                      <td className="logbook-date">{dateLabel(entry.date)}</td>
                      <td>
                        <strong className="logbook-route">
                          {entry.departure} <span aria-label="to">→</span>{" "}
                          {entry.destination}
                        </strong>
                        <span className="logbook-aircraft">
                          {entry.aircraftRegistration} · {entry.aircraftType}
                        </span>
                      </td>
                      {timeFields.map((field) => (
                        <td
                          className={
                            field === "totalTime" ? "logbook-time-total" : ""
                          }
                          key={field}
                        >
                          {Number(entry[field] || 0).toFixed(1)}
                        </td>
                      ))}
                      <td>{entry.approaches}</td>
                      <td>{entry.landings}</td>
                      <td>
                        <div className="logbook-row-actions">
                          <button
                            className="icon-button"
                            aria-label={`View details for flight on ${dateLabel(entry.date)} from ${entry.departure}`}
                            aria-haspopup="dialog"
                            onClick={() => setExpanded(entry._id)}
                          >
                            <Icon name="info" />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Edit flight on ${dateLabel(entry.date)} from ${entry.departure}`}
                            disabled={!online}
                            onClick={() => openForm(entry)}
                          >
                            <Icon name="edit" />
                          </button>
                          <button
                            className="icon-button"
                            aria-label={`Delete flight on ${dateLabel(entry.date)} from ${entry.departure}`}
                            disabled={!online}
                            onClick={() => {
                              setError("");
                              setDeleting(entry);
                            }}
                          >
                            <Icon name="trash" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row" colSpan="2">
                      All-time totals
                    </th>
                    {timeFields.map((field) => (
                      <td key={field}>{totals[field].toFixed(1)}</td>
                    ))}
                    <td>{totals.approaches}</td>
                    <td>{totals.landings}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            {(search || year !== "All years") && (
              <p className="record-table-note muted">
                Showing {visibleEntries.length} of {logbook.length} entries. The
                totals above and below the table include your full logbook.
              </p>
            )}
          </>
        )}
        {expandedEntry && (
          <Modal
            title={`Flight notes · ${expandedEntry.departure} → ${expandedEntry.destination}`}
            onClose={() => setExpanded(null)}
          >
            <p className="muted">
              {dateLabel(expandedEntry.date)} ·{" "}
              {expandedEntry.aircraftRegistration} ·{" "}
              {expandedEntry.aircraftType}
            </p>
            <p className="record-notes">
              {expandedEntry.notes || "No notes recorded for this flight."}
            </p>
            <div className="form-actions">
              <button
                className="button secondary"
                onClick={() => setExpanded(null)}
              >
                Close notes
              </button>
            </div>
          </Modal>
        )}
      </section>

      {form && (
        <Modal
          title={form._id ? "Edit logbook entry" : "Log a flight"}
          onClose={() => {
            if (!saving) setForm(null);
          }}
        >
          <form onSubmit={save} className="record-form" aria-busy={saving}>
            {form.flightId && !form._id && (
              <p className="record-notice">
                <Icon name="info" /> Details are filled from your plan. Confirm
                actual times before saving. This will mark the flight complete.
              </p>
            )}
            {error && (
              <p className="record-error" role="alert">
                {error}
              </p>
            )}
            <fieldset disabled={saving || !online}>
              <legend>Flight details</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="log-date">Flight date</label>
                  <input
                    id="log-date"
                    name="date"
                    type="date"
                    value={form.date}
                    onChange={change}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="log-saved-aircraft">
                    Fill from saved aircraft
                  </label>
                  <select
                    id="log-saved-aircraft"
                    value=""
                    onChange={chooseAircraft}
                  >
                    <option value="">Select aircraft (optional)</option>
                    {aircraft.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.registration} · {item.model}
                      </option>
                    ))}
                  </select>
                </div>
                {["departure", "destination"].map((name) => (
                  <div className="field" key={name}>
                    <label htmlFor={`log-${name}`}>
                      {name === "departure"
                        ? "Departure ICAO"
                        : "Destination ICAO"}
                    </label>
                    <input
                      id={`log-${name}`}
                      name={name}
                      required
                      pattern="[A-Z]{4}"
                      title="Enter a four-letter ICAO airport code"
                      maxLength={4}
                      value={form[name]}
                      onChange={change}
                      placeholder={name === "departure" ? "OPLA" : "OPIS"}
                      autoCapitalize="characters"
                    />
                  </div>
                ))}
                <div className="field">
                  <label htmlFor="log-aircraftRegistration">
                    Aircraft registration
                  </label>
                  <input
                    id="log-aircraftRegistration"
                    name="aircraftRegistration"
                    required
                    maxLength={20}
                    value={form.aircraftRegistration}
                    onChange={change}
                    placeholder="AP-BEF"
                  />
                </div>
                <div className="field">
                  <label htmlFor="log-aircraftType">
                    Aircraft model / type
                  </label>
                  <input
                    id="log-aircraftType"
                    name="aircraftType"
                    required
                    maxLength={100}
                    value={form.aircraftType}
                    onChange={change}
                    placeholder="Cessna 172S"
                  />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Flight time</legend>
              <p className="muted record-field-help">
                Enter decimal hours: 1.5 hours = 1 hour 30 minutes. PIC + SIC
                cannot exceed total time.
              </p>
              <div className="form-grid">
                {timeInput("totalTime", "Total time (h)", 0.1)}
                {timeInput("pic", "Pilot in command (h)")}
                {timeInput("sic", "Second in command (h)")}
                {timeInput("ifr", "Instrument / IFR (h)")}
                {timeInput("night", "Night (h)")}
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Experience and notes</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="log-approaches">Instrument approaches</label>
                  <input
                    id="log-approaches"
                    name="approaches"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="1"
                    value={form.approaches}
                    onChange={change}
                  />
                </div>
                <div className="field">
                  <label htmlFor="log-landings">Landings</label>
                  <input
                    id="log-landings"
                    name="landings"
                    type="number"
                    required
                    min="0"
                    max="100"
                    step="1"
                    value={form.landings}
                    onChange={change}
                  />
                </div>
                <div className="field record-full">
                  <label htmlFor="log-notes">Flight notes (optional)</label>
                  <textarea
                    id="log-notes"
                    name="notes"
                    rows={3}
                    maxLength={4000}
                    value={form.notes}
                    onChange={change}
                    placeholder="Approaches flown, training, conditions or memorable moments"
                  />
                </div>
              </div>
            </fieldset>
            {!online && (
              <p className="record-error" role="status">
                Reconnect to save this logbook entry.
              </p>
            )}
            <div className="form-actions">
              <button
                type="button"
                className="button secondary"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="button" disabled={saving || !online}>
                {saving ? "Saving…" : "Save logbook entry"}
              </button>
            </div>
          </form>
        </Modal>
      )}
      {deleting && (
        <Modal
          title="Delete this logbook entry?"
          onClose={() => {
            if (!saving) setDeleting(null);
          }}
        >
          <p>
            The {deleting.departure} to {deleting.destination} entry on{" "}
            {dateLabel(deleting.date)} and its{" "}
            {Number(deleting.totalTime).toFixed(1)} flight hours will be removed
            from your logbook.
          </p>
          {error && (
            <p className="record-error" role="alert">
              {error}
            </p>
          )}
          <div className="form-actions">
            <button
              className="button secondary"
              disabled={saving}
              onClick={() => setDeleting(null)}
            >
              Keep entry
            </button>
            <button
              className="button record-danger"
              disabled={saving || !online}
              onClick={remove}
            >
              {saving ? "Deleting…" : "Delete entry"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
