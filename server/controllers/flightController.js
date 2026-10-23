const Aircraft = require("../models/Aircraft");
const Flight = require("../models/Flight");
const LogEntry = require("../models/LogEntry");
const { cleanBody, badRequest } = require("../middleware/validation");

const numbers = ["altitude", "duration", "fuel"];
const fields = [
  "departure",
  "destination",
  "alternate",
  "route",
  "date",
  "departureTime",
  "aircraftId",
  "aircraftRegistration",
  "flightRules",
  "status",
  "notes",
  "checklist",
  ...numbers,
];

async function flightData(req, existing) {
  const data = cleanBody(req.body, fields, numbers);
  const aircraftId = data.aircraftId || existing?.aircraftId;
  if (!aircraftId) throw badRequest("Select an aircraft.");
  const aircraft = await Aircraft.findOne({
    _id: aircraftId,
    user: req.user._id,
  });
  if (!aircraft) throw badRequest("Select one of your saved aircraft.");
  if (
    data.aircraftRegistration &&
    data.aircraftRegistration.toUpperCase() !== aircraft.registration
  ) {
    throw badRequest(
      "The aircraft registration does not match the selected aircraft.",
    );
  }
  data.aircraftRegistration = aircraft.registration;
  const fuel = data.fuel === undefined ? existing?.fuel : data.fuel;
  if (fuel > aircraft.fuelCapacity)
    throw badRequest(
      `Fuel exceeds this aircraft's ${aircraft.fuelCapacity} gal capacity.`,
    );
  return data;
}

exports.list = async (req, res) => {
  res.json(
    await Flight.find({ user: req.user._id }).sort({
      date: 1,
      departureTime: 1,
    }),
  );
};

exports.create = async (req, res) => {
  const data = await flightData(req);
  res.status(201).json(await Flight.create({ ...data, user: req.user._id }));
};

exports.update = async (req, res) => {
  const flight = await Flight.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!flight) return res.status(404).json({ message: "Flight not found." });
  flight.set(await flightData(req, flight));
  await flight.save();
  res.json(flight);
};

exports.remove = async (req, res) => {
  const flight = await Flight.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!flight) return res.status(404).json({ message: "Flight not found." });
  // Preserve logbook history when its original plan is removed.
  await LogEntry.updateMany(
    { user: req.user._id, flightId: flight._id },
    { flightId: null },
  );
  await flight.deleteOne();
  res.json({ message: "Flight deleted." });
};
