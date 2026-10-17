const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true, select: false },
    license: { type: String, trim: true, maxlength: 100, default: "" },
    homeAirport: {
      type: String,
      trim: true,
      uppercase: true,
      maxlength: 4,
      default: "",
    },
    bio: { type: String, trim: true, maxlength: 1000, default: "" },
    isDemo: { type: Boolean, default: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
