# AeroEFB and the course slides

The application uses JavaScript throughout. React is the view, Express handles requests, and Mongoose stores records in MongoDB.

Visitors first see the login page. Registration creates an empty account, and the dashboard shows only the signed-in pilot's saved records.

“MongoDB lecture” below means `Lecture 18 19 - Mongodb.pptx.pdf`.

| Course topic | Slides | Where it appears |
| --- | --- | --- |
| JSX, function components, props and conditional rendering | `react.pdf`, pages 11–29 | `client/src/components/`, `client/src/pages/` |
| Events, controlled forms, state, arrays and spread syntax | `react.pdf`, pages 30–40 and 49–54 | Aircraft, flight, logbook, profile and NOTAM forms |
| React Router and navigation | `react.pdf`, pages 41–48 | `client/src/App.jsx`, `client/src/main.jsx` |
| `useEffect`, data fetching and cleanup | `react.pdf`, pages 57–66 | Initial records, weather requests and connection listeners |
| `useRef` and focusing an element | `react.pdf`, pages 67–71 | Main-content focus and the shared dialog component |
| Normal CSS files | `react.pdf`, page 74 | `client/src/styles.css`, `client/src/pages/records.css`, `client/src/pages/tools.css` |
| Redux slices, store, Provider, selectors and dispatch | `redux.pdf`, pages 8–24 | `client/src/store/store.js`, `client/src/App.jsx`, `client/src/main.jsx` |
| Express routes, controllers, middleware and JSON responses | `Nodejs.pdf`, pages 5–39 | `server/routes/api.js`, `server/controllers/`, `server/app.js` |
| Session authentication and cookie requests | `Nodejs.pdf`, pages 40–50 | `server/controllers/authController.js`, `server/middleware/auth.js`, `client/src/api.js` |
| Schemas, validation, defaults and timestamps | MongoDB lecture, pages 4–13 | `server/models/` |
| ObjectId references and relationships | MongoDB lecture, pages 14–24 | Each aircraft, flight, notice and log entry belongs to a user |
| CRUD, filtering, sorting and async/await | MongoDB lecture, pages 25–40 | `server/controllers/` |

## Small practical additions

- **bcryptjs:** the login slides use example credentials. Real registration needs password hashing, so the server uses `hash` when registering and `compare` when signing in.
- **connect-mongo:** the slides teach server-side sessions. This package saves those sessions in the same MongoDB database so signing in survives a server restart.
- **Vite:** runs and builds the React client. It replaces the Create React App setup command in the slides; the application still uses ordinary React components and JavaScript.
- **Native browser features:** semantic HTML, labelled controls, a native dialog, SVG, print and JSON downloads support the requested interface without a UI framework. `localStorage`, shown in the authentication slides, also stores previously loaded record lists and briefings.

The project does not use TypeScript, Next.js, Tailwind, a UI library, RTK Query, service workers or a second database. Cached copies can be read while the app is open; a full offline reload is not provided.

## A request through the application

1. A controlled React form collects the values in `useState`.
2. `api()` sends JSON with `fetch` and includes the session cookie.
3. An Express route checks the signed-in user and calls its controller.
4. The controller validates the fields and uses a Mongoose model.
5. MongoDB saves the record; Express sends JSON back.
6. React reloads the list and renders it with `map`.

Weather is requested through Express from Aviation Weather Center. A missing report or provider failure is shown as such. NOTAMs support manual imports. Live NOTAM retrieval is not integrated in this version.
