const Aircraft = require("../models/Aircraft");
const Flight = require("../models/Flight");
const { cleanBody } = require("../middleware/validation");

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
  "model",
  "type",
  "equipment",
  "notes",
  ...numbers,
];

exports.list = async (req, res) => {
  res.json(
    await Aircraft.find({ user: req.user._id }).sort({ registration: 1 }),
  );
};

exports.create = async (req, res) => {
  const data = cleanBody(req.body, fields, numbers);
  res.status(201).json(await Aircraft.create({ ...data, user: req.user._id }));
};

exports.update = async (req, res) => {
  const aircraft = await Aircraft.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!aircraft)
    return res.status(404).json({ message: "Aircraft not found." });
  aircraft.set(cleanBody(req.body, fields, numbers));
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
    status: "Planned",
  });
  if (plannedFlight)
    return res
      .status(409)
      .json({
        message:
          "This aircraft is assigned to a planned flight. Reassign or delete the flight first.",
      });
  await aircraft.deleteOne();
  res.json({ message: "Aircraft deleted." });
};
