import { useEffect, useState } from "react";
import Icon from "../components/Icon";
import { api } from "../api";
import "./tools.css";

export default function Profile({
  user,
  aircraft = [],
  flights = [],
  logbook = [],
  notams = [],
  refresh,
  notify,
  online = true,
}) {
  const [form, setForm] = useState({
    name: "",
    license: "",
    homeAirport: "",
    bio: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setForm({
      name: user?.name || "",
      license: user?.license || "",
      homeAirport: user?.homeAirport || "",
      bio: user?.bio || "",
    });
  }, [user?.name, user?.license, user?.homeAirport, user?.bio]);

  function changeField(event) {
    setForm({ ...form, [event.target.name]: event.target.value });
  }

  async function saveProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api("/auth/profile", {
        method: "PUT",
        body: {
          ...form,
          name: form.name.trim(),
          homeAirport: form.homeAirport.trim().toUpperCase(),
        },
      });
      notify("Pilot profile updated.");
      try {
        await refresh();
      } catch (error) {
        notify(
          `Your profile was saved, but the workspace could not be refreshed. ${error.message}`,
          "error",
        );
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  }

  function exportData() {
    const data = {
      exportedAt: new Date().toISOString(),
      profile: user,
      aircraft,
      flights,
      logbook,
      notams,
    };
    const file = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = `aeroefb-backup-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify("Your personal data export has been downloaded.");
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR WORKSPACE</p>
          <h1>Pilot profile</h1>
          <p className="page-intro">
            Your details, your data, your flight bag.
          </p>
        </div>
      </div>
      <div className="profile-layout">
        <section className="card profile-card">
          <div className="profile-identity">
            <div className="profile-avatar" aria-hidden="true">
              {user?.name
                ?.trim()
                .split(/\s+/)
                .map((part) => part[0])
                .slice(0, 2)
                .join("")
                .toUpperCase() || <Icon name="user" />}
            </div>
            <div>
              <h2>{user?.name || "Pilot"}</h2>
              <p className="muted">{user?.email}</p>
            </div>
            <span className="badge green">Pilot account</span>
          </div>
          <form onSubmit={saveProfile}>
            <div className="form-grid">
              <div className="field">
                <label htmlFor="profile-name">Full name</label>
                <input
                  id="profile-name"
                  name="name"
                  value={form.name}
                  onChange={changeField}
                  required
                  minLength="2"
                  maxLength="80"
                  autoComplete="name"
                />
              </div>
              <div className="field">
                <label htmlFor="profile-license">Pilot licence</label>
                <input
                  id="profile-license"
                  name="license"
                  value={form.license}
                  onChange={changeField}
                  maxLength="80"
                  placeholder="Licence type or number"
                />
              </div>
              <div className="field">
                <label htmlFor="profile-airport">Home airport ICAO</label>
                <input
                  id="profile-airport"
                  name="homeAirport"
                  value={form.homeAirport}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      homeAirport: event.target.value.toUpperCase(),
                    })
                  }
                  pattern="[A-Za-z]{4}"
                  maxLength="4"
                  placeholder="OPLA"
                  aria-describedby="profile-airport-help"
                />
                <p className="muted field-help" id="profile-airport-help">
                  Four-letter ICAO code; used as your briefing default.
                </p>
              </div>
              <div className="field">
                <label htmlFor="profile-email">Email address</label>
                <input
                  id="profile-email"
                  value={user?.email || ""}
                  type="email"
                  readOnly
                  aria-describedby="profile-email-help"
                />
                <p className="muted field-help" id="profile-email-help">
                  Your account’s sign-in address.
                </p>
              </div>
              <div className="field full-width">
                <label htmlFor="profile-bio">Pilot notes</label>
                <textarea
                  id="profile-bio"
                  name="bio"
                  value={form.bio}
                  onChange={changeField}
                  rows="4"
                  maxLength="1000"
                  placeholder="A little about your flying, ratings or goals…"
                />
              </div>
            </div>
            {error && (
              <p className="tool-error" role="alert">
                {error}
              </p>
            )}
            {!online && (
              <p className="tool-error" role="status">
                Reconnect to save profile changes.
              </p>
            )}
            <div className="form-actions">
              <button className="button" disabled={saving || !online}>
                <Icon name="check" /> {saving ? "Saving…" : "Save profile"}
              </button>
            </div>
          </form>
        </section>
        <div className="profile-aside">
          <section className="card">
            <div className="tool-card-icon">
              <Icon name="download" />
            </div>
            <h2>Your data belongs to you</h2>
            <p className="muted">
              Download your profile, aircraft, flights, logbook and saved
              notices as a readable JSON file.
            </p>
            <button
              className="button secondary export-button"
              onClick={exportData}
            >
              <Icon name="download" /> Export my data
            </button>
            <p className="muted field-help">
              Keep this file private. It contains your personal flight records.
            </p>
          </section>
          <section className="card">
            <div className="tool-card-icon">
              <Icon name="info" />
            </div>
            <h2>Available on the ground</h2>
            <p className="muted">
              Previously loaded records and weather briefings are saved in this
              browser. If the server cannot be reached, saved copies are read
              only.
            </p>
            <p className="muted">
              The app must already be open to use it without a connection. An
              offline copy can be out of date; always check timestamps.
            </p>
            <span className={`badge ${online ? "green" : "amber"}`}>
              {online ? "Connection available" : "Using saved copies"}
            </span>
          </section>
        </div>
      </div>
      <section className="card workspace-details">
        <div>
          <p className="eyebrow">ABOUT AEROEFB</p>
          <h2>A considered space for every flight.</h2>
          <p className="muted">
            A Web Programming student project built with MongoDB, Express, React
            and Node.js.
          </p>
        </div>
        <dl>
          <div>
            <dt>Student</dt>
            <dd>Muzzammil Shahid</dd>
          </div>
          <div>
            <dt>Roll number / section</dt>
            <dd>23L-1004 · BCS-7A</dd>
          </div>
          <div>
            <dt>Calculation units</dt>
            <dd>Pounds, inches, US gallons</dd>
          </div>
          <div>
            <dt>Account data</dt>
            <dd>Your own aircraft, flight plans and logbook</dd>
          </div>
        </dl>
      </section>
    </>
  );
}
