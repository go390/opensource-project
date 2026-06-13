import { useState, useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Link } from "react-router-dom";
import { stocks } from "../data/stocks";

const buyStocks = stocks.filter(s => ["buy"].includes(s.recommendation));
const neutralStocks = stocks.filter(s => ["neutral"].includes(s.recommendation));
const sellStocks = stocks.filter(s => ["sell"].includes(s.recommendation));

function StockCard({ stock, mood }) {
  const isUp = stock.changePct >= 0;
  const navigate = useNavigate();
  const leftBorder =
    mood === "buy" ? "border-l-green-500" :
      mood === "sell" ? "border-l-red-500" : "border-l-blue-400";

  return (
    <div
      onClick={() => navigate(`/stocks/${stock.symbol}`)}
      className={`bg-white rounded-xl border border-gray-200 border-l-4 ${leftBorder} p-3 sm:p-4 hover:shadow-md transition-shadow`}>
      <p className="font-semibold text-gray-900 text-sm truncate">{stock.name}</p>
      <p className="text-xs text-gray-400 mb-2 sm:mb-3">{stock.symbol}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-gray-900 text-sm sm:text-base">₩{stock.price.toLocaleString()}</span>
        <span
          className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${isUp ? "text-green-500" : "text-red-500"
            }`}
        >
          {isUp ? "+" : ""}
          {stock.changePct.toFixed(2)}%
        </span>
      </div>
    </div>
  );
}

function RecommendationColumn({ label, stocks, mood, Color, viewAllPath, }) {
  const lineColor = Color === "green" ? "bg-green-500" : Color === "red" ? "bg-red-500" : "bg-blue-400";
  const labelColor = Color === "green" ? "text-green-600" : Color === "red" ? "text-red-500" : "text-blue-500";

  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-3 sm:mb-4">
        <div className={`w-5 sm:w-6 h-0.5 flex-shrink-0 ${lineColor}`} />
        <span className={`text-xs sm:text-sm font-black tracking-widest ${labelColor}`}>{label}</span>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center font-bold flex-shrink-0">
          {stocks.length}
        </span>
      </div>
      <div className="flex flex-col gap-2 sm:gap-3">
        {stocks.slice(0, 4).map((stock) => (
          <StockCard key={stock.id} stock={stock} mood={mood} />
        ))}

        <Link
          to={viewAllPath}
          className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-1"
        >
          View all
          <ArrowRight size={13} />
        </Link>
      </div>
    </div>
  );
}

export default function AIDashboard() {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const tick = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(tick);
  }, []);

  const formattedTime = currentTime.toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="max-w-[1440px] mx-auto px-4 md:px-8 py-8">

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-6 sm:mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">AI Dashboard</h1>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">AI-powered trading recommendations</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <Clock size={13} />
            <span>Last updated: {formattedTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
          <RecommendationColumn
            label="BUY"
            stocks={buyStocks}
            mood="buy"
            Color="green"
            viewAllPath="/dashboard/recommendations/buy"
          />

          <RecommendationColumn
            label="NEUTRAL"
            stocks={neutralStocks}
            mood="neutral"
            Color="blue"
            viewAllPath="/dashboard/recommendations/neutral"
          />

          <RecommendationColumn
            label="SELL"
            stocks={sellStocks}
            mood="sell"
            Color="red"
            viewAllPath="/dashboard/recommendations/sell"
          />
        </div>

      </div>
    </div>
  );
}