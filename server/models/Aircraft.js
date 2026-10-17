const mongoose = require("mongoose");

const aircraftSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    registration: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    model: { type: String, required: true, trim: true, maxlength: 100 },
    type: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "Single-engine piston",
    },
    emptyWeight: { type: Number, min: 1, max: 1000000, default: 1663 },
    emptyArm: { type: Number, min: 0, max: 10000, default: 39.5 },
    maxWeight: { type: Number, min: 1, max: 1000000, default: 2550 },
    cgMin: { type: Number, min: 0, max: 10000, default: 35 },
    cgMax: { type: Number, min: 0, max: 10000, default: 47.3 },
    fuelCapacity: { type: Number, min: 0, max: 100000, default: 53 },
    fuelBurn: { type: Number, min: 0.1, max: 10000, default: 9 },
    cruiseSpeed: { type: Number, min: 1, max: 2000, default: 120 },
    frontArm: { type: Number, min: 0, max: 10000, default: 37 },
    rearArm: { type: Number, min: 0, max: 10000, default: 73 },
    baggageArm: { type: Number, min: 0, max: 10000, default: 95 },
    fuelArm: { type: Number, min: 0, max: 10000, default: 48 },
    equipment: { type: String, trim: true, maxlength: 2000, default: "" },
    notes: { type: String, trim: true, maxlength: 4000, default: "" },
  },
  { timestamps: true },
);

aircraftSchema.index({ user: 1, registration: 1 }, { unique: true });
aircraftSchema.pre("validate", function () {
  if (this.cgMin >= this.cgMax)
    this.invalidate("cgMax", "Maximum CG must be greater than minimum CG.");
  if (this.emptyWeight >= this.maxWeight)
    this.invalidate("maxWeight", "Maximum weight must exceed empty weight.");
});

module.exports = mongoose.model("Aircraft", aircraftSchema);
