const mongoose = require("mongoose");
const { validDate } = require("../middleware/validation");

const logEntrySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    date: {
      type: String,
      required: true,
      validate: {
        validator: validDate,
        message: "Enter a valid logbook date.",
      },
    },
    departure: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{4}$/,
    },
    destination: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{4}$/,
    },
    aircraftRegistration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    aircraftType: { type: String, required: true, trim: true, maxlength: 100 },
    totalTime: { type: Number, required: true, min: 0.1, max: 48 },
    pic: { type: Number, min: 0, max: 48, default: 0 },
    sic: { type: Number, min: 0, max: 48, default: 0 },
    ifr: { type: Number, min: 0, max: 48, default: 0 },
    night: { type: Number, min: 0, max: 48, default: 0 },
    approaches: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
      validate: Number.isInteger,
    },
    landings: {
      type: Number,
      min: 0,
      max: 100,
      default: 1,
      validate: Number.isInteger,
    },
    notes: { type: String, trim: true, maxlength: 4000, default: "" },
    flightId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Flight",
      default: null,
    },
  },
  { timestamps: true },
);

logEntrySchema.index(
  { user: 1, flightId: 1 },
  {
    unique: true,
    partialFilterExpression: { flightId: { $type: "objectId" } },
  },
);
logEntrySchema.pre("validate", function () {
  for (const field of ["pic", "sic", "ifr", "night"]) {
    if (this[field] > this.totalTime)
      this.invalidate(
        field,
        `${field.toUpperCase()} time cannot exceed total time.`,
      );
  }
  if (this.pic + this.sic > this.totalTime + 0.0001)
    this.invalidate("pic", "PIC plus SIC time cannot exceed total time.");
});

module.exports = mongoose.model("LogEntry", logEntrySchema);
