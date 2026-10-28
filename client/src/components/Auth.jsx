import { useState } from "react";
import { api } from "../api";
import Icon from "./Icon";

export default function Auth({ onSuccess }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      onSuccess(await api(`/auth/${mode}`, { method: "POST", body: form }));
    } catch (error) {
      setError(error.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-content">
      <div className="auth-symbol">
        <Icon name="plane" size={32} />
      </div>
      <p className="eyebrow">YOUR PERSONAL FLIGHT DECK</p>
      <h1>{mode === "login" ? "Welcome aboard." : "Start your journey."}</h1>
      <div className="auth-tabs">
        <button
          type="button"
          className={mode === "login" ? "selected" : ""}
          onClick={() => {
            setMode("login");
            setError("");
          }}
        >
          Sign in
        </button>
        <button
          type="button"
          className={mode === "register" ? "selected" : ""}
          onClick={() => {
            setMode("register");
            setError("");
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit}>
        {mode === "register" && (
          <label className="field">
            Full name
            <input
              required
              maxLength="80"
              autoComplete="name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        )}
        <label className="field">
          Email address
          <input
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label className="field">
          Password
          <input
            type="password"
            required
            minLength="8"
            maxLength="128"
            autoComplete={
              mode === "login" ? "current-password" : "new-password"
            }
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <small>At least 8 characters.</small>
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button auth-submit" disabled={busy}>
          {busy
            ? "Please wait…"
            : mode === "login"
              ? "Sign in"
              : "Create account"}
          <Icon name="arrow" size={18} />
        </button>
      </form>
    </div>
  );
}
