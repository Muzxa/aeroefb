import { useEffect, useState } from "react";
import { CheckIcon, UserIcon } from "@phosphor-icons/react";
import { api } from "../api";
import "./tools.css";

export default function Profile({
  user,
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

  return (
    <>
      <div className="page-heading">
        <div>
          <h1>Pilot profile</h1>
        </div>
      </div>
      <section className="card profile-card">
        <div className="profile-identity">
          <div className="profile-avatar" aria-hidden="true">
            {user?.name
              ?.trim()
              .split(/\s+/)
              .map((part) => part[0])
              .slice(0, 2)
              .join("")
              .toUpperCase() || <UserIcon />}
          </div>
          <div>
            <h2>{user?.name || "Pilot"}</h2>
            <p className="muted">{user?.email}</p>
          </div>
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
              <CheckIcon /> {saving ? "Saving…" : "Save profile"}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
