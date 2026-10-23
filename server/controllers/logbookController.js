const LogEntry = require("../models/LogEntry");
const Flight = require("../models/Flight");
const { cleanBody, badRequest } = require("../middleware/validation");

const numbers = [
  "totalTime",
  "pic",
  "sic",
  "ifr",
  "night",
  "approaches",
  "landings",
];
const fields = [
  "date",
  "departure",
  "destination",
  "aircraftRegistration",
  "aircraftType",
  "notes",
  "flightId",
  ...numbers,
];

async function logData(req) {
  const data = cleanBody(req.body, fields, numbers);
  if (
    data.flightId &&
    !(await Flight.exists({ _id: data.flightId, user: req.user._id }))
  ) {
    throw badRequest("The selected flight does not belong to your account.");
  }
  return data;
}

exports.list = async (req, res) => {
  res.json(
    await LogEntry.find({ user: req.user._id }).sort({
      date: -1,
      createdAt: -1,
    }),
  );
};

exports.create = async (req, res) => {
  const data = await logData(req);
  res.status(201).json(await LogEntry.create({ ...data, user: req.user._id }));
};

exports.update = async (req, res) => {
  const entry = await LogEntry.findOne({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!entry)
    return res.status(404).json({ message: "Logbook entry not found." });
  entry.set(await logData(req));
  await entry.save();
  res.json(entry);
};

exports.remove = async (req, res) => {
  const entry = await LogEntry.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!entry)
    return res.status(404).json({ message: "Logbook entry not found." });
  res.json({ message: "Logbook entry deleted." });
};
