import { LineChart } from "lucide-react";
import TradingViewWidget from "../components/TradingViewWidget"

function MarketTrend() {
  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-2xl font-bold text-[#081633]">
          Market Trend
        </h2>

        <span className="px-4 py-2 rounded-full bg-green-100 text-green-600 text-sm font-semibold">
          +2.4% Today
        </span>
      </div>

      <div
        className="h-[420px] rounded-2xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
        <TradingViewWidget />

      </div>
    </div>
  );
}

export default MarketTrend;