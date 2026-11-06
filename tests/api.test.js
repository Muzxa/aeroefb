const { describe, test, before, after } = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const mongoose = require("../server/node_modules/mongoose");
const path = require("node:path");

require("../server/node_modules/dotenv").config({
  path: path.join(__dirname, "../server/.env"),
  quiet: true,
});

const apiUrl = (process.env.API_URL || "http://127.0.0.1:5001/api").replace(
  /\/$/,
  "",
);
const mongoUrl = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/aeroefb";
const prefix = `aeroefb-test-${crypto.randomUUID()}`;
let owner;
let other;

async function request(
  account,
  route,
  method = "GET",
  body,
  expected = 200,
  headers = {},
) {
  const response = await fetch(apiUrl + route, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(account?.cookie ? { Cookie: account.cookie } : {}),
      ...headers,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    expected,
    `${method} ${route}: ${JSON.stringify(data)}`,
  );
  const cookie = response.headers.get("set-cookie");
  if (account && cookie) account.cookie = cookie.split(";")[0];
  return data;
}

async function makeAccount(label) {
  const account = {
    email: `${prefix}-${label}@example.invalid`,
    password: "Example password 123!",
    cookie: "",
  };
  const user = await request(
    account,
    "/auth/register",
    "POST",
    {
      name: `Disposable API test ${label}`,
      email: account.email,
      password: account.password,
    },
    201,
  );
  account._id = user._id;
  assert.equal(user.password, undefined);
  assert.equal(user.passwordHash, undefined);
  return account;
}

function aircraftForm(registration) {
  return {
    registration,
    model: "Synthetic test aircraft",
    emptyWeight: 1600,
    emptyArm: 39,
    maxWeight: 2550,
    cgMin: 35,
    cgMax: 47,
    fuelCapacity: 53,
  };
}

function flightForm(aircraft) {
  return {
    departure: "OPLA",
    destination: "OPIS",
    alternate: "OPPS",
    date: "2026-11-08",
    departureTime: "08:00",
    aircraftId: aircraft._id,
    aircraftRegistration: aircraft.registration,
    duration: 1.4,
    fuel: 28,
    flightRules: "VFR",
    checklist: [false, false, false, false, false],
  };
}

