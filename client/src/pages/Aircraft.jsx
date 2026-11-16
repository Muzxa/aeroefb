import { useRef, useState } from "react";
import { api } from "../api";
import {
  AirplaneIcon,
  AirplaneTiltIcon,
  CaretRightIcon,
  CheckIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import Modal from "../components/Modal";
import DeleteRecordDialog from "../components/DeleteRecordDialog";
import "./records.css";

const startingAircraft = {
  registration: "",
  type: "",
  emptyWeight: "",
  emptyArm: "",
  maxWeight: "",
  cgMin: "",
  cgMax: "",
  fuelCapacity: "",
  fuelBurn: "",
  cruiseSpeed: "",
  frontArm: "",
  rearArm: "",
  baggageArm: "",
  fuelArm: "",
  equipment: "",
  notes: "",
};

function modelLabel({ icaoCode, manufacturer, model }) {
  return `${icaoCode} — ${manufacturer} ${model}`;
}

function normalizeModel(value) {
  return value.normalize("NFKD").toLowerCase().replace(/[^a-z0-9]/g, "");
}

export default function Aircraft({ aircraft = [], refreshAfterChange, online }) {
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [catalog, setCatalog] = useState(null);
  const [modelInput, setModelInput] = useState("");
  const [modelError, setModelError] = useState("");
  const request = useRef(null);

  const visibleAircraft = aircraft.filter((item) =>
    `${item.registration} ${item.model} ${item.type}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );

  const modelQuery = normalizeModel(modelInput);
  const modelOptions =
    form && catalog
      ? catalog
          .filter((entry) => normalizeModel(modelLabel(entry)).includes(modelQuery))
          .slice(0, 60)
      : [];

  async function openForm(item) {
    setError("");
    setModelError("");
    setModelInput(item?.model || "");
    setForm(item ? { ...startingAircraft, ...item } : { ...startingAircraft });

    const pending = new AbortController();
    request.current = pending;
    try {
      const entries = catalog ?? (await api("/aircraft/catalog", { signal: pending.signal }));
      if (pending.signal.aborted) return;
      if (!catalog) setCatalog(entries);
      if (!item) return;
      const matches = item.catalogId
        ? entries.filter((entry) => entry.id === item.catalogId)
        : entries.filter(
            (entry) =>
              normalizeModel(`${entry.manufacturer} ${entry.model}`) ===
              normalizeModel(item.model),
          );
      if (matches.length === 1) {
        setModelInput(modelLabel(matches[0]));
      } else {
        setModelError("Select a model from the aircraft catalog before saving this profile.");
      }
    } catch (err) {
      if (!pending.signal.aborted) setModelError(err.message);
    }
  }

  function closeForm() {
    request.current?.abort();
    setForm(null);
  }

  function changeModel(event) {
    setModelInput(event.target.value);
    setModelError("");
  }

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: name === "registration" ? value.toUpperCase() : value,
    }));
  }

  async function save(event) {
    event.preventDefault();
    if (!online || saving) return;
    setError("");
    const model = catalog?.find((entry) => modelLabel(entry) === modelInput);
    if (!model) {
      setModelError("Select a model from the aircraft catalog.");
      return;
    }
    if (Number(form.emptyWeight) >= Number(form.maxWeight)) {
      setError("Maximum takeoff weight must be greater than empty weight.");
      return;
    }
    if (Number(form.cgMin) >= Number(form.cgMax)) {
      setError("The aft CG limit must be greater than the forward CG limit.");
      return;
    }
    setSaving(true);
    try {
      await api(form._id ? `/aircraft/${form._id}` : "/aircraft", {
        method: form._id ? "PUT" : "POST",
        body: { ...form, catalogId: model.id },
      });
      closeForm();
      const message = form._id
        ? "Aircraft updated."
        : "Aircraft added to your fleet.";
      await refreshAfterChange(message);
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
          <h1>Aircraft</h1>
        </div>
        <button
          className="button"
          onClick={() => openForm()}
          disabled={!online}
        >
          <PlusIcon /> Add aircraft
        </button>
      </div>


      <div className="record-toolbar">
        <div className="record-search">
          <MagnifyingGlassIcon />
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
          <AirplaneIcon />
          <h2>
            {search
              ? "No aircraft match your search"
              : "No aircraft yet"}
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
              <PlusIcon /> Add your first aircraft
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
                  <AirplaneTiltIcon />
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
                  <CheckIcon /> {item.equipment}
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
                <CaretRightIcon />
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
                  <PencilSimpleIcon /> Edit profile
                </button>
                <button
                  className="icon-button"
                  aria-label={`Delete aircraft ${item.registration}`}
                  onClick={() => setDeleting(item)}
                  disabled={!online}
                >
                  <TrashIcon />
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
            if (!saving) closeForm();
          }}
        >
          <form onSubmit={save} className="record-form" aria-busy={saving}>
            <p className="muted">
              Use your aircraft's approved flight manual and current weight and
              balance record.
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
                    list="aircraft-model-options"
                    value={modelInput}
                    onChange={changeModel}
                    required
                    disabled={!catalog}
                    autoComplete="off"
                    placeholder="Search by ICAO code or model"
                    aria-invalid={Boolean(modelError)}
                    aria-describedby="aircraft-model-status"
                  />
                  <datalist id="aircraft-model-options">
                    {modelOptions.map((entry) => (
                      <option key={entry.id} value={modelLabel(entry)} />
                    ))}
                  </datalist>
                  <div id="aircraft-model-status" aria-live="polite">
                    {modelError ? (
                      <small className="record-model-error">{modelError}</small>
                    ) : !catalog ? (
                      <small>Loading aircraft catalog…</small>
                    ) : null}
                  </div>
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
                onClick={closeForm}
              >
                Cancel
              </button>
              <button
                className="button"
                disabled={saving || !online || !catalog}
              >
                {saving ? "Saving…" : "Save aircraft"}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleting && (
        <DeleteRecordDialog
          title={`Delete ${deleting.registration}?`}
          noun="aircraft"
          path={`/aircraft/${deleting._id}`}
          online={online}
          onClose={() => setDeleting(null)}
          onDeleted={() => refreshAfterChange("Aircraft removed.")}
        >
          This will remove this aircraft profile. An aircraft assigned to a
          planned flight must be reassigned or its flight plan deleted first.
        </DeleteRecordDialog>
      )}
    </>
  );
}
