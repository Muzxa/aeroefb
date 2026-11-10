const express = require("express");
const cors = require("cors");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const mongoose = require("mongoose");
const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, ".env"), quiet: true });

if (process.env.NODE_ENV === "production" && !process.env.SESSION_SECRET) {
  throw new Error("Set SESSION_SECRET before starting the production server.");
}

const app = express();
const mongoUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aeroefb";
const origins = new Set([
  process.env.CLIENT_URL || "http://localhost:5173"
]);

if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
app.use(
  cors({
    origin(origin, callback) {
      callback(null, !origin || origins.has(origin));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(
  session({
    name: "aeroefb.sid",
    secret:
      process.env.SESSION_SECRET ||
      "secret-value",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl, collectionName: "sessions" }),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

app.get("/api/health", (req, res) => {
  const connected = mongoose.connection.readyState === 1;
  res
    .status(connected ? 200 : 503)
    .json({
      status: connected ? "ok" : "unavailable",
      database: connected ? "connected" : "disconnected",
    });
});

app.use("/api", require("./routes/api"));
app.use("/api", (req, res) =>
  res.status(404).json({ message: "API endpoint not found." }),
);

app.use((error, req, res, next) => {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    const message =
      field === "email"
        ? "An account with this email already exists."
        : error.keyPattern?.flightId
          ? "This flight already has a logbook entry."
          : "An aircraft with this registration already exists in your account.";
    return res.status(409).json({ message });
  }
  if (error.name === "ValidationError") {
    return res.status(400).json({
      message: Object.values(error.errors)
        .map((item) => item.message)
        .join(" "),
    });
  }
  if (error.name === "CastError")
    return res
      .status(400)
      .json({
        message: `Invalid ${error.path === "_id" ? "record ID" : error.path}.`,
      });
  if (error.type === "entity.parse.failed")
    return res
      .status(400)
      .json({ message: "The request must contain valid JSON." });
  if (error.status && error.status < 500)
    return res.status(error.status).json({ message: error.message });
  console.error("API error:", error.message);
  res
    .status(500)
    .json({ message: "Something went wrong on the server. Please try again." });
});

module.exports = app;
