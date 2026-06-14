import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";

function PriceChart({ isUp }) {
  const [range, setRange] = useState("1M");

  const borderColor = isUp ? "border-green-200" : "border-red-200";
  const dotColor    = isUp ? "bg-green-400"      : "bg-red-400";
  const textColor   = isUp ? "text-green-500"    : "text-red-400";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">

      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-bold text-gray-900">Price Chart</h2>
        <div className="flex gap-1">
          {["1D", "1W", "1M", "1Y"].map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition ${
                range === r ? "bg-gray-900 text-white" : "text-gray-400 hover:bg-gray-100"
              }`}>
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className={`w-full h-52 rounded-xl border-2 border-dashed ${borderColor} bg-gray-50 flex flex-col items-center justify-center gap-2`}>
        <div className={`w-2.5 h-2.5 rounded-full ${dotColor} animate-pulse`} />
        <p className={`text-sm font-medium ${textColor}`}>Chart coming soon · {range} view</p>
        <p className="text-xs text-gray-400">Real price data will appear here once the backend is connected</p>
      </div>

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

  const isUp   = stock.changePct >= 0;
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
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                ₩{stock.price.toLocaleString()}
              </p>
              <p className={`text-sm font-semibold mt-0.5 ${isUp ? "text-green-500" : "text-red-500"}`}>
                {isUp ? "+" : "−"}₩{Math.abs(stock.change).toLocaleString()}
                {" "}({isUp ? "+" : ""}{stock.changePct.toFixed(2)}%)
              </p>
            </div>

          </div>
        </div>

        <div className="mb-4">
          <PriceChart isUp={isUp} />
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
            <StatCard label="ROI"    value={stock.roi  ? `${stock.roi}%` : "—"} sub="Return on Investment" />
            <StatCard label="Volume" value={stock.volume ?? "—"}             sub="Trading Volume"        />
          </div>
        </div>

      </div>
    </div>
  );
}
