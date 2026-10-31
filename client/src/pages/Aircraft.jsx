import { useState } from "react";
import { api } from "../api";
import Icon from "../components/Icon";
import Modal from "../components/Modal";
import "./records.css";

const startingAircraft = {
  registration: "",
  model: "Cessna 172S",
  type: "Single-engine piston",
  emptyWeight: 1720,
  emptyArm: 40,
  maxWeight: 2550,
  cgMin: 35,
  cgMax: 47.3,
  fuelCapacity: 56,
  fuelBurn: 9,
  cruiseSpeed: 120,
  frontArm: 37,
  rearArm: 73,
  baggageArm: 95,
  fuelArm: 48,
  equipment: "",
  notes: "",
};

const numberFields = [
  "emptyWeight",
  "emptyArm",
  "maxWeight",
  "cgMin",
  "cgMax",
  "fuelCapacity",
  "fuelBurn",
  "cruiseSpeed",
  "frontArm",
  "rearArm",
  "baggageArm",
  "fuelArm",
];

export default function Aircraft({ aircraft = [], refresh, notify, online }) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const visibleAircraft = aircraft.filter((item) =>
    `${item.registration} ${item.model} ${item.type}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  function openForm(item) {
    setError("");
    setForm(item ? { ...startingAircraft, ...item } : { ...startingAircraft });
  }

  function change(event) {
    const { name, value } = event.target;
    setForm({
      ...form,
      [name]: name === "registration" ? value.toUpperCase() : value,
    });
  }

  async function save(event) {
    event.preventDefault();
    if (!online || saving) return;
    setError("");
    const values = { ...form };
    numberFields.forEach((name) => {
      values[name] = Number(values[name]);
    });
    if (values.emptyWeight >= values.maxWeight) {
      setError("Maximum takeoff weight must be greater than empty weight.");
      return;
    }
    if (values.cgMin >= values.cgMax) {
      setError("The aft CG limit must be greater than the forward CG limit.");
      return;
    }
    setSaving(true);
    try {
      await api(form._id ? `/aircraft/${form._id}` : "/aircraft", {
        method: form._id ? "PUT" : "POST",
        body: values,
      });
      setForm(null);
      const message = form._id
        ? "Aircraft updated."
        : "Aircraft added to your fleet.";
      try {
        await refresh();
        notify(message);
      } catch (err) {
        notify(
          `${message} The list could not refresh: ${err.message}`,
          "error",
        );
      }
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
      await api(`/aircraft/${deleting._id}`, { method: "DELETE" });
      setDeleting(null);
      try {
        await refresh();
        notify("Aircraft removed.");
      } catch (err) {
        notify(
          `Aircraft removed. The list could not refresh: ${err.message}`,
          "error",
        );
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function numberInput(name, label, min = 0, max = 10000) {
    return (
      <div className="field" key={name}>
        <label htmlFor={`aircraft-${name}`}>{label}</label>
        <input
          id={`aircraft-${name}`}
          name={name}
          type="number"
          min={min}
          max={max}
          step="any"
          required
          value={form[name]}
          onChange={change}
        />
      </div>
    );
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR HANGAR</p>
          <h1>Aircraft</h1>
          <p className="page-intro">
            A familiar aircraft. Every detail in one place.
          </p>
        </div>
        <button
          className="button"
          onClick={() => openForm()}
          disabled={!online}
        >
          <Icon name="plus" /> Add aircraft
        </button>
      </div>

      {!online && (
        <p className="record-notice" role="status">
          <Icon name="info" /> Your saved aircraft are available offline.
          Reconnect to make changes.
        </p>
      )}

      <div className="record-toolbar">
        <div className="record-search">
          <Icon name="search" />
          <label className="record-sr-only" htmlFor="aircraft-search">
            Search aircraft
          </label>
          <input
            id="aircraft-search"
            type="search"
            placeholder="Search registration or model"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <span className="muted record-count">
          {aircraft.length} aircraft in your fleet
        </span>
      </div>

      {visibleAircraft.length === 0 ? (
        <div className="card empty-state">
          <Icon name="aircraft" />
          <h2>
            {search
              ? "No aircraft match your search"
              : "Your hangar starts here"}
          </h2>
          <p>
            {search
              ? "Try a different registration or model."
              : "Add an aircraft to start planning flights and calculating weight and balance."}
          </p>
          {!search && (
            <button
              className="button"
              onClick={() => openForm()}
              disabled={!online}
            >
              <Icon name="plus" /> Add your first aircraft
            </button>
          )}
        </div>
      ) : (
        <div className="aircraft-grid">
          {visibleAircraft.map((item) => (
            <article className="card aircraft-card" key={item._id}>
              <div className="aircraft-card-top">
                <span className="badge">{item.type || "Aircraft"}</span>
                <span className="aircraft-mark" aria-hidden="true">
                  <Icon name="plane" />
                </span>
              </div>
              <div className="aircraft-identity">
                <p className="record-registration">{item.registration}</p>
                <h2>{item.model}</h2>
              </div>
              <div className="aircraft-drawing" aria-hidden="true">
                <svg viewBox="0 0 360 100" fill="none">
                  <path
                    d="M22 60h22l22-19 48-5 22-22h33l-8 21h85l25 9 38 7 25 8-11 9h-69l-39 18h-35l14-18H74l-22-5H22z"
                    fill="currentColor"
                    opacity=".09"
                  />
                  <path
                    d="M22 60h22l22-19 48-5 22-22h33l-8 21h85l25 9 38 7 25 8-11 9h-69l-39 18h-35l14-18H74l-22-5H22z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="m130 36 15 24M245 35l-5 17h40M75 68v8m185-8v8"
                    stroke="currentColor"
                    strokeWidth="1.5"
                  />
                  <circle cx="75" cy="80" r="5" fill="currentColor" />
                  <circle cx="260" cy="80" r="5" fill="currentColor" />
                </svg>
              </div>
              <dl className="record-stats aircraft-stats">
                <div>
                  <dt>Cruise speed</dt>
                  <dd>
                    {item.cruiseSpeed} <span>kt</span>
                  </dd>
                </div>
                <div>
                  <dt>Fuel burn</dt>
                  <dd>
                    {item.fuelBurn} <span>gal/h</span>
                  </dd>
                </div>
                <div>
                  <dt>Fuel capacity</dt>
                  <dd>
                    {item.fuelCapacity} <span>gal</span>
                  </dd>
                </div>
              </dl>
              <div className="aircraft-limit">
                <span>Maximum takeoff weight</span>
                <strong>{Number(item.maxWeight).toLocaleString()} lb</strong>
              </div>
              {item.equipment && (
                <p className="aircraft-equipment">
                  <Icon name="check" /> {item.equipment}
                </p>
              )}
              <button
                className="record-detail-toggle"
                aria-expanded={expanded === item._id}
                aria-controls={`aircraft-details-${item._id}`}
                onClick={() =>
                  setExpanded(expanded === item._id ? null : item._id)
                }
              >
                {expanded === item._id
                  ? "Hide aircraft details"
                  : "View aircraft details"}
                <Icon name="chevron" />
              </button>
              {expanded === item._id && (
                <div
                  className="aircraft-details"
                  id={`aircraft-details-${item._id}`}
                >
                  <dl className="record-stats">
                    <div>
                      <dt>Empty weight</dt>
                      <dd>{Number(item.emptyWeight).toLocaleString()} lb</dd>
                    </div>
                    <div>
                      <dt>Empty weight arm</dt>
                      <dd>{item.emptyArm} in</dd>
                    </div>
                    <div>
                      <dt>CG limits</dt>
                      <dd>
                        {item.cgMin}–{item.cgMax} in
                      </dd>
                    </div>
                    <div>
                      <dt>Front seats arm</dt>
                      <dd>{item.frontArm} in</dd>
                    </div>
                    <div>
                      <dt>Rear seats arm</dt>
                      <dd>{item.rearArm} in</dd>
                    </div>
                    <div>
                      <dt>Baggage arm</dt>
                      <dd>{item.baggageArm} in</dd>
                    </div>
                    <div>
                      <dt>Fuel arm</dt>
                      <dd>{item.fuelArm} in</dd>
                    </div>
                  </dl>
                  {item.notes && <p className="record-notes">{item.notes}</p>}
                </div>
              )}
              <div className="record-card-actions">
                <button
                  className="button secondary"
                  onClick={() => openForm(item)}
                  disabled={!online}
                >
                  <Icon name="edit" /> Edit profile
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete aircraft ${item.registration}`}
                  onClick={() => {
                    setError("");
                    setDeleting(item);
                  }}
                  disabled={!online}
                >
                  <Icon name="trash" />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}

      {form && (
        <Modal
          title={form._id ? `Edit ${form.registration}` : "Add an aircraft"}
          onClose={() => {
            if (!saving) setForm(null);
          }}
        >
          <form onSubmit={save} className="record-form" aria-busy={saving}>
            <p className="muted">
              Use your aircraft's approved flight manual and current weight and
              balance record. Starting values are examples.
            </p>
            {error && (
              <p className="record-error" role="alert">
                {error}
              </p>
            )}
            <fieldset disabled={saving || !online}>
              <legend>Aircraft details</legend>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="aircraft-registration">Registration</label>
                  <input
                    id="aircraft-registration"
                    name="registration"
                    value={form.registration}
                    onChange={change}
                    required
                    maxLength={20}
                    placeholder="AP-BEF"
                  />
                </div>
                <div className="field">
                  <label htmlFor="aircraft-model">Model</label>
                  <input
                    id="aircraft-model"
                    name="model"
                    value={form.model}
                    onChange={change}
                    required
                    maxLength={100}
                    placeholder="Cessna 172S"
                  />
                </div>
                <div className="field record-full">
                  <label htmlFor="aircraft-type">Aircraft type</label>
                  <input
                    id="aircraft-type"
                    name="type"
                    value={form.type}
                    onChange={change}
                    maxLength={50}
                  />
                </div>
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Weight and CG limits</legend>
              <p className="muted record-field-help">
                Weights in pounds. Arms and CG limits in inches from the
                aircraft datum.
              </p>
              <div className="form-grid">
                {numberInput("emptyWeight", "Empty weight (lb)", 1, 1000000)}
                {numberInput("emptyArm", "Empty weight arm (in)")}
                {numberInput(
                  "maxWeight",
                  "Maximum takeoff weight (lb)",
                  1,
                  1000000,
                )}
                {numberInput("cgMin", "Forward CG limit (in)")}
                {numberInput("cgMax", "Aft CG limit (in)")}
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Performance and loading stations</legend>
              <div className="form-grid">
                {numberInput(
                  "fuelCapacity",
                  "Usable fuel capacity (US gal)",
                  0,
                  100000,
                )}
                {numberInput("fuelBurn", "Fuel burn (US gal/h)", 0.1)}
                {numberInput("cruiseSpeed", "Cruise speed (kt)", 1, 2000)}
                {numberInput("frontArm", "Front seats arm (in)")}
                {numberInput("rearArm", "Rear seats arm (in)")}
                {numberInput("baggageArm", "Baggage arm (in)")}
                {numberInput("fuelArm", "Fuel arm (in)")}
              </div>
            </fieldset>
            <fieldset disabled={saving || !online}>
              <legend>Additional information</legend>
              <div className="field">
                <label htmlFor="aircraft-equipment">Equipment</label>
                <textarea
                  id="aircraft-equipment"
                  name="equipment"
                  rows={2}
                  maxLength={2000}
                  value={form.equipment}
                  onChange={change}
                  placeholder="GPS, autopilot, navigation and communications equipment"
                />
              </div>
              <div className="field">
                <label htmlFor="aircraft-notes">Operational notes</label>
                <textarea
                  id="aircraft-notes"
                  name="notes"
                  rows={3}
                  maxLength={4000}
                  value={form.notes}
                  onChange={change}
                />
              </div>
            </fieldset>
            {!online && (
              <p className="record-error" role="status">
                Reconnect to save this aircraft.
              </p>
            )}
            <div className="form-actions">
              <button
                className="button secondary"
                type="button"
                disabled={saving}
                onClick={() => setForm(null)}
              >
                Cancel
              </button>
              <button className="button" disabled={saving || !online}>
                {saving ? "Saving…" : "Save aircraft"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <Modal
          title={`Delete ${deleting.registration}?`}
          onClose={() => {
            if (!saving) setDeleting(null);
          }}
        >
          <p>
            This will remove this aircraft profile. An aircraft assigned to a
            planned flight must be reassigned or its flight plan deleted first.
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
              Keep aircraft
            </button>
            <button
              className="button record-danger"
              disabled={saving || !online}
              onClick={remove}
            >
              {saving ? "Deleting…" : "Delete aircraft"}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
