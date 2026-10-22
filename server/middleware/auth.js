const User = require("../models/User");

async function requireAuth(req, res, next) {
  if (!req.session.userId)
    return res.status(401).json({ message: "Please sign in to continue." });
  const user = await User.findById(req.session.userId);
  if (!user || user.isDemo) {
    return req.session.destroy((error) => {
      if (error) return next(error);
      res.clearCookie("aeroefb.sid", {
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
      res.status(401).json({ message: "Please sign in to continue." });
    });
  }
  req.user = user;
  next();
}

module.exports = requireAuth;
