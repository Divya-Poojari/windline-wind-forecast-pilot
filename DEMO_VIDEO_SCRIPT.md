# 10-minute demo video plan (two-part recording)

Record one screen-share video, max 10 minutes, with the application visible. Keep the final YouTube video **Unlisted**. Do not claim deployment is live until you have deployed and verified it in an incognito window.

## Part 1 — Client pitch (0:00–4:50)

**0:00–0:30 | The problem**
“Day-ahead wind uncertainty changes how much dispatchable generation a utility may need. This pilot brings the forecast vintage and its realised error into one view, with the decision-time assumption made explicit.”

**0:30–1:20 | Dashboard and time window**
Point to the January 2026 period, national wind scope, 30-minute resolution, actual-vs-forecast chart and source state. If the source badge says demo fallback, disclose that immediately and do not present synthetic metrics as historical results.

**1:20–2:10 | Forecast vintage**
Show the cutoff control. Explain that the default selects the latest forecast published by 12:00 UK time on D−1 for each delivery interval. This is configurable because the brief does not define the team's exact decision timestamp.

**2:10–3:20 | Quantitative accuracy**
Explain MAE as typical absolute miss, RMSE as more sensitive to large errors, and bias as systematic over/under-forecasting. Explain MAPE's near-zero limitation. Do not imply these metrics directly calculate a procurement volume without demand and portfolio data.

**3:20–4:20 | Daily analysis and export**
Show daily MWh and MAE, inspect a date, and export interval-level CSV for desk analysis.

**4:20–4:50 | Value and next step**
“The pilot makes forecast selection auditable and forecast risk measurable. The next step is to agree the actual decision cutoff, validate API history and data coverage, and run a shadow evaluation with the trading desk.”

## Part 2 — Technical lead review (4:50–9:50)

**4:50–5:30 | Architecture**
React/Vite client → FastAPI service → Elexon BMRS public API. Docker Compose runs the web container and API container. Frontend calls `/api/analysis`; backend owns external data access and metric computation.

**5:30–6:30 | Data flow**
Open `backend/main.py`. Explain source adapter, normalisation, WIND filtering on FUELHH, forecast publication timestamp, exact startTime join and day-ahead vintage selection. Mention that the API adapter tries common query parameter conventions and that live historical coverage must be verified.

**6:30–7:25 | Metrics and assumptions**
Point to MAE/RMSE/bias/MAPE. Explain half-hourly MW-to-MWh conversion (`MW × 0.5`). State the cutoff is a pilot assumption; it must be confirmed with the client. Explain fallback synthetic data is clearly flagged and is never suitable for trading decisions.

**7:25–8:20 | Frontend and API contract**
Show `frontend/src/main.jsx` and `styles.css`. Charts use Recharts. UI includes cutoff selector, period views, daily aggregates, source-state warning and CSV export. API docs are available at `/docs`.

**8:20–9:15 | Run and validate**
Show `docker-compose.yml`; run `docker compose up --build`. Check `/api/health`, `/docs`, then the UI. Demonstrate refresh and CSV export. Explain that Docker makes local setup reproducible.

**9:15–9:50 | Review items / next steps**
Call out production improvements: unit/integration tests, caching/retry/backoff, persisted raw payloads, robust settlement-period keys, data coverage alerts, agreed cutoff, CI, and deployment. Avoid claiming these are already implemented.

## Recording checklist

- Browser zoom 90–100%, hide notifications and personal tabs.
- Start by showing a verified app URL or local app if hosting is not yet configured.
- Verify the app in incognito before recording the deployed URL.
- Keep the video within 10 minutes; set YouTube visibility to Unlisted.
- Paste the actual video URL into the submission form only after upload and access verification.
