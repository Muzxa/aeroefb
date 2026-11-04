import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import { setUser } from "./store/store";
import { api, setCacheUser } from "./api";
import Icon from "./components/Icon";
import Auth from "./components/Auth";
import Dashboard from "./pages/Dashboard";
import Flights from "./pages/Flights";
import Aircraft from "./pages/Aircraft";
import Logbook from "./pages/Logbook";
import Balance from "./pages/Balance";
import Briefing from "./pages/Briefing";
import Profile from "./pages/Profile";

const navigation = [
  ["/", "dashboard", "Overview"],
  ["/flights", "route", "Flight planning"],
  ["/aircraft", "aircraft", "My aircraft"],
  ["/balance", "balance", "Weight & balance"],
  ["/weather", "cloud", "Weather briefing"],
  ["/notams", "notam", "NOTAM briefing"],
  ["/logbook", "book", "Pilot logbook"],
];

export default function App() {
  const user = useSelector((state) => state.pilot.user);
  const dispatch = useDispatch();
  const [data, setData] = useState({
    aircraft: [],
    flights: [],
    logbook: [],
    notams: [],
  });
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [message, setMessage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [now, setNow] = useState(new Date());
  const main = useRef(null);
  const menuToggle = useRef(null);
  const sidebarNav = useRef(null);
  const location = useLocation();
  const current =
    location.pathname === "/login"
      ? "Sign in"
      : navigation.find(([path]) => path === location.pathname)?.[2] ||
        "Pilot profile";

  function notify(text, type = "success") {
    setMessage({ text, type });
  }
  async function loadData(pilot) {
    setCacheUser(pilot._id);
    const [aircraft, flights, logbook, notams] = await Promise.all(
      ["/aircraft", "/flights", "/logbook", "/notams"].map((path) => api(path)),
    );
    setData({ aircraft, flights, logbook, notams });
    dispatch(setUser(pilot));
  }
  async function refresh() {
    await loadData(await api("/auth/me"));
  }
  async function start() {
    setLoading(true);
    setBootError("");
    try {
      const pilot = await api("/auth/me");
      await loadData(pilot);
    } catch (error) {
      if (error.status === 401) {
        dispatch(setUser(null));
        setCacheUser(null);
        setData({ aircraft: [], flights: [], logbook: [], notams: [] });
      } else {
        setBootError(error.message);
      }
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    start();
  }, []);
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    const escape = (event) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        menuToggle.current?.focus();
      }
    };
    window.addEventListener("keydown", escape);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
      clearInterval(timer);
      window.removeEventListener("keydown", escape);
    };
  }, []);
  useEffect(() => {
    setMenuOpen(false);
    document.title = `${current} · AeroEFB`;
    if (!loading) {
      window.scrollTo(0, 0);
      main.current?.focus({ preventScroll: true });
    }
  }, [location.pathname]);
  useEffect(() => {
    if (menuOpen) sidebarNav.current?.querySelector("nav a")?.focus();
  }, [menuOpen]);
  useEffect(() => {
    if (!message || message.type === "error") return;
    const timer = setTimeout(() => setMessage(null), 6000);
    return () => clearTimeout(timer);
  }, [message]);
  async function signedIn(pilot) {
    setLoading(true);
    dispatch(setUser(pilot));
    setData({ aircraft: [], flights: [], logbook: [], notams: [] });
    try {
      await loadData(pilot);
      notify(`Welcome aboard, ${pilot.name.split(" ")[0]}.`);
    } catch (error) {
      setBootError(error.message);
      notify(error.message, "error");
    } finally {
      setLoading(false);
    }
  }
  async function logout() {
    try {
      await api("/auth/logout", { method: "POST" });
      try {
        Object.keys(localStorage)
          .filter((key) => key.startsWith(`aeroefb:${user._id}:`))
          .forEach((key) => localStorage.removeItem(key));
      } catch {
        /* Browser storage may be unavailable. */
      }
      dispatch(setUser(null));
      setCacheUser(null);
      setData({ aircraft: [], flights: [], logbook: [], notams: [] });
      setMessage(null);
    } catch (error) {
      notify(error.message, "error");
    }
  }
  const props = { user, ...data, refresh, notify, online };
  if (loading)
    return (
      <div className="loading-screen" role="status">
        <span className="brand-mark">
          <Icon name="plane" size={32} />
        </span>
        <strong>AeroEFB</strong>
        <p>Preparing your flight deck…</p>
        <div className="loading-line" />
      </div>
    );
  if (!user && location.pathname !== "/login") {
    return <Navigate to="/login" replace />;
  }
  if (!user)
    return (
      <main className="auth-screen">
        <div className="auth-brand">
          <span className="brand-mark">
            <Icon name="plane" size={25} />
          </span>
          <strong>
            Aero<span>EFB</span>
          </strong>
        </div>
        {bootError && (
          <div className="boot-error" role="alert">
            <p>{bootError}</p>
            <button className="button secondary" onClick={start}>
              Retry connection
            </button>
          </div>
        )}
        <div className="card auth-card">
          <Auth onSuccess={signedIn} />
        </div>
      </main>
    );
  if (location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      {menuOpen && (
        <button
          className="sidebar-backdrop"
          aria-label="Close navigation"
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside
        className={`sidebar ${menuOpen ? "open" : ""}`}
        aria-label="Workspace navigation"
        id="workspace-navigation"
        ref={sidebarNav}
      >
        <Link className="brand" to="/" aria-label="AeroEFB overview">
          <span className="brand-mark">
            <Icon name="plane" size={26} />
          </span>
          <span>
            Aero<span className="brand-light">EFB</span>
            <small>YOUR FLIGHT. ORGANIZED.</small>
          </span>
        </Link>
        <div className="workspace-switch">
          <span className="workspace-avatar">
            <Icon name="compass" size={20} />
          </span>
          <div>
            <strong>Pilot workspace</strong>
            <span>Personal account</span>
          </div>
          <Icon name="shield" size={17} />
        </div>
        <span className="nav-label">FLIGHT OPERATIONS</span>
        <nav>
          {navigation.map(([path, icon, label]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon name={icon} />
              <span>{label}</span>
              {path === "/flights" &&
                data.flights.filter((f) => f.status === "Planned").length >
                  0 && (
                  <span className="nav-count">
                    {data.flights.filter((f) => f.status === "Planned").length}
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className="nav-item profile-nav" to="/profile">
            <Icon name="settings" />
            <span>Pilot profile</span>
          </NavLink>
          <button className="sidebar-user" onClick={logout} title="Sign out">
            <span className="user-avatar">
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")}
            </span>
            <span>
              <strong>{user.name}</strong>
              <small>{user.license || "Student pilot"}</small>
            </span>
            <Icon name="logout" size={18} />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </aside>
      <div className="app-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label="Open navigation"
              aria-controls="workspace-navigation"
              ref={menuToggle}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(!menuOpen)}
            >
              <Icon name="menu" />
            </button>
            <span className="topbar-workspace">Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <span className="breadcrumb-current">{current}</span>
          </div>
          <div className="topbar-right">
            <span className="utc-clock">
              <Icon name="clock" size={16} />
              {now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "UTC",
              })}{" "}
              <span>UTC</span>
            </span>
            <span className={`connection-status ${online ? "" : "offline"}`}>
              <span className="status-dot" />
              {online ? "Online" : "Offline · read only"}
            </span>
            <Link
              className="top-avatar"
              to="/profile"
              aria-label={`Pilot profile for ${user.name}`}
            >
              {user.name
                .split(" ")
                .slice(0, 2)
                .map((s) => s[0])
                .join("")}
            </Link>
          </div>
        </header>
        {!online && (
          <div className="offline-banner" role="status">
            <Icon name="info" size={18} /> You are offline. Read saved
            information; reconnect to save changes. Weather may be out of date.
          </div>
        )}
        <main
          id="main-content"
          ref={main}
          tabIndex="-1"
          className="main-content"
        >
          {message && (
            <div
              className={`notification ${message.type}`}
              role={message.type === "error" ? "alert" : "status"}
            >
              <Icon
                name={message.type === "error" ? "info" : "check"}
                size={19}
              />
              <span>{message.text}</span>
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setMessage(null)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard {...props} />} />
            <Route path="/flights" element={<Flights {...props} />} />
            <Route path="/aircraft" element={<Aircraft {...props} />} />
            <Route path="/balance" element={<Balance {...props} />} />
            <Route
              path="/weather"
              element={<Briefing mode="weather" {...props} />}
            />
            <Route
              path="/notams"
              element={<Briefing mode="notams" {...props} />}
            />
            <Route path="/logbook" element={<Logbook {...props} />} />
            <Route path="/profile" element={<Profile {...props} />} />
            <Route
              path="*"
              element={
                <div className="card empty-state">
                  <h1>That page isn’t on your route.</h1>
                  <Link className="button" to="/">
                    Back to overview
                  </Link>
                </div>
              }
            />
          </Routes>
        </main>
      </div>
    </>
  );
}
