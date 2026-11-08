# AeroEFB API

Copy `.env.example` to `.env`, start a local MongoDB instance, and run `npm install` and `npm start` in this folder. The default API address is `http://localhost:5001/api`. The React development server uses port 5173. Set a unique, long `SESSION_SECRET` for deployment and use HTTPS in production.

The API uses Express routes, controllers, Mongoose models, and cookie sessions stored in MongoDB. Every aircraft, flight, logbook entry and NOTAM belongs to the signed-in user. Sign-in is required to access records, and new accounts start empty. Legacy demo sessions are rejected and cleared.

## Weather and NOTAM availability

Weather uses the free [Aviation Weather Center API](https://aviationweather.gov/data/api/) through the server. It requests METAR and TAF reports for the selected ICAO airports, caches successful results for three minutes, and reports missing data and upstream failures explicitly.

Live NOTAM retrieval is **unsupported in this version**. `POST /api/notams/refresh` returns HTTP 503 with an explanatory message. There are no NOTAM provider environment settings that enable it. Manual NOTAM entry, date/source recording, review status and filtering in the client are supported. Obtain real notices through an official briefing service and record their source.

The [ICAO API service](https://dataservices.icao.int/) requires an account and API key. Its current public landing page does not expose a verifiable real-time NOTAM endpoint and response contract, so this project does not guess a URL or claim an integration works.
