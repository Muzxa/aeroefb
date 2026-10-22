const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { cleanBody, badRequest } = require("../middleware/validation");

function publicUser(user) {
  return {
    _id: user._id,
    name: user.name,
    email: user.email,
    license: user.license,
    homeAirport: user.homeAirport,
    bio: user.bio,
  };
}

function signIn(req, userId) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) return reject(error);
      req.session.userId = userId.toString();
      req.session.save((saveError) =>
        saveError ? reject(saveError) : resolve(),
      );
    });
  });
}

exports.me = (req, res) => res.json(publicUser(req.user));

exports.register = async (req, res) => {
  const data = cleanBody(req.body, ["name", "email", "password"]);
  if (!data.name) throw badRequest("Enter your name.");
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
    throw badRequest("Enter a valid email address.");
  if (
    !data.password ||
    data.password.length < 8 ||
    Buffer.byteLength(data.password) > 72
  ) {
    throw badRequest(
      "Use a password of at least 8 characters and at most 72 bytes.",
    );
  }
  const passwordHash = await bcrypt.hash(data.password, 10);
  const user = await User.create({
    name: data.name,
    email: data.email.toLowerCase(),
    passwordHash,
  });
  await signIn(req, user._id);
  res.status(201).json(publicUser(user));
};

exports.login = async (req, res) => {
  const data = cleanBody(req.body, ["email", "password"]);
  if (!data.email || !data.password)
    throw badRequest("Enter your email and password.");
  const user = await User.findOne({
    email: data.email.toLowerCase(),
    isDemo: false,
  }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
    return res.status(401).json({ message: "Email or password is incorrect." });
  }
  await signIn(req, user._id);
  res.json(publicUser(user));
};

exports.logout = (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("aeroefb.sid", {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
    res.json({ message: "Signed out." });
  });
};

exports.profile = async (req, res) => {
  const data = cleanBody(req.body, ["name", "license", "homeAirport", "bio"]);
  if (data.homeAirport && !/^[A-Za-z]{4}$/.test(data.homeAirport))
    throw badRequest("Home airport must be a four-letter ICAO code.");
  req.user.set(data);
  await req.user.save();
  res.json(publicUser(req.user));
};
