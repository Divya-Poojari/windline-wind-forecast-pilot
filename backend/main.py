
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo
from typing import Any
import os
import math

import requests
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI(
    title="Wind Forecast Decision Support API",
    version="1.1.0",
    description=(
        "UK national wind forecast and outturn analysis "
        "using Elexon BMRS data."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

BASE = os.getenv(
    "ELEXON_BASE_URL",
    "https://data.elexon.co.uk/bmrs/api/v1",
)
UK = ZoneInfo("Europe/London")
UTC = timezone.utc


def _records(payload: Any) -> list[dict]:
    """Extract records from common Elexon response shapes."""
    if isinstance(payload, list):
        return payload

    if isinstance(payload, dict):
        for key in ("data", "results", "items"):
            if isinstance(payload.get(key), list):
                return payload[key]

    return []


def _dt(value):
    """Parse an ISO timestamp and return an aware datetime."""
    if not value:
        return None

    try:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))

        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=UTC)

        return parsed
    except (TypeError, ValueError):
        return None


def _num(value):
    """Convert a value to a finite float."""
    try:
        number = float(value)
        return number if math.isfinite(number) else None
    except (TypeError, ValueError):
        return None


def _normalise(rows, forecast=False):
    """Normalize FUELHH actuals or WINDFOR forecast records."""
    output = []

    for row in rows:
        if not forecast:
            if str(row.get("fuelType", "")).upper() != "WIND":
                continue

        start = _dt(row.get("startTime") or row.get("halfHourEndTime"))
        generation = _num(row.get("generation", row.get("quantity")))

        publish_time = (
            _dt(row.get("publishTime")) if forecast else None
        )

        if start is None or generation is None:
            continue

        if forecast and publish_time is None:
            continue

        output.append({
            "startTime": start.astimezone(UTC).isoformat(),
            "generation": generation,
            "publishTime": (
                publish_time.astimezone(UTC).isoformat()
                if publish_time else None
            ),
        })

    return output


def _get_data():
    """Fetch January 2026 wind actuals and forecast publication vintages."""
    actual_url = f"{BASE}/datasets/FUELHH/stream"
    forecast_url = f"{BASE}/datasets/WINDFOR/stream"

    try:
        actual_response = requests.get(
            actual_url,
            params={
                "settlementDateFrom": "2026-01-01",
                "settlementDateTo": "2026-01-31",
            },
            timeout=90,
            headers={"Accept": "application/json"},
        )
        actual_response.raise_for_status()
        actual_rows = _records(actual_response.json())

        forecast_response = requests.get(
            forecast_url,
            params={
                "publishDateTimeFrom": "2025-12-31T00:00:00Z",
                "publishDateTimeTo": "2026-01-31T23:59:59Z",
            },
            timeout=90,
            headers={"Accept": "application/json"},
        )
        forecast_response.raise_for_status()
        forecast_rows = _records(forecast_response.json())

    except requests.RequestException as exc:
        raise RuntimeError(f"Elexon API request failed: {exc}") from exc
    except ValueError as exc:
        raise RuntimeError(f"Elexon returned invalid JSON: {exc}") from exc

    actual = _normalise(actual_rows)
    forecasts = _normalise(forecast_rows, forecast=True)

    # January delivery data. Forecasts published in December are retained.
    actual = [
        row for row in actual
        if "2026-01-01" <= row["startTime"][:10] <= "2026-01-31"
    ]

    forecasts = [
        row for row in forecasts
        if "2026-01-01" <= row["startTime"][:10] <= "2026-01-31"
    ]

    if not actual:
        raise RuntimeError(
            "No January 2026 WIND actuals found in FUELHH."
        )

    if not forecasts:
        raise RuntimeError(
            "No January 2026 delivery forecasts found in WINDFOR."
        )

    return actual, forecasts, "elexon"


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "service": "wind-forecast-api",
    }


