import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

// label = button text, interval = how each point is bucketed on the server
const RANGES = [
  { label: "1D", interval: "day" },
  { label: "1W", interval: "week" },
  { label: "1M", interval: "month" },
  { label: "1Y", interval: "year" },
];
const RANGE_LABEL = Object.fromEntries(RANGES.map((r) => [r.interval, r.label]));

// chart geometry (SVG user units; scales responsively via viewBox)
const CW = 720;
const CH = 240;
const CPAD = { top: 16, right: 16, bottom: 28, left: 56 };

// axis label depends on the bucket size — "2026-06-15" ->
//   year: "2026" · month: "26.6" · day/week: "6/15"
function fmtLabel(date, interval) {
  const [y, m, d] = date.split("-");
  if (interval === "year") return y;
  if (interval === "month") return `${y.slice(2)}.${Number(m)}`;
  return `${Number(m)}/${Number(d)}`;
}

function PriceChart({ symbol }) {
  const [range, setRange] = useState("day");
  const [data, setData] = useState([]);
  const [status, setStatus] = useState("loading"); // loading | ready | error
  const [hover, setHover] = useState(null);
  const [tick, setTick] = useState(0);

  function selectRange(r) {
    if (r === range) return;
    setRange(r);
    setStatus("loading");
    setData([]);
    setHover(null);
  }

  // Periodic silent refresh so the chart's latest point tracks the live price.
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/stocks/${symbol}/chart?interval=${range}`)
      .then((r) => {
        if (!r.ok) throw new Error("request failed");
        return r.json();
      })
      .then((d) => {
        if (cancelled) return;
        const series = (d.chartData || [])
          .filter((p) => Number.isFinite(p.close))
          .map((p) => ({ label: fmtLabel(p.date, range), date: p.date, value: p.close }));
        setData(series);
        setStatus(series.length ? "ready" : "error");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [symbol, range, tick]);

  const chart = useMemo(() => {
    if (data.length === 0) return null;

    const values = data.map((d) => d.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const span = max - min || 1;

    const innerW = CW - CPAD.left - CPAD.right;
    const innerH = CH - CPAD.top - CPAD.bottom;

    const x = (i) =>
      CPAD.left + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
    const y = (v) => CPAD.top + innerH - ((v - min) / span) * innerH;

    const points = data.map((d, i) => ({ ...d, cx: x(i), cy: y(d.value) }));
    const line = points.map((p) => `${p.cx},${p.cy}`).join(" ");
    const area = `${CPAD.left},${CPAD.top + innerH} ${line} ${CPAD.left + innerW},${
      CPAD.top + innerH
    }`;

    // headline change = the most recent step for the selected interval
    // (1D → latest day vs previous day, 1W → latest week vs previous week, …)
    const last = values[values.length - 1];
    const prev = values.length > 1 ? values[values.length - 2] : last;
    const change = last - prev;
    const changePct = prev ? (change / prev) * 100 : 0;

    return { points, line, area, min, max, change, changePct, isUp: change >= 0 };
  }, [data]);

  const isUp = chart ? chart.isUp : true;
  const stroke = isUp ? "#16a34a" : "#ef4444";
  const fillId = isUp ? "priceUp" : "priceDown";
  const active = chart ? hover ?? chart.points[chart.points.length - 1] : null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h2 className="text-base font-bold text-gray-900">Price Chart</h2>
          {chart && (
            <p
              className={`text-xs font-semibold mt-0.5 ${
                isUp ? "text-green-500" : "text-red-500"
              }`}
            >
              {isUp ? "+" : "−"}₩{Math.abs(Math.round(chart.change)).toLocaleString()} (
              {isUp ? "+" : ""}
              {chart.changePct.toFixed(2)}%) · {RANGE_LABEL[range]}
            </p>
          )}
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.interval}
              onClick={() => selectRange(r.interval)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                range === r.interval ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-100"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {status === "loading" && (
        <div className="w-full h-52 rounded-xl bg-gray-50 flex items-center justify-center text-sm text-gray-400">
          Loading…
        </div>
      )}

      {status === "error" && (
        <div className="w-full h-52 rounded-xl border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center text-sm text-gray-400">
          No price data available
        </div>
      )}

      {status === "ready" && chart && (
        <>
          <svg
            viewBox={`0 0 ${CW} ${CH}`}
            className="w-full h-52"
            preserveAspectRatio="none"
            onMouseLeave={() => setHover(null)}
          >
            <defs>
              <linearGradient id="priceUp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#16a34a" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="priceDown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ef4444" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* grid + y axis labels */}
            {[0, 0.5, 1].map((t) => {
              const gy = CPAD.top + (CH - CPAD.top - CPAD.bottom) * t;
              const val = chart.max - (chart.max - chart.min) * t;
              return (
                <g key={t}>
                  <line
                    x1={CPAD.left}
                    y1={gy}
                    x2={CW - CPAD.right}
                    y2={gy}
                    stroke="#e5e7eb"
                    strokeWidth="1"
                    strokeDasharray="3 4"
                  />
                  <text x={CPAD.left - 8} y={gy + 4} textAnchor="end" fontSize="11" fill="#9ca3af">
                    {Math.round(val).toLocaleString()}
                  </text>
                </g>
              );
            })}

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
                chart.points.length <= 7 || i % Math.ceil(chart.points.length / 6) === 0;
              return show ? (
                <text
                  key={i}
                  x={p.cx}
                  y={CH - CPAD.bottom + 18}
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
                  y1={CPAD.top}
                  x2={active.cx}
                  y2={CH - CPAD.bottom}
                  stroke={stroke}
                  strokeWidth="1"
                  strokeOpacity="0.35"
                />
                <circle cx={active.cx} cy={active.cy} r="4.5" fill="white" stroke={stroke} strokeWidth="2.5" />
              </>
            )}

            {/* invisible hover hit targets */}
            {chart.points.map((p, i) => {
              const segW = (CW - CPAD.left - CPAD.right) / Math.max(chart.points.length, 1);
              return (
                <rect
                  key={`hit-${i}`}
                  x={p.cx - segW / 2}
                  y={CPAD.top}
                  width={segW}
                  height={CH - CPAD.top - CPAD.bottom}
                  fill="transparent"
                  onMouseEnter={() => setHover(p)}
                />
              );
            })}
          </svg>

          {active && (
            <div className="flex justify-end mt-1 text-xs tabular-nums text-gray-500">
              <span className="text-gray-400">{active.date}</span>
              <span className="ml-2 font-semibold text-gray-900">
                ₩{active.value.toLocaleString()}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SignalBadge({ signal }) {
  const style =
    signal === "BUY"  ? "bg-green-100 text-green-600 border-green-200" :
    signal === "SELL" ? "bg-red-100 text-red-500 border-red-200"       :
                        "bg-blue-100 text-blue-500 border-blue-200";
  return (
    <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-bold tracking-wider border ${style}`}>
      {signal}
    </span>
  );
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value ?? "—"}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate   = useNavigate();

  const [stock, setStock]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);
  const [live, setLive]       = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(false);
    fetch(`/api/stocks/${symbol}`)
      .then(r => {
        if (!r.ok) throw new Error('not found');
        return r.json();
      })
      .then(d => { setStock(d); setLoading(false); })
      .catch(() => { setError(true); setLoading(false); });
  }, [symbol]);

  // Subscribe this ticker to the live websocket feed while it is on screen,
  // and release it on unmount / navigation away.
  useEffect(() => {
    fetch(`/api/stocks/${symbol}/subscribe`, { method: "POST" }).catch(() => {});
    return () => {
      fetch(`/api/stocks/${symbol}/unsubscribe`, { method: "POST" }).catch(() => {});
    };
  }, [symbol]);

  // Poll the lightweight live quote so price + change move during market hours.
  useEffect(() => {
    let cancelled = false;
    const pull = () => {
      fetch(`/api/stocks/${symbol}/quote`)
        .then((r) => (r.ok ? r.json() : null))
        .then((q) => { if (!cancelled && q) setLive(q); })
        .catch(() => {});
    };
    pull();
    const id = setInterval(pull, 5000);
    return () => { cancelled = true; clearInterval(id); };
  }, [symbol]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    );
  }

  if (error || !stock) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-4">Stock "{symbol}" not found.</p>
          <button onClick={() => navigate("/stocks")}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 transition mx-auto">
            <ArrowLeft size={15} /> Back to stocks
          </button>
        </div>
      </div>
    );
  }

  // Prefer the live quote (matched to the current symbol) over the initial load.
  const q         = live && live.symbol === symbol ? live : null;
  const price     = q ? q.price     : stock.price;
  const change    = q ? q.change    : stock.change;
  const changePct = q ? q.changePct : stock.changePct;
  const isLive    = Boolean(q && q.live);

  const isUp   = changePct >= 0;
  const signal = (stock.ai && stock.ai.signal) || "NEUTRAL";
  const reason = (stock.ai && stock.ai.explanation) ||
    `${stock.name} is trading within a stable range. No strong catalyst in either direction — hold pending clearer momentum.`;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">

        <button onClick={() => navigate("/stocks")}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition mb-5">
          <ArrowLeft size={15} /> Back to stocks
        </button>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                {isUp
                  ? <TrendingUp   size={20} className="text-green-500" />
                  : <TrendingDown size={20} className="text-red-400"   />}
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-2xl font-bold text-gray-900 truncate">{stock.name}</h1>
                <p className="text-xs text-gray-400 mt-0.5">{stock.symbol} · {stock.market}</p>
              </div>
            </div>

            <div className="text-right flex-shrink-0">
              <div className="flex items-center justify-end gap-2">
                {isLive && (
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    Live
                  </span>
                )}
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  ₩{price.toLocaleString()}
                </p>
              </div>
              <p className={`text-sm font-semibold mt-0.5 ${isUp ? "text-green-500" : "text-red-500"}`}>
                {isUp ? "+" : "−"}₩{Math.abs(change).toLocaleString()}
                {" "}({isUp ? "+" : ""}{changePct.toFixed(2)}%)
              </p>
            </div>

          </div>
        </div>

        <div className="mb-4">
          <PriceChart symbol={stock.symbol} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-4">
          <h2 className="text-base font-bold text-gray-900 mb-3">AI Analysis</h2>

          <div className="mb-3">
            <SignalBadge signal={signal} />
          </div>

          <p className="text-sm text-gray-600 leading-relaxed mb-4">{reason}</p>

          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-gray-100 rounded-xl p-3 sm:p-4">
              <p className="text-xs text-gray-400 mb-1">Market Cap</p>
              <p className="text-base font-bold text-gray-900">{stock.marketCap ?? "—"}</p>
            </div>
            <div className="border border-gray-100 rounded-xl p-3 sm:p-4">
              <p className="text-xs text-gray-400 mb-1">52 Week Range</p>
              <p className="text-base font-bold text-gray-900">
                ₩{stock.weekLow?.toLocaleString() ?? "—"} – ₩{stock.weekHigh?.toLocaleString() ?? "—"}
              </p>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xs text-gray-400 leading-relaxed">
              This AI-generated analysis is based on technical indicators, market trends, and historical data.
              Always conduct your own research before making investment decisions.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-base font-bold text-gray-900 mb-3">Key Indicators</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="PER"    value={stock.per  ?? "—"}               sub="Price/Earnings Ratio"  />
            <StatCard label="PBR"    value={stock.pbr  ?? "—"}               sub="Price/Book Ratio"      />
            <StatCard label="ROE"    value={stock.roe != null ? `${stock.roe}%` : "—"} sub="Return on Equity" />
            <StatCard label="Volume" value={stock.volume ?? "—"}             sub="Trading Volume"        />
          </div>
        </div>

      </div>
    </div>
  );
}
