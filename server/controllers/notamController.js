const Notam = require("../models/Notam");
const { cleanBody } = require("../middleware/validation");

const fields = [
  "airport",
  "reference",
  "text",
  "startsAt",
  "endsAt",
  "category",
  "source",
  "reviewed",
];

exports.list = async (req, res) => {
  res.json(
    await Notam.find({ user: req.user._id }).sort({ reviewed: 1, startsAt: 1 }),
  );
};

exports.create = async (req, res) => {
  res
    .status(201)
    .json(
      await Notam.create({
        ...cleanBody(req.body, fields),
        user: req.user._id,
      }),
    );
};

exports.update = async (req, res) => {
  const notam = await Notam.findOne({ _id: req.params.id, user: req.user._id });
  if (!notam) return res.status(404).json({ message: "NOTAM not found." });
  notam.set(cleanBody(req.body, fields));
  await notam.save();
  res.json(notam);
};

exports.remove = async (req, res) => {
  const notam = await Notam.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });
  if (!notam) return res.status(404).json({ message: "NOTAM not found." });
  res.json({ message: "NOTAM deleted." });
};

exports.refresh = (req, res) => {
  res.status(503).json({
    message:
      "Live NOTAM retrieval is not supported in this version. Add notices manually from an official briefing source. Training examples are not real NOTAMs.",
    available: false,
  });
};
