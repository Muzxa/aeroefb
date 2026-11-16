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
    catalogId: { type: String, trim: true },
    icaoCode: { type: String, trim: true },
    type: {
      type: String,
      trim: true,
      maxlength: 50,
      default: "",
    },
    emptyWeight: { type: Number, min: 1, max: 1000000, required: true },
    emptyArm: { type: Number, min: 0, max: 10000, required: true },
    maxWeight: { type: Number, min: 1, max: 1000000, required: true },
    cgMin: { type: Number, min: 0, max: 10000, required: true },
    cgMax: { type: Number, min: 0, max: 10000, required: true },
    fuelCapacity: { type: Number, min: 0, max: 100000, required: true },
    fuelBurn: { type: Number, min: 0.1, max: 10000, required: true },
    cruiseSpeed: { type: Number, min: 1, max: 2000, required: true },
    frontArm: { type: Number, min: 0, max: 10000, required: true },
    rearArm: { type: Number, min: 0, max: 10000, required: true },
    baggageArm: { type: Number, min: 0, max: 10000, required: true },
    fuelArm: { type: Number, min: 0, max: 10000, required: true },
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
