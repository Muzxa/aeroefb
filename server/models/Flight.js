const mongoose = require("mongoose");
const { validDate } = require("../middleware/validation");

const airport = {
  type: String,
  required: true,
  trim: true,
  uppercase: true,
  match: /^[A-Z]{4}$/,
};
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
    fuel: { type: Number, min: 0, max: 100000, default: 0 },
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
});

module.exports = mongoose.model("Flight", flightSchema);
