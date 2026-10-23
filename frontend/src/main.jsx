
import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Wind,
  RefreshCw,
  CalendarDays,
  Clock3,
  ShieldCheck,
  Activity,
  TrendingUp,
  AlertTriangle,
  Download,
  ExternalLink,
  ChevronDown,
  Zap,
  ArrowLeft,
} from 'lucide-react';
import './styles.css';

const API = import.meta.env.VITE_API_BASE || 'https://windline-jthegaau1-divya-dd72.vercel.app';

const fmt = (n, d = 0) =>
  n == null
    ? '—'
    : Number(n).toLocaleString('en-GB', {
        maximumFractionDigits: d,
        minimumFractionDigits: d,
      });

const shortTime = (iso) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });

const shortDate = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    timeZone: 'UTC',
  });

const deliveryTime = (iso) =>
  new Date(iso).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/London',
  });

function App() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cutoff, setCutoff] = useState('12');
  const [view, setView] = useState('week');
  const [selected, setSelected] = useState('2026-01-15');

  const load = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(
        `${API}/api/analysis?cutoff_hour=${cutoff}`
      );

      if (!response.ok) {
        const body = await response.json();
        throw new Error(body.detail || `API error ${response.status}`);
      }

      setData(await response.json());
    } catch (err) {
      setError(
        `${err.message} — check that the Python API is running on port 8000.`
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [cutoff]);

  const daily = data?.daily || [];

  const selectedDayRows = useMemo(() => {
    if (!data) return [];

    return data.series.filter(
      (row) => row.startTime.slice(0, 10) === selected
    );
  }, [data, selected]);

  const series = useMemo(() => {
    if (!data) return [];

    let rows = data.series;

    if (view === 'day') {
      rows = rows.filter(
        (row) => row.startTime.slice(0, 10) === selected
      );
    } else if (view === 'week') {
      const start = new Date('2026-01-01T00:00:00Z');
      const end = new Date(start.getTime() + 7 * 86400000);

      rows = rows.filter((row) => {
        const time = new Date(row.startTime);
        return time >= start && time < end;
      });
    }

    return rows.map((row) => ({
      ...row,
      label:
        view === 'month'
          ? shortDate(row.startTime)
          : deliveryTime(row.startTime),
      dateLabel: shortDate(row.startTime),
      abs: Math.abs(row.errorMW),
    }));
  }, [data, view, selected]);

  const inspectDay = (date) => {
    setSelected(date);
    setView('day');

    requestAnimationFrame(() => {
      document
        .getElementById('generation-profile')
        ?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
    });
  };

  const download = () => {
    if (!data) return;

    const columns = [
      'startTime',
      'actualMW',
      'forecastMW',
      'errorMW',
      'absoluteErrorMW',
      'publishTime',
      'decisionCutoff',
    ];

    const csv = [
      columns.join(','),
      ...data.series.map((row) =>
        columns
          .map((column) => JSON.stringify(row[column] ?? ''))
          .join(',')
      ),
    ].join('\n');

    const url = URL.createObjectURL(
      new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    );

    const link = document.createElement('a');
    link.href = url;
    link.download = 'wind-forecast-analysis-january-2026.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();

    URL.revokeObjectURL(url);
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Wind size={22} />
          </div>
          <div>
            <b>WINDLINE</b>
            <span>FORECAST INTELLIGENCE</span>
          </div>
        </div>

        <div className="nav-label">WORKSPACE</div>

        <div className="nav-item active">
          <Activity size={17} />
          Forecast overview
        </div>

        <div className="nav-item">
          <TrendingUp size={17} />
          Forecast accuracy
          <span className="nav-dot" />
        </div>

        <div className="nav-label second">DATA &amp; METHODS</div>

        <a
          className="nav-item link"
          href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={16} />
          Elexon data source
        </a>

        <div className="sidebar-bottom">
          <div className="status-icon">
            <ShieldCheck size={18} />
          </div>
          <div>
            <b>Decision support</b>
            <p>
              Not an automated trading signal. Validate before procurement.
            </p>
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="breadcrumb">
            Energy markets <span>/</span> Wind intelligence
          </div>
          <div className="top-actions">
            <span className="period-chip">
              <CalendarDays size={14} /> JAN 2026
            </span>
            <span className="avatar">UK</span>
          </div>
        </header>

        <div className="page-content">
          <section className="hero">
            <div>
              <div className="eyebrow">
                <span className="live-dot" />
                NATIONAL WIND · GREAT BRITAIN
              </div>

              <h1>
                Forecast intelligence,
                <br />
                <em>before the market opens.</em>
              </h1>

              <p>
                Understand the wind generation outlook available at day-ahead
                decision time — and quantify what the forecast got wrong.
              </p>

              <div className="hero-meta">
                <span>
                  <CalendarDays size={15} /> 01–31 January 2026
                </span>
                <span>
                  <Clock3 size={15} /> Hourly delivery intervals
                </span>
              </div>
            </div>

            <div className="hero-visual">
              <div className="orbit orbit-a" />
              <div className="orbit orbit-b" />
              <div className="wind-core">
                <Wind size={62} strokeWidth={1.2} />
              </div>
              <div className="visual-tag tag-top">
                <span className="tiny-dot" /> WIND FORECAST
              </div>
              <div className="visual-tag tag-bottom">
                UK NATIONAL AGGREGATE
              </div>
            </div>
          </section>

          {error && (
            <div className="error-banner">
              <AlertTriangle size={18} />
              <div>
                <b>Could not load analysis</b>
                <p>{error}</p>
              </div>
              <button onClick={load}>Retry</button>
            </div>
          )}

          {loading && !data ? (
            <div className="loading">
              <div className="spinner" />
              <span>Loading January wind data…</span>
            </div>
          ) : (
            data && (
              <>
                {data.source !== 'elexon' && (
                  <div className="demo-banner">
                    <AlertTriangle size={17} />
                    <div>
                      <b>Preview mode · synthetic data</b>
                      <span>
                        {data.sourceNote} The dashboard is usable for UI
                        review, but metrics are not real historical
                        observations.
                      </span>
                    </div>
                  </div>
                )}

                <section className="section-head">
                  <div>
                    <div className="section-kicker">
                      THE DECISION SNAPSHOT
                    </div>
                    <h2>January at a glance</h2>
                  </div>

                  <div className="source-status">
                    <span
                      className={
                        data.source === 'elexon'
                          ? 'source-dot'
                          : 'source-dot demo'
                      }
                    />
                    <span>
                      {data.source === 'elexon'
                        ? 'Elexon BMRS connected'
                        : 'Demo data fallback'}
                    </span>
                    <button
                      className="icon-button"
                      onClick={load}
                      title="Refresh data"
                    >
                      <RefreshCw size={15} />
                    </button>
                  </div>
                </section>

                <div className="kpi-grid">
                  <KPI
                    icon={<Wind size={18} />}
                    label="Mean actual wind"
                    value={`${fmt(data.metrics.actualMeanMW)} MW`}
                    note="Observed generation"
                    tone="blue"
                  />
                  <KPI
                    icon={<Activity size={18} />}
                    label="Mean day-ahead forecast"
                    value={`${fmt(data.metrics.forecastMeanMW)} MW`}
                    note="Selected forecast vintage"
                    tone="mint"
                  />
                  <KPI
                    icon={<Zap size={18} />}
                    label="Mean absolute error"
                    value={`${fmt(data.metrics.maeMW)} MW`}
                    note="Typical miss per interval"
                    tone="amber"
                  />
                  <KPI
                    icon={<TrendingUp size={18} />}
                    label="Forecast bias"
                    value={`${data.metrics.biasMW > 0 ? '+' : ''}${fmt(
                      data.metrics.biasMW
                    )} MW`}
                    note={
                      data.metrics.biasMW > 0
                        ? 'Over-forecast on average'
                        : data.metrics.biasMW < 0
                          ? 'Under-forecast on average'
                          : 'No average bias'
                    }
                    tone="violet"
                  />
                </div>

                <section
                  className="content-grid"
                  id="generation-profile"
                >
                  <div className="panel chart-panel">
                    <div className="panel-header">
                      <div>
                        <div className="section-kicker">
                          ACTUAL VS FORECAST
                        </div>
                        <h3>Wind generation profile</h3>
                        <p>
                          Selected forecast compared with actual outturn
                        </p>
                      </div>

                      <div className="segmented">
                        <button
                          className={view === 'week' ? 'chosen' : ''}
                          onClick={() => setView('week')}
                        >
                          First 7 days
                        </button>
                        <button
                          className={view === 'month' ? 'chosen' : ''}
                          onClick={() => setView('month')}
                        >
                          Month
                        </button>
                        <button
                          className={view === 'day' ? 'chosen' : ''}
                          onClick={() => setView('day')}
                        >
                          One day
                        </button>
                      </div>
                    </div>

                    {view === 'day' && (
                      <div className="day-select">
                        <label>Delivery date</label>
                        <select
                          value={selected}
                          onChange={(event) =>
                            setSelected(event.target.value)
                          }
                        >
                          {daily.map((day) => (
                            <option key={day.date} value={day.date}>
                              {day.date}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    <div className="chart-wrap">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart
                          data={
                            view === 'month'
                              ? data.series.map((row) => ({
                                  ...row,
                                  label: shortDate(row.startTime),
                                }))
                              : series
                          }
                          margin={{
                            top: 10,
                            right: 8,
                            left: 0,
                            bottom: 0,
                          }}
                        >
                          <defs>
                            <linearGradient
                              id="actualFill"
                              x1="0"
                              y1="0"
                              x2="0"
                              y2="1"
                            >
                              <stop
                                offset="0%"
                                stopColor="#38bdf8"
                                stopOpacity={0.22}
                              />
                              <stop
                                offset="95%"
                                stopColor="#38bdf8"
                                stopOpacity={0}
                              />
                            </linearGradient>
                          </defs>

                          <CartesianGrid
                            strokeDasharray="3 5"
                            vertical={false}
                            stroke="#243248"
                          />

                          <XAxis
                            dataKey="label"
                            tick={{ fill: '#8493a8', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            interval={
                              view === 'month'
                                ? Math.max(
                                    0,
                                    Math.floor(data.series.length / 10)
                                  )
                                : 'preserveStartEnd'
                            }
                          />

                          <YAxis
                            tick={{ fill: '#8493a8', fontSize: 11 }}
                            axisLine={false}
                            tickLine={false}
                            width={54}
                            tickFormatter={(value) =>
                              `${Math.round(value / 1000)}k`
                            }
                          />

                          <Tooltip
                            contentStyle={{
                              background: '#111c2d',
                              border: '1px solid #2c3a4f',
                              borderRadius: 10,
                              color: '#f1f5f9',
                            }}
                            labelStyle={{ color: '#94a3b8' }}
                            formatter={(value, name) => [
                              `${fmt(value)} MW`,
                              name === 'actualMW'
                                ? 'Actual generation'
                                : 'Day-ahead forecast',
                            ]}
                          />

                          <Legend
                            wrapperStyle={{
                              fontSize: 12,
                              color: '#9aa9bd',
                              paddingTop: 12,
                            }}
                            formatter={(value) =>
                              value === 'actualMW'
                                ? 'Actual generation'
                                : 'Day-ahead forecast'
                            }
                          />

                          <Area
                            type="monotone"
                            dataKey="actualMW"
                            stroke="#38bdf8"
                            strokeWidth={2}
                            fill="url(#actualFill)"
                            dot={false}
                          />

                          <Line
                            type="monotone"
                            dataKey="forecastMW"
                            stroke="#a3e635"
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4 }}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="chart-foot">
                      <span>
                        <span className="legend-dot blue" /> Actual outturn
                      </span>
                      <span>
                        <span className="legend-dot lime" /> Forecast
                        available at cutoff
                      </span>
                      <span className="foot-note">All values in MW</span>
                    </div>
                  </div>

                  <div className="right-stack">
                    <div className="panel accuracy-panel">
                      <div className="section-kicker">ERROR PROFILE</div>
                      <h3>How far off was it?</h3>
                      <p className="panel-sub">
                        Across {fmt(data.matchedIntervals)} matched hourly
                        intervals
                      </p>

                      <div className="metric-line">
                        <span>Root mean square error</span>
                        <b>
                          {fmt(data.metrics.rmseMW)} <small>MW</small>
                        </b>
                      </div>

                      <div className="metric-line">
                        <span>Mean absolute percentage error</span>
                        <b>
                          {fmt(data.metrics.mapePercent, 1)}
                          <small>%</small>
                        </b>
                      </div>

                      <div className="metric-line">
                        <span>Matched interval coverage</span>
                        <b>
                          {fmt(data.coveragePercent, 1)}
                          <small>%</small>
                        </b>
                      </div>

                      <div className="accuracy-note">
                        <div className="note-icon">
                          <Activity size={16} />
                        </div>
                        <span>
                          MAE describes typical error magnitude. Bias
                          indicates whether the forecast tends to over- or
                          under-predict.
                        </span>
                      </div>
                    </div>

                    <div className="panel decision-panel">
                      <div className="section-kicker">
                        DECISION CONTEXT
                      </div>
                      <h3>Forecast vintage rule</h3>

                      <div className="rule-time">
                        <Clock3 size={17} />
                        <b>{String(cutoff).padStart(2, '0')}:00 UK time</b>
                        <span>on D−1</span>
                      </div>

                      <p>
                        For each delivery interval, the app selects the
                        latest forecast published by the configured cutoff
                        on the previous UK calendar day. This is a
                        transparent pilot assumption, not a claim about the
                        client’s trading desk deadline.
                      </p>

                      <label className="select-label">
                        Day-ahead cutoff
                      </label>

                      <div className="cutoff-control">
                        <select
                          value={cutoff}
                          onChange={(event) =>
                            setCutoff(event.target.value)
                          }
                        >
                          {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18].map(
                            (hour) => (
                              <option value={hour} key={hour}>
                                {String(hour).padStart(2, '0')}:00 UK
                              </option>
                            )
                          )}
                        </select>
                        <ChevronDown size={15} />
                      </div>

                      <div className="latest-publish">
                        <span>Latest selected publish time</span>
                        <b>
                          {data.latestSelectedPublishTime
                            ? shortTime(data.latestSelectedPublishTime)
                            : '—'}{' '}
                          UK
                        </b>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="panel daily-panel">
                  <div className="panel-header">
                    <div>
                      <div className="section-kicker">DAY-BY-DAY</div>
                      <h3>Daily forecast performance</h3>
                      <p>
                        Hourly average MW values summed over delivery hours
                        to estimate energy in MWh.
                      </p>
                    </div>

                    <button className="export-btn" onClick={download}>
                      <Download size={15} />
                      Export intervals CSV
                    </button>
                  </div>

                  <div className="daily-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={daily}
                        margin={{
                          top: 10,
                          right: 10,
                          left: 0,
                          bottom: 0,
                        }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 5"
                          vertical={false}
                          stroke="#243248"
                        />

                        <XAxis
                          dataKey="date"
                          tick={{ fill: '#8493a8', fontSize: 10 }}
                          axisLine={false}
                          tickLine={false}
                          interval={2}
                          tickFormatter={shortDate}
                        />

                        <YAxis
                          tick={{ fill: '#8493a8', fontSize: 11 }}
                          axisLine={false}
                          tickLine={false}
                          width={56}
                          tickFormatter={(value) =>
                            `${Math.round(value / 1000)}k`
                          }
                        />

                        <Tooltip
                          contentStyle={{
                            background: '#111c2d',
                            border: '1px solid #2c3a4f',
                            borderRadius: 10,
                            color: '#f1f5f9',
                          }}
                          formatter={(value, name) => [
                            `${fmt(value)} MWh`,
                            name === 'actualMWh'
                              ? 'Actual wind energy'
                              : 'Forecast wind energy',
                          ]}
                        />

                        <Legend
                          wrapperStyle={{
                            fontSize: 12,
                            color: '#9aa9bd',
                            paddingTop: 12,
                          }}
                          formatter={(value) =>
                            value === 'actualMWh'
                              ? 'Actual wind energy'
                              : 'Forecast wind energy'
                          }
                        />

                        <Bar
                          dataKey="actualMWh"
                          fill="#38bdf8"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={13}
                        />

                        <Bar
                          dataKey="forecastMWh"
                          fill="#a3e635"
                          radius={[3, 3, 0, 0]}
                          maxBarSize={13}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Delivery date</th>
                          <th>Actual energy</th>
                          <th>Forecast energy</th>
                          <th>Daily MAE</th>
                          <th />
                        </tr>
                      </thead>

                      <tbody>
                        {daily.slice(0, 10).map((day) => (
                          <tr
                            key={day.date}
                            className={
                              day.date === selected ? 'row-selected' : ''
                            }
                          >
                            <td>
                              <b>{shortDate(day.date)}</b>
                              <span className="date-muted">{day.date}</span>
                            </td>

                            <td>{fmt(day.actualMWh)} MWh</td>
                            <td>{fmt(day.forecastMWh)} MWh</td>

                            <td>
                              <span className="mae-pill">
                                {fmt(day.maeMW)} MW
                              </span>
                            </td>

                            <td>
                              <button
                                className="text-button"
                                onClick={() => inspectDay(day.date)}
                              >
                                Inspect day ↗
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="table-note">
                      Showing the first 10 days in the table. Export CSV for
                      all matched intervals.
                    </div>
                  </div>
                </section>

                {view === 'day' && (
                  <section
                    className="panel daily-panel inspection-panel"
                    id="day-inspection"
                  >
                    <div className="panel-header">
                      <div>
                        <div className="section-kicker">
                          DELIVERY DETAIL
                        </div>
                        <h3>
                          Hourly forecast inspection — {selected}
                        </h3>
                        <p>
                          Actual generation, selected forecast, forecast
                          error, and publication timestamps.
                        </p>
                      </div>

                      <button
                        className="export-btn"
                        onClick={() => {
                          setView('month');
                          document
                            .getElementById('generation-profile')
                            ?.scrollIntoView({
                              behavior: 'smooth',
                              block: 'start',
                            });
                        }}
                      >
                        <ArrowLeft size={15} />
                        Back to month
                      </button>
                    </div>

                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>Delivery time</th>
                            <th>Actual MW</th>
                            <th>Forecast MW</th>
                            <th>Error MW</th>
                            <th>Forecast published</th>
                            <th>Decision cutoff</th>
                          </tr>
                        </thead>

                        <tbody>
                          {selectedDayRows.map((row) => (
                            <tr key={row.startTime}>
                              <td>{deliveryTime(row.startTime)}</td>
                              <td>{fmt(row.actualMW)} MW</td>
                              <td>{fmt(row.forecastMW)} MW</td>

                              <td>
                                <span className="mae-pill">
                                  {row.errorMW > 0 ? '+' : ''}
                                  {fmt(row.errorMW)} MW
                                </span>
                              </td>

                              <td>{shortTime(row.publishTime)}</td>
                              <td>{shortTime(row.decisionCutoff)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>

                      {selectedDayRows.length === 0 && (
                        <p className="table-note">
                          No matched hourly records are available for this
                          date.
                        </p>
                      )}

                      {selectedDayRows.length > 0 && (
                        <div className="table-note">
                          {selectedDayRows.length} matched delivery hours
                          shown for {selected}.
                        </div>
                      )}
                    </div>
                  </section>
                )}

                <footer>
                  <div className="footer-brand">
                    <div className="mini-mark">
                      <Wind size={14} />
                    </div>
                    <b>WINDLINE</b>
                    <span>Forecast decision support · Pilot v1.0</span>
                  </div>

                  <div className="footer-links">
                    <a
                      href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/FUELHH/stream"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Actuals API <ExternalLink size={12} />
                    </a>

                    <a
                      href="https://bmrs.elexon.co.uk/api-documentation/endpoint/datasets/WINDFOR/stream"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Forecast API <ExternalLink size={12} />
                    </a>
                  </div>
                </footer>
              </>
            )
          )}
        </div>
      </main>
    </div>
  );
}

function KPI({ icon, label, value, note, tone }) {
  return (
    <div className="kpi-card">
      <div className={`kpi-icon ${tone}`}>{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      <div className="kpi-note">{note}</div>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
