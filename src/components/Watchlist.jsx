import { TrendingUp, TrendingDown, Star } from "lucide-react";

export default function Watchlist({ stocks, watchlist, onToggle }) {
  const watchlistStocks = stocks.filter((s) => watchlist[s.id]);

  return (
    <div className="min-h-screen bg-white font-sans">
      <main className="max-w-[1440px] mx-auto px-8 py-10">

        <div className="mb-6">
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            My Watchlist
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            {watchlistStocks.length} stock{watchlistStocks.length !== 1 ? "s" : ""} found
          </p>
        </div>

        {watchlistStocks.length === 0 ? (
          <div className="border border-gray-100 rounded-2xl px-8 py-20 text-center shadow-sm">
            <Star size={36} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-400 text-sm">No stocks tracked yet.</p>
            <p className="text-gray-300 text-xs mt-1">
              Star any stock from the Stock List to add it here.
            </p>
          </div>
        ) : (
          <div className="border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-6 py-4 w-12" />
                  <th className="px-4 py-4 text-left text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Company
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Price
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Change
                  </th>
                  <th className="px-4 py-4 text-right text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Change %
                  </th>
                  <th className="px-6 py-4 w-16 text-right text-xs font-bold text-gray-400 tracking-widest uppercase">
                    Remove
                  </th>
                </tr>
              </thead>
              <tbody>
                {watchlistStocks.map((stock, i) => {
                  const isUp = stock.changePct >= 0;
                  const isLast = i === watchlistStocks.length - 1;

                  return (
                    <tr
                      key={stock.id}
                      className={`hover:bg-gray-50/60 transition ${!isLast ? "border-b border-gray-50" : ""}`}
                    >
                      <td className="px-6 py-5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isUp ? "bg-green-50" : "bg-red-50"}`}>
                          {isUp
                            ? <TrendingUp size={15} className="text-green-500" />
                            : <TrendingDown size={15} className="text-red-400" />
                          }
                        </div>
                      </td>

                      <td className="px-4 py-5">
                        <p className={`text-sm font-bold ${isUp ? "text-green-600" : "text-gray-800"}`}>
                          {stock.symbol}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">{stock.name}</p>
                      </td>

                      <td className="px-4 py-5 text-right text-sm font-bold text-gray-900">
                        ₩{stock.price.toLocaleString()}
                      </td>

                      <td className={`px-4 py-5 text-right text-sm font-semibold ${isUp ? "text-green-500" : "text-red-500"}`}>
                        {isUp ? "+" : "−"}₩{Math.abs(stock.change).toLocaleString()}
                      </td>

                      <td className="px-4 py-5 text-right">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                          {isUp ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                          {isUp ? "+" : ""}{stock.changePct.toFixed(2)}%
                        </span>
                      </td>

                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => onToggle(stock.id)}
                          className="focus:outline-none cursor-pointer"
                          title="Remove from watchlist"
                        >
                          <Star size={18} fill="#22c55e" stroke="#22c55e" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}