describe("AeroEFB API regression checks", { concurrency: false }, () => {
  before(async () => {
    const health = await request(null, "/health");
    assert.equal(
      health.database,
      "connected",
      "Start MongoDB and the API before running tests.",
    );
    owner = await makeAccount("owner");
    other = await makeAccount("other");
  });

  after(async () => {
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    try {
      // Select by the random run prefix as well as captured IDs, so cleanup still
      // works if a registration succeeds but a later assertion fails.
      const users = await mongoose.connection
        .collection("users")
        .find({ email: { $regex: `^${prefix}-` } })
        .toArray();
      const ids = users.map((user) => user._id);
      for (const collection of [
        "aircrafts",
        "flights",
        "logentries",
        "notams",
      ]) {
        await mongoose.connection
          .collection(collection)
          .deleteMany({ user: { $in: ids } });
      }
      await mongoose.connection
        .collection("users")
        .deleteMany({ _id: { $in: ids } });
      for (const id of ids) {
        await mongoose.connection
          .collection("sessions")
          .deleteMany({ session: { $regex: id.toString() } });
      }
    } finally {
      await mongoose.disconnect();
    }
  });

  test("registration, sign-in and sign-out use a private cookie session", async () => {
    const account = await makeAccount("auth");
    assert.match(account.cookie, /^aeroefb\.sid=/);
    assert.equal((await request(account, "/auth/me"))._id, account._id);
    await request(null, "/auth/me", "GET", undefined, 401);
    const anonymous = { cookie: "" };
    await request(anonymous, "/auth/demo", "POST", {}, 401);
    assert.equal(anonymous.cookie, "", "The removed demo route must not create a session.");
    await request(anonymous, "/auth/me", "GET", undefined, 401);
    for (const route of ["/aircraft", "/flights", "/logbook", "/notams"]) {
      await request(anonymous, route, "GET", undefined, 401);
    }
    assert.deepEqual(await request(account, "/aircraft"), []);
    assert.deepEqual(await request(account, "/flights"), []);
    assert.deepEqual(await request(account, "/logbook"), []);
    assert.deepEqual(await request(account, "/notams"), []);
    await request(account, "/auth/logout", "POST", {});
    await request(account, "/auth/me", "GET", undefined, 401);
    await request(
      account,
      "/auth/login",
      "POST",
      { email: account.email, password: "wrong password" },
      401,
    );
    await request(
      account,
      "/auth/login",
      "POST",
      { email: { $ne: null }, password: account.password },
      400,
    );
    const user = await request(account, "/auth/login", "POST", {
      email: account.email,
      password: account.password,
    });
    assert.equal(user._id, account._id);
    assert.equal(user.passwordHash, undefined);
    assert.equal((await request(account, "/auth/me"))._id, account._id);
    const updated = await request(account, "/auth/profile", "PUT", {
      name: "Updated test pilot",
      homeAirport: "OPLA",
      passwordHash: "not allowed",
      isDemo: true,
    });
    assert.equal(updated.name, "Updated test pilot");
    assert.equal(updated.isDemo, undefined);
    await request(account, "/auth/logout", "POST", {});
    await request(account, "/auth/login", "POST", {
      email: account.email,
      password: account.password,
    });
    const legacy = await makeAccount("legacy");
    const legacyCookie = legacy.cookie;
    await mongoose.connect(mongoUrl, { serverSelectionTimeoutMS: 5000 });
    try {
      await mongoose.connection.collection("users").updateOne(
        { _id: new mongoose.Types.ObjectId(legacy._id) },
        { $set: { isDemo: true } },
      );
    } finally {
      await mongoose.disconnect();
    }
    await request(legacy, "/auth/me", "GET", undefined, 401);
    assert.equal(legacy.cookie, "aeroefb.sid=", "A legacy demo session must be cleared.");
    await request({ cookie: legacyCookie }, "/aircraft", "GET", undefined, 401);
    await request(legacy, "/auth/login", "POST", {
      email: legacy.email,
      password: legacy.password,
    }, 401);
  });

  test("aircraft CRUD isolates records and validates loading limits", async () => {
    const aircraft = await request(
      owner,
      "/aircraft",
      "POST",
      { ...aircraftForm("TEST-A1"), user: other._id },
      201,
    );
    assert.equal(
      aircraft.user,
      owner._id,
      "A client-supplied owner must be ignored.",
    );
    assert.ok(
      (await request(owner, "/aircraft")).some(
        (item) => item._id === aircraft._id,
      ),
    );
    assert.ok(
      !(await request(other, "/aircraft")).some(
        (item) => item._id === aircraft._id,
      ),
    );
    await request(
      other,
      "/aircraft/" + aircraft._id,
      "PUT",
      { model: "Unauthorized change" },
      404,
    );
    await request(other, "/aircraft/" + aircraft._id, "DELETE", undefined, 404);
    await request(
      owner,
      "/aircraft/" + aircraft._id,
      "PUT",
      { cgMin: 100, cgMax: 20 },
      400,
    );
    await request(
      owner,
      "/aircraft/" + aircraft._id,
      "PUT",
      { emptyWeight: -1 },
      400,
    );
    assert.equal(
      (
        await request(owner, "/aircraft/" + aircraft._id, "PUT", {
          notes: "Updated test note",
        })
      ).notes,
      "Updated test note",
    );
    await request(owner, "/aircraft/" + aircraft._id, "DELETE");
    assert.ok(
      !(await request(owner, "/aircraft")).some(
        (item) => item._id === aircraft._id,
      ),
    );
  });

  test("flight ownership, date, checklist and fuel rules protect saved plans", async () => {
    const aircraft = await request(
      owner,
      "/aircraft",
      "POST",
      aircraftForm("TEST-F1"),
      201,
    );
    const plan = await request(
      owner,
      "/flights",
      "POST",
      flightForm(aircraft),
      201,
    );
    assert.ok(
      (await request(owner, "/flights")).some((item) => item._id === plan._id),
    );
    assert.ok(
      !(await request(other, "/flights")).some((item) => item._id === plan._id),
    );
    await request(
      other,
      "/flights/" + plan._id,
      "PUT",
      { notes: "Unauthorized change" },
      404,
    );
    await request(other, "/flights/" + plan._id, "DELETE", undefined, 404);
    await request(other, "/flights", "POST", flightForm(aircraft), 400);
    await request(
      owner,
      "/flights/" + plan._id,
      "PUT",
      { date: "2026-02-30" },
      400,
    );
    await request(
      owner,
      "/flights/" + plan._id,
      "PUT",
      { departureTime: "28:00" },
      400,
    );
    await request(
      owner,
      "/flights/" + plan._id,
      "PUT",
      { destination: "OPLA" },
      400,
    );
    await request(
      owner,
      "/flights/" + plan._id,
      "PUT",
      { checklist: ["false", false, false, false, false] },
      400,
    );
    await request(owner, "/flights/" + plan._id, "PUT", { fuel: 54 }, 400);
    await request(owner, "/aircraft/" + aircraft._id, "DELETE", undefined, 409);
    const updated = await request(owner, "/flights/" + plan._id, "PUT", {
      checklist: [true, true, false, false, false],
      notes: "Reviewed test route",
    });
    assert.deepEqual(updated.checklist, [true, true, false, false, false]);
    await request(owner, "/flights/" + plan._id, "DELETE");
    await request(owner, "/aircraft/" + aircraft._id, "DELETE");
  });

  test("logbook validates time, rejects duplicate flight links and preserves history", async () => {
    const aircraft = await request(
      owner,
      "/aircraft",
      "POST",
      aircraftForm("TEST-L1"),
      201,
    );
    const plan = await request(
      owner,
      "/flights",
      "POST",
      flightForm(aircraft),
      201,
    );
    const form = {
      date: "2026-11-07",
      departure: "OPLA",
      destination: "OPIS",
      aircraftRegistration: aircraft.registration,
      aircraftType: "C172",
      totalTime: 1.4,
      pic: 1.4,
      sic: 0,
      ifr: 0,
      night: 0,
      approaches: 0,
      landings: 1,
      flightId: plan._id,
    };
    await request(other, "/logbook", "POST", form, 400);
    await request(owner, "/logbook", "POST", { ...form, pic: 2 }, 400);
    await request(owner, "/logbook", "POST", { ...form, night: 2 }, 400);
    await request(owner, "/logbook", "POST", { ...form, approaches: 1.5 }, 400);
    const entry = await request(owner, "/logbook", "POST", form, 201);
    await request(owner, "/logbook", "POST", form, 409);
    await request(
      other,
      "/logbook/" + entry._id,
      "PUT",
      { notes: "Unauthorized change" },
      404,
    );
    await request(other, "/logbook/" + entry._id, "DELETE", undefined, 404);
    await request(owner, "/logbook/" + entry._id, "PUT", { sic: 0.5 }, 400);
    const updated = await request(owner, "/logbook/" + entry._id, "PUT", {
      notes: "Completed test exercise",
      ifr: 0.5,
    });
    assert.equal(updated.ifr, 0.5);
    await request(owner, "/flights/" + plan._id, "DELETE");
    const preserved = (await request(owner, "/logbook")).find(
      (item) => item._id === entry._id,
    );
    assert.equal(preserved.flightId, null);
    assert.equal(preserved.notes, "Completed test exercise");
    await request(owner, "/logbook/" + entry._id, "DELETE");
    await request(owner, "/aircraft/" + aircraft._id, "DELETE");
  });

  test("manual NOTAMs isolate records, validate times and save review state", async () => {
    const form = {
      airport: "OPLA",
      reference: "SYNTHETIC TEST ONLY",
      text: "Disposable test notice. Not operational data.",
      startsAt: "2026-11-08T00:00:00Z",
      endsAt: "2026-11-09T00:00:00Z",
      source: "Regression test",
    };
    await request(
      owner,
      "/notams",
      "POST",
      { ...form, endsAt: "2026-11-07T00:00:00Z" },
      400,
    );
    const notam = await request(owner, "/notams", "POST", form, 201);
    assert.ok(
      !(await request(other, "/notams")).some((item) => item._id === notam._id),
    );
    await request(
      other,
      "/notams/" + notam._id,
      "PUT",
      { reviewed: true },
      404,
    );
    await request(other, "/notams/" + notam._id, "DELETE", undefined, 404);
    assert.equal(
      (await request(owner, "/notams/" + notam._id, "PUT", { reviewed: true }))
        .reviewed,
      true,
    );
    await request(owner, "/notams/" + notam._id, "DELETE");
    const unavailable = await request(
      owner,
      "/notams/refresh",
      "POST",
      { airports: ["OPLA"] },
      503,
    );
    assert.equal(unavailable.available, false);
  });

  test("mutations reject an untrusted browser origin and invalid weather queries", async () => {
    await request(
      owner,
      "/auth/profile",
      "PUT",
      { name: "Blocked request" },
      403,
      { Origin: "https://untrusted.example" },
    );
    await request(owner, "/weather?ids=INVALID", "GET", undefined, 400);
    await request(owner, "/flights", "GET", undefined, 200);
  });
});
