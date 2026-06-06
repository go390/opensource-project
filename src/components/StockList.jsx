import { useState, useMemo } from "react";
import {
  Search, Menu, Globe, Star, TrendingUp, TrendingDown,
  AlignJustify, ChevronDown, ChevronLeft, ChevronRight, Check,
  LineChart,
} from "lucide-react";

const stocks = [
  { id: 1,  symbol: "005930", name: "Samsung Electronics", market: "KOSPI",  price: 71800,  change: 1200,   changePct:  1.70, volume: "12.45M", starred: true  },
  { id: 2,  symbol: "035420", name: "NAVER",               market: "KOSPI",  price: 234500, change: -3200,  changePct: -1.35, volume: "0.89M",  starred: true  },
  { id: 3,  symbol: "035720", name: "Kakao",               market: "KOSPI",  price: 48750,  change: 850,    changePct:  1.77, volume: "1.52M",  starred: false },
  { id: 4,  symbol: "000660", name: "SK Hynix",            market: "KOSPI",  price: 168500, change: 4200,   changePct:  2.56, volume: "3.24M",  starred: false },
  { id: 5,  symbol: "051910", name: "LG Chem",             market: "KOSPI",  price: 423000, change: -5600,  changePct: -1.31, volume: "0.57M",  starred: true  },
  { id: 6,  symbol: "005380", name: "Hyundai Motor",       market: "KOSPI",  price: 245000, change: 2100,   changePct:  0.86, volume: "0.78M",  starred: false },
  { id: 7,  symbol: "068270", name: "Celltrion",           market: "KOSDAQ", price: 189400, change: -1800,  changePct: -0.94, volume: "0.46M",  starred: false },
  { id: 8,  symbol: "207940", name: "Samsung Biologics",   market: "KOSPI",  price: 978000, change: 12000,  changePct:  1.24, volume: "0.23M",  starred: false },
  { id: 9,  symbol: "006400", name: "Samsung SDI",         market: "KOSPI",  price: 312000, change: 3500,   changePct:  1.13, volume: "0.31M",  starred: false },
  { id: 10, symbol: "373220", name: "LG Energy Solution",  market: "KOSPI",  price: 415000, change: -2200,  changePct: -0.53, volume: "0.19M",  starred: false },
  { id: 11, symbol: "247540", name: "Krafton",             market: "KOSPI",  price: 285000, change: 5500,   changePct:  1.97, volume: "0.41M",  starred: false },
  { id: 12, symbol: "036570", name: "NCsoft",              market: "KOSPI",  price: 198000, change: -2100,  changePct: -1.05, volume: "0.22M",  starred: false },
  { id: 13, symbol: "293490", name: "Kakao Games",         market: "KOSDAQ", price: 21450,  change: 350,    changePct:  1.66, volume: "2.10M",  starred: false },
  { id: 14, symbol: "112040", name: "Wemade",              market: "KOSDAQ", price: 42300,  change: -800,   changePct: -1.86, volume: "1.75M",  starred: false },
  { id: 15, symbol: "035900", name: "JYP Entertainment",   market: "KOSDAQ", price: 78500,  change: 1200,   changePct:  1.55, volume: "0.95M",  starred: false },
  { id: 16, symbol: "041510", name: "SM Entertainment",    market: "KOSDAQ", price: 95000,  change: -500,   changePct: -0.52, volume: "0.68M",  starred: false },
  { id: 17, symbol: "122870", name: "YG Entertainment",    market: "KOSDAQ", price: 55200,  change: 700,    changePct:  1.28, volume: "0.51M",  starred: false },
  { id: 18, symbol: "145020", name: "Hugel",               market: "KOSDAQ", price: 312000, change: -4500,  changePct: -1.42, volume: "0.14M",  starred: false },
  { id: 19, symbol: "086520", name: "Ecopro",              market: "KOSDAQ", price: 87400,  change: 2100,   changePct:  2.46, volume: "3.82M",  starred: false },
  { id: 20, symbol: "011200", name: "HMM",                 market: "KOSPI",  price: 18450,  change: -250,   changePct: -1.34, volume: "5.60M",  starred: false },
];

