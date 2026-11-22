const Aircraft = require("../models/Aircraft");
const Flight = require("../models/Flight");
const { badRequest, cleanBody } = require("../middleware/validation");
const rows = require("../data/aircraft-types.json");

const aircraftCatalog = rows.map(([icaoCode, manufacturer, model]) => ({
  id: [icaoCode, manufacturer, model].join("|"),
  icaoCode,
  manufacturer,
  model,
}));

const catalogById = new Map(aircraftCatalog.map((entry) => [entry.id, entry]));

const numbers = [
  "emptyWeight",
  "emptyArm",
  "maxWeight",
  "cgMin",
  "cgMax",
  "fuelCapacity",
  "fuelBurn",
  "cruiseSpeed",
  "frontArm",
  "rearArm",
  "baggageArm",
  "fuelArm",
];
const fields = [
  "registration",
  "catalogId",
  "type",
  "equipment",
  "notes",
  ...numbers,
];

function aircraftData(body, existing) {
  const data = cleanBody(body, fields, numbers);
  const entry = catalogById.get(data.catalogId ?? existing?.catalogId);
  if (!entry) throw badRequest("Select an aircraft model from the catalog.");
  if (entry.id !== existing?.catalogId && numbers.some((field) => data[field] === undefined))
    throw badRequest("Complete all required aircraft numbers before saving.");

  return {
    ...data,
    catalogId: entry.id,
    icaoCode: entry.icaoCode,
    model: `${entry.manufacturer} ${entry.model}`,
  };
}

exports.catalog = (req, res) => res.json(aircraftCatalog);

exports.list = async (req, res) => {
  res.json(
    await Aircraft.find({ user: req.user._id }).sort({ registration: 1 }),
  );
};

exports.create = async (req, res) => {
  const data = aircraftData(req.body);
  res.status(201).json(await Aircraft.create({ ...data, user: req.user._id }));
};

exports.update = async (req, res) => {
  const aircraft = await Aircraft.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!aircraft)
    return res.status(404).json({ message: "Aircraft not found." });
  aircraft.set(aircraftData(req.body, aircraft));
  await aircraft.save();
  // Saved plans keep their aircraft registration in sync with this profile.
  await Flight.updateMany(
    { aircraftId: aircraft._id, user: req.user._id },
    { aircraftRegistration: aircraft.registration },
  );
  res.json(aircraft);
};

exports.remove = async (req, res) => {
  const aircraft = await Aircraft.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!aircraft)
    return res.status(404).json({ message: "Aircraft not found." });
  const plannedFlight = await Flight.exists({
    user: req.user._id,
    aircraftId: aircraft._id,
  });
  if (plannedFlight)
    return res
      .status(409)
      .json({
        message:
          "This aircraft is assigned to a saved flight. Reassign or delete the flight first.",
      });
  await aircraft.deleteOne();
  res.json({ message: "Aircraft deleted." });
};
