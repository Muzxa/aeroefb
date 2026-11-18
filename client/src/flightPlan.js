const airportCode = /^[A-Z]{4}$/;
const runwayNumber = /^(?:0[1-9]|[12][0-9]|3[0-6])[LCR]?$/;

function child(parent, name) {
  return parent?.querySelector(`:scope > ${CSS.escape(name)}`);
}

function readText(parent, name) {
  return child(parent, name)?.textContent.trim() || "";
}

function coordinate(value, hemispheres, max) {
  const match = value?.trim().match(
    /^([NSEW])\s*(\d{1,3})\s*°\s*(\d{1,2})\s*['′]\s*(\d{1,2}(?:\.\d+)?)\s*["″]$/i,
  );
  if (!match || !hemispheres.includes(match[1].toUpperCase())) return null;

  const [, hemisphere, degrees, minutes, seconds] = match;
  const magnitude = Number(degrees) + Number(minutes) / 60 + Number(seconds) / 3600;
  if (Number(minutes) >= 60 || Number(seconds) >= 60 || magnitude > max) return null;
  return /^[SW]$/i.test(hemisphere) ? -magnitude : magnitude;
}

function simBriefPoint(node, id, type) {
  const lat = readText(node, "pos_lat");
  const lon = readText(node, "pos_long");
  const latitude = Number(lat);
  const longitude = Number(lon);
  if (!id || id.length > 50 || !type || type.length > 32 ||
      !lat || !lon || !Number.isFinite(latitude) || Math.abs(latitude) > 90 ||
      !Number.isFinite(longitude) || Math.abs(longitude) > 180)
    throw new Error(`Invalid SimBrief waypoint: ${id || "missing identifier"}.`);
  return { id, type, latitude, longitude };
}

function readSimBrief(ofp) {
  const origin = child(ofp, "origin");
  const arrival = child(ofp, "destination");
  const general = child(ofp, "general");
  const times = child(ofp, "times");
  const departure = readText(origin, "icao_code").toUpperCase();
  const destination = readText(arrival, "icao_code").toUpperCase();
  const alternate = readText(child(ofp, "alternate"), "icao_code").toUpperCase();
  if (!airportCode.test(departure) || !airportCode.test(destination) ||
      departure === destination || (alternate && !airportCode.test(alternate)))
    throw new Error("Invalid airport codes in the SimBrief report.");

  const rules = readText(child(ofp, "atc"), "flight_rules").toUpperCase();
  const flightRules = { I: "IFR", V: "VFR", IFR: "IFR", VFR: "VFR" }[rules];
  const altitudeText = readText(general, "initial_altitude");
  const altitude = Number(altitudeText);
  if (!flightRules || !altitudeText || !Number.isInteger(altitude) || altitude < 0 || altitude > 60000)
    throw new Error("Invalid flight rules or initial altitude in the SimBrief report.");

  const fixes = child(ofp, "navlog")?.querySelectorAll(":scope > fix");
  if (!fixes?.length) throw new Error("The SimBrief report has no navigation log.");
  const waypoints = Array.from(fixes, (fix) => {
    const id = readText(fix, "ident").toUpperCase();
    const type = readText(fix, "type").toUpperCase();
    return simBriefPoint(fix, id, type === "APT" ? "AIRPORT" : type);
  });
  if (waypoints[0].id !== departure || waypoints[0].type !== "AIRPORT")
    waypoints.unshift(simBriefPoint(origin, departure, "AIRPORT"));
  if (waypoints.at(-1).id !== destination || waypoints.at(-1).type !== "AIRPORT")
    waypoints.push(simBriefPoint(arrival, destination, "AIRPORT"));
  const route = waypoints.slice(1, -1).map(({ id }) => id).join(" ");
  if (route.length > 1000) throw new Error("The imported route exceeds 1,000 characters.");

  const out = readText(times, "sched_out");
  const scheduled = new Date(Number(out) * 1000);
  if (out && (!/^\d+$/.test(out) || !Number.isFinite(scheduled.getTime())))
    throw new Error("Invalid scheduled departure in the SimBrief report.");
  const utc = out ? scheduled.toISOString() : "";
  const seconds = Number(readText(times, "est_time_enroute"));
  const aircraftRegistration = readText(child(ofp, "aircraft"), "reg").toUpperCase();
  const units = readText(child(ofp, "params"), "units");
  const rampFuel = readText(child(ofp, "fuel"), "plan_ramp");
  const fuelUnit = /^(kg|kgs)$/i.test(units) ? "kg" :
    /^us\s*gal(?:lons?)?$/i.test(units) ? "US gal" : undefined;
  const hasPlannedFuel = fuelUnit && /^\d+(?:\.\d+)?$/.test(rampFuel) && Number.isFinite(Number(rampFuel));
  const filedRoute = readText(general, "route");
  const notes = [
    [readText(child(ofp, "atc"), "callsign"), aircraftRegistration].filter(Boolean).join(" · "),
    filedRoute && `Filed route: ${filedRoute}`,
    !hasPlannedFuel && rampFuel && units && `Planned ramp fuel: ${rampFuel} ${units}`,
  ].filter(Boolean).join("\n");
  const runway = readText(origin, "plan_rwy").toUpperCase();
  return {
    departure, destination, alternate, flightRules, altitude, route, notes,
    ...(hasPlannedFuel && { fuel: Number(rampFuel), fuelUnit }),
    date: utc.slice(0, 10),
    departureTime: utc.slice(11, 16),
    duration: seconds >= 360 && seconds <= 48 * 3600 ? seconds / 3600 : "",
    aircraftRegistration,
    importedRoute: { departureRunway: runwayNumber.test(runway) ? runway : "", waypoints },
  };
}

export async function readFlightPlan(file) {
  if (!/\.(pln|xml)$/i.test(file.name))
    throw new Error("Choose a SimBrief .xml or Flight Simulator .pln file.");

  const xml = (await file.text()).replace(/^\uFEFF/, "");
  if (/^\s*\[flightplan\]/i.test(xml))
    throw new Error("This .pln uses the older text format. Choose an XML .pln export.");
  if (/<!DOCTYPE\b/i.test(xml))
    throw new Error("This .pln file uses an unsupported XML document type.");

  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror"))
    throw new Error("The flight plan contains invalid XML.");

  const root = document.documentElement;
  if (root.tagName === "OFP") return readSimBrief(root);
  const plan = root.tagName === "SimBase.Document" && child(root, "FlightPlan.FlightPlan");
  if (!plan)
    throw new Error("This file is not a supported Microsoft Flight Simulator flight plan.");

  const departure = readText(plan, "DepartureID").toUpperCase();
  const destination = readText(plan, "DestinationID").toUpperCase();
  const flightRules = readText(plan, "FPType").toUpperCase();
  const altitudeText = readText(plan, "CruisingAlt");
  const altitude = Number(altitudeText);
  if (
    !airportCode.test(departure) ||
    !airportCode.test(destination) ||
    departure === destination
  )
    throw new Error("The .pln file must specify two different four-letter ICAO airports.");
  if (
    !["IFR", "VFR"].includes(flightRules) ||
    !altitudeText ||
    !Number.isInteger(altitude) ||
    altitude < 0 ||
    altitude > 60000
  )
    throw new Error("The .pln file has invalid flight rules or cruise altitude.");

  const waypoints = Array.from(plan.querySelectorAll(":scope > ATCWaypoint"), (node, index) => {
    const type = readText(node, "ATCWaypointType").toUpperCase();
    const ident = readText(child(node, "ICAO"), "ICAOIdent").toUpperCase();
    const id = (type === "AIRPORT" && airportCode.test(ident)
      ? ident
      : node.getAttribute("id")?.trim() || ident).toUpperCase();
    const [lat, lon] = readText(node, "WorldPosition").split(",");
    const latitude = coordinate(lat, "NS", 90);
    const longitude = coordinate(lon, "EW", 180);
    if (
      !id || id.length > 50 || /[\r\n\t]/.test(id) ||
      !type || type.length > 32 || latitude === null || longitude === null
    )
      throw new Error(`Waypoint ${index + 1} (${id || "unknown"}) has an invalid identifier, type or position.`);
    return { id, type, latitude, longitude };
  });

  const first = waypoints[0];
  const last = waypoints.at(-1);
  if (
    waypoints.length < 2 ||
    first.id !== departure || first.type !== "AIRPORT" ||
    last.id !== destination || last.type !== "AIRPORT"
  )
    throw new Error("The .pln route must start at departure and end at destination.");

  const route = waypoints.slice(1, -1).map(({ id }) => id).join(" ");
  if (route.length > 1000)
    throw new Error("The .pln route exceeds the flight form’s 1,000-character limit.");

  const position = readText(plan, "DeparturePosition").toUpperCase();
  const departureRunway = runwayNumber.test(position) ? position : "";
  return {
    departure,
    destination,
    flightRules,
    altitude,
    route,
    notes: readText(plan, "Descr"),
    importedRoute: { departureRunway, waypoints },
  };
}
