const express = require("express");
const requireAuth = require("../middleware/auth");
const auth = require("../controllers/authController");
const aircraft = require("../controllers/aircraftController");
const flights = require("../controllers/flightController");
const logbook = require("../controllers/logbookController");
const notams = require("../controllers/notamController");
const weather = require("../controllers/weatherController");

const router = express.Router();

// A small development-friendly rate limit protects password endpoints.
const attempts = new Map();
function authLimit(req, res, next) {
  const now = Date.now();
  if (attempts.size > 10000) {
    for (const [key, value] of attempts)
      if (value.reset < now) attempts.delete(key);
  }
  let entry = attempts.get(req.ip);
  if (!entry || entry.reset < now)
    entry = { count: 0, reset: now + 15 * 60 * 1000 };
  entry.count++;
  attempts.set(req.ip, entry);
  if (entry.count > 40)
    return res
      .status(429)
      .json({
        message: "Too many sign-in attempts. Please try again in 15 minutes.",
      });
  next();
}

router.post("/auth/register", authLimit, auth.register);
router.post("/auth/login", authLimit, auth.login);
router.post("/auth/logout", auth.logout);
router.get("/auth/me", requireAuth, auth.me);
router.put("/auth/profile", requireAuth, auth.profile);

router.use(requireAuth);
router.get("/aircraft", aircraft.list);
router.post("/aircraft", aircraft.create);
router.put("/aircraft/:id", aircraft.update);
router.delete("/aircraft/:id", aircraft.remove);
router.get("/flights", flights.list);
router.post("/flights", flights.create);
router.put("/flights/:id", flights.update);
router.delete("/flights/:id", flights.remove);
router.get("/logbook", logbook.list);
router.post("/logbook", logbook.create);
router.put("/logbook/:id", logbook.update);
router.delete("/logbook/:id", logbook.remove);
router.get("/notams", notams.list);
router.post("/notams", notams.create);
router.post("/notams/refresh", notams.refresh);
router.put("/notams/:id", notams.update);
router.delete("/notams/:id", notams.remove);
router.get("/weather", weather.get);

module.exports = router;
