# AeroEFB API

Copy `.env.example` to `.env`, start a local MongoDB instance, and run `npm install` and `npm start` in this folder. The default API address is `http://localhost:5001/api`. The React development server uses port 5173. Set a unique, long `SESSION_SECRET` for deployment and use HTTPS in production.

The API uses Express routes, controllers, Mongoose models, and cookie sessions stored in MongoDB. Every aircraft, flight, and logbook entry belongs to the signed-in user. Sign-in is required to access records, and new accounts start empty. Legacy demo sessions are rejected and cleared.

## Aircraft catalog

The aircraft form uses the bundled catalog in `data/aircraft-types.json`. It contains aircraft designators, manufacturers, and model names from Appendix A of [FAA Order JO 7360.1K](https://www.faa.gov/documentLibrary/media/Order/FAA_Order_JO_7360.1K_Aircraft_Type_Designators.pdf). It is a snapshot of the FAA publication.

Users select a catalog model and enter the aircraft's required specs manually.

## Weather and NOTAM availability

Weather uses the free [Aviation Weather Center API](https://aviationweather.gov/data/api/) through the server. It requests METAR and TAF reports for the selected ICAO airports, caches successful results for three minutes, and reports missing data and upstream failures explicitly.

Set `NOTAC_API_KEY` in `server/.env` to enable live retrieval. The authenticated `POST /api/notams/refresh` endpoint accepts `{ "airports": ["OPLA", "OPIS"] }` and returns active airport notices from the [NOTAC search API](https://notac.aero/api/search-notams/). The server fetches all result pages and caches successful lookups for one minute to limit credit use. Live review status is stored per account through `PUT /api/notams/live/:id/review`. Verify notices through the relevant official briefing service before flight.
