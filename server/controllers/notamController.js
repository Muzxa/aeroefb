const User = require("../models/User");
const { badRequest, cleanBody } = require("../middleware/validation");
const { fetchActiveNotams, NotacError } = require("../services/notac");

exports.refresh = async (req, res) => {
  const input = req.body?.airports;
  if (!Array.isArray(input) || input.some((code) => typeof code !== "string"))
    throw badRequest("Provide an array of airport ICAO codes.");
  const airports = [...new Set(input.map((code) => code.trim().toUpperCase()))];
  if (
    !airports.length ||
    airports.length > 8 ||
    airports.some((code) => !/^[A-Z]{4}$/.test(code))
  ) {
    throw badRequest("Enter one to eight four-letter ICAO airport codes.");
  }

  const apiKey = process.env.NOTAC_API_KEY?.trim();
  if (!apiKey)
    return res
      .status(503)
      .json({ message: "NOTAC is not configured on the server." });

  let briefing;
  try {
    briefing = await fetchActiveNotams(airports, apiKey);
  } catch (error) {
    if (!(error instanceof NotacError)) throw error;
    return res.status(error.status).json({ message: error.message });
  }

  const reviewed = new Set(req.user.notacReviewed);
  res.set("Cache-Control", "no-store").json({
    ...briefing,
    notices: briefing.notices.map((notice) => ({
      ...notice,
      reviewed: reviewed.has(notice._id),
    })),
  });
};

exports.reviewLive = async (req, res) => {
  const id = req.params.id.toLowerCase();
  const { reviewed } = cleanBody(req.body, ["reviewed"]);
  if (!/^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/.test(id))
    throw badRequest("Invalid NOTAC notice ID.");
  if (reviewed === undefined) throw badRequest("Provide a review status.");

  await User.updateOne(
    { _id: req.user._id },
    { [reviewed ? "$addToSet" : "$pull"]: { notacReviewed: id } },
    { timestamps: false },
  );
  res.sendStatus(204);
};
