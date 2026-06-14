import { useState, useEffect, useMemo } from "react";
import { TrendingUp, TrendingDown, LineChart } from "lucide-react";

// label = button text, interval = how each point is bucketed on the server
const PERIODS = [
  { label: "1일", interval: "day" },
  { label: "1주", interval: "week" },
  { label: "1달", interval: "month" },
  { label: "1년", interval: "year" },
];
const LABEL_BY_INTERVAL = Object.fromEntries(
  PERIODS.map((p) => [p.interval, p.label])
);

// chart geometry (SVG user units; scales responsively via viewBox)
const W = 760;
const H = 360;
const PAD = { top: 24, right: 24, bottom: 36, left: 56 };

// axis label depends on the bucket size — "2026-06-15" ->
//   year: "2026" · month: "26.6" · day/week: "6/15"
function fmtLabel(date, interval) {
  const [y, m, d] = date.split("-");
  if (interval === "year") return y;
  if (interval === "month") return `${y.slice(2)}.${Number(m)}`;
  return `${Number(m)}/${Number(d)}`;
}

function MarketTrend() {
  const [period, setPeriod] = useState("day");
  const [hover, setHover] = useState(null);
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error

  function selectPeriod(p) {
    if (p === period) return;
    setPeriod(p);
    setStatus("loading");
    setData([]);
    setHover(null);
  }

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/market/chart?interval=${period}`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const series = (d.chartData || [])
          .filter((p) => Number.isFinite(p.close))
          .map((p) => ({
            label: fmtLabel(p.date, period),
            date: p.date,
            value: p.close,
          }));
        setData(series);
        setStatus(series.length ? "ready" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [period]);

  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;

    const innerW = W - PAD.left - PAD.right;
    const innerH = H - PAD.top - PAD.bottom;

    const x = (i) =>
      PAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => PAD.top + innerH - ((v - min) / range) * innerH;

    const points = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.value) }));
    const line = points.map((p) => `${p.cx},${p.cy}`).join(" ");
    const area = `${PAD.left},${PAD.top + innerH} ${line} ${PAD.left + innerW},${
      PAD.top + innerH
    }`;

    // headline change = the most recent step for the selected interval
    // (1일 → latest day vs previous day, 1주 → latest week vs previous week, …)
    const last = values[values.length - 1];
    const prev = values.length > 1 ? values[values.length - 2] : last;
    const change = last - prev;
    const changePct = prev ? (change / prev) * 100 : 0;

    return { points, line, area, min, max, last, change, changePct, isUp: change >= 0 };
  }, [data]);

  const isUp = chart ? chart.isUp : true;
  const stroke = isUp ? "#16a34a" : "#ef4444";
  const fillId = isUp ? "kospiUp" : "kospiDown";
  const active = chart ? hover ?? chart.points[chart.points.length - 1] : null;

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h2 className="text-2xl font-bold text-[#081633]">KOSPI</h2>
          <p className="text-xs text-gray-400 mt-0.5">코스피 지수 · Korea Composite</p>
        </div>

        {chart && (
          <span
            className={`px-4 py-2 rounded-full text-sm font-semibold ${
              isUp ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"
            }`}
          >
            {isUp ? "+" : ""}
            {chart.changePct.toFixed(2)}% · {LABEL_BY_INTERVAL[period]}
          </span>
        )}
      </div>

      {chart && (
        <div className="flex items-end gap-3 mb-4">
          <span className="text-3xl font-bold text-[#081633] tabular-nums">
            {chart.last.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          <span
            className={`flex items-center gap-1 text-sm font-semibold mb-1 ${
              isUp ? "text-green-500" : "text-red-500"
            }`}
          >
            {isUp ? <TrendingUp size={15} /> : <TrendingDown size={15} />}
            {isUp ? "+" : ""}
            {chart.change.toFixed(2)} ({isUp ? "+" : ""}
            {chart.changePct.toFixed(2)}%)
          </span>
        </div>
      )}

      <div className="rounded-2xl border border-gray-100 bg-gray-50/40 p-2">
        {status === "loading" && (
          <div className="h-[300px] flex items-center justify-center text-gray-400 text-sm">
            Loading KOSPI…
          </div>
        )}

        {status === "error" && (
          <div className="h-[300px] flex flex-col items-center justify-center text-gray-400 gap-2">
            <LineChart size={28} />
            <p className="text-sm">No index data available</p>
          </div>
        )}

        {status === "ready" && chart && (
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="w-full h-[300px]"
            preserveAspectRatio="none"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="kospiUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="kospiDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* horizontal grid + y axis labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((t) => {
              const gy = PAD.top + (H - PAD.top - PAD.bottom) * t;
              const val = chart.max - (chart.max - chart.min) * t;
              return (
                <g key={t}>
                  <line
                    x1={PAD.left}
                    y1={gy}
                    x2={W - PAD.right}
                    y2={gy}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text
                    x={PAD.left - 10}
                    y={gy + 4}
                    textAnchor="end"
                    fontSize="11"
                    fill="#9ca3af"
                  >
                    {val.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </text>
                </g>
              );
            })}

            {/* area + line */}
            <polygon points={chart.area} fill={`url(#${fillId})`} />
            <polyline
              points={chart.line}
              fill="none"
              stroke={stroke}
              strokeWidth="2.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {/* x axis labels */}
            {chart.points.map((p, i) => {
              const show =
                chart.points.length <= 8 ||
                i % Math.ceil(chart.points.length / 7) === 0;
              return show ? (
                <text
                  key={i}
                  x={p.cx}
                  y={H - PAD.bottom + 20}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#9ca3af"
                >
                  {p.label}
                </text>
              ) : null;
            })}

            {/* hover crosshair + marker */}
            {active && (
              <>
                <line
                  x1={active.cx}
                  y1={PAD.top}
                  x2={active.cx}
                  y2={H - PAD.bottom}
                  stroke={stroke}
                  strokeWidth="1"
                  strokeOpacity="0.35"
                />
                <circle
                  cx={active.cx}
                  cy={active.cy}
                  r="5"
                  fill="white"
                  stroke={stroke}
                  strokeWidth="2.5"
                />
              </>
            )}

            {/* invisible hit targets for hover */}
            {chart.points.map((p, i) => {
              const segW =
                (W - PAD.left - PAD.right) / Math.max(chart.points.length, 1);
              return (
                <rect
                  key={`hit-${i}`}
                  x={p.cx - segW / 2}
                  y={PAD.top}
                  width={segW}
                  height={H - PAD.top - PAD.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(p)}
                />
              );
            })}
          </svg>
        )}
      </div>

      {/* period toggle + hover readout */}
      <div className="flex items-center justify-between mt-3 text-sm">
        <div className="flex gap-1 bg-gray-100 rounded-full p-1">
          {PERIODS.map((p) => (
            <button
              key={p.interval}
              onClick={() => selectPeriod(p.interval)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                period === p.interval
                  ? "bg-white text-[#081633] shadow-sm"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {active && (
          <div className="text-gray-500 tabular-nums">
            <span className="text-gray-400">{active.date}</span>
            <span className="ml-2 font-semibold text-[#081633]">
              {active.value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketTrend;
