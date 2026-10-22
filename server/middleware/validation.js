function badRequest(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

// Only accept the form fields for this resource. Never copy ownership or IDs.
function cleanBody(body, fields, numberFields = []) {
  if (!body || typeof body !== "object" || Array.isArray(body))
    throw badRequest("Send a JSON object.");
  const data = {};
  for (const field of fields) {
    if (body[field] === undefined) continue;
    const value = body[field];
    if (numberFields.includes(field)) {
      if (
        (typeof value !== "number" && typeof value !== "string") ||
        value === "" ||
        !Number.isFinite(Number(value))
      ) {
        throw badRequest(`${field} must be a number.`);
      }
      data[field] = Number(value);
    } else if (field === "checklist") {
      if (
        !Array.isArray(value) ||
        value.length !== 5 ||
        value.some((item) => typeof item !== "boolean")
      ) {
        throw badRequest(
          "The checklist must contain five true or false values.",
        );
      }
      data[field] = value;
    } else if (field === "reviewed") {
      if (typeof value !== "boolean")
        throw badRequest("Reviewed must be true or false.");
      data[field] = value;
    } else if (field === "flightId" && (value === "" || value === null)) {
      data[field] = null;
    } else {
      if (typeof value !== "string") throw badRequest(`${field} must be text.`);
      data[field] = field === "password" ? value : value.trim();
    }
  }
  return data;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

module.exports = { cleanBody, badRequest, validDate };
