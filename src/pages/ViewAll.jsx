import { useParams, useNavigate } from "react-router-dom";
import { TrendingUp, TrendingDown, ArrowLeft, Minus } from "lucide-react";

const signalStyle = {
  BUY: "bg-green-100 text-green-600 border-green-200",
  SELL: "bg-red-100 text-red-500 border-red-200",
  NEUTRAL: "bg-blue-100 text-blue-500 border-blue-200",
};

const pageInfo = {
  BUY: { label: "BUY Recommendations", sub: "Stocks with strong AI buy signals", icon: <Minus size={28} className="text-green-500" /> },
  SELL: { label: "SELL Recommendations", sub: "Stocks with strong AI sell signals", icon: <Minus size={28} className="text-red-500" /> },
  NEUTRAL: { label: "NEUTRAL Recommendations", sub: "Stocks with no strong signal either way", icon: <Minus size={28} className="text-blue-400" /> },
};

export default function ViewAll({ stocks = [] }) {
  const { type } = useParams();
  const navigate = useNavigate();

  const signal = type?.toUpperCase();
  const info = pageInfo[signal];

  const filtered = stocks.filter(s => s.recommendation.toUpperCase() === signal );

  if (!info) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Invalid recommendation type.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-8">
        <button
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition mb-6"
        >
          <ArrowLeft size={15} /> Back to AI Dashboard
        </button>

        <div className="flex items-center gap-3 mb-6">
          {info.icon}
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{info.label}</h1>
            <p className="text-sm text-gray-400 mt-0.5">{info.sub}</p>
          </div>
        </div>
        
        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {["SYMBOL", "COMPANY NAME", "MARKET", "PRICE", "CHANGE", "CHANGE %", "VOLUME"].map(col => (
                    <th key={col} className="px-4 py-4 text-left text-xs font-bold text-gray-400 tracking-widest uppercase whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">
                      No stocks found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((stock, i) => {
                    const isUp = stock.changePct >= 0;
                    const isLast = i === filtered.length - 1;

                    return (
                      <tr
                        key={stock.id}
                        onClick={() => navigate(`/stocks/${stock.symbol}`)}
                        className={`hover:bg-gray-50/70 transition cursor-pointer ${!isLast ? "border-b border-gray-50" : ""}`}
                      >
                        <td className="px-4 py-5 text-sm font-bold text-gray-700 font-mono">{stock.symbol}</td>
                        <td className="px-4 py-5 text-sm font-medium text-gray-800 whitespace-nowrap">{stock.name}</td>
                        <td className="px-4 py-5 text-sm text-gray-500">{stock.market ?? "KOSPI"}</td>

                        <td className="px-4 py-5 text-sm font-bold text-gray-900 whitespace-nowrap">
                          ₩{stock.price.toLocaleString()}
                        </td>

                        <td className={`px-4 py-5 text-sm font-semibold whitespace-nowrap ${isUp ? "text-green-600" : "text-red-500"}`}>
                          <span className="inline-flex items-center gap-1">
                            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isUp ? "+" : "−"}₩{Math.abs(stock.change).toLocaleString()}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-bold ${isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                            {isUp ? "+" : ""}{stock.changePct.toFixed(2)}%
                          </span>
                        </td>

                        <td className="px-4 py-5 text-sm text-gray-500 font-medium">{stock.volume}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>
    </div>
  );
}