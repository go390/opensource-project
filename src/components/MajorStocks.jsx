import { TrendingUp, TrendingDown, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const topStocks = [
  { id: 1, symbol: "005930", name: "Samsung Electronics", price: 71800,  change: 1200,  changePct: 1.7  },
  { id: 2, symbol: "035420", name: "NAVER",               price: 234500, change: -3200, changePct: -1.35 },
  { id: 3, symbol: "035720", name: "Kakao",               price: 48750,  change: 850,   changePct: 1.77  },
];

function StockRow({ stock }) {
  const isUp = stock.changePct >= 0;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-4 mb-4 last:mb-0 shadow-sm">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-900 text-sm">{stock.name}</span>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isUp ? "bg-green-100 text-green-600" : "bg-red-100 text-red-500"}`}>
              {isUp ? "+" : ""}{stock.changePct.toFixed(2)}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{stock.symbol}</p>
          <p className="text-base font-bold text-[#081633] mt-1.5">₩{stock.price.toLocaleString()}</p>
        </div>

        <div className={`flex items-center gap-1 text-xs font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
          {isUp ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
          {isUp ? "+" : "-"}₩{Math.abs(stock.change).toLocaleString()}
        </div>
      </div>
    </div>
  );
}

export default function MajorStocks() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6 h-full flex flex-col">
      <h2 className="text-2xl font-bold text-[#081633] mb-3">Major Stocks</h2>

      <div className="flex-1">
        {topStocks.map((stock) => (
          <StockRow key={stock.id} stock={stock} />
        ))}
      </div>

      <Link to="/stocks" className="flex items-center justify-center gap-2 text-emerald-500 font-medium mt-2 hover:text-emerald-600 transition text-sm">
        View all stocks
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}