const marketStyles = {
  KOSPI:  { label: "KOSPI",  bg: "bg-blue-50",   text: "text-blue-700",   border: "border-blue-200"   },
  KOSDAQ: { label: "KOSDAQ", bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  NYSE:   { label: "NYSE",   bg: "bg-amber-50",  text: "text-amber-700",  border: "border-amber-200"  },
  NASDAQ: { label: "NASDAQ", bg: "bg-cyan-50",   text: "text-cyan-700",   border: "border-cyan-200"   },
};

function MarketBadge({ market }) {
  const style = marketStyles[market] ?? { label: market, bg: "bg-gray-100", text: "text-gray-600", border: "border-gray-200" };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold border ${style.bg} ${style.text} ${style.border}`}>
      {style.label}
    </span>
  );
}

const PAGE_SIZE = 10;

export default function StockList() {
  const [activeFilter, setActiveFilter] = useState("All Stocks");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [watchlist, setWatchlist] = useState(() => {
    const map = {};
    stocks.forEach(s => { map[s.id] = s.starred; });
    return map;
  });
  const [query, setQuery]       = useState("");
  const [page, setPage]         = useState(1);
  const [navOpen, setNavOpen]   = useState(false);

  const filtered = useMemo(() => {
    let list = stocks;

    if (activeFilter === "Growth") list = list.filter(s => s.changePct > 0);
    if (activeFilter === "Fall")   list = list.filter(s => s.changePct < 0);

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(s => s.name.toLowerCase().includes(q) || s.symbol.includes(q));
    }

    return list;
  }, [activeFilter, query]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageItems   = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const selectFilter = (val) => {
    setActiveFilter(val);
    setDropdownOpen(false);
    setPage(1);
  };

  const toggleWatchlist = (id) => setWatchlist(prev => ({ ...prev, [id]: !prev[id] }));

  const formatPrice = (n) => "₩" + Math.abs(n).toLocaleString();

  return (
    <div className="min-h-screen bg-white font-sans">
      <main className="max-w-[1440px] mx-auto px-4 md:px-8 py-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Stock List</h1>
            <p className="text-sm text-gray-500 mt-1">
              Showing {filtered.length} of {stocks.length} stocks
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 border border-gray-200 rounded-xl px-4 py-2 text-sm font-semibold text-gray-700 bg-white hover:border-gray-300 shadow-sm transition min-w-[145px] justify-between"
              >
                <span className="flex items-center gap-2">
                  <AlignJustify size={15} className="text-gray-500" />
                  {activeFilter}
                </span>
                <ChevronDown size={14} className={`transition-transform ${dropdownOpen ? "rotate-180" : ""}`} />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-100 rounded-xl shadow-lg z-30 py-1 overflow-hidden">
                  {[
                    { label: "All Stocks", icon: <AlignJustify size={15} className="text-gray-500" /> },
                    { label: "Growth",     icon: <TrendingUp   size={15} className="text-green-500" /> },
                    { label: "Fall",       icon: <TrendingDown size={15} className="text-red-500"   /> },
                  ].map(({ label, icon }) => (
                    <button key={label} onClick={() => selectFilter(label)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition">
                      {icon}
                      <span className={activeFilter === label ? "font-semibold text-gray-900" : ""}>{label}</span>
                      {activeFilter === label && <Check size={14} className="ml-auto text-green-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pl-5 pr-2 py-4 w-10">
                    <Star size={16} className="text-gray-300" />
                  </th>
                  {["SYMBOL", "COMPANY NAME", "MARKET", "PRICE", "CHANGE", "CHANGE %", "VOLUME"].map(col => (
                    <th key={col} className="px-4 py-4 text-left text-xs font-bold text-gray-400 tracking-widest uppercase whitespace-nowrap">
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-16 text-gray-400 text-sm">No stocks found.</td>
                  </tr>
                ) : (
                  pageItems.map((stock, i) => {
                    const isUp      = stock.changePct >= 0;
                    const isStarred = watchlist[stock.id];
                    return (
                      <tr key={stock.id}
                        className={`border-b border-gray-50 hover:bg-gray-50/70 transition cursor-pointer ${i === pageItems.length - 1 ? "border-b-0" : ""}`}>

                        <td className="pl-5 pr-2 py-5">
                          <button onClick={() => toggleWatchlist(stock.id)} className="focus:outline-none">
                            <Star
                              size={17}
                              fill={isStarred ? "#22c55e" : "none"}
                              stroke={isStarred ? "#22c55e" : "#d1d5db"}
                              className="transition"
                            />
                          </button>
                        </td>

                        <td className="px-4 py-5 text-sm font-bold text-gray-700 font-mono">{stock.symbol}</td>
                        <td className="px-4 py-5 text-sm font-medium text-gray-800 whitespace-nowrap">{stock.name}</td>

                        <td className="px-4 py-5">
                          <MarketBadge market={stock.market} />
                        </td>

                        <td className="px-4 py-5 text-sm font-bold text-gray-900 whitespace-nowrap">
                          ₩{stock.price.toLocaleString()}
                        </td>

                        <td className={`px-4 py-5 text-sm font-semibold whitespace-nowrap ${isUp ? "text-green-600" : "text-red-500"}`}>
                          <span className="inline-flex items-center gap-1">
                            {isUp ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {isUp ? "+" : "−"}{formatPrice(stock.change)}
                          </span>
                        </td>

                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${isUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
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

        <div className="flex items-center justify-center gap-2 mt-8">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
            <ChevronLeft size={16} />
            Previous
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              className={`w-9 h-9 rounded-lg text-sm font-semibold transition ${currentPage === n ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"}`}>
              {n}
            </button>
          ))}

          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
            className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition">
            Next
            <ChevronRight size={16} />
          </button>
        </div>
      </main>

      {dropdownOpen && (
        <div className="fixed inset-0 z-20" onClick={() => setDropdownOpen(false)} />
      )}
    </div>
  );
}