import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { readFlightPlan } from "../flightPlan";
import {
  AirplaneTiltIcon,
  BookOpenTextIcon,
  CaretRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PathIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Modal from "../components/Modal";
import DeleteRecordDialog from "../components/DeleteRecordDialog";
import "./records.css";

const checklistLabels = [
  "Aircraft reviewed",
  "Weather reviewed",
  "NOTAMs reviewed",
  "Weight and balance checked",
  "Fuel checked",
];

function dateLabel(value) {
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function Flights({
  aircraft = [],
  flights = [],
  logbook = [],
  refreshAfterChange,
  online,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All flights");
  const [form, setForm] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState("");
  const importInput = useRef(null);

  function openForm(flight, importedDraft) {
    setError("");
    setImportError("");
    setForm(
      flight
        ? {
            ...flight,
            fuelUnit: flight.fuelUnit ?? "US gal",
            alternate: flight.alternate || "",
            checklist: [...flight.checklist],
          }
        : {
            departure: "",
            destination: "",
            alternate: "",
            route: "",
            date: new Date().toLocaleDateString("en-CA"),
            departureTime: "08:00",
            aircraftId: aircraft[0]?._id || "",
            aircraftRegistration: aircraft[0]?.registration || "",
            flightRules: "VFR",
            altitude: 6500,
            duration: 1,
            fuel: 20,
            fuelUnit: "US gal",
            status: "Planned",
            notes: "",
            checklist: [false, false, false, false, false],
            ...importedDraft,
          },
    );
  }

  async function importPlan(event) {
    const file = event.target.files[0];
    event.target.value = "";
    if (!file) return;
    setImportError("");
    setImporting(true);
    try {
      const plan = await readFlightPlan(file);
      const selected = aircraft.find((item) => item.registration === plan.aircraftRegistration);
      if (plan.aircraftRegistration && !selected) {
        setImportError(
          `No aircraft in your fleet has registration ${plan.aircraftRegistration}. Add it on the Aircraft page, then import the flight plan again.`,
        );
        return;
      }
      openForm(null, {
        date: "",
        departureTime: "",
        duration: "",
        fuel: "",
        ...plan,
        aircraftId: selected?._id || "",
        aircraftRegistration: selected?.registration || "",
      });
    } catch (err) {
      setImportError(err.message || "The .pln file could not be read.");
    } finally {
      setImporting(false);
    }
  }

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      openForm();
      setSearchParams({}, { replace: true });
    }
    const id = searchParams.get("edit");
    const flight = flights.find((item) => item._id === id);
    if (flight) {
      openForm(flight);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, flights]);

  const visibleFlights = flights
    .filter((flight) => {
      const matchesSearch =
        `${flight.departure} ${flight.destination} ${flight.route} ${flight.aircraftRegistration}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return (
        matchesSearch && (status === "All flights" || flight.status === status)
      );
    })
    .sort((a, b) =>
      `${b.date}${b.departureTime}`.localeCompare(
        `${a.date}${a.departureTime}`,
      ),
    );

  function change(event) {
    const { name, value } = event.target;
    if (name === "fuelUnit") {
      setForm({ ...form, fuelUnit: value, fuel: "", fuelDensityKgPerL: undefined });
      return;
    }
    if (name === "aircraftId") {
      const selected = aircraft.find((item) => item._id === value);
      setForm({
        ...form,
        aircraftId: value,
        aircraftRegistration: selected?.registration || "",
      });
      return;
    }

    const affectsRoute = ["departure", "destination", "route"].includes(name);
    const nextValue =
      affectsRoute || name === "alternate" ? value.toUpperCase() : value;
    setForm((current) => ({
      ...current,
      [name]: nextValue,
      ...(current.importedRoute && affectsRoute && current[name] !== nextValue
        ? { importedRoute: null }
        : {}),
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (!online || saving) return;
    setError("");
    if (form.departure === form.destination) {
      setError("Choose different departure and destination airports.");
      return;
    }
    setSaving(true);
    const values = {
      ...form,
      altitude: Number(form.altitude),
      duration: Number(form.duration),
      fuel: Number(form.fuel),
    };
    try {
      await api(form._id ? `/flights/${form._id}` : "/flights", {
        method: form._id ? "PUT" : "POST",
        body: values,
      });
      setForm(null);
      const message = form._id ? "Flight plan updated." : "Flight plan saved.";
      await refreshAfterChange(message);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Flight plans</h1>
        </div>
        <div className="record-heading-actions">
          <input
            ref={importInput}
            type="file"
            accept=".pln,.xml"
            aria-label="Flight plan file"
            hidden
            onChange={importPlan}
          />
          <button
            type="button"
            className="button secondary"
            onClick={() => importInput.current.click()}
            disabled={!online || importing}
          >
            {importing ? "Reading flight plan…" : "Import flight plan"}
          </button>
          <button
            type="button"
            className="button"
            onClick={() => openForm()}
            disabled={!online || importing}
          >
            <PlusIcon /> New flight
          </button>
        </div>
      </div>
      {importError && (
        <p className="record-error" role="alert">{importError}</p>
      )}
      <div className="record-toolbar">
        <div className="record-search">
          <MagnifyingGlassIcon />
          <label className="record-sr-only" htmlFor="flight-search">
            Search flight plans
          </label>
          <input
            id="flight-search"
            type="search"
            placeholder="Search airport, route or aircraft"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <div className="record-filter">
          <label htmlFor="flight-filter">Show</label>
          <select
            id="flight-filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option>All flights</option>
            <option>Planned</option>
            <option>Completed</option>
          </select>
        </div>
      </div>

      {visibleFlights.length === 0 ? (
        <div className="card empty-state">
          <PathIcon />
          <h2>
            {search || status !== "All flights"
              ? "No flights match these filters"
              : "No flight plans yet"}
          </h2>
          {(search || status !== "All flights") && (
            <p>Try another airport or choose all flights.</p>
          )}
          {!search && status === "All flights" && (
            <button
              className="button"
              onClick={() => openForm()}
              disabled={!online}
            >
              <PlusIcon /> Plan a flight
            </button>
          )}
        </div>
      ) : (
        <div className="flight-grid">
          {visibleFlights.map((flight) => {
            const completeCount = flight.checklist.filter(Boolean).length;
            const logged = logbook.some(
              (entry) => entry.flightId === flight._id,
            );
            return (
              <article className="card flight-card" key={flight._id}>
                <div className="flight-card-top">
                  <span
                    className={`badge ${flight.status === "Completed" ? "green" : "blue"}`}
                  >
                    {flight.status}
                  </span>
                  <span className="record-flight-rules">
                    {flight.flightRules} · {flight.aircraftRegistration}
                  </span>
                </div>
                <div className="flight-route">
                  <div>
                    <span className="muted">Departure</span>
                    <h2>{flight.departure}</h2>
                  </div>
                  <div className="flight-route-line" aria-hidden="true">
                    <span />
                    <AirplaneTiltIcon />
                    <span />
                  </div>
                  <div className="flight-destination">
                    <span className="muted">Destination</span>
                    <p>{flight.destination}</p>
                  </div>
                </div>
                <p className="flight-route-text">
                  {flight.route || "Direct routing"}
                  {flight.alternate && (
                    <span> · Alternate {flight.alternate}</span>
                  )}
                </p>
                <dl className="record-stats flight-stats">
                  <div>
                    <dt>Date</dt>
                    <dd>{dateLabel(flight.date)}</dd>
                  </div>
                  <div>
                    <dt>Departure</dt>
                    <dd>
                      {flight.departureTime} <span>UTC</span>
                    </dd>
                  </div>
                  <div>
                    <dt>Duration</dt>
                    <dd>
                      {Number(flight.duration).toFixed(1)} <span>h</span>
                    </dd>
                  </div>
                </dl>
                <div className="flight-check-progress">
                  <span>
                    <CheckIcon /> Preflight checklist
                  </span>
                  <strong>{completeCount} / 5</strong>
                </div>
                <div
                  className="flight-progress-track"
                  role="progressbar"
                  aria-label="Preflight checks completed"
                  aria-valuenow={completeCount}
                  aria-valuemin={0}
                  aria-valuemax={5}
                >
                  <span style={{ width: `${completeCount * 20}%` }} />
                </div>
                <button
                  className="record-detail-toggle"
                  aria-expanded={expanded === flight._id}
                  aria-controls={`flight-details-${flight._id}`}
                  onClick={() =>
                    setExpanded(expanded === flight._id ? null : flight._id)
                  }
                >
                  {expanded === flight._id
                    ? "Hide flight details"
                    : "View flight details"}
                  <CaretRightIcon />
                </button>
                {expanded === flight._id && (
                  <div
                    id={`flight-details-${flight._id}`}
                    className="flight-details"
                  >
                    <dl className="record-stats">
                      <div>
                        <dt>Planned altitude</dt>
                        <dd>{Number(flight.altitude).toLocaleString()} ft</dd>
                      </div>
                      <div>
                        <dt>Planned fuel</dt>
                        <dd>{flight.fuel} {flight.fuelUnit ?? "US gal"}</dd>
                      </div>
                    </dl>
                    <ul className="flight-checklist">
                      {checklistLabels.map((label, index) => (
                        <li key={label}>
                          <span
                            className={`record-check ${flight.checklist[index] ? "is-checked" : ""}`}
                            aria-hidden="true"
                          >
                            {flight.checklist[index] && <CheckIcon />}
                          </span>
                          <span>
                            {label}
                            <span className="record-sr-only">
                              :{" "}
                              {flight.checklist[index]
                                ? "complete"
                                : "not complete"}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                    {flight.notes && (
                      <p className="record-notes">{flight.notes}</p>
                    )}
                  </div>
                )}
                <div className="record-card-actions">
                  <button
                    className="button secondary"
                    onClick={() => openForm(flight)}
                    disabled={!online}
                  >
                    <PencilSimpleIcon /> Edit plan
                  </button>
                  {!logged && online && (
                    <Link
                      className="button ghost"
                      to={`/logbook?flight=${flight._id}`}
                    >
                      <BookOpenTextIcon /> Log flight
                    </Link>
                  )}
                  {!logged && !online && (
                    <button className="button ghost" disabled>
                      Log flight
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={`Delete flight ${flight.departure} to ${flight.destination}`}
                    disabled={!online}
                    onClick={() => setDeleting(flight)}
                  >
                    <TrashIcon />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {form && (
        <Modal
          title={form._id ? "Edit flight plan" : "Plan a flight"}
          onClose={() => {
            if (!saving) setForm(null);
          }}
        >
          <form onSubmit={save} className="record-form" aria-busy={saving}>
            {error && (
              <p className="record-error" role="alert">
                {error}
              </p>
            )}
            <fieldset disabled={saving || !online}>
              <legend>Route and schedule</legend>
              <div className="form-grid">
                {["departure", "destination", "alternate"].map((name) => (
                  <div className="field" key={name}>
                    <label htmlFor={`flight-${name}`}>
                      {name === "alternate"
                        ? "Alternate ICAO (optional)"
                        : `${name[0].toUpperCase() + name.slice(1)} ICAO`}
                    </label>
                    <input
                      id={`flight-${name}`}
                      name={name}
                      value={form[name]}
                      onChange={change}
                      required={name !== "alternate"}
                      pattern="[A-Z]{4}"
                      maxLength={4}
                      placeholder={
                        name === "departure"
                          ? "OPLA"
                          : name === "destination"
                            ? "OPIS"
                            : "OPPS"
                      }
                      title="Enter a four-letter ICAO airport code"
                      autoCapitalize="characters"
                    />
                  </div>
                ))}
                <div className="field">
                  <label htmlFor="flight-date">Flight date</label>
                  <input
                    id="flight-date"
                    type="date"
                    name="date"
                    value={form.date}
                    onChange={change}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="flight-departureTime">
                    Departure time (UTC)
                  </label>
                  <input
                    id="flight-departureTime"
                    type="time"
                    name="departureTime"
                    value={form.departureTime}
                    onChange={change}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="flight-aircraftId">Aircraft</label>
                  <select
                    id="flight-aircraftId"
                    name="aircraftId"
                    value={form.aircraftId}
                    onChange={change}
                    required
                  >
                    <option value="">Select an aircraft</option>
                    {aircraft.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.registration} · {item.model}
                      </option>
                    ))}
                  </select>
                  {aircraft.length === 0 && (
                    <p className="record-field-help">
                      Add an aircraft in the Aircraft page before saving a
                      flight.
                    </p>
                  )}
                </div>
                <div className="field record-full">
                  <label htmlFor="flight-route">Route (optional)</label>
                  <input
                    id="flight-route"
                    name="route"
                    value={form.route}
                    onChange={change}
                    maxLength={1000}
                    placeholder="DCT or your planned waypoints"
                  />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Planning details</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="flight-flightRules">Flight rules</label>
                  <select
                    id="flight-flightRules"
                    name="flightRules"
                    value={form.flightRules}
                    onChange={change}
                  >
                    <option>VFR</option>
                    <option>IFR</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="flight-altitude">Planned altitude (ft)</label>
                  <input
                    id="flight-altitude"
                    name="altitude"
                    type="number"
                    min="0"
                    max="60000"
                    step="1"
                    required
                    value={form.altitude}
                    onChange={change}
                  />
                </div>
                <div className="field">
                  <label htmlFor="flight-duration">
                    Flight duration (hours)
                  </label>
                  <input
                    id="flight-duration"
                    name="duration"
                    type="number"
                    min="0.1"
                    max="48"
                    step="any"
                    required
                    value={form.duration}
                    onChange={change}
                  />
                </div>
                <div className="field">
                  <label htmlFor="flight-fuel">Planned fuel ({form.fuelUnit})</label>
                  <input
                    id="flight-fuel"
                    name="fuel"
                    type="number"
                    min="0"
                    step="any"
                    required
                    value={form.fuel}
                    onChange={change}
                  />
                </div>
                <div className="field">
                  <label htmlFor="flight-fuelUnit">Fuel unit</label>
                  <select id="flight-fuelUnit" name="fuelUnit" value={form.fuelUnit} onChange={change}>
                    <option>US gal</option>
                    <option>kg</option>
                  </select>
                </div>
                {form.fuelUnit === "kg" && (
                  <div className="field">
                    <label htmlFor="flight-density">Fuel density (kg/L)</label>
                    <input
                      id="flight-density"
                      name="fuelDensityKgPerL"
                      type="number"
                      min="0"
                      step="any"
                      required
                      value={form.fuelDensityKgPerL ?? ""}
                      onChange={change}
                      aria-describedby="flight-density-help"
                    />
                    <small id="flight-density-help">Used to check the aircraft’s capacity in US gallons.</small>
                  </div>
                )}
                <div className="field">
                  <label htmlFor="flight-status">Status</label>
                  <select
                    id="flight-status"
                    name="status"
                    value={form.status}
                    onChange={change}
                  >
                    <option>Planned</option>
                    <option>Completed</option>
                  </select>
                </div>
                <div className="field record-full">
                  <label htmlFor="flight-notes">Flight notes (optional)</label>
                  <textarea
                    id="flight-notes"
                    name="notes"
                    rows={3}
                    value={form.notes}
                    onChange={change}
                    maxLength={4000}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Preflight checklist</legend>
              <div className="record-checkboxes">
                {checklistLabels.map((label, index) => (
                  <label className="record-checkbox" key={label}>
                    <input
                      type="checkbox"
                      checked={form.checklist[index]}
                      onChange={(event) => {
                        const checklist = [...form.checklist];
                        checklist[index] = event.target.checked;
                        setForm({ ...form, checklist });
                      }}
                    />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </fieldset>
            {!online && (
              <p className="record-error" role="status">
                Reconnect to save your flight plan.
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
              <button
                className="button"
                disabled={saving || !online || aircraft.length === 0}
              >
                {saving ? "Saving…" : "Save flight plan"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <DeleteRecordDialog
          title="Delete this flight plan?"
          noun="flight"
          path={`/flights/${deleting._id}`}
          online={online}
          onClose={() => setDeleting(null)}
          onDeleted={() => refreshAfterChange("Flight plan deleted.")}
        >
          Your {deleting.departure} to {deleting.destination} flight plan on{" "}
          {dateLabel(deleting.date)} will be removed. Any existing logbook
          entry will be kept.
        </DeleteRecordDialog>
      )}
    </>
  );
}
