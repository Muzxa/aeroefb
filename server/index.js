const mongoose = require("mongoose");
const app = require("./app");

const port = Number(process.env.PORT) || 5001;

async function start() {
  try {
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aeroefb",
      { serverSelectionTimeoutMS: 5000 },
    );
    app.listen(port, () =>
      console.log(`AeroEFB API running at http://localhost:${port}`),
    );
  } catch (error) {
    console.error(
      "Could not start AeroEFB. Check that MongoDB is running:",
      error.message,
    );
    process.exit(1);
  }
}

start();
