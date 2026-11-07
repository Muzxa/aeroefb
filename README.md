# AeroEFB

Electronic Flight Bag for Pilots — Web Programming project.

**Muzzammil Shahid · 23L-1004 · BCS-7A**

A simple MERN application: React with JavaScript and ordinary CSS, Express/Node.js, and MongoDB with Mongoose. No TypeScript, Next.js, Tailwind, component framework, or alternative database.

## Run locally

Requires Node.js 22.12+ (or 24) and a running MongoDB instance.

```bash
npm run install:all
cp server/.env.example server/.env
npm run dev
```

Open **http://127.0.0.1:5173**. The API runs on port **5001**. The default MongoDB database is `aeroefb` at `mongodb://127.0.0.1:27017/aeroefb`. Change `server/.env` to use a different MongoDB URI. Set `SESSION_SECRET` to your own long random string.

On this machine, dependencies are already installed and MongoDB was running during setup.

The first visit opens the login page. Sign in or choose **Create account** to open your dashboard. New accounts start empty, ready for your own aircraft, flight plans, logbook entries and notices.

If you prefer separate terminals:

```bash
npm run dev --prefix server
npm run dev --prefix client
```

## Features

- Registration, sign-in, sign-out, and pilot profile editing. Passwords are hashed; sessions use HTTP-only cookies and MongoDB storage.
- Aircraft profiles with editable weight, arms, CG limits, fuel, cruise, equipment, and notes.
- Flight planning, saved routes, aircraft selection, timing, fuel, and a five-item personal review checklist.
- Weight and balance worksheet: station moments, total weight, CG, maximum weight and fuel-capacity checks, a chart, and printing.
- Live METAR/TAF briefings through the free [Aviation Weather Center API](https://aviationweather.gov/data/api/). No weather API key is needed. Missing reports and provider failures are shown explicitly.
- Saved NOTAMs: manual import, source and validity dates, airport/route filtering, review status, editing, and deletion. **Live NOTAM retrieval is not integrated.** The [ICAO service](https://dataservices.icao.int/) and [FAA API access](https://www.faa.gov/about/initiatives/notam) require provider access.
- Logbook with PIC, SIC, IFR, night, approaches, landings, totals, and CSV export. A saved flight can become a logbook entry; duplicate flight links are blocked.
- Personal JSON export from the profile page.

## Offline reading

The browser keeps previously loaded record lists and weather responses in `localStorage`, scoped to the current account. The app must already be open if the local server becomes unreachable. Reconnect to make changes; a previously loaded weather report is not current weather. Signing out removes that account’s browser cache.

When the local Node server is running, the built app itself can also load without an internet connection. Internet access is needed to retrieve new weather. This project intentionally does not introduce service workers, IndexedDB or a background sync queue because they were not in the supplied slides.

## Accessibility

Uses semantic landmarks, a skip link, labeled forms, native modal dialogs, keyboard navigation, visible two-tone 4px focus rings, high-contrast dark text, 44px controls, responsive layouts, and reduced-motion support. Black/white are the base colors, with `#1E40AF` and `#166534` accents. Weather, loading results, and notice status include text rather than relying only on color. This is not a formal WCAG certification.

## Build and check

```bash
npm run build
npm test
```

`npm test` expects MongoDB and the API to be running. It runs six API regression tests with temporary accounts, covering sessions, required sign-in, rejected legacy demo sessions, validation, ownership, CRUD, logbook links, and origin checks, plus three weather-response unit tests. The tests remove their own data afterward. They do not call external weather services.

To serve the built React application from Express:

```bash
npm run build
npm start
```

Then open **http://localhost:5001**. Restart the server after the first build so Express finds the generated `client/dist` folder. `NODE_ENV=production` requires HTTPS and a real session secret; use `development` for local HTTP.

## Folder guide

```text
client/src/
  components/    Shared icons, dialog, sign-in form, route illustration
  pages/         Dashboard and the project’s feature pages
  store/         Redux Toolkit store for the signed-in pilot
  api.js         Fetch helper and account-scoped browser cache
  App.jsx        Page routing and workspace navigation
  styles.css     Shared accessible styling
server/
  models/        Mongoose schemas and validation
  controllers/   Authentication and resource CRUD
  middleware/    Session authentication and input helpers
  routes/        Express API routes
  app.js         Express middleware and static React serving
  index.js       MongoDB connection and server startup
tests/           Node API regression checks
docs/            Course-concept map
```

See [the course-concept map](docs/COURSE_CONCEPTS.md) for where the supplied slide concepts appear. `bcryptjs` adds password hashing and `connect-mongo` persists the taught Express sessions. Calculations use ordinary JavaScript arithmetic.

The calculator uses a simplified constant CG range and avgas at 6 lb/US gal; it does not replace an approved POH envelope. Route art is a schematic. This student project is not approved for operational flight planning or navigation.

The repository contains both the React client and the Express/MongoDB server.
