# Windline — UK Wind Forecast Decision Support (Pilot v1)

A full-stack pilot for a UK electricity utility's day-ahead procurement team. It compares national wind generation forecasts with actual outturn for delivery intervals in **January 2026**, using only Elexon BMRS `FUELHH` (actuals) and `WINDFOR` (forecasts). Frontend: React + Vite. Backend: Python + FastAPI. Containerised with Docker Compose.

> **Important data integrity note:** the app tries the public Elexon API first. If the API is unavailable or returns no usable January records, it switches to a clearly labelled **synthetic demo fallback** so the UI remains reviewable. Never use fallback metrics for operational or trading decisions. Confirm the source badge before interpreting results.

## What it does

- Shows actual and selected day-ahead forecast wind generation in MW at 30-minute resolution.
- Selects the latest forecast vintage published by the configured cutoff (default **12:00 UK time on the day before delivery**) for each delivery interval.
- Compares forecast with actuals and reports MAE, RMSE, mean bias, MAPE and matched-interval coverage.
- Aggregates daily wind energy in MWh and daily MAE; exports matched intervals as CSV.
- Shows the source state (live Elexon vs synthetic fallback) and links to source API docs.

## Decision-time assumption

The requirement does not specify the utility's precise gate-closure/trading-desk decision timestamp. This pilot therefore uses a transparent, configurable cutoff: latest `publishTime` no later than **D−1 12:00 Europe/London**. This is an assumption for demonstration and must be agreed with the client before operational use. The selected forecast vintage is joined to actuals on `startTime`. Only January 2026 delivery intervals are shown.

## Files and directories

```text
windline/
├── backend/
│   ├── main.py           # FastAPI API, Elexon data adapter, vintage selection, metrics
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend image
├── frontend/
│   ├── src/main.jsx      # React dashboard, charts, filters and CSV export
│   ├── src/styles.css    # Responsive dark energy-market UI
│   ├── index.html        # Vite HTML entry point
│   ├── package.json      # Frontend dependencies and scripts
│   ├── Dockerfile        # Multi-stage React build served by Nginx
│   └── nginx.conf        # SPA fallback configuration
├── docker-compose.yml    # Local full-stack launch
├── .env.example          # Optional environment configuration
├── README.md
└── DEMO_VIDEO_SCRIPT.md  # 10-minute video plan and narration prompts
```

## Run locally (recommended: Docker)

Prerequisites: Docker Desktop / Docker Engine with Compose.

```bash
git clone <your-public-github-repo-url>
cd <repo-folder>
docker compose up --build
```

Open:
- Frontend: http://localhost:3000
- Backend health: http://localhost:8000/api/health
- Interactive API docs: http://localhost:8000/docs

Stop with `Ctrl+C`, then `docker compose down`.

## Run without Docker

Terminal 1 — backend (Python 3.11+ recommended):

```bash
cd backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Terminal 2 — frontend (Node.js 20+):

```bash
cd frontend
npm install
npm run dev
```

Vite prints its local URL (usually http://localhost:5173). The API defaults to `http://localhost:8000`.

## API endpoints

- `GET /api/health` — health check.
- `GET /api/analysis?cutoff_hour=12` — matched intervals, metrics, daily aggregates and series. `cutoff_hour` accepts 0–23 and is interpreted in `Europe/London`.

## Data sources

- Actual generation: [Elexon FUELHH stream docs](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream), filtered to `fuelType = WIND`.
- Forecast generation: [Elexon WINDFOR stream docs](https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream), using `startTime`, `publishTime`, `generation`.
- API base: `https://data.elexon.co.uk/bmrs/api/v1`.

## Metrics

- **MAE (MW):** mean absolute forecast error; interpretable typical error magnitude.
- **RMSE (MW):** square root of mean squared error; penalises larger misses more heavily.
- **Bias (MW):** mean `(forecast − actual)`; positive means average over-forecast.
- **MAPE (%):** mean absolute percentage error over intervals with positive actual generation; can be unstable when actuals are near zero.
- **Daily energy (MWh):** sum of each half-hourly MW value multiplied by 0.5 hours.

## Deployment

### Frontend (Vercel)
1. Push this repo to a public GitHub repository.
2. Import the repository in Vercel and set **Root Directory** to `frontend`.
3. Framework preset: Vite. Build command `npm run build`, output directory `dist`.
4. Add environment variable `VITE_API_BASE` pointing to the deployed backend URL (for example `https://<your-api-host>`).

### Backend (Render / Heroku-compatible Docker host)
This backend is a standard Docker web service. Deploy `backend/` as a Docker service and expose port `8000`; set `ELEXON_BASE_URL=https://data.elexon.co.uk/bmrs/api/v1` if needed. For Render, create a Web Service from the repository with root directory `backend`, environment Docker, and health check `/api/health`. For Heroku, use the container registry workflow and configure the web process/port according to the platform's container guidance. Then set Vercel's `VITE_API_BASE` to the backend's public HTTPS URL and redeploy.

**Deployment status:** this repository is prepared for deployment, but a public Vercel/Heroku URL cannot be created from this local build without access to your GitHub and hosting accounts. Do not submit a made-up deployment URL.

## AI tool disclosure

AI assistance (OpenAI ChatGPT) was used to help draft the initial application structure, API integration logic, dashboard code, documentation and video plan. Review and validate the code and live data behaviour before submission.

## Limitations / next steps

- Historical API query conventions and available forecast vintages can vary; verify returned rows against Elexon's current documentation and use the source badge.
- The default day-ahead cutoff is an explicit pilot assumption, not client-confirmed market process.
- Forecast/actual matching uses exact UTC `startTime` timestamps. If Elexon provides inconsistent timestamp conventions, normalise to the same settlement-period key.
- No demand forecasts, prices, thermal plant availability, portfolio constraints or market bids are included, per scope. This is forecast evaluation, not a procurement optimiser.
- For production: persist raw source payloads, add retry/backoff and caching, structured logs, automated tests, data quality alerts and authentication/observability.