@app.get("/api/analysis")
def analysis(cutoff_hour: int = 12):
    if cutoff_hour < 0 or cutoff_hour > 23:
        raise HTTPException(
            status_code=400,
            detail="cutoff_hour must be between 0 and 23",
        )

    try:
        actual, forecasts, source = _get_data()
    except RuntimeError as exc:
        raise HTTPException(
            status_code=502,
            detail=str(exc),
        ) from exc

    # FUELHH observations are half-hourly. Aggregate each pair into
    # an hourly average MW value before comparing with hourly WINDFOR.
    actual_groups = {}

    for row in actual:
        timestamp = _dt(row["startTime"])
        if timestamp is None:
            continue

        timestamp = timestamp.astimezone(UTC)
        hour_start = timestamp.replace(
            minute=0, second=0, microsecond=0
        )
        key = hour_start.isoformat()

        actual_groups.setdefault(key, []).append(row["generation"])

    # Only use hours containing exactly two half-hourly observations.
    actual_by = {
        hour: sum(values) / 2.0
        for hour, values in actual_groups.items()
        if len(values) == 2
    }

    # Index all available forecast vintages by delivery hour.
    forecasts_by_hour = {}

    for row in forecasts:
        start = _dt(row["startTime"])
        published = _dt(row["publishTime"])

        if start is None or published is None:
            continue

        start = start.astimezone(UTC)
        hour_start = start.replace(
            minute=0, second=0, microsecond=0
        )
        key = hour_start.isoformat()

        forecast = dict(row)
        forecast["_published"] = published.astimezone(UTC)

        forecasts_by_hour.setdefault(key, []).append(forecast)

    joined = []

    for hour_key, actual_mw in actual_by.items():
        target = _dt(hour_key).astimezone(UK)

        # Decision cutoff is the previous calendar day in UK local time.
        decision_date = target.date() - timedelta(days=1)
        cutoff_local = datetime.combine(
            decision_date,
            datetime.min.time(),
            tzinfo=UK,
        ).replace(hour=cutoff_hour)

        cutoff_utc = cutoff_local.astimezone(UTC)

        eligible = [
            forecast
            for forecast in forecasts_by_hour.get(hour_key, [])
            if forecast["_published"] <= cutoff_utc
        ]

        if not eligible:
            continue

        # Select the most recently published forecast available
        # at the decision cutoff, never a later forecast vintage.
        selected = max(
            eligible,
            key=lambda forecast: forecast["_published"],
        )

        forecast_mw = float(selected["generation"])
        error_mw = forecast_mw - actual_mw

        joined.append({
            "startTime": hour_key,
            "actualMW": round(actual_mw, 2),
            "forecastMW": round(forecast_mw, 2),
            "errorMW": round(error_mw, 2),
            "absoluteErrorMW": round(abs(error_mw), 2),
            "publishTime": selected["publishTime"],
            "decisionCutoff": cutoff_utc.isoformat(),
        })

    joined.sort(key=lambda row: row["startTime"])

    if not joined:
        raise HTTPException(
            status_code=502,
            detail=(
                "Elexon data was retrieved, but no hourly actual/forecast "
                "pairs were available under the selected day-ahead cutoff. "
                "Check forecast vintages and timestamp alignment."
            ),
        )

    errors = [row["errorMW"] for row in joined]
    absolute_errors = [abs(error) for error in errors]
    actual_values = [row["actualMW"] for row in joined]
    forecast_values = [row["forecastMW"] for row in joined]

    mae = sum(absolute_errors) / len(joined)
    rmse = math.sqrt(sum(error ** 2 for error in errors) / len(joined))
    bias = sum(errors) / len(joined)

    mape_values = [
        abs(row["errorMW"]) / row["actualMW"]
        for row in joined
        if row["actualMW"] > 0
    ]

    mape = (
        sum(mape_values) / len(mape_values) * 100
        if mape_values else None
    )

    # Each hourly average MW value contributes one hour of energy:
    # MWh = average MW * 1 hour.
    daily = {}

    for row in joined:
        local_date = (
            _dt(row["startTime"]).astimezone(UK).date().isoformat()
        )

        day = daily.setdefault(local_date, {
            "date": local_date,
            "actualMWh": 0.0,
            "forecastMWh": 0.0,
            "absErrorSum": 0.0,
            "count": 0,
        })

        day["actualMWh"] += row["actualMW"]
        day["forecastMWh"] += row["forecastMW"]
        day["absErrorSum"] += row["absoluteErrorMW"]
        day["count"] += 1

    daily_rows = [
        {
            "date": day_date,
            "actualMWh": round(values["actualMWh"], 1),
            "forecastMWh": round(values["forecastMWh"], 1),
            "maeMW": round(
                values["absErrorSum"] / values["count"], 1
            ),
            "matchedHours": values["count"],
        }
        for day_date, values in sorted(daily.items())
    ]

    latest_publish = max(
        row["publishTime"] for row in joined
    )

    # January 2026 has 744 clock hours in UK local time.
    expected_hours = 31 * 24
    coverage_percent = len(joined) / expected_hours * 100

    return {
        "period": {
            "from": "2026-01-01",
            "to": "2026-01-31",
            "resolution": "1 hour",
            "timezone": "Europe/London",
        },
        "source": source,
        "sourceNote": "Live Elexon BMRS data",
        "sourceError": None,
        "decisionRule": (
            f"Latest forecast published no later than "
            f"{cutoff_hour:02d}:00 UK time on the day before delivery, "
            "selected per delivery hour."
        ),
        "cutoffHourUK": cutoff_hour,
        "latestSelectedPublishTime": latest_publish,
        "matchedIntervals": len(joined),
        "expectedHours": expected_hours,
        "coveragePercent": round(coverage_percent, 1),
        "metrics": {
            "maeMW": round(mae, 1),
            "rmseMW": round(rmse, 1),
            "biasMW": round(bias, 1),
            "mapePercent": (
                round(mape, 2) if mape is not None else None
            ),
            "actualMeanMW": round(
                sum(actual_values) / len(actual_values), 1
            ),
            "forecastMeanMW": round(
                sum(forecast_values) / len(forecast_values), 1
            ),
        },
        "daily": daily_rows,
        "series": joined,
    }
