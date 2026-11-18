const Aircraft = require("../models/Aircraft");
const Flight = require("../models/Flight");
const LogEntry = require("../models/LogEntry");
const { cleanBody, badRequest } = require("../middleware/validation");

const litresPerUsGallon = 3.785411784;
const numbers = ["altitude", "duration", "fuel", "fuelDensityKgPerL"];
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
  "fuelUnit",
  "status",
  "notes",
  "checklist",
  ...numbers,
];

async function flightData(req, existing) {
  const data = cleanBody(req.body, fields, numbers);
  if (req.body.importedRoute !== undefined) {
    data.importedRoute = req.body.importedRoute;
  } else if (
    existing?.importedRoute &&
    ["departure", "destination", "route"].some(
      (field) => data[field] !== undefined && data[field] !== existing[field],
    )
  ) {
    data.importedRoute = null;
  }
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
  const fuel = data.fuel ?? existing?.fuel ?? 0;
  const previousUnit = existing?.fuelUnit ?? "US gal";
  const unit = data.fuelUnit ?? previousUnit;
  if (unit !== "kg" && unit !== "US gal")
    throw badRequest("Choose kg or US gal for planned fuel.");
  if (existing && unit !== previousUnit && data.fuel === undefined)
    throw badRequest("Enter the planned fuel amount in the new unit.");

  let capacity = aircraft.fuelCapacity;
  const density = data.fuelDensityKgPerL ?? existing?.fuelDensityKgPerL;
  if (unit === "kg") {
    if (!(density > 0))
      throw badRequest("Enter the fuel density in kg/L to check the aircraft’s tank capacity.");
    capacity = aircraft.fuelCapacity * litresPerUsGallon * density;
    if (!Number.isFinite(capacity))
      throw badRequest("Enter a valid fuel density in kg/L.");
  } else {
    data.fuelDensityKgPerL = undefined;
  }
  if (fuel > capacity) {
    const limit = unit === "kg"
      ? `${capacity.toLocaleString("en-US", { maximumFractionDigits: 3 })} kg at ${density} kg/L (${aircraft.fuelCapacity} US gal)`
      : `${capacity} US gal`;
    throw badRequest(`Planned fuel exceeds the aircraft's capacity of ${limit}.`);
  }
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
