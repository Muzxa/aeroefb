const { test, after } = require("node:test");
const assert = require("node:assert/strict");
const weather = require("../server/controllers/weatherController");
const originalFetch = global.fetch;

after(() => {
  global.fetch = originalFetch;
});

async function request(ids) {
  const response = {
    code: 200,
    status(code) {
      this.code = code;
      return this;
    },
    json(data) {
      this.data = data;
      return this;
    },
  };
  await weather.get({ query: { ids } }, response);
  return response;
}

test("a partial weather outage stays explicit and is retried, not cached", async () => {
  let calls = 0;
  global.fetch = async (url) => {
    calls++;
    if (url.includes("/metar?")) throw new Error("Synthetic provider outage");
    return new Response(
      JSON.stringify([{ icaoId: "TSTA", rawTAF: "TEST ONLY" }]),
    );
  };
  const first = await request("TSTA");
  assert.equal(first.code, 200);
  assert.equal(first.data.availability.metars, "unavailable");
  assert.equal(first.data.tafs.length, 1);
  assert.equal(first.data.errors.length, 1);
  await request("TSTA");
  assert.equal(calls, 4, "The failed product must be requested again.");
});

test("a total weather outage returns an error without invented reports", async () => {
  global.fetch = async () => {
    throw new Error("Synthetic provider outage");
  };
  const response = await request("TSTB");
  assert.equal(response.code, 502);
  assert.equal(response.data.errors.length, 2);
  assert.deepEqual(response.data.metars, []);
  assert.deepEqual(response.data.tafs, []);
});

test("successful weather responses retain the fetch timestamp when cached", async () => {
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response(JSON.stringify([{ icaoId: "TSTC" }]));
  };
  const first = await request("TSTC");
  const second = await request("TSTC");
  assert.equal(
    calls,
    2,
    "One request per product; the next briefing uses cache.",
  );
  assert.equal(second.data.cached, true);
  assert.equal(second.data.fetchedAt, first.data.fetchedAt);
});
