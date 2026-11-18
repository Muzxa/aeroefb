const mongoose = require("mongoose");
const { validDate } = require("../middleware/validation");

const airport = {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
  match: /^[A-Z]{4}$/,
};
const waypointSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 50,
      match: /^[^\r\n\t]+$/,
    },
    type: { type: String, required: true, trim: true, uppercase: true, maxlength: 32 },
    latitude: { type: Number, required: true, min: -90, max: 90 },
    longitude: { type: Number, required: true, min: -180, max: 180 },
  },
  { _id: false },
);
const importedRouteSchema = new mongoose.Schema(
  {
    departureRunway: {
      type: String,
      trim: true,
      uppercase: true,
      match: /^(?:(?:0[1-9]|[12][0-9]|3[0-6])[LCR]?)?$/,
    },
    waypoints: {
      type: [waypointSchema],
      castNonArrays: false,
      required: true,
      validate: {
        validator: (waypoints) => waypoints.length >= 2 && waypoints.every(Boolean),
        message: "An imported route must contain at least two waypoints.",
      },
    },
  },
  { _id: false },
);
const flightSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    departure: airport,
    destination: airport,
    alternate: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
      validate: (value) => !value || /^[A-Z]{4}$/.test(value),
    },
    route: { type: String, trim: true, maxlength: 1000, default: "" },
    importedRoute: importedRouteSchema,
    date: {
      type: String,
      required: true,
      validate: { validator: validDate, message: "Enter a valid flight date." },
    },
    departureTime: {
      type: String,
      match: /^([01]\d|2[0-3]):[0-5]\d$/,
      default: "08:00",
    },
    aircraftId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Aircraft",
      required: true,
    },
    aircraftRegistration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
    },
    flightRules: { type: String, enum: ["VFR", "IFR"], default: "VFR" },
    altitude: { type: Number, min: 0, max: 60000, default: 6500 },
    duration: { type: Number, min: 0.1, max: 48, default: 1 },
    fuel: { type: Number, min: 0, default: 0 },
    fuelUnit: { type: String, enum: ["US gal", "kg"], default: "US gal", required: true },
    fuelDensityKgPerL: { type: Number, validate: (value) => value == null || value > 0 },
    status: {
      type: String,
      enum: ["Planned", "Completed"],
      default: "Planned",
    },
    notes: { type: String, trim: true, maxlength: 4000, default: "" },
    checklist: {
      type: [Boolean],
      default: [false, false, false, false, false],
      validate: (value) => value.length === 5,
    },
  },
  { timestamps: true },
);

flightSchema.pre("validate", function () {
  if (this.departure === this.destination)
    this.invalidate(
      "destination",
      "Departure and destination must be different.",
    );

  const waypoints = this.importedRoute?.waypoints;
  if (!waypoints?.length) return;
  const first = waypoints[0];
  const last = waypoints.at(-1);
  const route = waypoints.slice(1, -1).map((waypoint) => waypoint?.id).join(" ");
  if (
    first?.type !== "AIRPORT" ||
    first.id !== this.departure ||
    last?.type !== "AIRPORT" ||
    last.id !== this.destination ||
    route !== this.route
  )
    this.invalidate("importedRoute", "The imported waypoints must match the flight route and airports.");
});

module.exports = mongoose.model("Flight", flightSchema);
