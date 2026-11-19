import { useState } from "react";
import { Link } from "react-router-dom";
import {
  AirplaneIcon,
  ArrowClockwiseIcon,
  InfoIcon,
} from "@phosphor-icons/react";
import "./tools.css";

function profileNumber(value) {
  return value == null || (typeof value === "string" && !value.trim()) ? NaN : Number(value);
}

function pounds(value) {
  const number = profileNumber(value);
  return Number.isFinite(number)
    ? number.toLocaleString(undefined, { maximumFractionDigits: 1 })
    : "—";
}

function aircraftConfigError(aircraft, rows) {
  if (!aircraft) return "";
  if (!(profileNumber(aircraft.emptyWeight) > 0))
    return "Enter a positive empty weight in the aircraft profile.";
  if (!(profileNumber(aircraft.maxWeight) > 0))
    return "Enter a positive maximum weight in the aircraft profile.";
  if (!(profileNumber(aircraft.cgMax) > profileNumber(aircraft.cgMin)))
    return "Set the maximum CG above the minimum CG in the aircraft profile.";
  if (!(profileNumber(aircraft.fuelCapacity) >= 0))
    return "Enter the aircraft’s fuel capacity in its profile.";
  const station = rows.find((row) => !Number.isFinite(row.arm) || row.arm < 0);
  return station
    ? `Enter a nonnegative arm for ${station.name.toLowerCase()} in the aircraft profile.`
    : "";
}

