import { useState, useEffect } from "react";
import { Clock, ArrowRight } from "lucide-react";

const stockList = [
  { code: "005930", name: "Samsung Electronics", price: "₩71,800",  changePct: "+1.70%" },
  { code: "035420", name: "NAVER",               price: "₩234,500", changePct: "-1.35%" },
  { code: "035720", name: "Kakao",               price: "₩48,750",  changePct: "+1.77%" },
  { code: "000660", name: "SK Hynix",            price: "₩168,500", changePct: "+2.56%" },
  { code: "051910", name: "LG Chem",             price: "₩423,000", changePct: "-1.31%" },
  { code: "005380", name: "Hyundai Motor",       price: "₩245,000", changePct: "+0.86%" },
  { code: "006400", name: "Samsung SDI",         price: "₩456,700", changePct: "-0.74%" },
  { code: "068270", name: "Celltrion",           price: "₩189,400", changePct: "-0.94%" },
  { code: "012330", name: "Hyundai Mobis",       price: "₩234,800", changePct: "+0.71%" },
  { code: "207940", name: "Samsung Biologics",   price: "₩978,000", changePct: "+1.24%" },
];

const buyStocks     = stockList.filter(s => ["+1.70%", "+1.77%", "+2.56%", "+1.24%"].includes(s.changePct));
const neutralStocks = stockList.filter(s => ["-1.35%", "+0.86%", "-0.94%", "+0.71%"].includes(s.changePct));
const sellStocks    = stockList.filter(s => ["-1.31%", "-0.74%"].includes(s.changePct));

function StockCard({ stock, mood }) {
  const isUp = stock.changePct.startsWith("+");
  const leftBorder =
    mood === "buy"  ? "border-l-green-500" :
    mood === "sell" ? "border-l-red-500"   : "border-l-blue-400";

  return (
    <div className={`bg-white rounded-xl border border-gray-200 border-l-4 ${leftBorder} p-3 sm:p-4 hover:shadow-md transition-shadow`}>
      <p className="font-semibold text-gray-900 text-sm truncate">{stock.name}</p>
      <p className="text-xs text-gray-400 mb-2 sm:mb-3">{stock.code}</p>
      <div className="flex items-center justify-between gap-2">
        <span className="font-bold text-gray-900 text-sm sm:text-base">{stock.price}</span>
        <span className={`text-xs sm:text-sm font-semibold whitespace-nowrap ${isUp ? "text-green-500" : "text-red-500"}`}>
          {stock.changePct}
        </span>
      </div>
    </div>
  );
}

function RecommendationColumn({ label, stocks, mood, accentColor }) {
  const lineColor  = accentColor === "green" ? "bg-green-500"   : accentColor === "red" ? "bg-red-500"   : "bg-blue-400";
  const labelColor = accentColor === "green" ? "text-green-600" : accentColor === "red" ? "text-red-500" : "text-blue-500";

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
        {stocks.map((stock, idx) => (
          <StockCard key={idx} stock={stock} mood={mood} />
        ))}
        <button className="w-full border border-dashed border-gray-300 rounded-xl py-2.5 sm:py-3 text-xs sm:text-sm text-gray-500 hover:bg-gray-50 transition flex items-center justify-center gap-1">
          View all <ArrowRight size={13} />
        </button>
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
          <RecommendationColumn label="BUY"     stocks={buyStocks}     mood="buy"     accentColor="green" />
          <RecommendationColumn label="NEUTRAL" stocks={neutralStocks} mood="neutral" accentColor="blue"  />
          <RecommendationColumn label="SELL"    stocks={sellStocks}    mood="sell"    accentColor="red"   />
        </div>

      </div>
    </div>
  );
}