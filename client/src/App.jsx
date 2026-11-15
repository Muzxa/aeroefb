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
import {
  AirplaneIcon,
  AirplaneTiltIcon,
  BookOpenTextIcon,
  CheckIcon,
  CloudIcon,
  GearIcon,
  InfoIcon,
  ListIcon,
  PathIcon,
  ScalesIcon,
  SignOutIcon,
  SquaresFourIcon,
  WarningIcon,
  XIcon,
} from "@phosphor-icons/react";
import Auth from "./components/Auth";
import Dashboard from "./pages/Dashboard";
import Flights from "./pages/Flights";
import Aircraft from "./pages/Aircraft";
import Logbook from "./pages/Logbook";
import Balance from "./pages/Balance";
import Briefing from "./pages/Briefing";
import Profile from "./pages/Profile";

const navigation = [
  ["/", SquaresFourIcon, "Overview"],
  ["/flights", PathIcon, "Flight planning"],
  ["/aircraft", AirplaneIcon, "My aircraft"],
  ["/balance", ScalesIcon, "Weight & balance"],
  ["/weather", CloudIcon, "Weather briefing"],
  ["/notams", WarningIcon, "NOTAM briefing"],
  ["/logbook", BookOpenTextIcon, "Pilot logbook"],
];

export default function App() {
  const user = useSelector((state) => state.pilot.user);
  const dispatch = useDispatch();
  const [data, setData] = useState({
    aircraft: [],
    flights: [],
    logbook: [],
  });
  const [loading, setLoading] = useState(true);
  const [bootError, setBootError] = useState("");
  const [message, setMessage] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
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
    const [aircraft, flights, logbook] = await Promise.all(
      ["/aircraft", "/flights", "/logbook"].map((path) => api(path)),
    );
    setData({ aircraft, flights, logbook });
    dispatch(setUser(pilot));
  }
  async function refresh() {
    await loadData(await api("/auth/me"));
  }
  async function refreshAfterChange(message, type = "success") {
    try {
      await refresh();
      notify(message, type);
    } catch (error) {
      notify(`${message} The list could not refresh: ${error.message}`, "error");
    }
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
        setData({ aircraft: [], flights: [], logbook: [] });
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
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
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
    setData({ aircraft: [], flights: [], logbook: [] });
    try {
      await loadData(pilot);
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
      setData({ aircraft: [], flights: [], logbook: [] });
      setMessage(null);
    } catch (error) {
      notify(error.message, "error");
    }
  }
  const plannedCount = data.flights.filter((flight) => flight.status === "Planned").length;
  const props = { user, ...data, refresh, refreshAfterChange, notify, online };
  if (loading)
    return (
      <div className="loading-screen" role="status">
        <span className="brand-mark">
          <AirplaneTiltIcon size={32} />
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
            <AirplaneTiltIcon size={25} />
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
            <AirplaneTiltIcon size={26} />
          </span>
          <span>
            Aero<span className="brand-light">EFB</span>
          </span>
        </Link>
        <nav>
          {navigation.map(([path, NavIcon, label]) => (
            <NavLink
              key={path}
              to={path}
              end={path === "/"}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <NavIcon />
              <span>{label}</span>
              {path === "/flights" && plannedCount > 0 && (
                  <span className="nav-count">
                    {plannedCount}
                  </span>
                )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <NavLink className="nav-item profile-nav" to="/profile">
            <GearIcon />
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
              {user.license && <small>{user.license}</small>}
            </span>
            <SignOutIcon size={18} />
            <span className="sr-only">Sign out</span>
          </button>
        </div>
      </aside>
      <div className="app-shell">
        <div className="topbar">
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            aria-controls="workspace-navigation"
            ref={menuToggle}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <ListIcon />
          </button>
        </div>
        {!online && (
          <div className="offline-banner" role="status">
            <InfoIcon size={18} /> You are offline. Read saved
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
              {message.type === "error" ? <InfoIcon size={19} /> : <CheckIcon size={19} />}
              <span>{message.text}</span>
              <button
                className="icon-button"
                aria-label="Dismiss message"
                onClick={() => setMessage(null)}
              >
                <XIcon size={18} />
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
                  <h1>Page not found</h1>
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
