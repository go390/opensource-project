import { useState } from "react";
import { Search } from "lucide-react";
import { Link } from "react-router-dom";
import { stocks } from "../data/stocks";


const SearchBar = () => {
  const [query, setQuery] = useState("");

  const filteredStocks = stocks.filter(
    (stock) =>
      stock.name.toLowerCase().includes(query.toLowerCase()) ||
      stock.ticker.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="relative w-full max-w-[580px]">
      <Search
        size={20}
        className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400"
      />

      <input
        type="text"
        placeholder="Search stocks..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-[42px] rounded-2xl bg-[#F3F4F6] pl-14 pr-4 text-[16px] text-gray-700 placeholder:text-gray-400 outline-none border border-transparent focus:border-[#00E676]"
      />

      {query.trim() && (
        <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-lg overflow-y-auto max-h-80 z-50">
          {filteredStocks.length > 0 ? (
            filteredStocks.map((stock) => (
              <Link
                key={stock.ticker}
                to={`/stocks/${stock.ticker}`}
                onClick={() => setQuery("")}
                className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    {stock.name}
                  </p>

                  <p className="text-xs text-gray-500">
                    {stock.ticker}
                  </p>
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500">
              No stocks found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SearchBar;