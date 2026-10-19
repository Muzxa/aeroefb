const mongoose = require("mongoose");

const notamSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    airport: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      match: /^[A-Z]{4}$/,
    },
    reference: { type: String, required: true, trim: true, maxlength: 100 },
    text: { type: String, required: true, trim: true, maxlength: 8000 },
    startsAt: { type: Date, required: true },
    endsAt: { type: Date, required: true },
    category: { type: String, trim: true, maxlength: 100, default: "General" },
    source: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "Manual entry",
    },
    reviewed: { type: Boolean, default: false },
  },
  { timestamps: true },
);

notamSchema.pre("validate", function () {
  if (this.startsAt >= this.endsAt)
    this.invalidate("endsAt", "End time must be after the start time.");
});

module.exports = mongoose.model("Notam", notamSchema);