export default function Balance({ aircraft = [] }) {
  const [aircraftId, setAircraftId] = useState("");
  const [loading, setLoading] = useState({
    front: "",
    rear: "",
    baggage: "",
    fuel: "",
  });

  const selected = aircraft.find((item) => item._id === aircraftId) || aircraft[0];
  const gallons = Number(loading.fuel || 0);
  const rows = selected
    ? [
        {
          name: "Basic empty aircraft",
          weight: profileNumber(selected.emptyWeight),
          arm: profileNumber(selected.emptyArm),
        },
        {
          name: "Front occupants",
          weight: Number(loading.front || 0),
          arm: profileNumber(selected.frontArm),
        },
        {
          name: "Rear occupants",
          weight: Number(loading.rear || 0),
          arm: profileNumber(selected.rearArm),
        },
        {
          name: "Baggage",
          weight: Number(loading.baggage || 0),
          arm: profileNumber(selected.baggageArm),
        },
        {
          name: "Usable fuel",
          weight: gallons * 6,
          arm: profileNumber(selected.fuelArm),
        },
      ]
    : [];
  const totalWeight = rows.reduce((total, row) => total + row.weight, 0);
  const totalMoment = rows.reduce(
    (total, row) => total + row.weight * row.arm,
    0,
  );
  const cg = totalWeight ? totalMoment / totalWeight : 0;
  const configError = aircraftConfigError(selected, rows);
  const configValid = Boolean(selected) && !configError;
  const valuesValid =
    totalWeight > 0 &&
    Number.isFinite(totalWeight) &&
    Number.isFinite(totalMoment) &&
    Object.values(loading).every(
      (value) => Number.isFinite(Number(value)) && Number(value) >= 0,
    );
  const cgLabel = valuesValid ? cg.toFixed(2) : "—";
  const overWeight = selected && totalWeight > Number(selected.maxWeight);
  const outsideCg =
    selected && (cg < Number(selected.cgMin) || cg > Number(selected.cgMax));
  const overFuel = selected && gallons > Number(selected.fuelCapacity);
  const withinLimits =
    configValid &&
    valuesValid &&
    !overWeight &&
    !outsideCg &&
    !overFuel;
  const xMin = selected ? Math.min(Number(selected.cgMin) - 5, cg - 2) : 0;
  const xMax = selected ? Math.max(Number(selected.cgMax) + 5, cg + 2) : 1;
  const yMax = selected
    ? Math.max(Number(selected.maxWeight) * 1.15, totalWeight * 1.1)
    : 1;
  const chartLeft = 100;
  const chartRight = 430;
  const chartX = (value) =>
    chartLeft + ((value - xMin) / (xMax - xMin)) * (chartRight - chartLeft);
  const chartY = (value) => 270 - (value / yMax) * 220;

  function changeLoading(event) {
    const number = Number(event.target.value);
    const value =
      event.target.value === "" || !Number.isFinite(number)
        ? ""
        : Math.min(1000000, Math.max(0, number));
    setLoading({ ...loading, [event.target.name]: value });
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Weight and balance</h1>
        </div>
      </div>
      {!aircraft.length ? (
        <section className="card empty-state briefing-empty">
          <AirplaneIcon />
          <h2>Add your aircraft first</h2>
          <p>
            An aircraft profile provides the weights, arms and limits used in
            this worksheet.
          </p>
          <Link to="/aircraft" className="button">
            Go to aircraft
          </Link>
        </section>
      ) : (
        <>
          <div className="balance-layout">
            <section className="card loading-card">
              <div className="section-heading">
                <h2>Loading worksheet</h2>
              </div>
              <div className="field">
                <label htmlFor="balance-aircraft">Aircraft</label>
                <select
                  id="balance-aircraft"
                  value={selected?._id ?? ""}
                  onChange={(event) => setAircraftId(event.target.value)}
                >
                  {aircraft.map((item) => (
                    <option key={item._id} value={item._id}>
                      {item.registration} · {item.model}
                    </option>
                  ))}
                </select>
              </div>
              <div className="loading-fields">
                <div className="field">
                  <label htmlFor="front-weight">
                    Front occupants <span className="muted">lb</span>
                  </label>
                  <input
                    id="front-weight"
                    name="front"
                    type="number"
                    min="0"
                    step="0.1"
                    value={loading.front}
                    onChange={changeLoading}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label htmlFor="rear-weight">
                    Rear occupants <span className="muted">lb</span>
                  </label>
                  <input
                    id="rear-weight"
                    name="rear"
                    type="number"
                    min="0"
                    step="0.1"
                    value={loading.rear}
                    onChange={changeLoading}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label htmlFor="baggage-weight">
                    Baggage <span className="muted">lb</span>
                  </label>
                  <input
                    id="baggage-weight"
                    name="baggage"
                    type="number"
                    min="0"
                    step="0.1"
                    value={loading.baggage}
                    onChange={changeLoading}
                    placeholder="0"
                  />
                </div>
                <div className="field">
                  <label htmlFor="fuel-gallons">
                    Usable fuel <span className="muted">US gal</span>
                  </label>
                  <input
                    id="fuel-gallons"
                    name="fuel"
                    type="number"
                    min="0"
                    max={selected?.fuelCapacity ?? undefined}
                    step="0.1"
                    value={loading.fuel}
                    onChange={changeLoading}
                    placeholder="0"
                    aria-describedby={selected?.fuelCapacity != null ? "fuel-capacity" : undefined}
                  />
                  {selected?.fuelCapacity != null && (
                    <p className="muted field-help" id="fuel-capacity">
                      max: {selected.fuelCapacity} US gal
                    </p>
                  )}
                </div>
              </div>
              <button
                className="button ghost loading-reset"
                onClick={() =>
                  setLoading({ front: "", rear: "", baggage: "", fuel: "" })
                }
              >
                <ArrowClockwiseIcon /> Reset loading
              </button>
            </section>
            <section
              className="card balance-result"
              aria-labelledby="balance-result-title"
            >
              <div className="section-heading">
                <h2 id="balance-result-title">Loading summary</h2>
                <span className={`badge ${withinLimits ? "green" : "amber"}`}>
                  {!configValid
                    ? "Check aircraft data"
                    : withinLimits
                      ? "Within configured limits"
                      : "Outside configured limits"}
                </span>
              </div>
              <div className="balance-numbers" aria-live="polite">
                <div>
                  <span>Total weight</span>
                  <strong>
                    {pounds(totalWeight)} <small>lb</small>
                  </strong>
                  <p className="muted">
                    Maximum {pounds(selected?.maxWeight)} lb
                  </p>
                </div>
                <div>
                  <span>Centre of gravity</span>
                  <strong>
                    {cgLabel} <small>in</small>
                  </strong>
                  <p className="muted">
                    Range {selected?.cgMin}–{selected?.cgMax} in
                  </p>
                </div>
              </div>
              {configValid && valuesValid ? (
                <figure className="balance-chart">
                  <svg
                    viewBox="0 0 470 325"
                    role="img"
                    aria-labelledby="cg-chart-title cg-chart-description"
                  >
                    <title id="cg-chart-title">
                      Weight and centre of gravity chart
                    </title>
                    <desc id="cg-chart-description">
                      Simplified rectangular envelope. Current weight is{" "}
                      {pounds(totalWeight)} pounds and centre of gravity is{" "}
                      {cgLabel} inches. {withinLimits ? "Within" : "Outside"}{" "}
                      the configured limits.
                    </desc>
                    {[0.25, 0.5, 0.75, 1].map((fraction) => (
                      <g key={fraction}>
                        <line
                          className="chart-grid-line"
                          x1={chartLeft}
                          x2={chartRight}
                          y1={chartY(Number(selected.maxWeight) * fraction)}
                          y2={chartY(Number(selected.maxWeight) * fraction)}
                        />
                        <text
                          className="chart-tick"
                          x={chartLeft - 11}
                          y={chartY(Number(selected.maxWeight) * fraction) + 4}
                          textAnchor="end"
                        >
                          {Math.round(Number(selected.maxWeight) * fraction)}
                        </text>
                      </g>
                    ))}
                    <rect
                      className="cg-envelope"
                      x={chartX(Number(selected.cgMin))}
                      y={chartY(Number(selected.maxWeight))}
                      width={
                        chartX(Number(selected.cgMax)) -
                        chartX(Number(selected.cgMin))
                      }
                      height={270 - chartY(Number(selected.maxWeight))}
                    />
                    <line
                      className="chart-axis"
                      x1={chartLeft}
                      x2={chartRight}
                      y1="270"
                      y2="270"
                    />
                    <line
                      className="chart-axis"
                      x1={chartLeft}
                      x2={chartLeft}
                      y1="45"
                      y2="270"
                    />
                    {chartX(Number(selected.cgMax)) -
                      chartX(Number(selected.cgMin)) <
                    50 ? (
                      <text
                        className="chart-tick"
                        x={
                          (chartX(Number(selected.cgMin)) +
                            chartX(Number(selected.cgMax))) /
                          2
                        }
                        y="291"
                        textAnchor="middle"
                      >
                        {selected.cgMin}–{selected.cgMax}
                      </text>
                    ) : (
                      [Number(selected.cgMin), Number(selected.cgMax)].map(
                        (value) => (
                          <text
                            key={value}
                            className="chart-tick"
                            x={chartX(value)}
                            y="291"
                            textAnchor="middle"
                          >
                            {value}
                          </text>
                        ),
                      )
                    )}
                    <text
                      className="chart-label"
                      x={(chartLeft + chartRight) / 2}
                      y="317"
                      textAnchor="middle"
                    >
                      Centre of gravity (in)
                    </text>
                    <text
                      className="chart-label"
                      x="17"
                      y="160"
                      textAnchor="middle"
                      transform="rotate(-90 17 160)"
                    >
                      Weight (lb)
                    </text>
                    <line
                      className="chart-crosshair"
                      x1={chartX(cg)}
                      x2={chartX(cg)}
                      y1={chartY(totalWeight)}
                      y2="270"
                    />
                    <circle
                      className={
                        withinLimits
                          ? "chart-point"
                          : "chart-point chart-point-alert"
                      }
                      cx={chartX(cg)}
                      cy={chartY(totalWeight)}
                      r="7"
                    />
                  </svg>
                  <figcaption>
                    <span className="envelope-key" /> Configured constant CG
                    range <span className="point-key" /> Current loading
                  </figcaption>
                </figure>
              ) : null}
              {selected && !withinLimits && (
                <div className="balance-status status-review" role="status">
                  <InfoIcon />
                  <div>
                    {configValid && <strong>Review the loading before proceeding</strong>}
                    <p>
                      {!configValid
                        ? configError
                        : !valuesValid
                          ? "All loading values must be positive numbers or zero."
                          : overFuel
                            ? "The loaded fuel exceeds the aircraft fuel capacity."
                            : overWeight && outsideCg
                              ? "Weight and centre of gravity are outside the configured limits."
                              : overWeight
                                ? "The total weight exceeds the maximum aircraft weight."
                                : "The centre of gravity is outside the configured range."}
                    </p>
                  </div>
                </div>
              )}
            </section>
          </div>
          <section className="card moments-card">
            <div className="section-heading">
              <h2>Summary</h2>
            </div>
            <div className="table-wrap">
              <table className="data-table loading-table">
                <caption className="sr-only">
                  Loading station weights, arms and moments
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Loading station</th>
                    <th scope="col">Weight (lb)</th>
                    <th scope="col">Arm (in)</th>
                    <th scope="col">Moment (lb·in)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.name}>
                      <th scope="row">{row.name}</th>
                      <td>{pounds(row.weight)}</td>
                      <td>{pounds(row.arm)}</td>
                      <td>{pounds(row.weight * row.arm)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th scope="row">Total</th>
                    <td>{pounds(totalWeight)}</td>
                    <td>—</td>
                    <td>{pounds(totalMoment)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="balance-formula">
              {valuesValid ? (
                <>
                  Centre of gravity = total moment ÷ total weight ={" "}
                  {pounds(totalMoment)} ÷ {pounds(totalWeight)} ={" "}
                  <strong>{cgLabel} in</strong>
                </>
              ) : (
                "A positive total weight and valid loading values are required to calculate the centre of gravity."
              )}
            </p>
            <p className="muted field-help">
              This worksheet calculates the present loading only. It does not
              model fuel burn, variable CG envelopes or performance.
            </p>
          </section>
        </>
      )}
    </>
  );
}
